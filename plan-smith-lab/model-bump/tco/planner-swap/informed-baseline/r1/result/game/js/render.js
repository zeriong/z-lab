(function() {
  window.AB = window.AB || {};

  const C = window.AB.CONFIG;
  let ctx = null;
  let canvas = null;

  function init(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
  }

  function drawBird(x, y, type, angle) {
    const t = window.AB.BIRD_TYPES[type];
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
    ctx.ellipse(0, r * 0.35, r * 0.55, r * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(r * 0.2, -r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.55, -r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(r * 0.25, -r * 0.2, r * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.6, -r * 0.2, r * 0.09, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrow
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.05, -r * 0.45);
    ctx.lineTo(r * 0.7, -r * 0.3);
    ctx.stroke();

    // Beak
    ctx.fillStyle = '#F29E1F';
    ctx.beginPath();
    ctx.moveTo(r * 0.6, 0);
    ctx.lineTo(r * 1.05, r * 0.15);
    ctx.lineTo(r * 0.6, r * 0.3);
    ctx.fill();

    // Fuse (black bird)
    if (type === 'black') {
      ctx.strokeStyle = '#8B5A2B';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.2, -r * 1.4);
      ctx.stroke();

      ctx.fillStyle = '#FF8C1A';
      ctx.beginPath();
      ctx.arc(r * 0.2, -r * 1.4, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function draw() {
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#6EC6FF';
    const grd = ctx.createLinearGradient(0, 0, 0, C.GROUND_Y);
    grd.addColorStop(0, '#6EC6FF');
    grd.addColorStop(1, '#D6F1FF');
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
    ctx.beginPath();
    ctx.ellipse(950, 670, 520, 160, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ground
    ctx.fillStyle = '#7A5230';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, C.WORLD_H - C.GROUND_Y);

    ctx.fillStyle = '#5DBB3F';
    ctx.fillRect(0, C.GROUND_Y, C.WORLD_W, 12);

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

    const g = window.AB.Game;

    // No more drawing if world doesn't exist
    if (!g.world) return;

    // Trail
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = 'white';
    for (const pt of g.trail) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Blocks
    for (const body of g.world.bodies) {
      if (body.kind !== 'block') continue;

      const m = window.AB.MATERIALS[body.material];
      ctx.fillStyle = m.fill;
      ctx.fillRect(body.x - body.w / 2, body.y - body.h / 2, body.w, body.h);
      ctx.strokeStyle = m.stroke;
      ctx.lineWidth = 2;
      ctx.strokeRect(body.x - body.w / 2, body.y - body.h / 2, body.w, body.h);

      // Damage cracks
      if (body.hp < body.maxHp) {
        const ratio = body.hp / body.maxHp;
        ctx.strokeStyle = 'rgba(0,0,0,0.45)';
        ctx.lineWidth = 1.5;

        if (ratio < 0.66) {
          ctx.beginPath();
          ctx.moveTo(body.x - body.w * 0.3, body.y - body.h * 0.4);
          ctx.lineTo(body.x + body.w * 0.1, body.y);
          ctx.lineTo(body.x - body.w * 0.1, body.y + body.h * 0.4);
          ctx.stroke();
        }

        if (ratio < 0.33) {
          ctx.beginPath();
          ctx.moveTo(body.x + body.w * 0.3, body.y - body.h * 0.4);
          ctx.lineTo(body.x, body.y + body.h * 0.1);
          ctx.lineTo(body.x + body.w * 0.25, body.y + body.h * 0.45);
          ctx.stroke();
        }
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
    for (const body of g.world.bodies) {
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
      ctx.arc(r * -0.35, -r * 0.2, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.35, -r * 0.2, r * 0.22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(r * -0.35, -r * 0.2, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.35, -r * 0.2, r * 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Snout
      ctx.fillStyle = '#9AD66B';
      ctx.beginPath();
      ctx.ellipse(0, r * 0.2, r * 0.38, r * 0.26, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#3E6B22';
      ctx.beginPath();
      ctx.arc(r * -0.12, r * 0.2, r * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(r * 0.12, r * 0.2, r * 0.06, 0, Math.PI * 2);
      ctx.fill();

      // Bruise
      if (body.hp < body.maxHp * 0.5) {
        ctx.fillStyle = '#5A8F33';
        ctx.beginPath();
        ctx.arc(r * 0.3, -r * 0.5, r * 0.18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Birds in flight
    for (const body of g.world.bodies) {
      if (body.kind !== 'bird') continue;
      drawBird(body.x, body.y, body.subtype, body.angle);
    }

    // Slingshot bird
    const birdType = g.getCurrentBirdType();
    if (birdType) {
      const pos = window.AB.Slingshot.getBirdPos();
      ctx.strokeStyle = '#3B1F0E';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(236, 502);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();

      drawBird(pos.x, pos.y, birdType, 0);

      ctx.beginPath();
      ctx.moveTo(204, 502);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    // Queue birds
    let queueList = [];
    if (birdType) {
      queueList = g.birdQueue.slice(1);
    } else {
      queueList = g.birdQueue.slice(0);
    }

    for (let k = 0; k < queueList.length; k++) {
      const type = queueList[k];
      const t = window.AB.BIRD_TYPES[type];
      const x = 175 - 40 * k;
      const y = C.GROUND_Y - t.radius;
      drawBird(x, y, type, 0);
    }

    // Trajectory prediction
    if (g.turnPhase === 'aiming') {
      const dots = window.AB.Slingshot.predict();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'white';
      for (let k = 0; k < dots.length; k++) {
        const r = Math.max(2, 4 - k * 0.07);
        ctx.beginPath();
        ctx.arc(dots[k].x, dots[k].y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Effects
    window.AB.Effects.draw(ctx);

    // HUD
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;

    const lvl = window.AB.LEVELS[g.levelIndex];
    const stageText = '스테이지 ' + (g.levelIndex + 1) + ' / 10  ' + lvl.name;
    ctx.strokeText(stageText, 24, 44);
    ctx.fillText(stageText, 24, 44);

    const scoreText = '점수 ' + g.score.toLocaleString('ko-KR');
    ctx.strokeText(scoreText, 24, 80);
    ctx.fillText(scoreText, 24, 80);

    const pigsText = '남은 돼지 ' + g.pigsAlive;
    ctx.strokeText(pigsText, 24, 116);
    ctx.fillText(pigsText, 24, 116);

    // Guide text
    if (g.levelIndex === 0 && g.turnPhase === 'ready' && g.birdQueue.length === 3) {
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText('새를 뒤로 끌었다가 놓아서 발사하세요!', C.WORLD_W / 2, 170);
      ctx.fillText('새를 뒤로 끌었다가 놓아서 발사하세요!', C.WORLD_W / 2, 170);
    }

    if (birdType === 'yellow') {
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.strokeText('노란 새: 날아가는 중 화면을 클릭하면 가속!', 24, 700);
      ctx.fillText('노란 새: 날아가는 중 화면을 클릭하면 가속!', 24, 700);
    }

    if (birdType === 'black') {
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'left';
      ctx.strokeText('검은 새: 날아가는 중 클릭하면 폭발! (부딪힌 뒤 1.5초 후 자동 폭발)', 24, 700);
      ctx.fillText('검은 새: 날아가는 중 클릭하면 폭발! (부딪힌 뒤 1.5초 후 자동 폭발)', 24, 700);
    }

    ctx.textAlign = 'left';
  }

  window.AB.Render = {
    init,
    draw
  };
})();
