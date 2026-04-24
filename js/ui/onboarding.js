// ============================================================
//  EmoOS — Onboarding (Cinematic First-Run Experience)
// ============================================================
'use strict';

window.EmoOnboarding = (() => {
  const SLIDES = [
    { emoji: '🧠', title: 'Welcome to EmoOS', body: 'Your personal Emotional Operating System — powered by real-time AI that understands how you feel.' },
    { emoji: '🔒', title: 'Privacy First', body: 'Everything runs on YOUR device. No video, no images, no data ever leaves your browser. Ever.' },
    { emoji: '🤖', title: 'Meet Echo', body: 'Your AI emotional companion. Echo reacts to your moods, remembers patterns, and evolves with you.' },
    { emoji: '🎮', title: 'Level Up', body: 'Earn XP, unlock achievements, build streaks, and track your emotional growth over time.' },
    { emoji: '🚀', title: 'Ready?', body: 'Let\'s begin your emotional journey. What would you like from this session?' },
  ];

  let _currentSlide = 0;

  function shouldShow() {
    return !localStorage.getItem('emoos_onboarded');
  }

  function show() {
    if (!shouldShow()) return;
    const overlay = document.getElementById('onboardingOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    _currentSlide = 0;
    _render(overlay);
  }

  function _render(overlay) {
    const slide = SLIDES[_currentSlide];
    const isLast = _currentSlide === SLIDES.length - 1;
    const dots = SLIDES.map((_, i) =>
      `<div class="onboarding-dot ${i === _currentSlide ? 'active' : ''}"></div>`
    ).join('');

    overlay.innerHTML = `
      <div class="onboarding-slide active">
        <div class="onboarding-emoji">${slide.emoji}</div>
        <h2 class="onboarding-title">${slide.title}</h2>
        <p class="onboarding-body">${slide.body}</p>
        <div class="onboarding-dots">${dots}</div>
        <button class="btn btn-primary btn-lg" id="onboardNextBtn">
          ${isLast ? "Let's Go! 🚀" : 'Next →'}
        </button>
        ${_currentSlide > 0 ? '<button class="btn btn-ghost" id="onboardBackBtn">← Back</button>' : ''}
      </div>
    `;

    document.getElementById('onboardNextBtn')?.addEventListener('click', () => {
      if (isLast) {
        _complete(overlay);
      } else {
        _currentSlide++;
        _render(overlay);
      }
    });

    document.getElementById('onboardBackBtn')?.addEventListener('click', () => {
      if (_currentSlide > 0) { _currentSlide--; _render(overlay); }
    });
  }

  function _complete(overlay) {
    localStorage.setItem('emoos_onboarded', 'true');
    overlay.style.display = 'none';
  }

  return { shouldShow, show };
})();
