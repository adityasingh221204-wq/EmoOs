// ============================================================
//  EmoOS — Emotion Classifier (Calibration + Uncertainty)
//  Temperature scaling, mixed emotion detection, VAD mapping
// ============================================================
'use strict';

window.EmoClassifier = (() => {
  // VAD mapping: FER+ emotion → Valence/Arousal/Dominance space
  const VAD_MAP = {
    happy:     { v:  0.9, a:  0.6, d:  0.5 },
    sad:       { v: -0.7, a: -0.5, d: -0.6 },
    angry:     { v: -0.6, a:  0.8, d:  0.7 },
    fearful:   { v: -0.7, a:  0.7, d: -0.8 },
    disgusted: { v: -0.5, a:  0.2, d:  0.3 },
    surprised: { v:  0.1, a:  0.9, d: -0.1 },
    neutral:   { v:  0.0, a:  0.0, d:  0.0 },
  };

  // Temperature for softmax calibration (>1 = less confident, <1 = more)
  let temperature = 1.3; // slightly deflate overconfident predictions

  // Emotional weather metaphors
  const WEATHER_MAP = {
    happy:     { icon: '☀️', desc: 'Sunny & bright' },
    sad:       { icon: '🌧️', desc: 'Gentle rain' },
    angry:     { icon: '⛈️', desc: 'Thunderstorms' },
    fearful:   { icon: '🌫️', desc: 'Foggy & uncertain' },
    disgusted: { icon: '🌪️', desc: 'Turbulent winds' },
    surprised: { icon: '⚡', desc: 'Lightning bolt' },
    neutral:   { icon: '☁️', desc: 'Partly cloudy' },
  };

  // Intensity labels
  const INTENSITY = [
    { min: 0,    max: 0.3,  label: 'slight',  level: 1 },
    { min: 0.3,  max: 0.55, label: 'mild',    level: 2 },
    { min: 0.55, max: 0.75, label: 'moderate', level: 3 },
    { min: 0.75, max: 0.9,  label: 'strong',  level: 4 },
    { min: 0.9,  max: 1.0,  label: 'intense', level: 5 },
  ];

  /**
   * Apply temperature scaling to raw softmax probabilities
   */
  function calibrate(expressions) {
    const entries = Object.entries(expressions);
    // Apply temperature
    const scaled = entries.map(([k, v]) => [k, Math.exp(Math.log(v + 1e-8) / temperature)]);
    const sum = scaled.reduce((s, [, v]) => s + v, 0);
    const calibrated = {};
    for (const [k, v] of scaled) {
      calibrated[k] = v / sum;
    }
    return calibrated;
  }

  /**
   * Get dominant emotion with mixed-emotion detection
   */
  function classify(rawExpressions) {
    const expressions = calibrate(rawExpressions);
    const sorted = Object.entries(expressions).sort((a, b) => b[1] - a[1]);

    const dominant  = sorted[0][0];
    const dominantConf = sorted[0][1];
    const second    = sorted[1][0];
    const secondConf = sorted[1][1];

    // Mixed emotion detection: if top-2 are within 15%
    const mixedEmotions = (dominantConf - secondConf) < 0.15;
    const mixedLabel = mixedEmotions ? `${dominant}+${second}` : null;

    // VAD computation (weighted average across all emotions)
    let v = 0, a = 0, d = 0;
    for (const [emo, prob] of Object.entries(expressions)) {
      const vad = VAD_MAP[emo];
      if (vad) {
        v += vad.v * prob;
        a += vad.a * prob;
        d += vad.d * prob;
      }
    }

    // Intensity
    const intensity = getIntensity(dominantConf);

    // Weather
    const weather = WEATHER_MAP[dominant] || WEATHER_MAP.neutral;

    // Uncertainty: Shannon entropy of distribution
    let entropy = 0;
    for (const [, p] of Object.entries(expressions)) {
      if (p > 0) entropy -= p * Math.log2(p);
    }
    const maxEntropy = Math.log2(7); // 7 classes
    const uncertainty = entropy / maxEntropy; // 0 = certain, 1 = maximum uncertainty

    return {
      dominant,
      dominantConf,
      second,
      secondConf,
      mixedEmotions,
      mixedLabel,
      expressions,
      vad: { v: Math.round(v * 100) / 100, a: Math.round(a * 100) / 100, d: Math.round(d * 100) / 100 },
      intensity,
      weather,
      uncertainty: Math.round(uncertainty * 100) / 100,
    };
  }

  function getIntensity(confidence) {
    for (const level of INTENSITY) {
      if (confidence >= level.min && confidence < level.max) return level;
    }
    return INTENSITY[INTENSITY.length - 1];
  }

  function getVAD(emotion) {
    return VAD_MAP[emotion] || VAD_MAP.neutral;
  }

  function getWeather(emotion) {
    return WEATHER_MAP[emotion] || WEATHER_MAP.neutral;
  }

  function setTemperature(t) { temperature = t; }

  return { classify, calibrate, getVAD, getWeather, getIntensity, setTemperature, VAD_MAP, WEATHER_MAP };
})();
