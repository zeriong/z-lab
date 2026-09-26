// render.js — 캔버스 그리기
// stages.js의 상수(W, H, GROUND_Y, SLING)와 physics.js의 Matter 별칭(Composite)을 그대로 쓴다.
// body.vertices는 이미 회전이 반영된 월드 좌표이므로 ctx.rotate를 추가로 걸지 않는다.

// 한 프레임 전체: 지우기 -> 배경 -> 새총(뒤) -> 바디 -> 새총(앞 고무줄) -> 궤적 -> 파편
function drawFrame(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);

  // 새총 뒤 기둥
  ctx.save();
  ctx.fillStyle = '#5d3a1a';
  ctx.fillRect(SLING.x - 26, SLING.y - 10, 12, GROUND_Y - SLING.y + 10);
  ctx.restore();

  if (game.engine) {
    const bodies = Composite.allBodies(game.engine.world);
    for (let i = 0; i < bodies.length; i++) {
      if (bodies[i].label === 'ground') continue;
      drawBody(ctx, bodies[i]);
    }
  }

  drawSling(ctx, game);

  if (game.state === 'PLAYING' && game.phase === 'AIM' && game.dragging) {
    drawTrajectory(ctx, trajectoryPoints(game.dragPoint));
  }

  drawParticles(ctx, game);
}

// 하늘·구름·언덕·지면
function drawBackground(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#5fb3e6');
  sky.addColorStop(1, '#bfe6fa');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // 구름
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const clouds = [[180, 120, 1.0], [520, 90, 0.8], [860, 140, 1.2], [1130, 80, 0.7]];
  for (let i = 0; i < clouds.length; i++) {
    const cx = clouds[i][0], cy = clouds[i][1], s = clouds[i][2];
    ctx.beginPath();
    ctx.arc(cx, cy, 28 * s, 0, Math.PI * 2);
    ctx.arc(cx + 30 * s, cy - 10 * s, 34 * s, 0, Math.PI * 2);
    ctx.arc(cx + 64 * s, cy, 26 * s, 0, Math.PI * 2);
    ctx.arc(cx + 32 * s, cy + 12 * s, 26 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // 먼 언덕
  ctx.fillStyle = '#8fd07a';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.quadraticCurveTo(160, 470, 340, GROUND_Y);
  ctx.quadraticCurveTo(520, 500, 700, GROUND_Y);
  ctx.quadraticCurveTo(900, 440, 1100, GROUND_Y);
  ctx.quadraticCurveTo(1200, 540, W, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // 가까운 언덕
  ctx.fillStyle = '#6fbf5a';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.quadraticCurveTo(120, 540, 260, GROUND_Y);
  ctx.quadraticCurveTo(460, 560, 640, GROUND_Y);
  ctx.quadraticCurveTo(880, 530, 1060, GROUND_Y);
  ctx.quadraticCurveTo(1180, 580, W, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // 지면
  ctx.fillStyle = '#4caf50';
  ctx.fillRect(0, GROUND_Y, W, 14);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, GROUND_Y + 14, W, H - GROUND_Y - 14);
}

// 원이면 arc, 아니면 body.vertices 폴리곤
function drawBody(ctx, body) {
  ctx.save();
  if (body.circleRadius) {
    const r = body.circleRadius;
    ctx.fillStyle = body.color || '#888';
    ctx.beginPath();
    ctx.arc(body.position.x, body.position.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.stroke();

    // 눈 (회전 방향을 따라)
    const a = body.angle;
    const ex = body.position.x + Math.cos(a) * r * 0.35;
    const ey = body.position.y + Math.sin(a) * r * 0.35;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex - r * 0.18, ey - r * 0.25, r * 0.22, 0, Math.PI * 2);
    ctx.arc(ex + r * 0.22, ey - r * 0.25, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(ex - r * 0.14, ey - r * 0.25, r * 0.1, 0, Math.PI * 2);
    ctx.arc(ex + r * 0.26, ey - r * 0.25, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    if (body.label === 'pig') {
      // 코
      ctx.fillStyle = '#4e9a3a';
      ctx.beginPath();
      ctx.arc(ex, ey + r * 0.15, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    } else if (body.label === 'bird') {
      // 부리
      ctx.fillStyle = '#ffb300';
      ctx.beginPath();
      ctx.moveTo(ex + r * 0.1, ey + r * 0.05);
      ctx.lineTo(ex + r * 0.75, ey + r * 0.2);
      ctx.lineTo(ex + r * 0.1, ey + r * 0.4);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    const v = body.vertices;
    ctx.fillStyle = body.color || '#888';
    ctx.beginPath();
    ctx.moveTo(v[0].x, v[0].y);
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.stroke();

    // 손상 표시: hp가 절반 아래면 어둡게
    if (body.hp !== undefined && body.maxHp === undefined) body.maxHp = body.hp;
    if (body.hp !== undefined && body.hp < body.maxHp * 0.5) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fill();
    }
  }
  ctx.restore();
}

// 기둥 2개 + 당김 중 고무줄
function drawSling(ctx, game) {
  ctx.save();
  // 당김 중 고무줄 (뒤 기둥 -> 새)
  const pulling = game.state === 'PLAYING' && game.phase === 'AIM' && game.dragging && game.bird;
  if (pulling) {
    ctx.strokeStyle = '#3e2a14';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(SLING.x - 20, SLING.y - 6);
    ctx.lineTo(game.bird.position.x, game.bird.position.y);
    ctx.stroke();
  }
  // 앞 기둥
  ctx.fillStyle = '#7a4a22';
  ctx.fillRect(SLING.x + 12, SLING.y - 10, 12, GROUND_Y - SLING.y + 10);
  // 기둥 아래 밑동
  ctx.fillStyle = '#5d3a1a';
  ctx.fillRect(SLING.x - 8, SLING.y + 40, 18, GROUND_Y - SLING.y - 40);
  if (pulling) {
    ctx.strokeStyle = '#3e2a14';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(SLING.x + 18, SLING.y - 6);
    ctx.lineTo(game.bird.position.x, game.bird.position.y);
    ctx.stroke();
  }
  ctx.restore();
}

// 점 배열 렌더
function drawTrajectory(ctx, points) {
  ctx.save();
  for (let i = 0; i < points.length; i++) {
    const t = 1 - i / Math.max(1, points.length);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.6 * t).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, 3 + 2 * t, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 파편
function drawParticles(ctx, game) {
  ctx.save();
  const ps = game.particles;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 30));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.restore();
}

// physics library not loaded 문구
function drawLoadError(ctx) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#b00020';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('physics library not loaded', W / 2, H / 2 - 20);
  ctx.fillStyle = '#333';
  ctx.font = '20px sans-serif';
  ctx.fillText('Matter.js CDN을 불러오지 못했습니다. 네트워크를 확인한 뒤 새로고침하세요.', W / 2, H / 2 + 24);
  ctx.textAlign = 'start';
}
