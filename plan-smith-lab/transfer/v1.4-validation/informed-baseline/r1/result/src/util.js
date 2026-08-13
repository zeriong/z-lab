// Utility functions
const U = {
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
    if (v > 0) return 1;
    if (v < 0) return -1;
    return 0;
  },

  fmt(n, decimals = 0) {
    return n.toFixed(decimals);
  }
};
