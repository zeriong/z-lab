// stages.js — 모든 공용 상수 + STAGES 10개.
// 가장 먼저 로드되는 프로젝트 파일이다. 클래식 스크립트는 최상위 const 이름을 공유하므로
// 여기 선언된 이름을 다른 파일에서 다시 const로 선언하지 않는다.

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

// IMPACT_MIN / SETTLE_SPEED / SETTLE_FRAMES / FLIGHT_MAX_FRAMES 는 근거 없는 임의값이다.
// 수치 조정은 이 블록과 physics.js의 MATERIAL 두 곳에서만 한다.

// 스테이지 스키마: { id, name, birds, star2, star3, blocks, pigs } (7키)
//   blocks[i] = { x, y, w, h, mat: 'wood'|'ice'|'stone', angle }  (x, y는 중심 좌표)
//   pigs[i]   = { x, y, r }
// 좌표 규칙: 지면 위 블록 y = GROUND_Y - h/2, 얹는 블록은 아래 윗면에서 1px 띄움, x는 400~1240.
// 별 임계값: star2 = 돼지×5000 + 블록×200, star3 = 돼지×5000 + 블록×350 + 10000 (500 단위 반올림, §6 표 값).
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

  // 2. 2층 나무 상자 안에 돼지 1, 떨어진 지면에 돼지 1 — 두 번 맞혀야 한다.
  {
    id: 2, name: '나무 오두막', birds: 3, star2: 11000, star3: 22000,
    blocks: [
      { x: 820,  y: 580, w: 24,  h: 80, mat: 'wood', angle: 0 },
      { x: 940,  y: 580, w: 24,  h: 80, mat: 'wood', angle: 0 },
      { x: 880,  y: 529, w: 160, h: 20, mat: 'wood', angle: 0 },
      { x: 830,  y: 483, w: 24,  h: 70, mat: 'wood', angle: 0 },
      { x: 930,  y: 483, w: 24,  h: 70, mat: 'wood', angle: 0 },
      { x: 880,  y: 437, w: 140, h: 20, mat: 'wood', angle: 0 }
    ],
    pigs: [
      { x: 880,  y: 498, r: 20 },
      { x: 1130, y: 599, r: 20 }
    ]
  },

  // 3. 얼음 벽(앞) + 나무 지지대(뒤) + 나무 지붕 두 칸, 각 칸에 돼지.
  {
    id: 3, name: '얼음 창고', birds: 3, star2: 11500, star3: 23000,
    blocks: [
      { x: 780,  y: 570, w: 20,  h: 100, mat: 'ice',  angle: 0 },
      { x: 900,  y: 570, w: 24,  h: 100, mat: 'wood', angle: 0 },
      { x: 840,  y: 509, w: 160, h: 20,  mat: 'wood', angle: 0 },
      { x: 840,  y: 483, w: 40,  h: 30,  mat: 'ice',  angle: 0 },
      { x: 1020, y: 570, w: 20,  h: 100, mat: 'ice',  angle: 0 },
      { x: 1140, y: 570, w: 24,  h: 100, mat: 'wood', angle: 0 },
      { x: 1080, y: 509, w: 160, h: 20,  mat: 'wood', angle: 0 },
      { x: 1080, y: 483, w: 40,  h: 30,  mat: 'ice',  angle: 0 }
    ],
    pigs: [
      { x: 840,  y: 599, r: 20 },
      { x: 1080, y: 599, r: 20 }
    ]
  },

  // 4. 돌기둥 두 쌍 사이의 좁은 통로(위가 열림) 바닥에 돼지. 돌은 정면으로 뚫기 어렵다.
  {
    id: 4, name: '돌 기둥', birds: 4, star2: 12000, star3: 23000,
    blocks: [
      { x: 740,  y: 575, w: 30, h: 90,  mat: 'stone', angle: 0 },
      { x: 840,  y: 540, w: 40, h: 160, mat: 'stone', angle: 0 },
      { x: 960,  y: 540, w: 40, h: 160, mat: 'stone', angle: 0 },
      { x: 1060, y: 540, w: 40, h: 160, mat: 'stone', angle: 0 },
      { x: 1180, y: 540, w: 40, h: 160, mat: 'stone', angle: 0 },
      { x: 840,  y: 444, w: 40, h: 30,  mat: 'ice',   angle: 0 },
      { x: 960,  y: 444, w: 40, h: 30,  mat: 'ice',   angle: 0 },
      { x: 1060, y: 444, w: 40, h: 30,  mat: 'ice',   angle: 0 },
      { x: 1180, y: 444, w: 40, h: 30,  mat: 'ice',   angle: 0 }
    ],
    pigs: [
      { x: 900,  y: 599, r: 20 },
      { x: 1120, y: 599, r: 20 }
    ]
  },

  // 5. 나무 1층(지지대 3) + 얼음 2층. 아래층 지지대를 치면 위층이 무너진다.
  {
    id: 5, name: '2층 구조', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 770,  y: 580, w: 20,  h: 80, mat: 'ice',   angle: 0 },
      { x: 830,  y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 },
      { x: 950,  y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 },
      { x: 1070, y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 },
      { x: 950,  y: 519, w: 280, h: 20, mat: 'wood',  angle: 0 },
      { x: 850,  y: 468, w: 24,  h: 80, mat: 'ice',   angle: 0 },
      { x: 1050, y: 468, w: 24,  h: 80, mat: 'ice',   angle: 0 },
      { x: 950,  y: 417, w: 240, h: 20, mat: 'wood',  angle: 0 },
      { x: 880,  y: 391, w: 30,  h: 30, mat: 'ice',   angle: 0 },
      { x: 1020, y: 391, w: 30,  h: 30, mat: 'ice',   angle: 0 },
      { x: 950,  y: 367, w: 180, h: 16, mat: 'wood',  angle: 0 },
      { x: 1140, y: 580, w: 30,  h: 80, mat: 'stone', angle: 0 }
    ],
    pigs: [
      { x: 890,  y: 599, r: 20 },
      { x: 1010, y: 599, r: 20 },
      { x: 950,  y: 486, r: 22 }
    ]
  },

  // 6. 높은 발판 위 돼지 1 + 지상 쉼터 두 곳에 돼지 2 — 고각 사격.
  //    블록 스키마(6키)에 정적 플래그가 없으므로, "정적 발판"은 무거운 돌기둥 2개 + 돌 발판으로 대신한다.
  {
    id: 6, name: '공중 발판', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      { x: 1060, y: 520, w: 30,  h: 200, mat: 'stone', angle: 0 },
      { x: 1140, y: 520, w: 30,  h: 200, mat: 'stone', angle: 0 },
      { x: 1100, y: 409, w: 140, h: 20,  mat: 'stone', angle: 0 },
      { x: 1050, y: 378, w: 16,  h: 40,  mat: 'wood',  angle: 0 },
      { x: 1150, y: 378, w: 16,  h: 40,  mat: 'wood',  angle: 0 },
      { x: 1100, y: 350, w: 130, h: 14,  mat: 'wood',  angle: 0 },
      { x: 760,  y: 590, w: 20,  h: 60,  mat: 'ice',   angle: 0 },
      { x: 840,  y: 590, w: 20,  h: 60,  mat: 'ice',   angle: 0 },
      { x: 800,  y: 551, w: 120, h: 16,  mat: 'wood',  angle: 0 },
      { x: 910,  y: 595, w: 20,  h: 50,  mat: 'ice',   angle: 0 },
      { x: 990,  y: 595, w: 20,  h: 50,  mat: 'ice',   angle: 0 },
      { x: 950,  y: 562, w: 110, h: 14,  mat: 'ice',   angle: 0 }
    ],
    pigs: [
      { x: 1100, y: 380, r: 18 },
      { x: 800,  y: 599, r: 20 },
      { x: 950,  y: 599, r: 20 }
    ]
  },

  // 7. 돌 지붕이 앞으로 튀어나온 건물. 앞 돌벽과 지붕 사이의 틈(약 60px)으로만 안의 돼지에 닿는다.
  {
    id: 7, name: '좁은 틈', birds: 4, star2: 18000, star3: 30000,
    blocks: [
      { x: 765,  y: 565, w: 30,  h: 110, mat: 'stone', angle: 0 },
      { x: 900,  y: 535, w: 24,  h: 170, mat: 'wood',  angle: 0 },
      { x: 1040, y: 535, w: 24,  h: 170, mat: 'wood',  angle: 0 },
      { x: 1180, y: 535, w: 30,  h: 170, mat: 'stone', angle: 0 },
      { x: 970,  y: 439, w: 440, h: 20,  mat: 'stone', angle: 0 },
      { x: 765,  y: 398, w: 30,  h: 60,  mat: 'stone', angle: 0 },
      { x: 830,  y: 398, w: 24,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 1120, y: 398, w: 24,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 900,  y: 413, w: 30,  h: 30,  mat: 'ice',   angle: 0 },
      { x: 1040, y: 413, w: 30,  h: 30,  mat: 'ice',   angle: 0 },
      { x: 975,  y: 359, w: 340, h: 16,  mat: 'wood',  angle: 0 },
      { x: 975,  y: 330, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      { x: 975,  y: 302, w: 70,  h: 14,  mat: 'wood',  angle: 0 }
    ],
    pigs: [
      { x: 835,  y: 599, r: 20 },
      { x: 970,  y: 599, r: 20 },
      { x: 1110, y: 599, r: 20 }
    ]
  },

  // 8. 돌 외벽·돌 바닥/지붕 + 나무 내부 기둥. 2층 앞벽(측면)만 나무라 취약하다.
  {
    id: 8, name: '돌 요새', birds: 5, star2: 23000, star3: 35500,
    blocks: [
      { x: 740,  y: 595, w: 30,  h: 50,  mat: 'stone', angle: 0 },
      { x: 790,  y: 570, w: 30,  h: 100, mat: 'stone', angle: 0 },
      { x: 900,  y: 570, w: 24,  h: 100, mat: 'wood',  angle: 0 },
      { x: 1060, y: 570, w: 24,  h: 100, mat: 'wood',  angle: 0 },
      { x: 1170, y: 570, w: 30,  h: 100, mat: 'stone', angle: 0 },
      { x: 980,  y: 509, w: 420, h: 20,  mat: 'stone', angle: 0 },
      { x: 795,  y: 458, w: 24,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 900,  y: 458, w: 24,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 1060, y: 458, w: 24,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 1165, y: 458, w: 30,  h: 80,  mat: 'stone', angle: 0 },
      { x: 980,  y: 407, w: 420, h: 20,  mat: 'stone', angle: 0 },
      { x: 820,  y: 376, w: 40,  h: 40,  mat: 'stone', angle: 0 },
      { x: 980,  y: 376, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      { x: 1140, y: 376, w: 40,  h: 40,  mat: 'stone', angle: 0 },
      { x: 980,  y: 347, w: 360, h: 16,  mat: 'wood',  angle: 0 },
      { x: 980,  y: 318, w: 40,  h: 40,  mat: 'stone', angle: 0 }
    ],
    pigs: [
      { x: 845,  y: 601, r: 18 },
      { x: 980,  y: 599, r: 20 },
      { x: 1113, y: 601, r: 18 },
      { x: 980,  y: 478, r: 20 }
    ]
  },

  // 9. 얇은 나무 기둥 8개를 줄세움. 첫 칸을 치면 연쇄로 넘어져 끝의 탑을 친다.
  {
    id: 9, name: '도미노', birds: 5, star2: 23500, star3: 36500,
    blocks: [
      { x: 500,  y: 555, w: 14,  h: 130, mat: 'wood', angle: 0 },
      { x: 555,  y: 555, w: 14,  h: 130, mat: 'wood', angle: 0 },
      { x: 610,  y: 555, w: 14,  h: 130, mat: 'wood', angle: 0 },
      { x: 665,  y: 555, w: 14,  h: 130, mat: 'wood', angle: 0 },
      { x: 720,  y: 555, w: 14,  h: 130, mat: 'wood', angle: 0 },
      { x: 810,  y: 555, w: 14,  h: 130, mat: 'wood', angle: 0 },
      { x: 865,  y: 555, w: 14,  h: 130, mat: 'wood', angle: 0 },
      { x: 920,  y: 555, w: 14,  h: 130, mat: 'wood', angle: 0 },
      { x: 1010, y: 570, w: 20,  h: 100, mat: 'wood', angle: 0 },
      { x: 1110, y: 570, w: 20,  h: 100, mat: 'wood', angle: 0 },
      { x: 1210, y: 570, w: 20,  h: 100, mat: 'wood', angle: 0 },
      { x: 1110, y: 509, w: 240, h: 20,  mat: 'wood', angle: 0 },
      { x: 1030, y: 458, w: 20,  h: 80,  mat: 'ice',  angle: 0 },
      { x: 1190, y: 458, w: 20,  h: 80,  mat: 'ice',  angle: 0 },
      { x: 1110, y: 409, w: 200, h: 16,  mat: 'wood', angle: 0 },
      { x: 1060, y: 385, w: 30,  h: 30,  mat: 'ice',  angle: 0 },
      { x: 1160, y: 385, w: 30,  h: 30,  mat: 'ice',  angle: 0 },
      { x: 1110, y: 362, w: 140, h: 14,  mat: 'wood', angle: 0 }
    ],
    pigs: [
      { x: 765,  y: 601, r: 18 },
      { x: 1060, y: 601, r: 18 },
      { x: 1160, y: 601, r: 18 },
      { x: 1110, y: 478, r: 20 }
    ]
  },

  // 10. 왼쪽 전초(얼음/나무/돌) + 3층 혼합 재질 성채 + 앞뒤 방벽. 돼지 5마리 분산 배치.
  {
    id: 10, name: '최종 성채', birds: 5, star2: 29000, star3: 42000,
    blocks: [
      { x: 600,  y: 585, w: 20,  h: 70, mat: 'ice',   angle: 0 },
      { x: 680,  y: 585, w: 20,  h: 70, mat: 'ice',   angle: 0 },
      { x: 640,  y: 541, w: 120, h: 16, mat: 'wood',  angle: 0 },
      { x: 640,  y: 517, w: 30,  h: 30, mat: 'stone', angle: 0 },
      { x: 820,  y: 590, w: 30,  h: 60, mat: 'stone', angle: 0 },
      { x: 820,  y: 544, w: 30,  h: 30, mat: 'ice',   angle: 0 },
      { x: 890,  y: 575, w: 30,  h: 90, mat: 'stone', angle: 0 },
      { x: 1030, y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 },
      { x: 1170, y: 575, w: 30,  h: 90, mat: 'stone', angle: 0 },
      { x: 1030, y: 519, w: 330, h: 20, mat: 'wood',  angle: 0 },
      { x: 910,  y: 468, w: 20,  h: 80, mat: 'ice',   angle: 0 },
      { x: 1030, y: 468, w: 20,  h: 80, mat: 'wood',  angle: 0 },
      { x: 1150, y: 468, w: 20,  h: 80, mat: 'ice',   angle: 0 },
      { x: 1090, y: 493, w: 30,  h: 30, mat: 'ice',   angle: 0 },
      { x: 1030, y: 417, w: 280, h: 20, mat: 'stone', angle: 0 },
      { x: 950,  y: 371, w: 20,  h: 70, mat: 'wood',  angle: 0 },
      { x: 1110, y: 371, w: 20,  h: 70, mat: 'wood',  angle: 0 },
      { x: 1030, y: 327, w: 200, h: 16, mat: 'wood',  angle: 0 },
      { x: 1030, y: 298, w: 40,  h: 40, mat: 'ice',   angle: 0 },
      { x: 1220, y: 590, w: 24,  h: 60, mat: 'wood',  angle: 0 }
    ],
    pigs: [
      { x: 640,  y: 601, r: 18 },
      { x: 960,  y: 599, r: 20 },
      { x: 1100, y: 599, r: 20 },
      { x: 970,  y: 488, r: 20 },
      { x: 1030, y: 386, r: 20 }
    ]
  }
];
