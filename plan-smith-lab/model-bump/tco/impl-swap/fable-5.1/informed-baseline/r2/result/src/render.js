// render.js — §12 Canvas 2D 렌더. 게임 상태를 읽기만 한다. 참조 전역: C, MAT, BIRD, U
(function () {
  'use strict';

  var skyGrad = null;

  function drawSky(ctx) {
    if (!skyGrad) {
      skyGrad = ctx.createLinearGradient(0, 0, 0, C.VIEW_H);
      skyGrad.addColorStop(0, '#87ceeb');
      skyGrad.addColorStop(1, '#e6f4fb');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  }

  function drawHills(ctx, camX) {
    var off = -camX * 0.3;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    var hills = [
      { x: 260, r: 220 },
      { x: 760, r: 300 },
      { x: 1350, r: 260 }
    ];
    for (var i = 0; i < hills.length; i++) {
      ctx.beginPath();
      ctx.arc(hills[i].x + off, C.GROUND_Y + 40, hills[i].r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  function drawGround(ctx) {
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, C.VIEW_H - C.GROUND_Y);
    ctx.fillStyle = '#4f8f3a';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 6);
  }

  function drawSling(ctx, game) {
    var x = C.SLING_X;
    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(x - 14, 500, 12, 120);
    ctx.fillRect(x + 2, 500, 12, 120);
    if (game.shot === 'DRAG' && game.birdPos) {
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 8, 502);
      ctx.lineTo(game.birdPos.x, game.birdPos.y);
      ctx.moveTo(x + 8, 502);
      ctx.lineTo(game.birdPos.x, game.birdPos.y);
      ctx.stroke();
    }
  }

  function drawBlock(ctx, b) {
    var m = MAT[b.mat] || MAT.wood;
    var x = b.x - b.hw, y = b.y - b.hh, w = b.hw * 2, h = b.hh * 2;
    ctx.fillStyle = m.color;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = m.stroke;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    if (b.maxHp !== Infinity) {
      var ratio = b.hp / b.maxHp;
      if (ratio < 0.66) {
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 2);
        ctx.lineTo(x + w - 2, y + h - 2);
        ctx.stroke();
        if (ratio < 0.33) {
          ctx.beginPath();
          ctx.moveTo(x + w - 2, y + 2);
          ctx.lineTo(x + 2, y + h - 2);
          ctx.stroke();
        }
      }
    }
  }

  function drawPig(ctx, b) {
    var m = MAT.pig;
    var r = b.r;
    ctx.fillStyle = m.color;
    ctx.strokeStyle = m.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    var hurt = (b.maxHp !== Infinity) && (b.hp / b.maxHp < 0.5);
    var ex = r * 0.38, ey = -r * 0.3, er = r * 0.22;

    if (hurt) {
      ctx.strokeStyle = '#1e3a12';
      ctx.lineWidth = 2;
      [-1, 1].forEach(function (s) {
        var cx = b.x + s * ex, cy = b.y + ey;
        ctx.beginPath();
        ctx.moveTo(cx - er, cy - er); ctx.lineTo(cx + er, cy + er);
        ctx.moveTo(cx + er, cy - er); ctx.lineTo(cx - er, cy + er);
        ctx.stroke();
      });
    } else {
      [-1, 1].forEach(function (s) {
        var cx = b.x + s * ex, cy = b.y + ey;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(cx, cy, er, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#1e1e1e';
        ctx.beginPath(); ctx.arc(cx + er * 0.3, cy, er * 0.45, 0, Math.PI * 2); ctx.fill();
      });
    }

    // 코: 가로 타원 + 콧구멍 2점
    ctx.fillStyle = '#6db245';
    ctx.strokeStyle = m.stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y + r * 0.15, r * 0.42, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#3f7a28';
    ctx.beginPath(); ctx.arc(b.x - r * 0.16, b.y + r * 0.15, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(b.x + r * 0.16, b.y + r * 0.15, r * 0.07, 0, Math.PI * 2); ctx.fill();
  }

  function drawBirdShape(ctx, x, y, r, type, angle) {
    var spec = BIRD[type] || BIRD.red;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.fillStyle = spec.color;
    ctx.strokeStyle = MAT.bird.stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 부리
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(r * 0.6, -r * 0.15);
    ctx.lineTo(r * 1.35, 0.0);
    ctx.lineTo(r * 0.6, r * 0.2);
    ctx.closePath();
    ctx.fill();
    // 눈
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath(); ctx.arc(r * 0.42, -r * 0.35, r * 0.1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawParticles(ctx, particles) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var a = p.maxLife > 0 ? U.clamp(p.life / p.maxLife, 0, 1) : 0;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // §9.2 발사 속도 (읽기 전용 계산)
  function launchVelocity(bx, by) {
    var vx = (C.SLING_X - bx) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - by) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      vx = vx / sp * C.MAX_LAUNCH_SPEED;
      vy = vy / sp * C.MAX_LAUNCH_SPEED;
    }
    return { vx: vx, vy: vy };
  }

  function drawTrajectory(ctx, game) {
    if (game.shot !== 'DRAG' || !game.birdPos) return;
    var v0 = launchVelocity(game.birdPos.x, game.birdPos.y);
    ctx.fillStyle = '#ffffff';
    for (var k = 1; k <= C.TRAJ_POINTS; k++) {
      var t = k * C.TRAJ_STEP;
      var px = game.birdPos.x + v0.vx * t;
      var py = game.birdPos.y + v0.vy * t + 0.5 * C.GRAVITY * t * t;
      if (py > C.GROUND_Y) break;
      ctx.globalAlpha = 0.85 * (1 - k / C.TRAJ_POINTS) + 0.1;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw(ctx, game) {
    var camX = game.cam ? game.cam.x : 0;

    // 1) 하늘, 2) 원경 (카메라 변환 밖)
    drawSky(ctx);
    drawHills(ctx, camX);

    // 3) 카메라 적용
    ctx.save();
    ctx.translate(-camX, 0);

    // 4) 지면
    drawGround(ctx);

    // 5) 새총
    drawSling(ctx, game);

    // 6~8) 바디
    var bodies = game.world ? game.world.bodies : [];
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
      if (b.kind === 'bird') drawBirdShape(ctx, b.x, b.y, b.r, b.birdType, b.angle);
    }
    // 장전/드래그 중인 새 (월드 밖)
    if ((game.shot === 'ARMED' || game.shot === 'DRAG') && game.birdPos && game.birdType) {
      var spec = BIRD[game.birdType] || BIRD.red;
      drawBirdShape(ctx, game.birdPos.x, game.birdPos.y, spec.r, game.birdType, 0);
    }

    // 9) 파티클
    if (game.particles) drawParticles(ctx, game.particles);

    // 10) 궤적 예측
    drawTrajectory(ctx, game);

    // 11)
    ctx.restore();
  }

  window.R = { draw: draw };
})();
