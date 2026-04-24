// ============================================================
//  EmoOS — Face Detector (Refactored Detection Loop)
//  WebGL-accelerated via face-api.js, adaptive frame rate
// ============================================================
'use strict';

/* global faceapi */

window.EmoFaceDetector = (() => {
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

  let _videoEl      = null;
  let _canvas       = null;
  let _ctx          = null;
  let _running      = false;
  let _lastInferTs  = 0;
  let _targetFPS    = 15;
  let _frameCount   = 0;
  let _lastFpsTs    = Date.now();

  // Adaptive: if inference takes too long, reduce FPS
  const FPS_TIERS = [15, 12, 10, 8];
  let _currentTier  = 0;

  async function loadModels(onProgress) {
    const steps = [
      { pct: 20,  msg: '📦 Loading face detector…',       fn: () => faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL) },
      { pct: 55,  msg: '🦴 Loading landmark model…',      fn: () => faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL) },
      { pct: 88,  msg: '🧠 Loading emotion classifier…',  fn: () => faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL) },
      { pct: 100, msg: '✅ Models ready!',                 fn: null },
    ];

    for (const step of steps) {
      if (onProgress) onProgress(step.pct, step.msg);
      if (step.fn) await step.fn();
      await _sleep(120);
    }
  }

  function setElements(video, canvas) {
    _videoEl = video;
    _canvas  = canvas;
    _ctx     = canvas.getContext('2d');
  }

  function start() {
    if (_running) return;
    _running = true;
    _lastInferTs = 0;
    _currentTier = 0;
    _targetFPS = FPS_TIERS[0];
    requestAnimationFrame(_loop);
  }

  function stop() {
    _running = false;
  }

  async function _loop(timestamp) {
    if (!_running) return;

    // FPS tracking
    _frameCount++;
    if (timestamp - _lastFpsTs >= 1000) {
      const fps = _frameCount;
      _frameCount = 0;
      _lastFpsTs = timestamp;
      EmoState.set('fps', fps);
    }

    // Throttle inference
    const interval = 1000 / _targetFPS;
    if (timestamp - _lastInferTs >= interval) {
      _lastInferTs = timestamp;
      await _processFrame();
    }

    requestAnimationFrame(_loop);
  }

  async function _processFrame() {
    if (!_videoEl || !_videoEl.videoWidth) return;

    // Sync canvas
    if (_canvas.width !== _videoEl.videoWidth) _canvas.width = _videoEl.videoWidth;
    if (_canvas.height !== _videoEl.videoHeight) _canvas.height = _videoEl.videoHeight;
    _ctx.clearRect(0, 0, _canvas.width, _canvas.height);

    const t0 = performance.now();

    const result = await faceapi
      .detectSingleFace(_videoEl, new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: 0.45,
      }))
      .withFaceLandmarks(true)
      .withFaceExpressions();

    const inferenceMs = Math.round(performance.now() - t0);
    EmoState.set('inferenceMs', inferenceMs);

    // Adaptive FPS: if inference is slow, reduce target
    if (inferenceMs > 250 && _currentTier < FPS_TIERS.length - 1) {
      _currentTier++;
      _targetFPS = FPS_TIERS[_currentTier];
    } else if (inferenceMs < 100 && _currentTier > 0) {
      _currentTier--;
      _targetFPS = FPS_TIERS[_currentTier];
    }

    if (result) {
      _handleDetection(result, inferenceMs);
    } else {
      _handleNoFace();
    }
  }

  function _handleDetection(result, inferenceMs) {
    EmoState.update({
      faceDetected: true,
      detectionCount: EmoState.get('detectionCount') + 1,
    });

    // Classify with calibration + VAD + uncertainty
    const classified = EmoClassifier.classify(result.expressions);

    // Blink tracking
    if (result.landmarks?.positions) {
      EmoBlink.process(result.landmarks.positions);
    }

    // Multi-modal fusion
    const fused = EmoFusion.fuse(classified);

    // Draw overlay
    _drawOverlay(result, classified);

    // Emit main detection event
    EmoBus.emit(EmoBus.Events.EMOTION_TICK, {
      ...fused,
      rawExpressions: result.expressions,
      inferenceMs,
      timestamp: Date.now(),
    });

    // Check for emotion change
    const prevEmotion = EmoState.get('currentEmotion');
    const now = Date.now();
    const emotionChanged = classified.dominant !== prevEmotion;
    const expired = now - EmoState.get('lastResponseTs') > 4000;

    if (emotionChanged || expired) {
      EmoState.update({
        lastEmotion:    prevEmotion,
        currentEmotion: classified.dominant,
        emotionConf:    classified.dominantConf,
        expressions:    classified.expressions,
        lastResponseTs: now,
      });

      // Set mood tint on document
      document.documentElement.setAttribute('data-mood', classified.dominant);

      EmoBus.emit(EmoBus.Events.EMOTION_CHANGED, {
        emotion:     classified.dominant,
        previous:    prevEmotion,
        confidence:  classified.dominantConf,
        vad:         fused.vad,
        intensity:   classified.intensity,
        weather:     classified.weather,
        mixed:       classified.mixedEmotions,
        mixedLabel:  classified.mixedLabel,
        uncertainty: classified.uncertainty,
      });
    }
  }

  function _handleNoFace() {
    if (EmoState.get('faceDetected')) {
      EmoState.set('faceDetected', false);
      EmoBus.emit(EmoBus.Events.FACE_LOST);
    }
  }

  // ── Canvas Overlay Drawing ────────────────────────────────
  function _drawOverlay(result, classified) {
    const { EMOTIONS } = MoodScanEngine;
    const info = EMOTIONS[classified.dominant];
    const { x, y, width: w, height: h } = result.detection.box;
    const conf = classified.dominantConf;

    // Glow bounding box
    _ctx.shadowColor = info.color;
    _ctx.shadowBlur  = 18;
    _ctx.strokeStyle = info.color;
    _ctx.lineWidth   = 2.5;
    _ctx.beginPath();
    _roundRect(_ctx, x, y, w, h, 14);
    _ctx.stroke();
    _ctx.shadowBlur = 0;

    // Corner accents
    _drawCorners(_ctx, x, y, w, h, info.color);

    // Label pill
    const name  = MoodScanEngine.getEmotionName(classified.dominant, EmoState.get('lang'));
    const label = `${info.emoji}  ${name}  ${(conf * 100).toFixed(0)}%`;
    _ctx.font   = 'bold 14px "Space Grotesk", "Outfit", sans-serif';
    const tw    = _ctx.measureText(label).width;

    _ctx.fillStyle = info.color + 'e8';
    _ctx.shadowColor = info.color;
    _ctx.shadowBlur  = 8;
    _ctx.beginPath();
    _roundRect(_ctx, x - 1, y - 34, tw + 22, 27, 8);
    _ctx.fill();
    _ctx.shadowBlur = 0;

    _ctx.fillStyle = '#000000cc';
    _ctx.fillText(label, x + 11, y - 15);

    // Uncertainty indicator (right side)
    if (classified.uncertainty > 0.6) {
      _ctx.font = '11px "JetBrains Mono", monospace';
      _ctx.fillStyle = '#ffffff88';
      _ctx.fillText(`⚠ uncertain (${(classified.uncertainty * 100).toFixed(0)}%)`, x + w - 120, y - 15);
    }

    // Mixed emotion badge
    if (classified.mixedEmotions && classified.mixedLabel) {
      const secondInfo = EMOTIONS[classified.second];
      _ctx.fillStyle = (secondInfo?.color || '#fff') + '88';
      _ctx.font = '11px "Outfit", sans-serif';
      _ctx.fillText(`+ ${classified.second}`, x + tw + 26, y - 15);
    }

    // Landmark dots
    if (result.landmarks?.positions) {
      _ctx.fillStyle = info.color + '50';
      for (const pt of result.landmarks.positions) {
        _ctx.beginPath();
        _ctx.arc(pt.x, pt.y, 1.5, 0, Math.PI * 2);
        _ctx.fill();
      }
    }
  }

  function _drawCorners(ctx, x, y, w, h, color) {
    const L = 22;
    ctx.strokeStyle = color;
    ctx.lineWidth   = 3.5;
    ctx.shadowColor = color;
    ctx.shadowBlur  = 10;
    ctx.lineCap     = 'round';

    ctx.beginPath(); ctx.moveTo(x, y + L); ctx.lineTo(x, y); ctx.lineTo(x + L, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - L, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + L); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y + h - L); ctx.lineTo(x, y + h); ctx.lineTo(x + L, y + h); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w - L, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - L); ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.lineCap = 'butt';
  }

  function _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { loadModels, setElements, start, stop };
})();
