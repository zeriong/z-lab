function render() {
  const ctx = G.ctx;
  ctx.save();

  if (G.shake > 0) {
    ctx.translate((Math.random() - 0.5) * 2 * G.shake, (Math.random() - 0.5) * 2 * G.shake);
  }

  drawBackground(ctx);
  drawSlingshot(ctx, 'back');

  if (G.engine) {
    const bodies = Composite.allBodies(G.engine.world);
    for (let i = 0; i < bodies.length; i++) {
      drawBody(ctx, bodies[i]);
    }
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
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#7ec8f0');
  grd.addColorStop(1, '#d6f0ff');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);

  const cloudY = 120;
  const time = performance.now() * 0.01;
  const x1 = ((time % (W + 200)) - 100);
  const x2 = ((time * 0.7 % (W + 200)) - 100);
  const x3 = ((time * 0.5 % (W + 200)) - 100);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  drawCloud(ctx, x1, cloudY);
  drawCloud(ctx, x2, cloudY + 60);
  drawCloud(ctx, x3, cloudY + 30);

  ctx.fillStyle = '#8fd16a';
  ctx.beginPath();
  ctx.ellipse(W * 0.3, GROUND_Y - 80, W * 0.4, 60, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7cc255';
  ctx.beginPath();
  ctx.ellipse(W * 0.7, GROUND_Y - 70, W * 0.35, 50, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  ctx.fillStyle = '#5fbf4a';
  ctx.fillRect(0, GROUND_Y, W, 10);
}

function drawCloud(ctx, x, y) {
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 15, y - 5, 18, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + 30, y, 20, 12, 0, 0, Math.PI * 2);
  ctx.fill();
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
    ctx.beginPath();
    if (G.dragging) {
      ctx.moveTo(SLING_X - 14, SLING_Y - 10);
      ctx.lineTo(G.aim.x, G.aim.y);
      ctx.moveTo(SLING_X + 14, SLING_Y - 10);
      ctx.lineTo(G.aim.x, G.aim.y);
    } else {
      ctx.moveTo(SLING_X - 14, SLING_Y - 10);
      ctx.lineTo(SLING_X + 14, SLING_Y - 10);
    }
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#3b1f0e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (G.dragging) {
      ctx.moveTo(SLING_X - 14, SLING_Y - 10);
      ctx.lineTo(G.aim.x, G.aim.y);
      ctx.moveTo(SLING_X + 14, SLING_Y - 10);
      ctx.lineTo(G.aim.x, G.aim.y);
    } else {
      ctx.moveTo(SLING_X - 14, SLING_Y - 10);
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

  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  if (body.ab.kind === 'static') {
    ctx.fillStyle = '#6d7178';
    ctx.strokeStyle = '#4a4d52';
    ctx.lineWidth = 2;
    ctx.fillRect(-body.ab.w / 2, -body.ab.h / 2, body.ab.w, body.ab.h);
    ctx.strokeRect(-body.ab.w / 2, -body.ab.h / 2, body.ab.w, body.ab.h);
  } else if (body.ab.kind === 'block') {
    drawBlock(ctx, body);
  } else if (body.ab.kind === 'pig') {
    drawPig(ctx, body);
  } else if (body.ab.kind === 'bird') {
    drawBird(ctx, body.ab.type, 0, 0, BIRDS[body.ab.type].r, body.angle);
  }

  ctx.restore();
}

function drawBlock(ctx, body) {
  const w = body.ab.w;
  const h = body.ab.h;
  const mat = MATERIALS[body.ab.m];

  ctx.fillStyle = mat.color;
  ctx.globalAlpha = body.ab.m === 'glass' ? 0.75 : 1;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.globalAlpha = 1;
  ctx.strokeStyle = mat.stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  const hpRatio = body.ab.hp / body.ab.maxHp;
  if (hpRatio < 0.6) {
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, -h / 2 + 2);
    ctx.lineTo(w / 2 - 2, h / 2 - 2);
    ctx.stroke();
  }
  if (hpRatio < 0.3) {
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, h / 2 - 2);
    ctx.lineTo(w / 2 - 2, -h / 2 + 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, 0);
    ctx.lineTo(w / 2 - 2, 0);
    ctx.stroke();
  }
}

