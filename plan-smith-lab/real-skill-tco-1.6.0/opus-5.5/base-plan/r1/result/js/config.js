// config.js — 모든 튜닝 수치와 엔티티 정의 (plan §4.8, §5, §15.1)
(function () {
  'use strict';
  const AB = (window.AB = window.AB || {});

  AB.CONFIG = {
    // ---------- 물리 (§4.8) ----------
    FIXED_DT: 1 / 120,
    MAX_STEPS_PER_FRAME: 8,
    MAX_FRAME_DT: 0.1,
    GRAVITY: -10,
    ITERATIONS: 10,
    BAUMGARTE: 0.2,
    SLOP: 0.01,
    MAX_CORRECTION_VEL: 4,
    CONTACT_MARGIN: 0.02,
    RESTITUTION_THRESHOLD: 1.0,
    WARM_MATCH_DIST: 0.05,
    SLEEP_LIN: 0.08,
    SLEEP_ANG: 0.12,
    TIME_TO_SLEEP: 0.5,
    BOX_REL_TOL: 0.95,
    BOX_ABS_TOL: 0.01,
    EPSILON: 1e-9,

    // ---------- 화면 (§3) ----------
    VIEW_W: 1280,
    VIEW_H: 720,
    PPM: 40,
    GROUND_SCREEN_Y: 640,
    WORLD_MAX_X: 32,

    // ---------- 월드 구성 ----------
    GROUND: { x: 16, y: -1, hw: 30, hh: 1 },
    GROUND_FRICTION: 0.9,
    GROUND_RESTITUTION: 0.1,
    ROCK_FRICTION: 0.9,
    ROCK_RESTITUTION: 0.1,
    BLOCK_LIN_DAMP: 0.02,
    BLOCK_ANG_DAMP: 0.1,
    BLOCK_HP_AREA_REF: 0.6,
    BLOCK_HP_MIN_SCALE: 0.5,

    // ---------- 슬링샷 (§7) ----------
    SLING_ANCHOR: { x: 5.0, y: 2.9 },
    GRAB_RADIUS: 1.5,
    MAX_PULL: 2.2,
    MIN_PULL: 0.45,
    MAX_LAUNCH_SPEED: 20,
    SLING_GROUND_PAD: 0.05,
    PREVIEW_TIME: 0.8,
    PREVIEW_SAMPLE: 5,
    QUEUE_BIRD_X0: 3.9,
    QUEUE_BIRD_DX: 0.9,

    // 새총 모양 (§11.2)
    SLING: {
      BASE: { x: 5.0, y: 0 },
      FORK: { x: 5.0, y: 1.9 },
      BACK_TIP: { x: 5.3, y: 3.0 },
      FRONT_TIP: { x: 4.7, y: 3.0 },
      BAND_Y: 2.95,
      WOOD_WIDTH: 8,
      BAND_WIDTH: 5,
    },

    // ---------- 피해·파괴 (§6) ----------
    DAMAGE_MIN_SPEED: 1.0,
    DAMAGE_K: 1.0,
    MIN_DAMAGE: 0.5,
    BREAK_SLOWDOWN: 0.75,
    WAKE_PAD: 0.15,
    EXPLOSION_SPIN: 3,
    KILL_BOUNDS: { minX: -5, maxX: 40, minY: -5 },

    // ---------- 새 (§5.4) ----------
    BIRD_FRICTION: 0.5,
    BIRD_RESTITUTION: 0.3,
    BIRD_GROUP: 'bird',
    BIRD_ROLL_LIN_DAMP: 0.3,
    BIRD_ROLL_ANG_DAMP: 1.5,
    BIRD_REST_SPEED: 0.25,
    BIRD_REST_ANG: 0.5,
    BIRD_REST_TIME: 1.0,
    BIRD_MAX_LIFETIME: 9,
    BLACK_FUSE: 1.5,
    BLACK_EXPLOSION: { R: 3.0, J: 60, D: 90 },
    TNT_EXPLOSION: { R: 2.5, J: 45, D: 70 },
    YELLOW_BOOST_SPEED: 26,
    BLUE_SPLIT_ANGLE: 0.25,
    BLUE_SPLIT_OFFSET: 0.35,
    TRAIL_INTERVAL: 0.04,
    TRAIL_MAX: 250,

    // ---------- 턴 (§8) ----------
    NEXT_BIRD_DELAY: 0.8,
    CLEAR_DELAY: 1.5,
    FAIL_QUIET_TIME: 1.0,
    FAIL_MAX_WAIT: 6,
    QUIET_SPEED: 0.15,
    QUIET_ANG: 0.3,

    // ---------- 점수 (§6.5) ----------
    SCORE_PIG: 5000,
    SCORE_BIRD_LEFT: 10000,
    STAR2: { blockRatio: 0.2, bonus: 10000 },
    STAR3: { blockRatio: 0.45, bonus: 20000 },
    STAR_ROUND: 100,

    // ---------- 연출 ----------
    FX: {
      DEBRIS_COUNT: 8,
      DEBRIS_SPEED: 4,
      DEBRIS_LIFE: 0.9,
      DEBRIS_SIZE_MIN: 4,
      DEBRIS_SIZE_MAX: 9,
      DEBRIS_SPIN: 10,
      PIG_SMOKE_COUNT: 6,
      BIRD_SMOKE_COUNT: 4,
      SMOKE_LIFE: 0.8,
      SMOKE_SPEED: 1.2,
      SMOKE_RISE: 0.8,
      SMOKE_GROW: 1.8,
      EXPLOSION_DEBRIS: 14,
      EXPLOSION_DEBRIS_SPEED: 8,
      RING_TIME: 0.35,
      RING_WIDTH: 6,
      POPUP_TIME: 1.0,
      POPUP_RISE: 30,
      POPUP_FONT_PX: 22,
      TRAIL_DOT_R: 2,
      TRAIL_ALPHA: 0.45,
      PREVIEW_R_FRONT: 5,
      PREVIEW_R_BACK: 2,
      PREVIEW_A_FRONT: 1,
      PREVIEW_A_BACK: 0.3,
      FUSE_BLINK_HZ: 10,
      CLOUD_SPEED: 8,
      CLOUD_WRAP_PAD: 200,
      BLOCK_LINE: 2,
      CRACK_LINE: 1.5,
      CRACK_1: 0.66,
      CRACK_2: 0.33,
      PIG_BRUISE: 0.5,
    },

    // 배경 장식 (논리 px)
    CLOUDS: [
      { x: 120, y: 110, s: 1.0 },
      { x: 480, y: 70, s: 0.8 },
      { x: 820, y: 140, s: 1.2 },
      { x: 1120, y: 90, s: 0.9 },
    ],
    CLOUD_PUFFS: [
      { dx: 0, dy: 0, r: 34 },
      { dx: 38, dy: -14, r: 40 },
      { dx: 80, dy: 0, r: 32 },
      { dx: 40, dy: 12, r: 30 },
    ],
    HILLS: [
      { x: 230, r: 260 },
      { x: 720, r: 190 },
      { x: 1120, r: 300 },
    ],
    GRASS_PX: 12,
    ROCK_GRASS_PX: 6,

    // ---------- 기타 ----------
    STORAGE_KEY: 'ab-web-progress-v1',
    FONT_FAMILY: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
    HINT_FIRST_SHOT: '새를 뒤로 끌어당겼다 놓아서 발사하세요!',
  };

  AB.COLORS = {
    SKY_TOP: '#8fd3ff',
    SKY_BOTTOM: '#e6f7ff',
    CLOUD: 'rgba(255,255,255,0.9)',
    HILL: '#b5e3a1',
    GRASS: '#5fa83a',
    DIRT: '#8a6642',
    ROCK_FILL: '#7c6f64',
    ROCK_STROKE: '#4e453d',
    SLING_WOOD: '#6d4323',
    SLING_BAND: '#3b2412',
    PIG_FILL: '#7ed957',
    PIG_STROKE: '#3f8f2a',
    PIG_SNOUT: '#a6ea85',
    PIG_NOSTRIL: '#2f6b1f',
    PIG_BRUISE: 'rgba(63,120,35,0.55)',
    PIG_SMOKE: '#9be27a',
    CROWN: '#ffc107',
    CROWN_STROKE: '#b8860b',
    BIRD_BELLY: '#fff3e0',
    BIRD_BEAK: '#ff9800',
    BIRD_STROKE: 'rgba(0,0,0,0.55)',
    EYE_WHITE: '#ffffff',
    PUPIL: '#111111',
    BROW: '#111111',
    FUSE: '#c8a15a',
    FUSE_IDLE: '#8d8d8d',
    FUSE_ON_A: '#ff3d00',
    FUSE_ON_B: '#ffeb3b',
    BIRD_SMOKE: '#dddddd',
    TRAIL: '#ffffff',
    PREVIEW: '#ffffff',
    RING: '#ffb300',
    EXPLOSION_A: '#ff9800',
    EXPLOSION_B: '#ffeb3b',
    POPUP_FILL: '#ffffff',
    POPUP_STROKE: '#000000',
    CRACK: 'rgba(40,25,10,0.75)',
    WOOD_GRAIN: 'rgba(90,55,20,0.55)',
    STONE_DOT: 'rgba(60,66,70,0.7)',
    GLASS_SHINE: 'rgba(255,255,255,0.85)',
    TNT_TEXT: '#ffffff',
  };

  // §5.1 재질
  AB.MATERIALS = {
    glass: { density: 2.5, friction: 0.4, restitution: 0.05, baseHp: 8, score: 300, fill: 'rgba(190,233,255,0.75)', stroke: '#6fb7d8', fixedHp: false },
    wood: { density: 5, friction: 0.7, restitution: 0.1, baseHp: 20, score: 500, fill: '#c8894b', stroke: '#7a4f24', fixedHp: false },
    stone: { density: 12, friction: 0.8, restitution: 0.05, baseHp: 60, score: 800, fill: '#9ea4a8', stroke: '#5f666b', fixedHp: false },
    tnt: { density: 4, friction: 0.6, restitution: 0.1, baseHp: 5, score: 1000, fill: '#d9432f', stroke: '#7a1d12', fixedHp: true },
  };

  // §5.2 블록 크기 (w × h, m)
  AB.BLOCK_SIZES = {
    P2: { w: 0.3, h: 2.0 },
    P1: { w: 0.3, h: 1.2 },
    B3: { w: 3.0, h: 0.3 },
    B2: { w: 2.0, h: 0.3 },
    C1: { w: 1.0, h: 1.0 },
    C06: { w: 0.6, h: 0.6 },
    TNT: { w: 0.8, h: 0.8 },
  };

  // §5.3 돼지
  AB.PIG_TYPES = {
    S: { r: 0.35, density: 4, hp: 8, friction: 0.6, restitution: 0.2, linDamp: 0.05, angDamp: 0.8 },
    M: { r: 0.5, density: 4, hp: 15, friction: 0.6, restitution: 0.2, linDamp: 0.05, angDamp: 0.8 },
    L: { r: 0.7, density: 4, hp: 28, friction: 0.6, restitution: 0.2, linDamp: 0.05, angDamp: 0.8 },
  };

  // §5.4 새
  AB.BIRD_TYPES = {
    red: { name: '빨강 새', r: 0.35, density: 12, color: '#e53935', ability: null, hint: '' },
    blue: { name: '파랑 새', r: 0.25, density: 12, color: '#42a5f5', ability: 'split', hint: '파랑 새: 비행 중 화면을 누르면 3마리로 분열' },
    yellow: { name: '노랑 새', r: 0.35, density: 10, color: '#fdd835', ability: 'boost', hint: '노랑 새: 비행 중 화면을 누르면 가속' },
    black: { name: '폭탄 새', r: 0.45, density: 12, color: '#333333', ability: 'explode', hint: '폭탄 새: 비행 중 화면을 누르면 폭발 (충돌 1.5초 후 자동 폭발)' },
  };

  // §5.5 새 타입별 재질 피해 배율
  AB.BIRD_MULT = {
    red: { glass: 1.0, wood: 1.0, stone: 1.0, tnt: 1.0, pig: 1.0 },
    blue: { glass: 2.5, wood: 0.6, stone: 0.4, tnt: 1.0, pig: 1.0 },
    yellow: { glass: 1.0, wood: 2.0, stone: 0.6, tnt: 1.0, pig: 1.0 },
    black: { glass: 1.0, wood: 1.0, stone: 1.3, tnt: 1.0, pig: 1.0 },
  };
})();
