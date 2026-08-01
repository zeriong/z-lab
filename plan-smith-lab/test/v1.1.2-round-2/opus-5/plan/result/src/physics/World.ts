import Matter from 'matter-js';
import { CATEGORY, MASK_DEFAULT } from './collisionCategories';
import { estimateImpact } from './impactResolver';

/**
 * 물리 월드 래퍼 (플랜 §1).
 * Matter.js는 이 파일 안에만 존재한다 — 게임 코드는 BodyRef만 본다.
 * (R1 완화 실패 시 Planck.js로 교체할 때 이 파일만 바꾸면 되게 하는 것이 목적)
 */
export const STEP_MS = 1000 / 60;

export interface BodyRef {
  readonly id: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface BodyOptions {
  isStatic?: boolean;
  density?: number;
  friction?: number;
  frictionStatic?: number;
  frictionAir?: number;
  restitution?: number;
  angle?: number;
  category?: number;
  mask?: number;
  label?: string;
}

export interface ImpactEvent {
  a: BodyRef | null;
  b: BodyRef | null;
  impulse: number;
  /** 충돌 지점(파티클 스폰 위치) */
  point: Vec2;
}

export class World {
  /** 한 스텝당 중력 가속도(px/step²). 궤적 예측이 이 값을 참조한다 (플랜 §5) */
  readonly gravityPerStep: number;
  /** 누적 물리 스텝 수 (완료 기준 4) */
  physicsSteps = 0;

  private engine: Matter.Engine;
  private bodies = new Map<number, Matter.Body>();
  private refs = new Map<number, BodyRef>();
  private impactHandlers: ((e: ImpactEvent) => void)[] = [];
  private destroyed = false;

  constructor(gravityY = 1) {
    this.engine = Matter.Engine.create({ enableSleeping: true });
    this.engine.gravity.x = 0;
    this.engine.gravity.y = gravityY;
    this.engine.gravity.scale = 0.001;
    // R1 완화: 반복수를 올려 쌓인 스택의 jitter를 줄인다.
    this.engine.positionIterations = 10;
    this.engine.velocityIterations = 8;
    this.engine.constraintIterations = 4;

    this.gravityPerStep = gravityY * 0.001 * STEP_MS * STEP_MS;

    Matter.Events.on(this.engine, 'collisionStart', this.onCollisionStart);
  }

  // ---------- 바디 생성 ----------

  addBox(x: number, y: number, w: number, h: number, opts: BodyOptions = {}): BodyRef {
    const body = Matter.Bodies.rectangle(x, y, w, h, this.toMatterOptions(opts));
    return this.register(body);
  }

  addCircle(x: number, y: number, r: number, opts: BodyOptions = {}): BodyRef {
    const body = Matter.Bodies.circle(x, y, r, this.toMatterOptions(opts), 12);
    return this.register(body);
  }

  addGround(y: number, minX: number, maxX: number): BodyRef {
    const w = maxX - minX;
    return this.addBox(minX + w / 2, y + 100, w, 200, {
      isStatic: true,
      friction: 0.9,
      frictionStatic: 1,
      restitution: 0,
      category: CATEGORY.GROUND,
      label: 'ground',
    });
  }

  private toMatterOptions(o: BodyOptions): Matter.IBodyDefinition {
    return {
      isStatic: o.isStatic ?? false,
      density: o.density ?? 0.001,
      friction: o.friction ?? 0.5,
      frictionStatic: o.frictionStatic ?? 0.6,
      frictionAir: o.frictionAir ?? 0.005,
      restitution: o.restitution ?? 0.1,
      angle: o.angle ?? 0,
      label: o.label ?? 'body',
      // R1 완화: slop을 기본(0.05)보다 줄여 겹침에서 오는 미세 떨림을 억제
      slop: 0.02,
      sleepThreshold: 40,
      collisionFilter: {
        category: o.category ?? CATEGORY.BLOCK,
        mask: o.mask ?? MASK_DEFAULT,
        group: 0,
      },
    };
  }

  private register(body: Matter.Body): BodyRef {
    Matter.Composite.add(this.engine.world, body);
    this.bodies.set(body.id, body);
    const ref: BodyRef = { id: body.id };
    this.refs.set(body.id, ref);
    return ref;
  }

  // ---------- 조회 / 조작 ----------

  has(ref: BodyRef): boolean {
    return this.bodies.has(ref.id);
  }

  position(ref: BodyRef): Vec2 {
    const b = this.bodies.get(ref.id);
    return b ? { x: b.position.x, y: b.position.y } : { x: 0, y: 0 };
  }

