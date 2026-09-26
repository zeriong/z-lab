/* materials.js — §10.1 재질 표(MAT), §10.2 새 표(BIRD). 참조 전역: C */

/* 키 | density | hp | e | mu | 색 | 테두리 | 파괴 점수 */
var MAT = Object.freeze({
  glass:  { density: 0.6, hp: 30,       e: 0.15, mu: 0.30, color: '#a8dced', stroke: '#6fb6d6', score: 250 },
  wood:   { density: 1.0, hp: 60,       e: 0.20, mu: 0.50, color: '#c98b4b', stroke: '#8a5a2b', score: 500 },
  stone:  { density: 2.2, hp: 140,      e: 0.10, mu: 0.60, color: '#9aa3ab', stroke: '#6b7178', score: 750 },
  pig:    { density: 2.0, hp: 40,       e: 0.25, mu: 0.40, color: '#7fc855', stroke: '#4e8f33', score: C.SCORE_PIG },
  bird:   { density: 7.5, hp: Infinity, e: 0.35, mu: 0.40, color: null,      stroke: '#000000', score: 0 },
  ground: { density: 0,   hp: Infinity, e: 0.20, mu: 0.80, color: '#6ab04c', stroke: null,      score: 0 }
});

/* 키 | 색 | 반지름 | 능력(비행 중 탭 1회) */
var BIRD = Object.freeze({
  red:    { color: '#e2483c', r: 16, ability: 'none' },
  yellow: { color: '#f2c327', r: 14, ability: 'boost' },
  black:  { color: '#2f3237', r: 18, ability: 'explode' }
});
