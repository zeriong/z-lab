/**
 * Input - Handle mouse/touch input for slingshot
 */
class Input {
  constructor(canvas, gameState, physicsEngine) {
    this.canvas = canvas;
    this.gameState = gameState;
    this.physicsEngine = physicsEngine;

    // Drag state
    this.isDragging = false;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.draggedBird = null;

    // Slingshot position
    this.slingshotPos = { x: 100, y: 480 };

    // Bind events
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));

    this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
  }

  /**
   * Get canvas coordinates from event
   */
  getCanvasCoords(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  /**
   * Check if point is near slingshot bird
   */
  isNearBird(pos, bird) {
    const dx = pos.x - bird.position.x;
    const dy = pos.y - bird.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < 40; // Drag radius
  }

  /**
   * Mouse down
   */
  onMouseDown(e) {
    if (this.gameState.phase !== 'playing') return;
    if (this.gameState.currentBirdActive) return; // Already launched

    const pos = this.getCanvasCoords(e.clientX, e.clientY);

    // Get the bird body (should be one active bird)
    const birds = this.physicsEngine.getBodiesByType('bird');
    if (birds.length === 0) return;

    const bird = birds[0];
    if (!this.isNearBird(pos, bird)) return;

    this.isDragging = true;
    this.dragStartPos = { x: pos.x, y: pos.y };
    this.dragCurrentPos = { x: pos.x, y: pos.y };
    this.draggedBird = bird;

    this.gameState.isAiming = true;
    this.gameState.dragStart = this.dragStartPos;
    this.gameState.dragCurrent = this.dragCurrentPos;
  }

  /**
   * Mouse move
   */
  onMouseMove(e) {
    if (!this.isDragging || !this.draggedBird) return;

    const pos = this.getCanvasCoords(e.clientX, e.clientY);
    this.dragCurrentPos = { x: pos.x, y: pos.y };

    // Limit drag distance
    const dx = this.dragCurrentPos.x - this.dragStartPos.x;
    const dy = this.dragCurrentPos.y - this.dragStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 150) {
      const ratio = 150 / dist;
      this.dragCurrentPos.x = this.dragStartPos.x + dx * ratio;
      this.dragCurrentPos.y = this.dragStartPos.y + dy * ratio;
    }

    this.gameState.dragCurrent = this.dragCurrentPos;

    // Update trajectory prediction
    if (this.draggedBird) {
      const forceX = (this.dragStartPos.x - this.dragCurrentPos.x) * 0.05;
      const forceY = (this.dragStartPos.y - this.dragCurrentPos.y) * 0.05;

      // Simulate with predicted velocity
      const tempBird = { ...this.draggedBird };
      tempBird.velocity = { x: forceX, y: forceY };

      this.gameState.trajectoryPoints = this.physicsEngine.simulateTrajectory(tempBird, 40);
    }
  }

  /**
   * Mouse up
   */
  onMouseUp(e) {
    if (!this.isDragging || !this.draggedBird) return;

    this.launchBird();
  }

  /**
   * Mouse leave canvas
   */
  onMouseLeave(e) {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStartPos = null;
      this.dragCurrentPos = null;
      this.draggedBird = null;
      this.gameState.isAiming = false;
      this.gameState.dragStart = null;
      this.gameState.dragCurrent = null;
      this.gameState.trajectoryPoints = [];
    }
  }

  /**
   * Touch start
   */
  onTouchStart(e) {
    e.preventDefault();
    if (this.gameState.phase !== 'playing') return;
    if (this.gameState.currentBirdActive) return;

    const touch = e.touches[0];
    const pos = this.getCanvasCoords(touch.clientX, touch.clientY);

    const birds = this.physicsEngine.getBodiesByType('bird');
    if (birds.length === 0) return;

    const bird = birds[0];
    if (!this.isNearBird(pos, bird)) return;

    this.isDragging = true;
    this.dragStartPos = { x: pos.x, y: pos.y };
    this.dragCurrentPos = { x: pos.x, y: pos.y };
    this.draggedBird = bird;

    this.gameState.isAiming = true;
    this.gameState.dragStart = this.dragStartPos;
    this.gameState.dragCurrent = this.dragCurrentPos;
  }

  /**
   * Touch move
   */
  onTouchMove(e) {
    e.preventDefault();
    if (!this.isDragging || !this.draggedBird) return;

    const touch = e.touches[0];
    const pos = this.getCanvasCoords(touch.clientX, touch.clientY);
    this.dragCurrentPos = { x: pos.x, y: pos.y };

    // Limit drag distance
    const dx = this.dragCurrentPos.x - this.dragStartPos.x;
    const dy = this.dragCurrentPos.y - this.dragStartPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 150) {
      const ratio = 150 / dist;
      this.dragCurrentPos.x = this.dragStartPos.x + dx * ratio;
      this.dragCurrentPos.y = this.dragStartPos.y + dy * ratio;
    }

    this.gameState.dragCurrent = this.dragCurrentPos;

    // Update trajectory
    if (this.draggedBird) {
      const forceX = (this.dragStartPos.x - this.dragCurrentPos.x) * 0.05;
      const forceY = (this.dragStartPos.y - this.dragCurrentPos.y) * 0.05;

      const tempBird = { ...this.draggedBird };
      tempBird.velocity = { x: forceX, y: forceY };

      this.gameState.trajectoryPoints = this.physicsEngine.simulateTrajectory(tempBird, 40);
    }
  }

  /**
   * Touch end
   */
  onTouchEnd(e) {
    e.preventDefault();
    if (!this.isDragging || !this.draggedBird) return;

    this.launchBird();
  }

  /**
   * Launch the bird with calculated force
   */
  launchBird() {
    if (!this.draggedBird || !this.dragStartPos || !this.dragCurrentPos) return;

    // Calculate force from drag distance
    const forceX = (this.dragStartPos.x - this.dragCurrentPos.x) * 0.05;
    const forceY = (this.dragStartPos.y - this.dragCurrentPos.y) * 0.05;

    // Apply velocity
    this.physicsEngine.setVelocity(this.draggedBird, forceX, forceY);

    // Mark bird as launched
    this.gameState.launchBird();
    this.gameState.currentBirdActive = true;

    // Reset drag state
    this.isDragging = false;
    this.dragStartPos = null;
    this.dragCurrentPos = null;
    this.draggedBird = null;
    this.gameState.isAiming = false;
    this.gameState.dragStart = null;
    this.gameState.dragCurrent = null;
    this.gameState.trajectoryPoints = [];
  }

  /**
   * Update slingshot position for current stage
   */
  updateSlingshotPosition(stage) {
    this.slingshotPos = stage.slingshot;
  }
}
