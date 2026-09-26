(function() {
  window.AB = window.AB || {};

  const C = window.AB.CONFIG;
  let data = { cleared: {} };

  function load() {
    try {
      const stored = localStorage.getItem(C.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.cleared && typeof parsed.cleared === 'object') {
          data = parsed;
          return;
        }
      }
    } catch (e) {
      // Ignore error
    }
    data = { cleared: {} };
  }

  function save() {
    try {
      localStorage.setItem(C.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // Ignore error
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
    const newStars = existing ? Math.max(existing.stars, stars) : stars;
    const newBest = existing ? Math.max(existing.best, score) : score;

    data.cleared[key] = { stars: newStars, best: newBest };
    save();
    return newBest;
  }

  function firstPlayableLevel() {
    for (let i = 0; i < 10; i++) {
      if (isUnlocked(i) && getRecord(i) === null) {
        return i;
      }
    }
    return 0;
  }

  window.AB.Storage = {
    load,
    save,
    getRecord,
    isUnlocked,
    recordClear,
    firstPlayableLevel
  };
})();
