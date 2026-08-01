/**
 * 물리 래핑 (§3, §7-A).
 * 하드 제약:
 *  1. 고정 타임스텝 — Engine.update(engine, FIXED_DT) 만 호출한다. rAF delta는 넘기지 않는다.
 *  2. 정적 바디의 질량을 절대 만지지 않는다. body.mass 에 쓰기 없음, 1/mass 항 없음.
 *  3. 파편 난수는 시드 고정(rng.ts).
 *  4. 파괴는 조인트 파단이 아니라 "바디 제거 + 파편 스폰" — 재료 HP 모델은 우리가 소유한다.
 */

import Matter from 'matter-js';
import type { BlockDef, BirdKind, BodyKind, Material, PigDef, TerrainDef } from './types';
import { mulberry32 } from './rng';
import {
  ATTACK_FACTOR,
  BIRD_DENSITY,
  BIRD_RADIUS,
  BIRD_RESTITUTION,
  DEBRIS_RADIUS,
  FIXED_DT,
  GRAVITY_Y,
  GROUND_Y,
  LOGICAL_W,
  MATERIALS,
  PIG_DENSITY,
  PIG_HP,
  PIG_RADIUS,
  PIG_THRESHOLD,
} from './tuning';

const { Bodies, Body, Composite, Engine, Events } = Matter;

export interface Meta {
  kind: BodyKind;
  material?: Material;
  hp: number;
  maxHp: number;
  threshold: number;
  /** 이 바디가 남에게 주는 데미지 계수 */
  attack: number;
  birdKind?: BirdKind;
  dashUsed?: boolean;
  /** 파편 수명(스텝) — 0 이하가 되면 제거 */
  life?: number;
  dead?: boolean;
}

interface MetaHost {
  __meta?: Meta;
}

export function setMeta(body: Matter.Body, meta: Meta): void {
  (body as unknown as MetaHost).__meta = meta;
}

export function metaOf(body: Matter.Body): Meta | undefined {
  return (body as unknown as MetaHost).__meta;
}

export class PhysicsWorld {
  readonly engine: Matter.Engine;
  /** 지금까지 실행한 고정 스텝 수 — 일시정지 계약 검증(§10-2)용 카운터 */
  stepCount = 0;
  private rng: () => number;

  constructor(seed: number) {
    this.engine = Engine.create({ enableSleeping: true });
    this.engine.gravity.y = GRAVITY_Y;
    this.engine.timing.timeScale = 1;
    this.rng = mulberry32(seed);
  }

  get world(): Matter.Composite {
    return this.engine.world;
  }

  random(): number {
    return this.rng();
  }

  reseed(seed: number): void {
    this.rng = mulberry32(seed);
  }

  bodies(): Matter.Body[] {
    return Composite.allBodies(this.world);
  }

  bodyCount(): number {
    return this.bodies().length;
  }

  dynamicBodies(): Matter.Body[] {
    return this.bodies().filter((b) => !b.isStatic);
  }

  byKind(kind: BodyKind): Matter.Body[] {
    return this.bodies().filter((b) => metaOf(b)?.kind === kind);
  }

  add(body: Matter.Body): void {
    Composite.add(this.world, body);
  }

  remove(body: Matter.Body): void {
    Composite.remove(this.world, body, true);
  }

  onCollisionStart(handler: (pairs: Matter.Pair[]) => void): void {
    Events.on(this.engine, 'collisionStart', (e) => {
      handler((e as unknown as { pairs: Matter.Pair[] }).pairs);
    });
  }

  /** 제약 1: 항상 고정 dt */
  step(): void {
    Engine.update(this.engine, FIXED_DT);
    this.stepCount += 1;
  }

  /** 언로드 — 바디·컴포짓 전부 제거(누수 0 목표, §1-A R1) */
  clear(): void {
    Composite.clear(this.world, false, true);
    this.stepCount = 0;
  }

  /** 이벤트 리스너까지 해제 */
  dispose(): void {
    Events.off(this.engine, 'collisionStart', undefined as unknown as () => void);
    this.clear();
    Engine.clear(this.engine);
  }

  // ---------- 바디 팩토리 ----------

  addGround(): Matter.Body {
    const ground = Bodies.rectangle(LOGICAL_W / 2, GROUND_Y + 60, LOGICAL_W + 400, 120, {
      isStatic: true,
      friction: 0.9,
      frictionStatic: 1,
      restitution: 0,
      label: 'ground',
    });
    setMeta(ground, {
      kind: 'ground',
      hp: Infinity,
      maxHp: Infinity,
      threshold: Infinity,
      attack: ATTACK_FACTOR.ground,
    });
    this.add(ground);
    return ground;
  }

