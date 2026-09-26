/**
 * 정착(settled) 판정 (§6.3).
 * 조건 A: 모든 동적 바디가 수면 중이거나 (speed < eps && angularSpeed < eps) 를 quietTicks 연속 유지.
 * 조건 B: timeoutTicks 경과.
 */
import type Matter from 'matter-js';
import { SETTLE } from '../core/config';

export function isBodyQuiet(
  body: Matter.Body,
  speedEps = SETTLE.speedEps,
  angularEps = SETTLE.angularEps,
): boolean {
  if (body.isStatic || body.isSleeping) return true;
  return body.speed < speedEps && body.angularSpeed < angularEps;
}

export class SettleTracker {
  quietCount = 0;
  elapsed = 0;
  settled = false;
  timedOut = false;

  constructor(
    private readonly quietTicks: number = SETTLE.quietTicks,
    private readonly timeoutTicks: number = SETTLE.timeoutTicks,
  ) {}

  reset(): void {
    this.quietCount = 0;
    this.elapsed = 0;
    this.settled = false;
    this.timedOut = false;
  }

  /** 매 틱 호출. 정착이면 true. */
  update(bodies: readonly Matter.Body[]): boolean {
    if (this.settled) return true;
    this.elapsed += 1;
    let allQuiet = true;
    for (const b of bodies) {
      if (!isBodyQuiet(b)) {
        allQuiet = false;
        break;
      }
    }
    this.quietCount = allQuiet ? this.quietCount + 1 : 0;
    if (this.quietCount >= this.quietTicks) {
      this.settled = true;
    } else if (this.elapsed >= this.timeoutTicks) {
      this.settled = true;
      this.timedOut = true;
    }
    return this.settled;
  }
}
