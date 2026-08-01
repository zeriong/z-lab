import { StateMachine, GameState } from '../state/StateMachine';
import { PhysicsEngine } from '../physics/PhysicsEngine';
import { UI } from '../ui/UI';
import * as stagesData from '../data/stages';

export interface GameObject {
    id: string;
    x: number;
    y: number;
    vx?: number;
    vy?: number;
    type: 'bird' | 'pig' | 'wood' | 'stone' | 'ice';
    radius?: number;
    width?: number;
    height?: number;
    health?: number;
    removed?: boolean;
    matterBody?: any;
}

export interface Stage {
    number: number;
    structures: GameObject[];
    pigs: GameObject[];
    birds: number;
    name: string;
}

export class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private stateMachine: StateMachine;
    private physics: PhysicsEngine;
    private ui: UI;

    private currentStage: Stage | null = null;
    private stageNumber: number = 1;
    private gameObjects: Map<string, GameObject> = new Map();
    private score: number = 0;
    private birdsRemaining: number = 0;
    private pigsRemaining: number = 0;

    private slingX: number = 100;
    private slingY: number = 0;
    private dragStart: { x: number; y: number } | null = null;
    private currentBird: GameObject | null = null;
    private lastPhysicsTime: number = 0;
    private settledTime: number = 0;

    constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.slingY = canvas.height - 150;

        this.physics = new PhysicsEngine();
        this.stateMachine = new StateMachine();
        this.ui = new UI(canvas, ctx, this);

        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    private handleMouseDown(e: MouseEvent): void {
        if (this.stateMachine.state !== GameState.GAME) return;
        if (!this.currentBird || this.dragStart) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dx = x - this.slingX;
        const dy = y - this.slingY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 60) {
            this.dragStart = { x, y };
        }
    }

    private handleMouseMove(e: MouseEvent): void {
        if (!this.dragStart || !this.currentBird) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dx = x - this.slingX;
        const dy = y - this.slingY;

        this.currentBird.vx = -(dx / 150) * 50;
        this.currentBird.vy = -(dy / 150) * 50;
    }

    private handleMouseUp(): void {
        if (!this.dragStart || !this.currentBird) return;

        this.physics.fireBody(this.currentBird.id, this.currentBird.vx || 0, this.currentBird.vy || 0);
        this.currentBird = null;
        this.dragStart = null;
    }

    public start(): void {
        this.stateMachine.setState(GameState.MENU);
        this.loadMenu();
        this.gameLoop();
    }

    private loadMenu(): void {
        this.gameObjects.clear();
    }

    public selectStage(stageNum: number): void {
        this.stageNumber = stageNum;
        this.loadStage(stageNum);
        this.stateMachine.setState(GameState.GAME);
    }

    private loadStage(stageNum: number): void {
        this.gameObjects.clear();
        this.physics.reset();

        const stageData = stagesData.getStageData(stageNum);
        this.currentStage = {
            number: stageNum,
            structures: stageData.structures || [],
            pigs: stageData.pigs || [],
            birds: stageData.birds || 2,
            name: `Stage ${stageNum}`
        };

        this.birdsRemaining = this.currentStage.birds;
        this.pigsRemaining = this.currentStage.pigs.length;
        this.score = 0;

        // Load structures
        for (const struct of this.currentStage.structures) {
            const obj = { ...struct };
            obj.id = `struct-${Math.random()}`;
            this.gameObjects.set(obj.id, obj);
            this.physics.addBody(obj);
        }

        // Load pigs
        for (const pig of this.currentStage.pigs) {
            const obj = { ...pig };
            obj.id = `pig-${Math.random()}`;
            this.gameObjects.set(obj.id, obj);
            this.physics.addBody(obj);
        }

        // Add walls
        this.physics.addWalls(this.canvas.width, this.canvas.height);

        // Create first bird
        this.spawnBird();
        this.lastPhysicsTime = Date.now();
    }

    private spawnBird(): void {
        if (this.birdsRemaining <= 0) {
            this.checkGameOver();
            return;
        }

        this.birdsRemaining--;
        const bird: GameObject = {
            id: `bird-${Math.random()}`,
            x: this.slingX,
            y: this.slingY,
            vx: 0,
            vy: 0,
            type: 'bird',
            radius: 15
        };

        this.gameObjects.set(bird.id, bird);
        this.physics.addBody(bird);
        this.currentBird = bird;
        this.settledTime = 0;
    }

    private gameLoop = (): void => {
        requestAnimationFrame(this.gameLoop);

        const now = Date.now();
        const dt = Math.min((now - this.lastPhysicsTime) / 1000, 0.016);
        this.lastPhysicsTime = now;

        if (this.stateMachine.state === GameState.GAME && this.currentStage) {
            this.physics.step(dt);
            this.updateGameObjects();
            this.checkCollisions();
            this.checkGameConditions();
        }

        this.render();
    };

    private updateGameObjects(): void {
        const bodies = this.physics.getBodies();

        for (const [id, obj] of this.gameObjects) {
            const body = bodies.get(id);
            if (body) {
                obj.x = body.position.x;
                obj.y = body.position.y;
            }
        }
    }

    private checkCollisions(): void {
        const collisions = this.physics.getCollisions();

        for (const { bodyAId, bodyBId } of collisions) {
            const objA = this.gameObjects.get(bodyAId);
            const objB = this.gameObjects.get(bodyBId);

            if (!objA || !objB) continue;

            // Bird hits pig
            if (objA.type === 'bird' && objB.type === 'pig') {
                this.removePig(bodyBId);
            } else if (objA.type === 'pig' && objB.type === 'bird') {
                this.removePig(bodyAId);
            }

            // Bird hits structure
            if (objA.type === 'bird' && (objB.type === 'wood' || objB.type === 'stone')) {
                this.damageStructure(bodyBId);
            } else if ((objA.type === 'wood' || objA.type === 'stone') && objB.type === 'bird') {
                this.damageStructure(bodyAId);
            }
        }
    }

    private removePig(pigId: string): void {
        const pig = this.gameObjects.get(pigId);
        if (pig && !pig.removed) {
            pig.removed = true;
            this.score += 100;
            this.pigsRemaining--;
            this.physics.removeBody(pigId);
        }
    }

    private damageStructure(structId: string): void {
        const struct = this.gameObjects.get(structId);
        if (struct && !struct.removed) {
            struct.health = (struct.health || 1) - 1;
            if ((struct.health || 0) <= 0) {
                struct.removed = true;
                this.physics.removeBody(structId);
            }
        }
    }

    private checkGameConditions(): void {
        if (!this.currentBird) {
            // Bird is in flight, check if settled
            const vel = this.physics.getBodyVelocity(this.currentBird?.id || '');
            if (vel && vel.x * vel.x + vel.y * vel.y < 0.1) {
                this.settledTime += 1;
                if (this.settledTime > 180) { // 3 seconds at 60fps
                    this.spawnBird();
                }
            } else {
                this.settledTime = 0;
            }
        }

        if (this.pigsRemaining === 0) {
            this.stateMachine.setState(GameState.CLEAR);
        } else if (this.birdsRemaining === 0 && !this.currentBird) {
            this.stateMachine.setState(GameState.FAIL);
        }
    }

    private checkGameOver(): void {
        if (this.pigsRemaining === 0) {
            this.stateMachine.setState(GameState.CLEAR);
        } else {
            this.stateMachine.setState(GameState.FAIL);
        }
    }

    private render(): void {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.stateMachine.state === GameState.MENU) {
            this.ui.renderMenu(this.canvas, ctx => {
                ctx.fillStyle = 'rgba(0,0,0,0.3)';
                ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            });
        } else if (this.stateMachine.state === GameState.GAME && this.currentStage) {
            this.renderGame();
            this.ui.renderPauseButton(this.ctx);
        } else if (this.stateMachine.state === GameState.PAUSE) {
            this.renderGame(0.5);
            this.ui.renderPauseMenu(this.ctx);
        } else if (this.stateMachine.state === GameState.CLEAR) {
            this.renderGame(0.5);
            this.ui.renderClearMenu(this.ctx, this.score, this.stageNumber);
        } else if (this.stateMachine.state === GameState.FAIL) {
            this.renderGame(0.5);
            this.ui.renderFailMenu(this.ctx);
        }
    }

    private renderGame(alpha: number = 1): void {
        this.ctx.globalAlpha = alpha;

        // Render ground
        this.ctx.fillStyle = '#8B7355';
        this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);

        // Render slingshot
        this.renderSlingshot();

        // Render game objects
        for (const [_, obj] of this.gameObjects) {
            if (obj.removed) continue;
            this.renderObject(obj);
        }

        // Render UI
        this.ctx.globalAlpha = 1;
        this.ctx.fillStyle = '#000';
        this.ctx.font = '16px Arial';
        this.ctx.fillText(`Birds: ${this.birdsRemaining}`, 20, 30);
        this.ctx.fillText(`Pigs: ${this.pigsRemaining}`, 20, 60);
        this.ctx.fillText(`Score: ${this.score}`, 20, 90);
    }

    private renderSlingshot(): void {
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 3;

        // Slingshot frame
        this.ctx.beginPath();
        this.ctx.arc(this.slingX, this.slingY, 20, 0, Math.PI * 2);
        this.ctx.stroke();

        // Bands
        if (this.currentBird) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.slingX - 15, this.slingY - 20);
            this.ctx.lineTo(this.currentBird.x, this.currentBird.y);
            this.ctx.lineTo(this.slingX + 15, this.slingY - 20);
            this.ctx.stroke();
        }
    }

    private renderObject(obj: GameObject): void {
        if (obj.type === 'bird') {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(obj.x, obj.y, obj.radius || 15, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        } else if (obj.type === 'pig') {
            this.ctx.fillStyle = '#FF69B4';
            this.ctx.beginPath();
            this.ctx.arc(obj.x, obj.y, obj.radius || 12, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        } else if (obj.type === 'wood') {
            this.ctx.fillStyle = '#8B4513';
            this.ctx.fillRect(obj.x - (obj.width || 30) / 2, obj.y - (obj.height || 15) / 2, obj.width || 30, obj.height || 15);
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(obj.x - (obj.width || 30) / 2, obj.y - (obj.height || 15) / 2, obj.width || 30, obj.height || 15);
        } else if (obj.type === 'stone') {
            this.ctx.fillStyle = '#808080';
            this.ctx.fillRect(obj.x - (obj.width || 40) / 2, obj.y - (obj.height || 20) / 2, obj.width || 40, obj.height || 20);
            this.ctx.strokeStyle = '#000';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(obj.x - (obj.width || 40) / 2, obj.y - (obj.height || 20) / 2, obj.width || 40, obj.height || 20);
        }
    }

    public resume(): void {
        this.stateMachine.setState(GameState.GAME);
    }

    public restart(): void {
        this.loadStage(this.stageNumber);
        this.stateMachine.setState(GameState.GAME);
    }

    public goToMenu(): void {
        this.loadMenu();
        this.stateMachine.setState(GameState.MENU);
    }

    public pause(): void {
        this.stateMachine.setState(GameState.PAUSE);
    }

    public nextStage(): void {
        if (this.stageNumber < 10) {
            this.selectStage(this.stageNumber + 1);
        } else {
            this.goToMenu();
        }
    }

    public resize(width: number, height: number): void {
        this.slingY = height - 150;
    }
}
