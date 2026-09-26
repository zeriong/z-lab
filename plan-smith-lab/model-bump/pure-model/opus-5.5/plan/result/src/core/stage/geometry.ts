import {
  GROUND_THICKNESS,
  GROUND_X_MAX,
  GROUND_X_MIN,
  GROUND_Y,
} from '../../config/constants';
import { PIGS, TNT } from '../../config/catalog';
import type { Vec } from '../math';
import type { BlockDef, StageData, TerrainDef } from './schema';
import { isPolyTerrain } from './schema';

/** 스테이지 데이터의 순수 기하 (검증, 겹침 검사, 렌더링 외곽선 공용). 단위는 px. */

export type SpawnShape =
  | { kind: 'poly'; points: Vec[]; label: string; isStatic: boolean }
  | { kind: 'circle'; c: Vec; r: number; label: string; isStatic: boolean };

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function rotatePoint(p: Vec, angle: number): Vec {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c };
}

export function rectLocalVerts(w: number, h: number): Vec[] {
  const hw = w / 2;
  const hh = h / 2;
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
}

/** 삼각형 블록: 바운딩 박스 중심 기준, 꼭짓점이 위쪽 */
export function triangleLocalVerts(w: number, h: number): Vec[] {
  return [
    { x: -w / 2, y: h / 2 },
    { x: w / 2, y: h / 2 },
    { x: 0, y: -h / 2 },
  ];
}

export function toWorld(local: Vec[], x: number, y: number, angle: number): Vec[] {
  return local.map((p) => {
    const r = rotatePoint(p, angle);
    return { x: r.x + x, y: r.y + y };
  });
}

export function blockLocalVerts(b: BlockDef): Vec[] | null {
  if (b.shape === 'circle') return null;
  const w = b.w ?? 0;
  const h = b.h ?? 0;
  return b.shape === 'triangle' ? triangleLocalVerts(w, h) : rectLocalVerts(w, h);
}

export function terrainWorldVerts(t: TerrainDef): Vec[] {
  if (isPolyTerrain(t)) return t.points.map(([x, y]) => ({ x, y }));
  return toWorld(rectLocalVerts(t.w, t.h), t.x, t.y, t.angle ?? 0);
}

export function groundVerts(): Vec[] {
  return [
    { x: GROUND_X_MIN, y: GROUND_Y },
    { x: GROUND_X_MAX, y: GROUND_Y },
    { x: GROUND_X_MAX, y: GROUND_Y + GROUND_THICKNESS },
    { x: GROUND_X_MIN, y: GROUND_Y + GROUND_THICKNESS },
  ];
}

export function shapeAABB(s: SpawnShape): AABB {
  if (s.kind === 'circle') {
    return { minX: s.c.x - s.r, minY: s.c.y - s.r, maxX: s.c.x + s.r, maxY: s.c.y + s.r };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of s.points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, maxX, maxY };
}

/** 스테이지의 스폰 형상 전부. 동적 바디와 정적 바디(지면, 지형)를 구분한다. */
export function stageShapes(stage: StageData, includeGround = true): SpawnShape[] {
  const out: SpawnShape[] = [];
  if (includeGround) out.push({ kind: 'poly', points: groundVerts(), label: 'ground', isStatic: true });
  stage.terrain.forEach((t, i) =>
    out.push({ kind: 'poly', points: terrainWorldVerts(t), label: `terrain[${i}]`, isStatic: true }),
  );
  stage.blocks.forEach((b, i) => {
    const local = blockLocalVerts(b);
    if (local) {
      out.push({ kind: 'poly', points: toWorld(local, b.x, b.y, b.angle ?? 0), label: `blocks[${i}]`, isStatic: false });
    } else {
      out.push({ kind: 'circle', c: { x: b.x, y: b.y }, r: b.r ?? 0, label: `blocks[${i}]`, isStatic: false });
    }
  });
  stage.pigs.forEach((p, i) =>
    out.push({ kind: 'circle', c: { x: p.x, y: p.y }, r: PIGS[p.size]?.radius ?? 0, label: `pigs[${i}]`, isStatic: false }),
  );
  (stage.tnt ?? []).forEach((t, i) =>
    out.push({
      kind: 'poly',
      points: toWorld(rectLocalVerts(TNT.w, TNT.h), t.x, t.y, 0),
      label: `tnt[${i}]`,
      isStatic: false,
    }),
  );
  return out;
}

// ── 겹침(침투 깊이) 계산: SAT ─────────────────────────────────────────

function project(points: Vec[], axis: Vec): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const p of points) {
    const d = p.x * axis.x + p.y * axis.y;
    if (d < min) min = d;
    if (d > max) max = d;
  }
  return [min, max];
}

function edgeNormals(points: Vec[]): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % points.length]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const l = Math.hypot(ex, ey) || 1;
    out.push({ x: -ey / l, y: ex / l });
  }
  return out;
}

function polyPolyPenetration(a: Vec[], b: Vec[]): number {
  let minOverlap = Infinity;
  for (const axis of [...edgeNormals(a), ...edgeNormals(b)]) {
    const [a0, a1] = project(a, axis);
    const [b0, b1] = project(b, axis);
    const overlap = Math.min(a1, b1) - Math.max(a0, b0);
    if (overlap <= 0) return 0;
    minOverlap = Math.min(minOverlap, overlap);
  }
  return minOverlap;
}

function closestOnSegment(p: Vec, a: Vec, b: Vec): Vec {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const l2 = abx * abx + aby * aby || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / l2));
  return { x: a.x + abx * t, y: a.y + aby * t };
}

function pointInConvex(p: Vec, poly: Vec[]): boolean {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) < 1e-9) continue;
    const s = Math.sign(cross);
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

function circlePolyPenetration(c: Vec, r: number, poly: Vec[]): number {
  let best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const q = closestOnSegment(c, poly[i]!, poly[(i + 1) % poly.length]!);
    best = Math.min(best, Math.hypot(q.x - c.x, q.y - c.y));
  }
  if (pointInConvex(c, poly)) return r + best;
  return Math.max(0, r - best);
}

export function penetration(a: SpawnShape, b: SpawnShape): number {
  if (a.kind === 'circle' && b.kind === 'circle') {
    return Math.max(0, a.r + b.r - Math.hypot(a.c.x - b.c.x, a.c.y - b.c.y));
  }
  if (a.kind === 'circle' && b.kind === 'poly') return circlePolyPenetration(a.c, a.r, b.points);
  if (a.kind === 'poly' && b.kind === 'circle') return circlePolyPenetration(b.c, b.r, a.points);
  if (a.kind === 'poly' && b.kind === 'poly') return polyPolyPenetration(a.points, b.points);
  return 0;
}

export interface OverlapReport {
  a: string;
  b: string;
  depth: number;
}

/** §6.4 물리 규칙: 스폰 시 모든 바디 쌍이 허용 오차 이상 겹치지 않아야 한다. */
export function spawnOverlaps(stage: StageData, tolerance: number): OverlapReport[] {
  const shapes = stageShapes(stage);
  const out: OverlapReport[] = [];
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const a = shapes[i]!;
      const b = shapes[j]!;
      if (a.isStatic && b.isStatic) continue;
      const d = penetration(a, b);
      if (d > tolerance) out.push({ a: a.label, b: b.label, depth: d });
    }
  }
  return out;
}
