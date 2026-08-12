import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../core/constants';
import { clamp } from '../core/math';
import type { BirdKind, LevelData } from '../data/levelSchema';
import {
  damageFrom,
  impactEnergy,
  MIN_EVENT_ENERGY,
  radialFalloff,
} from '../physics/collisionRules';
import { BOMB_ENERGY, BOMB_IMPULSE, BOMB_RADIUS, SPEED_BOOST } from '../physics/materials';
import type { CollisionInfo, PhysicsWorld } from '../physics/PhysicsWorld';
import type { Particles } from '../render/Particles';
import type { SfxName } from '../audio/Sfx';
import { Bird } from './entities/Bird';
import { Block } from './entities/Block';
import { asEntityRef } from './entities/EntityRef';
import { Ground } from './entities/Ground';
import { Pig } from './entities/Pig';
import { Score, starsFor } from './Score';
import { SettleDetector, type SettleSample } from './Settle';
import { Slingshot } from './Slingshot';
import { predictTrajectory, type TrajectoryPoint } from './Trajectory';

/** Sub-phases inside PLAYING (plan §3). */
export type RoundPhase = 'AIMING' | 'FLYING' | 'SETTLING' | 'DONE';

export interface LevelResult {
  levelId: number;
  cleared: boolean;
  blockScore: number;
  pigScore: number;
  birdBonus: number;
  total: number;
  stars: number;
}

export interface LevelEvents {
  onScoreChanged(total: number): void;
  onBirdsChanged(remaining: BirdKind[], loaded: BirdKind | null): void;
  onPhaseChanged(phase: RoundPhase): void;
  onResult(result: LevelResult): void;
  onSfx(name: SfxName): void;
  onShake(strength: number): void;
}

export interface AimView {
  anchorX: number;
  anchorY: number;
  birdX: number;
  birdY: number;
  kind: BirdKind;
  pullRatio: number;
  dragging: boolean;
  trajectory: TrajectoryPoint[];
}

/** Bird leaves play this far outside the world. */
const DESPAWN_MARGIN = 200;
/** Frames of near-zero speed before a landed bird is written off. */
const BIRD_REST_FRAMES = 40;

export class Level {
  readonly data: LevelData;
  readonly ground: Ground;
  readonly blocks: Block[] = [];
  readonly pigs: Pig[] = [];
  readonly slingshot: Slingshot;
  readonly score = new Score();

  activeBird: Bird | null = null;
  queue: BirdKind[];
  phase: RoundPhase = 'AIMING';
  result: LevelResult | null = null;

  private readonly settle = new SettleDetector();
  private readonly pendingBlocks: Block[] = [];
  private readonly pendingPigs: Pig[] = [];
  private readonly sampleBuffer: SettleSample[] = [];
  private disposed = false;
  private lastSfxFrame = -99;
  private frame = 0;

  constructor(
    data: LevelData,
    private readonly physics: PhysicsWorld,
    private readonly particles: Particles,
    private readonly events: LevelEvents,
  ) {
    this.data = data;
    this.queue = [...data.birds];

    this.ground = new Ground(data.ground, data.world.width, data.world.height, physics);
    for (const def of data.blocks) this.blocks.push(new Block(def, physics));
    for (const def of data.pigs) this.pigs.push(new Pig(def, physics));

    this.slingshot = new Slingshot(data.slingshot);
    this.particles.setGravity(physics.integration.gravityPerStep);

    this.loadNextBird();
  }

  // ------------------------------------------------------------------ input

  /**
   * @returns true when the level consumed the press. A `false` means "empty
   * space" and the caller may start a camera pan (plan §5.3).
   */
  pointerDown(wx: number, wy: number): boolean {
    if (this.phase === 'AIMING') {
      return this.slingshot.beginDrag(wx, wy);
    }
    if (this.phase === 'FLYING' && this.activeBird?.canUseAbility) {
      this.useAbility();
      return true;
    }
    return false;
  }

  pointerMove(wx: number, wy: number): void {
    if (this.phase !== 'AIMING' || !this.slingshot.dragging) return;
    this.slingshot.updateDrag(wx, wy);
    const bird = this.slingshot.bird;
    if (bird) this.physics.setPosition(bird.handle, this.slingshot.birdX, this.slingshot.birdY);
  }

