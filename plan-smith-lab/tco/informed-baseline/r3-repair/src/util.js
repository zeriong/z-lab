// src/util.js
// 순수 유틸리티 함수
// 의존성: 없음

const U = {
  clamp(v, min, max) {
    return Math.max(min, Math.min(v, max));
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  dist(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  },

  sign(v) {
    return v === 0 ? 0 : (v > 0 ? 1 : -1);
  },

  fmt(n) {
    return Math.floor(n).toLocaleString();
  }
};
