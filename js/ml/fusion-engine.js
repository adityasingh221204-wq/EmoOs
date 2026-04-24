// ============================================================
//  EmoOS — Multi-Modal Fusion Engine
//  Fuses face + voice + blink signals via confidence weighting
// ============================================================
'use strict';

window.EmoFusion = (() => {
  // Modality weights (tunable)
  const WEIGHTS = {
    face:  0.65,
    voice: 0.25,
    blink: 0.10,
  };

  let _lastFaceResult  = null;
  let _lastVoiceResult = null;
  let _lastBlinkResult = null;

  // Listen for modality updates
  function init() {
    EmoBus.on(EmoBus.Events.VOICE_RESULT, (data) => { _lastVoiceResult = data; });
    EmoBus.on(EmoBus.Events.BLINK_EVENT,  (data) => { _lastBlinkResult = EmoBlink.getState(); });
  }

  /**
   * Fuse all available modalities
   * @param {Object} faceResult - from EmoClassifier.classify()
   */
  function fuse(faceResult) {
    _lastFaceResult = faceResult;

    let fusedValence   = faceResult.vad.v;
    let fusedArousal   = faceResult.vad.a;
    let fusedDominance = faceResult.vad.d;
    let fusedEmotion   = faceResult.dominant;
    let fusedConf      = faceResult.dominantConf;
    let totalWeight    = WEIGHTS.face;

    // Fuse voice if available
    if (_lastVoiceResult && EmoState.get('voiceActive')) {
      const vw = WEIGHTS.voice * _lastVoiceResult.confidence;
      fusedValence  = (fusedValence * WEIGHTS.face + _lastVoiceResult.valence * vw) / (WEIGHTS.face + vw);
      fusedArousal  = (fusedArousal * WEIGHTS.face + _lastVoiceResult.arousal * vw) / (WEIGHTS.face + vw);
      totalWeight  += vw;

      // If voice disagrees strongly, note it
      if (_lastVoiceResult.emotion !== faceResult.dominant && _lastVoiceResult.confidence > 0.5) {
        fusedConf *= 0.85; // reduce confidence when modalities disagree
      }
    }

    // Fuse blink/stress signals
    if (_lastBlinkResult) {
      const bw = WEIGHTS.blink;
      // Stress from blink elevates arousal
      fusedArousal = fusedArousal + (_lastBlinkResult.stressScore * 0.2);
      // Fatigue decreases arousal
      fusedArousal = fusedArousal - (_lastBlinkResult.fatigueScore * 0.15);
      // Clamp
      fusedArousal = Math.max(-1, Math.min(1, fusedArousal));
      totalWeight += bw;
    }

    // Compute overall stress composite
    let stressComposite = 0;
    if (_lastVoiceResult) stressComposite += _lastVoiceResult.stress * 0.5;
    if (_lastBlinkResult) stressComposite += _lastBlinkResult.stressScore * 0.3;
    stressComposite += Math.max(0, fusedArousal) * 0.2;
    stressComposite = Math.min(1, stressComposite);

    const result = {
      emotion:     fusedEmotion,
      confidence:  Math.round(fusedConf * 100) / 100,
      vad: {
        v: Math.round(fusedValence * 100) / 100,
        a: Math.round(fusedArousal * 100) / 100,
        d: Math.round(fusedDominance * 100) / 100,
      },
      stress:      Math.round(stressComposite * 100) / 100,
      modalities: {
        face:  !!_lastFaceResult,
        voice: !!(EmoState.get('voiceActive') && _lastVoiceResult),
        blink: !!_lastBlinkResult,
      },
      mixedEmotions: faceResult.mixedEmotions,
      uncertainty:   faceResult.uncertainty,
      intensity:     faceResult.intensity,
      weather:       faceResult.weather,
    };

    // Update state
    EmoState.update({
      fusedEmotion: result.emotion,
      fusedConf:    result.confidence,
      valence:      result.vad.v,
      arousal:      result.vad.a,
      dominance:    result.vad.d,
      mixedEmotions:result.mixedEmotions,
    });

    EmoBus.emit(EmoBus.Events.FUSION_RESULT, result);
    return result;
  }

  return { init, fuse };
})();
