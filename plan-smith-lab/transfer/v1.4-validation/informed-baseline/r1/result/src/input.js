// Input handling (§9)
const INPUT = {
  attach(canvas, game) {
    let aimAngle = -35 * Math.PI / 180;
    let aimPower = 0.8;

    // Pointer events
    canvas.addEventListener('pointerdown', e => {
      if (game.state !== 'PLAYING') return;
      SFX.init();

      const rect = canvas.getBoundingClientRect();
      const sx = C.VIEW_W / rect.width;
      const px = (e.clientX - rect.left) * sx + game.cam.x;
      const py = (e.clientY - rect.top) * sx;

      if (game.shot === 'ARMED') {
        const d = Math.sqrt((px - C.SLING_X) ** 2 + (py - C.SLING_Y) ** 2);
        if (d <= C.SLING_GRAB_R) {
          GAME.startDrag(game, px, py);
          canvas.setPointerCapture(e.pointerId);
        }
      } else if (game.shot === 'FLYING' && !game.abilityUsed) {
        GAME.tapAbility(game);
      }
    });

    canvas.addEventListener('pointermove', e => {
      if (game.shot !== 'DRAG') return;
      const rect = canvas.getBoundingClientRect();
      const sx = C.VIEW_W / rect.width;
      const px = (e.clientX - rect.left) * sx + game.cam.x;
      const py = (e.clientY - rect.top) * sx;
      GAME.moveDrag(game, px, py);
    });

    canvas.addEventListener('pointerup', e => {
      if (game.shot === 'DRAG') {
        GAME.release(game);
      }
    });

    canvas.addEventListener('pointercancel', e => {
      if (game.shot === 'DRAG') {
        game.shot = 'ARMED';
        game.currentBird.x = C.SLING_X;
        game.currentBird.y = C.SLING_Y;
      }
    });

    // Keyboard events
    document.addEventListener('keydown', e => {
      if (game.state === 'PLAYING') {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (game.state === 'PLAYING') GAME.pause(game);
          else if (game.state === 'PAUSED') GAME.resume(game);
        }

        if (game.shot === 'ARMED') {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            aimAngle = U.clamp(aimAngle - 3 * Math.PI / 180, -85 * Math.PI / 180, 10 * Math.PI / 180);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            aimAngle = U.clamp(aimAngle + 3 * Math.PI / 180, -85 * Math.PI / 180, 10 * Math.PI / 180);
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            aimPower = U.clamp(aimPower + 0.05, 0.15, 1.0);
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            aimPower = U.clamp(aimPower - 0.05, 0.15, 1.0);
          } else if (e.key === ' ') {
            e.preventDefault();
            // Fire
            const px = C.SLING_X + Math.cos(aimAngle) * C.SLING_MAX_PULL * (-aimPower);
            const py = C.SLING_Y + Math.sin(aimAngle) * C.SLING_MAX_PULL * (-aimPower);
            game.currentBird.x = px;
            game.currentBird.y = py;
            game.shot = 'DRAG';
            GAME.release(game);
          }
        }
      }
    });

    // Visibility change
    document.addEventListener('visibilitychange', e => {
      if (game.state === 'PLAYING' && document.hidden) {
        GAME.pause(game);
      }
    });
  }
};
