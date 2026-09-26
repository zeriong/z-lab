import {
  GROUND_Y,
  MAX_BIRDS,
  MAX_DYNAMIC_BODIES,
  MIN_BIRDS,
  MIN_BLOCK_SIZE,
  STAGE_COUNT,
  WORLD_BOUNDS,
} from '../../config/constants';
import { BIRD_KINDS, MATERIALS, PIG_SIZES } from '../../config/catalog';
import type { BirdKind, Material, PigSize } from '../../config/catalog';
import { shapeAABB, stageShapes } from './geometry';
import type { StageData } from './schema';

/**
 * 스테이지 정적 검증 (§6.4). 부팅 시와 테스트에서 검사한다.
 * 물리 규칙(겹침, 스폰 안정성, 기준 해법 재생)은 sim 테스트에서만 검사한다.
 */

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface ValidateOptions {
  /** 테스트용 stage00(id 0)을 허용한다 */
  allowTestStage?: boolean;
}

const EDGE_TOLERANCE = 0.5;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isOptNum = (v: unknown): boolean => v === undefined || isNum(v);

function checkStructure(d: Record<string, unknown>, errors: string[]): boolean {
  const start = errors.length;
  if (!isNum(d.id) || !Number.isInteger(d.id)) errors.push('id: 정수여야 한다');
  if (typeof d.name !== 'string' || d.name.length === 0) errors.push('name: 비어 있지 않은 문자열이어야 한다');
  if (!Array.isArray(d.birds)) errors.push('birds: 배열이어야 한다');
  else d.birds.forEach((b, i) => {
    if (!BIRD_KINDS.includes(b as BirdKind)) errors.push(`birds[${i}]: 알 수 없는 새 종류 ${String(b)}`);
  });
  if (!isObj(d.slingshot) || !isNum(d.slingshot.x)) errors.push('slingshot.x: 숫자여야 한다');
  if (!Array.isArray(d.terrain)) errors.push('terrain: 배열이어야 한다');
  else d.terrain.forEach((t, i) => {
    if (!isObj(t)) return errors.push(`terrain[${i}]: 객체여야 한다`);
    if (Array.isArray(t.points)) {
      const pts = t.points as unknown[];
      if (pts.length < 3 || pts.length > 8) errors.push(`terrain[${i}].points: 꼭짓점은 3~8개`);
      pts.forEach((p, j) => {
        if (!Array.isArray(p) || p.length !== 2 || !isNum(p[0]) || !isNum(p[1])) {
          errors.push(`terrain[${i}].points[${j}]: [x, y] 숫자 쌍이어야 한다`);
        }
      });
    } else if (!isNum(t.x) || !isNum(t.y) || !isNum(t.w) || !isNum(t.h) || !isOptNum(t.angle)) {
      errors.push(`terrain[${i}]: {x,y,w,h,angle?} 또는 {points}여야 한다`);
    }
    return undefined;
  });
  if (!Array.isArray(d.blocks)) errors.push('blocks: 배열이어야 한다');
  else d.blocks.forEach((b, i) => {
    if (!isObj(b)) return errors.push(`blocks[${i}]: 객체여야 한다`);
    if (!MATERIALS.includes(b.material as Material)) errors.push(`blocks[${i}].material: 알 수 없는 재질`);
    if (b.shape !== 'rect' && b.shape !== 'circle' && b.shape !== 'triangle') errors.push(`blocks[${i}].shape: rect|circle|triangle`);
    if (!isNum(b.x) || !isNum(b.y) || !isOptNum(b.angle)) errors.push(`blocks[${i}]: x, y는 숫자여야 한다`);
    if (b.shape === 'circle' && !isNum(b.r)) errors.push(`blocks[${i}].r: 원은 r이 필요하다`);
    if (b.shape !== 'circle' && (!isNum(b.w) || !isNum(b.h))) errors.push(`blocks[${i}]: w, h가 필요하다`);
    return undefined;
  });
  if (!Array.isArray(d.pigs)) errors.push('pigs: 배열이어야 한다');
  else d.pigs.forEach((p, i) => {
    if (!isObj(p) || !PIG_SIZES.includes(p.size as PigSize) || !isNum(p.x) || !isNum(p.y)) {
      errors.push(`pigs[${i}]: {size: S|M|L, x, y}여야 한다`);
    }
  });
  if (d.tnt !== undefined) {
    if (!Array.isArray(d.tnt)) errors.push('tnt: 배열이어야 한다');
    else d.tnt.forEach((t, i) => {
      if (!isObj(t) || !isNum(t.x) || !isNum(t.y)) errors.push(`tnt[${i}]: {x, y}여야 한다`);
    });
  }
  if (!Array.isArray(d.stars) || d.stars.length !== 2 || !isNum(d.stars[0]) || !isNum(d.stars[1])) {
    errors.push('stars: [twoStar, threeStar] 숫자 쌍이어야 한다');
  }
  if (!Array.isArray(d.solution)) errors.push('solution: 배열이어야 한다');
  else d.solution.forEach((s, i) => {
    if (!isObj(s) || !Array.isArray(s.pull) || s.pull.length !== 2 || !isNum(s.pull[0]) || !isNum(s.pull[1])) {
      errors.push(`solution[${i}].pull: [dx, dy] 숫자 쌍이어야 한다`);
    } else if (!isOptNum(s.abilityAt) || (isNum(s.abilityAt) && s.abilityAt < 0)) {
      errors.push(`solution[${i}].abilityAt: 0 이상의 숫자여야 한다`);
    }
  });
  return errors.length === start;
}

