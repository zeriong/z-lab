/**
 * StageDef 타입 + 파서 (§6.1, R31).
 *
 * 목표: 필수 필드가 빠진 파일이 "검은 화면"이 아니라 **파일명 + 필드 경로**로
 * 거부되는 것. 그래서 파서는 첫 오류에서 던지지 않고 issue를 모아서 돌려준다.
 *
 * 런타임 파서와 `scripts/validate-stages.ts`는 같은 함수를 쓴다.
 * 두 벌로 갈리는 순간 "검증은 통과했는데 런타임에서 죽는" 조합이 생긴다.
 */

import { MATERIALS, PIGS, BIRDS, type MaterialName, type PigSize, type BirdKind } from '../game/materials';

export type Theme = 'meadow' | 'quarry' | 'dusk';
export type ShapeKind = 'box' | 'circle';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface GroundDef {
  /** 볼록 폴리곤. 물리 바디와 화면 드로잉이 이 배열 하나를 공용한다(R16). */
  points: Array<[number, number]>;
}

export interface BodyDef {
  material: MaterialName;
  shape: ShapeKind;
  x: number;
  y: number;
  w?: number;
  h?: number;
  r?: number;
  angle?: number;
}

export interface PigDef {
  x: number;
  y: number;
  size: PigSize;
}

export interface ConstraintDef {
  /** bodies 배열의 인덱스 */
  aIndex: number;
  /** null이면 월드 고정점(pointB를 월드 좌표로 해석) */
  bIndex: number | null;
  pointA: Vec2;
  pointB: Vec2;
  /** 0..1. 1 = 강체 핀(시소 축), 0.4 이하 = 늘어나는 밧줄 */
  stiffness: number;
  length: number;
}

export interface CameraDef {
  previewRect: Rect;
  minZoom: number;
  maxZoom: number;
}

export interface StageDef {
  id: number;
  name: string;
  theme: Theme;
  gravity: number;
  camera: CameraDef;
  ground: GroundDef[];
  slingshot: Vec2;
  /** 순서 = 발사 순서 */
  birds: BirdKind[];
  bodies: BodyDef[];
  pigs: PigDef[];
  constraints?: ConstraintDef[];
  /** 3별 기준 (§6.3) */
  targetScore: number;
}

/** §12 완화책: 스테이지당 바디 상한. validate:stages가 검사한다. */
export const MAX_BODIES_PER_STAGE = 80;
export const STAGE_COUNT = 10;

const THEMES: Theme[] = ['meadow', 'quarry', 'dusk'];
const SHAPES: ShapeKind[] = ['box', 'circle'];

export class StageSchemaError extends Error {
  constructor(
    readonly source: string,
    readonly issues: string[],
  ) {
    super(`${source}: ${issues.length}건의 스키마 위반\n  - ${issues.join('\n  - ')}`);
    this.name = 'StageSchemaError';
  }
}

export type ParseResult = { ok: true; value: StageDef } | { ok: false; issues: string[] };

// --------------------------------------------------------------------------
// 원시 검사기 — 전부 issues 배열에 밀어 넣고 계속 진행한다
// --------------------------------------------------------------------------

type Bag = Record<string, unknown>;

function isBag(v: unknown): v is Bag {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(bag: Bag, key: string, path: string, issues: string[], fallback = 0): number {
  const v = bag[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    issues.push(`${path}.${key}: 유한한 number가 필요합니다 (받은 값: ${JSON.stringify(v)})`);
    return fallback;
  }
  return v;
}

function optNum(bag: Bag, key: string, path: string, issues: string[], fallback: number): number {
  if (bag[key] === undefined) return fallback;
  return num(bag, key, path, issues, fallback);
}

function str(bag: Bag, key: string, path: string, issues: string[]): string {
  const v = bag[key];
  if (typeof v !== 'string' || v.length === 0) {
    issues.push(`${path}.${key}: 비어 있지 않은 string이 필요합니다`);
    return '';
  }
  return v;
}

function oneOf<T extends string>(bag: Bag, key: string, allowed: readonly T[], path: string, issues: string[]): T {
  const v = bag[key];
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v)) {
    issues.push(`${path}.${key}: ${allowed.join(' | ')} 중 하나여야 합니다 (받은 값: ${JSON.stringify(v)})`);
    return allowed[0];
  }
  return v as T;
}

function vec2(v: unknown, path: string, issues: string[]): Vec2 {
  if (!isBag(v)) {
    issues.push(`${path}: {x, y} 객체가 필요합니다`);
    return { x: 0, y: 0 };
  }
  return { x: num(v, 'x', path, issues), y: num(v, 'y', path, issues) };
}

