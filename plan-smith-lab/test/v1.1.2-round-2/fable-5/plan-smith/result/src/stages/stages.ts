// 스테이지 데이터 10개 (플랜 S3 저작 1–3 + S7 저작 4–10, 데이터 파일 방식)
// 좌표계: 월드 1280x720, 지면 상단 y=660. 블록은 중심 좌표.
// 난이도 축: 구조 복잡도(블록 수·층수·재질) 상승 (플랜 R1-c).

import { StageDef, validateStage } from './schema';

const SLING = { x: 220, y: 560 };

const RAW_STAGES: StageDef[] = [
  {
    id: 1,
    name: '첫 만남',
    slingshot: SLING,
    birds: 3,
    blocks: [
      { material: 'wood', x: 900, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 1020, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 960, y: 550, w: 160, h: 20 },
    ],
    pigs: [{ x: 960, y: 642 }],
    scoreStar2: 7000,
  },
  {
    id: 2,
    name: '두 집',
    slingshot: SLING,
    birds: 3,
    blocks: [
      { material: 'wood', x: 780, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 860, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 820, y: 550, w: 120, h: 20 },
      { material: 'wood', x: 1020, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 1100, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 1060, y: 550, w: 120, h: 20 },
    ],
    pigs: [
      { x: 820, y: 642 },
      { x: 1060, y: 642 },
    ],
    scoreStar2: 9000,
  },
  {
    id: 3,
    name: '유리성',
    slingshot: SLING,
    birds: 3,
    blocks: [
      { material: 'glass', x: 880, y: 610, w: 20, h: 100 },
      { material: 'glass', x: 960, y: 610, w: 20, h: 100 },
      { material: 'glass', x: 1040, y: 610, w: 20, h: 100 },
      { material: 'glass', x: 920, y: 550, w: 120, h: 20 },
      { material: 'glass', x: 1000, y: 550, w: 120, h: 20 },
    ],
    pigs: [
      { x: 920, y: 642 },
      { x: 1000, y: 522 },
    ],
    scoreStar2: 10000,
  },
  {
    id: 4,
    name: '이층집',
    slingshot: SLING,
    birds: 3,
    blocks: [
      { material: 'wood', x: 900, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 1020, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 960, y: 550, w: 180, h: 20 },
      { material: 'glass', x: 920, y: 490, w: 20, h: 100 },
      { material: 'glass', x: 1000, y: 490, w: 20, h: 100 },
      { material: 'glass', x: 960, y: 430, w: 120, h: 20 },
    ],
    pigs: [
      { x: 960, y: 642 },
      { x: 960, y: 522 },
      { x: 960, y: 402 },
    ],
    scoreStar2: 12000,
  },
  {
    id: 5,
    name: '돌 방패',
    slingshot: SLING,
    birds: 4,
    blocks: [
      { material: 'stone', x: 800, y: 640, w: 40, h: 40 },
      { material: 'stone', x: 800, y: 600, w: 40, h: 40 },
      { material: 'stone', x: 800, y: 560, w: 40, h: 40 },
      { material: 'wood', x: 900, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 1000, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 950, y: 550, w: 160, h: 20 },
      { material: 'glass', x: 1064, y: 630, w: 20, h: 60 },
      { material: 'glass', x: 1136, y: 630, w: 20, h: 60 },
      { material: 'glass', x: 1100, y: 590, w: 100, h: 20 },
    ],
    pigs: [
      { x: 950, y: 642 },
      { x: 950, y: 522 },
      { x: 1100, y: 642 },
    ],
    scoreStar2: 15000,
  },
  {
    id: 6,
    name: '돌 요새',
    slingshot: SLING,
    birds: 4,
    blocks: [
      { material: 'stone', x: 880, y: 610, w: 20, h: 100 },
      { material: 'stone', x: 1000, y: 610, w: 20, h: 100 },
      { material: 'stone', x: 1120, y: 610, w: 20, h: 100 },
      { material: 'stone', x: 940, y: 550, w: 140, h: 20 },
      { material: 'stone', x: 1060, y: 550, w: 140, h: 20 },
      { material: 'wood', x: 920, y: 490, w: 20, h: 100 },
      { material: 'wood', x: 1060, y: 490, w: 20, h: 100 },
      { material: 'wood', x: 990, y: 430, w: 200, h: 20 },
    ],
    pigs: [
      { x: 940, y: 642 },
      { x: 1060, y: 642 },
      { x: 990, y: 522 },
    ],
    scoreStar2: 16000,
  },
  {
    id: 7,
    name: '세 탑',
    slingshot: SLING,
    birds: 4,
    blocks: [
      // 탑 1 (x=800)
      { material: 'wood', x: 760, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 840, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 800, y: 550, w: 120, h: 20 },
      { material: 'glass', x: 800, y: 490, w: 20, h: 100 },
      { material: 'glass', x: 800, y: 430, w: 80, h: 20 },
      // 탑 2 (x=980)
      { material: 'wood', x: 940, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 1020, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 980, y: 550, w: 120, h: 20 },
      { material: 'glass', x: 980, y: 490, w: 20, h: 100 },
      { material: 'glass', x: 980, y: 430, w: 80, h: 20 },
      // 탑 3 (x=1160)
      { material: 'wood', x: 1120, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 1200, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 1160, y: 550, w: 120, h: 20 },
      { material: 'glass', x: 1160, y: 490, w: 20, h: 100 },
      { material: 'glass', x: 1160, y: 430, w: 80, h: 20 },
    ],
    pigs: [
      { x: 800, y: 402 },
      { x: 980, y: 402 },
      { x: 1160, y: 402 },
      { x: 980, y: 642 },
    ],
    scoreStar2: 18000,
  },
  {
    id: 8,
    name: '돌 이층',
    slingshot: SLING,
    birds: 4,
    blocks: [
      { material: 'stone', x: 860, y: 610, w: 20, h: 100 },
      { material: 'stone', x: 980, y: 610, w: 20, h: 100 },
      { material: 'stone', x: 1100, y: 610, w: 20, h: 100 },
      { material: 'stone', x: 920, y: 550, w: 140, h: 20 },
      { material: 'stone', x: 1040, y: 550, w: 140, h: 20 },
      { material: 'stone', x: 900, y: 490, w: 20, h: 100 },
      { material: 'stone', x: 1060, y: 490, w: 20, h: 100 },
      { material: 'stone', x: 980, y: 430, w: 220, h: 20 },
      { material: 'wood', x: 790, y: 640, w: 40, h: 40 },
      { material: 'wood', x: 790, y: 600, w: 40, h: 40 },
      { material: 'wood', x: 1170, y: 640, w: 40, h: 40 },
      { material: 'wood', x: 1170, y: 600, w: 40, h: 40 },
    ],
    pigs: [
      { x: 920, y: 642 },
      { x: 1040, y: 642 },
      { x: 980, y: 522 },
      { x: 980, y: 402 },
    ],
    scoreStar2: 20000,
  },
  {
    id: 9,
    name: '대저택',
    slingshot: SLING,
    birds: 5,
    blocks: [
      { material: 'stone', x: 720, y: 640, w: 40, h: 40 },
      { material: 'stone', x: 720, y: 600, w: 40, h: 40 },
      { material: 'wood', x: 780, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 900, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 1020, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 1140, y: 610, w: 20, h: 100 },
      { material: 'wood', x: 840, y: 550, w: 140, h: 20 },
      { material: 'wood', x: 960, y: 550, w: 140, h: 20 },
      { material: 'wood', x: 1080, y: 550, w: 140, h: 20 },
      { material: 'glass', x: 820, y: 490, w: 20, h: 100 },
      { material: 'glass', x: 960, y: 490, w: 20, h: 100 },
      { material: 'glass', x: 1100, y: 490, w: 20, h: 100 },
      { material: 'glass', x: 890, y: 430, w: 160, h: 20 },
      { material: 'glass', x: 1030, y: 430, w: 160, h: 20 },
      { material: 'stone', x: 960, y: 400, w: 40, h: 40 },
    ],
    pigs: [
      { x: 840, y: 642 },
      { x: 960, y: 642 },
      { x: 1080, y: 642 },
      { x: 890, y: 402 },
      { x: 1030, y: 402 },
    ],
    scoreStar2: 24000,
  },
  {
    id: 10,
    name: '최후의 요새',
    slingshot: SLING,
    birds: 5,
    blocks: [
      // 전방 돌 방벽
      { material: 'stone', x: 700, y: 640, w: 40, h: 40 },
      { material: 'stone', x: 700, y: 600, w: 40, h: 40 },
      { material: 'stone', x: 760, y: 640, w: 40, h: 40 },
      { material: 'stone', x: 760, y: 600, w: 40, h: 40 },
      { material: 'stone', x: 760, y: 560, w: 40, h: 40 },
      { material: 'stone', x: 760, y: 520, w: 40, h: 40 },
      // 1층
      { material: 'stone', x: 860, y: 610, w: 20, h: 100 },
      { material: 'stone', x: 980, y: 610, w: 20, h: 100 },
      { material: 'stone', x: 1100, y: 610, w: 20, h: 100 },
      { material: 'stone', x: 920, y: 550, w: 140, h: 20 },
      { material: 'stone', x: 1040, y: 550, w: 140, h: 20 },
      // 2층
      { material: 'wood', x: 900, y: 490, w: 20, h: 100 },
      { material: 'wood', x: 1060, y: 490, w: 20, h: 100 },
      { material: 'wood', x: 980, y: 430, w: 240, h: 20 },
      // 3층
      { material: 'glass', x: 930, y: 370, w: 20, h: 100 },
      { material: 'glass', x: 1030, y: 370, w: 20, h: 100 },
      { material: 'glass', x: 980, y: 310, w: 160, h: 20 },
    ],
    pigs: [
      { x: 920, y: 642 },
      { x: 1040, y: 642 },
      { x: 980, y: 522 },
      { x: 980, y: 402 },
      { x: 980, y: 282 },
      { x: 1180, y: 642 },
    ],
    scoreStar2: 30000,
  },
];

/** 로드 시 스키마 검증 — 위반은 명시적 에러로 던진다 (플랜 S3 검증 조건). */
export function getStages(): StageDef[] {
  const seen = new Set<number>();
  return RAW_STAGES.map((raw) => {
    const stage = validateStage(raw);
    if (seen.has(stage.id)) {
      throw new Error(`Stage schema violation: duplicate id ${stage.id}`);
    }
    seen.add(stage.id);
    return stage;
  });
}
