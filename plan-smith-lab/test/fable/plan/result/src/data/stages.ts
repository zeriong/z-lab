import type { BirdType, Material } from '../core/constants.ts';

// 좌표계: 1280×720 가상 해상도, 지면 윗면 y=650. 모든 x,y는 중심 좌표.
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StageDef {
  id: number; // 1..10
  birds: BirdType[]; // 발사 순서대로, 개수 = 시도 횟수
  pigs: { x: number; y: number; size: number }[];
  blocks: { x: number; y: number; w: number; h: number; material: Material; angle?: number }[];
  ground: { platforms?: Rect[] }; // 기본 지면 + 추가 플랫폼
}

// 배치 헬퍼: 지면(650) 위에 놓인 물체의 중심 y
const onGround = (halfH: number) => 650 - halfH;

// ---------------------------------------------------------------------------
// 난이도 커브:
//  1~2  단순 스택 (튜토리얼)
//  3~5  재질 혼합 (얼음=약함, 돌=단단)
//  6~8  지붕 아래 숨은 돼지 · 다층 구조
//  9~10 새 수가 빠듯 — 궤적 정밀도 요구
// ---------------------------------------------------------------------------

export const STAGES: StageDef[] = [
  {
    // S1 튜토리얼: 기둥 2개+상판, 사이에 돼지 1. 직격이든 붕괴든 다 통한다.
    id: 1,
    birds: ['red', 'red', 'red'],
    pigs: [{ x: 900, y: onGround(16), size: 16 }],
    blocks: [
      { x: 850, y: onGround(60), w: 20, h: 120, material: 'wood' },
      { x: 950, y: onGround(60), w: 20, h: 120, material: 'wood' },
      { x: 900, y: 650 - 120 - 10, w: 160, h: 20, material: 'wood' },
    ],
    ground: {},
  },
  {
    // S2 단순 스택 2탑: 박스 위 돼지 + 판자 뒤 돼지.
    id: 2,
    birds: ['red', 'red', 'red'],
    pigs: [
      { x: 860, y: 650 - 80 - 16, size: 16 },
      { x: 1030, y: onGround(16), size: 16 },
    ],
    blocks: [
      { x: 860, y: onGround(20), w: 40, h: 40, material: 'wood' },
      { x: 860, y: 650 - 40 - 20, w: 40, h: 40, material: 'wood' },
      { x: 960, y: onGround(60), w: 20, h: 120, material: 'wood' },
    ],
    ground: {},
  },
  {
    // S3 얼음 도입: 얼음 벽은 한 방에 깨진다. 뒤의 돼지 + 단상 위 돼지.
    id: 3,
    birds: ['red', 'red', 'red'],
    pigs: [
      { x: 910, y: onGround(16), size: 16 },
      { x: 1080, y: 650 - 130 - 16, size: 16 },
    ],
    blocks: [
      { x: 820, y: onGround(20), w: 40, h: 40, material: 'ice' },
      { x: 820, y: 650 - 40 - 20, w: 40, h: 40, material: 'ice' },
      { x: 820, y: 650 - 80 - 20, w: 40, h: 40, material: 'ice' },
      { x: 1030, y: onGround(55), w: 20, h: 110, material: 'wood' },
      { x: 1130, y: onGround(55), w: 20, h: 110, material: 'wood' },
      { x: 1080, y: 650 - 110 - 10, w: 140, h: 20, material: 'wood' },
    ],
    ground: {},
  },
  {
    // S4 돌 도입: 앞의 돌 기둥은 사실상 못 부순다 — 넘겨 쏘거나 굴려 들어가야 한다.
    id: 4,
    birds: ['red', 'red', 'red'],
    pigs: [
      { x: 880, y: onGround(16), size: 16 },
      { x: 880, y: 650 - 100 - 16, size: 16 },
    ],
    blocks: [
      { x: 790, y: onGround(70), w: 20, h: 140, material: 'stone' },
      { x: 830, y: onGround(40), w: 20, h: 80, material: 'wood' },
      { x: 930, y: onGround(40), w: 20, h: 80, material: 'wood' },
      { x: 880, y: 650 - 80 - 10, w: 160, h: 20, material: 'wood' },
    ],
    ground: {},
  },
  {
    // S5 두 개의 탑: 재질 혼합, 돼지 3. 새 4마리로 여유는 있다.
    id: 5,
    birds: ['red', 'red', 'big', 'red'],
    pigs: [
      { x: 800, y: 650 - 120 - 16, size: 16 },
      { x: 1090, y: 650 - 120 - 16, size: 16 },
      { x: 945, y: onGround(16), size: 16 },
    ],
    blocks: [
      { x: 760, y: onGround(60), w: 20, h: 120, material: 'ice' },
      { x: 840, y: onGround(60), w: 20, h: 120, material: 'wood' },
      { x: 800, y: 650 - 120 - 10, w: 130, h: 20, material: 'wood' },
      { x: 1050, y: onGround(60), w: 20, h: 120, material: 'wood' },
      { x: 1130, y: onGround(60), w: 20, h: 120, material: 'ice' },
      { x: 1090, y: 650 - 120 - 10, w: 130, h: 20, material: 'wood' },
    ],
    ground: {},
  },
  {
    // S6 집 구조: 돌 지붕 아래 숨은 돼지 — 얼음 문을 깨고 굴려 넣거나 벽을 무너뜨린다.
    id: 6,
    birds: ['red', 'red', 'big'],
    pigs: [
      { x: 960, y: onGround(16), size: 16 },
      { x: 960, y: 650 - 120 - 20 - 16, size: 16 },
    ],
    blocks: [
      { x: 850, y: onGround(50), w: 20, h: 100, material: 'ice' }, // 문(약점)
      { x: 900, y: onGround(60), w: 20, h: 120, material: 'wood' },
      { x: 1020, y: onGround(60), w: 20, h: 120, material: 'wood' },
      { x: 960, y: 650 - 120 - 10, w: 200, h: 20, material: 'stone' }, // 지붕
    ],
    ground: {},
  },
  {
    // S7 2층 건물: 층마다 돼지. 아래층을 무너뜨리면 연쇄 붕괴.
    id: 7,
    birds: ['red', 'big', 'red', 'small'],
    pigs: [
      { x: 950, y: onGround(16), size: 16 },
      { x: 950, y: 650 - 110 - 20 - 16, size: 16 },
      { x: 950, y: 650 - 240 - 16, size: 15 },
    ],
    blocks: [
      // 1층
      { x: 880, y: onGround(55), w: 20, h: 110, material: 'wood' },
      { x: 1020, y: onGround(55), w: 20, h: 110, material: 'wood' },
      { x: 950, y: 650 - 110 - 10, w: 180, h: 20, material: 'wood' },
      // 2층
      { x: 890, y: 650 - 120 - 50, w: 20, h: 100, material: 'ice' },
      { x: 1010, y: 650 - 120 - 50, w: 20, h: 100, material: 'ice' },
      { x: 950, y: 650 - 220 - 10, w: 160, h: 20, material: 'wood' },
    ],
    ground: {},
  },
  {
    // S8 돌 요새 + 얼음 약점: 정면은 돌벽, 지붕만 얼음 — 로브샷으로 뚫는다.
    id: 8,
    birds: ['red', 'red', 'big'],
    pigs: [
      { x: 1000, y: onGround(16), size: 16 },
      { x: 1090, y: onGround(16), size: 16 },
    ],
    blocks: [
      { x: 920, y: onGround(75), w: 24, h: 150, material: 'stone' },
      { x: 1170, y: onGround(75), w: 24, h: 150, material: 'stone' },
      { x: 1002, y: 650 - 150 - 10, w: 145, h: 20, material: 'ice' }, // 얼음 지붕(약점)
      { x: 1122, y: 650 - 150 - 10, w: 90, h: 20, material: 'stone' },
    ],
    ground: {},
  },
  {
    // S9 정밀도 시험: 새 2, 돼지 2. 각각 한 발로 잡아야 한다.
    id: 9,
    birds: ['red', 'red'],
    pigs: [
      { x: 780, y: 650 - 140 - 16, size: 16 }, // 높은 단상 위 — 직격 요구
      { x: 1120, y: onGround(16), size: 16 }, // 돌벽 뒤 — 로브샷 요구
    ],
    blocks: [
      { x: 780, y: onGround(70), w: 24, h: 140, material: 'stone' },
      { x: 1040, y: onGround(80), w: 24, h: 160, material: 'stone' },
    ],
    ground: {},
  },
  {
    // S10 최종 요새: 재질 총동원, 돼지 4, 새 4 — 낭비할 새가 없다.
    id: 10,
    birds: ['red', 'big', 'red', 'small'],
    pigs: [
      { x: 800, y: onGround(16), size: 16 },
      { x: 990, y: onGround(16), size: 16 },
      { x: 990, y: 650 - 130 - 20 - 16, size: 16 },
      { x: 1170, y: onGround(16), size: 16 },
    ],
    blocks: [
      // 전면 얼음 방벽
      { x: 740, y: onGround(20), w: 40, h: 40, material: 'ice' },
      { x: 740, y: 650 - 40 - 20, w: 40, h: 40, material: 'ice' },
      // 중앙 집
      { x: 920, y: onGround(65), w: 20, h: 130, material: 'wood' },
      { x: 1060, y: onGround(65), w: 20, h: 130, material: 'wood' },
      { x: 990, y: 650 - 130 - 10, w: 190, h: 20, material: 'wood' },
      // 후방 돌 엄폐
      { x: 1120, y: onGround(60), w: 24, h: 120, material: 'stone' },
      { x: 1225, y: onGround(60), w: 24, h: 120, material: 'stone' },
      { x: 1172, y: 650 - 120 - 10, w: 130, h: 20, material: 'ice' },
    ],
    ground: {},
  },
];

export function stageById(id: number): StageDef {
  const def = STAGES.find((s) => s.id === id);
  if (!def) throw new Error(`unknown stage: ${id}`);
  return def;
}
