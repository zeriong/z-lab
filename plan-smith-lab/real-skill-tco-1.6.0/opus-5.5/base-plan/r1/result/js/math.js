// math.js — 2D 벡터 헬퍼, 좌표 변환, 유틸 (plan §3, §4.1)
(function () {
  'use strict';
  const AB = (window.AB = window.AB || {});

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  const V = {
    v(x, y) {
      return { x: x, y: y };
    },
    copy(a) {
      return { x: a.x, y: a.y };
    },
    add(a, b) {
      return { x: a.x + b.x, y: a.y + b.y };
    },
    sub(a, b) {
      return { x: a.x - b.x, y: a.y - b.y };
    },
    scale(a, s) {
      return { x: a.x * s, y: a.y * s };
    },
    neg(a) {
      return { x: -a.x, y: -a.y };
    },
    dot(a, b) {
      return a.x * b.x + a.y * b.y;
    },
    // cross(a, b) = a.x·b.y − a.y·b.x (스칼라)
    cross(a, b) {
      return a.x * b.y - a.y * b.x;
    },
    // cross(ω, r) = (−ω·r.y, ω·r.x) (회전에 의한 점 속도)
    crossSV(w, r) {
      return { x: -w * r.y, y: w * r.x };
    },
    lenSq(a) {
      return a.x * a.x + a.y * a.y;
    },
    len(a) {
      return Math.sqrt(a.x * a.x + a.y * a.y);
    },
    dist(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    },
    distSq(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return dx * dx + dy * dy;
    },
    // 길이가 EPSILON 미만이면 기본값(없으면 (0,1))의 사본을 반환
    normalize(a, def) {
      const l = Math.sqrt(a.x * a.x + a.y * a.y);
      if (!(l >= AB.CONFIG.EPSILON)) {
        return def ? { x: def.x, y: def.y } : { x: 0, y: 1 };
      }
      return { x: a.x / l, y: a.y / l };
    },
    // 반시계 방향 +
    rotate(a, ang) {
      const c = Math.cos(ang);
      const s = Math.sin(ang);
      return { x: c * a.x - s * a.y, y: s * a.x + c * a.y };
    },
    // R·v (R = [[c, −s], [s, c]])
    mulR(c, s, v) {
      return { x: c * v.x - s * v.y, y: s * v.x + c * v.y };
    },
    // Rᵀ·v
    mulRT(c, s, v) {
      return { x: c * v.x + s * v.y, y: -s * v.x + c * v.y };
    },
    isFiniteVec(a) {
      return Number.isFinite(a.x) && Number.isFinite(a.y);
    },
  };

  // 월드(m, y 위 +) ↔ 논리 화면(px, y 아래 +). 부호 반전은 이 두 함수에서만 한다.
  const Coord = {
    worldToScreen(x, y) {
      const C = AB.CONFIG;
      return { x: x * C.PPM, y: C.GROUND_SCREEN_Y - y * C.PPM };
    },
    screenToWorld(sx, sy) {
      const C = AB.CONFIG;
      return { x: sx / C.PPM, y: (C.GROUND_SCREEN_Y - sy) / C.PPM };
    },
  };

  // 결정적 난수(mulberry32) — 균열·돌 무늬처럼 매 프레임 같은 모양이 필요할 때 사용
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function formatNumber(n) {
    const v = Math.round(Number(n) || 0);
    const sign = v < 0 ? '-' : '';
    return sign + String(Math.abs(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  AB.V = V;
  AB.clamp = clamp;
  AB.Coord = Coord;
  AB.makeRng = makeRng;
  AB.Util = { formatNumber: formatNumber, clamp: clamp };
})();
