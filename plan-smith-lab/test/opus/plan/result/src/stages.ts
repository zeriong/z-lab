import { GROUND_Y } from './constants';
import type { BlockDef, Material, PigDef, StageDef } from './types';

/* ------------------------------------------------------------------ *
 * 스테이지는 순수 데이터다 (플랜 §4). 아래 헬퍼는 좌표 계산 실수를
 * 줄이기 위한 것이며, 결과물은 여전히 평범한 데이터 객체다.
 * ------------------------------------------------------------------ */

/** baseY(기본: 지면) 위에 바닥을 붙인 세로 기둥 */
function pillar(x: number, w: number, h: number, material: Material, baseY = GROUND_Y): BlockDef {
  return { x, y: baseY - h / 2, w, h, material };
}

/** 윗면이 topY에 오도록 놓는 수평 판 */
function beam(x: number, w: number, h: number, material: Material, topY: number): BlockDef {
  return { x, y: topY + h / 2, w, h, material };
}

/** baseY 위에 올라앉은 돼지 */
function pig(x: number, r: number, baseY = GROUND_Y, hp?: number): PigDef {
  return { x, y: baseY - r, r, hp };
}

const SLING = { x: 190, y: 520 };

export const STAGES: StageDef[] = [
  /* ---------------- 1 ---------------- */
  {
    id: 1,
    name: '첫 발',
    slingshot: SLING,
    birds: 3,
    background: 'day',
    ground: 'grass',
    blocks: [
      pillar(900, 24, 110, 'wood'),
      pillar(1000, 24, 110, 'wood'),
      beam(950, 150, 22, 'wood', 530),
    ],
    pigs: [pig(950, 22)],
    starThresholds: [8000, 14000, 20000],
  },

  /* ---------------- 2 ---------------- */
  {
    id: 2,
    name: '유리창',
    slingshot: SLING,
    birds: 3,
    background: 'day',
    ground: 'grass',
    blocks: [
      pillar(880, 22, 100, 'glass'),
      pillar(970, 22, 100, 'glass'),
      beam(925, 140, 22, 'wood', 540),
      pillar(1080, 22, 80, 'glass'),
      beam(1080, 90, 18, 'glass', 560),
    ],
    pigs: [pig(925, 20), pig(925, 20, 540)],
    starThresholds: [10000, 17000, 24000],
  },

  /* ---------------- 3 ---------------- */
  {
    id: 3,
    name: '돌 기초',
    slingshot: SLING,
    birds: 4,
    background: 'dusk',
    ground: 'grass',
    blocks: [
      pillar(860, 28, 60, 'stone'),
      pillar(980, 28, 60, 'stone'),
      beam(920, 160, 20, 'wood', 580),
      pillar(870, 22, 90, 'wood', 580),
      pillar(970, 22, 90, 'wood', 580),
      beam(920, 130, 18, 'glass', 490),
    ],
    pigs: [pig(920, 20), pig(920, 18, 580)],
    starThresholds: [12000, 20000, 28000],
  },

  /* ---------------- 4 ---------------- */
  {
    id: 4,
    name: '쌍둥이 탑',
    slingshot: SLING,
    birds: 4,
    background: 'dusk',
    ground: 'sand',
    blocks: [
      pillar(820, 24, 120, 'wood'),
      pillar(900, 24, 120, 'wood'),
      beam(860, 110, 20, 'wood', 520),
      pillar(1020, 26, 120, 'stone'),
      pillar(1100, 26, 120, 'stone'),
      beam(1060, 110, 20, 'glass', 520),
    ],
    pigs: [pig(860, 20), pig(1060, 20), pig(860, 16, 520)],
    starThresholds: [14000, 23000, 32000],
  },

  /* ---------------- 5 ---------------- */
  {
    id: 5,
    name: '피라미드',
    slingshot: SLING,
    birds: 4,
    background: 'day',
    ground: 'sand',
    blocks: [
      pillar(840, 26, 80, 'stone'),
      pillar(940, 26, 80, 'stone'),
      pillar(1040, 26, 80, 'stone'),
      beam(890, 120, 20, 'wood', 560),
      beam(990, 120, 20, 'wood', 560),
      pillar(890, 22, 70, 'wood', 560),
      pillar(990, 22, 70, 'wood', 560),
      beam(940, 140, 18, 'glass', 490),
    ],
    pigs: [pig(890, 18), pig(990, 18), pig(940, 16, 490)],
    starThresholds: [16000, 26000, 36000],
  },

  /* ---------------- 6 ---------------- */
  {
    id: 6,
    name: '유리 성채',
    slingshot: SLING,
    birds: 4,
    background: 'dusk',
    ground: 'grass',
    blocks: [
      pillar(830, 20, 110, 'glass'),
      pillar(910, 20, 110, 'glass'),
      pillar(990, 20, 110, 'glass'),
      pillar(1070, 20, 110, 'glass'),
      beam(870, 100, 20, 'wood', 530),
      beam(950, 100, 20, 'wood', 530),
      beam(1030, 100, 20, 'wood', 530),
      pillar(870, 22, 60, 'stone', 530),
      pillar(1030, 22, 60, 'stone', 530),
      beam(950, 220, 22, 'wood', 470),
    ],
    pigs: [pig(870, 18), pig(950, 18), pig(1030, 18)],
    starThresholds: [18000, 29000, 40000],
  },

  /* ---------------- 7 ---------------- */
  {
    id: 7,
    name: '경사면',
    slingshot: SLING,
    birds: 5,
    background: 'night',
    ground: 'snow',
    blocks: [
      pillar(800, 26, 100, 'stone'),
      pillar(900, 26, 100, 'stone'),
      beam(850, 130, 20, 'wood', 540),
      { x: 990, y: 560, w: 170, h: 18, angle: -0.5, material: 'wood' },
      { x: 1105, y: 560, w: 170, h: 18, angle: 0.5, material: 'wood' },
      pillar(1048, 20, 70, 'glass'),
    ],
    pigs: [pig(850, 20), pig(850, 16, 540), pig(1000, 18), pig(1160, 18)],
    starThresholds: [20000, 32000, 44000],
  },

  /* ---------------- 8 ---------------- */
  {
    id: 8,
    name: '이중 요새',
    slingshot: SLING,
    birds: 5,
    background: 'night',
    ground: 'snow',
    blocks: [
      pillar(790, 28, 130, 'stone'),
      pillar(870, 28, 130, 'stone'),
      beam(830, 110, 22, 'stone', 510),
      pillar(980, 22, 110, 'glass'),
      pillar(1060, 22, 110, 'glass'),
      beam(1020, 110, 20, 'wood', 530),
      pillar(1150, 22, 90, 'wood'),
      pillar(1210, 22, 90, 'wood'),
      beam(1180, 90, 18, 'glass', 550),
    ],
    pigs: [pig(830, 20), pig(830, 16, 510), pig(1020, 20), pig(1180, 16)],
    starThresholds: [24000, 36000, 50000],
  },

  /* ---------------- 9 ---------------- */
  {
    id: 9,
    name: '고층',
    slingshot: SLING,
    birds: 5,
    background: 'dusk',
    ground: 'grass',
    blocks: [
      pillar(880, 28, 70, 'stone'),
      pillar(1000, 28, 70, 'stone'),
      beam(940, 160, 20, 'wood', 570),
      pillar(890, 22, 70, 'wood', 570),
      pillar(990, 22, 70, 'wood', 570),
      beam(940, 140, 20, 'wood', 500),
      pillar(905, 20, 60, 'glass', 500),
      pillar(975, 20, 60, 'glass', 500),
      beam(940, 120, 20, 'stone', 440),
      pillar(1080, 20, 60, 'glass'),
      pillar(1160, 20, 60, 'glass'),
      beam(1120, 100, 18, 'wood', 580),
    ],
    pigs: [pig(940, 18), pig(940, 16, 570), pig(940, 16, 500), pig(1120, 18)],
    starThresholds: [28000, 42000, 56000],
  },

  /* ---------------- 10 ---------------- */
  {
    id: 10,
    name: '최후의 요새',
    slingshot: SLING,
    birds: 5,
    background: 'night',
    ground: 'snow',
    blocks: [
      pillar(820, 30, 90, 'stone'),
      pillar(940, 30, 90, 'stone'),
      pillar(1060, 30, 90, 'stone'),
      beam(880, 140, 22, 'wood', 550),
      beam(1000, 140, 22, 'wood', 550),
      pillar(880, 26, 80, 'stone', 550),
      pillar(1000, 26, 80, 'stone', 550),
      beam(940, 200, 22, 'wood', 470),
      pillar(905, 20, 60, 'glass', 470),
      pillar(975, 20, 60, 'glass', 470),
      beam(940, 130, 20, 'stone', 410),
      pillar(1110, 22, 70, 'wood'),
      pillar(1190, 22, 70, 'wood'),
      beam(1150, 100, 20, 'stone', 570),
    ],
    pigs: [
      pig(880, 18, GROUND_Y, 26),
      pig(1000, 18, GROUND_Y, 26),
      pig(940, 16, 550),
      pig(940, 16, 470),
      pig(1150, 18),
    ],
    starThresholds: [34000, 50000, 68000],
  },
];

export const STAGE_COUNT = STAGES.length;

export function getStage(index: number): StageDef {
  return STAGES[Math.max(0, Math.min(STAGES.length - 1, index))];
}

export function stageIndexById(id: number): number {
  const i = STAGES.findIndex((s) => s.id === id);
  return i < 0 ? 0 : i;
}
