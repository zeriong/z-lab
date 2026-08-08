/**
 * §5.1 Pointer Events 정규화 → 논리좌표(월드 좌표).
 * 이벤트는 즉시 게임에 반영하지 않고 큐에 쌓았다가 fixedUpdate 맨 앞에서 consume한다(§3).
 * 그래야 한 프레임에 여러 포인터 이벤트가 들어와도 물리 스텝과 순서가 어긋나지 않는다.
 */

export const LOGICAL_W = 1280;
export const LOGICAL_H = 720;

export type PointerPhase = 'down' | 'move' | 'up' | 'cancel';

export interface PointerSample {
  phase: PointerPhase;
  /** 월드 좌표 (카메라 오프셋 포함) */
  x: number;
  y: number;
  /** 카메라 오프셋을 빼지 않은 화면 좌표 */
  screenX: number;
  screenY: number;
  id: number;
}

export interface KeySample {
  code: string;
  repeat: boolean;
}

export class InputManager {
  private pointerQueue: PointerSample[] = [];
  private keyQueue: KeySample[] = [];
  private activeId: number | null = null;
  private bound = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly getCameraX: () => number,
  ) {}

  attach(): void {
    if (this.bound) return;
    this.bound = true;
    this.canvas.addEventListener('pointerdown', this.onDown, { passive: false });
    this.canvas.addEventListener('pointermove', this.onMove, { passive: false });
    this.canvas.addEventListener('pointerup', this.onUp, { passive: false });
    this.canvas.addEventListener('pointercancel', this.onCancel, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
  }

  dispose(): void {
    if (!this.bound) return;
    this.bound = false;
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    window.removeEventListener('keydown', this.onKeyDown);
    this.reset();
  }

  /** 이번 스텝의 포인터 이벤트를 꺼내간다. */
  consume(): PointerSample[] {
    const out = this.pointerQueue;
    this.pointerQueue = [];
    return out;
  }

  consumeKeys(): KeySample[] {
    const out = this.keyQueue;
    this.keyQueue = [];
    return out;
  }

  /** §8.3 월드 파기 체크리스트 */
  reset(): void {
    this.pointerQueue = [];
    this.keyQueue = [];
    this.activeId = null;
  }

  private toSample(e: PointerEvent, phase: PointerPhase): PointerSample {
    const rect = this.canvas.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * LOGICAL_W;
    const sy = ((e.clientY - rect.top) / rect.height) * LOGICAL_H;
    return {
      phase,
      screenX: sx,
      screenY: sy,
      x: sx + this.getCameraX(),
      y: sy,
      id: e.pointerId,
    };
  }

  private onDown = (e: PointerEvent): void => {
    if (this.activeId !== null) return; // 멀티터치 무시: 첫 포인터만 유효
    e.preventDefault();
    this.activeId = e.pointerId;
    // 드래그를 canvas 밖으로 끌고 나가도 이벤트가 끊기지 않게 캡처한다(§15.3).
    try {
      this.canvas.setPointerCapture(e.pointerId);
    } catch {
      /* 캡처 실패는 치명적이지 않다 */
    }
    this.pointerQueue.push(this.toSample(e, 'down'));
  };

  private onMove = (e: PointerEvent): void => {
    if (this.activeId !== e.pointerId) return;
    e.preventDefault();
    // rAF 코얼레스: 같은 프레임의 move는 마지막 것만 남긴다(§5.2 예측 비용 절감).
    const last = this.pointerQueue[this.pointerQueue.length - 1];
    if (last && last.phase === 'move') this.pointerQueue.pop();
    this.pointerQueue.push(this.toSample(e, 'move'));
  };

  private onUp = (e: PointerEvent): void => {
    if (this.activeId !== e.pointerId) return;
    e.preventDefault();
    this.release(e.pointerId);
    this.pointerQueue.push(this.toSample(e, 'up'));
  };

  private onCancel = (e: PointerEvent): void => {
    if (this.activeId !== e.pointerId) return;
    this.release(e.pointerId);
    this.pointerQueue.push(this.toSample(e, 'cancel'));
  };

  private release(id: number): void {
    this.activeId = null;
    try {
      if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
    } catch {
      /* noop */
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target as HTMLElement | null;
    // DOM 버튼에 포커스가 있을 때의 Space/Enter는 버튼의 것이다.
    if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT')) {
      if (e.code === 'Space' || e.code === 'Enter') return;
    }
    const handled = [
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Space',
      'Escape',
      'KeyP',
      'KeyR',
      'KeyM',
    ];
    if (!handled.includes(e.code)) return;
    if (e.code === 'Space') e.preventDefault(); // 페이지 스크롤 방지
    this.keyQueue.push({ code: e.code, repeat: e.repeat });
  };
}
