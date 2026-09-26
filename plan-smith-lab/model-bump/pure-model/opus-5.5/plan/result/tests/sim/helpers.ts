import { BIRDS } from '../../src/config/catalog';
import type { BirdKind } from '../../src/config/catalog';
import { DT, G, L_MAX, V_MAX, YELLOW_BOOST, YELLOW_MAX_SPEED } from '../../src/config/constants';
import { GameSession } from '../../src/core/GameSession';
import type { SessionOptions } from '../../src/core/GameSession';
import type { Vec } from '../../src/core/math';
import { anchorFor, launchPosition } from '../../src/core/slingshot';
import type { StageData } from '../../src/core/stage/schema';
import { simulateBallistic } from '../../src/core/trajectory';

/** 테스트용 스테이지. 기본으로 멀리 있는 돼지 1마리를 둬서 저절로 클리어되지 않게 한다. */
export function makeStage(partial: Partial<StageData> = {}): StageData {
  return {
    id: 1,
    name: 'sim',
    birds: ['red', 'red', 'red'],
    slingshot: { x: 260 },
    terrain: [],
    blocks: [],
    pigs: [{ size: 'S', x: 2150, y: 960 }],
    tnt: [],
    stars: [1000, 2000],
    solution: [],
    ...partial,
  };
}

export function newSession(partial: Partial<StageData> = {}, opts: SessionOptions = {}): GameSession {
  return new GameSession(makeStage(partial), opts);
}

export function stepFor(s: GameSession, seconds: number): void {
  const n = Math.round(seconds / DT);
  for (let i = 0; i < n; i++) s.step(DT);
}

export function stepUntil(s: GameSession, cond: () => boolean, maxSeconds = 30): boolean {
  const n = Math.round(maxSeconds / DT);
  for (let i = 0; i < n; i++) {
    if (cond()) return true;
    s.step(DT);
  }
  return cond();
}

/** READY가 될 때까지 진행한 뒤 발사한다 */
export function launchWhenReady(s: GameSession, pull: readonly [number, number]): boolean {
  stepUntil(s, () => s.turnState === 'READY', 5);
  return s.launch(pull);
}

export interface AimOptions {
  power?: number;
  kind?: BirdKind;
  slingX?: number;
  /** 발사 후 이 시간에 노란 새 가속을 쓴다고 가정한다 */
  boostAt?: number;
  minDeg?: number;
  maxDeg?: number;
}

interface CrossOpts {
  kind: BirdKind;
  slingX: number;
  boostAt?: number;
}

function pullFor(deg: number, power: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  const l = L_MAX * power;
  return [-l * Math.cos(r), l * Math.sin(r)];
}

/** 궤적이 x = target.x를 처음 지날 때의 y (없으면 null) */
function crossingY(pull: [number, number], target: Vec, o: CrossOpts): number | null {
  const anchor = anchorFor(o.slingX);
  const p = { x: pull[0], y: pull[1] };
  const start = launchPosition(anchor, p, BIRDS[o.kind].radius);
  const k = -V_MAX / L_MAX;
  const vel = { x: p.x * k, y: p.y * k };
  let path: Vec[];
  if (o.boostAt !== undefined) {
    const n1 = Math.round(o.boostAt / DT);
    const first = simulateBallistic(start, vel, n1);
    // 1단계 끝 속도 (반암시적 오일러: v_n = v0 + n·g·dt)
    const v1 = { x: vel.x, y: vel.y + n1 * DT * G };
    const sp = Math.hypot(v1.x, v1.y) || 1;
    const boosted = Math.min(sp * YELLOW_BOOST, YELLOW_MAX_SPEED);
    const v2 = { x: (v1.x / sp) * boosted, y: (v1.y / sp) * boosted };
    const from = first[first.length - 1] ?? start;
    path = [start, ...first, ...simulateBallistic(from, v2, 240)];
  } else {
    path = [start, ...simulateBallistic(start, vel, 360)];
  }
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    if ((a.x - target.x) * (b.x - target.x) <= 0 && a.x !== b.x) {
      const t = (target.x - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return null;
}

/**
 * target을 지나는 당김 벡터를 수치 탐색으로 찾는다 (각도 범위 안에서 오차 최소).
 * 앵커 테스트에서 "직격"을 만들기 위한 도구다.
 */
export function aimPull(target: Vec, opts: AimOptions = {}): [number, number] {
  const power = opts.power ?? 1;
  const o: CrossOpts = { kind: opts.kind ?? 'red', slingX: opts.slingX ?? 260, boostAt: opts.boostAt };
  let best: [number, number] = pullFor(0, power);
  let bestErr = Infinity;
  const lo = opts.minDeg ?? -40;
  const hi = opts.maxDeg ?? 45;
  for (let deg = lo; deg <= hi; deg += 0.02) {
    const pull = pullFor(deg, power);
    const y = crossingY(pull, target, o);
    if (y === null) continue;
    const err = Math.abs(y - target.y);
    if (err < bestErr) {
      bestErr = err;
      best = pull;
    }
  }
  return best;
}

export interface PoseSnapshot {
  id: number;
  x: number;
  y: number;
  angle: number;
}

export function poses(s: GameSession): PoseSnapshot[] {
  const out: PoseSnapshot[] = [];
  for (const e of [...s.blocks, ...s.pigs, ...s.tnts]) {
    const p = s.poseOf(e.body);
    if (p) out.push({ id: e.id, ...p });
  }
  return out;
}

export function maxDrift(a: PoseSnapshot[], b: PoseSnapshot[]): number {
  const map = new Map(b.map((p) => [p.id, p]));
  let m = 0;
  for (const p of a) {
    const q = map.get(p.id);
    if (!q) return Infinity;
    m = Math.max(m, Math.hypot(p.x - q.x, p.y - q.y));
  }
  return m;
}
