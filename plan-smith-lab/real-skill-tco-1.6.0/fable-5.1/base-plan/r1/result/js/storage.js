window.AB = window.AB || {};

// 진행 저장 (계획서 §8.5). localStorage 접근은 전부 try/catch.
// 형식: { unlocked: 1..10, best: { "1": { score, stars }, ... } }
AB.Storage = (function () {
  'use strict';

  function maxLevel() {
    return (AB.LEVELS && AB.LEVELS.length) ? AB.LEVELS.length : 10;
  }

  function storageKey() {
    return AB.CONFIG.STORAGE_KEY;
  }

  function defaults() {
    return { unlocked: 1, best: {} };
  }

  function sanitize(data) {
    if (!data || typeof data !== 'object') return defaults();
    var unlocked = Math.floor(Number(data.unlocked));
    if (!(unlocked >= 1)) unlocked = 1;
    if (unlocked > maxLevel()) unlocked = maxLevel();
    var best = {};
    if (data.best && typeof data.best === 'object') {
      Object.keys(data.best).forEach(function (k) {
        var b = data.best[k];
        if (!b || typeof b !== 'object') return;
        var score = Number(b.score), stars = Math.floor(Number(b.stars));
        if (!(score >= 0)) score = 0;
        if (!(stars >= 0)) stars = 0;
        if (stars > 3) stars = 3;
        best[String(k)] = { score: score, stars: stars };
      });
    }
    return { unlocked: unlocked, best: best };
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(storageKey());
      if (!raw) return defaults();
      return sanitize(JSON.parse(raw));
    } catch (e) {
      return defaults();
    }
  }

  function save(progress) {
    try {
      window.localStorage.setItem(storageKey(), JSON.stringify(sanitize(progress)));
    } catch (e) {
      /* 저장 불가(사생활 보호 모드 등)는 조용히 무시 */
    }
  }

  // best[id]는 더 높은 점수/별로만 갱신, unlocked = max(unlocked, min(MAX, id+1))
  function markCleared(id, score, stars) {
    var progress = load();
    var key = String(id);
    var prev = progress.best[key];
    if (!prev) {
      progress.best[key] = { score: score, stars: stars };
    } else {
      progress.best[key] = {
        score: Math.max(prev.score || 0, score),
        stars: Math.max(prev.stars || 0, stars)
      };
    }
    progress.unlocked = Math.max(progress.unlocked, Math.min(maxLevel(), id + 1));
    save(progress);
    return progress;
  }

  function unlockAll() {
    var progress = load();
    progress.unlocked = maxLevel();
    save(progress);
    return progress;
  }

  return {
    load: load,
    save: save,
    markCleared: markCleared,
    unlockAll: unlockAll
  };
})();
