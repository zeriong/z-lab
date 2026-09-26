/*
 * stages.js — 바닥기준(bottom-anchored) 빌더(§11.2)와 스테이지 10종(§11.4)
 * 노출: window.SB (빌더), window.STAGES (10개 배열)
 * 참조 전역: MAT (C — 사용하지 않음)
 *
 * 빌더는 물리 바디를 직접 만들지 않는다. 대신 SB.begin(world) 로 지정한 월드의
 * world.spawn 배열에 '생성 명세'를 쌓고, GAME.loadStage 가 그것을 P.addBox / P.addCircle 로 만든다.
 *
 * 모든 조각은 바닥 y(base) 로 기술한다.
 *   V(cx, base, mat)            세로기둥 24x110   중심 (cx, base-55)    윗면 base-110
 *   H(cx, base, len, mat)       가로판 len x 24   중심 (cx, base-12)    윗면 base-24
 *   BLK(cx, base, w, h, mat)    임의 박스         중심 (cx, base-h/2)   윗면 base-h
 *   HUT(cx, base, mat, span)    V(cx-span/2) + V(cx+span/2) + H(cx, base-110, span+48)  윗면 base-134
 *   PIG(cx, base, r=20)         돼지 원           중심 (cx, base-r)
 * 층별 base: 1층 620 -> 2층 486 -> 3층 352 -> 4층 218 (오두막 높이 134)
 */
(function () {
  'use strict';

  var PILLAR_W = 24;
  var PILLAR_H = 110;
  var PLANK_T = 24;
  var HUT_SPAN = 110;
  var ROOF_EXTRA = 48;
  var PIG_R = 20;

  var target = null;   // SB.begin(world) 로 지정된 월드

  function emit(spec) {
    if (!target) throw new Error('SB.begin(world) 를 먼저 호출해야 합니다');
    target.spawn.push(spec);
    return spec;
  }

  function material(mat) {
    var m = MAT[mat];
    if (!m) throw new Error('알 수 없는 재질: ' + mat);
    return m;
  }

  function boxSpec(cx, cy, w, h, mat) {
    var m = material(mat);
    return emit({
      shape: 'box',
      x: cx,
      y: cy,
      hw: w / 2,
      hh: h / 2,
      density: m.density,
      e: m.e,
      mu: m.mu,
      hp: m.hp,
      kind: 'block',
      mat: mat,
      isStatic: false
    });
  }

  var SB = {
    begin: function (world) {
      target = world;
      if (!world.spawn) world.spawn = [];
    },

    V: function (cx, base, mat) {
      return boxSpec(cx, base - PILLAR_H / 2, PILLAR_W, PILLAR_H, mat);
    },

    H: function (cx, base, len, mat) {
      return boxSpec(cx, base - PLANK_T / 2, len, PLANK_T, mat);
    },

    BLK: function (cx, base, w, h, mat) {
      return boxSpec(cx, base - h / 2, w, h, mat);
    },

    HUT: function (cx, base, mat, span) {
      if (span == null) span = HUT_SPAN;
      SB.V(cx - span / 2, base, mat);
      SB.V(cx + span / 2, base, mat);
      SB.H(cx, base - PILLAR_H, span + ROOF_EXTRA, mat);
    },

    PIG: function (cx, base, r) {
      if (r == null) r = PIG_R;
      var m = material('pig');
      return emit({
        shape: 'circle',
        x: cx,
        y: base - r,
        r: r,
        density: m.density,
        e: m.e,
        mu: m.mu,
        hp: m.hp,
        kind: 'pig',
        mat: 'pig',
        isStatic: false
      });
    }
  };

  // 새 배열 = 발사 순서. build(w) 는 월드를 받아 빌더를 표 순서대로 호출한다.
  var STAGES = [
    {
      id: 1,
      name: '첫 발사',
      birds: ['red', 'red', 'red'],
      build: function (w) {
        SB.begin(w);
        SB.HUT(1150, 620, 'wood');
        SB.PIG(1150, 620);
      }
    },
    {
      id: 2,
      name: '이층집',
      birds: ['red', 'red', 'red'],
      build: function (w) {
        SB.begin(w);
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
      build: function (w) {
        SB.begin(w);
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
      build: function (w) {
        SB.begin(w);
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
      build: function (w) {
        SB.begin(w);
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
      build: function (w) {
        SB.begin(w);
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
      build: function (w) {
        SB.begin(w);
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
      build: function (w) {
        SB.begin(w);
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
      build: function (w) {
        SB.begin(w);
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
      build: function (w) {
        SB.begin(w);
        SB.HUT(950, 620, 'stone');
        SB.HUT(1250, 620, 'stone');
        SB.HUT(1550, 620, 'stone');
        // [플랜 수치 보정] 표의 원래 값은 H(1100,486,340) / H(1400,486,340) 이다.
        // 그대로 두면 두 판이 x 1230~1270 에서 같은 층끼리 40px 겹쳐 §11.3 규칙 4를 어기고,
        // 박스-박스 판정(ox=40 > oy=24)이 두 판을 세로로 24px 밀어내 로드 직후 구조물이 튄다.
        // 중심 x 는 그대로 두고 길이만 300 으로 줄여 x 950~1250 / 1250~1550 로 맞닿게 했다.
        // (지지: 지붕 871~1029·1171~1329 / 1171~1329·1471~1629 위, 상단 오두막 기둥 1195·1305 는 각 판 위)
        SB.H(1100, 486, 300, 'stone');
        SB.H(1400, 486, 300, 'stone');
        SB.HUT(1250, 462, 'wood');
        SB.PIG(950, 620);
        SB.PIG(1250, 620);
        SB.PIG(1550, 620);
        SB.PIG(1250, 462);
        SB.PIG(1250, 328);
      }
    }
  ];

  window.SB = SB;
  window.STAGES = STAGES;
})();
