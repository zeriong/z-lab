const BLOCK_TYPES = {
  wood_pillar: {
    w: 20,
    h: 120,
    density: 0.0015,
    hp: 120,
    color: '#b9813f',
    material: 'wood'
  },
  wood_beam: {
    w: 120,
    h: 20,
    density: 0.0015,
    hp: 120,
    color: '#c8964f',
    material: 'wood'
  },
  wood_long_beam: {
    w: 200,
    h: 20,
    density: 0.0015,
    hp: 140,
    color: '#c8964f',
    material: 'wood'
  },
  ice_pillar: {
    w: 20,
    h: 120,
    density: 0.0008,
    hp: 60,
    color: '#a9dcf0',
    material: 'ice'
  },
  ice_beam: {
    w: 120,
    h: 20,
    density: 0.0008,
    hp: 60,
    color: '#a9dcf0',
    material: 'ice'
  },
  stone_block: {
    w: 60,
    h: 60,
    density: 0.0040,
    hp: 260,
    color: '#8d8d92',
    material: 'stone'
  },
  stone_beam: {
    w: 120,
    h: 20,
    density: 0.0040,
    hp: 260,
    color: '#8d8d92',
    material: 'stone'
  }
};

const STAGES = [
  {
    id: 1,
    name: '첫 발사',
    birds: 3,
    blocks: [
      { type: 'wood_pillar', x: 900, y: 580 },
      { type: 'wood_pillar', x: 1000, y: 580 },
      { type: 'wood_beam', x: 950, y: 510 }
    ],
    pigs: [
      { x: 950, y: 620 }
    ]
  },
  {
    id: 2,
    name: '흔들리는 탑',
    birds: 3,
    blocks: [
      { type: 'wood_pillar', x: 900, y: 580 },
      { type: 'wood_pillar', x: 1000, y: 580 },
      { type: 'wood_beam', x: 950, y: 510 },
      { type: 'wood_pillar', x: 900, y: 440 },
      { type: 'wood_pillar', x: 1000, y: 440 },
      { type: 'wood_beam', x: 950, y: 370 }
    ],
    pigs: [
      { x: 950, y: 620 }
    ]
  },
  {
    id: 3,
    name: '얼음 창고',
    birds: 3,
    blocks: [
      { type: 'ice_pillar', x: 850, y: 580 },
      { type: 'ice_pillar', x: 950, y: 580 },
      { type: 'wood_beam', x: 900, y: 510 },
      { type: 'wood_pillar', x: 1080, y: 580 },
      { type: 'wood_pillar', x: 1180, y: 580 },
      { type: 'wood_beam', x: 1130, y: 510 }
    ],
    pigs: [
      { x: 900, y: 620 },
      { x: 1130, y: 620 }
    ]
  },
  {
    id: 4,
    name: '돌 지붕',
    birds: 4,
    blocks: [
      { type: 'wood_pillar', x: 930, y: 580 },
      { type: 'wood_pillar', x: 1030, y: 580 },
      { type: 'wood_beam', x: 980, y: 510 },
      { type: 'wood_pillar', x: 930, y: 440 },
      { type: 'wood_pillar', x: 1030, y: 440 },
      { type: 'wood_beam', x: 980, y: 370 },
      { type: 'stone_beam', x: 980, y: 240 }
    ],
    pigs: [
      { x: 980, y: 620 },
      { x: 1150, y: 620 }
    ]
  },
  {
    id: 5,
    name: '두 개의 탑',
    birds: 4,
    blocks: [
      { type: 'wood_pillar', x: 830, y: 580 },
      { type: 'wood_pillar', x: 930, y: 580 },
      { type: 'wood_beam', x: 880, y: 510 },
      { type: 'wood_pillar', x: 1030, y: 580 },
      { type: 'wood_pillar', x: 1130, y: 580 },
      { type: 'wood_beam', x: 1080, y: 510 },
      { type: 'wood_long_beam', x: 980, y: 500 }
    ],
    pigs: [
      { x: 880, y: 620 },
      { x: 1080, y: 620 },
      { x: 980, y: 470 }
    ]
  },
  {
    id: 6,
    name: '계단',
    birds: 4,
    blocks: [
      { type: 'wood_pillar', x: 780, y: 580 },
      { type: 'wood_pillar', x: 880, y: 580 },
      { type: 'wood_beam', x: 830, y: 510 },
      { type: 'wood_pillar', x: 1010, y: 580 },
      { type: 'wood_pillar', x: 1110, y: 580 },
      { type: 'wood_beam', x: 1060, y: 510 },
      { type: 'wood_pillar', x: 1010, y: 440 },
      { type: 'wood_pillar', x: 1110, y: 440 },
      { type: 'wood_beam', x: 1060, y: 370 }
    ],
    pigs: [
      { x: 830, y: 620 },
      { x: 1060, y: 620 },
      { x: 1060, y: 500 }
    ]
  },
  {
    id: 7,
    name: '매달린 다리',
    birds: 4,
    blocks: [
      { type: 'wood_pillar', x: 800, y: 580 },
      { type: 'wood_pillar', x: 900, y: 580 },
      { type: 'wood_beam', x: 850, y: 510 },
      { type: 'wood_pillar', x: 1100, y: 580 },
      { type: 'wood_pillar', x: 1200, y: 580 },
      { type: 'wood_beam', x: 1150, y: 510 },
      { type: 'wood_long_beam', x: 950, y: 480 },
      { type: 'wood_long_beam', x: 950, y: 420 },
      { type: 'wood_pillar', x: 950, y: 300 },
      { type: 'wood_pillar', x: 950, y: 300 }
    ],
    pigs: [
      { x: 950, y: 440 },
      { x: 950, y: 360 },
      { x: 950, y: 620 }
    ]
  },
  {
    id: 8,
    name: '요새',
    birds: 5,
    blocks: [
      { type: 'wood_pillar', x: 830, y: 580 },
      { type: 'wood_pillar', x: 930, y: 580 },
      { type: 'wood_beam', x: 880, y: 510 },
      { type: 'wood_pillar', x: 830, y: 440 },
      { type: 'wood_pillar', x: 930, y: 440 },
      { type: 'wood_beam', x: 880, y: 370 },
      { type: 'stone_beam', x: 880, y: 240 },
      { type: 'wood_pillar', x: 1070, y: 580 },
      { type: 'wood_pillar', x: 1170, y: 580 },
      { type: 'wood_beam', x: 1120, y: 510 },
      { type: 'wood_pillar', x: 1070, y: 440 },
      { type: 'wood_pillar', x: 1170, y: 440 },
      { type: 'wood_beam', x: 1120, y: 370 },
      { type: 'stone_beam', x: 1120, y: 240 }
    ],
    pigs: [
      { x: 880, y: 620 },
      { x: 880, y: 500 },
      { x: 1120, y: 620 },
      { x: 1120, y: 500 }
    ]
  },
  {
    id: 9,
    name: '벙커',
    birds: 5,
    blocks: [
      { type: 'wood_pillar', x: 810, y: 580 },
      { type: 'wood_pillar', x: 910, y: 580 },
      { type: 'wood_beam', x: 860, y: 510 },
      { type: 'wood_pillar', x: 810, y: 440 },
      { type: 'wood_pillar', x: 910, y: 440 },
      { type: 'wood_beam', x: 860, y: 370 },
      { type: 'wood_pillar', x: 1070, y: 580 },
      { type: 'wood_pillar', x: 1170, y: 580 },
      { type: 'wood_beam', x: 1120, y: 510 },
      { type: 'wood_pillar', x: 1070, y: 440 },
      { type: 'wood_pillar', x: 1170, y: 440 },
      { type: 'wood_beam', x: 1120, y: 370 },
      { type: 'stone_block', x: 920, y: 610 },
      { type: 'stone_block', x: 1000, y: 610 },
      { type: 'stone_block', x: 1080, y: 610 },
      { type: 'stone_block', x: 1160, y: 610 }
    ],
    pigs: [
      { x: 860, y: 620 },
      { x: 1120, y: 620 },
      { x: 980, y: 580 },
      { x: 1100, y: 580 }
    ]
  },
  {
    id: 10,
    name: '최종 성채',
    birds: 5,
    blocks: [
      { type: 'wood_pillar', x: 1000, y: 580 },
      { type: 'wood_pillar', x: 1100, y: 580 },
      { type: 'wood_beam', x: 1050, y: 510 },
      { type: 'wood_pillar', x: 1000, y: 440 },
      { type: 'wood_pillar', x: 1100, y: 440 },
      { type: 'wood_beam', x: 1050, y: 370 },
      { type: 'wood_pillar', x: 1000, y: 300 },
      { type: 'wood_pillar', x: 1100, y: 300 },
      { type: 'wood_beam', x: 1050, y: 230 },
      { type: 'wood_pillar', x: 780, y: 580 },
      { type: 'wood_pillar', x: 880, y: 580 },
      { type: 'wood_beam', x: 830, y: 510 },
      { type: 'wood_pillar', x: 780, y: 440 },
      { type: 'wood_pillar', x: 880, y: 440 },
      { type: 'wood_beam', x: 830, y: 370 },
      { type: 'wood_long_beam', x: 940, y: 240 },
      { type: 'stone_block', x: 950, y: 610 },
      { type: 'stone_block', x: 1050, y: 610 },
      { type: 'stone_block', x: 1150, y: 610 },
      { type: 'stone_block', x: 1250, y: 610 }
    ],
    pigs: [
      { x: 830, y: 620 },
      { x: 830, y: 500 },
      { x: 1050, y: 620 },
      { x: 1050, y: 500 },
      { x: 1050, y: 380 }
    ]
  }
];
