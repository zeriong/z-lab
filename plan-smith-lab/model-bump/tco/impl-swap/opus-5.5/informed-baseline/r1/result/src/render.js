/*
 * render.js — Canvas 2D 렌더링 (§12)
 * 노출: window.R = { draw(ctx, game) }
 * 참조 전역: C, MAT, U
 *
 * 규칙: R.draw 는 game 을 읽기만 한다. 어떤 필드도 쓰지 않는다.
 * HUD(스테이지/점수/남은 새)는 DOM 이므로 여기서 그리지 않는다(§12.2).
 */
(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var POST_GAP = 18;          // 새총 기둥 중심 = SLING_X ± 18
  var POST_W = 12;            // §12.1 기둥 폭
  var BAND_W = 6;             // §12.1 고무줄 두께
  var QUEUE_START = 60;       // 대기 새 첫 위치 = SLING_X - 60
  var QUEUE_GAP = 38;         // 대기 새 간격
  var PIG_HURT_RATIO = 0.5;   // 이 hp 비율 미만이면 돼지 눈을 X 로
  var CRACK_1 = 0.66;         // §12.1 균열 1개
  var CRACK_2 = 0.33;         // §12.1 균열 2개

  function circlePath(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
  }

  // 1) 하늘: 세로 그라디언트 (카메라 변환 밖)
  function drawSky(ctx) {
    var g = ctx.createLinearGradient(0, 0, 0, C.VIEW_H);
    g.addColorStop(0, '#87ceeb');
    g.addColorStop(1, '#e6f4fb');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  }

  // 2) 원경 언덕: 카메라 x 의 0.3 배만 이동하는 패럴랙스, 반투명 원호 3개
  function drawHills(ctx, camX) {
    var off = -camX * 0.3;
    var hills = [
      [200, 660, 260],
      [700, 690, 340],
      [1300, 670, 300]
    ];
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (var i = 0; i < hills.length; i++) {
      var h = hills[i];
      ctx.beginPath();
      ctx.arc(h[0] + off, h[1], h[2], Math.PI, TAU);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 4) 지면: y 620~720, 상단 6px 진한 띠
  function drawGround(ctx) {
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, C.VIEW_H - C.GROUND_Y);
    ctx.fillStyle = '#4f8f3a';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 6);
  }

  // 5) 새총: 갈색 기둥 2개 + (DRAG 중) 고무줄 2개
  function drawSling(ctx, game) {
    var sx = C.SLING_X;
    var top = C.SLING_Y;
    var h = C.GROUND_Y - C.SLING_Y;

    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(sx - POST_GAP - POST_W / 2, top, POST_W, h);
    ctx.fillRect(sx + POST_GAP - POST_W / 2, top, POST_W, h);

    var ab = game.armedBird;
    if (game.shot === 'DRAG' && ab) {
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = BAND_W;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx - POST_GAP, top + 4);
      ctx.lineTo(ab.x, ab.y);
      ctx.moveTo(sx + POST_GAP, top + 4);
      ctx.lineTo(ab.x, ab.y);
      ctx.stroke();
    }
  }

  // 6) 블록: 재질 색 + 2px 테두리 + hp 비율에 따른 균열 (회전 없음, angle = 0)
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

    var ratio = (isFinite(b.maxHp) && b.maxHp > 0) ? b.hp / b.maxHp : 1;
    if (ratio < CRACK_1) {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3);
      ctx.lineTo(x + w - 3, y + h - 3);
      if (ratio < CRACK_2) {
        ctx.moveTo(x + w - 3, y + 3);
        ctx.lineTo(x + 3, y + h - 3);
      }
      ctx.stroke();
    }
  }

  // 7) 돼지: 몸통 + 귀 + 눈(흰자/눈동자, 다치면 X) + 코(가로 타원 + 콧구멍 2점)
  function drawPig(ctx, b) {
    var m = MAT.pig;
    var x = b.x;
    var y = b.y;
    var r = b.r;

    ctx.lineWidth = 2;
    ctx.strokeStyle = m.stroke;
    ctx.fillStyle = m.color;

    // 귀 (몸통 뒤)
    circlePath(ctx, x - r * 0.55, y - r * 0.78, r * 0.26);
    ctx.fill();
    ctx.stroke();
    circlePath(ctx, x + r * 0.55, y - r * 0.78, r * 0.26);
    ctx.fill();
    ctx.stroke();

    // 몸통
    circlePath(ctx, x, y, r);
    ctx.fill();
    ctx.stroke();

    // 눈
    var ex = r * 0.4;
    var ey = y - r * 0.25;
    var hurt = isFinite(b.maxHp) && b.maxHp > 0 && (b.hp / b.maxHp) < PIG_HURT_RATIO;
    if (!hurt) {
      ctx.fillStyle = '#ffffff';
      circlePath(ctx, x - ex, ey, r * 0.22);
      ctx.fill();
      circlePath(ctx, x + ex, ey, r * 0.22);
      ctx.fill();
      ctx.fillStyle = '#1b1b1b';
      circlePath(ctx, x - ex + r * 0.04, ey, r * 0.1);
      ctx.fill();
      circlePath(ctx, x + ex + r * 0.04, ey, r * 0.1);
      ctx.fill();
    } else {
      var s = r * 0.15;
      ctx.strokeStyle = '#1f3a12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - ex - s, ey - s);
      ctx.lineTo(x - ex + s, ey + s);
      ctx.moveTo(x - ex + s, ey - s);
      ctx.lineTo(x - ex - s, ey + s);
      ctx.moveTo(x + ex - s, ey - s);
      ctx.lineTo(x + ex + s, ey + s);
      ctx.moveTo(x + ex + s, ey - s);
      ctx.lineTo(x + ex - s, ey + s);
      ctx.stroke();
    }

    // 코
    ctx.fillStyle = '#9be07a';
    ctx.strokeStyle = m.stroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.22, r * 0.4, r * 0.27, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2f5e1d';
    circlePath(ctx, x - r * 0.14, y + r * 0.22, r * 0.07);
    ctx.fill();
    circlePath(ctx, x + r * 0.14, y + r * 0.22, r * 0.07);
    ctx.fill();
  }

  // 8) 새: 종류 색 원 + 주황 부리 + 눈 (+ 눈썹), angle 만큼 회전
  function drawBird(ctx, x, y, r, color, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);

    circlePath(ctx, 0, 0, r);
    ctx.fillStyle = color || '#e2483c';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    // 부리 (진행 방향 +x)
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.22);
    ctx.lineTo(r * 1.25, r * 0.02);
    ctx.lineTo(r * 0.55, r * 0.3);
    ctx.closePath();
    ctx.fillStyle = '#f39c12';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 눈
    circlePath(ctx, r * 0.28, -r * 0.28, r * 0.26);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    circlePath(ctx, r * 0.36, -r * 0.26, r * 0.11);
    ctx.fillStyle = '#000000';
    ctx.fill();

    // 눈썹
    ctx.beginPath();
    ctx.moveTo(r * 0.02, -r * 0.64);
    ctx.lineTo(r * 0.6, -r * 0.44);
    ctx.lineWidth = Math.max(2, r * 0.14);
    ctx.strokeStyle = '#000000';
    ctx.stroke();

    ctx.restore();
  }

  // 새총 위의 새(ARMED/DRAG) + 새총 왼쪽 지면에 줄 선 대기 새
  function drawSlingBirds(ctx, game) {
    var birds = game.birds || [];
    var ab = game.armedBird;
    var start = (game.firedCount || 0) + (ab ? 1 : 0);
    var x = C.SLING_X - QUEUE_START;
    for (var i = start; i < birds.length; i++) {
      var bd = birds[i];
      drawBird(ctx, x, C.GROUND_Y - bd.r, bd.r, bd.color, 0);
      x -= QUEUE_GAP;
    }
    if (ab) drawBird(ctx, ab.x, ab.y, ab.r, ab.color, 0);
  }

  // 9) 파티클: alpha = life / maxLife
  function drawParticles(ctx, game) {
    var ps = game.particles || [];
    for (var i = 0; i < ps.length; i++) {
      var p = ps[i];
      ctx.globalAlpha = U.clamp(p.life / p.maxLife, 0, 1);
      ctx.fillStyle = p.color;
      circlePath(ctx, p.x, p.y, p.size);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // 10) 궤적 예측 (§9.4): DRAG 일 때만, 충돌 무시 순수 포물선
  function drawTrajectory(ctx, game) {
    var ab = game.armedBird;
    if (game.shot !== 'DRAG' || !ab) return;
    var v0x = game.launchVx;
    var v0y = game.launchVy;
    var n = C.TRAJ_POINTS;
    ctx.fillStyle = '#ffffff';
    for (var k = 1; k <= n; k++) {
      var t = k * C.TRAJ_STEP;
      var px = ab.x + v0x * t;
      var py = ab.y + v0y * t + 0.5 * C.GRAVITY * t * t;
      if (py > C.GROUND_Y) break;
      ctx.globalAlpha = 0.85 * (1 - k / n) + 0.1;
      circlePath(ctx, px, py, 3);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function draw(ctx, game) {
    if (!ctx || !game) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;

    var camX = game.cam ? game.cam.x : 0;

    drawSky(ctx);                 // 1
    drawHills(ctx, camX);         // 2

    ctx.save();
    ctx.translate(-camX, 0);      // 3

    drawGround(ctx);              // 4
    drawSling(ctx, game);         // 5

    var world = game.world;
    var bodies = world ? world.bodies : [];
    var i, b;

    for (i = 0; i < bodies.length; i++) {       // 6
      b = bodies[i];
      if (b.kind === 'block' && !b.dead) drawBlock(ctx, b);
    }
    for (i = 0; i < bodies.length; i++) {       // 7
      b = bodies[i];
      if (b.kind === 'pig' && !b.dead) drawPig(ctx, b);
    }
    for (i = 0; i < bodies.length; i++) {       // 8 (비행 중/착지한 새)
      b = bodies[i];
      if (b.kind === 'bird' && !b.dead) drawBird(ctx, b.x, b.y, b.r, b.color, b.angle);
    }
    drawSlingBirds(ctx, game);                  // 8 (새총 위 + 대기)

    drawParticles(ctx, game);                   // 9
    drawTrajectory(ctx, game);                  // 10

    ctx.restore();                              // 11
  }

  window.R = { draw: draw };
})();
