import { GameState, GameStateEnum, Bird } from './types';
import { PhysicsEngine } from './physics';
import { Renderer } from './renderer';
import { StateMachine, GameEvent } from './state';
import { InputHandler } from './input';
import { CollisionHandler } from './collision';
import { WinConditionChecker } from './win-condition';
import { StageProgression } from './progression';
import { StorageManager } from './storage';
import { AudioManager, EffectManager } from './audio';
import { UIManager } from './ui';
import { getStage, STAGES } from './stages';

class AngryBirdsGame {
    private gameState: GameState;
    private physics: PhysicsEngine;
    private renderer: Renderer;
    private stateMachine: StateMachine;
    private inputHandler: InputHandler;
    private collisionHandler: CollisionHandler;
    private winChecker: WinConditionChecker;
    private progression: StageProgression;
    private storage: StorageManager;
    private audio: AudioManager;
    private effects: EffectManager;
    private ui: UIManager;
    private canvas: HTMLCanvasElement;
    private animationFrameId: number = 0;
    private lastFrameTime: number = 0;

    constructor() {
        this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error('Canvas element not found');
        }

        // Initialize all systems
        this.physics = new PhysicsEngine();
        this.renderer = new Renderer(this.canvas);
        this.stateMachine = new StateMachine();
        this.inputHandler = new InputHandler(this.canvas, this.renderer);
        this.collisionHandler = new CollisionHandler(this.physics.state.world);
        this.winChecker = new WinConditionChecker();
        this.progression = new StageProgression();
        this.storage = new StorageManager();
        this.audio = new AudioManager();
        this.effects = new EffectManager();
        this.ui = new UIManager();

        // Initialize game state
        this.gameState = {
            state: GameStateEnum.MENU,
            current_stage: 1,
            birds_available: 0,
            birds_used: 0,
            birds_queue: [],
            score: 0,
            pigs: [],
            blocks: [],
            in_flight_count: 0,
            cleared_stages: [],
            stage_scores: {}
        };

        // Load saved progress
        const savedProgress = this.storage.loadProgress();
        if (savedProgress) {
            this.gameState.cleared_stages = savedProgress.cleared_stages || [];
            this.gameState.stage_scores = savedProgress.stage_scores || {};
            if (savedProgress.current_stage) {
                this.gameState.current_stage = Math.min(savedProgress.current_stage, STAGES.length);
            }
        }

        // Setup event handlers
        this.setupInputHandlers();
        this.setupUIHandlers();
        this.setupCollisionHandlers();
        this.setupProgressionHandlers();

