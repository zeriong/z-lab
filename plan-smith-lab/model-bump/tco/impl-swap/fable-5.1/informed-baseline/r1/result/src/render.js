// render.js — §12 캔버스 그리기. C, MAT, BIRD, U 참조. 게임 상태를 변경하지 않는다(읽기 전용).
(function () {
  'use strict';

  var TWO_PI = Math.PI * 2;

  // ---------------------------------------------------------------
  // 1) 하늘 (카메라 변환 밖)
  // ---------------------------------------------------------------
  function drawSky(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, C.VIEW_H);
    g.addColorStop(0, '#87ceeb');
    g.addColorStop(1, '#e6f4fb');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  }

  // ---------------------------------------------------------------
  // 2) 원경 언덕 (패럴랙스 0.3배)
  // ---------------------------------------------------------------
  function drawHills(ctx, camX) {
    ctx.save();
    ctx.translate(-camX * 0.3, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    var hills = [
      { x: 260, y: 700, r: 300 },
      { x: 820, y: 720, r: 380 },
      { x: 1450, y: 700, r: 320 }
    ];
    for (var i = 0; i < hills.length; i++) {
      ctx.beginPath();
      ctx.arc(hills[i].x, hills[i].y, hills[i].r, Math.PI, TWO_PI);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------
  // 4) 지면
  // ---------------------------------------------------------------
  function drawGround(ctx) {
    ctx.fillStyle = MAT.ground.color;
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, C.WORLD_H - C.GROUND_Y);
    ctx.fillStyle = '#4f8f3a';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 6);
  }

  // ---------------------------------------------------------------
  // 5) 새총
  // ---------------------------------------------------------------
  function drawSling(ctx, game) {
    var x = C.SLING_X;
    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(x - 16, 500, 12, C.GROUND_Y - 500);
    ctx.fillRect(x + 4, 500, 12, C.GROUND_Y - 500);

    if (game.shot === 'DRAG' && game.armed) {
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 10, 500);
      ctx.lineTo(game.armed.x, game.armed.y);
      ctx.moveTo(x + 10, 500);
      ctx.lineTo(game.armed.x, game.armed.y);
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------
  // 6) 블록
  // ---------------------------------------------------------------
  function drawBlock(ctx, b) {
    var m = MAT[b.mat] || MAT.wood;
    var x = b.x - b.hw, y = b.y - b.hh, w = b.hw * 2, h = b.hh * 2;
    ctx.fillStyle = m.color;
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = m.stroke;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    var ratio = b.maxHp === Infinity ? 1 : b.hp / b.maxHp;
    if (ratio < 0.66) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3);
      ctx.lineTo(x + w - 3, y + h - 3);
      if (ratio < 0.33) {
        ctx.moveTo(x + w - 3, y + 3);
        ctx.lineTo(x + 3, y + h - 3);
      }
      ctx.stroke();
    }
  }

  // ---------------------------------------------------------------
  // 7) 돼지
  // ---------------------------------------------------------------
  function drawPig(ctx, b) {
    var m = MAT.pig;
    var r = b.r;
    ctx.save();
    ctx.translate(b.x, b.y);

    // 몸통
    ctx.fillStyle = m.color;
    ctx.strokeStyle = m.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TWO_PI);
    ctx.fill();
    ctx.stroke();

    // 귀
    ctx.beginPath();
    ctx.arc(-r * 0.6, -r * 0.75, r * 0.25, 0, TWO_PI);
    ctx.arc(r * 0.6, -r * 0.75, r * 0.25, 0, TWO_PI);
    ctx.fill();
    ctx.stroke();

    var ratio = b.maxHp === Infinity ? 1 : b.hp / b.maxHp;
    var ex = r * 0.38, ey = -r * 0.25, er = r * 0.22;
    if (ratio < 0.5) {
      // 눈을 X 형태로
      ctx.strokeStyle = '#2b4d1c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-ex - er, ey - er); ctx.lineTo(-ex + er, ey + er);
      ctx.moveTo(-ex + er, ey - er); ctx.lineTo(-ex - er, ey + er);
      ctx.moveTo(ex - er, ey - er); ctx.lineTo(ex + er, ey + er);
      ctx.moveTo(ex + er, ey - er); ctx.lineTo(ex - er, ey + er);
      ctx.stroke();
    } else {
      // 흰자
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-ex, ey, er, 0, TWO_PI);
      ctx.arc(ex, ey, er, 0, TWO_PI);
      ctx.fill();
      // 눈동자
      ctx.fillStyle = '#1b1b1b';
      ctx.beginPath();
      ctx.arc(-ex + er * 0.3, ey, er * 0.45, 0, TWO_PI);
      ctx.arc(ex + er * 0.3, ey, er * 0.45, 0, TWO_PI);
      ctx.fill();
    }

    // 코 (가로 타원 + 콧구멍 2점)
    ctx.fillStyle = '#5fa63d';
    ctx.strokeStyle = m.stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.22, r * 0.45, r * 0.3, 0, 0, TWO_PI);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2b4d1c';
    ctx.beginPath();
    ctx.arc(-r * 0.17, r * 0.22, r * 0.08, 0, TWO_PI);
    ctx.arc(r * 0.17, r * 0.22, r * 0.08, 0, TWO_PI);
    ctx.fill();

    ctx.restore();
  }

  // ---------------------------------------------------------------
  // 8) 새 (x, y, r, color, angle)
  // ---------------------------------------------------------------
  function drawBird(ctx, x, y, r, color, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);

    ctx.fillStyle = color;
    ctx.strokeStyle = MAT.bird.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TWO_PI);
    ctx.fill();
    ctx.stroke();

    // 부리 (주황 삼각형, +x 방향)
    ctx.fillStyle = '#f28c28';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.25);
    ctx.lineTo(r * 1.45, 0);
    ctx.lineTo(r * 0.7, r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 눈
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.35, r * 0.28, 0, TWO_PI);
    ctx.fill();
    ctx.fillStyle = '#1b1b1b';
    ctx.beginPath();
    ctx.arc(r * 0.42, -r * 0.35, r * 0.13, 0, TWO_PI);
    ctx.fill();

    // 눈썹
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 0.05, -r * 0.7);
    ctx.lineTo(r * 0.65, -r * 0.55);
    ctx.stroke();

    ctx.restore();
  }

  // ---------------------------------------------------------------
  // 9) 파티클
  // ---------------------------------------------------------------
  function drawParticles(ctx, particles) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = p.maxLife > 0 ? p.life / p.maxLife : 0;
      if (a <= 0) continue;
      ctx.globalAlpha = U.clamp(a, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------
  // 10) 궤적 예측 (§9.4) — DRAG 중에만
  // ---------------------------------------------------------------
  function launchVel(x, y) {
    var vx = (C.SLING_X - x) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - y) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      vx = vx / sp * C.MAX_LAUNCH_SPEED;
      vy = vy / sp * C.MAX_LAUNCH_SPEED;
    }
    return { vx: vx, vy: vy };
  }

  function drawTrajectory(ctx, game) {
    if (game.shot !== 'DRAG' || !game.armed) return;
    var v0 = launchVel(game.armed.x, game.armed.y);
    ctx.fillStyle = '#ffffff';
    for (var k = 1; k <= C.TRAJ_POINTS; k++) {
      var t = k * C.TRAJ_STEP;
      var px = game.armed.x + v0.vx * t;
      var py = game.armed.y + v0.vy * t + 0.5 * C.GRAVITY * t * t;
      if (py > C.GROUND_Y) break;
      ctx.globalAlpha = 0.85 * (1 - k / C.TRAJ_POINTS) + 0.1;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, TWO_PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------
  // 진입점 — §12.1 순서
  // ---------------------------------------------------------------
  function draw(ctx, game) {
    var camX = game && game.cam ? game.cam.x : 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    drawSky(ctx);
    drawHills(ctx, camX);

    ctx.save();
    ctx.translate(-camX, 0);

    drawGround(ctx);
    drawSling(ctx, game);

    if (game && game.world) {
      var bodies = game.world.bodies;
      var i, b;
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        if (b.kind === 'block') drawBlock(ctx, b);
      }
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        if (b.kind === 'pig') drawPig(ctx, b);
      }
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        if (b.kind === 'bird') {
          var bd = BIRD[b.bird] || BIRD.red;
          drawBird(ctx, b.x, b.y, b.r, bd.color, b.angle);
        }
      }
    }

    // 장전된 새 (ARMED / DRAG) — 월드에 없으므로 별도로 그린다
    if (game && game.armed && (game.shot === 'ARMED' || game.shot === 'DRAG')) {
      drawBird(ctx, game.armed.x, game.armed.y, game.armed.r, game.armed.color, 0);
    }

    if (game && game.particles) drawParticles(ctx, game.particles);
    if (game) drawTrajectory(ctx, game);

    ctx.restore();
  }

  window.R = { draw: draw };
})();
