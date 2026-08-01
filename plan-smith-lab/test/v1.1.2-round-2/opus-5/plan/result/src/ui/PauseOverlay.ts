import { button, el } from './dom';

/**
 * 일시정지 오버레이 (요구사항 3).
 * 우측 일시정지 버튼 클릭 → 이 오버레이 → "다시하기 / 메인으로"(+ 계속하기).
 */
export class PauseOverlay {
  readonly root: HTMLDivElement;
  onResume: () => void = () => {};
  onRestart: () => void = () => {};
  onMain: () => void = () => {};

  constructor(parent: HTMLElement) {
    this.root = el('div', 'overlay');
    this.root.hidden = true;

    const card = el('div', 'card');
    const title = el('h2', undefined, '일시정지');

    const buttons = el('div', 'buttons');
    const resume = button('계속하기');
    const restart = button('다시하기', 'btn secondary');
    const main = button('메인으로', 'btn ghost');

    resume.addEventListener('click', () => this.onResume());
    restart.addEventListener('click', () => this.onRestart());
    main.addEventListener('click', () => this.onMain());

    buttons.append(resume, restart, main);
    card.append(title, buttons);
    this.root.appendChild(card);
    parent.appendChild(this.root);
  }

  show(): void {
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }
}
