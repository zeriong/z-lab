import { Bird } from './entities/Bird';
import { PointerInput } from '../core/Input';

export interface SlingshotConfig {
  x: number;
  y: number;
  maxPull: number;
  power: number;
}

export class Slingshot {
  private config: SlingshotConfig;
  private currentBird: Bird | null = null;
  private isDragging: boolean = false;
  private pullX: number = 0;
  private pullY: number = 0;
  private dragStartX: number = 0;
  private dragStartY: number = 0;

  constructor(config: SlingshotConfig) {
    this.config = config;
  }

  setBird(bird: Bird | null) {
    this.currentBird = bird;
    if (bird) {
      // Position bird at slingshot
      const pb = bird.getPhysicsBody();
      if (pb) {
        const Matter = require('matter-js');
        Matter.Body.setPosition(pb.body, {
          x: this.config.x,
          y: this.config.y,
        });
        Matter.Body.setVelocity(pb.body, { x: 0, y: 0 });
        Matter.Body.setStatic(pb.body, true);
      }
    }
  }

  handlePointerDown(x: number, y: number): boolean {
    if (!this.currentBird) return false;

    const pos = this.currentBird.getPosition();
    const dx = x - pos.x;
    const dy = y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Hit radius of ~40px
    if (dist < 40) {
      this.isDragging = true;
      this.dragStartX = x;
      this.dragStartY = y;
      this.pullX = 0;
      this.pullY = 0;
      return true;
    }

    return false;
  }

  handlePointerMove(x: number, y: number) {
    if (!this.isDragging || !this.currentBird) return;

    // Calculate pull vector
    this.pullX = this.config.x - x;
    this.pullY = this.config.y - y;

    // Clamp to maxPull
    const pullMag = Math.sqrt(this.pullX * this.pullX + this.pullY * this.pullY);
    if (pullMag > this.config.maxPull) {
      const scale = this.config.maxPull / pullMag;
      this.pullX *= scale;
      this.pullY *= scale;
    }

    // Restrict angle to upper half (backward/upward only)
    if (this.pullY > 0) {
      this.pullY = 0;
    }
  }

  handlePointerUp(x: number, y: number): boolean {
    if (!this.isDragging || !this.currentBird) {
      this.isDragging = false;
      return false;
    }

    this.isDragging = false;

    // Check if pull is significant enough
    const pullMag = Math.sqrt(this.pullX * this.pullX + this.pullY * this.pullY);
    if (pullMag < 10) {
      // Cancel
      this.pullX = 0;
      this.pullY = 0;
      return false;
    }

    // Launch bird
    const vx = this.pullX * this.config.power;
    const vy = this.pullY * this.config.power;

    this.currentBird.launch(vx, vy);
    this.currentBird = null;

    return true;
  }

  cancel() {
    this.isDragging = false;
    this.pullX = 0;
    this.pullY = 0;
  }

  handleInput(input: PointerInput): boolean {
    if (input.type === 'down') {
      return this.handlePointerDown(input.x, input.y);
    } else if (input.type === 'move') {
      this.handlePointerMove(input.x, input.y);
      return this.isDragging;
    } else if (input.type === 'up' || input.type === 'cancel') {
      return this.handlePointerUp(input.x, input.y);
    }
    return false;
  }

  getPull(): { x: number; y: number } {
    return { x: this.pullX, y: this.pullY };
  }

  isDragging_(): boolean {
    return this.isDragging;
  }

  getConfig(): SlingshotConfig {
    return this.config;
  }

  getCurrentBird(): Bird | null {
    return this.currentBird;
  }
}
