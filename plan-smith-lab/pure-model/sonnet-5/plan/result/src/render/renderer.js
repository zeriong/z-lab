import { MATERIALS } from '../physics/materials.js';
import { BIRD_RADIUS, CANVAS_WIDTH, CANVAS_HEIGHT } from '../config.js';

/**
 * 계획서 §5-1 background 필드에 대응하는 시각 테마. 요구사항이 요구하지 않는 세부 에셋은 배제하고
 * 색상 조합만으로 스테이지 간 시각적 변주를 표현한다(§5-1 필드 최소 원칙).
 */
const BACKGROUND_THEMES = {
  hill: { sky: '#87ceeb', ground: '#4a7c3a' },
  desert: { sky: '#f4d9a0', ground: '#c9a35a' },
  ice: { sky: '#dff3fb', ground: '#8fc9de' },
  cave: { sky: '#3a3a4a', ground: '#5a5248' },
};

/**
 * canvas 2D 렌더러 생성. Matter의 내장 Render 모듈은 사용하지 않는다(§1-2 — 최종 빌드 미사용).
 * @param {HTMLCanvasElement} canvas
 */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function clear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /** @param {string} background */
  function drawBackground(background) {
    const theme = BACKGROUND_THEMES[background] ?? BACKGROUND_THEMES.hill;
    ctx.fillStyle = theme.sky;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /** @param {number} groundY */
  function drawGround(groundY) {
    ctx.fillStyle = '#4a7c3a';
    ctx.fillRect(0, groundY, CANVAS_WIDTH, CANVAS_HEIGHT - groundY);
  }

  /** @param {Matter.Body} body */
  function drawBlock(body) {
    const plugin = body.plugin;
    const style = MATERIALS[plugin.material]?.render ?? { fill: '#999', stroke: '#555' };
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = style.fill;
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = 2;
    if (plugin.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, plugin.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(-plugin.width / 2, -plugin.height / 2, plugin.width, plugin.height);
      ctx.strokeRect(-plugin.width / 2, -plugin.height / 2, plugin.width, plugin.height);
    }
    ctx.restore();
  }

  /** @param {Matter.Body} body */
  function drawPig(body) {
    const radius = body.plugin?.radius ?? 18;
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = '#8bc34a';
    ctx.strokeStyle = '#4d7a22';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** @param {Matter.Body} body */
  function drawBird(body) {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = '#d64545';
    ctx.strokeStyle = '#7a1f1f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, BIRD_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  /** @param {{x:number,y:number}} anchor */
  function drawSlingshot(anchor) {
    ctx.strokeStyle = '#6b4226';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(anchor.x - 20, anchor.y + 60);
    ctx.lineTo(anchor.x, anchor.y);
    ctx.moveTo(anchor.x + 20, anchor.y + 60);
    ctx.lineTo(anchor.x, anchor.y);
    ctx.stroke();
  }

  /** @param {{x:number,y:number}[]} points */
  function drawTrajectory(points) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  return {
    ctx,
    clear,
    drawBackground,
    drawGround,
    drawBlock,
    drawPig,
    drawBird,
    drawSlingshot,
    drawTrajectory,
  };
}
