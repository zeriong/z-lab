// render.js — 캔버스 그리기 전담.
// Matter 함수를 호출하지 않는다(drawLoadError는 라이브러리가 없어도 돌아야 한다).
// body.vertices는 이미 회전이 반영된 월드 좌표다. 바디 폴리곤에 ctx.rotate를 추가로 걸지 않는다.

// 한 프레임 전체. 순서: 지우기 → 배경 → (궤적·새총) → 바디 → 파편.
function drawFrame(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);
  if (game.dragging && game.state === 'PLAYING' && game.bird) {
    drawTrajectory(ctx, trajectoryPoints(game.dragPoint));
  }
  drawSling(ctx, game);
  for (let i = 0; i < game.blocks.length; i++) drawBody(ctx, game.blocks[i]);
  for (let i = 0; i < game.pigs.length; i++) drawBody(ctx, game.pigs[i]);
  if (game.bird) drawBody(ctx, game.bird);
  drawParticles(ctx, game);
}

// 하늘·해·구름·언덕·지면. 구름은 고정 위치라 일시정지 중에도 화면이 정지해 보인다.
function drawBackground(ctx) {
  ctx.save();

  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#4fa8e0');
  sky.addColorStop(1, '#d2effb');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // 해
  ctx.fillStyle = 'rgba(255, 244, 180, 0.35)';
  ctx.beginPath();
  ctx.arc(1110, 110, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff2a8';
  ctx.beginPath();
  ctx.arc(1110, 110, 44, 0, Math.PI * 2);
  ctx.fill();

  // 구름
  const clouds = [[140, 110, 1.0], [470, 70, 0.8], [760, 150, 1.15], [960, 60, 0.7], [1180, 210, 0.85]];
  const puffs = [[0, 0, 26], [30, -14, 32], [62, -2, 26], [32, 8, 24]];
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  for (let i = 0; i < clouds.length; i++) {
    const cx = clouds[i][0], cy = clouds[i][1], s = clouds[i][2];
    for (let j = 0; j < puffs.length; j++) {
      ctx.beginPath();
      ctx.arc(cx + puffs[j][0] * s, cy + puffs[j][1] * s, puffs[j][2] * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 먼 언덕
  const far = [[120, 300, 170], [560, 360, 130], [940, 320, 190], [1320, 280, 150]];
  ctx.fillStyle = '#a6d693';
  for (let i = 0; i < far.length; i++) {
    ctx.beginPath();
    ctx.ellipse(far[i][0], GROUND_Y, far[i][1], far[i][2], 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // 가까운 언덕
  const near = [[-40, 260, 110], [380, 300, 90], [800, 260, 100], [1200, 320, 120]];
  ctx.fillStyle = '#7cbf66';
  for (let i = 0; i < near.length; i++) {
    ctx.beginPath();
    ctx.ellipse(near[i][0], GROUND_Y, near[i][1], near[i][2], 0, Math.PI, Math.PI * 2);
    ctx.fill();
  }

  // 지면 (흙 + 돌 알갱이 + 잔디)
  ctx.fillStyle = '#8a5a32';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#6f4726';
  for (let x = 10; x < W; x += 53) {
    ctx.fillRect(x, GROUND_Y + 30 + ((x * 7) % 55), 7, 4);
  }
  ctx.fillStyle = '#5daa3b';
  ctx.fillRect(0, GROUND_Y, W, 12);
  ctx.fillStyle = '#4c9230';
  ctx.fillRect(0, GROUND_Y + 12, W, 3);

  ctx.restore();
}

// 원이면 arc, 아니면 body.vertices 폴리곤. 돼지/새는 얼굴을, 손상된 블록은 금을 그린다.
function drawBody(ctx, body) {
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillStyle = body.color || '#999999';

  if (body.circleRadius) {
    const x = body.position.x, y = body.position.y, r = body.circleRadius;
    const c = Math.cos(body.angle), s = Math.sin(body.angle);
    // 바디 로컬 좌표 → 월드 좌표 (얼굴 부위 배치용; 캔버스 변환은 쓰지 않는다)
    const at = function (lx, ly) { return { x: x + lx * c - ly * s, y: y + lx * s + ly * c }; };
    const dot = function (p, rad, color) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
      ctx.fill();
    };

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (body.label === 'pig') {
      const snout = at(0, r * 0.22);
      ctx.fillStyle = '#a8e67e';
      ctx.beginPath();
      ctx.ellipse(snout.x, snout.y, r * 0.38, r * 0.28, body.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      dot(at(-r * 0.13, r * 0.22), r * 0.07, '#3d7a22');
      dot(at(r * 0.13, r * 0.22), r * 0.07, '#3d7a22');
      dot(at(-r * 0.38, -r * 0.3), r * 0.2, '#ffffff');
      dot(at(r * 0.38, -r * 0.3), r * 0.2, '#ffffff');
      dot(at(-r * 0.34, -r * 0.28), r * 0.09, '#111111');
      dot(at(r * 0.42, -r * 0.28), r * 0.09, '#111111');
      if (body.maxHp && body.hp < body.maxHp) {
        // 맞았지만 살아남은 돼지: 멍 자국
        const bruise = at(r * 0.45, r * 0.1);
        ctx.fillStyle = 'rgba(60, 90, 30, 0.45)';
        ctx.beginPath();
        ctx.arc(bruise.x, bruise.y, r * 0.22, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (body.label === 'bird') {
      const belly = at(r * 0.05, r * 0.45);
      ctx.fillStyle = '#f3d9b1';
      ctx.beginPath();
      ctx.ellipse(belly.x, belly.y, r * 0.55, r * 0.34, body.angle, 0, Math.PI * 2);
      ctx.fill();
      dot(at(r * 0.35, -r * 0.2), r * 0.24, '#ffffff');
      dot(at(r * 0.43, -r * 0.2), r * 0.1, '#111111');
      const b1 = at(r * 0.72, -r * 0.02), b2 = at(r * 1.18, r * 0.14), b3 = at(r * 0.72, r * 0.32);
      ctx.fillStyle = '#f0a020';
      ctx.beginPath();
      ctx.moveTo(b1.x, b1.y);
      ctx.lineTo(b2.x, b2.y);
      ctx.lineTo(b3.x, b3.y);
      ctx.closePath();
      ctx.fill();
      const e1 = at(r * 0.02, -r * 0.55), e2 = at(r * 0.66, -r * 0.3);
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e1.x, e1.y);
      ctx.lineTo(e2.x, e2.y);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const v = body.vertices;
  ctx.beginPath();
  ctx.moveTo(v[0].x, v[0].y);
  for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (v.length >= 4) {
    // 윗변 하이라이트 (재질 질감 최소 표현)
    ctx.strokeStyle = body.mat === 'ice' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(v[0].x + (v[3].x - v[0].x) * 0.15, v[0].y + (v[3].y - v[0].y) * 0.15);
    ctx.lineTo(v[1].x + (v[2].x - v[1].x) * 0.15, v[1].y + (v[2].y - v[1].y) * 0.15);
    ctx.stroke();

    if (body.maxHp && body.hp < body.maxHp) {
      // 손상 정도에 비례해 짙어지는 금
      const k = Math.min(1, Math.max(0, 1 - body.hp / body.maxHp));
      const cx = body.position.x, cy = body.position.y;
      const m1 = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
      const m2 = { x: (v[2].x + v[3].x) / 2, y: (v[2].y + v[3].y) / 2 };
      ctx.strokeStyle = 'rgba(40, 20, 10, ' + (0.35 + k * 0.5) + ')';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(m1.x, m1.y);
      ctx.lineTo(cx + (m1.x - cx) * 0.4 + 3, cy + (m1.y - cy) * 0.4);
      ctx.lineTo(cx - 2, cy + 1);
      ctx.lineTo(cx + (m2.x - cx) * 0.5 - 3, cy + (m2.y - cy) * 0.5);
      ctx.lineTo(m2.x, m2.y);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// 기둥(가지) 2개 + 고무줄 + 대기 중인 새.
function drawSling(ctx, game) {
  const sx = SLING.x, sy = SLING.y;
  const backTip = { x: sx + 16, y: sy - 6 };
  const frontTip = { x: sx - 14, y: sy - 2 };
  const fork = { x: sx, y: sy + 44 };

  ctx.save();

  // 대기 중인 새: 남은 새 중 슬링 위/비행 중인 한 마리를 뺀 수
  const waiting = Math.max(0, game.birdsLeft - (game.bird ? 1 : 0));
  for (let i = 0; i < waiting; i++) {
    const wx = sx - 56 - i * 36, wy = GROUND_Y - 14;
    ctx.fillStyle = '#d8322a';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(wx, wy, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(wx + 5, wy - 3, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0a020';
    ctx.beginPath();
    ctx.moveTo(wx + 10, wy);
    ctx.lineTo(wx + 17, wy + 2);
    ctx.lineTo(wx + 10, wy + 5);
    ctx.closePath();
    ctx.fill();
  }

  ctx.lineCap = 'round';

  // 뒤쪽 가지
  ctx.strokeStyle = '#5a3a1c';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(fork.x, fork.y);
  ctx.lineTo(backTip.x, backTip.y);
  ctx.stroke();

  // 줄기
  ctx.strokeStyle = '#6e4622';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(sx, GROUND_Y + 2);
  ctx.lineTo(fork.x, fork.y);
  ctx.stroke();

  // 고무줄: 새가 슬링에 얹혀 있으면(정적) 두 가지 끝에서 새까지, 아니면 두 끝을 잇는다.
  ctx.strokeStyle = '#3b2412';
  ctx.lineWidth = 5;
  const loaded = game.bird && game.bird.isStatic;
  if (loaded) {
    const b = game.bird.position;
    let dx = b.x - sx, dy = b.y - sy;
    const d = Math.hypot(dx, dy);
    if (d > 0.001) { dx /= d; dy /= d; } else { dx = -1; dy = 0; }
    const pouch = { x: b.x + dx * 14, y: b.y + dy * 14 };
    ctx.beginPath();
    ctx.moveTo(backTip.x, backTip.y);
    ctx.lineTo(pouch.x, pouch.y);
    ctx.stroke();
    ctx.fillStyle = '#4a2d16';
    ctx.beginPath();
    ctx.arc(pouch.x, pouch.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(frontTip.x, frontTip.y);
    ctx.lineTo(pouch.x, pouch.y);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(backTip.x, backTip.y);
    ctx.quadraticCurveTo(sx, sy + 10, frontTip.x, frontTip.y);
    ctx.stroke();
  }

  // 앞쪽 가지
  ctx.strokeStyle = '#6e4622';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(fork.x, fork.y);
  ctx.lineTo(frontTip.x, frontTip.y);
  ctx.stroke();

  ctx.restore();
}

// 예상 경로 점 (최대 28개). 멀어질수록 작고 옅어진다.
function drawTrajectory(ctx, points) {
  ctx.save();
  for (let i = 0; i < points.length; i++) {
    const r = Math.max(1.8, 5 - i * 0.12);
    ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.max(0.35, 0.95 - i * 0.02) + ')';
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// 파편. 파편은 물리 바디가 아니라 game.particles의 단순 객체다.
function drawParticles(ctx, game) {
  for (let i = 0; i < game.particles.length; i++) {
    const p = game.particles[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
    ctx.restore();
  }
}

// Matter 전역이 없을 때 매 프레임 그려지는 안내 화면.
function drawLoadError(ctx) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#87ceeb';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#8a5a32';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#1b1f24';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('physics library not loaded', W / 2, H / 2 - 30);
  ctx.font = '22px sans-serif';
  ctx.fillText('Matter.js 0.19.0을 CDN에서 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침하세요.', W / 2, H / 2 + 24);
  ctx.restore();
}
