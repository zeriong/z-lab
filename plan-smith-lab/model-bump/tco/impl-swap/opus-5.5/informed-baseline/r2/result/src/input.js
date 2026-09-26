/*
 * input.js — 포인터(드래그·발사·능력) + 키보드 대체 조작 (§9)
 * 노출: window.INPUT = { attach(canvas, game) }
 * 참조: C, U, GAME (GAME 은 이 파일보다 뒤에 로드되므로 attach / 이벤트 핸들러 본문 안에서만 참조)
 *
 * 규칙: state !== 'PLAYING' 이면 모든 입력을 무시한다.
 *       예외는 Esc 하나(§9.3 "일시정지 토글") — PAUSED 에서 Esc 로 재개할 수 있어야 토글이 성립한다.
 */
(function () {
  'use strict';

  var DEG = Math.PI / 180;
  var AIM_MIN = -85;       // §9.3 조준각 범위(도)
  var AIM_MAX = 10;
  var AIM_STEP = 3;
  var POW_MIN = 0.15;      // §9.3 파워 범위
  var POW_MAX = 1.0;
  var POW_STEP = 0.05;

  var attached = false;

  // §8 포인터 -> 월드 좌표 (단일 변환 함수)
  function toWorld(canvas, game, ev) {
    var rect = canvas.getBoundingClientRect();
    var sx = C.VIEW_W / rect.width;
    return {
      x: (ev.clientX - rect.left) * sx + game.cam.x,
      y: (ev.clientY - rect.top) * sx      // 세로도 같은 배율(비율 고정)
    };
  }

  function attach(canvas, game) {
    if (attached) return;
    attached = true;

    var dragPointer = null;

    function releaseCapture(id) {
      try {
        if (canvas.hasPointerCapture && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
      } catch (e) { /* 무시 */ }
    }

    canvas.addEventListener('pointerdown', function (ev) {
      if (game.state !== 'PLAYING') return;
      var p = toWorld(canvas, game, ev);

      if (game.shot === 'ARMED') {
        if (U.dist(p.x, p.y, C.SLING_X, C.SLING_Y) <= C.SLING_GRAB_R && GAME.startDrag(p.x, p.y)) {
          dragPointer = ev.pointerId;
          try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* 무시 */ }
          ev.preventDefault();
        }
      } else if (game.shot === 'FLYING') {
        if (game.bird && !game.bird.abilityUsed) {
          GAME.tapAbility();
          ev.preventDefault();
        }
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
      if (dragPointer !== null && ev.pointerId !== dragPointer) return;
      dragPointer = null;
      releaseCapture(ev.pointerId);
      if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
      GAME.release();      // 당김 < 12px 이면 GAME 내부에서 취소 처리
      ev.preventDefault();
    });

    canvas.addEventListener('pointercancel', function (ev) {
      if (dragPointer !== null && ev.pointerId !== dragPointer) return;
      dragPointer = null;
      releaseCapture(ev.pointerId);
      if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
      GAME.cancelDrag();
    });

    canvas.addEventListener('contextmenu', function (ev) {
      ev.preventDefault();
    });

    // §9.3 키보드 대체 조작
    window.addEventListener('keydown', function (ev) {
      var k = ev.key;

      if (k === 'Escape' || k === 'Esc') {
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

      switch (k) {
        case 'ArrowLeft':
        case 'Left':
          game.aimAngle = U.clamp(game.aimAngle - AIM_STEP, AIM_MIN, AIM_MAX);
          break;
        case 'ArrowRight':
        case 'Right':
          game.aimAngle = U.clamp(game.aimAngle + AIM_STEP, AIM_MIN, AIM_MAX);
          break;
        case 'ArrowUp':
        case 'Up':
          game.aimPower = U.clamp(Math.round((game.aimPower + POW_STEP) * 100) / 100, POW_MIN, POW_MAX);
          break;
        case 'ArrowDown':
        case 'Down':
          game.aimPower = U.clamp(Math.round((game.aimPower - POW_STEP) * 100) / 100, POW_MIN, POW_MAX);
          break;
        case ' ':
        case 'Spacebar': {
          // 새를 앵커 + (-cos, -sin)(aimAngle) x SLING_MAX_PULL x aimPower 로 옮긴 뒤 즉시 발사
          var a = game.aimAngle * DEG;
          var pull = C.SLING_MAX_PULL * game.aimPower;
          var bx = C.SLING_X - Math.cos(a) * pull;
          var by = C.SLING_Y - Math.sin(a) * pull;
          GAME.fire(bx, by);
          break;
        }
        default:
          return;
      }
      ev.preventDefault();
    });
  }

  window.INPUT = { attach: attach };
})();
