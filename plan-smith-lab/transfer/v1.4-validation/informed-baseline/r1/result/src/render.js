// Rendering (§12)
const R = {
  draw(ctx, game) {
    // 1) Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, C.VIEW_H);
    skyGrad.addColorStop(0, '#87ceeb');
    skyGrad.addColorStop(1, '#e6f4fb');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);

    // 2) Parallax hills
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    const hillX = game.cam.x * 0.3;
    for (let i = 0; i < 3; i++) {
      const x = hillX + i * 600 - 300;
      ctx.beginPath();
      ctx.arc(x, 450, 200, 0, Math.PI, true);
      ctx.fill();
    }

    // 3) Apply camera transform
    ctx.save();
    ctx.translate(-game.cam.x, 0);

    // 4) Ground
    ctx.fillStyle = '#6ab04c';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 120);
    ctx.fillStyle = '#4f8f3a';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 6);

    // 5) Slingshot
    ctx.fillStyle = '#7a4a1e';
    ctx.fillRect(C.SLING_X - 6, 500, 12, 120);
    if (game.shot === 'DRAG' || game.shot === 'FLYING') {
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 6;
      const bird = game.currentBird;
      if (bird) {
        ctx.beginPath();
        ctx.moveTo(C.SLING_X, 500);
        ctx.lineTo(bird.x, bird.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(C.SLING_X, 620);
        ctx.lineTo(bird.x, bird.y);
        ctx.stroke();
      }
    }

    // 6) Draw blocks
    for (let body of game.world.bodies) {
      if (body.kind !== 'block') continue;
      R._drawBlock(ctx, body);
    }

    // 7) Draw pigs
    for (let body of game.world.bodies) {
      if (body.kind !== 'pig') continue;
      R._drawPig(ctx, body);
    }

    // 8) Draw birds
    for (let body of game.world.bodies) {
      if (body.kind !== 'bird') continue;
      R._drawBird(ctx, body);
    }

    // Armed bird (not in world)
    if (game.shot === 'ARMED' || game.shot === 'DRAG') {
      const bird = game.currentBird;
      if (bird) R._drawBird(ctx, bird);
    }

    // 9) Particles
    for (let p of game.particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 10) Trajectory prediction
    if (game.shot === 'DRAG') {
      R._drawTrajectory(ctx, game);
    }

    // Restore
    ctx.restore();
  },

  _drawBlock(ctx, body) {
    const mat = MAT[body.mat];
    ctx.fillStyle = mat.color;
    ctx.fillRect(body.x - body.hw, body.y - body.hh, body.hw * 2, body.hh * 2);

    // Border
    ctx.strokeStyle = mat.border;
    ctx.lineWidth = 2;
    ctx.strokeRect(body.x - body.hw, body.y - body.hh, body.hw * 2, body.hh * 2);

    // Cracks
    const hpRatio = body.hp / body.maxHp;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    if (hpRatio < 0.66) {
      ctx.beginPath();
      ctx.moveTo(body.x - body.hw, body.y - body.hh);
      ctx.lineTo(body.x + body.hw, body.y + body.hh);
      ctx.stroke();
    }
    if (hpRatio < 0.33) {
      ctx.beginPath();
      ctx.moveTo(body.x + body.hw, body.y - body.hh);
      ctx.lineTo(body.x - body.hw, body.y + body.hh);
      ctx.stroke();
    }
  },

  _drawPig(ctx, body) {
    // Body
    ctx.fillStyle = MAT.pig.color;
    ctx.beginPath();
    ctx.arc(body.x, body.y, body.r, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    const hpRatio = body.hp / body.maxHp;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(body.x - 5, body.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(body.x + 5, body.y - 4, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000000';
    if (hpRatio > 0.2) {
      ctx.beginPath();
      ctx.arc(body.x - 5, body.y - 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(body.x + 5, body.y - 4, 1.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(body.x - 7, body.y - 6);
      ctx.lineTo(body.x - 3, body.y - 2);
      ctx.moveTo(body.x - 3, body.y - 6);
      ctx.lineTo(body.x - 7, body.y - 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(body.x + 3, body.y - 6);
      ctx.lineTo(body.x + 7, body.y - 2);
      ctx.moveTo(body.x + 7, body.y - 6);
      ctx.lineTo(body.x + 3, body.y - 2);
      ctx.stroke();
    }

    // Snout
    ctx.fillStyle = '#7fc855';
    ctx.beginPath();
    ctx.ellipse(body.x, body.y + 3, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(body.x - 2, body.y + 3, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(body.x + 2, body.y + 3, 1, 0, Math.PI * 2);
    ctx.fill();
  },

  _drawBird(ctx, body) {
    ctx.save();
    ctx.translate(body.x, body.y);
    ctx.rotate(body.angle);

    // Body
    const bird = BIRD[body.birdType] || BIRD.red;
    ctx.fillStyle = bird.color;
    ctx.beginPath();
    ctx.arc(0, 0, body.r, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(body.r * 0.4, -body.r * 0.2, body.r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(body.r * 0.4, -body.r * 0.2, body.r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#f4a460';
    ctx.beginPath();
    ctx.moveTo(body.r * 0.5, -body.r * 0.15);
    ctx.lineTo(body.r * 0.9, -body.r * 0.1);
    ctx.lineTo(body.r * 0.5, body.r * 0.15);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  },

  _drawTrajectory(ctx, game) {
    const bird = game.currentBird;
    if (!bird) return;

    const v0x = (C.SLING_X - bird.x) * C.LAUNCH_POWER;
    const v0y = (C.SLING_Y - bird.y) * C.LAUNCH_POWER;
    const speed = Math.sqrt(v0x * v0x + v0y * v0y);
    const clamped = speed > C.MAX_LAUNCH_SPEED;
    const scale = clamped ? C.MAX_LAUNCH_SPEED / speed : 1;

    for (let k = 1; k <= C.TRAJ_POINTS; k++) {
      const t = k * C.TRAJ_STEP;
      const px = bird.x + v0x * scale * t;
      const py = bird.y + v0y * scale * t + 0.5 * C.GRAVITY * t * t;

      if (py > C.GROUND_Y) break;

      const alpha = 0.85 * (1 - k / C.TRAJ_POINTS) + 0.1;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};
