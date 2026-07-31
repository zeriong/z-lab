import PhysicsEngine from './physics.js';
import Renderer from './renderer.js';
import Slingshot from './slingshot.js';
import CollisionHandler from './collision.js';
import GameState from './game-state.js';
import UI from './ui.js';
import StageLoader from './stage-loader.js';
import { STATE } from './constants.js';

class Game {
    constructor() {
        this.physicsEngine = null;
        this.renderer = null;
        this.slingshot = null;
        this.collisionHandler = null;
        this.gameState = new GameState();
        this.ui = new UI();
        this.stageLoader = null;

        this.lastTime = Date.now();
        this.lastStableCheck = 0;
        this.clearCheckTime = 0;

        this.pausedPhysicsState = null;
        this.pausedSlingshotState = null;

        this.setupUI();
    }

    setupUI() {
        this.ui.onPause(() => this.handlePause());
        this.ui.onResume(() => this.handleResume());
        this.ui.onRestart(() => this.handleRestart());
        this.ui.onMenu(() => this.handleMenu());
        this.ui.onNextStage(() => this.handleNextStage());
        this.ui.onStartGame(() => this.handleStartGame());
        this.ui.onStageSelect((index) => this.handleStageSelect(index));
    }

    async initialize() {
        // Initialize core systems
        this.physicsEngine = new PhysicsEngine();
        await this.physicsEngine.initialize();

        this.renderer = new Renderer('game-canvas');

        this.collisionHandler = new CollisionHandler(this.physicsEngine);

        this.slingshot = new Slingshot(100, 600, this.physicsEngine);
        await this.slingshot.initialize();

        this.stageLoader = new StageLoader(this.physicsEngine, this.collisionHandler);
        await this.stageLoader.initialize();

        // Setup input handling
        this.setupInputHandling();

        // Show main menu
        this.ui.showMainMenu(10, this.gameState.completedStages);

        // Start game loop
        this.startGameLoop();
    }

    setupInputHandling() {
        const canvas = document.getElementById('game-canvas');

        canvas.addEventListener('mousedown', (e) => {
            if (this.gameState.isState(STATE.PLAYING)) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.slingshot.startDrag(x, y, this.renderer);
            }
        });

        canvas.addEventListener('mousemove', (e) => {
            if (this.gameState.isState(STATE.PLAYING) && this.slingshot.isDragging) {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                this.slingshot.updateDrag(x, y, this.renderer);
            }
        });

        canvas.addEventListener('mouseup', (e) => {
            if (this.gameState.isState(STATE.PLAYING) && this.slingshot.isDragging) {
                this.slingshot.launch(this.renderer);
            }
        });
    }

    handlePause() {
        if (this.gameState.isState(STATE.PLAYING)) {
            // Save physics state
            this.pausedPhysicsState = this.physicsEngine.getWorldState();
            this.pausedSlingshotState = this.slingshot.getState();

            this.physicsEngine.pause();
            this.gameState.pause();
            this.ui.showPauseOverlay();
        }
    }

    handleResume() {
        if (this.gameState.isState(STATE.PAUSED)) {
            this.ui.hidePauseOverlay();
            this.physicsEngine.resume();
            this.gameState.resume();
            this.pausedPhysicsState = null;
            this.pausedSlingshotState = null;
        }
    }

    handleRestart() {
        this.ui.hidePauseOverlay();
        this.gameState.restart();
        const currentStageIndex = this.gameState.getCurrentStageIndex();
        this.loadAndStartStage(currentStageIndex);
    }

    handleMenu() {
        this.ui.hidePauseOverlay();
        this.ui.hideClearOverlay();
        this.gameState.goToMenu();
        this.physicsEngine.reset();
        this.collisionHandler.reset();
        this.physicsEngine.resume();
        this.ui.showMainMenu(10, this.gameState.completedStages);
    }

    handleNextStage() {
        this.ui.hideClearOverlay();
        if (this.gameState.nextStage()) {
            const nextIndex = this.gameState.getCurrentStageIndex();
            this.loadAndStartStage(nextIndex);
        } else {
            this.handleMenu();
        }
    }

    handleStartGame() {
        this.ui.hideMainMenu();
        this.gameState.startGame();
        const firstStage = 0;
        this.loadAndStartStage(firstStage);
    }

    handleStageSelect(stageIndex) {
        this.ui.hideMainMenu();
        this.gameState.setCurrentStage(stageIndex);
        this.loadAndStartStage(stageIndex);
    }

    async loadAndStartStage(stageIndex) {
        this.physicsEngine.reset();
        this.collisionHandler.reset();
        this.slingshot.resetForNewStage();

        const loaded = await this.stageLoader.loadStage(stageIndex);
        if (loaded) {
            this.gameState.setCurrentStage(stageIndex);
            this.gameState.transitionTo(STATE.PLAYING);
            this.clearCheckTime = 0;
            this.lastStableCheck = 0;
        }
    }

    startGameLoop() {
        const loop = () => {
            this.update();
            this.render();
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    update() {
        const now = Date.now();
        const deltaTime = (now - this.lastTime) / 1000;
        this.lastTime = now;

        if (this.gameState.isState(STATE.PLAYING)) {
            // Update physics
            this.physicsEngine.update(deltaTime);

            // Update collision
            this.collisionHandler.update();

            // Update slingshot
            this.slingshot.update(deltaTime);

            // Check for level clear
            const isStable = this.collisionHandler.isStable;
            const shouldClear = this.gameState.updateStability(isStable);

            if (shouldClear && this.collisionHandler.isLevelClear()) {
                this.gameState.transitionTo(STATE.CLEAR);
                const currentStageIndex = this.gameState.getCurrentStageIndex();
                this.gameState.markStageClear(currentStageIndex);
                this.ui.showClearOverlay(currentStageIndex, this.gameState.getElapsedTime());
            }
        }
    }

    render() {
        this.renderer.clear();

        if (this.gameState.isState(STATE.PLAYING) || this.gameState.isState(STATE.PAUSED)) {
            // Draw physics bodies
            const bodies = this.physicsEngine.getAllBodies();
            for (const body of bodies) {
                this.renderer.drawBody(body, body.label);
            }

            // Draw slingshot
            const slingshotX = 100;
            const slingshotY = 600;
            const angle = this.slingshot.isDragging ? this.slingshot.angle : -Math.PI / 4;
            const power = this.slingshot.isDragging ? this.slingshot.power : 0;
            this.renderer.drawSlingshot(slingshotX, slingshotY, angle, power);

            // Draw trajectory if dragging
            if (this.slingshot.isDragging && this.slingshot.trajectory.length > 0) {
                this.renderer.drawTrajectory(this.slingshot.trajectory);
            }

            // Draw UI
            const currentStageIndex = this.gameState.getCurrentStageIndex();
            const pigCount = this.collisionHandler.getPigCount();
            this.renderer.drawUI(currentStageIndex + 1, pigCount, 0, 5);
        }
    }
}

// Initialize and start the game
const game = new Game();
game.initialize().catch(err => {
    console.error('Game initialization failed:', err);
});
