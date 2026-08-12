import { LevelData, getStarCount } from '../data/levelSchema';
import { Bird } from './entities/Bird';
import { Pig } from './entities/Pig';
import { Block } from './entities/Block';
import { Ground } from './entities/Ground';
import { PhysicsWorld, IPhysicsBody } from '../physics/PhysicsWorld';
import { calculateDamage, shouldBreak } from '../physics/collisionRules';
import { Input } from '../core/Input';
import { Camera } from '../core/Camera';
import { Slingshot } from './Slingshot';
import { Trajectory } from './Trajectory';
import { Score } from './Score';
import { Settle } from './Settle';
import { getMaterial } from '../physics/materials';

export type LevelResult = 'playing' | 'clear' | 'fail';

export class Level {
  private data: LevelData;
  private physics: PhysicsWorld;
  private input: Input;
  private camera: Camera;

  private birds: Bird[] = [];
  private pigs: Pig[] = [];
  private blocks: Block[] = [];
  private ground: Ground[] = [];

  private currentBirdIndex: number = 0;
  private score: Score = new Score();
  private settle: Settle = new Settle();
  private result: LevelResult = 'playing';
  private slingshot: Slingshot;
  private trajectory: Trajectory = new Trajectory();

  constructor(data: LevelData, input: Input, camera: Camera) {
    this.data = data;
    this.input = input;
    this.camera = camera;

    // Create physics world
    this.physics = new PhysicsWorld(
      data.world.width,
      data.world.height,
      data.world.gravity
    );

    // Setup slingshot
    this.slingshot = new Slingshot(data.slingshot, input, camera);

    // Initialize level entities
    this.initializeGround();
    this.initializeBlocks();
    this.initializePigs();
    this.initializeBirds();

    // Setup collision handling
    this.setupCollisions();

    // Set initial camera
    this.camera.setAiming(data.slingshot.x, data.slingshot.y);
  }

  private initializeGround(): void {
    for (let i = 0; i < this.data.ground.length; i++) {
      const g = this.data.ground[i];
      this.ground.push(new Ground(`ground_${i}`, g.x, g.y, g.w, g.h, this.physics));
    }
  }

  private initializeBlocks(): void {
    for (let i = 0; i < this.data.blocks.length; i++) {
      const b = this.data.blocks[i];
      const width = b.w || 40;
      const height = b.h || 40;
      const radius = b.r || 20;
      const angle = b.angle || 0;

      this.blocks.push(
        new Block(
          `block_${i}`,
          b.shape,
          b.type,
          b.x,
          b.y,
          width,
          height,
          radius,
          angle,
          this.physics
        )
      );
    }
  }

  private initializePigs(): void {
    for (let i = 0; i < this.data.pigs.length; i++) {
      const p = this.data.pigs[i];
      this.pigs.push(new Pig(`pig_${i}`, p.size, p.x, p.y, this.physics));
    }
  }

  private initializeBirds(): void {
    for (let i = 0; i < this.data.birds.length; i++) {
      const birdType = this.data.birds[i];
      this.birds.push(
        new Bird(
          `bird_${i}`,
          birdType,
          this.data.slingshot.x,
          this.data.slingshot.y,
          this.physics
        )
      );
    }

    if (this.birds.length > 0) {
      this.slingshot.setBird(this.birds[0]);
    }
  }

  private setupCollisions(): void {
    this.physics.onCollision((bodyA, bodyB, relV, isStarting) => {
      if (!isStarting) return;

      const typeA = bodyA.type;
      const typeB = bodyB.type;
      const massA = bodyA.body.mass;
      const massB = bodyB.body.mass;

      // Handle block damage
      const block = this.findBlockByPhysicsBody(bodyA) || this.findBlockByPhysicsBody(bodyB);
      const otherType = bodyA.id === block?.physicsBody.id ? typeB : typeA;

      if (block) {
        const { damageA, damageB } = calculateDamage(relV, typeA, typeB, massA, massB);
        const damage = bodyA.id === block.physicsBody.id ? damageA : damageB;

        if (damage > 0) {
          block.takeDamage(damage);
          if (!block.alive) {
            this.score.addBlockScore(getMaterial(block.material).score);
          }
        }
      }

      // Handle pig damage
      const pig = this.findPigByPhysicsBody(bodyA) || this.findPigByPhysicsBody(bodyB);
      if (pig) {
        const { damageA, damageB } = calculateDamage(relV, typeA, typeB, massA, massB);
        const damage = bodyA.id === pig.physicsBody.id ? damageA : damageB;

        if (damage > 0) {
          pig.takeDamage(damage);
          if (!pig.alive) {
            this.score.addPigScore(5000);
          }
        }
      }
    });
  }

