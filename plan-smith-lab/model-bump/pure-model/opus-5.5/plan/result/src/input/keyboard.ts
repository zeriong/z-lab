/**
 * 키보드 (§7.3). ESC로 PLAYING ↔ PAUSED를 오간다.
 * 오버레이 안의 Tab 포커스 순환은 오버레이 모듈이 담당한다.
 */
export interface KeyboardHandlers {
  escape(): void;
}

export class KeyboardInput {
  constructor(private readonly handlers: KeyboardHandlers) {
    window.addEventListener('keydown', this.onKey);
  }

  private readonly onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (e.repeat) return;
      e.preventDefault();
      this.handlers.escape();
    }
  };

  dispose(): void {
    window.removeEventListener('keydown', this.onKey);
  }
}

/** 컨테이너 안에서만 Tab 포커스가 돌게 한다. 해제 함수를 돌려준다. */
export function trapFocus(container: HTMLElement): () => void {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    const items = Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter((el) => el.offsetParent !== null || el === document.activeElement);
    if (items.length === 0) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || !container.contains(active))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (active === last || !container.contains(active))) {
      e.preventDefault();
      first.focus();
    }
  };
  container.addEventListener('keydown', onKey);
  return () => container.removeEventListener('keydown', onKey);
}
