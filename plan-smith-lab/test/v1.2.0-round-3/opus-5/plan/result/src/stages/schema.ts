/**
 * §10.1 스테이지 데이터 스키마 + 런타임 검증.
 * 좌표계: 원점 좌상단, y 아래 양수. 블록/돼지는 "중심" 좌표, ground는 "좌상단" 기준.
 */

export type BirdType = 'red' | 'yellow' | 'black';
export type BlockMaterial = 'wood' | 'ice' | 'stone';
export type BlockShape = 'box' | 'ball';

export interface GroundData {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BlockData {
  shape: BlockShape;
  material: BlockMaterial;
  /** 중심 x */
  x: number;
  /** 중심 y */
  y: number;
  w: number;
  h: number;
  /** rad, 기본 0 */
  angle?: number;
  /** 생략 시 재료 기본값 */
  hp?: number;
}

export interface PigData {
  x: number;
  y: number;
  r: number;
  hp?: number;
}

export interface StageData {
  id: number;
  name: string;
  world: { width: number; height: number };
  sling: { x: number; y: number };
  /** 순서대로 소모. 길이 = 발사 가능 횟수 */
  birds: BirdType[];
  ground: GroundData[];
  blocks: BlockData[];
  pigs: PigData[];
  /** 오름차순 [대충 클리어, 잘함, 의도한 정답 풀이] */
  starThresholds: [number, number, number];
  /** 스테이지 1 튜토리얼 힌트 등 */
  hint?: string;
}

/** 프리팹이 반환하는 조각 (§10.3) */
export interface StagePiece {
  blocks: BlockData[];
  pigs: PigData[];
}

/** §17 관통 리스크 완화 — 블록 최소 두께 */
export const MIN_BLOCK_THICKNESS = 12;

/**
 * 스테이지 1개 검증. 위반 메시지 배열을 반환한다(빈 배열 = 통과).
 * 개발 모드에서만 콘솔에 찍고, 프로덕션에서는 게임을 막지 않는다.
 */
export function validateStage(s: StageData): string[] {
  const errs: string[] = [];
  const tag = `stage#${s.id}(${s.name})`;

  if (!Number.isInteger(s.id) || s.id < 1) errs.push(`${tag}: id는 1 이상의 정수여야 한다`);
  if (s.world.height !== 720) errs.push(`${tag}: world.height는 720 고정이다`);
  if (s.world.width < 1280 || s.world.width > 3200) {
    errs.push(`${tag}: world.width는 1280~3200 이어야 한다 (현재 ${s.world.width})`);
  }
  if (s.birds.length < 1) errs.push(`${tag}: birds.length >= 1`);
  if (s.pigs.length < 1) errs.push(`${tag}: pigs.length >= 1`);

  const [t1, t2, t3] = s.starThresholds;
  if (!(t1 < t2 && t2 < t3)) errs.push(`${tag}: starThresholds가 오름차순이 아니다`);

  if (s.sling.x < 0 || s.sling.x > s.world.width || s.sling.y < 0 || s.sling.y > s.world.height) {
    errs.push(`${tag}: sling이 월드 밖이다`);
  }

  for (let i = 0; i < s.blocks.length; i++) {
    const b = s.blocks[i]!;
    const minSide = b.shape === 'ball' ? b.w : Math.min(b.w, b.h);
    if (minSide < MIN_BLOCK_THICKNESS) {
      errs.push(`${tag}: blocks[${i}] 두께 ${minSide} < ${MIN_BLOCK_THICKNESS} (관통 위험)`);
    }
    const half = Math.max(b.w, b.h) / 2;
    if (b.x - half < -40 || b.x + half > s.world.width + 40 || b.y + half > s.world.height + 40) {
      errs.push(`${tag}: blocks[${i}]가 월드 경계 밖이다 (${b.x}, ${b.y})`);
    }
  }

  for (let i = 0; i < s.pigs.length; i++) {
    const p = s.pigs[i]!;
    if (p.r < 10) errs.push(`${tag}: pigs[${i}] 반지름이 너무 작다`);
    if (p.x < 0 || p.x > s.world.width || p.y > s.world.height) {
      errs.push(`${tag}: pigs[${i}]가 월드 밖이다`);
    }
  }

  if (s.ground.length === 0) errs.push(`${tag}: ground가 비었다`);

  return errs;
}

/** 전체 스테이지 검증 — id 유일성 포함 (§16.1) */
export function validateAllStages(list: StageData[]): string[] {
  const errs: string[] = [];
  const seen = new Set<number>();
  for (const s of list) {
    if (seen.has(s.id)) errs.push(`중복 id: ${s.id}`);
    seen.add(s.id);
    errs.push(...validateStage(s));
  }
  return errs;
}
