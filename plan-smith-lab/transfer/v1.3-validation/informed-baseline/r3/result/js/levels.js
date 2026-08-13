(function() {
  'use strict';

  const C = window.AB.C;

  // 헬퍼 함수들 (기본 조각: V=18×110, H=150×18, B=46×46, S=90×24)

  function hut(x, mat, base) {
    const blocks = [
      { type: mat, x: x - 64, y: base - 56, w: 18, h: 110 },  // V left
      { type: mat, x: x + 64, y: base - 56, w: 18, h: 110 },  // V right
      { type: mat, x: x, y: base - 137, w: 150, h: 18 }       // H
    ];
    const pigs = [{ x: x, y: base - 19, r: 18 }];
    return { blocks, pigs };
  }

  function tower2(x, mat, base) {
    const blocks = [
      { type: mat, x: x - 64, y: base - 56, w: 18, h: 110 },   // 1층 V left
      { type: mat, x: x + 64, y: base - 56, w: 18, h: 110 },   // 1층 V right
      { type: mat, x: x, y: base - 137, w: 150, h: 18 },       // 1층 H
      { type: mat, x: x - 64, y: base - 184, w: 18, h: 110 },  // 2층 V left
      { type: mat, x: x + 64, y: base - 184, w: 18, h: 110 },  // 2층 V right
      { type: mat, x: x, y: base - 265, w: 150, h: 18 }        // 2층 H (base-128-1-9-18/2=base-265)
    ];
    const pigs = [
      { x: x, y: base - 19, r: 18 },
      { x: x, y: base - 147, r: 18 }
    ];
    return { blocks, pigs };
  }

  function wall(x, mat, base, n) {
    const blocks = [];
    for (let i = 0; i < n; i++) {
      blocks.push({
        type: mat,
        x: x,
        y: base - 24 - 46 * i,
        w: 46,
        h: 46
      });
    }
    return { blocks, pigs: [] };
  }

  function platform(x, mat, base) {
    const blocks = [
      { type: mat, x: x, y: base - 13, w: 90, h: 24 }
    ];
    const pigs = [{ x: x, y: base - 43, r: 18 }];
    return { blocks, pigs };
  }

  function mergeStructures(structures) {
    const allBlocks = [];
    const allPigs = [];
    structures.forEach(s => {
      allBlocks.push(...s.blocks);
      allPigs.push(...s.pigs);
    });
    return { blocks: allBlocks, pigs: allPigs };
  }

  // 10개 스테이지 정의

  window.AB.LEVELS = [
    {
      id: 1,
      name: '첫 발사',
      terrain: [],
      ...mergeStructures([hut(880, 'wood', 600)]),
      birds: ['red', 'red'],
      star2: 10000,
      star3: 14000
    },
    {
      id: 2,
      name: '이웃집',
      terrain: [],
      ...mergeStructures([hut(760, 'wood', 600), hut(1010, 'wood', 600)]),
      birds: ['red', 'red', 'red'],
      star2: 20000,
      star3: 28000
    },
    {
      id: 3,
      name: '2층집',
      terrain: [],
      ...mergeStructures([tower2(920, 'wood', 600)]),
      birds: ['red', 'yellow', 'red'],
      star2: 20000,
      star3: 28000
    },
    {
      id: 4,
      name: '돌담',
      terrain: [],
      ...mergeStructures([wall(700, 'stone', 600, 3), hut(930, 'wood', 600), platform(1140, 'wood', 600)]),
      birds: ['yellow', 'red', 'red'],
      star2: 20000,
      star3: 28000
    },
    {
      id: 5,
      name: '언덕 위',
      terrain: [{ x: 1060, y: 640, w: 440, h: 160 }],
      ...mergeStructures([hut(960, 'wood', 560), hut(1160, 'ice', 560)]),
      birds: ['red', 'yellow', 'red'],
      star2: 20000,
      star3: 28000
    },
    {
      id: 6,
      name: '얼음집',
      terrain: [],
      blocks: [
        ...wall(760, 'stone', 600, 3).blocks,
        ...hut(950, 'ice', 600).blocks
      ],
      pigs: [
        ...wall(760, 'stone', 600, 3).pigs,
        ...hut(950, 'ice', 600).pigs,
        { x: 1140, y: 573, r: 28 }
      ],
      birds: ['red', 'yellow', 'black', 'red'],
      star2: 27000,
      star3: 38000
    },
    {
      id: 7,
      name: '탑',
      terrain: [],
      ...mergeStructures([platform(700, 'wood', 600), wall(850, 'stone', 600, 4), tower2(1060, 'wood', 600)]),
      birds: ['yellow', 'red', 'black', 'red'],
      star2: 30000,
      star3: 42000
    },
    {
      id: 8,
      name: '요새',
      terrain: [{ x: 1120, y: 660, w: 320, h: 240 }],
      ...mergeStructures([wall(700, 'stone', 600, 4), hut(870, 'wood', 600), hut(1120, 'stone', 540)]),
      birds: ['black', 'yellow', 'red', 'red'],
      star2: 27000,
      star3: 38000
    },
    {
      id: 9,
      name: '긴 사거리',
      terrain: [{ x: 1150, y: 700, w: 260, h: 400 }],
      ...mergeStructures([wall(830, 'ice', 600, 4), tower2(1150, 'wood', 500)]),
      birds: ['yellow', 'black', 'red', 'red', 'red'],
      star2: 33000,
      star3: 46000
    },
    {
      id: 10,
      name: '보스',
      terrain: [{ x: 1140, y: 660, w: 280, h: 240 }],
      blocks: [
        ...wall(680, 'stone', 600, 4).blocks,
        ...hut(850, 'wood', 600).blocks,
        ...hut(1120, 'stone', 540).blocks
      ],
      pigs: [
        ...wall(680, 'stone', 600, 4).pigs,
        ...hut(850, 'wood', 600).pigs,
        { x: 960, y: 573, r: 28 },
        ...hut(1120, 'stone', 540).pigs
      ],
      birds: ['red', 'yellow', 'black', 'yellow', 'red'],
      star2: 37000,
      star3: 52000
    }
  ];
})();