  private findBlockByPhysicsBody(body: IPhysicsBody): Block | undefined {
    return this.blocks.find(b => b.physicsBody.id === body.id);
  }

  private findPigByPhysicsBody(body: IPhysicsBody): Pig | undefined {
    return this.pigs.find(p => p.physicsBody.id === body.id);
  }

  fixedUpdate(dt: number): void {
    if (this.result !== 'playing') return;

    // Physics step
    this.physics.step(dt);

    // Update entities
    this.birds.forEach(b => b.update(dt));
    this.pigs.forEach(p => p.update(dt));
    this.blocks.forEach(b => b.update(dt));

    // Remove dead entities from physics
    this.pigs = this.pigs.filter(p => {
      if (!p.alive) {
        this.physics.removeBody(p.physicsBody);
      }
      return p.alive;
    });

    this.blocks = this.blocks.filter(b => {
      if (!b.alive) {
        this.physics.removeBody(b.physicsBody);
      }
      return b.alive;
    });

    // Check if current bird is out of bounds or settled
    if (this.currentBirdIndex < this.birds.length) {
      const bird = this.birds[this.currentBirdIndex];
      if (bird.outOfBounds) {
        // Launch next bird
        this.launchNextBird();
      }
    }

    // Check settle condition
    const dynamicBodies = this.physics.getBodies().filter(b => !b.body.isStatic);
    if (this.settle.isSettled(dynamicBodies)) {
      this.checkGameResult();
    }

    // Check instant clear
    if (this.pigs.length === 0) {
      this.launchNextBird();
    }
  }

  private launchNextBird(): void {
    this.currentBirdIndex++;
    if (this.currentBirdIndex < this.birds.length) {
      this.slingshot.setBird(this.birds[this.currentBirdIndex]);
      this.settle.reset();
    } else {
      this.settle.start();
    }
  }

  private checkGameResult(): void {
    if (this.pigs.length === 0) {
      // Calculate bonus for remaining birds
      const remainingBirds = this.birds.length - this.currentBirdIndex - 1;
      this.score.addBirdScore(remainingBirds);
      this.result = 'clear';
    } else if (this.currentBirdIndex >= this.birds.length - 1) {
      this.result = 'fail';
    }
  }

  getResult(): LevelResult {
    return this.result;
  }

  getScore(): number {
    return this.score.getTotal();
  }

  getStars(): number {
    return getStarCount(this.score.getTotal(), this.data.starThresholds);
  }

  getBirdsRemaining(): number {
    return Math.max(0, this.birds.length - this.currentBirdIndex - 1);
  }

  render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    // Render ground
    this.ground.forEach(g => g.render(ctx, offsetX, offsetY));

    // Render blocks
    this.blocks.forEach(b => b.render(ctx, offsetX, offsetY));

    // Render pigs
    this.pigs.forEach(p => p.render(ctx, offsetX, offsetY));

    // Render birds
    this.birds.forEach(b => b.render(ctx, offsetX, offsetY));

    // Render slingshot
    this.slingshot.render(ctx, offsetX, offsetY);

    // Render trajectory if aiming
    if (this.currentBirdIndex < this.birds.length && this.slingshot.isDragging) {
      const impulse = this.slingshot.getLaunchImpulse();
      if (impulse) {
        const bird = this.birds[this.currentBirdIndex];
        this.trajectory.predictTrajectory(bird.x, bird.y, impulse.x, impulse.y, 8);
        this.trajectory.render(ctx, offsetX, offsetY);
      }
    }
  }

  dispose(): void {
    this.physics.dispose();
    this.slingshot.dispose();
    this.birds = [];
    this.pigs = [];
    this.blocks = [];
    this.ground = [];
  }
}
