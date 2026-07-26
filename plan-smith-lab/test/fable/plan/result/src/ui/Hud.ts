// 인게임 HUD: 좌측 정보(스테이지·점수·남은 새), 우측 상단 일시정지 버튼(요구사항).
export class Hud {
  private root: HTMLElement;
  private info: HTMLElement;
  private pauseBtn: HTMLButtonElement;

  constructor(parent: HTMLElement, onPause: () => void) {
    this.root = document.createElement('div');
    this.root.className = 'hud hidden';

    this.info = document.createElement('div');
    this.info.className = 'hud-info';
    this.root.appendChild(this.info);

    this.pauseBtn = document.createElement('button');
    this.pauseBtn.className = 'pause-btn';
    this.pauseBtn.textContent = '⏸';
    this.pauseBtn.setAttribute('aria-label', '일시정지');
    this.pauseBtn.addEventListener('click', onPause);
    this.root.appendChild(this.pauseBtn);

    parent.appendChild(this.root);
  }

  update(stageId: number, score: number, birds: number): void {
    this.info.innerHTML =
      `<span class="hud-stage">STAGE ${stageId}</span>` +
      `<span class="hud-score">${score.toLocaleString()}점</span>` +
      `<span class="hud-birds">🐦 ×${birds}</span>`;
  }

  show(): void {
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
