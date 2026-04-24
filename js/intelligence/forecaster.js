// ============================================================
//  EmoOS — Mood Forecaster
//  7-day forecast from historical patterns + day-of-week bias
// ============================================================
'use strict';

window.EmoForecast = (() => {
  const EMOTIONS = ['happy', 'sad', 'angry', 'fearful', 'disgusted', 'surprised', 'neutral'];
  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  /**
   * Generate 7-day mood forecast
   * Uses: same-day-of-week history, recent trend, overall averages
   */
  function forecast() {
    const history = EmoMemory.getHistory(30);
    const validDays = history.filter(d => d.totalPoints > 0);

    if (validDays.length < 3) {
      return _defaultForecast();
    }

    const results = [];
    const today = new Date();

    for (let i = 1; i <= 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + i);
      const dayOfWeek = targetDate.getDay();
      const dateStr = targetDate.toISOString().slice(0, 10);

      // Find same day-of-week entries
      const sameDayEntries = validDays.filter(d => {
        return new Date(d.date).getDay() === dayOfWeek;
      });

      // Weighted score per emotion
      const scores = {};
      EMOTIONS.forEach(e => scores[e] = 0);

      // Factor 1: Same day-of-week pattern (40%)
      if (sameDayEntries.length > 0) {
        for (const entry of sameDayEntries) {
          const total = Object.values(entry.counts).reduce((a, b) => a + b, 0);
          for (const [emo, count] of Object.entries(entry.counts)) {
            scores[emo] += (count / total) * 0.4;
          }
        }
        // Normalize
        const sameDayN = sameDayEntries.length;
        EMOTIONS.forEach(e => scores[e] /= sameDayN);
      }

      // Factor 2: Recent trend (last 3 days, 35%)
      const recent = validDays.slice(-3);
      if (recent.length > 0) {
        for (const entry of recent) {
          const total = Object.values(entry.counts).reduce((a, b) => a + b, 0);
          for (const [emo, count] of Object.entries(entry.counts)) {
            scores[emo] += (count / total) * 0.35 / recent.length;
          }
        }
      }

      // Factor 3: Overall average (25%)
      for (const entry of validDays) {
        const total = Object.values(entry.counts).reduce((a, b) => a + b, 0);
        for (const [emo, count] of Object.entries(entry.counts)) {
          scores[emo] += (count / total) * 0.25 / validDays.length;
        }
      }

      // Pick dominant
      const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
      const predictedEmo = sorted[0][0];
      const confidence = Math.min(0.85, sorted[0][1]); // cap at 85%

      results.push({
        date:       dateStr,
        dayName:    DAY_NAMES[dayOfWeek],
        predicted:  predictedEmo,
        confidence: Math.round(confidence * 100),
        weather:    EmoClassifier.getWeather(predictedEmo),
      });
    }

    EmoBus.emit(EmoBus.Events.FORECAST_UPDATED, results);
    return results;
  }

  function _defaultForecast() {
    const results = [];
    const today = new Date();
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      results.push({
        date:       d.toISOString().slice(0, 10),
        dayName:    DAY_NAMES[d.getDay()],
        predicted:  'neutral',
        confidence: 0,
        weather:    EmoClassifier.getWeather('neutral'),
        insufficient: true,
      });
    }
    return results;
  }

  return { forecast };
})();
