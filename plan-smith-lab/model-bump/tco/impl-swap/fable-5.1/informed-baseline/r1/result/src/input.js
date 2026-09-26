// input.js — §9 포인터 + 키보드 입력. C, U 참조. GAME 은 핸들러 본문 안에서만 참조.
// state !== 'PLAYING' 이면 Esc(일시정지 토글)를 제외한 모든 입력을 무시한다.
(function () {
  'use strict';

  function attach(canvas, game) {
    // §8 포인터 → 월드 좌표 (단일 함수)
    function toWorld(ev) {
      var rect = canvas.getBoundingClientRect();
      var sx = C.VIEW_W / (rect.width || C.VIEW_W);
      return {
        x: (ev.clientX - rect.left) * sx + game.cam.x,
        y: (ev.clientY - rect.top) * sx
      };
    }

    function onDown(ev) {
      if (game.state !== 'PLAYING') return;
      ev.preventDefault();
      try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
      var p = toWorld(ev);
      if (game.shot === 'ARMED') {
        if (U.dist(p.x, p.y, C.SLING_X, C.SLING_Y) <= C.SLING_GRAB_R) {
          GAME.startDrag(p.x, p.y);
        }
      } else if (game.shot === 'FLYING' && !game.abilityUsed) {
        GAME.tapAbility();
      }
    }

    function onMove(ev) {
      if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
      ev.preventDefault();
      var p = toWorld(ev);
      GAME.moveDrag(p.x, p.y);
    }

    function onUp(ev) {
      if (game.shot !== 'DRAG') return;
      ev.preventDefault();
      try { canvas.releasePointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
      if (game.state !== 'PLAYING') return;
      GAME.release();
    }

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('contextmenu', function (ev) { ev.preventDefault(); });

    // §9.3 키보드 대체 조작
    function onKey(ev) {
      var key = ev.key;

      if (key === 'Escape') {
        if (game.state === 'PLAYING' || game.state === 'PAUSED') {
          ev.preventDefault();
          GAME.togglePause();
        }
        return;
      }

      if (game.state !== 'PLAYING' || game.shot !== 'ARMED') return;

      switch (key) {
        case 'ArrowLeft':
          game.aimAngle = U.clamp(game.aimAngle - 3, -85, 10);
          ev.preventDefault();
          break;
        case 'ArrowRight':
          game.aimAngle = U.clamp(game.aimAngle + 3, -85, 10);
          ev.preventDefault();
          break;
        case 'ArrowUp':
          game.aimPower = U.clamp(game.aimPower + 0.05, 0.15, 1.0);
          ev.preventDefault();
          break;
        case 'ArrowDown':
          game.aimPower = U.clamp(game.aimPower - 0.05, 0.15, 1.0);
          ev.preventDefault();
          break;
        case ' ':
        case 'Spacebar': {
          ev.preventDefault();
          var a = game.aimAngle * Math.PI / 180;
          var pull = C.SLING_MAX_PULL * game.aimPower;
          var x = C.SLING_X - Math.cos(a) * pull;
          var y = C.SLING_Y - Math.sin(a) * pull;
          // 앵커에서 드래그 시작 → 목표 위치로 이동 → 즉시 발사
          GAME.startDrag(C.SLING_X, C.SLING_Y);
          GAME.moveDrag(x, y);
          GAME.release();
          break;
        }
        default:
          break;
      }
    }

    window.addEventListener('keydown', onKey);
  }

  window.INPUT = { attach: attach };
})();
