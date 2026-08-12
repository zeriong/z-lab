import { Loop } from './Loop';
import { StateMachine, GameState } from './StateMachine';
import { Input, PointerInput, KeyInput } from './Input';
import { Camera } from './Camera';
import { Storage } from './Storage';
import { Renderer } from '../render/Renderer';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Level } from '../game/Level';
import { Screens } from '../ui/Screens';
import { LEVEL_CONFIGS } from '../data/levels';

export class Game {
  private loop: Loop;
  private stateMachine: StateMachine;
  private input: Input;
  private camera: Camera;
  private storage: Storage;
  private renderer: Renderer;
  private physicsWorld: PhysicsWorld;
  private level: Level | null = null;
  private screens: Screens;
  private currentLevelId: number = 1;

  constructor(private canvas: HTMLCanvasElement, private uiContainer: HTMLDivElement) {
    this.setupCanvas();

    this.stateMachine = new StateMachine();
    this.input = new Input(this.canvas);
    this.storage = new Storage();
    this.camera = new Camera({
      minX: 0,
      maxX: 1280,
      minZoom: 0.6,
      maxZoom: 1.2,
    });

    this.renderer = new Renderer(this.canvas, this.camera);
    this.physicsWorld = new PhysicsWorld();
    this.screens = new Screens(this.uiContainer, {
      onPlayLevel: (levelId) => this.playLevel(levelId),
      onContinue: () => this.continuePause(),
      onRetry: () => this.retryLevel(),
      onMainMenu: () => this.goMainMenu(),
      onNextLevel: () => this.nextLevel(),
      onToggleSound: () => this.toggleSound(),
    });

    this.loop = new Loop(
      () => this.fixedUpdate(),
      (alpha) => this.render(alpha)
    );

    this.setupInput();
  }

  private setupCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = 1280 * dpr;
    this.canvas.height = 720 * dpr;
    this.canvas.style.width = '1280px';
    this.canvas.style.height = '720px';

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }
  }

  private setupInput() {
    this.input.onPointer((e) => this.handlePointerInput(e));
    this.input.onKey((e) => this.handleKeyInput(e));
  }

  private handlePointerInput(input: PointerInput) {
    if (this.level && this.stateMachine.isState(GameState.PLAYING)) {
      this.level.handlePointerInput(input);
    }
  }

  private handleKeyInput(input: KeyInput) {
    if (input.type === 'down') {
      if (input.key === 'Escape' || input.key === 'p' || input.key === 'P') {
        if (this.stateMachine.isState(GameState.PLAYING)) {
          this.pauseGame();
        } else if (this.stateMachine.isState(GameState.PAUSED)) {
          this.continuePause();
        }
      }
    }
  }

  start() {
    this.stateMachine.transition(GameState.MAIN_MENU);
    this.screens.showMainMenu();
    this.loop.start();
  }

  private fixedUpdate() {
    if (this.stateMachine.isState(GameState.PLAYING)) {
      this.physicsWorld.step(1 / 60);
      this.level?.update();

      // Check for level completion
      if (this.level?.isCleared()) {
        this.stateMachine.transition(GameState.LEVEL_CLEAR);
        const progress = this.level.getProgress();
        this.storage.saveLevelProgress(this.currentLevelId, progress);
        if (this.currentLevelId < LEVEL_CONFIGS.length) {
          this.storage.setUnlockedLevel(this.currentLevelId + 1);
        }
        this.screens.showResultScreen(true, progress);
      } else if (this.level?.isFailed()) {
        this.stateMachine.transition(GameState.LEVEL_FAIL);
        const progress = this.level.getProgress();
        this.screens.showResultScreen(false, progress);
      }
    }

    this.camera.update(0);
  }

  private render(alpha: number) {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#87ceeb';
    ctx.fillRect(0, 0, 1280, 720);

    if (this.level) {
      this.renderer.render(
        ctx,
        this.level.getBodies(),
        this.level.getEntities(),
        this.level.getParticles(),
        alpha
      );
      this.level.renderHUD(ctx);
    }
  }

  private playLevel(levelId: number) {
    this.currentLevelId = levelId;
    this.storage.setLastPlayedLevel(levelId);

    this.stateMachine.transition(GameState.LOADING);

    // Cleanup previous level
    if (this.level) {
      this.level.dispose();
    }

    // Create new level
    const levelConfig = LEVEL_CONFIGS[levelId - 1];
    this.level = new Level(levelConfig, this.physicsWorld, this.renderer);

    this.camera.setImmediate(
      levelConfig.camera.minX,
      280,
      levelConfig.camera.minZoom
    );

    this.stateMachine.transition(GameState.PLAYING);
    this.screens.hideAllScreens();
  }

  private pauseGame() {
    if (!this.stateMachine.isState(GameState.PLAYING)) return;
    this.stateMachine.transition(GameState.PAUSED);
    this.loop.pause();
    this.screens.showPauseOverlay();
  }

  private continuePause() {
    if (!this.stateMachine.isState(GameState.PAUSED)) return;
    this.stateMachine.transition(GameState.PLAYING);
    this.screens.hidePauseOverlay();
  }

  private retryLevel() {
    this.playLevel(this.currentLevelId);
  }

  private goMainMenu() {
    if (this.level) {
      this.level.dispose();
      this.level = null;
    }
    this.stateMachine.transition(GameState.MAIN_MENU);
    this.screens.showMainMenu();
  }

  private nextLevel() {
    if (this.currentLevelId < LEVEL_CONFIGS.length) {
      this.playLevel(this.currentLevelId + 1);
    } else {
      this.goMainMenu();
    }
  }

  private toggleSound() {
    const enabled = this.storage.getSoundEnabled();
    this.storage.setSoundEnabled(!enabled);
  }
}
