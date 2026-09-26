import { SETTLE_ANG, SETTLE_LIN } from '../../config/constants';

/** 새 종료와 월드 정착 판정 (§5.5). 시간은 simTime 기준. */

export interface MotionSample {
  awake: boolean;
  /** m/s */
  speed: number;
  /** rad/s */
  angSpeed: number;
}

const EPS = 1e-9;

/** 조건이 참인 동안 시작 시각을 유지하고, 거짓이 되면 null로 되돌린다 */
export function holdSince(prev: number | null, cond: boolean, now: number): number | null {
  if (!cond) return null;
  return prev ?? now;
}

export function heldFor(since: number | null, now: number, duration: number): boolean {
  return since !== null && now - since >= duration - EPS;
}

/**
 * 모든 동적 바디가 슬립이거나, 모든 바디의 선속도 < lin 이고 각속도 < ang 인가.
 * (슬립 바디는 속도가 0이므로 두 조건을 하나로 합친다.)
 */
export function isWorldCalm(samples: readonly MotionSample[], lin = SETTLE_LIN, ang = SETTLE_ANG): boolean {
  for (const m of samples) {
    if (!m.awake) continue;
    if (m.speed >= lin || m.angSpeed >= ang) return false;
  }
  return true;
}
