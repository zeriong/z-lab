import Engine from 'matter-js/Build/Engine';
import Events from 'matter-js/Build/Events';
import Matter from 'matter-js';
import { PhysicsLoop } from './physics/loop';
import { CanvasRenderer } from './render/canvas';
import { Camera } from './render/camera';
import { OverlayLayer } from './ui/overlay';
import { HUDLayer } from './ui/hud';
import { AudioManager } from './audio/audio';
import { loadStageDefinition, createStageWorld, unloadStageWorld, type StageWorld } from './data/loader';
import { SettleDetector } from './game/settle';
import { ScoreManager } from './game/score';
import { SlingshotController } from './game/slingshot';
import { applyCollisionDamage, getBodyHealth } from './game/damage';
import { EffectManager } from './render/effects';
import { loadProgress, saveProgress, getTotalStars, isStageUnlocked, updateHighScore, updateStars, unlockStage, getSoundEnabled, setSoundEnabled } from './storage/progress';

type Phase = 'BOOT' | 'MENU' | 'STAGE_SELECT' | 'PLAYING' | 'PAUSED' | 'CLEARED' | 'FAILED';
type Event = 'START' | 'SELECT' | 'PAUSE' | 'RESUME' | 'RETRY' | 'CLEAR' | 'FAIL' | 'MENU' | 'NEXT';

const STATE_TRANSITIONS: Record<Phase, Partial<Record<Event, Phase>>> = {
  BOOT: { START: 'MENU' },
  MENU: { START: 'STAGE_SELECT' },
  STAGE_SELECT: { SELECT: 'PLAYING', BACK: 'MENU' },
  PLAYING: { PAUSE: 'PAUSED', CLEAR: 'CLEARED', FAIL: 'FAILED' },
  PAUSED: { RESUME: 'PLAYING', RETRY: 'PLAYING', MENU: 'MENU' },
  CLEARED: { NEXT: 'PLAYING', RETRY: 'PLAYING', MENU: 'MENU' },
  FAILED: { RETRY: 'PLAYING', MENU: 'MENU' },
};

export class App {
  private phase: Phase = 'BOOT';
  private engine: Matter.Engine;
  private physicsLoop: PhysicsLoop;
  private renderer: CanvasRenderer;
  private camera: Camera;
  private overlay: OverlayLayer;
  private hud: HUDLayer;
  private audio: AudioManager;
  private currentStageId: number = 1;
  private stageWorld: StageWorld | null = null;
  private settleDetector: SettleDetector;
  private scoreManager: ScoreManager;
  private slingshot: SlingshotController | null = null;
  private effectManager: EffectManager;
  private activeBirdIndex: number = -1;
  private remainingBirds: number = 0;
  private pigsRemaining: number = 0;
  private progress = loadProgress();
  private animationFrameId: number | null = null;

  constructor() {
    this.engine = Engine.create();
    this.physicsLoop = new PhysicsLoop();
    this.renderer = new CanvasRenderer();
    this.camera = new Camera();
    this.overlay = new OverlayLayer();
    this.hud = new HUDLayer();
    this.audio = new AudioManager();
    this.settleDetector = new SettleDetector();
    this.scoreManager = new ScoreManager();
    this.effectManager = new EffectManager();

    this.audio.setEnabled(getSoundEnabled(this.progress));
    this.hud.setSoundButtonEnabled(getSoundEnabled(this.progress));

    this.setupCallbacks();
  }

  private setupCallbacks(): void {
    this.overlay.setCallbacks({
      onStartGame: () => this.dispatch('START'),
      onSelectStage: (id) => this.dispatch('SELECT', id),
      onResume: () => this.dispatch('RESUME'),
      onRetry: () => this.dispatch('RETRY'),
      onMenuClick: () => this.dispatch('MENU'),
      onNextStage: () => this.dispatch('NEXT'),
    });

    this.hud.setOnPauseClick(() => this.dispatch('PAUSE'));
    this.hud.setOnSoundToggle((enabled) => {
      this.audio.setEnabled(enabled);
      setSoundEnabled(enabled, this.progress);
      saveProgress(this.progress);
    });
  }

  async start(): Promise<void> {
    this.overlay.showMenu();
    this.startRenderLoop();
  }

  private startRenderLoop(): void {
    const tick = () => {
      this.update();
      this.render();
      this.animationFrameId = requestAnimationFrame(tick);
    };
    this.animationFrameId = requestAnimationFrame(tick);
  }

  private update(): void {
    const dt = 1 / 60;

    if (this.phase === 'PLAYING' && this.stageWorld) {
      this.physicsLoop.tick(this.engine);

      // Update settle detector
      const isSettled = this.settleDetector.update(this.engine.world.bodies, dt);

      if (this.slingshot) {
        this.slingshot.updateTrajectoryAge(dt);
      }

      this.effectManager.update(dt);
      this.camera.update(dt);

      // Check for clear condition
      if (isSettled && this.pigsRemaining <= 0) {
        this.dispatch('CLEAR');
      }

      // Check for fail condition
      if (isSettled && this.activeBirdIndex >= this.stageWorld.stageDef.birds.length && this.pigsRemaining > 0) {
        this.dispatch('FAIL');
      }
    } else {
      this.camera.update(dt);
      this.effectManager.update(dt);
    }
  }

