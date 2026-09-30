// storage.js — 진행도 저장/로드 (plan §12)
(function () {
  'use strict';
  const AB = (window.AB = window.AB || {});

  function stageCount() {
    return AB.STAGES ? AB.STAGES.length : 10;
  }

  function defaults() {
    const n = stageCount();
    const stars = [];
    const best = [];
    for (let i = 0; i < n; i++) {
      stars.push(0);
      best.push(0);
    }
    return { unlocked: 1, stars: stars, best: best };
  }

  function toInt(v) {
    const x = Number(v);
    return Number.isFinite(x) ? Math.floor(x) : null;
  }

  // 필드를 하나씩 검증하고 clamp한다
  function sanitize(data) {
    const out = defaults();
    if (!data || typeof data !== 'object') return out;
    const n = stageCount();
    const u = toInt(data.unlocked);
    if (u !== null) out.unlocked = AB.clamp(u, 1, n);
    if (Array.isArray(data.stars)) {
      for (let i = 0; i < n; i++) {
        const s = toInt(data.stars[i]);
        if (s !== null) out.stars[i] = AB.clamp(s, 0, 3);
      }
    }
    if (Array.isArray(data.best)) {
      for (let i = 0; i < n; i++) {
        const b = toInt(data.best[i]);
        if (b !== null) out.best[i] = Math.max(0, b);
      }
    }
    // 클리어 기록이 있는 스테이지의 다음 스테이지는 해금되어 있어야 한다
    for (let i = 0; i < n; i++) {
      if (out.stars[i] > 0) out.unlocked = Math.max(out.unlocked, Math.min(n, i + 2));
    }
    return out;
  }

  const Storage = {
    load() {
      let raw = null;
      try {
        raw = window.localStorage.getItem(AB.CONFIG.STORAGE_KEY);
      } catch (e) {
        raw = null;
      }
      if (!raw) return defaults();
      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (e) {
        return defaults();
      }
      return sanitize(data);
    },

    save(progress) {
      try {
        const data = {
          unlocked: progress.unlocked,
          stars: progress.stars.slice(),
          best: progress.best.slice(),
        };
        window.localStorage.setItem(AB.CONFIG.STORAGE_KEY, JSON.stringify(data));
      } catch (e) {
        // 저장 실패는 무시한다 (메모리 값만 유지)
      }
    },

    // ?unlock → 모든 스테이지를 해금한 것으로 표시만 한다 (저장하지 않음)
    isDebugUnlock() {
      try {
        return String(window.location.search || '').indexOf('unlock') >= 0;
      } catch (e) {
        return false;
      }
    },

    defaults: defaults,
  };

  AB.Storage = Storage;
})();
