// Stage builder (§11.2)
const SB = {
  V(cx, base, mat) {
    // Vertical pillar 24×110
    return { type: 'box', x: cx, base, hw: 12, hh: 55, mat };
  },

  H(cx, base, len, mat) {
    // Horizontal board len×24
    return { type: 'box', x: cx, base, hw: len / 2, hh: 12, mat };
  },

  BLK(cx, base, w, h, mat) {
    // Arbitrary box
    return { type: 'box', x: cx, base, hw: w / 2, hh: h / 2, mat };
  },

  HUT(cx, base, mat, span = 110) {
    // Hut: 3 pieces (2 pillars + roof)
    return [
      SB.V(cx - span / 2, base, mat),
      SB.V(cx + span / 2, base, mat),
      SB.H(cx, base - 110, span + 48, mat)
    ];
  },

  PIG(cx, base, r = 20) {
    // Pig circle
    return { type: 'pig', x: cx, base, r };
  }
};

// 10 Stages (§11.4)
const STAGES = [
  {
    id: 1,
    name: '첫 발사',
    birds: ['red', 'red', 'red'],
    build(world) {
      const hut = SB.HUT(1150, 620, 'wood');
      for (let piece of hut) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      P.addCircle(world, 1150, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
    }
  },
  {
    id: 2,
    name: '이층집',
    birds: ['red', 'red', 'red'],
    build(world) {
      const hut1 = SB.HUT(1150, 620, 'wood');
      for (let piece of hut1) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut2 = SB.HUT(1150, 486, 'wood');
      for (let piece of hut2) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      P.addCircle(world, 1150, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1150, 486 - 20, 20, { mat: 'pig', kind: 'pig' });
    }
  },
  {
    id: 3,
    name: '쌍둥이',
    birds: ['red', 'yellow', 'red'],
    build(world) {
      const hut1 = SB.HUT(1000, 620, 'wood');
      for (let piece of hut1) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut2 = SB.HUT(1320, 620, 'wood');
      for (let piece of hut2) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      P.addCircle(world, 1000, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1320, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
    }
  },
  {
    id: 4,
    name: '유리 지붕',
    birds: ['red', 'red', 'yellow'],
    build(world) {
      const hut1 = SB.HUT(1100, 620, 'glass');
      for (let piece of hut1) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut2 = SB.HUT(1400, 620, 'glass');
      for (let piece of hut2) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const board = SB.H(1250, 486, 340, 'wood');
      P.addBox(world, board.x, board.base - board.hh, board.hw, board.hh, { mat: board.mat, kind: 'block' });
      P.addCircle(world, 1100, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1400, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
    }
  },
  {
    id: 5,
    name: '돌 오두막',
    birds: ['red', 'yellow', 'black'],
    build(world) {
      const hut1 = SB.HUT(1200, 620, 'stone');
      for (let piece of hut1) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut2 = SB.HUT(1200, 486, 'wood');
      for (let piece of hut2) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      P.addCircle(world, 1200, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1200, 486 - 20, 20, { mat: 'pig', kind: 'pig' });
    }
  },
  {
    id: 6,
    name: '삼각 마을',
    birds: ['red', 'yellow', 'yellow', 'red'],
    build(world) {
      const hut1 = SB.HUT(980, 620, 'wood');
      for (let piece of hut1) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut2 = SB.HUT(1240, 620, 'stone');
      for (let piece of hut2) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut3 = SB.HUT(1500, 620, 'wood');
      for (let piece of hut3) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      P.addCircle(world, 980, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1240, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1500, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
    }
  },
  {
    id: 7,
    name: '탑',
    birds: ['red', 'yellow', 'black', 'red'],
    build(world) {
      const hut1 = SB.HUT(1250, 620, 'stone');
      for (let piece of hut1) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut2 = SB.HUT(1250, 486, 'stone');
      for (let piece of hut2) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut3 = SB.HUT(1250, 352, 'wood');
      for (let piece of hut3) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      P.addCircle(world, 1080, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1250, 486 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1250, 352 - 20, 20, { mat: 'pig', kind: 'pig' });
    }
  },
  {
    id: 8,
    name: '유리 성',
    birds: ['red', 'red', 'yellow', 'black'],
    build(world) {
      const hut1 = SB.HUT(1050, 620, 'glass');
      for (let piece of hut1) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut2 = SB.HUT(1350, 620, 'glass');
      for (let piece of hut2) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const board = SB.H(1200, 486, 420, 'stone');
      P.addBox(world, board.x, board.base - board.hh, board.hw, board.hh, { mat: board.mat, kind: 'block' });
      P.addCircle(world, 1050, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1350, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1200, 462 - 20, 20, { mat: 'pig', kind: 'pig' });
    }
  },
  {
    id: 9,
    name: '요새',
    birds: ['red', 'yellow', 'black', 'yellow', 'red'],
    build(world) {
      const hut1 = SB.HUT(1000, 620, 'stone');
      for (let piece of hut1) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut2 = SB.HUT(1300, 620, 'stone');
      for (let piece of hut2) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const board = SB.H(1150, 486, 420, 'stone');
      P.addBox(world, board.x, board.base - board.hh, board.hw, board.hh, { mat: board.mat, kind: 'block' });
      const hut3 = SB.HUT(1150, 462, 'wood');
      for (let piece of hut3) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut4 = SB.HUT(1620, 620, 'wood');
      for (let piece of hut4) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      P.addCircle(world, 1000, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1300, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1150, 462 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1620, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1150, 328 - 20, 20, { mat: 'pig', kind: 'pig' });
    }
  },
  {
    id: 10,
    name: '최종 요새',
    birds: ['red', 'yellow', 'black', 'yellow', 'black'],
    build(world) {
      const hut1 = SB.HUT(950, 620, 'stone');
      for (let piece of hut1) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut2 = SB.HUT(1250, 620, 'stone');
      for (let piece of hut2) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const hut3 = SB.HUT(1550, 620, 'stone');
      for (let piece of hut3) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      const board1 = SB.H(1100, 486, 340, 'stone');
      P.addBox(world, board1.x, board1.base - board1.hh, board1.hw, board1.hh, { mat: board1.mat, kind: 'block' });
      const board2 = SB.H(1400, 486, 340, 'stone');
      P.addBox(world, board2.x, board2.base - board2.hh, board2.hw, board2.hh, { mat: board2.mat, kind: 'block' });
      const hut4 = SB.HUT(1250, 462, 'wood');
      for (let piece of hut4) P.addBox(world, piece.x, piece.base - piece.hh, piece.hw, piece.hh, { mat: piece.mat, kind: 'block' });
      P.addCircle(world, 950, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1250, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1550, 620 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1250, 462 - 20, 20, { mat: 'pig', kind: 'pig' });
      P.addCircle(world, 1250, 328 - 20, 20, { mat: 'pig', kind: 'pig' });
    }
  }
];
