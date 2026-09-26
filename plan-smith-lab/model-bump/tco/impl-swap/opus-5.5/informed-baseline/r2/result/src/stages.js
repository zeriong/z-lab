/*
 * stages.js — 바닥기준 빌더(§11.2)와 스테이지 10종(§11.4)
 * 노출: window.SB, window.STAGES
 * 참조: MAT (함수 본문 안에서만)
 *
 * 빌더는 물리 바디를 직접 만들지 않고 "스폰 기술자"를 만든다.
 *   { type: 'box', x, y, hw, hh, mat }   (x, y = 중심)
 *   { type: 'pig', x, y, r, mat: 'pig' }
 * stage.build(world) 가 기술자 배열을 돌려주면 GAME.loadStage 가 P.addBox / P.addCircle 로 생성한다.
 * (stages.js 의 참조 가능 전역이 C, MAT 뿐이므로 P 를 직접 부르지 않는다.)
 */
(function () {
  'use strict';

  var PILLAR_W = 24;       // 세로기둥 24 x 110
  var PILLAR_H = 110;
  var PLANK_H = 24;        // 가로판 len x 24
  var HUT_SPAN = 110;      // 오두막 기본 기둥 간격
  var HUT_ROOF_EXTRA = 48; // 지붕 길이 = span + 48
  var PIG_R = 20;

  var sink = null;         // collect() 실행 중에만 설정되는 출력 배열

  function emit(d) {
    if (sink) sink.push(d);
    return d;
  }

  function checkMat(mat) {
    if (!MAT[mat]) throw new Error('stages.js: unknown material "' + mat + '"');
    return mat;
  }

  function box(cx, cy, w, h, mat) {
    return emit({ type: 'box', x: cx, y: cy, hw: w / 2, hh: h / 2, mat: checkMat(mat) });
  }

  var SB = {
    // 세로기둥: 중심 (cx, base-55), 점유 y base-110 ~ base, 윗면 base-110
    V: function (cx, base, mat) {
      return box(cx, base - PILLAR_H / 2, PILLAR_W, PILLAR_H, mat);
    },
    // 가로판: 중심 (cx, base-12), 점유 y base-24 ~ base, 윗면 base-24
    H: function (cx, base, len, mat) {
      return box(cx, base - PLANK_H / 2, len, PLANK_H, mat);
    },
    // 임의 박스: 중심 (cx, base-h/2)
    BLK: function (cx, base, w, h, mat) {
      return box(cx, base - h / 2, w, h, mat);
    },
    // 오두막 3조각: 기둥 2 + 지붕. 총 높이 134, 윗면 base-134
    HUT: function (cx, base, mat, span) {
      var s = (typeof span === 'number') ? span : HUT_SPAN;
      return [
        SB.V(cx - s / 2, base, mat),
        SB.V(cx + s / 2, base, mat),
        SB.H(cx, base - PILLAR_H, s + HUT_ROOF_EXTRA, mat)
      ];
    },
    // 돼지: 중심 (cx, base-r)
    PIG: function (cx, base, r) {
      var rr = (typeof r === 'number') ? r : PIG_R;
      return emit({ type: 'pig', x: cx, y: base - rr, r: rr, mat: 'pig' });
    },
    // layout 함수 안에서 호출된 빌더 결과를 순서대로 모아 반환
    collect: function (layout) {
      var prev = sink;
      var list = [];
      sink = list;
      try {
        layout();
      } finally {
        sink = prev;
      }
      return list;
    }
  };

  // { id, name, birds, build } (§11.5). 지면 바디는 loadStage 가 공통으로 먼저 추가한다.
  function stage(id, name, birds, layout) {
    return {
      id: id,
      name: name,
      birds: birds,
      build: function (world) {
        // world 는 계약상 전달받지만, 바디 생성은 loadStage 가 기술자로 수행한다.
        return SB.collect(layout);
      }
    };
  }

  window.SB = SB;

  window.STAGES = [
    stage(1, '첫 발사', ['red', 'red', 'red'], function () {
      SB.HUT(1150, 620, 'wood');
      SB.PIG(1150, 620);
    }),

    stage(2, '이층집', ['red', 'red', 'red'], function () {
      SB.HUT(1150, 620, 'wood');
      SB.HUT(1150, 486, 'wood');
      SB.PIG(1150, 620);
      SB.PIG(1150, 486);
    }),

    stage(3, '쌍둥이', ['red', 'yellow', 'red'], function () {
      SB.HUT(1000, 620, 'wood');
      SB.HUT(1320, 620, 'wood');
      SB.PIG(1000, 620);
      SB.PIG(1320, 620);
    }),

    stage(4, '유리 지붕', ['red', 'red', 'yellow'], function () {
      SB.HUT(1100, 620, 'glass');
      SB.HUT(1400, 620, 'glass');
      SB.H(1250, 486, 340, 'wood');
      SB.PIG(1100, 620);
      SB.PIG(1400, 620);
    }),

    stage(5, '돌 오두막', ['red', 'yellow', 'black'], function () {
      SB.HUT(1200, 620, 'stone');
      SB.HUT(1200, 486, 'wood');
      SB.PIG(1200, 620);
      SB.PIG(1200, 486);
    }),

    stage(6, '삼각 마을', ['red', 'yellow', 'yellow', 'red'], function () {
      SB.HUT(980, 620, 'wood');
      SB.HUT(1240, 620, 'stone');
      SB.HUT(1500, 620, 'wood');
      SB.PIG(980, 620);
      SB.PIG(1240, 620);
      SB.PIG(1500, 620);
    }),

    stage(7, '탑', ['red', 'yellow', 'black', 'red'], function () {
      SB.HUT(1250, 620, 'stone');
      SB.HUT(1250, 486, 'stone');
      SB.HUT(1250, 352, 'wood');
      SB.PIG(1080, 620);
      SB.PIG(1250, 486);
      SB.PIG(1250, 352);
    }),

    stage(8, '유리 성', ['red', 'red', 'yellow', 'black'], function () {
      SB.HUT(1050, 620, 'glass');
      SB.HUT(1350, 620, 'glass');
      SB.H(1200, 486, 420, 'stone');
      SB.PIG(1050, 620);
      SB.PIG(1350, 620);
      SB.PIG(1200, 462);
    }),

    stage(9, '요새', ['red', 'yellow', 'black', 'yellow', 'red'], function () {
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
    }),

    stage(10, '최종 요새', ['red', 'yellow', 'black', 'yellow', 'black'], function () {
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
    })
  ];
})();
