// Rendering
window.R = {
  draw(ctx, game) {
    const { cam, world, shot, bird, particles } = game;

    // Clear and background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, C.VIEW_H);
    gradient.addColorStop(0, '#87ceeb');
    gradient.addColorStop(1, '#e6f4fb');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);

    // Parallax hills
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    const hillOffset = cam.x * 0.3;
    ctx.beginPath();
    ctx.arc(200 - hillOffset, 200, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(600 - hillOffset, 250, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1000 - hillOffset, 200, 140, 0, Math.PI * 2);
    ctx.fill();

    // Apply camera
    ctx.save();
    ctx.translate(-cam.x, 0);

    // Ground
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 100);
    ctx.fillStyle = '#4f8f3a';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 6);

    // Slingshot
    ctx.strokeStyle = '#7a4a1e';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(C.SLING_X - 6, C.SLING_Y);
    ctx.lineTo(C.SLING_X - 6, 620);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(C.SLING_X + 6, C.SLING_Y);
    ctx.lineTo(C.SLING_X + 6, 620);
    ctx.stroke();

    // Rubber bands
    if (shot === 'DRAG') {
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(C.SLING_X - 6, C.SLING_Y);
      ctx.lineTo(bird.x, bird.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(C.SLING_X + 6, C.SLING_Y);
      ctx.lineTo(bird.x, bird.y);
      ctx.stroke();
    }

    // Bodies
    for (const body of world.bodies) {
      drawBody(ctx, body);
    }

    // Draw bird in ARMED/DRAG state (not yet added to world)
    if ((shot === 'ARMED' || shot === 'DRAG') && bird) {
      drawBird(ctx, bird);
    }

    // Particles
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Trajectory preview
    if (shot === 'DRAG') {
      drawTrajectory(ctx, bird);
    }

    ctx.restore();
  }
};

function drawBody(ctx, body) {
  if (body.kind === 'ground') return;

  const mat = MAT[body.mat];

  if (body.shape === 'box') {
    ctx.fillStyle = mat.color;
    ctx.fillRect(
      body.x - body.hw,
      body.y - body.hh,
      body.hw * 2,
      body.hh * 2
    );

    if (mat.border) {
      ctx.strokeStyle = mat.border;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        body.x - body.hw,
        body.y - body.hh,
        body.hw * 2,
        body.hh * 2
      );
    }

    // Cracks
    if (body.maxHp !== Infinity && body.hp < body.maxHp * 0.66) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(body.x - body.hw, body.y - body.hh);
      ctx.lineTo(body.x + body.hw, body.y + body.hh);
      ctx.stroke();
    }

    if (body.maxHp !== Infinity && body.hp < body.maxHp * 0.33) {
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(body.x + body.hw, body.y - body.hh);
      ctx.lineTo(body.x - body.hw, body.y + body.hh);
      ctx.stroke();
    }
  } else if (body.shape === 'circle') {
    if (body.kind === 'pig') {
      // Pig body
      ctx.fillStyle = '#7fc855';
      ctx.beginPath();
      ctx.arc(body.x, body.y, body.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#4e8f33';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Eyes and nose
      const hpRatio = body.hp / body.maxHp;
      if (hpRatio > 0.3) {
        // Normal eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(body.x - body.r / 3, body.y - body.r / 4, body.r / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(body.x + body.r / 3, body.y - body.r / 4, body.r / 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(body.x - body.r / 3, body.y - body.r / 4, body.r / 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(body.x + body.r / 3, body.y - body.r / 4, body.r / 12, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // X eyes
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(body.x - body.r / 3 - body.r / 8, body.y - body.r / 4 - body.r / 8);
        ctx.lineTo(body.x - body.r / 3 + body.r / 8, body.y - body.r / 4 + body.r / 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(body.x - body.r / 3 + body.r / 8, body.y - body.r / 4 - body.r / 8);
        ctx.lineTo(body.x - body.r / 3 - body.r / 8, body.y - body.r / 4 + body.r / 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(body.x + body.r / 3 - body.r / 8, body.y - body.r / 4 - body.r / 8);
        ctx.lineTo(body.x + body.r / 3 + body.r / 8, body.y - body.r / 4 + body.r / 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(body.x + body.r / 3 + body.r / 8, body.y - body.r / 4 - body.r / 8);
        ctx.lineTo(body.x + body.r / 3 - body.r / 8, body.y - body.r / 4 + body.r / 8);
        ctx.stroke();
      }

      // Snout
      ctx.fillStyle = 'rgba(127, 200, 85, 0.8)';
      ctx.beginPath();
      ctx.ellipse(body.x, body.y + body.r / 4, body.r / 4, body.r / 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(body.x - body.r / 8, body.y + body.r / 4, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(body.x + body.r / 8, body.y + body.r / 4, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Bird
      drawBird(ctx, body);
    }
  }
}

function drawBird(ctx, bird) {
  ctx.save();
  ctx.translate(bird.x, bird.y);
  if (bird.angle !== undefined) {
    ctx.rotate(bird.angle);
  }

  const birdData = BIRD[bird.birdType];
  ctx.fillStyle = birdData.color;
  ctx.beginPath();
  ctx.arc(0, 0, bird.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Beak
  ctx.fillStyle = '#ff9800';
  ctx.beginPath();
  ctx.moveTo(bird.r - 2, -3);
  ctx.lineTo(bird.r + 6, 0);
  ctx.lineTo(bird.r - 2, 3);
  ctx.closePath();
  ctx.fill();

  // Eye
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(-bird.r / 3, -bird.r / 3, bird.r / 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(-bird.r / 3, -bird.r / 3, bird.r / 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTrajectory(ctx, bird) {
  // Calculate launch velocity
  const vx = (C.SLING_X - bird.x) * C.LAUNCH_POWER;
  const vy = (C.SLING_Y - bird.y) * C.LAUNCH_POWER;
  const speed = Math.sqrt(vx * vx + vy * vy);
  const vxClamped = (speed > C.MAX_LAUNCH_SPEED) ? vx * C.MAX_LAUNCH_SPEED / speed : vx;
  const vyClamped = (speed > C.MAX_LAUNCH_SPEED) ? vy * C.MAX_LAUNCH_SPEED / speed : vy;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

  let px = bird.x;
  let py = bird.y;
  let vx2 = vxClamped;
  let vy2 = vyClamped;

  for (let k = 1; k <= C.TRAJ_POINTS; k++) {
    const t = k * C.TRAJ_STEP;
    const nx = bird.x + vxClamped * t;
    const ny = bird.y + vyClamped * t + 0.5 * C.GRAVITY * t * t;

    if (ny > C.GROUND_Y) break;

    const alpha = 0.85 * (1 - k / C.TRAJ_POINTS) + 0.1;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(nx, ny, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}
