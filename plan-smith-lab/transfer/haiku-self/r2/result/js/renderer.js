/**
 * Renderer - Canvas 2D rendering
 * Draws game state, UI, and overlays
 */
class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // Ensure canvas is full width
    this.canvas.width = window.innerWidth < 1000 ? window.innerWidth : 1000;
    this.width = this.canvas.width;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
  }

  /**
   * Clear canvas with sky gradient
   */
  clear() {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Draw ground
   */
  drawGround() {
    this.ctx.fillStyle = '#8B7355';
    this.ctx.fillRect(0, this.height - 40, this.width, 40);

    // Grass on top
    this.ctx.fillStyle = '#228B22';
    this.ctx.fillRect(0, this.height - 40, this.width, 4);
  }

  /**
   * Draw slingshot
   */
  drawSlingshot(x, y) {
    const ctx = this.ctx;

    // Anchor
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Posts
    ctx.strokeStyle = '#654321';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x - 15, y - 40);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 15, y);
    ctx.lineTo(x + 15, y - 40);
    ctx.stroke();
  }

  /**
   * Draw a circle body (bird or pig)
   */
  drawCircle(body, color, size = 14) {
    const ctx = this.ctx;
    const pos = body.position;
    const angle = body.angle;

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);

    // Main circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Eye detail
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(size / 3, -size / 3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * Draw a rectangle body (block)
   */
  drawRectangle(body, color) {
    const ctx = this.ctx;
    const pos = body.position;
    const angle = body.angle;
    const vertices = body.vertices;

    ctx.save();

    // Draw filled polygon
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    for (let i = 1; i < vertices.length; i++) {
      ctx.lineTo(vertices[i].x, vertices[i].y);
    }
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  /**
   * Draw trajectory prediction
   */
  drawTrajectory(points) {
    const ctx = this.ctx;

    if (points.length < 2) return;

    ctx.strokeStyle = 'rgba(255, 200, 100, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw endpoint circle
    const last = points[points.length - 1];
    ctx.fillStyle = 'rgba(255, 200, 100, 0.5)';
    ctx.beginPath();
    ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Draw drag indicator
   */
  drawDragIndicator(dragStart, dragCurrent) {
    if (!dragStart || !dragCurrent) return;

    const ctx = this.ctx;
    const dx = dragCurrent.x - dragStart.x;
    const dy = dragCurrent.y - dragStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Line from start to current
    ctx.strokeStyle = 'rgba(200, 50, 50, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(dragStart.x, dragStart.y);
    ctx.lineTo(dragCurrent.x, dragCurrent.y);
    ctx.stroke();

    // Start indicator
    ctx.fillStyle = 'rgba(200, 50, 50, 0.6)';
    ctx.beginPath();
    ctx.arc(dragStart.x, dragStart.y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Distance text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.font = '14px Arial';
    ctx.fillText(`Power: ${Math.floor(dist)}`, dragCurrent.x + 10, dragCurrent.y - 10);
  }

  /**
   * Draw HUD (score, stage info, etc.)
   */
  drawHUD(score, stageNum, movesUsed, maxMoves) {
    // This is handled by HTML elements now, but kept for reference
  }

  /**
   * Draw pause overlay
   */
  drawPauseOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, this.width, this.height);
  }

  /**
   * Render full game state
   */
  render(gameState, physicsEngine) {
    this.clear();
    this.drawGround();

    const stage = STAGES[gameState.currentStage];
    if (!stage) return;

    // Draw slingshot
    this.drawSlingshot(stage.slingshot.x, stage.slingshot.y);

    // Draw all bodies
    const birds = physicsEngine.getBodiesByType('bird');
    for (let bird of birds) {
      this.drawCircle(bird, '#FF6B6B', 14);
    }

    const pigs = physicsEngine.getBodiesByType('pig');
    for (let pig of pigs) {
      this.drawCircle(pig, '#FF9999', 16);
    }

    const blocks = physicsEngine.getBodiesByType('block');
    for (let block of blocks) {
      const meta = physicsEngine.getBodyMeta(block);
      const color = meta.material === 'stone' ? '#A9A9A9' : '#DEB887';
      this.drawRectangle(block, color);
    }

    // Draw trajectory during aiming
    if (gameState.isAiming && gameState.trajectoryPoints.length > 0) {
      this.drawTrajectory(gameState.trajectoryPoints);
    }

    // Draw drag indicator
    if (gameState.dragStart && gameState.dragCurrent) {
      this.drawDragIndicator(gameState.dragStart, gameState.dragCurrent);
    }

    // Draw pause overlay if paused
    if (gameState.phase === 'paused') {
      this.drawPauseOverlay();
    }
  }
}
