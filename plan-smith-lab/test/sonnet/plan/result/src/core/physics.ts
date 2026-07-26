// Core 레이어: Matter.js 엔진 래핑 + 바디 생성 팩토리 + 충돌 이벤트 훅.
// 이 파일은 렌더링/UI를 전혀 모른다 (순수 시뮬레이션).
import Matter from "matter-js";
import type { BirdType, BlockData, MaterialType, PigData } from "../types";
import { MATERIALS } from "../data/materials";
import { BIRDS } from "../data/birds";

const { Engine, World, Bodies, Body, Composite, Events: MEvents } = Matter;

export const WORLD_HEIGHT = 700;

// body.plugin 에 얹는 게임 전용 메타데이터
export type BlockPlugin = {
  kind: "block";
  material: MaterialType;
  hp: number;
  maxHp: number;
};
export type PigPlugin = { kind: "pig"; alive: true };
export type BirdPlugin = {
  kind: "bird";
  birdType: BirdType;
  abilityUsed: boolean;
  launched: boolean;
};
export type GroundPlugin = { kind: "ground" };
export type BodyPlugin = BlockPlugin | PigPlugin | BirdPlugin | GroundPlugin;

/** 환산질량. 한쪽이 정적(Infinity)이면 반대쪽 질량으로 수렴, 둘 다 정적이면 0. */
function reducedMass(mA: number, mB: number): number {
  const finiteA = Number.isFinite(mA);
  const finiteB = Number.isFinite(mB);
  if (!finiteA && !finiteB) return 0;
  if (!finiteA) return mB;
  if (!finiteB) return mA;
  return (mA * mB) / (mA + mB);
}

export interface CollisionHit {
  bodyA: Matter.Body;
  bodyB: Matter.Body;
  impact: number; // 상대속도 기반 충격량 근사치
}

export class PhysicsWorld {
  engine: Matter.Engine;
  world: Matter.World;
  worldWidth: number;
  groundY: number;

  private collisionHandler: ((hit: CollisionHit) => void) | null = null;

  constructor(worldWidth: number, groundY: number) {
    this.worldWidth = worldWidth;
    this.groundY = groundY;
    this.engine = Engine.create();
    this.engine.gravity.y = 1.0;
    this.engine.positionIterations = 8;
    this.engine.velocityIterations = 8;
    this.world = this.engine.world;
    this.createBoundaries();
    this.wireCollisions();
  }

  private createBoundaries(): void {
    const ground = Bodies.rectangle(
      this.worldWidth / 2,
      this.groundY + 100,
      this.worldWidth + 400,
      200,
      { isStatic: true, friction: 1, label: "ground" }
    );
    ground.plugin = { kind: "ground" } as GroundPlugin;
    Composite.add(this.world, ground);
  }

  private wireCollisions(): void {
    MEvents.on(this.engine, "collisionStart", (evt) => {
      if (!this.collisionHandler) return;
      for (const pair of evt.pairs) {
        const rv = Matter.Vector.magnitude(
          Matter.Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity)
        );
        // 정적 바디(지면, 대기 중인 새)는 mass=Infinity 이므로 단순 합산(mA+mB)은 Infinity가 되어
        // 바닥에 닿기만 해도 즉시 파괴되는 버그가 생긴다. 환산질량(reduced mass)을 사용해
        // 정적 바디와 충돌 시 동적 바디 쪽 질량으로 수렴하도록 한다.
        const impact = rv * reducedMass(pair.bodyA.mass, pair.bodyB.mass);
        this.collisionHandler({ bodyA: pair.bodyA, bodyB: pair.bodyB, impact });
      }
    });
  }

  onCollision(handler: (hit: CollisionHit) => void): void {
    this.collisionHandler = handler;
  }

  step(deltaMs: number): void {
    Engine.update(this.engine, deltaMs);
  }

  add(body: Matter.Body): void {
    Composite.add(this.world, body);
  }

  remove(body: Matter.Body): void {
    Composite.remove(this.world, body);
  }

  allBodies(): Matter.Body[] {
    return Composite.allBodies(this.world);
  }

  destroy(): void {
    MEvents.off(this.engine, "collisionStart");
    Composite.clear(this.world, false);
    Engine.clear(this.engine);
  }

  createBlock(data: BlockData): Matter.Body {
    const spec = MATERIALS[data.type];
    let body: Matter.Body;
    if (data.shape === "circle") {
      body = Bodies.circle(data.x, data.y, data.w / 2, {
        density: spec.density,
        friction: spec.friction,
        restitution: spec.restitution,
        label: "block",
      });
    } else {
      body = Bodies.rectangle(data.x, data.y, data.w, data.h ?? data.w, {
        density: spec.density,
        friction: spec.friction,
        restitution: spec.restitution,
        angle: ((data.angle ?? 0) * Math.PI) / 180,
        label: "block",
      });
    }
    body.plugin = { kind: "block", material: data.type, hp: spec.hp, maxHp: spec.hp } as BlockPlugin;
    Composite.add(this.world, body);
    return body;
  }

  createPig(data: PigData): Matter.Body {
    const body = Bodies.circle(data.x, data.y, data.r, {
      density: 0.003,
      friction: 0.6,
      restitution: 0.2,
      label: "pig",
    });
    body.plugin = { kind: "pig", alive: true } as PigPlugin;
    Composite.add(this.world, body);
    return body;
  }

  createBird(type: BirdType, x: number, y: number): Matter.Body {
    const spec = BIRDS[type];
    const body = Bodies.circle(x, y, spec.radius, {
      density: spec.density,
      friction: spec.friction,
      restitution: spec.restitution,
      label: "bird",
    });
    // 주의: isStatic 은 생성 옵션이 아니라 반드시 별도 호출로 설정해야 한다.
    // Bodies.circle(..., { isStatic: true }) 로 바로 생성하면 Matter.js가 "원래 질량"을
    // 백업(_original)하지 못해, 나중에 Body.setStatic(body,false) 로 되돌릴 때 질량이
    // Infinity 로 남아 다음 물리 스텝에서 중력력(Infinity)/질량(Infinity)=NaN 이 되어
    // 발사된 새가 즉시 궤도를 이탈하는 버그가 생긴다.
    Body.setStatic(body, true);
    body.plugin = { kind: "bird", birdType: type, abilityUsed: false, launched: false } as BirdPlugin;
    Composite.add(this.world, body);
    return body;
  }
}

export { Body, Matter };
