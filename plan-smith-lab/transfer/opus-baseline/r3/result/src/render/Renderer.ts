import { Level } from '../game/Level';
import { Camera } from '../core/Camera';
import { Vector } from '../core/types';
import { ParticleSystem } from './Particles';
import { drawBird, drawPig, drawBlock, drawGround, drawParticle } from './shapes';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private particles: ParticleSystem;

  constructor(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
    this.ctx = ctx;
    this.canvas = canvas;
    this.particles = new ParticleSystem();
  }

  render(level: Level, camera: Camera): void {
    const ctx = this.ctx;

    // Draw ground
    level.getGround().forEach((ground) => {
      const screenPos = camera.worldToScreen({ x: 0, y: 640 });
      drawGround(ctx, screenPos, 1280, 80);
    });

    // Draw blocks
    level.getBlocks().forEach((block) => {
      const pos = block.getPosition();
      const screenPos = camera.worldToScreen(pos);
      const rotation = block.getRotation();
      drawBlock(ctx, block, screenPos, rotation);
    });

    // Draw pigs
    level.getPigs().forEach((pig) => {
      const pos = pig.getPosition();
      const screenPos = camera.worldToScreen(pos);
      drawPig(ctx, pig, screenPos);
    });

    // Draw slingshot
    this.drawSlingshot(level, camera);

    // Draw trajectory
    this.drawTrajectory(level, camera);

    // Draw particles
    this.particles.update(1 / 60);
    this.particles.getParticles().forEach((p) => {
      const screenPos = camera.worldToScreen(p.position);
      drawParticle(ctx, screenPos, p.size, p.color, p.life);
    });
  }

  private drawSlingshot(level: Level, camera: Camera): void {
    const slingshot = level.getSlingshot();
    const anchor = slingshot.getAnchor();
    const screenAnchor = camera.worldToScreen(anchor);

    const ctx = this.ctx;

    // Draw slingshot base
    ctx.fillStyle = '#654321';
    ctx.beginPath();
    ctx.arc(screenAnchor.x, screenAnchor.y, 12, 0, Math.PI * 2);
    ctx.fill();

    // Draw bands if dragging
    if (slingshot.isDraggingBird()) {
      const pull = slingshot.getPullVector();
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.5)';
      ctx.lineWidth = 3;

      const leftBand = {
        x: screenAnchor.x - 8,
        y: screenAnchor.y - 8,
      };
      const rightBand = {
        x: screenAnchor.x - 8,
        y: screenAnchor.y + 8,
      };
      const birdScreenPos = camera.worldToScreen({
        x: anchor.x - pull.x,
        y: anchor.y - pull.y,
      });

      ctx.beginPath();
      ctx.moveTo(leftBand.x, leftBand.y);
      ctx.lineTo(birdScreenPos.x, birdScreenPos.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightBand.x, rightBand.y);
      ctx.lineTo(birdScreenPos.x, birdScreenPos.y);
      ctx.stroke();
    }
  }

  private drawTrajectory(level: Level, camera: Camera): void {
    const trajectory = level.getTrajectory();
    if (trajectory.length === 0) return;

    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

    trajectory.forEach((point, i) => {
      const screenPos = camera.worldToScreen(point);
      const size = 2 - (i / trajectory.length) * 1;
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, size, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  addExplosion(pos: Vector): void {
    this.particles.addExplosion(pos, 12);
  }

  addDust(pos: Vector): void {
    this.particles.addDust(pos, 5);
  }

  clear(): void {
    this.particles.clear();
  }
}
