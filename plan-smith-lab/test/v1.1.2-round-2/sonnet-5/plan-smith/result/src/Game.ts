import Matter from 'matter-js';
import { PhysicsWorld } from './physics/PhysicsWorld';
import type { MetaBody } from './physics/PhysicsWorld';
import { Renderer } from './render/Renderer';
import { ParticleSystem } from './render/ParticleSystem';
import { ScorePopupSystem } from './render/ScorePopup';
import { SlingshotInput } from './input/SlingshotInput';
import { UIManager } from './ui/UIManager';
import { AudioManager } from './audio/AudioManager';
import { SaveManager } from './save/SaveManager';
import { ScoreManager } from './score/ScoreManager';
import { StateMachine } from './state/StateMachine';
import { STAGES, getStageById, getNextStageId } from './data/stages';
import type { StageData, MaterialType } from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  SLINGSHOT_ANCHOR,
  BIRD_SETTLE_SPEED,
  BIRD_SETTLE_FRAMES,
  WORLD_WIDTH,
  LOW_FPS_THRESHOLD,
  LOW_FPS_DURATION_MS,
} from './constants';

const MATERIAL_PARTICLE_COLOR: Record<MaterialType, string> = {
  wood: '#8b5a2b',
  stone: '#6b6f76',
  glass: '#bfe3f0',
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Top-level orchestrator: owns the state machine, physics world, renderer,
 *  input, UI, audio and save layers, and runs the single requestAnimationFrame
 *  loop. This is the concrete implementation of plan §접근&단계 steps 2-9. */
export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private physics: PhysicsWorld;
  private renderer: Renderer;
  private particles = new ParticleSystem();
  private scorePopups = new ScorePopupSystem();
  private input: SlingshotInput;
  private ui: UIManager;
  private audio = new AudioManager();
  private stateMachine = new StateMachine();

  private currentStage: StageData | null = null;
  private activeBird: MetaBody | null = null;
  private birdsUsed = 0;
  private score = 0;
  private cameraX = 0;
  private worldWidth = WORLD_WIDTH;
  private settleFrames = 0;
  private lastTimestamp: number | null = null;
  private audioUnlocked = false;

  private fpsLowSince: number | null = null;
  private lowPerfMode = false;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.renderer = new Renderer(this.ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.physics = new PhysicsWorld({
      onImpact: () => this.audio.playCollision(),
      onBlockDamaged: () => {
        /* generic 충돌 SFX already fired via onImpact for this same pair */
      },
      onBlockDestroyed: (body) => {
        const material = body.meta?.material ?? 'wood';
        const count = this.lowPerfMode ? 6 : 14;
        this.particles.spawnBurst(body.position.x, body.position.y, MATERIAL_PARTICLE_COLOR[material], count);
        this.audio.playDestroy();
      },
      onPigRemoved: (body) => {
        this.score += 5000;
        this.scorePopups.spawn(body.position.x, body.position.y - 20, '+5000');
        this.audio.playDestroy();
        this.ui.updateHUD(this.remainingBirds(), this.score);
      },
    });

    this.input = new SlingshotInput(
      this.canvas,
      () => this.cameraX,
      (vx, vy) => this.launchBird(vx, vy),
      () => this.unlockAudio(),
    );

    this.ui = new UIManager({
      onStart: () => this.goToStageSelect(),
      onSelectStage: (id) => this.startStage(id),
      onStageSelectBack: () => this.goToMain(),
      onPauseClick: () => this.pauseGame(),
      onPauseRestart: () => this.restartStage(),
      onPauseMain: () => this.goToMain(),
      onClearNext: () => this.goToNextStage(),
      onClearStageSelect: () => this.goToStageSelect(),
      onFailedRestart: () => this.restartStage(),
      onFailedMain: () => this.goToMain(),
    });

    this.canvas.addEventListener('pointerdown', () => this.unlockAudio());

    this.goToMain();
    requestAnimationFrame((t) => this.loop(t));
  }

  private unlockAudio() {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    this.audio.unlock();
  }

  private remainingBirds(): number {
    return this.currentStage ? this.currentStage.birdsGranted - this.birdsUsed : 0;
  }

  private goToMain() {
    if (this.stateMachine.current !== 'MAIN') this.stateMachine.transition('MAIN');
    this.ui.showScreen('MAIN');
    this.ui.renderMainMenu(SaveManager.load());
  }

  private goToStageSelect() {
    this.stateMachine.transition('STAGE_SELECT');
    this.ui.showScreen('STAGE_SELECT');
    this.ui.renderStageSelect(STAGES, SaveManager.load());
  }

  private startStage(stageId: string) {
    const stage = getStageById(stageId);
    if (!stage) return;
    this.currentStage = stage;
    this.birdsUsed = 0;
    this.score = 0;
    this.activeBird = null;
    this.settleFrames = 0;
    this.particles.clear();
    this.scorePopups.clear();
    this.cameraX = 0;
    this.worldWidth =
      Math.max(
        CANVAS_WIDTH,
        ...stage.blocks.map((b) => b.x + b.w),
        ...stage.pigs.map((p) => p.x),
      ) + 300;
    this.physics.loadStage(stage);
    this.stateMachine.transition('PLAYING');
    this.ui.showScreen('PLAYING');
    this.ui.updateHUD(this.remainingBirds(), this.score);
    this.input.enabled = true;
  }

  private restartStage() {
    if (!this.currentStage) return;
    this.startStage(this.currentStage.id);
  }

  private goToNextStage() {
    if (!this.currentStage) return;
    const nextId = getNextStageId(this.currentStage.id);
    if (nextId) this.startStage(nextId);
    else this.goToStageSelect();
  }

  /** Requirement 3: 우측 일시정지 버튼 → 다시하기/메인으로. No "resume" path
   *  exists here by design (see StateMachine comment). */
  private pauseGame() {
    if (this.stateMachine.current !== 'PLAYING') return;
    this.stateMachine.transition('PAUSED');
    this.ui.showScreen('PAUSED');
    this.input.enabled = false;
  }

  private launchBird(vx: number, vy: number) {
    if (this.activeBird || !this.currentStage) return;
    if (this.remainingBirds() <= 0) return;
    this.birdsUsed += 1;
    this.activeBird = this.physics.spawnBird(SLINGSHOT_ANCHOR.x, SLINGSHOT_ANCHOR.y, vx, vy);
    this.settleFrames = 0;
    this.audio.playLaunch();
    this.input.enabled = false;
    this.ui.updateHUD(this.remainingBirds(), this.score);
  }

  private finalizeShot() {
    if (this.activeBird) {
      this.physics.removeBody(this.activeBird);
      this.activeBird = null;
    }
    if (!this.currentStage) return;

    const pigsRemaining = this.physics.getRemainingPigCount();
    if (pigsRemaining === 0) {
      const birdsRemaining = this.currentStage.birdsGranted - this.birdsUsed;
      const finalScore = this.score + ScoreManager.computeScore(0, birdsRemaining);
      this.score = finalScore;
      const stars = ScoreManager.computeStars(finalScore, this.currentStage);
      SaveManager.recordClear(this.currentStage.id, stars, finalScore);
      const isLast = getNextStageId(this.currentStage.id) === null;
      this.stateMachine.transition('CLEARED');
      this.ui.showClearOverlay(stars, finalScore, isLast);
      this.ui.showScreen('CLEARED');
      this.audio.playClear();
    } else if (this.remainingBirds() <= 0) {
      this.stateMachine.transition('FAILED');
      this.ui.showScreen('FAILED');
    } else {
      this.input.enabled = true;
    }
  }

  private loop = (timestamp: number) => {
    if (this.lastTimestamp === null) this.lastTimestamp = timestamp;
    const dt = Math.min(timestamp - this.lastTimestamp, 33);
    this.lastTimestamp = timestamp;
    this.trackPerformance(timestamp, dt);

    if (this.stateMachine.current === 'PLAYING') {
      this.physics.step(dt);
      this.updateCamera();
      this.checkBirdSettled();
    }

    this.particles.update();
    this.scorePopups.update();
    this.render();

    requestAnimationFrame(this.loop);
  };

  /** Plan §리스크&완화: "fps<30이 2초 지속 시 파티클 수 자동 감소". */
  private trackPerformance(timestamp: number, dt: number) {
    const fps = dt > 0 ? 1000 / dt : 60;
    if (fps < LOW_FPS_THRESHOLD) {
      if (this.fpsLowSince === null) this.fpsLowSince = timestamp;
      else if (timestamp - this.fpsLowSince >= LOW_FPS_DURATION_MS) this.lowPerfMode = true;
    } else {
      this.fpsLowSince = null;
      this.lowPerfMode = false;
    }
  }

  private updateCamera() {
    const target = this.activeBird
      ? clamp(this.activeBird.position.x - CANVAS_WIDTH * 0.35, 0, Math.max(0, this.worldWidth - CANVAS_WIDTH))
      : 0;
    this.cameraX += (target - this.cameraX) * 0.08;
  }

  private checkBirdSettled() {
    if (!this.activeBird) return;
    const body = this.activeBird;
    const speed = Matter.Vector.magnitude(body.velocity);
    const offWorld = body.position.x > this.worldWidth + 200 || body.position.y > CANVAS_HEIGHT + 400;
    if (offWorld) {
      this.finalizeShot();
      return;
    }
    if (speed < BIRD_SETTLE_SPEED) {
      this.settleFrames += 1;
      if (this.settleFrames >= BIRD_SETTLE_FRAMES) this.finalizeShot();
    } else {
      this.settleFrames = 0;
    }
  }

  private render() {
    const inGame = this.stateMachine.current === 'PLAYING' || this.stateMachine.current === 'PAUSED';
    if (!inGame || !this.currentStage) return;

    const canAim = this.remainingBirds() > 0 && !this.activeBird;
    const birdVisualPos = this.remainingBirds() > 0 && !this.activeBird
      ? this.input.getAimBirdPos() ?? { ...SLINGSHOT_ANCHOR }
      : null;

    this.renderer.render({
      bodies: this.physics.getAllRenderBodies(),
      cameraX: this.cameraX,
      backgroundTheme: this.currentStage.backgroundTheme,
      trajectoryPoints: canAim ? this.input.getTrajectoryPreview() : undefined,
      birdVisualPos,
      particles: this.particles,
      scorePopups: this.scorePopups,
    });
  }
}
