// Stage builder and stage data
window.SB = {
  V(cx, base, mat) {
    return { type: 'box', cx, base, w: 24, h: 110, mat };
  },

  H(cx, base, len, mat) {
    return { type: 'box', cx, base, w: len, h: 24, mat };
  },

  BLK(cx, base, w, h, mat) {
    return { type: 'box', cx, base, w, h, mat };
  },

  HUT(cx, base, mat, span = 110) {
    return [
      { type: 'box', cx: cx - span / 2, base, w: 24, h: 110, mat },
      { type: 'box', cx: cx + span / 2, base, w: 24, h: 110, mat },
      { type: 'box', cx, base: base - 110, w: span + 48, h: 24, mat }
    ];
  },

  PIG(cx, base, r = 20) {
    return { type: 'pig', cx, base, r };
  }
};

function buildBlock(world, block) {
  if (Array.isArray(block)) {
    return block.map(b => buildBlock(world, b)).flat();
  }

  if (block.type === 'box') {
    const cy = block.base - block.h / 2;
    return P.addBox(world, block.cx, cy, block.w / 2, block.h / 2, block.mat);
  } else if (block.type === 'pig') {
    const cy = block.base - block.r;
    const body = P.addCircle(world, block.cx, cy, block.r, 'pig');
    body.kind = 'pig';
    return body;
  }
}

window.STAGES = [
  {
    id: 1,
    name: '첫 발사',
    birds: ['red', 'red', 'red'],
    build: (world) => {
      const h1 = SB.HUT(1150, 620, 'wood');
      h1.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.PIG(1150, 620));
    }
  },
  {
    id: 2,
    name: '이층집',
    birds: ['red', 'red', 'red'],
    build: (world) => {
      const h1 = SB.HUT(1150, 620, 'wood');
      h1.forEach(b => buildBlock(world, b));
      const h2 = SB.HUT(1150, 486, 'wood');
      h2.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.PIG(1150, 620));
      buildBlock(world, SB.PIG(1150, 486));
    }
  },
  {
    id: 3,
    name: '쌍둥이',
    birds: ['red', 'yellow', 'red'],
    build: (world) => {
      const h1 = SB.HUT(1000, 620, 'wood');
      h1.forEach(b => buildBlock(world, b));
      const h2 = SB.HUT(1320, 620, 'wood');
      h2.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.PIG(1000, 620));
      buildBlock(world, SB.PIG(1320, 620));
    }
  },
  {
    id: 4,
    name: '유리 지붕',
    birds: ['red', 'red', 'yellow'],
    build: (world) => {
      const h1 = SB.HUT(1100, 620, 'glass');
      h1.forEach(b => buildBlock(world, b));
      const h2 = SB.HUT(1400, 620, 'glass');
      h2.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.H(1250, 486, 340, 'wood'));
      buildBlock(world, SB.PIG(1100, 620));
      buildBlock(world, SB.PIG(1400, 620));
    }
  },
  {
    id: 5,
    name: '돌 오두막',
    birds: ['red', 'yellow', 'black'],
    build: (world) => {
      const h1 = SB.HUT(1200, 620, 'stone');
      h1.forEach(b => buildBlock(world, b));
      const h2 = SB.HUT(1200, 486, 'wood');
      h2.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.PIG(1200, 620));
      buildBlock(world, SB.PIG(1200, 486));
    }
  },
  {
    id: 6,
    name: '삼각 마을',
    birds: ['red', 'yellow', 'yellow', 'red'],
    build: (world) => {
      const h1 = SB.HUT(980, 620, 'wood');
      h1.forEach(b => buildBlock(world, b));
      const h2 = SB.HUT(1240, 620, 'stone');
      h2.forEach(b => buildBlock(world, b));
      const h3 = SB.HUT(1500, 620, 'wood');
      h3.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.PIG(980, 620));
      buildBlock(world, SB.PIG(1240, 620));
      buildBlock(world, SB.PIG(1500, 620));
    }
  },
  {
    id: 7,
    name: '탑',
    birds: ['red', 'yellow', 'black', 'red'],
    build: (world) => {
      const h1 = SB.HUT(1250, 620, 'stone');
      h1.forEach(b => buildBlock(world, b));
      const h2 = SB.HUT(1250, 486, 'stone');
      h2.forEach(b => buildBlock(world, b));
      const h3 = SB.HUT(1250, 352, 'wood');
      h3.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.PIG(1080, 620));
      buildBlock(world, SB.PIG(1250, 486));
      buildBlock(world, SB.PIG(1250, 352));
    }
  },
  {
    id: 8,
    name: '유리 성',
    birds: ['red', 'red', 'yellow', 'black'],
    build: (world) => {
      const h1 = SB.HUT(1050, 620, 'glass');
      h1.forEach(b => buildBlock(world, b));
      const h2 = SB.HUT(1350, 620, 'glass');
      h2.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.H(1200, 486, 420, 'stone'));
      buildBlock(world, SB.PIG(1050, 620));
      buildBlock(world, SB.PIG(1350, 620));
      buildBlock(world, SB.PIG(1200, 462));
    }
  },
  {
    id: 9,
    name: '요새',
    birds: ['red', 'yellow', 'black', 'yellow', 'red'],
    build: (world) => {
      const h1 = SB.HUT(1000, 620, 'stone');
      h1.forEach(b => buildBlock(world, b));
      const h2 = SB.HUT(1300, 620, 'stone');
      h2.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.H(1150, 486, 420, 'stone'));
      const h3 = SB.HUT(1150, 462, 'wood');
      h3.forEach(b => buildBlock(world, b));
      const h4 = SB.HUT(1620, 620, 'wood');
      h4.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.PIG(1000, 620));
      buildBlock(world, SB.PIG(1300, 620));
      buildBlock(world, SB.PIG(1150, 462));
      buildBlock(world, SB.PIG(1620, 620));
      buildBlock(world, SB.PIG(1150, 328));
    }
  },
  {
    id: 10,
    name: '최종 요새',
    birds: ['red', 'yellow', 'black', 'yellow', 'black'],
    build: (world) => {
      const h1 = SB.HUT(950, 620, 'stone');
      h1.forEach(b => buildBlock(world, b));
      const h2 = SB.HUT(1250, 620, 'stone');
      h2.forEach(b => buildBlock(world, b));
      const h3 = SB.HUT(1550, 620, 'stone');
      h3.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.H(1100, 486, 340, 'stone'));
      buildBlock(world, SB.H(1400, 486, 340, 'stone'));
      const h4 = SB.HUT(1250, 462, 'wood');
      h4.forEach(b => buildBlock(world, b));
      buildBlock(world, SB.PIG(950, 620));
      buildBlock(world, SB.PIG(1250, 620));
      buildBlock(world, SB.PIG(1550, 620));
      buildBlock(world, SB.PIG(1250, 462));
      buildBlock(world, SB.PIG(1250, 328));
    }
  }
];
