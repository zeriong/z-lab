function drawFrame(ctx, game) {
  drawBackground(ctx);

  if (game.blocks && game.blocks.length > 0) {
    for (const block of game.blocks) {
      drawBody(ctx, block);
    }
  }

  if (game.pigs && game.pigs.length > 0) {
    for (const pig of game.pigs) {
      drawBody(ctx, pig);
    }
  }

  if (game.bird) {
    drawBody(ctx, game.bird);
  }

  if (game.state === 'PLAYING' && game.phase === 'AIM' && game.dragging) {
    drawSling(ctx, game);
    drawTrajectory(ctx, trajectoryPoints(game.dragPoint));
  } else if (game.state === 'PLAYING' && game.phase === 'AIM') {
    drawSling(ctx, game);
  }

  drawParticles(ctx, game);
}

function drawBackground(ctx) {
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = '#b4a574';
  ctx.beginPath();
  ctx.ellipse(W / 2, H - 80, W / 2.5, 80, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#8b7355';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
}

function drawBody(ctx, body) {
  if (body.circleRadius !== undefined) {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = body.color || '#ffcc00';
    ctx.beginPath();
    ctx.arc(0, 0, body.circleRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillStyle = body.color || '#999';
    ctx.beginPath();
    for (let i = 0; i < body.vertices.length; i++) {
      const v = body.vertices[i];
      if (i === 0) {
        ctx.moveTo(v.x, v.y);
      } else {
        ctx.lineTo(v.x, v.y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawSling(ctx, game) {
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(SLING.x - 30, SLING.y - 80);
  ctx.lineTo(SLING.x - 30, SLING.y + 30);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(SLING.x + 30, SLING.y - 80);
  ctx.lineTo(SLING.x + 30, SLING.y + 30);
  ctx.stroke();

  if (game.dragging && game.bird) {
    const q = pullPoint(game.dragPoint);
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(SLING.x - 30, SLING.y + 30);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(SLING.x + 30, SLING.y + 30);
    ctx.lineTo(q.x, q.y);
    ctx.stroke();
  }
}

function drawTrajectory(ctx, points) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles(ctx, game) {
  for (const particle of game.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.life / particle.maxLife;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLoadError(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('physics library not loaded', W / 2, H / 2);
}
