/*
 * input.js — 슬링샷 포인터 입력 + 키보드 대체 조작 (§9)
 * 노출: window.INPUT = { attach(canvas, game) }
 * 참조 전역: C, U, GAME (GAME 은 이벤트 핸들러 본문 안에서만 참조)
 *
 * 규칙: state 가 'PLAYING' 이 아니면 모든 조작을 무시한다. (Esc 의 일시정지 해제만 예외)
 */
(function () {
  'use strict';

  var DEG = Math.PI / 180;
  var AIM_STEP = 3;        // §9.3 조준각 ±3도
  var AIM_MIN = -85;       // §9.3
  var AIM_MAX = 10;        // §9.3
  var POWER_STEP = 0.05;   // §9.3
  var POWER_MIN = 0.15;    // §9.3
  var POWER_MAX = 1.0;     // §9.3

  // §8 포인터 -> 월드 좌표 변환 (단일 함수)
  function toWorld(canvas, game, ev) {
    var rect = canvas.getBoundingClientRect();
    var sx = rect.width > 0 ? C.VIEW_W / rect.width : 1;
    return {
      x: (ev.clientX - rect.left) * sx + game.cam.x,
      y: (ev.clientY - rect.top) * sx          // 세로도 같은 배율(비율 고정)
    };
  }

  // §9.3 키보드 조준 위치 = 앵커 + (-cos, -sin)(aimAngle) x SLING_MAX_PULL x aimPower
  function aimTarget(game) {
    var a = game.aimAngle * DEG;
    var pull = C.SLING_MAX_PULL * game.aimPower;
    return {
      x: C.SLING_X - Math.cos(a) * pull,
      y: C.SLING_Y - Math.sin(a) * pull
    };
  }

  function attach(canvas, game) {
    var activeId = null;   // 드래그를 시작한 포인터 id (다른 포인터·호버 이동은 무시)
    var kbDrag = false;    // 키보드 조준으로 DRAG 상태에 들어가 있는가

    // ---------------- 포인터 ----------------

    canvas.addEventListener('pointerdown', function (ev) {
      if (game.state !== 'PLAYING') return;
      if (typeof ev.button === 'number' && ev.button > 0) return;   // 주 버튼만
      try {
        canvas.setPointerCapture(ev.pointerId);
      } catch (e) {
        /* 무시 */
      }
      var p = toWorld(canvas, game, ev);
      if (game.shot === 'ARMED') {
        if (GAME.startDrag(p.x, p.y)) {
          activeId = ev.pointerId;
          kbDrag = false;
        }
      } else if (game.shot === 'FLYING' && !game.abilityUsed) {
        GAME.tapAbility();
      }
      ev.preventDefault();
    });

    canvas.addEventListener('pointermove', function (ev) {
      if (ev.pointerId !== activeId) return;
      if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
      var p = toWorld(canvas, game, ev);
      GAME.moveDrag(p.x, p.y);
      ev.preventDefault();
    });

    function endPointer(ev, cancelled) {
      if (ev.pointerId !== activeId) return;
      activeId = null;
      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch (e) {
        /* 무시 */
      }
      if (game.state !== 'PLAYING' || game.shot !== 'DRAG') return;
      if (cancelled) {
        // 포인터가 취소되면 새를 앵커로 되돌린다 (당김거리 0 -> release 가 취소 처리)
        GAME.moveDrag(C.SLING_X, C.SLING_Y);
      }
      GAME.release();
    }

    canvas.addEventListener('pointerup', function (ev) {
      endPointer(ev, false);
    });
    canvas.addEventListener('pointercancel', function (ev) {
      endPointer(ev, true);
    });

    // ---------------- 키보드 (§9.3) ----------------

    // 화살표로 조준을 바꾸면 새를 조준 위치로 옮겨 DRAG 로 보여 준다(궤적 예측·고무줄 표시).
    function showKeyboardAim() {
      if (game.shot === 'ARMED') {
        if (!GAME.startDrag(C.SLING_X, C.SLING_Y)) return;
      }
      kbDrag = true;
      activeId = null;
      var t = aimTarget(game);
      GAME.moveDrag(t.x, t.y);
    }

    // Space: 새를 조준 위치로 옮긴 뒤 즉시 발사
    function fireKeyboard() {
      if (game.shot === 'ARMED') {
        if (!GAME.startDrag(C.SLING_X, C.SLING_Y)) return;
      }
      var t = aimTarget(game);
      GAME.moveDrag(t.x, t.y);
      kbDrag = false;
      activeId = null;
      GAME.release();
    }

    window.addEventListener('keydown', function (ev) {
      var k = ev.key;

      // Esc: 일시정지 토글
      if (k === 'Escape' || k === 'Esc') {
        if (game.state === 'PLAYING') GAME.pause();
        else if (game.state === 'PAUSED') GAME.resume();
        else return;
        ev.preventDefault();
        return;
      }

      if (game.state !== 'PLAYING') return;

      if (game.shot !== 'DRAG') kbDrag = false;
      var aiming = game.shot === 'ARMED' || (game.shot === 'DRAG' && kbDrag);
      var handled = true;

      switch (k) {
        case 'ArrowLeft':
        case 'Left':
          if (aiming) {
            game.aimAngle = U.clamp(game.aimAngle - AIM_STEP, AIM_MIN, AIM_MAX);
            showKeyboardAim();
          }
          break;
        case 'ArrowRight':
        case 'Right':
          if (aiming) {
            game.aimAngle = U.clamp(game.aimAngle + AIM_STEP, AIM_MIN, AIM_MAX);
            showKeyboardAim();
          }
          break;
        case 'ArrowUp':
        case 'Up':
          if (aiming) {
            game.aimPower = U.clamp(Math.round((game.aimPower + POWER_STEP) * 100) / 100, POWER_MIN, POWER_MAX);
            showKeyboardAim();
          }
          break;
        case 'ArrowDown':
        case 'Down':
          if (aiming) {
            game.aimPower = U.clamp(Math.round((game.aimPower - POWER_STEP) * 100) / 100, POWER_MIN, POWER_MAX);
            showKeyboardAim();
          }
          break;
        case ' ':
        case 'Spacebar':
          if (aiming) {
            fireKeyboard();
          } else if (game.shot === 'FLYING' && !game.abilityUsed) {
            GAME.tapAbility();   // 포인터가 없을 때의 비행 중 능력 발동
          }
          break;
        default:
          handled = false;
      }

      if (handled) ev.preventDefault();
    });
  }

  window.INPUT = { attach: attach };
})();
