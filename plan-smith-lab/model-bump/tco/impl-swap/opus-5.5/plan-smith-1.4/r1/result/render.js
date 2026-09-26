// render.js — 캔버스 그리기 전용. 게임 상태를 바꾸지 않는다.
// 모든 좌표는 1280×720 논리 좌표(stages.js 의 W/H)이며 카메라 오프셋은 없다.

// 한 프레임 전체: 지우기 → 배경 → (새총·궤적) → 바디 → 파편
function drawFrame(ctx, game) {
  ctx.clearRect(0, 0, W, H);                  // 지우지 않으면 새가 지나간 자리가 붓자국처럼 남는다
  drawBackground(ctx);
  drawSling(ctx, game);

  if (game.state === 'PLAYING' && game.dragging) {
    drawTrajectory(ctx, trajectoryPoints(game.dragPoint));
  }

  for (let i = 0; i < game.blocks.length; i++) drawBody(ctx, game.blocks[i]);
  for (let i = 0; i < game.pigs.length; i++) drawBody(ctx, game.pigs[i]);

  // 대기 중인 새(슬링 위/비행 중인 새를 제외한 남은 새)를 새총 뒤 지면에 줄 세운다
  if (game.state !== 'MENU') {
    const waiting = Math.max(0, game.birdsLeft - (game.bird ? 1 : 0));
    for (let i = 0; i < waiting; i++) {
      const x = SLING.x - 48 - i * 34, y = GROUND_Y - 14;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#d8302f';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,.4)';
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 5, y - 4, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + 6, y - 4, 1.7, 0, Math.PI * 2);
      ctx.fillStyle = '#111';
      ctx.fill();
    }
  }

  if (game.bird) drawBody(ctx, game.bird);
  drawParticles(ctx, game);
}

