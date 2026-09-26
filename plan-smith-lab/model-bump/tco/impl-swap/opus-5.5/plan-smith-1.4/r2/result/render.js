// render.js — 캔버스 그리기.
// Matter API를 호출하지 않는다(바디의 position / vertices / angle / circleRadius만 읽는다).
// 그래서 drawLoadError는 Matter가 없어도 안전하게 돈다.

// 한 프레임 전체: clearRect -> drawBackground -> (새총) -> 바디 -> (궤적) -> 파편
function drawFrame(ctx, game) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);
  drawSling(ctx, game);

  // 대기 중인 새들(슬링 뒤 지면 위) — 장전된/비행 중인 새는 제외
  const waiting = game.bird ? game.birdsLeft - 1 : game.birdsLeft;
  for (let i = 0; i < waiting; i++) {
    drawBody(ctx, {
      label: 'bird', circleRadius: 14, angle: 0,
      position: { x: SLING.x - 52 - i * 34, y: GROUND_Y - 15 }
    });
  }

  for (let i = 0; i < game.blocks.length; i++) drawBody(ctx, game.blocks[i]);
  for (let i = 0; i < game.pigs.length; i++) drawBody(ctx, game.pigs[i]);
  if (game.bird) drawBody(ctx, game.bird);

  if (game.dragging && game.phase === 'AIM') drawTrajectory(ctx, trajectoryPoints(game.dragPoint));

  drawParticles(ctx, game);
}

// 하늘·해·구름·언덕·지면 (전부 정적 — 일시정지 중에도 뒤 화면이 그대로 멈춰 보인다)
function drawBackground(ctx) {
  const TAU = Math.PI * 2;

  const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  sky.addColorStop(0, '#4aa3df');
  sky.addColorStop(1, '#c4ebf8');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // 해
  ctx.fillStyle = 'rgba(255, 244, 180, 0.35)';
  ctx.beginPath(); ctx.arc(1110, 110, 72, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff4b4';
  ctx.beginPath(); ctx.arc(1110, 110, 44, 0, TAU); ctx.fill();

  // 구름
  function cloud(x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x + 26 * s, y);            ctx.arc(x, y, 26 * s, 0, TAU);
    ctx.moveTo(x + 62 * s, y - 14 * s);   ctx.arc(x + 30 * s, y - 14 * s, 32 * s, 0, TAU);
    ctx.moveTo(x + 90 * s, y);            ctx.arc(x + 64 * s, y, 26 * s, 0, TAU);
    ctx.rect(x, y - 4 * s, 64 * s, 30 * s);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  cloud(130, 120, 1);
  cloud(460, 78, 1.25);
  cloud(790, 150, 0.9);
  cloud(980, 64, 0.75);

  // 언덕 (먼 것 -> 가까운 것)
  function hills(color, baseY, amp, period, phase) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    for (let x = 0; x <= W; x += 20) {
      const s = 0.6 * Math.sin(x / period + phase) + 0.4 * Math.sin(x / (period * 0.47) + phase * 1.7);
      ctx.lineTo(x, baseY - amp * (0.5 + 0.5 * s));
    }
    ctx.lineTo(W, GROUND_Y);
    ctx.closePath();
    ctx.fill();
  }
  hills('#a3d48e', 500, 110, 170, 0.6);
  hills('#7fbf68', 560, 70, 110, 2.1);

  // 지면: 흙 + 풀 띠
  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
  for (let i = 0; i < 48; i++) {
    ctx.fillRect((i * 97) % W, GROUND_Y + 28 + (i * 53) % 70, 7, 3);
  }
  ctx.fillStyle = '#5fb043';
  ctx.fillRect(0, GROUND_Y, W, 14);
  ctx.fillStyle = '#4a9333';
  ctx.fillRect(0, GROUND_Y + 12, W, 4);
  ctx.fillStyle = '#6cc24e';
  for (let x = 4; x < W; x += 22) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND_Y + 2);
    ctx.lineTo(x + 5, GROUND_Y - 6);
    ctx.lineTo(x + 10, GROUND_Y + 2);
    ctx.fill();
  }
}

