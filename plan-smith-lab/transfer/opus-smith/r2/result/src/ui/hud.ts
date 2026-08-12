import type { CanvasRenderer } from '../render/canvas';

export class HUD {
  private canvas: CanvasRenderer;
  private birdsRemaining: HTMLElement;
  private scoreDisplay: HTMLElement;
  private pauseBtn: HTMLElement;
  private hudElement: HTMLElement;
  private currentScore: number = 0;
  private displayedScore: number = 0;
  private birds: number = 0;
  private usedBirds: number = 0;
  private onPauseClick: (() => void) | null = null;

  constructor(canvas: CanvasRenderer) {
    this.canvas = canvas;
    this.birdsRemaining = document.getElementById('birdsRemaining')!;
    this.scoreDisplay = document.getElementById('scoreDisplay')!;
    this.pauseBtn = document.getElementById('pauseBtn')!;
    this.hudElement = document.getElementById('hud')!;
    this.pauseBtn.addEventListener('click', () => this.onPauseClick?.());
  }

  show(): void {
    this.hudElement.style.display = 'flex';
  }

  hide(): void {
    this.hudElement.style.display = 'none';
  }

  setBirds(total: number): void {
    this.birds = total;
    this.usedBirds = 0;
    this.updateBirdsDisplay();
  }

  useBird(): void {
    if (this.usedBirds < this.birds) {
      this.usedBirds++;
      this.updateBirdsDisplay();
    }
  }

  private updateBirdsDisplay(): void {
    this.birdsRemaining.innerHTML = '';
    for (let i = 0; i < this.birds; i++) {
      const bird = document.createElement('div');
      bird.className = 'bird-icon';
      if (i < this.usedBirds) {
        bird.classList.add('used');
      }
      bird.textContent = '🐦';
      this.birdsRemaining.appendChild(bird);
    }
  }

  setScore(score: number): void {
    this.currentScore = score;
  }

  update(dt: number): void {
    // Animate score rollup
    const diff = this.currentScore - this.displayedScore;
    if (diff > 0) {
      const increment = Math.ceil(diff * (dt / 300)); // Rollup over 300ms
      this.displayedScore = Math.min(this.displayedScore + increment, this.currentScore);
    }
    this.scoreDisplay.textContent = `Score: ${this.displayedScore}`;
  }

  setPauseCallback(callback: () => void): void {
    this.onPauseClick = callback;
  }

  getRemainingBirds(): number {
    return this.birds - this.usedBirds;
  }
}
