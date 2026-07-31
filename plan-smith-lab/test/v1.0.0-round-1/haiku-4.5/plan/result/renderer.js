// Canvas rendering
class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = 800;
    this.canvas.height = 600;
  }

  clear() {
    this.ctx.fillStyle = '#e0f6ff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderGame() {
    this.clear();
    this.renderStructures();
    this.renderPigs();
    this.renderBirds();
    this.renderSlingshot();
    this.renderUI();
  }

  renderStructures() {
    const structures = physicsEngine.bodies.structures;
    structures.forEach(body => {
      this.renderBody(body, this.getMaterialColor(body.material));
    });
  }

  renderPigs() {
    const pigs = physicsEngine.bodies.pigs;
    pigs.forEach(body => {
      this.renderCircle(body, '#FF69B4', 'pink');
    });
  }

  renderBirds() {
    const birds = physicsEngine.bodies.birds;
    birds.forEach(body => {
      this.renderCircle(body, '#FFD700', 'bird');
    });
  }

  renderBody(body, color) {
    const { position, angle, circleRadius } = body;

    this.ctx.save();
    this.ctx.translate(position.x, position.y);
    this.ctx.rotate(angle);

    if (circleRadius) {
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, circleRadius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    } else {
      const { vertices } = body.parts[0];
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(vertices[0].x - position.x, vertices[0].y - position.y);
      for (let i = 1; i < vertices.length; i++) {
        this.ctx.lineTo(vertices[i].x - position.x, vertices[i].y - position.y);
      }
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  renderCircle(body, color, type) {
    const { position, angle } = body;
    const radius = 10;

    this.ctx.save();
    this.ctx.translate(position.x, position.y);
    this.ctx.rotate(angle);

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.fill();

    if (type === 'pig') {
      // Draw pig eyes
      this.ctx.fillStyle = 'white';
      this.ctx.beginPath();
      this.ctx.arc(-4, -3, 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(4, -3, 2, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = 'black';
      this.ctx.beginPath();
      this.ctx.arc(-4, -3, 1, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(4, -3, 1, 0, Math.PI * 2);
      this.ctx.fill();

      // Draw pig snout
      this.ctx.fillStyle = '#ff99cc';
      this.ctx.beginPath();
      this.ctx.arc(0, 4, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }

    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    this.ctx.stroke();

    this.ctx.restore();
  }

  renderSlingshot() {
    if (slingshot) {
      slingshot.render(this.ctx);
    }
  }

  getMaterialColor(material) {
    switch (material) {
      case 'wood':
        return '#D2691E';
      case 'stone':
        return '#808080';
      case 'glass':
        return '#B0E0E6';
      default:
        return '#999';
    }
  }

  renderUI() {
    // Draw score/stage info
    this.ctx.fillStyle = '#333';
    this.ctx.font = 'bold 20px Arial';
    this.ctx.fillText(`Stage: ${gameState.currentStage}`, 20, 40);
    this.ctx.fillText(`Score: ${gameState.score}`, 20, 70);
    this.ctx.fillText(`Pigs: ${physicsEngine.getAlivePigs()}`, 20, 100);
  }

  renderMenu() {
    this.clear();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderPauseState() {
    // The overlay is handled by HTML/CSS
  }

  renderResultState() {
    // The overlay is handled by HTML/CSS
  }

  render() {
    const state = stateManager.getState();

    if (state === GameState.MENU) {
      this.renderMenu();
    } else if (state === GameState.PAUSED) {
      this.renderGame();
      this.renderPauseState();
    } else if (state === GameState.RESULT) {
      this.renderGame();
      this.renderResultState();
    } else {
      this.renderGame();
    }
  }
}

let renderer;
