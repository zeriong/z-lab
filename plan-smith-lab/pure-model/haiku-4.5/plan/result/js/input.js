export class InputHandler {
    constructor(canvas, gameState, physicsEngine) {
        this.canvas = canvas;
        this.gameState = gameState;
        this.physicsEngine = physicsEngine;

        this.isMouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;

        this.slingshotX = 100;
        this.slingshotY = 500;
        this.slingshotRadius = 40;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));

        // Touch events
        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
    }

    getCanvasCoords(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    }

    isNearSlingshot(x, y) {
        const dx = x - this.slingshotX;
        const dy = y - this.slingshotY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.slingshotRadius * 2;
    }

    onMouseDown(e) {
        if (this.gameState.gamePhase !== 'playing') return;
        if (this.gameState.isAiming || this.gameState.birdInFlight) return;

        const coords = this.getCanvasCoords(e.clientX, e.clientY);
        if (this.isNearSlingshot(coords.x, coords.y)) {
            this.isMouseDown = true;
            this.mouseX = coords.x;
            this.mouseY = coords.y;
            this.gameState.startAim(this.slingshotX, this.slingshotY);
        }
    }

    onMouseMove(e) {
        if (!this.isMouseDown) return;

        const coords = this.getCanvasCoords(e.clientX, e.clientY);
        this.mouseX = coords.x;
        this.mouseY = coords.y;

        this.gameState.updateAim(this.mouseX, this.mouseY);
        this.updateTrajectory();
    }

    onMouseUp(e) {
        if (!this.isMouseDown) return;

        this.isMouseDown = false;
        this.fire();
    }

    onMouseLeave(e) {
        if (this.isMouseDown) {
            this.isMouseDown = false;
            this.gameState.isAiming = false;
            this.gameState.dragStart = null;
            this.gameState.dragCurrent = null;
            this.gameState.trajectoryPoints = [];
        }
    }

    onTouchStart(e) {
        if (this.gameState.gamePhase !== 'playing') return;
        if (this.gameState.isAiming || this.gameState.birdInFlight) return;

        const touch = e.touches[0];
        const coords = this.getCanvasCoords(touch.clientX, touch.clientY);

        if (this.isNearSlingshot(coords.x, coords.y)) {
            this.isMouseDown = true;
            this.mouseX = coords.x;
            this.mouseY = coords.y;
            this.gameState.startAim(this.slingshotX, this.slingshotY);
            e.preventDefault();
        }
    }

    onTouchMove(e) {
        if (!this.isMouseDown) return;

        const touch = e.touches[0];
        const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
        this.mouseX = coords.x;
        this.mouseY = coords.y;

        this.gameState.updateAim(this.mouseX, this.mouseY);
        this.updateTrajectory();
        e.preventDefault();
    }

    onTouchEnd(e) {
        if (!this.isMouseDown) return;

        this.isMouseDown = false;
        this.fire();
        e.preventDefault();
    }

    updateTrajectory() {
        if (!this.gameState.isAiming || !this.gameState.dragStart || !this.gameState.dragCurrent) {
            return;
        }

        const velocity = this.gameState.calculateLaunchVelocity(
            this.gameState.dragStart.x,
            this.gameState.dragStart.y,
            this.gameState.dragCurrent.x,
            this.gameState.dragCurrent.y
        );

        const startPos = { x: this.slingshotX, y: this.slingshotY };
        this.gameState.trajectoryPoints = this.physicsEngine.simulateTrajectory(
            { position: startPos },
            velocity,
            30
        );
    }

    fire() {
        if (!this.gameState.dragStart || !this.gameState.dragCurrent) {
            this.gameState.endAim();
            return;
        }

        const velocity = this.gameState.calculateLaunchVelocity(
            this.gameState.dragStart.x,
            this.gameState.dragStart.y,
            this.gameState.dragCurrent.x,
            this.gameState.dragCurrent.y
        );

        if (this.gameState.bodies.bird) {
            this.physicsEngine.setVelocity(
                this.gameState.bodies.bird,
                velocity.x,
                velocity.y
            );
        }

        this.gameState.endAim();
    }

    setSlingshot(x, y) {
        this.slingshotX = x;
        this.slingshotY = y;
    }
}
