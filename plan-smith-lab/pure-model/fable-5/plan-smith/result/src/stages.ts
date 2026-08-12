// 스테이지 콘텐츠 10종 (M1) — TS 모듈 저작, 스키마 위반은 tsc가 거부한다 (N2).
// 좌표계: 논리 1280×720, 지면 윗면 y=660, 슬링샷 패드 (200,500).
// 저작 규칙 (§8 R1 / §11): 받침 없는 세장비 3 초과 금지 — 기둥은 30×90(비 3), 큐브 40×40, 널판 140~200×20.
// 배치 기준값: 지면 위 큐브 y=640 / 기둥 y=615(윗면 570) / 기둥 위 널판 y=560 / 널판 위 돼지(r18) y=532.
// starScores는 (b) 수명 캡 — 각 스테이지 intent 해법의 기대 점수(돼지 5,000 / 블록 500 / 잔여 새 10,000)에서 도출.

import type { Stage } from './types';

export const STAGES: Stage[] = [
  {
    id: 1,
    birds: 3,
    blocks: [],
    pigs: [{ x: 900, y: 642, r: 18 }],
    starScores: [12000, 24000],
    intent:
      '튜토리얼. 가득 당겨 약 45도 위로 발사하면 포물선 낙하점이 개활지의 돼지(900,642)에 직격한다. ' +
      '1발 클리어(5,000 + 잔여 새 2×10,000 = 25,000)가 3별 기준.',
  },
  {
    id: 2,
    birds: 3,
    blocks: [{ shape: 'box', material: 'wood', x: 860, y: 615, w: 30, h: 90, angle: 0 }],
    pigs: [{ x: 930, y: 642, r: 18 }],
    starScores: [12000, 24000],
    intent:
      '장애물 도입. 나무 기둥 너머로 높은 포물선을 그려 돼지를 직격하거나, 기둥을 강타해 ' +
      '오른쪽으로 넘어뜨려 깔아뭉갠다. 1발 의도(≈25,000)가 3별.',
  },
  {
    id: 3,
    birds: 3,
    blocks: [
      { shape: 'box', material: 'ice', x: 850, y: 630, w: 30, h: 60, angle: 0 },
      { shape: 'box', material: 'ice', x: 850, y: 570, w: 30, h: 60, angle: 0 },
    ],
    pigs: [
      { x: 910, y: 642, r: 18 },
      { x: 990, y: 642, r: 18 },
    ],
    starScores: [14000, 20000],
    intent:
      '재료 학습(얼음, 임계 4). 낮고 평평한 탄도로 얼음 벽을 관통해 첫 돼지까지 한 번에 처리하고, ' +
      '두 번째 발사로 뒤 돼지를 잡는다. 2발 의도(≈21,000)가 3별.',
  },
  {
    id: 4,
    birds: 3,
    blocks: [
      { shape: 'box', material: 'wood', x: 880, y: 615, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 960, y: 615, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 920, y: 560, w: 140, h: 20, angle: 0 },
    ],
    pigs: [{ x: 920, y: 532, r: 18 }],
    starScores: [13000, 24000],
    intent:
      '구조물 도입. 탑 위 돼지를 높은 포물선으로 직격한다. 빗나가면 기둥을 쳐 탑을 무너뜨려 ' +
      '낙하 충격으로 처리. 1발 의도(≈25,000)가 3별.',
  },
  {
    id: 5,
    birds: 3,
    blocks: [
      { shape: 'box', material: 'wood', x: 900, y: 615, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 980, y: 615, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 940, y: 560, w: 140, h: 20, angle: 0 },
    ],
    pigs: [
      { x: 940, y: 642, r: 18 },
      { x: 940, y: 532, r: 18 },
    ],
    starScores: [14000, 20000],
    intent:
      '이층 구조. 1발: 낮은 탄도로 기둥 사이 틈(폭 50px)에 새를 통과시켜 아래 돼지. ' +
      '2발: 위 돼지를 포물선 직격. 2발 의도(≈21,000)가 3별.',
  },
  {
    id: 6,
    birds: 3,
    blocks: [
      { shape: 'box', material: 'ice', x: 880, y: 640, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'ice', x: 880, y: 600, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'stone', x: 1000, y: 640, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'stone', x: 1000, y: 600, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'wood', x: 940, y: 570, w: 160, h: 20, angle: 0 },
    ],
    pigs: [{ x: 940, y: 642, r: 18 }],
    starScores: [15000, 24000],
    intent:
      '벙커 도입(돌, 임계 11). 뒷벽 돌은 비효율 — 가득 당긴 낮은 탄도로 정면 얼음 벽을 관통해 ' +
      '안의 돼지를 직격한다. 대안: 높은 포물선으로 나무 지붕을 뚫는다. 1발 의도(≈26,000)가 3별.',
  },
  {
    id: 7,
    birds: 3,
    blocks: [
      { shape: 'box', material: 'wood', x: 905, y: 615, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 965, y: 615, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 935, y: 560, w: 140, h: 20, angle: 0 },
      { shape: 'box', material: 'wood', x: 910, y: 505, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 960, y: 505, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 935, y: 450, w: 140, h: 20, angle: 0 },
    ],
    pigs: [
      { x: 935, y: 422, r: 18 },
      { x: 1080, y: 642, r: 18 },
    ],
    starScores: [16000, 25000],
    intent:
      '붕괴 유도. 가득 당긴 중간 탄도로 2층 기둥을 강타해 탑 전체를 오른쪽으로 무너뜨린다 — ' +
      '꼭대기 돼지는 낙하 충격으로, 잔해가 지상 돼지를 덮친다. 이상적 1발(≈32,000), 현실적 2발(≈22,000).',
  },
  {
    id: 8,
    birds: 4,
    blocks: [
      { shape: 'box', material: 'ice', x: 720, y: 640, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'wood', x: 910, y: 615, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 990, y: 615, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 950, y: 560, w: 140, h: 20, angle: 0 },
      { shape: 'box', material: 'stone', x: 1090, y: 640, w: 40, h: 40, angle: 0 },
    ],
    pigs: [
      { x: 770, y: 642, r: 18 },
      { x: 950, y: 532, r: 18 },
      { x: 1140, y: 642, r: 18 },
    ],
    starScores: [17000, 25000],
    intent:
      '각개격파 3발: 1) 평탄한 탄도로 얼음 큐브를 뚫고 앞 돼지, 2) 포물선으로 탑 위 돼지, ' +
      '3) 돌 큐브 너머로 낙하시켜 마지막 돼지. 잔여 새 1 보너스 포함 ≈26,500이 3별.',
  },
  {
    id: 9,
    birds: 4,
    blocks: [
      { shape: 'box', material: 'stone', x: 840, y: 640, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'stone', x: 840, y: 600, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'stone', x: 840, y: 560, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'stone', x: 1000, y: 640, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'stone', x: 1000, y: 600, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'stone', x: 1000, y: 560, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'wood', x: 920, y: 530, w: 200, h: 20, angle: 0 },
    ],
    pigs: [
      { x: 890, y: 642, r: 18 },
      { x: 950, y: 642, r: 18 },
    ],
    starScores: [15000, 21000],
    intent:
      '정밀 사격. 정면 돌벽(임계 11)은 뚫기 어렵다 — 거의 수직에 가까운 높은 포물선으로 나무 지붕을 ' +
      '두 번 때려 부수고, 세 번째 발사를 구멍으로 낙하시켜 안의 돼지 둘을 잡는다. 3발 의도(≈21,500)가 3별.',
  },
  {
    id: 10,
    birds: 4,
    blocks: [
      { shape: 'box', material: 'wood', x: 700, y: 615, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 780, y: 615, w: 30, h: 90, angle: 0 },
      { shape: 'box', material: 'wood', x: 740, y: 560, w: 140, h: 20, angle: 0 },
      { shape: 'box', material: 'stone', x: 880, y: 640, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'stone', x: 880, y: 600, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'stone', x: 1020, y: 640, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'stone', x: 1020, y: 600, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'wood', x: 950, y: 570, w: 180, h: 20, angle: 0 },
      { shape: 'box', material: 'ice', x: 1120, y: 640, w: 40, h: 40, angle: 0 },
      { shape: 'box', material: 'ice', x: 1120, y: 600, w: 40, h: 40, angle: 0 },
    ],
    pigs: [
      { x: 740, y: 532, r: 18 },
      { x: 950, y: 542, r: 18 },
      { x: 950, y: 642, r: 18 },
      { x: 1170, y: 642, r: 18 },
    ],
    starScores: [24000, 32000],
    intent:
      '최종 성채. 1) 왼쪽 탑 위 돼지 직격, 2) 벙커 지붕 위 돼지 직격, 3) 얼음 벽을 뚫고 오른쪽 돼지, ' +
      '4) 나무 지붕을 부숴 벙커 안 돼지. 4발 의도 ≈23,000이 2별, 한 발을 아끼는 3발 마무리(≈33,000)가 3별.',
  },
];
