// ============================================================
//  EmoOS — Gamification System
//  XP, Levels, Streaks, Achievements, Daily Quests
// ============================================================
'use strict';

window.EmoGame = (() => {
  const LEVEL_NAMES = [
    'Emotion Novice',      // 1
    'Mood Apprentice',     // 2
    'Feeling Explorer',    // 3
    'Emotion Scout',       // 4
    'Mood Journeyman',     // 5
    'Heart Reader',        // 6
    'Emotion Adept',       // 7
    'Soul Whisperer',      // 8
    'Empathy Master',      // 9
    'Emotion Sage',        // 10
    'EmoOS Legend',        // 11+
  ];

  const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 20000];

  const ACHIEVEMENTS = [
    { id: 'first_scan',     name: '🔍 First Scan',          desc: 'Complete your first emotion detection',          condition: (s) => s.detectionCount >= 1 },
    { id: 'joy_rider',      name: '😄 Joy Rider',           desc: '10 minutes of happy emotion',                    condition: (s) => (s.emotionMinutes?.happy || 0) >= 10 },
    { id: 'zen_master',     name: '🧘 Zen Master',          desc: '5 minutes of pure neutral',                      condition: (s) => (s.emotionMinutes?.neutral || 0) >= 5 },
    { id: 'drama_monarch',  name: '🎭 Drama Monarch',       desc: 'Detect all 7 emotions in one session',           condition: (s) => s.uniqueEmotions >= 7 },
    { id: 'comeback_kid',   name: '💪 Comeback Kid',         desc: 'Go from sad/fearful to happy in 2 minutes',      condition: (s) => s.comebacks >= 1 },
    { id: 'streak_3',       name: '🔥 3-Day Streak',         desc: 'Use EmoOS for 3 consecutive days',               condition: (s) => s.streak >= 3 },
    { id: 'streak_7',       name: '🔥🔥 Week Warrior',       desc: '7-day check-in streak',                          condition: (s) => s.streak >= 7 },
    { id: 'streak_30',      name: '👑 Monthly Master',       desc: '30-day streak — legendary commitment!',           condition: (s) => s.streak >= 30 },
    { id: 'rainbow',        name: '🌈 Rainbow Session',      desc: 'All 7 emotions detected in under 60 seconds',    condition: (s) => s.rainbowSpeed <= 60 },
    { id: 'data_scientist', name: '🔬 Data Scientist',       desc: 'Export 50+ feedback entries',                    condition: (s) => s.feedbackCount >= 50 },
    { id: 'voice_active',   name: '🎙️ Voice Activated',      desc: 'Use voice emotion detection 10 times',           condition: (s) => s.voiceUses >= 10 },
    { id: 'echo_friend',    name: '🤖 Echo\'s Best Friend',  desc: 'Try all 5 Echo personality modes',               condition: (s) => s.personalitiesTried >= 5 },
    { id: 'journal_writer', name: '📝 Journal Writer',       desc: 'Write 10 journal entries',                       condition: (s) => s.journalEntries >= 10 },
    { id: 'breath_master',  name: '🌬️ Breath Master',        desc: 'Complete 10 breathing exercises',                condition: (s) => s.breathingSessions >= 10 },
    { id: 'resilient',      name: '🛡️ Emotionally Resilient', desc: 'Resilience score above 70',                    condition: (s) => s.resilienceScore >= 70 },
    { id: 'night_owl',      name: '🦉 Night Owl',            desc: 'Scan after midnight',                           condition: (s) => s.nightScans >= 1 },
    { id: 'early_bird',     name: '🐦 Early Bird',           desc: 'Scan before 7 AM',                              condition: (s) => s.morningScans >= 1 },
    { id: 'centurion',      name: '💯 Centurion',             desc: 'Reach 100 total sessions',                      condition: (s) => s.totalSessions >= 100 },
    { id: 'emotion_dna',    name: '🧬 DNA Decoded',          desc: 'Generate your Emotional DNA report',             condition: (s) => s.dnaGenerated >= 1 },
    { id: 'five_k',         name: '⭐ 5K Club',              desc: 'Earn 5,000 total XP',                           condition: (s) => s.xp >= 5000 },
  ];

  const DAILY_QUESTS = [
    { id: 'feel_three',   desc: 'Feel 3 different emotions today',           target: 3,   metric: 'uniqueEmotionsToday' },
    { id: 'scan_five',    desc: 'Complete 5 scanning sessions',               target: 5,   metric: 'sessionsToday' },
    { id: 'be_positive',  desc: 'Spend 5 minutes feeling positive emotions', target: 5,   metric: 'positiveMinutesToday' },
    { id: 'journal_one',  desc: 'Write at least 1 journal entry',            target: 1,   metric: 'journalToday' },
    { id: 'breathe_once', desc: 'Complete 1 breathing exercise',             target: 1,   metric: 'breathingToday' },
  ];

  let _stats = {};

  function init() {
    _stats = EmoStorage.load('gameStats', { defaultVal: {
      emotionMinutes: {}, uniqueEmotions: 0, comebacks: 0,
      rainbowSpeed: Infinity, feedbackCount: 0, voiceUses: 0,
      personalitiesTried: 0, journalEntries: 0, breathingSessions: 0,
      resilienceScore: 50, nightScans: 0, morningScans: 0,
      totalSessions: 0, dnaGenerated: 0,
      uniqueEmotionsToday: 0, sessionsToday: 0,
      positiveMinutesToday: 0, journalToday: 0, breathingToday: 0,
    }});

    // Listen for events to award XP
    EmoBus.on(EmoBus.Events.EMOTION_TICK, _onTick);
    EmoBus.on(EmoBus.Events.EMOTION_CHANGED, _onEmotionChange);
    EmoBus.on(EmoBus.Events.FEEDBACK_SUBMITTED, () => { _stats.feedbackCount++; addXP(5); });
    EmoBus.on(EmoBus.Events.JOURNAL_ENTRY_ADDED, () => { _stats.journalEntries++; _stats.journalToday++; addXP(15); });
    EmoBus.on(EmoBus.Events.BREATHING_END, () => { _stats.breathingSessions++; _stats.breathingToday++; addXP(25); });

    // Update streak on init
    _updateStreak();
  }

  let _tickCount = 0;
  let _sessionEmotions = new Set();
  let _rainbowStart = null;

  function _onTick(data) {
    _tickCount++;
    if (_tickCount % 15 === 0) addXP(1); // 1 XP per ~second of detection

    // Track time-of-day achievements
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) _stats.nightScans = (_stats.nightScans || 0) + 1;
    if (hour >= 5 && hour < 7) _stats.morningScans = (_stats.morningScans || 0) + 1;
  }

  function _onEmotionChange(data) {
    _sessionEmotions.add(data.emotion);
    _stats.uniqueEmotions = Math.max(_stats.uniqueEmotions || 0, _sessionEmotions.size);
    _stats.uniqueEmotionsToday = _sessionEmotions.size;

    // Rainbow tracking
    if (_sessionEmotions.size === 1) _rainbowStart = Date.now();
    if (_sessionEmotions.size === 7 && _rainbowStart) {
      const speed = (Date.now() - _rainbowStart) / 1000;
      _stats.rainbowSpeed = Math.min(_stats.rainbowSpeed || Infinity, speed);
    }

    // Comeback tracking
    if (['sad', 'fearful'].includes(data.previous) && data.emotion === 'happy') {
      _stats.comebacks = (_stats.comebacks || 0) + 1;
      addXP(30);
      EmoBus.emit(EmoBus.Events.TOAST, {
        icon: '💪', title: 'Comeback!',
        desc: 'You went from feeling down to happy. That\'s resilience!',
      });
    }

    _checkAchievements();
    _saveStats();
  }

  function addXP(amount) {
    let xp = EmoState.get('xp') + amount;
    EmoState.set('xp', xp);
    _stats.xp = xp;

    // Check level up
    const currentLevel = EmoState.get('level');
    let newLevel = 1;
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) { newLevel = i + 1; break; }
    }

    if (newLevel > currentLevel) {
      EmoState.set('level', newLevel);
      EmoBus.emit(EmoBus.Events.LEVEL_UP, {
        level: newLevel,
        name: LEVEL_NAMES[Math.min(newLevel - 1, LEVEL_NAMES.length - 1)],
        xp,
      });
      EmoBus.emit(EmoBus.Events.TOAST, {
        icon: '🎉', title: `Level ${newLevel}!`,
        desc: LEVEL_NAMES[Math.min(newLevel - 1, LEVEL_NAMES.length - 1)],
      });
    }

    EmoBus.emit(EmoBus.Events.XP_GAINED, { amount, total: xp });
    EmoState.persist();
  }

  function _updateStreak() {
    const lastDate = EmoStorage.load('lastCheckIn', { defaultVal: null });
    const today = new Date().toISOString().slice(0, 10);

    if (lastDate === today) return; // already checked in today

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let streak = EmoState.get('streak');
    if (lastDate === yesterdayStr) {
      streak++;
      addXP(50); // streak bonus
    } else if (lastDate !== today) {
      streak = 1; // reset
    }

    EmoState.set('streak', streak);
    EmoStorage.save('lastCheckIn', today);
    _stats.totalSessions = (_stats.totalSessions || 0) + 1;
    EmoState.set('totalSessions', _stats.totalSessions);

    EmoBus.emit(EmoBus.Events.STREAK_UPDATE, { streak, isNew: streak > 1 });
    EmoState.persist();
  }

  function _checkAchievements() {
    const unlocked = EmoState.get('achievements') || [];
    const combined = { ..._stats, xp: EmoState.get('xp'), streak: EmoState.get('streak'), detectionCount: EmoState.get('detectionCount'), totalSessions: EmoState.get('totalSessions') };

    for (const ach of ACHIEVEMENTS) {
      if (unlocked.includes(ach.id)) continue;
      if (ach.condition(combined)) {
        unlocked.push(ach.id);
        EmoState.set('achievements', unlocked);
        addXP(100);
        EmoBus.emit(EmoBus.Events.ACHIEVEMENT_UNLOCK, ach);
        EmoBus.emit(EmoBus.Events.TOAST, {
          icon: '🏆', title: 'Achievement Unlocked!',
          desc: `${ach.name} — ${ach.desc}`,
        });
      }
    }
  }

  function _saveStats() {
    EmoStorage.save('gameStats', _stats);
  }

  function getLevel() {
    const level = EmoState.get('level');
    const xp    = EmoState.get('xp');
    const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
    const nextThreshold    = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1] * 2;
    const progress = (xp - currentThreshold) / (nextThreshold - currentThreshold);

    return {
      level,
      name: LEVEL_NAMES[Math.min(level - 1, LEVEL_NAMES.length - 1)],
      xp,
      progress: Math.min(1, Math.max(0, progress)),
      nextThreshold,
    };
  }

  function getAchievements() {
    const unlocked = EmoState.get('achievements') || [];
    return ACHIEVEMENTS.map(a => ({
      ...a,
      unlocked: unlocked.includes(a.id),
    }));
  }

  function getDailyQuests() {
    return DAILY_QUESTS.map(q => ({
      ...q,
      current: _stats[q.metric] || 0,
      complete: (_stats[q.metric] || 0) >= q.target,
    }));
  }

  function getResilienceScore() {
    const comebacks = _stats.comebacks || 0;
    const streak    = EmoState.get('streak');
    const breathing = _stats.breathingSessions || 0;
    const journal   = _stats.journalEntries || 0;

    // Weighted resilience formula
    const score = Math.min(100, Math.round(
      comebacks * 10 +
      streak * 3 +
      breathing * 5 +
      journal * 2 +
      20 // base
    ));

    _stats.resilienceScore = score;
    return score;
  }

  return { init, addXP, getLevel, getAchievements, getDailyQuests, getResilienceScore, LEVEL_NAMES };
})();
