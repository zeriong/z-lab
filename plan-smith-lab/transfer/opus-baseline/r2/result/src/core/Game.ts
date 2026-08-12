import { StateMachine } from './StateMachine';
import { GameLoop } from './Loop';
import { Input } from './Input';
import { Camera } from './Camera';
import { Storage } from './Storage';
import { LevelData } from '../data/levelSchema';
import { Level } from '../game/Level';
import { Renderer } from '../render/Renderer';
import { Screens } from '../ui/Screens';
import { PhysicsWorld } from '../physics/PhysicsWorld';

export class Game {
  private stateMachine: StateMachine;
  private gameLoop: GameLoop;
  private input: Input;
  private camera: Camera;
  private renderer: Renderer;
  private screens: Screens;

  private currentLevel: Level | null = null;
  private currentLevelId: number = 1;
  private currentScore: number = 0;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvasId: string) {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.setupCanvas();

    this.input = new Input(this.canvas);
    this.stateMachine = new StateMachine();
    this.gameLoop = new GameLoop();
    this.camera = new Camera(1280, 720, 1280, 720, 0, 2400, 0.6, 1.2);
    this.renderer = new Renderer(this.canvas, this.ctx, this.camera);
    this.screens = new Screens();

    this.setupStateListeners();
    this.setupScreenListeners();
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const logicalWidth = 1280;
    const logicalHeight = 720;

    this.canvas.width = logicalWidth * dpr;
    this.canvas.height = logicalHeight * dpr;

    // CSS size for letterbox
    const aspectRatio = logicalWidth / logicalHeight;
    const windowAspect = window.innerWidth / window.innerHeight;

    if (windowAspect > aspectRatio) {
      // Window is wider
      const height = window.innerHeight;
      const width = height * aspectRatio;
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
    } else {
      // Window is taller
      const width = window.innerWidth;
      const height = width / aspectRatio;
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
    }

    this.canvas.style.display = 'block';
    this.canvas.style.margin = 'auto';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '50%';
    this.canvas.style.left = '50%';
    this.canvas.style.transform = 'translate(-50%, -50%)';

    this.ctx.scale(dpr, dpr);
  }

  start(): void {
    // Check for unlockAll parameter
    const params = new URLSearchParams(window.location.search);
    if (params.has('unlockAll')) {
      Storage.setUnlockedLevels(10);
    }

    this.stateMachine.transitionTo('MAIN_MENU');
    this.screens.showMainMenu();

    this.gameLoop.start(
      (dt) => this.fixedUpdate(dt),
      (dt, alpha) => this.render(dt, alpha)
    );
  }

  private setupStateListeners(): void {
    this.stateMachine.on('MAIN_MENU', () => {
      this.screens.showMainMenu();
    });

    this.stateMachine.on('LEVEL_SELECT', () => {
      this.screens.showLevelSelect();
    });

    this.stateMachine.on('LOADING', () => {
      this.loadLevel(this.currentLevelId);
    });

    this.stateMachine.on('PLAYING', () => {
      this.screens.hideAll();
    });

    this.stateMachine.on('PAUSED', () => {
      this.screens.showPauseOverlay();
    });

    this.stateMachine.on('LEVEL_CLEAR', () => {
      this.screens.showResultScreen(true, this.currentScore);
    });

    this.stateMachine.on('LEVEL_FAIL', () => {
      this.screens.showResultScreen(false, this.currentScore);
    });
  }

  private setupScreenListeners(): void {
    this.screens.onStartGame = () => {
      this.currentLevelId = Storage.getLastLevel();
      this.stateMachine.transitionTo('LOADING', 'AIMING');
    };

    this.screens.onSelectLevel = (levelId: number) => {
      this.currentLevelId = levelId;
      Storage.setLastLevel(levelId);
      this.stateMachine.transitionTo('LOADING', 'AIMING');
    };

    this.screens.onPause = () => {
      if (this.stateMachine.isPlaying()) {
        this.stateMachine.transitionTo('PAUSED');
      }
    };

    this.screens.onContinue = () => {
      this.stateMachine.transitionTo('PLAYING', this.stateMachine.getCurrentSubstate());
      this.gameLoop.resetAccumulator();
    };

    this.screens.onRetry = () => {
      this.stateMachine.transitionTo('LOADING', 'AIMING');
    };

    this.screens.onNextLevel = () => {
      if (this.currentLevelId < 10) {
        this.currentLevelId++;
      }
      this.stateMachine.transitionTo('LOADING', 'AIMING');
    };

    this.screens.onMainMenu = () => {
      this.currentLevel?.dispose();
      this.currentLevel = null;
      this.stateMachine.transitionTo('MAIN_MENU');
    };
  }

  private loadLevel(levelId: number): void {
    if (this.currentLevel) {
      this.currentLevel.dispose();
    }

    const levelData = this.getLevelData(levelId);
    if (!levelData) {
      console.error(`Level ${levelId} not found`);
      return;
    }

    this.currentLevel = new Level(levelData, this.input, this.camera);
    this.currentScore = 0;
    this.camera.setAiming(levelData.slingshot.x, levelData.slingshot.y);

    this.stateMachine.transitionTo('PLAYING', 'AIMING');
  }

  private fixedUpdate(dt: number): void {
    if (!this.stateMachine.isPlaying() || !this.currentLevel) return;

    this.currentLevel.fixedUpdate(dt);

    const result = this.currentLevel.getResult();
    if (result === 'clear') {
      this.currentScore = this.currentLevel.getScore();
      const progress = Storage.getLevelProgress(this.currentLevelId);
      progress.cleared = true;
      progress.highScore = Math.max(progress.highScore, this.currentScore);
      progress.stars = Math.max(progress.stars, this.currentLevel.getStars());
      Storage.saveLevelProgress(this.currentLevelId, progress);
      Storage.unlockNextLevel();
      this.stateMachine.transitionTo('LEVEL_CLEAR');
    } else if (result === 'fail') {
      this.currentScore = this.currentLevel.getScore();
      this.stateMachine.transitionTo('LEVEL_FAIL');
    }

    this.camera.update();
    this.screens.updateHUD(this.currentLevel.getScore(), this.currentLevel.getBirdsRemaining());
  }

  private render(dt: number, alpha: number): void {
    this.ctx.clearRect(0, 0, this.canvas.width / (window.devicePixelRatio || 1), this.canvas.height / (window.devicePixelRatio || 1));

    if (this.currentLevel) {
      this.renderer.render(this.currentLevel, alpha);
    }

    // FPS display (dev)
    if (window.FPS !== undefined) {
      this.ctx.fillStyle = 'white';
      this.ctx.font = '16px Arial';
      this.ctx.fillText(`FPS: ${window.FPS}`, 10, 30);
    }
  }

  private getLevelData(levelId: number): LevelData | null {
    // This will be populated dynamically
    // Levels are imported and mapped by ID
    const levels: Record<number, () => Promise<LevelData>> = {
      1: () => import('../data/levels/level01.json').then(m => m.default),
      2: () => import('../data/levels/level02.json').then(m => m.default),
      3: () => import('../data/levels/level03.json').then(m => m.default),
      4: () => import('../data/levels/level04.json').then(m => m.default),
      5: () => import('../data/levels/level05.json').then(m => m.default),
      6: () => import('../data/levels/level06.json').then(m => m.default),
      7: () => import('../data/levels/level07.json').then(m => m.default),
      8: () => import('../data/levels/level08.json').then(m => m.default),
      9: () => import('../data/levels/level09.json').then(m => m.default),
      10: () => import('../data/levels/level10.json').then(m => m.default)
    };

    // For now, return null and handle async loading separately
    // In a real implementation, this would be async
    return null;
  }

  dispose(): void {
    this.gameLoop.stop();
    this.input.destroy();
    this.currentLevel?.dispose();
    this.renderer.dispose();
  }
}
