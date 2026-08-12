export type OverlayType = 'menu' | 'select' | 'pause' | 'clear' | 'fail' | 'none';

export interface OverlayCallbacks {
  onStartGame?: () => void;
  onSelectStage?: (stageId: number) => void;
  onResume?: () => void;
  onRetry?: () => void;
  onMenuClick?: () => void;
  onNextStage?: () => void;
}

export class OverlayLayer {
  private container: HTMLDivElement;
  private currentOverlay: OverlayType = 'none';
  private callbacks: OverlayCallbacks = {};

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'overlay-layer';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: none;
      pointer-events: auto;
      z-index: 50;
    `;
    document.body.appendChild(this.container);
  }

  setCallbacks(callbacks: OverlayCallbacks): void {
    this.callbacks = callbacks;
  }

  showMenu(): void {
    this.currentOverlay = 'menu';
    this.container.innerHTML = `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      ">
        <h1 style="font-size: 48px; margin: 0 0 30px 0; color: #333;">Angry Birds</h1>
        <p style="font-size: 18px; color: #666; margin-bottom: 30px;">Click and drag to launch birds</p>
        <button id="start-btn" style="
          padding: 15px 40px;
          font-size: 20px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: background-color 0.2s;
        ">Start Game</button>
      </div>
    `;
    this.container.style.display = 'block';

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.hide();
        if (this.callbacks.onStartGame) this.callbacks.onStartGame();
      });
    }
  }

  showStageSelect(progress: Record<number, { unlocked: boolean; stars: number }>): void {
    this.currentOverlay = 'select';
    let gridHTML = '<div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px;">';

    for (let i = 1; i <= 10; i++) {
      const p = progress[i] || { unlocked: i === 1, stars: 0 };
      const locked = !p.unlocked;
      gridHTML += `
        <button id="stage-${i}" style="
          padding: 20px;
          background-color: ${locked ? '#ccc' : '#4CAF50'};
          color: white;
          border: none;
          border-radius: 10px;
          cursor: ${locked ? 'default' : 'pointer'};
          font-size: 18px;
          font-weight: bold;
          opacity: ${locked ? '0.5' : '1'};
          pointer-events: ${locked ? 'none' : 'auto'};
        ">
          ${i}<br/>${'⭐'.repeat(p.stars)}
        </button>
      `;
    }
    gridHTML += '</div>';

    this.container.innerHTML = `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 40px;
        border-radius: 20px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        max-width: 600px;
      ">
        <h2 style="margin-top: 0; color: #333;">Select Stage</h2>
        ${gridHTML}
      </div>
    `;
    this.container.style.display = 'block';

    for (let i = 1; i <= 10; i++) {
      const btn = document.getElementById(`stage-${i}`);
      if (btn && progress[i]?.unlocked) {
        btn.addEventListener('click', () => {
          this.hide();
          if (this.callbacks.onSelectStage) this.callbacks.onSelectStage(i);
        });
      }
    }
  }

  showPause(): void {
    this.currentOverlay = 'pause';
    this.container.innerHTML = `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      ">
        <h2 style="margin-top: 0; color: #333;">Paused</h2>
        <button id="resume-btn" style="
          display: block;
          width: 100%;
          padding: 15px;
          margin: 10px 0;
          font-size: 18px;
          background-color: #4CAF50;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
        ">Continue</button>
        <button id="retry-btn" style="
          display: block;
          width: 100%;
          padding: 15px;
          margin: 10px 0;
          font-size: 18px;
          background-color: #FF9800;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
        ">Retry</button>
        <button id="menu-btn" style="
          display: block;
          width: 100%;
          padding: 15px;
          margin: 10px 0;
          font-size: 18px;
          background-color: #2196F3;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
        ">Menu</button>
      </div>
    `;
    this.container.style.display = 'block';

    document.getElementById('resume-btn')?.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onResume) this.callbacks.onResume();
    });
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onRetry) this.callbacks.onRetry();
    });
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onMenuClick) this.callbacks.onMenuClick();
    });
  }

  showClear(score: number, stars: number, nextStageExists: boolean): void {
    this.currentOverlay = 'clear';
    this.container.innerHTML = `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      ">
        <h2 style="margin-top: 0; color: #4CAF50; font-size: 36px;">Clear!</h2>
        <p style="font-size: 24px; color: #333;">Score: ${score}</p>
        <p style="font-size: 36px; margin: 20px 0;">${'⭐'.repeat(stars)}</p>
        ${nextStageExists ? `
          <button id="next-btn" style="
            display: block;
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            font-size: 18px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
          ">Next Stage</button>
        ` : `
          <button id="next-btn" style="
            display: block;
            width: 100%;
            padding: 15px;
            margin: 10px 0;
            font-size: 18px;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
          ">Select Stage</button>
        `}
        <button id="retry-btn" style="
          display: block;
          width: 100%;
          padding: 15px;
          margin: 10px 0;
          font-size: 18px;
          background-color: #FF9800;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
        ">Retry</button>
      </div>
    `;
    this.container.style.display = 'block';

    document.getElementById('next-btn')?.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onNextStage) this.callbacks.onNextStage();
    });
    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onRetry) this.callbacks.onRetry();
    });
  }

  showFail(): void {
    this.currentOverlay = 'fail';
    this.container.innerHTML = `
      <div style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 40px;
        border-radius: 20px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      ">
        <h2 style="margin-top: 0; color: #f44336; font-size: 36px;">No Birds Left!</h2>
        <button id="retry-btn" style="
          display: block;
          width: 100%;
          padding: 15px;
          margin: 10px 0;
          font-size: 18px;
          background-color: #FF9800;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
        ">Retry</button>
        <button id="menu-btn" style="
          display: block;
          width: 100%;
          padding: 15px;
          margin: 10px 0;
          font-size: 18px;
          background-color: #2196F3;
          color: white;
          border: none;
          border-radius: 10px;
          cursor: pointer;
        ">Menu</button>
      </div>
    `;
    this.container.style.display = 'block';

    document.getElementById('retry-btn')?.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onRetry) this.callbacks.onRetry();
    });
    document.getElementById('menu-btn')?.addEventListener('click', () => {
      this.hide();
      if (this.callbacks.onMenuClick) this.callbacks.onMenuClick();
    });
  }

  hide(): void {
    this.container.style.display = 'none';
    this.currentOverlay = 'none';
  }

  getCurrentOverlay(): OverlayType {
    return this.currentOverlay;
  }
}
