/**
 * In-game HUD (plan §7.3). Score at the top-left, pause button at the RIGHT
 * (requirement R3). The pause button is a real <button>: hit box, focus ring,
 * keyboard activation and aria-label come for free, and click reliability on
 * mobile is not left to a hand-rolled canvas hit test.
 *
 * The remaining-bird icons are drawn on the canvas instead (they belong
 * visually to the sling), see Renderer.drawBirdQueue.
 */
export class HUD {
  readonly el: HTMLDivElement;

  private readonly scoreEl: HTMLDivElement;
  private readonly levelEl: HTMLDivElement;
  private readonly pauseBtn: HTMLButtonElement;

  private displayedScore = 0;
  private targetScore = 0;

  constructor(onPause: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'hud';

    this.scoreEl = document.createElement('div');
    this.scoreEl.className = 'hud__score';
    this.scoreEl.textContent = '0';

    this.levelEl = document.createElement('div');
    this.levelEl.className = 'hud__level';

    this.pauseBtn = document.createElement('button');
    this.pauseBtn.type = 'button';
    this.pauseBtn.className = 'hud__pause';
    this.pauseBtn.setAttribute('aria-label', '일시정지');
    this.pauseBtn.title = '일시정지 (Esc)';
    this.pauseBtn.innerHTML = '<span class="hud__pause-bars" aria-hidden="true"></span>';
    this.pauseBtn.addEventListener('click', (event) => {
      event.preventDefault();
      onPause();
    });

    this.el.append(this.scoreEl, this.levelEl, this.pauseBtn);
  }

  setLevelLabel(text: string): void {
    this.levelEl.textContent = text;
  }

  setScore(value: number, immediate = false): void {
    this.targetScore = value;
    if (immediate) {
      this.displayedScore = value;
      this.scoreEl.textContent = this.format(value);
    }
  }

  /** Count-up animation; called once per rendered frame. */
  tick(): void {
    if (this.displayedScore === this.targetScore) return;
    const diff = this.targetScore - this.displayedScore;
    const stepSize = Math.max(1, Math.abs(diff) * 0.18);
    this.displayedScore =
      Math.abs(diff) <= stepSize
        ? this.targetScore
        : this.displayedScore + Math.sign(diff) * stepSize;
    this.scoreEl.textContent = this.format(Math.round(this.displayedScore));
  }

  /** Hidden while a result overlay is up (plan §3: PAUSED only from PLAYING). */
  setPauseVisible(visible: boolean): void {
    this.pauseBtn.hidden = !visible;
  }

  focusPauseButton(): void {
    this.pauseBtn.focus();
  }

  private format(value: number): string {
    return Math.round(value).toLocaleString('en-US');
  }
}
