// src/render.js
// Canvas 2D 렌더링 (§12 순서대로)
// 의존성: C, MAT, U

const R = {
  draw(ctx, game) {
    const { cam, world, birds, shot, currentBird } = game;
    const w = C.VIEW_W;
    const h = C.VIEW_H;

    // 1) 하늘: 세로 그라디언트
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#87ceeb');
    skyGrad.addColorStop(1, '#e6f4fb');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2) 원경 언덕: 패럴랙스
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const hillX = -(cam.x * 0.3) % (w + 200);
    ctx.beginPath();
    ctx.arc(hillX + 200, h - 80, 200, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hillX + 600, h - 100, 220, 0, Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(hillX + 1000, h - 90, 210, 0, Math.PI);
    ctx.fill();
    ctx.restore();

    // 3) 카메라 변환 시작
    ctx.save();
    ctx.translate(-cam.x, 0);

    // world가 없으면 여기서 반환 (메뉴 화면 등)
    if (!world) {
      ctx.restore();
      return;
    }

    // 4) 지면
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, C.WORLD_H - C.GROUND_Y);
    ctx.fillStyle = '#4f8f3a';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 6);

    // 5) 새총
    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(C.SLING_X - 6, C.SLING_Y, 12, 120);
    ctx.fillRect(C.SLING_X + 6, C.SLING_Y, 12, 120);

    // 고무줄 (DRAG 중일 때만)
    if (shot === 'DRAG' && currentBird) {
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(C.SLING_X - 6, C.SLING_Y);
      ctx.lineTo(currentBird.x, currentBird.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(C.SLING_X + 6, C.SLING_Y);
      ctx.lineTo(currentBird.x, currentBird.y);
      ctx.stroke();
    }

    // 6) 블록
    for (const b of world.bodies) {
      if (b.kind === 'ground') continue;
      if (b.kind === 'pig') continue;
      if (b.kind === 'bird') continue;

      ctx.save();
      const mat = MAT[b.mat];
      ctx.fillStyle = mat.color;

      if (b.shape === 'box') {
        ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);

        // 테두리
        ctx.strokeStyle = mat.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);

        // 균열 표현
        const hpRatio = b.hp / b.maxHp;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        if (hpRatio < 0.66) {
          ctx.beginPath();
          ctx.moveTo(b.x - b.hw, b.y - b.hh);
          ctx.lineTo(b.x + b.hw, b.y + b.hh);
          ctx.stroke();
        }
        if (hpRatio < 0.33) {
          ctx.beginPath();
          ctx.moveTo(b.x + b.hw, b.y - b.hh);
          ctx.lineTo(b.x - b.hw, b.y + b.hh);
          ctx.stroke();
        }
      }
      ctx.restore();
    }

    // 7) 돼지
    for (const b of world.bodies) {
      if (b.kind !== 'pig') continue;

      ctx.save();
      ctx.fillStyle = MAT.pig.color;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();

      // 눈
      const hpRatio = b.hp / b.maxHp;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(b.x - 5, b.y - 3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x + 5, b.y - 3, 4, 0, Math.PI * 2);
      ctx.fill();

      // 눈동자 또는 X
      if (hpRatio > 0.3) {
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(b.x - 5, b.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(b.x + 5, b.y - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // X 형태
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x - 7, b.y - 5);
        ctx.lineTo(b.x - 3, b.y - 1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.x - 3, b.y - 5);
        ctx.lineTo(b.x - 7, b.y - 1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.x + 3, b.y - 5);
        ctx.lineTo(b.x + 7, b.y - 1);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(b.x + 7, b.y - 5);
        ctx.lineTo(b.x + 3, b.y - 1);
        ctx.stroke();
      }

      // 코
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y + 2, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x - 4, b.y + 2, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(b.x + 4, b.y + 2, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 8) 새
    for (const b of world.bodies) {
      if (b.kind !== 'bird') continue;

      ctx.save();
      ctx.translate(b.x, b.y);
      if (b.angle) {
        ctx.rotate(b.angle);
      }

      // 새 몸통
      const birdInfo = BIRD[b.birdType] || BIRD.red;
      ctx.fillStyle = birdInfo.color;
      ctx.beginPath();
      ctx.arc(0, 0, birdInfo.radius, 0, Math.PI * 2);
      ctx.fill();

      // 부리
      ctx.fillStyle = '#f2a33c';
      ctx.beginPath();
      ctx.moveTo(birdInfo.radius, 0);
      ctx.lineTo(birdInfo.radius + 8, -6);
      ctx.lineTo(birdInfo.radius + 8, 6);
      ctx.closePath();
      ctx.fill();

      // 눈
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-birdInfo.radius / 3, -birdInfo.radius / 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(-birdInfo.radius / 3, -birdInfo.radius / 3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 9) 파티클
    for (const p of game.particles) {
      ctx.save();
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 10) 궤적 예측
    if (shot === 'DRAG' && currentBird) {
      R._drawTrajectory(ctx, currentBird);
    }

    ctx.restore();  // 11) 카메라 변환 종료
  },

  _drawTrajectory(ctx, bird) {
    // 현재 드래그 속도 계산
    const vx = (C.SLING_X - bird.x) * C.LAUNCH_POWER;
    const vy = (C.SLING_Y - bird.y) * C.LAUNCH_POWER;
    const vlen = Math.sqrt(vx * vx + vy * vy);
    const maxV = C.MAX_LAUNCH_SPEED;
    const v0x = vlen > maxV ? (vx / vlen) * maxV : vx;
    const v0y = vlen > maxV ? (vy / vlen) * maxV : vy;

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let k = 1; k <= C.TRAJ_POINTS; k++) {
      const t = k * C.TRAJ_STEP;
      const px = bird.x + v0x * t;
      const py = bird.y + v0y * t + 0.5 * C.GRAVITY * t * t;

      if (py > C.GROUND_Y) break;

      const alpha = 0.85 * (1 - k / C.TRAJ_POINTS) + 0.1;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
};
