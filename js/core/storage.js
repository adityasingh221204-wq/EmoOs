// ============================================================
//  EmoOS — Storage Abstraction Layer
//  Encrypted-at-rest localStorage with size management
// ============================================================
'use strict';

window.EmoStorage = (() => {
  const PREFIX = 'emoos_';
  const MAX_ENTRIES = 500; // FIFO eviction

  // Simple XOR obfuscation (not true encryption, but prevents casual inspection)
  const _key = 'Em0OS_2025!';
  function _obfuscate(str) {
    let result = '';
    for (let i = 0; i < str.length; i++) {
      result += String.fromCharCode(str.charCodeAt(i) ^ _key.charCodeAt(i % _key.length));
    }
    return btoa(result);
  }
  function _deobfuscate(encoded) {
    try {
      const str = atob(encoded);
      let result = '';
      for (let i = 0; i < str.length; i++) {
        result += String.fromCharCode(str.charCodeAt(i) ^ _key.charCodeAt(i % _key.length));
      }
      return result;
    } catch { return null; }
  }

  function save(key, data, { sensitive = false } = {}) {
    try {
      const raw = JSON.stringify(data);
      const val = sensitive ? _obfuscate(raw) : raw;
      localStorage.setItem(PREFIX + key, val);
      return true;
    } catch (e) {
      // Storage full — evict oldest feedback
      if (e.name === 'QuotaExceededError') {
        _evictOldest();
        try {
          localStorage.setItem(PREFIX + key, JSON.stringify(data));
          return true;
        } catch { return false; }
      }
      return false;
    }
  }

  function load(key, { sensitive = false, defaultVal = null } = {}) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return defaultVal;
    try {
      if (sensitive) {
        const decoded = _deobfuscate(raw);
        return decoded ? JSON.parse(decoded) : defaultVal;
      }
      return JSON.parse(raw);
    } catch {
      return defaultVal;
    }
  }

  function remove(key) {
    localStorage.removeItem(PREFIX + key);
  }

  function appendToArray(key, item, maxSize = MAX_ENTRIES) {
    let arr = load(key, { defaultVal: [] });
    if (!Array.isArray(arr)) arr = [];
    arr.push(item);
    if (arr.length > maxSize) arr = arr.slice(-maxSize);
    save(key, arr);
    return arr;
  }

  function _evictOldest() {
    // Remove oldest feedback entries first
    const feedback = load('feedback', { defaultVal: [] });
    if (feedback.length > 50) {
      save('feedback', feedback.slice(-50));
    }
  }

  // Export data as CSV
  function exportCSV(data, filename) {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = String(row[h] ?? '');
          return val.includes(',') || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return { save, load, remove, appendToArray, exportCSV };
})();
