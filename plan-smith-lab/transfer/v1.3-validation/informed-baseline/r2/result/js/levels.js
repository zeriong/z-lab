(function() {
  const C = window.AB.C;

  // Helpers
  function hut(x, mat, base) {
    const blocks = [
      { type: mat, x: x - 64, y: base - 1 - 55, w: 18, h: 110 },
      { type: mat, x: x + 64, y: base - 1 - 55, w: 18, h: 110 },
      { type: mat, x: x, y: base - 128 - 9, w: 150, h: 18 }
    ];
    const pig = { x: x, y: base - 19, r: 18 };
    return { blocks, pigs: [pig] };
  }

  function tower2(x, mat, base) {
    const blocks = [
      { type: mat, x: x - 64, y: base - 1 - 55, w: 18, h: 110 },
      { type: mat, x: x + 64, y: base - 1 - 55, w: 18, h: 110 },
      { type: mat, x: x, y: base - 128 - 9, w: 150, h: 18 },
      { type: mat, x: x - 64, y: base - 128 - 1 - 55, w: 18, h: 110 },
      { type: mat, x: x + 64, y: base - 128 - 1 - 55, w: 18, h: 110 },
      { type: mat, x: x, y: base - 256 - 9, w: 150, h: 18 }
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
      { type: mat, x: x, y: base - 12, w: 90, h: 24 }
    ];
    const pigs = [{ x: x, y: base - 43, r: 18 }];
    return { blocks, pigs };
  }

  // Level Assembly
  function buildLevel(id, name, terrain, structures, birds, pigs, star2, star3) {
    let blocks = [];
    let levelPigs = [];
    for (const struct of structures) {
      blocks = blocks.concat(struct.blocks);
      levelPigs = levelPigs.concat(struct.pigs);
    }
    for (const pig of pigs) {
      levelPigs.push(pig);
    }
    return { id, name, terrain, blocks, pigs: levelPigs, birds, star2, star3 };
  }

  window.AB.LEVELS = [
    // Level 1
    buildLevel(1, '첫 발사', [],
      [hut(880, 'wood', 600)],
      ['red', 'red'],
      [],
      10000, 14000),

    // Level 2
    buildLevel(2, '이웃집', [],
      [hut(760, 'wood', 600), hut(1010, 'wood', 600)],
      ['red', 'red', 'red'],
      [],
      20000, 28000),

    // Level 3
    buildLevel(3, '2층집', [],
      [tower2(920, 'wood', 600)],
      ['red', 'yellow', 'red'],
      [],
      20000, 28000),

    // Level 4
    buildLevel(4, '돌담', [],
      [wall(700, 'stone', 600, 3), hut(930, 'wood', 600), platform(1140, 'wood', 600)],
      ['yellow', 'red', 'red'],
      [],
      20000, 28000),

    // Level 5
    buildLevel(5, '언덕 위', [{ x: 1060, y: 640, w: 440, h: 160 }],
      [hut(960, 'wood', 560), hut(1160, 'ice', 560)],
      ['red', 'yellow', 'red'],
      [],
      20000, 28000),

    // Level 6
    buildLevel(6, '얼음집', [],
      [wall(760, 'stone', 600, 3), hut(950, 'ice', 600)],
      ['red', 'yellow', 'black', 'red'],
      [{ x: 1140, y: 573, r: 28 }],
      27000, 38000),

    // Level 7
    buildLevel(7, '탑', [],
      [platform(700, 'wood', 600), wall(850, 'stone', 600, 4), tower2(1060, 'wood', 600)],
      ['yellow', 'red', 'black', 'red'],
      [],
      30000, 42000),

    // Level 8
    buildLevel(8, '요새', [{ x: 1120, y: 660, w: 320, h: 240 }],
      [wall(700, 'stone', 600, 4), hut(870, 'wood', 600), hut(1120, 'stone', 540)],
      ['black', 'yellow', 'red', 'red'],
      [],
      27000, 38000),

    // Level 9
    buildLevel(9, '긴 사거리', [{ x: 1150, y: 700, w: 260, h: 400 }],
      [wall(830, 'ice', 600, 4), tower2(1150, 'wood', 500)],
      ['yellow', 'black', 'red', 'red', 'red'],
      [],
      33000, 46000),

    // Level 10
    buildLevel(10, '보스', [{ x: 1140, y: 660, w: 280, h: 240 }],
      [wall(680, 'stone', 600, 4), hut(850, 'wood', 600), hut(1120, 'stone', 540)],
      ['red', 'yellow', 'black', 'yellow', 'red'],
      [{ x: 960, y: 573, r: 28 }],
      37000, 52000)
  ];
})();
