(function() {
  const C = window.AB.C;
  let canvas = null;
  let handlers = null;
  let dragStartX = 0;
  let dragStartY = 0;
  let isDragging = false;
  let isTapCandidate = false;

  const Input = {
    attach(cvs, hdlrs) {
      canvas = cvs;
      handlers = hdlrs;

      canvas.addEventListener('pointerdown', handlePointerDown);
      canvas.addEventListener('pointermove', handlePointerMove);
      canvas.addEventListener('pointerup', handlePointerUp);
      canvas.addEventListener('pointercancel', handlePointerCancel);
      document.addEventListener('keydown', handleKeyDown);
    }
  };

  function getWorldCoords(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (C.W / r.width);
    const y = (e.clientY - r.top) * (C.H / r.height);
    return { x, y };
  }

  function handlePointerDown(e) {
    const coords = getWorldCoords(e);
    const dx = coords.x - C.SLING.x;
    const dy = coords.y - C.SLING.y;
    const dist = Math.hypot(dx, dy);

    dragStartX = coords.x;
    dragStartY = coords.y;

    if (dist <= C.GRAB_R) {
      isDragging = true;
      isTapCandidate = false;
      canvas.setPointerCapture(e.pointerId);
      handlers.onDragStart(coords.x, coords.y);
    } else {
      isTapCandidate = true;
    }
  }

  function handlePointerMove(e) {
    if (!isDragging) return;
    const coords = getWorldCoords(e);
    handlers.onDragMove(coords.x, coords.y);
  }

  function handlePointerUp(e) {
    if (isDragging) {
      isDragging = false;
      const coords = getWorldCoords(e);
      handlers.onDragEnd(coords.x, coords.y);
    } else if (isTapCandidate) {
      const coords = getWorldCoords(e);
      const moveDist = Math.hypot(coords.x - dragStartX, coords.y - dragStartY);
      if (moveDist < 10) {
        handlers.onTap();
      }
      isTapCandidate = false;
    }
  }

  function handlePointerCancel(e) {
    isDragging = false;
    isTapCandidate = false;
  }

  function handleKeyDown(e) {
    if (e.code === 'Escape') {
      window.AB.Game.togglePause();
    } else if (e.code === 'KeyR') {
      window.AB.Game.restart();
    }
  }

  window.AB.Input = Input;
})();
