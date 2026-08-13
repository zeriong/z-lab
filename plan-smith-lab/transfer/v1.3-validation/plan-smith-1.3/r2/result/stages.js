const BLOCK_TYPES = {
  wood_pillar: { w: 20, h: 120, mat: 'wood', density: 0.0015, hp: 120, color: '#b9813f' },
  wood_beam: { w: 120, h: 20, mat: 'wood', density: 0.0015, hp: 120, color: '#c8964f' },
  wood_long_beam: { w: 200, h: 20, mat: 'wood', density: 0.0015, hp: 140, color: '#c8964f' },
  ice_pillar: { w: 20, h: 120, mat: 'ice', density: 0.0008, hp: 60, color: '#a9dcf0' },
  ice_beam: { w: 120, h: 20, mat: 'ice', density: 0.0008, hp: 60, color: '#a9dcf0' },
  stone_block: { w: 60, h: 60, mat: 'stone', density: 0.0040, hp: 260, color: '#8d8d92' },
  stone_beam: { w: 120, h: 20, mat: 'stone', density: 0.0040, hp: 260, color: '#8d8d92' }
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
    pigs: [{ x: 950, y: 620 }]
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
    pigs: [{ x: 950, y: 620 }]
  },
  {
    id: 3,
    name: '얼음 창고',
    birds: 3,
    blocks: [
      { type: 'ice_pillar', x: 850, y: 580 },
      { type: 'ice_pillar', x: 900, y: 580 },
      { type: 'wood_beam', x: 875, y: 510 },
      { type: 'wood_pillar', x: 1080, y: 580 },
      { type: 'wood_pillar', x: 1130, y: 580 },
      { type: 'wood_beam', x: 1105, y: 510 }
    ],
    pigs: [
      { x: 875, y: 620 },
      { x: 1105, y: 620 }
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
      { type: 'stone_beam', x: 980, y: 230 }
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
      { x: 1060, y: 340 }
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
      { type: 'wood_long_beam', x: 1000, y: 480 },
      { type: 'wood_long_beam', x: 1000, y: 560 },
      { type: 'wood_pillar', x: 880, y: 580 },
      { type: 'wood_pillar', x: 1120, y: 580 }
    ],
    pigs: [
      { x: 1000, y: 450 },
      { x: 950, y: 450 },
      { x: 1050, y: 620 }
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
      { type: 'stone_beam', x: 880, y: 230 },
      { type: 'wood_pillar', x: 1070, y: 580 },
      { type: 'wood_pillar', x: 1170, y: 580 },
      { type: 'wood_beam', x: 1120, y: 510 },
      { type: 'wood_pillar', x: 1070, y: 440 },
      { type: 'wood_pillar', x: 1170, y: 440 },
      { type: 'wood_beam', x: 1120, y: 370 },
      { type: 'stone_beam', x: 1120, y: 230 }
    ],
    pigs: [
      { x: 880, y: 620 },
      { x: 880, y: 470 },
      { x: 1120, y: 620 },
      { x: 1120, y: 470 }
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
      { type: 'stone_block', x: 970, y: 610 },
      { type: 'stone_block', x: 1020, y: 610 },
      { type: 'stone_block', x: 970, y: 560 },
      { type: 'stone_block', x: 1020, y: 560 }
    ],
    pigs: [
      { x: 860, y: 620 },
      { x: 1120, y: 620 },
      { x: 1000, y: 510 },
      { x: 1000, y: 430 }
    ]
  },
  {
    id: 10,
    name: '최종 성채',
    birds: 5,
    blocks: [
      { type: 'wood_pillar', x: 780, y: 580 },
      { type: 'wood_pillar', x: 880, y: 580 },
      { type: 'wood_beam', x: 830, y: 510 },
      { type: 'wood_pillar', x: 780, y: 440 },
      { type: 'wood_pillar', x: 880, y: 440 },
      { type: 'wood_beam', x: 830, y: 370 },
      { type: 'wood_pillar', x: 1000, y: 580 },
      { type: 'wood_pillar', x: 1100, y: 580 },
      { type: 'wood_beam', x: 1050, y: 510 },
      { type: 'wood_pillar', x: 1000, y: 440 },
      { type: 'wood_pillar', x: 1100, y: 440 },
      { type: 'wood_beam', x: 1050, y: 370 },
      { type: 'wood_pillar', x: 1000, y: 300 },
      { type: 'wood_pillar', x: 1100, y: 300 },
      { type: 'wood_beam', x: 1050, y: 230 },
      { type: 'wood_long_beam', x: 880, y: 400 },
      { type: 'stone_block', x: 940, y: 610 },
      { type: 'stone_block', x: 990, y: 610 },
      { type: 'stone_block', x: 1040, y: 610 },
      { type: 'stone_block', x: 1090, y: 610 }
    ],
    pigs: [
      { x: 830, y: 620 },
      { x: 1050, y: 620 },
      { x: 1050, y: 470 },
      { x: 1050, y: 340 },
      { x: 1050, y: 200 }
    ]
  }
];
