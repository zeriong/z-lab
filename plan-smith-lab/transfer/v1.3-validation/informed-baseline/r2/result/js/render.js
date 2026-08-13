(function() {
  const C = window.AB.C;
  let canvas = null;
  let ctx = null;

  const Render = {
    init(cvs) {
      canvas = cvs;
      canvas.width = C.W;
      canvas.height = C.H;
      ctx = canvas.getContext('2d');
    },

    draw(view) {
      // 1. Sky
      const skyGrad = ctx.createLinearGradient(0, 0, 0, C.H);
      skyGrad.addColorStop(0, '#7ec8f0');
      skyGrad.addColorStop(1, '#cfeaf7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, C.W, C.H);

      // 2. Far hills
      ctx.fillStyle = '#a9d68b';
      ctx.beginPath();
      ctx.moveTo(0, 500);
      ctx.quadraticCurveTo(320, 450, 640, 480);
      ctx.quadraticCurveTo(960, 510, C.W, 470);
      ctx.lineTo(C.W, C.H);
      ctx.lineTo(0, C.H);
      ctx.fill();

      // 3. Ground
      ctx.fillStyle = '#7bbf5a';
      ctx.fillRect(0, C.GROUND_Y, C.W, C.H - C.GROUND_Y);
      ctx.strokeStyle = '#5f9e42';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, C.GROUND_Y);
      ctx.lineTo(C.W, C.GROUND_Y);
      ctx.stroke();

      // 4. Terrain
      for (const body of view.bodies) {
        if (body.label === 'ground' && body.position.x !== 640) {
          drawRect(body, '#7bbf5a', '#5f9e42');
        }
      }

      // 5. Slingshot back pole
      ctx.strokeStyle = '#6b4525';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(C.SLING.x, C.SLING.forkBottom);
      ctx.lineTo(C.SLING.x, C.SLING.y);
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(C.SLING.x - 14, C.SLING.y);
      ctx.lineTo(C.SLING.x - 14, C.SLING.y - 20);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(C.SLING.x + 14, C.SLING.y);
      ctx.lineTo(C.SLING.x + 14, C.SLING.y - 20);
      ctx.stroke();

      // 6. Back rubber band
      if (view.drag && view.drag.active) {
        ctx.strokeStyle = '#3b2a1a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(C.SLING.x + 14, C.SLING.y);
        ctx.lineTo(view.bird.position.x, view.bird.position.y);
        ctx.stroke();
      }

      // 7. Blocks
      for (const body of view.bodies) {
        if (body.label === 'wood' || body.label === 'ice' || body.label === 'stone') {
          const mat = C.MATERIALS[body.label];
          drawBlock(body, mat);
        }
      }

      // 8. Pigs
      for (const body of view.bodies) {
        if (body.label === 'pig') {
          drawPig(body);
        }
      }

      // 9. Birds
      for (const body of view.bodies) {
        if (body.label === 'bird') {
          drawBird(body);
        }
      }

      // 10. Front rubber band
      if (view.drag && view.drag.active) {
        ctx.strokeStyle = '#3b2a1a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(C.SLING.x - 14, C.SLING.y);
        ctx.lineTo(view.bird.position.x, view.bird.position.y);
        ctx.stroke();
      }

      // 11. Particles
      for (const p of view.particles) {
        ctx.globalAlpha = p.life / 600;
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      // 12. Blast circles
      for (const blast of view.blasts) {
        ctx.globalAlpha = 1 - blast.life / 400;
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(blast.x, blast.y, blast.r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 13. Trajectory dots
      if (view.drag && view.drag.active && view.trajectory) {
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = 'white';
        for (let i = 0; i < view.trajectory.length; i++) {
          const scale = 1 - i / view.trajectory.length;
          const pt = view.trajectory[i];
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3 * scale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // 14. Drag line
      if (view.drag && view.drag.active) {
        ctx.strokeStyle = '#3b2a1a';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(C.SLING.x, C.SLING.y);
        ctx.lineTo(view.drag.x, view.drag.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  function drawBlock(body, mat) {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    const vertices = body.vertices;
    ctx.fillStyle = mat.alpha ? `rgba(${hexToRgb(mat.fillColor).join(',')},${mat.alpha})` : mat.fillColor;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x - body.position.x, vertices[i].y - body.position.y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = mat.strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Damage cracks
    const dmgRatio = body.hp / body.maxHp;
    if (dmgRatio < 0.6) {
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-10, -15);
      ctx.lineTo(10, 15);
      ctx.stroke();
    }
    if (dmgRatio < 0.3) {
      ctx.beginPath();
      ctx.moveTo(10, -15);
      ctx.lineTo(-10, 15);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPig(body) {
    const x = body.position.x;
    const y = body.position.y;
    const r = body.circleRadius;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Body
    ctx.fillStyle = '#7ac943';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#a8d968';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.6, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.2, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.2, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Snout
    ctx.fillStyle = '#e8a8a8';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.35, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-r * 0.15, r * 0.3, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.15, r * 0.3, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#7ac943';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.6, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.6, r * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBird(body) {
    const x = body.position.x;
    const y = body.position.y;
    const r = body.circleRadius;
    const color = C.BIRDS[body.birdType].color;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(body.angle);

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Belly
    ctx.fillStyle = '#fff9e6';
    ctx.beginPath();
    ctx.arc(0, r * 0.2, r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.2, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // Beak (triangle)
    ctx.fillStyle = '#ff8800';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.1);
    ctx.lineTo(r * 1.2, 0);
    ctx.lineTo(r * 0.7, r * 0.1);
    ctx.closePath();
    ctx.fill();

    // Eyebrow
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.5);
    ctx.lineTo(r * 0.6, -r * 0.6);
    ctx.stroke();

    ctx.restore();
  }

  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  function drawRect(body, fill, stroke) {
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    const w = body.vertices[0].x - body.vertices[2].x;
    const h = body.vertices[0].y - body.vertices[2].y;
    ctx.fillRect(body.position.x - Math.abs(w) / 2, body.position.y - Math.abs(h) / 2, Math.abs(w), Math.abs(h));
    ctx.strokeRect(body.position.x - Math.abs(w) / 2, body.position.y - Math.abs(h) / 2, Math.abs(w), Math.abs(h));
  }

  window.AB.Render = Render;
})();
