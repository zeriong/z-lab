// stages.js — 모든 공용 상수 + STAGES 10개 (가장 먼저 로드되는 프로젝트 파일)
// 여기서 선언한 최상위 const는 physics.js / render.js / game.js가 그대로 공유한다.
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
//  - 위에 얹는 블록: y = (아래 블록 윗면) - h/2 - 1  (1~2px 띄움)
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
      // 오두막 A — 돼지가 안쪽 바닥에 앉아 있음
      { x: 700,  y: 580, w: 24,  h: 80, mat: 'wood', angle: 0 },
      { x: 780,  y: 580, w: 24,  h: 80, mat: 'wood', angle: 0 },
      { x: 740,  y: 527, w: 130, h: 24, mat: 'wood', angle: 0 },
      // 오두막 B — 통짜 상자 위 2층, 돼지가 지붕 위
      { x: 1040, y: 580, w: 100, h: 80, mat: 'wood', angle: 0 },
      { x: 1040, y: 527, w: 130, h: 24, mat: 'wood', angle: 0 },
      { x: 1010, y: 489, w: 24,  h: 50, mat: 'wood', angle: 0 },
      { x: 1070, y: 489, w: 24,  h: 50, mat: 'wood', angle: 0 },
      { x: 1040, y: 451, w: 100, h: 24, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 740, y: 598, r: 22 }, { x: 1040, y: 416, r: 22 } ]
  },
  {
    id: 3, name: '얼음 창고', birds: 3, star2: 11500, star3: 23000,
    blocks: [
      // 앞을 막는 얼음 벽 (2단)
      { x: 760,  y: 575, w: 30,  h: 90, mat: 'ice',  angle: 0 },
      { x: 760,  y: 484, w: 30,  h: 90, mat: 'ice',  angle: 0 },
      // 나무 지지대 위 돼지
      { x: 880,  y: 585, w: 24,  h: 70, mat: 'wood', angle: 0 },
      { x: 960,  y: 585, w: 24,  h: 70, mat: 'wood', angle: 0 },
      { x: 920,  y: 537, w: 120, h: 24, mat: 'wood', angle: 0 },
      // 얼음 창고 안의 돼지
      { x: 1040, y: 585, w: 24,  h: 70, mat: 'ice',  angle: 0 },
      { x: 1120, y: 585, w: 24,  h: 70, mat: 'ice',  angle: 0 },
      { x: 1080, y: 537, w: 120, h: 24, mat: 'ice',  angle: 0 }
    ],
    pigs: [ { x: 920, y: 502, r: 22 }, { x: 1080, y: 598, r: 22 } ]
  },
  {
    id: 4, name: '돌 기둥', birds: 4, star2: 12000, star3: 23000,
    blocks: [
      // 돌기둥 사이 통로 1
      { x: 640,  y: 550, w: 30,  h: 140, mat: 'stone', angle: 0 },
      { x: 800,  y: 550, w: 30,  h: 140, mat: 'stone', angle: 0 },
      { x: 720,  y: 467, w: 200, h: 24,  mat: 'wood',  angle: 0 },
      { x: 720,  y: 434, w: 40,  h: 40,  mat: 'stone', angle: 0 },
      // 돌기둥 사이 통로 2
      { x: 960,  y: 550, w: 30,  h: 140, mat: 'stone', angle: 0 },
      { x: 1120, y: 550, w: 30,  h: 140, mat: 'stone', angle: 0 },
      { x: 1040, y: 467, w: 200, h: 24,  mat: 'wood',  angle: 0 },
      { x: 1040, y: 434, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      // 통로 사이 장애물
      { x: 880,  y: 600, w: 40,  h: 40,  mat: 'wood',  angle: 0 }
    ],
    pigs: [ { x: 720, y: 598, r: 22 }, { x: 1040, y: 598, r: 22 } ]
  },
  {
    id: 5, name: '2층 구조', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      // 1층 지지대 3개 + 상판
      { x: 760,  y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 },
      { x: 860,  y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 },
      { x: 960,  y: 575, w: 24,  h: 90, mat: 'wood',  angle: 0 },
      { x: 860,  y: 517, w: 260, h: 24, mat: 'wood',  angle: 0 },
      // 2층 지지대 + 상판
      { x: 790,  y: 469, w: 24,  h: 70, mat: 'wood',  angle: 0 },
      { x: 930,  y: 469, w: 24,  h: 70, mat: 'wood',  angle: 0 },
      { x: 860,  y: 421, w: 200, h: 24, mat: 'wood',  angle: 0 },
      // 옥상 무게추 (지지대가 빠지면 함께 무너짐)
      { x: 780,  y: 388, w: 40,  h: 40, mat: 'stone', angle: 0 },
      { x: 940,  y: 388, w: 40,  h: 40, mat: 'stone', angle: 0 },
      // 오른쪽 작은 창고
      { x: 1060, y: 600, w: 40,  h: 40, mat: 'wood',  angle: 0 },
      { x: 1110, y: 600, w: 40,  h: 40, mat: 'wood',  angle: 0 },
      { x: 1085, y: 569, w: 100, h: 20, mat: 'wood',  angle: 0 }
    ],
    pigs: [ { x: 810, y: 598, r: 22 }, { x: 910, y: 598, r: 22 }, { x: 860, y: 386, r: 22 } ]
  },
  {
    id: 6, name: '공중 발판', birds: 4, star2: 17500, star3: 29000,
    blocks: [
      // 높은 돌 발판 (고각 사격 필요)
      { x: 1100, y: 520, w: 40,  h: 200, mat: 'stone', angle: 0 },
      { x: 1100, y: 409, w: 120, h: 20,  mat: 'stone', angle: 0 },
      // 지상 나무 오두막
      { x: 660,  y: 585, w: 24,  h: 70,  mat: 'wood',  angle: 0 },
      { x: 740,  y: 585, w: 24,  h: 70,  mat: 'wood',  angle: 0 },
      { x: 700,  y: 537, w: 120, h: 24,  mat: 'wood',  angle: 0 },
      { x: 700,  y: 504, w: 40,  h: 40,  mat: 'wood',  angle: 0 },
      // 지상 얼음 오두막
      { x: 860,  y: 585, w: 24,  h: 70,  mat: 'ice',   angle: 0 },
      { x: 940,  y: 585, w: 24,  h: 70,  mat: 'ice',   angle: 0 },
      { x: 900,  y: 537, w: 120, h: 24,  mat: 'ice',   angle: 0 },
      { x: 900,  y: 504, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      // 발판 아래 잡동사니
      { x: 1000, y: 600, w: 40,  h: 40,  mat: 'stone', angle: 0 },
      { x: 1042, y: 600, w: 40,  h: 40,  mat: 'wood',  angle: 0 }
    ],
    pigs: [ { x: 700, y: 598, r: 22 }, { x: 900, y: 598, r: 22 }, { x: 1100, y: 376, r: 22 } ]
  },
  {
    id: 7, name: '좁은 틈', birds: 4, star2: 18000, star3: 30000,
    blocks: [
      // 틈 1 — 돌벽 사이 60px
      { x: 640,  y: 560, w: 30,  h: 120, mat: 'stone', angle: 0 },
      { x: 730,  y: 560, w: 30,  h: 120, mat: 'stone', angle: 0 },
      { x: 640,  y: 479, w: 40,  h: 40,  mat: 'wood',  angle: 0 },
      { x: 730,  y: 479, w: 40,  h: 40,  mat: 'wood',  angle: 0 },
      // 틈 2 — 더 높은 돌벽
      { x: 880,  y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 },
      { x: 970,  y: 540, w: 30,  h: 160, mat: 'stone', angle: 0 },
      { x: 880,  y: 439, w: 40,  h: 40,  mat: 'wood',  angle: 0 },
      { x: 970,  y: 439, w: 40,  h: 40,  mat: 'wood',  angle: 0 },
      // 틈 3 — 얼음 받침 위 나무 덮개
      { x: 1100, y: 570, w: 30,  h: 100, mat: 'stone', angle: 0 },
      { x: 1190, y: 570, w: 30,  h: 100, mat: 'stone', angle: 0 },
      { x: 1100, y: 499, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      { x: 1190, y: 499, w: 40,  h: 40,  mat: 'ice',   angle: 0 },
      { x: 1145, y: 468, w: 130, h: 20,  mat: 'wood',  angle: 0 },
      // 틈 사이 장애물
      { x: 800,  y: 600, w: 40,  h: 40,  mat: 'stone', angle: 0 }
    ],
    pigs: [ { x: 685, y: 598, r: 22 }, { x: 925, y: 598, r: 22 }, { x: 1145, y: 598, r: 22 } ]
  },
  {
    id: 8, name: '돌 요새', birds: 5, star2: 23000, star3: 35500,
    blocks: [
      // 돌 외벽
      { x: 780,  y: 530, w: 30,  h: 180, mat: 'stone', angle: 0 },
      { x: 1080, y: 530, w: 30,  h: 180, mat: 'stone', angle: 0 },
      // 나무 내부 1층
      { x: 860,  y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 930,  y: 547, w: 180, h: 24,  mat: 'wood',  angle: 0 },
      // 나무 내부 2층
      { x: 860,  y: 504, w: 24,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 1000, y: 504, w: 24,  h: 60,  mat: 'wood',  angle: 0 },
      { x: 930,  y: 461, w: 180, h: 24,  mat: 'wood',  angle: 0 },
      // 돌 지붕 + 옥상 돌
      { x: 930,  y: 427, w: 330, h: 24,  mat: 'stone', angle: 0 },
      { x: 820,  y: 394, w: 40,  h: 40,  mat: 'stone', angle: 0 },
      { x: 1040, y: 394, w: 40,  h: 40,  mat: 'stone', angle: 0 },
      // 측면 얼음 헛간 (약점)
      { x: 1135, y: 595, w: 24,  h: 50,  mat: 'ice',   angle: 0 },
      { x: 1205, y: 595, w: 24,  h: 50,  mat: 'ice',   angle: 0 },
      { x: 1170, y: 559, w: 90,  h: 20,  mat: 'ice',   angle: 0 },
      // 앞마당 장애물
      { x: 700,  y: 600, w: 40,  h: 40,  mat: 'wood',  angle: 0 },
      { x: 700,  y: 559, w: 40,  h: 40,  mat: 'wood',  angle: 0 }
    ],
    pigs: [
      { x: 930,  y: 598, r: 22 },
      { x: 930,  y: 512, r: 22 },
      { x: 930,  y: 392, r: 22 },
      { x: 1170, y: 598, r: 22 }
    ]
  },
  {
    id: 9, name: '도미노', birds: 5, star2: 23500, star3: 36500,
    blocks: [
      // 시동 탑 — 넘어지면 첫 도미노를 친다
      { x: 470,  y: 600, w: 40, h: 40,  mat: 'wood',  angle: 0 },
      { x: 470,  y: 559, w: 40, h: 40,  mat: 'wood',  angle: 0 },
      { x: 470,  y: 518, w: 40, h: 40,  mat: 'wood',  angle: 0 },
      { x: 470,  y: 477, w: 40, h: 40,  mat: 'stone', angle: 0 },
      { x: 470,  y: 436, w: 40, h: 40,  mat: 'ice',   angle: 0 },
      // 도미노 10개 (간격 70px)
      { x: 540,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 610,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 680,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 750,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 820,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 890,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 960,  y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 1030, y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 1100, y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      { x: 1170, y: 565, w: 16, h: 110, mat: 'wood',  angle: 0 },
      // 도미노 사이 얼음 조각
      { x: 575,  y: 605, w: 30, h: 30,  mat: 'ice',   angle: 0 },
      { x: 785,  y: 605, w: 30, h: 30,  mat: 'ice',   angle: 0 },
      { x: 995,  y: 605, w: 30, h: 30,  mat: 'ice',   angle: 0 }
    ],
    pigs: [
      { x: 645,  y: 600, r: 20 },
      { x: 855,  y: 600, r: 20 },
      { x: 1065, y: 600, r: 20 },
      { x: 1215, y: 600, r: 20 }
    ]
  },
  {
    id: 10, name: '최종 성채', birds: 5, star2: 29000, star3: 42000,
    blocks: [
      // 왼쪽 전초 (방패)
      { x: 560,  y: 590, w: 24,  h: 60, mat: 'wood',  angle: 0 },
      { x: 640,  y: 590, w: 24,  h: 60, mat: 'wood',  angle: 0 },
      { x: 600,  y: 549, w: 110, h: 20, mat: 'ice',   angle: 0 },
      { x: 600,  y: 518, w: 40,  h: 40, mat: 'stone', angle: 0 },
      // 성채 1층 — 돌 기둥 + 나무 기둥 + 돌 상판
      { x: 760,  y: 580, w: 30,  h: 80, mat: 'stone', angle: 0 },
      { x: 880,  y: 580, w: 24,  h: 80, mat: 'wood',  angle: 0 },
      { x: 1000, y: 580, w: 30,  h: 80, mat: 'stone', angle: 0 },
      { x: 880,  y: 527, w: 270, h: 24, mat: 'stone', angle: 0 },
      // 성채 2층 — 나무·얼음 혼합
      { x: 790,  y: 479, w: 24,  h: 70, mat: 'wood',  angle: 0 },
      { x: 880,  y: 479, w: 24,  h: 70, mat: 'ice',   angle: 0 },
      { x: 970,  y: 479, w: 24,  h: 70, mat: 'wood',  angle: 0 },
      { x: 880,  y: 431, w: 220, h: 24, mat: 'wood',  angle: 0 },
      // 성채 3층 — 얼음 기둥 + 나무 지붕 + 돌 첨탑
      { x: 820,  y: 388, w: 24,  h: 60, mat: 'ice',   angle: 0 },
      { x: 940,  y: 388, w: 24,  h: 60, mat: 'ice',   angle: 0 },
      { x: 880,  y: 345, w: 160, h: 24, mat: 'wood',  angle: 0 },
      { x: 880,  y: 312, w: 40,  h: 40, mat: 'stone', angle: 0 },
      // 오른쪽 돌 헛간
      { x: 1105, y: 585, w: 30,  h: 70, mat: 'stone', angle: 0 },
      { x: 1195, y: 585, w: 30,  h: 70, mat: 'stone', angle: 0 },
      { x: 1150, y: 537, w: 120, h: 24, mat: 'stone', angle: 0 },
      { x: 1150, y: 504, w: 40,  h: 40, mat: 'ice',   angle: 0 }
    ],
    pigs: [
      { x: 820,  y: 598, r: 22 },
      { x: 940,  y: 598, r: 22 },
      { x: 835,  y: 492, r: 22 },
      { x: 880,  y: 396, r: 22 },
      { x: 1150, y: 598, r: 22 }
    ]
  }
];
