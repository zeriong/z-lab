// Canvas 2D 자체 드로잉 렌더러 — 물리 상태를 읽기만 한다(쓰기 금지).
// 파티클은 렌더 전용 장식이며 물리 결정성에 관여하지 않는다.

import { CONFIG } from './core/config.js';

const C = CONFIG;

// body.id 기반 결정적 의사난수(돌 반점 등 — 프레임마다 흔들리지 않게)
function seeded(n) {
  let s = n * 2654435761 % 2 ** 31;
  return () => (s = (s * 48271) % 2147483647) / 2147483647;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let particles = [];

  const clouds = [
    { x: 180, y: 100, s: 1.0 }, { x: 520, y: 70, s: 0.7 },
    { x: 860, y: 120, s: 1.2 }, { x: 1150, y: 60, s: 0.8 },
  ];

  function reset() { particles = []; }

  // ── 배경 ───────────────────────────────────────────
  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, C.WORLD.groundY);
    sky.addColorStop(0, '#5aa9d6');
    sky.addColorStop(0.65, '#a5d8f0');
    sky.addColorStop(1, '#d8f0fa');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, C.WORLD.width, C.WORLD.groundY);

    // 태양
    ctx.fillStyle = 'rgba(255, 236, 170, 0.9)';
    ctx.beginPath(); ctx.arc(1180, 80, 42, 0, Math.PI * 2); ctx.fill();

    // 구름
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const c of clouds) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 26 * c.s, 0, Math.PI * 2);
      ctx.arc(c.x + 30 * c.s, c.y - 8 * c.s, 20 * c.s, 0, Math.PI * 2);
      ctx.arc(c.x + 58 * c.s, c.y, 24 * c.s, 0, Math.PI * 2);
      ctx.fill();
    }

    // 원경 언덕
    ctx.fillStyle = '#9ccc65';
    ctx.beginPath();
    ctx.moveTo(0, C.WORLD.groundY);
    ctx.quadraticCurveTo(240, 520, 520, C.WORLD.groundY);
    ctx.quadraticCurveTo(760, 545, 1040, C.WORLD.groundY);
    ctx.closePath(); ctx.fill();

    // 지면
    ctx.fillStyle = '#8d6e4a';
    ctx.fillRect(0, C.WORLD.groundY, C.WORLD.width, C.WORLD.height - C.WORLD.groundY);
    ctx.fillStyle = '#7cb342';
    ctx.fillRect(0, C.WORLD.groundY, C.WORLD.width, 14);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(0, C.WORLD.groundY + 14, C.WORLD.width, 4);
  }

  // ── 새총 ───────────────────────────────────────────
  const slingBase = { x: C.SLING.x, y: C.WORLD.groundY };
  const tipL = { x: C.SLING.x - 17, y: C.SLING.y + 4 };
  const tipR = { x: C.SLING.x + 17, y: C.SLING.y + 4 };

  function drawSlingArm(tip) {
    ctx.strokeStyle = '#6d4c41';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(slingBase.x, slingBase.y - 6);
    ctx.quadraticCurveTo(slingBase.x, C.SLING.y + 60, tip.x, tip.y);
    ctx.stroke();
  }

  function drawBand(from, to) {
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  }

  // ── 궤적 프리뷰 (조준 중) — Matter 적분 상수와 동일하게 예측 ──
  function drawTrajectory(session) {
    const v = session.launchVelocityFromAim();
    if (!v || !session.currentBird) return;
    let px = session.currentBird.position.x, py = session.currentBird.position.y;
    let vx = v.x, vy = v.y;
    const g = 1 * 0.001 * C.DT_MS * C.DT_MS; // gravity.y * gravityScale * dt^2
    const fa = C.BIRD.frictionAir;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (let i = 1; i <= 110; i++) {
      vx *= (1 - fa);
      vy = vy * (1 - fa) + g;
      px += vx; py += vy;
      if (py > C.WORLD.groundY - 4 || px > C.WORLD.width + 40) break;
      if (i % 5 === 0) {
        const r = Math.max(1.6, 4.5 - i * 0.03);
        ctx.globalAlpha = Math.max(0.15, 1 - i / 110);
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── 바디 드로잉 ─────────────────────────────────────
  function drawBird(body, r) {
    const { x, y } = body.position;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);
    // 몸통
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#ff5f52');
    grad.addColorStop(1, '#d32f2f');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8e0000'; ctx.lineWidth = 2; ctx.stroke();
    // 배
    ctx.fillStyle = '#ffe0b2';
    ctx.beginPath(); ctx.arc(0, r * 0.45, r * 0.55, 0, Math.PI); ctx.fill();
    // 볏
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(-r * 0.15, -r * 0.9); ctx.quadraticCurveTo(-r * 0.5, -r * 1.6, -r * 0.05, -r * 1.25);
    ctx.quadraticCurveTo(r * 0.2, -r * 1.7, r * 0.35, -r * 1.0);
    ctx.closePath(); ctx.fill();
    // 눈
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(r * 0.3, -r * 0.25, r * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(r * 0.4, -r * 0.25, r * 0.13, 0, Math.PI * 2); ctx.fill();
    // 눈썹
    ctx.strokeStyle = '#5d1010'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(r * 0.05, -r * 0.62); ctx.lineTo(r * 0.62, -r * 0.42); ctx.stroke();
    // 부리
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.moveTo(r * 0.55, -r * 0.05); ctx.lineTo(r * 1.25, r * 0.12); ctx.lineTo(r * 0.5, r * 0.35);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e65100'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  function drawPig(body, g) {
    const r = g.r;
    const hurt = g.hp / g.maxHp;
    const { x, y } = body.position;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);
    // 귀
    ctx.fillStyle = '#7cb342';
    ctx.beginPath(); ctx.arc(-r * 0.55, -r * 0.8, r * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.8, r * 0.28, 0, Math.PI * 2); ctx.fill();
    // 얼굴
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#aed581');
    grad.addColorStop(1, hurt < 0.5 ? '#7a9e3f' : '#8bc34a');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#558b2f'; ctx.lineWidth = 2; ctx.stroke();
    // 눈
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(s * r * 0.42, -r * 0.32, r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#212121';
      if (hurt < 0.5) { // 부상: 찡그린 눈
        ctx.lineWidth = 2; ctx.strokeStyle = '#212121';
        ctx.beginPath();
        ctx.moveTo(s * r * 0.3, -r * 0.4); ctx.lineTo(s * r * 0.54, -r * 0.24);
        ctx.moveTo(s * r * 0.3, -r * 0.24); ctx.lineTo(s * r * 0.54, -r * 0.4);
        ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(s * r * 0.42, -r * 0.3, r * 0.09, 0, Math.PI * 2); ctx.fill();
      }
    }
    // 코
    ctx.fillStyle = '#9ccc65';
    ctx.beginPath(); ctx.ellipse(0, r * 0.18, r * 0.42, r * 0.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#558b2f'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#558b2f';
    ctx.beginPath(); ctx.arc(-r * 0.15, r * 0.18, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.15, r * 0.18, r * 0.07, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  const MAT_STYLE = {
    wood:  { fill: '#d29552', edge: '#8d5a24', dark: '#b07a3c' },
    glass: { fill: 'rgba(178, 226, 246, 0.62)', edge: 'rgba(88, 156, 190, 0.95)', dark: 'rgba(255,255,255,0.55)' },
    stone: { fill: '#a9a9b2', edge: '#6e6e78', dark: '#8e8e98' },
  };

  function drawBlock(body, g) {
    const st = MAT_STYLE[g.material];
    const { x, y } = body.position;
    const w = g.w, h = g.h;
    const ratio = Math.max(0, g.hp / g.maxHp);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);
    ctx.fillStyle = st.fill;
    ctx.fillRect(-w / 2, -h / 2, w, h);

    if (g.material === 'wood') {
      // 판자 줄
      ctx.strokeStyle = 'rgba(141,90,36,0.5)';
      ctx.lineWidth = 1.5;
      const long = Math.max(w, h), across = Math.min(w, h);
      const n = Math.max(2, Math.round(long / 34));
      for (let i = 1; i < n; i++) {
        const t = -long / 2 + (long / n) * i;
        ctx.beginPath();
        if (w >= h) { ctx.moveTo(t, -across / 2); ctx.lineTo(t, across / 2); }
        else { ctx.moveTo(-across / 2, t); ctx.lineTo(across / 2, t); }
        ctx.stroke();
      }
    } else if (g.material === 'stone') {
      const rnd = seeded(body.id);
      ctx.fillStyle = 'rgba(110,110,120,0.35)';
      for (let i = 0; i < Math.max(3, (w * h) / 900); i++) {
        ctx.beginPath();
        ctx.arc((rnd() - 0.5) * w * 0.8, (rnd() - 0.5) * h * 0.8, 1.5 + rnd() * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (g.material === 'glass') {
      ctx.strokeStyle = st.dark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.3, -h * 0.42); ctx.lineTo(w * 0.1, h * 0.42);
      ctx.stroke();
    }

    // 손상 크랙 (내구도 비율 기반)
    if (ratio < 0.66) {
      ctx.strokeStyle = g.material === 'glass' ? 'rgba(255,255,255,0.9)' : 'rgba(40,20,5,0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-w * 0.25, -h * 0.3); ctx.lineTo(0, 0); ctx.lineTo(-w * 0.15, h * 0.3);
      ctx.moveTo(0, 0); ctx.lineTo(w * 0.28, h * 0.12);
      ctx.stroke();
    }
    if (ratio < 0.33) {
      ctx.strokeStyle = g.material === 'glass' ? 'rgba(255,255,255,0.95)' : 'rgba(40,20,5,0.7)';
      ctx.beginPath();
      ctx.moveTo(w * 0.3, -h * 0.35); ctx.lineTo(w * 0.05, -h * 0.05); ctx.lineTo(w * 0.35, h * 0.3);
      ctx.moveTo(-w * 0.35, h * 0.05); ctx.lineTo(-w * 0.1, h * 0.25);
      ctx.stroke();
    }

    ctx.strokeStyle = st.edge;
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function drawPlatform(body, g) {
    const { x, y } = body.position;
    const w = g.w, h = g.h;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = '#795548';
    ctx.fillRect(-w / 2, -h / 2, w, Math.min(5, h * 0.35));
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  // ── 파티클 ─────────────────────────────────────────
  const MAT_PARTICLE = { wood: '#c98a4b', glass: '#bde3f5', stone: '#9e9ea8' };

  function spawnFx(fx) {
    if (fx.type === 'block-destroy') {
      const color = MAT_PARTICLE[fx.material] || '#ccc';
      const n = Math.min(16, 6 + Math.round((fx.w * fx.h) / 500));
      for (let i = 0; i < n; i++) {
        particles.push({
          x: fx.x, y: fx.y,
          vx: (Math.random() - 0.5) * 7, vy: -Math.random() * 6 - 1,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
          size: 3 + Math.random() * 5, color, shape: 'rect',
          life: 45, maxLife: 45,
        });
      }
    } else if (fx.type === 'pig-dead') {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        particles.push({
          x: fx.x, y: fx.y,
          vx: Math.cos(a) * (2 + Math.random() * 3), vy: Math.sin(a) * (2 + Math.random() * 3) - 2,
          size: 3 + Math.random() * 4, color: i % 3 ? '#8bc34a' : '#fff59d', shape: 'circle',
          life: 40, maxLife: 40,
        });
      }
      particles.push({ x: fx.x, y: fx.y, vx: 0, vy: -1.2, size: 16, color: 'star', shape: 'star', life: 36, maxLife: 36 });
    } else if (fx.type === 'launch') {
      for (let i = 0; i < 6; i++) {
        particles.push({
          x: fx.x, y: fx.y,
          vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3,
          size: 2 + Math.random() * 3, color: 'rgba(255,255,255,0.9)', shape: 'circle',
          life: 20, maxLife: 20,
        });
      }
    }
  }

  function updateParticles() {
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      p.vy += 0.25;
      if (p.rot != null) p.rot += p.vr;
      p.life--;
    }
    particles = particles.filter(p => p.life > 0 && p.y < C.WORLD.height + 40);
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      if (p.shape === 'star') {
        ctx.fillStyle = '#ffd54f';
        ctx.save(); ctx.translate(p.x, p.y);
        for (let i = 0; i < 5; i++) {
          ctx.rotate(Math.PI * 2 / 5);
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 0.35); ctx.lineTo(p.size * 0.12, -p.size * 0.1);
          ctx.lineTo(0, p.size * 0.05); ctx.lineTo(-p.size * 0.12, -p.size * 0.1);
          ctx.closePath(); ctx.fill();
        }
        ctx.restore();
      } else if (p.shape === 'rect') {
        ctx.fillStyle = p.color;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot || 0);
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  // ── 메인 드로우 ─────────────────────────────────────
  // advanceFx: 인게임 진행 중일 때만 파티클을 전진(일시정지 시 완전 정지 화면)
  function draw(session, { advanceFx = true } = {}) {
    ctx.clearRect(0, 0, C.WORLD.width, C.WORLD.height);
    drawBackground();

    if (!session) return;

    // 새총 뒤팔 + 뒤 고무줄
    drawSlingArm(tipR);
    const bird = session.currentBird;
    const birdOnSling = bird && session.birdPhase === 'loaded';
    if (birdOnSling) drawBand(tipR, bird.position);

    // 대기 중인 새들
    const queued = session.birdsLeft - (session.birdPhase === 'loaded' ? 1 : 0);
    for (let i = 0; i < queued; i++) {
      drawBird(
        { position: { x: 155 - i * 36, y: C.WORLD.groundY - C.BIRD.radius }, angle: 0 },
        C.BIRD.radius
      );
    }

    // 물리 바디들
    for (const body of session.allBodies()) {
      const g = body.plugin.g;
      if (!g) continue;
      switch (g.kind) {
        case 'block': drawBlock(body, g); break;
        case 'platform': drawPlatform(body, g); break;
        case 'pig': drawPig(body, g); break;
        case 'bird': drawBird(body, g.r); break;
        // ground는 배경에서 그림
      }
    }

    // 새총 앞 고무줄 + 앞팔
    if (birdOnSling) drawBand(tipL, bird.position);
    drawSlingArm(tipL);

    if (session.aiming) drawTrajectory(session);

    for (const fx of session.drainFx()) spawnFx(fx);
    if (advanceFx) updateParticles();
    drawParticles();
  }

  return { draw, reset };
}
