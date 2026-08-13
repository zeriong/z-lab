// Utility functions
window.U = {
  clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  dist(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  sign(v) {
    return v > 0 ? 1 : v < 0 ? -1 : 0;
  },

  fmt(num, digits = 0) {
    return num.toFixed(digits);
  }
};
