window.AB = window.AB || {};

(function() {
  'use strict';

  AB.CONFIG = {
    WORLD_W: 1280,
    WORLD_H: 720,
    GROUND_Y: 640,
    GROUND_RESTITUTION: 0.2,
    GROUND_FRICTION: 0.8,
    GRAVITY: 900,
    FIXED_DT: 1/60,
    MAX_STEPS_PER_FRAME: 5,
    SUBSTEPS: 4,
    SOLVER_ITERATIONS: 8,
    POSITION_SLOP: 0.5,
    POSITION_PERCENT: 0.5,
    RESTITUTION_MIN_SPEED: 40,
    MAX_SPEED: 2000,
    SLEEP_SPEED: 10,
    SLEEP_TIME: 0.6,
    WAKE_SPEED: 15,
    WAKE_MARGIN: 2,
    DAMAGE_MIN_SPEED: 100,
    DAMAGE_FACTOR: 0.1,
    DAMAGE_MASS_MIN: 0.25,
    DAMAGE_MASS_MAX: 2.0,
    OUT_LEFT: -200,
    OUT_RIGHT: 1480,
    OUT_BOTTOM: 920,
    SLING_X: 220,
    SLING_Y: 500,
    SLING_MAX_PULL: 100,
    SLING_MIN_PULL: 12,
    SLING_GRAB_RADIUS: 60,
    LAUNCH_SCALE: 10,
    TRAJ_DOT_COUNT: 30,
    TRAJ_DOT_INTERVAL: 0.05,
    BIRD_REST_SPEED: 20,
    BIRD_REST_TIME: 1.0,
    BIRD_MAX_FLIGHT_TIME: 10,
    SETTLE_SPEED: 25,
    SETTLE_MIN_TIME: 0.5,
    SETTLE_MAX_TIME: 4,
    CLEAR_DELAY: 1.2,
    BIRD_BONUS: 10000,
    DASH_MULTIPLIER: 1.8,
    BOMB_RADIUS: 160,
    BOMB_IMPULSE: 1500,
    BOMB_MAX_DV: 1200,
    BOMB_DAMAGE: 200,
    BLACK_FUSE_TIME: 1.5,
    TRAIL_INTERVAL_STEPS: 3,
    TRAIL_MAX_POINTS: 150,
    STORAGE_KEY: 'angrybirds-progress-v1'
  };

  AB.MATERIALS = {
    wood: {
      density: 1.0,
      hp: 60,
      restitution: 0.2,
      friction: 0.6,
      score: 500,
      fill: '#C8873E',
      stroke: '#7A4B1C'
    },
    stone: {
      density: 2.5,
      hp: 150,
      restitution: 0.1,
      friction: 0.7,
      score: 800,
      fill: '#9AA0A6',
      stroke: '#5F6368'
    },
    ice: {
      density: 0.7,
      hp: 30,
      restitution: 0.15,
      friction: 0.2,
      score: 300,
      fill: 'rgba(173,226,255,0.75)',
      stroke: '#6FB7E0'
    }
  };

  AB.PIG_TYPES = {
    small: {
      radius: 16,
      hp: 20,
      density: 0.6,
      restitution: 0.3,
      friction: 0.5,
      score: 5000
    },
    normal: {
      radius: 20,
      hp: 30,
      density: 0.6,
      restitution: 0.3,
      friction: 0.5,
      score: 5000
    },
    big: {
      radius: 26,
      hp: 60,
      density: 0.6,
      restitution: 0.3,
      friction: 0.5,
      score: 5000
    }
  };

  AB.BIRD_TYPES = {
    red: {
      radius: 18,
      density: 3.0,
      restitution: 0.35,
      friction: 0.5,
      color: '#D62828',
      ability: 'none',
      label: '빨간 새'
    },
    yellow: {
      radius: 16,
      density: 3.0,
      restitution: 0.35,
      friction: 0.5,
      color: '#F7C325',
      ability: 'dash',
      label: '노란 새'
    },
    black: {
      radius: 21,
      density: 4.0,
      restitution: 0.35,
      friction: 0.5,
      color: '#2B2B2B',
      ability: 'bomb',
      label: '검은 새'
    }
  };
})();
