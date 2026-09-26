/*
 * src/render.js — Canvas 2D 렌더링 (§12)
 * 노출: R = { draw(ctx, game) }
 * 참조 전역: C, MAT, U (함수 본문 안에서만)
 * 규칙: draw 는 game 을 읽기만 한다 (상태 변경 없음).
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  // 원경 언덕 [cx, cy, r] (패럴랙스 좌표계)
  var HILLS = [
    [240, 640, 230],
    [780, 660, 330],
    [1360, 650, 260]
  ];

  var POST_OFFSET = 14;   // 새총 기둥 중심 = SLING_X ± 14
  var POST_W = 12;

  var skyCtx = null;
  var skyGrad = null;

  function draw(ctx, game) {
    var camX = (game && game.cam) ? game.cam.x : 0;
    var bodies = (game && game.world) ? game.world.bodies : [];
    var i, b;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    // 1) 하늘 (카메라 변환 밖)
    drawSky(ctx);

    // 2) 원경 언덕 (카메라 x 의 0.3배 패럴랙스)
    drawHills(ctx, camX);

    // 3) 카메라 적용
    ctx.save();
    ctx.translate(-camX, 0);

    // 4) 지면
    drawGround(ctx);

    // 5) 새총 + 고무줄
    drawSling(ctx, game);

    // 6) 블록
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (!b.dead && b.kind === 'block') drawBlock(ctx, b);
    }

    // 7) 돼지
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (!b.dead && b.kind === 'pig') drawPig(ctx, b);
    }

    // 8) 새 (월드 안의 새 + 아직 발사 전인 장전 새)
    for (i = 0; i < bodies.length; i++) {
      b = bodies[i];
      if (!b.dead && b.kind === 'bird') drawBird(ctx, b);
    }
    if (game && game.bird && !game.bird.dead && bodies.indexOf(game.bird) < 0) {
      drawBird(ctx, game.bird);
    }

    // 9) 파티클
    drawParticles(ctx, game ? game.particles : null);

    // 10) 궤적 예측
    drawTrajectory(ctx, game);

    // 11) 복원
    ctx.restore();
  }

  function drawSky(ctx) {
    if (skyCtx !== ctx || !skyGrad) {
      skyGrad = ctx.createLinearGradient(0, 0, 0, C.VIEW_H);
      skyGrad.addColorStop(0, '#87ceeb');
      skyGrad.addColorStop(1, '#e6f4fb');
      skyCtx = ctx;
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  }

  function drawHills(ctx, camX) {
    ctx.save();
    ctx.translate(-camX * 0.3, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var i = 0; i < HILLS.length; i++) {
      var h = HILLS[i];
      ctx.beginPath();
      ctx.arc(h[0], h[1], h[2], Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawGround(ctx) {
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, C.WORLD_H - C.GROUND_Y);
    ctx.fillStyle = '#4f8f3a';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 6);
  }

  function drawSling(ctx, game) {
    var sx = C.SLING_X;
    var top = C.SLING_Y;
    var bottom = C.GROUND_Y;
    var leftX = sx - POST_OFFSET;
    var rightX = sx + POST_OFFSET;

    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(leftX - POST_W / 2, top, POST_W, bottom - top);
    ctx.fillRect(rightX - POST_W / 2, top, POST_W, bottom - top);

    if (game && game.shot === 'DRAG' && game.bird) {
      var bird = game.bird;
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(leftX, top + 4);
      ctx.lineTo(bird.x, bird.y);
      ctx.moveTo(rightX, top + 4);
      ctx.lineTo(bird.x, bird.y);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  function hpRatio(b) {
    if (!isFinite(b.maxHp) || b.maxHp <= 0) return 1;
    return U.clamp(b.hp / b.maxHp, 0, 1);
  }

  function drawBlock(ctx, b) {
    var m = MAT[b.mat] || MAT.wood;
    var x = b.x - b.hw;
    var y = b.y - b.hh;
    var w = b.hw * 2;
    var h = b.hh * 2;

    ctx.fillStyle = m.color;
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = m.stroke;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    // 균열: hp 비율 < 0.66 이면 대각선 1개, < 0.33 이면 2개
    var ratio = hpRatio(b);
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

  function drawPig(ctx, b) {
    var m = MAT.pig;
    var r = b.r;
    var x = b.x;
    var y = b.y;
    var s;

    // 몸통
    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = m.stroke;
    ctx.stroke();

    // 눈
    var ex = r * 0.38;
    var ey = y - r * 0.3;
    var er = r * 0.24;
    if (hpRatio(b) < 0.5) {
      // 체력이 낮으면 X 눈
      ctx.strokeStyle = '#1e3a12';
      ctx.lineWidth = 2;
      for (s = -1; s <= 1; s += 2) {
        var cx = x + s * ex;
        var k = er * 0.75;
        ctx.beginPath();
        ctx.moveTo(cx - k, ey - k);
        ctx.lineTo(cx + k, ey + k);
        ctx.moveTo(cx + k, ey - k);
        ctx.lineTo(cx - k, ey + k);
        ctx.stroke();
      }
    } else {
      for (s = -1; s <= 1; s += 2) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x + s * ex, ey, er, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(x + s * ex + er * 0.2, ey, er * 0.45, 0, TAU);
        ctx.fill();
      }
    }

    // 코: 가로 타원 + 콧구멍 2점
    var sy = y + r * 0.2;
    var sw = r * 0.42;
    var sh = r * 0.28;
    ctx.save();
    ctx.translate(x, sy);
    ctx.scale(1, sh / sw);
    ctx.beginPath();
    ctx.arc(0, 0, sw, 0, TAU);
    ctx.restore();
    ctx.fillStyle = '#9fe07a';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = m.stroke;
    ctx.stroke();

    ctx.fillStyle = '#2f5f1f';
    for (s = -1; s <= 1; s += 2) {
      ctx.beginPath();
      ctx.arc(x + s * sw * 0.4, sy, Math.max(1.2, r * 0.07), 0, TAU);
      ctx.fill();
    }
  }

  function drawBird(ctx, b) {
    var r = b.r;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle || 0);

    // 몸통
    ctx.fillStyle = b.color || '#e2483c';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = MAT.bird.stroke;
    ctx.stroke();

    // 부리 (주황 삼각형, 진행 방향 = +x)
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.22);
    ctx.lineTo(r * 1.3, r * 0.02);
    ctx.lineTo(r * 0.55, r * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#8a4b00';
    ctx.stroke();

    // 눈
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.25, -r * 0.32, r * 0.27, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(r * 0.33, -r * 0.32, r * 0.12, 0, TAU);
    ctx.fill();

    ctx.restore();
  }

  function drawParticles(ctx, list) {
    if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      var a = p.maxLife > 0 ? p.life / p.maxLife : 0;
      if (a <= 0) continue;
      ctx.globalAlpha = U.clamp(a, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // §9.4 — DRAG 중에만, 충돌 무시 순수 포물선
  function drawTrajectory(ctx, game) {
    if (!game || game.shot !== 'DRAG' || !game.bird) return;
    var b = game.bird;
    var vx = (C.SLING_X - b.x) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - b.y) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      var kk = C.MAX_LAUNCH_SPEED / sp;
      vx *= kk;
      vy *= kk;
    }
    var N = C.TRAJ_POINTS;
    ctx.fillStyle = '#ffffff';
    for (var k = 1; k <= N; k++) {
      var t = k * C.TRAJ_STEP;
      var px = b.x + vx * t;
      var py = b.y + vy * t + 0.5 * C.GRAVITY * t * t;
      if (py > C.GROUND_Y) break;
      ctx.globalAlpha = 0.85 * (1 - k / N) + 0.1;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  window.R = { draw: draw };
})();
