function drawFrame(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);

  for (let i = 0; i < game.blocks.length; i++) {
    drawBody(ctx, game.blocks[i]);
  }
  for (let i = 0; i < game.pigs.length; i++) {
    drawBody(ctx, game.pigs[i]);
  }
  if (game.bird) drawBody(ctx, game.bird);

  if (game.state === 'PLAYING' && game.phase === 'AIM') {
    drawTrajectory(ctx, game.trajectoryPoints);
  }
  drawSling(ctx, game);
  drawParticles(ctx, game);
}

function drawBackground(ctx) {
  // Sky (already #87ceeb from canvas style)

  // Hill
  ctx.fillStyle = '#8b7355';
  ctx.beginPath();
  ctx.ellipse(400, 650, 300, 150, 0, 0, Math.PI * 2);
  ctx.fill();

  // Ground
  ctx.fillStyle = '#654321';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

  // Ground line
  ctx.strokeStyle = '#4a3319';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(W, GROUND_Y);
  ctx.stroke();
}

function drawBody(ctx, body) {
  ctx.save();
  ctx.translate(body.position.x, body.position.y);
  ctx.rotate(body.angle);

  if (body.circleRadius) {
    ctx.fillStyle = body.color || '#ccc';
    ctx.beginPath();
    ctx.arc(0, 0, body.circleRadius, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = body.color || '#ccc';
    ctx.beginPath();
    for (let i = 0; i < body.vertices.length; i++) {
      const v = body.vertices[i];
      if (i === 0) ctx.moveTo(v.x - body.position.x, v.y - body.position.y);
      else ctx.lineTo(v.x - body.position.x, v.y - body.position.y);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function drawSling(ctx, game) {
  ctx.strokeStyle = '#8b4513';
  ctx.lineWidth = 8;

  // Left post
  ctx.beginPath();
  ctx.moveTo(SLING.x - 30, SLING.y - 80);
  ctx.lineTo(SLING.x - 30, SLING.y + 60);
  ctx.stroke();

  // Right post
  ctx.beginPath();
  ctx.moveTo(SLING.x + 30, SLING.y - 80);
  ctx.lineTo(SLING.x + 30, SLING.y + 60);
  ctx.stroke();

  if (game.state === 'PLAYING' && game.phase === 'AIM' && game.dragging && game.bird) {
    const p = game.dragPoint;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#a0522d';

    // Left string
    ctx.beginPath();
    ctx.moveTo(SLING.x - 30, SLING.y - 80);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    // Right string
    ctx.beginPath();
    ctx.moveTo(SLING.x + 30, SLING.y - 80);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
}

function drawTrajectory(ctx, points) {
  ctx.fillStyle = 'rgba(200, 150, 100, 0.6)';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, game) {
  ctx.fillStyle = '#4a0';
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
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('physics library not loaded', W / 2, H / 2);
}
