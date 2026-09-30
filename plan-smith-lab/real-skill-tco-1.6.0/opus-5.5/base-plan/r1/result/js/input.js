// input.js — 포인터·키보드 → 논리 좌표 → 월드 좌표 → Game/Level 호출 (plan §3.3, §9.5)
(function () {
  'use strict';
  const AB = (window.AB = window.AB || {});

  let canvas = null;
  let activePointerId = null;

  // 클라이언트 좌표 → 논리 px → 월드 m
  function toWorld(e) {
    const C = AB.CONFIG;
    const rect = canvas.getBoundingClientRect();
    if (!(rect.width > 0) || !(rect.height > 0)) return null;
    const lx = ((e.clientX - rect.left) * C.VIEW_W) / rect.width;
    const ly = ((e.clientY - rect.top) * C.VIEW_H) / rect.height;
    return AB.Coord.screenToWorld(lx, ly);
  }

  function playingLevel() {
    const g = AB.Game;
    if (!g || g.state !== 'PLAYING' || !g.level) return null;
    return g.level;
  }

  function releaseCapture(id) {
    try {
      if (canvas.hasPointerCapture && canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    } catch (err) {
      // 무시
    }
  }

  function onPointerDown(e) {
    const level = playingLevel();
    if (!level) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    const w = toWorld(e);
    if (!w) return;
    const grabbed = level.pointerDown(w.x, w.y);
    if (grabbed) {
      activePointerId = e.pointerId;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {
        // 캡처 실패해도 조작은 계속된다
      }
    }
  }

  function onPointerMove(e) {
    if (activePointerId === null || e.pointerId !== activePointerId) return;
    const level = playingLevel();
    if (!level) return;
    e.preventDefault();
    const w = toWorld(e);
    if (!w) return;
    level.pointerMove(w.x, w.y);
  }

  function onPointerUp(e) {
    if (activePointerId === null || e.pointerId !== activePointerId) return;
    activePointerId = null;
    releaseCapture(e.pointerId);
    const level = playingLevel();
    if (!level) return;
    e.preventDefault();
    const w = toWorld(e);
    if (w) level.pointerUp(w.x, w.y);
    else level.pointerCancel();
  }

  function onPointerCancel(e) {
    if (activePointerId !== null && e.pointerId === activePointerId) {
      activePointerId = null;
      releaseCapture(e.pointerId);
    }
    const g = AB.Game;
    if (g && g.level) g.level.pointerCancel();
  }

  function onKeyDown(e) {
    const g = AB.Game;
    if (!g) return;
    const isPauseKey = e.key === 'Escape' || e.key === 'p' || e.key === 'P' || e.code === 'KeyP';
    const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar';
    if (isPauseKey) {
      if (e.repeat) return;
      if (g.state === 'PLAYING') {
        e.preventDefault();
        g.pause();
      } else if (g.state === 'PAUSED') {
        e.preventDefault();
        g.resume();
      }
    } else if (isSpace) {
      if (g.state === 'PLAYING' && g.level) {
        e.preventDefault();
        if (!e.repeat) g.level.activateAbility();
      }
    }
  }

  const Input = {
    init(c) {
      canvas = c;
      canvas.addEventListener('pointerdown', onPointerDown);
      canvas.addEventListener('pointermove', onPointerMove);
      canvas.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('pointercancel', onPointerCancel);
      canvas.addEventListener('lostpointercapture', (e) => {
        // 캡처를 잃었는데 아직 조준 중이면 취소 (pointerup 이후의 정상 해제는 activePointerId가 이미 null)
        if (activePointerId !== null && e.pointerId === activePointerId) onPointerCancel(e);
      });
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('keydown', onKeyDown);
    },

    // 일시정지·화면 전환 시 진행 중인 드래그를 잊는다
    reset() {
      if (activePointerId !== null && canvas) releaseCapture(activePointerId);
      activePointerId = null;
    },
  };

  AB.Input = Input;
})();
