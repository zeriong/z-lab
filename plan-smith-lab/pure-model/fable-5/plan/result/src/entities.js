// 파괴 가능 오브젝트 공통 규칙 — 재질 테이블(밀도·HP·임계·색·점수)을 한 곳에 모은다 (§3.1, §6 리스크 대비).
// 충격 단위: 충돌 쌍의 상대속도 법선 성분(px/tick, tick = 1000/60ms) (§3.4).

export const MATERIALS = {
  glass: {
    density: 0.0012,
    hp: 1,
    threshold: 2.5, // 스치면 깨짐
    score: 300,
    color: '#bfe6f2',
    edge: '#7fb8cc',
  },
  wood: {
    density: 0.002,
    hp: 2, // 약한 충격 2회 또는 강한 충격 1회
    threshold: 4.5,
    score: 500,
    color: '#c98d4f',
    edge: '#8a5a2b',
  },
  stone: {
    density: 0.004,
    hp: 3,
    threshold: 7,
    score: 800,
    color: '#a3a8ad',
    edge: '#61666b',
  },
};

export const PIG_SPEC = {
  density: 0.0012,
  hp: 1, // 임계 충격 1회로 제거 (§3.1)
  threshold: 3, // 낮게 — 블록에 깔림/낙하 충격으로도 제거되도록 (§3.4)
  score: 5000,
  color: '#78c841',
  edge: '#4e8b26',
};

export const BONUS_PER_BIRD = 10000; // 클리어 시 남은 새 1마리당 (§3.5)

export function specOf(data) {
  if (!data) return null;
  if (data.kind === 'pig') return PIG_SPEC;
  if (data.kind === 'block') return MATERIALS[data.material] || null;
  return null;
}

export function isDestructible(data) {
  return !!data && (data.kind === 'pig' || data.kind === 'block');
}

// 충격 → 피해량. 임계 미만 0, 임계 이상 1, 임계 2배 이상 2(강한 충격 1회 파괴 규칙).
export function computeDamage(data, impact) {
  const spec = specOf(data);
  if (!spec) return 0;
  if (impact < spec.threshold) return 0;
  return impact >= spec.threshold * 2 ? 2 : 1;
}