function rect(v: unknown, path: string, issues: string[]): Rect {
  if (!isBag(v)) {
    issues.push(`${path}: {x, y, w, h} 객체가 필요합니다`);
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  return {
    x: num(v, 'x', path, issues),
    y: num(v, 'y', path, issues),
    w: num(v, 'w', path, issues),
    h: num(v, 'h', path, issues),
  };
}

function arr(v: unknown, path: string, issues: string[]): unknown[] {
  if (!Array.isArray(v)) {
    issues.push(`${path}: 배열이 필요합니다`);
    return [];
  }
  return v;
}

// --------------------------------------------------------------------------
// 파서
// --------------------------------------------------------------------------

export function safeParseStage(raw: unknown, source: string): ParseResult {
  const issues: string[] = [];

  if (!isBag(raw)) {
    return { ok: false, issues: [`${source}: 최상위가 객체가 아닙니다`] };
  }

  const id = num(raw, 'id', '$', issues);
  if (!Number.isInteger(id) || id < 1 || id > STAGE_COUNT) {
    issues.push(`$.id: 1..${STAGE_COUNT} 범위의 정수여야 합니다 (받은 값: ${id})`);
  }

  const name = str(raw, 'name', '$', issues);
  const theme = oneOf(raw, 'theme', THEMES, '$', issues);
  const gravity = optNum(raw, 'gravity', '$', issues, 1);
  const targetScore = num(raw, 'targetScore', '$', issues);
  if (targetScore <= 0) issues.push('$.targetScore: 0보다 커야 합니다');

  // camera --------------------------------------------------------------
  let camera: CameraDef = { previewRect: { x: 0, y: 0, w: 0, h: 0 }, minZoom: 0.5, maxZoom: 1.2 };
  if (!isBag(raw.camera)) {
    issues.push('$.camera: {previewRect, minZoom, maxZoom} 객체가 필요합니다');
  } else {
    const cam = raw.camera;
    camera = {
      previewRect: rect(cam.previewRect, '$.camera.previewRect', issues),
      // §15에서 지적한 미정 칸. 기본값을 여기에 못 박는다.
      minZoom: optNum(cam, 'minZoom', '$.camera', issues, 0.55),
      maxZoom: optNum(cam, 'maxZoom', '$.camera', issues, 1.15),
    };
    if (camera.minZoom > camera.maxZoom) {
      issues.push('$.camera: minZoom이 maxZoom보다 큽니다');
    }
  }

  // ground --------------------------------------------------------------
  const groundRaw = arr(raw.ground, '$.ground', issues);
  if (groundRaw.length === 0) issues.push('$.ground: 최소 1개의 폴리곤이 필요합니다');
  const ground: GroundDef[] = groundRaw.map((g, i) => {
    const path = `$.ground[${i}]`;
    if (!isBag(g)) {
      issues.push(`${path}: {points} 객체가 필요합니다`);
      return { points: [] };
    }
    const pts = arr(g.points, `${path}.points`, issues);
    if (pts.length < 3) issues.push(`${path}.points: 점이 3개 이상이어야 합니다`);
    const points: Array<[number, number]> = pts.map((p, j) => {
      if (!Array.isArray(p) || p.length !== 2 || typeof p[0] !== 'number' || typeof p[1] !== 'number') {
        issues.push(`${path}.points[${j}]: [x, y] 숫자 쌍이 필요합니다`);
        return [0, 0];
      }
      return [p[0], p[1]];
    });
    return { points };
  });

  const slingshot = vec2(raw.slingshot, '$.slingshot', issues);

  // birds ---------------------------------------------------------------
  const birdsRaw = arr(raw.birds, '$.birds', issues);
  const birds: BirdKind[] = birdsRaw.map((b, i) => {
    if (typeof b !== 'string' || !(b in BIRDS)) {
      issues.push(`$.birds[${i}]: ${Object.keys(BIRDS).join(' | ')} 중 하나여야 합니다 (받은 값: ${JSON.stringify(b)})`);
      return 'red';
    }
    return b as BirdKind;
  });
  if (birds.length < 1) issues.push('$.birds: 최소 1마리가 필요합니다');

  // bodies --------------------------------------------------------------
  const bodiesRaw = arr(raw.bodies, '$.bodies', issues);
  const bodies: BodyDef[] = bodiesRaw.map((b, i) => {
    const path = `$.bodies[${i}]`;
    if (!isBag(b)) {
      issues.push(`${path}: 객체가 필요합니다`);
      return { material: 'wood', shape: 'box', x: 0, y: 0, w: 1, h: 1 };
    }
    const material = b.material;
    if (typeof material !== 'string' || !(material in MATERIALS)) {
      issues.push(`${path}.material: ${Object.keys(MATERIALS).join(' | ')} 중 하나여야 합니다 (받은 값: ${JSON.stringify(material)})`);
    }
    const shape = oneOf(b, 'shape', SHAPES, path, issues);
    const def: BodyDef = {
      material: (typeof material === 'string' && material in MATERIALS ? material : 'wood') as MaterialName,
      shape,
      x: num(b, 'x', path, issues),
      y: num(b, 'y', path, issues),
      angle: b.angle === undefined ? undefined : num(b, 'angle', path, issues),
    };
    if (shape === 'box') {
      def.w = num(b, 'w', path, issues);
      def.h = num(b, 'h', path, issues);
      if ((def.w ?? 0) <= 0 || (def.h ?? 0) <= 0) issues.push(`${path}: box는 w, h가 0보다 커야 합니다`);
    } else {
      def.r = num(b, 'r', path, issues);
      if ((def.r ?? 0) <= 0) issues.push(`${path}: circle은 r이 0보다 커야 합니다`);
    }
    return def;
  });

  // pigs ----------------------------------------------------------------
  const pigsRaw = arr(raw.pigs, '$.pigs', issues);
  const pigs: PigDef[] = pigsRaw.map((p, i) => {
    const path = `$.pigs[${i}]`;
    if (!isBag(p)) {
      issues.push(`${path}: 객체가 필요합니다`);
      return { x: 0, y: 0, size: 'small' as PigSize };
    }
    return {
      x: num(p, 'x', path, issues),
      y: num(p, 'y', path, issues),
      size: oneOf(p, 'size', Object.keys(PIGS) as PigSize[], path, issues),
    };
  });
  if (pigs.length < 1) issues.push('$.pigs: 최소 1마리가 필요합니다');

  // constraints ---------------------------------------------------------
  let constraints: ConstraintDef[] | undefined;
  if (raw.constraints !== undefined) {
    const consRaw = arr(raw.constraints, '$.constraints', issues);
    constraints = consRaw.map((c, i) => {
      const path = `$.constraints[${i}]`;
      if (!isBag(c)) {
        issues.push(`${path}: 객체가 필요합니다`);
        return { aIndex: 0, bIndex: null, pointA: { x: 0, y: 0 }, pointB: { x: 0, y: 0 }, stiffness: 1, length: 0 };
      }
      const aIndex = num(c, 'aIndex', path, issues);
      const bIndexRaw = c.bIndex;
      let bIndex: number | null = null;
      if (bIndexRaw !== null && bIndexRaw !== undefined) {
        bIndex = num(c, 'bIndex', path, issues);
      }
      // bodies 인덱스 참조 범위 — 이 검사가 §6.1이 약속한 "참조 인덱스 범위"다.
      if (!Number.isInteger(aIndex) || aIndex < 0 || aIndex >= bodies.length) {
        issues.push(`${path}.aIndex: bodies 범위(0..${bodies.length - 1}) 밖입니다 (받은 값: ${aIndex})`);
      }
      if (bIndex !== null && (!Number.isInteger(bIndex) || bIndex < 0 || bIndex >= bodies.length)) {
        issues.push(`${path}.bIndex: bodies 범위(0..${bodies.length - 1}) 밖이거나 null이어야 합니다 (받은 값: ${bIndex})`);
      }
      const stiffness = num(c, 'stiffness', path, issues);
      if (stiffness < 0 || stiffness > 1) issues.push(`${path}.stiffness: 0..1 범위여야 합니다`);
      const length = num(c, 'length', path, issues);
      if (length < 0) issues.push(`${path}.length: 0 이상이어야 합니다`);
      return {
        aIndex,
        bIndex,
        pointA: vec2(c.pointA, `${path}.pointA`, issues),
        pointB: vec2(c.pointB, `${path}.pointB`, issues),
        stiffness,
        length,
      };
    });
  }

  if (issues.length > 0) return { ok: false, issues };

  const value: StageDef = {
    id,
    name,
    theme,
    gravity,
    camera,
    ground,
    slingshot,
    birds,
    bodies,
    pigs,
    targetScore,
  };
  if (constraints) value.constraints = constraints;
  return { ok: true, value };
}

/** 던지는 버전 — 런타임 로드 경로에서 쓴다. */
export function parseStage(raw: unknown, source: string): StageDef {
  const result = safeParseStage(raw, source);
  if (!result.ok) throw new StageSchemaError(source, result.issues);
  return result.value;
}

// --------------------------------------------------------------------------
// 콘텐츠 규칙 — 스키마는 맞는데 플레이가 불가능한 저작 실수를 잡는다 (R33)
// --------------------------------------------------------------------------

export interface Aabb {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  label: string;
}

function bodyAabb(b: BodyDef, label: string): Aabb {
  // angle이 있으면 회전 AABB가 더 커지지만, 겹침 검사는 보수적으로
  // 미회전 AABB로 한다 — 회전 블록을 과검출해 저작을 막는 편이 낫다.
  const hw = b.shape === 'box' ? (b.w ?? 0) / 2 : (b.r ?? 0);
  const hh = b.shape === 'box' ? (b.h ?? 0) / 2 : (b.r ?? 0);
  return { minX: b.x - hw, minY: b.y - hh, maxX: b.x + hw, maxY: b.y + hh, label };
}

function overlapArea(a: Aabb, b: Aabb): number {
  const w = Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX);
  const h = Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY);
  return w > 0 && h > 0 ? w * h : 0;
}

