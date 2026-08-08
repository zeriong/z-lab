// B4 — 스테이지 데이터 스키마 + 검증기
//
// 잘못된 스테이지는 실행 전에 파일명·필드명과 함께 실패한다.
// 좌표 규약: 블록·돼지는 중심 좌표, 지면 세그먼트는 좌상단 좌표.

import { GROUND_Y, VIRTUAL_H, VIRTUAL_W } from '../physics/units';

export type StageMaterial = 'wood' | 'ice' | 'stone' | 'barrel';

export const MATERIALS: readonly StageMaterial[] = ['wood', 'ice', 'stone', 'barrel'];

/** 재질별 hp. 데미지 = max(0, 상대속도 - 임계) x 질량계수. */
export const MATERIAL_HP: Record<StageMaterial, number> = {
  wood: 60,
  ice: 30,
  stone: 120,
  barrel: 40,
};

export const MIN_BLOCK_THICKNESS = 20;

export interface GroundSegment {
  /** 좌상단 x */
  x: number;
  /** 좌상단 y */
  y: number;
  w: number;
  h: number;
}

export interface PigDef {
  /** 중심 x */
  x: number;
  /** 중심 y */
  y: number;
  /** 반지름 */
  size: number;
}

export interface BlockDef {
  /** 중심 x */
  x: number;
  /** 중심 y */
  y: number;
  w: number;
  h: number;
  /** 라디안 */
  angle: number;
  material: StageMaterial;
}

export interface StarScore {
  two: number;
  three: number;
}

export interface StageDef {
  id: number;
  name: string;
  gravity?: number;
  ground: GroundSegment[];
  sling: { x: number; y: number };
  birds: number;
  pigs: PigDef[];
  blocks: BlockDef[];
  starScore: StarScore;
  stepCap: number;
}

/** 지면 세그먼트가 덮는 월드 폭(카메라 클램프의 상한). */
export function worldWidthOf(def: StageDef): number {
  let max = VIRTUAL_W;
  for (const g of def.ground) max = Math.max(max, g.x + g.w);
  return max;
}

/**
 * 스테이지 정의 검증. 오류 문자열 배열을 돌려준다(빈 배열 = 통과).
 * 각 문자열은 파일명(호출자가 넘긴 source)과 필드명을 포함한다.
 */
export function validateStage(def: StageDef, source = `stage${def?.id}.ts`): string[] {
  const err: string[] = [];
  const bad = (field: string, msg: string) => err.push(`${source}: ${field} — ${msg}`);

  if (!def || typeof def !== 'object') return [`${source}: 정의가 객체가 아닙니다.`];

  if (!Number.isInteger(def.id) || def.id < 1 || def.id > 10) {
    bad('id', '1–10 범위의 정수여야 합니다.');
  }
  if (typeof def.name !== 'string' || def.name.length < 1 || def.name.length > 24) {
    bad('name', '1–24자 문자열이어야 합니다.');
  }
  if (def.gravity !== undefined && (def.gravity < 0.5 || def.gravity > 1.5)) {
    bad('gravity', '0.5–1.5 범위여야 합니다.');
  }

  if (!Array.isArray(def.ground) || def.ground.length < 1) {
    bad('ground', '1개 이상의 세그먼트가 필요합니다.');
  } else {
    const width = worldWidthOf(def);
    const covered: [number, number][] = def.ground
      .map((g) => [g.x, g.x + g.w] as [number, number])
      .sort((a, b) => a[0] - b[0]);
    let cursor = 0;
    for (const [s, e] of covered) {
      if (s > cursor) break;
      cursor = Math.max(cursor, e);
    }
    if (cursor < width) {
      bad('ground', `월드 폭 전체(0–${width})를 덮어야 합니다. 현재 ${cursor}까지만 덮습니다.`);
    }
  }

  const worldW = worldWidthOf(def);
  if (!def.sling || typeof def.sling.x !== 'number' || typeof def.sling.y !== 'number') {
    bad('sling', '{x, y} 가 필요합니다.');
  } else if (def.sling.x > worldW * 0.25 || def.sling.y < VIRTUAL_H * 0.75) {
    bad('sling', '월드 좌하단 25% 영역 안이어야 합니다.');
  }

  if (!Number.isInteger(def.birds) || def.birds < 1 || def.birds > 6) {
    bad('birds', '1–6 범위의 정수여야 합니다.');
  }

  if (!Array.isArray(def.pigs) || def.pigs.length < 1) {
    bad('pigs', '1마리 이상이어야 합니다.');
  } else {
    def.pigs.forEach((p, i) => {
      if (typeof p.x !== 'number' || typeof p.y !== 'number' || !(p.size > 0)) {
        bad(`pigs[${i}]`, '{x, y, size} 가 모두 유효해야 합니다.');
      }
      if (p.y > GROUND_Y + 40) bad(`pigs[${i}].y`, '지면 아래에 배치되었습니다.');
    });
  }

  if (!Array.isArray(def.blocks)) {
    bad('blocks', '배열이어야 합니다.');
  } else {
    def.blocks.forEach((b, i) => {
      if (!MATERIALS.includes(b.material)) {
        bad(`blocks[${i}].material`, `wood·ice·stone·barrel 중 하나여야 합니다(받은 값: ${b.material}).`);
      }
      if (Math.min(b.w, b.h) < MIN_BLOCK_THICKNESS) {
        bad(`blocks[${i}]`, `최소 두께 ${MIN_BLOCK_THICKNESS}px 를 만족해야 합니다.`);
      }
      if (typeof b.angle !== 'number') bad(`blocks[${i}].angle`, '숫자여야 합니다.');
    });
  }

  if (!def.starScore || typeof def.starScore.two !== 'number' || typeof def.starScore.three !== 'number') {
    bad('starScore', '{two, three} 가 필요합니다.');
  } else if (!(def.starScore.two > 0 && def.starScore.two < def.starScore.three)) {
    bad('starScore', '0 < two < three 를 만족해야 합니다.');
  }

  if (!Number.isInteger(def.stepCap) || def.stepCap < 600) {
    bad('stepCap', '600 이상의 정수여야 합니다.');
  }

  return err;
}

/** 전 정의 일괄 검증. 실패하면 파일명·필드명을 담아 예외를 던진다. */
export function assertStages(defs: StageDef[]): void {
  const all: string[] = [];
  defs.forEach((d) => all.push(...validateStage(d)));
  const ids = defs.map((d) => d.id).sort((a, b) => a - b);
  const expected = Array.from({ length: 10 }, (_, i) => i + 1);
  if (ids.length !== 10 || ids.some((v, i) => v !== expected[i])) {
    all.push(`stages/index.ts: id 집합이 1–10 이어야 합니다(현재: ${ids.join(',')}).`);
  }
  if (all.length > 0) {
    throw new Error(`스테이지 검증 실패 (${all.length}건)\n` + all.join('\n'));
  }
}

/** 별 임계 자리표시자가 남아 있는가(저작 미완의 표식). */
export function hasStarPlaceholder(def: StageDef): boolean {
  return def.starScore.two === 1 && def.starScore.three === 2;
}
