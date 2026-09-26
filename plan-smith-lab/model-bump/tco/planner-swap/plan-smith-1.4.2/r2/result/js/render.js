function render() {
  const ctx = G.ctx;
  ctx.save();

  if (G.shake > 0) {
    ctx.translate((Math.random() - 0.5) * 2 * G.shake, (Math.random() - 0.5) * 2 * G.shake);
  }

  drawBackground(ctx);
  drawSlingshot(ctx, 'back');

  if (G.engine) {
    Composite.allBodies(G.engine.world).forEach(body => {
      drawBody(ctx, body);
    });
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
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#7ec8f0');
  gradient.addColorStop(1, '#d6f0ff');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  const cloudOffset = (performance.now() * 0.01) % (W + 200);
  ctx.fillStyle = 'white';
  ctx.globalAlpha = 0.7;

  // Cloud 1
  ctx.beginPath();
  ctx.ellipse(cloudOffset - 100, 80, 50, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cloudOffset - 80, 90, 40, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cloudOffset - 60, 80, 45, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cloud 2
  ctx.beginPath();
  ctx.ellipse(cloudOffset + 150, 120, 50, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cloudOffset + 170, 130, 40, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cloudOffset + 190, 120, 45, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Cloud 3
  ctx.beginPath();
  ctx.ellipse(cloudOffset + 400, 150, 50, 20, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cloudOffset + 420, 160, 40, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cloudOffset + 440, 150, 45, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;

  // Hills
  ctx.fillStyle = '#8fd16a';
  ctx.beginPath();
  ctx.ellipse(300, H - 80, 200, 100, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#7cc255';
  ctx.beginPath();
  ctx.ellipse(900, H - 100, 250, 120, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ground
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
    // Back branch
    ctx.beginPath();
    ctx.moveTo(SLING_X - 14, SLING_Y - 10);
    ctx.lineTo(SLING_X - 14, SLING_Y + 30);
    ctx.stroke();

    // Stem
    ctx.beginPath();
    ctx.moveTo(SLING_X, GROUND_Y);
    ctx.lineTo(SLING_X, SLING_Y + 40);
    ctx.stroke();

    // Back rubber
    ctx.strokeStyle = '#3b1f0e';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(SLING_X - 14, SLING_Y - 10);
    ctx.lineTo(G.aim.x, G.aim.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(SLING_X + 14, SLING_Y - 10);
    ctx.lineTo(G.aim.x, G.aim.y);
    ctx.stroke();
  } else {
    // Front branch
    ctx.beginPath();
    ctx.moveTo(SLING_X + 14, SLING_Y - 10);
    ctx.lineTo(SLING_X + 14, SLING_Y + 30);
    ctx.stroke();
  }
}

function drawBody(ctx, body) {
  const ab = body.ab;

  if (ab.kind === 'ground') {
    return;
  }

  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  if (ab.kind === 'static') {
    ctx.fillStyle = '#6d7178';
    ctx.fillRect(-ab.w / 2, -ab.h / 2, ab.w, ab.h);
    ctx.strokeStyle = '#4a4d52';
    ctx.lineWidth = 2;
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

  ctx.fillStyle = mat.color;
  ctx.globalAlpha = (ab.m === 'glass') ? 0.75 : 1;
  ctx.fillRect(-w / 2, -h / 2, w, h);

  ctx.globalAlpha = 1;
  ctx.strokeStyle = mat.stroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);

  const hpRatio = ab.hp / ab.maxHp;
  if (hpRatio < 0.6) {
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 4, -h / 2 + 4);
    ctx.lineTo(w / 2 - 4, h / 2 - 4);
    ctx.stroke();
  }
  if (hpRatio < 0.3) {
    ctx.beginPath();
    ctx.moveTo(w / 2 - 4, -h / 2 + 4);
    ctx.lineTo(-w / 2 + 4, h / 2 - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 2, 0);
    ctx.lineTo(w / 2 - 2, 0);
    ctx.stroke();
  }
}

function drawPig(ctx, body) {
  const ab = body.ab;
  const r = ab.r;

  ctx.fillStyle = '#7ed957';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3f8f2a';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Ears
  ctx.fillStyle = '#6fb548';
  ctx.beginPath();
  ctx.arc(-r * 0.4, -r * 0.6, r * 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.4, -r * 0.6, r * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.15, r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.25, -r * 0.15, r * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.15, r * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.25, -r * 0.15, r * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // Snout
  ctx.fillStyle = '#a8ec8a';
  ctx.beginPath();
  ctx.ellipse(0, r * 0.25, r * 0.3, r * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#6fb548';
  ctx.beginPath();
  ctx.arc(-r * 0.15, r * 0.3, r * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.15, r * 0.3, r * 0.08, 0, Math.PI * 2);
  ctx.fill();

  // Damage indicator
  if (ab.hp / ab.maxHp < 0.5) {
    ctx.fillStyle = 'rgba(50, 100, 50, 0.5)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  // Big pig eyebrows
  if (ab.t === 'bigPig') {
    ctx.strokeStyle = '#2d5a1a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.35);
    ctx.lineTo(-r * 0.1, -r * 0.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.35, -r * 0.35);
    ctx.lineTo(r * 0.1, -r * 0.4);
    ctx.stroke();
  }

  // King pig crown
  if (ab.t === 'kingPig') {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 1.2);
    ctx.lineTo(-r * 0.3, -r * 0.8);
    ctx.lineTo(-r * 0.15, -r * 1.3);
    ctx.lineTo(0, -r * 0.9);
    ctx.lineTo(r * 0.15, -r * 1.3);
    ctx.lineTo(r * 0.3, -r * 0.8);
    ctx.lineTo(r * 0.6, -r * 1.2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#e6c200';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawBird(ctx, type, x, y, r, angle) {
  const def = BIRDS[type];

  ctx.save();
  if (x !== 0 || y !== 0) {
    ctx.translate(x, y);
    ctx.rotate(angle);
  }

  ctx.fillStyle = def.color;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = def.stroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Eyes
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.2, r * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.3, r * 0.2, r * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(r * 0.35, -r * 0.2, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(r * 0.35, r * 0.2, r * 0.07, 0, Math.PI * 2);
  ctx.fill();

  // Eyebrows
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(r * 0.15, -r * 0.4);
  ctx.lineTo(r * 0.45, -r * 0.35);
  ctx.stroke();

  // Beak
  ctx.fillStyle = '#ff9933';
  ctx.beginPath();
  ctx.moveTo(r * 0.5, -r * 0.1);
  ctx.lineTo(r * 0.85, 0);
  ctx.lineTo(r * 0.5, r * 0.1);
  ctx.closePath();
  ctx.fill();

  // Black bird fuse
  if (type === 'black') {
    ctx.strokeStyle = '#ff9933';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.8);
    ctx.lineTo(-r * 0.2, -r * 1.1);
    ctx.stroke();

    ctx.fillStyle = '#ff9933';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 1.15, 3, 0, Math.PI * 2);
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
  const vy_base = (SLING_Y - G.aim.y) / MAX_PULL * MAX_LAUNCH_SPEED;

  let x = G.aim.x;
  let y = G.aim.y;
  let vy = vy_base;

  ctx.fillStyle = 'white';

  for (let i = 0; i < 36; i++) {
    vy += GRAVITY_PER_STEP;
    x += vx;
    y += vy;

    if (i % 3 === 0) {
      const alpha = 1 - (i / 36);
      const size = 4 * alpha;
      ctx.globalAlpha = alpha * 0.7;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

function drawEffects(ctx) {
  // Trail
  ctx.fillStyle = 'white';
  ctx.globalAlpha = 0.7;
  G.trail.forEach(point => {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Particles
  G.particles.forEach(p => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  });
  ctx.globalAlpha = 1;

  // Popups
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  G.popups.forEach(popup => {
    ctx.globalAlpha = popup.life / 60;
    ctx.fillStyle = 'black';
    ctx.lineWidth = 3;
    ctx.strokeText(popup.text, popup.x + 1, popup.y + 1);
    ctx.fillStyle = 'white';
    ctx.fillText(popup.text, popup.x, popup.y);
  });
  ctx.globalAlpha = 1;

  // Tutorial text for stage 1
  if (G.levelIndex === 0 && G.screen === 'playing' && !G.damageEnabled) {
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;
    const text = '새를 뒤로 끌었다 놓으세요';
    ctx.strokeText(text, SLING_X + 20, SLING_Y - 90);
    ctx.fillText(text, SLING_X + 20, SLING_Y - 90);
  }
}

function spawnParticles(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;
    const size = 3 + Math.random() * 4;
    const life = 30 + Math.random() * 20;

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
  // Update particles
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

  // Update popups
  for (let i = G.popups.length - 1; i >= 0; i--) {
    const popup = G.popups[i];
    popup.y -= 0.8;
    popup.life -= 1;
    if (popup.life <= 0) {
      G.popups.splice(i, 1);
    }
  }

  // Update shake
  G.shake *= 0.85;
  if (G.shake < 0.3) {
    G.shake = 0;
  }
}
