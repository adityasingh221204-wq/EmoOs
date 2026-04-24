// ============================================================
//  EmoOS — Emotional Journal
//  Mood-tagged entries with auto-detection context
// ============================================================
'use strict';

window.EmoJournal = (() => {
  const STORAGE_KEY = 'journal';

  function init() {}

  function addEntry(text, options = {}) {
    const emotion = options.emotion || EmoState.get('currentEmotion') || 'neutral';
    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      text: text.trim(), emotion,
      vad: { v: EmoState.get('valence'), a: EmoState.get('arousal'), d: EmoState.get('dominance') },
      timestamp: Date.now(),
      date: new Date().toISOString().slice(0, 10),
    };
    EmoStorage.appendToArray(STORAGE_KEY, entry, 500);
    EmoBus.emit(EmoBus.Events.JOURNAL_ENTRY_ADDED, entry);
    return entry;
  }

  function getEntries(limit = 50) {
    return (EmoStorage.load(STORAGE_KEY, { defaultVal: [] })).slice(-limit).reverse();
  }

  function deleteEntry(id) {
    let entries = EmoStorage.load(STORAGE_KEY, { defaultVal: [] });
    EmoStorage.save(STORAGE_KEY, entries.filter(e => e.id !== id));
  }

  function getCount() {
    return (EmoStorage.load(STORAGE_KEY, { defaultVal: [] })).length;
  }

  function renderEntries(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const entries = getEntries(30);
    if (!entries.length) {
      container.innerHTML = '<div class="journal-empty"><div class="journal-empty-icon">📝</div><p>No journal entries yet</p></div>';
      return;
    }
    container.innerHTML = entries.map(entry => {
      const info = MoodScanEngine.EMOTIONS[entry.emotion] || {};
      const t = new Date(entry.timestamp);
      const div = document.createElement('div');
      div.textContent = entry.text;
      return `<div class="journal-entry" style="border-left-color:${info.color||'var(--accent)'}">
        <div class="journal-meta"><span class="journal-mood-tag" style="background:${info.color||'var(--accent)'}22;color:${info.color||'var(--accent)'}">${info.emoji||'😐'} ${entry.emotion}</span>
        <span>${t.toLocaleDateString([],{month:'short',day:'numeric'})} · ${t.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>
        <div class="journal-text">${div.innerHTML}</div></div>`;
    }).join('');
  }

  return { init, addEntry, getEntries, deleteEntry, getCount, renderEntries };
})();
