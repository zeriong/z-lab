/**
 * Deterministic seeded RNG (mulberry32) — used only for cosmetic debris
 * particle spread. Physics itself is deterministic via the fixed
 * timestep in physics.js; this RNG exists so that debris direction is
 * ALSO reproducible when a stage is reseeded on restart (plan anchor
 * A3: identical drag input -> identical replay, including visuals).
 */
window.RNG = (function () {
  let state = 1;

  function seed(s) {
    state = (s >>> 0) || 1;
  }

  function next() {
    // mulberry32
    state |= 0; state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function range(min, max) {
    return min + next() * (max - min);
  }

  return { seed, next, range };
})();
