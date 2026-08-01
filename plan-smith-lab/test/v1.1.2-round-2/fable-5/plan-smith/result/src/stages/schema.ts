// 스테이지 JSON 스키마 + 명시적 검증 (플랜 S3 — 스키마 위반 데이터는 로드 시 명시적 에러)

export type Material = 'wood' | 'stone' | 'glass';

export interface BlockDef {
  material: Material;
  x: number;
  y: number;
  w: number;
  h: number;
  angle?: number; // radians
  hp?: number; // 생략 시 재질 기본값
}

export interface PigDef {
  x: number;
  y: number;
  r?: number; // 기본 18
  hp?: number; // 기본 50
}

export interface StageDef {
  id: number;
  name: string;
  slingshot: { x: number; y: number };
  birds: number;
  blocks: BlockDef[];
  pigs: PigDef[];
  /** 별 2개 점수 임계 (임의값 — 플랜: S7 실측 교체 예정) */
  scoreStar2: number;
}

const MATERIALS: Material[] = ['wood', 'stone', 'glass'];

function fail(stageId: unknown, msg: string): never {
  throw new Error(`Stage schema violation (stage ${String(stageId)}): ${msg}`);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

export function validateStage(raw: unknown): StageDef {
  if (typeof raw !== 'object' || raw === null) fail('?', 'stage is not an object');
  const s = raw as Record<string, unknown>;

  if (!isFiniteNumber(s.id) || s.id < 1) fail(s.id, 'id must be a number >= 1');
  const id = s.id;

  if (typeof s.name !== 'string' || s.name.length === 0) fail(id, 'name must be a non-empty string');

  const sling = s.slingshot as Record<string, unknown> | undefined;
  if (!sling || !isFiniteNumber(sling.x) || !isFiniteNumber(sling.y)) {
    fail(id, 'slingshot must be {x:number, y:number}');
  }

  if (!isFiniteNumber(s.birds) || s.birds < 1) fail(id, 'birds must be a number >= 1');

  if (!Array.isArray(s.blocks)) fail(id, 'blocks must be an array');
  s.blocks.forEach((b: unknown, i: number) => {
    const blk = b as Record<string, unknown>;
    if (!blk || !MATERIALS.includes(blk.material as Material)) {
      fail(id, `blocks[${i}].material must be one of ${MATERIALS.join('/')}`);
    }
    for (const k of ['x', 'y', 'w', 'h'] as const) {
      if (!isFiniteNumber(blk[k])) fail(id, `blocks[${i}].${k} must be a number`);
    }
    if ((blk.w as number) <= 0 || (blk.h as number) <= 0) {
      fail(id, `blocks[${i}] w/h must be > 0`);
    }
    if (blk.hp !== undefined && (!isFiniteNumber(blk.hp) || blk.hp <= 0)) {
      fail(id, `blocks[${i}].hp must be > 0 when present`);
    }
  });

  if (!Array.isArray(s.pigs) || s.pigs.length < 1) fail(id, 'pigs must be a non-empty array');
  s.pigs.forEach((p: unknown, i: number) => {
    const pig = p as Record<string, unknown>;
    if (!pig || !isFiniteNumber(pig.x) || !isFiniteNumber(pig.y)) {
      fail(id, `pigs[${i}] must have numeric x,y`);
    }
    if (pig.r !== undefined && (!isFiniteNumber(pig.r) || pig.r <= 0)) {
      fail(id, `pigs[${i}].r must be > 0 when present`);
    }
  });

  if (!isFiniteNumber(s.scoreStar2) || s.scoreStar2 <= 0) fail(id, 'scoreStar2 must be > 0');

  return raw as StageDef;
}
