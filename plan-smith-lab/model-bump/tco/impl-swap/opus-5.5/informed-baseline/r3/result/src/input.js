/*
 * src/input.js — 슬링샷 포인터 입력 + 키보드 대체 조작 (§9)
 * 노출: INPUT = { attach(canvas, game) }
 * 참조 전역: C, U, GAME (이벤트 핸들러 본문 안에서만)
 * 규칙: state !== 'PLAYING' 이면 전부 무시 (예외: Esc 로 PAUSED → PLAYING 복귀)
 */
(function () {
  'use strict';

  var AIM_MIN = -85;
  var AIM_MAX = 10;
  var AIM_STEP = 3;
  var POW_MIN = 0.15;
  var POW_MAX = 1.0;
  var POW_STEP = 0.05;
  var DEG = Math.PI / 180;

  // 포인터 → 월드 좌표 (§8)
  function toWorld(canvas, game, ev) {
    var rect = canvas.getBoundingClientRect();
    var sx = C.VIEW_W / (rect.width || C.VIEW_W);
    return {
      x: (ev.clientX - rect.left) * sx + game.cam.x,
      y: (ev.clientY - rect.top) * sx          // 세로도 같은 배율 (비율 고정)
    };
  }

  function attach(canvas, game) {
    var dragPointer = null;

    function dropCapture(id) {
      try {
        if (canvas.hasPointerCapture && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      } catch (e) { /* 무시 */ }
    }

    canvas.addEventListener('pointerdown', function (ev) {
      if (game.state !== 'PLAYING') return;
      if (typeof ev.button === 'number' && ev.button > 0) return;   // 주 버튼만

      if (game.shot === 'ARMED') {
        var p = toWorld(canvas, game, ev);
        if (GAME.startDrag(p.x, p.y)) {
          dragPointer = ev.pointerId;
          try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
          ev.preventDefault();
        }
      } else if (game.shot === 'FLYING' && !game.abilityUsed) {
        GAME.tapAbility();
        ev.preventDefault();
      }
    });

    canvas.addEventListener('pointermove', function (ev) {
      if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
      if (dragPointer !== null && ev.pointerId !== dragPointer) return;
      var p = toWorld(canvas, game, ev);
      GAME.moveDrag(p.x, p.y);
      ev.preventDefault();
    });

    canvas.addEventListener('pointerup', function (ev) {
      if (dragPointer === null || ev.pointerId !== dragPointer) return;
      dragPointer = null;
      dropCapture(ev.pointerId);
      if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
      GAME.release();   // 당김 < 12px 이면 취소, 아니면 발사
      ev.preventDefault();
    });

    canvas.addEventListener('pointercancel', function (ev) {
      if (dragPointer === null || ev.pointerId !== dragPointer) return;
      dragPointer = null;
      dropCapture(ev.pointerId);
      if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
      // 발사 없이 취소: 새를 앵커로 되돌린 뒤 release → 당김 0 이므로 취소 분기
      GAME.moveDrag(C.SLING_X, C.SLING_Y);
      GAME.release();
    });

    // 키보드 대체 조작 (§9.3)
    window.addEventListener('keydown', function (ev) {
      var key = ev.key;

      if (key === 'Escape' || key === 'Esc') {
        if (game.state === 'PLAYING') {
          GAME.pause();
          ev.preventDefault();
        } else if (game.state === 'PAUSED') {
          GAME.resume();
          ev.preventDefault();
        }
        return;
      }

      if (game.state !== 'PLAYING' || game.shot !== 'ARMED') return;

      if (key === 'ArrowLeft' || key === 'Left') {
        game.aimAngle = U.clamp(game.aimAngle - AIM_STEP, AIM_MIN, AIM_MAX);
      } else if (key === 'ArrowRight' || key === 'Right') {
        game.aimAngle = U.clamp(game.aimAngle + AIM_STEP, AIM_MIN, AIM_MAX);
      } else if (key === 'ArrowUp' || key === 'Up') {
        game.aimPower = U.clamp(game.aimPower + POW_STEP, POW_MIN, POW_MAX);
      } else if (key === 'ArrowDown' || key === 'Down') {
        game.aimPower = U.clamp(game.aimPower - POW_STEP, POW_MIN, POW_MAX);
      } else if (key === ' ' || key === 'Spacebar' || ev.code === 'Space') {
        // 새를 앵커 + (-cos, -sin)(aimAngle) × SLING_MAX_PULL × aimPower 로 옮긴 뒤 즉시 발사
        var a = game.aimAngle * DEG;
        var pull = C.SLING_MAX_PULL * game.aimPower;
        if (GAME.startDrag(C.SLING_X, C.SLING_Y)) {
          GAME.moveDrag(C.SLING_X - Math.cos(a) * pull, C.SLING_Y - Math.sin(a) * pull);
          GAME.release();
        }
      } else {
        return;
      }
      ev.preventDefault();
    });
  }

  window.INPUT = { attach: attach };
})();
