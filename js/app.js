// ============================================================
//  EmoOS — Main Application Orchestrator v3.0
//  Wires all subsystems, handles UI, manages lifecycle
// ============================================================
'use strict';

/* global faceapi */

window.EmoApp = (() => {

  // ── Boot ────────────────────────────────────────────────
  async function init() {
    // Restore persisted state
    EmoState.restore();

    // Apply saved theme & lang
    _applyTheme(EmoState.get('theme'));
    _applyLang(EmoState.get('lang'));

    // Initialize subsystems
    EmoFusion.init();
    EmoMemory.init();
    EmoAnomaly.init();
    EmoCompanion.init();
    EmoGame.init();
    EmoWellness.init();
    EmoJournal.init();
    EmoReactions.init();
    MoodScanFeedback.init();

    // Build dynamic UI
    _buildEmotionStrip();
    _buildProbBars();
    _updateHUD();

    // Init ambient particles
    EmoAmbient.init();

    // Show onboarding for first-time users
    if (EmoOnboarding.shouldShow()) {
      EmoOnboarding.show();
    }

    // Show privacy modal if needed
    if (localStorage.getItem('emoos_privacy') !== 'true') {
      _showModal('privacyModal');
    }

    // Load ML models
    await EmoFaceDetector.loadModels((pct, msg) => {
      const fill = document.getElementById('loaderFill');
      const status = document.getElementById('loaderStatus');
      if (fill) fill.style.width = pct + '%';
      if (status) status.textContent = msg;
    });

    await _sleep(350);
    document.getElementById('loaderOverlay')?.classList.add('hidden');
    EmoState.set('sessionStart', Date.now());

    // Auto-start camera if privacy accepted
    if (localStorage.getItem('emoos_privacy') === 'true') {
      startCamera();
    }

    // Init analytics (after DOM is rendered)
    MoodScanAnalytics.init();

    // Subscribe to events for UI updates
    _subscribeEvents();
  }

  // ── Camera ──────────────────────────────────────────────
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user', frameRate: { ideal: 30 } }
      });

      const videoEl = document.getElementById('videoEl');
      videoEl.srcObject = stream;
      await new Promise(r => { videoEl.onloadedmetadata = r; });
      await videoEl.play();

      document.getElementById('startCamOverlay')?.classList.add('hidden');
      EmoState.set('isRunning', true);

      // Set up face detector
      EmoFaceDetector.setElements(videoEl, document.getElementById('overlayCanvas'));
      EmoFaceDetector.start();

      // Auto-start voice (optional, prompt user)
      _promptVoice();

    } catch (err) {
      console.error('[EmoOS] Camera error:', err);
      const hint = document.getElementById('camHint');
      if (hint) hint.textContent = '⚠️ Camera access denied. Please allow camera permission.';
    }
  }

  async function _promptVoice() {
    // Try to start voice analysis silently
    const started = await EmoVoice.start();
    if (started) {
      EmoBus.emit(EmoBus.Events.TOAST, {
        icon: '🎙️', title: 'Voice Analysis Active',
        desc: 'Microphone enabled for multimodal emotion detection',
      });
    }
  }

  // ── Event Subscriptions ─────────────────────────────────
  function _subscribeEvents() {
    // Emotion changed → update UI
    EmoBus.on(EmoBus.Events.EMOTION_CHANGED, (data) => {
      _updateEmotionDisplay(data.emotion, data.confidence, data);
      _updateGIF(data.emotion, data.confidence);
      _updateEchoSpeech(data.emotion);

      // Update feedback system
      MoodScanFeedback.setCurrentEmotion(data.emotion, data.confidence);
    });

    // Face lost
    EmoBus.on(EmoBus.Events.FACE_LOST, () => {
      document.getElementById('noFaceOverlay')?.classList.add('show');
    });

    // Emotion tick → update bars
    EmoBus.on(EmoBus.Events.EMOTION_TICK, (data) => {
      document.getElementById('noFaceOverlay')?.classList.remove('show');
      if (data.rawExpressions) {
        _updateProbBars(data.rawExpressions, data.emotion);
        _updateEmotionStrip(data.rawExpressions, data.emotion);
      }
    });

    // Toast notifications
    EmoBus.on(EmoBus.Events.TOAST, _showToast);

    // XP / Level up
    EmoBus.on(EmoBus.Events.XP_GAINED, _updateHUD);
    EmoBus.on(EmoBus.Events.LEVEL_UP, _updateHUD);
    EmoBus.on(EmoBus.Events.STREAK_UPDATE, _updateHUD);

    // Anomaly → suggest wellness
    EmoBus.on(EmoBus.Events.ANOMALY_DETECTED, (data) => {
      if (data.suggestSOS) {
        EmoBus.emit(EmoBus.Events.TOAST, {
          icon: '🆘', title: 'Feeling overwhelmed?',
          desc: 'Try a breathing exercise or grounding technique',
        });
      }
    });

    // Save memory periodically
    setInterval(() => {
      EmoMemory.saveDayAggregate();
      EmoState.persist();
    }, 30000);
  }

  // ── UI Updates ──────────────────────────────────────────
  function _updateEmotionDisplay(emotion, confidence, data) {
    const info = MoodScanEngine.EMOTIONS[emotion];
    const name = MoodScanEngine.getEmotionName(emotion, EmoState.get('lang'));
    const conf = (confidence * 100).toFixed(0);

    // Big emoji
    const emojiEl = document.getElementById('bigEmoji');
    if (emojiEl) {
      emojiEl.style.animation = 'none';
      void emojiEl.offsetHeight;
      emojiEl.style.animation = '';
      emojiEl.textContent = info.emoji;
    }

    // Name
    const nameEl = document.getElementById('emotionNameDisplay');
    if (nameEl) { nameEl.textContent = name; nameEl.style.color = info.color; }

    // Confidence
    const confEl = document.getElementById('emotionConfDisplay');
    if (confEl) confEl.textContent = `${conf}% confidence`;

    // Mixed emotion indicator
    const mixedEl = document.getElementById('mixedIndicator');
    if (mixedEl) {
      if (data?.mixed && data?.mixedLabel) {
        mixedEl.textContent = `Mixed: ${data.mixedLabel}`;
        mixedEl.style.display = 'block';
      } else {
        mixedEl.style.display = 'none';
      }
    }

    // Intensity badge
    const intensityEl = document.getElementById('intensityBadge');
    if (intensityEl && data?.intensity) {
      intensityEl.textContent = `${data.intensity.label} (${data.intensity.level}/5)`;
    }

    // Weather
    const weatherEl = document.getElementById('weatherEmoji');
    const weatherDescEl = document.getElementById('weatherDesc');
    if (weatherEl && data?.weather) weatherEl.textContent = data.weather.icon;
    if (weatherDescEl && data?.weather) weatherDescEl.textContent = data.weather.desc;

    // Emoji wrap glow
    const wrapEl = document.getElementById('bigEmojiWrap');
    if (wrapEl) {
      wrapEl.style.background = info.color + '22';
      wrapEl.style.setProperty('--current-color', info.color);
      wrapEl.style.boxShadow = `0 0 30px ${info.color}44`;
    }

    // Response text
    _updateResponseText(emotion);
  }

  function _updateResponseText(emotion) {
    const el = document.getElementById('responseText');
    if (!el) return;
    el.classList.add('updating');
    setTimeout(() => {
      el.textContent = MoodScanEngine.getResponse(emotion, EmoState.get('lang'));
      el.classList.remove('updating');
    }, 220);
  }

  function _updateGIF(emotion, confidence) {
    const gifFrame = document.getElementById('gifFrame');
    if (!gifFrame) return;
    const url = EmoReactions.getReaction(emotion, confidence);
    if (!url) return;
    const info = MoodScanEngine.EMOTIONS[emotion];
    gifFrame.innerHTML = `<img src="${url}" alt="${emotion} reaction" loading="lazy"
      onerror="this.parentElement.innerHTML='<div class=\\'gif-placeholder\\'><span class=\\'gp-icon\\'>${info.emoji}</span><p>Vibe: ${emotion}!</p></div>'" />`;
  }

  function _updateEchoSpeech(emotion) {
    const speechEl = document.getElementById('echoSpeechText');
    if (!speechEl) return;
    const msg = EmoCompanion.speak(emotion);
    speechEl.textContent = msg;

    // Update avatar
    const avatarEl = document.getElementById('echoAvatarEmoji');
    if (avatarEl) avatarEl.textContent = EmoCompanion.getAvatar(emotion);

    // Update personality badge
    const badgeEl = document.getElementById('echoPersonalityBadge');
    if (badgeEl) {
      const p = EmoCompanion.getCurrentPersonality();
      badgeEl.textContent = `${p.icon} ${p.name} Mode`;
    }
  }

  function _updateProbBars(expressions, dominant) {
    MoodScanEngine.EMOTION_ORDER.forEach(em => {
      const pct = Math.round((expressions[em] || 0) * 100);
      const fill = document.getElementById(`probFill-${em}`);
      if (fill) { fill.style.width = pct + '%'; fill.classList.toggle('active', em === dominant); }
      const pctEl = document.getElementById(`probPct-${em}`);
      if (pctEl) pctEl.textContent = pct + '%';
    });
  }

  function _updateEmotionStrip(expressions, dominant) {
    MoodScanEngine.EMOTION_ORDER.forEach(em => {
      document.getElementById(`chip-${em}`)?.classList.toggle('active', em === dominant);
      const pctEl = document.getElementById(`chipPct-${em}`);
      if (pctEl) pctEl.textContent = Math.round((expressions[em] || 0) * 100) + '%';
    });
  }

  function _updateHUD() {
    const level = EmoGame.getLevel();
    const levelEl = document.getElementById('hudLevel');
    const xpFill  = document.getElementById('hudXpFill');
    const xpText  = document.getElementById('hudXpText');
    const streakEl = document.getElementById('hudStreak');

    if (levelEl) levelEl.textContent = `Lv.${level.level}`;
    if (xpFill) xpFill.style.width = (level.progress * 100) + '%';
    if (xpText) xpText.textContent = `${level.xp} XP`;
    if (streakEl) streakEl.textContent = `🔥${EmoState.get('streak')}`;
  }

  // ── Build Dynamic Components ────────────────────────────
  function _buildEmotionStrip() {
    const strip = document.getElementById('emotionStrip');
    if (!strip) return;
    strip.innerHTML = '';
    MoodScanEngine.EMOTION_ORDER.forEach(em => {
      const info = MoodScanEngine.EMOTIONS[em];
      const chip = document.createElement('div');
      chip.className = 'em-chip'; chip.id = `chip-${em}`;
      chip.style.setProperty('--chip-color', info.color);
      chip.innerHTML = `<span class="chip-emoji">${info.emoji}</span><span class="chip-name">${em}</span><span class="chip-pct" id="chipPct-${em}">0%</span>`;
      strip.appendChild(chip);
    });
  }

  function _buildProbBars() {
    const container = document.getElementById('probBarsContainer');
    if (!container) return;
    container.innerHTML = '';
    MoodScanEngine.EMOTION_ORDER.forEach(em => {
      const info = MoodScanEngine.EMOTIONS[em];
      const row = document.createElement('div'); row.className = 'prob-row';
      row.innerHTML = `<span class="prob-label"><span class="prob-emoji">${info.emoji}</span><span>${em}</span></span>
        <div class="prob-track"><div class="prob-fill" id="probFill-${em}" style="background:${info.color}"></div></div>
        <span class="prob-pct" id="probPct-${em}">0%</span>`;
      container.appendChild(row);
    });
  }

  // ── Tab Navigation ──────────────────────────────────────
  function switchTab(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`panel-${tabId}`)?.classList.add('active');
    document.querySelector(`[data-tab="${tabId}"]`)?.classList.add('active');
    EmoState.set('activeTab', tabId);

    // Render tab-specific content
    if (tabId === 'journal') EmoJournal.renderEntries('journalList');
    if (tabId === 'insights') _renderForecast();
    if (tabId === 'profile') _renderProfile();
    if (tabId === 'echo') _renderEchoTab();
  }

  function _renderForecast() {
    const container = document.getElementById('forecastContainer');
    if (!container) return;
    const forecast = EmoForecast.forecast();
    container.innerHTML = forecast.map(d => {
      const info = MoodScanEngine.EMOTIONS[d.predicted] || {};
      return `<div style="text-align:center;padding:var(--sp-2)">
        <div style="font-size:var(--fs-xs);color:var(--text-muted)">${d.dayName}</div>
        <div style="font-size:1.5rem">${d.weather?.icon || '☁️'}</div>
        <div style="font-size:var(--fs-xs);color:${info.color||'var(--text-muted)'}">${d.predicted}</div>
        ${d.confidence ? `<div style="font-size:var(--fs-xs);color:var(--text-subtle)">${d.confidence}%</div>` : ''}
      </div>`;
    }).join('');
  }

  function _renderProfile() {
    const achievementsEl = document.getElementById('achievementsList');
    if (achievementsEl) {
      const achievements = EmoGame.getAchievements();
      achievementsEl.innerHTML = achievements.map(a => `
        <div class="achievement ${a.unlocked ? 'unlocked' : 'locked'}">
          <div class="achievement-icon">${a.name.split(' ')[0]}</div>
          <div class="achievement-info">
            <div class="achievement-name">${a.name.split(' ').slice(1).join(' ')}</div>
            <div class="achievement-desc">${a.desc}</div>
          </div>
        </div>
      `).join('');
    }

    // Level ring
    const level = EmoGame.getLevel();
    const ring = document.getElementById('profileLevelRing');
    if (ring) ring.style.setProperty('--level-progress', (level.progress * 100) + '%');
    const lvlNum = document.getElementById('profileLevelNum');
    if (lvlNum) lvlNum.textContent = level.level;
    const lvlName = document.getElementById('profileLevelName');
    if (lvlName) lvlName.textContent = level.name;
    const xpText = document.getElementById('profileXP');
    if (xpText) xpText.textContent = `${level.xp} / ${level.nextThreshold} XP`;

    // Resilience
    const resilience = EmoGame.getResilienceScore();
    const resEl = document.getElementById('resilienceScore');
    if (resEl) resEl.textContent = resilience;

    // Session story
    const storyEl = document.getElementById('sessionStory');
    if (storyEl) storyEl.textContent = EmoMemory.generateSessionStory();
  }

  function _renderEchoTab() {
    const avatarEl = document.getElementById('echoAvatarEmoji');
    const speechEl = document.getElementById('echoSpeechText');
    const emotion = EmoState.get('currentEmotion') || 'neutral';
    if (avatarEl) avatarEl.textContent = EmoCompanion.getAvatar(emotion);
    if (speechEl && !speechEl.textContent.trim()) {
      speechEl.textContent = EmoCompanion.speak(emotion);
    }

    // Personality selector
    const selector = document.getElementById('personalitySelector');
    if (selector && !selector.children.length) {
      const personalities = EmoCompanion.getPersonalities();
      selector.innerHTML = Object.entries(personalities).map(([key, p]) =>
        `<button class="btn btn-sm ${EmoState.get('echoPersonality') === key ? 'btn-primary' : 'btn-secondary'}"
          onclick="EmoCompanion.setPersonality('${key}'); EmoApp.switchTab('echo');">
          ${p.icon} ${p.name}
        </button>`
      ).join('');
    }
  }

  // ── Theme & Language ────────────────────────────────────
  function _applyTheme(theme) {
    EmoState.set('theme', theme);
    localStorage.setItem('emoos_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    MoodScanAnalytics.updateChartTheme?.(theme);
  }

  function _applyLang(lang) {
    EmoState.set('lang', lang);
    localStorage.setItem('emoos_lang', lang);
    document.documentElement.lang = lang;
    const S = MoodScanEngine.UI.get(lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = key.split('.').reduce((o, k) => o?.[k], S);
      if (val !== undefined) el.textContent = val;
    });
  }

  // ── Modal & Toast ───────────────────────────────────────
  function _showModal(id) { document.getElementById(id)?.classList.add('show'); }
  function _hideAllModals() { document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('show')); }

  function _showToast(data) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon">${data.icon || '📢'}</span><div class="toast-text"><div class="toast-title">${data.title || ''}</div><div class="toast-desc">${data.desc || ''}</div></div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 4000);
  }

  // ── Event Bindings ──────────────────────────────────────
  function bindEvents() {
    // Privacy
    document.getElementById('privacyAcceptBtn')?.addEventListener('click', () => {
      localStorage.setItem('emoos_privacy', 'true');
      _hideAllModals();
      startCamera();
    });

    // Theme toggle
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      _applyTheme(EmoState.get('theme') === 'dark' ? 'light' : 'dark');
    });

    // Language
    document.getElementById('langSelectHeader')?.addEventListener('change', e => _applyLang(e.target.value));

    // Settings
    document.getElementById('settingsBtn')?.addEventListener('click', () => _showModal('settingsModal'));
    document.querySelectorAll('[data-close-modal]').forEach(btn => btn.addEventListener('click', _hideAllModals));
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.remove('show'); }));

    // Camera start
    document.getElementById('startCamBtn')?.addEventListener('click', startCamera);

    // Tabs
    document.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Feedback
    document.getElementById('feedbackYesBtn')?.addEventListener('click', () => MoodScanFeedback.submitFeedback(true));
    document.getElementById('feedbackNoBtn')?.addEventListener('click', () => MoodScanFeedback.submitFeedback(false));

    // Export
    document.getElementById('exportSessionBtn')?.addEventListener('click', () => MoodScanAnalytics.exportSessionCSV());
    document.getElementById('exportFeedbackBtn')?.addEventListener('click', () => MoodScanFeedback.exportCSV());

    // Journal
    document.getElementById('journalSubmitBtn')?.addEventListener('click', () => {
      const input = document.getElementById('journalInput');
      if (input && input.value.trim()) {
        EmoJournal.addEntry(input.value);
        input.value = '';
        EmoJournal.renderEntries('journalList');
        EmoBus.emit(EmoBus.Events.TOAST, { icon: '📝', title: 'Entry Saved', desc: 'Your thoughts have been captured' });
      }
    });

    // Wellness quick actions
    document.getElementById('btnBreathe')?.addEventListener('click', () => EmoWellness.startBreathing('box'));
    document.getElementById('btnSOS')?.addEventListener('click', () => EmoWellness.activateSOS());
    document.getElementById('btnAffirm')?.addEventListener('click', () => EmoWellness.showAffirmation());
  }

  function _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { init, startCamera, bindEvents, switchTab };
})();

// ── Bootstrap ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  EmoApp.bindEvents();
  EmoApp.init();
});
