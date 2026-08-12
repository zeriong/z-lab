export interface PauseHandlers {
  onResume(): void;
  onRestart(): void;
  onMain(): void;
}

/**
 * Requirement R3 overlay (plan §7.4).
 *
 * - "계속하기" is not in the original request but its absence is a defect:
 *   a pause you cannot leave is a dead end.
 * - The dim layer has `pointer-events: auto`, which is what actually stops
 *   the canvas from receiving the drag while paused (manual test T4). The
 *   game state check is the second line of defence, not the only one.
 */
export class PauseOverlay {
  readonly el: HTMLDivElement;
  private readonly buttons: HTMLButtonElement[] = [];
  private lastFocused: HTMLElement | null = null;
  private open = false;

  constructor(handlers: PauseHandlers) {
    this.el = document.createElement('div');
    this.el.className = 'overlay';
    this.el.setAttribute('role', 'dialog');
    this.el.setAttribute('aria-modal', 'true');
    this.el.setAttribute('aria-label', '일시정지');

    const dim = document.createElement('div');
    dim.className = 'dim';

    const column = document.createElement('div');
    column.className = 'center-col';

    const panel = document.createElement('div');
    panel.className = 'panel overlay__panel';

    const title = document.createElement('h2');
    title.className = 'overlay__title';
    title.textContent = '일시정지';

    const resume = this.makeButton('계속하기', 'btn', handlers.onResume);
    const restart = this.makeButton('다시하기', 'btn btn--ghost', handlers.onRestart);
    const main = this.makeButton('메인으로', 'btn btn--ghost', handlers.onMain);

    panel.append(title, resume, restart, main);
    column.append(panel);
    this.el.append(dim, column);

    this.el.addEventListener('keydown', this.onKeyDown);
  }

  private makeButton(label: string, className: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.textContent = label;
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      onClick();
    });
    this.buttons.push(btn);
    return btn;
  }

  get isOpen(): boolean {
    return this.open;
  }

  show(parent: HTMLElement): void {
    if (this.open) return;
    this.open = true;
    this.lastFocused = document.activeElement as HTMLElement | null;
    parent.append(this.el);
    this.buttons[0]?.focus();
  }

  hide(): void {
    if (!this.open) return;
    this.open = false;
    this.el.remove();
    this.lastFocused?.focus?.();
    this.lastFocused = null;
  }

  /** Tab focus trap — Tab must not escape into the page behind the modal. */
  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || this.buttons.length === 0) return;
    const first = this.buttons[0];
    const last = this.buttons[this.buttons.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };
}
