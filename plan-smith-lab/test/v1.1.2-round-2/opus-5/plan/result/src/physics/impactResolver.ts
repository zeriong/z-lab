import type Matter from 'matter-js';

/**
 * 충격량 추정 (플랜 §5 충돌·파괴).
 * 정확한 impulse를 엔진에서 꺼낼 수 없으므로 "상대 법선속도 × 유효질량"으로 근사한다.
 * 정적 바디는 무한질량으로 취급 → 유효질량은 상대편 질량이 된다.
 */
export function estimateImpact(pair: Matter.Pair): number {
  const a = pair.bodyA;
  const b = pair.bodyB;
  const n = pair.collision?.normal ?? { x: 0, y: -1 };

  const rvx = b.velocity.x - a.velocity.x;
  const rvy = b.velocity.y - a.velocity.y;
  const vn = Math.abs(rvx * n.x + rvy * n.y);

  const ma = a.isStatic ? Number.POSITIVE_INFINITY : a.mass;
  const mb = b.isStatic ? Number.POSITIVE_INFINITY : b.mass;

  let meff: number;
  if (!Number.isFinite(ma) && !Number.isFinite(mb)) meff = 0;
  else if (!Number.isFinite(ma)) meff = mb;
  else if (!Number.isFinite(mb)) meff = ma;
  else meff = (ma * mb) / (ma + mb);

  return vn * meff;
}
