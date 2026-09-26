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

  const cloudTime = performance.now() * 0.01;
  const clouds = [
    { x: 200 + (cloudTime % (W + 400)) - 200, y: 100 },
    { x: 500 + (cloudTime * 0.7 % (W + 400)) - 200, y: 150 },
    { x: 800 + (cloudTime * 1.3 % (W + 400)) - 200, y: 80 }
  ];

  ctx.fillStyle = '#ffffff';
  clouds.forEach(c => {
    ctx.beginPath();
    ctx.ellipse(c.x, c.y, 40, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + 30, c.y, 50, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c.x + 60, c.y, 40, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = '#8fd16a';
  ctx.beginPath();
  ctx.ellipse(100, 620, 200, 80, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7cc255';
  ctx.beginPath();
  ctx.ellipse(400, 650, 250, 100, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#5fbf4a';
  ctx.fillRect(0, GROUND_Y, W, 10);
}

function drawSlingshot(ctx, layer) {
  ctx.strokeStyle = '#6b3e1f';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

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
    ctx.beginPath();
    ctx.moveTo(SLING_X - 14, SLING_Y - 10);
    if (G.dragging) {
      ctx.lineTo(G.aim.x, G.aim.y);
    } else {
      ctx.lineTo(SLING_X - 14, SLING_Y - 10);
    }
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#3b1f0e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(SLING_X + 14, SLING_Y - 10);
    if (G.dragging) {
      ctx.lineTo(G.aim.x, G.aim.y);
    } else {
      ctx.lineTo(SLING_X + 14, SLING_Y - 10);
    }
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
  if (body.ab.kind === 'ground') return;

  const x = body.position.x;
  const y = body.position.y;
  const angle = body.angle;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  if (body.ab.kind === 'static') {
    const w = body.ab.w;
    const h = body.ab.h;
    ctx.fillStyle = '#6d7178';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = '#4a4d52';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
  } else if (body.ab.kind === 'block') {
    drawBlock(ctx, body);
  } else if (body.ab.kind === 'pig') {
    drawPig(ctx, body);
  } else if (body.ab.kind === 'bird') {
    drawBird(ctx, body.ab.type, 0, 0, BIRDS[body.ab.type].r, angle);
  }

  ctx.restore();
}

function drawBlock(ctx, body) {
  const w = body.ab.w;
  const h = body.ab.h;
  const m = MATERIALS[body.ab.m];
  const ratio = body.ab.hp / body.ab.maxHp;

  ctx.fillStyle = m.color;
  if (body.ab.m === 'glass') {
    ctx.globalAlpha = 0.75;
  }
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = m.stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  if (ratio < 0.6) {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -h / 2 + 2);
    ctx.lineTo(w / 2 - 2, h / 2 - 2);
    ctx.stroke();
  }

  if (ratio < 0.3) {
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 2, -h / 2 + 2);
    ctx.lineTo(-w / 2 + 2, h / 2 - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, 0);
    ctx.lineTo(w / 2 - 2, 0);
    ctx.stroke();
  }
}

function drawPig(ctx, body) {
  const t = body.ab.t;
  const r = body.ab.r;
  const ratio = body.ab.hp / body.ab.maxHp;

  const def = PIGS[t];

  ctx.fillStyle = '#7ed957';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3f8f2a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  const earY = -r * 0.4;
  const earX = r * 0.3;
  ctx.fillStyle = '#7ed957';
  ctx.beginPath();
  ctx.arc(-earX, earY, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(earX, earY, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.2, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.2, r * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(-r * 0.3, -r * 0.2, r * 0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.2, r * 0.12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a8ec8a';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.15, r * 0.3, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7ed957';
  ctx.beginPath();
  ctx.arc(-r * 0.15, r * 0.2, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.15, r * 0.2, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  if (t === 'bigPig') {
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.4);
    ctx.lineTo(-r * 0.25, -r * 0.5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.25, -r * 0.5);
    ctx.lineTo(r * 0.35, -r * 0.4);
    ctx.stroke();
  }

  if (t === 'kingPig') {
    ctx.fillStyle = '#f2b705';
    ctx.beginPath();
    ctx.moveTo(0, -r - 10);
    ctx.lineTo(-r * 0.3, -r - 5);
    ctx.lineTo(-r * 0.2, -r);
    ctx.lineTo(-r * 0.1, -r - 5);
    ctx.lineTo(0, -r - 3);
    ctx.lineTo(r * 0.1, -r - 5);
    ctx.lineTo(r * 0.2, -r);
    ctx.lineTo(r * 0.3, -r - 5);
    ctx.closePath();
    ctx.fill();
  }

  if (ratio < 0.5) {
    ctx.fillStyle = 'rgba(100, 150, 80, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBird(ctx, type, x, y, r, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const bird = BIRDS[type];

  ctx.fillStyle = bird.color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = bird.stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.3, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.3, r * 0.3, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.3, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, r * 0.3, r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r * 0.1, -r * 0.4);
  ctx.lineTo(r * 0.5, -r * 0.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.1, r * 0.4);
  ctx.lineTo(r * 0.5, r * 0.5);
  ctx.stroke();

  ctx.fillStyle = '#ff9933';
  ctx.beginPath();
  ctx.moveTo(r + 2, 0);
  ctx.lineTo(r + 12, -r * 0.2);
  ctx.lineTo(r + 12, r * 0.2);
  ctx.closePath();
  ctx.fill();

  if (type === 'black') {
    ctx.strokeStyle = '#ff9933';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r - 5);
    ctx.lineTo(-r * 0.2, -r - 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, -r - 10);
    ctx.lineTo(r * 0, -r - 15);
    ctx.stroke();
    ctx.fillStyle = '#ff6600';
    ctx.beginPath();
    ctx.arc(-r * 0.1, -r - 12, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawQueue(ctx) {
  G.birdQueue.forEach((type, i) => {
    const x = SLING_X - 45 - i * 38;
    const y = GROUND_Y - BIRDS[type].r;
    drawBird(ctx, type, x, y, BIRDS[type].r, 0);
  });
}

function drawTrajectory(ctx) {
  const vx = (SLING_X - G.aim.x) / MAX_PULL * MAX_LAUNCH_SPEED;
  const vy_init = (SLING_Y - G.aim.y) / MAX_PULL * MAX_LAUNCH_SPEED;

  let x = G.aim.x;
  let y = G.aim.y;
  let vy = vy_init;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (let i = 0; i < 36; i++) {
    vy += GRAVITY_PER_STEP;
    x += vx;
    y += vy;

    if (i % 3 === 0) {
      const alpha = 0.7 * (1 - i / 36);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      const size = 4 * (1 - i / 36);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawEffects(ctx) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  G.trail.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });

  G.particles.forEach(p => {
    const alpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = alpha;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  });
  ctx.globalAlpha = 1;

  G.popups.forEach(p => {
    const alpha = p.life / 60;
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.3})`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, p.x + 2, p.y + 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillText(p.text, p.x, p.y);
  });

  if (G.levelIndex === 0 && G.screen === 'playing' && !G.damageEnabled) {
    ctx.font = 'bold 22px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('새를 뒤로 끌었다 놓으세요', SLING_X + 20, SLING_Y - 90);
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    const life = 30 + Math.random() * 20;
    const size = 3 + Math.random() * 4;
    G.particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: life,
      maxLife: life,
      color: color,
      size: size
    });
  }
  if (G.particles.length > PARTICLE_MAX) {
    G.particles.splice(0, G.particles.length - PARTICLE_MAX);
  }
}

function spawnPopup(x, y, text) {
  G.popups.push({ x: x, y: y, text: text, life: 60 });
}

function updateEffects() {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15;
    p.life -= 1;
    if (p.life <= 0) {
      G.particles.splice(i, 1);
    }
  }

  for (let i = G.popups.length - 1; i >= 0; i--) {
    const p = G.popups[i];
    p.y -= 0.8;
    p.life -= 1;
    if (p.life <= 0) {
      G.popups.splice(i, 1);
    }
  }

  G.shake *= 0.85;
  if (G.shake < 0.3) {
    G.shake = 0;
  }
}