  pointerUp(): void {
    if (this.phase !== 'AIMING' || !this.slingshot.dragging) return;
    const launchX = this.slingshot.birdX;
    const launchY = this.slingshot.birdY;
    const launch = this.slingshot.release();
    if (!launch) {
      // Cancelled: put the bird back on the anchor.
      const bird = this.slingshot.bird;
      if (bird) {
        this.physics.setPosition(bird.handle, this.slingshot.anchorX, this.slingshot.anchorY);
        bird.initTransform(this.physics);
      }
      return;
    }

    const bird = this.slingshot.bird;
    if (!bird) return;

    this.physics.setPosition(bird.handle, launchX, launchY);
    this.physics.setStatic(bird.handle, false);
    this.physics.setVelocity(bird.handle, launch.vx, launch.vy);
    this.physics.setAngularVelocity(bird.handle, 0.12);
    bird.launched = true;
    bird.restFrames = 0;
    bird.initTransform(this.physics);

    this.events.onSfx('launch');
    this.setPhase('FLYING');
    // Generous cap while flying; the real settle window opens on landing.
    this.settle.begin(10);
  }

  /** Esc during aiming, or the pointer leaving the window. */
  cancelAim(): void {
    if (this.phase !== 'AIMING') return;
    this.slingshot.cancel();
    const bird = this.slingshot.bird;
    if (bird) {
      this.physics.setPosition(bird.handle, this.slingshot.anchorX, this.slingshot.anchorY);
      bird.initTransform(this.physics);
    }
  }

  private useAbility(): void {
    const bird = this.activeBird;
    if (!bird || !bird.canUseAbility) return;
    bird.abilityUsed = true;

    if (bird.kind === 'speed') {
      const s = this.physics.getState(bird.handle);
      const len = Math.hypot(s.vx, s.vy);
      if (len > 0.01) {
        this.physics.setVelocity(bird.handle, s.vx * SPEED_BOOST, s.vy * SPEED_BOOST);
      }
      this.particles.spawnSparks(s.x, s.y, 12, '#fff2b0');
      this.events.onSfx('boost');
    } else if (bird.kind === 'bomb') {
      const s = this.physics.getState(bird.handle);
      this.explode(s.x, s.y);
      this.despawnBird();
    }
  }

  private explode(x: number, y: number): void {
    this.particles.spawnSparks(x, y, 26, '#ffb347');
    this.particles.spawnDust(x, y, 14, 'rgba(60,60,60,0.55)');
    this.events.onSfx('explode');
    this.events.onShake(14);

    for (const hit of this.physics.queryRadius(x, y, BOMB_RADIUS)) {
      const falloff = radialFalloff(hit.distance, BOMB_RADIUS);
      if (falloff <= 0) continue;

      const state = this.physics.getState(hit.handle);
      const dx = state.x - x;
      const dy = state.y - y;
      const len = Math.hypot(dx, dy) || 1;
      this.physics.applyImpulse(
        hit.handle,
        (dx / len) * BOMB_IMPULSE * falloff,
        (dy / len) * BOMB_IMPULSE * falloff - BOMB_IMPULSE * 0.25 * falloff,
      );

      const ref = asEntityRef(hit.handle.userData);
      if (!ref) continue;
      const energy = BOMB_ENERGY * falloff;
      if (ref.kind === 'block') {
        if (ref.block.applyDamage(damageFrom(ref.block.spec, energy))) {
          this.pendingBlocks.push(ref.block);
        }
      } else if (ref.kind === 'pig') {
        if (ref.pig.applyDamage(damageFrom(ref.pig.spec, energy))) {
          this.pendingPigs.push(ref.pig);
        }
      }
    }
  }

  // ------------------------------------------------------------------- step

  /** Called once per fixed step, AFTER physics.step(). */
  fixedUpdate(): void {
    if (this.disposed) return;
    this.frame += 1;

    for (const collision of this.physics.takeCollisions()) this.resolveCollision(collision);
    this.flushRemovals();

    for (const block of this.blocks) {
      block.sync(this.physics);
      block.update();
    }
    for (const pig of this.pigs) {
      pig.sync(this.physics);
      pig.update();
    }
    if (this.activeBird) this.activeBird.sync(this.physics);

    this.updatePhase();
  }

  private resolveCollision(collision: CollisionInfo): void {
    const energy = impactEnergy(collision.effectiveMass, collision.relativeNormalSpeed);
    if (energy < MIN_EVENT_ENERGY) return;

    if (energy > 25 && this.frame - this.lastSfxFrame > 3) {
      this.lastSfxFrame = this.frame;
      this.events.onSfx('thud');
    }
    if (energy > 120) {
      this.particles.spawnDust(collision.x, collision.y, 3);
      this.events.onShake(Math.min(6, energy / 90));
    }

    this.applyImpactTo(collision.a.userData, energy, collision.x, collision.y);
    this.applyImpactTo(collision.b.userData, energy, collision.x, collision.y);
  }

