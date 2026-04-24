// ============================================================
//  EmoOS — Blink Tracker (Eye Aspect Ratio via Landmarks)
//  Detects blinks, fatigue, and stress from eye landmarks
// ============================================================
'use strict';

window.EmoBlink = (() => {
  // Eye landmark indices for 68-point model
  // Left eye:  points 36-41
  // Right eye: points 42-47
  const LEFT_EYE  = [36, 37, 38, 39, 40, 41];
  const RIGHT_EYE = [42, 43, 44, 45, 46, 47];

  const EAR_THRESHOLD = 0.21;   // Below this = eye closed
  const BLINK_FRAMES  = 3;      // Min consecutive frames for blink
  const HISTORY_SIZE  = 60;     // 60 seconds of blink data

  let _blinkCount   = 0;
  let _closedFrames = 0;
  let _blinkHistory = []; // timestamps of blinks
  let _earHistory   = []; // recent EAR values for smoothing
  const EAR_SMOOTH  = 5;

  /**
   * Calculate Eye Aspect Ratio (EAR)
   * EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)
   */
  function _calcEAR(eyePoints) {
    if (eyePoints.length !== 6) return 1;
    const p = eyePoints;

    const vertical1 = _dist(p[1], p[5]);
    const vertical2 = _dist(p[2], p[4]);
    const horizontal = _dist(p[0], p[3]);

    if (horizontal === 0) return 1;
    return (vertical1 + vertical2) / (2 * horizontal);
  }

  function _dist(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  /**
   * Process a frame with face landmarks
   * @param {Array} landmarks - 68-point landmark positions
   */
  function process(landmarks) {
    if (!landmarks || landmarks.length < 48) return getState();

    const leftEyePoints  = LEFT_EYE.map(i => landmarks[i]);
    const rightEyePoints = RIGHT_EYE.map(i => landmarks[i]);

    const leftEAR  = _calcEAR(leftEyePoints);
    const rightEAR = _calcEAR(rightEyePoints);
    const avgEAR   = (leftEAR + rightEAR) / 2;

    // Smooth EAR
    _earHistory.push(avgEAR);
    if (_earHistory.length > EAR_SMOOTH) _earHistory.shift();
    const smoothEAR = _earHistory.reduce((a, b) => a + b, 0) / _earHistory.length;

    // Blink detection
    if (smoothEAR < EAR_THRESHOLD) {
      _closedFrames++;
    } else {
      if (_closedFrames >= BLINK_FRAMES) {
        // Blink detected!
        _blinkCount++;
        _blinkHistory.push(Date.now());
        EmoBus.emit(EmoBus.Events.BLINK_EVENT, { type: 'blink', count: _blinkCount });
      }
      _closedFrames = 0;
    }

    // Clean old history (keep last 60s)
    const cutoff = Date.now() - 60000;
    _blinkHistory = _blinkHistory.filter(ts => ts > cutoff);

    return getState();
  }

  function getState() {
    const blinksPerMin = _blinkHistory.length;

    // Fatigue: low blink rate (<10/min) or very high (>30/min) with low EAR
    let fatigueScore = 0;
    if (blinksPerMin < 10) fatigueScore = Math.min(1, (10 - blinksPerMin) / 10);
    const avgEAR = _earHistory.length > 0
      ? _earHistory.reduce((a, b) => a + b, 0) / _earHistory.length
      : 0.3;
    if (avgEAR < 0.25) fatigueScore = Math.max(fatigueScore, 0.6);

    // Stress: elevated blink rate (>25/min)
    let stressScore = 0;
    if (blinksPerMin > 25) stressScore = Math.min(1, (blinksPerMin - 25) / 15);

    return {
      blinkRate: blinksPerMin,
      fatigueScore: Math.round(fatigueScore * 100) / 100,
      stressScore:  Math.round(stressScore * 100) / 100,
      totalBlinks:  _blinkCount,
      avgEAR:       Math.round(avgEAR * 1000) / 1000,
    };
  }

  function reset() {
    _blinkCount = 0;
    _closedFrames = 0;
    _blinkHistory = [];
    _earHistory = [];
  }

  return { process, getState, reset };
})();
