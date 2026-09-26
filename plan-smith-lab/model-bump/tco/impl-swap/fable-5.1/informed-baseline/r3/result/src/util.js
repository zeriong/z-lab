/* util.js — 순수 유틸리티. 다른 전역을 참조하지 않는다. (§3.3) */
var U = (function () {
  'use strict';

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function dist(ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function sign(v) {
    return v > 0 ? 1 : (v < 0 ? -1 : 0);
  }

  /* 정수 천 단위 구분 문자열 */
  function fmt(n) {
    n = Math.round(Number(n) || 0);
    var neg = n < 0;
    var s = String(Math.abs(n));
    var out = '';
    while (s.length > 3) {
      out = ',' + s.slice(-3) + out;
      s = s.slice(0, -3);
    }
    return (neg ? '-' : '') + s + out;
  }

  return { clamp: clamp, lerp: lerp, dist: dist, sign: sign, fmt: fmt };
})();
