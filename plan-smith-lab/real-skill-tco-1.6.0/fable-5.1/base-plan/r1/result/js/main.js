window.AB = window.AB || {};

// 부트스트랩 (계획서 §6, §8.12): Matter 확인, 인스턴스 생성, 리사이즈, rAF 루프, 포인터/키보드 바인딩
(function () {
  'use strict';

  if (!window.Matter) {
    AB.UI.showError();
    return;
  }

  // 리뷰 편의: ?unlockall 로 전 스테이지 해금 (Game 생성 전에 저장해야 progress에 반영됨)
  try {
    if (String(window.location.search || '').indexOf('unlockall') >= 0) AB.Storage.unlockAll();
  } catch (e) { /* ignore */ }

  const C = AB.CONFIG;
  const app = document.getElementById('app');
  const canvas = document.getElementById('game');

  const game = new AB.Game();
  const renderer = new AB.Renderer(canvas);
  AB.UI.init(game);

  const STEP = C.STEP_MS / 1000;   // 초 단위 고정 스텝
  let acc = 0;
  let last = performance.now();
  game.onResume = function () {
    acc = 0;
    last = performance.now();
  };

  // ---- 레터박스 스케일 ----
  function fit() {
    const s = Math.min(window.innerWidth / C.W, window.innerHeight / C.H);
    const ox = (window.innerWidth - C.W * s) / 2;
    const oy = (window.innerHeight - C.H * s) / 2;
    app.style.transform = 'translate(' + ox + 'px, ' + oy + 'px) scale(' + s + ')';
    renderer.resizeBackingStore();
  }
  window.addEventListener('resize', fit);
  fit();

  // ---- 포인터 ----
  function toLocal(e) {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || C.W, h = rect.height || C.H;
    return {
      x: (e.clientX - rect.left) * C.W / w,
      y: (e.clientY - rect.top) * C.H / h
    };
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (game.state !== 'PLAYING') return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    const p = toLocal(e);
    game.onPointerDown(p.x, p.y);
  });

  canvas.addEventListener('pointermove', function (e) {
    if (game.state !== 'PLAYING') return;
    e.preventDefault();
    const p = toLocal(e);
    game.onPointerMove(p.x, p.y);
  });

  function onUp(e) {
    if (game.state !== 'PLAYING') return;
    e.preventDefault();
    const p = toLocal(e);
    game.onPointerUp(p.x, p.y);
  }
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  // ---- 키보드 ----
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && (game.state === 'PLAYING' || game.state === 'PAUSED')) {
      e.preventDefault();
      game.togglePause();
    }
  });

  // ---- 루프 ----
  game.goMenu();

  function tick(now) {
    let dt = (now - last) / 1000;
    if (!(dt >= 0)) dt = 0;
    if (dt > 0.1) dt = 0.1;
    last = now;

    if (game.state === 'PLAYING') {
      acc += dt;
      let n = 0;
      while (acc >= STEP && n < C.MAX_STEPS_PER_FRAME && game.state === 'PLAYING') {
        game.step();
        acc -= STEP;
        n++;
      }
      if (acc > STEP * C.MAX_STEPS_PER_FRAME) acc = 0;   // 스파이럴 방지
    }

    const s = game.state;
    if (s === 'PLAYING' || s === 'CLEARED' || s === 'FAILED') game.effects.update(dt);

    renderer.draw(game);
    AB.UI.updateHud(game);
    window.requestAnimationFrame(tick);
  }

  window.requestAnimationFrame(tick);
})();
