export interface InputEvent {
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel' | 'keydown' | 'keyup';
  x?: number;
  y?: number;
  key?: string;
}

export class Input {
  private listeners: Map<string, Set<(event: InputEvent) => void>> = new Map();
  private canvas: HTMLCanvasElement;
  private pointerActive = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.setupListeners();
  }

  private setupListeners(): void {
    // Pointer events
    this.canvas.addEventListener('pointerdown', (e) => {
      this.pointerActive = true;
      this.canvas.setPointerCapture(e.pointerId);
      this.emit('pointerdown', {
        type: 'pointerdown',
        x: e.clientX,
        y: e.clientY
      });
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (this.pointerActive) {
        this.emit('pointermove', {
          type: 'pointermove',
          x: e.clientX,
          y: e.clientY
        });
      }
    });

    this.canvas.addEventListener('pointerup', (e) => {
      this.pointerActive = false;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Pointer already released
      }
      this.emit('pointerup', {
        type: 'pointerup',
        x: e.clientX,
        y: e.clientY
      });
    });

    this.canvas.addEventListener('pointercancel', (e) => {
      this.pointerActive = false;
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Pointer already released
      }
      this.emit('pointercancel', {
        type: 'pointercancel'
      });
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
      this.emit('keydown', {
        type: 'keydown',
        key: e.key
      });
    });

    document.addEventListener('keyup', (e) => {
      this.emit('keyup', {
        type: 'keyup',
        key: e.key
      });
    });
  }

  on(type: string, callback: (event: InputEvent) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);
  }

  off(type: string, callback: (event: InputEvent) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(type: string, event: InputEvent): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }
  }

  getCanvasPosition(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  destroy(): void {
    this.listeners.clear();
  }
}
