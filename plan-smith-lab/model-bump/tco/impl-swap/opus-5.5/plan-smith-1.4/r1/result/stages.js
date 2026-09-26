// stages.js — 모든 공용 상수 + STAGES 10개.
// 가장 먼저 로드되는 프로젝트 파일이다. 여기 선언된 최상위 const 이름은
// 다른 파일에서 다시 선언하지 않는다(클래식 스크립트는 최상위 이름을 공유한다).

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

// 스테이지 스키마: { id, name, birds, star2, star3, blocks, pigs }
//   blocks[i] = { x, y, w, h, mat: 'wood'|'ice'|'stone', angle }
//   pigs[i]   = { x, y, r }
// 좌표 규칙:
//   - x, y는 중심 좌표 (Bodies.rectangle / Bodies.circle 이 중심 기준)
//   - 지면 위 블록: y = GROUND_Y - h/2
//   - 위에 얹는 블록: y = (아래 블록 윗면) - h/2 - 1  (초기 겹침 방지로 1px 띄움)
//   - 돼지: y = (받침 윗면) - r - 1
//   - 배치는 x 400~1240 사이
// 별 임계값: star2 = 돼지×5000 + 블록×200, star3 = 돼지×5000 + 블록×350 + 10000 (500 단위 반올림)
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
    // 2층 나무 상자. 돼지는 1층·2층에 한 마리씩 나눠 둔다.
    id: 2, name: '나무 오두막', birds: 3, star2: 11000, star3: 22000,
    blocks: [
      // 1층 (기둥 윗면 540)
      { x: 770, y: 580, w: 24,  h: 80, mat: 'wood', angle: 0 },
      { x: 870, y: 580, w: 24,  h: 80, mat: 'wood', angle: 0 },
      { x: 820, y: 529, w: 150, h: 20, mat: 'wood', angle: 0 },
      // 2층 (바닥 윗면 519, 기둥 윗면 458)
      { x: 785, y: 488, w: 20,  h: 60, mat: 'wood', angle: 0 },
      { x: 855, y: 488, w: 20,  h: 60, mat: 'wood', angle: 0 },
      { x: 820, y: 447, w: 110, h: 20, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 820, y: 599, r: 20 }, { x: 820, y: 498, r: 20 } ]
  },
  {
    // 얼음 앞벽 뒤에 돼지, 뒤쪽은 나무 지지대. 얼음은 한 방에 깨진다.
    id: 3, name: '얼음 창고', birds: 3, star2: 11500, star3: 23000,
    blocks: [
      // 왼쪽 창고 (벽 윗면 520)
      { x: 700,  y: 570, w: 20,  h: 100, mat: 'ice',  angle: 0 },
      { x: 800,  y: 570, w: 20,  h: 100, mat: 'wood', angle: 0 },
      { x: 750,  y: 509, w: 140, h: 20,  mat: 'wood', angle: 0 },
      { x: 750,  y: 478, w: 40,  h: 40,  mat: 'ice',  angle: 0 },
      // 오른쪽 창고 (벽 윗면 500)
      { x: 960,  y: 560, w: 20,  h: 120, mat: 'ice',  angle: 0 },
      { x: 1080, y: 560, w: 20,  h: 120, mat: 'wood', angle: 0 },
      { x: 1020, y: 489, w: 160, h: 20,  mat: 'wood', angle: 0 },
      { x: 1020, y: 463, w: 60,  h: 30,  mat: 'ice',  angle: 0 }
    ],
    pigs: [ { x: 750, y: 599, r: 20 }, { x: 1020, y: 597, r: 22 } ]
  },
  {
    // 돌기둥 사이 좁은 통로에 돼지. 돌은 잘 안 부서지니 나무 상판을 노려야 한다.
    id: 4, name: '돌 기둥', birds: 4, star2: 12000, star3: 23000,
    blocks: [
      { x: 590,  y: 565, w: 30,  h: 110, mat: 'stone', angle: 0 },
      // 돌기둥 3개 (윗면 480)
      { x: 700,  y: 550, w: 30,  h: 140, mat: 'stone', angle: 0 },
      { x: 820,  y: 550, w: 30,  h: 140, mat: 'stone', angle: 0 },
      { x: 940,  y: 550, w: 30,  h: 140, mat: 'stone', angle: 0 },
      // 나무 상판 2장 (윗면 459, 두 상판 사이 4px 간격)
      { x: 755,  y: 469, w: 126, h: 20,  mat: 'wood',  angle: 0 },
      { x: 885,  y: 469, w: 126, h: 20,  mat: 'wood',  angle: 0 },
      { x: 755,  y: 433, w: 30,  h: 50,  mat: 'ice',   angle: 0 },
      { x: 885,  y: 433, w: 30,  h: 50,  mat: 'ice',   angle: 0 },
      { x: 1030, y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 }
    ],
    pigs: [ { x: 760, y: 597, r: 22 }, { x: 880, y: 597, r: 22 } ]
  },
  {
    // 아래층 지지대(양끝 얼음)를 치면 위층이 통째로 무너진다.
    id: 5, name: '2층 구조', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      // 1층 (기둥 윗면 520)
      { x: 740,  y: 570, w: 24,  h: 100, mat: 'ice',  angle: 0 },
      { x: 890,  y: 570, w: 24,  h: 100, mat: 'wood', angle: 0 },
      { x: 1040, y: 570, w: 24,  h: 100, mat: 'ice',  angle: 0 },
      { x: 890,  y: 509, w: 340, h: 20,  mat: 'wood', angle: 0 },
      // 2층 (바닥 윗면 499, 기둥 윗면 408)
      { x: 760,  y: 453, w: 20,  h: 90,  mat: 'wood', angle: 0 },
      { x: 890,  y: 453, w: 20,  h: 90,  mat: 'wood', angle: 0 },
      { x: 1020, y: 453, w: 20,  h: 90,  mat: 'wood', angle: 0 },
      { x: 955,  y: 478, w: 40,  h: 40,  mat: 'wood', angle: 0 },
      { x: 890,  y: 397, w: 300, h: 20,  mat: 'wood', angle: 0 },
      // 지붕 위 (윗면 387)
      { x: 800,  y: 366, w: 40,  h: 40,  mat: 'ice',  angle: 0 },
      { x: 890,  y: 374, w: 60,  h: 24,  mat: 'ice',  angle: 0 },
      { x: 980,  y: 366, w: 40,  h: 40,  mat: 'ice',  angle: 0 }
    ],
    pigs: [ { x: 815, y: 599, r: 20 }, { x: 965, y: 599, r: 20 }, { x: 825, y: 478, r: 20 } ]
  },
  {
    // 높은 발판 위 돼지 1 + 지상 오두막 돼지 2. 발판 돼지는 고각으로 노린다.
    // 스키마(블록 6키)에 정적 플래그가 없으므로 "정적 발판"은 높은 돌기둥 + 돌 발판으로 만든다.
    id: 6, name: '공중 발판', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      // 발판 탑 (기둥 윗면 420, 발판 윗면 395, 울타리 윗면 344)
      { x: 1040, y: 520, w: 30,  h: 200, mat: 'stone', angle: 0 },
      { x: 1160, y: 520, w: 30,  h: 200, mat: 'stone', angle: 0 },
      { x: 1100, y: 407, w: 180, h: 24,  mat: 'stone', angle: 0 },
      { x: 1030, y: 369, w: 16,  h: 50,  mat: 'wood',  angle: 0 },
      { x: 1170, y: 369, w: 16,  h: 50,  mat: 'wood',  angle: 0 },
      { x: 1100, y: 335, w: 170, h: 16,  mat: 'wood',  angle: 0 },
      // 지상 오두막 2채 (기둥 윗면 550)
      { x: 600,  y: 585, w: 20,  h: 70,  mat: 'wood',  angle: 0 },
      { x: 680,  y: 585, w: 20,  h: 70,  mat: 'wood',  angle: 0 },
      { x: 640,  y: 539, w: 110, h: 20,  mat: 'wood',  angle: 0 },
      { x: 820,  y: 585, w: 20,  h: 70,  mat: 'ice',   angle: 0 },
      { x: 900,  y: 585, w: 20,  h: 70,  mat: 'ice',   angle: 0 },
      { x: 860,  y: 539, w: 110, h: 20,  mat: 'ice',   angle: 0 }
    ],
    pigs: [ { x: 1100, y: 372, r: 22 }, { x: 640, y: 599, r: 20 }, { x: 860, y: 599, r: 20 } ]
  },
  {
    // 두 방 사이로 위가 열린 76px 틈. 틈으로 떨어뜨려야 가운데 돼지에 닿고,
    // 틈 양쪽 나무 내벽을 부숴야 양옆 방의 돼지에 닿는다.
    id: 7, name: '좁은 틈', birds: 4, star2: 18000, star3: 30000,
    blocks: [
      { x: 560,  y: 575, w: 30,  h: 90,  mat: 'stone', angle: 0 },
      // 왼쪽 방 (벽 윗면 440, 지붕 윗면 419, 얼음 윗면 378)
      { x: 660,  y: 530, w: 30,  h: 180, mat: 'stone', angle: 0 },
      { x: 800,  y: 530, w: 24,  h: 180, mat: 'wood',  angle: 0 },
      { x: 730,  y: 429, w: 170, h: 20,  mat: 'stone', angle: 0 },
      { x: 690,  y: 398, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      { x: 770,  y: 398, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      { x: 730,  y: 369, w: 120, h: 16,  mat: 'wood',  angle: 0 },
      // 오른쪽 방
      { x: 900,  y: 530, w: 24,  h: 180, mat: 'wood',  angle: 0 },
      { x: 1040, y: 530, w: 30,  h: 180, mat: 'stone', angle: 0 },
      { x: 970,  y: 429, w: 170, h: 20,  mat: 'stone', angle: 0 },
      { x: 930,  y: 398, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      { x: 1010, y: 398, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      { x: 970,  y: 369, w: 120, h: 16,  mat: 'wood',  angle: 0 },
      { x: 1120, y: 600, w: 40,  h: 40,  mat: 'ice',   angle: 0 }
    ],
    pigs: [ { x: 850, y: 599, r: 20 }, { x: 730, y: 599, r: 20 }, { x: 970, y: 599, r: 20 } ]
  },
  {
    // 돌 외벽 + 나무 내벽/내부. 돌을 정면으로 치기보다 약한 곳을 찾아야 한다.
    id: 8, name: '돌 요새', birds: 5, star2: 23000, star3: 35500,
    blocks: [
      { x: 620,  y: 580, w: 30,  h: 80,  mat: 'stone', angle: 0 },
      // 1층 (벽 윗면 460)
      { x: 700,  y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 },
      { x: 833,  y: 540, w: 20,  h: 160, mat: 'wood',  angle: 0 },
      { x: 966,  y: 540, w: 20,  h: 160, mat: 'wood',  angle: 0 },
      { x: 1100, y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 },
      { x: 900,  y: 447, w: 430, h: 24,  mat: 'stone', angle: 0 },
      // 2층 (바닥 윗면 435, 벽 윗면 344)
      { x: 720,  y: 389, w: 30,  h: 90,  mat: 'stone', angle: 0 },
      { x: 900,  y: 389, w: 20,  h: 90,  mat: 'wood',  angle: 0 },
      { x: 1080, y: 389, w: 30,  h: 90,  mat: 'stone', angle: 0 },
      { x: 987,  y: 414, w: 40,  h: 40,  mat: 'wood',  angle: 0 },
      { x: 900,  y: 333, w: 390, h: 20,  mat: 'stone', angle: 0 },
      // 옥상 (윗면 323)
      { x: 780,  y: 302, w: 30,  h: 40,  mat: 'wood',  angle: 0 },
      { x: 840,  y: 302, w: 30,  h: 40,  mat: 'ice',   angle: 0 },
      { x: 900,  y: 302, w: 30,  h: 40,  mat: 'wood',  angle: 0 },
      { x: 1020, y: 302, w: 30,  h: 40,  mat: 'wood',  angle: 0 },
      // 뒤편 상자
      { x: 1170, y: 600, w: 40,  h: 40,  mat: 'wood',  angle: 0 }
    ],
    pigs: [
      { x: 769,  y: 599, r: 20 }, { x: 900, y: 599, r: 20 },
      { x: 1030, y: 599, r: 20 }, { x: 812, y: 414, r: 20 }
    ]
  },
  {
    // 얇은 기둥 11개를 70px 간격으로 세웠다(간격 70 < 높이 110 → 첫 칸을 치면 연쇄).
    id: 9, name: '도미노', birds: 5, star2: 23500, star3: 36500,
    blocks: [
      // 기둥 (윗면 510)
      { x: 520,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 590,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 660,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 730,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 800,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 870,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 940,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 1010, y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 1080, y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 1150, y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 1220, y: 565, w: 16, h: 110, mat: 'stone', angle: 0 },
      // 기둥 두 개씩 잇는 널판 (윗면 497)
      { x: 555,  y: 503, w: 90, h: 12,  mat: 'wood',  angle: 0 },
      { x: 695,  y: 503, w: 90, h: 12,  mat: 'wood',  angle: 0 },
      { x: 835,  y: 503, w: 90, h: 12,  mat: 'wood',  angle: 0 },
      { x: 975,  y: 503, w: 90, h: 12,  mat: 'wood',  angle: 0 },
      { x: 1115, y: 503, w: 90, h: 12,  mat: 'wood',  angle: 0 },
      // 널판 위 얼음 (돼지 바로 위)
      { x: 695,  y: 481, w: 30, h: 30,  mat: 'ice',   angle: 0 },
      { x: 975,  y: 481, w: 30, h: 30,  mat: 'ice',   angle: 0 }
    ],
    pigs: [
      { x: 695, y: 599, r: 20 }, { x: 835,  y: 599, r: 20 },
      { x: 975, y: 599, r: 20 }, { x: 1115, y: 599, r: 20 }
    ]
  },
  {
    // 3층 혼합 재질 성채 + 외곽 벙커 + 오른쪽 탑. 돼지는 층마다 흩어 둔다.
    id: 10, name: '최종 성채', birds: 5, star2: 29000, star3: 42000,
    blocks: [
      // 외곽 벙커 (벽 윗면 550)
      { x: 520,  y: 585, w: 20,  h: 70,  mat: 'ice',   angle: 0 },
      { x: 600,  y: 585, w: 20,  h: 70,  mat: 'wood',  angle: 0 },
      { x: 560,  y: 539, w: 110, h: 20,  mat: 'stone', angle: 0 },
      { x: 700,  y: 590, w: 30,  h: 60,  mat: 'stone', angle: 0 },
      // 성채 1층 (기둥 윗면 520, 바닥 윗면 499)
      { x: 770,  y: 570, w: 24,  h: 100, mat: 'stone', angle: 0 },
      { x: 915,  y: 570, w: 24,  h: 100, mat: 'wood',  angle: 0 },
      { x: 1060, y: 570, w: 24,  h: 100, mat: 'stone', angle: 0 },
      { x: 915,  y: 509, w: 320, h: 20,  mat: 'wood',  angle: 0 },
      // 2층 (기둥 윗면 408, 바닥 윗면 387)
      { x: 790,  y: 453, w: 20,  h: 90,  mat: 'ice',   angle: 0 },
      { x: 915,  y: 453, w: 20,  h: 90,  mat: 'stone', angle: 0 },
      { x: 1040, y: 453, w: 20,  h: 90,  mat: 'ice',   angle: 0 },
      { x: 977,  y: 480, w: 36,  h: 36,  mat: 'wood',  angle: 0 },
      { x: 915,  y: 397, w: 280, h: 20,  mat: 'stone', angle: 0 },
      // 3층 (기둥 윗면 306, 지붕 윗면 289)
      { x: 850,  y: 346, w: 20,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 980,  y: 346, w: 20,  h: 80,  mat: 'wood',  angle: 0 },
      { x: 915,  y: 297, w: 170, h: 16,  mat: 'wood',  angle: 0 },
      { x: 915,  y: 268, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      // 오른쪽 탑 (돌기둥 윗면 500)
      { x: 1120, y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 1180, y: 560, w: 30,  h: 120, mat: 'stone', angle: 0 },
      { x: 1180, y: 484, w: 30,  h: 30,  mat: 'ice',   angle: 0 }
    ],
    pigs: [
      { x: 560, y: 599, r: 20 }, { x: 842, y: 599, r: 20 }, { x: 987, y: 599, r: 20 },
      { x: 852, y: 478, r: 20 }, { x: 915, y: 366, r: 20 }
    ]
  }
];
