// stages.js — 모든 공용 상수 + STAGES 10개.
// 프로젝트 파일 중 가장 먼저 로드된다. 클래식 스크립트는 최상위 이름을 공유하므로
// 여기서 선언한 이름은 다른 파일에서 다시 const로 선언하지 않는다.

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

// 좌표 규칙
// - x, y는 중심 좌표 (Bodies.rectangle / circle 기준)
// - 지면 위 블록: y = GROUND_Y - h/2
// - 얹는 블록: y = (아래 블록 윗면) - h/2 - 1  (1px 띄움 — 초기 겹침 방지)
// - 돼지: y = (받치는 면) - r - 1
// - 배치는 x 400~1240 사이
// 별 임계값: star2 = 돼지×5000 + 블록×200, star3 = 돼지×5000 + 블록×350 + 10000 (500 단위 반올림)

const STAGES = [
  {
    // 1. 기둥 2 + 상판 1, 그 위 돼지
    id: 1, name: '첫 발사', birds: 3, star2: 5500, star3: 16000,
    blocks: [
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 548, w: 140, h: 24, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 950, y: 512, r: 22 } ]
  },
  {
    // 2. 2층 나무 상자 — 1층 안에 돼지 1, 2층 안에 돼지 1 (층별 분리 배치)
    id: 2, name: '나무 오두막', birds: 3, star2: 11000, star3: 22000,
    blocks: [
      { x: 850, y: 585, w: 24,  h: 70, mat: 'wood', angle: 0 },   // 550..620
      { x: 950, y: 585, w: 24,  h: 70, mat: 'wood', angle: 0 },
      { x: 900, y: 539, w: 140, h: 20, mat: 'wood', angle: 0 },   // 529..549
      { x: 860, y: 498, w: 24,  h: 60, mat: 'wood', angle: 0 },   // 468..528
      { x: 940, y: 498, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 900, y: 457, w: 120, h: 20, mat: 'wood', angle: 0 }    // 447..467
    ],
    pigs: [
      { x: 900, y: 599, r: 20 },
      { x: 900, y: 508, r: 20 }
    ]
  },
  {
    // 3. 얼음 벽 뒤 돼지 + 나무 지지대, 지붕 위 돼지는 얼음 난간 뒤
    id: 3, name: '얼음 창고', birds: 3, star2: 11500, star3: 23000,
    blocks: [
      { x: 690, y: 595, w: 40,  h: 50, mat: 'ice',  angle: 0 },   // 앞 얼음 턱 570..620
      { x: 760, y: 585, w: 30,  h: 70, mat: 'ice',  angle: 0 },   // 얼음 벽 550..620
      { x: 760, y: 514, w: 30,  h: 70, mat: 'ice',  angle: 0 },   // 얼음 벽 479..549
      { x: 900, y: 585, w: 24,  h: 70, mat: 'wood', angle: 0 },   // 나무 지지대
      { x: 900, y: 514, w: 24,  h: 70, mat: 'wood', angle: 0 },
      { x: 830, y: 468, w: 180, h: 20, mat: 'wood', angle: 0 },   // 지붕 458..478
      { x: 760, y: 432, w: 20,  h: 50, mat: 'ice',  angle: 0 },   // 난간 407..457
      { x: 900, y: 432, w: 20,  h: 50, mat: 'ice',  angle: 0 }
    ],
    pigs: [
      { x: 830, y: 599, r: 20 },
      { x: 830, y: 437, r: 20 }
    ]
  },
  {
    // 4. 돌기둥 사이 좁은 통로(세로 틈) — 돌은 못 뚫으니 틈으로 떨어뜨려야 한다
    id: 4, name: '돌 기둥', birds: 4, star2: 12000, star3: 23000,
    blocks: [
      { x: 740,  y: 555, w: 30,  h: 130, mat: 'stone', angle: 0 }, // 490..620
      { x: 840,  y: 555, w: 30,  h: 130, mat: 'stone', angle: 0 },
      { x: 960,  y: 555, w: 30,  h: 130, mat: 'stone', angle: 0 },
      { x: 900,  y: 479, w: 140, h: 20,  mat: 'wood',  angle: 0 }, // 두 번째 틈 뚜껑 469..489
      { x: 740,  y: 469, w: 30,  h: 40,  mat: 'ice',   angle: 0 }, // 449..489
      { x: 1040, y: 585, w: 24,  h: 70,  mat: 'wood',  angle: 0 },
      { x: 1120, y: 585, w: 24,  h: 70,  mat: 'wood',  angle: 0 },
      { x: 1080, y: 539, w: 120, h: 20,  mat: 'wood',  angle: 0 }, // 529..549
      { x: 1080, y: 508, w: 40,  h: 40,  mat: 'ice',   angle: 0 }  // 488..528
    ],
    pigs: [
      { x: 790, y: 599, r: 20 },   // 첫 번째 틈 (755..825)
      { x: 900, y: 599, r: 20 }    // 두 번째 틈 (855..945), 뚜껑 아래
    ]
  },
  {
    // 5. 2층 구조 — 1층 나무 지지대를 치면 위층이 무너진다
    id: 5, name: '2층 구조', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 760,  y: 595, w: 30,  h: 50, mat: 'ice',  angle: 0 },  // 앞 얼음 턱
      { x: 840,  y: 580, w: 24,  h: 80, mat: 'wood', angle: 0 },  // 1층 540..620
      { x: 960,  y: 580, w: 24,  h: 80, mat: 'wood', angle: 0 },
      { x: 1080, y: 580, w: 24,  h: 80, mat: 'wood', angle: 0 },
      { x: 960,  y: 529, w: 270, h: 20, mat: 'wood', angle: 0 },  // 1층 천장 519..539
      { x: 850,  y: 483, w: 24,  h: 70, mat: 'wood', angle: 0 },  // 2층 448..518
      { x: 960,  y: 483, w: 24,  h: 70, mat: 'wood', angle: 0 },
      { x: 1070, y: 483, w: 24,  h: 70, mat: 'wood', angle: 0 },
      { x: 960,  y: 437, w: 260, h: 20, mat: 'wood', angle: 0 },  // 2층 지붕 427..447
      { x: 1015, y: 493, w: 30,  h: 50, mat: 'ice',  angle: 0 },  // 2층 오른칸 468..518
      { x: 900,  y: 406, w: 40,  h: 40, mat: 'ice',  angle: 0 },  // 옥상 386..426
      { x: 1020, y: 406, w: 40,  h: 40, mat: 'ice',  angle: 0 }
    ],
    pigs: [
      { x: 900,  y: 599, r: 20 },
      { x: 1020, y: 599, r: 20 },
      { x: 905,  y: 498, r: 20 }
    ]
  },
  {
    // 6. 공중 발판 위 돼지 1 + 지상 돼지 2 — 고각 사격
    //    블록 스키마(6키)에 정적 여부를 넣을 칸이 없어, "정적 발판"을 무거운 돌기둥 탑 위 돌 발판으로 표현했다.
    id: 6, name: '공중 발판', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 720,  y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 }, // 지상 쉼터 1
      { x: 800,  y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 760,  y: 549, w: 120, h: 20,  mat: 'wood',  angle: 0 }, // 539..559
      { x: 760,  y: 523, w: 60,  h: 30,  mat: 'ice',   angle: 0 }, // 508..538
      { x: 880,  y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 }, // 지상 쉼터 2
      { x: 960,  y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 920,  y: 549, w: 120, h: 20,  mat: 'wood',  angle: 0 },
      { x: 1080, y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 }, // 발판 기둥 460..620
      { x: 1160, y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 },
      { x: 1120, y: 449, w: 140, h: 20,  mat: 'stone', angle: 0 }, // 공중 발판 439..459
      { x: 1065, y: 418, w: 20,  h: 40,  mat: 'ice',   angle: 0 }, // 398..438
      { x: 1175, y: 418, w: 20,  h: 40,  mat: 'ice',   angle: 0 }
    ],
    pigs: [
      { x: 760,  y: 599, r: 20 },
      { x: 920,  y: 599, r: 20 },
      { x: 1120, y: 418, r: 20 }
    ]
  },
  {
    // 7. 좁은 틈 — 앞벽 윗면과 돌 지붕 사이 50px 창, 오른쪽 돌벽 사이 세로 틈
    id: 7, name: '좁은 틈', birds: 4, star2: 18000, star3: 30000,
    blocks: [
      { x: 700,  y: 580, w: 30,  h: 80,  mat: 'stone', angle: 0 }, // 앞벽 540..620
      { x: 700,  y: 509, w: 30,  h: 60,  mat: 'stone', angle: 0 }, // 앞벽 479..539
      { x: 820,  y: 525, w: 30,  h: 190, mat: 'stone', angle: 0 }, // 지붕 기둥 430..620
      { x: 960,  y: 525, w: 30,  h: 190, mat: 'stone', angle: 0 },
      { x: 830,  y: 419, w: 300, h: 20,  mat: 'stone', angle: 0 }, // 지붕 409..429 (680..980)
      { x: 848,  y: 590, w: 20,  h: 60,  mat: 'wood',  angle: 0 }, // 안쪽 나무 선반
      { x: 932,  y: 590, w: 20,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 890,  y: 549, w: 104, h: 20,  mat: 'wood',  angle: 0 }, // 539..559
      { x: 760,  y: 388, w: 30,  h: 40,  mat: 'ice',   angle: 0 }, // 368..408
      { x: 900,  y: 388, w: 30,  h: 40,  mat: 'ice',   angle: 0 },
      { x: 1060, y: 570, w: 30,  h: 100, mat: 'stone', angle: 0 }, // 520..620
      { x: 1060, y: 479, w: 30,  h: 80,  mat: 'stone', angle: 0 }, // 439..519
      { x: 1200, y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 }, // 460..620
      { x: 1200, y: 439, w: 40,  h: 40,  mat: 'wood',  angle: 0 }  // 419..459
    ],
    pigs: [
      { x: 760,  y: 599, r: 20 },  // 앞벽 뒤 (715..805)
      { x: 890,  y: 599, r: 20 },  // 나무 선반 아래
      { x: 1130, y: 599, r: 20 }   // 돌벽 사이 세로 틈 (1075..1185)
    ]
  },
  {
    // 8. 돌 외벽(앞·지붕) + 나무 내부, 오른쪽 측면과 별채만 나무라 취약
    id: 8, name: '돌 요새', birds: 5, star2: 23000, star3: 35500,
    blocks: [
      { x: 720,  y: 595, w: 40,  h: 50, mat: 'stone', angle: 0 }, // 앞 돌 버팀
      { x: 780,  y: 580, w: 30,  h: 80, mat: 'stone', angle: 0 }, // 1층 540..620
      { x: 900,  y: 580, w: 24,  h: 80, mat: 'wood',  angle: 0 },
      { x: 1020, y: 580, w: 24,  h: 80, mat: 'wood',  angle: 0 },
      { x: 900,  y: 529, w: 270, h: 20, mat: 'wood',  angle: 0 }, // 519..539
      { x: 780,  y: 483, w: 30,  h: 70, mat: 'stone', angle: 0 }, // 2층 448..518
      { x: 900,  y: 483, w: 24,  h: 70, mat: 'wood',  angle: 0 },
      { x: 1020, y: 483, w: 24,  h: 70, mat: 'wood',  angle: 0 },
      { x: 900,  y: 437, w: 270, h: 20, mat: 'stone', angle: 0 }, // 돌 지붕 427..447
      { x: 785,  y: 406, w: 30,  h: 40, mat: 'stone', angle: 0 }, // 성가퀴 386..426
      { x: 1015, y: 406, w: 30,  h: 40, mat: 'stone', angle: 0 },
      { x: 1100, y: 580, w: 24,  h: 80, mat: 'wood',  angle: 0 }, // 나무 별채
      { x: 1180, y: 580, w: 24,  h: 80, mat: 'wood',  angle: 0 },
      { x: 1140, y: 529, w: 120, h: 20, mat: 'wood',  angle: 0 }, // 519..539
      { x: 1140, y: 498, w: 40,  h: 40, mat: 'wood',  angle: 0 }, // 478..518
      { x: 1140, y: 462, w: 30,  h: 30, mat: 'ice',   angle: 0 }  // 447..477
    ],
    pigs: [
      { x: 840, y: 599, r: 20 },
      { x: 960, y: 599, r: 20 },
      { x: 840, y: 498, r: 20 },
      { x: 960, y: 498, r: 20 }
    ]
  },
  {
    // 9. 도미노 — 얇은 기둥 12개(간격 60, 높이 110). 첫 칸을 치면 끝의 발판까지 연쇄
    id: 9, name: '도미노', birds: 5, star2: 23500, star3: 36500,
    blocks: [
      { x: 420,  y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 480,  y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 540,  y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 600,  y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 660,  y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 720,  y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 780,  y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 840,  y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 900,  y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 960,  y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 1020, y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 1080, y: 565, w: 14,  h: 110, mat: 'wood', angle: 0 },
      { x: 1140, y: 590, w: 20,  h: 60,  mat: 'wood', angle: 0 },  // 끝 발판 560..620
      { x: 1220, y: 590, w: 20,  h: 60,  mat: 'wood', angle: 0 },
      { x: 1180, y: 549, w: 110, h: 20,  mat: 'wood', angle: 0 },  // 539..559 (1125..1235)
      { x: 1140, y: 523, w: 20,  h: 30,  mat: 'ice',  angle: 0 },  // 508..538
      { x: 1222, y: 523, w: 20,  h: 30,  mat: 'ice',  angle: 0 },
      { x: 1180, y: 600, w: 40,  h: 40,  mat: 'ice',  angle: 0 }   // 발판 아래 580..620
    ],
    pigs: [
      { x: 690,  y: 601, r: 18 },  // 660·720 기둥 사이
      { x: 870,  y: 601, r: 18 },  // 840·900 사이
      { x: 1050, y: 601, r: 18 },  // 1020·1080 사이
      { x: 1180, y: 520, r: 18 }   // 끝 발판 위
    ]
  },
  {
    // 10. 3층 혼합 재질 성채 + 왼쪽 전초 + 오른쪽 돌탑 (분산 배치)
    id: 10, name: '최종 성채', birds: 5, star2: 29000, star3: 42000,
    blocks: [
      { x: 820,  y: 580, w: 30,  h: 80,  mat: 'stone', angle: 0 }, // 1층 540..620
      { x: 940,  y: 580, w: 24,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 1060, y: 580, w: 30,  h: 80,  mat: 'stone', angle: 0 },
      { x: 940,  y: 529, w: 290, h: 20,  mat: 'wood',  angle: 0 }, // 519..539
      { x: 830,  y: 483, w: 24,  h: 70,  mat: 'ice',   angle: 0 }, // 2층 448..518
      { x: 940,  y: 483, w: 24,  h: 70,  mat: 'wood',  angle: 0 },
      { x: 1050, y: 483, w: 24,  h: 70,  mat: 'ice',   angle: 0 },
      { x: 995,  y: 498, w: 40,  h: 40,  mat: 'wood',  angle: 0 }, // 2층 오른칸 상자 478..518
      { x: 940,  y: 437, w: 260, h: 20,  mat: 'stone', angle: 0 }, // 427..447
      { x: 870,  y: 396, w: 20,  h: 60,  mat: 'wood',  angle: 0 }, // 3층 366..426
      { x: 1010, y: 396, w: 20,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 940,  y: 355, w: 180, h: 20,  mat: 'wood',  angle: 0 }, // 345..365
      { x: 940,  y: 329, w: 40,  h: 30,  mat: 'ice',   angle: 0 }, // 314..344
      { x: 570,  y: 590, w: 20,  h: 60,  mat: 'wood',  angle: 0 }, // 왼쪽 전초 560..620
      { x: 630,  y: 590, w: 20,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 600,  y: 549, w: 90,  h: 20,  mat: 'ice',   angle: 0 }, // 539..559
      { x: 565,  y: 518, w: 16,  h: 40,  mat: 'ice',   angle: 0 }, // 498..538
      { x: 1170, y: 560, w: 40,  h: 120, mat: 'stone', angle: 0 }, // 오른쪽 돌탑 500..620
      { x: 1170, y: 479, w: 40,  h: 40,  mat: 'ice',   angle: 0 }, // 459..499
      { x: 1170, y: 438, w: 30,  h: 40,  mat: 'wood',  angle: 0 }  // 418..458
    ],
    pigs: [
      { x: 880,  y: 599, r: 20 },
      { x: 1000, y: 599, r: 20 },
      { x: 885,  y: 498, r: 20 },
      { x: 940,  y: 406, r: 20 },
      { x: 605,  y: 518, r: 20 }
    ]
  }
];
