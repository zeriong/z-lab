/**
 * 계획서 §5-1, §6-2: 재질별 물성/hp/점수 테이블.
 * JSON 스테이지 데이터는 재질 "이름"만 참조하고, 값은 이 파일 한 곳에서만 정의한다(값 중복 방지).
 *
 * @typedef {Object} MaterialDef
 * @property {number} density
 * @property {number} friction
 * @property {number} restitution
 * @property {number} hp
 * @property {number} score - 파괴 시 점수(§6-4)
 * @property {{fill: string, stroke: string}} render
 */

/** @type {Record<'wood'|'stone'|'ice', MaterialDef>} */
export const MATERIALS = {
  wood: {
    density: 0.002,
    friction: 0.4,
    restitution: 0.1,
    hp: 30,
    score: 50,
    render: { fill: '#c68642', stroke: '#8b5a2b' },
  },
  stone: {
    density: 0.004,
    friction: 0.6,
    restitution: 0.05,
    hp: 80,
    score: 100,
    render: { fill: '#a9a9a9', stroke: '#6e6e6e' },
  },
  ice: {
    density: 0.0015,
    friction: 0.02, // 낮은 마찰 = 미끄러짐(§6-2)
    restitution: 0.05,
    hp: 15,
    score: 20,
    render: { fill: '#cdeffd', stroke: '#7fc7e6' },
  },
};
