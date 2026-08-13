(function() {
  'use strict';

  const C = window.AB.C;

  let handlers = null;
  let canvas = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let isClickCandidate = false;
  let lastPointerId = null;

  const Input = {
    attach(c, h) {
      canvas = c;
      handlers = h;

      canvas.addEventListener('pointerdown', handlePointerDown);
      canvas.addEventListener('pointermove', handlePointerMove);
      canvas.addEventListener('pointerup', handlePointerUp);
      canvas.addEventListener('pointercancel', handlePointerCancel);

      document.addEventListener('keydown', handleKeyDown);
    }
  };

  function getWorldCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const worldX = (e.clientX - rect.left) * (C.W / rect.width);
    const worldY = (e.clientY - rect.top) * (C.H / rect.height);
    return { worldX, worldY };
  }

  function handlePointerDown(e) {
    const { worldX, worldY } = getWorldCoords(e);
    lastPointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);

    const dx = worldX - C.SLING.x;
    const dy = worldY - C.SLING.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= C.GRAB_R) {
      isDragging = true;
      isClickCandidate = false;
      dragStartX = worldX;
      dragStartY = worldY;
      if (handlers.onDragStart) {
        handlers.onDragStart(worldX, worldY);
      }
    } else {
      isDragging = false;
      isClickCandidate = true;
      dragStartX = worldX;
      dragStartY = worldY;
    }
  }

  function handlePointerMove(e) {
    if (e.pointerId !== lastPointerId) return;

    const { worldX, worldY } = getWorldCoords(e);

    if (isDragging && handlers.onDragMove) {
      handlers.onDragMove(worldX, worldY);
    }
  }

  function handlePointerUp(e) {
    if (e.pointerId !== lastPointerId) return;

    const { worldX, worldY } = getWorldCoords(e);

    if (isDragging) {
      if (handlers.onDragEnd) {
        handlers.onDragEnd(worldX, worldY);
      }
      isDragging = false;
    } else if (isClickCandidate) {
      const dist = Math.hypot(worldX - dragStartX, worldY - dragStartY);
      if (dist < 10 && handlers.onTap) {
        handlers.onTap();
      }
    }

    isClickCandidate = false;
  }

  function handlePointerCancel(e) {
    isDragging = false;
    isClickCandidate = false;
  }

  function handleKeyDown(e) {
    if (e.code === 'Escape') {
      if (window.AB.Game) {
        window.AB.Game.togglePause();
      }
    } else if (e.code === 'KeyR') {
      if (window.AB.Game) {
        window.AB.Game.restart();
      }
    }
  }

  window.AB = window.AB || {};
  window.AB.Input = Input;
})();
