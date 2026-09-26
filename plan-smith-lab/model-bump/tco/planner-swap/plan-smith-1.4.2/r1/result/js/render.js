function render() {
  const ctx = G.ctx;
  ctx.save();

  if (G.shake > 0) {
    ctx.translate((Math.random() - 0.5) * 2 * G.shake, (Math.random() - 0.5) * 2 * G.shake);
  }

  drawBackground(ctx);
  drawSlingshot(ctx, 'back');

  if (G.engine) {
    Composite.allBodies(G.engine.world).forEach(body => drawBody(ctx, body));
  }

  drawQueue(ctx);

  if ((G.screen === 'playing' || G.screen === 'paused') && G.phase === 'aiming' && G.birdType) {
    drawBird(ctx, G.birdType, G.aim.x, G.aim.y, BIRDS[G.birdType].r, 0);
  }

  drawSlingshot(ctx, 'front');
  if (G.dragging) {
    drawTrajectory(ctx);
  }

  drawEffects(ctx);
  ctx.restore();
}

function drawBackground(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#7ec8f0');
  grad.addColorStop(1, '#d6f0ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const cloudX = (performance.now() * 0.01) % (W + 400) - 200;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  [0, 150, 300].forEach((offset, i) => {
    const x = cloudX + offset;
    ctx.beginPath();
    ctx.ellipse(x, 80, 60, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 40, 60, 50, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x - 40, 100, 50, 30, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#8fd16a';
  ctx.beginPath();
  ctx.ellipse(400, 650, 350, 100, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7cc255';
  ctx.beginPath();
  ctx.ellipse(900, 680, 300, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  ctx.fillStyle = '#5fbf4a';
  ctx.fillRect(0, GROUND_Y - 10, W, 10);
}

function drawSlingshot(ctx, layer) {
  ctx.strokeStyle = '#6b3e1f';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';

  if (layer === 'back') {
    ctx.beginPath();
    ctx.moveTo(SLING_X, GROUND_Y);
    ctx.lineTo(SLING_X, SLING_Y + 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(SLING_X, SLING_Y + 40);
    ctx.lineTo(SLING_X - 14, SLING_Y - 10);
    ctx.stroke();

    ctx.strokeStyle = '#3b1f0e';
    ctx.lineWidth = 5;
    const aim = G.aim;
    ctx.beginPath();
    ctx.moveTo(SLING_X - 14, SLING_Y - 10);
    ctx.lineTo(aim.x, aim.y);
    ctx.stroke();
  } else if (layer === 'front') {
    ctx.strokeStyle = '#3b1f0e';
    ctx.lineWidth = 5;
    const aim = G.aim;
    ctx.beginPath();
    ctx.moveTo(SLING_X + 14, SLING_Y - 10);
    ctx.lineTo(aim.x, aim.y);
    ctx.stroke();

    ctx.strokeStyle = '#6b3e1f';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(SLING_X, SLING_Y + 40);
    ctx.lineTo(SLING_X + 14, SLING_Y - 10);
    ctx.stroke();
  }
}

function drawBody(ctx, body) {
  const ab = body.ab;
  if (!ab) return;

  if (ab.kind === 'ground') return;

  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  if (ab.kind === 'static') {
    ctx.fillStyle = '#6d7178';
    ctx.strokeStyle = '#4a4d52';
    ctx.lineWidth = 2;
    ctx.fillRect(-ab.w / 2, -ab.h / 2, ab.w, ab.h);
    ctx.strokeRect(-ab.w / 2, -ab.h / 2, ab.w, ab.h);
  } else if (ab.kind === 'block') {
    drawBlock(ctx, body);
  } else if (ab.kind === 'pig') {
    drawPig(ctx, body);
  } else if (ab.kind === 'bird') {
    drawBird(ctx, ab.type, 0, 0, BIRDS[ab.type].r, body.angle);
  }

  ctx.restore();
}

function drawBlock(ctx, body) {
  const ab = body.ab;
  const mat = MATERIALS[ab.m];
  const w = ab.w;
  const h = ab.h;

  if (ab.m === 'glass') {
    ctx.globalAlpha = 0.75;
  }

  ctx.fillStyle = mat.color;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.globalAlpha = 1;
  ctx.strokeStyle = mat.stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  const hpRatio = ab.hp / ab.maxHp;
  if (hpRatio < 0.6) {
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -h / 4);
    ctx.lineTo(w / 2 - 2, h / 4);
    ctx.stroke();
  }
  if (hpRatio < 0.3) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, h / 4);
    ctx.lineTo(w / 2 - 2, -h / 4);
    ctx.stroke();
  }
}

function drawPig(ctx, body) {
  const ab = body.ab;
  const r = ab.r;

  ctx.fillStyle = '#7ed957';
  ctx.strokeStyle = '#3f8f2a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.3, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.3, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a8ec8a';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.2, r * 0.3, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7ed957';
  ctx.beginPath();
  ctx.arc(-r * 0.15, r * 0.25, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.15, r * 0.25, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  if (ab.hp / ab.maxHp < 0.5) {
    ctx.fillStyle = 'rgba(60, 100, 40, 0.4)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  if (ab.t === 'bigPig') {
    ctx.strokeStyle = '#3f8f2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.4);
    ctx.lineTo(-r * 0.1, -r * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.3, -r * 0.4);
    ctx.lineTo(r * 0.1, -r * 0.5);
    ctx.stroke();
  }

  if (ab.t === 'kingPig') {
    ctx.fillStyle = '#f2b705';
    const crownX = [-r * 0.4, 0, r * 0.4];
    const crownY = [-r * 0.6, -r * 0.7, -r * 0.6];
    ctx.beginPath();
    ctx.moveTo(crownX[0], crownY[0]);
    ctx.lineTo(crownX[1], crownY[1]);
    ctx.lineTo(crownX[2], crownY[2]);
    ctx.closePath();
    ctx.fill();
  }
}

function drawBird(ctx, type, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const bird = BIRDS[type];
  ctx.fillStyle = bird.color;
  ctx.strokeStyle = bird.stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.6, -r * 0.3, r * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(r * 0.45, -r * 0.3, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.65, -r * 0.3, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3f8f2a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(r * 0.3, -r * 0.45);
  ctx.lineTo(r * 0.55, -r * 0.55);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.75, -r * 0.45);
  ctx.lineTo(r * 0.9, -r * 0.55);
  ctx.stroke();

  ctx.fillStyle = '#ff8a00';
  ctx.beginPath();
  ctx.moveTo(r * 0.8, -r * 0.1);
  ctx.lineTo(r, -r * 0.05);
  ctx.lineTo(r * 0.8, r * 0.1);
  ctx.closePath();
  ctx.fill();

  if (type === 'black') {
    ctx.strokeStyle = '#ff8a00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.9);
    ctx.lineTo(0, -r * 1.1);
    ctx.stroke();

    ctx.fillStyle = '#ff8a00';
    ctx.beginPath();
    ctx.arc(-r * 0.1, -r * 1.15, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawQueue(ctx) {
  G.birdQueue.forEach((birdType, i) => {
    const x = SLING_X - 45 - i * 38;
    const y = GROUND_Y - BIRDS[birdType].r;
    drawBird(ctx, birdType, x, y, BIRDS[birdType].r, 0);
  });
}

function drawTrajectory(ctx) {
  const vx = (SLING_X - G.aim.x) / MAX_PULL * MAX_LAUNCH_SPEED;
  const vy = (SLING_Y - G.aim.y) / MAX_PULL * MAX_LAUNCH_SPEED;

  let x = G.aim.x;
  let y = G.aim.y;
  let tempVy = vy;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';

  for (let i = 0; i < 36; i++) {
    tempVy += GRAVITY_PER_STEP;
    x += vx;
    y += tempVy;

    if (i % 3 === 0) {
      const alpha = 1 - i / 36;
      const radius = 4 * alpha;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawEffects(ctx) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  G.trail.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  G.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1;

  G.popups.forEach(p => {
    const alpha = Math.max(0, p.life / 60);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'black';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.text, p.x + 1, p.y + 1);
    ctx.fillStyle = 'white';
    ctx.fillText(p.text, p.x, p.y);
  });
  ctx.globalAlpha = 1;

  if (G.levelIndex === 0 && G.screen === 'playing' && !G.damageEnabled) {
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('새를 뒤로 끌었다 놓으세요', SLING_X + 20, SLING_Y - 90);
    ctx.globalAlpha = 1;
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    G.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 30 + Math.random() * 20,
      maxLife: 50,
      size: 3 + Math.random() * 4,
      color: color
    });
  }
  while (G.particles.length > PARTICLE_MAX) {
    G.particles.shift();
  }
}

function spawnPopup(x, y, text) {
  G.popups.push({ x: x, y: y, text: text, life: 60 });
}

function updateEffects() {
  G.particles = G.particles.filter(p => {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= 1;
    return p.life > 0;
  });

  G.popups = G.popups.filter(p => {
    p.y -= 0.8;
    p.life -= 1;
    return p.life > 0;
  });

  G.shake *= 0.85;
  if (G.shake < 0.3) {
    G.shake = 0;
  }
}