/** 스테이지 1개의 정적 규칙 검사 */
export function validateStage(data: unknown, opts: ValidateOptions = {}): ValidationResult {
  const errors: string[] = [];
  if (!isObj(data)) return { ok: false, errors: ['스테이지는 객체여야 한다'] };
  if (!checkStructure(data, errors)) return { ok: false, errors };
  const s = data as unknown as StageData;

  const minId = opts.allowTestStage ? 0 : 1;
  if (s.id < minId || s.id > STAGE_COUNT) errors.push(`id: ${minId}~${STAGE_COUNT} 범위여야 한다 (${s.id})`);
  if (s.birds.length < MIN_BIRDS || s.birds.length > MAX_BIRDS) errors.push(`birds: ${MIN_BIRDS}~${MAX_BIRDS}마리여야 한다`);
  if (s.pigs.length < 1) errors.push('pigs: 1마리 이상이어야 한다');

  s.blocks.forEach((b, i) => {
    if (b.shape === 'circle') {
      if ((b.r ?? 0) * 2 < MIN_BLOCK_SIZE) errors.push(`blocks[${i}]: 지름이 ${MIN_BLOCK_SIZE}px 미만`);
    } else if ((b.w ?? 0) < MIN_BLOCK_SIZE || (b.h ?? 0) < MIN_BLOCK_SIZE) {
      errors.push(`blocks[${i}]: 최소 치수 ${MIN_BLOCK_SIZE}px 미만`);
    }
  });
  s.terrain.forEach((t, i) => {
    if (!('points' in t) && (t.w <= 0 || t.h <= 0)) errors.push(`terrain[${i}]: w, h는 양수여야 한다`);
  });

  const dynamicCount = s.blocks.length + s.pigs.length + (s.tnt?.length ?? 0);
  if (dynamicCount > MAX_DYNAMIC_BODIES) errors.push(`동적 바디가 ${dynamicCount}개로 ${MAX_DYNAMIC_BODIES}개를 넘는다`);

  // 월드 경계와 지면
  for (const shape of stageShapes(s, false)) {
    const bb = shapeAABB(shape);
    if (bb.minX < WORLD_BOUNDS.minX || bb.maxX > WORLD_BOUNDS.maxX) errors.push(`${shape.label}: 월드 경계(x) 밖이다`);
    if (bb.minY < 0) errors.push(`${shape.label}: 화면 위(y<0)에 걸쳐 있다`);
    if (!shape.isStatic && bb.maxY > GROUND_Y + EDGE_TOLERANCE) errors.push(`${shape.label}: 지면 아래로 들어가 있다`);
  }
  if (s.slingshot.x < 60 || s.slingshot.x > 800) errors.push('slingshot.x: 60~800 범위여야 한다');

  const [two, three] = s.stars;
  if (!(two > 0 && three > 0)) errors.push('stars: 양수여야 한다');
  if (!(two < three)) errors.push('stars: 오름차순이어야 한다');
  if (s.solution.length > s.birds.length) errors.push('solution: 길이가 birds보다 길다');

  return { ok: errors.length === 0, errors };
}

/** 스테이지 세트 검사: 정확히 10개, id 1~10 중복 없음 */
export function validateStageSet(list: readonly unknown[]): ValidationResult {
  const errors: string[] = [];
  if (list.length !== STAGE_COUNT) errors.push(`스테이지는 정확히 ${STAGE_COUNT}개여야 한다 (${list.length})`);
  const seen = new Set<number>();
  list.forEach((d, i) => {
    const r = validateStage(d);
    for (const e of r.errors) errors.push(`stage[${i}] ${e}`);
    const id = isObj(d) && isNum(d.id) ? d.id : NaN;
    if (seen.has(id)) errors.push(`stage[${i}] id ${id} 중복`);
    seen.add(id);
  });
  for (let n = 1; n <= STAGE_COUNT; n++) if (!seen.has(n)) errors.push(`id ${n} 스테이지가 없다`);
  return { ok: errors.length === 0, errors };
}
