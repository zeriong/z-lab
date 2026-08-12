import { LevelData, InputEvent, PlayingPhase, GameResult, Vector } from '../core/types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { Storage } from '../core/Storage';
import { Bird, BirdType } from './Bird';
import { Pig } from './Pig';
import { Block } from './Block';
import { Ground } from './Ground';
import { Slingshot } from './Slingshot';
import { Trajectory } from './Trajectory';
import { Settle } from './Settle';
import { Score } from './Score';

export class Level {
  private levelData: LevelData;
  private physics: PhysicsWorld;
  private storage: Storage;

  private birds: Bird[] = [];
  private birdQueue: BirdType[] = [];
  private currentBird: Bird | null = null;
  private pigs: Map<string, Pig> = new Map();
  private blocks: Map<string, Block> = new Map();
  private grounds: Ground[] = [];

  private slingshot: Slingshot;
  private trajectory: Trajectory;
  private settle: Settle;
  private score: Score;

  private phase: PlayingPhase = 'AIMING';
  private isCleared: boolean = false;
  private isFailed: boolean = false;

  constructor(physics: PhysicsWorld, levelData: LevelData, storage: Storage) {
    this.physics = physics;
    this.levelData = levelData;
    this.storage = storage;

    this.trajectory = new Trajectory();
    this.settle = new Settle();
    this.score = new Score();

    this.slingshot = new Slingshot(
      levelData.slingshot.x,
      levelData.slingshot.y,
      levelData.slingshot.maxPull,
      levelData.slingshot.power
    );

    this.birdQueue = [...levelData.birds] as BirdType[];
    this.setup();
  }

  private setup(): void {
    // Setup ground
    this.levelData.ground.forEach((g) => {
      const ground = new Ground(this.physics, g.x, g.y, g.w, g.h);
      this.grounds.push(ground);
    });

    // Setup blocks
    this.levelData.blocks.forEach((b) => {
      const block = new Block(
        this.physics,
        b.type,
        b.shape,
        b.x,
        b.y,
        { w: b.w, h: b.h, r: b.r },
        b.angle || 0
      );
      this.blocks.set(block.id, block);
    });

    // Setup pigs
    this.levelData.pigs.forEach((p) => {
      const pig = new Pig(this.physics, p.size, p.x, p.y);
      this.pigs.set(pig.id, pig);
    });

    this.spawnNextBird();
  }

  private spawnNextBird(): void {
    if (this.birdQueue.length === 0) {
      return;
    }

    const birdType = this.birdQueue.shift() as BirdType;
    const bird = new Bird(this.physics, birdType, this.levelData.slingshot.x, this.levelData.slingshot.y);
    this.birds.push(bird);
    this.currentBird = bird;
    this.slingshot.setBird(bird);
  }

  setupPhase(phase: PlayingPhase): void {
    this.phase = phase;
    if (phase === 'AIMING') {
      if (!this.currentBird) {
        this.spawnNextBird();
      }
    } else if (phase === 'SETTLING') {
      this.settle.start();
    }
  }

  handleInput(event: InputEvent, worldPos: Vector): void {
    if (this.phase === 'AIMING') {
      if (event.type === 'pointerdown') {
        this.slingshot.startDrag(worldPos);
      } else if (event.type === 'pointermove') {
        this.slingshot.updateDrag(worldPos);
      } else if (event.type === 'pointerup') {
        const { fired } = this.slingshot.fire();
        if (fired) {
          this.phase = 'FLYING';
        }
      } else if (event.type === 'pointercancel') {
        this.slingshot.cancel();
      } else if (event.type === 'keydown' && event.key === 'Escape') {
        this.slingshot.cancel();
      }
    } else if (this.phase === 'FLYING') {
      if (event.type === 'keydown' && event.key === ' ') {
        if (this.currentBird && this.currentBird.type !== 'basic') {
          this.currentBird.activateAbilityManual();
        }
      }
    }
  }

  fixedUpdate(dt: number): void {
    // Update entities
    this.currentBird?.getPosition();
    this.pigs.forEach((pig) => pig.getPosition());
    this.blocks.forEach((block) => block.getPosition());

    // Check for out-of-bounds bird
    if (this.currentBird && this.currentBird.isOutOfBounds(this.levelData.world.width, this.levelData.world.height)) {
      this.phase = 'SETTLING';
      this.settle.start();
    }

    // Remove destroyed blocks and dead pigs
    const destroyedBlocks: string[] = [];
    this.blocks.forEach((block, id) => {
      if (block.isDestroyed) {
        destroyedBlocks.push(id);
        this.score.addBlockScore(block.getMaterial().score);
        block.dispose();
      }
    });
    destroyedBlocks.forEach((id) => this.blocks.delete(id));

    const deadPigs: string[] = [];
    this.pigs.forEach((pig, id) => {
      if (pig.isDead) {
        deadPigs.push(id);
        this.score.addPigScore();
        pig.dispose();
      }
    });
    deadPigs.forEach((id) => this.pigs.delete(id));

    // Check for settling
    if (this.settle.isActive()) {
      if (this.settle.update(this.physics)) {
        // Settling complete
        this.onSettleComplete();
      }
    }
  }

  private onSettleComplete(): void {
    this.settle.reset();

    if (this.pigs.size === 0) {
      // All pigs dead - level cleared
      const remainingBirds = this.birdQueue.length;
      this.score.addBirdBonus(remainingBirds);
      this.isCleared = true;
      return;
    }

    if (this.birdQueue.length === 0 && !this.currentBird) {
      // No more birds - level failed
      this.isFailed = true;
      return;
    }

    // Spawn next bird
    if (this.birdQueue.length > 0) {
      this.spawnNextBird();
      this.phase = 'AIMING';
    }
  }

  isCleared(): boolean {
    return this.isCleared;
  }

  isFailed(): boolean {
    return this.isFailed;
  }

  getPhase(): PlayingPhase {
    return this.phase;
  }

  getBirdPosition(): Vector {
    if (this.currentBird) {
      return this.currentBird.getPosition();
    }
    return this.levelData.slingshot as Vector;
  }

  getTrajectory(): Vector[] {
    if (this.phase !== 'AIMING' || !this.currentBird) {
      return [];
    }

    const pull = this.slingshot.getPullVector();
    const power = this.levelData.slingshot.power;
    const velocity = {
      x: pull.x * power,
      y: pull.y * power,
    };

    const hints = this.levelData.trajectoryHints || 12;
    return this.trajectory.calculate(this.levelData.slingshot as Vector, velocity, hints);
  }

  getSlingshot(): Slingshot {
    return this.slingshot;
  }

  getScore(): Score {
    return this.score;
  }

  getResult(): GameResult {
    const stars = this.score.getStars(this.levelData.starThresholds);
    return {
      cleared: this.isCleared,
      score: this.score.getTotal(),
      blockPoints: this.score.getBlockPoints(),
      pigPoints: this.score.getPigPoints(),
      birdBonusPoints: this.score.getBirdBonusPoints(),
      stars,
    };
  }

  getPigs(): Pig[] {
    return Array.from(this.pigs.values());
  }

  getBlocks(): Block[] {
    return Array.from(this.blocks.values());
  }

  getGround(): Ground[] {
    return this.grounds;
  }

  dispose(): void {
    this.birds.forEach((b) => b.dispose());
    this.pigs.forEach((p) => p.dispose());
    this.blocks.forEach((b) => b.dispose());
    this.grounds.forEach((g) => g.dispose());
    this.birds = [];
    this.pigs.clear();
    this.blocks.clear();
    this.grounds = [];
    this.currentBird = null;
  }
}
