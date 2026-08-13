(function() {
  'use strict';

  const C = window.AB.C;
  let canvas, ctx;

  window.AB.Render = {
    init(can) {
      canvas = can;
      canvas.width = C.W;
      canvas.height = C.H;
      ctx = canvas.getContext('2d');
    },

    draw(view) {
      // 1. 하늘
      const skyGrad = ctx.createLinearGradient(0, 0, 0, C.H);
      skyGrad.addColorStop(0, '#7ec8f0');
      skyGrad.addColorStop(1, '#cfeaf7');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, C.W, C.H);

      // 2. 먼 언덕
      ctx.fillStyle = '#a9d68b';
      ctx.beginPath();
      ctx.moveTo(0, 400);
      ctx.quadraticCurveTo(300, 350, 600, 380);
      ctx.quadraticCurveTo(900, 320, 1280, 380);
      ctx.lineTo(1280, C.H);
      ctx.lineTo(0, C.H);
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
      view.bodies.filter(b => b.isStatic && b.label === 'ground' && b.position.y < 660).forEach(b => {
        ctx.fillStyle = '#7bbf5a';
        ctx.fillRect(b.position.x - b.circleRadius || b.position.x - b.width / 2,
          b.position.y - (b.circleRadius || b.height / 2),
          b.width, b.height);
        ctx.strokeStyle = '#5f9e42';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.position.x - b.width / 2, b.position.y - b.height / 2, b.width, b.height);
      });

      // 5. 새총 뒤쪽 기둥
      ctx.strokeStyle = '#6b4525';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(C.SLING.x, C.GROUND_Y);
      ctx.lineTo(C.SLING.x, C.SLING.y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(C.SLING.x - 14, C.SLING.y);
      ctx.lineTo(C.SLING.x + 14, C.SLING.y);
      ctx.stroke();

      // 6. 고무줄 뒤줄 (드래그 중일 때)
      if (view.drag && view.drag.active && view.bird) {
        ctx.strokeStyle = '#3b2a1a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(C.SLING.x + 14, C.SLING.y);
        ctx.lineTo(view.bird.position.x, view.bird.position.y);
        ctx.stroke();
      }

      // 7. 블록
      view.bodies.filter(b => ['wood', 'ice', 'stone'].includes(b.label)).forEach(b => {
        this._drawBlock(b);
      });

      // 8. 돼지
      view.bodies.filter(b => b.label === 'pig').forEach(b => {
        this._drawPig(b);
      });

      // 9. 새
      if (view.bird) this._drawBird(view.bird);

      // 10. 고무줄 앞줄
      if (view.drag && view.drag.active && view.bird) {
        ctx.strokeStyle = '#3b2a1a';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(C.SLING.x - 14, C.SLING.y);
        ctx.lineTo(view.bird.position.x, view.bird.position.y);
        ctx.stroke();
      }

      // 11. 파티클
      view.particles.forEach(p => {
        ctx.globalAlpha = p.life / 600;
        ctx.fillStyle = p.color || '#ccc';
        if (p.type === 'box') {
          ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;

      // 12. 폭발 원
      view.blasts.forEach(b => {
        ctx.globalAlpha = b.life / 400;
        ctx.strokeStyle = '#ffaa00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.globalAlpha = 1;

      // 13. 궤적 점
      if (view.trajectory) {
        view.trajectory.forEach((pt, i) => {
          ctx.globalAlpha = 0.75 * (1 - i / view.trajectory.length);
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      // 14. 당김 보조선
      if (view.drag && view.drag.active && view.bird) {
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(C.SLING.x, C.SLING.y);
        ctx.lineTo(view.bird.position.x, view.bird.position.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    },

    _drawBlock(b) {
      const mat = C.MATERIALS[b.label];
      ctx.fillStyle = mat.faceColor;
      if (mat.alpha) ctx.globalAlpha = mat.alpha;
      ctx.beginPath();
      b.vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = mat.borderColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // 데미지 표시
      if (b.hp / b.maxHp < 0.3) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        const bounds = {
          minX: Math.min(...b.vertices.map(v => v.x)),
          maxX: Math.max(...b.vertices.map(v => v.x)),
          minY: Math.min(...b.vertices.map(v => v.y)),
          maxY: Math.max(...b.vertices.map(v => v.y))
        };
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.moveTo(bounds.minX + i * 4, bounds.maxY);
          ctx.lineTo(bounds.maxX, bounds.minY - i * 4);
          ctx.stroke();
        }
      } else if (b.hp / b.maxHp < 0.6) {
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1;
        const bounds = {
          minX: Math.min(...b.vertices.map(v => v.x)),
          maxX: Math.max(...b.vertices.map(v => v.x)),
          minY: Math.min(...b.vertices.map(v => v.y)),
          maxY: Math.max(...b.vertices.map(v => v.y))
        };
        ctx.beginPath();
        ctx.moveTo(bounds.minX, bounds.maxY);
        ctx.lineTo(bounds.maxX, bounds.minY);
        ctx.stroke();
      }
    },

    _drawPig(b) {
      const pos = b.position;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(b.angle);

      ctx.fillStyle = '#7ac943';
      ctx.beginPath();
      ctx.arc(0, 0, b.circleRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(-4, -2, 6, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-5, -3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5, -3, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(-5, -3, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(5, -3, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#c9856f';
      ctx.beginPath();
      ctx.ellipse(0, 2, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(-2, 2, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(2, 2, 1, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    },

    _drawBird(b) {
      const pos = b.position;
      const color = C.BIRDS[b.birdType].color;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(b.angle);

      const r = C.BIRDS[b.birdType].radius;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.3, r * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-r * 0.4, 0, r * 0.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(-r * 0.5, 0, r * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff9800';
      ctx.beginPath();
      ctx.moveTo(r * 0.7, -r * 0.3);
      ctx.lineTo(r * 0.7, r * 0.3);
      ctx.lineTo(r * 1.2, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.5);
      ctx.lineTo(-r * 0.8, -r * 0.8);
      ctx.stroke();

      ctx.restore();
    }
  };
})();
