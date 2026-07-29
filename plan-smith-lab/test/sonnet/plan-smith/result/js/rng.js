// Shared namespace for the whole game (classic <script> tags, no modules --
// type="module" + import/export fail when the page is opened via file://).
var AB = window.AB || (window.AB = {});

// Seeded deterministic PRNG (mulberry32). Every random value used anywhere
// inside the simulation (debris jitter, etc.) must come from here, never
// from Math.random(), and the seed is reset on every stage load/restart --
// this is what makes "same drag vector -> same destroyed set + same verdict,
// 3x in a row" (the plan's sole measurable completion criterion) possible.
AB.RNG = (function () {
  let state = 1;

  function seed(n) {
    state = (n >>> 0) || 1;
  }

  function next() {
    state |= 0;
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function range(min, max) {
    return min + next() * (max - min);
  }

  return { seed, next, range };
})();
