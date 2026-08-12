import { loadStage, getCurrentStage, getLoadedBodies } from '../data/loader';
import { PhysicsLoop } from '../physics/loop';
import { CanvasRenderer } from '../render/canvas';
import { Camera } from '../render/camera';
import { EffectsManager } from '../render/effects';
import { AudioManager } from '../audio/audio';
import { HUD } from '../ui/hud';
import { SlingshotController } from './slingshot';
import { SettleDetector } from './settle';
import { ScoreCalculator } from './score';
import { applyDamage, getBodyHealth } from './damage';
import type { StageDef } from '../data/schema';
import type Body from 'matter-js/Build/Body';
import Events from 'matter-js/Build/Events';
import World from 'matter-js/Build/World';

export class GameScene {
  private stageId: number;
  private physicsLoop: PhysicsLoop;
  private canvas: CanvasRenderer;
  private camera: Camera;
  private audio: AudioManager;
  private hud: HUD;
  private stage: StageDef | null = null;
  private slingshot: SlingshotController | null = null;
  private settle: SettleDetector;
  private score: ScoreCalculator | null = null;
  private pigsRemaining: number = 0;
  private onClearCallback: (() => void) | null = null;
  private onFailCallback: (() => void) | null = null;
  private effects: EffectsManager;
  private collisionHandler: ((pair: any) => void) | null = null;
  private currentBirdIndex: number = 0;
  private isSettled: boolean = false;
  private rafId: number | null = null;

  constructor(
    stageId: number,
    physicsLoop: PhysicsLoop,
    canvas: CanvasRenderer,
    camera: Camera,
    audio: AudioManager,
    hud: HUD
  ) {
    this.stageId = stageId;
    this.physicsLoop = physicsLoop;
    this.canvas = canvas;
    this.camera = camera;
    this.audio = audio;
    this.hud = hud;
    this.settle = new SettleDetector();
    this.effects = new EffectsManager();
  }

  async mount(): Promise<void> {
    this.stage = await loadStage(this.stageId);
    if (!this.stage) return;

    this.pigsRemaining = this.stage.pigs.length;
    this.score = new ScoreCalculator(this.stage.birds.length, this.stage.targetScore);
    this.slingshot = new SlingshotController(this.stage.slingshot.x, this.stage.slingshot.y);
    this.currentBirdIndex = 0;
    this.isSettled = false;

    this.hud.setBirds(this.stage.birds.length);
    this.hud.setPauseCallback(() => {
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    });

    this.setupCollisionHandler();
    this.startGameLoop();
  }

  unmount(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.collisionHandler) {
      Events.off(this.physicsLoop.getEngine().world, 'collisionStart', this.collisionHandler);
    }
    this.effects.clear();
  }

  private setupCollisionHandler(): void {
    this.collisionHandler = (event: any) => {
      for (const pair of event.pairs) {
        applyDamage(pair, (body: Body, material: string) => {
          this.onBodyDestroyed(body, material);
        });
      }
    };
    Events.on(this.physicsLoop.getEngine().world, 'collisionStart', this.collisionHandler);
  }

  private onBodyDestroyed(body: Body, material: string): void {
    if (material.startsWith('pig')) {
      this.pigsRemaining--;
      this.audio.playSound('pig');
      if (this.score) {
        const isBoss = material === 'pig_boss';
        this.score.addPigPoints(isBoss);
      }
    } else if (material === 'tnt') {
      this.audio.playSound('destroy');
      if (this.score) this.score.addTNTPoints();
      this.effects.createExplosion(body.position.x, body.position.y, '#FF4500');
      this.camera.shake();
    } else {
      this.audio.playSound('destroy');
      if (this.score) this.score.addBlockPoints();
      const colors: Record<string, string> = {
        glass: '#87CEEB',
        wood: '#8B4513',
        stone: '#808080'
      };
      this.effects.createExplosion(body.position.x, body.position.y, colors[material] || '#999');
      this.camera.shake();
    }
    World.remove(this.physicsLoop.getEngine().world, body);
  }

  private startGameLoop(): void {
    const loop = () => {
      const dt = 16.67; // ms

      // Update physics
      if (!this.physicsLoop.getIsPaused()) {
        this.physicsLoop.tick(dt);
      }

      // Update settle detector
      if (!this.physicsLoop.getIsPaused()) {
        const bodies = getLoadedBodies();
        const isSettledNow = this.settle.update(bodies, dt);

        if (!this.isSettled && isSettledNow) {
          this.isSettled = true;
          this.onTurnSettled();
        }
      }

      // Update effects
      this.effects.update(dt);

      // Render
      this.render();

      // Update HUD
      if (this.score) {
        this.hud.update(dt);
      }

      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  private onTurnSettled(): void {
    // Check for clear
    if (this.pigsRemaining <= 0) {
      if (this.score) this.score.finalizeScore();
      if (this.onClearCallback) this.onClearCallback();
      return;
    }

    // Check for fail
    if (this.currentBirdIndex >= this.stage!.birds.length) {
      if (this.onFailCallback) this.onFailCallback();
      return;
    }

    // Load next bird
    this.reloadBird();
  }

  private reloadBird(): void {
    if (this.currentBirdIndex < this.stage!.birds.length) {
      const birdType = this.stage!.birds[this.currentBirdIndex];
      this.slingshot!.resetBird(this.stage!.slingshot.x, this.stage!.slingshot.y, birdType);
      this.isSettled = false;
      this.settle.reset();
    }
  }

  private render(): void {
    this.canvas.clear();

    // Draw ground and bodies
    if (this.stage) {
      for (const poly of this.stage.ground) {
        this.canvas.drawGround(poly.points);
      }
    }

    const bodies = getLoadedBodies();
    for (const body of bodies) {
      if (body.label === 'ground') continue;
      if (body.label === 'bird') {
        this.canvas.drawCircle(body.position.x, body.position.y, 6, '#FF0000');
      } else if (body.label === 'pig') {
        this.canvas.drawCircle(body.position.x, body.position.y, 8, '#FFA500');
      } else {
        const colors: Record<string, string> = {
          glass: '#87CEEB',
          wood: '#8B4513',
          stone: '#808080',
          tnt: '#FFD700'
        };
        this.canvas.drawBody(body, colors[body.label] || '#999');
      }
    }

    // Draw slingshot
    if (this.slingshot) {
      this.slingshot.render(this.canvas);
    }

    // Draw effects
    this.effects.render(this.canvas);
  }

  getScore(): number {
    return this.score?.getScore() ?? 0;
  }

  getStars(): number {
    return this.score?.getStars() ?? 0;
  }

  onClear(callback: () => void): void {
    this.onClearCallback = callback;
  }

  onFail(callback: () => void): void {
    this.onFailCallback = callback;
  }
}
