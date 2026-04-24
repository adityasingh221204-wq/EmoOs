// ============================================================
//  EmoOS — State Manager (Centralized Reactive State)
// ============================================================
'use strict';

window.EmoState = (() => {
  const _state = {
    // App
    lang:           'en',
    theme:          'dark',
    activeTab:      'scan',
    isRunning:      false,
    sessionId:      Date.now().toString(36) + Math.random().toString(36).slice(2),
    sessionStart:   null,

    // Detection
    faceDetected:   false,
    currentEmotion: null,
    lastEmotion:    null,
    emotionConf:    0,
    expressions:    {},
    inferenceMs:    0,
    fps:            0,
    detectionCount: 0,

    // VAD (Valence-Arousal-Dominance)
    valence:   0,
    arousal:   0,
    dominance: 0,

    // Voice
    voiceActive:    false,
    voiceEmotion:   null,
    voiceConf:      0,
    voiceStress:    0,

    // Blink
    blinkRate:      0,   // blinks per minute
    fatigueScore:   0,   // 0-1
    stressFromBlink:0,   // 0-1

    // Fusion
    fusedEmotion:   null,
    fusedConf:      0,
    mixedEmotions:  false,

    // Gamification
    xp:             0,
    level:          1,
    streak:         0,
    totalSessions:  0,
    achievements:   [],

    // Wellness
    sosActive:      false,
    breathingActive:false,
    negativeStreak: 0, // consecutive seconds of negative emotion

    // Companion
    echoPersonality: 'cheerleader',
    echoMood:        'neutral',

    // Misc
    lastResponseTs: 0,
    frameCount:     0,
    lastFpsTs:      Date.now(),
  };

  const _watchers = {};

  function get(key) {
    if (key) return _state[key];
    return { ..._state };
  }

  function set(key, value) {
    const old = _state[key];
    if (old === value) return;
    _state[key] = value;
    // Notify watchers
    if (_watchers[key]) {
      for (const fn of _watchers[key]) {
        try { fn(value, old, key); } catch(e) { console.error('[EmoState] Watcher error:', e); }
      }
    }
  }

  function update(partial) {
    for (const [k, v] of Object.entries(partial)) {
      set(k, v);
    }
  }

  function watch(key, callback) {
    if (!_watchers[key]) _watchers[key] = [];
    _watchers[key].push(callback);
    return () => {
      _watchers[key] = _watchers[key].filter(fn => fn !== callback);
    };
  }

  // Restore persisted state from localStorage
  function restore() {
    const theme = localStorage.getItem('emoos_theme');
    const lang  = localStorage.getItem('emoos_lang');
    const xp    = localStorage.getItem('emoos_xp');
    const level = localStorage.getItem('emoos_level');
    const streak= localStorage.getItem('emoos_streak');
    const total = localStorage.getItem('emoos_totalSessions');
    const achievements = localStorage.getItem('emoos_achievements');
    const personality = localStorage.getItem('emoos_echoPersonality');

    if (theme)  _state.theme = theme;
    if (lang)   _state.lang  = lang;
    if (xp)     _state.xp    = parseInt(xp) || 0;
    if (level)  _state.level = parseInt(level) || 1;
    if (streak) _state.streak= parseInt(streak) || 0;
    if (total)  _state.totalSessions = parseInt(total) || 0;
    if (achievements) {
      try { _state.achievements = JSON.parse(achievements); } catch(e) {}
    }
    if (personality) _state.echoPersonality = personality;
  }

  function persist() {
    localStorage.setItem('emoos_theme', _state.theme);
    localStorage.setItem('emoos_lang',  _state.lang);
    localStorage.setItem('emoos_xp',    String(_state.xp));
    localStorage.setItem('emoos_level', String(_state.level));
    localStorage.setItem('emoos_streak',String(_state.streak));
    localStorage.setItem('emoos_totalSessions', String(_state.totalSessions));
    localStorage.setItem('emoos_achievements', JSON.stringify(_state.achievements));
    localStorage.setItem('emoos_echoPersonality', _state.echoPersonality);
  }

  return { get, set, update, watch, restore, persist };
})();
