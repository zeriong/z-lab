window.AB = window.AB || {};

(function() {
  'use strict';

  function init(canvas) {
    function screenToWorld(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const worldX = (clientX - rect.left) * AB.CONFIG.WORLD_W / rect.width;
      const worldY = (clientY - rect.top) * AB.CONFIG.WORLD_H / rect.height;
      return { x: worldX, y: worldY };
    }

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
      const pos = screenToWorld(e.clientX, e.clientY);
      AB.Game.handlePointerDown(pos.x, pos.y);
    });

    canvas.addEventListener('pointermove', (e) => {
      e.preventDefault();
      const pos = screenToWorld(e.clientX, e.clientY);
      AB.Game.handlePointerMove(pos.x, pos.y);
    });

    canvas.addEventListener('pointerup', (e) => {
      e.preventDefault();
      const pos = screenToWorld(e.clientX, e.clientY);
      AB.Game.handlePointerUp(pos.x, pos.y);
    });

    canvas.addEventListener('pointercancel', (e) => {
      e.preventDefault();
      AB.Game.handlePointerCancel();
    });

    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    window.addEventListener('keydown', (e) => {
      AB.Game.handleKey(e.key);
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        AB.Game.handleVisibilityHidden();
      }
    });
  }

  AB.Input = {
    init
  };
})();
