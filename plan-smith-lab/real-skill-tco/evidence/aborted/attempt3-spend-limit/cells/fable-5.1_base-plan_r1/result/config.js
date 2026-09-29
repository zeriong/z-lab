// config.js — 정의: CFG, MATERIALS, BIRDS, PIGS, V / 의존: 없음
'use strict';

// §4.1 상수. 계획서 값 그대로.
const CFG = {
  WORLD_W: 1600,
  WORLD_H: 900,
  GROUND_Y: 820,
  STEP_MS: 1000 / 60,
  G_STEP: 0.27778, // = 1 × 0.001 × (1000/60)²  (Matter 기본 중력, 스텝당 속도 증가)

  SLING_X: 230,
  SLING_Y: 640,
  MAX_PULL: 110,
  MAX_SPEED: 20,
  MIN_PULL: 12,
  GRAB_RADIUS: 80,

  SETTLE_GRACE_STEPS: 60,
  DAMAGE_MIN_SPEED: 3,
  SHOT_STOP_SPEED: 0.3,
  SHOT_STOP_STEPS: 90,
  SHOT_MAX_STEPS: 600,
  AFTERMATH_MIN_STEPS: 30,
  AFTERMATH_MAX_STEPS: 180,
  AFTERMATH_SETTLE_SPEED: 0.5,
  OOB_MARGIN: 150,

  EXPLOSION_R: 220,
  EXPLOSION_KICK: 14,
  EXPLOSION_DMG: 120,
  EXPLODE_DELAY_STEPS: 60,
  BOOST_MULT: 1.7,
  BOOST_MAX: 32,
  BIRD_AIR_AFTER_HIT: 0.02,
  TRAIL_EVERY: 2,

  SCORE_BIRD_LEFT: 10000,
  STAR2_EXTRA: 4000,
  STAR3_EXTRA: 12000
};

// §7.1 재질 테이블
const MATERIALS = {
  wood: {
    density: 0.0012, friction: 0.6, restitution: 0.10, hp: 35, score: 500,
    fill: '#c8894a', stroke: '#8a5a2b'
  },
  ice: {
    density: 0.0009, friction: 0.15, restitution: 0.15, hp: 12, score: 300,
    fill: 'rgba(170,220,255,0.85)', stroke: '#7fb7e6'
  },
  stone: {
    density: 0.0030, friction: 0.7, restitution: 0.05, hp: 80, score: 800,
    fill: '#9a9a9a', stroke: '#5f5f5f'
  }
};

// §7.1 새 테이블 (공통: 원형, frictionAir 0, friction 0.5, restitution 0.35 — physics.js에서 적용)
const BIRDS = {
  red:    { r: 20, density: 0.004, color: '#d33' },
  yellow: { r: 18, density: 0.004, color: '#f2c122' },
  black:  { r: 24, density: 0.005, color: '#333' }
};

// §7.1 돼지 테이블 (공통: 원형, density 0.002, friction 0.5, restitution 0.2, frictionAir 0.01)
const PIGS = {
  small: { r: 18, hp: 20, score: 5000 },
  large: { r: 27, hp: 40, score: 8000 }
};

// 벡터 헬퍼 (Matter.Vector 대신 사용). 모두 새 객체를 반환하고 인자를 바꾸지 않는다.
const V = {
  len: function (a) {
    return Math.sqrt(a.x * a.x + a.y * a.y);
  },
  sub: function (a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  },
  add: function (a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  },
  scale: function (a, k) {
    return { x: a.x * k, y: a.y * k };
  },
  norm: function (a) {
    const l = Math.sqrt(a.x * a.x + a.y * a.y);
    if (l < 1e-9) return { x: 0, y: 0 };
    return { x: a.x / l, y: a.y / l };
  },
  dist: function (a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
};