  private applyImpactTo(userData: unknown, energy: number, x: number, y: number): void {
    const ref = asEntityRef(userData);
    if (!ref) return;

    if (ref.kind === 'block') {
      const block = ref.block;
      if (block.dead) return;
      const damage = damageFrom(block.spec, energy);
      if (damage <= 0) return;
      if (block.applyDamage(damage)) this.pendingBlocks.push(block);
      else this.particles.spawnDust(x, y, 2, 'rgba(255,255,255,0.35)');
    } else if (ref.kind === 'pig') {
      const pig = ref.pig;
      if (pig.dead) return;
      const damage = damageFrom(pig.spec, energy);
      if (damage <= 0) return;
      if (pig.applyDamage(damage)) this.pendingPigs.push(pig);
    }
  }

  /**
   * Bodies are removed here, never inside the collision callback — mutating
   * the world mid-iteration corrupts Matter's internal traversal (plan §6.2).
   */
  private flushRemovals(): void {
    if (this.pendingBlocks.length) {
      for (const block of this.pendingBlocks) {
        const index = this.blocks.indexOf(block);
        if (index < 0) continue;
        this.blocks.splice(index, 1);
        this.particles.spawnDebris(block.x, block.y, block.spec.debris, block.extent * 1.6, 11);
        this.particles.spawnDust(block.x, block.y, 4);
        this.particles.spawnText(block.x, block.y - 18, `+${block.spec.score}`, '#ffe9a8');
        this.score.addBlock(block.spec.score);
        this.physics.removeBody(block.handle);
      }
      this.pendingBlocks.length = 0;
      this.events.onSfx('break');
      this.events.onScoreChanged(this.score.total);
    }

    if (this.pendingPigs.length) {
      for (const pig of this.pendingPigs) {
        const index = this.pigs.indexOf(pig);
        if (index < 0) continue;
        this.pigs.splice(index, 1);
        this.particles.spawnDebris(pig.x, pig.y, pig.spec.debris, pig.radius * 2, 14);
        this.particles.spawnSparks(pig.x, pig.y, 10, '#d7ff9e');
        this.particles.spawnText(pig.x, pig.y - 24, `+${pig.spec.score}`, '#c8ff8a');
        this.score.addPig(pig.spec.score);
        this.physics.removeBody(pig.handle);
      }
      this.pendingPigs.length = 0;
      this.events.onSfx('pig');
      this.events.onShake(8);
      this.events.onScoreChanged(this.score.total);
    }
  }

  private updatePhase(): void {
    if (this.phase === 'AIMING' || this.phase === 'DONE') return;

    if (this.phase === 'FLYING') {
      this.trackFlyingBird();
      if (this.settle.update(this.settleSamples())) {
        this.resolveRound();
        return;
      }
      const bird = this.activeBird;
      const finished = !bird || bird.restFrames >= BIRD_REST_FRAMES;
      if (finished) {
        this.setPhase('SETTLING');
        this.settle.begin(6);
      }
      return;
    }

    // SETTLING
    if (this.settle.update(this.settleSamples())) this.resolveRound();
  }

  private trackFlyingBird(): void {
    const bird = this.activeBird;
    if (!bird) return;

    const { width, height } = this.data.world;
    if (
      bird.x < -DESPAWN_MARGIN ||
      bird.x > width + DESPAWN_MARGIN ||
      bird.y > height + DESPAWN_MARGIN * 2
    ) {
      this.despawnBird();
      return;
    }
    if (bird.speed < 0.6) bird.restFrames += 1;
    else bird.restFrames = 0;
  }

  private settleSamples(): SettleSample[] {
    const out = this.sampleBuffer;
    out.length = 0;
    for (const block of this.blocks) {
      out.push({ speed: block.speed, angularSpeed: block.angularSpeed });
    }
    for (const pig of this.pigs) {
      out.push({ speed: pig.speed, angularSpeed: pig.angularSpeed });
    }
    if (this.activeBird) {
      out.push({ speed: this.activeBird.speed, angularSpeed: this.activeBird.angularSpeed });
    }
    return out;
  }

  private resolveRound(): void {
    this.settle.stop();
    this.despawnBird();

    if (this.pigs.length === 0) {
      this.finish(true);
      return;
    }
    if (this.queue.length === 0) {
      this.finish(false);
      return;
    }
    this.loadNextBird();
  }

  private finish(cleared: boolean): void {
    if (cleared) this.score.awardRemainingBirds(this.queue.length);
    const total = this.score.total;
    const result: LevelResult = {
      levelId: this.data.id,
      cleared,
      blockScore: this.score.blockScore,
      pigScore: this.score.pigScore,
      birdBonus: this.score.birdBonus,
      total,
      stars: cleared ? Math.max(1, starsFor(total, this.data.starThresholds)) : 0,
    };
    this.result = result;
    this.setPhase('DONE');
    this.events.onScoreChanged(total);
    this.events.onSfx(cleared ? 'clear' : 'fail');
    this.events.onResult(result);
  }

