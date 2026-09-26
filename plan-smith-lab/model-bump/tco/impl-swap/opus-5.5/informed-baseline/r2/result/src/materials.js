/*
 * materials.js — 재질 표(§10.1), 새 종류 표(§10.2)
 * 노출: window.MAT, window.BIRD
 */
(function () {
  'use strict';

  // density 는 질량 계산용(§5.1), hp = 내구도, e = 반발, mu = 마찰, score = 파괴 점수
  window.MAT = {
    glass:  { density: 0.6,  hp: 30,       e: 0.15, mu: 0.30, color: '#a8dced', stroke: '#6fb6d6', score: 250 },
    wood:   { density: 1.0,  hp: 60,       e: 0.20, mu: 0.50, color: '#c98b4b', stroke: '#8a5a2b', score: 500 },
    stone:  { density: 2.2,  hp: 140,      e: 0.10, mu: 0.60, color: '#9aa3ab', stroke: '#6b7178', score: 750 },
    pig:    { density: 2.0,  hp: 40,       e: 0.25, mu: 0.40, color: '#7fc855', stroke: '#4e8f33', score: 5000 },
    bird:   { density: 7.5,  hp: Infinity, e: 0.35, mu: 0.40, color: null,      stroke: '#000000', score: 0 },
    ground: { density: null, hp: Infinity, e: 0.20, mu: 0.80, color: '#6ab04c', stroke: null,      score: 0 }
  };

  // ability: 'none' | 'boost'(속도 x1.9, 상한 2400) | 'explode'(즉시 폭발 / 첫 충돌 0.6초 후 자동 폭발)
  window.BIRD = {
    red:    { color: '#e2483c', r: 16, ability: 'none' },
    yellow: { color: '#f2c327', r: 14, ability: 'boost' },
    black:  { color: '#2f3237', r: 18, ability: 'explode' }
  };
})();
