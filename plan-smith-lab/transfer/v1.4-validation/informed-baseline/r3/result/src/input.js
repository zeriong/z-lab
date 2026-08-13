// src/input.js
// 포인터 + 키보드 입력 (§9)
// 의존성: C, U, GAME

const INPUT = {
  attach(canvas, game) {
    // 포인터 변환 함수
    const canvasToWorld = (ev) => {
      const rect = canvas.getBoundingClientRect();
      const sx = C.VIEW_W / rect.width;
      const wx = (ev.clientX - rect.left) * sx + game.cam.x;
      const wy = (ev.clientY - rect.top) * sx;
      return { wx, wy };
    };

    // 포인터 이벤트
    canvas.addEventListener('pointerdown', (ev) => {
      if (game.state === 'PLAYING' && game.shot === 'ARMED') {
        const { wx, wy } = canvasToWorld(ev);
        game.startDrag(wx, wy);
        canvas.setPointerCapture(ev.pointerId);
      } else if (game.state === 'PLAYING' && game.shot === 'FLYING') {
        game.tapAbility();
      }
    });

    canvas.addEventListener('pointermove', (ev) => {
      if (game.shot === 'DRAG') {
        const { wx, wy } = canvasToWorld(ev);
        game.moveDrag(wx, wy);
      }
    });

    canvas.addEventListener('pointerup', (ev) => {
      if (game.shot === 'DRAG') {
        game.release();
      }
      try {
        canvas.releasePointerCapture(ev.pointerId);
      } catch (e) {}
    });

    canvas.addEventListener('pointercancel', (ev) => {
      if (game.shot === 'DRAG') {
        game.currentBird.x = C.SLING_X;
        game.currentBird.y = C.SLING_Y;
        game.shot = 'ARMED';
      }
    });

    // 키보드 입력
    let aimAngle = -35;  // 도
    let aimPower = 0.8;  // 0~1

    document.addEventListener('keydown', (ev) => {
      if (game.state !== 'PLAYING' || game.shot !== 'ARMED') return;

      if (ev.key === 'ArrowLeft') {
        aimAngle = U.clamp(aimAngle - 3, -85, 10);
        ev.preventDefault();
      } else if (ev.key === 'ArrowRight') {
        aimAngle = U.clamp(aimAngle + 3, -85, 10);
        ev.preventDefault();
      } else if (ev.key === 'ArrowUp') {
        aimPower = U.clamp(aimPower + 0.05, 0.15, 1.0);
        ev.preventDefault();
      } else if (ev.key === 'ArrowDown') {
        aimPower = U.clamp(aimPower - 0.05, 0.15, 1.0);
        ev.preventDefault();
      } else if (ev.key === ' ') {
        // Space: 발사
        const rad = (aimAngle * Math.PI) / 180;
        const dist = C.SLING_MAX_PULL * aimPower;
        const dx = -Math.cos(rad) * dist;
        const dy = -Math.sin(rad) * dist;

        game.currentBird.x = C.SLING_X + dx;
        game.currentBird.y = C.SLING_Y + dy;

        // 즉시 발사
        game.release();
        ev.preventDefault();
      } else if (ev.key === 'Escape') {
        // 일시정지 토글
        if (game.state === 'PLAYING') {
          game.pause();
          UI.setScreen('pause');
        } else if (game.state === 'PAUSED') {
          game.resume();
          // 게임 화면으로 돌아감 (HUD만 표시)
          const screens = document.querySelectorAll('.screen');
          screens.forEach(s => s.classList.remove('active'));
          document.getElementById('hud').style.display = 'flex';
        }
        ev.preventDefault();
      }
    });

    // Visibility 변경 시 일시정지
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.state === 'PLAYING') {
        game.pause();
        UI.setScreen('pause');
      }
    });
  }
};
