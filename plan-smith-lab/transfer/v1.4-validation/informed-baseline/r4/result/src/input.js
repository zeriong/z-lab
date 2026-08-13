// Input handling
const INPUT = {
  attach: (canvas, game) => {
    const state = {
      aimAngle: -35 * Math.PI / 180,
      aimPower: 0.8
    };

    // Pointer events
    canvas.addEventListener('pointerdown', (ev) => {
      if (game.state !== 'PLAYING') return;

      const rect = canvas.getBoundingClientRect();
      const sx = C.VIEW_W / rect.width;
      const wx = (ev.clientX - rect.left) * sx + game.cam.x;
      const wy = (ev.clientY - rect.top) * sx;

      if (game.shot === 'ARMED' && game.bird) {
        GAME.startDrag(game, wx, wy);
      } else if (game.shot === 'FLYING') {
        GAME.tapAbility(game);
      }

      canvas.setPointerCapture(ev.pointerId);
    });

    canvas.addEventListener('pointermove', (ev) => {
      if (game.state !== 'PLAYING') return;

      const rect = canvas.getBoundingClientRect();
      const sx = C.VIEW_W / rect.width;
      const wx = (ev.clientX - rect.left) * sx + game.cam.x;
      const wy = (ev.clientY - rect.top) * sx;

      GAME.moveDrag(game, wx, wy);
    });

    canvas.addEventListener('pointerup', (ev) => {
      if (game.state !== 'PLAYING') return;
      GAME.release(game);
    });

    canvas.addEventListener('pointercancel', (ev) => {
      if (game.state !== 'PLAYING') return;
      if (game.shot === 'DRAG' && game.bird) {
        game.bird.x = C.SLING_X;
        game.bird.y = C.SLING_Y;
        game.shot = 'ARMED';
      }
    });

    // Keyboard input
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') {
        if (game.state === 'PLAYING') {
          GAME.pause(game);
        } else if (game.state === 'PAUSED') {
          GAME.resume(game);
        }
      }

      if (game.state !== 'PLAYING' || game.shot !== 'ARMED') return;

      if (ev.key === 'ArrowLeft') {
        state.aimAngle += 3 * Math.PI / 180;
        state.aimAngle = U.clamp(state.aimAngle, -85 * Math.PI / 180, 10 * Math.PI / 180);
        GAME._updateAim(game, state);
      } else if (ev.key === 'ArrowRight') {
        state.aimAngle -= 3 * Math.PI / 180;
        state.aimAngle = U.clamp(state.aimAngle, -85 * Math.PI / 180, 10 * Math.PI / 180);
        GAME._updateAim(game, state);
      } else if (ev.key === 'ArrowUp') {
        state.aimPower += 0.05;
        state.aimPower = U.clamp(state.aimPower, 0.15, 1.0);
        GAME._updateAim(game, state);
      } else if (ev.key === 'ArrowDown') {
        state.aimPower -= 0.05;
        state.aimPower = U.clamp(state.aimPower, 0.15, 1.0);
        GAME._updateAim(game, state);
      } else if (ev.key === ' ') {
        ev.preventDefault();
        const dx = -Math.cos(state.aimAngle) * C.SLING_MAX_PULL * state.aimPower;
        const dy = -Math.sin(state.aimAngle) * C.SLING_MAX_PULL * state.aimPower;
        game.bird.x = C.SLING_X + dx;
        game.bird.y = C.SLING_Y + dy;
        GAME.release(game);
      }
    });
  }
};

// Helper for keyboard aim
GAME._updateAim = (game, state) => {
  if (!game.bird) return;
  const dx = -Math.cos(state.aimAngle) * C.SLING_MAX_PULL * state.aimPower;
  const dy = -Math.sin(state.aimAngle) * C.SLING_MAX_PULL * state.aimPower;
  game.bird.x = C.SLING_X + dx;
  game.bird.y = C.SLING_Y + dy;
};
