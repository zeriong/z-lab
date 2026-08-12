export interface PointerInput {
  type: 'down' | 'move' | 'up' | 'cancel';
  x: number;
  y: number;
  pointerId: number;
  isPrimary: boolean;
}

export interface KeyInput {
  type: 'down' | 'up';
  key: string;
}

export type InputEvent = PointerInput | KeyInput;

export class Input {
  private pointerListeners: Array<(input: PointerInput) => void> = [];
  private keyListeners: Array<(input: KeyInput) => void> = [];
  private activePointers: Map<number, { x: number; y: number }> = new Map();

  constructor(private canvas: HTMLCanvasElement) {
    this.setupPointerEvents();
    this.setupKeyboardEvents();
  }

  private setupPointerEvents() {
    this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.canvas.addEventListener('pointercancel', (e) => this.onPointerCancel(e));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setupKeyboardEvents() {
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    this.activePointers.set(e.pointerId, { x, y });

    this.pointerListeners.forEach((listener) => {
      listener({
        type: 'down',
        x,
        y,
        pointerId: e.pointerId,
        isPrimary: e.isPrimary,
      });
    });
  };

  private onPointerMove = (e: PointerEvent) => {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    this.activePointers.set(e.pointerId, { x, y });

    this.pointerListeners.forEach((listener) => {
      listener({
        type: 'move',
        x,
        y,
        pointerId: e.pointerId,
        isPrimary: e.isPrimary,
      });
    });
  };

  private onPointerUp = (e: PointerEvent) => {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    this.activePointers.delete(e.pointerId);

    this.pointerListeners.forEach((listener) => {
      listener({
        type: 'up',
        x,
        y,
        pointerId: e.pointerId,
        isPrimary: e.isPrimary,
      });
    });
  };

  private onPointerCancel = (e: PointerEvent) => {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    this.activePointers.delete(e.pointerId);

    this.pointerListeners.forEach((listener) => {
      listener({
        type: 'cancel',
        x,
        y,
        pointerId: e.pointerId,
        isPrimary: e.isPrimary,
      });
    });
  };

  private onKeyDown = (e: KeyboardEvent) => {
    this.keyListeners.forEach((listener) => {
      listener({
        type: 'down',
        key: e.key,
      });
    });
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keyListeners.forEach((listener) => {
      listener({
        type: 'up',
        key: e.key,
      });
    });
  };

  onPointer(listener: (input: PointerInput) => void) {
    this.pointerListeners.push(listener);
  }

  onKey(listener: (input: KeyInput) => void) {
    this.keyListeners.push(listener);
  }

  removePointerListener(listener: (input: PointerInput) => void) {
    const idx = this.pointerListeners.indexOf(listener);
    if (idx >= 0) this.pointerListeners.splice(idx, 1);
  }

  removeKeyListener(listener: (input: KeyInput) => void) {
    const idx = this.keyListeners.indexOf(listener);
    if (idx >= 0) this.keyListeners.splice(idx, 1);
  }

  getActivePointers(): Map<number, { x: number; y: number }> {
    return this.activePointers;
  }
}
