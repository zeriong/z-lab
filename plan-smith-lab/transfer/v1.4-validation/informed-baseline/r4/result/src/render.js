// Rendering
const R = {
  draw: (ctx, game) => {
    const w = C.VIEW_W;
    const h = C.VIEW_H;

    // 1) Sky: vertical gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#87ceeb');
    skyGrad.addColorStop(1, '#e6f4fb');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // 2) Parallax hills (outside camera transform)
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    const hillOffset = game.cam.x * 0.3;
    ctx.beginPath();
    ctx.arc(300 - hillOffset, 550, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(700 - hillOffset, 580, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1200 - hillOffset, 550, 140, 0, Math.PI * 2);
    ctx.fill();

    // 3) Apply camera transform
    ctx.save();
    ctx.translate(-game.cam.x, 0);

    // 4) Ground
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, C.WORLD_H - C.GROUND_Y);
    ctx.fillStyle = '#4f8f3a';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 6);

    // 5) Slingshot
    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(C.SLING_X - 6, C.SLING_Y, 12, C.GROUND_Y - C.SLING_Y);
    ctx.fillRect(C.SLING_X + 70 - 6, C.SLING_Y, 12, C.GROUND_Y - C.SLING_Y);

    if (game.shot === 'DRAG' && game.bird) {
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(C.SLING_X - 6, C.SLING_Y);
      ctx.lineTo(game.bird.x, game.bird.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(C.SLING_X + 70 + 6, C.SLING_Y);
      ctx.lineTo(game.bird.x, game.bird.y);
      ctx.stroke();
    }

    // 6) Blocks
    for (let b of game.world.bodies) {
      if (b.kind !== 'block') continue;
      if (b.shape === 'box') {
        ctx.fillStyle = MAT[b.mat].color;
        ctx.fillRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);
        ctx.strokeStyle = MAT[b.mat].border;
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x - b.hw, b.y - b.hh, b.hw * 2, b.hh * 2);

        // Cracks based on hp
        const ratio = b.hp / b.maxHp;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 2;
        if (ratio < 0.66) {
          ctx.beginPath();
          ctx.moveTo(b.x - b.hw, b.y - b.hh);
          ctx.lineTo(b.x + b.hw, b.y + b.hh);
          ctx.stroke();
        }
        if (ratio < 0.33) {
          ctx.beginPath();
          ctx.moveTo(b.x + b.hw, b.y - b.hh);
          ctx.lineTo(b.x - b.hw, b.y + b.hh);
          ctx.stroke();
        }
      }
    }

    // 7) Pigs
    for (let b of game.world.bodies) {
      if (b.kind !== 'pig') continue;
      const x = b.x;
      const y = b.y;

      // Body
      ctx.fillStyle = MAT.pig.color;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = MAT.pig.border;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Eyes
      const eyeSize = b.r * 0.3;
      const eyeY = y - b.r * 0.3;
      const ratio = b.hp / b.maxHp;

      if (ratio > 0.3) {
        // Normal eyes
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(x - b.r * 0.25, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + b.r * 0.25, eyeY, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x - b.r * 0.25, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + b.r * 0.25, eyeY, eyeSize * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Dead eyes (X)
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - b.r * 0.35, eyeY - eyeSize * 0.5);
        ctx.lineTo(x - b.r * 0.15, eyeY + eyeSize * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - b.r * 0.15, eyeY - eyeSize * 0.5);
        ctx.lineTo(x - b.r * 0.35, eyeY + eyeSize * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + b.r * 0.15, eyeY - eyeSize * 0.5);
        ctx.lineTo(x + b.r * 0.35, eyeY + eyeSize * 0.5);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + b.r * 0.35, eyeY - eyeSize * 0.5);
        ctx.lineTo(x + b.r * 0.15, eyeY + eyeSize * 0.5);
        ctx.stroke();
      }

      // Nose
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(x, y, b.r * 0.3, b.r * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x - b.r * 0.15, y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + b.r * 0.15, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 8) Birds
    for (let b of game.world.bodies) {
      if (b.kind !== 'bird') continue;
      const birdType = BIRD[b.type];
      const x = b.x;
      const y = b.y;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(b.angle);

      // Body
      ctx.fillStyle = birdType.color;
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Beak
      ctx.fillStyle = '#f8971e';
      ctx.beginPath();
      ctx.moveTo(b.r * 0.6, -b.r * 0.2);
      ctx.lineTo(b.r * 1.2, 0);
      ctx.lineTo(b.r * 0.6, b.r * 0.2);
      ctx.fill();

      // Eye
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-b.r * 0.2, -b.r * 0.25, b.r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(-b.r * 0.2, -b.r * 0.25, b.r * 0.15, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // 9) Particles
    for (let p of game.particles) {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 10) Trajectory prediction
    if (game.shot === 'DRAG' && game.bird) {
      const vx = (C.SLING_X - game.bird.x) * C.LAUNCH_POWER;
      const vy = (C.SLING_Y - game.bird.y) * C.LAUNCH_POWER;
      const speed = Math.sqrt(vx * vx + vy * vy);
      const cappedVx = (speed > C.MAX_LAUNCH_SPEED) ? vx * C.MAX_LAUNCH_SPEED / speed : vx;
      const cappedVy = (speed > C.MAX_LAUNCH_SPEED) ? vy * C.MAX_LAUNCH_SPEED / speed : vy;

      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let k = 1; k <= C.TRAJ_POINTS; k++) {
        const t = k * C.TRAJ_STEP;
        const px = game.bird.x + cappedVx * t;
        const py = game.bird.y + cappedVy * t + 0.5 * C.GRAVITY * t * t;
        if (py > C.GROUND_Y) break;
        const alpha = 0.85 * (1 - k / C.TRAJ_POINTS) + 0.1;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 11) Restore transform
    ctx.restore();
  }
};
