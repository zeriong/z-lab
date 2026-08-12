import { InputEvent, Vector } from './types';

export class Input {
  private canvas: HTMLCanvasElement;
  private listeners: Set<(event: InputEvent) => void> = new Set();
  private pointerPosition: Vector = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupListeners();
  }

  private setupListeners(): void {
    this.canvas.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.handlePointerCancel(e));
    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  private getCanvasPosition(clientX: number, clientY: number): Vector {
    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    return { x, y };
  }

  private handlePointerDown(e: PointerEvent): void {
    if (e.button !== 0) return; // Only primary button
    const position = this.getCanvasPosition(e.clientX, e.clientY);
    this.pointerPosition = position;
    this.emit({ type: 'pointerdown', position });
  }

  private handlePointerMove(e: PointerEvent): void {
    const position = this.getCanvasPosition(e.clientX, e.clientY);
    this.pointerPosition = position;
    this.emit({ type: 'pointermove', position });
  }

  private handlePointerUp(e: PointerEvent): void {
    const position = this.getCanvasPosition(e.clientX, e.clientY);
    this.emit({ type: 'pointerup', position });
  }

  private handlePointerCancel(e: PointerEvent): void {
    this.emit({ type: 'pointercancel' });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.emit({ type: 'keydown', key: e.key });
  }

  on(callback: (event: InputEvent) => void): void {
    this.listeners.add(callback);
  }

  off(callback: (event: InputEvent) => void): void {
    this.listeners.delete(callback);
  }

  private emit(event: InputEvent): void {
    this.listeners.forEach((cb) => cb(event));
  }

  getPointerPosition(): Vector {
    return { ...this.pointerPosition };
  }

  dispose(): void {
    this.listeners.clear();
  }
}