// 원이면 arc, 아니면 body.vertices 폴리곤.
// body.vertices는 이미 회전이 반영된 월드 좌표이므로 폴리곤에는 ctx.rotate를 걸지 않는다.
function drawBody(ctx, body) {
  const TAU = Math.PI * 2;

  if (body.circleRadius) {
    const r = body.circleRadius;
    const isPig = body.label === 'pig';
    ctx.save();
    // arc 자체는 회전과 무관하다. 얼굴 장식만 로컬 좌표로 그리기 위해 translate+rotate 한다.
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle || 0);
    ctx.lineWidth = 2;

    if (isPig) {
      // 귀 (머리 뒤)
      ctx.fillStyle = '#6bb83a';
      ctx.strokeStyle = '#3f7a1f';
      ctx.beginPath(); ctx.arc(-r * 0.55, -r * 0.78, r * 0.3, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.78, r * 0.3, 0, TAU); ctx.fill(); ctx.stroke();
    }

    ctx.fillStyle = isPig ? '#7ccc46' : '#d7322b';
    ctx.strokeStyle = isPig ? '#3f7a1f' : '#7d1612';
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();

    if (isPig) {
      // 코
      ctx.fillStyle = '#a6e27a';
      ctx.beginPath(); ctx.ellipse(0, r * 0.25, r * 0.38, r * 0.27, 0, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2f5e17';
      ctx.beginPath(); ctx.ellipse(-r * 0.13, r * 0.25, r * 0.07, r * 0.11, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.13, r * 0.25, r * 0.07, r * 0.11, 0, 0, TAU); ctx.fill();
      // 눈 (새총 쪽을 본다)
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(-r * 0.4, -r * 0.22, r * 0.22, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.22, r * 0.22, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(-r * 0.47, -r * 0.2, r * 0.1, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.33, -r * 0.2, r * 0.1, 0, TAU); ctx.fill();
      // 피해를 입으면 멍
      if (body.maxHp && body.hp < body.maxHp) {
        ctx.fillStyle = 'rgba(70, 30, 90, 0.35)';
        ctx.beginPath(); ctx.arc(r * 0.45, r * 0.5, r * 0.22, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.arc(-r * 0.55, -r * 0.5, r * 0.14, 0, TAU); ctx.fill();
      }
    } else {
      // 배
      ctx.fillStyle = '#f1d3a8';
      ctx.beginPath(); ctx.arc(0, r * 0.3, r * 0.62, 0.15 * Math.PI, 0.85 * Math.PI); ctx.closePath(); ctx.fill();
      // 머리 깃
      ctx.fillStyle = '#a61e19';
      ctx.beginPath();
      ctx.moveTo(-r * 0.25, -r * 0.9); ctx.lineTo(-r * 0.05, -r * 1.38); ctx.lineTo(r * 0.12, -r * 0.93);
      ctx.closePath(); ctx.fill();
      // 눈
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(r * 0.12, -r * 0.2, r * 0.2, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.5, -r * 0.2, r * 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(r * 0.17, -r * 0.18, r * 0.09, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.18, r * 0.09, 0, TAU); ctx.fill();
      // 눈썹
      ctx.strokeStyle = '#111';
      ctx.lineWidth = Math.max(2, r * 0.14);
      ctx.beginPath(); ctx.moveTo(-r * 0.1, -r * 0.52); ctx.lineTo(r * 0.3, -r * 0.34); ctx.lineTo(r * 0.72, -r * 0.52); ctx.stroke();
      // 부리
      ctx.fillStyle = '#f5b82e';
      ctx.strokeStyle = '#8a5a00';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(r * 0.5, 0); ctx.lineTo(r * 1.12, r * 0.15); ctx.lineTo(r * 0.5, r * 0.34); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    return;
  }

  const v = body.vertices;
  if (!v || v.length < 3) return;
  const lerp = function (a, b, t) { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; };

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(v[0].x, v[0].y);
  for (let i = 1; i < v.length; i++) ctx.lineTo(v[i].x, v[i].y);
  ctx.closePath();
  ctx.fillStyle = body.color || '#999';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.stroke();

  // 재질 표식 (모두 월드 좌표 vertices 사이 보간이라 회전을 따로 걸지 않는다)
  if (v.length === 4) {
    const e01 = Math.hypot(v[1].x - v[0].x, v[1].y - v[0].y);
    const e12 = Math.hypot(v[2].x - v[1].x, v[2].y - v[1].y);
    const long01 = e01 >= e12;
    ctx.lineWidth = 1.5;
    if (body.mat === 'wood') {
      ctx.strokeStyle = 'rgba(95, 52, 12, 0.35)';
      const ts = [0.33, 0.66];
      for (let k = 0; k < ts.length; k++) {
        const a = long01 ? lerp(v[0], v[3], ts[k]) : lerp(v[0], v[1], ts[k]);
        const c = long01 ? lerp(v[1], v[2], ts[k]) : lerp(v[3], v[2], ts[k]);
        const s = lerp(a, c, 0.08), t = lerp(a, c, 0.92);
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
      }
    } else if (body.mat === 'ice') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      const s = lerp(v[0], v[2], 0.12), t = lerp(v[0], v[2], 0.34);
      ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(t.x, t.y); ctx.stroke();
    } else if (body.mat === 'stone') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
      const s = lerp(v[0], v[2], 0.3), t = lerp(v[1], v[3], 0.68);
      ctx.beginPath(); ctx.arc(s.x, s.y, 2.5, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(t.x, t.y, 2, 0, TAU); ctx.fill();
    }
  }

  // 균열 (hp가 깎인 만큼 진해진다)
  if (body.maxHp && body.hp < body.maxHp && v.length === 4) {
    const dmg = Math.min(1, 1 - Math.max(0, body.hp) / body.maxHp);
    const c = body.position;
    ctx.strokeStyle = 'rgba(30, 15, 0, ' + (0.35 + 0.5 * dmg).toFixed(2) + ')';
    ctx.lineWidth = 1.5;
    const p0 = lerp(v[0], c, 0.15), p1 = lerp(c, v[3], 0.25), p2 = lerp(c, v[1], 0.2), p3 = lerp(v[2], c, 0.15);
    ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.stroke();
    if (dmg > 0.5) {
      const q0 = lerp(v[1], c, 0.2), q1 = lerp(c, v[2], 0.3), q2 = lerp(v[3], c, 0.25);
      ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); ctx.stroke();
    }
  }
  ctx.restore();
}

// 기둥 2개 + 고무줄 (장전 중이면 새까지 두 줄, 아니면 느슨한 한 줄)
function drawSling(ctx, game) {
  const back = { x: SLING.x + 16, y: SLING.y - 8 };
  const front = { x: SLING.x - 16, y: SLING.y - 8 };
  const fork = { x: SLING.x, y: SLING.y + 44 };

  ctx.save();
  ctx.lineCap = 'round';

  // 몸통 + 뒤 기둥
  ctx.strokeStyle = '#5a3416';
  ctx.lineWidth = 15;
  ctx.beginPath(); ctx.moveTo(SLING.x, GROUND_Y + 4); ctx.lineTo(fork.x, fork.y); ctx.stroke();
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(fork.x, fork.y); ctx.lineTo(back.x, back.y); ctx.stroke();

  // 고무줄
  const loaded = game.bird && game.bird.isStatic && game.phase === 'AIM';
  ctx.strokeStyle = '#3b1d0c';
  ctx.lineWidth = 5;
  if (loaded) {
    const p = game.bird.position;
    ctx.beginPath(); ctx.moveTo(back.x, back.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.fillStyle = '#3b1d0c';
    ctx.beginPath(); ctx.arc(p.x - 4, p.y, 9, 0, Math.PI * 2); ctx.fill();   // 가죽 주머니
    ctx.beginPath(); ctx.moveTo(front.x, front.y); ctx.lineTo(p.x, p.y); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(back.x, back.y);
    ctx.quadraticCurveTo(SLING.x, SLING.y + 8, front.x, front.y); ctx.stroke();
  }

  // 앞 기둥
  ctx.strokeStyle = '#6b3e1f';
  ctx.lineWidth = 11;
  ctx.beginPath(); ctx.moveTo(fork.x, fork.y); ctx.lineTo(front.x, front.y); ctx.stroke();
  ctx.restore();
}

// 궤적 미리보기 점 (뒤로 갈수록 작고 옅게)
function drawTrajectory(ctx, points) {
  ctx.save();
  for (let i = 0; i < points.length; i++) {
    const r = Math.max(1.6, 4.2 - i * 0.09);
    ctx.fillStyle = 'rgba(255, 255, 255, ' + Math.max(0.3, 0.95 - i * 0.022).toFixed(2) + ')';
    ctx.beginPath(); ctx.arc(points[i].x, points[i].y, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// 파편 (수명 비율로 투명해진다)
function drawParticles(ctx, game) {
  const list = game.particles;
  ctx.save();
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.maxLife));
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
    ctx.restore();
  }
  ctx.restore();
}

// Matter 전역이 없을 때: 배경 위에 원인 문구
function drawLoadError(ctx) {
  ctx.clearRect(0, 0, W, H);
  drawBackground(ctx);
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, H / 2 - 90, W, 180);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('physics library not loaded', W / 2, H / 2 - 24);
  ctx.font = '20px sans-serif';
  ctx.fillText('Matter.js 0.19.0을 CDN에서 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침하세요.', W / 2, H / 2 + 32);
  ctx.restore();
}