  addTerrain(def: TerrainDef): Matter.Body {
    const body = Bodies.rectangle(def.x, def.y, def.w, def.h, {
      isStatic: true,
      angle: def.angle ?? 0,
      friction: 0.8,
      frictionStatic: 1,
      restitution: 0.02,
      label: 'terrain',
    });
    setMeta(body, {
      kind: 'terrain',
      hp: Infinity,
      maxHp: Infinity,
      threshold: Infinity,
      attack: ATTACK_FACTOR.terrain,
    });
    this.add(body);
    return body;
  }

  addBlock(def: BlockDef): Matter.Body {
    const spec = MATERIALS[def.material];
    const body = Bodies.rectangle(def.x, def.y, def.w, def.h, {
      angle: def.angle ?? 0,
      density: spec.density,
      friction: spec.friction,
      frictionStatic: spec.friction + 0.2,
      restitution: spec.restitution,
      sleepThreshold: 30,
      label: `block:${def.material}`,
    });
    setMeta(body, {
      kind: 'block',
      material: def.material,
      hp: spec.hp,
      maxHp: spec.hp,
      threshold: spec.threshold,
      attack: ATTACK_FACTOR.block,
    });
    this.add(body);
    return body;
  }

  addPig(def: PigDef): Matter.Body {
    const body = Bodies.circle(def.x, def.y, PIG_RADIUS, {
      density: PIG_DENSITY,
      friction: 0.6,
      restitution: 0.18,
      sleepThreshold: 30,
      label: 'pig',
    });
    setMeta(body, {
      kind: 'pig',
      hp: PIG_HP,
      maxHp: PIG_HP,
      threshold: PIG_THRESHOLD,
      attack: ATTACK_FACTOR.pig,
    });
    this.add(body);
    return body;
  }

  /**
   * 조준 중 새: isStatic 으로 두어 중력을 받지 않게 하고, 발사 시 Body.setStatic(false).
   * (질량은 Matter가 원래 값으로 복원한다 — 우리가 body.mass 에 직접 쓰는 곳은 없다: 제약 2)
   */
  addBird(kind: BirdKind, x: number, y: number): Matter.Body {
    const body = Bodies.circle(x, y, kind === 'dash' ? BIRD_RADIUS - 1 : BIRD_RADIUS, {
      density: BIRD_DENSITY,
      friction: 0.4,
      frictionAir: 0, // 궤적 예측식과 동일한 적분(공기저항 없음)
      restitution: BIRD_RESTITUTION,
      isStatic: true,
      label: `bird:${kind}`,
    });
    setMeta(body, {
      kind: 'bird',
      hp: Infinity,
      maxHp: Infinity,
      threshold: Infinity,
      attack: ATTACK_FACTOR.bird,
      birdKind: kind,
      dashUsed: false,
    });
    this.add(body);
    return body;
  }

  launchBird(bird: Matter.Body, vx: number, vy: number): void {
    Body.setStatic(bird, false);
    Body.setAngularVelocity(bird, 0);
    Body.setVelocity(bird, { x: vx, y: vy });
  }

  /** 제약 4: 파괴 = 바디 제거 + 파편 스폰. 파편은 시드 고정 난수로 방향을 얻는다(제약 3). */
  spawnDebris(x: number, y: number, material: Material, count: number, life: number): Matter.Body[] {
    const out: Matter.Body[] = [];
    const spec = MATERIALS[material];
    for (let i = 0; i < count; i += 1) {
      const ang = this.rng() * Math.PI * 2;
      const speed = 1.5 + this.rng() * 3.5;
      const r = DEBRIS_RADIUS * (0.7 + this.rng() * 0.6);
      const body = Bodies.circle(x, y, r, {
        density: spec.density * 0.8,
        friction: spec.friction * 0.6,
        restitution: 0.25,
        sleepThreshold: 40,
        label: `debris:${material}`,
      });
      setMeta(body, {
        kind: 'debris',
        material,
        hp: Infinity,
        maxHp: Infinity,
        threshold: Infinity,
        attack: ATTACK_FACTOR.debris,
        life,
      });
      Body.setVelocity(body, { x: Math.cos(ang) * speed, y: Math.sin(ang) * speed - 1.2 });
      this.add(body);
      out.push(body);
    }
    return out;
  }

  /** 모든 동적 바디가 느려졌는가 (정지 감지 §8) */
  allSlow(maxSpeed: number): boolean {
    for (const b of this.dynamicBodies()) {
      if (b.isSleeping) continue;
      if (Math.hypot(b.velocity.x, b.velocity.y) > maxSpeed) return false;
    }
    return true;
  }
}
