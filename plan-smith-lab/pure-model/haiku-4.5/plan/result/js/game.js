import { PhysicsEngine } from './physics.js';
import { GameState } from './gameState.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { stages } from './stages.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.physicsEngine = new PhysicsEngine();
        this.gameState = new GameState(10);
        this.renderer = new Renderer(this.canvas);
        this.inputHandler = new InputHandler(this.canvas, this.gameState, this.physicsEngine);

        this.lastFrameTime = Date.now();
        this.deltaTime = 0;

        this.setupUIHandlers();
        this.renderMenu();
        this.startGameLoop();
    }

    setupUIHandlers() {
        // Play button
        document.getElementById('playBtn').addEventListener('click', () => {
            this.startNewGame();
        });

        // Pause button
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.pauseGame();
        });

        // Resume button
        document.getElementById('resumeBtn').addEventListener('click', () => {
            this.resumeGame();
        });

        // Menu from pause
        document.getElementById('menuFromPauseBtn').addEventListener('click', () => {
            this.goToMenu();
        });

        // Next stage
        document.getElementById('nextBtn').addEventListener('click', () => {
            this.nextStage();
        });

        // Menu from level complete
        document.getElementById('menuFromLevelBtn').addEventListener('click', () => {
            this.goToMenu();
        });

        // Retry button
        document.getElementById('retryBtn').addEventListener('click', () => {
            this.retryStage();
        });

        // Menu from game over
        document.getElementById('menuFromGameOverBtn').addEventListener('click', () => {
            this.goToMenu();
        });
    }

    startGameLoop() {
        const loop = () => {
            const now = Date.now();
            this.deltaTime = (now - this.lastFrameTime) / 1000;
            this.lastFrameTime = now;

            this.update();
            this.render();

            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update() {
        if (this.gameState.gamePhase === 'menu') {
            return;
        }

        if (this.gameState.gamePhase === 'paused') {
            return;
        }

        if (this.gameState.gamePhase === 'playing') {
            // Step physics
            this.physicsEngine.step(this.deltaTime);

            // Check collisions and apply damage
            this.handleCollisions();

            // Update bird state
            const birdVelocity = this.physicsEngine.getBodyVelocityMagnitude(this.gameState.bodies.bird);
            const isAtRest = this.physicsEngine.isBodyAtRest(this.gameState.bodies.bird);
            this.gameState.updateBirdState(birdVelocity, isAtRest, this.deltaTime * 1000);

            // Check win/lose conditions
            this.checkGameConditions();
        }
    }

    handleCollisions() {
        const collisions = this.physicsEngine.getCollisions();

        collisions.forEach(collision => {
            const { bodyA, bodyB } = collision;

            // Bird collisions with blocks or pigs
            if (bodyA.label === 'bird' && (bodyB.label === 'block' || bodyB.label === 'pig')) {
                this.applyDamage(bodyB, bodyA);
            } else if (bodyB.label === 'bird' && (bodyA.label === 'block' || bodyA.label === 'pig')) {
                this.applyDamage(bodyA, bodyB);
            }

            // Block collisions with blocks or pigs
            if (bodyA.label === 'block' && bodyB.label === 'pig') {
                this.applyDamage(bodyB, bodyA);
            } else if (bodyB.label === 'block' && bodyA.label === 'pig') {
                this.applyDamage(bodyA, bodyB);
            }
        });

        // Remove dead bodies
        const bodiesToRemove = [];
        this.gameState.bodies.blocks = this.gameState.bodies.blocks.filter(block => {
            if (block.hp <= 0) {
                bodiesToRemove.push(block);
                this.gameState.addScore(-10); // Penalty for block remaining
                return false;
            }
            return true;
        });

        this.gameState.bodies.pigs = this.gameState.bodies.pigs.filter(pig => {
            if (pig.hp <= 0) {
                bodiesToRemove.push(pig);
                this.gameState.addScore(1000);
                this.gameState.pigsDestroyedInRound++;
                return false;
            }
            return true;
        });

        if (bodiesToRemove.length > 0) {
            this.physicsEngine.removeBodies(bodiesToRemove);
        }
    }

    applyDamage(targetBody, sourceBody) {
        if (!targetBody.hp) return;

        const velocity = this.physicsEngine.getBodyVelocityMagnitude(sourceBody);
        const damage = Math.max(1, Math.floor(velocity * 2)); // Damage based on impact velocity
        targetBody.hp -= damage;
    }

    checkGameConditions() {
        if (this.gameState.canWinLevel()) {
            this.completeLevel();
        } else if (this.gameState.canLoseLevel()) {
            this.failLevel();
        }
    }

    completeLevel() {
        this.gameState.setPhase('levelComplete');
        this.showLevelComplete();
    }

    failLevel() {
        this.gameState.setPhase('gameOver');
        this.showGameOver();
    }

    render() {
        if (this.gameState.gamePhase === 'menu') {
            this.renderer.drawMenu();
        } else if (this.gameState.gamePhase === 'playing') {
            this.renderer.drawGame(this.gameState, this.physicsEngine);
            this.updateHUD();
        } else if (this.gameState.gamePhase === 'paused') {
            this.renderer.drawGame(this.gameState, this.physicsEngine);
            this.renderer.drawPauseOverlay();
            this.updateHUD();
        } else if (this.gameState.gamePhase === 'levelComplete') {
            this.renderer.drawGame(this.gameState, this.physicsEngine);
            this.renderer.drawLevelComplete();
            this.updateHUD();
        } else if (this.gameState.gamePhase === 'gameOver') {
            this.renderer.drawGame(this.gameState, this.physicsEngine);
            this.renderer.drawGameOver();
            this.updateHUD();
        }
    }

    updateHUD() {
        document.getElementById('score').textContent = this.gameState.score;
        document.getElementById('stage').textContent = this.gameState.currentStage;
        document.getElementById('moves').textContent = this.gameState.movesUsed;
        document.getElementById('maxMoves').textContent = this.gameState.maxMoves;
    }

    showLevelComplete() {
        const stageNum = this.gameState.currentStage;
        document.getElementById('levelCompleteTitle').textContent = `Stage ${stageNum} Complete!`;
        document.getElementById('levelScore').textContent = this.gameState.score;
        document.getElementById('levelCompleteModal').classList.add('active');
    }

    showGameOver() {
        document.getElementById('gameOverTitle').textContent = 'Game Over - No More Birds!';
        document.getElementById('gameOverScore').textContent = this.gameState.score;
        document.getElementById('gameOverModal').classList.add('active');
    }

    startNewGame() {
        this.hideAllModals();
        this.gameState.currentStage = 1;
        this.gameState.score = 0;
        this.loadStage(1);
    }

    loadStage(stageNum) {
        // Clear previous stage
        this.physicsEngine.clear();
        this.gameState.bodies.blocks = [];
        this.gameState.bodies.pigs = [];
        this.gameState.reset();
        this.gameState.setStage(stageNum);

        const stageData = stages[stageNum - 1];
        if (!stageData) {
            console.error('Stage not found:', stageNum);
            return;
        }

        // Create ground
        this.gameState.bodies.ground = this.physicsEngine.createGround(500, 570, 1000, 40);

        // Create slingshot position
        this.inputHandler.setSlingshot(stageData.slingshot.x, stageData.slingshot.y);

        // Create bird
        this.gameState.bodies.bird = this.physicsEngine.createBird(
            stageData.bird.x,
            stageData.bird.y,
            stageData.bird.type,
            { size: stageData.bird.size || 15 }
        );

        // Create pigs
        stageData.pigs.forEach(pigData => {
            const pig = this.physicsEngine.createPig(pigData.x, pigData.y, pigData.hp);
            this.gameState.bodies.pigs.push(pig);
        });

        // Create blocks
        stageData.blocks.forEach(blockData => {
            const block = this.physicsEngine.createBlock(
                blockData.x,
                blockData.y,
                blockData.w,
                blockData.h,
                blockData.material,
                blockData.hp
            );
            this.gameState.bodies.blocks.push(block);
        });

        // Set max moves for this stage
        this.gameState.maxMoves = stageData.maxMoves;
        this.gameState.reset(stageData.maxMoves);

        this.gameState.setPhase('playing');
    }

    pauseGame() {
        if (this.gameState.gamePhase === 'playing') {
            this.gameState.setPhase('paused');
            document.getElementById('pauseModal').classList.add('active');
        }
    }

    resumeGame() {
        this.gameState.setPhase('playing');
        document.getElementById('pauseModal').classList.remove('active');
    }

    retryStage() {
        const currentStage = this.gameState.currentStage;
        this.hideAllModals();
        this.loadStage(currentStage);
    }

    nextStage() {
        const nextStageNum = this.gameState.currentStage + 1;

        if (nextStageNum > this.gameState.totalStages) {
            // All stages complete
            this.gameOverWon();
        } else {
            this.hideAllModals();
            this.loadStage(nextStageNum);
        }
    }

    gameOverWon() {
        this.hideAllModals();
        document.getElementById('gameOverTitle').textContent = 'You Won All Stages!';
        document.getElementById('gameOverScore').textContent = this.gameState.score;
        document.getElementById('gameOverModal').classList.add('active');
    }

    goToMenu() {
        this.hideAllModals();
        this.gameState.goToMenu();
        this.physicsEngine.clear();
        this.gameState.bodies.blocks = [];
        this.gameState.bodies.pigs = [];
    }

    hideAllModals() {
        document.getElementById('menuModal').classList.remove('active');
        document.getElementById('pauseModal').classList.remove('active');
        document.getElementById('levelCompleteModal').classList.remove('active');
        document.getElementById('gameOverModal').classList.remove('active');
    }

    renderMenu() {
        this.gameState.setPhase('menu');
        this.renderer.drawMenu();
    }
}

// Start game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});
