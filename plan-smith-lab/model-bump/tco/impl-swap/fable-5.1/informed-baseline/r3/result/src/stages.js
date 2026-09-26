/* stages.js — §11 빌더(SB) + 스테이지 10종(STAGES). 참조 전역: C, MAT
 *
 * 빌더는 바디를 직접 만들지 않고 "배치 기술자(descriptor)"를 반환한다.
 * 각 스테이지의 build(world) 는 SB.add(world, desc) 로 world.spawn 에 기술자를 쌓고,
 * GAME.loadStage 가 world.spawn 을 읽어 P.addBox / P.addCircle 로 실제 바디를 만든다.
 *
 * 기술자 형태:
 *   박스 { shape:'box',    kind:'block', x, y, hw, hh, mat }
 *   원   { shape:'circle', kind:'pig',   x, y, r,      mat:'pig' }
 * 모든 조각은 바닥 y(base) 로 기술하고 여기서 중심 좌표로 변환한다 (§11.2).
 */
var SB = (function () {
  'use strict';

  var COL_W = 24;      /* 세로기둥 폭 */
  var COL_H = 110;     /* 세로기둥 높이 */
  var PLANK_H = 24;    /* 가로판 높이 */
  var HUT_SPAN = 110;  /* 오두막 기둥 간격 기본값 */
  var ROOF_EXTRA = 48; /* 지붕 = span + 48 */
  var PIG_R = 20;      /* 돼지 기본 반지름 */

  function box(cx, cy, w, h, mat) {
    return { shape: 'box', kind: 'block', x: cx, y: cy, hw: w / 2, hh: h / 2, mat: mat };
  }

  /* 세로기둥 24×110, 중심 (cx, base-55), 윗면 base-110 */
  function V(cx, base, mat) {
    return box(cx, base - COL_H / 2, COL_W, COL_H, mat);
  }

  /* 가로판 len×24, 중심 (cx, base-12), 윗면 base-24 */
  function H(cx, base, len, mat) {
    return box(cx, base - PLANK_H / 2, len, PLANK_H, mat);
  }

  /* 임의 박스, 중심 (cx, base-h/2), 윗면 base-h */
  function BLK(cx, base, w, h, mat) {
    return box(cx, base - h / 2, w, h, mat);
  }

  /* 오두막 3조각: 기둥 2 + 지붕. 총 높이 134, 윗면 base-134 */
  function HUT(cx, base, mat, span) {
    span = span || HUT_SPAN;
    return [
      V(cx - span / 2, base, mat),
      V(cx + span / 2, base, mat),
      H(cx, base - COL_H, span + ROOF_EXTRA, mat)
    ];
  }

  /* 돼지 원, 중심 (cx, base-r) */
  function PIG(cx, base, r) {
    r = r || PIG_R;
    return { shape: 'circle', kind: 'pig', x: cx, y: base - r, r: r, mat: 'pig' };
  }

  /* 기술자(또는 기술자 배열)를 world.spawn 에 적재 */
  function add(world, item) {
    if (!world.spawn) world.spawn = [];
    if (Object.prototype.toString.call(item) === '[object Array]') {
      for (var i = 0; i < item.length; i++) world.spawn.push(item[i]);
    } else {
      world.spawn.push(item);
    }
  }

  return { V: V, H: H, BLK: BLK, HUT: HUT, PIG: PIG, add: add };
})();

