class Renderer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 1024;
    this.canvas.height = 600;
  }

  draw(gameState, physics) {
    this.clearCanvas();
    this.drawGame(gameState, physics);
    if (gameState.isAiming && gameState.dragCurrent) {
      this.drawTrajectory(gameState);
      this.drawAimingGuide(gameState);
    }
  }

  clearCanvas() {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGame(gameState, physics) {
    const bodies = physics.getAllBodies();

    for (const body of bodies) {
      if (body.label === 'ground') {
        this.drawGround(body);
      } else if (body.label === 'bird') {
        this.drawBird(body, gameState.birdActive);
      } else if (body.label === 'pig') {
        this.drawPig(body);
      } else if (body.label === 'block') {
        this.drawBlock(body);
      }
    }
  }

  drawBird(body, active) {
    this.ctx.save();
    this.ctx.translate(body.position.x, body.position.y);
    this.ctx.rotate(body.angle);

    // Bird shape
    this.ctx.fillStyle = '#FFD700';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 12, 0, Math.PI * 2);
    this.ctx.fill();

    // Eye
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(6, -3, 3, 0, Math.PI * 2);
    this.ctx.fill();

    // Pupil
    this.ctx.fillStyle = '#FFF';
    this.ctx.beginPath();
    this.ctx.arc(7, -3, 1.5, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawPig(body) {
    this.ctx.save();
    this.ctx.translate(body.position.x, body.position.y);
    this.ctx.rotate(body.angle);

    // Pig body
    this.ctx.fillStyle = '#90EE90';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
    this.ctx.fill();

    // HP indicator (red overlay if damaged)
    if (body.hp < 100) {
      const hpRatio = body.hp / 100;
      this.ctx.fillStyle = `rgba(255, 0, 0, ${1 - hpRatio})`;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 10, 0, Math.PI * 2);
      this.ctx.fill();
    }

    // Eyes
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(-4, -3, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(4, -3, 2, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.restore();
  }

  drawBlock(body) {
    const w = body.bounds.max.x - body.bounds.min.x;
    const h = body.bounds.max.y - body.bounds.min.y;

    this.ctx.save();
    this.ctx.translate(body.position.x, body.position.y);
    this.ctx.rotate(body.angle);

    // Block color based on material
    if (body.material === 'wood') {
      this.ctx.fillStyle = '#8B4513';
    } else {
      this.ctx.fillStyle = '#A9A9A9';
    }

    this.ctx.fillRect(-w / 2, -h / 2, w, h);

    // Border
    this.ctx.strokeStyle = '#000';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(-w / 2, -h / 2, w, h);

    // HP indicator
    if (body.hp < (body.material === 'wood' ? 80 : 150)) {
      const maxHp = body.material === 'wood' ? 80 : 150;
      const hpRatio = Math.max(0, body.hp / maxHp);
      this.ctx.fillStyle = `rgba(255, 0, 0, ${1 - hpRatio})`;
      this.ctx.fillRect(-w / 2, -h / 2, w, h);
    }

    this.ctx.restore();
  }

  drawGround(body) {
    const w = body.bounds.max.x - body.bounds.min.x;
    const h = body.bounds.max.y - body.bounds.min.y;

    this.ctx.fillStyle = '#8B7355';
    this.ctx.fillRect(body.bounds.min.x, body.bounds.min.y, w, h);

    this.ctx.strokeStyle = '#654321';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(body.bounds.min.x, body.bounds.min.y, w, h);
  }

  drawTrajectory(gameState) {
    const points = gameState.trajectoryPoints;
    if (points.length < 2) return;

    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]);

    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.stroke();

    this.ctx.setLineDash([]);
  }

  drawAimingGuide(gameState) {
    if (!gameState.dragStart) return;

    // Draw line from slingshot to cursor
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(gameState.dragStart.x, gameState.dragStart.y);
    this.ctx.lineTo(gameState.dragCurrent.x, gameState.dragCurrent.y);
    this.ctx.stroke();

    // Draw drag distance
    const dist = Math.sqrt(
      Math.pow(gameState.dragCurrent.x - gameState.dragStart.x, 2) +
      Math.pow(gameState.dragCurrent.y - gameState.dragStart.y, 2)
    );

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`Power: ${Math.round(dist)}`, gameState.dragCurrent.x + 5, gameState.dragCurrent.y - 5);
  }

  updateUI(gameState, maxMoves) {
    document.getElementById('gameScore').textContent = `Score: ${gameState.score}`;
    document.getElementById('stageInfo').textContent = `Stage ${gameState.currentStage + 1}/10`;
    document.getElementById('movesInfo').textContent = `Moves: ${gameState.movesUsed}/${maxMoves}`;
  }

  showMenu() {
    document.getElementById('menuModal').classList.add('active');
    document.getElementById('pauseModal').classList.remove('active');
    document.getElementById('levelCompleteModal').classList.remove('active');
    document.getElementById('gameOverModal').classList.remove('active');
  }

  showPause() {
    document.getElementById('pauseModal').classList.add('active');
    document.getElementById('menuModal').classList.remove('active');
    document.getElementById('levelCompleteModal').classList.remove('active');
    document.getElementById('gameOverModal').classList.remove('active');
  }

  showLevelComplete(stageName, score) {
    document.getElementById('levelCompleteTitle').textContent = `${stageName} Clear!`;
    document.getElementById('levelCompleteScore').textContent = `Score: ${score}`;
    document.getElementById('levelCompleteModal').classList.add('active');
    document.getElementById('menuModal').classList.remove('active');
    document.getElementById('pauseModal').classList.remove('active');
    document.getElementById('gameOverModal').classList.remove('active');
  }

  showGameOver(message) {
    document.getElementById('gameOverMessage').textContent = message;
    document.getElementById('gameOverModal').classList.add('active');
    document.getElementById('menuModal').classList.remove('active');
    document.getElementById('pauseModal').classList.remove('active');
    document.getElementById('levelCompleteModal').classList.remove('active');
  }

  hideAllModals() {
    document.getElementById('menuModal').classList.remove('active');
    document.getElementById('pauseModal').classList.remove('active');
    document.getElementById('levelCompleteModal').classList.remove('active');
    document.getElementById('gameOverModal').classList.remove('active');
  }
}
