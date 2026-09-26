// stages.js — §11 바닥기준(bottom-anchored) 빌더 SB + 스테이지 10개 STAGES
// 참조 전역: C, MAT (P 는 함수 본문 안에서만 참조)
(function () {
  'use strict';

  var cur = null;   // SB.use(world) 로 지정된 현재 월드

  function block(cx, base, w, h, mat) {
    var m = MAT[mat];
    return P.addBox(cur, {
      x: cx,
      y: base - h / 2,
      hw: w / 2,
      hh: h / 2,
      mat: mat,
      kind: 'block',
      density: m.density,
      hp: m.hp,
      e: m.e,
      mu: m.mu
    });
  }

  var SB = {
    use: function (world) { cur = world; },

    // 세로기둥 24×110, 중심 (cx, base-55)
    V: function (cx, base, mat) {
      return block(cx, base, 24, 110, mat);
    },

    // 가로판 len×24, 중심 (cx, base-12)
    H: function (cx, base, len, mat) {
      return block(cx, base, len, 24, mat);
    },

    // 임의 박스, 중심 (cx, base-h/2)
    BLK: function (cx, base, w, h, mat) {
      return block(cx, base, w, h, mat);
    },

    // 오두막 3조각: 기둥 2 + 지붕 1. 총 높이 134
    HUT: function (cx, base, mat, span) {
      if (span === undefined) span = 110;
      SB.V(cx - span / 2, base, mat);
      SB.V(cx + span / 2, base, mat);
      SB.H(cx, base - 110, span + 48, mat);
    },

    // 돼지 원, 중심 (cx, base-r)
    PIG: function (cx, base, r) {
      if (r === undefined) r = 20;
      var m = MAT.pig;
      return P.addCircle(cur, {
        x: cx,
        y: base - r,
        r: r,
        mat: 'pig',
        kind: 'pig',
        density: m.density,
        hp: m.hp,
        e: m.e,
        mu: m.mu
      });
    }
  };

  var STAGES = [
    {
      id: 1, name: '첫 발사', birds: ['red', 'red', 'red'],
      build: function (w) {
        SB.use(w);
        SB.HUT(1150, 620, 'wood');
        SB.PIG(1150, 620);
      }
    },
    {
      id: 2, name: '이층집', birds: ['red', 'red', 'red'],
      build: function (w) {
        SB.use(w);
        SB.HUT(1150, 620, 'wood');
        SB.HUT(1150, 486, 'wood');
        SB.PIG(1150, 620);
        SB.PIG(1150, 486);
      }
    },
    {
      id: 3, name: '쌍둥이', birds: ['red', 'yellow', 'red'],
      build: function (w) {
        SB.use(w);
        SB.HUT(1000, 620, 'wood');
        SB.HUT(1320, 620, 'wood');
        SB.PIG(1000, 620);
        SB.PIG(1320, 620);
      }
    },
    {
      id: 4, name: '유리 지붕', birds: ['red', 'red', 'yellow'],
      build: function (w) {
        SB.use(w);
        SB.HUT(1100, 620, 'glass');
        SB.HUT(1400, 620, 'glass');
        SB.H(1250, 486, 340, 'wood');
        SB.PIG(1100, 620);
        SB.PIG(1400, 620);
      }
    },
    {
      id: 5, name: '돌 오두막', birds: ['red', 'yellow', 'black'],
      build: function (w) {
        SB.use(w);
        SB.HUT(1200, 620, 'stone');
        SB.HUT(1200, 486, 'wood');
        SB.PIG(1200, 620);
        SB.PIG(1200, 486);
      }
    },
    {
      id: 6, name: '삼각 마을', birds: ['red', 'yellow', 'yellow', 'red'],
      build: function (w) {
        SB.use(w);
        SB.HUT(980, 620, 'wood');
        SB.HUT(1240, 620, 'stone');
        SB.HUT(1500, 620, 'wood');
        SB.PIG(980, 620);
        SB.PIG(1240, 620);
        SB.PIG(1500, 620);
      }
    },
    {
      id: 7, name: '탑', birds: ['red', 'yellow', 'black', 'red'],
      build: function (w) {
        SB.use(w);
        SB.HUT(1250, 620, 'stone');
        SB.HUT(1250, 486, 'stone');
        SB.HUT(1250, 352, 'wood');
        SB.PIG(1080, 620);
        SB.PIG(1250, 486);
        SB.PIG(1250, 352);
      }
    },
    {
      id: 8, name: '유리 성', birds: ['red', 'red', 'yellow', 'black'],
      build: function (w) {
        SB.use(w);
        SB.HUT(1050, 620, 'glass');
        SB.HUT(1350, 620, 'glass');
        SB.H(1200, 486, 420, 'stone');
        SB.PIG(1050, 620);
        SB.PIG(1350, 620);
        SB.PIG(1200, 462);
      }
    },
    {
      id: 9, name: '요새', birds: ['red', 'yellow', 'black', 'yellow', 'red'],
      build: function (w) {
        SB.use(w);
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
      id: 10, name: '최종 요새', birds: ['red', 'yellow', 'black', 'yellow', 'black'],
      build: function (w) {
        SB.use(w);
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

  window.SB = SB;
  window.STAGES = STAGES;
})();
