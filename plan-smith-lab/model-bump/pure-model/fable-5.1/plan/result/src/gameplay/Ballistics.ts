/**
 * 발사 파라미터 ↔ 속도/위치 변환과 폐쇄식(이산) 궤적 계산.
 * Matter 의 Verlet 적분(틱마다 v.y += g, p += v)을 그대로 따라가므로
 * 충돌이 없는 한 실제 엔진과 동일한 궤적을 낸다.
 * 레벨 파일이 `aim()` 으로 정답 샷을 계산할 때 쓴다 (엔진 불필요, 순수 수학).
 */
import { ANCHOR, GRAVITY_PER_TICK, MAX_PULL, MAX_SPEED } from '../core/config';
import { clamp, degToRad, len, radToDeg, type Vec } from '../core/math';
import type { Shot } from '../levels/types';

/** 각도(도, x축 기준 반시계, 위가 +) → 단위 방향 벡터 (화면 좌표) */
export function shotDirection(angleDeg: number): Vec {
  const a = degToRad(angleDeg);
  return { x: Math.cos(a), y: -Math.sin(a) };
}

/** 발사 속도 (px/tick) */
export function shotVelocity(angleDeg: number, power: number): Vec {
  const d = shotDirection(angleDeg);
  const s = MAX_SPEED * clamp(power, 0, 1);
  return { x: d.x * s, y: d.y * s };
}

/** 발사 시점의 새 위치 = 앵커 − 방향 × 당김 길이 */
export function launchPosition(angleDeg: number, power: number): Vec {
  const d = shotDirection(angleDeg);
  const pull = MAX_PULL * clamp(power, 0, 1);
  return { x: ANCHOR.x - d.x * pull, y: ANCHOR.y - d.y * pull };
}

/** 당김 벡터(앵커→새, 클램프 완료) → 샷 파라미터 */
export function pullToShot(pull: Vec): Shot {
  const power = clamp(len(pull) / MAX_PULL, 0, 1);
  // 발사 방향은 당김의 반대
  const angle = radToDeg(Math.atan2(pull.y, -pull.x));
  return { angle, power };
}

/** 샷 파라미터 → 당김 벡터(앵커→새) */
export function shotToPull(shot: Shot): Vec {
  const d = shotDirection(shot.angle);
  const pull = MAX_PULL * clamp(shot.power, 0, 1);
  return { x: -d.x * pull, y: -d.y * pull };
}

/** 당김 벡터 → 발사 속도 (= −pull/100 × 18) */
export function pullToVelocity(pull: Vec): Vec {
  const k = MAX_SPEED / MAX_PULL;
  return { x: -pull.x * k, y: -pull.y * k };
}

/**
 * 이산 궤적: 틱 1..ticks 의 위치 목록.
 * Matter Body.update 와 동일하게 v.y += g 후 p += v.
 */
export function simulateFlight(
  pos: Vec,
  vel: Vec,
  ticks: number,
  gravity = GRAVITY_PER_TICK,
): Vec[] {
  const pts: Vec[] = [];
  let x = pos.x;
  let y = pos.y;
  let vx = vel.x;
  let vy = vel.y;
  for (let i = 0; i < ticks; i++) {
    vy += gravity;
    x += vx;
    y += vy;
    pts.push({ x, y });
  }
  return pts;
}

/** 주어진 샷이 x = targetX 를 지날 때의 y. 못 미치면 +Infinity. */
export function heightAtX(angleDeg: number, power: number, targetX: number, maxTicks = 400): number {
  const p0 = launchPosition(angleDeg, power);
  const v0 = shotVelocity(angleDeg, power);
  if (v0.x <= 0) return Infinity;
  let prev = p0;
  let x = p0.x;
  let y = p0.y;
  let vy = v0.y;
  for (let i = 0; i < maxTicks; i++) {
    vy += GRAVITY_PER_TICK;
    x += v0.x;
    y += vy;
    if (x >= targetX) {
      const t = (targetX - prev.x) / (x - prev.x);
      return prev.y + (y - prev.y) * t;
    }
    if (y > 900) return Infinity;
    prev = { x, y };
  }
  return Infinity;
}

/**
 * 목표점을 지나는 샷을 각도 고정·파워 이분 탐색으로 구한다.
 * 파워가 클수록 같은 x 에서 더 높이(화면 y 작게) 지나므로 단조 → 이분 탐색 가능.
 * 최대 파워로도 못 미치면 power 1 을 돌려준다.
 */
export function aim(target: Vec, angleDeg: number): Shot {
  let lo = 0.05;
  let hi = 1;
  if (heightAtX(angleDeg, hi, target.x) > target.y) return { angle: angleDeg, power: 1 };
  if (heightAtX(angleDeg, lo, target.x) < target.y) return { angle: angleDeg, power: lo };
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    const y = heightAtX(angleDeg, mid, target.x);
    if (y > target.y) lo = mid; // 목표보다 아래를 지남 → 파워 부족
    else hi = mid;
  }
  const power = Math.round(((lo + hi) / 2) * 10000) / 10000;
  return { angle: angleDeg, power };
}
