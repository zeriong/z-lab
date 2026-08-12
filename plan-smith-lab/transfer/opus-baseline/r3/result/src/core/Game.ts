import { StateMachine } from './StateMachine';
import { Loop } from './Loop';
import { Input } from './Input';
import { Camera } from './Camera';
import { Storage } from './Storage';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Renderer } from '../render/Renderer';
import { Level } from '../game/Level';
import { Screens } from '../ui/Screens';
import { LevelData, GameState } from './types';
import { LEVELS } from '../data/levels';

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private stateMachine: StateMachine;
  private loop: Loop;
  private input: Input;
  private storage: Storage;
  private renderer: Renderer;
  private screens: Screens;

  // Current game state
  private physics: PhysicsWorld | null = null;
  private level: Level | null = null;
  private camera: Camera | null = null;
  private currentLevelId: number = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) throw new Error('Failed to get 2D context');
    this.ctx = canvasCtx;

    this.setupCanvas();
    this.stateMachine = new StateMachine();
    this.loop = new Loop();
    this.input = new Input(canvas);
    this.storage = new Storage();
    this.renderer = new Renderer(this.ctx, canvas);
    this.screens = new Screens(this.storage);

    this.setupStateTransitions();
    this.setupScreenEvents();
    this.stateMachine.transition('MAIN_MENU');
  }

  private setupCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = 1280 * dpr;
    this.canvas.height = 720 * dpr;
    this.canvas.style.width = '1280px';
    this.canvas.style.height = '720px';
    this.ctx.scale(dpr, dpr);
  }

  private setupStateTransitions(): void {
    this.stateMachine.on('MAIN_MENU', () => this.onMainMenu());
    this.stateMachine.on('LEVEL_SELECT', () => this.onLevelSelect());
    this.stateMachine.on('LOADING', () => this.onLoading());
    this.stateMachine.on('PLAYING', () => this.onPlaying());
    this.stateMachine.on('PAUSED', () => this.onPaused());
    this.stateMachine.on('LEVEL_CLEAR', () => this.onLevelClear());
    this.stateMachine.on('LEVEL_FAIL', () => this.onLevelFail());
  }

  private setupScreenEvents(): void {
    this.screens.on('start-game', () => {
      this.currentLevelId = 1;
      this.stateMachine.transition('LOADING');
    });

    this.screens.on('level-select', () => {
      this.stateMachine.transition('LEVEL_SELECT');
    });

    this.screens.on('select-level', (levelId: number) => {
      if (this.storage.isLevelUnlocked(levelId)) {
        this.currentLevelId = levelId;
        this.stateMachine.transition('LOADING');
      }
    });

    this.screens.on('resume', () => {
      if (this.stateMachine.canTransition('PLAYING')) {
        this.loop.resume();
        this.stateMachine.transition('PLAYING');
      }
    });

    this.screens.on('restart', () => {
      this.stateMachine.transition('LOADING');
    });

    this.screens.on('menu', () => {
      this.cleanup();
      this.stateMachine.transition('MAIN_MENU');
    });

    this.screens.on('next-level', () => {
      this.currentLevelId++;
      this.stateMachine.transition('LOADING');
    });
  }

  private onMainMenu(): void {
    this.cleanup();
    this.screens.showMainMenu();
  }

  private onLevelSelect(): void {
    this.screens.showLevelSelect(LEVELS);
  }

  private onLoading(): void {
    this.screens.hideMenus();
    const levelData = LEVELS[this.currentLevelId - 1];
    if (!levelData) {
      console.error('Level not found:', this.currentLevelId);
      this.stateMachine.transition('MAIN_MENU');
      return;
    }

    this.physics = new PhysicsWorld(levelData.world.gravity);
    this.level = new Level(this.physics, levelData, this.storage);
    this.camera = new Camera(
      levelData.world.width,
      levelData.world.height,
      levelData.camera.minX,
      levelData.camera.maxX,
      levelData.camera.minZoom,
      levelData.camera.maxZoom
    );
    this.camera.setScreenSize(1280, 720);

    // Initial camera position
    this.camera.setTarget(
      levelData.slingshot.x + 320,
      levelData.world.height / 2,
      levelData.camera.minZoom
    );

    this.loop.reset();
    this.stateMachine.transition('PLAYING');
  }

  private onPlaying(): void {
    this.screens.showHUD();
    this.screens.hidePauseOverlay();
    this.input.on((event) => this.handleInput(event));
    if (this.level) {
      this.level.setupPhase('AIMING');
    }
  }

  private onPaused(): void {
    this.loop.pause();
    this.screens.showPauseOverlay();
  }

  private onLevelClear(): void {
    if (this.level) {
      const result = this.level.getResult();
      const levelData = LEVELS[this.currentLevelId - 1];
      this.storage.setProgress(this.currentLevelId, true, result.score, result.stars);
      this.screens.showResultOverlay(result, true, this.currentLevelId === LEVELS.length);
    }
  }

  private onLevelFail(): void {
    if (this.level) {
      const result = this.level.getResult();
      this.screens.showResultOverlay(result, false, false);
    }
  }

  private cleanup(): void {
    this.input.off((event) => this.handleInput(event));
    if (this.level) {
      this.level.dispose();
      this.level = null;
    }
    if (this.physics) {
      this.physics.dispose();
      this.physics = null;
    }
    this.camera = null;
  }

  private handleInput(event: any): void {
    const state = this.stateMachine.current();

    if (event.type === 'keydown') {
      if (event.key === 'Escape' || event.key === 'p' || event.key === 'P') {
        if (state === 'PLAYING') {
          this.stateMachine.transition('PAUSED');
        } else if (state === 'PAUSED') {
          this.loop.resume();
          this.stateMachine.transition('PLAYING');
        }
      }
    }

    if (state === 'PLAYING' && this.level && this.camera) {
      const worldPos = this.camera.screenToWorld(event.position || { x: 0, y: 0 });
      this.level.handleInput(event, worldPos);
    }
  }

  update(dt: number): void {
    this.loop.update(dt);

    const state = this.stateMachine.current();

    // Fixed timestep update
    if (state === 'PLAYING') {
      const { shouldTick } = this.loop.tick();
      if (shouldTick && this.physics && this.level && this.camera) {
        this.physics.step(this.loop.getFixedDeltaTime() / 1000);
        this.level.fixedUpdate(this.loop.getFixedDeltaTime() / 1000);

        // Update HUD
        this.screens.updateHUD(this.level);

        // Check level state
        if (this.level.isCleared()) {
          this.stateMachine.transition('LEVEL_CLEAR');
        } else if (this.level.isFailed()) {
          this.stateMachine.transition('LEVEL_FAIL');
        }

        // Update camera target based on game state
        if (this.level.getPhase() === 'AIMING') {
          const levelData = LEVELS[this.currentLevelId - 1];
          this.camera.setTarget(
            levelData.slingshot.x + 320,
            levelData.world.height / 2,
            levelData.camera.minZoom
          );
        } else if (this.level.getPhase() === 'FLYING') {
          const birdPos = this.level.getBirdPosition();
          this.camera.setTarget(birdPos.x, birdPos.y, 1);
        } else if (this.level.getPhase() === 'SETTLING') {
          const levelData = LEVELS[this.currentLevelId - 1];
          this.camera.setTarget(
            levelData.world.width / 2,
            levelData.world.height / 2,
            levelData.camera.maxZoom
          );
        }

        this.camera.update(this.loop.getFixedDeltaTime() / 1000);
      }
    }
  }

  render(): void {
    const state = this.stateMachine.current();

    // Clear canvas
    this.ctx.fillStyle = '#87CEEB';
    this.ctx.fillRect(0, 0, 1280, 720);

    if (state === 'PLAYING' && this.level && this.camera) {
      this.renderer.render(this.level, this.camera);
    }

    // Render UI on top
    this.screens.render();
  }
}
