import { ScoreRule } from '../game/ScoreRule';
import { button, el, fmt } from './dom';

export interface ResultInfo {
  cleared: boolean;
  stageId: number;
  stageName: string;
  score: number;
  stars: number;
  best: number;
  hasNext: boolean;
}

/** 클리어 / 실패 결과 오버레이 (플랜 §3 CLEAR/FAIL). */
export class ResultOverlay {
  readonly root: HTMLDivElement;
  onRestart: () => void = () => {};
  onNext: () => void = () => {};
  onMain: () => void = () => {};

  private title: HTMLHeadingElement;
  private stars: HTMLDivElement;
  private scoreLine: HTMLDivElement;
  private bestLine: HTMLDivElement;
  private nextBtn: HTMLButtonElement;

  constructor(parent: HTMLElement) {
    this.root = el('div', 'overlay');
    this.root.hidden = true;

    const card = el('div', 'card');
    this.title = el('h2', 'clear', '');
    this.stars = el('div', 'stars-big', '');
    this.scoreLine = el('div', 'score-line', '');
    this.bestLine = el('div', 'score-line', '');

    const buttons = el('div', 'buttons');
    this.nextBtn = button('다음 스테이지');
    const restart = button('다시하기', 'btn secondary');
    const main = button('메인으로', 'btn ghost');

    this.nextBtn.addEventListener('click', () => this.onNext());
    restart.addEventListener('click', () => this.onRestart());
    main.addEventListener('click', () => this.onMain());

    buttons.append(this.nextBtn, restart, main);
    card.append(this.title, this.stars, this.scoreLine, this.bestLine, buttons);
    this.root.appendChild(card);
    parent.appendChild(this.root);
  }

  show(info: ResultInfo): void {
    this.title.textContent = info.cleared ? 'STAGE CLEAR' : 'STAGE FAILED';
    this.title.className = info.cleared ? 'clear' : 'fail';
    this.stars.textContent = info.cleared ? ScoreRule.starString(info.stars) : '';
    this.scoreLine.textContent = `점수 ${fmt(info.score)}`;
    this.bestLine.textContent = info.cleared
      ? `최고 ${fmt(Math.max(info.best, info.score))}`
      : '새를 다 썼습니다. 다시 시도하세요.';
    this.nextBtn.hidden = !(info.cleared && info.hasNext);
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }
}
