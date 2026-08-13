const W = 1280, H = 720;
const GROUND_Y = 620;
const SLING = { x: 210, y: 520, maxPull: 120 };
const STEP_MS = 16.666;
const G_STEP = 0.2777;
const LAUNCH_K = 0.18;
const IMPACT_MIN = 4;
const SETTLE_SPEED = 0.4;
const SETTLE_FRAMES = 45;
const FLIGHT_MAX_FRAMES = 420;
const SCORE = { pig: 5000, block: 500, birdLeft: 10000 };

const STAGES = [
  {
    id: 1, name: '첫 발사', birds: 3, star2: 5500, star3: 16000,
    blocks: [
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 548, w: 140, h: 24, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 950, y: 512, r: 22 } ]
  },
  {
    id: 2, name: '나무 오두막', birds: 3, star2: 11000, star3: 22000,
    blocks: [
      { x: 750,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 850,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 800,  y: 548, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 1000, y: 548, w: 100, h: 24, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 800, y: 506, r: 22 }, { x: 1000, y: 506, r: 22 } ]
  },
  {
    id: 3, name: '얼음 창고', birds: 3, star2: 11500, star3: 23000,
    blocks: [
      { x: 700,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 760,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 820,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 880,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 940,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 1060, y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 1120, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 850, y: 506, r: 22 }, { x: 1050, y: 506, r: 22 } ]
  },
  {
    id: 4, name: '돌 기둥', birds: 4, star2: 12000, star3: 23000,
    blocks: [
      { x: 600,  y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 650,  y: 548, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 700,  y: 506, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 900,  y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 950,  y: 548, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 1000, y: 506, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 800,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 850,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 750,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 750, y: 464, r: 22 }, { x: 950, y: 464, r: 22 } ]
  },
  {
    id: 5, name: '2층 구조', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 600,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 700,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 800,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1100, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 650,  y: 548, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 850,  y: 548, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 1050, y: 548, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 750,  y: 506, w: 140, h: 24, mat: 'wood', angle: 0 },
      { x: 950,  y: 506, w: 140, h: 24, mat: 'wood', angle: 0 },
      { x: 850,  y: 464, w: 100, h: 24, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 750, y: 464, r: 22 }, { x: 950, y: 422, r: 22 }, { x: 1050, y: 506, r: 22 } ]
  },
  {
    id: 6, name: '공중 발판', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 600,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 700,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 800,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 400, w: 200, h: 24, mat: 'stone', angle: 0 },
      { x: 650,  y: 548, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 850,  y: 548, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 1000, y: 500, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 1100, y: 500, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1100, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 900, y: 358, r: 22 }, { x: 700, y: 506, r: 22 }, { x: 1050, y: 458, r: 22 } ]
  },
  {
    id: 7, name: '좁은 틈', birds: 4, star2: 18000, star3: 30000,
    blocks: [
      { x: 500,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 550,  y: 548, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 600,  y: 506, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 700,  y: 506, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 750,  y: 548, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 800,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 548, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 548, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 506, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 650,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 850,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 650, y: 464, r: 22 }, { x: 850, y: 464, r: 22 }, { x: 1000, y: 464, r: 22 } ]
  },
  {
    id: 8, name: '돌 요새', birds: 5, star2: 23000, star3: 35500,
    blocks: [
      { x: 500,  y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 550,  y: 548, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 600,  y: 506, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 650,  y: 548, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 700,  y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 925,  y: 548, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 775,  y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 825,  y: 548, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 875,  y: 506, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 800,  y: 548, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 850,  y: 506, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 625, y: 464, r: 22 }, { x: 925, y: 506, r: 22 }, { x: 1000, y: 506, r: 22 }, { x: 1100, y: 548, r: 22 } ]
  },
  {
    id: 9, name: '도미노', birds: 5, star2: 23500, star3: 36500,
    blocks: [
      { x: 500,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 540,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 580,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 620,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 660,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 700,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 740,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 780,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 820,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 860,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 900,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 940,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 980,  y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 1020, y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 1060, y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 1100, y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 1140, y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 },
      { x: 1180, y: 590, w: 12,  h: 80, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 540, y: 508, r: 22 }, { x: 780, y: 508, r: 22 }, { x: 1020, y: 508, r: 22 }, { x: 1180, y: 508, r: 22 } ]
  },
  {
    id: 10, name: '최종 성채', birds: 5, star2: 29000, star3: 42000,
    blocks: [
      { x: 450,  y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 550,  y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 650,  y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 500,  y: 548, w: 32,  h: 60, mat: 'wood', angle: 0 },
      { x: 600,  y: 548, w: 32,  h: 60, mat: 'wood', angle: 0 },
      { x: 550,  y: 506, w: 100, h: 24, mat: 'ice', angle: 0 },
      { x: 800,  y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 900,  y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 1000, y: 590, w: 32,  h: 60, mat: 'stone', angle: 0 },
      { x: 850,  y: 548, w: 32,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 548, w: 32,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 506, w: 100, h: 24, mat: 'ice', angle: 0 },
      { x: 500,  y: 464, w: 80,  h: 24, mat: 'wood', angle: 0 },
      { x: 700,  y: 464, w: 80,  h: 24, mat: 'wood', angle: 0 },
      { x: 900,  y: 464, w: 80,  h: 24, mat: 'wood', angle: 0 },
      { x: 1100, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1150, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1200, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 600,  y: 422, w: 60,  h: 24, mat: 'ice', angle: 0 },
      { x: 1000, y: 422, w: 60,  h: 24, mat: 'ice', angle: 0 }
    ],
    pigs: [ { x: 550, y: 464, r: 22 }, { x: 900, y: 464, r: 22 }, { x: 600, y: 380, r: 22 }, { x: 1000, y: 380, r: 22 }, { x: 1150, y: 548, r: 22 } ]
  }
];
