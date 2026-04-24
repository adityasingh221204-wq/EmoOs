// ============================================================
//  EmoOS — Anomaly Detector
//  Detects emotional shifts, sustained negativity, instability
// ============================================================
'use strict';

window.EmoAnomaly = (() => {
  const WINDOW_SIZE     = 60; // seconds to track
  const SHIFT_THRESHOLD = 3;  // emotion changes in 60s = instability
  const NEGATIVE_ALERT  = 300; // 5 minutes of sustained negativity
  const AROUSAL_SPIKE   = 0.4; // VAD arousal jump from baseline

  let _emotionChanges = []; // timestamps of emotion changes
  let _negativeSince  = null;
  let _lastArousal    = 0;
  let _sosSuggested   = false;

  function init() {
    EmoBus.on(EmoBus.Events.EMOTION_CHANGED, _onEmotionChange);
  }

  function _onEmotionChange(data) {
    const now = Date.now();

    // Track emotion changes for instability detection
    _emotionChanges.push(now);
    _emotionChanges = _emotionChanges.filter(ts => ts > now - (WINDOW_SIZE * 1000));

    // Check instability
    if (_emotionChanges.length >= SHIFT_THRESHOLD) {
      EmoBus.emit(EmoBus.Events.ANOMALY_DETECTED, {
        type: 'instability',
        message: `Emotional instability detected: ${_emotionChanges.length} shifts in 60 seconds`,
        severity: 'medium',
      });
    }

    // Check sustained negativity
    const isNegative = ['sad', 'angry', 'fearful', 'disgusted'].includes(data.emotion);
    if (isNegative) {
      if (!_negativeSince) _negativeSince = now;
      const duration = (now - _negativeSince) / 1000;

      if (duration > NEGATIVE_ALERT && !_sosSuggested) {
        _sosSuggested = true;
        EmoBus.emit(EmoBus.Events.ANOMALY_DETECTED, {
          type: 'sustained_negative',
          message: 'Sustained negative emotion detected. Would you like to try a wellness exercise?',
          severity: 'high',
          duration: Math.round(duration),
          suggestSOS: true,
        });
      }
    } else {
      _negativeSince = null;
      _sosSuggested = false;
    }

    // Check arousal spike from baseline
    const baseline = EmoMemory.getBaseline();
    if (baseline && data.vad) {
      const baseArousal = baseline.avgVAD?.a || 0;
      const currentArousal = data.vad.a || 0;
      if (Math.abs(currentArousal - baseArousal) > AROUSAL_SPIKE) {
        EmoBus.emit(EmoBus.Events.ANOMALY_DETECTED, {
          type: 'arousal_spike',
          message: `Arousal ${currentArousal > baseArousal ? 'spike' : 'drop'} detected (${((currentArousal - baseArousal) * 100).toFixed(0)}% from baseline)`,
          severity: 'low',
        });
      }
    }
  }

  function reset() {
    _emotionChanges = [];
    _negativeSince  = null;
    _sosSuggested   = false;
  }

  return { init, reset };
})();
