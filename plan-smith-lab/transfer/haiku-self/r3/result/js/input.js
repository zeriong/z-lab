class Input {
  constructor(canvasId, gameState, physics) {
    this.canvas = document.getElementById(canvasId);
    this.gameState = gameState;
    this.physics = physics;
    this.slingX = 100;
    this.slingY = 500;
    this.isMouseDown = false;

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));

    document.getElementById('pauseButton').addEventListener('click', () => this.handlePauseClick());
  }

  handlePauseClick() {
    if (this.gameState.gamePhase === 'playing') {
      this.gameState.setPhase('paused');
    }
  }

  onMouseDown(e) {
    if (this.gameState.gamePhase !== 'playing') return;
    if (this.gameState.birdActive) return; // Bird already launched

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (this.isInSlingshot(x, y)) {
      this.isMouseDown = true;
      this.gameState.setDragStart(x, y);
      this.gameState.isAiming = true;
    }
  }

  onMouseMove(e) {
    if (!this.isMouseDown || this.gameState.gamePhase !== 'playing') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.gameState.setDragCurrent(x, y);

    if (this.gameState.dragStart) {
      const points = this.physics.calculateTrajectory(
        this.slingX,
        this.slingY,
        x,
        y
      );
      this.gameState.setTrajectoryPoints(points);
    }
  }

  onMouseUp(e) {
    if (!this.isMouseDown) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.isMouseDown = false;
    this.gameState.isAiming = false;

    if (this.gameState.dragStart && this.gameState.bodies.bird) {
      this.physics.launchBird(
        this.gameState.bodies.bird,
        this.slingX,
        this.slingY,
        x,
        y
      );
      this.gameState.birdActive = true;
      this.gameState.incrementMoves();
    }

    this.gameState.clearDrag();
  }

  onTouchStart(e) {
    if (this.gameState.gamePhase !== 'playing') return;
    if (this.gameState.birdActive) return;

    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (this.isInSlingshot(x, y)) {
      this.isMouseDown = true;
      this.gameState.setDragStart(x, y);
      this.gameState.isAiming = true;
    }
  }

  onTouchMove(e) {
    if (!this.isMouseDown || this.gameState.gamePhase !== 'playing') return;

    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.gameState.setDragCurrent(x, y);

    if (this.gameState.dragStart) {
      const points = this.physics.calculateTrajectory(
        this.slingX,
        this.slingY,
        x,
        y
      );
      this.gameState.setTrajectoryPoints(points);
    }
  }

  onTouchEnd(e) {
    if (!this.isMouseDown) return;

    const touch = e.changedTouches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.isMouseDown = false;
    this.gameState.isAiming = false;

    if (this.gameState.dragStart && this.gameState.bodies.bird) {
      this.physics.launchBird(
        this.gameState.bodies.bird,
        this.slingX,
        this.slingY,
        x,
        y
      );
      this.gameState.birdActive = true;
      this.gameState.incrementMoves();
    }

    this.gameState.clearDrag();
  }

  isInSlingshot(x, y) {
    const dist = Math.sqrt(
      Math.pow(x - this.slingX, 2) + Math.pow(y - this.slingY, 2)
    );
    return dist < 30;
  }

  setSlingshot(x, y) {
    this.slingX = x;
    this.slingY = y;
  }
}
