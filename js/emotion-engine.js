// ============================================================
//  MOODSCAN PRO — Emotion Response Engine
//  v2.0.0 | On-Device | Privacy-First | Multi-Language
// ============================================================
'use strict';

window.MoodScanEngine = (() => {

  // ── Emotion Metadata ────────────────────────────────────────
  // Colors mapped to color psychology principles
  const EMOTIONS = {
    happy: {
      emoji: '😄', color: '#FBBF24', colorDark: '#D97706',
      gradient: 'linear-gradient(135deg,#FBBF24,#F59E0B)',
      gifs: [
        'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif',
        'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
        'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
      ]
    },
    sad: {
      emoji: '😢', color: '#60A5FA', colorDark: '#2563EB',
      gradient: 'linear-gradient(135deg,#60A5FA,#3B82F6)',
      gifs: [
        'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif',
        'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif',
        'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif',
      ]
    },
    angry: {
      emoji: '😤', color: '#EF4444', colorDark: '#B91C1C',
      gradient: 'linear-gradient(135deg,#EF4444,#DC2626)',
      gifs: [
        'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif',
        'https://media.giphy.com/media/ToMjGpx9F5ktZiTCMxq/giphy.gif',
        'https://media.giphy.com/media/zIwIWQx12YNEI/giphy.gif',
      ]
    },
    fearful: {
      emoji: '😱', color: '#A78BFA', colorDark: '#7C3AED',
      gradient: 'linear-gradient(135deg,#A78BFA,#8B5CF6)',
      gifs: [
        'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif',
        'https://media.giphy.com/media/14ut8PhnIwzros/giphy.gif',
        'https://media.giphy.com/media/Gldm2DGtPdCGs/giphy.gif',
      ]
    },
    disgusted: {
      emoji: '🤢', color: '#34D399', colorDark: '#059669',
      gradient: 'linear-gradient(135deg,#34D399,#10B981)',
      gifs: [
        'https://media.giphy.com/media/l3q2zVr6cu49eOTDq/giphy.gif',
        'https://media.giphy.com/media/l0MYC0LeyXv9B4pnO/giphy.gif',
        'https://media.giphy.com/media/xT9KVuimKtly3zoJ0Y/giphy.gif',
      ]
    },
    surprised: {
      emoji: '😮', color: '#FB923C', colorDark: '#EA580C',
      gradient: 'linear-gradient(135deg,#FB923C,#F97316)',
      gifs: [
        'https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif',
        'https://media.giphy.com/media/l46CeAb4k2R3Pjqko/giphy.gif',
        'https://media.giphy.com/media/xT9KVuimKtly3zoJ0Y/giphy.gif',
      ]
    },
    neutral: {
      emoji: '😐', color: '#94A3B8', colorDark: '#475569',
      gradient: 'linear-gradient(135deg,#94A3B8,#64748B)',
      gifs: [
        'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif',
        'https://media.giphy.com/media/l0HlAEGBLqRNDJrR6/giphy.gif',
        'https://media.giphy.com/media/YSs9T0dYLe55S/giphy.gif',
      ]
    },
  };

  const EMOTION_ORDER = ['happy','sad','angry','fearful','disgusted','surprised','neutral'];

  // ── Response Engine ─────────────────────────────────────────
  // Psychologically-informed, witty responses per emotion per language
  const RESPONSES = {
    en: {
      happy: [
        "Your smile could power a small city right now! Keep radiating that energy ⚡",
        "Scientists confirm: happiness is contagious. You're a certified superspreader 🦠😊",
        "Warning: Excessive happiness detected. Side effects include making strangers smile.",
        "Your dopamine factory is running full capacity. Excellent operational efficiency! 🏭",
        "The joy algorithms have peaked. This is your villain origin story if you ever frown. 😂",
      ],
      sad: [
        "Every storm runs out of rain eventually. You've got an umbrella and a rainbow incoming ☂️🌈",
        "Your feelings are 100% valid. Even the sun has cloudy days — and it always comes back ☀️",
        "Neuroscience says: this feeling is temporary. Your brain is already healing. 🧠💙",
        "Being sad means you cared deeply. That's not weakness — that's humanity at its finest.",
        "Sending virtual hugs 🫂. Also, chocolate works for cortisol. Just saying.",
      ],
      angry: [
        "Breathe. That person genuinely does NOT deserve your cortisol levels 😤→😌",
        "Anger is just passion without a direction. Let's redirect that energy! 🎯",
        "You have every right to feel this. Now let's channel it into something legendary 🔥",
        "Fun fact: the anger hormone flushes out in 90 seconds. Count with me. 1… 2… 3… 🕐",
        "SOMEONE touched your fries didn't they. We understand completely. 🍟💢",
      ],
      fearful: [
        "Fear means you're about to do something genuinely brave. That's literally the definition. 💪",
        "Your amygdala is just overprotecting you. Tell it: 'Thanks bestie, I got this.' 🧠",
        "The scariest step is always the first. After that? You're already doing it. ✅",
        "Courage isn't the absence of fear — it's being terrified and clicking Send anyway. 📧",
        "Every hero ever had this exact face before the plot kicked off. Your arc begins now. 🦸",
      ],
      disgusted: [
        "Your standards are demonstrably very high. Honestly? Admirable. 😂",
        "Some things genuinely deserve that exact reaction. Your gut instincts are WORKING. 👏",
        "That face says more than a thousand words. We're fully here for it. 💯",
        "Gordon Ramsay energy detected. You have developed a palate. Exquisite. 👨‍🍳",
      ],
      surprised: [
        "PLOT TWIST! Your face is currently experiencing a stack overflow 😵‍💫",
        "Life just threw a curveball and you caught it mid-blink. Respect. ⚾",
        "That reaction? Chef's completely kiss. Perfectly executed surprise. 🎭",
        "The universe has your full attention right now. Now we're curious what happened 👀",
        "Scientists call this the 'did-not-expect-that' reflex. You're clinically surprised. 📋",
      ],
      neutral: [
        "Peak poker face. Unreadable. Unbothered. Unapologetically iconic. 🃏",
        "Zen mode: activated. You are in perfect equilibrium right now. ⚖️",
        "Neither shaken nor stirred. You, my friend, are operating on pure James Bond energy. 🍸",
        "Neutral isn't boring — it's the calm suspension before your next legendary moment. ⚡",
        "The interior monologue is VERY loud and the exterior is VERY composed. Respect. 😶",
      ],
    },
    hi: {
      happy: [
        "आपकी मुस्कान देखकर पूरा दिन खुशनुमा हो गया! ऐसे ही चमकते रहिए ✨",
        "खुशी बांटने से बढ़ती है — आप आज पूरी दुनिया को खुश कर सकते हैं! 😄",
        "आपकी यह ऊर्जा अद्भुत है। इसे हमेशा बनाए रखें, यही जीवन की असली पूंजी है! 🌟",
        "इतनी खुशी? पक्का किसी ने गोलगप्पे खिलाए होंगे! 😂",
      ],
      sad: [
        "हर रात के बाद सुबह होती है। आपकी सुबह भी जरूर आएगी 🌅",
        "उदासी भी जिंदगी का हिस्सा है। आप बिल्कुल अकेले नहीं हैं। 💙",
        "यह वक्त भी गुजर जाएगा। आप उससे कहीं ज्यादा मजबूत हैं जितना आप सोचते हैं।",
        "Neuroscienceने साबित किया है — यह भावना अस्थायी है। आपका दिमाग ठीक हो रहा है। 🧠",
      ],
      angry: [
        "गुस्से में कोई फैसला मत लीजिए — पहले गहरी सांस लें 🌬️",
        "आपका गुस्सा बिल्कुल समझ में आता है। अब इसे सही दिशा में लगाएं। 💪",
        "दस तक गिनें... एक... दो... तीन... आप पहले से बेहतर महसूस करेंगे। 💫",
        "जिसने गुस्सा दिलाया वो आपकी energy के लायक नहीं है। मूव ऑन! 🚶",
      ],
      fearful: [
        "डर का मतलब है कि आप कुछ बड़ा करने वाले हैं। यही वो moment है! 💪",
        "हिम्मत करने वालों की हार नहीं होती। आगे बढ़िए!",
        "डर को अपनी ताकत बनाएं। आप यह जरूर कर सकते हैं! 🌟",
        "हर hero ने पहले यही face बनाया था। आपकी story अभी शुरू हुई है। 🦸",
      ],
      disgusted: [
        "आपके मानक बहुत ऊंचे हैं — यह बहुत अच्छी बात है! 😄",
        "आपकी सहज प्रतिक्रिया बिल्कुल सही है। पेट की बात सुनिए।",
        "Gordon Ramsay Vibes! आपका स्वाद बेमिसाल है। 👨‍🍳",
      ],
      surprised: [
        "अरे वाह! क्या हुआ? 😮 हम भी जानना चाहते हैं!",
        "जिंदगी हमेशा कुछ नया लाती है — यह उसी का नतीजा है। रोमांचक है ना?",
        "Plot twist incoming! आपका चेहरा सब बता रहा है। 🎭",
      ],
      neutral: [
        "शांत मन, स्थिर जीवन। आप perfect equilibrium में हैं। ⚖️",
        "यह शांति बहुत कीमती है — इसे बनाए रखें। James Bond vibes! 🍸",
        "अंदर से क्या चल रहा है? बाहर से तो आप बहुत composed हैं। 😶",
      ],
    },
    es: {
      happy: [
        "¡Tu sonrisa podría iluminar toda una ciudad! Sigue brillando así ✨",
        "La alegría es contagiosa — ¡y tú eres el epicentro hoy! 😄",
        "¡Energía al máximo! El mundo te ve y sonríe contigo. ¡Imparable! 🌟",
        "Los científicos confirman: eres un superspreader de felicidad. Peligroso. 😂",
      ],
      sad: [
        "Después de la tormenta más oscura, siempre sale el sol. Tu momento llega 🌈",
        "Tus sentimientos son completamente válidos. No estás solo/a en esto. 💙",
        "Este momento también pasará. Eres mucho más fuerte de lo que crees. 💪",
        "La neurociencia dice: esto es temporal. Tu cerebro ya está sanando. 🧠",
      ],
      angry: [
        "Respira profundo. No vale la pena perder la calma por eso 🌬️",
        "Canaliza esa energía hacia algo épico. ¡Tú puedes! 🎯",
        "La ira es pasión sin dirección. Encuentra tu norte y conquista. 🔥",
        "¿Alguien tocó tus papas fritas? Lo entendemos perfectamente. 🍟💢",
      ],
      fearful: [
        "El miedo es la señal de que estás a punto de hacer algo valiente 💪",
        "Siente el miedo... y hazlo de todas formas. Así nace el coraje verdadero.",
        "Tu cerebro te protege. Dile: 'Gracias, yo me encargo.' 🧠",
        "Todo héroe tuvo esta cara antes del gran momento. Tu arco comienza ahora. 🦸",
      ],
      disgusted: [
        "¡Tus estándares son altísimos y eso es absolutamente admirable! 😄",
        "Tu instinto funciona a la perfección. ¡Confía siempre en él! 👏",
        "Energía Gordon Ramsay detectada. Tu paladar es extraordinario. 👨‍🍳",
      ],
      surprised: [
        "¡Vaya giro inesperado! ¿Qué pasó? ¡Necesitamos saber! 😮",
        "La vida siempre tiene algo nuevo bajo la manga. ¡Bienvenido a la sorpresa!",
        "Esa reacción es perfecta. Absolutamente cinematográfica. 🎭",
      ],
      neutral: [
        "Serenidad total. Equilibrio perfecto. Modo zen plenamente activado ⚖️",
        "La calma es el superpoder más subestimado. Y tú lo posees por completo. 🍸",
        "Imposible de leer. Indestructible. Icónico. Pura energía James Bond. 😎",
      ],
    },
  };

  // ── UI Strings (i18n) ───────────────────────────────────────
  const UI_STRINGS = {
    en: {
      tagline: 'Real-time AI Emotion Intelligence',
      emotions: { happy:'Happy', sad:'Sad', angry:'Angry', fearful:'Fearful', disgusted:'Disgusted', surprised:'Surprised', neutral:'Neutral' },
      ui: {
        enableCamera: 'Enable Camera',
        camHint: 'Camera access required for emotion detection',
        noFace: 'No face detected — move closer',
        liveLabel: 'LIVE',
        aiSays: 'AI says:',
        confidenceLabel: 'confidence',
        feedbackTitle: 'Was this correct?',
        feedbackYes: '✓ Yes, spot on!',
        feedbackNo: '✗ No, correct it',
        feedbackThanks: 'Thanks! Saved for model training 💾',
        selectCorrect: 'What was your actual emotion?',
        gifVibe: '🎬 Your vibe right now',
        dashTitle: 'Emotion Dashboard',
        pieLabel: 'Session Distribution',
        timelineLabel: 'Live Emotion Timeline',
        statsTitle: 'Session Stats',
        totalDetections: 'Total Detections',
        dominantEmotion: 'Dominant Emotion',
        sessionDuration: 'Session Duration',
        accuracy: 'AI Accuracy',
        privacyTitle: 'Privacy First 🔒',
        privacyBody: 'MoodScan Pro runs entirely on your device. All video processing happens locally — no images, no video, no biometric data is ever sent to any server. Your feedback is stored only in your browser.',
        privacyAccept: "I understand — let's scan! 🚀",
        settingsTitle: 'Settings',
        themeLabel: 'Theme',
        langLabel: 'Language',
        exportBtn: '📥 Export Feedback CSV',
        exportSession: '📊 Export Session Data',
        privacyBadge: '🔒 100% On-Device · No Data Sent',
        inferenceLabel: 'Inference',
        fpsLabel: 'FPS',
      }
    },
    hi: {
      tagline: 'रियल-टाइम AI भावना विज्ञान',
      emotions: { happy:'खुश', sad:'उदास', angry:'गुस्सा', fearful:'डरे हुए', disgusted:'घृणा', surprised:'चौंके हुए', neutral:'तटस्थ' },
      ui: {
        enableCamera: 'कैमरा चालू करें',
        camHint: 'भावना पहचान के लिए कैमरा आवश्यक है',
        noFace: 'चेहरा नहीं मिला — करीब आएं',
        liveLabel: 'लाइव',
        aiSays: 'AI कहता है:',
        confidenceLabel: 'विश्वास',
        feedbackTitle: 'क्या यह सही था?',
        feedbackYes: '✓ हां, बिल्कुल सही!',
        feedbackNo: '✗ नहीं, सुधारें',
        feedbackThanks: 'धन्यवाद! मॉडल ट्रेनिंग के लिए सहेजा 💾',
        selectCorrect: 'आपकी असल भावना क्या थी?',
        gifVibe: '🎬 अभी आपका मूड',
        dashTitle: 'भावना डैशबोर्ड',
        pieLabel: 'सत्र वितरण',
        timelineLabel: 'लाइव भावना टाइमलाइन',
        statsTitle: 'सत्र आंकड़े',
        totalDetections: 'कुल पहचान',
        dominantEmotion: 'प्रमुख भावना',
        sessionDuration: 'सत्र अवधि',
        accuracy: 'AI सटीकता',
        privacyTitle: 'गोपनीयता प्राथमिकता 🔒',
        privacyBody: 'MoodScan Pro पूरी तरह आपके डिवाइस पर चलता है। कोई भी छवि, वीडियो या बायोमेट्रिक डेटा कभी सर्वर पर नहीं भेजा जाता।',
        privacyAccept: 'समझ गया — चलते हैं! 🚀',
        settingsTitle: 'सेटिंग्स',
        themeLabel: 'थीम',
        langLabel: 'भाषा',
        exportBtn: '📥 फ़ीडबैक CSV डाउनलोड',
        exportSession: '📊 सत्र डेटा डाउनलोड',
        privacyBadge: '🔒 पूरी तरह डिवाइस पर · कोई डेटा नहीं भेजा',
        inferenceLabel: 'इन्फरेंस',
        fpsLabel: 'FPS',
      }
    },
    es: {
      tagline: 'Inteligencia Emocional en Tiempo Real',
      emotions: { happy:'Feliz', sad:'Triste', angry:'Enojado', fearful:'Asustado', disgusted:'Disgustado', surprised:'Sorprendido', neutral:'Neutral' },
      ui: {
        enableCamera: 'Activar Cámara',
        camHint: 'Se necesita acceso a la cámara para detectar emociones',
        noFace: 'Sin cara detectada — acércate',
        liveLabel: 'EN VIVO',
        aiSays: 'La IA dice:',
        confidenceLabel: 'confianza',
        feedbackTitle: '¿Fue correcto?',
        feedbackYes: '✓ ¡Sí, exacto!',
        feedbackNo: '✗ No, corregir',
        feedbackThanks: '¡Gracias! Guardado para entrenamiento 💾',
        selectCorrect: '¿Cuál era tu emoción real?',
        gifVibe: '🎬 Tu vibra ahora mismo',
        dashTitle: 'Panel de Emociones',
        pieLabel: 'Distribución de Sesión',
        timelineLabel: 'Línea de Tiempo en Vivo',
        statsTitle: 'Estadísticas',
        totalDetections: 'Total Detecciones',
        dominantEmotion: 'Emoción Dominante',
        sessionDuration: 'Duración',
        accuracy: 'Precisión IA',
        privacyTitle: 'Privacidad Primero 🔒',
        privacyBody: 'MoodScan Pro se ejecuta completamente en tu dispositivo. Ninguna imagen, video o dato biométrico se envía jamás a ningún servidor.',
        privacyAccept: '¡Entendido — empecemos! 🚀',
        settingsTitle: 'Ajustes',
        themeLabel: 'Tema',
        langLabel: 'Idioma',
        exportBtn: '📥 Exportar Feedback CSV',
        exportSession: '📊 Exportar Sesión',
        privacyBadge: '🔒 100% en Dispositivo · Sin Datos Enviados',
        inferenceLabel: 'Inferencia',
        fpsLabel: 'FPS',
      }
    },
  };

  // ── Public API ──────────────────────────────────────────────

  /**
   * Pick a random (non-repeating) response for an emotion in a language
   * @param {string} emotion
   * @param {string} lang - 'en' | 'hi' | 'es'
   * @param {string} [lastResponse] - avoid repeating
   */
  const _lastResponses = {};
  function getResponse(emotion, lang) {
    const pool = RESPONSES[lang]?.[emotion] || RESPONSES.en[emotion] || ['...'];
    let idx;
    do { idx = Math.floor(Math.random() * pool.length); }
    while (pool.length > 1 && _lastResponses[emotion] === idx);
    _lastResponses[emotion] = idx;
    return pool[idx];
  }

  /**
   * Get localised emotion display name
   */
  function getEmotionName(emotion, lang) {
    return UI_STRINGS[lang]?.emotions?.[emotion] || UI_STRINGS.en.emotions[emotion] || emotion;
  }

  /**
   * Get all UI strings for a language
   */
  const UI = {
    get(lang) { return UI_STRINGS[lang] || UI_STRINGS.en; }
  };

  /**
   * Pick a random GIF URL for an emotion
   */
  const _lastGifIdx = {};
  function getGIF(emotion) {
    const gifs = EMOTIONS[emotion]?.gifs || [];
    if (!gifs.length) return null;
    let idx;
    do { idx = Math.floor(Math.random() * gifs.length); }
    while (gifs.length > 1 && _lastGifIdx[emotion] === idx);
    _lastGifIdx[emotion] = idx;
    return gifs[idx];
  }

  return { EMOTIONS, EMOTION_ORDER, RESPONSES, UI, getResponse, getEmotionName, getGIF };

})();
