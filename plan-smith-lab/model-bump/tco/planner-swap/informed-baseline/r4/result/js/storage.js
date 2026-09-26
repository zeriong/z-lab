window.AB = window.AB || {};

(function() {
  'use strict';

  let data = { cleared: {} };

  function load() {
    try {
      const stored = localStorage.getItem(AB.CONFIG.STORAGE_KEY);
      if (stored) {
        data = JSON.parse(stored);
        if (!data.cleared) data.cleared = {};
      }
    } catch (e) {
      // Silently fail
      data = { cleared: {} };
    }
  }

  function save() {
    try {
      localStorage.setItem(AB.CONFIG.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Silently fail
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
    const existing = data.cleared[key];

    let bestStars = stars;
    let bestScore = score;

    if (existing) {
      bestStars = Math.max(existing.stars, stars);
      bestScore = Math.max(existing.best, score);
    }

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
    load: load,
    save: save,
    getRecord: getRecord,
    isUnlocked: isUnlocked,
    recordClear: recordClear,
    firstPlayableLevel: firstPlayableLevel
  };
})();
