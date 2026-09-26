window.AB = window.AB || {};

(function() {
  'use strict';

  function init(canvas) {
    // Pointer events
    canvas.addEventListener('pointerdown', function(e) {
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }

      const rect = canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) * AB.CONFIG.WORLD_W / rect.width;
      const worldY = (e.clientY - rect.top) * AB.CONFIG.WORLD_H / rect.height;
      AB.Game.handlePointerDown(worldX, worldY);
    });

    canvas.addEventListener('pointermove', function(e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) * AB.CONFIG.WORLD_W / rect.width;
      const worldY = (e.clientY - rect.top) * AB.CONFIG.WORLD_H / rect.height;
      AB.Game.handlePointerMove(worldX, worldY);
    });

    canvas.addEventListener('pointerup', function(e) {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const worldX = (e.clientX - rect.left) * AB.CONFIG.WORLD_W / rect.width;
      const worldY = (e.clientY - rect.top) * AB.CONFIG.WORLD_H / rect.height;
      AB.Game.handlePointerUp(worldX, worldY);
    });

    canvas.addEventListener('pointercancel', function(e) {
      e.preventDefault();
      AB.Game.handlePointerCancel();
    });

    // Context menu
    canvas.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });

    // Keyboard
    window.addEventListener('keydown', function(e) {
      AB.Game.handleKey(e.key);
    });

    // Visibility
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        AB.Game.handleVisibilityHidden();
      }
    });
  }

  AB.Input = {
    init: init
  };
})();