  velocity(ref: BodyRef): Vec2 {
    const b = this.bodies.get(ref.id);
    return b ? { x: b.velocity.x, y: b.velocity.y } : { x: 0, y: 0 };
  }

  angle(ref: BodyRef): number {
    return this.bodies.get(ref.id)?.angle ?? 0;
  }

  speed(ref: BodyRef): number {
    return this.bodies.get(ref.id)?.speed ?? 0;
  }

  mass(ref: BodyRef): number {
    return this.bodies.get(ref.id)?.mass ?? 0;
  }

  setVelocity(ref: BodyRef, vx: number, vy: number): void {
    const b = this.bodies.get(ref.id);
    if (!b) return;
    Matter.Sleeping.set(b, false);
    Matter.Body.setVelocity(b, { x: vx, y: vy });
  }

  setAngularVelocity(ref: BodyRef, w: number): void {
    const b = this.bodies.get(ref.id);
    if (!b) return;
    Matter.Body.setAngularVelocity(b, w);
  }

  setPosition(ref: BodyRef, x: number, y: number): void {
    const b = this.bodies.get(ref.id);
    if (!b) return;
    Matter.Body.setPosition(b, { x, y });
  }

  setStatic(ref: BodyRef, flag: boolean): void {
    const b = this.bodies.get(ref.id);
    if (!b) return;
    Matter.Body.setStatic(b, flag);
  }

  isStatic(ref: BodyRef): boolean {
    return this.bodies.get(ref.id)?.isStatic ?? false;
  }

  wake(ref: BodyRef): void {
    const b = this.bodies.get(ref.id);
    if (b) Matter.Sleeping.set(b, false);
  }

  remove(ref: BodyRef): void {
    const b = this.bodies.get(ref.id);
    if (!b) return;
    Matter.Composite.remove(this.engine.world, b, true);
    this.bodies.delete(ref.id);
    this.refs.delete(ref.id);
  }

  /** 동적 바디 순회 (settle 판정용) */
  forEachDynamic(cb: (ref: BodyRef, speed: number, angularSpeed: number) => void): void {
    for (const [id, b] of this.bodies) {
      if (b.isStatic) continue;
      const ref = this.refs.get(id);
      if (!ref) continue;
      cb(ref, b.speed, b.angularSpeed);
    }
  }

  /** 좌표에 걸리는 바디 하나 (에디터용) */
  queryPoint(x: number, y: number): BodyRef | null {
    const all = Matter.Composite.allBodies(this.engine.world);
    const hits = Matter.Query.point(all, { x, y });
    for (const b of hits) {
      const ref = this.refs.get(b.id);
      if (ref) return ref;
    }
    return null;
  }

  get bodyCount(): number {
    return this.bodies.size;
  }

  onImpact(cb: (e: ImpactEvent) => void): void {
    this.impactHandlers.push(cb);
  }

  // ---------- 스텝 / 파괴 ----------

  step(ms: number = STEP_MS): void {
    if (this.destroyed) return;
    Matter.Engine.update(this.engine, ms);
    this.physicsSteps++;
  }

  /**
   * 월드 파괴. 전환 시 clear()가 아니라 World 인스턴스 재생성을 쓰지만
   * (플랜 §4) 리스너/컴포짓은 명시적으로 끊어 준다 — 완료 기준 5.
   */
  destroy(): void {
    if (this.destroyed) return;
    Matter.Events.off(this.engine, 'collisionStart', this.onCollisionStart);
    Matter.Composite.clear(this.engine.world, false, true);
    Matter.Engine.clear(this.engine);
    this.bodies.clear();
    this.refs.clear();
    this.impactHandlers.length = 0;
    this.destroyed = true;
  }

  private onCollisionStart = (ev: Matter.IEventCollision<Matter.Engine>): void => {
    if (this.impactHandlers.length === 0) return;
    for (const pair of ev.pairs) {
      const impulse = estimateImpact(pair);
      if (impulse <= 0) continue;
      const contact = pair.activeContacts?.[0]?.vertex;
      const point: Vec2 = contact
        ? { x: contact.x, y: contact.y }
        : {
            x: (pair.bodyA.position.x + pair.bodyB.position.x) / 2,
            y: (pair.bodyA.position.y + pair.bodyB.position.y) / 2,
          };
      const e: ImpactEvent = {
        a: this.refs.get(pair.bodyA.id) ?? null,
        b: this.refs.get(pair.bodyB.id) ?? null,
        impulse,
        point,
      };
      for (const h of this.impactHandlers) h(e);
    }
  };
}
