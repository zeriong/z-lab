/*
 * src/stages.js — 바닥기준(bottom-anchored) 빌더 (§11.2) + 스테이지 10종 (§11.4)
 * 노출: SB, STAGES
 * 참조 전역: MAT (함수 본문 안에서만)
 *
 * 빌더는 물리 바디를 직접 만들지 않고 "조각 기술자(descriptor)"를 낸다.
 *   박스: { shape:'box', kind:'block', mat, x, y, hw, hh }   (x, y = 중심)
 *   돼지: { shape:'circle', kind:'pig', mat:'pig', x, y, r }
 * GAME.loadStage 가 SB.begin() → stage.build(world) → SB.end() 로 기술자를 모아
 * P.addBox / P.addCircle 로 월드에 배치한다. (지면 바디는 loadStage 가 먼저 추가)
 */
(function () {
  'use strict';

  var PILLAR_W = 24;
  var PILLAR_H = 110;
  var PLANK_H = 24;
  var HUT_SPAN = 110;
  var PIG_R = 20;

  var buf = null;

  function emit(d) {
    if (buf) buf.push(d);
    return d;
  }

  function box(cx, cy, w, h, mat) {
    if (!MAT[mat]) mat = 'wood';
    return emit({ shape: 'box', kind: 'block', mat: mat, x: cx, y: cy, hw: w / 2, hh: h / 2 });
  }

  var SB = {
    // 수집 시작 / 종료 (종료 시 모인 기술자 배열 반환)
    begin: function () {
      buf = [];
    },
    end: function () {
      var out = buf || [];
      buf = null;
      return out;
    },

    // 세로기둥 24×110 — 중심 (cx, base-55), 윗면 base-110
    V: function (cx, base, mat) {
      return box(cx, base - PILLAR_H / 2, PILLAR_W, PILLAR_H, mat);
    },

    // 가로판 len×24 — 중심 (cx, base-12), 윗면 base-24
    H: function (cx, base, len, mat) {
      return box(cx, base - PLANK_H / 2, len, PLANK_H, mat);
    },

    // 임의 박스 w×h — 중심 (cx, base-h/2), 윗면 base-h
    BLK: function (cx, base, w, h, mat) {
      return box(cx, base - h / 2, w, h, mat);
    },

    // 오두막 3조각 — 총 높이 134, 윗면 base-134, 지붕 x 범위 cx ± (span+48)/2
    HUT: function (cx, base, mat, span) {
      if (typeof span !== 'number') span = HUT_SPAN;
      return [
        SB.V(cx - span / 2, base, mat),
        SB.V(cx + span / 2, base, mat),
        SB.H(cx, base - PILLAR_H, span + 48, mat)
      ];
    },

    // 돼지 원 — 중심 (cx, base-r)
    PIG: function (cx, base, r) {
      if (typeof r !== 'number') r = PIG_R;
      return emit({ shape: 'circle', kind: 'pig', mat: 'pig', x: cx, y: base - r, r: r });
    }
  };

  window.SB = SB;

  // 층별 base: 1층 620 → 2층 486 → 3층 352 → 4층 218
  window.STAGES = [
    {
      id: 1,
      name: '첫 발사',
      birds: ['red', 'red', 'red'],
      build: function (world) {
        SB.HUT(1150, 620, 'wood');
        SB.PIG(1150, 620);
      }
    },
    {
      id: 2,
      name: '이층집',
      birds: ['red', 'red', 'red'],
      build: function (world) {
        SB.HUT(1150, 620, 'wood');
        SB.HUT(1150, 486, 'wood');
        SB.PIG(1150, 620);
        SB.PIG(1150, 486);
      }
    },
    {
      id: 3,
      name: '쌍둥이',
      birds: ['red', 'yellow', 'red'],
      build: function (world) {
        SB.HUT(1000, 620, 'wood');
        SB.HUT(1320, 620, 'wood');
        SB.PIG(1000, 620);
        SB.PIG(1320, 620);
      }
    },
    {
      id: 4,
      name: '유리 지붕',
      birds: ['red', 'red', 'yellow'],
      build: function (world) {
        SB.HUT(1100, 620, 'glass');
        SB.HUT(1400, 620, 'glass');
        SB.H(1250, 486, 340, 'wood');
        SB.PIG(1100, 620);
        SB.PIG(1400, 620);
      }
    },
    {
      id: 5,
      name: '돌 오두막',
      birds: ['red', 'yellow', 'black'],
      build: function (world) {
        SB.HUT(1200, 620, 'stone');
        SB.HUT(1200, 486, 'wood');
        SB.PIG(1200, 620);
        SB.PIG(1200, 486);
      }
    },
    {
      id: 6,
      name: '삼각 마을',
      birds: ['red', 'yellow', 'yellow', 'red'],
      build: function (world) {
        SB.HUT(980, 620, 'wood');
        SB.HUT(1240, 620, 'stone');
        SB.HUT(1500, 620, 'wood');
        SB.PIG(980, 620);
        SB.PIG(1240, 620);
        SB.PIG(1500, 620);
      }
    },
    {
      id: 7,
      name: '탑',
      birds: ['red', 'yellow', 'black', 'red'],
      build: function (world) {
        SB.HUT(1250, 620, 'stone');
        SB.HUT(1250, 486, 'stone');
        SB.HUT(1250, 352, 'wood');
        SB.PIG(1080, 620);
        SB.PIG(1250, 486);
        SB.PIG(1250, 352);
      }
    },
    {
      id: 8,
      name: '유리 성',
      birds: ['red', 'red', 'yellow', 'black'],
      build: function (world) {
        SB.HUT(1050, 620, 'glass');
        SB.HUT(1350, 620, 'glass');
        SB.H(1200, 486, 420, 'stone');
        SB.PIG(1050, 620);
        SB.PIG(1350, 620);
        SB.PIG(1200, 462);
      }
    },
    {
      id: 9,
      name: '요새',
      birds: ['red', 'yellow', 'black', 'yellow', 'red'],
      build: function (world) {
        SB.HUT(1000, 620, 'stone');
        SB.HUT(1300, 620, 'stone');
        SB.H(1150, 486, 420, 'stone');
        SB.HUT(1150, 462, 'wood');
        SB.HUT(1620, 620, 'wood');
        SB.PIG(1000, 620);
        SB.PIG(1300, 620);
        SB.PIG(1150, 462);
        SB.PIG(1620, 620);
        SB.PIG(1150, 328);
      }
    },
    {
      id: 10,
      name: '최종 요새',
      birds: ['red', 'yellow', 'black', 'yellow', 'black'],
      build: function (world) {
        SB.HUT(950, 620, 'stone');
        SB.HUT(1250, 620, 'stone');
        SB.HUT(1550, 620, 'stone');
        SB.H(1100, 486, 340, 'stone');
        SB.H(1400, 486, 340, 'stone');
        SB.HUT(1250, 462, 'wood');
        SB.PIG(950, 620);
        SB.PIG(1250, 620);
        SB.PIG(1550, 620);
        SB.PIG(1250, 462);
        SB.PIG(1250, 328);
      }
    }
  ];
})();