// 하늘·해·구름·언덕·지면. 정적이라 일시정지 중에도 화면이 그대로 멈춰 보인다.
function drawBackground(ctx) {
  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#4fa9e3');
  sky.addColorStop(1, '#d4f0fb');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, GROUND_Y);

  // 해
  ctx.beginPath();
  ctx.arc(1110, 110, 70, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 244, 180, .35)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(1110, 110, 48, 0, Math.PI * 2);
  ctx.fillStyle = '#fff3b0';
  ctx.fill();

  // 구름 [x, y, 크기]
  const clouds = [[150, 120, 1], [450, 70, 0.8], [740, 150, 1.15], [960, 60, 0.7], [1180, 220, 0.9]];
  ctx.fillStyle = 'rgba(255,255,255,.92)';
  for (let i = 0; i < clouds.length; i++) {
    const cx = clouds[i][0], cy = clouds[i][1], s = clouds[i][2];
    const puffs = [[0, 0, 26], [30, -12, 32], [64, 0, 24], [32, 8, 26]];
    for (let j = 0; j < puffs.length; j++) {
      ctx.beginPath();
      ctx.arc(cx + puffs[j][0] * s, cy + puffs[j][1] * s, puffs[j][2] * s, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 먼 언덕
  ctx.fillStyle = '#a3d48e';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(0, 500);
  ctx.quadraticCurveTo(170, 400, 360, 520);
  ctx.quadraticCurveTo(560, 390, 770, 510);
  ctx.quadraticCurveTo(980, 380, 1150, 500);
  ctx.quadraticCurveTo(1220, 470, W, 480);
  ctx.lineTo(W, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // 가까운 언덕
  ctx.fillStyle = '#7cbf62';
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(0, 560);
  ctx.quadraticCurveTo(130, 520, 300, 580);
  ctx.quadraticCurveTo(520, 500, 700, 585);
  ctx.quadraticCurveTo(900, 515, 1080, 580);
  ctx.quadraticCurveTo(1200, 545, W, 565);
  ctx.lineTo(W, GROUND_Y);
  ctx.closePath();
  ctx.fill();

  // 지면: 흙 + 잔디 띠
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = '#5da73e';
  ctx.fillRect(0, GROUND_Y, W, 14);
  ctx.fillStyle = '#4a8a2f';
  ctx.fillRect(0, GROUND_Y + 14, W, 4);
  ctx.fillStyle = 'rgba(0,0,0,.12)';
  for (let x = 24, k = 0; x < W; x += 66, k++) {
    ctx.fillRect(x, GROUND_Y + 38 + (k % 3) * 18, 20, 6);
  }
}

// 원이면 arc, 아니면 body.vertices 폴리곤.
// vertices 는 이미 회전이 반영된 월드 좌표다 — 폴리곤에 ctx.rotate 를 걸면 회전이 두 번 적용된다.
function drawBody(ctx, body) {
  if (body.circleRadius) {
    const x = body.position.x, y = body.position.y, r = body.circleRadius;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = body.color || '#888';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.stroke();

    // 얼굴 장식: 원은 중심 기준 도형이라 로컬 좌표계를 한 번 돌려도 이중 회전이 없다.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);
    if (body.label === 'bird') {
      // 배
      ctx.beginPath();
      ctx.ellipse(-r * 0.1, r * 0.45, r * 0.55, r * 0.33, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f1d2a8';
      ctx.fill();
      // 눈
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(r * 0.22, -r * 0.2, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.58, -r * 0.18, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.18, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.64, -r * 0.16, r * 0.09, 0, Math.PI * 2); ctx.fill();
      // 눈썹
      ctx.strokeStyle = '#111';
      ctx.lineWidth = r * 0.16;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(r * 0.02, -r * 0.55); ctx.lineTo(r * 0.78, -r * 0.34); ctx.stroke();
      // 부리
      ctx.beginPath();
      ctx.moveTo(r * 0.55, r * 0.02);
      ctx.lineTo(r * 1.12, r * 0.18);
      ctx.lineTo(r * 0.55, r * 0.38);
      ctx.closePath();
      ctx.fillStyle = '#f5a623';
      ctx.fill();
    } else if (body.label === 'pig') {
      // 귀
      ctx.fillStyle = '#5b9f39';
      ctx.beginPath(); ctx.arc(-r * 0.5, -r * 0.8, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.5, -r * 0.8, r * 0.22, 0, Math.PI * 2); ctx.fill();
      // 눈
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-r * 0.38, -r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.38, -r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-r * 0.34, -r * 0.24, r * 0.09, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.42, -r * 0.24, r * 0.09, 0, Math.PI * 2); ctx.fill();
      // 코
      ctx.beginPath();
      ctx.ellipse(0, r * 0.22, r * 0.36, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#9fe07f';
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0,0,0,.3)';
      ctx.stroke();
      ctx.fillStyle = '#3e7a26';
      ctx.beginPath(); ctx.ellipse(-r * 0.13, r * 0.22, r * 0.06, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.13, r * 0.22, r * 0.06, r * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      // 멍 (맞았지만 살아남음)
      if (body.maxHp && body.hp < body.maxHp) {
        ctx.fillStyle = 'rgba(50, 70, 20, .35)';
        ctx.beginPath(); ctx.arc(-r * 0.5, r * 0.4, r * 0.22, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    return;
  }

  const v = body.vertices;
  ctx.beginPath();
  ctx.moveTo(v[0].x, v[0].y);
  for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
  ctx.closePath();
  ctx.fillStyle = body.color || '#888';
  ctx.fill();

  // 손상 표시: hp가 줄수록 어두워진다
  let dmg = 0;
  if (body.maxHp && body.hp < body.maxHp) {
    dmg = 1 - Math.max(0, body.hp) / body.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,' + (0.4 * dmg).toFixed(3) + ')';
    ctx.fill();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0,0,0,.45)';
  ctx.stroke();

  // 절반 이상 깎이면 금
  if (dmg > 0.3 && v.length >= 4) {
    const cx = body.position.x, cy = body.position.y;
    ctx.beginPath();
    ctx.moveTo(v[0].x * 0.55 + cx * 0.45, v[0].y * 0.55 + cy * 0.45);
    ctx.lineTo(cx + 3, cy - 2);
    ctx.lineTo(cx - 2, cy + 3);
    ctx.lineTo(v[2].x * 0.55 + cx * 0.45, v[2].y * 0.55 + cy * 0.45);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,.6)';
    ctx.stroke();
  }
}

// 기둥 2개 + 고무줄. 조준 중(AIM)에는 고무줄 두 줄이 새까지 이어진다.
function drawSling(ctx, game) {
  const sx = SLING.x, sy = SLING.y;
  const back = { x: sx + 16, y: sy - 8 };     // 뒤쪽 기둥 끝
  const front = { x: sx - 16, y: sy - 6 };    // 앞쪽 기둥 끝
  const fork = { x: sx, y: sy + 44 };         // 두 기둥이 갈라지는 점

  ctx.save();
  ctx.lineCap = 'round';

  // 몸통
  ctx.strokeStyle = '#5a3417';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(sx, GROUND_Y + 2);
  ctx.lineTo(fork.x, fork.y);
  ctx.stroke();

  // 기둥 2개
  ctx.strokeStyle = '#6e4220';
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(fork.x, fork.y); ctx.lineTo(back.x, back.y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fork.x, fork.y); ctx.lineTo(front.x, front.y); ctx.stroke();

  // 고무줄
  ctx.strokeStyle = '#2d170a';
  ctx.lineWidth = 5;
  const bird = game.bird;
  if (bird && game.phase === 'AIM' && game.state !== 'MENU') {
    const bx = bird.position.x, by = bird.position.y;
    // 가죽 주머니는 새의 뒤쪽(새총 반대편)에 둔다
    let dx = bx - sx, dy = by - sy;
    const d = Math.hypot(dx, dy);
    if (d < 1) { dx = -1; dy = 0; } else { dx /= d; dy /= d; }
    const px = bx + dx * 14, py = by + dy * 14;
    ctx.beginPath(); ctx.moveTo(back.x, back.y); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(front.x, front.y); ctx.lineTo(px, py); ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fillStyle = '#3b2412';
    ctx.fill();
  } else {
    ctx.beginPath(); ctx.moveTo(back.x, back.y); ctx.lineTo(front.x, front.y); ctx.stroke();
  }
  ctx.restore();
}

// 예상 경로 점 배열(최대 28개)을 멀어질수록 작고 흐리게 그린다.
function drawTrajectory(ctx, points) {
  for (let i = 0; i < points.length; i++) {
    const r = Math.max(1.6, 5 - i * 0.12);
    ctx.beginPath();
    ctx.arc(points[i].x, points[i].y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,' + Math.max(0.3, 0.95 - i * 0.02).toFixed(2) + ')';
    ctx.fill();
  }
}

// 파편(사각 조각)과 점수 팝업(text). 남은 수명에 비례해 흐려진다.
function drawParticles(ctx, game) {
  const list = game.particles;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    if (p.text) {
      ctx.font = 'bold ' + p.size + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,.55)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    } else {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
  ctx.textBaseline = 'alphabetic';
}

// Matter 전역이 없을 때: 배경 위에 원인 문구를 그린다(빈 하늘색 캔버스로 남지 않게).
function drawLoadError(ctx) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);
  ctx.fillStyle = 'rgba(0,0,0,.6)';
  ctx.fillRect(0, H / 2 - 100, W, 200);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('physics library not loaded', W / 2, H / 2 - 36);
  ctx.fillStyle = '#ffd9d9';
  ctx.font = '20px sans-serif';
  ctx.fillText('Matter.js 0.19.0 을 CDN에서 불러오지 못했습니다. 네트워크 연결을 확인하세요.', W / 2, H / 2 + 22);
  ctx.fillText('또는 index.html 의 matter 스크립트 주소를 jsDelivr 대체 주소로 바꾸세요.', W / 2, H / 2 + 54);
  ctx.textBaseline = 'alphabetic';
}
