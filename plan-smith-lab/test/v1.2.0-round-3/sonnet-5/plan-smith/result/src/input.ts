import type { Vec2 } from "./types";
import { GRAB_RADIUS_PX } from "./input-config";

export interface SlingshotInputCallbacks {
  onDragStart: (pos: Vec2) => void;
  onDragMove: (pos: Vec2) => void;
  onDragEnd: (pos: Vec2) => void;
  /** 드래그 시작이 유효하려면 새(투사체) 위치를 알아야 grabRadius 판정을 할 수 있다. */
  getBirdPosition: () => Vec2 | null;
}

/**
 * R6/R25 — 슬링샷 드래그 입력을 Pointer Events로 통합한다. 마우스와 터치가 동일한
 * 코드경로(pointerdown/move/up)를 타므로 데스크톱/모바일 분기 코드가 없다.
 */
export class SlingshotInput {
  private canvas: HTMLCanvasElement;
  private callbacks: SlingshotInputCallbacks;
  private activePointerId: number | null = null;
  private dragging = false;

  constructor(canvas: HTMLCanvasElement, callbacks: SlingshotInputCallbacks) {
    this.canvas = canvas;
    this.callbacks = callbacks;
    canvas.style.touchAction = "none";
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);
  }

  destroy(): void {
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerUp);
  }

  private toWorldPos(clientX: number, clientY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private handlePointerDown = (event: PointerEvent): void => {
    if (this.activePointerId !== null) return;
    const pos = this.toWorldPos(event.clientX, event.clientY);
    const birdPos = this.callbacks.getBirdPosition();
    if (!birdPos) return;
    const dx = pos.x - birdPos.x;
    const dy = pos.y - birdPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > GRAB_RADIUS_PX) return;

    this.activePointerId = event.pointerId;
    this.dragging = true;
    this.canvas.setPointerCapture(event.pointerId);
    this.callbacks.onDragStart(pos);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.activePointerId) return;
    const pos = this.toWorldPos(event.clientX, event.clientY);
    this.callbacks.onDragMove(pos);
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.activePointerId) return;
    const pos = this.toWorldPos(event.clientX, event.clientY);
    this.dragging = false;
    this.activePointerId = null;
    this.callbacks.onDragEnd(pos);
  };
}
