(function() {
  'use strict';

  const C = window.AB.C;
  let canvas = null;
  let ctx = null;

  const Render = {
    init(c) {
      canvas = c;
      canvas.width = C.W;
      canvas.height = C.H;
      ctx = canvas.getContext('2d');
    },

    draw(view) {
      // 1. 하늘 - 세로 그라디언트
      const skyGrad = ctx.createLinearGradient(0, 0, 0, C.H);
      skyGrad.addColorStop(0, '#7ec8f0');
      skyGrad.addColorStop(1, '#cfeaf7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, C.W, C.H);

      // 2. 먼 언덕
      ctx.fillStyle = '#a9d68b';
      ctx.beginPath();
      ctx.moveTo(0, 500);
      ctx.quadraticCurveTo(320, 420, 640, 480);
      ctx.quadraticCurveTo(960, 540, 1280, 460);
      ctx.lineTo(1280, 720);
      ctx.lineTo(0, 720);
      ctx.fill();

      // 3. 지면
      ctx.fillStyle = '#7bbf5a';
      ctx.fillRect(0, C.GROUND_Y, C.W, C.H - C.GROUND_Y);
      ctx.strokeStyle = '#5f9e42';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, C.GROUND_Y);
      ctx.lineTo(C.W, C.GROUND_Y);
      ctx.stroke();

      // 4. terrain
      view.bodies.forEach(body => {
        if (body.label === 'ground' && body.position.x !== 640) {
          drawRect(body, '#7bbf5a', '#5f9e42', 2);
        }
      });

      // 5. 새총 뒤쪽 기둥
      ctx.strokeStyle = '#6b4525';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(C.SLING.x, C.SLING.forkBottom);
      ctx.lineTo(C.SLING.x, C.SLING.y);
      ctx.stroke();

      // 새총 갈래
      ctx.beginPath();
      ctx.moveTo(C.SLING.x - 14, C.SLING.y);
      ctx.lineTo(C.SLING.x - 14, C.SLING.y - 15);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(C.SLING.x + 14, C.SLING.y);
      ctx.lineTo(C.SLING.x + 14, C.SLING.y - 15);
      ctx.stroke();

      // 6. 고무줄 뒤줄 (오른쪽)
      if (view.drag && view.drag.active && view.bird) {
        ctx.strokeStyle = '#3b2a1a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(C.SLING.x + 14, C.SLING.y);
        ctx.lineTo(view.bird.position.x, view.bird.position.y);
        ctx.stroke();
      }

      // 7. 블록
      view.bodies.forEach(body => {
        const mat = C.MATERIALS[body.label];
        if (!mat) return;

        const alpha = mat.alpha || 1;
        const faceColor = mat.faceColor;
        const borderColor = mat.borderColor;

        drawRect(body, faceColor, borderColor, 2, alpha);

        // 데미지 표시
        if (body.hp && body.maxHp) {
          const ratio = body.hp / body.maxHp;
          if (ratio < 0.6) {
            drawCrack(body, 1, '#666');
          }
          if (ratio < 0.3) {
            drawCrack(body, 2, '#333');
          }
        }
      });

      // 8. 돼지
      view.bodies.forEach(body => {
        if (body.label === 'pig') {
          drawPig(body);
        }
      });

      // 9. 새
      if (view.bird) {
        drawBird(view.bird);
      }

      // 10. 고무줄 앞줄 (왼쪽)
      if (view.drag && view.drag.active && view.bird) {
        ctx.strokeStyle = '#3b2a1a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(C.SLING.x - 14, C.SLING.y);
        ctx.lineTo(view.bird.position.x, view.bird.position.y);
        ctx.stroke();
      }

      // 11. 파티클
      if (view.particles) {
        view.particles.forEach(p => {
          const alpha = Math.max(0, p.life / 600);
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
          ctx.globalAlpha = 1;
        });
      }

      // 12. 폭발 원
      if (view.blasts) {
        view.blasts.forEach(b => {
          const alpha = Math.max(0, b.life / 400);
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = '#ffaa00';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
      }

      // 13. 궤적 점
      if (view.trajectory && view.trajectory.length > 0) {
        view.trajectory.forEach((pt, i) => {
          const size = 3 * (1 - i / view.trajectory.length);
          ctx.globalAlpha = 0.75;
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
      }

      // 14. 당김 보조선
      if (view.drag && view.drag.active && view.bird) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(C.SLING.x, C.SLING.y);
        ctx.lineTo(view.bird.position.x, view.bird.position.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  };

  function drawRect(body, faceColor, borderColor, lineWidth, alpha = 1) {
    const { vertices, angle, position } = body;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);

    ctx.fillStyle = faceColor;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x - position.x, vertices[0].y - position.y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x - position.x, vertices[i].y - position.y);
    }
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = borderColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.restore();
  }

  function drawCrack(body, num, color) {
    const { position, angle } = body;
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    for (let i = 0; i < num; i++) {
      const sx = -15 + i * 15;
      const sy = -15;
      const ex = 15 + i * 15;
      const ey = 15;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPig(body) {
    const { position, angle } = body;
    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);

    const r = body.circleRadius;

    // 몸
    ctx.fillStyle = '#7ac943';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 배 밝은 타원
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.6, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // 눈
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.fill();

    // 동공
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-r * 0.4, -r * 0.3, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.3, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // 코
    ctx.fillStyle = '#ff9999';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.2, r * 0.3, r * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 콧구멍
    ctx.fillStyle = '#ff6666';
    ctx.beginPath();
    ctx.arc(-r * 0.15, r * 0.2, r * 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.15, r * 0.2, r * 0.08, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function drawBird(body) {
    const { position, angle, type } = body;
    const birdConfig = C.BIRDS[type];
    const r = birdConfig.radius;

    ctx.save();
    ctx.translate(position.x, position.y);
    ctx.rotate(angle);

    // 몸
    ctx.fillStyle = birdConfig.color;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // 배 밝은 원
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(0, r * 0.3, r * 0.5, 0, Math.PI * 2);
    ctx.fill();

    // 눈
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.2, r * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.2, r * 0.15, 0, Math.PI * 2);
    ctx.fill();

    // 부리 삼각형 (주황)
    ctx.fillStyle = '#ff9900';
    ctx.beginPath();
    ctx.moveTo(r + 5, -3);
    ctx.lineTo(r + 15, 0);
    ctx.lineTo(r + 5, 3);
    ctx.closePath();
    ctx.fill();

    // 눈썹 선
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(r * 0.1, -r * 0.5);
    ctx.lineTo(r * 0.5, -r * 0.6);
    ctx.stroke();

    ctx.restore();
  }

  window.AB = window.AB || {};
  window.AB.Render = Render;
})();
