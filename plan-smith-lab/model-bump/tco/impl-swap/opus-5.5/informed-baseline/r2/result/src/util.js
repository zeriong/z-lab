/*
 * util.js — 순수 유틸 함수 모음
 * 노출: window.U = { clamp, lerp, dist, sign, fmt }
 * 참조: 없음 (다른 전역을 읽지 않는다)
 */
(function () {
  'use strict';

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function dist(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function sign(v) {
    return v > 0 ? 1 : (v < 0 ? -1 : 0);
  }

  // 정수 반올림 + 천 단위 콤마
  function fmt(n) {
    var v = Math.round(Number(n) || 0);
    var neg = v < 0;
    var s = String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return neg ? '-' + s : s;
  }

  window.U = {
    clamp: clamp,
    lerp: lerp,
    dist: dist,
    sign: sign,
    fmt: fmt
  };
})();
