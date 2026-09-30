// stages.js — 10개 스테이지 데이터 (plan §10)
// x = 중심 x, b = 바닥면 y. 로더가 중심 y를 계산한다 (블록 b + h/2, 돼지 b + r).
// statics: { x, b, w, h } (정적 바위), blocks: { m: 재질, s: 크기 코드, x, b }, pigs: { s: S|M|L, x, b, king? }
(function () {
  'use strict';
  const AB = (window.AB = window.AB || {});

  AB.STAGES = [
    // 1. 첫 비행
    {
      name: '첫 비행',
      birds: ['red', 'red', 'red'],
      statics: [],
      blocks: [
        { m: 'wood', s: 'P2', x: 20, b: 0 },
        { m: 'wood', s: 'P2', x: 22, b: 0 },
        { m: 'wood', s: 'B3', x: 21, b: 2.0 },
      ],
      pigs: [
        { s: 'M', x: 21, b: 0 },
        { s: 'S', x: 21, b: 2.3 },
      ],
    },

    // 2. 유리 조심
    {
      name: '유리 조심',
      birds: ['red', 'red', 'red'],
      statics: [],
      blocks: [
        { m: 'glass', s: 'P2', x: 18, b: 0 },
        { m: 'glass', s: 'P2', x: 20, b: 0 },
        { m: 'wood', s: 'B3', x: 19, b: 2.0 },
        { m: 'glass', s: 'P2', x: 24, b: 0 },
        { m: 'glass', s: 'P2', x: 26, b: 0 },
        { m: 'wood', s: 'B3', x: 25, b: 2.0 },
      ],
      pigs: [
        { s: 'S', x: 19, b: 0 },
        { s: 'S', x: 19, b: 2.3 },
        { s: 'M', x: 25, b: 2.3 },
      ],
    },

    // 3. 파랑 새 등장
    {
      name: '파랑 새 등장',
      birds: ['blue', 'blue', 'red'],
      statics: [],
      blocks: [
        { m: 'glass', s: 'P2', x: 20, b: 0 },
        { m: 'glass', s: 'P2', x: 22, b: 0 },
        { m: 'wood', s: 'B3', x: 21, b: 2.0 },
        { m: 'glass', s: 'P1', x: 20, b: 2.3 },
        { m: 'glass', s: 'P1', x: 22, b: 2.3 },
        { m: 'wood', s: 'B3', x: 21, b: 3.5 },
        { m: 'glass', s: 'C06', x: 24.5, b: 0 },
      ],
      pigs: [
        { s: 'M', x: 21, b: 0 },
        { s: 'S', x: 21, b: 2.3 },
        { s: 'S', x: 21, b: 3.8 },
        { s: 'S', x: 24.5, b: 0.6 },
      ],
    },

    // 4. 노랑 새 등장
    {
      name: '노랑 새 등장',
      birds: ['yellow', 'yellow', 'red'],
      statics: [],
      blocks: [
        { m: 'wood', s: 'C1', x: 17.5, b: 0 },
        { m: 'wood', s: 'C1', x: 17.5, b: 1.0 },
        { m: 'wood', s: 'P2', x: 19.8, b: 0 },
        { m: 'wood', s: 'P2', x: 22.2, b: 0 },
        { m: 'wood', s: 'B3', x: 21, b: 2.0 },
        { m: 'wood', s: 'P2', x: 19.8, b: 2.3 },
        { m: 'wood', s: 'P2', x: 22.2, b: 2.3 },
        { m: 'wood', s: 'B3', x: 21, b: 4.3 },
      ],
      pigs: [
        { s: 'M', x: 21, b: 0 },
        { s: 'M', x: 21, b: 2.3 },
        { s: 'S', x: 21, b: 4.6 },
      ],
    },

    // 5. 쌍둥이 언덕
    {
      name: '쌍둥이 언덕',
      birds: ['red', 'blue', 'yellow', 'red'],
      statics: [
        { x: 19, b: 0, w: 3, h: 1.5 },
        { x: 26, b: 0, w: 3, h: 3.0 },
      ],
      blocks: [
        { m: 'glass', s: 'P2', x: 18.2, b: 1.5 },
        { m: 'glass', s: 'P2', x: 19.8, b: 1.5 },
        { m: 'wood', s: 'B2', x: 19, b: 3.5 },
        { m: 'wood', s: 'P2', x: 25.2, b: 3.0 },
        { m: 'wood', s: 'P2', x: 26.8, b: 3.0 },
        { m: 'glass', s: 'B2', x: 26, b: 5.0 },
      ],
      pigs: [
        { s: 'S', x: 19, b: 1.5 },
        { s: 'M', x: 19, b: 3.8 },
        { s: 'M', x: 26, b: 3.0 },
        { s: 'S', x: 26, b: 5.3 },
      ],
    },

    // 6. 돌 요새
    {
      name: '돌 요새',
      birds: ['black', 'red', 'black', 'red'],
      statics: [],
      blocks: [
        { m: 'stone', s: 'P2', x: 19.8, b: 0 },
        { m: 'stone', s: 'P2', x: 22.2, b: 0 },
        { m: 'stone', s: 'B3', x: 21, b: 2.0 },
        { m: 'wood', s: 'C1', x: 19.9, b: 2.3 },
        { m: 'wood', s: 'C1', x: 22.1, b: 2.3 },
        { m: 'stone', s: 'B3', x: 21, b: 3.3 },
        { m: 'stone', s: 'C1', x: 26, b: 0 },
        { m: 'stone', s: 'C1', x: 26, b: 1.0 },
      ],
      pigs: [
        { s: 'L', x: 21, b: 0 },
        { s: 'S', x: 21, b: 2.3 },
        { s: 'M', x: 21, b: 3.6 },
        { s: 'M', x: 26, b: 2.0 },
      ],
    },

    // 7. TNT 창고
    {
      name: 'TNT 창고',
      birds: ['red', 'yellow', 'red'],
      statics: [],
      blocks: [
        { m: 'wood', s: 'P2', x: 19.8, b: 0 },
        { m: 'wood', s: 'P2', x: 22.2, b: 0 },
        { m: 'tnt', s: 'TNT', x: 21, b: 0 },
        { m: 'stone', s: 'B3', x: 21, b: 2.0 },
        { m: 'glass', s: 'P1', x: 20, b: 2.3 },
        { m: 'glass', s: 'P1', x: 22, b: 2.3 },
        { m: 'wood', s: 'B3', x: 21, b: 3.5 },
        { m: 'tnt', s: 'TNT', x: 25, b: 0 },
        { m: 'wood', s: 'C1', x: 26.2, b: 0 },
      ],
      pigs: [
        { s: 'S', x: 21, b: 0.8 },
        { s: 'M', x: 21, b: 2.3 },
        { s: 'S', x: 21, b: 3.8 },
        { s: 'M', x: 26.2, b: 1.0 },
      ],
    },

    // 8. 얼음 궁전
    {
      name: '얼음 궁전',
      birds: ['blue', 'blue', 'yellow', 'black'],
      statics: [],
      blocks: [
        { m: 'glass', s: 'P2', x: 18.8, b: 0 },
        { m: 'glass', s: 'P2', x: 21.2, b: 0 },
        { m: 'wood', s: 'B3', x: 20, b: 2.0 },
        { m: 'glass', s: 'C06', x: 19, b: 2.3 },
        { m: 'glass', s: 'C06', x: 21, b: 2.3 },
        { m: 'glass', s: 'B2', x: 20, b: 2.9 },
        { m: 'stone', s: 'C06', x: 22, b: 0 },
        { m: 'glass', s: 'P2', x: 22.8, b: 0 },
        { m: 'glass', s: 'P2', x: 25.2, b: 0 },
        { m: 'wood', s: 'B3', x: 24, b: 2.0 },
        { m: 'glass', s: 'P1', x: 23, b: 2.3 },
        { m: 'glass', s: 'P1', x: 25, b: 2.3 },
        { m: 'wood', s: 'B3', x: 24, b: 3.5 },
      ],
      pigs: [
        { s: 'M', x: 20, b: 0 },
        { s: 'S', x: 20, b: 3.2 },
        { s: 'S', x: 22, b: 0.6 },
        { s: 'M', x: 24, b: 0 },
        { s: 'M', x: 24, b: 2.3 },
        { s: 'S', x: 24, b: 3.8 },
      ],
    },

    // 9. 절벽 위 요새
    {
      name: '절벽 위 요새',
      birds: ['yellow', 'black', 'blue', 'red'],
      statics: [
        { x: 23, b: 0, w: 6, h: 2 },
      ],
      blocks: [
        { m: 'wood', s: 'C1', x: 18.5, b: 0 },
        { m: 'stone', s: 'P2', x: 21.3, b: 2.0 },
        { m: 'stone', s: 'P2', x: 23.7, b: 2.0 },
        { m: 'wood', s: 'B3', x: 22.5, b: 4.0 },
        { m: 'glass', s: 'C06', x: 21.5, b: 4.3 },
        { m: 'glass', s: 'C06', x: 23.5, b: 4.3 },
        { m: 'glass', s: 'B3', x: 22.5, b: 4.9 },
        { m: 'tnt', s: 'TNT', x: 25.2, b: 2.0 },
        { m: 'wood', s: 'P1', x: 28.5, b: 0 },
      ],
      pigs: [
        { s: 'S', x: 18.5, b: 1.0 },
        { s: 'L', x: 22.5, b: 2.0 },
        { s: 'S', x: 22.5, b: 5.2 },
        { s: 'M', x: 27.5, b: 0 },
      ],
    },

    // 10. 돼지 왕의 성
    {
      name: '돼지 왕의 성',
      birds: ['red', 'blue', 'yellow', 'black', 'black'],
      statics: [],
      blocks: [
        { m: 'stone', s: 'C1', x: 18, b: 0 },
        { m: 'stone', s: 'C1', x: 18, b: 1.0 },
        { m: 'stone', s: 'P2', x: 20.8, b: 0 },
        { m: 'stone', s: 'P2', x: 23.2, b: 0 },
        { m: 'stone', s: 'B3', x: 22, b: 2.0 },
        { m: 'wood', s: 'P2', x: 20.8, b: 2.3 },
        { m: 'wood', s: 'P2', x: 23.2, b: 2.3 },
        { m: 'wood', s: 'B3', x: 22, b: 4.3 },
        { m: 'glass', s: 'P1', x: 21, b: 4.6 },
        { m: 'glass', s: 'P1', x: 23, b: 4.6 },
        { m: 'glass', s: 'B3', x: 22, b: 5.8 },
        { m: 'wood', s: 'P2', x: 25.3, b: 0 },
        { m: 'wood', s: 'P2', x: 27.7, b: 0 },
        { m: 'tnt', s: 'TNT', x: 26.5, b: 0 },
        { m: 'wood', s: 'B3', x: 26.5, b: 2.0 },
      ],
      pigs: [
        { s: 'S', x: 18, b: 2.0 },
        { s: 'L', x: 22, b: 0, king: true },
        { s: 'M', x: 22, b: 2.3 },
        { s: 'M', x: 22, b: 4.6 },
        { s: 'S', x: 22, b: 6.1 },
        { s: 'S', x: 26.5, b: 0.8 },
        { s: 'M', x: 26.5, b: 2.3 },
      ],
    },
  ];
})();
