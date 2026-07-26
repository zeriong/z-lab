/**
 * Progress persistence — static-file friendly (no backend).
 * Stores, per stage id, the best star rating (0-3) and whether it is
 * unlocked. Stage 1 is always unlocked; clearing stage N unlocks N+1.
 */
window.Storage = (function () {
  const KEY = 'slingshot-defense-progress-v1';

  function defaultProgress() {
    const stars = {};
    window.STAGES.forEach((s, i) => { stars[s.id] = i === 0 ? 0 : -1; }); // -1 = locked
    return { stars };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultProgress();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.stars !== 'object') return defaultProgress();
      return parsed;
    } catch (e) {
      return defaultProgress();
    }
  }

  function save(progress) {
    try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch (e) { /* ignore quota/denied */ }
  }

  function isUnlocked(progress, stageId) {
    return progress.stars[stageId] !== undefined && progress.stars[stageId] !== -1;
  }

  function recordClear(progress, stageId, stars) {
    const current = progress.stars[stageId];
    if (current === undefined || current === -1 || stars > current) {
      progress.stars[stageId] = stars;
    }
    const idx = window.STAGES.findIndex((s) => s.id === stageId);
    const next = window.STAGES[idx + 1];
    if (next && progress.stars[next.id] === -1) {
      progress.stars[next.id] = 0;
    }
    save(progress);
    return progress;
  }

  function reset() {
    const p = defaultProgress();
    save(p);
    return p;
  }

  return { load, save, isUnlocked, recordClear, reset };
})();
