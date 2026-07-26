import Matter from 'matter-js';

export class Game {
  constructor(canvas, stagesData) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.stagesData = stagesData;

    // Set canvas size
    this.canvas.width = 800;
    this.canvas.height = 600;

    // Matter.js setup
    this.Engine = Matter.Engine;
    this.World = Matter.World;
    this.Body = Matter.Body;
    this.Bodies = Matter.Bodies;
    this.Events = Matter.Events;
    this.Composite = Matter.Composite;

    this.engine = this.Engine.create();
    this.world = this.engine.world;
    this.world.gravity.y = 1;

    // Game state
    this.state = 'MENU'; // MENU, INGAME, PAUSED, RESULT
    this.currentStage = 0;
    this.score = 0;
    this.birds = [];
    this.currentBirdIndex = 0;
    this.pigs = [];
    this.structures = [];
    this.walls = [];
    this.resultsShown = false;

    // Physics parameters
    this.slingshotX = 100;
    this.slingshotY = 500;
    this.dragStart = null;
    this.maxDragDistance = 150;

    // Input handling
    this.setupInputHandlers();
  }

  setupInputHandlers() {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
  }

  onMouseDown(e) {
    if (this.state !== 'INGAME') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicking on slingshot area
    const dist = Math.hypot(x - this.slingshotX, y - this.slingshotY);
    if (dist < 40 && this.currentBirdIndex < this.birds.length && !this.birds[this.currentBirdIndex].launched) {
      this.dragStart = { x, y };
    }
  }

  onMouseMove(e) {
    if (!this.dragStart || this.state !== 'INGAME') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = this.dragStart.x - x;
    const dy = this.dragStart.y - y;
    const distance = Math.hypot(dx, dy);

    if (distance > this.maxDragDistance) {
      const angle = Math.atan2(dy, dx);
      this.dragStart.x = x + Math.cos(angle) * this.maxDragDistance;
      this.dragStart.y = y + Math.sin(angle) * this.maxDragDistance;
    }
  }

  onMouseUp(e) {
    if (!this.dragStart || this.state !== 'INGAME') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = this.dragStart.x - x;
    const dy = this.dragStart.y - y;

    if ((Math.abs(dx) > 10 || Math.abs(dy) > 10) && this.currentBirdIndex < this.birds.length) {
      const bird = this.birds[this.currentBirdIndex];
      if (!bird.launched) {
        this.launchBird(bird, dx, dy);
        this.currentBirdIndex++;
      }
    }

    this.dragStart = null;
  }

  launchBird(bird, dx, dy) {
    bird.launched = true;
    const vx = dx * 0.01;
    const vy = dy * 0.01;
    this.Body.setVelocity(bird.body, { x: vx, y: vy });
  }

  start() {
    this.gameLoop();
  }

  gameLoop() {
    this.update();
    this.render();
    requestAnimationFrame(() => this.gameLoop());
  }

  update() {
    if (this.state === 'INGAME') {
      this.Engine.update(this.engine, 1000 / 60);

      // Check for pigs falling off
      this.pigs = this.pigs.filter(pig => {
        if (pig.body.position.y > 700) {
          this.World.remove(this.world, pig.body);
          return false;
        }
        return true;
      });

      // Check for birds falling off
      this.birds.forEach((bird, idx) => {
        if (bird.body.position.y > 700 && idx < this.currentBirdIndex) {
          this.World.remove(this.world, bird.body);
        }
      });

      // Check for structures falling
      this.structures = this.structures.filter(struct => {
        if (!struct.destroyed && struct.body.position.y > 700) {
          this.World.remove(this.world, struct.body);
          return false;
        }
        return true;
      });

      // Detect collisions for destruction
      this.detectDestructions();

      // Check game over/clear conditions
      this.checkGameConditions();
    }
  }

  detectDestructions() {
    // Check structures for destruction based on velocity
    this.structures.forEach(struct => {
      if (!struct.destroyed && struct.body.velocity) {
        const speed = Math.hypot(struct.body.velocity.x, struct.body.velocity.y);
        if (speed > 5) {
          struct.destroyed = true;
          setTimeout(() => {
            this.World.remove(this.world, struct.body);
          }, 500);
        }
      }
    });
  }

  checkGameConditions() {
    if (this.resultsShown) return;

    const allBirdsUsed = this.currentBirdIndex >= this.birds.length;
    const noPigs = this.pigs.length === 0;

    if (noPigs) {
      // Stage cleared
      this.state = 'RESULT';
      this.resultsShown = true;
      this.showResult(true);
    } else if (allBirdsUsed && !noPigs) {
      // Game over
      this.state = 'RESULT';
      this.resultsShown = true;
      this.showResult(false);
    }
  }

  showResult(cleared) {
    const resultScreen = document.getElementById('resultScreen');
    const resultTitle = document.getElementById('resultTitle');
    const resultScore = document.getElementById('resultScore');

    if (cleared) {
      resultTitle.textContent = 'Stage Cleared! 🎉';
      this.score += this.birds.length - this.currentBirdIndex;
      this.score += this.pigs.length * 10;
    } else {
      resultTitle.textContent = 'Game Over ❌';
    }

    resultScore.textContent = this.score;
    resultScreen.classList.add('visible');
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw ground
    this.ctx.fillStyle = '#8B7355';
    this.ctx.fillRect(0, 550, this.canvas.width, 50);

    // Draw walls
    this.walls.forEach(wall => {
      this.ctx.fillStyle = '#333';
      this.ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    });

    // Draw structures
    this.structures.forEach(struct => {
      const pos = struct.body.position;
      const angle = struct.body.angle;

      this.ctx.save();
      this.ctx.translate(pos.x, pos.y);
      this.ctx.rotate(angle);

      if (struct.destroyed) {
        this.ctx.fillStyle = '#999';
      } else {
        if (struct.type === 'wood') {
          this.ctx.fillStyle = '#D2691E';
        } else if (struct.type === 'stone') {
          this.ctx.fillStyle = '#777';
        } else if (struct.type === 'glass') {
          this.ctx.fillStyle = 'rgba(173, 216, 230, 0.6)';
          this.ctx.strokeStyle = '#87CEEB';
          this.ctx.lineWidth = 2;
        }
      }

      this.ctx.fillRect(-struct.width / 2, -struct.height / 2, struct.width, struct.height);

      if (struct.type === 'glass') {
        this.ctx.strokeRect(-struct.width / 2, -struct.height / 2, struct.width, struct.height);
      }

      this.ctx.restore();
    });

    // Draw pigs
    this.pigs.forEach(pig => {
      const pos = pig.body.position;
      this.ctx.fillStyle = '#FF6B9D';
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, pig.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#C41E3A';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Pig eyes
      this.ctx.fillStyle = 'white';
      this.ctx.beginPath();
      this.ctx.arc(pos.x - 4, pos.y - 2, 3, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(pos.x + 4, pos.y - 2, 3, 0, Math.PI * 2);
      this.ctx.fill();
    });

    // Draw birds
    this.birds.forEach((bird, idx) => {
      const pos = bird.body.position;
      this.ctx.fillStyle = '#FFD700';
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, bird.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#FF8C00';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      // Bird eyes
      this.ctx.fillStyle = 'white';
      this.ctx.beginPath();
      this.ctx.arc(pos.x - 3, pos.y - 2, 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.beginPath();
      this.ctx.arc(pos.x + 3, pos.y - 2, 2, 0, Math.PI * 2);
      this.ctx.fill();

      if (idx < this.currentBirdIndex) {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y, bird.radius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    // Draw slingshot
    this.drawSlingshot();

    // Update stage info
    document.getElementById('stageInfo').textContent = `Stage ${this.currentStage + 1} | Pigs: ${this.pigs.length} | Birds: ${this.birds.length - this.currentBirdIndex}`;
    document.getElementById('scoreInfo').textContent = `Score: ${this.score}`;
  }

  drawSlingshot() {
    if (this.currentBirdIndex >= this.birds.length) return;

    const bird = this.birds[this.currentBirdIndex];

    // Slingshot base
    this.ctx.fillStyle = '#8B4513';
    this.ctx.fillRect(this.slingshotX - 15, this.slingshotY, 30, 80);

    // Slingshot bands
    if (!bird.launched) {
      const pos = bird.body.position;
      this.ctx.strokeStyle = '#FF1493';
      this.ctx.lineWidth = 3;

      // Left band
      this.ctx.beginPath();
      this.ctx.moveTo(this.slingshotX - 10, this.slingshotY);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();

      // Right band
      this.ctx.beginPath();
      this.ctx.moveTo(this.slingshotX + 10, this.slingshotY);
      this.ctx.lineTo(pos.x, pos.y);
      this.ctx.stroke();
    } else {
      this.ctx.strokeStyle = '#FF1493';
      this.ctx.lineWidth = 3;

      // Slingshot bands empty
      this.ctx.beginPath();
      this.ctx.moveTo(this.slingshotX - 10, this.slingshotY);
      this.ctx.lineTo(this.slingshotX - 10, this.slingshotY + 10);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(this.slingshotX + 10, this.slingshotY);
      this.ctx.lineTo(this.slingshotX + 10, this.slingshotY + 10);
      this.ctx.stroke();
    }
  }

  createStage(stageIdx) {
    // Clear old physics bodies
    this.World.clear(this.world);
    this.Engine.clear(this.engine);

    this.birds = [];
    this.structures = [];
    this.pigs = [];
    this.currentBirdIndex = 0;
    this.resultsShown = false;

    const stage = this.stagesData.stages[stageIdx];

    // Create walls
    this.walls = [
      { x: 0, y: 0, w: 800, h: 20 },
      { x: 0, y: 0, w: 20, h: 600 },
      { x: 780, y: 0, w: 20, h: 600 }
    ];

    // Create birds
    stage.birds.forEach(() => {
      const bird = {
        body: this.Bodies.circle(this.slingshotX, this.slingshotY, 8, {
          restitution: 0.8,
          friction: 0.1,
          label: 'bird'
        }),
        radius: 8,
        launched: false
      };
      this.World.add(this.world, bird.body);
      this.birds.push(bird);
    });

    // Create structures
    stage.structures.forEach(structData => {
      const struct = {
        body: this.Bodies.rectangle(structData.x, structData.y, structData.width, structData.height, {
          restitution: 0.5,
          friction: 0.5,
          label: 'structure'
        }),
        width: structData.width,
        height: structData.height,
        type: structData.type,
        destroyed: false
      };
      this.World.add(this.world, struct.body);
      this.Body.setAngle(struct.body, structData.angle);
      this.structures.push(struct);
    });

    // Create pigs
    stage.pigs.forEach(pigData => {
      const pig = {
        body: this.Bodies.circle(pigData.x, pigData.y, pigData.radius, {
          restitution: 0.6,
          friction: 0.5,
          label: 'pig'
        }),
        radius: pigData.radius
      };
      this.World.add(this.world, pig.body);
      this.pigs.push(pig);
    });

    // Create ground
    const ground = this.Bodies.rectangle(400, 580, 800, 40, { isStatic: true });
    this.World.add(this.world, ground);

    // Create left wall
    const leftWall = this.Bodies.rectangle(10, 300, 20, 600, { isStatic: true });
    this.World.add(this.world, leftWall);

    // Create right wall
    const rightWall = this.Bodies.rectangle(790, 300, 20, 600, { isStatic: true });
    this.World.add(this.world, rightWall);
  }

  startStage(stageIdx) {
    this.currentStage = stageIdx;
    this.createStage(stageIdx);
    this.state = 'INGAME';
    document.getElementById('pauseBtn').classList.remove('hidden');
  }

  pause() {
    if (this.state === 'INGAME') {
      this.state = 'PAUSED';
      document.getElementById('pauseOverlay').classList.add('visible');
    }
  }

  resume() {
    if (this.state === 'PAUSED') {
      this.state = 'INGAME';
      document.getElementById('pauseOverlay').classList.remove('visible');
    }
  }

  nextStage() {
    if (this.currentStage + 1 < this.stagesData.stages.length) {
      document.getElementById('resultScreen').classList.remove('visible');
      this.startStage(this.currentStage + 1);
    } else {
      // Game complete
      document.getElementById('resultScreen').classList.remove('visible');
      this.goToMenu();
    }
  }

  goToMenu() {
    this.state = 'MENU';
    this.score = 0;
    document.getElementById('pauseBtn').classList.add('hidden');
    document.getElementById('pauseOverlay').classList.remove('visible');
    document.getElementById('resultScreen').classList.remove('visible');
    this.World.clear(this.world);
    this.Engine.clear(this.engine);
  }
}
