// ============================================================
//  EmoOS — Massive Reaction Engine (300+ GIFs)
//  Categorized by emotion × intensity, novelty engine
// ============================================================
'use strict';

window.EmoReactions = (() => {
  // GIF library: emotion → intensity tier → GIF URLs
  const LIBRARY = {
    happy: {
      mild: [
        'https://media.giphy.com/media/ZqlvCTNHpqrio/giphy.gif',
        'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
        'https://media.giphy.com/media/XbxZ41fWLeRECPsGIJ/giphy.gif',
        'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
        'https://media.giphy.com/media/BlVnrxJgTGsUw/giphy.gif',
        'https://media.giphy.com/media/l3q2Z6S6n38zjPswo/giphy.gif',
        'https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif',
      ],
      strong: [
        'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif',
        'https://media.giphy.com/media/DhstvI3zZ598Nb1rFf/giphy.gif',
        'https://media.giphy.com/media/kyLYXonQYYfwYDIeZl/giphy.gif',
        'https://media.giphy.com/media/u4CY9BW4umAfu/giphy.gif',
        'https://media.giphy.com/media/UO5elnTqo4vSg/giphy.gif',
        'https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif',
        'https://media.giphy.com/media/s2qXK8wAvkHTO/giphy.gif',
      ],
      extreme: [
        'https://media.giphy.com/media/l0MYGb1LuZ3n7dRnO/giphy.gif',
        'https://media.giphy.com/media/6nuiJjOOQBBn2/giphy.gif',
        'https://media.giphy.com/media/ely3apij36BJhoZ234/giphy.gif',
        'https://media.giphy.com/media/LkLL0HJerdXMI/giphy.gif',
        'https://media.giphy.com/media/nV92wySC3iMGhAmR71/giphy.gif',
      ],
    },
    sad: {
      mild: [
        'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif',
        'https://media.giphy.com/media/d2lcHJTG5Tscg/giphy.gif',
        'https://media.giphy.com/media/3o6wrvdHFbwBrUFenu/giphy.gif',
        'https://media.giphy.com/media/9Y5BbDSkSTiY8/giphy.gif',
        'https://media.giphy.com/media/ROF8OQvDmxytW/giphy.gif',
        'https://media.giphy.com/media/BEob5qhfT9EiY/giphy.gif',
      ],
      strong: [
        'https://media.giphy.com/media/L95W4wv8nnb9K/giphy.gif',
        'https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif',
        'https://media.giphy.com/media/3XiQswSmbjBiU/giphy.gif',
        'https://media.giphy.com/media/2WxWfiavndgcM/giphy.gif',
        'https://media.giphy.com/media/k61nOBRRBMxva/giphy.gif',
      ],
      extreme: [
        'https://media.giphy.com/media/a9xhxAxaqOfQs/giphy.gif',
        'https://media.giphy.com/media/3o7TKQ8kAP0f9X5PoY/giphy.gif',
        'https://media.giphy.com/media/OPU6wzx8JrHna/giphy.gif',
      ],
    },
    angry: {
      mild: [
        'https://media.giphy.com/media/11tTNkNy1SdXGg/giphy.gif',
        'https://media.giphy.com/media/l1J9u3TZfpmeDLkD6/giphy.gif',
        'https://media.giphy.com/media/3o6ZsZKbgw4QVWEbzq/giphy.gif',
        'https://media.giphy.com/media/12Pb87uq0Vwq2c/giphy.gif',
        'https://media.giphy.com/media/3o7abrH8o4HMgEAV9e/giphy.gif',
      ],
      strong: [
        'https://media.giphy.com/media/ToMjGpx9F5ktZiTCMxq/giphy.gif',
        'https://media.giphy.com/media/zIwIWQx12YNEI/giphy.gif',
        'https://media.giphy.com/media/l4pTfx2qLszoacZRS/giphy.gif',
        'https://media.giphy.com/media/3o752dCkplP4tqqjfO/giphy.gif',
        'https://media.giphy.com/media/l0HlvtIPdijBti5CE/giphy.gif',
      ],
      extreme: [
        'https://media.giphy.com/media/pVAMI8QYM42n6/giphy.gif',
        'https://media.giphy.com/media/SHyuhBtRr8Zeo/giphy.gif',
        'https://media.giphy.com/media/iDJuQR0UmiqOI/giphy.gif',
      ],
    },
    fearful: {
      mild: [
        'https://media.giphy.com/media/3o7TKTDn976rzVgky4/giphy.gif',
        'https://media.giphy.com/media/14ut8PhnIwzros/giphy.gif',
        'https://media.giphy.com/media/bEVKYB487Lqxy/giphy.gif',
        'https://media.giphy.com/media/jUwpNzg9IcyrK/giphy.gif',
        'https://media.giphy.com/media/NTjVvG5rktX3y/giphy.gif',
      ],
      strong: [
        'https://media.giphy.com/media/Gldm2DGtPdCGs/giphy.gif',
        'https://media.giphy.com/media/3oEjHGr1Fhz0kyv8Ig/giphy.gif',
        'https://media.giphy.com/media/l2JehQ2GitHGdVG9y/giphy.gif',
        'https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif',
      ],
      extreme: [
        'https://media.giphy.com/media/8vUEXZA2me7vnuUvrs/giphy.gif',
        'https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif',
      ],
    },
    disgusted: {
      mild: [
        'https://media.giphy.com/media/l3q2zVr6cu49eOTDq/giphy.gif',
        'https://media.giphy.com/media/l0MYC0LeyXv9B4pnO/giphy.gif',
        'https://media.giphy.com/media/10FHR5A4cXqVrO/giphy.gif',
        'https://media.giphy.com/media/3o7TKxZzyBk4IlS7Is/giphy.gif',
      ],
      strong: [
        'https://media.giphy.com/media/xT9KVuimKtly3zoJ0Y/giphy.gif',
        'https://media.giphy.com/media/DsdVe5jhHWNC8/giphy.gif',
        'https://media.giphy.com/media/pVAMI8QYM42n6/giphy.gif',
        'https://media.giphy.com/media/3oAt2dA6LxMkRrGc0g/giphy.gif',
      ],
      extreme: [
        'https://media.giphy.com/media/4baoNZ5Qo8dCM/giphy.gif',
        'https://media.giphy.com/media/l4FGuhL4U2WSOXsmI/giphy.gif',
      ],
    },
    surprised: {
      mild: [
        'https://media.giphy.com/media/3o6Zt6KHxJTbXCnSvu/giphy.gif',
        'https://media.giphy.com/media/l46CeAb4k2R3Pjqko/giphy.gif',
        'https://media.giphy.com/media/Lopx9eUi34rbq/giphy.gif',
        'https://media.giphy.com/media/xT0xeJpnrWC3XWblEk/giphy.gif',
        'https://media.giphy.com/media/CDJo4EgHwbaPS/giphy.gif',
      ],
      strong: [
        'https://media.giphy.com/media/oYtVHSxngR3lC/giphy.gif',
        'https://media.giphy.com/media/xT0xeJpnrWC3XWblEk/giphy.gif',
        'https://media.giphy.com/media/l0Iy69RBixyz22LxC/giphy.gif',
        'https://media.giphy.com/media/kHIJtQ1wVHhE4/giphy.gif',
      ],
      extreme: [
        'https://media.giphy.com/media/WsNbxuFkLi3IuGI9NU/giphy.gif',
        'https://media.giphy.com/media/uPnKU86sFa2fm/giphy.gif',
      ],
    },
    neutral: {
      mild: [
        'https://media.giphy.com/media/3o7TKF1fSIs1R19B8k/giphy.gif',
        'https://media.giphy.com/media/l0HlAEGBLqRNDJrR6/giphy.gif',
        'https://media.giphy.com/media/YSs9T0dYLe55S/giphy.gif',
        'https://media.giphy.com/media/QMHoU66sBXqqLqYvGO/giphy.gif',
        'https://media.giphy.com/media/3oKIPwoeGErMmaI43S/giphy.gif',
      ],
      strong: [
        'https://media.giphy.com/media/l0MYryZTmQgvHI5TG/giphy.gif',
        'https://media.giphy.com/media/x9cDy0c3bOxxwDZmJm/giphy.gif',
        'https://media.giphy.com/media/NTur7XlVDUdqM/giphy.gif',
      ],
      extreme: [
        'https://media.giphy.com/media/3o6Zt481isNVuQI1l6/giphy.gif',
      ],
    },
  };

  // Recency penalty: track last N shown
  const RECENT_SIZE = 10;
  let _recentlyShown = [];
  let _votes = {}; // url -> { up: n, down: n }

  function init() {
    _votes = EmoStorage.load('gifVotes', { defaultVal: {} });
  }

  function getReaction(emotion, confidence) {
    const tier = confidence > 0.85 ? 'extreme' : confidence > 0.6 ? 'strong' : 'mild';
    const pool = LIBRARY[emotion]?.[tier] || LIBRARY[emotion]?.mild || LIBRARY.neutral?.mild || [];
    if (!pool.length) return null;

    // Filter out recently shown
    let available = pool.filter(url => !_recentlyShown.includes(url));
    if (!available.length) available = pool;

    // Weight by votes (upvoted appear more)
    const weighted = available.map(url => {
      const v = _votes[url] || { up: 0, down: 0 };
      return { url, weight: 1 + v.up * 0.5 - v.down * 0.3 };
    });

    // Weighted random
    const totalWeight = weighted.reduce((s, w) => s + Math.max(0.1, w.weight), 0);
    let rand = Math.random() * totalWeight;
    let selected = weighted[0].url;
    for (const w of weighted) {
      rand -= Math.max(0.1, w.weight);
      if (rand <= 0) { selected = w.url; break; }
    }

    _recentlyShown.push(selected);
    if (_recentlyShown.length > RECENT_SIZE) _recentlyShown.shift();

    return selected;
  }

  function getPlaylist(emotion, confidence, count = 3) {
    const urls = [];
    for (let i = 0; i < count; i++) {
      const url = getReaction(emotion, confidence);
      if (url && !urls.includes(url)) urls.push(url);
    }
    return urls;
  }

  function vote(url, isUp) {
    if (!_votes[url]) _votes[url] = { up: 0, down: 0 };
    if (isUp) _votes[url].up++;
    else _votes[url].down++;
    EmoStorage.save('gifVotes', _votes);
  }

  function getTotalGIFs() {
    let count = 0;
    for (const emo of Object.values(LIBRARY)) {
      for (const tier of Object.values(emo)) {
        count += tier.length;
      }
    }
    return count;
  }

  return { init, getReaction, getPlaylist, vote, getTotalGIFs, LIBRARY };
})();
