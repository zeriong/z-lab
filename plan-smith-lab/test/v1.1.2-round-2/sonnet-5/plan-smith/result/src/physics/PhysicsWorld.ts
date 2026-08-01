import Matter from 'matter-js';
import type { StageData, BlockData, PigData, MaterialType } from '../types';
import {
  MATERIAL_HP,
  DAMAGE_VELOCITY_THRESHOLD,
  GRAVITY_Y,
  GROUND_SURFACE_Y,
  GROUND_THICKNESS,
  WORLD_WIDTH,
  MAX_BODIES_PER_STAGE,
} from '../constants';

export type BodyKind = 'ground' | 'block' | 'pig' | 'bird';

export interface BodyMeta {
  kind: BodyKind;
  material?: MaterialType;
  hp?: number;
  maxHp?: number;
}

export type MetaBody = Matter.Body & { meta?: BodyMeta };

export interface PhysicsEvents {
  onImpact?: () => void;
  onBlockDamaged?: (body: MetaBody) => void;
  onBlockDestroyed?: (body: MetaBody) => void;
  onPigRemoved?: (body: MetaBody) => void;
}

/**
 * Owns the Matter.js Engine/World for the currently loaded stage. §물리 엔진
 * 결정 picked Matter.js over a hand-rolled solver specifically so structural
 * destruction ("구조물 파괴", 요구 5) reuses Matter's built-in rigid body +
 * constraint + narrow-phase collision instead of being built from scratch.
 */
export class PhysicsWorld {
  engine: Matter.Engine;
  world: Matter.World;
  private groundBody: MetaBody;
  private blockBodies: MetaBody[] = [];
  private pigBodies: MetaBody[] = [];
  private events: PhysicsEvents;

  constructor(events: PhysicsEvents = {}) {
    // enableSleeping is the concrete implementation of the plan's risk
    // mitigation "Matter.js sleeping 바디 API 사용" for stages with many bodies.
    this.engine = Matter.Engine.create({ enableSleeping: true });
    this.world = this.engine.world;
    this.world.gravity.y = GRAVITY_Y;
    this.events = events;

    const ground = Matter.Bodies.rectangle(
      WORLD_WIDTH / 2,
      GROUND_SURFACE_Y + GROUND_THICKNESS / 2,
      WORLD_WIDTH,
      GROUND_THICKNESS,
      { isStatic: true, friction: 1 },
    ) as MetaBody;
    ground.meta = { kind: 'ground' };
    this.groundBody = ground;
    Matter.World.add(this.world, ground);

    Matter.Events.on(this.engine, 'collisionStart', (event) => this.handleCollision(event));
  }

  loadStage(stage: StageData) {
    this.clearStage();
    const totalBodies = stage.blocks.length + stage.pigs.length + 1; // +1 for the bird about to be launched
    if (totalBodies > MAX_BODIES_PER_STAGE) {
      console.warn(
        `stage ${stage.id}: ${totalBodies} bodies exceeds MAX_BODIES_PER_STAGE (${MAX_BODIES_PER_STAGE})`,
      );
    }
    for (const b of stage.blocks) this.addBlock(b);
    for (const p of stage.pigs) this.addPig(p);
  }

  clearStage() {
    for (const b of this.blockBodies) Matter.World.remove(this.world, b);
    for (const p of this.pigBodies) Matter.World.remove(this.world, p);
    this.blockBodies = [];
    this.pigBodies = [];
  }

  private addBlock(data: BlockData) {
    const density = data.material === 'stone' ? 0.004 : data.material === 'wood' ? 0.002 : 0.0015;
    const body = Matter.Bodies.rectangle(data.x, data.y, data.w, data.h, {
      friction: 0.6,
      frictionAir: 0.001,
      density,
    }) as MetaBody;
    const hp = MATERIAL_HP[data.material];
    body.meta = { kind: 'block', material: data.material, hp, maxHp: hp };
    this.blockBodies.push(body);
    Matter.World.add(this.world, body);
  }

  private addPig(data: PigData) {
    const body = Matter.Bodies.circle(data.x, data.y, 18, {
      friction: 0.5,
      density: 0.002,
    }) as MetaBody;
    body.meta = { kind: 'pig' };
    this.pigBodies.push(body);
    Matter.World.add(this.world, body);
  }

  spawnBird(x: number, y: number, vx: number, vy: number): MetaBody {
    const bird = Matter.Bodies.circle(x, y, 16, {
      friction: 0.6,
      restitution: 0.3,
      density: 0.003,
    }) as MetaBody;
    bird.meta = { kind: 'bird' };
    Matter.World.add(this.world, bird);
    Matter.Body.setVelocity(bird, { x: vx, y: vy });
    return bird;
  }

  removeBody(body: MetaBody) {
    Matter.World.remove(this.world, body);
  }

  getRemainingPigCount(): number {
    return this.pigBodies.length;
  }

  /** Caller (Game loop) must only invoke this while state === PLAYING. That
   *  external discipline — not an internal flag — is what makes PAUSED
   *  actually stop the physics clock (plan §상태 머신: "Engine.update 호출
   *  자체를 중단, 시각적 정지만이 아님"). */
  step(deltaMs: number) {
    Matter.Engine.update(this.engine, deltaMs);
  }

  private handleCollision(event: Matter.IEventCollision<Matter.Engine>) {
    for (const pair of event.pairs) {
      this.resolvePair(pair.bodyA as MetaBody, pair.bodyB as MetaBody);
    }
  }

  private resolvePair(a: MetaBody, b: MetaBody) {
    const rel = Matter.Vector.magnitude(Matter.Vector.sub(a.velocity, b.velocity));
    if (rel < DAMAGE_VELOCITY_THRESHOLD) return;
    this.events.onImpact?.();
    this.applyImpact(a);
    this.applyImpact(b);
  }

  private applyImpact(body: MetaBody) {
    if (!body.meta) return;
    if (body.meta.kind === 'block') {
      body.meta.hp = (body.meta.hp ?? 1) - 1;
      this.events.onBlockDamaged?.(body);
      if (body.meta.hp <= 0) {
        this.blockBodies = this.blockBodies.filter((x) => x !== body);
        Matter.World.remove(this.world, body);
        this.events.onBlockDestroyed?.(body);
      }
    } else if (body.meta.kind === 'pig') {
      this.pigBodies = this.pigBodies.filter((x) => x !== body);
      Matter.World.remove(this.world, body);
      this.events.onPigRemoved?.(body);
    }
  }

  getAllRenderBodies(): MetaBody[] {
    return this.world.bodies as MetaBody[];
  }
}
