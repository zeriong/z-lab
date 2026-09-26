/*
 * src/util.js — 순수 유틸 함수 (§3.3)
 * 노출: U = { clamp, lerp, dist, sign, fmt }
 * 참조 전역: 없음
 */
(function () {
  'use strict';

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  // 두 점 (ax, ay) - (bx, by) 사이 거리
  function dist(ax, ay, bx, by) {
    var dx = bx - ax;
    var dy = by - ay;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // 양수 1, 음수 -1, 0 은 0
  function sign(v) {
    return v > 0 ? 1 : (v < 0 ? -1 : 0);
  }

  // 정수 반올림 + 천 단위 콤마 (예: 12345 -> "12,345")
  function fmt(n) {
    var v = Math.round(Number(n) || 0);
    var neg = v < 0;
    var s = String(Math.abs(v));
    var out = '';
    while (s.length > 3) {
      out = ',' + s.slice(s.length - 3) + out;
      s = s.slice(0, s.length - 3);
    }
    return (neg ? '-' : '') + s + out;
  }

  window.U = {
    clamp: clamp,
    lerp: lerp,
    dist: dist,
    sign: sign,
    fmt: fmt
  };
})();
