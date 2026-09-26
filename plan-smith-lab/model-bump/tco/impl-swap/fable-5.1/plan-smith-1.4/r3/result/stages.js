// stages.js — 모든 공용 상수 + STAGES 10개.
// 이 파일은 프로젝트 스크립트 중 가장 먼저 로드된다. 아래 상수 이름은 이 파일에서만 const 로 선언한다.

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
//  - x, y 는 중심 좌표 (Bodies.rectangle / circle 이 중심 기준)
//  - 지면 위 블록: y = GROUND_Y - h/2
//  - 위에 얹는 블록: y = (아래 블록 윗면) - h/2 - 1  (1px 띄움, 초기 겹침 방지)
//  - 배치 x 는 400 ~ 1240 사이
// 별 임계값: star2 = 돼지수×5000 + 블록수×200, star3 = 돼지수×5000 + 블록수×350 + 10000 (500 단위 반올림)

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
    // 2층 나무 상자. 돼지 하나는 지붕 위, 하나는 1층 안.
    id: 2, name: '나무 오두막', birds: 3, star2: 11000, star3: 22000,
    blocks: [
      { x: 780, y: 585, w: 24,  h: 70, mat: 'wood', angle: 0 },   // 1층 기둥 (윗면 550)
      { x: 860, y: 585, w: 24,  h: 70, mat: 'wood', angle: 0 },
      { x: 820, y: 539, w: 120, h: 20, mat: 'wood', angle: 0 },   // 1층 상판 (윗면 529)
      { x: 790, y: 498, w: 24,  h: 60, mat: 'wood', angle: 0 },   // 2층 기둥 (윗면 468)
      { x: 850, y: 498, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 820, y: 457, w: 100, h: 20, mat: 'wood', angle: 0 }    // 지붕 (윗면 447)
    ],
    pigs: [
      { x: 820, y: 424, r: 22 },   // 지붕 위
      { x: 820, y: 598, r: 22 }    // 1층 안
    ]
  },
  {
    // 얼음 벽(1방) 뒤에 나무 지지대 구조물. 얼음은 얇고 잘 깨진다.
    id: 3, name: '얼음 창고', birds: 3, star2: 11500, star3: 23000,
    blocks: [
      { x: 700, y: 560, w: 24,  h: 120, mat: 'ice',  angle: 0 },  // 앞 얼음 벽 하단 (윗면 500)
      { x: 700, y: 439, w: 24,  h: 120, mat: 'ice',  angle: 0 },  // 앞 얼음 벽 상단 (윗면 379)
      { x: 880, y: 580, w: 24,  h: 80,  mat: 'wood', angle: 0 },  // 나무 기둥 (윗면 540)
      { x: 980, y: 580, w: 24,  h: 80,  mat: 'wood', angle: 0 },
      { x: 930, y: 529, w: 150, h: 20,  mat: 'wood', angle: 0 },  // 나무 상판 (윗면 519)
      { x: 890, y: 488, w: 20,  h: 60,  mat: 'ice',  angle: 0 },  // 얼음 기둥 (윗면 458)
      { x: 970, y: 488, w: 20,  h: 60,  mat: 'ice',  angle: 0 },
      { x: 930, y: 447, w: 120, h: 20,  mat: 'ice',  angle: 0 }   // 얼음 지붕 (윗면 437)
    ],
    pigs: [
      { x: 930, y: 598, r: 22 },   // 상판 아래
      { x: 930, y: 414, r: 22 }    // 얼음 지붕 위
    ]
  },
  {
    // 돌기둥 두 개와 돌 지붕. 돌은 사실상 안 뚫리므로 얼음으로 막힌 좌우 통로를 노린다.
    id: 4, name: '돌 기둥', birds: 4, star2: 12000, star3: 23000,
    blocks: [
      { x: 760,  y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 }, // 왼쪽 돌기둥 (윗면 460)
      { x: 1060, y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 }, // 오른쪽 돌기둥
      { x: 910,  y: 447, w: 340, h: 24,  mat: 'stone', angle: 0 }, // 돌 지붕 (윗면 435)
      { x: 800,  y: 570, w: 24,  h: 100, mat: 'ice',   angle: 0 }, // 왼쪽 통로 얼음
      { x: 1020, y: 570, w: 24,  h: 100, mat: 'ice',   angle: 0 }, // 오른쪽 통로 얼음
      { x: 850,  y: 580, w: 20,  h: 80,  mat: 'wood',  angle: 0 }, // 안쪽 나무 기둥 (윗면 540)
      { x: 970,  y: 580, w: 20,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 910,  y: 529, w: 160, h: 20,  mat: 'wood',  angle: 0 }, // 안쪽 나무 상판 (윗면 519)
      { x: 910,  y: 419, w: 60,  h: 30,  mat: 'stone', angle: 0 }  // 지붕 위 돌덩이
    ],
    pigs: [
      { x: 910, y: 598, r: 22 },   // 나무 상판 아래
      { x: 910, y: 496, r: 22 }    // 나무 상판 위, 돌 지붕 아래
    ]
  },
  {
    // 넓은 2층 구조. 1층 기둥을 치면 2층 전체가 내려앉는다.
    id: 5, name: '2층 구조', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 760,  y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 }, // 1층 기둥 4개 (윗면 530)
      { x: 860,  y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 },
      { x: 960,  y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 },
      { x: 1060, y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 },
      { x: 910,  y: 519, w: 340, h: 20, mat: 'wood',  angle: 0 }, // 1층 바닥판 (윗면 509)
      { x: 800,  y: 473, w: 24,  h: 70, mat: 'ice',   angle: 0 }, // 2층 얼음 기둥 3개 (윗면 438)
      { x: 900,  y: 473, w: 24,  h: 70, mat: 'ice',   angle: 0 },
      { x: 1000, y: 473, w: 24,  h: 70, mat: 'ice',   angle: 0 },
      { x: 900,  y: 427, w: 240, h: 20, mat: 'wood',  angle: 0 }, // 지붕판 (윗면 417)
      { x: 900,  y: 396, w: 40,  h: 40, mat: 'stone', angle: 0 }, // 지붕 위 돌
      { x: 760,  y: 488, w: 40,  h: 40, mat: 'stone', angle: 0 }, // 2층 좌측 돌 추
      { x: 1050, y: 488, w: 40,  h: 40, mat: 'stone', angle: 0 }  // 2층 우측 돌 추
    ],
    pigs: [
      { x: 810,  y: 598, r: 22 },  // 1층 왼쪽 칸
      { x: 1010, y: 598, r: 22 },  // 1층 오른쪽 칸
      { x: 850,  y: 486, r: 22 }   // 2층
    ]
  },
  {
    // 돌기둥 위 높은 발판 — 고각으로만 닿는다. 나머지 둘은 지상.
    id: 6, name: '공중 발판', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 1000, y: 510, w: 30,  h: 220, mat: 'stone', angle: 0 }, // 발판 기둥 (윗면 400)
      { x: 1120, y: 510, w: 30,  h: 220, mat: 'stone', angle: 0 },
      { x: 1060, y: 387, w: 180, h: 24,  mat: 'stone', angle: 0 }, // 발판 (윗면 375)
      { x: 1027, y: 570, w: 20,  h: 100, mat: 'ice',   angle: 0 }, // 발판 아래 얼음 칸막이
      { x: 1093, y: 570, w: 20,  h: 100, mat: 'ice',   angle: 0 },
      { x: 760,  y: 580, w: 24,  h: 80,  mat: 'wood',  angle: 0 }, // 지상 나무 집 (윗면 540)
      { x: 840,  y: 580, w: 24,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 800,  y: 529, w: 120, h: 20,  mat: 'wood',  angle: 0 }, // (윗면 519)
      { x: 770,  y: 488, w: 24,  h: 60,  mat: 'ice',   angle: 0 }, // (윗면 458)
      { x: 830,  y: 488, w: 24,  h: 60,  mat: 'ice',   angle: 0 },
      { x: 800,  y: 447, w: 100, h: 20,  mat: 'ice',   angle: 0 }, // (윗면 437)
      { x: 800,  y: 416, w: 40,  h: 40,  mat: 'stone', angle: 0 }
    ],
    pigs: [
      { x: 1060, y: 352, r: 22 },  // 공중 발판 위
      { x: 1060, y: 598, r: 22 },  // 발판 아래
      { x: 800,  y: 598, r: 22 }   // 나무 집 안
    ]
  },
  {
    // 돌벽 사이의 좁은 슬롯. 슬롯 안으로 떨어뜨려야만 돼지에 닿는다.
    id: 7, name: '좁은 틈', birds: 4, star2: 18000, star3: 30000,
    blocks: [
      { x: 700,  y: 520, w: 30,  h: 200, mat: 'stone', angle: 0 }, // 슬롯 1 벽 (윗면 420)
      { x: 780,  y: 520, w: 30,  h: 200, mat: 'stone', angle: 0 },
      { x: 900,  y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 }, // 슬롯 2 벽 (윗면 460)
      { x: 980,  y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 },
      { x: 940,  y: 449, w: 110, h: 20,  mat: 'ice',   angle: 0 }, // 슬롯 2 얼음 뚜껑
      { x: 1080, y: 580, w: 24,  h: 80,  mat: 'wood',  angle: 0 }, // 오른쪽 나무 집 (윗면 540)
      { x: 1180, y: 580, w: 24,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 1130, y: 529, w: 150, h: 20,  mat: 'wood',  angle: 0 }, // (윗면 519)
      { x: 1090, y: 488, w: 20,  h: 60,  mat: 'ice',   angle: 0 }, // (윗면 458)
      { x: 1170, y: 488, w: 20,  h: 60,  mat: 'ice',   angle: 0 },
      { x: 1130, y: 447, w: 120, h: 20,  mat: 'ice',   angle: 0 }, // (윗면 437)
      { x: 620,  y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 }, // 앞쪽 미끼 구조물 (윗면 560)
      { x: 650,  y: 590, w: 24,  h: 60,  mat: 'ice',   angle: 0 },
      { x: 635,  y: 549, w: 60,  h: 20,  mat: 'wood',  angle: 0 }
    ],
    pigs: [
      { x: 740,  y: 598, r: 22 },  // 슬롯 1 안
      { x: 940,  y: 598, r: 22 },  // 슬롯 2 안 (얼음 뚜껑 아래)
      { x: 1130, y: 598, r: 22 }   // 나무 집 안
    ]
  },
  {
    // 돌 외벽 + 나무 지붕 + 나무 내부. 정면은 돌, 지붕은 나무 — 위에서 떨어뜨려야 한다.
    id: 8, name: '돌 요새', birds: 5, star2: 23000, star3: 35500,
    blocks: [
      { x: 760,  y: 530, w: 30,  h: 180, mat: 'stone', angle: 0 }, // 정면 돌벽 (윗면 440)
      { x: 1100, y: 530, w: 30,  h: 180, mat: 'stone', angle: 0 }, // 후면 돌벽
      { x: 930,  y: 429, w: 380, h: 20,  mat: 'wood',  angle: 0 }, // 나무 지붕 (윗면 419)
      { x: 830,  y: 580, w: 24,  h: 80,  mat: 'wood',  angle: 0 }, // 내부 1층 기둥 (윗면 540)
      { x: 930,  y: 580, w: 24,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 1030, y: 580, w: 24,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 930,  y: 529, w: 260, h: 20,  mat: 'wood',  angle: 0 }, // 내부 상판 (윗면 519)
      { x: 860,  y: 488, w: 20,  h: 60,  mat: 'ice',   angle: 0 }, // 내부 2층 얼음 기둥 (윗면 458)
      { x: 1000, y: 488, w: 20,  h: 60,  mat: 'ice',   angle: 0 },
      { x: 930,  y: 447, w: 180, h: 20,  mat: 'ice',   angle: 0 }, // 내부 얼음 천장 (윗면 437)
      { x: 1150, y: 580, w: 24,  h: 80,  mat: 'ice',   angle: 0 }, // 후방 얼음 헛간 (윗면 540)
      { x: 1236, y: 580, w: 24,  h: 80,  mat: 'ice',   angle: 0 },
      { x: 1193, y: 529, w: 120, h: 20,  mat: 'ice',   angle: 0 },
      { x: 850,  y: 398, w: 40,  h: 40,  mat: 'stone', angle: 0 }, // 지붕 위 돌 3개
      { x: 930,  y: 398, w: 40,  h: 40,  mat: 'stone', angle: 0 },
      { x: 1010, y: 398, w: 40,  h: 40,  mat: 'stone', angle: 0 }
    ],
    pigs: [
      { x: 880,  y: 598, r: 22 },  // 요새 1층 왼쪽
      { x: 980,  y: 598, r: 22 },  // 요새 1층 오른쪽
      { x: 930,  y: 496, r: 22 },  // 요새 2층
      { x: 1200, y: 598, r: 22 }   // 후방 헛간
    ]
  },
  {
    // 얇은 기둥을 80px 간격으로 세운 도미노. 첫 칸을 넘어뜨리면 연쇄로 쓰러진다.
    id: 9, name: '도미노', birds: 5, star2: 23500, star3: 36500,
    blocks: [
      { x: 420,  y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 }, // 출발 블록
      { x: 480,  y: 560, w: 16,  h: 120, mat: 'ice',   angle: 0 }, // 첫 도미노 (얼음)
      { x: 560,  y: 560, w: 16,  h: 120, mat: 'wood',  angle: 0 }, // 도미노 열 (윗면 500)
      { x: 640,  y: 560, w: 16,  h: 120, mat: 'wood',  angle: 0 },
      { x: 720,  y: 560, w: 16,  h: 120, mat: 'wood',  angle: 0 },
      { x: 800,  y: 560, w: 16,  h: 120, mat: 'wood',  angle: 0 },
      { x: 880,  y: 560, w: 16,  h: 120, mat: 'wood',  angle: 0 },
      { x: 960,  y: 560, w: 16,  h: 120, mat: 'wood',  angle: 0 },
      { x: 1040, y: 560, w: 16,  h: 120, mat: 'wood',  angle: 0 },
      { x: 560,  y: 489, w: 30,  h: 20,  mat: 'stone', angle: 0 }, // 도미노 머리 돌 (무게추)
      { x: 800,  y: 489, w: 30,  h: 20,  mat: 'stone', angle: 0 },
      { x: 880,  y: 489, w: 30,  h: 20,  mat: 'stone', angle: 0 },
      { x: 680,  y: 489, w: 100, h: 20,  mat: 'wood',  angle: 0 }, // 두 도미노를 잇는 상판
      { x: 1000, y: 489, w: 100, h: 20,  mat: 'wood',  angle: 0 },
      { x: 1150, y: 590, w: 20,  h: 60,  mat: 'ice',   angle: 0 }, // 끝 얼음 칸막이
      { x: 1180, y: 585, w: 20,  h: 70,  mat: 'wood',  angle: 0 }, // 끝 탑 (윗면 550)
      { x: 1240, y: 585, w: 20,  h: 70,  mat: 'wood',  angle: 0 },
      { x: 1210, y: 539, w: 100, h: 20,  mat: 'wood',  angle: 0 }  // 탑 상판 (윗면 529)
    ],
    pigs: [
      { x: 680,  y: 598, r: 22 },  // 도미노 사이
      { x: 1000, y: 598, r: 22 },  // 도미노 사이
      { x: 1110, y: 598, r: 22 },  // 도미노 열 끝
      { x: 1210, y: 506, r: 22 }   // 탑 위
    ]
  },
  {
    // 3층 혼합 재질 성채 + 좌우 분산 초소.
    id: 10, name: '최종 성채', birds: 5, star2: 29000, star3: 42000,
    blocks: [
      { x: 800,  y: 575, w: 30,  h: 90,  mat: 'stone', angle: 0 }, // 1층 돌기둥 (윗면 530)
      { x: 920,  y: 575, w: 30,  h: 90,  mat: 'stone', angle: 0 },
      { x: 1040, y: 575, w: 30,  h: 90,  mat: 'stone', angle: 0 },
      { x: 920,  y: 519, w: 300, h: 20,  mat: 'wood',  angle: 0 }, // 1층 상판 (윗면 509)
      { x: 830,  y: 473, w: 24,  h: 70,  mat: 'wood',  angle: 0 }, // 2층 나무 기둥 (윗면 438)
      { x: 1010, y: 473, w: 24,  h: 70,  mat: 'wood',  angle: 0 },
      { x: 920,  y: 427, w: 240, h: 20,  mat: 'ice',   angle: 0 }, // 2층 상판 (윗면 417)
      { x: 870,  y: 386, w: 20,  h: 60,  mat: 'ice',   angle: 0 }, // 3층 얼음 기둥 (윗면 356)
      { x: 970,  y: 386, w: 20,  h: 60,  mat: 'ice',   angle: 0 },
      { x: 920,  y: 345, w: 160, h: 20,  mat: 'wood',  angle: 0 }, // 3층 지붕 (윗면 335)
      { x: 920,  y: 314, w: 40,  h: 40,  mat: 'stone', angle: 0 }, // 꼭대기 돌
      { x: 600,  y: 580, w: 20,  h: 80,  mat: 'ice',   angle: 0 }, // 왼쪽 얼음 초소 (윗면 540)
      { x: 680,  y: 580, w: 20,  h: 80,  mat: 'ice',   angle: 0 },
      { x: 640,  y: 529, w: 120, h: 20,  mat: 'ice',   angle: 0 },
      { x: 720,  y: 600, w: 40,  h: 40,  mat: 'stone', angle: 0 }, // 초소 옆 돌
      { x: 1100, y: 570, w: 24,  h: 100, mat: 'ice',   angle: 0 }, // 성채 뒤 얼음 벽
      { x: 1150, y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 }, // 오른쪽 나무 초소 (윗면 560)
      { x: 1220, y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 1185, y: 549, w: 110, h: 20,  mat: 'wood',  angle: 0 }, // (윗면 539)
      { x: 1185, y: 518, w: 40,  h: 40,  mat: 'stone', angle: 0 }
    ],
    pigs: [
      { x: 860, y: 598, r: 22 },   // 1층 왼쪽 칸
      { x: 980, y: 598, r: 22 },   // 1층 오른쪽 칸
      { x: 920, y: 496, r: 22 },   // 2층
      { x: 920, y: 394, r: 22 },   // 3층
      { x: 640, y: 598, r: 22 }    // 왼쪽 초소 안
    ]
  }
];
