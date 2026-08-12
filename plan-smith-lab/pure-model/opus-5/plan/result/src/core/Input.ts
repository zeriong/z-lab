import type { LogicalPoint } from './Camera';

/**
 * Pointer + keyboard normalisation (plan §5.1).
 *
 * PointerEvent only (mouse / touch / pen share one path), `touch-action: none`
 * on the canvas plus setPointerCapture so a drag that leaves the canvas keeps
 * tracking. Coordinates are handed to the game already converted to LOGICAL
 * space through a single conversion function.
 */

export interface PointerSample extends LogicalPoint {
  pointerId: number;
}

export interface InputHandlers {
  onPointerDown?(p: PointerSample): void;
  onPointerMove?(p: PointerSample): void;
  onPointerUp?(p: PointerSample): void;
  onPointerCancel?(p: PointerSample): void;
  onKeyDown?(key: string, event: KeyboardEvent): void;
}

export class Input {
  private activePointerId: number | null = null;
  private attached = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly toLogical: (clientX: number, clientY: number) => LogicalPoint,
    private readonly handlers: InputHandlers,
  ) {}

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.canvas.addEventListener('pointerdown', this.onDown);
    this.canvas.addEventListener('pointermove', this.onMove);
    this.canvas.addEventListener('pointerup', this.onUp);
    this.canvas.addEventListener('pointercancel', this.onCancel);
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('keydown', this.onKeyDown);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.canvas.removeEventListener('pointerdown', this.onDown);
    this.canvas.removeEventListener('pointermove', this.onMove);
    this.canvas.removeEventListener('pointerup', this.onUp);
    this.canvas.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('keydown', this.onKeyDown);
  }

  private sample(event: PointerEvent): PointerSample {
    const p = this.toLogical(event.clientX, event.clientY);
    return { x: p.x, y: p.y, pointerId: event.pointerId };
  }

  private onDown = (event: PointerEvent): void => {
    if (this.activePointerId !== null) return; // single-pointer game
    this.activePointerId = event.pointerId;
    try {
      this.canvas.setPointerCapture(event.pointerId);
    } catch {
      /* capture is best-effort */
    }
    event.preventDefault();
    this.handlers.onPointerDown?.(this.sample(event));
  };

  private onMove = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) return;
    event.preventDefault();
    this.handlers.onPointerMove?.(this.sample(event));
  };

  private onUp = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) return;
    this.release(event);
    this.handlers.onPointerUp?.(this.sample(event));
  };

  private onCancel = (event: PointerEvent): void => {
    if (this.activePointerId !== event.pointerId) return;
    this.release(event);
    this.handlers.onPointerCancel?.(this.sample(event));
  };

  private release(event: PointerEvent): void {
    this.activePointerId = null;
    try {
      this.canvas.releasePointerCapture(event.pointerId);
    } catch {
      /* already released */
    }
  }

  private onContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    // Let the overlay buttons handle their own keys (Enter / Space / Tab).
    if (target && (target.tagName === 'BUTTON' || target.tagName === 'INPUT')) {
      if (event.key !== 'Escape' && event.key !== 'p' && event.key !== 'P') return;
    }
    this.handlers.onKeyDown?.(event.key, event);
  };
}
