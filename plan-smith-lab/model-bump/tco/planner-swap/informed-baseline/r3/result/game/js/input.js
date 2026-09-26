(function() {
  window.AB = window.AB || {};

  AB.Input = {
    init: function(canvas) {
      const cfg = AB.CONFIG;

      canvas.addEventListener('pointerdown', function(e) {
        e.preventDefault();
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (err) {
          // Ignore if not supported
        }
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * cfg.WORLD_W / rect.width;
        const y = (e.clientY - rect.top) * cfg.WORLD_H / rect.height;
        AB.Game.handlePointerDown(x, y);
      });

      canvas.addEventListener('pointermove', function(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * cfg.WORLD_W / rect.width;
        const y = (e.clientY - rect.top) * cfg.WORLD_H / rect.height;
        AB.Game.handlePointerMove(x, y);
      });

      canvas.addEventListener('pointerup', function(e) {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * cfg.WORLD_W / rect.width;
        const y = (e.clientY - rect.top) * cfg.WORLD_H / rect.height;
        AB.Game.handlePointerUp(x, y);
      });

      canvas.addEventListener('pointercancel', function(e) {
        e.preventDefault();
        AB.Game.handlePointerCancel();
      });

      canvas.addEventListener('contextmenu', function(e) {
        e.preventDefault();
      });

      window.addEventListener('keydown', function(e) {
        AB.Game.handleKey(e.key);
      });

      document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
          AB.Game.handleVisibilityHidden();
        }
      });
    }
  };
})();
