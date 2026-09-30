// renderer.js — Canvas 2D 그리기 (plan §11)
// 회전한 바디 규칙: 화면 중심으로 translate → rotate(−angle) → 로컬 (lx, ly)[m]는 (lx·PPM, −ly·PPM)[px]
(function () {
  'use strict';
  const AB = (window.AB = window.AB || {});

  let canvas = null;
  let ctx = null;

  function init(c) {
    canvas = c;
    ctx = c.getContext('2d');
  }

  function w2s(x, y) {
    return AB.Coord.worldToScreen(x, y);
  }

  function font(px, bold) {
    return (bold ? 'bold ' : '') + px + 'px ' + AB.CONFIG.FONT_FAMILY;
  }

  function circlePath(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
  }

  // ------------------------------------------------------------------
  // 배경 (§11.1 1~4)
  // ------------------------------------------------------------------
  function drawBackground(t) {
    const C = AB.CONFIG;
    const COL = AB.COLORS;
    const W = C.VIEW_W;
    const H = C.VIEW_H;
    const GY = C.GROUND_SCREEN_Y;

    const sky = ctx.createLinearGradient(0, 0, 0, GY);
    sky.addColorStop(0, COL.SKY_TOP);
    sky.addColorStop(1, COL.SKY_BOTTOM);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 구름: 퍼프들을 한 경로로 묶어 한 번에 채운다 (겹친 부분이 진해지지 않도록)
    const pad = C.FX.CLOUD_WRAP_PAD;
    const span = W + pad * 2;
    ctx.fillStyle = COL.CLOUD;
    for (let i = 0; i < C.CLOUDS.length; i++) {
      const cl = C.CLOUDS[i];
      const raw = (cl.x + t * C.FX.CLOUD_SPEED) % span;
      const x = ((raw + span) % span) - pad;
      ctx.beginPath();
      for (let k = 0; k < C.CLOUD_PUFFS.length; k++) {
        const p = C.CLOUD_PUFFS[k];
        const cx = x + p.dx * cl.s;
        const cy = cl.y + p.dy * cl.s;
        const r = p.r * cl.s;
        ctx.moveTo(cx + r, cy);
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // 원경 언덕
    ctx.fillStyle = COL.HILL;
    for (let i = 0; i < C.HILLS.length; i++) {
      const h = C.HILLS[i];
      ctx.beginPath();
      ctx.arc(h.x, GY, h.r, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }

    // 지면
    ctx.fillStyle = COL.DIRT;
    ctx.fillRect(0, GY, W, H - GY);
    ctx.fillStyle = COL.GRASS;
    ctx.fillRect(0, GY, W, C.GRASS_PX);
  }

  // ------------------------------------------------------------------
  // 새총 (§11.2)
  // ------------------------------------------------------------------
  function bandPoint(tip) {
    const S = AB.CONFIG.SLING;
    const t = (S.BAND_Y - S.FORK.y) / (tip.y - S.FORK.y);
    return { x: S.FORK.x + (tip.x - S.FORK.x) * t, y: S.BAND_Y };
  }

  function woodLine(a, b) {
    const S = AB.CONFIG.SLING;
    const p = w2s(a.x, a.y);
    const q = w2s(b.x, b.y);
    ctx.strokeStyle = AB.COLORS.SLING_WOOD;
    ctx.lineWidth = S.WOOD_WIDTH;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }

  function bandLine(a, b) {
    const S = AB.CONFIG.SLING;
    const p = w2s(a.x, a.y);
    const q = w2s(b.x, b.y);
    ctx.strokeStyle = AB.COLORS.SLING_BAND;
    ctx.lineWidth = S.BAND_WIDTH;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }

  function drawSlingBack(birdPos) {
    const S = AB.CONFIG.SLING;
    woodLine(S.BASE, S.FORK);
    woodLine(S.FORK, S.BACK_TIP);
    if (birdPos) bandLine(bandPoint(S.BACK_TIP), birdPos);
    else bandLine(bandPoint(S.BACK_TIP), bandPoint(S.FRONT_TIP));
  }

  function drawSlingFront(birdPos) {
    const S = AB.CONFIG.SLING;
    if (birdPos) bandLine(bandPoint(S.FRONT_TIP), birdPos);
    woodLine(S.FORK, S.FRONT_TIP);
  }

  // ------------------------------------------------------------------
  // 블록·바위 (§11.2)
  // ------------------------------------------------------------------
  function drawRock(b) {
    const C = AB.CONFIG;
    const COL = AB.COLORS;
    const s = w2s(b.pos.x, b.pos.y);
    const W = b.hw * C.PPM;
    const H = b.hh * C.PPM;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(-b.angle);
    ctx.fillStyle = COL.ROCK_FILL;
    ctx.fillRect(-W, -H, W * 2, H * 2);
    ctx.fillStyle = COL.GRASS;
    ctx.fillRect(-W, -H, W * 2, C.ROCK_GRASS_PX);
    ctx.strokeStyle = COL.ROCK_STROKE;
    ctx.lineWidth = C.FX.BLOCK_LINE;
    ctx.strokeRect(-W, -H, W * 2, H * 2);
    ctx.restore();
  }

  function drawCracks(b, W, H) {
    const FX = AB.CONFIG.FX;
    const ratio = b.maxHp > 0 ? b.hp / b.maxHp : 1;
    const count = ratio < FX.CRACK_2 ? 2 : ratio < FX.CRACK_1 ? 1 : 0;
    if (count === 0) return;
    const rnd = AB.makeRng(b.id * 7919 + 17);
    ctx.strokeStyle = AB.COLORS.CRACK;
    ctx.lineWidth = FX.CRACK_LINE;
    ctx.lineJoin = 'round';
    for (let k = 0; k < count; k++) {
      // 가장자리의 한 점에서 시작해 안쪽으로 꺾이며 들어가는 균열
      let x;
      let y;
      if (rnd() < 0.5) {
        x = (rnd() * 2 - 1) * W;
        y = rnd() < 0.5 ? -H : H;
      } else {
        x = rnd() < 0.5 ? -W : W;
        y = (rnd() * 2 - 1) * H;
      }
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let s = 0; s < 3; s++) {
        x = AB.clamp(x * 0.45 + (rnd() * 2 - 1) * W * 0.4, -W, W);
        y = AB.clamp(y * 0.45 + (rnd() * 2 - 1) * H * 0.4, -H, H);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }

  function drawBlock(b) {
    const C = AB.CONFIG;
    const COL = AB.COLORS;
    const mat = AB.MATERIALS[b.material];
    if (!mat) return;
    const s = w2s(b.pos.x, b.pos.y);
    const W = b.hw * C.PPM;
    const H = b.hh * C.PPM;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(-b.angle);

    ctx.fillStyle = mat.fill;
    ctx.fillRect(-W, -H, W * 2, H * 2);

    if (b.material === 'wood') {
      // 결 2개: 긴 방향을 따라
      ctx.strokeStyle = COL.WOOD_GRAIN;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      if (W >= H) {
        ctx.moveTo(-W + 3, -H / 3);
        ctx.lineTo(W - 3, -H / 3);
        ctx.moveTo(-W + 3, H / 3);
        ctx.lineTo(W - 3, H / 3);
      } else {
        ctx.moveTo(-W / 3, -H + 3);
        ctx.lineTo(-W / 3, H - 3);
        ctx.moveTo(W / 3, -H + 3);
        ctx.lineTo(W / 3, H - 3);
      }
      ctx.stroke();
    } else if (b.material === 'stone') {
      const rnd = AB.makeRng(b.id * 104729 + 3);
      const dotR = Math.max(1.5, Math.min(W, H) * 0.14);
      ctx.fillStyle = COL.STONE_DOT;
      for (let k = 0; k < 3; k++) {
        circlePath((rnd() * 2 - 1) * W * 0.65, (rnd() * 2 - 1) * H * 0.65, dotR);
        ctx.fill();
      }
    } else if (b.material === 'glass') {
      ctx.strokeStyle = COL.GLASS_SHINE;
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-W * 0.6, -H * 0.1);
      ctx.lineTo(-W * 0.1, -H * 0.6);
      ctx.stroke();
    } else if (b.material === 'tnt') {
      const px = Math.max(8, Math.floor(Math.min(W, H) * 0.8));
      ctx.fillStyle = COL.TNT_TEXT;
      ctx.font = font(px, true);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TNT', 0, 0);
    }

    drawCracks(b, W, H);

    ctx.strokeStyle = mat.stroke;
    ctx.lineWidth = C.FX.BLOCK_LINE;
    ctx.strokeRect(-W, -H, W * 2, H * 2);
    ctx.restore();
  }

  // ------------------------------------------------------------------
  // 돼지 (§11.2) — 로컬 위쪽 요소는 음수 px y
  // ------------------------------------------------------------------
  function drawPig(b) {
    const C = AB.CONFIG;
    const COL = AB.COLORS;
    const s = w2s(b.pos.x, b.pos.y);
    const R = b.r * C.PPM;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(-b.angle);
    ctx.lineWidth = 2;

    // 귀 (로컬 위쪽)
    ctx.fillStyle = COL.PIG_FILL;
    ctx.strokeStyle = COL.PIG_STROKE;
    for (let k = -1; k <= 1; k += 2) {
      circlePath(k * 0.55 * R, -0.78 * R, 0.28 * R);
      ctx.fill();
      ctx.stroke();
    }

    // 몸통
    circlePath(0, 0, R);
    ctx.fillStyle = COL.PIG_FILL;
    ctx.fill();
    ctx.strokeStyle = COL.PIG_STROKE;
    ctx.stroke();

    // 멍 자국
    if (b.maxHp > 0 && b.hp / b.maxHp < C.FX.PIG_BRUISE) {
      ctx.fillStyle = COL.PIG_BRUISE;
      circlePath(-0.45 * R, 0.4 * R, 0.22 * R);
      ctx.fill();
      circlePath(0.5 * R, -0.5 * R, 0.14 * R);
      ctx.fill();
    }

    // 주둥이: 로컬 (0, −0.1r) → px (0, +0.1R)
    ctx.beginPath();
    ctx.ellipse(0, 0.1 * R, 0.36 * R, 0.26 * R, 0, 0, Math.PI * 2);
    ctx.fillStyle = COL.PIG_SNOUT;
    ctx.fill();
    ctx.strokeStyle = COL.PIG_STROKE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = COL.PIG_NOSTRIL;
    for (let k = -1; k <= 1; k += 2) {
      ctx.beginPath();
      ctx.ellipse(k * 0.13 * R, 0.1 * R, 0.06 * R, 0.1 * R, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 눈: 로컬 (±0.35r, +0.25r) → px (±0.35R, −0.25R)
    for (let k = -1; k <= 1; k += 2) {
      circlePath(k * 0.35 * R, -0.25 * R, 0.19 * R);
      ctx.fillStyle = COL.EYE_WHITE;
      ctx.fill();
      ctx.strokeStyle = COL.PIG_STROKE;
      ctx.lineWidth = 1;
      ctx.stroke();
      circlePath(k * 0.35 * R + k * 0.04 * R, -0.25 * R, 0.08 * R);
      ctx.fillStyle = COL.PUPIL;
      ctx.fill();
    }

    // 왕관 (로컬 위쪽)
    if (b.king) {
      const top = -1.55 * R;
      const base = -0.85 * R;
      const hw = 0.5 * R;
      ctx.beginPath();
      ctx.moveTo(-hw, base);
      ctx.lineTo(-hw, top + 0.2 * R);
      ctx.lineTo(-hw * 0.5, base - 0.3 * R);
      ctx.lineTo(0, top);
      ctx.lineTo(hw * 0.5, base - 0.3 * R);
      ctx.lineTo(hw, top + 0.2 * R);
      ctx.lineTo(hw, base);
      ctx.closePath();
      ctx.fillStyle = COL.CROWN;
      ctx.fill();
      ctx.strokeStyle = COL.CROWN_STROKE;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------
  // 새 (§11.2) — 진행 방향 = 로컬 +x
  // ------------------------------------------------------------------
  function birdBodyPath(type, R) {
    ctx.beginPath();
    if (type === 'yellow') {
      // 반지름 R 삼각형, 꼭짓점이 로컬 +x
      for (let k = 0; k < 3; k++) {
        const a = (k * Math.PI * 2) / 3;
        const x = Math.cos(a) * R;
        const y = -Math.sin(a) * R;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else {
      ctx.arc(0, 0, R, 0, Math.PI * 2);
    }
  }

  function drawBird(type, x, y, angle, fuseLit, t) {
    const C = AB.CONFIG;
    const COL = AB.COLORS;
    const bt = AB.BIRD_TYPES[type];
    if (!bt) return;
    const s = w2s(x, y);
    const R = bt.r * C.PPM;
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(-angle);

    // 폭탄 새 심지 (머리 위)
    if (type === 'black') {
      ctx.strokeStyle = COL.FUSE;
      ctx.lineWidth = Math.max(2, 0.12 * R);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -0.9 * R);
      ctx.quadraticCurveTo(0.05 * R, -1.25 * R, 0.25 * R, -1.35 * R);
      ctx.stroke();
      let tip = COL.FUSE_IDLE;
      if (fuseLit) tip = Math.floor(t * C.FX.FUSE_BLINK_HZ) % 2 === 0 ? COL.FUSE_ON_A : COL.FUSE_ON_B;
      circlePath(0.25 * R, -1.38 * R, Math.max(2.5, 0.14 * R));
      ctx.fillStyle = tip;
      ctx.fill();
    }

    // 몸통
    birdBodyPath(type, R);
    ctx.fillStyle = bt.color;
    ctx.fill();

    // 흰 배 (몸통 안으로 클립)
    ctx.save();
    birdBodyPath(type, R);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(-0.1 * R, 0.5 * R, 0.6 * R, 0.38 * R, 0, 0, Math.PI * 2);
    ctx.fillStyle = COL.BIRD_BELLY;
    ctx.fill();
    ctx.restore();

    birdBodyPath(type, R);
    ctx.strokeStyle = COL.BIRD_STROKE;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 눈 (로컬 위쪽 → 음수 px y)
    const eyeY = -0.22 * R;
    const eyeR = Math.max(2, 0.2 * R);
    const eyes = [0.08 * R, 0.46 * R];
    for (let k = 0; k < eyes.length; k++) {
      circlePath(eyes[k], eyeY, eyeR);
      ctx.fillStyle = COL.EYE_WHITE;
      ctx.fill();
      circlePath(eyes[k] + 0.07 * R, eyeY + 0.02 * R, eyeR * 0.45);
      ctx.fillStyle = COL.PUPIL;
      ctx.fill();
    }

    // 두꺼운 눈썹 (안쪽이 내려간 화난 표정)
    ctx.strokeStyle = COL.BROW;
    ctx.lineWidth = Math.max(2.5, 0.16 * R);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.14 * R, eyeY - 0.36 * R);
    ctx.lineTo(0.24 * R, eyeY - 0.18 * R);
    ctx.moveTo(0.32 * R, eyeY - 0.18 * R);
    ctx.lineTo(0.7 * R, eyeY - 0.34 * R);
    ctx.stroke();

    // 부리 (로컬 +x)
    ctx.beginPath();
    ctx.moveTo(0.5 * R, 0.0 * R);
    ctx.lineTo(1.05 * R, 0.14 * R);
    ctx.lineTo(0.5 * R, 0.32 * R);
    ctx.closePath();
    ctx.fillStyle = COL.BIRD_BEAK;
    ctx.fill();
    ctx.strokeStyle = COL.BIRD_STROKE;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  // ------------------------------------------------------------------
  // 궤적·예측·파티클·팝업
  // ------------------------------------------------------------------
  function drawTrail(level) {
    const FX = AB.CONFIG.FX;
    if (!level.trail.length) return;
    ctx.save();
    ctx.globalAlpha = FX.TRAIL_ALPHA;
    ctx.fillStyle = AB.COLORS.TRAIL;
    for (let i = 0; i < level.trail.length; i++) {
      const p = level.trail[i];
      const s = w2s(p.x, p.y);
      circlePath(s.x, s.y, FX.TRAIL_DOT_R);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPreview(level) {
    const FX = AB.CONFIG.FX;
    const pts = level.getPreviewPoints();
    if (!pts.length) return;
    ctx.save();
    ctx.fillStyle = AB.COLORS.PREVIEW;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const f = n > 1 ? i / (n - 1) : 0;
      const r = FX.PREVIEW_R_FRONT + (FX.PREVIEW_R_BACK - FX.PREVIEW_R_FRONT) * f;
      ctx.globalAlpha = FX.PREVIEW_A_FRONT + (FX.PREVIEW_A_BACK - FX.PREVIEW_A_FRONT) * f;
      const s = w2s(pts[i].x, pts[i].y);
      circlePath(s.x, s.y, r);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles(level) {
    const C = AB.CONFIG;
    const FX = C.FX;
    for (let i = 0; i < level.particles.length; i++) {
      const p = level.particles[i];
      const a = AB.clamp(p.life / p.maxLife, 0, 1);
      const s = w2s(p.x, p.y);
      ctx.save();
      if (p.type === 'debris') {
        ctx.globalAlpha = a;
        ctx.translate(s.x, s.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        if (p.edge) {
          ctx.strokeStyle = p.edge;
          ctx.lineWidth = 1;
          ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
        }
      } else if (p.type === 'smoke') {
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = p.color;
        circlePath(s.x, s.y, p.r * C.PPM);
        ctx.fill();
      } else if (p.type === 'ring') {
        const prog = 1 - a;
        ctx.globalAlpha = a;
        ctx.strokeStyle = AB.COLORS.RING;
        ctx.lineWidth = FX.RING_WIDTH;
        circlePath(s.x, s.y, p.R * C.PPM * prog);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  function drawPopups(level) {
    const FX = AB.CONFIG.FX;
    const COL = AB.COLORS;
    ctx.save();
    ctx.font = font(FX.POPUP_FONT_PX, true);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 4;
    for (let i = 0; i < level.popups.length; i++) {
      const p = level.popups[i];
      const a = AB.clamp(p.life / p.maxLife, 0, 1);
      const s = w2s(p.x, p.y);
      const y = s.y - FX.POPUP_RISE * (1 - a);
      ctx.globalAlpha = a;
      ctx.strokeStyle = COL.POPUP_STROKE;
      ctx.strokeText(p.text, s.x, y);
      ctx.fillStyle = COL.POPUP_FILL;
      ctx.fillText(p.text, s.x, y);
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------
  // 레벨 전체 (§11.1 5~8)
  // ------------------------------------------------------------------
  function drawLevel(level) {
    const C = AB.CONFIG;
    const bodies = level.world.bodies;

    for (let i = 0; i < bodies.length; i++) {
      if (bodies[i].kind === 'rock') drawRock(bodies[i]);
    }

    // 새총 + 슬링 위의 새
    const slingPos = level.getSlingBirdPos();
    drawSlingBack(slingPos);
    if (slingPos && level.slingBird) {
      drawBird(level.slingBird, slingPos.x, slingPos.y, level.getSlingBirdAngle(), false, level.time);
    }
    drawSlingFront(slingPos);

    // 대기 중인 새
    for (let i = 0; i < level.birdQueue.length; i++) {
      const type = level.birdQueue[i];
      const bt = AB.BIRD_TYPES[type];
      if (!bt) continue;
      drawBird(type, C.QUEUE_BIRD_X0 - i * C.QUEUE_BIRD_DX, bt.r, 0, false, level.time);
    }

    // 블록, 돼지, 활성 새
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (b.kind === 'block' || b.kind === 'tnt') drawBlock(b);
    }
    for (let i = 0; i < bodies.length; i++) {
      if (bodies[i].kind === 'pig') drawPig(bodies[i]);
    }
    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (b.kind === 'bird') drawBird(b.birdType, b.pos.x, b.pos.y, b.angle, b.fuse > 0, level.time);
    }

    drawTrail(level);
    drawPreview(level);
    drawParticles(level);
    drawPopups(level);
  }

  function render(game) {
    if (!ctx || !canvas) return;
    const C = AB.CONFIG;
    const k = canvas.width / C.VIEW_W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.globalAlpha = 1;

    drawBackground(game.time);

    const inGame = game.level && game.state !== 'MAIN' && game.state !== 'SELECT';
    if (inGame) {
      drawLevel(game.level);
    } else {
      // 장식용 새총
      drawSlingBack(null);
      drawSlingFront(null);
    }
  }

  AB.Renderer = { init: init, render: render };
})();
