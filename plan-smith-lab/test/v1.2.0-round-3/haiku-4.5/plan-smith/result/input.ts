import { InputState } from './types';
import { Renderer } from './renderer';

export type InputCallback = (event: InputEvent) => void;

export interface InputEvent {
    type: 'slingshot_drag' | 'slingshot_release' | 'pause_click';
    dx?: number;
    dy?: number;
    x?: number;
    y?: number;
}

export class InputHandler {
    private state: InputState;
    private callbacks: InputCallback[] = [];
    private renderer: Renderer;
    private canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement, renderer: Renderer) {
        this.canvas = canvas;
        this.renderer = renderer;
        this.state = {
            pointer_down: false,
            pointer_x: 0,
            pointer_y: 0,
            drag_start_x: 0,
            drag_start_y: 0,
            dragging_slingshot: false
        };

        this.setupListeners();
    }

    private setupListeners(): void {
        this.canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
        this.canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
        this.canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    }

    private onPointerDown(e: PointerEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.state.pointer_down = true;
        this.state.pointer_x = x;
        this.state.pointer_y = y;

        // Check if clicking pause button (right side, 50px radius)
        const pauseButtonX = this.canvas.width - 50;
        const pauseButtonY = 50;
        const dist = Math.sqrt((x - pauseButtonX) ** 2 + (y - pauseButtonY) ** 2);

        if (dist < 50) {
            this.emit({
                type: 'pause_click',
                x,
                y
            });
            return;
        }

        // Check if in slingshot zone
        const slingshotZone = this.renderer.getSlingshotZone();
        if (
            x >= slingshotZone.x &&
            x <= slingshotZone.x + slingshotZone.width &&
            y >= slingshotZone.y &&
            y <= slingshotZone.y + slingshotZone.height
        ) {
            this.state.dragging_slingshot = true;
            this.state.drag_start_x = x;
            this.state.drag_start_y = y;
        }
    }

    private onPointerMove(e: PointerEvent): void {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.state.pointer_x = x;
        this.state.pointer_y = y;

        if (this.state.dragging_slingshot) {
            const dx = x - this.state.drag_start_x;
            const dy = y - this.state.drag_start_y;

            this.emit({
                type: 'slingshot_drag',
                dx,
                dy,
                x,
                y
            });
        }
    }

    private onPointerUp(e: PointerEvent): void {
        if (this.state.dragging_slingshot) {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const dx = x - this.state.drag_start_x;
            const dy = y - this.state.drag_start_y;

            this.emit({
                type: 'slingshot_release',
                dx,
                dy,
                x,
                y
            });

            this.state.dragging_slingshot = false;
        }

        this.state.pointer_down = false;
    }

    subscribe(callback: InputCallback): void {
        this.callbacks.push(callback);
    }

    private emit(event: InputEvent): void {
        this.callbacks.forEach(cb => cb(event));
    }

    getState(): InputState {
        return this.state;
    }

    isDraggingSlingshot(): boolean {
        return this.state.dragging_slingshot;
    }

    getDragDelta(): { dx: number; dy: number } {
        return {
            dx: this.state.pointer_x - this.state.drag_start_x,
            dy: this.state.pointer_y - this.state.drag_start_y
        };
    }
}
