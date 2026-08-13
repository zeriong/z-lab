(function() {
  'use strict';

  const C = window.AB.C;

  // 헬퍼 함수들
  function hut(x, mat, base) {
    const blocks = [];
    const pigs = [];

    // V (세로기둥) w=18, h=110 → 중심 y = base-1-55 = base-56
    blocks.push({ type: mat, x: x - 64, y: base - 56, w: 18, h: 110 });
    blocks.push({ type: mat, x: x + 64, y: base - 56, w: 18, h: 110 });

    // H (가로보) w=150, h=18 → 중심 y = base-1-9-109 = base-119
    blocks.push({ type: mat, x: x, y: base - 119, w: 150, h: 18 });

    // small pig
    pigs.push({ x: x, y: base - 19, r: 18 });

    return { blocks, pigs };
  }

  function tower2(x, mat, base) {
    const blocks = [];
    const pigs = [];

    // 1층 hut
    blocks.push({ type: mat, x: x - 64, y: base - 56, w: 18, h: 110 });
    blocks.push({ type: mat, x: x + 64, y: base - 56, w: 18, h: 110 });
    blocks.push({ type: mat, x: x, y: base - 119, w: 150, h: 18 });

    // 2층 V들 (1층 H 윗면 = base-128, 2층 base)
    blocks.push({ type: mat, x: x - 64, y: base - 128 - 56, w: 18, h: 110 });
    blocks.push({ type: mat, x: x + 64, y: base - 128 - 56, w: 18, h: 110 });

    // 2층 H (base-128에 올린 것)
    blocks.push({ type: mat, x: x, y: base - 128 - 119, w: 150, h: 18 });

    // 돼지 2마리
    pigs.push({ x: x, y: base - 19, r: 18 });
    pigs.push({ x: x, y: base - 128 - 19, r: 18 });

    return { blocks, pigs };
  }

  function wall(x, mat, base, n) {
    const blocks = [];
    // B (상자) w=46, h=46
    for (let i = 0; i < n; i++) {
      blocks.push({
        type: mat,
        x: x,
        y: base - 24 - 46 * (i + 0.5),
        w: 46,
        h: 46
      });
    }
    return { blocks, pigs: [] };
  }

  function platform(x, mat, base) {
    const blocks = [];
    const pigs = [];

    // S (받침) w=90, h=24 → 중심 y = base - 1 - 12 = base - 13
    blocks.push({ type: mat, x: x, y: base - 13, w: 90, h: 24 });

    // small pig
    pigs.push({ x: x, y: base - 43, r: 18 });

    return { blocks, pigs };
  }

  function mergeStructures(structures) {
    const result = { blocks: [], pigs: [] };
    structures.forEach(s => {
      result.blocks.push(...s.blocks);
      result.pigs.push(...s.pigs);
    });
    return result;
  }

  // 10개 스테이지
  const LEVELS = [
    // Stage 1: 첫 발사
    {
      id: 1,
      name: '첫 발사',
      terrain: [],
      ...mergeStructures([hut(880, 'wood', 600)]),
      birds: ['red', 'red'],
      star2: 10000,
      star3: 14000
    },

    // Stage 2: 이웃집
    {
      id: 2,
      name: '이웃집',
      terrain: [],
      ...mergeStructures([hut(760, 'wood', 600), hut(1010, 'wood', 600)]),
      birds: ['red', 'red', 'red'],
      star2: 20000,
      star3: 28000
    },

    // Stage 3: 2층집
    {
      id: 3,
      name: '2층집',
      terrain: [],
      ...mergeStructures([tower2(920, 'wood', 600)]),
      birds: ['red', 'yellow', 'red'],
      star2: 20000,
      star3: 28000
    },

    // Stage 4: 돌담
    {
      id: 4,
      name: '돌담',
      terrain: [],
      ...mergeStructures([
        wall(700, 'stone', 600, 3),
        hut(930, 'wood', 600),
        platform(1140, 'wood', 600)
      ]),
      birds: ['yellow', 'red', 'red'],
      star2: 20000,
      star3: 28000
    },

    // Stage 5: 언덕 위
    {
      id: 5,
      name: '언덕 위',
      terrain: [{ x: 1060, y: 640, w: 440, h: 160 }],
      ...mergeStructures([
        hut(960, 'wood', 560),
        hut(1160, 'ice', 560)
      ]),
      birds: ['red', 'yellow', 'red'],
      star2: 20000,
      star3: 28000
    },

    // Stage 6: 얼음집
    {
      id: 6,
      name: '얼음집',
      terrain: [],
      ...mergeStructures([
        wall(760, 'stone', 600, 3),
        hut(950, 'ice', 600)
      ]),
      pigs: [
        ...mergeStructures([
          wall(760, 'stone', 600, 3),
          hut(950, 'ice', 600)
        ]).pigs,
        { x: 1140, y: 573, r: 28 }
      ],
      birds: ['red', 'yellow', 'black', 'red'],
      star2: 27000,
      star3: 38000
    },

    // Stage 7: 탑
    {
      id: 7,
      name: '탑',
      terrain: [],
      ...mergeStructures([
        platform(700, 'wood', 600),
        wall(850, 'stone', 600, 4),
        tower2(1060, 'wood', 600)
      ]),
      birds: ['yellow', 'red', 'black', 'red'],
      star2: 30000,
      star3: 42000
    },

    // Stage 8: 요새
    {
      id: 8,
      name: '요새',
      terrain: [{ x: 1120, y: 660, w: 320, h: 240 }],
      ...mergeStructures([
        wall(700, 'stone', 600, 4),
        hut(870, 'wood', 600),
        hut(1120, 'stone', 540)
      ]),
      birds: ['black', 'yellow', 'red', 'red'],
      star2: 27000,
      star3: 38000
    },

    // Stage 9: 긴 사거리
    {
      id: 9,
      name: '긴 사거리',
      terrain: [{ x: 1150, y: 700, w: 260, h: 400 }],
      ...mergeStructures([
        wall(830, 'ice', 600, 4),
        tower2(1150, 'wood', 500)
      ]),
      birds: ['yellow', 'black', 'red', 'red', 'red'],
      star2: 33000,
      star3: 46000
    },

    // Stage 10: 보스
    {
      id: 10,
      name: '보스',
      terrain: [{ x: 1140, y: 660, w: 280, h: 240 }],
      ...mergeStructures([
        wall(680, 'stone', 600, 4),
        hut(850, 'wood', 600),
        hut(1120, 'stone', 540)
      ]),
      pigs: [
        ...mergeStructures([
          wall(680, 'stone', 600, 4),
          hut(850, 'wood', 600),
          hut(1120, 'stone', 540)
        ]).pigs,
        { x: 960, y: 573, r: 28 }
      ],
      birds: ['red', 'yellow', 'black', 'yellow', 'red'],
      star2: 37000,
      star3: 52000
    }
  ];

  window.AB = window.AB || {};
  window.AB.LEVELS = LEVELS;
})();
