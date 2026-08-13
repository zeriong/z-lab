function drawFrame(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);

  // Draw ground and all bodies
  if (game.engine && game.engine.world.bodies) {
    for (let i = 0; i < game.engine.world.bodies.length; i++) {
      drawBody(ctx, game.engine.world.bodies[i]);
    }
  }

  // Draw sling and trajectory (when aiming)
  if (game.state === 'PLAYING' && game.phase === 'AIM' && game.bird) {
    const traj = trajectoryPoints(game.dragPoint);
    drawTrajectory(ctx, traj);
    drawSling(ctx, game);
  }

  // Draw particles
  drawParticles(ctx, game);

  // Draw HUD background (semi-transparent)
  if (game.state !== 'MENU') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, W, 60);
  }
}

function drawBackground(ctx) {
  // Sky
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, W, H * 0.7);

  // Hill (simple triangle)
  ctx.fillStyle = '#5ba750';
  ctx.beginPath();
  ctx.moveTo(0, H * 0.7);
  ctx.quadraticCurveTo(W * 0.3, H * 0.4, W, H * 0.7);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.fill();

  // Ground
  ctx.fillStyle = '#8b7355';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
}

function drawBody(ctx, body) {
  if (!body.vertices || body.vertices.length === 0) return;

  const color = body.matColor || '#888888';
  ctx.fillStyle = color;
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;

  if (body.circleRadius) {
    // Circle
    ctx.beginPath();
    ctx.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Polygon
    ctx.beginPath();
    for (let i = 0; i < body.vertices.length; i++) {
      const v = body.vertices[i];
      if (i === 0) ctx.moveTo(v.x, v.y);
      else ctx.lineTo(v.x, v.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawSling(ctx, game) {
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 8;

  // Sling base (two posts)
  ctx.beginPath();
  ctx.moveTo(SLING.x - 20, SLING.y + 60);
  ctx.lineTo(SLING.x - 20, SLING.y - 10);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(SLING.x + 20, SLING.y + 60);
  ctx.lineTo(SLING.x + 20, SLING.y - 10);
  ctx.stroke();

  // Rubber bands (from posts to bird)
  if (game.bird) {
    const q = pullPoint(game.dragPoint);
    ctx.strokeStyle = '#cc6600';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(SLING.x - 20, SLING.y - 10);
    ctx.lineTo(game.bird.position.x, game.bird.position.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(SLING.x + 20, SLING.y - 10);
    ctx.lineTo(game.bird.position.x, game.bird.position.y);
    ctx.stroke();
  }
}

function drawTrajectory(ctx, points) {
  ctx.fillStyle = 'rgba(255, 255, 0, 0.6)';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, game) {
  ctx.fillStyle = '#90ee90';
  for (let i = 0; i < game.particles.length; i++) {
    const p = game.particles[i];
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLoadError(ctx) {
  ctx.fillStyle = '#333333';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('physics library not loaded', W / 2, H / 2);
}
