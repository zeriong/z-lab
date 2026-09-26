/* render.js — §12 Canvas 2D 렌더링. 참조 전역: C, MAT, BIRD, U
 * R.draw(ctx, game) 는 게임 상태를 읽기만 하고 절대 변경하지 않는다.
 */
var R = (function () {
  'use strict';

  /* §9.2 발사 속도 공식 (궤적 예측용 — 상태를 바꾸지 않는 순수 계산) */
  function launchVelocity(bx, by) {
    var vx = (C.SLING_X - bx) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - by) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      var k = C.MAX_LAUNCH_SPEED / sp;
      vx *= k;
      vy *= k;
    }
    return { vx: vx, vy: vy };
  }

  /* 1. 하늘 (카메라 변환 밖) */
  function drawSky(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, C.VIEW_H);
    g.addColorStop(0, '#87ceeb');
    g.addColorStop(1, '#e6f4fb');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  }

  /* 2. 원경 언덕: 카메라 x 의 0.3배 패럴랙스, 반투명 원호 3개 */
  function drawHills(ctx, camX) {
    var off = -camX * 0.3;
    var hills = [[220, 260], [720, 340], [1230, 300]];
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var i = 0; i < hills.length; i++) {
      ctx.beginPath();
      ctx.arc(hills[i][0] + off, C.GROUND_Y, hills[i][1], Math.PI, 0);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* 4. 지면 */
  function drawGround(ctx) {
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, C.WORLD_H - C.GROUND_Y);
    ctx.fillStyle = '#4f8f3a';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 6);
  }

  /* 5. 새총 + 고무줄 */
  function drawSling(ctx, game) {
    var x = C.SLING_X;
    var top = 500;
    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(x - 16, top, 12, C.GROUND_Y - top);
    ctx.fillRect(x + 4, top, 12, C.GROUND_Y - top);

    if (game && game.shot === 'DRAG' && game.birdPos) {
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x - 10, top + 4);
      ctx.lineTo(game.birdPos.x, game.birdPos.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x + 10, top + 4);
      ctx.lineTo(game.birdPos.x, game.birdPos.y);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }
  }

  /* 6. 블록: 재질 색 + 2px 테두리 + hp 비율 균열 */
  function drawBlock(ctx, b) {
    var m = MAT[b.mat] || MAT.wood;
    var x = b.x - b.hw, y = b.y - b.hh, w = b.hw * 2, h = b.hh * 2;
    ctx.fillStyle = m.color;
    ctx.fillRect(x, y, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = m.stroke;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);

    var ratio = (b.maxHp === Infinity || b.maxHp <= 0) ? 1 : b.hp / b.maxHp;
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

  /* 7. 돼지: 몸통 + 눈 2개 + 코. hp 비율 낮으면 X 눈 */
  function drawPig(ctx, b) {
    var m = MAT.pig;
    var x = b.x, y = b.y, r = b.r;
    var ratio = (b.maxHp === Infinity || b.maxHp <= 0) ? 1 : b.hp / b.maxHp;

    /* 몸통 */
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = m.stroke;
    ctx.stroke();

    /* 귀 */
    ctx.beginPath();
    ctx.arc(x - r * 0.55, y - r * 0.75, r * 0.22, 0, Math.PI * 2);
    ctx.arc(x + r * 0.55, y - r * 0.75, r * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = m.color;
    ctx.fill();
    ctx.stroke();

    /* 코: 가로 타원 + 콧구멍 2점 */
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.15, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#6db245';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = m.stroke;
    ctx.stroke();
    ctx.fillStyle = '#3f7a2a';
    ctx.beginPath();
    ctx.arc(x - r * 0.15, y + r * 0.15, r * 0.07, 0, Math.PI * 2);
    ctx.arc(x + r * 0.15, y + r * 0.15, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    /* 눈 */
    var ex = [x - r * 0.38, x + r * 0.38];
    var ey = y - r * 0.38;
    var i;
    if (ratio < 0.5) {
      ctx.strokeStyle = '#2b4d1d';
      ctx.lineWidth = 2;
      var s = r * 0.18;
      for (i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.moveTo(ex[i] - s, ey - s);
        ctx.lineTo(ex[i] + s, ey + s);
        ctx.moveTo(ex[i] + s, ey - s);
        ctx.lineTo(ex[i] - s, ey + s);
        ctx.stroke();
      }
    } else {
      for (i = 0; i < 2; i++) {
        ctx.beginPath();
        ctx.arc(ex[i], ey, r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex[i] + r * 0.05, ey, r * 0.09, 0, Math.PI * 2);
        ctx.fillStyle = '#111111';
        ctx.fill();
      }
    }
  }

  /* 8. 새: 종류 색 원 + 부리 + 눈. angle 만큼 회전 */
  function drawBird(ctx, x, y, r, type, angle) {
    var bt = BIRD[type] || BIRD.red;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = bt.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = MAT.bird.stroke;
    ctx.stroke();

    /* 부리 (주황 삼각형) */
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.22);
    ctx.lineTo(r * 1.35, 0);
    ctx.lineTo(r * 0.55, r * 0.22);
    ctx.closePath();
    ctx.fillStyle = '#f39c12';
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#b8730c';
    ctx.stroke();

    /* 눈 */
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.35, r * 0.26, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.38, -r * 0.35, r * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = '#111111';
    ctx.fill();

    ctx.restore();
  }

  /* 9. 파티클 */
  function drawParticles(ctx, game) {
    var ps = game && game.particles;
    if (!ps || ps.length === 0) return;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var a = p.maxLife > 0 ? p.life / p.maxLife : 0;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  /* 10. 궤적 예측 (DRAG 중에만, 순수 포물선) */
  function drawTrajectory(ctx, game) {
    if (!game || game.shot !== 'DRAG' || !game.birdPos) return;
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

  /* §12.1 그리기 순서 */
  function draw(ctx, game) {
    var cam = (game && game.cam) ? game.cam : { x: 0 };

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    drawSky(ctx);
    drawHills(ctx, cam.x);

    ctx.save();
    ctx.translate(-cam.x, 0);

    drawGround(ctx);
    drawSling(ctx, game);

    if (game && game.world) {
      var bodies = game.world.bodies;
      var i, b;
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        if (b.kind === 'block' && !b.dead) drawBlock(ctx, b);
      }
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        if (b.kind === 'pig' && !b.dead) drawPig(ctx, b);
      }
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        if (b.kind === 'bird' && !b.dead) drawBird(ctx, b.x, b.y, b.r, b.birdType, b.angle);
      }
      /* 장전된 새(물리 밖)는 앵커/드래그 위치에 그린다 */
      if ((game.shot === 'ARMED' || game.shot === 'DRAG') && game.birdType && game.birdPos) {
        drawBird(ctx, game.birdPos.x, game.birdPos.y, (BIRD[game.birdType] || BIRD.red).r, game.birdType, 0);
      }
    }

    drawParticles(ctx, game);
    drawTrajectory(ctx, game);

    ctx.restore();
  }

  return { draw: draw };
})();
