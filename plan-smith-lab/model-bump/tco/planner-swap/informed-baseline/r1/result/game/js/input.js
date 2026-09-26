(function() {
  window.AB = window.AB || {};

  const C = window.AB.CONFIG;

  function init(canvas) {
    function screenToWorld(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const worldX = (clientX - rect.left) * C.WORLD_W / rect.width;
      const worldY = (clientY - rect.top) * C.WORLD_H / rect.height;
      return { x: worldX, y: worldY };
    }

    // Pointer events
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        // Ignore
      }
      const pos = screenToWorld(e.clientX, e.clientY);
      window.AB.Game.handlePointerDown(pos.x, pos.y);
    });

    canvas.addEventListener('pointermove', (e) => {
      e.preventDefault();
      const pos = screenToWorld(e.clientX, e.clientY);
      window.AB.Game.handlePointerMove(pos.x, pos.y);
    });

    canvas.addEventListener('pointerup', (e) => {
      e.preventDefault();
      const pos = screenToWorld(e.clientX, e.clientY);
      window.AB.Game.handlePointerUp(pos.x, pos.y);
    });

    canvas.addEventListener('pointercancel', (e) => {
      e.preventDefault();
      window.AB.Game.handlePointerCancel();
    });

    // Context menu
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      window.AB.Game.handleKey(e.key);
    });

    // Visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        window.AB.Game.handleVisibilityHidden();
      }
    });
  }

  window.AB.Input = {
    init
  };
})();