/* §11.4 확정 데이터. 새 배열은 발사 순서. 층별 base: 620 → 486 → 352 → 218 */
var STAGES = [
  {
    id: 1, name: '첫 발사', birds: ['red', 'red', 'red'],
    build: function (w) {
      SB.add(w, SB.HUT(1150, 620, 'wood'));
      SB.add(w, SB.PIG(1150, 620));
    }
  },
  {
    id: 2, name: '이층집', birds: ['red', 'red', 'red'],
    build: function (w) {
      SB.add(w, SB.HUT(1150, 620, 'wood'));
      SB.add(w, SB.HUT(1150, 486, 'wood'));
      SB.add(w, SB.PIG(1150, 620));
      SB.add(w, SB.PIG(1150, 486));
    }
  },
  {
    id: 3, name: '쌍둥이', birds: ['red', 'yellow', 'red'],
    build: function (w) {
      SB.add(w, SB.HUT(1000, 620, 'wood'));
      SB.add(w, SB.HUT(1320, 620, 'wood'));
      SB.add(w, SB.PIG(1000, 620));
      SB.add(w, SB.PIG(1320, 620));
    }
  },
  {
    id: 4, name: '유리 지붕', birds: ['red', 'red', 'yellow'],
    build: function (w) {
      SB.add(w, SB.HUT(1100, 620, 'glass'));
      SB.add(w, SB.HUT(1400, 620, 'glass'));
      SB.add(w, SB.H(1250, 486, 340, 'wood'));
      SB.add(w, SB.PIG(1100, 620));
      SB.add(w, SB.PIG(1400, 620));
    }
  },
  {
    id: 5, name: '돌 오두막', birds: ['red', 'yellow', 'black'],
    build: function (w) {
      SB.add(w, SB.HUT(1200, 620, 'stone'));
      SB.add(w, SB.HUT(1200, 486, 'wood'));
      SB.add(w, SB.PIG(1200, 620));
      SB.add(w, SB.PIG(1200, 486));
    }
  },
  {
    id: 6, name: '삼각 마을', birds: ['red', 'yellow', 'yellow', 'red'],
    build: function (w) {
      SB.add(w, SB.HUT(980, 620, 'wood'));
      SB.add(w, SB.HUT(1240, 620, 'stone'));
      SB.add(w, SB.HUT(1500, 620, 'wood'));
      SB.add(w, SB.PIG(980, 620));
      SB.add(w, SB.PIG(1240, 620));
      SB.add(w, SB.PIG(1500, 620));
    }
  },
  {
    id: 7, name: '탑', birds: ['red', 'yellow', 'black', 'red'],
    build: function (w) {
      SB.add(w, SB.HUT(1250, 620, 'stone'));
      SB.add(w, SB.HUT(1250, 486, 'stone'));
      SB.add(w, SB.HUT(1250, 352, 'wood'));
      SB.add(w, SB.PIG(1080, 620));
      SB.add(w, SB.PIG(1250, 486));
      SB.add(w, SB.PIG(1250, 352));
    }
  },
  {
    id: 8, name: '유리 성', birds: ['red', 'red', 'yellow', 'black'],
    build: function (w) {
      SB.add(w, SB.HUT(1050, 620, 'glass'));
      SB.add(w, SB.HUT(1350, 620, 'glass'));
      SB.add(w, SB.H(1200, 486, 420, 'stone'));
      SB.add(w, SB.PIG(1050, 620));
      SB.add(w, SB.PIG(1350, 620));
      SB.add(w, SB.PIG(1200, 462));
    }
  },
  {
    id: 9, name: '요새', birds: ['red', 'yellow', 'black', 'yellow', 'red'],
    build: function (w) {
      SB.add(w, SB.HUT(1000, 620, 'stone'));
      SB.add(w, SB.HUT(1300, 620, 'stone'));
      SB.add(w, SB.H(1150, 486, 420, 'stone'));
      SB.add(w, SB.HUT(1150, 462, 'wood'));
      SB.add(w, SB.HUT(1620, 620, 'wood'));
      SB.add(w, SB.PIG(1000, 620));
      SB.add(w, SB.PIG(1300, 620));
      SB.add(w, SB.PIG(1150, 462));
      SB.add(w, SB.PIG(1620, 620));
      SB.add(w, SB.PIG(1150, 328));
    }
  },
  {
    id: 10, name: '최종 요새', birds: ['red', 'yellow', 'black', 'yellow', 'black'],
    build: function (w) {
      SB.add(w, SB.HUT(950, 620, 'stone'));
      SB.add(w, SB.HUT(1250, 620, 'stone'));
      SB.add(w, SB.HUT(1550, 620, 'stone'));
      SB.add(w, SB.H(1100, 486, 340, 'stone'));
      SB.add(w, SB.H(1400, 486, 340, 'stone'));
      SB.add(w, SB.HUT(1250, 462, 'wood'));
      SB.add(w, SB.PIG(950, 620));
      SB.add(w, SB.PIG(1250, 620));
      SB.add(w, SB.PIG(1550, 620));
      SB.add(w, SB.PIG(1250, 462));
      SB.add(w, SB.PIG(1250, 328));
    }
  }
];
