import { BIRDS } from '../../config/catalog';
import type { BirdKind } from '../../config/catalog';
import { el, formatScore, setVisible } from '../dom';

/**
 * HUD (§7.2). 게임 영역(레터박스 안쪽) 기준으로 배치한다.
 * 좌상단: STAGE N, 남은 새 아이콘 / 우상단: 점수, 그 오른쪽 끝에 일시정지 버튼.
 */
export class Hud {
  readonly root: HTMLElement;
  readonly pauseButton: HTMLButtonElement;
  private readonly stageLabel: HTMLElement;
  private readonly birds: HTMLElement;
  private readonly score: HTMLElement;
  private lastScore = -1;
  private lastBirds = '';

  constructor(onPause: () => void) {
    this.stageLabel = el('div', { class: 'hud-stage', testid: 'hud-stage' });
    this.birds = el('div', { class: 'hud-birds', testid: 'hud-birds', 'aria-label': '남은 새' });
    this.score = el('div', { class: 'hud-score', testid: 'hud-score', 'aria-live': 'polite' });
    this.pauseButton = el(
      'button',
      { type: 'button', class: 'btn-pause', testid: 'btn-pause', 'aria-label': '일시정지', title: '일시정지 (ESC)' },
      [el('span', { class: 'pause-icon', 'aria-hidden': 'true', text: '❚❚' })],
    );
    this.pauseButton.addEventListener('click', (e) => {
      e.stopPropagation();
      onPause();
    });
    // DOM 버튼 입력이 캔버스(드래그, 새 능력)로 새지 않게 한다.
    this.pauseButton.addEventListener('pointerdown', (e) => e.stopPropagation());

    this.root = el('div', { class: 'hud is-hidden', testid: 'hud' }, [
      el('div', { class: 'hud-left' }, [this.stageLabel, this.birds]),
      el('div', { class: 'hud-right' }, [this.score]),
      this.pauseButton,
    ]);
  }

  setStage(n: number, name: string): void {
    this.stageLabel.textContent = `STAGE ${n}`;
    this.stageLabel.title = name;
  }

  update(score: number, birds: readonly BirdKind[]): void {
    if (score !== this.lastScore) {
      this.lastScore = score;
      this.score.textContent = formatScore(score);
    }
    const key = birds.join(',');
    if (key !== this.lastBirds) {
      this.lastBirds = key;
      this.birds.replaceChildren(
        ...birds.map((k) => el('span', { class: `hud-bird hud-bird-${k}`, title: BIRDS[k].label, style: `background:${BIRDS[k].color}` })),
      );
    }
  }

  show(visible: boolean): void {
    setVisible(this.root, visible);
  }

  /** PLAYING일 때만 보인다 */
  showPause(visible: boolean): void {
    setVisible(this.pauseButton, visible);
    this.pauseButton.disabled = !visible;
  }

  reset(): void {
    this.lastScore = -1;
    this.lastBirds = '';
  }
}
