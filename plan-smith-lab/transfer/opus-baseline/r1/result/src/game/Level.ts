import Matter from 'matter-js';
import { PhysicsWorld, PhysicsBody } from '../physics/PhysicsWorld';
import { calculateDamage } from '../physics/collisionRules';
import { getMaterial } from '../physics/materials';
import { Renderer } from '../render/Renderer';
import { Block, BlockConfig } from './entities/Block';
import { Pig, PigConfig } from './entities/Pig';
import { Bird, BirdConfig } from './entities/Bird';
import { Ground, GroundConfig } from './entities/Ground';
import { Slingshot, SlingshotConfig } from './Slingshot';
import { Trajectory } from './Trajectory';
import { Score } from './Score';
import { Settle } from './Settle';
import { PointerInput } from '../core/Input';

export interface LevelConfig {
  id: number;
  name: string;
  world: { width: number; height: number; gravity: number };
  camera: { minX: number; maxX: number; minZoom: number; maxZoom: number };
  slingshot: SlingshotConfig;
  birds: string[];
  ground: GroundConfig[];
  blocks: BlockConfig[];
  pigs: PigConfig[];
  starThresholds: [number, number, number];
  trajectoryHints?: number;
}

export interface LevelProgress {
  stars: number;
  score: number;
  cleared: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export class Level {
  private config: LevelConfig;
  private physicsWorld: PhysicsWorld;
  private renderer: Renderer;

  private blocks: Map<string, Block> = new Map();
  private pigs: Map<string, Pig> = new Map();
  private birds: Bird[] = [];
  private grounds: Map<string, Ground> = new Map();
  private slingshot: Slingshot;
  private score: Score;
  private settle: Settle;
  private particles: Particle[] = [];

  private currentBirdIndex: number = 0;
  private isLevelCleared: boolean = false;
  private isLevelFailed: boolean = false;
  private settleCounter: number = 0;
  private levelComplete: boolean = false;

  constructor(config: LevelConfig, physicsWorld: PhysicsWorld, renderer: Renderer) {
    this.config = config;
    this.physicsWorld = physicsWorld;
    this.renderer = renderer;

    this.slingshot = new Slingshot(config.slingshot);
    this.score = new Score(config.starThresholds);
    this.settle = new Settle();

    this.initializeLevel();
    this.setupCollisionHandling();
  }

  private initializeLevel() {
    // Create grounds
    this.config.ground.forEach((gc, i) => {
      const ground = new Ground(`ground_${i}`, gc, this.physicsWorld);
      this.grounds.set(ground.getId(), ground);
    });

    // Create blocks
    this.config.blocks.forEach((bc, i) => {
      const block = new Block(`block_${i}`, bc, this.physicsWorld);
      this.blocks.set(block.getId(), block);
    });

    // Create pigs
    this.config.pigs.forEach((pc, i) => {
      const pig = new Pig(`pig_${i}`, pc, this.physicsWorld);
      this.pigs.set(pig.getId(), pig);
    });

    // Create birds
    this.config.birds.forEach((birdType, i) => {
      const birdConfig: BirdConfig = {
        type: birdType as any,
        x: this.config.slingshot.x,
        y: this.config.slingshot.y,
      };
      const bird = new Bird(`bird_${i}`, birdConfig, this.physicsWorld);
      this.birds.push(bird);
    });

    // Set first bird
    if (this.birds.length > 0) {
      this.slingshot.setBird(this.birds[0]);
    }
  }

  private setupCollisionHandling() {
    this.physicsWorld.onCollision((bodyA, bodyB) => {
      // Calculate damage
      const damageInfo = calculateDamage(bodyA, bodyB);
      if (!damageInfo) return;

      const target = damageInfo.targetBody;

      // Apply damage to blocks
      if (target.type === 'block') {
        const block = this.blocks.get(target.id);
        if (block) {
          block.takeDamage(damageInfo.damage);
        }
      }

      // Apply damage to pigs
      if (target.type === 'pig') {
        const pig = this.pigs.get(target.id);
        if (pig) {
          pig.takeDamage(damageInfo.damage);
        }
      }
    });
  }

  handlePointerInput(input: PointerInput) {
    this.slingshot.handleInput(input);
  }

  update() {
    if (this.levelComplete) return;

    this.physicsWorld.flushRemovals();

    // Update bird speed
    this.birds.forEach((bird) => bird.updateSpeed());

    // Check for destroyed blocks
    const destroyedBlocks: string[] = [];
    this.blocks.forEach((block, id) => {
      if (block.isDestroyed()) {
        destroyedBlocks.push(id);
        const material = getMaterial(block.getType());
        this.score.addBlockScore(material.score);
        this.spawnBlockParticles(block);
      }
    });

    // Remove destroyed blocks from physics
    destroyedBlocks.forEach((id) => {
      this.physicsWorld.removeBody(id);
      this.blocks.delete(id);
    });

    // Check for dead pigs
    const deadPigs: string[] = [];
    this.pigs.forEach((pig, id) => {
      if (pig.isDying()) {
        deadPigs.push(id);
        const material = getMaterial('pig');
        this.score.addPigScore(material.score);
        this.spawnPigParticles(pig);
      }
    });

    // Remove dead pigs from physics
    deadPigs.forEach((id) => {
      this.physicsWorld.removeBody(id);
      this.pigs.delete(id);
    });

    // Remove out-of-bounds birds
    this.birds = this.birds.filter((bird) => {
      if (bird.isDestroyed_()) {
        const pb = bird.getPhysicsBody();
        if (pb) this.physicsWorld.removeBody(bird.getId());
        return false;
      }

      if (bird.isLaunched_()) {
        const pos = bird.getPosition();
        if (pos.x < -100 || pos.x > 1380 || pos.y > 900) {
          bird.destroy();
          const pb = bird.getPhysicsBody();
          if (pb) this.physicsWorld.removeBody(bird.getId());
          return false;
        }
      }

      return true;
    });

    // Update settle
    this.settleCounter++;
    const allBodies = this.physicsWorld.getAllBodies();
    const isSettled = this.settle.checkSettled(allBodies, this.settleCounter);

    if (isSettled) {
      // Check level completion
      if (this.pigs.size === 0) {
        this.isLevelCleared = true;
        const remainingBirds = this.birds.filter((b) => !b.isLaunched_()).length;
        this.score.addBirdBonusScore(remainingBirds * 10000);
        this.levelComplete = true;
      } else if (this.currentBirdIndex >= this.config.birds.length && this.birds.every((b) => b.isLaunched_())) {
        this.isLevelFailed = true;
        this.levelComplete = true;
      } else if (this.currentBirdIndex < this.config.birds.length) {
        // Load next bird
        const nextBird = this.birds[this.currentBirdIndex];
        if (nextBird && !nextBird.isLaunched_()) {
          this.slingshot.setBird(nextBird);
          this.currentBirdIndex++;
          this.settleCounter = 0;
          this.settle.reset();
        }
      }
    }

    // Update particles
    this.particles = this.particles.filter((p) => {
      p.life--;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.2; // gravity
      return p.life > 0;
    });
  }

  private spawnBlockParticles(block: Block) {
    const pos = block.getPosition();
    const material = getMaterial(block.getType());
    const count = 8 + Math.floor(Math.random() * 7);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 3 + Math.random() * 5;

      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        size: 2 + Math.random() * 4,
        color: material.color,
      });
    }
  }

  private spawnPigParticles(pig: Pig) {
    const pos = pig.getPosition();
    const count = 10;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 4 + Math.random() * 6;

      this.particles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        size: 3 + Math.random() * 5,
        color: '#ff9800',
      });
    }
  }

  renderHUD(ctx: CanvasRenderingContext2D) {
    // Render current score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.fillText(`Score: ${this.score.getScore()}`, 20, 40);

    // Render remaining birds
    ctx.fillStyle = '#999';
    ctx.font = '14px Arial';
    ctx.fillText(`Birds: ${Math.max(0, this.config.birds.length - this.currentBirdIndex)}`, 20, 70);

    // Render trajectory preview if dragging
    if (this.slingshot.isDragging_()) {
      const currentBird = this.slingshot.getCurrentBird();
      if (currentBird) {
        const pull = this.slingshot.getPull();
        const vx = pull.x * this.config.slingshot.power;
        const vy = pull.y * this.config.slingshot.power;

        const trajectoryPoints = Trajectory.predictTrajectory(
          currentBird.getPosition().x,
          currentBird.getPosition().y,
          vx,
          vy,
          this.config.world.gravity,
          0.008,
          this.config.trajectoryHints || 8
        );

        ctx.fillStyle = 'rgba(255, 255, 100, 0.5)';
        trajectoryPoints.forEach((point) => {
          ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
        });
      }
    }

    // Render slingshot
    const sc = this.config.slingshot;
    const pull = this.slingshot.getPull();

    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 3;

    // Left band
    ctx.beginPath();
    ctx.moveTo(sc.x - 15, sc.y - 20);
    ctx.lineTo(sc.x + pull.x - 5, sc.y + pull.y);
    ctx.stroke();

    // Right band
    ctx.beginPath();
    ctx.moveTo(sc.x + 15, sc.y - 20);
    ctx.lineTo(sc.x + pull.x + 5, sc.y + pull.y);
    ctx.stroke();

    // Base
    ctx.fillStyle = '#654321';
    ctx.fillRect(sc.x - 20, sc.y + 15, 40, 30);
  }

  isCleared(): boolean {
    return this.isLevelCleared;
  }

  isFailed(): boolean {
    return this.isLevelFailed;
  }

  getProgress(): LevelProgress {
    return {
      stars: this.score.getStars(),
      score: this.score.getScore(),
      cleared: this.isLevelCleared,
    };
  }

  getBodies(): Matter.Body[] {
    return this.physicsWorld.getAllBodies().map((pb) => pb.body);
  }

  getEntities(): {
    blocks: Block[];
    pigs: Pig[];
    birds: Bird[];
    grounds: Ground[];
  } {
    return {
      blocks: Array.from(this.blocks.values()),
      pigs: Array.from(this.pigs.values()),
      birds: this.birds,
      grounds: Array.from(this.grounds.values()),
    };
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  dispose() {
    this.physicsWorld.clear();
  }
}