  private render(): void {
    const width = this.renderer.getWidth();
    const height = this.renderer.getHeight();

    // Draw game state based on phase
    if (this.phase === 'PLAYING' && this.stageWorld) {
      const ctx = this.renderer.getContext();
      this.renderer.clear('#87CEEB');

      // Draw ground and theme
      this.drawStageTheme(ctx, width, height, this.stageWorld.stageDef.theme);

      // Get camera transform
      const transform = this.camera.getTransform();

      // Apply camera transform
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.scale(transform.zoom, transform.zoom);
      ctx.translate(-transform.x, -transform.y);

      // Draw ground
      for (const groundBody of this.stageWorld.groundBodies) {
        this.drawPolygonBody(ctx, groundBody, '#8B7355');
      }

      // Draw blocks
      for (const body of this.stageWorld.bodies) {
        const health = getBodyHealth(body);
        if (health) {
          let color = '#D2B48C';
          if (health.material === 'glass') color = '#87CEEB';
          if (health.material === 'stone') color = '#808080';
          if (health.material === 'tnt') color = '#FF6347';

          if (body.circleRadius) {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(body.position.x, body.position.y, body.circleRadius, 0, Math.PI * 2);
            ctx.fill();
          } else {
            this.drawBoxBody(ctx, body, color);
          }
        }
      }

      // Draw pigs
      for (const pigBody of this.stageWorld.pigs) {
        ctx.fillStyle = '#90EE90';
        ctx.beginPath();
        ctx.arc(pigBody.position.x, pigBody.position.y, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw birds
      for (let i = 0; i < this.stageWorld.birds.length; i++) {
        const bird = this.stageWorld.birds[i];
        const isActive = i === this.activeBirdIndex;
        ctx.fillStyle = isActive ? '#FF0000' : '#CCCCCC';
        ctx.beginPath();
        ctx.arc(bird.position.x, bird.position.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw slingshot
      if (this.slingshot) {
        const drag = this.slingshot.getDragPosition();
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(this.stageWorld.stageDef.slingshot.x - 10, this.stageWorld.stageDef.slingshot.y);
        ctx.lineTo(drag.startX, drag.startY);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(this.stageWorld.stageDef.slingshot.x + 10, this.stageWorld.stageDef.slingshot.y);
        ctx.lineTo(drag.currentX, drag.currentY);
        ctx.stroke();

        // Draw trajectory preview
        if (this.slingshot.isDraggingNow()) {
          const points = this.slingshot.getTrajectoryPoints();
          for (let j = 0; j < points.length; j++) {
            ctx.fillStyle = `rgba(100, 100, 100, ${1 - j / points.length})`;
            ctx.beginPath();
            ctx.arc(points[j].x, points[j].y, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Draw trajectory trail
        const trail = this.slingshot.getTrajectoryTrail();
        if (trail) {
          const alpha = 1 - trail.age / 2;
          ctx.strokeStyle = `rgba(150, 150, 150, ${alpha * 0.5})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          if (trail.points.length > 0) {
            ctx.moveTo(trail.points[0].x, trail.points[0].y);
            for (let j = 1; j < trail.points.length; j++) {
              ctx.lineTo(trail.points[j].x, trail.points[j].y);
            }
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.restore();

      // Draw effects (particles)
      this.effectManager.render(ctx);
    }
  }

  private drawStageTheme(ctx: CanvasRenderingContext2D, width: number, height: number, theme: string): void {
    let gradient = ctx.createLinearGradient(0, 0, 0, height);
    if (theme === 'meadow') {
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#90EE90');
    } else if (theme === 'quarry') {
      gradient.addColorStop(0, '#B0C4DE');
      gradient.addColorStop(1, '#D3D3D3');
    } else {
      gradient.addColorStop(0, '#FF6347');
      gradient.addColorStop(1, '#FFB6C1');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  private drawBoxBody(ctx: CanvasRenderingContext2D, body: Matter.Body, color: string): void {
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);
    ctx.fillStyle = color;
    const vertices = body.vertices;
    if (vertices.length > 0) {
      ctx.beginPath();
      ctx.moveTo(vertices[0].x - body.position.x, vertices[0].y - body.position.y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x - body.position.x, vertices[i].y - body.position.y);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawPolygonBody(ctx: CanvasRenderingContext2D, body: Matter.Body, color: string): void {
    ctx.fillStyle = color;
    ctx.beginPath();
    const vertices = body.vertices;
    if (vertices.length > 0) {
      ctx.moveTo(vertices[0].x, vertices[0].y);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x, vertices[i].y);
      }
      ctx.closePath();
    }
    ctx.fill();
  }

  async dispatch(event: Event, param?: number): Promise<void> {
    const nextPhase = STATE_TRANSITIONS[this.phase][event];

    if (nextPhase === undefined) {
      console.warn(`Undefined transition: ${this.phase} -[${event}]->`, param);
      return;
    }

    // Handle state exit logic
    if (this.phase === 'PLAYING') {
      this.physicsLoop.pause();
      if (this.stageWorld) {
        unloadStageWorld(this.engine, this.stageWorld);
        this.stageWorld = null;
      }
    }

    // Update phase
    this.phase = nextPhase;

    // Handle state entry logic
    if (this.phase === 'MENU') {
      this.overlay.showMenu();
      this.hud.hide();
    } else if (this.phase === 'STAGE_SELECT') {
      const stageProgress: Record<number, { unlocked: boolean; stars: number }> = {};
      for (let i = 1; i <= 10; i++) {
        stageProgress[i] = {
          unlocked: isStageUnlocked(i, this.progress),
          stars: this.progress.stars[i] || 0,
        };
      }
      this.overlay.showStageSelect(stageProgress);
      this.hud.hide();
    } else if (this.phase === 'PLAYING') {
      this.currentStageId = param || this.currentStageId;
      await this.initializeStage(this.currentStageId);
      this.hud.show();
    } else if (this.phase === 'PAUSED') {
      this.physicsLoop.pause();
      this.overlay.showPause();
    } else if (this.phase === 'CLEARED') {
      this.physicsLoop.pause();
      const nextStageExists = this.currentStageId < 10;
      const stars = this.scoreManager.getStars(this.stageWorld?.stageDef.targetScore || 0);
      updateHighScore(this.currentStageId, this.scoreManager.getCurrentScore(), this.progress);
      updateStars(this.currentStageId, stars, this.progress);
      if (this.currentStageId < 10) {
        unlockStage(this.currentStageId + 1, this.progress);
      }
      saveProgress(this.progress);
      this.overlay.showClear(this.scoreManager.getCurrentScore(), stars, nextStageExists);
    } else if (this.phase === 'FAILED') {
      this.physicsLoop.pause();
      this.overlay.showFail();
    }
  }

  private async initializeStage(stageId: number): Promise<void> {
    const stageDef = await loadStageDefinition(stageId);
    this.stageWorld = createStageWorld(this.engine, stageDef);
    this.camera.settleCameraToSlingshot(
      stageDef.slingshot.x,
      stageDef.slingshot.y,
      this.renderer.getWidth(),
      this.renderer.getHeight()
    );

    this.settleDetector.reset();
    this.scoreManager.reset();
    this.slingshot = new SlingshotController(this.renderer.getCanvas());
    this.activeBirdIndex = 0;
    this.remainingBirds = stageDef.birds.length;
    this.pigsRemaining = stageDef.pigs.length;

    this.hud.updateBirds(this.remainingBirds, stageDef.birds.length);
    this.hud.updateScore(0);

    // Setup slingshot
    this.slingshot.setOnLaunchCallback((vx, vy) => {
      if (this.activeBirdIndex < this.stageWorld!.birds.length) {
        const bird = this.stageWorld!.birds[this.activeBirdIndex];
        Matter.Body.setStatic(bird, false);
        Matter.Body.setVelocity(bird, { x: vx, y: vy });
        this.settleDetector.startFlight();
        this.activeBirdIndex++;
        this.remainingBirds--;
        this.hud.updateBirds(this.remainingBirds, this.stageWorld!.stageDef.birds.length);
        this.audio.playSound('launch');
      }
    });

    // Setup collision handler
    Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        applyCollisionDamage(
          pair,
          (body) => {
            if ((body as any).plugin?.kind === 'pig') {
              this.pigsRemaining--;
              this.scoreManager.addPigScore((body as any).plugin?.size === 'boss');
              this.audio.playSound('pig');
            } else {
              this.scoreManager.addBlockScore();
              this.audio.playSound('break');
            }
            Matter.World.remove(this.engine.world, body);
            const health = getBodyHealth(body);
            if (health) {
              this.effectManager.createDebris(body.position.x, body.position.y, 4, 200, '#D2B48C');
              this.effectManager.createDust(body.position.x, body.position.y);
            }
            this.camera.shake();
          },
          (x, y) => {
            this.effectManager.createDebris(x, y, 8, 300, '#FF4500');
            this.effectManager.createDust(x, y);
            this.camera.shake(5, 0.2);
            this.audio.playSound('impact');
          }
        );
      }
      this.hud.updateScore(this.scoreManager.getCurrentScore());
    });

    this.physicsLoop.resume();
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.audio.stopAll();
    this.hud.remove();
    if (this.stageWorld) {
      unloadStageWorld(this.engine, this.stageWorld);
    }
  }
}
