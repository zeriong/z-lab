/* slingshot.js — 드래그 조준 / 발사 / 해석적 궤적 프리뷰.
 *
 * A2xA1: 프리뷰는 엔진을 전진 시뮬레이션하지 않는다. 엔진과 "같은 상수"에서 파생한
 * 스텝당 가속도(CFG.G_PER_STEP)로 포물선을 해석적으로 샘플링한다(충돌 무시 — 의도된 발산).
 *
 * Matter의 Body.setVelocity 단위는 "스텝당 픽셀"이며 Verlet 적분에서
 *   p_n = p0 + v0*n + g*n(n+1)/2
 * 가 정확한 위치이므로 프리뷰도 이 식을 쓴다(그래서 BIRD_AIR = 0).
 */
(function (AB) {
  'use strict';

  var CFG = AB.CFG;
  var Physics = AB.Physics;

  var Slingshot = {
    canvas: null,
    getSession: null,
    canAim: null
  };

  function toWorld(canvas, clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (CFG.WIDTH / rect.width),
      y: (clientY - rect.top) * (CFG.HEIGHT / rect.height)
    };
  }

  // 뒤로만 당길 수 있다(dx <= 0). 오른쪽으로 끌어 새를 역방향 발사하는 사고 방지.
  function clampPull(dx, dy) {
    dx = Math.min(0, dx);
    var len = Math.sqrt(dx * dx + dy * dy);
    if (len <= CFG.MAX_PULL) return { x: dx, y: dy, len: len };
    var k = CFG.MAX_PULL / (len || 1);
    return { x: dx * k, y: dy * k, len: CFG.MAX_PULL };
  }

  Slingshot.birdPos = function (session) {
    if (session.bird && session.phase === 'flight') return session.bird.position;
    return { x: session.anchor.x + session.pull.x, y: session.anchor.y + session.pull.y };
  };

  // 현재 당김에서 나올 발사 속도(px/step)
  Slingshot.launchVelocity = function (session) {
    var k = CFG.MAX_LAUNCH_SPEED / CFG.MAX_PULL;
    return { x: -session.pull.x * k, y: -session.pull.y * k };
  };

  Slingshot.pullRatio = function (session) {
    var len = Math.sqrt(session.pull.x * session.pull.x + session.pull.y * session.pull.y);
    return Math.min(1, len / CFG.MAX_PULL);
  };

  // 해석적 프리뷰 점 목록
  Slingshot.previewPoints = function (session) {
    var p0 = Slingshot.birdPos(session);
    var v = Slingshot.launchVelocity(session);
    var g = CFG.G_PER_STEP;
    var pts = [];
    for (var n = CFG.PREVIEW_SAMPLE_EVERY; n <= CFG.PREVIEW_STEPS; n += CFG.PREVIEW_SAMPLE_EVERY) {
      var x = p0.x + v.x * n;
      var y = p0.y + v.y * n + g * n * (n + 1) / 2;
      if (y > session.groundTop + 20) break;
      if (x > CFG.WIDTH + 40) break;
      pts.push({ x: x, y: y });
    }
    return pts;
  };

  function beginDrag(session, p) {
    var bird = Slingshot.birdPos(session);
    var d = Math.sqrt((p.x - bird.x) * (p.x - bird.x) + (p.y - bird.y) * (p.y - bird.y));
    if (d > CFG.GRAB_RADIUS && p.x > session.anchor.x + CFG.GRAB_RADIUS) return false;
    session.dragging = true;
    session.phase = 'drag';
    return true;
  }

  function moveDrag(session, p) {
    var pull = clampPull(p.x - session.anchor.x, p.y - session.anchor.y);
    session.pull.x = pull.x;
    session.pull.y = pull.y;
    if (session.bird) {
      Physics.setPosition(session.bird,
        session.anchor.x + pull.x, session.anchor.y + pull.y);
    }
  }

  function resetToAnchor(session) {
    session.pull.x = 0;
    session.pull.y = 0;
    if (session.bird) {
      Physics.setPosition(session.bird, session.anchor.x, session.anchor.y);
    }
    session.phase = 'aim';
  }

  function endDrag(session) {
    session.dragging = false;
    var len = Math.sqrt(session.pull.x * session.pull.x + session.pull.y * session.pull.y);
    if (!session.bird || len < 10) {           // 너무 짧은 당김 = 발사 취소
      resetToAnchor(session);
      return;
    }
    Slingshot.launch(session);
  }

  Slingshot.launch = function (session) {
    var v = Slingshot.launchVelocity(session);
    Physics.setStatic(session.bird, false);
    Physics.setVelocity(session.bird, v.x, v.y);
    session.birdsLeft = Math.max(0, session.birdsLeft - 1);
    session.phase = 'flight';
    session.flightSteps = 0;
    session.quietSteps = 0;
    session.trail = [{ x: session.bird.position.x, y: session.bird.position.y }];
    if (AB.UI) AB.UI.syncHud(session);
  };

  Slingshot.init = function (opts) {
    Slingshot.canvas = opts.canvas;
    Slingshot.getSession = opts.getSession;
    Slingshot.canAim = opts.canAim;

    var canvas = opts.canvas;

    function interactive() {
      var s = Slingshot.getSession();
      if (!s || !s.engine) return null;
      if (!Slingshot.canAim()) return null;
      if (s.phase !== 'aim' && s.phase !== 'drag') return null;
      if (!s.bird) return null;
      return s;
    }

    canvas.addEventListener('pointerdown', function (e) {
      var s = interactive();
      if (!s) return;
      var p = toWorld(canvas, e.clientX, e.clientY);
      if (beginDrag(s, p)) {
        moveDrag(s, p);
        if (canvas.setPointerCapture) {
          try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        }
        e.preventDefault();
      }
    });

    canvas.addEventListener('pointermove', function (e) {
      var s = Slingshot.getSession();
      if (!s || !s.dragging) return;
      moveDrag(s, toWorld(canvas, e.clientX, e.clientY));
      e.preventDefault();
    });

    function release(e) {
      var s = Slingshot.getSession();
      if (!s || !s.dragging) return;
      moveDrag(s, toWorld(canvas, e.clientX, e.clientY));
      endDrag(s);
      e.preventDefault();
    }

    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', function () {
      var s = Slingshot.getSession();
      if (s && s.dragging) {
        s.dragging = false;
        resetToAnchor(s);
      }
    });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  AB.Slingshot = Slingshot;
})(window.AB);
