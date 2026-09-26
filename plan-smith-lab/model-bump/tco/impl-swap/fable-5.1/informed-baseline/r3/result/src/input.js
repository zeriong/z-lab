/* input.js — §9 포인터 + 키보드 입력. 참조 전역: C, U, GAME (핸들러 본문 안에서만)
 * state !== 'PLAYING' 이면 모든 입력을 무시한다 (Esc 의 일시정지 토글만 예외).
 */
var INPUT = (function () {
  'use strict';

  var AIM_STEP_DEG = 3;
  var AIM_MIN_DEG = -85;
  var AIM_MAX_DEG = 10;
  var POWER_STEP = 0.05;
  var POWER_MIN = 0.15;
  var POWER_MAX = 1.0;

  function attach(canvas, game) {

    /* §8 포인터 → 월드 좌표 (단일 함수) */
    function toWorld(ev) {
      var rect = canvas.getBoundingClientRect();
      var sx = rect.width > 0 ? C.VIEW_W / rect.width : 1;
      return {
        x: (ev.clientX - rect.left) * sx + game.cam.x,
        y: (ev.clientY - rect.top) * sx
      };
    }

    function onPointerDown(ev) {
      if (game.state !== 'PLAYING') return;
      ev.preventDefault();
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* 미지원 무시 */ }
      var p = toWorld(ev);
      if (game.shot === 'ARMED') {
        GAME.startDrag(p.x, p.y);
      } else if (game.shot === 'FLYING' && !game.abilityUsed) {
        GAME.tapAbility();
      }
    }

    function onPointerMove(ev) {
      if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
      ev.preventDefault();
      var p = toWorld(ev);
      GAME.moveDrag(p.x, p.y);
    }

    function onPointerUp(ev) {
      if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
      ev.preventDefault();
      GAME.release();
    }

    /* §9.3 키보드 대체 조작 */
    function onKeyDown(ev) {
      var key = ev.key;

      if (key === 'Escape' || key === 'Esc') {
        if (game.state === 'PLAYING') GAME.pause();
        else if (game.state === 'PAUSED') GAME.resume();
        else return;
        ev.preventDefault();
        return;
      }

      if (game.state !== 'PLAYING' || game.shot !== 'ARMED') return;

      if (key === 'ArrowLeft' || key === 'Left') {
        game.aimAngle = U.clamp(game.aimAngle - AIM_STEP_DEG, AIM_MIN_DEG, AIM_MAX_DEG);
      } else if (key === 'ArrowRight' || key === 'Right') {
        game.aimAngle = U.clamp(game.aimAngle + AIM_STEP_DEG, AIM_MIN_DEG, AIM_MAX_DEG);
      } else if (key === 'ArrowUp' || key === 'Up') {
        game.aimPower = U.clamp(game.aimPower + POWER_STEP, POWER_MIN, POWER_MAX);
      } else if (key === 'ArrowDown' || key === 'Down') {
        game.aimPower = U.clamp(game.aimPower - POWER_STEP, POWER_MIN, POWER_MAX);
      } else if (key === ' ' || key === 'Spacebar' || ev.code === 'Space') {
        /* 새를 앵커 + (-cos, -sin)(aimAngle) × SLING_MAX_PULL × aimPower 로 옮긴 뒤 즉시 발사 */
        var a = game.aimAngle * Math.PI / 180;
        var pull = C.SLING_MAX_PULL * game.aimPower;
        var bx = C.SLING_X - Math.cos(a) * pull;
        var by = C.SLING_Y - Math.sin(a) * pull;
        if (GAME.startDrag(C.SLING_X, C.SLING_Y)) {
          GAME.moveDrag(bx, by);
          GAME.release();
        }
      } else {
        return;
      }
      ev.preventDefault();
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
  }

  return { attach: attach };
})();
