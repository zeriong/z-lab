// Input handling
window.INPUT = {
  attach(canvas, game) {
    let pointerId = null;
    let aimAngle = -35 * Math.PI / 180;
    let aimPower = 0.8;

    // Pointer events
    canvas.addEventListener('pointerdown', (ev) => {
      if (GAME.state !== 'PLAYING') return;

      pointerId = ev.pointerId;
      canvas.setPointerCapture(pointerId);

      const { wx, wy } = screenToWorld(canvas, ev, game);

      if (game.shot === 'ARMED') {
        const dist = Math.sqrt((wx - C.SLING_X) ** 2 + (wy - C.SLING_Y) ** 2);
        if (dist < C.SLING_GRAB_R) {
          GAME.startDrag(game, wx, wy);
        }
      } else if (game.shot === 'FLYING' && !game.bird.abilityUsed) {
        GAME.tapAbility(game);
      }
    });

    canvas.addEventListener('pointermove', (ev) => {
      if (ev.pointerId !== pointerId) return;

      const { wx, wy } = screenToWorld(canvas, ev, game);
      GAME.moveDrag(game, wx, wy);
    });

    canvas.addEventListener('pointerup', (ev) => {
      if (ev.pointerId !== pointerId) return;
      pointerId = null;

      GAME.release(game);
    });

    canvas.addEventListener('pointercancel', (ev) => {
      if (ev.pointerId !== pointerId) return;
      pointerId = null;
    });

    // Keyboard
    document.addEventListener('keydown', (ev) => {
      if (GAME.state !== 'PLAYING') {
        if (ev.key === 'Escape') {
          if (GAME.state === 'PLAYING') {
            GAME.pause(game);
            UI.setScreen('pause');
          } else if (GAME.state === 'PAUSED') {
            GAME.resume(game);
            UI.setScreen('game');
          }
        }
        return;
      }

      if (game.shot !== 'ARMED') {
        if (ev.key === 'Escape') {
          GAME.pause(game);
          UI.setScreen('pause');
        }
        return;
      }

      if (ev.key === 'ArrowLeft') {
        aimAngle -= 3 * Math.PI / 180;
        aimAngle = U.clamp(aimAngle, -85 * Math.PI / 180, 10 * Math.PI / 180);
        updateAim(game, aimAngle, aimPower);
      } else if (ev.key === 'ArrowRight') {
        aimAngle += 3 * Math.PI / 180;
        aimAngle = U.clamp(aimAngle, -85 * Math.PI / 180, 10 * Math.PI / 180);
        updateAim(game, aimAngle, aimPower);
      } else if (ev.key === 'ArrowUp') {
        aimPower += 0.05;
        aimPower = U.clamp(aimPower, 0.15, 1.0);
        updateAim(game, aimAngle, aimPower);
      } else if (ev.key === 'ArrowDown') {
        aimPower -= 0.05;
        aimPower = U.clamp(aimPower, 0.15, 1.0);
        updateAim(game, aimAngle, aimPower);
      } else if (ev.key === ' ') {
        ev.preventDefault();
        // Launch
        const dist = C.SLING_MAX_PULL * aimPower;
        game.bird.x = C.SLING_X - Math.cos(aimAngle) * dist;
        game.bird.y = C.SLING_Y - Math.sin(aimAngle) * dist;
        GAME.release(game);
      } else if (ev.key === 'Escape') {
        GAME.pause(game);
        UI.setScreen('pause');
      }
    });

    // Visibility
    document.addEventListener('visibilitychange', () => {
      if (GAME.state === 'PLAYING') {
        GAME.pause(game);
        UI.setScreen('pause');
      }
    });
  }
};

function screenToWorld(canvas, ev, game) {
  const rect = canvas.getBoundingClientRect();
  const sx = C.VIEW_W / rect.width;
  const wx = (ev.clientX - rect.left) * sx + game.cam.x;
  const wy = (ev.clientY - rect.top) * sx;
  return { wx, wy };
}

function updateAim(game, angle, power) {
  const dist = C.SLING_MAX_PULL * power;
  game.bird.x = C.SLING_X - Math.cos(angle) * dist;
  game.bird.y = C.SLING_Y - Math.sin(angle) * dist;
}
