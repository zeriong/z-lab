// 캔버스 포인터 입력 (§4.4, §6 hop 1–2). 마우스·터치 모두 Pointer Events로 처리.
import type { Game } from '../core/game';
import type { Viewport } from '../render/viewport';

export interface InputDeps {
  canvas: HTMLCanvasElement;
  viewport: Viewport;
  game: Game;
  /** 첫 사용자 제스처 (오디오 잠금 해제) */
  onFirstGesture?: () => void;
}

export class Input {
  private activePointer: number | null = null;
  private readonly disposers: Array<() => void> = [];

  constructor(private readonly deps: InputDeps) {}

  attach(): void {
    const c = this.deps.canvas;
    this.on(c, 'pointerdown', this.onPointerDown as EventListener);
    this.on(c, 'pointermove', this.onPointerMove as EventListener);
    this.on(c, 'pointerup', this.onPointerUp as EventListener);
    this.on(c, 'pointercancel', this.onPointerCancel as EventListener);
    this.on(c, 'lostpointercapture', this.onPointerCancel as EventListener);
    this.on(c, 'contextmenu', ((e: Event) => e.preventDefault()) as EventListener);
  }

  detach(): void {
    for (const d of this.disposers.splice(0)) d();
  }

  private on(target: EventTarget, type: string, fn: EventListener): void {
    target.addEventListener(type, fn, { passive: false });
    this.disposers.push(() => target.removeEventListener(type, fn));
  }

  private toWorld(e: PointerEvent) {
    const rect = this.deps.canvas.getBoundingClientRect();
    return this.deps.viewport.clientToWorld(e.clientX, e.clientY, rect);
  }

  /** 드래그가 끝나거나 취소되면 캡처 상태를 정리 */
  private releasePointer(): void {
    const id = this.activePointer;
    this.activePointer = null;
    if (id === null) return;
    try {
      if (this.deps.canvas.hasPointerCapture(id)) this.deps.canvas.releasePointerCapture(id);
    } catch {
      /* 이미 해제됨 */
    }
  }

  readonly onPointerDown = (e: PointerEvent): void => {
    this.deps.onFirstGesture?.();
    if (e.button > 0) return;
    if (this.deps.viewport.scale <= 0) return;
    e.preventDefault(); // 스크롤·텍스트 선택 방지
    if (this.activePointer !== null) return;
    const result = this.deps.game.pointerDown(this.toWorld(e), e.pointerId);
    if (result === 'grab') {
      this.activePointer = e.pointerId;
      try {
        this.deps.canvas.setPointerCapture(e.pointerId);
      } catch {
        /* 합성 이벤트 등 */
      }
    }
  };

  readonly onPointerMove = (e: PointerEvent): void => {
    if (this.activePointer === null || e.pointerId !== this.activePointer) return;
    e.preventDefault();
    this.deps.game.pointerMove(this.toWorld(e));
  };

  readonly onPointerUp = (e: PointerEvent): void => {
    if (this.activePointer === null || e.pointerId !== this.activePointer) return;
    e.preventDefault();
    this.deps.game.pointerMove(this.toWorld(e));
    this.releasePointer();
    this.deps.game.pointerUp();
  };

  readonly onPointerCancel = (e: PointerEvent): void => {
    if (this.activePointer === null || e.pointerId !== this.activePointer) return;
    this.activePointer = null;
    this.deps.game.pointerCancel();
  };

  /** 일시정지 등 외부에서 드래그를 끊을 때 */
  cancel(): void {
    if (this.activePointer === null) return;
    this.deps.game.pointerCancel();
    this.releasePointer();
  }
}
