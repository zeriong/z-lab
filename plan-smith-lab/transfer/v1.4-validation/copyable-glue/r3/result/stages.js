const W = 1280, H = 720;
const GROUND_Y = 620;                  // 지면 윗면
const SLING = { x: 210, y: 520, maxPull: 120 };
const STEP_MS = 16.666;                // Engine.update 고정 델타
const G_STEP = 0.2777;                 // = gravity.y(1) * gravity.scale(0.001) * STEP_MS^2
const LAUNCH_K = 0.18;                 // 당긴 픽셀 -> px/step
const IMPACT_MIN = 4;                  // 이보다 느린 접촉은 무피해
const SETTLE_SPEED = 0.4;              // 정지 판정 속도 (px/step)
const SETTLE_FRAMES = 45;              // 연속 정지 프레임 수
const FLIGHT_MAX_FRAMES = 420;         // 7초 강제 종료
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
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 825,  y: 548, w: 140, h: 24, mat: 'wood', angle: 0 },
      { x: 975,  y: 548, w: 140, h: 24, mat: 'wood', angle: 0 },
      { x: 900,  y: 506, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [
      { x: 825, y: 512, r: 22 },
      { x: 975, y: 512, r: 22 }
    ]
  },
  {
    id: 3, name: '얼음 창고', birds: 3, star2: 11500, star3: 23000,
    blocks: [
      { x: 800,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 850,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 950,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 875,  y: 548, w: 140, h: 24, mat: 'wood', angle: 0 },
      { x: 975,  y: 548, w: 140, h: 24, mat: 'wood', angle: 0 },
      { x: 925,  y: 506, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [
      { x: 825, y: 470, r: 22 },
      { x: 1025, y: 470, r: 22 }
    ]
  },
  {
    id: 4, name: '돌 기둥', birds: 4, star2: 12000, star3: 23000,
    blocks: [
      { x: 700,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 750,  y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1050, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 700,  y: 548, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1050, y: 548, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 700,  y: 506, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 875,  y: 520, w: 200, h: 24, mat: 'wood', angle: 0 },
      { x: 1050, y: 506, w: 24,  h: 60, mat: 'stone', angle: 0 }
    ],
    pigs: [
      { x: 875, y: 484, r: 22 },
      { x: 875, y: 555, r: 22 }
    ]
  },
  {
    id: 5, name: '2층 구조', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 700,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 800,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1100, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 548, w: 200, h: 24, mat: 'wood', angle: 0 },
      { x: 750,  y: 506, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 950,  y: 506, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 1050, y: 506, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 750,  y: 464, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 464, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 464, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [
      { x: 750, y: 428, r: 22 },
      { x: 950, y: 428, r: 22 },
      { x: 1050, y: 428, r: 22 }
    ]
  },
  {
    id: 6, name: '공중 발판', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 600,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 750,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 420, w: 200, h: 24, mat: 'stone', angle: 0 },
      { x: 950,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 675,  y: 548, w: 140, h: 24, mat: 'wood', angle: 0 },
      { x: 1000, y: 548, w: 140, h: 24, mat: 'wood', angle: 0 },
      { x: 925,  y: 506, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 875,  y: 464, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 900,  y: 548, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 850,  y: 506, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 506, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [
      { x: 900, y: 384, r: 22 },
      { x: 675, y: 512, r: 22 },
      { x: 1000, y: 512, r: 22 }
    ]
  },
  {
    id: 7, name: '좁은 틈', birds: 4, star2: 18000, star3: 30000,
    blocks: [
      { x: 600,  y: 590, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 600,  y: 548, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 600,  y: 506, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 590, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 548, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 506, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 850,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 950,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 825,  y: 548, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 975,  y: 548, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 900,  y: 506, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 825,  y: 464, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 975,  y: 464, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [
      { x: 850, y: 428, r: 22 },
      { x: 900, y: 428, r: 22 },
      { x: 950, y: 428, r: 22 }
    ]
  },
  {
    id: 8, name: '돌 요새', birds: 5, star2: 23000, star3: 35500,
    blocks: [
      { x: 650,  y: 590, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 650,  y: 548, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 650,  y: 506, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 590, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 548, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 506, w: 60,  h: 60, mat: 'stone', angle: 0 },
      { x: 875,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 925,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 875,  y: 548, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 925,  y: 548, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 850,  y: 506, w: 140, h: 24, mat: 'wood', angle: 0 },
      { x: 875,  y: 464, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 925,  y: 464, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 900,  y: 422, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 800,  y: 506, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 1000, y: 506, w: 24,  h: 60, mat: 'ice', angle: 0 }
    ],
    pigs: [
      { x: 875, y: 428, r: 22 },
      { x: 925, y: 428, r: 22 },
      { x: 800, y: 470, r: 22 },
      { x: 1000, y: 470, r: 22 }
    ]
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
      { x: 860,  y: 590, w: 12,  h: 80, mat: 'ice', angle: 0 },
      { x: 900,  y: 590, w: 12,  h: 80, mat: 'ice', angle: 0 },
      { x: 940,  y: 590, w: 12,  h: 80, mat: 'ice', angle: 0 },
      { x: 980,  y: 590, w: 12,  h: 80, mat: 'ice', angle: 0 },
      { x: 1020, y: 590, w: 12,  h: 80, mat: 'ice', angle: 0 },
      { x: 1060, y: 590, w: 12,  h: 80, mat: 'stone', angle: 0 },
      { x: 1100, y: 590, w: 12,  h: 80, mat: 'stone', angle: 0 },
      { x: 1140, y: 590, w: 12,  h: 80, mat: 'stone', angle: 0 },
      { x: 1180, y: 590, w: 12,  h: 80, mat: 'stone', angle: 0 }
    ],
    pigs: [
      { x: 540, y: 510, r: 22 },
      { x: 740, y: 510, r: 22 },
      { x: 940, y: 510, r: 22 },
      { x: 1140, y: 510, r: 22 }
    ]
  },
  {
    id: 10, name: '최종 성채', birds: 5, star2: 29000, star3: 42000,
    blocks: [
      { x: 650,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 725,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 800,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 875,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 950,  y: 590, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 1025, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 687,  y: 548, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 837,  y: 548, w: 60,  h: 24, mat: 'ice', angle: 0 },
      { x: 987,  y: 548, w: 60,  h: 24, mat: 'stone', angle: 0 },
      { x: 650,  y: 506, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 725,  y: 506, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 875,  y: 506, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 950,  y: 506, w: 24,  h: 60, mat: 'ice', angle: 0 },
      { x: 1025, y: 506, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 506, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 687,  y: 464, w: 60,  h: 24, mat: 'wood', angle: 0 },
      { x: 837,  y: 464, w: 60,  h: 24, mat: 'ice', angle: 0 },
      { x: 987,  y: 464, w: 60,  h: 24, mat: 'stone', angle: 0 },
      { x: 875,  y: 422, w: 24,  h: 60, mat: 'wood', angle: 0 }
    ],
    pigs: [
      { x: 687, y: 512, r: 22 },
      { x: 837, y: 512, r: 22 },
      { x: 987, y: 512, r: 22 },
      { x: 725, y: 470, r: 22 },
      { x: 875, y: 386, r: 22 }
    ]
  }
];
