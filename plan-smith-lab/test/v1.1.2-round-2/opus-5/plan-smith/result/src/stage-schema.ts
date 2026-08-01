/**
 * 스테이지 스키마 + 런타임 검증기 (§1-A R1, §5-6단계).
 * 완성 기준: "잘못된 스테이지 파일은 로드 시점에 이름과 필드를 지목해 거부한다."
 *  - errors: 필드 누락 / 타입 불일치 / 좌표 범위 초과  → 로드 거부
 *  - warnings: 초기 겹침(블록-블록, 돼지-블록)         → 로드는 하되 콘솔에 좌표를 남긴다
 *    (겹침은 저작 실수 신호이지 스키마 위반이 아니므로 게임 자체를 못 열게 만들지 않는다 — 구현자 판단)
 */

import type { BirdKind, BlockDef, Material, PigDef, StageDef, TerrainDef } from './types';
import { GROUND_Y, LOGICAL_W, PIG_RADIUS } from './tuning';

// ---------- 저작 헬퍼 (x,y = 중심) ----------

const block = (material: Material) => (x: number, y: number, w: number, h: number, angle = 0): BlockDef => ({
  x,
  y,
  w,
  h,
  material,
  angle,
});

export const wood = block('wood');
export const ice = block('ice');
export const stone = block('stone');

export const pig = (x: number, y: number): PigDef => ({ x, y });

export const terrain = (x: number, y: number, w: number, h: number, angle = 0): TerrainDef => ({
  x,
  y,
  w,
  h,
  angle,
});

/** 세로 널판(20x100) / 가로 보(100x20) / 큐브(40x40) / 긴 판(140x20 · 200x20) 규격 */
export const SIZES = {
  plank: { w: 20, h: 100 },
  cube: { w: 40, h: 40 },
  beam: { w: 100, h: 20 },
  slab: { w: 140, h: 20 },
  longSlab: { w: 200, h: 20 },
} as const;

// ---------- 검증 ----------

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

const MATERIALS_SET = new Set<Material>(['wood', 'ice', 'stone']);
const BIRDS_SET = new Set<BirdKind>(['basic', 'dash']);

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

interface AABB {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function aabbOf(b: BlockDef): AABB {
  // 회전 블록은 외접 사각형으로 근사
  const a = Math.abs(b.angle ?? 0);
  const w = b.w * Math.cos(a) + b.h * Math.sin(a);
  const h = b.w * Math.sin(a) + b.h * Math.cos(a);
  return { x0: b.x - w / 2, y0: b.y - h / 2, x1: b.x + w / 2, y1: b.y + h / 2 };
}

function overlaps(a: AABB, b: AABB, tol = 0.5): boolean {
  return a.x1 - b.x0 > tol && b.x1 - a.x0 > tol && a.y1 - b.y0 > tol && b.y1 - a.y0 > tol;
}

export function validateStage(input: unknown, label = 'stage'): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const push = (field: string, msg: string): void => errors.push(`${label}.${field}: ${msg}`);

  if (typeof input !== 'object' || input === null) {
    return { ok: false, errors: [`${label}: 스테이지 정의가 객체가 아니다`], warnings };
  }
  const s = input as Record<string, unknown>;

  if (!isNum(s.id) || s.id < 1 || s.id > 10) push('id', '1~10 정수여야 한다');
  if (typeof s.name !== 'string' || s.name.length === 0) push('name', '비어 있지 않은 문자열이어야 한다');
  if (typeof s.teaches !== 'string' || s.teaches.length === 0) push('teaches', '비어 있지 않은 문자열이어야 한다');
  if (!isNum(s.parScore) || s.parScore <= 0) push('parScore', '양수여야 한다');

  // birds
  if (!Array.isArray(s.birds) || s.birds.length === 0) {
    push('birds', '최소 1마리 이상의 배열이어야 한다');
  } else {
    s.birds.forEach((b, i) => {
      if (typeof b !== 'string' || !BIRDS_SET.has(b as BirdKind)) {
        push(`birds[${i}]`, `'basic' | 'dash' 중 하나여야 한다 (받은 값: ${String(b)})`);
      }
    });
  }

  // slingshot
  const sling = s.slingshot as Record<string, unknown> | undefined;
  if (!sling || !isNum(sling.x) || !isNum(sling.y)) {
    push('slingshot', '{x:number, y:number} 가 필요하다');
  } else if (sling.x < 40 || sling.x > LOGICAL_W - 40 || sling.y < 40 || sling.y > GROUND_Y) {
    push('slingshot', `화면 안(40..${LOGICAL_W - 40}, 40..${GROUND_Y})이어야 한다`);
  }

