// stages.js — 모든 공용 상수 + STAGES 10개 (가장 먼저 로드되는 프로젝트 파일)
// 여기 선언된 최상위 const는 physics.js / render.js / game.js가 그대로 공유한다.
// 다른 파일에서 같은 이름을 다시 const로 선언하지 않는다.

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

// 좌표 규칙:
//  - x, y는 중심 좌표 (Bodies.rectangle / circle 기준)
//  - 지면 위 블록: y = GROUND_Y - h/2
//  - 위에 얹는 블록: y = (아래 블록 윗면) - h/2, 겹치지 않게 1~2px 띄움
//  - 배치 x는 400~1240 사이
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
      // 1층
      { x: 770, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 850, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 810, y: 547, w: 110, h: 24, mat: 'wood', angle: 0 },   // 윗면 535
      // 2층
      { x: 770, y: 504, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 850, y: 504, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 810, y: 461, w: 110, h: 24, mat: 'wood', angle: 0 }    // 윗면 449
    ],
    pigs: [
      { x: 810,  y: 426, r: 22 },   // 오두막 지붕 위
      { x: 1100, y: 597, r: 22 }    // 지상, 분리 배치
    ]
  },
  {
    id: 3, name: '얼음 창고', birds: 3, star2: 11500, star3: 23000,
    blocks: [
      // 얼음 벽
      { x: 720, y: 580, w: 24,  h: 80, mat: 'ice',  angle: 0 },   // 윗면 540
      { x: 720, y: 499, w: 24,  h: 80, mat: 'ice',  angle: 0 },
      { x: 760, y: 580, w: 24,  h: 80, mat: 'ice',  angle: 0 },
      // 나무 지지대 + 얼음 지붕
      { x: 880, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 980, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 930, y: 547, w: 140, h: 24, mat: 'ice',  angle: 0 },   // 윗면 535
      // 오른쪽 얼음 기둥
      { x: 1080, y: 590, w: 24, h: 60, mat: 'ice',  angle: 0 },
      { x: 1080, y: 529, w: 24, h: 60, mat: 'ice',  angle: 0 }
    ],
    pigs: [
      { x: 930, y: 599, r: 20 },    // 창고 안
      { x: 930, y: 512, r: 22 }     // 창고 지붕
    ]
  },
  {
    id: 4, name: '돌 기둥', birds: 4, star2: 12000, star3: 23000,
    blocks: [
      // 돌기둥 2개 (각 2단)
      { x: 800, y: 570, w: 30,  h: 100, mat: 'stone', angle: 0 }, // 윗면 520
      { x: 800, y: 469, w: 30,  h: 100, mat: 'stone', angle: 0 }, // 윗면 419
      { x: 920, y: 570, w: 30,  h: 100, mat: 'stone', angle: 0 },
      { x: 920, y: 469, w: 30,  h: 100, mat: 'stone', angle: 0 },
      { x: 860, y: 406, w: 150, h: 24,  mat: 'wood',  angle: 0 }, // 윗면 394
      { x: 860, y: 380, w: 24,  h: 26,  mat: 'ice',   angle: 0 },
      // 오른쪽 작은 오두막
      { x: 1060, y: 590, w: 24,  h: 60, mat: 'wood',  angle: 0 },
      { x: 1140, y: 590, w: 24,  h: 60, mat: 'wood',  angle: 0 },
      { x: 1100, y: 546, w: 120, h: 26, mat: 'stone', angle: 0 }  // 윗면 533
    ],
    pigs: [
      { x: 860,  y: 599, r: 20 },   // 돌기둥 사이 좁은 통로
      { x: 1100, y: 510, r: 22 }    // 오두막 지붕
    ]
  },
  {
    id: 5, name: '2층 구조', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      // 1층 지지대
      { x: 760, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 860, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 960, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 860, y: 547, w: 230, h: 24, mat: 'wood', angle: 0 },   // 윗면 535
      // 2층
      { x: 790, y: 504, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 930, y: 504, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 860, y: 461, w: 170, h: 24, mat: 'wood', angle: 0 },   // 윗면 449
      { x: 830, y: 521, w: 30,  h: 26, mat: 'ice',  angle: 0 },
      // 오른쪽 별채
      { x: 1080, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1160, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1120, y: 547, w: 120, h: 24, mat: 'wood', angle: 0 },
      { x: 1120, y: 521, w: 30,  h: 26, mat: 'ice',  angle: 0 }
    ],
    pigs: [
      { x: 810, y: 599, r: 20 },    // 1층 안
      { x: 880, y: 514, r: 20 },    // 2층 안
      { x: 860, y: 426, r: 22 }     // 지붕 위
    ]
  },
  {
    id: 6, name: '공중 발판', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      // 높은 돌기둥 발판 (고각 사격)
      { x: 700, y: 560, w: 40,  h: 120, mat: 'stone', angle: 0 }, // 윗면 500
      { x: 700, y: 439, w: 40,  h: 120, mat: 'stone', angle: 0 }, // 윗면 379
      { x: 700, y: 318, w: 40,  h: 120, mat: 'stone', angle: 0 }, // 윗면 258
      { x: 700, y: 244, w: 120, h: 26,  mat: 'stone', angle: 0 }, // 윗면 231
      // 지상 오두막 1
      { x: 910, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 990, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 950, y: 547, w: 110, h: 24, mat: 'wood', angle: 0 },   // 윗면 535
      { x: 930, y: 522, w: 24,  h: 24, mat: 'ice',  angle: 0 },
      { x: 970, y: 522, w: 24,  h: 24, mat: 'ice',  angle: 0 },
      // 지상 오두막 2
      { x: 1100, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1160, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1130, y: 547, w: 100, h: 24, mat: 'wood', angle: 0 }
    ],
    pigs: [
      { x: 700,  y: 208, r: 22 },   // 공중 발판 위
      { x: 950,  y: 599, r: 20 },   // 오두막 1 안
      { x: 1130, y: 512, r: 22 }    // 오두막 2 지붕
    ]
  },
  {
    id: 7, name: '좁은 틈', birds: 4, star2: 18000, star3: 30000,
    blocks: [
      // 왼쪽 구조: 낮은 앞벽 + 높은 지지대 사이 틈으로만 안쪽 돼지에 닿음
      { x: 800,  y: 570, w: 30,  h: 100, mat: 'stone', angle: 0 }, // 앞벽 윗면 520
      { x: 860,  y: 540, w: 24,  h: 160, mat: 'stone', angle: 0 }, // 지지대 윗면 460
      { x: 1000, y: 540, w: 24,  h: 160, mat: 'stone', angle: 0 },
      { x: 930,  y: 447, w: 180, h: 24,  mat: 'wood',  angle: 0 }, // 천장 윗면 435
      // 천장 위 작은 오두막
      { x: 900,  y: 404, w: 20,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 960,  y: 404, w: 20,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 930,  y: 361, w: 90,  h: 24,  mat: 'wood',  angle: 0 }, // 윗면 349
      // 오른쪽 구조
      { x: 1080, y: 570, w: 30,  h: 100, mat: 'stone', angle: 0 },
      { x: 1130, y: 540, w: 24,  h: 160, mat: 'stone', angle: 0 },
      { x: 1220, y: 540, w: 24,  h: 160, mat: 'stone', angle: 0 },
      { x: 1175, y: 447, w: 120, h: 24,  mat: 'wood',  angle: 0 }, // 윗면 435
      { x: 1145, y: 421, w: 24,  h: 26,  mat: 'ice',   angle: 0 },
      { x: 1175, y: 421, w: 24,  h: 26,  mat: 'ice',   angle: 0 },
      { x: 1205, y: 421, w: 24,  h: 26,  mat: 'ice',   angle: 0 }
    ],
    pigs: [
      { x: 930,  y: 599, r: 20 },   // 왼쪽 틈 안
      { x: 930,  y: 326, r: 22 },   // 천장 위 오두막
      { x: 1175, y: 599, r: 20 }    // 오른쪽 틈 안
    ]
  },
  {
    id: 8, name: '돌 요새', birds: 5, star2: 23000, star3: 35500,
    blocks: [
      // 앞 버퍼 + 앞 돌벽
      { x: 740, y: 605, w: 30,  h: 30,  mat: 'stone', angle: 0 },
      { x: 780, y: 570, w: 30,  h: 100, mat: 'stone', angle: 0 }, // 윗면 520
      { x: 780, y: 469, w: 30,  h: 100, mat: 'stone', angle: 0 }, // 윗면 419
      // 나무 내부 1층
      { x: 850,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 930,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1010, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 930,  y: 547, w: 200, h: 24, mat: 'wood', angle: 0 },  // 윗면 535
      // 2층
      { x: 870,  y: 504, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 990,  y: 504, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 930,  y: 461, w: 160, h: 24, mat: 'wood', angle: 0 },  // 윗면 449
      { x: 845,  y: 521, w: 24,  h: 26, mat: 'ice',  angle: 0 },
      { x: 1015, y: 521, w: 24,  h: 26, mat: 'ice',  angle: 0 },
      { x: 930,  y: 435, w: 60,  h: 26, mat: 'stone', angle: 0 }, // 윗면 422
      { x: 930,  y: 408, w: 30,  h: 26, mat: 'ice',  angle: 0 },
      // 뒷벽은 나무 — 측면(뒤)만 취약
      { x: 1080, y: 570, w: 30,  h: 100, mat: 'wood', angle: 0 },
      { x: 1080, y: 469, w: 30,  h: 100, mat: 'wood', angle: 0 }
    ],
    pigs: [
      { x: 890,  y: 599, r: 20 },   // 1층 왼쪽
      { x: 970,  y: 599, r: 20 },   // 1층 오른쪽
      { x: 930,  y: 514, r: 20 },   // 2층
      { x: 1080, y: 396, r: 22 }    // 뒷벽 위
    ]
  },
  {
    id: 9, name: '도미노', birds: 5, star2: 23500, star3: 36500,
    blocks: [
      // 얇은 기둥 줄세우기 (간격 60 < 높이 110 → 연쇄)
      { x: 440, y: 565, w: 16, h: 110, mat: 'wood', angle: 0 },
      { x: 500, y: 565, w: 16, h: 110, mat: 'wood', angle: 0 },
      { x: 560, y: 565, w: 16, h: 110, mat: 'wood', angle: 0 },
      { x: 620, y: 565, w: 16, h: 110, mat: 'wood', angle: 0 },
      { x: 680, y: 565, w: 16, h: 110, mat: 'wood', angle: 0 },
      { x: 740, y: 565, w: 16, h: 110, mat: 'wood', angle: 0 },
      { x: 800, y: 565, w: 16, h: 110, mat: 'wood', angle: 0 },
      { x: 860, y: 565, w: 16, h: 110, mat: 'wood', angle: 0 },
      { x: 920, y: 565, w: 16, h: 110, mat: 'wood', angle: 0 },
      // 오두막 1
      { x: 970,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1050, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1010, y: 547, w: 110, h: 24, mat: 'wood', angle: 0 },  // 윗면 535
      { x: 975,  y: 522, w: 20,  h: 24, mat: 'ice',  angle: 0 },
      { x: 1045, y: 522, w: 20,  h: 24, mat: 'ice',  angle: 0 },
      // 오두막 2
      { x: 1110, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1190, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1150, y: 547, w: 110, h: 24, mat: 'wood', angle: 0 },
      { x: 1185, y: 522, w: 20,  h: 24, mat: 'ice',  angle: 0 }
    ],
    pigs: [
      { x: 1010, y: 599, r: 20 },   // 오두막 1 안
      { x: 1010, y: 512, r: 22 },   // 오두막 1 지붕
      { x: 1150, y: 599, r: 20 },   // 오두막 2 안
      { x: 1150, y: 512, r: 22 }    // 오두막 2 지붕
    ]
  },
  {
    id: 10, name: '최종 성채', birds: 5, star2: 29000, star3: 42000,
    blocks: [
      // 앞 버퍼
      { x: 640, y: 605, w: 30,  h: 30, mat: 'stone', angle: 0 },
      // 1층: 돌
      { x: 700, y: 580, w: 30,  h: 80, mat: 'stone', angle: 0 },  // 윗면 540
      { x: 800, y: 580, w: 30,  h: 80, mat: 'stone', angle: 0 },
      { x: 900, y: 580, w: 30,  h: 80, mat: 'stone', angle: 0 },
      { x: 800, y: 526, w: 240, h: 26, mat: 'stone', angle: 0 },  // 윗면 513
      { x: 700, y: 500, w: 24,  h: 24, mat: 'ice',   angle: 0 },
      { x: 900, y: 500, w: 24,  h: 24, mat: 'ice',   angle: 0 },
      // 2층: 나무
      { x: 730, y: 482, w: 24,  h: 60, mat: 'wood',  angle: 0 },  // 윗면 452
      { x: 870, y: 482, w: 24,  h: 60, mat: 'wood',  angle: 0 },
      { x: 800, y: 439, w: 180, h: 24, mat: 'wood',  angle: 0 },  // 윗면 427
      { x: 745, y: 414, w: 20,  h: 24, mat: 'ice',   angle: 0 },
      { x: 855, y: 414, w: 20,  h: 24, mat: 'ice',   angle: 0 },
      // 3층: 얼음
      { x: 770, y: 400, w: 20,  h: 52, mat: 'ice',   angle: 0 },  // 윗면 374
      { x: 830, y: 400, w: 20,  h: 52, mat: 'ice',   angle: 0 },
      { x: 800, y: 361, w: 100, h: 24, mat: 'ice',   angle: 0 },  // 윗면 349
      // 오른쪽 전초
      { x: 1060, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1140, y: 590, w: 24,  h: 60, mat: 'stone', angle: 0 },
      { x: 1100, y: 547, w: 120, h: 24, mat: 'wood',  angle: 0 }, // 윗면 535
      { x: 1080, y: 522, w: 24,  h: 24, mat: 'ice',   angle: 0 },
      { x: 1120, y: 522, w: 24,  h: 24, mat: 'ice',   angle: 0 }
    ],
    pigs: [
      { x: 750,  y: 599, r: 20 },   // 1층 왼쪽
      { x: 850,  y: 599, r: 20 },   // 1층 오른쪽
      { x: 800,  y: 492, r: 20 },   // 2층
      { x: 800,  y: 326, r: 22 },   // 꼭대기
      { x: 1100, y: 599, r: 20 }    // 전초 안
    ]
  }
];
