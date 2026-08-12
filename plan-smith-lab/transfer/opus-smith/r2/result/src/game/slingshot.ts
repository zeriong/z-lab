import { getLoadedBodies } from '../data/loader';
import type { CanvasRenderer } from '../render/canvas';
import type { BirdType } from '../data/schema';
import Body from 'matter-js/Build/Body';
import Bodies from 'matter-js/Build/Bodies';
import World from 'matter-js/Build/World';
import { world } from '../physics/world';

export class SlingshotController {
  private x: number;
  private y: number;
  private maxDrag: number = 96;
  private currentBird: Body | null = null;
  private currentBirdType: BirdType = 'red';
  private isDragging: boolean = false;
  private dragX: number = 0;
  private dragY: number = 0;
  private trajectoryPoints: Array<[number, number]> = [];
  private lastTrajectory: Array<[number, number]> = [];
  private canvas: CanvasRenderer | null = null;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.currentBird) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);

    const dist = Math.sqrt((x - this.currentBird.position.x) ** 2 + (y - this.currentBird.position.y) ** 2);
    if (dist < 50) {
      this.isDragging = true;
      this.dragX = x;
      this.dragY = y;
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging || !this.currentBird) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);

    const dx = x - this.x;
    const dy = y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.maxDrag) {
      const angle = Math.atan2(dy, dx);
      this.dragX = this.x + Math.cos(angle) * this.maxDrag;
      this.dragY = this.y + Math.sin(angle) * this.maxDrag;
    } else {
      this.dragX = x;
      this.dragY = y;
    }

    // Update bird position while dragging
    Body.setPosition(this.currentBird, { x: this.dragX, y: this.dragY });

    // Calculate trajectory
    const vx = (this.x - this.dragX) * 0.02;
    const vy = (this.y - this.dragY) * 0.02;
    this.trajectoryPoints = this.predictTrajectory(this.x, this.y, vx, vy);
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isDragging || !this.currentBird) return;
    this.isDragging = false;

    const vx = (this.x - this.dragX) * 0.02;
    const vy = (this.y - this.dragY) * 0.02;

    Body.setStatic(this.currentBird, false);
    Body.setVelocity(this.currentBird, { x: vx, y: vy });

    this.lastTrajectory = this.trajectoryPoints;
    this.trajectoryPoints = [];
  }

  private predictTrajectory(x: number, y: number, vx: number, vy: number): Array<[number, number]> {
    const points: Array<[number, number]> = [];
    let px = x, py = y;
    const gravity = 0.01;
    let tvx = vx, tvy = vy;

    for (let i = 0; i < 10; i++) {
      points.push([px, py]);
      px += tvx;
      py += tvy;
      tvy += gravity;
    }

    return points;
  }

  resetBird(x: number, y: number, birdType: BirdType): void {
    if (this.currentBird) {
      World.remove(world, this.currentBird);
    }

    this.x = x;
    this.y = y;
    this.currentBirdType = birdType;
    this.currentBird = Bodies.circle(x, y, 6, { isStatic: true });
    World.add(world, this.currentBird);
    this.trajectoryPoints = [];
    this.isDragging = false;
  }

  render(canvas: CanvasRenderer): void {
    if (!this.currentBird) return;

    this.canvas = canvas;

    // Draw slingshot
    canvas.drawLine(this.x - 10, this.y - 20, this.x, this.y, '#8B4513', 3);
    canvas.drawLine(this.x + 10, this.y - 20, this.x, this.y, '#8B4513', 3);

    // Draw bird
    const colors: Record<BirdType, string> = {
      red: '#FF0000',
      bomb: '#000',
      speed: '#FFD700'
    };
    canvas.drawCircle(this.currentBird.position.x, this.currentBird.position.y, 6, colors[this.currentBirdType]);

    // Draw trajectory prediction
    for (const point of this.trajectoryPoints) {
      canvas.drawCircle(point[0], point[1], 2, '#CCC');
    }

    // Draw last trajectory
    if (this.lastTrajectory.length > 1) {
      for (let i = 0; i < this.lastTrajectory.length - 1; i++) {
        const p1 = this.lastTrajectory[i];
        const p2 = this.lastTrajectory[i + 1];
        canvas.drawLine(p1[0], p1[1], p2[0], p2[1], '#999', 1);
      }
    }
  }

  getCurrentBird(): Body | null {
    return this.currentBird;
  }

  getCurrentBirdType(): BirdType {
    return this.currentBirdType;
  }
}
