/**
 * 결과 오버레이 (§8.1).
 * 클리어: 별 3칸, 점수, 남은 새 보너스, [다음 스테이지](10단계 없음) [다시하기] [메인으로].
 *         10단계 클리어 시 "모든 스테이지 클리어!" 와 [메인으로]가 기본 버튼.
 * 실패: "실패", [다시하기] [메인으로].
 */
import { button, el, hide, show, starsMarkup } from './dom';

export interface ResultActions {
  onNext: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export interface ClearInfo {
  stageId: number;
  score: number;
  stars: number;
  bonus: number;
  hasNext: boolean;
  allCleared: boolean;
}

export interface FailInfo {
  stageId: number;
  score: number;
}

export class ResultOverlay {
  readonly el: HTMLElement;
  private readonly panel: HTMLElement;

  constructor(
    root: HTMLElement,
    private readonly actions: ResultActions,
  ) {
    this.el = el('div', 'overlay result-overlay hidden');
    this.panel = el('div', 'panel');
    this.el.appendChild(this.panel);
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    root.appendChild(this.el);
  }

  showClear(info: ClearInfo): void {
    const p = this.panel;
    p.replaceChildren();
    p.appendChild(el('h2', '', info.allCleared ? '모든 스테이지 클리어!' : `스테이지 ${info.stageId} 클리어!`));
    p.appendChild(starsMarkup(info.stars));
    p.appendChild(el('div', 'score', `${info.score.toLocaleString('ko-KR')} 점`));
    if (info.bonus > 0) {
      p.appendChild(el('div', 'sub', `남은 새 보너스 +${info.bonus.toLocaleString('ko-KR')}`));
    }
    const row = el('div', 'row');
    if (info.hasNext) row.appendChild(button('다음 스테이지', 'primary', this.actions.onNext));
    row.appendChild(button('다시하기', '', this.actions.onRestart));
    row.appendChild(button('메인으로', info.hasNext ? 'ghost' : 'primary', this.actions.onMenu));
    p.appendChild(row);
    show(this.el);
  }

  showFailed(info: FailInfo): void {
    const p = this.panel;
    p.replaceChildren();
    p.appendChild(el('h2', '', '실패'));
    p.appendChild(el('div', 'sub', `스테이지 ${info.stageId} · ${info.score.toLocaleString('ko-KR')} 점`));
    const row = el('div', 'row');
    row.appendChild(button('다시하기', 'primary', this.actions.onRestart));
    row.appendChild(button('메인으로', 'ghost', this.actions.onMenu));
    p.appendChild(row);
    show(this.el);
  }

  hide(): void {
    hide(this.el);
  }
}
