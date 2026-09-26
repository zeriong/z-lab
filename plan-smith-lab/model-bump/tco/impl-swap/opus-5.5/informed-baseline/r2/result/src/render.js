/*
 * render.js — Canvas 2D 벡터 렌더링 (§12)
 * 노출: window.R = { draw(ctx, game) }
 * 참조: C, MAT, U (함수 본문 안에서만)
 *
 * R.draw 는 읽기 전용이다. game / world / body 의 어떤 필드도 쓰지 않는다.
 * 새의 색·반지름은 game.bird(game.js 가 BIRD 표에서 복사해 둔 값)에서 읽는다.
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;

  var sky = { ctx: null, grad: null };

  // 원경 언덕(패럴랙스 0.3배)
  var HILLS = [
    { x: 240, y: 650, r: 250 },
    { x: 780, y: 675, r: 330 },
    { x: 1340, y: 655, r: 290 }
  ];

  var POST_W = 12;           // 새총 기둥 폭
  var POST_GAP = 12;         // 앵커 중심에서 각 기둥 중심까지
  var POST_TOP = 500;        // 새총 기둥 y 범위 500 ~ 620
  var BAND_WIDTH = 6;

  // ---------------------------------------------------------------
  // 1) 하늘 (카메라 변환 밖)
  // ---------------------------------------------------------------
  function drawSky(ctx) {
    if (sky.ctx !== ctx || !sky.grad) {
      var g = ctx.createLinearGradient(0, 0, 0, C.VIEW_H);
      g.addColorStop(0, '#87ceeb');
      g.addColorStop(1, '#e6f4fb');
      sky.ctx = ctx;
      sky.grad = g;
    }
    ctx.fillStyle = sky.grad;
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  }

  // 2) 원경 언덕: 카메라 x 의 0.3배만 이동
  function drawHills(ctx, camX) {
    var off = -camX * 0.3;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var i = 0; i < HILLS.length; i++) {
      var h = HILLS[i];
      ctx.beginPath();
      ctx.arc(h.x + off, h.y, h.r, Math.PI, TAU);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 4) 지면: y 620~720, 상단 6px 진한 띠
  function drawGround(ctx) {
    var x0 = -60;
    var w = C.WORLD_W + 120;
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(x0, C.GROUND_Y, w, C.VIEW_H - C.GROUND_Y);
    ctx.fillStyle = '#4f8f3a';
    ctx.fillRect(x0, C.GROUND_Y, w, 6);
  }

  // 5) 새총: 기둥 2개 + DRAG 중 고무줄
  function drawSling(ctx, g) {
    var sx = C.SLING_X;
    var leftX = sx - POST_GAP;
    var rightX = sx + POST_GAP;
    var h = C.GROUND_Y - POST_TOP;

    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(leftX - POST_W / 2, POST_TOP, POST_W, h);
    ctx.fillRect(rightX - POST_W / 2, POST_TOP, POST_W, h);

    if (g && g.shot === 'DRAG' && g.bird && g.world) {
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = BAND_WIDTH;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(leftX, POST_TOP);
      ctx.lineTo(g.bird.x, g.bird.y);
      ctx.moveTo(rightX, POST_TOP);
      ctx.lineTo(g.bird.x, g.bird.y);
      ctx.stroke();
    }
  }

  // 6) 블록: 재질색 + 2px 테두리 + hp 비율 균열
  function drawBlock(ctx, b) {
    var m = MAT[b.mat] || MAT.wood;
    var x0 = b.x - b.hw;
    var y0 = b.y - b.hh;
    var w = b.hw * 2;
    var h = b.hh * 2;

    ctx.fillStyle = m.color;
    ctx.fillRect(x0, y0, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = m.stroke || '#000000';
    ctx.strokeRect(x0 + 1, y0 + 1, w - 2, h - 2);

    var ratio = (b.maxHp > 0 && b.maxHp !== Infinity) ? b.hp / b.maxHp : 1;
    if (ratio < 0.66) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 + 3, y0 + 3);
      ctx.lineTo(x0 + w - 3, y0 + h - 3);
      if (ratio < 0.33) {
        ctx.moveTo(x0 + w - 3, y0 + 3);
        ctx.lineTo(x0 + 3, y0 + h - 3);
      }
      ctx.stroke();
    }
  }

  // 7) 돼지: 몸통 + 눈 2개 + 코(가로 타원 + 콧구멍 2점). hp 낮으면 X 눈
  function drawPig(ctx, b) {
    var m = MAT.pig;
    var r = b.r;
    var x = b.x;
    var y = b.y;

    ctx.fillStyle = m.color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = m.stroke;
    ctx.stroke();

    var hurt = (b.maxHp > 0 && b.maxHp !== Infinity) ? (b.hp / b.maxHp < 0.5) : false;
    var eyeY = y - r * 0.28;
    var eyeDX = r * 0.4;
    var eyeR = r * 0.24;

    for (var s = -1; s <= 1; s += 2) {
      var ex = x + s * eyeDX;
      if (!hurt) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeR, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#1b1b1b';
        ctx.beginPath();
        ctx.arc(ex + s * r * 0.04, eyeY + r * 0.02, eyeR * 0.45, 0, TAU);
        ctx.fill();
      } else {
        var k = eyeR * 0.8;
        ctx.strokeStyle = '#1f3d12';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ex - k, eyeY - k);
        ctx.lineTo(ex + k, eyeY + k);
        ctx.moveTo(ex + k, eyeY - k);
        ctx.lineTo(ex - k, eyeY + k);
        ctx.stroke();
      }
    }

    // 코
    var noseY = y + r * 0.22;
    ctx.fillStyle = '#a6e07e';
    ctx.beginPath();
    ctx.ellipse(x, noseY, r * 0.38, r * 0.25, 0, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = m.stroke;
    ctx.stroke();
    ctx.fillStyle = '#2f5e1d';
    ctx.beginPath();
    ctx.arc(x - r * 0.14, noseY, r * 0.07, 0, TAU);
    ctx.arc(x + r * 0.14, noseY, r * 0.07, 0, TAU);
    ctx.fill();
  }

  // 8) 새: 종류 색 원 + 부리(주황 삼각형) + 눈, angle 만큼 회전
  function drawBird(ctx, g) {
    if (!g || !g.world || !g.bird || g.bird.gone) return;
    var bird = g.bird;
    var body = bird.body;
    var x = body ? body.x : bird.x;
    var y = body ? body.y : bird.y;
    var r = bird.r;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bird.angle || 0);

    // 몸통
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = MAT.bird.stroke;
    ctx.stroke();

    // 배(밝은 반원)
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(0, r * 0.25, r * 0.62, 0, Math.PI);
    ctx.fill();

    // 부리
    ctx.fillStyle = '#f59e1b';
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
    ctx.arc(r * 0.28, -r * 0.34, r * 0.27, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(r * 0.36, -r * 0.32, r * 0.12, 0, TAU);
    ctx.fill();

    // 눈썹
    ctx.strokeStyle = bird.type === 'black' ? '#8a8f96' : '#1a1a1a';
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.02, -r * 0.72);
    ctx.lineTo(r * 0.6, -r * 0.5);
    ctx.stroke();

    ctx.restore();
  }

  // 9) 파티클: alpha = life / maxLife
  function drawParticles(ctx, g) {
    if (!g || !g.particles || !g.particles.length) return;
    var ps = g.particles;
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      var a = p.maxLife > 0 ? U.clamp(p.life / p.maxLife, 0, 1) : 0;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  // 10) 궤적 예측(§9.4): DRAG 중에만, 충돌 무시 순수 포물선
  function drawTrajectory(ctx, g) {
    if (!g || g.state !== 'PLAYING' || g.shot !== 'DRAG' || !g.bird) return;
    var bx = g.bird.x;
    var by = g.bird.y;
    var vx = (C.SLING_X - bx) * C.LAUNCH_POWER;
    var vy = (C.SLING_Y - by) * C.LAUNCH_POWER;
    var sp = Math.sqrt(vx * vx + vy * vy);
    if (sp > C.MAX_LAUNCH_SPEED) {
      var k = C.MAX_LAUNCH_SPEED / sp;
      vx *= k;
      vy *= k;
    }

    ctx.fillStyle = '#ffffff';
    for (var i = 1; i <= C.TRAJ_POINTS; i++) {
      var t = i * C.TRAJ_STEP;
      var px = bx + vx * t;
      var py = by + vy * t + 0.5 * C.GRAVITY * t * t;
      if (py > C.GROUND_Y) break;
      ctx.globalAlpha = 0.85 * (1 - i / C.TRAJ_POINTS) + 0.1;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------
  // §12.1 그리기 순서 (뒤 -> 앞)
  // ---------------------------------------------------------------
  function draw(ctx, g) {
    var camX = (g && g.cam) ? g.cam.x : 0;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    drawSky(ctx);                 // 1
    drawHills(ctx, camX);         // 2

    ctx.save();
    ctx.translate(-camX, 0);      // 3

    drawGround(ctx);              // 4
    drawSling(ctx, g);            // 5

    if (g && g.world) {
      var bodies = g.world.bodies;
      var i, b;
      for (i = 0; i < bodies.length; i++) {       // 6
        b = bodies[i];
        if (b.kind === 'block' && !b.dead) drawBlock(ctx, b);
      }
      for (i = 0; i < bodies.length; i++) {       // 7
        b = bodies[i];
        if (b.kind === 'pig' && !b.dead) drawPig(ctx, b);
      }
    }

    drawBird(ctx, g);             // 8
    drawParticles(ctx, g);        // 9
    drawTrajectory(ctx, g);       // 10

    ctx.restore();                // 11
  }

  window.R = { draw: draw };
})();
