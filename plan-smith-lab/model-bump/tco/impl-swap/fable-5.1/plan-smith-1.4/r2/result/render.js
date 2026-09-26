// render.js — 캔버스 그리기
// stages.js의 상수(W, H, GROUND_Y, SLING)와 physics.js의 Matter 별칭을 그대로 쓴다. 다시 선언하지 않는다.

// 하늘·언덕·지면 (매 프레임 먼저 그린다)
function drawBackground(ctx) {
  // 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#6fb8e8');
  sky.addColorStop(1, '#bfe6f7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // 구름
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const clouds = [[160, 110, 34], [210, 96, 44], [265, 112, 30],
                  [720, 150, 30], [765, 136, 40], [815, 152, 28],
                  [1080, 90, 28], [1120, 78, 38], [1165, 94, 26]];
  for (let i = 0; i < clouds.length; i++) {
    ctx.beginPath();
    ctx.arc(clouds[i][0], clouds[i][1], clouds[i][2], 0, Math.PI * 2);
    ctx.fill();
  }

  // 먼 언덕
  ctx.fillStyle = '#8fcf6f';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.quadraticCurveTo(220, 440, 460, GROUND_Y);
  ctx.quadraticCurveTo(700, 470, 940, GROUND_Y);
  ctx.quadraticCurveTo(1120, 500, W, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // 가까운 언덕
  ctx.fillStyle = '#79bd5b';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.quadraticCurveTo(330, 520, 640, GROUND_Y);
  ctx.quadraticCurveTo(960, 540, W, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // 지면
  ctx.fillStyle = '#5a8f3c';
  ctx.fillRect(0, GROUND_Y, W, 14);
  ctx.fillStyle = '#7a5230';
  ctx.fillRect(0, GROUND_Y + 14, W, H - GROUND_Y - 14);
}

// 원이면 arc, 아니면 body.vertices 폴리곤.
// body.vertices는 이미 회전이 반영된 월드 좌표다. ctx.rotate를 추가로 걸지 않는다.
function drawBody(ctx, body) {
  if (body.label === 'ground') return;   // 지면은 drawBackground가 그린다
  const color = body.color || '#888';
  if (body.circleRadius) {
    const r = body.circleRadius;
    ctx.beginPath();
    ctx.arc(body.position.x, body.position.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
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
    ctx.arc(ex - r * 0.2, ey - r * 0.25, r * 0.22, 0, Math.PI * 2);
    ctx.arc(ex + r * 0.2, ey - r * 0.25, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(ex - r * 0.17, ey - r * 0.25, r * 0.1, 0, Math.PI * 2);
    ctx.arc(ex + r * 0.23, ey - r * 0.25, r * 0.1, 0, Math.PI * 2);
    ctx.fill();

    if (body.label === 'pig') {
      // 코
      ctx.fillStyle = '#4fae44';
      ctx.beginPath();
      ctx.arc(ex, ey + r * 0.15, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  const v = body.vertices;
  ctx.beginPath();
  ctx.moveTo(v[0].x, v[0].y);
  for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.stroke();
}

// 기둥 2개 + 당김 중 고무줄
function drawSling(ctx, game) {
  const baseY = GROUND_Y;
  const leftX = SLING.x - 12, rightX = SLING.x + 12;

  // 뒤쪽 고무줄 (새 뒤로 지나가는 줄)
  const pulling = game.dragging && game.bird && game.phase === 'AIM';
  let bx = SLING.x, by = SLING.y;
  if (pulling) { bx = game.bird.position.x; by = game.bird.position.y; }

  if (pulling) {
    ctx.strokeStyle = '#3b2412';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(rightX, SLING.y);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }

  // 기둥
  ctx.strokeStyle = '#6b3f1d';
  ctx.lineCap = 'round';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(SLING.x, baseY);
  ctx.lineTo(SLING.x, SLING.y + 40);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(SLING.x, SLING.y + 40);
  ctx.lineTo(leftX, SLING.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(SLING.x, SLING.y + 40);
  ctx.lineTo(rightX, SLING.y);
  ctx.stroke();

  // 앞쪽 고무줄 (새 앞으로 지나가는 줄)
  if (pulling) {
    ctx.strokeStyle = '#3b2412';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(leftX, SLING.y);
    ctx.lineTo(bx, by);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

// 점 배열 렌더
function drawTrajectory(ctx, points) {
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < points.length; i++) {
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 파편
function drawParticles(ctx, game) {
  const ps = game.particles;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 30));
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// `physics library not loaded` 문구
function drawLoadError(ctx) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#b00020';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('physics library not loaded', W / 2, H / 2 - 10);
  ctx.font = '20px sans-serif';
  ctx.fillStyle = '#333';
  ctx.fillText('Matter.js CDN 로드에 실패했습니다. 네트워크를 확인하거나 index.html의 CDN 주소를 바꿔 주세요.', W / 2, H / 2 + 30);
  ctx.textAlign = 'start';
}

// 한 프레임 전체: clearRect → drawBackground → 바디 → 파편
function drawFrame(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);

  // 슬링 (새 뒤에 그려지는 부분 포함)
  drawSling(ctx, game);

  // 조준 중 궤적
  if (game.state !== 'MENU' && game.dragging && game.phase === 'AIM') {
    drawTrajectory(ctx, trajectoryPoints(game.dragPoint));
  }

  // 바디
  if (game.engine) {
    const bodies = Composite.allBodies(game.engine.world);
    for (let i = 0; i < bodies.length; i++) drawBody(ctx, bodies[i]);
  }

  // 대기 중인 새 (슬링 옆에 남은 새 표시)
  if (game.state !== 'MENU') {
    const waiting = Math.max(0, game.birdsLeft - (game.bird ? 1 : 0));
    for (let i = 0; i < waiting && i < 5; i++) {
      ctx.beginPath();
      ctx.arc(SLING.x - 50 - i * 34, GROUND_Y - 14, 13, 0, Math.PI * 2);
      ctx.fillStyle = '#d9382a';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.stroke();
    }
  }

  drawParticles(ctx, game);
}
