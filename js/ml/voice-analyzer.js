// ============================================================
//  EmoOS — Voice Emotion Analyzer
//  Web Audio API: energy, pitch proxy, spectral features → mood
// ============================================================
'use strict';

window.EmoVoice = (() => {
  let _audioCtx     = null;
  let _analyser     = null;
  let _source       = null;
  let _stream       = null;
  let _active       = false;
  let _intervalId   = null;
  let _dataArray    = null;
  let _freqArray    = null;
  const ANALYSIS_RATE = 500; // ms between analyses

  async function start() {
    if (_active) return true;
    try {
      _stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      _source   = _audioCtx.createMediaStreamSource(_stream);

      _analyser = _audioCtx.createAnalyser();
      _analyser.fftSize = 2048;
      _analyser.smoothingTimeConstant = 0.8;
      _source.connect(_analyser);

      _dataArray = new Uint8Array(_analyser.fftSize);
      _freqArray = new Uint8Array(_analyser.frequencyBinCount);

      _active = true;
      _intervalId = setInterval(_analyze, ANALYSIS_RATE);

      EmoState.set('voiceActive', true);
      return true;
    } catch (err) {
      console.warn('[EmoVoice] Microphone access denied:', err);
      return false;
    }
  }

  function stop() {
    _active = false;
    if (_intervalId) clearInterval(_intervalId);
    if (_stream) _stream.getTracks().forEach(t => t.stop());
    if (_audioCtx && _audioCtx.state !== 'closed') _audioCtx.close();
    _audioCtx = null;
    _analyser = null;
    _source = null;
    _stream = null;
    EmoState.set('voiceActive', false);
  }

  function _analyze() {
    if (!_active || !_analyser) return;

    // Time domain data (waveform)
    _analyser.getByteTimeDomainData(_dataArray);

    // Frequency data
    _analyser.getByteFrequencyData(_freqArray);

    // ── Feature Extraction ──
    // 1. Energy (RMS amplitude)
    let sumSq = 0;
    for (let i = 0; i < _dataArray.length; i++) {
      const v = (_dataArray[i] - 128) / 128;
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / _dataArray.length);
    const energy = Math.min(1, rms * 3); // normalize to 0-1

    // 2. Zero Crossing Rate (proxy for noisiness/tension)
    let zcr = 0;
    for (let i = 1; i < _dataArray.length; i++) {
      if ((_dataArray[i - 1] >= 128) !== (_dataArray[i] >= 128)) zcr++;
    }
    const zcrNorm = zcr / _dataArray.length;

    // 3. Spectral Centroid (proxy for pitch/brightness)
    let weightedSum = 0, totalMag = 0;
    for (let i = 0; i < _freqArray.length; i++) {
      weightedSum += i * _freqArray[i];
      totalMag += _freqArray[i];
    }
    const spectralCentroid = totalMag > 0
      ? (weightedSum / totalMag) / _freqArray.length  // normalized 0-1
      : 0.5;

    // 4. Spectral Rolloff (frequency below which 85% of energy)
    const targetEnergy = totalMag * 0.85;
    let cumEnergy = 0, rolloff = 0;
    for (let i = 0; i < _freqArray.length; i++) {
      cumEnergy += _freqArray[i];
      if (cumEnergy >= targetEnergy) { rolloff = i / _freqArray.length; break; }
    }

    // ── Rule-Based Emotion Inference ──
    // High energy + high centroid → excited/angry
    // Low energy + low centroid → sad/tired
    // High ZCR + high energy → stressed
    // Moderate everything → neutral/calm

    let valence  = 0;
    let arousal  = 0;
    let stress   = 0;
    let voiceEmo = 'neutral';

    arousal = (energy * 0.6 + spectralCentroid * 0.4) * 2 - 1; // -1 to 1
    stress  = Math.min(1, zcrNorm * 4 + energy * 0.3);

    if (energy > 0.5 && spectralCentroid > 0.5) {
      // High energy + high pitch
      if (zcrNorm > 0.15) {
        voiceEmo = 'angry'; valence = -0.5;
      } else {
        voiceEmo = 'happy'; valence = 0.7;
      }
    } else if (energy < 0.15) {
      voiceEmo = 'sad'; valence = -0.5; arousal = -0.5;
    } else if (energy > 0.35 && spectralCentroid > 0.55) {
      voiceEmo = 'surprised'; valence = 0.1;
    } else if (zcrNorm > 0.2) {
      voiceEmo = 'fearful'; valence = -0.4;
    } else {
      voiceEmo = 'neutral'; valence = 0;
    }

    // Confidence based on energy (louder = more confident voice signal)
    const conf = Math.min(1, energy * 2.5);

    // Only emit if there's meaningful audio
    if (energy > 0.05) {
      const result = {
        emotion: voiceEmo,
        confidence: Math.round(conf * 100) / 100,
        valence: Math.round(valence * 100) / 100,
        arousal: Math.round(arousal * 100) / 100,
        stress:  Math.round(stress * 100) / 100,
        features: {
          energy: Math.round(energy * 100) / 100,
          zcr: Math.round(zcrNorm * 1000) / 1000,
          spectralCentroid: Math.round(spectralCentroid * 100) / 100,
          rolloff: Math.round(rolloff * 100) / 100,
        }
      };

      EmoState.update({
        voiceEmotion: voiceEmo,
        voiceConf:    result.confidence,
        voiceStress:  result.stress,
      });

      EmoBus.emit(EmoBus.Events.VOICE_RESULT, result);
    }
  }

  function isActive() { return _active; }

  return { start, stop, isActive };
})();
