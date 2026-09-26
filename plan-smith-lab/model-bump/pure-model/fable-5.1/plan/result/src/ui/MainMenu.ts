/** 메인 화면: 타이틀, [게임 시작], [스테이지 선택], 하단 조작 안내 (§8.1). */
import { button, el, hide, show } from './dom';

export interface MainMenuActions {
  onStart: () => void;
  onStageSelect: () => void;
}

export class MainMenu {
  readonly el: HTMLElement;

  constructor(root: HTMLElement, actions: MainMenuActions) {
    this.el = el('div', 'screen main-menu hidden');
    this.el.appendChild(el('h1', 'title', '앵그리버드 웹'));
    this.el.appendChild(button('게임 시작', 'primary', actions.onStart));
    this.el.appendChild(button('스테이지 선택', '', actions.onStageSelect));
    this.el.appendChild(
      el('div', 'hint', '새를 드래그해 당겼다 놓으면 발사됩니다 · Esc/P 일시정지 · R 다시하기'),
    );
    root.appendChild(this.el);
  }

  show(): void {
    show(this.el);
  }

  hide(): void {
    hide(this.el);
  }
}
