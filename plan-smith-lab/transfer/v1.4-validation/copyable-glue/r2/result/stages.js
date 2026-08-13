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
      { x: 850,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 920,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 990,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1060, y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 885,  y: 520, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1025, y: 520, w: 60,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 885, y: 480, r: 22 }, { x: 1025, y: 480, r: 22 } ]
  },
  {
    id: 3, name: '얼음 창고', birds: 3, star2: 11500, star3: 23000,
    blocks: [
      { x: 800,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 590, w: 60,  h: 60, mat: 'ice', angle: 0 },
      { x: 1000, y: 590, w: 60,  h: 60, mat: 'ice', angle: 0 },
      { x: 1100, y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 850,  y: 520, w: 60,  h: 60, mat: 'ice', angle: 0 },
      { x: 950,  y: 520, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 520, w: 60,  h: 60, mat: 'ice', angle: 0 },
      { x: 950,  y: 450, w: 60,  h: 60, mat: 'ice', angle: 0 }
    ],
    pigs: [ { x: 900, y: 410, r: 22 }, { x: 1000, y: 410, r: 22 } ]
  },
  {
    id: 4, name: '돌 기둥', birds: 4, star2: 12000, star3: 23000,
    blocks: [
      { x: 750,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 800,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 850,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 950,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1050, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 900,  y: 520, w: 120, h: 24, mat: 'wood', angle: 0 },
      { x: 900,  y: 450, w: 120, h: 24, mat: 'wood', angle: 0 },
      { x: 900,  y: 380, w: 24,  h: 60, mat: 'stone', angle: 0 }
    ],
    pigs: [ { x: 900, y: 340, r: 22 }, { x: 900, y: 270, r: 22 } ]
  },
  {
    id: 5, name: '2층 구조', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 750,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 850,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1150, y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 800,  y: 520, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 1000, y: 520, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 750,  y: 450, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 450, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 450, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 825,  y: 380, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 975,  y: 380, w: 100, h: 24, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 750, y: 340, r: 22 }, { x: 900, y: 340, r: 22 }, { x: 1050, y: 340, r: 22 } ]
  },
  {
    id: 6, name: '공중 발판', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 600,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 700,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 800,  y: 450, w: 140, h: 24, mat: 'stone', angle: 0 },
      { x: 1000, y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1100, y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1150, y: 350, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 300, w: 100, h: 24, mat: 'stone', angle: 0 },
      { x: 950,  y: 260, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 850,  y: 260, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1050, y: 260, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 900,  y: 180, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 180, w: 60,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 800, y: 410, r: 22 }, { x: 1000, y: 550, r: 22 }, { x: 1150, y: 310, r: 22 } ]
  },
  {
    id: 7, name: '좁은 틈', birds: 4, star2: 18000, star3: 30000,
    blocks: [
      { x: 700,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 750,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 800,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 850,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 950,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1050, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 775,  y: 520, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 975,  y: 520, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 750,  y: 450, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1000, y: 450, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 875,  y: 380, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 320, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 875, y: 340, r: 22 }, { x: 900, y: 280, r: 22 }, { x: 875, y: 240, r: 22 } ]
  },
  {
    id: 8, name: '돌 요새', birds: 5, star2: 23000, star3: 35500,
    blocks: [
      { x: 650,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 700,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 750,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 800,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 950,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1050, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 725,  y: 520, w: 100, h: 24, mat: 'stone', angle: 0 },
      { x: 975,  y: 520, w: 100, h: 24, mat: 'stone', angle: 0 },
      { x: 750,  y: 450, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 850,  y: 450, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 450, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 450, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 850,  y: 380, w: 100, h: 24, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 800, y: 340, r: 22 }, { x: 900, y: 410, r: 22 }, { x: 950, y: 340, r: 22 }, { x: 1050, y: 410, r: 22 } ]
  },
  {
    id: 9, name: '도미노', birds: 5, star2: 23500, star3: 36500,
    blocks: [
      { x: 500,  y: 590, w: 24,  h: 100, mat: 'ice', angle: 0 },
      { x: 570,  y: 590, w: 24,  h: 100, mat: 'ice', angle: 0 },
      { x: 640,  y: 590, w: 24,  h: 100, mat: 'ice', angle: 0 },
      { x: 710,  y: 590, w: 24,  h: 100, mat: 'ice', angle: 0 },
      { x: 780,  y: 590, w: 24,  h: 100, mat: 'ice', angle: 0 },
      { x: 850,  y: 590, w: 24,  h: 100, mat: 'ice', angle: 0 },
      { x: 920,  y: 590, w: 24,  h: 100, mat: 'ice', angle: 0 },
      { x: 990,  y: 590, w: 24,  h: 100, mat: 'ice', angle: 0 },
      { x: 1060, y: 590, w: 24,  h: 100, mat: 'ice', angle: 0 },
      { x: 1130, y: 590, w: 24,  h: 100, mat: 'ice', angle: 0 },
      { x: 815,  y: 480, w: 140, h: 24, mat: 'wood', angle: 0 },
      { x: 900,  y: 410, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 410, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 330, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 950,  y: 270, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 330, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 850,  y: 330, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 200, w: 60,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 500, y: 520, r: 22 }, { x: 815, y: 440, r: 22 }, { x: 900, y: 370, r: 22 }, { x: 950, y: 230, r: 22 } ]
  },
  {
    id: 10, name: '최종 성채', birds: 5, star2: 29000, star3: 42000,
    blocks: [
      { x: 600,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 700,  y: 590, w: 60,  h: 60, mat: 'ice', angle: 0 },
      { x: 800,  y: 590, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 900,  y: 590, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 590, w: 60,  h: 60, mat: 'ice', angle: 0 },
      { x: 1100, y: 590, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 600,  y: 520, w: 60,  h: 60, mat: 'ice', angle: 0 },
      { x: 700,  y: 520, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 800,  y: 520, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 520, w: 60,  h: 60, mat: 'ice', angle: 0 },
      { x: 1000, y: 520, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 520, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 650,  y: 450, w: 100, h: 24, mat: 'wood', angle: 0 },
      { x: 850,  y: 450, w: 100, h: 24, mat: 'ice', angle: 0 },
      { x: 1050, y: 450, w: 100, h: 24, mat: 'stone', angle: 0 },
      { x: 750,  y: 380, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 900,  y: 380, w: 60,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 380, w: 60,  h: 60, mat: 'ice', angle: 0 },
      { x: 825,  y: 310, w: 100, h: 24, mat: 'stone', angle: 0 },
      { x: 900,  y: 240, w: 60,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 600, y: 550, r: 22 }, { x: 800, y: 550, r: 22 }, { x: 1000, y: 550, r: 22 }, { x: 900, y: 480, r: 22 }, { x: 900, y: 200, r: 22 } ]
  }
];
