// ============================================================
//  EmoOS — Echo Companion (AI Personality Engine)
//  Evolving emotional sidekick with 5 personality modes
// ============================================================
'use strict';

window.EmoCompanion = (() => {
  const PERSONALITIES = {
    cheerleader: { icon: '📣', name: 'Cheerleader', desc: 'Hype beast energy' },
    philosopher: { icon: '🧘', name: 'Philosopher', desc: 'Deep & thoughtful' },
    comedian:    { icon: '🎭', name: 'Comedian', desc: 'Jokes & levity' },
    therapist:   { icon: '💙', name: 'Therapist', desc: 'Warm & validating' },
    sage:        { icon: '🦉', name: 'Sage', desc: 'Wise & poetic' },
  };

  // Echo's dialogue per personality × emotion
  const DIALOGUES = {
    cheerleader: {
      happy:     ["YES! Look at you GLOWING! 🌟", "That smile is CONTAGIOUS! Keep going!", "You're literally radiating main character energy! ⚡", "CHAMPION VIBES! The universe is high-fiving you! 🙌"],
      sad:       ["Hey, even superheroes have rainy days. I'm here! 💪", "This feeling? TEMPORARY. You? LEGENDARY. Remember that.", "Let it out. Crying burns calories and cleanses the soul. Science! 🧪"],
      angry:     ["That FIRE in you? It's FUEL. Let's channel it! 🔥", "Someone messed up, and that someone is NOT you!", "Deep breath, champion. Then we STRATEGIZE. 🎯"],
      fearful:   ["Fear = you're about to level up! BOSS FIGHT incoming! 🎮", "I believe in you MORE than you believe in you right now!", "Every legend was terrified before their defining moment! 🦸"],
      disgusted: ["Your standards are SO high and I LOVE that about you! 👑", "That reaction? VALID. Chef's kiss. 💋", "You know quality when you see it. TASTE! 🍷"],
      surprised: ["WHAT JUST HAPPENED?! I need the tea! ☕", "Your face right now is a WHOLE MOOD! 😂", "Life really said PLOT TWIST! Roll with it! 🎬"],
      neutral:   ["Poker face LEGEND. Nobody knows your next move! ♟️", "The calm before your storm of greatness! ⚡", "Main character just vibing. Iconic. 😎"],
    },
    philosopher: {
      happy:     ["Happiness is the alignment of your inner and outer worlds.", "Notice how joy feels in your body. This awareness is precious.", "The ancient Greeks called this 'eudaimonia' — flourishing of the soul."],
      sad:       ["Sadness is the soul processing what it needs to release.", "Even rivers must flow downhill before reaching the ocean.", "Your capacity for sorrow reveals your capacity for love."],
      angry:     ["Anger often guards our deepest values. What is yours protecting?", "Between stimulus and response lies your greatest power: choice.", "The flame of righteous anger can forge remarkable change."],
      fearful:   ["Fear and excitement share the same biology. Reframe the narrative.", "Courage is not the absence of fear but action in its presence.", "What would you do if this fear was actually guidance?"],
      disgusted: ["Strong reactions reveal our values. What boundary has been crossed?", "The examined life includes examining our aversions.", "Discernment is a sophisticated emotional intelligence."],
      surprised: ["The universe communicates through disruption. Listen closely.", "Surprise is the portal through which wonder enters.", "Beginner's mind — seeing everything as if for the first time."],
      neutral:   ["In stillness, the deepest truths reveal themselves.", "Equanimity: the art of remaining centered amid all storms.", "This peace you feel — it is always available within you."],
    },
    comedian: {
      happy:     ["Are you sure you're not just thinking about pizza? 🍕", "Quick, bottle this energy! We'll sell it as a supplement! 💊", "Your face is happier than a golden retriever in a ball pit! 🐕"],
      sad:       ["Hey, even my WiFi has its down days. You'll reconnect! 📶", "If tears burned calories, you'd have abs by now! 😂", "Plot twist: the sad montage is almost over. Cue the motivational music! 🎵"],
      angry:     ["Whoever did this to you — I know a guy. Just kidding. Maybe. 👀", "You look like you're about to write a VERY strongly worded email! 📧", "Channel that rage into cleaning. Your house will SPARKLE! ✨"],
      fearful:   ["The monster under the bed? It's just your laundry pile. I checked. 👻", "Fun fact: bees are more scared of you than you are of... okay bad example. 🐝", "Your survival instincts are S-TIER! Natural selection approves! 👍"],
      disgusted: ["I take it the cafeteria food hasn't improved? 🍽️", "That face could curdle milk at fifty paces! 🥛", "Gordon Ramsay called. He wants his disapproval face back! 👨‍🍳"],
      surprised: ["*Surprised Pikachu face* ⚡", "Did someone just spoil the season finale?! 📺", "Your eyebrows just set a new altitude record! 📏"],
      neutral:   ["Loading personality... please wait... 🔄", "You're giving 'NPC who knows more than they're letting on' 🎮", "If you were a spice, you'd be flour. JUST KIDDING! You're jalapeño! 🌶️"],
    },
    therapist: {
      happy:     ["I see you're feeling joyful right now. That's wonderful — what do you think brought this on?", "Your happiness is valid and deserved. Take a moment to really absorb it. 💛", "It's beautiful to see you in this space. Remember, you deserve this lightness."],
      sad:       ["I hear you. Your sadness matters and it's okay to sit with it for a while. 💙", "Whatever you're feeling right now is completely valid. You don't need to fix it immediately.", "Sometimes the bravest thing is allowing yourself to feel. I'm here with you."],
      angry:     ["Your anger makes sense. It often signals that something important to you has been affected.", "Let's honor this feeling. What need of yours isn't being met right now?", "It's healthy to feel anger. The key is what we do with it. Take your time."],
      fearful:   ["I notice you're feeling afraid. That's a natural, protective response. You're safe here.", "Fear is information, not a command. What might it be trying to tell you?", "Let's ground together. You are here, you are safe, and this will pass."],
      disgusted: ["Strong reactions like this often reflect your values. What feels wrong to you right now?", "Trust your instincts. This reaction is your inner wisdom speaking.", "It's okay to have strong boundaries. They protect what matters to you."],
      surprised: ["That's quite a reaction! Take a moment to process what just happened.", "Surprise can feel overwhelming. Let's slow down and take it in.", "How interesting! Your body is telling you something unexpected occurred."],
      neutral:   ["This calmness is a resource. How does it feel to be in this balanced space?", "A moment of neutrality can be deeply restorative. Enjoy this equilibrium.", "Being centered like this is a strength. It's the eye of your personal storm."],
    },
    sage: {
      happy:     ["Like cherry blossoms in spring — fleeting and therefore precious. 🌸", "Your joy ripples outward in ways you cannot see. The world is better for it.", "In the garden of emotions, you are in full bloom today."],
      sad:       ["Rain nourishes what sunshine alone cannot. This too serves your growth. 🌧️", "The lotus grows from mud. Your deepest sorrows hold the seeds of wisdom.", "Be gentle with yourself. Even the mighty oak bends in the storm."],
      angry:     ["Fire destroys, yet from its ashes, forests are reborn anew. 🔥", "The warrior's greatest battle is always with themselves.", "Transform this flame into the light that guides your path forward."],
      fearful:   ["The cave you fear holds the treasure you seek. — Joseph Campbell", "Every threshold guardian is simply testing your resolve to pass.", "Beyond this fear lies a version of you that you have not yet met."],
      disgusted: ["The discerning eye sees what others overlook. Trust your perception.", "Not all that glitters is gold, and you know the difference.", "Your instinct is ancient wisdom speaking through feeling."],
      surprised: ["The universe loves to remind us how little we truly control. 🌌", "In the space between expectation and reality, discovery lives.", "Be like water — adapt, flow, and find your new path."],
      neutral:   ["In the space between thoughts, infinite peace resides. ☯️", "The still water reflects most clearly. What do you see?", "This moment of balance is the eye through which eternity gazes."],
    },
  };

  // Memory: last 5 session emotions
  let _sessionMemory = [];

  function init() {
    _sessionMemory = EmoStorage.load('echoMemory', { defaultVal: [] });

    EmoBus.on(EmoBus.Events.EMOTION_CHANGED, (data) => {
      _updateMemory(data.emotion);
    });
  }

  function _updateMemory(emotion) {
    _sessionMemory.push({ emotion, ts: Date.now() });
    if (_sessionMemory.length > 50) _sessionMemory = _sessionMemory.slice(-50);
    EmoStorage.save('echoMemory', _sessionMemory.slice(-20));
  }

  /**
   * Get Echo's response for current emotional state
   */
  function speak(emotion, personality) {
    const p = personality || EmoState.get('echoPersonality') || 'cheerleader';
    const pool = DIALOGUES[p]?.[emotion] || DIALOGUES.cheerleader[emotion] || ["I'm here with you! 💫"];

    // Anti-repeat
    const lastKey = `_echo_last_${p}_${emotion}`;
    let idx;
    do { idx = Math.floor(Math.random() * pool.length); }
    while (pool.length > 1 && EmoStorage.load(lastKey) === idx);
    EmoStorage.save(lastKey, idx);

    const msg = pool[idx];

    // Add memory-based commentary sometimes
    let extra = '';
    if (_sessionMemory.length > 5 && Math.random() > 0.7) {
      const recentMoods = _sessionMemory.slice(-5).map(m => m.emotion);
      if (recentMoods.filter(m => m === emotion).length >= 3) {
        extra = ` (I notice you've been feeling ${emotion} a lot lately...)`;
      }
    }

    EmoBus.emit(EmoBus.Events.ECHO_SPEAK, { message: msg + extra, personality: p, emotion });
    return msg + extra;
  }

  function setPersonality(p) {
    if (PERSONALITIES[p]) {
      EmoState.set('echoPersonality', p);
      EmoStorage.save('echoPersonality', p);
    }
  }

  function getPersonalities() { return PERSONALITIES; }
  function getCurrentPersonality() { return PERSONALITIES[EmoState.get('echoPersonality')] || PERSONALITIES.cheerleader; }

  /**
   * Get Echo's avatar emoji based on current personality + emotion
   */
  function getAvatar(emotion) {
    const p = EmoState.get('echoPersonality');
    const avatars = {
      cheerleader: { happy: '🥳', sad: '🤗', angry: '💪', fearful: '🫂', disgusted: '😤', surprised: '🤩', neutral: '😎' },
      philosopher: { happy: '🧘', sad: '📿', angry: '☯️', fearful: '🕯️', disgusted: '📖', surprised: '🔮', neutral: '🪷' },
      comedian:    { happy: '🤪', sad: '🎪', angry: '🎭', fearful: '👻', disgusted: '🤢', surprised: '🎉', neutral: '🤖' },
      therapist:   { happy: '💛', sad: '💙', angry: '💜', fearful: '🤍', disgusted: '💚', surprised: '🧡', neutral: '🩶' },
      sage:        { happy: '🌸', sad: '🌧️', angry: '🔥', fearful: '🌊', disgusted: '🍂', surprised: '⚡', neutral: '☯️' },
    };
    return avatars[p]?.[emotion] || '🤖';
  }

  return { init, speak, setPersonality, getPersonalities, getCurrentPersonality, getAvatar };
})();
