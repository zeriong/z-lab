import type { Camera, Vec2 } from './Camera';

/**
 * 포인터 입력 (플랜 §5).
 * - pointer 이벤트 단일 경로(마우스/터치/펜 공통), non-passive 리스너.
 * - pointercancel / 창 밖 릴리즈는 "취소"가 아니라 그 시점 값으로 발사한다.
 */
export interface PointerSample {
  world: Vec2;
  screen: Vec2;
}

type Handler = (s: PointerSample) => void;

export class Input {
  enabled = true;

  onDown: Handler = () => {};
  onMove: Handler = () => {};
  onUp: Handler = () => {};

  private activeId: number | null = null;
  private lastSample: PointerSample | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly camera: Camera,
  ) {
    const opts: AddEventListenerOptions = { passive: false };
    canvas.addEventListener('pointerdown', this.handleDown, opts);
    canvas.addEventListener('pointermove', this.handleMove, opts);
    canvas.addEventListener('pointerup', this.handleUp, opts);
    canvas.addEventListener('pointercancel', this.handleUp, opts);
    canvas.addEventListener('pointerleave', this.handleUp, opts);
    window.addEventListener('pointerup', this.handleWindowUp, opts);
    canvas.addEventListener('contextmenu', this.preventDefault, opts);
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.handleDown);
    this.canvas.removeEventListener('pointermove', this.handleMove);
    this.canvas.removeEventListener('pointerup', this.handleUp);
    this.canvas.removeEventListener('pointercancel', this.handleUp);
    this.canvas.removeEventListener('pointerleave', this.handleUp);
    window.removeEventListener('pointerup', this.handleWindowUp);
    this.canvas.removeEventListener('contextmenu', this.preventDefault);
  }

  /** 드래그 중이면 강제 종료(발사 처리 없이 해제) — 일시정지 진입 등에 사용 */
  abort(): void {
    this.activeId = null;
    this.lastSample = null;
  }

  get dragging(): boolean {
    return this.activeId !== null;
  }

  private preventDefault = (e: Event): void => {
    e.preventDefault();
  };

  private sample(e: PointerEvent): PointerSample {
    const rect = this.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const s: PointerSample = {
      screen: { x: sx, y: sy },
      world: this.camera.screenToWorld(sx, sy),
    };
    this.lastSample = s;
    return s;
  }

  private handleDown = (e: PointerEvent): void => {
    e.preventDefault();
    if (!this.enabled || this.activeId !== null) return;
    this.activeId = e.pointerId;
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* 캡처 실패는 무해 */
    }
    this.onDown(this.sample(e));
  };

  private handleMove = (e: PointerEvent): void => {
    if (this.activeId !== e.pointerId) return;
    e.preventDefault();
    this.onMove(this.sample(e));
  };

  private handleUp = (e: PointerEvent): void => {
    if (this.activeId !== e.pointerId) return;
    e.preventDefault();
    const s = this.sample(e);
    this.activeId = null;
    this.onUp(s);
  };

  /** 캔버스 밖에서 손을 뗀 경우에도 마지막 샘플로 발사 처리 */
  private handleWindowUp = (e: PointerEvent): void => {
    if (this.activeId === null || this.activeId !== e.pointerId) return;
    const s = this.lastSample ?? this.sample(e);
    this.activeId = null;
    this.onUp(s);
  };
}
