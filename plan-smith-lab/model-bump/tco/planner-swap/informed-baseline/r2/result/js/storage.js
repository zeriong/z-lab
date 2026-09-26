window.AB = window.AB || {};

(function() {
  'use strict';

  let data = { cleared: {} };

  function load() {
    try {
      const stored = localStorage.getItem(AB.CONFIG.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.cleared && typeof parsed.cleared === 'object') {
          data = parsed;
        } else {
          data = { cleared: {} };
        }
      } else {
        data = { cleared: {} };
      }
    } catch (e) {
      data = { cleared: {} };
    }
  }

  function save() {
    try {
      localStorage.setItem(AB.CONFIG.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Ignore, keep in memory
    }
  }

  function getRecord(i) {
    const key = String(i);
    return data.cleared[key] || null;
  }

  function isUnlocked(i) {
    if (i === 0) return true;
    if (location.hash === '#unlockall') return true;
    return getRecord(i - 1) !== null;
  }

  function recordClear(i, stars, score) {
    const key = String(i);
    const existing = getRecord(i);
    const bestStars = Math.max(stars, existing ? existing.stars : 0);
    const bestScore = Math.max(score, existing ? existing.best : 0);

    data.cleared[key] = { stars: bestStars, best: bestScore };
    save();
    return bestScore;
  }

  function firstPlayableLevel() {
    for (let i = 0; i < 10; i++) {
      if (isUnlocked(i) && !getRecord(i)) {
        return i;
      }
    }
    return 0;
  }

  AB.Storage = {
    load,
    save,
    getRecord,
    isUnlocked,
    recordClear,
    firstPlayableLevel
  };
})();