        // Start game
        this.showMenu();
    }

    private setupInputHandlers(): void {
        this.inputHandler.subscribe(event => {
            if (this.gameState.state !== GameStateEnum.PLAY) return;

            if (event.type === 'pause_click') {
                this.pauseGame();
            } else if (event.type === 'slingshot_release' && event.dx !== undefined && event.dy !== undefined) {
                this.launchBird(event.dx, event.dy);
            }
        });
    }

    private setupUIHandlers(): void {
        this.ui.subscribe(event => {
            switch (event.type) {
                case 'play_clicked':
                    this.playStage(this.gameState.current_stage);
                    break;
                case 'resume_clicked':
                    this.resumeGame();
                    break;
                case 'restart_clicked':
                    this.restartStage();
                    break;
                case 'menu_clicked':
                    this.returnToMenu();
                    break;
                case 'next_stage_clicked':
                    this.nextStage();
                    break;
                case 'retry_clicked':
                    this.retryStage();
                    break;
            }
        });
    }

    private setupCollisionHandlers(): void {
        this.collisionHandler.subscribe(event => {
            if (event.type === 'block_destroyed') {
                const block = this.gameState.blocks.find(b => b.id === event.target_id);
                if (block) {
                    this.collisionHandler.applyDamage(this.gameState, block.id, 1);
                    this.effects.addDestructionAnimation(event.x, event.y);
                    this.audio.playImpactSound(event.impact_force);
                }
            } else if (event.type === 'pig_removed') {
                this.collisionHandler.removePig(this.gameState, event.target_id, this.physics);
                this.effects.addScoreAnimation(event.x, event.y, 10);
                this.audio.playPigDeathSound();
            } else if (event.type === 'impact') {
                this.audio.playImpactSound(event.impact_force);
            }
        });
    }

    private setupProgressionHandlers(): void {
        this.progression.subscribe(event => {
            // Reload physics bodies when stage loads
            this.reloadPhysicsBodies();
        });
    }

    private reloadPhysicsBodies(): void {
        // Clear old bodies
        this.physics.clear();

        // Create bodies for all blocks
        this.gameState.blocks.forEach(block => {
            const body = this.physics.createBlockBody(block);
            block.body = body;
        });

        // Create bodies for all pigs
        this.gameState.pigs.forEach(pig => {
            const body = this.physics.createPigBody(pig);
            pig.body = body;
        });

        // Create bodies for queued birds
        this.gameState.birds_queue.forEach((bird, idx) => {
            const slingshotPos = this.renderer.getSlingshotPosition();
            const body = this.physics.createBirdBody(bird, slingshotPos.x, slingshotPos.y - 50);
            bird.body = body;
        });
    }

    private showMenu(): void {
        this.stateMachine.setState(GameStateEnum.MENU);
        this.physics.clear();
        this.effects.clear();
        this.ui.showMenu();
    }

    private playStage(stageNum: number): void {
        this.stateMachine.pushEvent({ type: 'PLAY_STAGE', stage: stageNum });
        this.progression.loadStage(this.gameState, stageNum);
        this.stateMachine.setState(GameStateEnum.PLAY);
        this.reloadPhysicsBodies();
        this.ui.hideHUD();
    }

    private pauseGame(): void {
        if (this.gameState.state !== GameStateEnum.PLAY) return;

        this.stateMachine.setState(GameStateEnum.PAUSE);
        this.physics.pause();
        this.audio.setMuted(true);
        this.ui.showPauseOverlay();
    }

    private resumeGame(): void {
        if (this.gameState.state !== GameStateEnum.PAUSE) return;

        this.stateMachine.setState(GameStateEnum.PLAY);
        this.physics.resume();
        this.audio.setMuted(false);
    }

    private restartStage(): void {
        this.progression.retryStage(this.gameState);
        this.reloadPhysicsBodies();
        this.stateMachine.setState(GameStateEnum.PLAY);
        this.physics.resume();
        this.audio.setMuted(false);
    }

    private retryStage(): void {
        this.restartStage();
    }

    private launchBird(dx: number, dy: number): void {
        if (this.gameState.birds_queue.length === 0) {
            // Create a new bird
            const birdId = `bird-${Date.now()}`;
            const bird: Bird = {
                id: birdId,
                type: 'basic',
                x: this.renderer.getSlingshotPosition().x,
                y: this.renderer.getSlingshotPosition().y,
                width: 20,
                height: 20,
                mass: 1,
                velocity: { x: 0, y: 0 },
                in_flight: true
            };

            const slingshotPos = this.renderer.getSlingshotPosition();
            bird.body = this.physics.createBirdBody(bird, slingshotPos.x, slingshotPos.y - 50);
            this.gameState.birds_queue.push(bird);
        }

        const bird = this.gameState.birds_queue[0];
        if (bird && bird.body) {
            // Normalize impulse based on drag
            const maxForce = 500;
            const magnitude = Math.min(Math.sqrt(dx * dx + dy * dy), maxForce);
            const angle = Math.atan2(-dy, -dx);

            const forceX = Math.cos(angle) * (magnitude / 100);
            const forceY = Math.sin(angle) * (magnitude / 100);

            this.physics.applyImpulse(bird.body, forceX, forceY);
            bird.in_flight = true;
            this.gameState.birds_used++;
            this.gameState.in_flight_count++;
            this.audio.playSlinghotSound();
            this.gameState.birds_queue.shift();
        }
    }

    private returnToMenu(): void {
        this.storage.saveProgress(this.gameState);
        this.showMenu();
    }

    private nextStage(): void {
        const nextNum = this.gameState.current_stage + 1;
        if (nextNum <= STAGES.length) {
            this.playStage(nextNum);
        } else {
            this.showMenu();
        }
    }

    private updateGame(deltaTime: number): void {
        if (this.gameState.state !== GameStateEnum.PLAY) return;

        // Update physics
        this.physics.step(deltaTime);

        // Update collision animations
        this.collisionHandler.updateDestructionAnimations(this.gameState, deltaTime * 1000);
        this.collisionHandler.removeDestroyedBlocks(this.gameState, this.physics);

        // Update effects
        this.effects.updateAnimations();

        // Check for projectiles out of bounds
        this.gameState.birds_queue.forEach((bird, idx) => {
            if (bird.in_flight && bird.body) {
                const pos = this.physics.getBodyPosition(bird.body);
                if (pos.y > this.canvas.height || pos.x < 0 || pos.x > this.canvas.width) {
                    bird.in_flight = false;
                    this.gameState.in_flight_count--;
                    this.physics.removeBody(bird.body);
                    this.gameState.birds_queue.splice(idx, 1);
                }
            }
        });

        // Check win conditions
        const conditions = this.winChecker.checkConditions(this.gameState);
        if (conditions.cleared) {
            this.stateMachine.setState(GameStateEnum.CLEAR);
            const stars = this.winChecker.getStarCount(this.gameState);
            this.storage.saveProgress(this.gameState);
            this.ui.showClearOverlay(stars, this.gameState.score, this.gameState.current_stage, STAGES.length);
        } else if (conditions.failed) {
            this.stateMachine.setState(GameStateEnum.FAIL);
            this.ui.showFailOverlay();
        }
    }

    private render(): void {
        const stage = getStage(this.gameState.current_stage);

        // Draw game
        this.renderer.drawGame(this.gameState, stage, this.effects.getState());

        // Draw slingshot preview if dragging
        if (this.inputHandler.isDraggingSlingshot() && this.gameState.state === GameStateEnum.PLAY) {
            const delta = this.inputHandler.getDragDelta();
            const slingshotPos = this.renderer.getSlingshotPosition();
            this.renderer.drawSlinghotPreview(slingshotPos.x, slingshotPos.y, slingshotPos.x - delta.dx, slingshotPos.y - delta.dy);
            this.renderer.drawRubberBand(slingshotPos.x, slingshotPos.y, slingshotPos.x - delta.dx, slingshotPos.y - delta.dy);
        }

        // Update HUD
        if (this.gameState.state === GameStateEnum.PLAY && stage) {
            this.ui.showHUD(this.gameState, stage);
        }
    }

    private gameLoop(currentTime: number): void {
        if (this.lastFrameTime === 0) {
            this.lastFrameTime = currentTime;
        }

        const deltaTime = (currentTime - this.lastFrameTime) / 1000;
        this.lastFrameTime = currentTime;

        // Cap delta time to prevent large jumps
        const cappedDeltaTime = Math.min(deltaTime, 0.016);

        this.updateGame(cappedDeltaTime);
        this.render();

        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    start(): void {
        this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// Start the game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const game = new AngryBirdsGame();
    game.start();
});
