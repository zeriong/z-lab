// 스테이지 검증기 (§4.9). 개발 빌드 로딩 시점과 테스트에서 실행한다.
import { GROUND_Y, MAX_BODIES, MAX_OVERLAP, MIN_BLOCK_SIDE, PIGS, STAGE_COUNT, WORLD_W } from '../config';
import { maxScore, starThresholds } from '../game/score';
import type { BlockDef, PigDef, StageData, StaticDef } from '../types';

/** §4.10 표의 스테이지별 바디 상한 */
export const BODY_CAPS: Record<number, number> = {
  1: 10,
  2: 25,
  3: 30,
  4: 30,
  5: 45,
  6: 35,
  7: 45,
  8: 60,
  9: 70,
  10: 80,
};

export interface Aabb {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function rectAabb(x: number, y: number, w: number, h: number, angle = 0): Aabb {
  if (!angle) return { minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2 };
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  const hw = (w * c + h * s) / 2;
  const hh = (w * s + h * c) / 2;
  return { minX: x - hw, maxX: x + hw, minY: y - hh, maxY: y + hh };
}

export function blockAabb(b: BlockDef): Aabb {
  return b.kind === 'box'
    ? rectAabb(b.x, b.y, b.w, b.h, b.angle)
    : { minX: b.x - b.r, maxX: b.x + b.r, minY: b.y - b.r, maxY: b.y + b.r };
}

export function pigAabb(p: PigDef): Aabb {
  const r = PIGS[p.type].radius;
  return { minX: p.x - r, maxX: p.x + r, minY: p.y - r, maxY: p.y + r };
}

export function staticAabb(s: StaticDef): Aabb {
  return rectAabb(s.x, s.y, s.w, s.h, s.angle);
}

/** 두 AABB가 양 축 모두에서 겹치는 길이 중 작은 값 (겹치지 않으면 0) */
export function overlapDepth(a: Aabb, b: Aabb): number {
  const ox = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const oy = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  if (ox <= 0 || oy <= 0) return 0;
  return Math.min(ox, oy);
}

export function bodyCount(stage: StageData): number {
  return stage.blocks.length + stage.pigs.length + (stage.statics?.length ?? 0);
}

const EPS = 1e-6;

export function validateStage(stage: StageData): string[] {
  const errs: string[] = [];
  const tag = `stage ${stage.id}`;

  if (!Number.isInteger(stage.id) || stage.id < 1 || stage.id > STAGE_COUNT) errs.push(`${tag}: id out of range`);
  if (stage.pigs.length < 1) errs.push(`${tag}: no pigs`);
  if (stage.birds.length < 1) errs.push(`${tag}: no birds`);

  const dyn: Array<{ name: string; box: Aabb }> = [];
  stage.blocks.forEach((b, i) => {
    const box = blockAabb(b);
    dyn.push({ name: `block#${i}`, box });
    const short = b.kind === 'box' ? Math.min(b.w, b.h) : b.r * 2;
    if (short < MIN_BLOCK_SIDE - EPS) errs.push(`${tag}: block#${i} short side ${short} < ${MIN_BLOCK_SIDE}`);
  });
  stage.pigs.forEach((p, i) => dyn.push({ name: `pig#${i}`, box: pigAabb(p) }));
  const statics = (stage.statics ?? []).map((s, i) => ({ name: `static#${i}`, box: staticAabb(s) }));

  for (const d of [...dyn, ...statics]) {
    const { box } = d;
    if (box.minX < -EPS || box.maxX > WORLD_W + EPS || box.maxY > GROUND_Y + EPS) {
      errs.push(`${tag}: ${d.name} out of bounds`);
    }
  }

  for (let i = 0; i < dyn.length; i++) {
    const a = dyn[i]!;
    for (let j = i + 1; j < dyn.length; j++) {
      const b = dyn[j]!;
      const o = overlapDepth(a.box, b.box);
      if (o > MAX_OVERLAP + EPS) errs.push(`${tag}: ${a.name} overlaps ${b.name} by ${o.toFixed(2)}`);
    }
    for (const s of statics) {
      const o = overlapDepth(a.box, s.box);
      if (o > MAX_OVERLAP + EPS) errs.push(`${tag}: ${a.name} overlaps ${s.name} by ${o.toFixed(2)}`);
    }
  }

  const cap = Math.min(MAX_BODIES, BODY_CAPS[stage.id] ?? MAX_BODIES);
  const count = bodyCount(stage);
  if (count > cap) errs.push(`${tag}: ${count} bodies > cap ${cap}`);

  if (stage.birds.length - stage.solution.length !== stage.slack) {
    errs.push(`${tag}: slack ${stage.slack} != birds ${stage.birds.length} - solution ${stage.solution.length}`);
  }

  const t = starThresholds(stage);
  const max = maxScore(stage);
  if (!(t.two < t.three && t.three <= max)) errs.push(`${tag}: stars invalid (two ${t.two}, three ${t.three}, max ${max})`);

  return errs;
}

export function validateAll(stages: readonly StageData[]): string[] {
  const errs: string[] = [];
  if (stages.length !== STAGE_COUNT) errs.push(`STAGES.length ${stages.length} !== ${STAGE_COUNT}`);
  const ids = stages.map((s) => s.id);
  const expected = Array.from({ length: STAGE_COUNT }, (_, i) => i + 1);
  if (new Set(ids).size !== ids.length) errs.push('duplicate stage ids');
  if (ids.slice().sort((a, b) => a - b).join(',') !== expected.join(',')) errs.push(`stage ids must be 1..${STAGE_COUNT}`);
  for (const s of stages) errs.push(...validateStage(s));
  return errs;
}
