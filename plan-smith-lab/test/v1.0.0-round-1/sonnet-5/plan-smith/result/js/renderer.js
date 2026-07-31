var AB = window.AB || (window.AB = {});

// Canvas 2D renderer. Placeholder-shape art only (circles/rectangles) --
// real art/sound is explicitly out of scope per the plan's assumptions.
AB.Renderer = (function () {
  const COLORS = {
    sky: '#8ecfe0',
    ground: '#5b8a3a',
    wood: '#b5793c',
    stone: '#8a8a8a',
    ice: '#bfe6f5',
    pig: '#7fbf3f',
    bird: '#d1443b',
    debris: '#7a5230',
    anchor: '#4a3320'
  };

  function render(ctx, world, session, aim) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, session.groundY, w, h - session.groundY);

    drawSlingshotPosts(ctx, session);

    if (aim && aim.birdPos) drawRubberBand(ctx, session, aim.birdPos);

    if (aim && aim.dragging && aim.prediction) drawPrediction(ctx, aim.prediction);

    for (let i = 0; i < world.bodies.length; i++) drawBody(ctx, world.bodies[i]);

    if (aim && aim.birdPos && aim.birdRadius) {
      drawCircleShape(ctx, aim.birdPos.x, aim.birdPos.y, aim.birdRadius, COLORS.bird);
    }
  }

  function drawSlingshotPosts(ctx, session) {
    const sx = session.slingAnchor.x, sy = session.slingAnchor.y;
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(sx - 14, session.groundY);
    ctx.lineTo(sx - 14, sy - 10);
    ctx.moveTo(sx + 14, session.groundY);
    ctx.lineTo(sx + 14, sy - 10);
    ctx.stroke();
  }

  function drawRubberBand(ctx, session, birdPos) {
    const sx = session.slingAnchor.x, sy = session.slingAnchor.y;
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sx - 14, sy - 10);
    ctx.lineTo(birdPos.x, birdPos.y);
    ctx.moveTo(sx + 14, sy - 10);
    ctx.lineTo(birdPos.x, birdPos.y);
    ctx.stroke();
  }

  function drawPrediction(ctx, points) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawBody(ctx, b) {
    if (b.type === 'circle') {
      const color = b.tag === 'pig' ? COLORS.pig :
        b.tag === 'bird' ? COLORS.bird :
        b.tag === 'anchor' ? COLORS.anchor : COLORS.debris;
      let alpha = 1;
      if (b.tag === 'debris' && b.life != null) alpha = Math.max(0, Math.min(1, b.life / 1.5));
      ctx.globalAlpha = alpha;
      drawCircleShape(ctx, b.x, b.y, b.radius, color);
      ctx.globalAlpha = 1;
    } else {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.fillStyle = b.tag === 'ground' ? COLORS.ground : (COLORS[b.material] || COLORS.wood);
      ctx.fillRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.strokeRect(-b.hw, -b.hh, b.hw * 2, b.hh * 2);
      ctx.restore();
    }
  }

  function drawCircleShape(ctx, x, y, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();
  }

  return { render: render };
})();
