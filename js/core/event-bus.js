// ============================================================
//  EmoOS — Event Bus (Pub/Sub Communication Layer)
//  Decouples all subsystems via event-driven architecture
// ============================================================
'use strict';

window.EmoBus = (() => {
  const _listeners = {};
  const _history   = [];
  const MAX_HISTORY = 100;

  function on(event, callback, options = {}) {
    if (!_listeners[event]) _listeners[event] = [];
    const entry = { callback, once: !!options.once, id: _uid() };
    _listeners[event].push(entry);
    return entry.id; // return ID for unsubscribe
  }

  function once(event, callback) {
    return on(event, callback, { once: true });
  }

  function off(event, id) {
    if (!_listeners[event]) return;
    _listeners[event] = _listeners[event].filter(e => e.id !== id);
  }

  function emit(event, data = {}) {
    const entry = { event, data, ts: Date.now() };
    _history.push(entry);
    if (_history.length > MAX_HISTORY) _history.shift();

    if (!_listeners[event]) return;
    const toRemove = [];
    for (const listener of _listeners[event]) {
      try {
        listener.callback(data);
      } catch (err) {
        console.error(`[EmoBus] Error in listener for "${event}":`, err);
      }
      if (listener.once) toRemove.push(listener.id);
    }
    toRemove.forEach(id => off(event, id));
  }

  function _uid() {
    return Math.random().toString(36).slice(2, 10);
  }

  function getHistory() { return [..._history]; }

  // ── Standard Event Names ──────────────────────────────────
  const Events = {
    // ML Events
    FACE_DETECTED:       'face:detected',
    FACE_LOST:           'face:lost',
    EMOTION_CHANGED:     'emotion:changed',
    EMOTION_TICK:        'emotion:tick',
    VOICE_RESULT:        'voice:result',
    BLINK_EVENT:         'blink:event',
    FUSION_RESULT:       'fusion:result',

    // Intelligence Events
    ANOMALY_DETECTED:    'anomaly:detected',
    FORECAST_UPDATED:    'forecast:updated',
    BASELINE_CALIBRATED: 'baseline:calibrated',

    // UI Events
    THEME_CHANGED:       'ui:theme',
    LANG_CHANGED:        'ui:lang',
    TAB_CHANGED:         'ui:tab',
    MOOD_TINT_CHANGED:   'ui:moodTint',

    // Gamification Events
    XP_GAINED:           'game:xp',
    LEVEL_UP:            'game:levelUp',
    ACHIEVEMENT_UNLOCK:  'game:achievement',
    STREAK_UPDATE:       'game:streak',
    QUEST_COMPLETE:      'game:quest',

    // Wellness Events
    BREATHING_START:     'wellness:breathStart',
    BREATHING_END:       'wellness:breathEnd',
    SOS_TRIGGERED:       'wellness:sos',
    AFFIRMATION_SHOWN:   'wellness:affirmation',

    // Session Events
    SESSION_START:       'session:start',
    SESSION_MILESTONE:   'session:milestone',
    FEEDBACK_SUBMITTED:  'feedback:submitted',

    // Companion Events
    ECHO_SPEAK:          'echo:speak',
    ECHO_MOOD_CHANGE:    'echo:moodChange',

    // Journal Events
    JOURNAL_ENTRY_ADDED: 'journal:added',

    // Toast
    TOAST:               'ui:toast',
  };

  return { on, once, off, emit, Events, getHistory };
})();
