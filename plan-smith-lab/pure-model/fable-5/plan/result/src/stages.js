// 10개 스테이지 선언적 정의 (§4). 좌표는 논리 해상도 1280x720 기준 절대값.
// 지면(y=680 전폭 static)은 전 스테이지 공통이라 스키마에 넣지 않는다 (§4.1).
// 블록 좌표는 크기에서 계산해 초기 겹침 0을 보장한다 (§6 리스크 대비).

const SLING = { x: 180, y: 530 };

export const STAGES = [
  {
    id: 1,
    name: '첫 사냥',
    birds: 3,
    slingshot: { ...SLING },
    pigs: [{ x: 900, y: 660, size: 20 }],
    blocks: [],
    statics: [],
  },
  {
    id: 2,
    name: '첫 구조물',
    birds: 3,
    slingshot: { ...SLING },
    pigs: [{ x: 900, y: 660, size: 20 }],
    blocks: [
      { x: 850, y: 620, w: 24, h: 120, material: 'wood' },
      { x: 950, y: 620, w: 24, h: 120, material: 'wood' },
      { x: 900, y: 548, w: 160, h: 24, material: 'wood' },
    ],
    statics: [],
  },
  {
    id: 3,
    name: '두 목표',
    birds: 3,
    slingshot: { ...SLING },
    pigs: [
      { x: 750, y: 660, size: 20 },
      { x: 1050, y: 660, size: 20 },
    ],
    blocks: [
      { x: 700, y: 640, w: 24, h: 80, material: 'wood' },
      { x: 1000, y: 640, w: 24, h: 80, material: 'wood' },
    ],
    statics: [],
  },
  {
    id: 4,
    name: '유리의 집',
    birds: 3,
    slingshot: { ...SLING },
    pigs: [
      { x: 900, y: 662, size: 18 },
      { x: 1100, y: 662, size: 18 },
    ],
    blocks: [
      { x: 860, y: 630, w: 24, h: 100, material: 'glass' },
      { x: 940, y: 630, w: 24, h: 100, material: 'glass' },
      { x: 900, y: 568, w: 140, h: 24, material: 'glass' },
    ],
    statics: [],
  },
  {
    id: 5,
    name: '돌 지붕',
    birds: 3,
    slingshot: { ...SLING },
    pigs: [{ x: 900, y: 660, size: 20 }],
    blocks: [
      { x: 840, y: 625, w: 28, h: 110, material: 'wood' },
      { x: 960, y: 625, w: 28, h: 110, material: 'wood' },
      { x: 900, y: 557, w: 180, h: 26, material: 'stone' },
    ],
    statics: [],
  },
  {
    id: 6,
    name: '2층집',
    birds: 4,
    slingshot: { ...SLING },
    pigs: [
      { x: 900, y: 662, size: 18 },
      { x: 900, y: 540, size: 16 },
    ],
    blocks: [
      // 1층: 나무 기둥 + 바닥판
      { x: 850, y: 630, w: 24, h: 100, material: 'wood' },
      { x: 950, y: 630, w: 24, h: 100, material: 'wood' },
      { x: 900, y: 568, w: 170, h: 24, material: 'wood' },
      // 2층: 유리 기둥 + 지붕
      { x: 860, y: 516, w: 24, h: 80, material: 'glass' },
      { x: 940, y: 516, w: 24, h: 80, material: 'glass' },
      { x: 900, y: 466, w: 140, h: 20, material: 'glass' },
    ],
    statics: [],
  },
  {
    id: 7,
    name: '절벽 지형',
    birds: 4,
    slingshot: { ...SLING },
    pigs: [
      { x: 600, y: 660, size: 20 },
      { x: 800, y: 580, size: 20 },
      { x: 1080, y: 500, size: 20 },
    ],
    blocks: [],
    statics: [
      { x: 800, y: 640, w: 200, h: 80 },
      { x: 1080, y: 600, w: 200, h: 160 },
    ],
  },
  {
    id: 8,
    name: '도미노',
    birds: 4,
    slingshot: { ...SLING },
    pigs: [
      { x: 660, y: 662, size: 18 },
      { x: 1100, y: 660, size: 20 },
    ],
    blocks: [
      { x: 700, y: 610, w: 22, h: 140, material: 'wood' },
      { x: 780, y: 610, w: 22, h: 140, material: 'wood' },
      { x: 860, y: 610, w: 22, h: 140, material: 'wood' },
      { x: 940, y: 610, w: 22, h: 140, material: 'wood' },
      { x: 1020, y: 610, w: 22, h: 140, material: 'wood' },
    ],
    statics: [],
  },
  {
    id: 9,
    name: '요새',
    birds: 4,
    slingshot: { ...SLING },
    pigs: [
      { x: 840, y: 662, size: 18 },
      { x: 930, y: 662, size: 18 },
      { x: 1020, y: 662, size: 18 },
    ],
    blocks: [
      // 돌 외벽 + 돌 지붕
      { x: 800, y: 600, w: 30, h: 160, material: 'stone' },
      { x: 1060, y: 600, w: 30, h: 160, material: 'stone' },
      { x: 930, y: 507, w: 320, h: 26, material: 'stone' },
      // 유리 내벽
      { x: 880, y: 630, w: 20, h: 100, material: 'glass' },
      { x: 980, y: 630, w: 20, h: 100, material: 'glass' },
    ],
    statics: [],
  },
  {
    id: 10,
    name: '최종 결전',
    birds: 5,
    slingshot: { ...SLING },
    pigs: [
      { x: 760, y: 660, size: 20 },
      { x: 880, y: 662, size: 18 },
      { x: 1000, y: 662, size: 18 },
      { x: 940, y: 486, size: 18 }, // 지붕 위
    ],
    blocks: [
      // 도미노 열 (8 요소)
      { x: 600, y: 615, w: 22, h: 130, material: 'wood' },
      { x: 680, y: 615, w: 22, h: 130, material: 'wood' },
      // 요새 (9 요소)
      { x: 820, y: 605, w: 28, h: 150, material: 'stone' },
      { x: 1060, y: 605, w: 28, h: 150, material: 'stone' },
      { x: 940, y: 517, w: 300, h: 26, material: 'stone' },
      { x: 940, y: 635, w: 20, h: 90, material: 'glass' },
    ],
    statics: [],
  },
];
