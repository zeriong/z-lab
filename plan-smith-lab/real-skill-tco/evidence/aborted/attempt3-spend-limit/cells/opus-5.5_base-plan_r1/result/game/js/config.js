(function () {
  'use strict';

  var AB = window.AB = window.AB || {};

  var STEP_MS = 1000 / 60;
  var GRAVITY_Y = 1;
  var GRAVITY_SCALE = 0.001;
  var BIRD_R = 20;

  // All tuning constants. Units: px, px/step (1 step = STEP_MS).
  AB.C = Object.freeze({
    WORLD_W: 1600,
    WORLD_H: 900,
    GROUND_Y: 800,

    STEP_MS: STEP_MS,
    MAX_FRAME_MS: 100,
    MAX_STEPS_PER_FRAME: 5,

    GRAVITY_Y: GRAVITY_Y,
    GRAVITY_SCALE: GRAVITY_SCALE,
    // Velocity gained per step from gravity (Matter Verlet: g * scale * dt^2).
    G_STEP: GRAVITY_Y * GRAVITY_SCALE * STEP_MS * STEP_MS,

    SLING_X: 230,
    SLING_Y: 650,
    BIRD_R: BIRD_R,
    MAX_PULL: 120,
    MIN_PULL: 15,
    GRAB_RADIUS: 70,
    MAX_LAUNCH_SPEED: 20,

    PREDICT_STEPS: 50,
    PREDICT_DOT_EVERY: 3,
    TRAIL_EVERY: 3,
    TRAIL_MAX: 200,

    MIN_IMPACT: 1.5,
    DAMAGE_K: 10,

    REST_SPEED: 0.25,
    REST_ANG: 0.02,
    REST_STEPS: 30,
    BIRD_SLOW_SPEED: 0.3,
    BIRD_SLOW_STEPS: 40,
    FLIGHT_MAX_STEPS: 480,
    SETTLE_MAX_STEPS: 240,
    CLEAR_SETTLE_MAX_STEPS: 90,

    OOB_MARGIN: 100,
    BIRD_BONUS: 10000,
    BIRD_FRICTION_AIR_AFTER_HIT: 0.02,

    YELLOW_BOOST: 2,
    YELLOW_MIN_SPEED: 16,
    YELLOW_MAX_SPEED: 26,

    EXPLOSION_R: 170,
    EXPLOSION_DAMAGE: 170,
    EXPLOSION_IMPULSE: 60,
    EXPLOSION_MAX_DV: 20,
    BLACK_FUSE_STEPS: 90,

    PARTICLE_MAX: 300,
    DPR_MAX: 2
  });

  AB.MATERIALS = Object.freeze({
    wood: Object.freeze({
      density: 0.0015, friction: 0.7, frictionStatic: 1.0, restitution: 0.05,
      hp: 60, score: 500, fill: '#c8893d', stroke: '#7a4f1d'
    }),
    ice: Object.freeze({
      density: 0.0010, friction: 0.3, frictionStatic: 0.6, restitution: 0.10,
      hp: 30, score: 300, fill: 'rgba(170,220,255,0.85)', stroke: '#5fa8d8'
    }),
    stone: Object.freeze({
      density: 0.0040, friction: 0.9, frictionStatic: 1.2, restitution: 0.02,
      hp: 140, score: 1000, fill: '#9aa0a6', stroke: '#5f6368'
    }),
    terrain: Object.freeze({
      isStatic: true, friction: 1.0, frictionStatic: 1.0, restitution: 0.1,
      hp: Infinity, score: 0, fill: '#8b5a2b', stroke: '#5c3a1a', grass: '#6b8e23'
    })
  });

  // Pigs are 8-sided polygons (r = circumradius); shared physical properties.
  var PIG_DENSITY = 0.0012;
  var PIG_FRICTION = 0.8;
  var PIG_FRICTION_STATIC = 1.0;
  var PIG_RESTITUTION = 0.1;

  function pigDef(r, hp, score, look) {
    return Object.freeze({
      r: r, hp: hp, score: score, look: look,
      density: PIG_DENSITY, friction: PIG_FRICTION,
      frictionStatic: PIG_FRICTION_STATIC, restitution: PIG_RESTITUTION
    });
  }

  AB.PIGS = Object.freeze({
    small: pigDef(18, 15, 3000, 'basic'),
    medium: pigDef(24, 30, 5000, 'basic'),
    large: pigDef(32, 60, 7000, 'basic'),
    helmet: pigDef(24, 70, 7000, 'helmet'),
    king: pigDef(40, 120, 10000, 'king')
  });

  // Birds are circles of BIRD_R with identical density, so one trajectory
  // prediction formula covers all of them.
  function birdDef(color, dmg, ability) {
    return Object.freeze({
      color: color, dmg: Object.freeze(dmg), ability: ability,
      r: BIRD_R, density: 0.004, friction: 0.5, restitution: 0.35, frictionAir: 0
    });
  }

  AB.BIRDS = Object.freeze({
    red: birdDef('#d62828', { wood: 1, ice: 1, stone: 0.5, pig: 1 }, null),
    yellow: birdDef('#f4c20d', { wood: 2, ice: 1, stone: 0.4, pig: 1 }, 'dash'),
    black: birdDef('#2b2b2b', { wood: 1, ice: 1, stone: 1, pig: 1 }, 'bomb')
  });
})();
