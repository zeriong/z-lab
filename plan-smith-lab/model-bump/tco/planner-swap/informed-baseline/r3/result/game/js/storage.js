(function() {
  window.AB = window.AB || {};

  let data = { cleared: {} };

  AB.Storage = {
    load: function() {
      try {
        const stored = localStorage.getItem(AB.CONFIG.STORAGE_KEY);
        if (stored) {
          data = JSON.parse(stored);
        } else {
          data = { cleared: {} };
        }
      } catch (e) {
        data = { cleared: {} };
      }
    },

    save: function() {
      try {
        localStorage.setItem(AB.CONFIG.STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        // Silently ignore errors in private mode or storage denied
      }
    },

    getRecord: function(i) {
      return data.cleared[String(i)] || null;
    },

    isUnlocked: function(i) {
      if (i === 0) return true;
      if (location.hash === '#unlockall') return true;
      return AB.Storage.getRecord(i - 1) !== null;
    },

    recordClear: function(i, stars, score) {
      const key = String(i);
      const existing = data.cleared[key];
      if (existing) {
        existing.stars = Math.max(existing.stars || 0, stars);
        existing.best = Math.max(existing.best || 0, score);
      } else {
        data.cleared[key] = { stars: stars, best: score };
      }
      AB.Storage.save();
      return data.cleared[key].best;
    },

    firstPlayableLevel: function() {
      for (let i = 0; i < 10; i++) {
        if (AB.Storage.isUnlocked(i) && !AB.Storage.getRecord(i)) {
          return i;
        }
      }
      return 0;
    }
  };
})();
