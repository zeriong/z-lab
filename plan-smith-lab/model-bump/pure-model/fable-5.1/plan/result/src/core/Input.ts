/**
 * Pointer Events → 월드 좌표 드래그 스트림 (§6.1, §8.2).
 * - 마우스·터치·펜 통일, 드래그 중 setPointerCapture
 * - 화면 좌표 → 월드 좌표: (clientX − rect.left) / rect.width × 1280
 * - enabled() 가 false(=Playing 이 아님)면 무시 (오버레이와 함께 이중 방어)
 */
import { WORLD_H, WORLD_W } from './config';
import type { Vec } from './math';

export interface PointerHandlers {
  down(p: Vec): void;
  move(p: Vec): void;
  up(p: Vec): void;
  cancel(): void;
}

export class Input {
  private activeId: number | null = null;
  private readonly offs: Array<() => void> = [];

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly handlers: PointerHandlers,
    private readonly enabled: () => boolean,
  ) {
    this.attach();
  }

  get isActive(): boolean {
    return this.activeId !== null;
  }

  toWorld(clientX: number, clientY: number): Vec {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    return {
      x: ((clientX - rect.left) / w) * WORLD_W,
      y: ((clientY - rect.top) / h) * WORLD_H,
    };
  }

  private on<K extends keyof HTMLElementEventMap>(
    type: K,
    fn: (e: HTMLElementEventMap[K]) => void,
  ): void {
    this.canvas.addEventListener(type, fn, { passive: false });
    this.offs.push(() => this.canvas.removeEventListener(type, fn));
  }

  private attach(): void {
    this.on('pointerdown', (e) => {
      if (!this.enabled()) return;
      if (this.activeId !== null) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.preventDefault();
      this.activeId = e.pointerId;
      try {
        this.canvas.setPointerCapture(e.pointerId);
      } catch {
        /* 일부 브라우저에서 capture 실패는 무시 */
      }
      this.handlers.down(this.toWorld(e.clientX, e.clientY));
    });

    this.on('pointermove', (e) => {
      if (this.activeId !== e.pointerId) return;
      e.preventDefault();
      if (!this.enabled()) return;
      this.handlers.move(this.toWorld(e.clientX, e.clientY));
    });

    this.on('pointerup', (e) => {
      if (this.activeId !== e.pointerId) return;
      e.preventDefault();
      this.release(e.pointerId);
      if (this.enabled()) this.handlers.up(this.toWorld(e.clientX, e.clientY));
      else this.handlers.cancel();
    });

    this.on('pointercancel', (e) => {
      if (this.activeId !== e.pointerId) return;
      this.release(e.pointerId);
      this.handlers.cancel();
    });

    this.on('contextmenu', (e) => e.preventDefault());
  }

  private release(id: number): void {
    try {
      if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
    } catch {
      /* ignore */
    }
    this.activeId = null;
  }

  /** 진행 중 드래그를 강제로 취소 (일시정지·탭 숨김) */
  cancelActive(): void {
    if (this.activeId === null) return;
    this.release(this.activeId);
    this.handlers.cancel();
  }

  dispose(): void {
    this.cancelActive();
    for (const off of this.offs) off();
    this.offs.length = 0;
  }
}
