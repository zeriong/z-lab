export class HUDLayer {
  private container: HTMLDivElement;
  private scoreDisplay: HTMLDivElement;
  private birdsDisplay: HTMLDivElement;
  private pauseButton: HTMLButtonElement;
  private soundButton: HTMLButtonElement;
  private currentScore: number = 0;
  private targetScore: number = 0;
  private animatingScore: boolean = false;
  private onPauseClick: (() => void) | null = null;
  private onSoundToggle: ((enabled: boolean) => void) | null = null;

  constructor() {
    this.container = this.createContainer();
    this.scoreDisplay = this.createScoreDisplay();
    this.birdsDisplay = this.createBirdsDisplay();
    this.pauseButton = this.createPauseButton();
    this.soundButton = this.createSoundButton();

    this.container.appendChild(this.scoreDisplay);
    this.container.appendChild(this.birdsDisplay);
    this.container.appendChild(this.pauseButton);
    this.container.appendChild(this.soundButton);

    document.body.appendChild(this.container);
  }

  private createContainer(): HTMLDivElement {
    const div = document.createElement('div');
    div.id = 'hud-layer';
    div.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 100;
    `;
    return div;
  }

  private createScoreDisplay(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      font-size: 32px;
      font-weight: bold;
      color: #333;
      text-shadow: 2px 2px 4px rgba(255, 255, 255, 0.8);
      pointer-events: none;
    `;
    div.textContent = 'Score: 0';
    return div;
  }

  private createBirdsDisplay(): HTMLDivElement {
    const div = document.createElement('div');
    div.style.cssText = `
      position: absolute;
      top: 10px;
      left: 300px;
      font-size: 20px;
      color: #333;
      display: flex;
      gap: 5px;
      pointer-events: none;
    `;
    return div;
  }

  private createPauseButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background-color: #4CAF50;
      color: white;
      border: none;
      font-size: 24px;
      cursor: pointer;
      pointer-events: auto;
      z-index: 101;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: background-color 0.2s;
    `;
    btn.textContent = '⏸';
    btn.addEventListener('mouseenter', () => (btn.style.backgroundColor = '#45a049'));
    btn.addEventListener('mouseleave', () => (btn.style.backgroundColor = '#4CAF50'));
    btn.addEventListener('click', () => {
      if (this.onPauseClick) this.onPauseClick();
    });
    return btn;
  }

  private createSoundButton(): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.style.cssText = `
      position: absolute;
      top: 70px;
      right: 10px;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background-color: #2196F3;
      color: white;
      border: none;
      font-size: 24px;
      cursor: pointer;
      pointer-events: auto;
      z-index: 101;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: background-color 0.2s;
    `;
    btn.textContent = '🔊';
    btn.addEventListener('mouseenter', () => (btn.style.backgroundColor = '#0b7dda'));
    btn.addEventListener('mouseleave', () => (btn.style.backgroundColor = '#2196F3'));
    btn.addEventListener('click', () => {
      const isEnabled = btn.textContent === '🔊';
      btn.textContent = isEnabled ? '🔇' : '🔊';
      if (this.onSoundToggle) this.onSoundToggle(!isEnabled);
    });
    return btn;
  }

  updateScore(score: number, animateTo: boolean = true): void {
    this.targetScore = score;
    if (animateTo && !this.animatingScore && score > this.currentScore) {
      this.animateScore();
    } else {
      this.currentScore = score;
      this.scoreDisplay.textContent = `Score: ${Math.floor(this.currentScore)}`;
    }
  }

  private animateScore(): void {
    this.animatingScore = true;
    const startScore = this.currentScore;
    const diff = this.targetScore - startScore;
    const duration = 0.3; // 300ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      this.currentScore = startScore + diff * progress;
      this.scoreDisplay.textContent = `Score: ${Math.floor(this.currentScore)}`;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.animatingScore = false;
      }
    };

    animate();
  }

  updateBirds(remaining: number, total: number): void {
    this.birdsDisplay.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const icon = document.createElement('span');
      icon.textContent = '🐦';
      icon.style.opacity = i < remaining ? '1' : '0.3';
      this.birdsDisplay.appendChild(icon);
    }
  }

  setOnPauseClick(callback: () => void): void {
    this.onPauseClick = callback;
  }

  setOnSoundToggle(callback: (enabled: boolean) => void): void {
    this.onSoundToggle = callback;
  }

  setSoundButtonEnabled(enabled: boolean): void {
    this.soundButton.textContent = enabled ? '🔊' : '🔇';
  }

  hide(): void {
    this.container.style.display = 'none';
  }

  show(): void {
    this.container.style.display = 'block';
  }

  remove(): void {
    this.container.remove();
  }
}
