// ============================================================
//  EmoOS — Feedback System (Expanded)
//  User correction loop for model retraining
// ============================================================
'use strict';

window.MoodScanFeedback = (() => {
  const STORAGE_KEY = 'feedback';
  let _currentEmotion = null;
  let _currentConf    = 0;

  function init() {}

  function setCurrentEmotion(emotion, confidence) {
    _currentEmotion = emotion;
    _currentConf = confidence;
    // Reset UI
    const thanks = document.getElementById('feedbackThanks');
    const btns   = document.getElementById('feedbackBtns');
    const picker = document.getElementById('correctionPicker');
    if (thanks) thanks.classList.remove('show');
    if (btns)   btns.style.display = 'flex';
    if (picker) picker.innerHTML = '';
  }

  function submitFeedback(isCorrect) {
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      ts: Date.now(),
      sessionId: EmoState.get('sessionId'),
      detected: _currentEmotion,
      confidence: Math.round(_currentConf * 1000) / 1000,
      isCorrect,
      corrected: isCorrect ? _currentEmotion : null,
      lang: EmoState.get('lang'),
    };

    if (isCorrect) {
      _saveFeedback(entry);
      _showThanks();
    } else {
      _showCorrectionPicker(entry);
    }
  }

  function _showCorrectionPicker(entry) {
    const picker = document.getElementById('correctionPicker');
    if (!picker) return;

    const emotions = MoodScanEngine.EMOTION_ORDER;
    picker.innerHTML = `
      <div style="font-size:var(--fs-xs);color:var(--text-muted);margin-bottom:var(--sp-2)">What was your actual emotion?</div>
      <div style="display:flex;flex-wrap:wrap;gap:var(--sp-1)">
        ${emotions.map(e => {
          const info = MoodScanEngine.EMOTIONS[e];
          return `<button class="btn btn-sm btn-secondary" onclick="MoodScanFeedback._correctTo('${e}')" style="font-size:var(--fs-xs)">${info.emoji} ${e}</button>`;
        }).join('')}
      </div>
    `;

    // Store pending entry
    picker.dataset.pendingEntry = JSON.stringify(entry);
  }

  function _correctTo(emotion) {
    const picker = document.getElementById('correctionPicker');
    if (!picker) return;
    try {
      const entry = JSON.parse(picker.dataset.pendingEntry);
      entry.corrected = emotion;
      _saveFeedback(entry);
      _showThanks();
    } catch(e) {}
  }

  function _saveFeedback(entry) {
    EmoStorage.appendToArray(STORAGE_KEY, entry, 500);
    EmoBus.emit(EmoBus.Events.FEEDBACK_SUBMITTED, entry);
  }

  function _showThanks() {
    const thanks = document.getElementById('feedbackThanks');
    const btns   = document.getElementById('feedbackBtns');
    const picker = document.getElementById('correctionPicker');
    if (thanks) thanks.classList.add('show');
    if (btns)   btns.style.display = 'none';
    if (picker) picker.innerHTML = '';
  }

  function getStats() {
    const data = EmoStorage.load(STORAGE_KEY, { defaultVal: [] });
    return {
      total: data.length,
      correct: data.filter(e => e.isCorrect).length,
      incorrect: data.filter(e => !e.isCorrect).length,
    };
  }

  function exportCSV() {
    const data = EmoStorage.load(STORAGE_KEY, { defaultVal: [] });
    EmoStorage.exportCSV(data, `emoos_feedback_${Date.now()}.csv`);
  }

  return { init, setCurrentEmotion, submitFeedback, _correctTo, getStats, exportCSV };
})();