  // blocks
  const blocks: BlockDef[] = [];
  if (!Array.isArray(s.blocks)) {
    push('blocks', '배열이어야 한다');
  } else {
    s.blocks.forEach((raw, i) => {
      const f = `blocks[${i}]`;
      if (typeof raw !== 'object' || raw === null) {
        push(f, '객체여야 한다');
        return;
      }
      const b = raw as Record<string, unknown>;
      for (const key of ['x', 'y', 'w', 'h'] as const) {
        if (!(key in b)) push(`${f}.${key}`, '필수 필드 누락');
        else if (!isNum(b[key])) push(`${f}.${key}`, `숫자여야 한다 (받은 값: ${String(b[key])})`);
      }
      if (typeof b.material !== 'string' || !MATERIALS_SET.has(b.material as Material)) {
        push(`${f}.material`, `'wood' | 'ice' | 'stone' 중 하나여야 한다 (받은 값: ${String(b.material)})`);
      }
      if ('angle' in b && b.angle !== undefined && !isNum(b.angle)) {
        push(`${f}.angle`, '숫자여야 한다');
      }
      if (isNum(b.x) && isNum(b.y) && isNum(b.w) && isNum(b.h)) {
        const def = b as unknown as BlockDef;
        const box = aabbOf(def);
        if (box.x0 < 0 || box.x1 > LOGICAL_W) {
          push(`${f}.x`, `좌표 범위 초과: 가로 0..${LOGICAL_W} 를 벗어났다 (${box.x0.toFixed(1)}..${box.x1.toFixed(1)})`);
        }
        if (box.y0 < 0 || box.y1 > GROUND_Y + 0.51) {
          push(`${f}.y`, `좌표 범위 초과: 세로 0..${GROUND_Y} 를 벗어났다 (${box.y0.toFixed(1)}..${box.y1.toFixed(1)})`);
        }
        blocks.push(def);
      }
    });
  }

  // pigs
  const pigs: PigDef[] = [];
  if (!Array.isArray(s.pigs) || s.pigs.length === 0) {
    push('pigs', '최소 1마리 이상의 배열이어야 한다');
  } else {
    s.pigs.forEach((raw, i) => {
      const f = `pigs[${i}]`;
      if (typeof raw !== 'object' || raw === null) {
        push(f, '객체여야 한다');
        return;
      }
      const p = raw as Record<string, unknown>;
      if (!isNum(p.x) || !isNum(p.y)) {
        push(f, '{x:number, y:number} 가 필요하다');
        return;
      }
      if (p.x - PIG_RADIUS < 0 || p.x + PIG_RADIUS > LOGICAL_W || p.y + PIG_RADIUS > GROUND_Y + 0.51) {
        push(f, `좌표 범위 초과: (${p.x}, ${p.y})`);
        return;
      }
      pigs.push({ x: p.x, y: p.y });
    });
  }

  // terrain
  if (s.terrain !== undefined) {
    if (!Array.isArray(s.terrain)) {
      push('terrain', '배열이어야 한다');
    } else {
      s.terrain.forEach((raw, i) => {
        const f = `terrain[${i}]`;
        if (typeof raw !== 'object' || raw === null) {
          push(f, '객체여야 한다');
          return;
        }
        const t = raw as Record<string, unknown>;
        for (const key of ['x', 'y', 'w', 'h'] as const) {
          if (!(key in t)) push(`${f}.${key}`, '필수 필드 누락');
          else if (!isNum(t[key])) push(`${f}.${key}`, '숫자여야 한다');
        }
        if (isNum(t.x) && (t.x < -200 || t.x > LOGICAL_W + 200)) {
          push(`${f}.x`, '좌표 범위 초과');
        }
      });
    }
  }

  // 초기 겹침 검사 (경고)
  for (let i = 0; i < blocks.length; i += 1) {
    for (let j = i + 1; j < blocks.length; j += 1) {
      if (overlaps(aabbOf(blocks[i]), aabbOf(blocks[j]))) {
        warnings.push(
          `${label}: blocks[${i}] 와 blocks[${j}] 가 초기 상태에서 겹친다 ` +
            `((${blocks[i].x},${blocks[i].y}) / (${blocks[j].x},${blocks[j].y})) — 로드 직후 튀어나갈 수 있다`,
        );
      }
    }
  }
  for (let i = 0; i < pigs.length; i += 1) {
    const pb: AABB = {
      x0: pigs[i].x - PIG_RADIUS,
      y0: pigs[i].y - PIG_RADIUS,
      x1: pigs[i].x + PIG_RADIUS,
      y1: pigs[i].y + PIG_RADIUS,
    };
    for (let j = 0; j < blocks.length; j += 1) {
      if (overlaps(pb, aabbOf(blocks[j]), 1.5)) {
        warnings.push(`${label}: pigs[${i}] 가 blocks[${j}] 와 겹친다 ((${pigs[i].x},${pigs[i].y}))`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

/** 검증을 통과한 정의만 StageDef 로 좁혀서 돌려준다. 실패하면 null + 콘솔에 필드별 이유. */
export function parseStage(input: unknown, label = 'stage'): StageDef | null {
  const r = validateStage(input, label);
  for (const w of r.warnings) console.warn('[stage-schema]', w);
  if (!r.ok) {
    for (const e of r.errors) console.error('[stage-schema]', e);
    return null;
  }
  const s = input as StageDef;
  return { ...s, terrain: s.terrain ?? [] };
}
