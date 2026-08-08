/**
 * §8 메인 메뉴 화면. DOM 화면이며 canvas 위에 얹힌다.
 */

export interface MainMenuCallbacks {
  onStart(): void;
  onResetProgress(): void;
}

export class MainMenu {
  private root: HTMLDivElement;

  constructor(parent: HTMLElement, cb: MainMenuCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'screen';
    this.root.hidden = true;
    this.root.innerHTML = `
      <h1>앵그리버드 웹</h1>
      <p class="sub">새총을 당겨 구조물을 무너뜨리고 돼지를 모두 제거하세요.</p>
      <div class="menu-btns">
        <button data-act="start" class="btn-primary">게임 시작</button>
        <button data-act="reset">진행도 초기화</button>
      </div>
      <p class="sub">조작: 드래그로 조준·발사 · 비행 중 클릭으로 능력 · Esc 일시정지</p>
    `;
    parent.appendChild(this.root);

    this.act('start').addEventListener('click', () => cb.onStart());
    this.act('reset').addEventListener('click', () => {
      if (window.confirm('진행도(해금·별·최고점)를 모두 지웁니다. 계속할까요?')) {
        cb.onResetProgress();
      }
    });
  }

  private act(name: string): HTMLButtonElement {
    const el = this.root.querySelector<HTMLButtonElement>(`[data-act="${name}"]`);
    if (!el) throw new Error(`main menu 버튼 누락: ${name}`);
    return el;
  }

  show(): void {
    this.root.hidden = false;
    this.act('start').focus();
  }

  hide(): void {
    this.root.hidden = true;
  }

  destroy(): void {
    this.root.remove();
  }
}
