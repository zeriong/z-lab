window.AB = window.AB || {};

// 캔버스 드로잉 전부 (계획서 §8.9). 에셋 없이 절차적으로 그린다.
// draw(game)가 읽는 필드: state, phase, world, world.entities, queue, currentBirdType,
// slingshot(dragging, birdPos, pull(), launchVelocity(), predict()), trail, effects.
AB.Renderer = (function () {
  'use strict';

  // ---- 표현 상수(게임 규칙과 무관한 그리기 값) ----
  const SKY_TOP = '#7ec8f7', SKY_BOTTOM = '#dff3ff';
  const GROUND_COLOR = '#6b4a2b', GRASS_COLOR = '#4caf50', GRASS_H = 12;
  const TERRAIN_FILL = '#8a6a48', TERRAIN_STROKE = '#4e3620';
  const CLOUDS = [
    { x: 240, y: 110, s: 1.0 },
    { x: 660, y: 70, s: 1.35 },
    { x: 1060, y: 140, s: 0.9 }
  ];
  const HILLS = [
    { x: 330, rx: 430, ry: 120, color: '#9ad36a' },
    { x: 1010, rx: 540, ry: 165, color: '#9ad36a' }
  ];
  const SLING = {
    forkHeight: 80, armSpread: 14, tipDrop: 2,
    wood: '#6b3e1e', band: '#3b2418',
    baseWidth: 10, armWidth: 8, bandWidth: 4
  };
  const PIG = { fill: '#6fcf4a', stroke: '#3e8e2a', snout: '#8ee06a' };
  const TRAIL_STYLE = { radius: 2.5, alpha: 0.45 };
  const PREDICT_STYLE = { radius: 3, alphaStart: 0.7, alphaEnd: 0.15 };
  const BLINK_MS = 120;

  // 결정적 의사 난수(균열·돌 무늬가 프레임마다 흔들리지 않게 body.id를 시드로 사용)
  function hash01(seed, i) {
    let h = (Math.imul(seed + 1, 374761393) + Math.imul(i + 1, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }

  function tracePolygon(ctx, verts) {
    ctx.beginPath();
    ctx.moveTo(verts[0].x, verts[0].y);
    for (let i = 1; i < verts.length; i++) ctx.lineTo(verts[i].x, verts[i].y);
    ctx.closePath();
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }

  // ---- 배경 ----
  function drawCloud(ctx, c) {
    const s = c.s;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    const parts = [
      [-34, 0, 22], [0, -12, 30], [36, 0, 24], [0, 8, 26]
    ];
    for (const p of parts) {
      circle(ctx, c.x + p[0] * s, c.y + p[1] * s, p[2] * s);
      ctx.fill();
    }
  }

  function drawBackground(ctx) {
    const C = AB.CONFIG;
    const g = ctx.createLinearGradient(0, 0, 0, C.GROUND_Y);
    g.addColorStop(0, SKY_TOP);
    g.addColorStop(1, SKY_BOTTOM);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, C.W, C.GROUND_Y);

    for (const c of CLOUDS) drawCloud(ctx, c);

    for (const h of HILLS) {
      ctx.fillStyle = h.color;
      ctx.beginPath();
      ctx.ellipse(h.x, C.GROUND_Y, h.rx, h.ry, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = GROUND_COLOR;
    ctx.fillRect(0, C.GROUND_Y, C.W, C.H - C.GROUND_Y);
    ctx.fillStyle = GRASS_COLOR;
    ctx.fillRect(0, C.GROUND_Y, C.W, GRASS_H);
  }

  // ---- 블록 ----
  function drawMaterialDetail(ctx, material, w, h, seed) {
    if (material === 'wood') {
      ctx.strokeStyle = 'rgba(90,50,15,0.35)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (w >= h) {
        for (const k of [-1, 1]) {
          const y = k * h / 6;
          ctx.moveTo(-w / 2 + 5, y);
          ctx.lineTo(w / 2 - 5, y);
        }
      } else {
        for (const k of [-1, 1]) {
          const x = k * w / 6;
          ctx.moveTo(x, -h / 2 + 5);
          ctx.lineTo(x, h / 2 - 5);
        }
      }
      ctx.stroke();
    } else if (material === 'ice') {
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      const m = Math.min(w, h);
      ctx.beginPath();
      ctx.moveTo(-w / 2 + m * 0.25, -h / 2 + m * 0.55);
      ctx.lineTo(-w / 2 + m * 0.55, -h / 2 + m * 0.25);
      ctx.moveTo(-w / 2 + m * 0.45, -h / 2 + m * 0.75);
      ctx.lineTo(-w / 2 + m * 0.75, -h / 2 + m * 0.45);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      for (let i = 0; i < 4; i++) {
        const x = (hash01(seed, 100 + i) - 0.5) * (w - 8);
        const y = (hash01(seed, 200 + i) - 0.5) * (h - 8);
        const r = 1.5 + hash01(seed, 300 + i) * 2;
        circle(ctx, x, y, r);
        ctx.fill();
      }
    }
  }

  // 균열은 항상 짧은 축을 가로지른다(판자는 두께 방향, 기둥은 폭 방향).
  function drawCracks(ctx, seed, w, h, count) {
    ctx.strokeStyle = 'rgba(40,20,10,0.75)';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    const horizontal = w >= h;              // 긴 축이 x
    const L = horizontal ? w : h;
    const S = horizontal ? h : w;
    const segs = 4;
    for (let c = 0; c < count; c++) {
      const base = c * 20;
      let a = (hash01(seed, base) - 0.5) * (L - 6);          // 긴 축 위치
      let s = hash01(seed, base + 1) < 0.5 ? -S / 2 : S / 2;  // 짧은 축: 한쪽 가장자리에서 시작
      const dir = s < 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(horizontal ? a : s, horizontal ? s : a);
      for (let k = 1; k <= segs; k++) {
        a += (hash01(seed, base + 2 + k) - 0.5) * (S * 0.9);
        s += dir * (S / segs) * (0.5 + hash01(seed, base + 8 + k) * 0.6);
        a = Math.max(-L / 2, Math.min(L / 2, a));
        s = Math.max(-S / 2, Math.min(S / 2, s));
        ctx.lineTo(horizontal ? a : s, horizontal ? s : a);
      }
      ctx.stroke();
    }
  }

  // ---- 돼지 ----
  function drawPig(ctx, e) {
    const b = e.body;
    const r = b.circleRadius || AB.CONFIG.PIGS[e.size].r;
    ctx.save();
    ctx.translate(b.position.x, b.position.y);
    ctx.rotate(b.angle);
    ctx.lineWidth = 2;
    ctx.strokeStyle = PIG.stroke;
    ctx.fillStyle = PIG.fill;

    // 귀
    for (const s of [-1, 1]) {
      circle(ctx, s * r * 0.55, -r * 0.75, r * 0.28);
      ctx.fill();
      ctx.stroke();
    }
    // 몸
    circle(ctx, 0, 0, r);
    ctx.fill();
    ctx.stroke();
    // 눈
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#ffffff';
      circle(ctx, s * r * 0.38, -r * 0.28, r * 0.2);
      ctx.fill();
      ctx.fillStyle = '#111111';
      circle(ctx, s * r * 0.38, -r * 0.28, r * 0.09);
      ctx.fill();
    }
    // 코
    ctx.fillStyle = PIG.snout;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.18, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = PIG.stroke;
    for (const s of [-1, 1]) {
      circle(ctx, s * r * 0.16, r * 0.18, r * 0.07);
      ctx.fill();
    }
    // 손상 표시: 멍 + 찌푸린 눈썹
    if (e.maxHp > 0 && e.hp / e.maxHp < 0.5) {
      ctx.fillStyle = 'rgba(200,40,40,0.55)';
      circle(ctx, r * 0.45, -r * 0.6, r * 0.2);
      ctx.fill();
      ctx.strokeStyle = '#2a5e1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.62);
      ctx.lineTo(-r * 0.15, -r * 0.48);
      ctx.moveTo(r * 0.6, -r * 0.62);
      ctx.lineTo(r * 0.15, -r * 0.48);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- 새 ----
  function drawBirdAt(ctx, x, y, type, dir, sparkOn) {
    const C = AB.CONFIG;
    const r = C.BIRD.radius;
    const t = C.BIRD_TYPES[type] || C.BIRD_TYPES.red;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';

    // 머리 장식(몸 뒤에)
    if (type === 'chuck') {
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(-6, -r + 4);
      ctx.lineTo(-15, -r - 9);
      ctx.lineTo(1, -r + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === 'bomb') {
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -r + 2);
      ctx.quadraticCurveTo(3, -r - 6, 8, -r - 9);
      ctx.stroke();
      if (sparkOn) {
        ctx.fillStyle = '#ffb020';
        circle(ctx, 8, -r - 9, 3.5);
        ctx.fill();
        ctx.fillStyle = '#fff3a0';
        circle(ctx, 8, -r - 9, 1.5);
        ctx.fill();
      }
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    } else {
      // red: 깃 2개
      ctx.fillStyle = t.color;
      ctx.beginPath();
      ctx.moveTo(-2, -r + 4);
      ctx.lineTo(-8, -r - 10);
      ctx.lineTo(2, -r + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(1, -r + 4);
      ctx.lineTo(4, -r - 12);
      ctx.lineTo(7, -r + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // 몸
    ctx.fillStyle = t.color;
    circle(ctx, 0, 0, r);
    ctx.fill();
    ctx.stroke();
    // 배
    ctx.fillStyle = 'rgba(255,240,220,0.45)';
    circle(ctx, 1, r * 0.4, r * 0.5);
    ctx.fill();

    // 눈(동공은 진행 방향)
    let ang = 0;
    if (dir && (dir.x !== 0 || dir.y !== 0)) ang = Math.atan2(dir.y, dir.x);
    const px = Math.cos(ang) * r * 0.08, py = Math.sin(ang) * r * 0.08;
    for (const ex of [-r * 0.32, r * 0.32]) {
      ctx.fillStyle = '#ffffff';
      circle(ctx, ex, -r * 0.22, r * 0.24);
      ctx.fill();
      ctx.fillStyle = '#111111';
      circle(ctx, ex + px, -r * 0.22 + py, r * 0.11);
      ctx.fill();
    }
    // 눈썹(화난 표정)
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.55, -r * 0.55);
    ctx.lineTo(-r * 0.1, -r * 0.4);
    ctx.moveTo(r * 0.55, -r * 0.55);
    ctx.lineTo(r * 0.1, -r * 0.4);
    ctx.stroke();
    // 부리
    ctx.fillStyle = '#f39c12';
    ctx.strokeStyle = '#b8720c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.35, -r * 0.05);
    ctx.lineTo(r * 1.05, r * 0.12);
    ctx.lineTo(r * 0.35, r * 0.32);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // ---- 새총 ----
  function slingGeometry() {
    const S = AB.CONFIG.SLING;
    return {
      x: S.x,
      baseY: S.baseY,
      forkY: S.baseY - SLING.forkHeight,                       // 560
      left: { x: S.x - SLING.armSpread, y: S.y + SLING.tipDrop },   // (166, 522)
      right: { x: S.x + SLING.armSpread, y: S.y + SLING.tipDrop }   // (194, 522)
    };
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.dpr = 0;
      this.now = 0;
      this.resizeBackingStore();
    }

    // backing store는 devicePixelRatio(최대 2) 배수, CSS 크기는 1280×720 고정
    resizeBackingStore() {
      const C = AB.CONFIG;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.round(C.W * dpr), h = Math.round(C.H * dpr);
      if (dpr === this.dpr && this.canvas.width === w && this.canvas.height === h) return;
      this.dpr = dpr;
      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = C.W + 'px';
      this.canvas.style.height = C.H + 'px';
    }

    draw(game) {
      const ctx = this.ctx;
      const C = AB.CONFIG;
      this.now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, C.W, C.H);
      drawBackground(ctx);

      const world = game ? game.world : null;
      const sling = game ? game.slingshot : null;

      if (world) this.drawTerrain(ctx, world);
      this.drawSlingBack(ctx, sling);
      if (world) {
        this.drawQueue(ctx, game.queue || []);
        this.drawBlocks(ctx, world);
        this.drawPigs(ctx, world);
        this.drawFlyingBirds(ctx, world);
        if (game.currentBirdType && sling) {
          const dir = sling.dragging ? sling.launchVelocity() : { x: 1, y: 0 };
          this.drawBird(ctx, sling.birdPos.x, sling.birdPos.y, game.currentBirdType, dir, false);
        }
      }
      this.drawSlingFront(ctx, sling);
      if (world) {
        this.drawTrail(ctx, game.trail || []);
        if (sling && sling.dragging && game.currentBirdType && sling.pull() >= C.SLING.minLaunchPull) {
          this.drawPredict(ctx, sling.predict(sling.birdPos, sling.launchVelocity()));
        }
        if (game.effects) game.effects.draw(ctx);
      }
    }

    drawTerrain(ctx, world) {
      for (const e of world.entities) {
        if (e.kind !== 'terrain' || !e.body || e.body.label === 'ground') continue;
        const b = e.body;
        tracePolygon(ctx, b.vertices);
        ctx.fillStyle = TERRAIN_FILL;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = TERRAIN_STROKE;
        ctx.stroke();
        if (e.w && e.h) {
          ctx.save();
          ctx.translate(b.position.x, b.position.y);
          ctx.rotate(b.angle);
          ctx.fillStyle = GRASS_COLOR;
          ctx.fillRect(-e.w / 2, -e.h / 2, e.w, Math.min(6, e.h));
          ctx.restore();
        }
      }
    }

    drawSlingBack(ctx, sling) {
      const g = slingGeometry();
      ctx.lineCap = 'round';
      ctx.strokeStyle = SLING.wood;
      ctx.lineWidth = SLING.baseWidth;
      ctx.beginPath();
      ctx.moveTo(g.x, g.baseY);
      ctx.lineTo(g.x, g.forkY);
      ctx.stroke();
      ctx.lineWidth = SLING.armWidth;
      ctx.beginPath();
      ctx.moveTo(g.x, g.forkY);
      ctx.lineTo(g.left.x, g.left.y);
      ctx.stroke();
      if (sling && sling.dragging) {
        ctx.strokeStyle = SLING.band;
        ctx.lineWidth = SLING.bandWidth;
        ctx.beginPath();
        ctx.moveTo(g.left.x, g.left.y);
        ctx.lineTo(sling.birdPos.x, sling.birdPos.y);
        ctx.stroke();
      }
    }

    drawSlingFront(ctx, sling) {
      const g = slingGeometry();
      ctx.lineCap = 'round';
      if (sling && sling.dragging) {
        ctx.strokeStyle = SLING.band;
        ctx.lineWidth = SLING.bandWidth;
        ctx.beginPath();
        ctx.moveTo(g.right.x, g.right.y);
        ctx.lineTo(sling.birdPos.x, sling.birdPos.y);
        ctx.stroke();
      }
      ctx.strokeStyle = SLING.wood;
      ctx.lineWidth = SLING.armWidth;
      ctx.beginPath();
      ctx.moveTo(g.x, g.forkY);
      ctx.lineTo(g.right.x, g.right.y);
      ctx.stroke();
    }

    drawQueue(ctx, queue) {
      const C = AB.CONFIG;
      const Q = C.QUEUE_DRAW;
      const y = C.GROUND_Y - C.BIRD.radius;
      const n = Math.min(queue.length, Q.max);
      for (let i = 0; i < n; i++) {
        this.drawBird(ctx, Q.x0 - i * Q.dx, y, queue[i], { x: 1, y: 0 }, false);
      }
      if (queue.length > Q.max) {
        const lx = Q.x0 - (n - 1) * Q.dx;
        const s = '+' + (queue.length - Q.max);
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeText(s, lx, y - C.BIRD.radius - 16);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(s, lx, y - C.BIRD.radius - 16);
      }
    }

    drawBlocks(ctx, world) {
      const C = AB.CONFIG;
      for (const e of world.entities) {
        if (e.kind !== 'block' || e.dead || !e.body) continue;
        const mat = C.MATERIALS[e.material];
        const body = e.body;

        tracePolygon(ctx, body.vertices);
        ctx.fillStyle = mat.fill;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = mat.stroke;
        ctx.stroke();

        const size = C.BLOCK_SIZES[e.shape];
        if (!size) continue;
        const w = size[0], h = size[1];
        ctx.save();
        ctx.translate(body.position.x, body.position.y);
        ctx.rotate(body.angle);
        ctx.beginPath();
        ctx.rect(-w / 2, -h / 2, w, h);
        ctx.clip();
        drawMaterialDetail(ctx, e.material, w, h, body.id);
        const ratio = e.maxHp > 0 ? e.hp / e.maxHp : 1;
        if (ratio < 0.33) {
          drawCracks(ctx, body.id, w, h, 3);
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(-w / 2, -h / 2, w, h);
        } else if (ratio < 0.66) {
          drawCracks(ctx, body.id, w, h, 1);
        }
        ctx.restore();
      }
    }

    drawPigs(ctx, world) {
      for (const e of world.entities) {
        if (e.kind !== 'pig' || e.dead || !e.body) continue;
        drawPig(ctx, e);
      }
    }

    drawFlyingBirds(ctx, world) {
      for (const e of world.entities) {
        if (e.kind !== 'bird' || e.dead || !e.body) continue;
        const v = e.body.velocity || { x: 0, y: 0 };
        const dir = (Math.abs(v.x) + Math.abs(v.y)) > 0.05 ? v : { x: 1, y: 0 };
        this.drawBird(ctx, e.body.position.x, e.body.position.y, e.birdType, dir, e.abilityUsed);
      }
    }

    // abilityUsed가 아니면 봄의 불꽃이 깜빡인다.
    drawBird(ctx, x, y, type, dir, abilityUsed) {
      const blink = Math.floor(this.now / BLINK_MS) % 2 === 0;
      drawBirdAt(ctx, x, y, type, dir, !abilityUsed && blink);
    }

    drawTrail(ctx, trail) {
      if (!trail.length) return;
      ctx.fillStyle = 'rgba(255,255,255,' + TRAIL_STYLE.alpha + ')';
      for (const p of trail) {
        circle(ctx, p.x, p.y, TRAIL_STYLE.radius);
        ctx.fill();
      }
    }

    drawPredict(ctx, pts) {
      const n = pts.length;
      if (!n) return;
      const span = PREDICT_STYLE.alphaStart - PREDICT_STYLE.alphaEnd;
      for (let i = 0; i < n; i++) {
        const a = PREDICT_STYLE.alphaStart - span * (i / Math.max(1, n - 1));
        ctx.fillStyle = 'rgba(255,255,255,' + a.toFixed(3) + ')';
        circle(ctx, pts[i].x, pts[i].y, PREDICT_STYLE.radius);
        ctx.fill();
      }
    }
  }

  return Renderer;
})();
