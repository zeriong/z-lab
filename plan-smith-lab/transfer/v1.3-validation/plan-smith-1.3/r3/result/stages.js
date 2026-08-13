const BLOCK_TYPES = {
  wood_pillar: { w: 20, h: 120, density: 0.0015, hp: 120, color: '#b9813f', material: 'wood' },
  wood_beam: { w: 120, h: 20, density: 0.0015, hp: 120, color: '#c8964f', material: 'wood' },
  wood_long_beam: { w: 200, h: 20, density: 0.0015, hp: 140, color: '#c8964f', material: 'wood' },
  ice_pillar: { w: 20, h: 120, density: 0.0008, hp: 60, color: '#a9dcf0', material: 'ice' },
  ice_beam: { w: 120, h: 20, density: 0.0008, hp: 60, color: '#a9dcf0', material: 'ice' },
  stone_block: { w: 60, h: 60, density: 0.0040, hp: 260, color: '#8d8d92', material: 'stone' },
  stone_beam: { w: 120, h: 20, density: 0.0040, hp: 260, color: '#8d8d92', material: 'stone' }
};

const STAGES = [
  // Stage 1: 첫 발사
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
  // Stage 2: 흔들리는 탑 (2층)
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
  // Stage 3: 얼음 창고 (1층 탑 2개, 앞 탑은 ice_pillar)
  {
    id: 3,
    name: '얼음 창고',
    birds: 3,
    blocks: [
      { type: 'ice_pillar', x: 800, y: 580 },
      { type: 'wood_pillar', x: 900, y: 580 },
      { type: 'wood_beam', x: 850, y: 510 },
      { type: 'wood_pillar', x: 1030, y: 580 },
      { type: 'wood_pillar', x: 1130, y: 580 },
      { type: 'wood_beam', x: 1080, y: 510 }
    ],
    pigs: [
      { x: 850, y: 620 },
      { x: 1080, y: 620 }
    ]
  },
  // Stage 4: 돌 지붕 (2층 탑 1개 + 꼭대기 stone_beam)
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
  // Stage 5: 두 개의 탑 (1층 탑 2개 + 연결 beam)
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
  // Stage 6: 계단 (1층 탑 1개 + 2층 탑 1개)
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
  // Stage 7: 매달린 다리 (1층 탑 2개 + 상하 long_beam)
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
      { type: 'wood_long_beam', x: 1000, y: 500 },
      { type: 'wood_long_beam', x: 1000, y: 420 },
      { type: 'wood_long_beam', x: 1000, y: 560 },
      { type: 'wood_long_beam', x: 1000, y: 480 }
    ],
    pigs: [
      { x: 1000, y: 470 },
      { x: 1000, y: 530 },
      { x: 950, y: 620 }
    ]
  },
  // Stage 8: 요새 (2층 탑 2개 + stone_beam 2개)
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
      { x: 880, y: 500 },
      { x: 1120, y: 620 },
      { x: 1120, y: 500 }
    ]
  },
  // Stage 9: 벙커 (2층 탑 2개 + 4개 stone_block 벽)
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
      { type: 'stone_block', x: 990, y: 610 },
      { type: 'stone_block', x: 1020, y: 610 },
      { type: 'stone_block', x: 1050, y: 610 },
      { type: 'stone_block', x: 1080, y: 610 }
    ],
    pigs: [
      { x: 860, y: 500 },
      { x: 860, y: 620 },
      { x: 1120, y: 500 },
      { x: 1120, y: 620 }
    ]
  },
  // Stage 10: 최종 성채 (3층 탑 1개 + 2층 탑 1개 + 방벽 + 연결 beam)
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
      { type: 'stone_block', x: 960, y: 610 },
      { type: 'stone_block', x: 1000, y: 610 },
      { type: 'stone_block', x: 1040, y: 610 },
      { type: 'stone_block', x: 1080, y: 610 },
      { type: 'wood_long_beam', x: 930, y: 360 }
    ],
    pigs: [
      { x: 1050, y: 620 },
      { x: 1050, y: 500 },
      { x: 1050, y: 350 },
      { x: 830, y: 620 },
      { x: 830, y: 500 }
    ]
  }
];
