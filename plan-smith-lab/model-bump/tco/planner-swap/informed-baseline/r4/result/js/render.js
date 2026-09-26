window.AB = window.AB || {};

(function() {
  'use strict';

  const C = AB.CONFIG;
  let canvas = null;
  let ctx = null;

  function init(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
  }

  function drawBird(x, y, type, angle) {
    const t = AB.BIRD_TYPES[type];
    const r = t.radius;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Body
    ctx.fillStyle = t.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Belly
    let bellyColor;
    if (type === 'red') bellyColor = '#F4D6C0';
    else if (type === 'yellow') bellyColor = '#FFF1B8';
    else bellyColor = '#555555';

    ctx.fillStyle = bellyColor;
    ctx.beginPath();
    ctx.ellipse(0, 0.35 * r, 0.55 * r, 0.35 * r, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(0.2 * r, -0.2 * r, 0.2 * r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.55 * r, -0.2 * r, 0.2 * r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(0.2 * r + 0.05 * r, -0.2 * r, 0.09 * r, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0.55 * r + 0.05 * r, -0.2 * r, 0.09 * r, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrow
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0.05 * r, -0.45 * r);
    ctx.lineTo(0.7 * r, -0.3 * r);
    ctx.stroke();

    // Beak
    ctx.fillStyle = '#F29E1F';
    ctx.beginPath();
    ctx.moveTo(0.6 * r, 0);
    ctx.lineTo(1.05 * r, 0.15 * r);
    ctx.lineTo(0.6 * r, 0.3 * r);
    ctx.fill();

    // Black bird fuse
    if (type === 'black') {
      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(0.2 * r, -1.4 * r);
      ctx.stroke();

      ctx.fillStyle = '#FF8C1A';
      ctx.beginPath();
      ctx.arc(0.2 * r, -1.4 * r, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function draw() {
    const g = AB.Game;
    const MATERIALS = AB.MATERIALS;
    const PIG_TYPES = AB.PIG_TYPES;

    // Background
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 640);
    skyGrad.addColorStop(0, '#6EC6FF');
    skyGrad.addColorStop(1, '#D6F1FF');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, C.WORLD_W, C.WORLD_H);

    // Sun
    ctx.fillStyle = '#FFE680';
    ctx.beginPath();
    ctx.arc(1120, 110, 45, 0, Math.PI * 2);
    ctx.fill();

    // Hills
    ctx.fillStyle = '#9BD37A';
    ctx.beginPath();
    ctx.ellipse(300, 660, 420, 140, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#9BD37A';
    ctx.beginPath();
    ctx.ellipse(950, 670, 520, 160, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ground
    ctx.fillStyle = '#7A5230';
    ctx.fillRect(0, 640, C.WORLD_W, 80);

    ctx.fillStyle = '#5DBB3F';
    ctx.fillRect(0, 640, C.WORLD_W, 12);

    // Slingshot back
    ctx.fillStyle = '#6B3E1F';
    ctx.fillRect(212, 560, 16, 80);

    ctx.strokeStyle = '#6B3E1F';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(220, 565);
    ctx.lineTo(236, 500);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(220, 565);
    ctx.lineTo(204, 500);
    ctx.stroke();

    if (g.world === null) {
      return;
    }

    // Trail
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'white';
    for (let i = 0; i < g.trail.length; i++) {
      const pt = g.trail[i];
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Blocks
    for (let i = 0; i < g.world.bodies.length; i++) {
      const body = g.world.bodies[i];
      if (body.kind !== 'block') continue;

      const mat = MATERIALS[body.material];
      ctx.fillStyle = mat.fill;
      ctx.fillRect(body.x - body.w / 2, body.y - body.h / 2, body.w, body.h);
      ctx.strokeStyle = mat.stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(body.x - body.w / 2, body.y - body.h / 2, body.w, body.h);

      // Damage cracks
      const ratio = body.hp / body.maxHp;
      if (ratio < 0.66) {
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(body.x - 0.3 * body.w, body.y - 0.4 * body.h);
        ctx.lineTo(body.x + 0.1 * body.w, body.y);
        ctx.lineTo(body.x - 0.1 * body.w, body.y + 0.4 * body.h);
        ctx.stroke();
      }
      if (ratio < 0.33) {
        ctx.beginPath();
        ctx.moveTo(body.x + 0.3 * body.w, body.y - 0.4 * body.h);
        ctx.lineTo(body.x, body.y + 0.1 * body.h);
        ctx.lineTo(body.x + 0.25 * body.w, body.y + 0.45 * body.h);
        ctx.stroke();
      }

      // Ice highlight
      if (body.material === 'ice') {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(body.x - body.w / 2 + 2, body.y - body.h / 2 + 2);
        ctx.lineTo(body.x + body.w / 2 - 2, body.y - body.h / 2 + 2);
        ctx.stroke();
      }
    }

    // Pigs
    for (let i = 0; i < g.world.bodies.length; i++) {
      const body = g.world.bodies[i];
      if (body.kind !== 'pig') continue;

      const r = body.r;
      ctx.save();
      ctx.translate(body.x, body.y);
      ctx.rotate(body.angle);

      // Body
      ctx.fillStyle = '#7BC043';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4E8A2A';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Eyes
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-0.35 * r, -0.2 * r, 0.22 * r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0.35 * r, -0.2 * r, 0.22 * r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(-0.35 * r, -0.2 * r, 0.1 * r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0.35 * r, -0.2 * r, 0.1 * r, 0, Math.PI * 2);
      ctx.fill();

      // Snout
      ctx.fillStyle = '#9AD66B';
      ctx.beginPath();
      ctx.ellipse(0, 0.2 * r, 0.38 * r, 0.26 * r, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3E6B22';
      ctx.beginPath();
      ctx.arc(-0.12 * r, 0.2 * r, 0.06 * r, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0.12 * r, 0.2 * r, 0.06 * r, 0, Math.PI * 2);
      ctx.fill();

      // Bruise
      if (body.hp < body.maxHp * 0.5) {
        ctx.fillStyle = '#5A8F33';
        ctx.beginPath();
        ctx.arc(0.3 * r, -0.5 * r, 0.18 * r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Flying birds
    for (let i = 0; i < g.world.bodies.length; i++) {
      const body = g.world.bodies[i];
      if (body.kind !== 'bird') continue;

      drawBird(body.x, body.y, body.subtype, body.angle);
    }

    // Slingshot front rubber
    ctx.strokeStyle = '#3B1F0E';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    const pos = AB.Slingshot.getBirdPos();
    const type = g.getCurrentBirdType();

    ctx.beginPath();
    ctx.moveTo(236, 502);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // Bird on slingshot
    if (type !== null) {
      drawBird(pos.x, pos.y, type, 0);
    }

    // Slingshot front rubber line
    ctx.beginPath();
    ctx.moveTo(204, 502);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    // Queued birds
    let queueStart = (type !== null) ? 1 : 0;
    const queue = g.birdQueue.slice(queueStart);
    for (let k = 0; k < queue.length; k++) {
      const qtype = queue[k];
      const t = AB.BIRD_TYPES[qtype];
      const qx = 175 - 40 * k;
      const qy = C.GROUND_Y - t.radius;
      drawBird(qx, qy, qtype, 0);
    }

    // Trajectory prediction
    if (g.turnPhase === 'aiming') {
      const traj = AB.Slingshot.predict();
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'white';
      for (let k = 0; k < traj.length; k++) {
        const pt = traj[k];
        const r = Math.max(2, 4 - k * 0.07);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Effects
    AB.Effects.draw(ctx);

    // HUD
    ctx.save();
    ctx.font = 'bold 26px sans-serif';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;

    const levelName = AB.LEVELS[g.levelIndex].name;
    const scoreText = '점수 ' + g.score.toLocaleString('ko-KR');
    const pigText = '남은 돼지 ' + g.pigsAlive;
    const stageText = '스테이지 ' + (g.levelIndex + 1) + ' / 10  ' + levelName;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeText(stageText, 24, 44);
    ctx.fillText(stageText, 24, 44);
    ctx.strokeText(scoreText, 24, 80);
    ctx.fillText(scoreText, 24, 80);
    ctx.strokeText(pigText, 24, 116);
    ctx.fillText(pigText, 24, 116);

    // Tutorial message
    if (g.levelIndex === 0 && g.turnPhase === 'ready' && g.birdQueue.length === 3) {
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.strokeText('새를 뒤로 끌었다가 놓아서 발사하세요!', 640, 170);
      ctx.fillText('새를 뒤로 끌었다가 놓아서 발사하세요!', 640, 170);
    }

    // Ability hint
    if (type === 'yellow') {
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.strokeText('노란 새: 날아가는 중 화면을 클릭하면 가속!', 24, 700);
      ctx.fillText('노란 새: 날아가는 중 화면을 클릭하면 가속!', 24, 700);
    } else if (type === 'black') {
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.strokeText('검은 새: 날아가는 중 클릭하면 폭발! (부딪힌 뒤 1.5초 후 자동 폭발)', 24, 700);
      ctx.fillText('검은 새: 날아가는 중 클릭하면 폭발! (부딪힌 뒤 1.5초 후 자동 폭발)', 24, 700);
    }

    ctx.restore();
  }

  AB.Render = {
    init: init,
    draw: draw
  };
})();