function drawPig(ctx, body) {
  const r = body.ab.r;
  const type = body.ab.t;

  ctx.fillStyle = '#7ed957';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3f8f2a';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (type === 'bigPig') {
    ctx.strokeStyle = '#3f8f2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.4, r * 0.15, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.4, r * 0.15, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.2, r * 0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.2, r * 0.18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(-r * 0.35, -r * 0.2, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.2, r * 0.09, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#a8ec8a';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 0.2, r * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7ed957';
  ctx.beginPath();
  ctx.arc(-r * 0.08, r * 0.3, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.08, r * 0.3, r * 0.06, 0, Math.PI * 2);
  ctx.fill();

  const hpRatio = body.ab.hp / body.ab.maxHp;
  if (hpRatio < 0.5) {
    ctx.fillStyle = 'rgba(80, 120, 60, 0.3)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  if (type === 'kingPig') {
    ctx.fillStyle = '#f2b705';
    ctx.beginPath();
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const dist = i % 2 === 0 ? r * 0.5 : r * 0.25;
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      if (i === 0) ctx.moveTo(x, y - r - 8);
      else ctx.lineTo(x, y - r - 8);
    }
    ctx.closePath();
    ctx.fill();
  }
}

function drawBird(ctx, type, x, y, r, angle) {
  const bird = BIRDS[type];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.fillStyle = bird.color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = bird.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(r * 0.5, -r * 0.25, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.5, r * 0.25, r * 0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(r * 0.6, -r * 0.25, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.6, r * 0.25, r * 0.13, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = bird.stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(r * 0.3, -r * 0.5);
  ctx.lineTo(r * 0.65, -r * 0.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.3, r * 0.5);
  ctx.lineTo(r * 0.65, r * 0.35);
  ctx.stroke();

  ctx.fillStyle = '#ff9933';
  ctx.beginPath();
  ctx.moveTo(r * 0.8, -r * 0.1);
  ctx.lineTo(r * 0.8, r * 0.1);
  ctx.lineTo(r * 1.1, 0);
  ctx.closePath();
  ctx.fill();

  if (type === 'black') {
    ctx.strokeStyle = '#ff8a00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.8);
    ctx.lineTo(-r * 0.1, -r * 1.1);
    ctx.stroke();

    ctx.fillStyle = '#ff8a00';
    ctx.beginPath();
    ctx.arc(-r * 0.1, -r * 1.1, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawQueue(ctx) {
  for (let i = 0; i < G.birdQueue.length; i++) {
    const type = G.birdQueue[i];
    const x = SLING_X - 45 - i * 38;
    const y = GROUND_Y - BIRDS[type].r;
    drawBird(ctx, type, x, y, BIRDS[type].r, 0);
  }
}

function drawTrajectory(ctx) {
  const vx = (SLING_X - G.aim.x) / MAX_PULL * MAX_LAUNCH_SPEED;
  const vy = (SLING_Y - G.aim.y) / MAX_PULL * MAX_LAUNCH_SPEED;

  let x = G.aim.x;
  let y = G.aim.y;
  let velY = vy;

  ctx.fillStyle = 'white';
  for (let i = 0; i < 36; i++) {
    velY += GRAVITY_PER_STEP;
    x += vx;
    y += velY;

    if (i % 3 === 0) {
      const alpha = 1 - (i / 36);
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, 4 - (i / 36) * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function drawEffects(ctx) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (let i = 0; i < G.trail.length; i++) {
    const pt = G.trail[i];
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < G.particles.length; i++) {
    const p = G.particles[i];
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < G.popups.length; i++) {
    const pop = G.popups[i];
    ctx.globalAlpha = pop.life / 60;
    ctx.fillStyle = 'black';
    ctx.fillText(pop.text, pop.x + 1, pop.y + 1);
    ctx.fillStyle = 'white';
    ctx.fillText(pop.text, pop.x, pop.y);
  }
  ctx.globalAlpha = 1;

  if (G.levelIndex === 0 && G.screen === 'playing' && !G.damageEnabled) {
    ctx.globalAlpha = 0.8;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText('새를 뒤로 끌었다 놓으세요', SLING_X + 20, SLING_Y - 90);
    ctx.globalAlpha = 1;
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const life = 30 + Math.random() * 20;
    const size = 3 + Math.random() * 4;

    G.particles.push({
      x, y, vx, vy, color, size,
      life, maxLife: life
    });
  }

  while (G.particles.length > PARTICLE_MAX) {
    G.particles.shift();
  }
}

function spawnPopup(x, y, text) {
  G.popups.push({ x, y, text, life: 60 });
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
    const pop = G.popups[i];
    pop.y -= 0.8;
    pop.life -= 1;
    if (pop.life <= 0) {
      G.popups.splice(i, 1);
    }
  }

  G.shake *= 0.85;
  if (G.shake < 0.3) {
    G.shake = 0;
  }
}
