// ============================================================
//  EmoOS — Wellness Tools
//  Breathing exercises, SOS mode, affirmations, grounding
// ============================================================
'use strict';

window.EmoWellness = (() => {
  const BREATHING_PATTERNS = {
    box:      { name: 'Box Breathing',        steps: [{phase:'Breathe In',dur:4},{phase:'Hold',dur:4},{phase:'Breathe Out',dur:4},{phase:'Hold',dur:4}], desc: 'Equal cycles for calm focus', bestFor: ['anxious', 'neutral'] },
    calm478:  { name: '4-7-8 Technique',      steps: [{phase:'Breathe In',dur:4},{phase:'Hold',dur:7},{phase:'Breathe Out',dur:8}], desc: 'Deep relaxation technique', bestFor: ['angry', 'fearful'] },
    sigh:     { name: 'Physiological Sigh',   steps: [{phase:'Double Inhale',dur:3},{phase:'Long Exhale',dur:6}], desc: 'Fastest stress reset', bestFor: ['stressed'] },
    energize: { name: 'Energizing Breath',    steps: [{phase:'Quick In',dur:2},{phase:'Quick Out',dur:2}], desc: 'Quick energy boost', bestFor: ['sad', 'fatigued'] },
  };

  const AFFIRMATIONS = {
    happy:     ["I radiate joy and it returns to me tenfold ✨", "My happiness is a gift I share with the world", "I am exactly where I'm meant to be, and it's beautiful here 🌟"],
    sad:       ["This feeling is temporary. I am permanent. 💙", "I give myself permission to feel, heal, and grow", "I am stronger than any storm I face 🌊", "Tomorrow holds possibilities I can't yet imagine"],
    angry:     ["I choose my response. I choose my power. 💪", "This fire in me can forge something extraordinary", "I release what I cannot control and focus on what I can"],
    fearful:   ["I have survived 100% of my worst days so far 🛡️", "Courage is not the absence of fear — it's taking the next step", "I am safe. I am capable. I am ready."],
    disgusted: ["I trust my instincts — they protect me 🔮", "My standards reflect my self-worth, and I'm worthy", "I honor my boundaries without guilt"],
    surprised: ["Life's plot twists make the story worth telling 📖", "I am flexible, adaptable, and open to wonder", "Every surprise is an invitation to grow"],
    neutral:   ["In this stillness, I find my strength ☯️", "Balance is my superpower", "I am centered, calm, and completely enough"],
  };

  const GROUNDING_STEPS = [
    { sense: '👀 See', prompt: 'Name 5 things you can see right now', count: 5 },
    { sense: '✋ Touch', prompt: 'Name 4 things you can touch', count: 4 },
    { sense: '👂 Hear', prompt: 'Name 3 things you can hear', count: 3 },
    { sense: '👃 Smell', prompt: 'Name 2 things you can smell', count: 2 },
    { sense: '👅 Taste', prompt: 'Name 1 thing you can taste', count: 1 },
  ];

  let _breathingTimer = null;
  let _breathingActive = false;

  function init() {
    // Auto-suggest breathing when stress is high
    EmoBus.on(EmoBus.Events.ANOMALY_DETECTED, (data) => {
      if (data.suggestSOS) {
        _suggestSOS();
      }
    });
  }

  // ── Breathing Exercise Engine ──────────────────────────────
  function startBreathing(patternKey) {
    const pattern = BREATHING_PATTERNS[patternKey] || BREATHING_PATTERNS.box;
    _breathingActive = true;
    EmoState.set('breathingActive', true);
    EmoBus.emit(EmoBus.Events.BREATHING_START, { pattern: pattern.name });

    const overlay = document.getElementById('wellnessOverlay');
    if (!overlay) return;
    overlay.classList.add('active');

    let cycleCount = 0;
    const totalCycles = 4;
    let stepIndex = 0;

    function runStep() {
      if (!_breathingActive || cycleCount >= totalCycles) {
        stopBreathing();
        return;
      }

      const step = pattern.steps[stepIndex];
      _renderBreathingStep(step, () => {
        stepIndex++;
        if (stepIndex >= pattern.steps.length) {
          stepIndex = 0;
          cycleCount++;
        }
        runStep();
      });
    }

    _renderBreathingUI(pattern, totalCycles);
    runStep();
  }

  function stopBreathing() {
    _breathingActive = false;
    EmoState.set('breathingActive', false);
    if (_breathingTimer) clearTimeout(_breathingTimer);

    const overlay = document.getElementById('wellnessOverlay');
    if (overlay) overlay.classList.remove('active');

    EmoBus.emit(EmoBus.Events.BREATHING_END, {});
  }

  function _renderBreathingUI(pattern, cycles) {
    const overlay = document.getElementById('wellnessOverlay');
    if (!overlay) return;

    overlay.innerHTML = `
      <button class="btn btn-icon wellness-close" onclick="EmoWellness.stopBreathing()" aria-label="Close">✕</button>
      <div class="breath-circle-container">
        <div class="breath-circle" id="breathCircle">
          <span id="breathTimer">0</span>
        </div>
        <div class="breath-label" id="breathLabel">${pattern.name}</div>
        <div style="font-size:var(--fs-xs);color:var(--text-muted)" id="breathCycle">Starting...</div>
      </div>
    `;
  }

  function _renderBreathingStep(step, onComplete) {
    const circle = document.getElementById('breathCircle');
    const label  = document.getElementById('breathLabel');
    const timer  = document.getElementById('breathTimer');
    if (!circle || !label) { onComplete(); return; }

    label.textContent = step.phase;

    // Scale animation
    if (step.phase.toLowerCase().includes('in')) {
      circle.style.transform = 'scale(1.3)';
    } else if (step.phase.toLowerCase().includes('out')) {
      circle.style.transform = 'scale(0.7)';
    } else {
      circle.style.transform = 'scale(1)';
    }

    let remaining = step.dur;
    timer.textContent = remaining;

    const tick = setInterval(() => {
      remaining--;
      if (timer) timer.textContent = Math.max(0, remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        onComplete();
      }
    }, 1000);

    _breathingTimer = setTimeout(() => {
      clearInterval(tick);
    }, (step.dur + 1) * 1000);
  }

  // ── SOS Mode ──────────────────────────────────────────────
  function _suggestSOS() {
    EmoBus.emit(EmoBus.Events.TOAST, {
      icon: '🆘',
      title: 'Feeling overwhelmed?',
      desc: 'Tap here for a calming exercise',
      action: () => activateSOS(),
    });
  }

  function activateSOS() {
    EmoState.set('sosActive', true);
    EmoBus.emit(EmoBus.Events.SOS_TRIGGERED, {});

    const overlay = document.getElementById('wellnessOverlay');
    if (!overlay) return;
    overlay.classList.add('active');

    const emotion = EmoState.get('currentEmotion') || 'neutral';
    const affirmation = getAffirmation(emotion);

    overlay.innerHTML = `
      <button class="btn btn-icon wellness-close" onclick="EmoWellness.closeSOS()" aria-label="Close">✕</button>
      <div style="text-align:center;max-width:500px;padding:var(--sp-8);">
        <div style="font-size:4rem;margin-bottom:var(--sp-6);" class="float">🌊</div>
        <h2 style="font-family:var(--font-heading);font-size:var(--fs-2xl);margin-bottom:var(--sp-4);">You're Safe Here</h2>
        <p style="font-size:var(--fs-md);color:var(--text-secondary);line-height:1.8;margin-bottom:var(--sp-6);">
          ${affirmation}
        </p>
        <div style="display:flex;flex-direction:column;gap:var(--sp-3);width:100%;">
          <button class="btn btn-primary btn-lg" onclick="EmoWellness.startBreathing('box')">🌬️ Breathing Exercise</button>
          <button class="btn btn-secondary btn-lg" onclick="EmoWellness.startGrounding()">🌍 5-4-3-2-1 Grounding</button>
          <button class="btn btn-ghost" onclick="EmoWellness.closeSOS()">I'm okay, thanks 💙</button>
        </div>
      </div>
    `;
  }

  function closeSOS() {
    EmoState.set('sosActive', false);
    const overlay = document.getElementById('wellnessOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  // ── Grounding Exercise ────────────────────────────────────
  function startGrounding() {
    const overlay = document.getElementById('wellnessOverlay');
    if (!overlay) return;
    overlay.classList.add('active');
    _runGroundingStep(0, overlay);
  }

  function _runGroundingStep(index, overlay) {
    if (index >= GROUNDING_STEPS.length) {
      overlay.innerHTML = `
        <button class="btn btn-icon wellness-close" onclick="EmoWellness.closeSOS()" aria-label="Close">✕</button>
        <div style="text-align:center;padding:var(--sp-8);">
          <div style="font-size:4rem;margin-bottom:var(--sp-6);" class="float">🌟</div>
          <h2 style="font-family:var(--font-heading);font-size:var(--fs-2xl);margin-bottom:var(--sp-4);">You're Grounded</h2>
          <p style="color:var(--text-secondary);margin-bottom:var(--sp-6);">How do you feel now? You're present, you're safe, you're enough.</p>
          <button class="btn btn-primary" onclick="EmoWellness.closeSOS()">Continue ✨</button>
        </div>
      `;
      EmoGame.addXP(25);
      return;
    }

    const step = GROUNDING_STEPS[index];
    overlay.innerHTML = `
      <button class="btn btn-icon wellness-close" onclick="EmoWellness.closeSOS()" aria-label="Close">✕</button>
      <div style="text-align:center;padding:var(--sp-8);max-width:400px;">
        <div style="font-size:3rem;margin-bottom:var(--sp-4);">${step.sense}</div>
        <h2 style="font-family:var(--font-heading);font-size:var(--fs-xl);margin-bottom:var(--sp-4);">${step.prompt}</h2>
        <p style="color:var(--text-muted);margin-bottom:var(--sp-6);">Take your time. There's no rush.</p>
        <button class="btn btn-primary" onclick="EmoWellness._nextGround(${index + 1})">Done ✓</button>
        <div style="margin-top:var(--sp-4);font-size:var(--fs-xs);color:var(--text-subtle);">${index + 1} of ${GROUNDING_STEPS.length}</div>
      </div>
    `;
  }

  // Expose for inline onclick
  function _nextGround(index) {
    const overlay = document.getElementById('wellnessOverlay');
    if (overlay) _runGroundingStep(index, overlay);
  }

  // ── Affirmations ──────────────────────────────────────────
  function getAffirmation(emotion) {
    const pool = AFFIRMATIONS[emotion] || AFFIRMATIONS.neutral;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function showAffirmation() {
    const emotion = EmoState.get('currentEmotion') || 'neutral';
    const text = getAffirmation(emotion);
    EmoBus.emit(EmoBus.Events.AFFIRMATION_SHOWN, { text, emotion });
    EmoBus.emit(EmoBus.Events.TOAST, {
      icon: '✨', title: 'Affirmation',
      desc: text,
    });
    return text;
  }

  /**
   * Get recommended breathing pattern based on current emotion
   */
  function getRecommendedBreathing() {
    const emotion = EmoState.get('currentEmotion') || 'neutral';
    for (const [key, pattern] of Object.entries(BREATHING_PATTERNS)) {
      if (pattern.bestFor.includes(emotion)) return { key, ...pattern };
    }
    return { key: 'box', ...BREATHING_PATTERNS.box };
  }

  return {
    init, startBreathing, stopBreathing, activateSOS, closeSOS,
    startGrounding, _nextGround, getAffirmation, showAffirmation,
    getRecommendedBreathing, BREATHING_PATTERNS,
  };
})();
