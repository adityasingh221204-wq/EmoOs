// ============================================================
//  EmoOS — Analytics (Expanded Dashboard)
//  Doughnut, Timeline, Radar, Heatmap, Session Stats
// ============================================================
'use strict';

/* global Chart */

window.MoodScanAnalytics = (() => {
  let _doughnutChart = null;
  let _timelineChart = null;
  let _radarChart    = null;
  const EMOTION_ORDER = ['happy','sad','angry','fearful','disgusted','surprised','neutral'];
  const COLORS = ['#FBBF24','#60A5FA','#EF4444','#A78BFA','#34D399','#FB923C','#94A3B8'];

  let _sessionCounts = {};
  let _timelineData  = {};
  let _timelineLabels = [];
  const MAX_TIMELINE = 60;

  EMOTION_ORDER.forEach(e => { _sessionCounts[e] = 0; _timelineData[e] = []; });

  function init() {
    EmoBus.on(EmoBus.Events.EMOTION_TICK, _onTick);
    _initCharts();
  }

  let _tickCounter = 0;
  function _onTick(data) {
    _tickCounter++;
    const emo = data.emotion;
    _sessionCounts[emo] = (_sessionCounts[emo] || 0) + 1;

    // Update timeline every ~1s (15 ticks)
    if (_tickCounter % 15 === 0) {
      const label = new Date().toLocaleTimeString([], { minute:'2-digit', second:'2-digit' });
      _timelineLabels.push(label);
      if (_timelineLabels.length > MAX_TIMELINE) _timelineLabels.shift();

      EMOTION_ORDER.forEach(e => {
        _timelineData[e].push(_sessionCounts[e]);
        if (_timelineData[e].length > MAX_TIMELINE) _timelineData[e].shift();
      });

      _updateCharts();
      _updateStats();
    }
  }

  function _initCharts() {
    // Wait for DOM
    setTimeout(() => {
      _initDoughnut();
      _initTimeline();
      _initRadar();
    }, 500);
  }

  function _initDoughnut() {
    const canvas = document.getElementById('pieChartCanvas');
    if (!canvas) return;
    const isDark = EmoState.get('theme') === 'dark';
    _doughnutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: EMOTION_ORDER.map(e => e.charAt(0).toUpperCase() + e.slice(1)),
        datasets: [{ data: EMOTION_ORDER.map(() => 0), backgroundColor: COLORS, borderWidth: 0 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: isDark ? '#b0b0c8' : '#3a3a5c', font: { size: 10 }, boxWidth: 10, padding: 8 } }
        }
      }
    });
  }

  function _initTimeline() {
    const canvas = document.getElementById('timelineChartCanvas');
    if (!canvas) return;
    const isDark = EmoState.get('theme') === 'dark';
    _timelineChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: [],
        datasets: EMOTION_ORDER.map((e, i) => ({
          label: e, data: [], borderColor: COLORS[i], backgroundColor: COLORS[i] + '20',
          borderWidth: 1.5, pointRadius: 0, tension: 0.4, fill: false,
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 300 },
        scales: {
          x: { display: false },
          y: { display: true, grid: { color: isDark ? '#ffffff08' : '#00000008' }, ticks: { color: isDark ? '#6b6b88' : '#9999b0', font: { size: 9 } } }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function _initRadar() {
    const canvas = document.getElementById('radarChartCanvas');
    if (!canvas) return;
    const isDark = EmoState.get('theme') === 'dark';
    _radarChart = new Chart(canvas, {
      type: 'radar',
      data: {
        labels: ['Valence', 'Arousal', 'Dominance'],
        datasets: [{
          data: [0, 0, 0],
          backgroundColor: 'rgba(167,139,250,0.15)',
          borderColor: '#a78bfa',
          borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#a78bfa',
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        scales: {
          r: {
            min: -1, max: 1,
            ticks: { display: false, stepSize: 0.5 },
            grid: { color: isDark ? '#ffffff10' : '#00000010' },
            pointLabels: { color: isDark ? '#b0b0c8' : '#3a3a5c', font: { size: 11, family: 'Space Grotesk' } }
          }
        },
        plugins: { legend: { display: false } }
      }
    });
  }

  function _updateCharts() {
    if (_doughnutChart) {
      _doughnutChart.data.datasets[0].data = EMOTION_ORDER.map(e => _sessionCounts[e] || 0);
      _doughnutChart.update('none');
    }
    if (_timelineChart) {
      _timelineChart.data.labels = [..._timelineLabels];
      EMOTION_ORDER.forEach((e, i) => {
        _timelineChart.data.datasets[i].data = [...(_timelineData[e] || [])];
      });
      _timelineChart.update('none');
    }
    if (_radarChart) {
      const v = EmoState.get('valence') || 0;
      const a = EmoState.get('arousal') || 0;
      const d = EmoState.get('dominance') || 0;
      _radarChart.data.datasets[0].data = [v, a, d];
      _radarChart.update('none');
    }
  }

  function _updateStats() {
    const total = Object.values(_sessionCounts).reduce((a, b) => a + b, 0);
    const dominant = Object.entries(_sessionCounts).sort((a, b) => b[1] - a[1])[0];
    const duration = EmoState.get('sessionStart') ? Math.floor((Date.now() - EmoState.get('sessionStart')) / 1000) : 0;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;

    _setEl('statTotal', total);
    _setEl('statDominant', dominant ? `${MoodScanEngine.EMOTIONS[dominant[0]]?.emoji || ''} ${dominant[0]}` : '--');
    _setEl('statDuration', `${mins}:${String(secs).padStart(2, '0')}`);
    _setEl('statInference', (EmoState.get('inferenceMs') || '--') + 'ms');
    _setEl('fpsStat', EmoState.get('fps') || '--');
    _setEl('infBadge', (EmoState.get('inferenceMs') || '--') + 'ms');
    _setEl('fpsBadge', (EmoState.get('fps') || '--') + ' fps');
  }

  function _setEl(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function updateChartTheme(theme) {
    const isDark = theme === 'dark';
    const textColor = isDark ? '#b0b0c8' : '#3a3a5c';
    const gridColor = isDark ? '#ffffff08' : '#00000008';

    if (_doughnutChart) {
      _doughnutChart.options.plugins.legend.labels.color = textColor;
      _doughnutChart.update('none');
    }
    if (_timelineChart) {
      _timelineChart.options.scales.y.grid.color = gridColor;
      _timelineChart.options.scales.y.ticks.color = isDark ? '#6b6b88' : '#9999b0';
      _timelineChart.update('none');
    }
    if (_radarChart) {
      _radarChart.options.scales.r.grid.color = isDark ? '#ffffff10' : '#00000010';
      _radarChart.options.scales.r.pointLabels.color = textColor;
      _radarChart.update('none');
    }
  }

  function exportSessionCSV() {
    const buf = EmoMemory.getSessionBuffer();
    if (!buf.length) return;
    EmoStorage.exportCSV(buf.map(e => ({
      timestamp: new Date(e.ts).toISOString(),
      emotion: e.emotion, confidence: e.confidence,
      valence: e.vad?.v, arousal: e.vad?.a, dominance: e.vad?.d, stress: e.stress
    })), `emoos_session_${Date.now()}.csv`);
  }

  return { init, updateChartTheme, exportSessionCSV };
})();
