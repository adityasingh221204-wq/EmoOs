// ============================================================
//  EmoOS — Ambient Background + Particle System
//  Mood-reactive backgrounds, floating particles, aura
// ============================================================
'use strict';

window.EmoAmbient = (() => {
  let _particleCanvas = null;
  let _pCtx = null;
  let _particles = [];
  let _animId = null;
  const MAX_PARTICLES = 40;

  const PARTICLE_CONFIGS = {
    happy:     { color: '#fde68a', speed: 1.2, size: 3, drift: 40 },
    sad:       { color: '#93c5fd', speed: 0.4, size: 2, drift: 10 },
    angry:     { color: '#fca5a5', speed: 2.0, size: 2, drift: 60 },
    fearful:   { color: '#c4b5fd', speed: 0.8, size: 2, drift: 25 },
    disgusted: { color: '#6ee7b7', speed: 0.6, size: 2, drift: 20 },
    surprised: { color: '#fdba74', speed: 1.5, size: 3, drift: 50 },
    neutral:   { color: '#cbd5e1', speed: 0.3, size: 1.5, drift: 8 },
  };

  function init() {
    _createParticleCanvas();
    _startParticleLoop();

    EmoBus.on(EmoBus.Events.EMOTION_CHANGED, (data) => {
      _updateParticleConfig(data.emotion);
    });
  }

  function _createParticleCanvas() {
    _particleCanvas = document.getElementById('particleCanvas');
    if (!_particleCanvas) {
      _particleCanvas = document.createElement('canvas');
      _particleCanvas.id = 'particleCanvas';
      document.body.prepend(_particleCanvas);
    }
    _pCtx = _particleCanvas.getContext('2d');
    _resizeCanvas();
    window.addEventListener('resize', _resizeCanvas);
  }

  function _resizeCanvas() {
    if (!_particleCanvas) return;
    _particleCanvas.width = window.innerWidth;
    _particleCanvas.height = window.innerHeight;
  }

  let _currentConfig = PARTICLE_CONFIGS.neutral;

  function _updateParticleConfig(emotion) {
    _currentConfig = PARTICLE_CONFIGS[emotion] || PARTICLE_CONFIGS.neutral;
  }

  function _spawnParticle() {
    return {
      x: Math.random() * (_particleCanvas?.width || 800),
      y: (_particleCanvas?.height || 600) + 10,
      size: _currentConfig.size * (0.5 + Math.random()),
      speed: _currentConfig.speed * (0.5 + Math.random()),
      drift: (Math.random() - 0.5) * _currentConfig.drift,
      opacity: 0.3 + Math.random() * 0.5,
      color: _currentConfig.color,
    };
  }

  function _startParticleLoop() {
    function animate() {
      if (!_pCtx || !_particleCanvas) { _animId = requestAnimationFrame(animate); return; }
      _pCtx.clearRect(0, 0, _particleCanvas.width, _particleCanvas.height);

      // Spawn new
      while (_particles.length < MAX_PARTICLES) {
        _particles.push(_spawnParticle());
      }

      // Update and draw
      for (let i = _particles.length - 1; i >= 0; i--) {
        const p = _particles[i];
        p.y -= p.speed;
        p.x += p.drift * 0.01;
        p.opacity -= 0.001;

        if (p.y < -10 || p.opacity <= 0) {
          _particles[i] = _spawnParticle();
          continue;
        }

        _pCtx.beginPath();
        _pCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        _pCtx.fillStyle = p.color + Math.round(p.opacity * 255).toString(16).padStart(2, '0');
        _pCtx.fill();
      }

      _animId = requestAnimationFrame(animate);
    }
    animate();
  }

  function destroy() {
    if (_animId) cancelAnimationFrame(_animId);
    _particles = [];
  }

  return { init, destroy };
})();
