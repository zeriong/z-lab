import type { Vec } from '../core/math';

/**
 * Pointer Events로 마우스와 터치를 한 경로에서 처리한다 (§5.1).
 * - 주 포인터 1개만 따라가고 나머지 멀티터치는 무시한다. 우클릭은 무시한다.
 * - 드래그를 시작하면 setPointerCapture로 캔버스 밖으로 나가도 추적한다.
 * - 캔버스에는 CSS로 touch-action: none을 걸고, 컨텍스트 메뉴를 막는다.
 * - 좌표는 뷰포트 역변환으로 월드 좌표로 바꿔 넘긴다.
 */
export interface PointerHandlers {
  /** true를 돌려주면 드래그로 보고 포인터를 캡처한다 */
  down(p: Vec): boolean;
  move(p: Vec): void;
  up(p: Vec): void;
  cancel(): void;
}

export class PointerInput {
  private activeId: number | null = null;
  private readonly offs: Array<() => void> = [];

  constructor(
    private readonly target: HTMLElement,
    private readonly toWorld: (clientX: number, clientY: number) => Vec,
    private readonly handlers: PointerHandlers,
  ) {
    this.listen('pointerdown', this.onDown);
    this.listen('pointermove', this.onMove);
    this.listen('pointerup', this.onUp);
    this.listen('pointercancel', this.onCancel);
    this.listen('lostpointercapture', this.onLost);
    this.listen('contextmenu', (e) => e.preventDefault());
  }

  private listen<K extends keyof HTMLElementEventMap>(type: K, fn: (e: HTMLElementEventMap[K]) => void): void {
    this.target.addEventListener(type, fn as EventListener);
    this.offs.push(() => this.target.removeEventListener(type, fn as EventListener));
  }

  private readonly onDown = (e: PointerEvent): void => {
    if (!e.isPrimary) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (this.activeId !== null) return;
    e.preventDefault();
    const dragging = this.handlers.down(this.toWorld(e.clientX, e.clientY));
    if (dragging) {
      this.activeId = e.pointerId;
      try {
        this.target.setPointerCapture(e.pointerId);
      } catch {
        // 합성 이벤트 등 캡처할 수 없는 경우는 무시한다.
      }
    }
  };

  private readonly onMove = (e: PointerEvent): void => {
    if (e.pointerId !== this.activeId) return;
    this.handlers.move(this.toWorld(e.clientX, e.clientY));
  };

  private readonly onUp = (e: PointerEvent): void => {
    if (e.pointerId !== this.activeId) return;
    this.activeId = null;
    this.handlers.up(this.toWorld(e.clientX, e.clientY));
    this.releaseCapture(e.pointerId);
  };

  private readonly onCancel = (e: PointerEvent): void => {
    if (e.pointerId !== this.activeId) return;
    this.activeId = null;
    this.handlers.cancel();
  };

  private readonly onLost = (e: PointerEvent): void => {
    // pointerup 없이 캡처를 잃으면 취소로 본다.
    if (e.pointerId !== this.activeId) return;
    this.activeId = null;
    this.handlers.cancel();
  };

  private releaseCapture(id: number): void {
    try {
      if (this.target.hasPointerCapture(id)) this.target.releasePointerCapture(id);
    } catch {
      // 무시
    }
  }

  /** 일시정지 등으로 드래그를 강제로 끝낸다 (핸들러는 부르지 않는다) */
  reset(): void {
    if (this.activeId !== null) this.releaseCapture(this.activeId);
    this.activeId = null;
  }

  dispose(): void {
    this.reset();
    for (const off of this.offs) off();
    this.offs.length = 0;
  }
}
