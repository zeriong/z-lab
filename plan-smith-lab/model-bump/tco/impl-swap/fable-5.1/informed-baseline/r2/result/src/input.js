// input.js — §9 슬링샷 포인터 입력 + 키보드 대체 조작. 참조 전역: C, U, GAME(핸들러 내부)
(function () {
  'use strict';

  function attach(canvas, game) {
    // §8 포인터 → 월드 좌표
    function toWorld(ev) {
      var rect = canvas.getBoundingClientRect();
      var sx = C.VIEW_W / (rect.width || C.VIEW_W);
      return {
        x: (ev.clientX - rect.left) * sx + game.cam.x,
        y: (ev.clientY - rect.top) * sx
      };
    }

    function onPointerDown(ev) {
      if (game.state !== 'PLAYING') return;
      var p = toWorld(ev);
      if (game.shot === 'ARMED') {
        if (GAME.startDrag(p.x, p.y)) {
          try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
          ev.preventDefault();
        }
      } else if (game.shot === 'FLYING' && !game.abilityUsed) {
        GAME.tapAbility();
        ev.preventDefault();
      }
    }

    function onPointerMove(ev) {
      if (game.state !== 'PLAYING') return;
      if (game.shot !== 'DRAG') return;
      var p = toWorld(ev);
      GAME.moveDrag(p.x, p.y);
      ev.preventDefault();
    }

    function onPointerUp(ev) {
      if (game.state !== 'PLAYING') return;
      if (game.shot !== 'DRAG') return;
      var p = toWorld(ev);
      GAME.moveDrag(p.x, p.y);
      GAME.release();
      try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
      ev.preventDefault();
    }

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);

    // §9.3 키보드
    function onKeyDown(ev) {
      var key = ev.key;

      if (key === 'Escape' || key === 'Esc') {
        if (game.state === 'PLAYING') GAME.pause();
        else if (game.state === 'PAUSED') GAME.resume();
        ev.preventDefault();
        return;
      }

      if (game.state !== 'PLAYING' || game.shot !== 'ARMED') return;

      if (key === 'ArrowLeft') {
        game.aimAngle = U.clamp(game.aimAngle - 3, -85, 10);
        ev.preventDefault();
      } else if (key === 'ArrowRight') {
        game.aimAngle = U.clamp(game.aimAngle + 3, -85, 10);
        ev.preventDefault();
      } else if (key === 'ArrowUp') {
        game.aimPower = U.clamp(game.aimPower + 0.05, 0.15, 1.0);
        ev.preventDefault();
      } else if (key === 'ArrowDown') {
        game.aimPower = U.clamp(game.aimPower - 0.05, 0.15, 1.0);
        ev.preventDefault();
      } else if (key === ' ' || key === 'Spacebar') {
        var rad = game.aimAngle * Math.PI / 180;
        var len = C.SLING_MAX_PULL * game.aimPower;
        var tx = C.SLING_X - Math.cos(rad) * len;
        var ty = C.SLING_Y - Math.sin(rad) * len;
        if (GAME.startDrag(C.SLING_X, C.SLING_Y)) {
          GAME.moveDrag(tx, ty);
          GAME.release();
        }
        ev.preventDefault();
      }
    }

    window.addEventListener('keydown', onKeyDown);
  }

  window.INPUT = { attach: attach };
})();
