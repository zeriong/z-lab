function drawFrame(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);

  const allBodies = game.blocks.concat(game.pigs).concat(game.bird ? [game.bird] : []);
  for (let i = 0; i < allBodies.length; i++) {
    const b = allBodies[i];
    if (b.destroyed) continue;
    drawBody(ctx, b);
  }

  drawParticles(ctx, game);
  drawSling(ctx, game);
  if (game.phase === 'AIM' && game.dragging) {
    drawTrajectory(ctx, game.trajectoryPoints);
  }
}

function drawBackground(ctx) {
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#d4b896';
  ctx.beginPath();
  ctx.ellipse(W/2, GROUND_Y - 50, 400, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#90EE90';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
}

function drawBody(ctx, body) {
  ctx.save();
  ctx.translate(body.position.x, body.position.y);

  if (body.circleRadius) {
    ctx.fillStyle = body.color || '#999';
    ctx.beginPath();
    ctx.arc(0, 0, body.circleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (body.vertices) {
    ctx.fillStyle = body.color || '#999';
    ctx.beginPath();
    const v = body.vertices;
    ctx.moveTo(v[0].x - body.position.x, v[0].y - body.position.y);
    for (let i = 1; i < v.length; i++) {
      ctx.lineTo(v[i].x - body.position.x, v[i].y - body.position.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.restore();
}

function drawSling(ctx, game) {
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(SLING.x - 20, SLING.y - 60);
  ctx.lineTo(SLING.x - 20, SLING.y + 20);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(SLING.x + 20, SLING.y - 60);
  ctx.lineTo(SLING.x + 20, SLING.y + 20);
  ctx.stroke();

  if (game.phase === 'AIM' && game.dragging) {
    const p = game.dragPoint;
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(SLING.x - 20, SLING.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(SLING.x + 20, SLING.y);
    ctx.lineTo(p.x, p.y);
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
  for (let i = 0; i < game.particles.length; i++) {
    const p = game.particles[i];
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / 20;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawLoadError(ctx) {
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#000';
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('physics library not loaded', W/2, H/2);
}
