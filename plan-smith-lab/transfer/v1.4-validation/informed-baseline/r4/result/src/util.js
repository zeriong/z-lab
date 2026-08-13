// Utility functions
const U = {
  clamp: (v, min, max) => Math.max(min, Math.min(max, v)),

  lerp: (a, b, t) => a + (b - a) * t,

  dist: (p1, p2) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  sign: (x) => x === 0 ? 0 : (x > 0 ? 1 : -1),

  fmt: (n) => n.toLocaleString('en-US', { maximumFractionDigits: 0 })
};