  private loadNextBird(): void {
    const kind = this.queue.shift();
    if (!kind) {
      this.slingshot.loadBird(null);
      this.events.onBirdsChanged(this.queue, null);
      return;
    }
    const bird = new Bird(kind, this.slingshot.anchorX, this.slingshot.anchorY, this.physics);
    this.activeBird = bird;
    this.slingshot.loadBird(bird);
    this.setPhase('AIMING');
    this.events.onBirdsChanged(this.queue, kind);
  }

  private despawnBird(): void {
    const bird = this.activeBird;
    if (!bird) return;
    this.particles.spawnDust(bird.x, bird.y, 3);
    this.physics.removeBody(bird.handle);
    this.activeBird = null;
    this.slingshot.loadBird(null);
  }

  private setPhase(phase: RoundPhase): void {
    if (this.phase === phase) return;
    this.phase = phase;
    this.events.onPhaseChanged(phase);
  }

  // ------------------------------------------------------------------- view

  /** Null unless a bird is on the sling. */
  getAimView(): AimView | null {
    const bird = this.slingshot.bird;
    if (!bird || this.phase !== 'AIMING') return null;

    let trajectory: TrajectoryPoint[] = [];
    if (this.slingshot.dragging && this.slingshot.pullLength > 6) {
      trajectory = predictTrajectory({
        startX: this.slingshot.birdX,
        startY: this.slingshot.birdY,
        vx: this.slingshot.pullX * this.slingshot.power,
        vy: this.slingshot.pullY * this.slingshot.power,
        frictionAir: bird.spec.frictionAir,
        integration: this.physics.integration,
        dots: this.data.trajectoryHints,
        stepsPerDot: 6,
        stopBelowY: this.ground.surfaceY,
      });
    }

    return {
      anchorX: this.slingshot.anchorX,
      anchorY: this.slingshot.anchorY,
      birdX: this.slingshot.birdX,
      birdY: this.slingshot.birdY,
      kind: bird.kind,
      pullRatio: this.slingshot.pullRatio,
      dragging: this.slingshot.dragging,
      trajectory,
    };
  }

  /** Where the camera wants to be for the current phase (plan §5.3). */
  getCameraTarget(): { x: number; y: number; zoom: number; lerp: number } {
    const { minZoom, maxZoom } = this.data.camera;
    switch (this.phase) {
      case 'AIMING': {
        const x = this.slingshot.anchorX + LOGICAL_WIDTH * 0.18;
        const y = this.slingshot.anchorY - 40;
        return { x, y, zoom: clamp(1.05, minZoom, maxZoom), lerp: 0.12 };
      }
      case 'FLYING': {
        const bird = this.activeBird;
        if (!bird) return this.overviewTarget();
        return {
          x: bird.x + 90,
          y: bird.y - 40,
          zoom: clamp(0.95, minZoom, maxZoom),
          lerp: 0.08,
        };
      }
      default:
        return this.overviewTarget();
    }
  }

  private overviewTarget(): { x: number; y: number; zoom: number; lerp: number } {
    const { minZoom, maxZoom } = this.data.camera;
    let left = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    for (const pig of this.pigs) {
      left = Math.min(left, pig.x);
      right = Math.max(right, pig.x);
    }
    for (const block of this.blocks) {
      left = Math.min(left, block.x);
      right = Math.max(right, block.x);
    }
    if (!Number.isFinite(left)) {
      left = this.slingshot.anchorX;
      right = this.slingshot.anchorX + 600;
    }
    left = Math.min(left, this.slingshot.anchorX);

    const width = Math.max(600, right - left + 400);
    const zoom = clamp(LOGICAL_WIDTH / width, minZoom, maxZoom);
    return {
      x: (left + right) / 2,
      y: this.ground.surfaceY - LOGICAL_HEIGHT * 0.22,
      zoom,
      lerp: 0.05,
    };
  }

  get pigsRemaining(): number {
    return this.pigs.length;
  }

  get birdsRemaining(): number {
    return this.queue.length + (this.activeBird && !this.activeBird.launched ? 1 : 0);
  }

  // -------------------------------------------------------------- lifecycle

  /**
   * Full teardown (plan §3). Restart always goes through "throw the world away
   * and rebuild it" — partial resets are the classic source of the
   * "the 20th retry runs at 30fps" leak.
   */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.settle.stop();
    for (const block of this.blocks) this.physics.removeBody(block.handle);
    for (const pig of this.pigs) this.physics.removeBody(pig.handle);
    if (this.activeBird) this.physics.removeBody(this.activeBird.handle);
    this.ground.dispose(this.physics);
    this.blocks.length = 0;
    this.pigs.length = 0;
    this.pendingBlocks.length = 0;
    this.pendingPigs.length = 0;
    this.queue.length = 0;
    this.activeBird = null;
    this.slingshot.loadBird(null);
  }
}
