import {
  DT,
  G,
  GROUND_Y,
  PPM,
  PREVIEW_DOT_EVERY_STEPS,
  PREVIEW_SECONDS,
} from '../config/constants';
import type { Vec } from './math';

/**
 * 궤적 예측 (§5.2). Box2D의 반암시적 오일러 적분을 그대로 재현한다.
 *   v += g·dt  →  v *= 1 / (1 + dt·linearDamping)  →  x += v·dt
 * 계산은 엔진과 같은 단위(m)로 하고 결과만 px로 바꾼다. 블록과의 충돌은 무시한다.
 */

export interface BallisticOpts {
  dt: number;
  /** m/s² (y-down) */
  gravity: number;
  ppm: number;
  linearDamping: number;
}

export const DEFAULT_BALLISTIC: BallisticOpts = { dt: DT, gravity: G, ppm: PPM, linearDamping: 0 };

/** 스텝마다의 위치(px)를 돌려준다. out[i]는 (i+1)스텝 후 위치 */
export function simulateBallistic(startPx: Vec, velMps: Vec, steps: number, o: BallisticOpts = DEFAULT_BALLISTIC): Vec[] {
  const out: Vec[] = [];
  let x = startPx.x / o.ppm;
  let y = startPx.y / o.ppm;
  let vx = velMps.x;
  let vy = velMps.y;
  const damp = 1 / (1 + o.dt * o.linearDamping);
  for (let i = 0; i < steps; i++) {
    vy += o.dt * o.gravity;
    vx *= damp;
    vy *= damp;
    x += o.dt * vx;
    y += o.dt * vy;
    out.push({ x: x * o.ppm, y: y * o.ppm });
  }
  return out;
}

export interface PreviewOpts {
  seconds?: number;
  everySteps?: number;
  groundY?: number;
  ballistic?: BallisticOpts;
}

/**
 * AIMING 중 표시할 예측 점. 비행 초반 seconds 분량을 everySteps 스텝마다 하나씩.
 * 예측점이 지면 아래로 내려가면 거기서 멈춘다.
 */
export function predictDots(startPx: Vec, velMps: Vec, opts: PreviewOpts = {}): Vec[] {
  const b = opts.ballistic ?? DEFAULT_BALLISTIC;
  const seconds = opts.seconds ?? PREVIEW_SECONDS;
  const every = opts.everySteps ?? PREVIEW_DOT_EVERY_STEPS;
  const groundY = opts.groundY ?? GROUND_Y;
  const steps = Math.round(seconds / b.dt);
  const path = simulateBallistic(startPx, velMps, steps, b);
  const dots: Vec[] = [];
  for (let i = every - 1; i < path.length; i += every) {
    const p = path[i]!;
    if (p.y > groundY) break;
    dots.push(p);
  }
  return dots;
}
