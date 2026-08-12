import { Vector } from '../core/types';
import { Bird } from './Bird';

export class Slingshot {
  private anchor: Vector;
  private maxPull: number;
  private power: number;
  private isDragging: boolean = false;
  private pullVector: Vector = { x: 0, y: 0 };
  private bird: Bird | null = null;

  constructor(x: number, y: number, maxPull: number, power: number) {
    this.anchor = { x, y };
    this.maxPull = maxPull;
    this.power = power;
  }

  setBird(bird: Bird): void {
    this.bird = bird;
    this.bird.setPosition(this.anchor.x, this.anchor.y);
  }

  startDrag(pos: Vector): boolean {
    if (!this.bird) return false;

    const dx = pos.x - this.bird.getPosition().x;
    const dy = pos.y - this.bird.getPosition().y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 40) {
      this.isDragging = true;
      return true;
    }
    return false;
  }

  updateDrag(pos: Vector): void {
    if (!this.isDragging || !this.bird) return;

    const dx = this.anchor.x - pos.x;
    const dy = this.anchor.y - pos.y;
    let length = Math.sqrt(dx * dx + dy * dy);

    // Limit max pull
    if (length > this.maxPull) {
      length = this.maxPull;
    }

    // Only allow pulling towards back-left (restrict angle)
    if (dx > 0) {
      this.pullVector = { x: dx, y: dy };
    } else {
      this.pullVector = { x: 0, y: 0 };
    }
  }

  fire(): { fired: boolean; velocity: Vector } {
    if (!this.isDragging || !this.bird) {
      return { fired: false, velocity: { x: 0, y: 0 } };
    }

    const velocity = {
      x: this.pullVector.x * this.power,
      y: this.pullVector.y * this.power,
    };

    this.isDragging = false;
    this.bird.setDynamic();
    this.bird.setVelocity(velocity.x, velocity.y);

    return { fired: true, velocity };
  }

  cancel(): void {
    if (!this.bird) return;
    this.isDragging = false;
    this.bird.setPosition(this.anchor.x, this.anchor.y);
    this.pullVector = { x: 0, y: 0 };
  }

  getPullVector(): Vector {
    return this.pullVector;
  }

  isDraggingBird(): boolean {
    return this.isDragging;
  }

  getAnchor(): Vector {
    return { ...this.anchor };
  }
}