/** 폴리곤 볼록성 — Bodies.fromVertices가 poly-decomp 없이 다룰 수 있는 조건 */
function isConvex(points: Array<[number, number]>): boolean {
  if (points.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < points.length; i += 1) {
    const p0 = points[i];
    const p1 = points[(i + 1) % points.length];
    const p2 = points[(i + 2) % points.length];
    const cross = (p1[0] - p0[0]) * (p2[1] - p1[1]) - (p1[1] - p0[1]) * (p2[0] - p1[0]);
    if (Math.abs(cross) < 1e-6) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return sign !== 0;
}

/**
 * 초기 배치 검사. 겹친 채로 시작하면 첫 프레임에 스택이 폭발한다 —
 * 저작자는 그걸 "물리가 이상하다"로 오해한다.
 *
 * 허용 오차 0.5px²: 정확히 맞닿게 저작한 블록(경계 공유)은 통과시킨다.
 */
export function validateStageContent(def: StageDef): string[] {
  const issues: string[] = [];

  if (def.pigs.length < 1) issues.push('돼지가 최소 1마리 필요합니다');
  if (def.birds.length < 1) issues.push('새가 최소 1마리 필요합니다');

  const totalBodies = def.bodies.length + def.pigs.length + def.ground.length + def.birds.length;
  if (totalBodies > MAX_BODIES_PER_STAGE) {
    issues.push(`바디 수 ${totalBodies} > 상한 ${MAX_BODIES_PER_STAGE} (§12 프레임 예산 완화책)`);
  }

  def.ground.forEach((g, i) => {
    if (!isConvex(g.points)) {
      issues.push(`ground[${i}]: 볼록 폴리곤이 아닙니다 (Bodies.fromVertices가 poly-decomp 없이 다룰 수 없음)`);
    }
  });

  const boxes: Aabb[] = [
    ...def.bodies.map((b, i) => bodyAabb(b, `bodies[${i}]:${b.material}`)),
    ...def.pigs.map((p, i) =>
      bodyAabb({ material: 'wood', shape: 'circle', x: p.x, y: p.y, r: PIGS[p.size].radius }, `pigs[${i}]:${p.size}`),
    ),
  ];

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const area = overlapArea(boxes[i], boxes[j]);
      if (area > 0.5) {
        issues.push(`초기 겹침: ${boxes[i].label} ↔ ${boxes[j].label} (겹침 면적 ${area.toFixed(1)}px²)`);
      }
    }
  }

  // 새총이 구조물 안에 박혀 있으면 첫 발사가 즉시 충돌한다.
  const sling: Aabb = {
    minX: def.slingshot.x - 40,
    minY: def.slingshot.y - 40,
    maxX: def.slingshot.x + 40,
    maxY: def.slingshot.y + 40,
    label: 'slingshot',
  };
  boxes.forEach((b) => {
    if (overlapArea(sling, b) > 0.5) issues.push(`새총 반경 40px 안에 ${b.label}가 있습니다`);
  });

  // 재질 참조 존재 — 파서가 이미 걸렀지만 데이터가 코드 경유로 만들어지는
  // 경우(테스트 픽스처 등)를 위해 한 번 더 본다.
  def.bodies.forEach((b, i) => {
    if (!(b.material in MATERIALS)) issues.push(`bodies[${i}].material: 미정의 재질 '${b.material}'`);
  });

  if (def.targetScore < def.pigs.length * 5000) {
    issues.push(`targetScore(${def.targetScore})가 돼지 점수 합(${def.pigs.length * 5000})보다 작습니다 — 3별이 자동 달성됩니다`);
  }

  return issues;
}
