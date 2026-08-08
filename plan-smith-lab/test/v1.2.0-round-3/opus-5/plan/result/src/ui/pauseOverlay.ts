/**
 * §9.2 일시정지 패널 (요구사항 3).
 * 필수 버튼은 "다시하기 / 메인으로" 2개. "계속하기"는 추가 —
 * 오버레이를 닫을 방법이 없으면 갇히기 때문이다.
 *
 * 호출 순서 규약: sm.dispatch('PAUSE')가 먼저, DOM 표시가 나중.
 * 반대로 하면 한 프레임 물리가 더 돈다.
 */

/** 패널 바깥 클릭으로 닫을지 — 오조작을 막고 싶으면 false */
export const CLOSE_ON_BACKDROP = true;

export interface PauseCallbacks {
  onResume(): void;
  onRetry(): void;
  onMain(): void;
}

export class PauseOverlay {
  private root: HTMLDivElement;
  private panel: HTMLDivElement;
  private returnFocus: HTMLElement | null = null;
  private open = false;

  constructor(parent: HTMLElement, private cb: PauseCallbacks) {
    this.root = document.createElement('div');
    this.root.className = 'overlay';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-modal', 'true');
    this.root.setAttribute('aria-labelledby', 'pause-title');
    this.root.innerHTML = `
      <div class="panel">
        <h2 id="pause-title">일시정지</h2>
        <button data-act="resume" class="btn-primary">계속하기</button>
        <button data-act="retry">다시하기</button>
        <button data-act="main">메인으로</button>
      </div>
    `;
    parent.appendChild(this.root);

    const panel = this.root.querySelector<HTMLDivElement>('.panel');
    if (!panel) throw new Error('pause panel 누락');
    this.panel = panel;

    this.root.addEventListener('click', (e) => {
      if (!CLOSE_ON_BACKDROP) return;
      if (e.target === this.root) this.cb.onResume();
    });

    this.act('resume').addEventListener('click', () => this.cb.onResume());
    this.act('retry').addEventListener('click', () => this.cb.onRetry());
    this.act('main').addEventListener('click', () => this.cb.onMain());

    this.root.addEventListener('keydown', this.onKeyDown);
  }

  private act(name: string): HTMLButtonElement {
    const el = this.root.querySelector<HTMLButtonElement>(`[data-act="${name}"]`);
    if (!el) throw new Error(`pause 버튼 누락: ${name}`);
    return el;
  }

  isOpen(): boolean {
    return this.open;
  }

  /** 열 때 첫 버튼에 focus. 닫을 때 일시정지 버튼으로 복귀. */
  show(returnFocus: HTMLElement | null): void {
    this.returnFocus = returnFocus;
    this.root.hidden = false;
    this.open = true;
    // 트랜지션이 걸리도록 다음 프레임에 클래스 부여
    requestAnimationFrame(() => this.root.classList.add('show'));
    this.act('resume').focus();
  }

  hide(): void {
    this.root.classList.remove('show');
    this.root.hidden = true;
    this.open = false;
    this.returnFocus?.focus();
    this.returnFocus = null;
  }

  destroy(): void {
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.root.remove();
  }

  /** 포커스 트랩 — Tab 순환을 패널 안에 가둔다. Esc = 계속하기. */
  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.open) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      this.cb.onResume();
      return;
    }
    if (e.key !== 'Tab') return;

    const items = Array.from(this.panel.querySelectorAll<HTMLButtonElement>('button'));
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };
}
