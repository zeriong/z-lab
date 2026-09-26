/** 일시정지 오버레이: 반투명 어둠 + 패널 "일시정지", [계속하기] [다시하기] [메인으로] (§8.1). */
import { button, el, hide, show } from './dom';

export interface PauseActions {
  onResume: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

export class PauseOverlay {
  readonly el: HTMLElement;

  constructor(root: HTMLElement, actions: PauseActions) {
    this.el = el('div', 'overlay pause-overlay hidden');
    const panel = el('div', 'panel');
    panel.appendChild(el('h2', '', '일시정지'));
    panel.appendChild(button('계속하기', 'primary', actions.onResume));
    panel.appendChild(button('다시하기', '', actions.onRestart));
    panel.appendChild(button('메인으로', 'ghost', actions.onMenu));
    this.el.appendChild(panel);
    // 오버레이가 캔버스 전체를 덮어 포인터 이벤트를 흡수한다 (Input 의 상태 검사와 이중 방어)
    this.el.addEventListener('pointerdown', (e) => e.stopPropagation());
    root.appendChild(this.el);
  }

  show(): void {
    show(this.el);
  }

  hide(): void {
    hide(this.el);
  }
}
