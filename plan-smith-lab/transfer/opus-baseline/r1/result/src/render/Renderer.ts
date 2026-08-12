import Matter from 'matter-js';
import { Camera } from '../core/Camera';
import { Block } from '../game/entities/Block';
import { Pig } from '../game/entities/Pig';
import { Bird } from '../game/entities/Bird';
import { Ground } from '../game/entities/Ground';
import { Particle } from '../game/Level';
import { getMaterial } from '../physics/materials';

export class Renderer {
  private camera: Camera;

  constructor(private canvas: HTMLCanvasElement, camera: Camera) {
    this.camera = camera;
  }

  render(
    ctx: CanvasRenderingContext2D,
    bodies: Matter.Body[],
    entities: {
      blocks: Block[];
      pigs: Pig[];
      birds: Bird[];
      grounds: Ground[];
    },
    particles: Particle[],
    alpha: number
  ) {
    // Draw backgrounds
    this.drawBackground(ctx);

    // Draw grounds
    entities.grounds.forEach((ground) => this.drawGround(ctx, ground));

    // Draw blocks
    entities.blocks.forEach((block) => this.drawBlock(ctx, block));

    // Draw pigs
    entities.pigs.forEach((pig) => this.drawPig(ctx, pig));

    // Draw birds
    entities.birds.forEach((bird) => this.drawBird(ctx, bird));

    // Draw particles
    particles.forEach((particle) => this.drawParticle(ctx, particle));
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, 1280, 720);

    // Simple gradient overlay
    const grad = ctx.createLinearGradient(0, 0, 0, 720);
    grad.addColorStop(0, 'rgba(200, 220, 255, 0.3)');
    grad.addColorStop(1, 'rgba(180, 200, 240, 0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);
  }

  private drawGround(ctx: CanvasRenderingContext2D, ground: Ground) {
    const pos = ground.getPosition();
    const size = ground.getSize();

    ctx.fillStyle = '#8b7355';
    ctx.fillRect(
      pos.x - size.w / 2,
      pos.y - size.h / 2,
      size.w,
      size.h
    );

    // Border
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      pos.x - size.w / 2,
      pos.y - size.h / 2,
      size.w,
      size.h
    );
  }

  private drawBlock(ctx: CanvasRenderingContext2D, block: Block) {
    const pos = block.getPosition();
    const size = block.getSize();
    const rotation = block.getRotation();
    const material = getMaterial(block.getType());

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rotation);

    if (size.r > 0) {
      // Circle block
      ctx.fillStyle = material.color;
      ctx.beginPath();
      ctx.arc(0, 0, size.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      // Rect block
      ctx.fillStyle = material.color;
      ctx.fillRect(-size.w / 2, -size.h / 2, size.w, size.h);

      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(-size.w / 2, -size.h / 2, size.w, size.h);
    }

    ctx.restore();
  }

  private drawPig(ctx: CanvasRenderingContext2D, pig: Pig) {
    const pos = pig.getPosition();
    const radius = pig.getRadius();

    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ff6f00';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#000';
    const eyeOffsetX = radius * 0.4;
    const eyeOffsetY = -radius * 0.2;
    ctx.fillRect(pos.x - eyeOffsetX - 2, pos.y + eyeOffsetY - 2, 4, 4);
    ctx.fillRect(pos.x + eyeOffsetX - 2, pos.y + eyeOffsetY - 2, 4, 4);
  }

  private drawBird(ctx: CanvasRenderingContext2D, bird: Bird) {
    const pos = bird.getPosition();
    const radius = bird.getRadius();

    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffb300';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Eye
    ctx.fillStyle = '#000';
    ctx.fillRect(pos.x + 3, pos.y - 2, 3, 3);

    // Beak
    ctx.fillStyle = '#ff6f00';
    ctx.beginPath();
    ctx.moveTo(pos.x + radius, pos.y);
    ctx.lineTo(pos.x + radius + 8, pos.y - 2);
    ctx.lineTo(pos.x + radius + 8, pos.y + 2);
    ctx.fill();
  }

  private drawParticle(ctx: CanvasRenderingContext2D, particle: Particle) {
    const alpha = particle.life / particle.maxLife;

    ctx.fillStyle = particle.color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
    ctx.fillRect(
      particle.x - particle.size / 2,
      particle.y - particle.size / 2,
      particle.size,
      particle.size
    );
  }
}
