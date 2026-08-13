// Stage builder and data
const SB = {
  V: (world, cx, base, mat) => {
    // Vertical pillar 24×110
    const hw = 12, hh = 55;
    const cy = base - hh;
    return P.addBox(world, cx, cy, hw, hh, MAT[mat].density, MAT[mat].e, MAT[mat].mu, false, mat, 'block');
  },

  H: (world, cx, base, len, mat) => {
    // Horizontal plank len×24
    const hw = len / 2, hh = 12;
    const cy = base - hh;
    return P.addBox(world, cx, cy, hw, hh, MAT[mat].density, MAT[mat].e, MAT[mat].mu, false, mat, 'block');
  },

  BLK: (world, cx, base, w, h, mat) => {
    // Arbitrary box
    const hw = w / 2, hh = h / 2;
    const cy = base - hh;
    return P.addBox(world, cx, cy, hw, hh, MAT[mat].density, MAT[mat].e, MAT[mat].mu, false, mat, 'block');
  },

  HUT: (world, cx, base, mat, span = 110) => {
    // Hut: 3 pieces (left pillar, right pillar, roof)
    SB.V(world, cx - span / 2, base, mat);
    SB.V(world, cx + span / 2, base, mat);
    SB.H(world, cx, base - 110, span + 48, mat);
  },

  PIG: (world, cx, base, r = 20) => {
    const cy = base - r;
    return P.addCircle(world, cx, cy, r, MAT.pig.density, MAT.pig.e, MAT.pig.mu, false, 'pig', 'pig');
  }
};

const STAGES = [
  {
    id: 1,
    name: '첫 발사',
    birds: ['red', 'red', 'red'],
    build: (world) => {
      SB.HUT(world, 1150, 620, 'wood');
      SB.PIG(world, 1150, 620);
    }
  },
  {
    id: 2,
    name: '이층집',
    birds: ['red', 'red', 'red'],
    build: (world) => {
      SB.HUT(world, 1150, 620, 'wood');
      SB.HUT(world, 1150, 486, 'wood');
      SB.PIG(world, 1150, 620);
      SB.PIG(world, 1150, 486);
    }
  },
  {
    id: 3,
    name: '쌍둥이',
    birds: ['red', 'yellow', 'red'],
    build: (world) => {
      SB.HUT(world, 1000, 620, 'wood');
      SB.HUT(world, 1320, 620, 'wood');
      SB.PIG(world, 1000, 620);
      SB.PIG(world, 1320, 620);
    }
  },
  {
    id: 4,
    name: '유리 지붕',
    birds: ['red', 'red', 'yellow'],
    build: (world) => {
      SB.HUT(world, 1100, 620, 'glass');
      SB.HUT(world, 1400, 620, 'glass');
      SB.H(world, 1250, 486, 340, 'wood');
      SB.PIG(world, 1100, 620);
      SB.PIG(world, 1400, 620);
    }
  },
  {
    id: 5,
    name: '돌 오두막',
    birds: ['red', 'yellow', 'black'],
    build: (world) => {
      SB.HUT(world, 1200, 620, 'stone');
      SB.HUT(world, 1200, 486, 'wood');
      SB.PIG(world, 1200, 620);
      SB.PIG(world, 1200, 486);
    }
  },
  {
    id: 6,
    name: '삼각 마을',
    birds: ['red', 'yellow', 'yellow', 'red'],
    build: (world) => {
      SB.HUT(world, 980, 620, 'wood');
      SB.HUT(world, 1240, 620, 'stone');
      SB.HUT(world, 1500, 620, 'wood');
      SB.PIG(world, 980, 620);
      SB.PIG(world, 1240, 620);
      SB.PIG(world, 1500, 620);
    }
  },
  {
    id: 7,
    name: '탑',
    birds: ['red', 'yellow', 'black', 'red'],
    build: (world) => {
      SB.HUT(world, 1250, 620, 'stone');
      SB.HUT(world, 1250, 486, 'stone');
      SB.HUT(world, 1250, 352, 'wood');
      SB.PIG(world, 1080, 620);
      SB.PIG(world, 1250, 486);
      SB.PIG(world, 1250, 352);
    }
  },
  {
    id: 8,
    name: '유리 성',
    birds: ['red', 'red', 'yellow', 'black'],
    build: (world) => {
      SB.HUT(world, 1050, 620, 'glass');
      SB.HUT(world, 1350, 620, 'glass');
      SB.H(world, 1200, 486, 420, 'stone');
      SB.PIG(world, 1050, 620);
      SB.PIG(world, 1350, 620);
      SB.PIG(world, 1200, 462);
    }
  },
  {
    id: 9,
    name: '요새',
    birds: ['red', 'yellow', 'black', 'yellow', 'red'],
    build: (world) => {
      SB.HUT(world, 1000, 620, 'stone');
      SB.HUT(world, 1300, 620, 'stone');
      SB.H(world, 1150, 486, 420, 'stone');
      SB.HUT(world, 1150, 462, 'wood');
      SB.HUT(world, 1620, 620, 'wood');
      SB.PIG(world, 1000, 620);
      SB.PIG(world, 1300, 620);
      SB.PIG(world, 1150, 462);
      SB.PIG(world, 1620, 620);
      SB.PIG(world, 1150, 328);
    }
  },
  {
    id: 10,
    name: '최종 요새',
    birds: ['red', 'yellow', 'black', 'yellow', 'black'],
    build: (world) => {
      SB.HUT(world, 950, 620, 'stone');
      SB.HUT(world, 1250, 620, 'stone');
      SB.HUT(world, 1550, 620, 'stone');
      SB.H(world, 1100, 486, 340, 'stone');
      SB.H(world, 1400, 486, 340, 'stone');
      SB.HUT(world, 1250, 462, 'wood');
      SB.PIG(world, 950, 620);
      SB.PIG(world, 1250, 620);
      SB.PIG(world, 1550, 620);
      SB.PIG(world, 1250, 462);
      SB.PIG(world, 1250, 328);
    }
  }
];
