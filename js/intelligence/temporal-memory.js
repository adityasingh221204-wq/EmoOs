// ============================================================
//  EmoOS — Temporal Memory (30-Day Mood History)
//  Session history, daily aggregates, personal baselines
// ============================================================
'use strict';

window.EmoMemory = (() => {
  const SESSION_BUFFER_SIZE = 500;
  const DAY_KEY_PREFIX      = 'day_';
  const BASELINE_KEY        = 'baseline';
  const HISTORY_DAYS        = 30;

  let _sessionBuffer = []; // ring buffer for current session
  let _baseline = null;

  function init() {
    _baseline = EmoStorage.load(BASELINE_KEY, { defaultVal: null });

    // Listen for emotion ticks
    EmoBus.on(EmoBus.Events.EMOTION_TICK, (data) => {
      _addToSession(data);
    });
  }

  function _addToSession(data) {
    _sessionBuffer.push({
      emotion:    data.emotion,
      confidence: data.confidence,
      vad:        data.vad,
      stress:     data.stress,
      ts:         data.timestamp,
    });

    if (_sessionBuffer.length > SESSION_BUFFER_SIZE) {
      _sessionBuffer.shift();
    }
  }

  /**
   * Save today's aggregate when session ends or periodically
   */
  function saveDayAggregate() {
    if (_sessionBuffer.length === 0) return;

    const today = _dateKey(new Date());
    const existing = EmoStorage.load(DAY_KEY_PREFIX + today, { defaultVal: null });

    // Count emotions
    const counts = {};
    let totalV = 0, totalA = 0, totalD = 0, totalStress = 0;

    for (const entry of _sessionBuffer) {
      counts[entry.emotion] = (counts[entry.emotion] || 0) + 1;
      totalV += entry.vad?.v || 0;
      totalA += entry.vad?.a || 0;
      totalD += entry.vad?.d || 0;
      totalStress += entry.stress || 0;
    }

    const n = _sessionBuffer.length;
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';

    const aggregate = {
      date:       today,
      dominant,
      counts,
      avgVAD: {
        v: Math.round((totalV / n) * 100) / 100,
        a: Math.round((totalA / n) * 100) / 100,
        d: Math.round((totalD / n) * 100) / 100,
      },
      avgStress:  Math.round((totalStress / n) * 100) / 100,
      totalPoints: n,
      sessionCount: (existing?.sessionCount || 0) + 1,
    };

    // Merge with existing day data
    if (existing) {
      // Merge counts
      for (const [emo, count] of Object.entries(existing.counts || {})) {
        aggregate.counts[emo] = (aggregate.counts[emo] || 0) + count;
      }
      aggregate.totalPoints += existing.totalPoints || 0;
      // Re-calculate dominant
      aggregate.dominant = Object.entries(aggregate.counts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    }

    EmoStorage.save(DAY_KEY_PREFIX + today, aggregate);
    _updateBaseline();
  }

  /**
   * Get last N days of aggregates
   */
  function getHistory(days = 7) {
    const result = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = _dateKey(d);
      const data = EmoStorage.load(DAY_KEY_PREFIX + key, { defaultVal: null });
      result.push({ date: key, ...(data || { dominant: null, counts: {}, avgVAD: { v: 0, a: 0, d: 0 }, totalPoints: 0 }) });
    }
    return result.reverse(); // oldest first
  }

  /**
   * Get personal baseline (running average across all days)
   */
  function _updateBaseline() {
    const history = getHistory(HISTORY_DAYS);
    const valid = history.filter(d => d.totalPoints > 0);
    if (valid.length < 3) return; // Need minimum data

    const emotionAvgs = {};
    let totalV = 0, totalA = 0, totalD = 0;

    for (const day of valid) {
      totalV += day.avgVAD?.v || 0;
      totalA += day.avgVAD?.a || 0;
      totalD += day.avgVAD?.d || 0;
      for (const [emo, count] of Object.entries(day.counts || {})) {
        emotionAvgs[emo] = (emotionAvgs[emo] || 0) + count;
      }
    }

    const n = valid.length;
    _baseline = {
      avgVAD: {
        v: Math.round((totalV / n) * 100) / 100,
        a: Math.round((totalA / n) * 100) / 100,
        d: Math.round((totalD / n) * 100) / 100,
      },
      emotionFrequency: emotionAvgs,
      daysTracked: n,
      lastUpdated: Date.now(),
    };

    EmoStorage.save(BASELINE_KEY, _baseline);
    EmoBus.emit(EmoBus.Events.BASELINE_CALIBRATED, _baseline);
  }

  function getBaseline() { return _baseline; }
  function getSessionBuffer() { return [..._sessionBuffer]; }
  function getSessionLength() { return _sessionBuffer.length; }

  /**
   * Generate emotional story for current session
   */
  function generateSessionStory() {
    if (_sessionBuffer.length < 10) return 'Not enough data for a story yet.';

    const thirds = [
      _sessionBuffer.slice(0, Math.floor(_sessionBuffer.length / 3)),
      _sessionBuffer.slice(Math.floor(_sessionBuffer.length / 3), Math.floor(2 * _sessionBuffer.length / 3)),
      _sessionBuffer.slice(Math.floor(2 * _sessionBuffer.length / 3)),
    ];

    const dominant = thirds.map(third => {
      const counts = {};
      for (const e of third) counts[e.emotion] = (counts[e.emotion] || 0) + 1;
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'neutral';
    });

    const storyParts = {
      happy:     ['feeling radiant', 'beaming with joy', 'lit up with happiness'],
      sad:       ['carrying some weight', 'feeling reflective', 'in a tender space'],
      angry:     ['fired up', 'channeling intensity', 'feeling passionate'],
      fearful:   ['navigating uncertainty', 'facing the unknown', 'stepping through fear'],
      disgusted: ['feeling particular', 'having strong opinions', 'filtering the world'],
      surprised: ['full of wonder', 'caught off guard', 'discovering something new'],
      neutral:   ['perfectly centered', 'in calm equilibrium', 'peacefully composed'],
    };

    const pick = (emo) => {
      const arr = storyParts[emo] || storyParts.neutral;
      return arr[Math.floor(Math.random() * arr.length)];
    };

    return `You started ${pick(dominant[0])}. As the session progressed, you were ${pick(dominant[1])}. You ended today ${pick(dominant[2])}. ✨`;
  }

  function _dateKey(date) {
    return date.toISOString().slice(0, 10);
  }

  return { init, saveDayAggregate, getHistory, getBaseline, getSessionBuffer, getSessionLength, generateSessionStory };
})();
