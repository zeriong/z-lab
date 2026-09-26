// util.js — 순수 유틸리티. 다른 전역을 참조하지 않는다.
(function () {
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

  // 정수를 천 단위 구분 문자열로
  function fmt(n) {
    var s = String(Math.round(n));
    var out = '';
    var count = 0;
    for (var i = s.length - 1; i >= 0; i--) {
      out = s.charAt(i) + out;
      count++;
      if (count % 3 === 0 && i > 0 && s.charAt(i - 1) !== '-') {
        out = ',' + out;
      }
    }
    return out;
  }

  window.U = {
    clamp: clamp,
    lerp: lerp,
    dist: dist,
    sign: sign,
    fmt: fmt
  };
})();
