// render.js — 캔버스 그리기. 상태와 무관하게 매 프레임 drawFrame() 이 호출된다.
// 바디의 vertices 는 이미 회전이 반영된 월드 좌표이므로 ctx.rotate 를 추가로 걸지 않는다.

// 한 프레임 전체: clearRect → 배경 → 바디 → 새총 → 새 → 궤적 → 파편
function drawFrame(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);

  for (let i = 0; i < game.blocks.length; i++) drawBody(ctx, game.blocks[i]);
  for (let i = 0; i < game.pigs.length; i++) drawBody(ctx, game.pigs[i]);

  drawSling(ctx, game);
  if (game.bird) drawBody(ctx, game.bird);

  if (game.dragging && game.state === 'PLAYING' && game.phase === 'AIM') {
    drawTrajectory(ctx, trajectoryPoints(game.dragPoint));
  }

  drawParticles(ctx, game);
}

// 하늘·해·구름·언덕·지면. 캔버스가 비어 보이는 순간이 없도록 항상 전체를 칠한다.
function drawBackground(ctx) {
  // 하늘
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#5fb5ea');
  sky.addColorStop(1, '#bfe7fb');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // 해
  ctx.fillStyle = '#fff2a8';
  ctx.beginPath();
  ctx.arc(1120, 110, 46, 0, Math.PI * 2);
  ctx.fill();

  // 구름 (고정 위치)
  ctx.fillStyle = 'rgba(255,255,255,.9)';
  const clouds = [[180, 120, 1], [520, 90, 0.8], [860, 150, 1.1], [1000, 70, 0.7]];
  for (let i = 0; i < clouds.length; i++) {
    const cx = clouds[i][0], cy = clouds[i][1], s = clouds[i][2];
    ctx.beginPath();
    ctx.arc(cx, cy, 26 * s, 0, Math.PI * 2);
    ctx.arc(cx + 30 * s, cy - 12 * s, 32 * s, 0, Math.PI * 2);
    ctx.arc(cx + 64 * s, cy, 24 * s, 0, Math.PI * 2);
    ctx.arc(cx + 32 * s, cy + 10 * s, 26 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  // 먼 언덕
  ctx.fillStyle = '#7fc46a';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.quadraticCurveTo(200, 480, 420, GROUND_Y);
  ctx.quadraticCurveTo(640, 500, 860, GROUND_Y);
  ctx.quadraticCurveTo(1080, 460, W, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#6ab357';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.quadraticCurveTo(320, 540, 640, GROUND_Y);
  ctx.quadraticCurveTo(960, 550, W, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // 지면: 잔디 띠 + 흙
  ctx.fillStyle = '#4c9a3f';
  ctx.fillRect(0, GROUND_Y, W, 14);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(0, GROUND_Y + 14, W, H - GROUND_Y - 14);
  ctx.fillStyle = 'rgba(0,0,0,.08)';
  for (let x = 0; x < W; x += 80) ctx.fillRect(x, GROUND_Y + 40, 40, 6);
}

// 원이면 arc, 아니면 body.vertices 폴리곤. 얼굴은 label 로 구분한다.
function drawBody(ctx, body) {
  ctx.save();
  if (body.circleRadius) {
    const x = body.position.x, y = body.position.y, r = body.circleRadius;
    const isPig = body.label === 'pig';
    ctx.fillStyle = body.color || (isPig ? '#6cc24a' : '#d9342b');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,.35)';
    ctx.stroke();

    // 얼굴은 바디 각도를 따라 돈다 (arc 기반이라 vertices 이중 회전 문제 없음)
    ctx.translate(x, y);
    ctx.rotate(body.angle);
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.25, r * 0.22, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.25, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.22, r * 0.1, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.22, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    if (isPig) {
      ctx.fillStyle = '#4e9a34';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.25, r * 0.36, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2f6b20';
      ctx.beginPath();
      ctx.arc(-r * 0.13, r * 0.25, r * 0.07, 0, Math.PI * 2);
      ctx.arc(r * 0.13, r * 0.25, r * 0.07, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#f2b632';
      ctx.beginPath();
      ctx.moveTo(r * 0.15, r * 0.05);
      ctx.lineTo(r * 0.85, r * 0.2);
      ctx.lineTo(r * 0.15, r * 0.42);
      ctx.closePath();
      ctx.fill();
    }
    // 돼지 손상 표시
    if (isPig && body.hpMax && body.hp < body.hpMax * 0.5) {
      ctx.strokeStyle = 'rgba(0,0,0,.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, r * 0.6); ctx.lineTo(-r * 0.2, r * 0.2); ctx.lineTo(-r * 0.4, -r * 0.1);
      ctx.stroke();
    }
  } else {
    const v = body.vertices;
    ctx.fillStyle = body.color || '#c8873c';
    ctx.beginPath();
    ctx.moveTo(v[0].x, v[0].y);
    for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.stroke();
    // 블록 손상: 남은 hp 비율만큼 어둡게 덮는다
    if (body.hpMax && body.hp < body.hpMax) {
      const dmg = 1 - Math.max(0, body.hp) / body.hpMax;
      ctx.fillStyle = 'rgba(0,0,0,' + (dmg * 0.45).toFixed(3) + ')';
      ctx.fill();
    }
  }
  ctx.restore();
}

// 새총 기둥 2개 + 당김 중 고무줄 두 줄
function drawSling(ctx, game) {
  const px = SLING.x, py = SLING.y;
  const leftTip = { x: px - 16, y: py - 8 }, rightTip = { x: px + 16, y: py - 8 };

  ctx.save();
  ctx.lineCap = 'round';
  // 줄기
  ctx.strokeStyle = '#6b3f1d';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(px, GROUND_Y);
  ctx.lineTo(px, py + 22);
  ctx.stroke();
  // 가지 2개
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(px, py + 22); ctx.lineTo(leftTip.x, leftTip.y);
  ctx.moveTo(px, py + 22); ctx.lineTo(rightTip.x, rightTip.y);
  ctx.stroke();

  // 고무줄
  ctx.strokeStyle = '#3d2412';
  ctx.lineWidth = 4;
  const pulling = game.state === 'PLAYING' && game.phase === 'AIM' && game.dragging && game.bird;
  if (pulling) {
    const bx = game.bird.position.x, by = game.bird.position.y;
    ctx.beginPath();
    ctx.moveTo(leftTip.x, leftTip.y); ctx.lineTo(bx, by);
    ctx.moveTo(rightTip.x, rightTip.y); ctx.lineTo(bx, by);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(leftTip.x, leftTip.y);
    ctx.quadraticCurveTo(px, py + 4, rightTip.x, rightTip.y);
    ctx.stroke();
  }
  ctx.restore();
}

// 미리보기 점 배열 렌더
function drawTrajectory(ctx, points) {
  ctx.save();
  for (let i = 0; i < points.length; i++) {
    const t = 1 - i / Math.max(1, points.length);
    ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.55 * t).toFixed(3) + ')';
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, 3 + 2 * t, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 파편
function drawParticles(ctx, game) {
  const ps = game.particles;
  ctx.save();
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.fillStyle = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  ctx.restore();
}

// Matter 전역이 없을 때: 원인을 캔버스에 글로 드러낸다
function drawLoadError(ctx) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1b1f24';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ff6b6b';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('physics library not loaded', W / 2, H / 2 - 24);
  ctx.fillStyle = '#ddd';
  ctx.font = '20px sans-serif';
  ctx.fillText('Matter.js 0.19.0 CDN 스크립트를 불러오지 못했습니다. 네트워크 연결을 확인한 뒤 새로고침하세요.', W / 2, H / 2 + 28);
}
