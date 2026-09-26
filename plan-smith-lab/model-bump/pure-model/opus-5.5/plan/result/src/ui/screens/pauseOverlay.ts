import { trapFocus } from '../../input/keyboard';
import { button, el, setVisible } from '../dom';

/**
 * 일시정지 오버레이 (§7.3, R3). 배경을 어둡게 하고 가운데 패널.
 * 계속하기 / 다시하기 / 메인으로. 첫 클릭에서 버튼을 모두 비활성화해 연타를 막는다.
 */
export type PauseAction = 'resume' | 'retry' | 'toMain';

export class PauseOverlay {
  readonly root: HTMLElement;
  private readonly buttons: HTMLButtonElement[];

  constructor(onAction: (a: PauseAction) => void) {
    const act = (a: PauseAction) => () => {
      this.lock();
      onAction(a);
    };
    this.buttons = [
      button('계속하기', 'btn-resume', act('resume'), 'btn-primary'),
      button('다시하기', 'btn-retry', act('retry')),
      button('메인으로', 'btn-main', act('toMain')),
    ];
    const panel = el('div', { class: 'panel', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pause-title' }, [
      el('h2', { id: 'pause-title', class: 'panel-title', text: '일시정지' }),
      el('div', { class: 'panel-buttons' }, this.buttons),
    ]);
    this.root = el('div', { class: 'overlay overlay-pause is-hidden', testid: 'overlay-pause' }, [panel]);
    this.root.addEventListener('pointerdown', (e) => e.stopPropagation());
    trapFocus(this.root);
  }

  show(visible: boolean): void {
    setVisible(this.root, visible);
    if (visible) {
      this.unlock();
      this.buttons[0]?.focus({ preventScroll: true });
    }
  }

  lock(): void {
    for (const b of this.buttons) b.disabled = true;
  }

  unlock(): void {
    for (const b of this.buttons) b.disabled = false;
  }
}
