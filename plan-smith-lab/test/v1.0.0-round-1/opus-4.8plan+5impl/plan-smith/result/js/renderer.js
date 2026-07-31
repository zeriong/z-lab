/* renderer.js — Canvas 2D 렌더러 (물리 상태의 순수 함수적 투영).
 * 렌더러는 월드를 절대 변경하지 않는다(판정도 하지 않는다). hitFlash 카운터만 감쇠시킨다.
 */
(function (AB) {
  'use strict';

  var CFG = AB.CFG;
  var Renderer = { ctx: null, canvas: null, clouds: [] };

  Renderer.init = function (canvas) {
    Renderer.canvas = canvas;
    Renderer.ctx = canvas.getContext('2d');
    Renderer.clouds = [];
    for (var i = 0; i < 6; i++) {
      Renderer.clouds.push({
        x: Math.random() * CFG.WIDTH,
        y: 60 + Math.random() * 180,
        s: 0.6 + Math.random() * 0.9,
        v: 0.08 + Math.random() * 0.14
      });
    }
  };

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* ---------- 배경 ---------- */

  function drawSky(ctx, groundTop) {
    var g = ctx.createLinearGradient(0, 0, 0, groundTop);
    g.addColorStop(0, '#57b6ea');
    g.addColorStop(0.62, '#9ad8f2');
    g.addColorStop(1, '#dcf1f7');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CFG.WIDTH, groundTop);
  }

  function drawClouds(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    Renderer.clouds.forEach(function (c) {
      c.x += c.v;
      if (c.x > CFG.WIDTH + 160) c.x = -160;
      var s = c.s;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 26 * s, 0, Math.PI * 2);
      ctx.arc(c.x + 30 * s, c.y + 6 * s, 20 * s, 0, Math.PI * 2);
      ctx.arc(c.x - 30 * s, c.y + 8 * s, 18 * s, 0, Math.PI * 2);
      ctx.arc(c.x + 8 * s, c.y - 14 * s, 18 * s, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawHills(ctx, groundTop) {
    ctx.fillStyle = '#8ccf7a';
    ctx.beginPath();
    ctx.moveTo(0, groundTop);
    ctx.quadraticCurveTo(180, groundTop - 130, 380, groundTop - 30);
    ctx.quadraticCurveTo(520, groundTop - 100, 700, groundTop - 20);
    ctx.quadraticCurveTo(900, groundTop - 120, 1120, groundTop - 26);
    ctx.quadraticCurveTo(1220, groundTop - 70, CFG.WIDTH, groundTop - 10);
    ctx.lineTo(CFG.WIDTH, groundTop);
    ctx.closePath();
    ctx.fill();
  }

  function drawGround(ctx, groundTop) {
    ctx.fillStyle = '#6bbf59';
    ctx.fillRect(0, groundTop, CFG.WIDTH, 22);
    ctx.fillStyle = '#8a6239';
    ctx.fillRect(0, groundTop + 22, CFG.WIDTH, CFG.HEIGHT - groundTop - 22);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 2;
    for (var x = 0; x < CFG.WIDTH; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, groundTop + 40);
      ctx.lineTo(x + 24, groundTop + 40);
      ctx.stroke();
    }
  }

  /* ---------- 엔티티 ---------- */

  function drawBlock(ctx, body) {
    var mat = AB.MATERIALS[body.material] || AB.MATERIALS.wood;
    var w = body.gameW, h = body.gameH;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = mat.fill;
    ctx.strokeStyle = mat.stroke;
    ctx.lineWidth = 3;
    roundRect(ctx, -w / 2, -h / 2, w, h, 5);
    ctx.fill();
    ctx.stroke();

    // 손상도 표시 — 어두운 오버레이 + 균열선
    var dmg = 1 - Math.max(0, body.hp) / body.maxHp;
    if (dmg > 0.02) {
      ctx.fillStyle = 'rgba(20,10,0,' + (dmg * 0.42).toFixed(3) + ')';
      roundRect(ctx, -w / 2, -h / 2, w, h, 5);
      ctx.fill();
      ctx.strokeStyle = 'rgba(30,16,4,0.55)';
      ctx.lineWidth = 2;
      var cracks = Math.min(3, Math.ceil(dmg * 4));
      for (var i = 0; i < cracks; i++) {
        var ox = -w / 2 + (w * (i + 1)) / (cracks + 1);
        ctx.beginPath();
        ctx.moveTo(ox, -h / 2 + 3);
        ctx.lineTo(ox + 6, 0);
        ctx.lineTo(ox - 5, h / 2 - 3);
        ctx.stroke();
      }
    }
    if (body.hitFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (body.hitFlash / 18).toFixed(3) + ')';
      roundRect(ctx, -w / 2, -h / 2, w, h, 5);
      ctx.fill();
      body.hitFlash -= 1;
    }
    ctx.restore();
  }

  function drawPig(ctx, body) {
    var r = body.gameR;
    var hurt = 1 - Math.max(0, body.hp) / body.maxHp;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = hurt > 0.5 ? '#94c46f' : '#7fc45c';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#4d8235';
    ctx.stroke();

    // 귀
    ctx.fillStyle = '#6cb04c';
    ctx.beginPath();
    ctx.arc(-r * 0.62, -r * 0.66, r * 0.24, 0, Math.PI * 2);
    ctx.arc(r * 0.62, -r * 0.66, r * 0.24, 0, Math.PI * 2);
    ctx.fill();

    // 눈
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.2, r * 0.24, 0, Math.PI * 2);
    ctx.arc(r * 0.32, -r * 0.2, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20241f';
    ctx.beginPath();
    ctx.arc(-r * 0.28, -r * 0.18, r * 0.1, 0, Math.PI * 2);
    ctx.arc(r * 0.36, -r * 0.18, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    // 코
    ctx.fillStyle = '#61a344';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.28, r * 0.34, r * 0.24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3d6b2b';
    ctx.beginPath();
    ctx.arc(-r * 0.13, r * 0.28, r * 0.07, 0, Math.PI * 2);
    ctx.arc(r * 0.13, r * 0.28, r * 0.07, 0, Math.PI * 2);
    ctx.fill();

    if (hurt > 0.35) {   // 다친 표시
      ctx.strokeStyle = 'rgba(120,40,30,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, r * 0.72);
      ctx.lineTo(r * 0.2, r * 0.72);
      ctx.stroke();
    }
    if (body.hitFlash > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (body.hitFlash / 16).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      body.hitFlash -= 1;
    }
    ctx.restore();
  }

  function drawBird(ctx, x, y, angle) {
    var r = CFG.BIRD_RADIUS;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);

    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#e2402f';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#8f1e15';
    ctx.stroke();

    // 배
    ctx.beginPath();
    ctx.arc(0, r * 0.42, r * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = '#f6d8a8';
    ctx.fill();

    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.3, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.3, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // 부리
    ctx.fillStyle = '#f5b323';
    ctx.beginPath();
    ctx.moveTo(r * 0.75, -r * 0.05);
    ctx.lineTo(r * 1.5, r * 0.16);
    ctx.lineTo(r * 0.72, r * 0.36);
    ctx.closePath();
    ctx.fill();

    // 꼬리
    ctx.fillStyle = '#b62d20';
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.2);
    ctx.lineTo(-r * 1.45, -r * 0.5);
    ctx.lineTo(-r * 1.35, r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* ---------- 새총 / 프리뷰 ---------- */

  function drawSlingBase(ctx, session) {
    var a = session.anchor;
    var top = session.groundTop;
    ctx.strokeStyle = '#6b4526';
    ctx.lineCap = 'round';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.moveTo(a.x, top + 6);
    ctx.lineTo(a.x, a.y + 18);
    ctx.stroke();
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + 22);
    ctx.lineTo(a.x - 22, a.y - 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(a.x, a.y + 22);
    ctx.lineTo(a.x + 20, a.y - 8);
    ctx.stroke();
  }

  function drawBand(ctx, session, birdPos, front) {
    var a = session.anchor;
    var prong = front ? { x: a.x + 20, y: a.y - 8 } : { x: a.x - 22, y: a.y - 6 };
    ctx.strokeStyle = front ? '#3b2312' : '#2c1a0d';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(prong.x, prong.y);
    ctx.lineTo(birdPos.x, birdPos.y);
    ctx.stroke();
  }

  function drawPreview(ctx, session) {
    var pts = AB.Slingshot.previewPoints(session);
    ctx.save();
    for (var i = 0; i < pts.length; i++) {
      var t = i / Math.max(1, pts.length - 1);
      ctx.globalAlpha = 0.85 - t * 0.55;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 4 - t * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawTrail(ctx, pts, alpha) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (var i = 0; i < pts.length; i++) {
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPullGauge(ctx, session) {
    var ratio = AB.Slingshot.pullRatio(session);
    var x = 60, y = CFG.HEIGHT - 60, w = 200, h = 16;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = ratio > 0.85 ? '#ff6b5e' : '#ffd35c';
    roundRect(ctx, x + 2, y + 2, (w - 4) * ratio, h - 4, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('당김 ' + Math.round(ratio * 100) + '%', x, y - 8);
  }

  function drawPops(ctx, session) {
    if (!session.pops) return;
    session.pops.forEach(function (p) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 26));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
    });
    ctx.globalAlpha = 1;
  }

  function drawBirdQueue(ctx, session) {
    // 걸이 뒤에 대기 중인 새들
    var n = Math.max(0, session.birdsLeft - (session.bird ? 1 : 0));
    for (var i = 0; i < n; i++) {
      var x = session.anchor.x - 70 - i * 34;
      var y = session.groundTop - 14;
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.translate(x, y);
      ctx.scale(0.7, 0.7);
      drawBird(ctx, 0, 0, 0);
      ctx.restore();
    }
  }

  /* ---------- 메인 드로우 ---------- */

  Renderer.draw = function (session) {
    var ctx = Renderer.ctx;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CFG.WIDTH, CFG.HEIGHT);

    var groundTop = session ? session.groundTop : CFG.GROUND_TOP;

    drawSky(ctx, groundTop);
    drawClouds(ctx);
    drawHills(ctx, groundTop);

    if (!session || !session.engine) {
      drawGround(ctx, groundTop);
      return;
    }

    // 화면 흔들림(파괴 피드백)
    if (session.shakeTimer > 0) {
      var s = session.shakeTimer / 3;
      ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
    }

    drawGround(ctx, groundTop);
    drawBirdQueue(ctx, session);
    drawSlingBase(ctx, session);

    var birdPos = AB.Slingshot.birdPos(session);

    // 이전 샷 궤적(옅게) + 현재 궤적
    session.lastTrails.forEach(function (t) { drawTrail(ctx, t, 0.16); });
    drawTrail(ctx, session.trail, 0.5);

    if (session.bird && session.phase !== 'flight') {
      drawBand(ctx, session, birdPos, false);
    }

    session.blocks.forEach(function (b) { drawBlock(ctx, b); });
    session.pigs.forEach(function (p) { drawPig(ctx, p); });

    if (session.bird) {
      var angle = session.phase === 'flight' ? session.bird.angle
        : Math.atan2(-session.pull.y, -session.pull.x);
      drawBird(ctx, session.bird.position.x, session.bird.position.y, angle);
    }

    if (session.bird && session.phase !== 'flight') {
      drawBand(ctx, session, birdPos, true);
    }

    if (session.phase === 'drag') {
      drawPreview(ctx, session);
      drawPullGauge(ctx, session);
    }

    drawPops(ctx, session);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  };

  AB.Renderer = Renderer;
})(window.AB);
