// Slingshot mechanics
class Slingshot {
  constructor(x, y, canvas) {
    this.position = { x, y };
    this.canvas = canvas;
    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.maxDragDistance = 100;
    this.currentBird = null;
    this.trajectoryPoints = [];

    this.setupEventListeners();
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e));
  }

  handleMouseDown(e) {
    if (stateManager.getState() !== GameState.AIMING) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const distToBird = Math.sqrt(
      (x - this.position.x) ** 2 + (y - this.position.y) ** 2
    );

    if (distToBird < 30) {
      this.isDragging = true;
      this.dragStart = { x, y };
      this.dragCurrent = { x, y };
    }
  }

  handleMouseMove(e) {
    if (!this.isDragging || stateManager.getState() !== GameState.AIMING) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let dx = x - this.dragStart.x;
    let dy = y - this.dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.maxDragDistance) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * this.maxDragDistance;
      dy = Math.sin(angle) * this.maxDragDistance;
    }

    this.dragCurrent = { x: this.dragStart.x + dx, y: this.dragStart.y + dy };
    this.updateTrajectory();
  }

  handleMouseUp(e) {
    if (!this.isDragging || stateManager.getState() !== GameState.AIMING) return;

    this.launch();
    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.trajectoryPoints = [];
  }

  handleTouchStart(e) {
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (stateManager.getState() !== GameState.AIMING) return;

    const distToBird = Math.sqrt(
      (x - this.position.x) ** 2 + (y - this.position.y) ** 2
    );

    if (distToBird < 30) {
      this.isDragging = true;
      this.dragStart = { x, y };
      this.dragCurrent = { x, y };
    }
  }

  handleTouchMove(e) {
    if (!this.isDragging || stateManager.getState() !== GameState.AIMING) return;

    e.preventDefault();
    const touch = e.touches[0];
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    let dx = x - this.dragStart.x;
    let dy = y - this.dragStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > this.maxDragDistance) {
      const angle = Math.atan2(dy, dx);
      dx = Math.cos(angle) * this.maxDragDistance;
      dy = Math.sin(angle) * this.maxDragDistance;
    }

    this.dragCurrent = { x: this.dragStart.x + dx, y: this.dragStart.y + dy };
    this.updateTrajectory();
  }

  handleTouchEnd(e) {
    if (!this.isDragging || stateManager.getState() !== GameState.AIMING) return;

    this.launch();
    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.trajectoryPoints = [];
  }

  updateTrajectory() {
    this.trajectoryPoints = [];
    if (!this.currentBird || !this.dragCurrent) return;

    const dx = this.position.x - this.dragCurrent.x;
    const dy = this.position.y - this.dragCurrent.y;
    const speed = Math.min(Math.sqrt(dx * dx + dy * dy) * 0.5, 25);

    let x = this.position.x;
    let y = this.position.y;
    let vx = (dx / Math.sqrt(dx * dx + dy * dy)) * speed;
    let vy = (dy / Math.sqrt(dx * dx + dy * dy)) * speed;

    const gravity = 1;

    for (let i = 0; i < 30; i++) {
      this.trajectoryPoints.push({ x, y });
      x += vx;
      y += vy;
      vy += gravity;

      if (x < 0 || x > this.canvas.width || y > this.canvas.height) break;
    }
  }

  launch() {
    if (!this.currentBird || !this.dragCurrent) return;

    const dx = this.position.x - this.dragCurrent.x;
    const dy = this.position.y - this.dragCurrent.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.min(distance * 0.5, 25);

    const vx = (dx / distance) * speed;
    const vy = (dy / distance) * speed;

    physicsEngine.launchBird(this.currentBird, { x: vx, y: vy });
    stateManager.setState(GameState.FLYING);
  }

  setBird(bird) {
    this.currentBird = bird;
    if (bird) {
      Body.setPosition(bird, this.position);
      Body.setVelocity(bird, { x: 0, y: 0 });
    }
  }

  isDraggingBird() {
    return this.isDragging;
  }

  render(ctx) {
    // Draw slingshot base
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(this.position.x - 20, this.position.y, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.position.x - 20, this.position.y + 30, 8, 0, Math.PI * 2);
    ctx.fill();

    // Draw slingshot bands
    let birdX = this.position.x;
    let birdY = this.position.y;

    if (this.isDragging && this.dragCurrent) {
      birdX = this.dragCurrent.x;
      birdY = this.dragCurrent.y;
    } else if (this.currentBird) {
      birdX = this.currentBird.position.x;
      birdY = this.currentBird.position.y;
    }

    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.position.x - 20, this.position.y);
    ctx.lineTo(birdX, birdY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(this.position.x - 20, this.position.y + 30);
    ctx.lineTo(birdX, birdY);
    ctx.stroke();

    // Draw trajectory
    if (this.isDragging && this.trajectoryPoints.length > 1) {
      ctx.strokeStyle = 'rgba(200, 200, 200, 0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(this.trajectoryPoints[0].x, this.trajectoryPoints[0].y);
      for (let i = 1; i < this.trajectoryPoints.length; i++) {
        ctx.lineTo(this.trajectoryPoints[i].x, this.trajectoryPoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}

let slingshot;
