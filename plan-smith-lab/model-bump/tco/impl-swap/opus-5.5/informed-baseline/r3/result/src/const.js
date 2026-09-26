/*
 * src/const.js — 좌표계와 상수 (§4.2)
 * 노출: C (§4.2 표의 36개 키, 그 외 키 없음)
 * 참조 전역: 없음
 * 주의: §4.3 · §5.5 검산이 이 값들에 묶여 있다. 임의로 바꾸지 말 것.
 */
(function () {
  'use strict';

  window.C = Object.freeze({
    WORLD_W: 1920,
    WORLD_H: 720,
    VIEW_W: 1280,
    VIEW_H: 720,
    GROUND_Y: 620,
    GRAVITY: 1300,
    FIXED_DT: 1 / 120,
    MAX_STEPS: 5,
    MAX_FRAME_DT: 0.25,
    SOLVER_ITER: 8,
    PEN_SLOP: 0.5,
    PEN_PERCENT: 0.6,
    LINEAR_DAMP: 0.25,
    SLEEP_SPEED: 6,
    SLEEP_TIME: 0.6,
    WAKE_SPEED: 30,
    SLING_X: 200,
    SLING_Y: 500,
    SLING_MAX_PULL: 110,
    SLING_GRAB_R: 70,
    LAUNCH_POWER: 11,
    MAX_LAUNCH_SPEED: 1400,
    TRAJ_POINTS: 35,
    TRAJ_STEP: 0.06,
    DMG_MIN_SPEED: 150,
    DMG_SCALE: 0.08,
    DMG_MASS_CAP: 3,
    STATIC_MASS_FACTOR: 1.2,
    SETTLE_TIMEOUT: 8,
    SETTLE_GRACE: 0.9,
    SCORE_PIG: 5000,
    SCORE_BIRD_LEFT: 10000,
    EXPLODE_R: 160,
    EXPLODE_IMPULSE: 900,
    EXPLODE_DMG: 140,
    SAVE_KEY: 'angrybird.progress.v1'
  });
})();
