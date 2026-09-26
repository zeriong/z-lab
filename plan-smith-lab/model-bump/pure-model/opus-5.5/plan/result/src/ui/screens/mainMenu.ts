import { button, el, setVisible } from '../dom';

/** 메인 화면: 타이틀, 게임 시작, 진행도 초기화(확인창) (§7.1) */
export interface MainMenuActions {
  start(): void;
  resetProgress(): void;
}

export class MainMenu {
  readonly root: HTMLElement;
  private readonly startBtn: HTMLButtonElement;

  constructor(actions: MainMenuActions) {
    this.startBtn = button('게임 시작', 'btn-start', () => actions.start(), 'btn-primary btn-large');
    const reset = button(
      '진행도 초기화',
      'btn-reset',
      () => {
        if (window.confirm('모든 진행도(해금, 별, 최고 점수)를 지울까요?')) actions.resetProgress();
      },
      'btn-ghost',
    );
    this.root = el('section', { class: 'screen screen-main is-hidden', testid: 'screen-main', 'aria-label': '메인' }, [
      el('div', { class: 'title-wrap' }, [
        el('h1', { class: 'title', text: '슬링샷 버드' }),
        el('p', { class: 'subtitle', text: '새총을 당겨 돼지 요새를 무너뜨리세요' }),
      ]),
      el('div', { class: 'menu-buttons' }, [this.startBtn, reset]),
    ]);
  }

  show(visible: boolean): void {
    setVisible(this.root, visible);
    if (visible) this.startBtn.focus({ preventScroll: true });
  }
}
