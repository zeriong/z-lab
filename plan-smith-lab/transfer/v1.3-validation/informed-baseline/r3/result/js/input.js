(function() {
  'use strict';

  const C = window.AB.C;
  let handlers;
  let canvas;
  let dragStartX, dragStartY;
  let isDragging = false;
  let dragStartDist = 0;

  window.AB.Input = {
    attach(can, hdlrs) {
      canvas = can;
      handlers = hdlrs;

      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerCancel);
      document.addEventListener('keydown', onKeyDown);
    }
  };

  function worldCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) * (C.W / rect.width);
    const worldY = (e.clientY - rect.top) * (C.H / rect.height);
    return { x: worldX, y: worldY };
  }

  function onPointerDown(e) {
    const pos = worldCoords(e);
    dragStartX = pos.x;
    dragStartY = pos.y;

    const dx = pos.x - C.SLING.x;
    const dy = pos.y - C.SLING.y;
    dragStartDist = Math.hypot(dx, dy);

    if (dragStartDist <= C.GRAB_R) {
      isDragging = true;
      canvas.setPointerCapture(e.pointerId);
      if (handlers.onDragStart) handlers.onDragStart(pos.x, pos.y);
    }
  }

  function onPointerMove(e) {
    if (!isDragging) return;

    const pos = worldCoords(e);
    const dx = pos.x - C.SLING.x;
    const dy = pos.y - C.SLING.y;
    let len = Math.hypot(dx, dy);

    if (len > C.DRAG_MAX) {
      const scale = C.DRAG_MAX / len;
      pos.x = C.SLING.x + dx * scale;
      pos.y = C.SLING.y + dy * scale;
    }

    if (handlers.onDragMove) handlers.onDragMove(pos.x, pos.y);
  }

  function onPointerUp(e) {
    if (isDragging) {
      isDragging = false;
      const pos = worldCoords(e);
      if (handlers.onDragEnd) handlers.onDragEnd(pos.x, pos.y);
    } else {
      const pos = worldCoords(e);
      const moveDist = Math.hypot(pos.x - dragStartX, pos.y - dragStartY);
      if (moveDist < 10 && handlers.onTap) handlers.onTap();
    }
  }

  function onPointerCancel(e) {
    isDragging = false;
  }

  function onKeyDown(e) {
    if (e.code === 'Escape') {
      if (window.AB.Game && window.AB.Game.togglePause) {
        window.AB.Game.togglePause();
      }
    } else if (e.code === 'KeyR') {
      if (window.AB.Game && window.AB.Game.restart) {
        window.AB.Game.restart();
      }
    }
  }
})();
