import { PhysicsLoop } from './physics/loop';
import { GameScene } from './game/scene';
import { OverlayLayer } from './ui/overlay';
import { HUD } from './ui/hud';
import { loadStage, unloadStage } from './data/loader';
import { CanvasRenderer } from './render/canvas';
import { Camera } from './render/camera';
import { AudioManager } from './audio/audio';
import { ProgressStorage } from './storage/progress';

type Phase = 'BOOT' | 'MENU' | 'STAGE_SELECT' | 'PLAYING' | 'PAUSED' | 'CLEARED' | 'FAILED';
type Event = 'START' | 'SELECT' | 'BACK' | 'PAUSE' | 'RESUME' | 'RETRY' | 'NEXT' | 'MENU' | 'CLEAR' | 'FAIL';

const transitions: Record<Phase, Partial<Record<Event, Phase>>> = {
  'BOOT': { 'START': 'MENU' },
  'MENU': { 'START': 'STAGE_SELECT' },
  'STAGE_SELECT': { 'SELECT': 'PLAYING', 'BACK': 'MENU' },
  'PLAYING': { 'PAUSE': 'PAUSED', 'CLEAR': 'CLEARED', 'FAIL': 'FAILED' },
  'PAUSED': { 'RESUME': 'PLAYING', 'RETRY': 'PLAYING', 'MENU': 'MENU' },
  'CLEARED': { 'NEXT': 'PLAYING', 'RETRY': 'PLAYING', 'MENU': 'MENU' },
  'FAILED': { 'RETRY': 'PLAYING', 'MENU': 'MENU' }
};

export class App {
  private phase: Phase = 'BOOT';
  private currentStage: number = 1;
  private physicsLoop: PhysicsLoop;
  private canvas: CanvasRenderer;
  private overlay: OverlayLayer;
  private hud: HUD;
  private scene: GameScene | null = null;
  private camera: Camera;
  private audio: AudioManager;
  private progress: ProgressStorage;

  constructor() {
    this.physicsLoop = new PhysicsLoop();
    this.canvas = new CanvasRenderer();
    this.overlay = new OverlayLayer();
    this.hud = new HUD(this.canvas);
    this.camera = new Camera();
    this.audio = new AudioManager();
    this.progress = new ProgressStorage();
  }

  start(): void {
    this.dispatch('START');
  }

  dispatch(event: Event, stageNumber?: number): void {
    if (stageNumber !== undefined) {
      this.currentStage = stageNumber;
    }

    const nextPhase = transitions[this.phase][event];
    if (nextPhase === undefined) {
      console.error(`Invalid transition: ${this.phase} -> ${event}`);
      return;
    }

    this.exitPhase(this.phase);
    this.phase = nextPhase;
    this.enterPhase(nextPhase);
  }

  private exitPhase(phase: Phase): void {
    switch (phase) {
      case 'PLAYING':
      case 'PAUSED':
        if (this.scene) {
          this.scene.unmount();
          unloadStage();
          this.physicsLoop.reset();
          this.camera.reset();
        }
        break;
    }
  }

  private enterPhase(phase: Phase): void {
    switch (phase) {
      case 'MENU':
        this.overlay.showMenu(() => this.dispatch('START', 1));
        break;
      case 'STAGE_SELECT':
        this.overlay.showStageSelect(
          (stage) => this.dispatch('SELECT', stage),
          () => this.dispatch('BACK'),
          this.progress
        );
        break;
      case 'PLAYING':
        this.scene = new GameScene(this.currentStage, this.physicsLoop, this.canvas, this.camera, this.audio, this.hud);
        this.scene.mount();
        this.scene.onClear(() => this.dispatch('CLEAR'));
        this.scene.onFail(() => this.dispatch('FAIL'));
        this.overlay.hide();
        this.hud.show();
        break;
      case 'PAUSED':
        this.physicsLoop.pause();
        this.overlay.showPause(
          () => this.dispatch('RESUME'),
          () => this.dispatch('RETRY'),
          () => this.dispatch('MENU')
        );
        this.hud.hide();
        break;
      case 'CLEARED':
        this.physicsLoop.pause();
        if (this.scene) {
          const score = this.scene.getScore();
          const stars = this.scene.getStars();
          this.progress.saveProgress(this.currentStage, score, stars);
          this.overlay.showClear(
            score,
            stars,
            this.currentStage < 10 ? () => this.dispatch('NEXT', this.currentStage + 1) : () => this.dispatch('NEXT', 1),
            () => this.dispatch('RETRY'),
            () => this.dispatch('MENU')
          );
        }
        this.hud.hide();
        break;
      case 'FAILED':
        this.physicsLoop.pause();
        this.overlay.showFail(
          () => this.dispatch('RETRY'),
          () => this.dispatch('MENU')
        );
        this.hud.hide();
        break;
    }
  }

  getPhase(): Phase {
    return this.phase;
  }

  getPhysicsLoop(): PhysicsLoop {
    return this.physicsLoop;
  }

  getCanvas(): CanvasRenderer {
    return this.canvas;
  }

  getCamera(): Camera {
    return this.camera;
  }

  getAudio(): AudioManager {
    return this.audio;
  }

  getHUD(): HUD {
    return this.hud;
  }
}

export { Phase, Event };
