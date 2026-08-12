/**
 * 정지(settle) 판정 (§7.4) — 턴 진행의 유일한 축.
 *
 * maxSpeed < 0.35 가 0.8초 지속되거나, 발사 후 6초가 지나면 턴 종료.
 * 세 값 모두 **초기값**이며 §9 Step 10에서 교체 대상 1순위다(§15 세 번째 항목:
 * 이 임계 하나에 클리어와 실패 두 표면이 동시에 걸려 있다).
 *
 * 타임아웃이 필요한 이유: 굴러다니는 원형 잔해는 0.35 아래로 안 내려갈 수 있다.
 * 임계만 있으면 그 스테이지는 다음 발사가 영원히 막힌다.
 */

import type { Body } from 'matter-js';

export const SETTLE_SPEED = 0.35;
export const SETTLE_HOLD_MS = 800;
export const TURN_TIMEOUT_MS = 6000;

export class SettleTracker {
  private quietMs = 0;
  private sinceLaunchMs = 0;
  private armed = false;
  /** 진단용: 마지막으로 본 최대 속도 */
  lastMaxSpeed = 0;
  /** 어떤 이유로 끝났는지 — 타임아웃이 잦으면 임계값이 틀린 것이다 */
  lastReason: 'none' | 'quiet' | 'timeout' = 'none';

  constructor(
    readonly speedThreshold: number = SETTLE_SPEED,
    readonly holdMs: number = SETTLE_HOLD_MS,
    readonly timeoutMs: number = TURN_TIMEOUT_MS,
  ) {}

  /** 발사 순간 호출. 이때부터 타이머가 돈다. */
  arm(): void {
    this.armed = true;
    this.quietMs = 0;
    this.sinceLaunchMs = 0;
    this.lastReason = 'none';
  }

  disarm(): void {
    this.armed = false;
    this.quietMs = 0;
    this.sinceLaunchMs = 0;
  }

  get isArmed(): boolean {
    return this.armed;
  }

  get elapsedMs(): number {
    return this.sinceLaunchMs;
  }

  /**
   * @returns 이번 스텝에서 턴이 끝났으면 true (한 번만 true를 낸다)
   */
  update(bodies: readonly Body[], dtMs: number): boolean {
    if (!this.armed) return false;

    this.sinceLaunchMs += dtMs;

    let maxSpeed = 0;
    for (const body of bodies) {
      if (body.isStatic) continue;
      if (body.isSleeping) continue; // 잠든 바디는 정의상 정지
      if (body.speed > maxSpeed) maxSpeed = body.speed;
    }
    this.lastMaxSpeed = maxSpeed;

    if (maxSpeed < this.speedThreshold) {
      this.quietMs += dtMs;
    } else {
      this.quietMs = 0;
    }

    if (this.quietMs >= this.holdMs) {
      this.lastReason = 'quiet';
      this.armed = false;
      return true;
    }

    if (this.sinceLaunchMs >= this.timeoutMs) {
      this.lastReason = 'timeout';
      this.armed = false;
      return true;
    }

    return false;
  }

  /** 클리어/실패 판정이 참조하는 "월드가 멎었다"의 단일 출처 */
  isSettled(): boolean {
    return !this.armed;
  }
}
