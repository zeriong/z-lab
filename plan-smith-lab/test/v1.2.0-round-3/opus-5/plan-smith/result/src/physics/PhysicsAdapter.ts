/**
 * PhysicsAdapter — 물리 라이브러리를 감싸는 유일한 파일.
 *
 * 규약(이 파일 밖에서 깨지면 안 되는 것):
 *  - 물리 라이브러리 import 는 이 파일에만 존재한다.
 *  - 라이브러리가 제공하는 자체 루프/러너는 쓰지 않는다. 스텝은 외부의
 *    고정 타임스텝 루프가 step(dt) 로 직접 호출한다.
 *  - 라이브러리 타입은 이 파일 밖으로 새지 않는다. 외부는 PhysicsBody 만 본다.
 *  - 디버그 렌더러는 개발 빌드에서 동적 import 로만 붙는다(프로덕션 번들 제외).
 */

import * as Phys from 'matter-js';
import { ENGINE_TO_PX_PER_SEC, PX_PER_SEC_TO_ENGINE } from './units';

export type BodyKind = 'ground' | 'block' | 'pig' | 'bird';
export type Material = 'wood' | 'ice' | 'stone' | 'barrel';

export interface PhysicsBody {
  id: number;
  kind: BodyKind;
  shape: 'rect' | 'circle';
  x: number;
  y: number;
  angle: number;
  w: number;
  h: number;
  r: number;
  material: Material | null;
  hp: number;
  maxHp: number;
  mass: number;
  alive: boolean;
  isStatic: boolean;
}

export interface CollisionEvent {
  a: PhysicsBody;
  b: PhysicsBody;
  /** 충돌 상대 속도(px/s). 데미지 계산의 입력. */
  relativeSpeed: number;
  x: number;
  y: number;
}

export interface RectOptions {
  material?: Material;
  hp?: number;
  isStatic?: boolean;
  restitution?: number;
  friction?: number;
  density?: number;
  angle?: number;
}

export interface CircleOptions extends RectOptions {
  restitution?: number;
}

const MATERIAL_PHYSICS: Record<Material, { density: number; restitution: number; friction: number }> =
  {
    wood: { density: 0.0012, restitution: 0.12, friction: 0.6 },
    ice: { density: 0.0008, restitution: 0.32, friction: 0.15 },
    stone: { density: 0.0032, restitution: 0.06, friction: 0.8 },
    barrel: { density: 0.0015, restitution: 0.2, friction: 0.5 },
  };

export class PhysicsAdapter {
  private engine: Phys.Engine | null = null;
  private handles = new Map<number, Phys.Body>();
  private byEngineId = new Map<number, PhysicsBody>();
  private list: PhysicsBody[] = [];
  private nextId = 1;
  private steps = 0;
  private collisionHandlers: ((ev: CollisionEvent) => void)[] = [];
  private collisionBound = false;

  /** 월드 생성. gravityY 1.0 = 기본 중력. */
  create(gravityY: number): void {
    this.destroy();
    const engine = Phys.Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = gravityY;
    engine.enableSleeping = false;
    this.engine = engine;
    this.steps = 0;
    this.collisionBound = false;
  }

  get created(): boolean {
    return this.engine !== null;
  }

  addRect(
    kind: BodyKind,
    x: number,
    y: number,
    w: number,
    h: number,
    opts: RectOptions = {},
  ): PhysicsBody {
    const engine = this.requireEngine();
    const mat = opts.material ?? null;
    const phys = mat ? MATERIAL_PHYSICS[mat] : null;
    const body = Phys.Bodies.rectangle(x, y, w, h, {
      isStatic: opts.isStatic ?? false,
      angle: opts.angle ?? 0,
      density: opts.density ?? phys?.density ?? 0.001,
      restitution: opts.restitution ?? phys?.restitution ?? 0.1,
      friction: opts.friction ?? phys?.friction ?? 0.5,
      frictionAir: 0.008,
      slop: 0.02,
    });
    const ref: PhysicsBody = {
      id: this.nextId++,
      kind,
      shape: 'rect',
      x,
      y,
      angle: opts.angle ?? 0,
      w,
      h,
      r: 0,
      material: mat,
      hp: opts.hp ?? 0,
      maxHp: opts.hp ?? 0,
      mass: body.mass,
      alive: true,
      isStatic: opts.isStatic ?? false,
    };
    this.register(engine, body, ref);
    return ref;
  }

  addCircle(
    kind: BodyKind,
    x: number,
    y: number,
    r: number,
    opts: CircleOptions = {},
  ): PhysicsBody {
    const engine = this.requireEngine();
    const body = Phys.Bodies.circle(x, y, r, {
      isStatic: opts.isStatic ?? false,
      density: opts.density ?? 0.0022,
      restitution: opts.restitution ?? 0.35,
      friction: opts.friction ?? 0.5,
      frictionAir: 0.006,
      slop: 0.02,
    });
    const ref: PhysicsBody = {
      id: this.nextId++,
      kind,
      shape: 'circle',
      x,
      y,
      angle: 0,
      w: r * 2,
      h: r * 2,
      r,
      material: opts.material ?? null,
      hp: opts.hp ?? 0,
      maxHp: opts.hp ?? 0,
      mass: body.mass,
      alive: true,
      isStatic: opts.isStatic ?? false,
    };
    this.register(engine, body, ref);
    return ref;
  }

  private register(engine: Phys.Engine, body: Phys.Body, ref: PhysicsBody): void {
    this.handles.set(ref.id, body);
    this.byEngineId.set(body.id, ref);
    this.list.push(ref);
    Phys.Composite.add(engine.world, body);
  }

  private requireEngine(): Phys.Engine {
    if (!this.engine) throw new Error('PhysicsAdapter: create() 이전에 바디를 추가할 수 없습니다.');
    return this.engine;
  }

  /** 정적 바디를 동적으로 전환(슬링샷의 새가 발사되는 순간). */
  setDynamic(ref: PhysicsBody): void {
    const body = this.handles.get(ref.id);
    if (!body) return;
    Phys.Body.setStatic(body, false);
    ref.isStatic = false;
    ref.mass = body.mass;
  }

  setPosition(ref: PhysicsBody, x: number, y: number): void {
    const body = this.handles.get(ref.id);
    if (!body) return;
    Phys.Body.setPosition(body, { x, y });
    ref.x = x;
    ref.y = y;
  }

  /** 속도를 초당 픽셀로 지정한다(단위 변환은 여기서만). */
  setVelocityPxPerSec(ref: PhysicsBody, vx: number, vy: number): void {
    const body = this.handles.get(ref.id);
    if (!body) return;
    Phys.Body.setVelocity(body, {
      x: vx * PX_PER_SEC_TO_ENGINE,
      y: vy * PX_PER_SEC_TO_ENGINE,
    });
  }

  speedPxPerSec(ref: PhysicsBody): number {
    const body = this.handles.get(ref.id);
    if (!body) return 0;
    return Math.hypot(body.velocity.x, body.velocity.y) * ENGINE_TO_PX_PER_SEC;
  }

  /** 살아 있는 동적 바디 중 최고 속도(px/s). 정지 판정의 입력. */
  maxDynamicSpeedPxPerSec(): number {
    let max = 0;
    for (const ref of this.list) {
      if (!ref.alive || ref.isStatic) continue;
      const s = this.speedPxPerSec(ref);
      if (s > max) max = s;
    }
    return max;
  }

  /** 폭발 배럴 — 반경 내 동적 바디에 거리 반비례 임펄스(px/s 단위). */
  applyRadialImpulse(cx: number, cy: number, radius: number, strengthPxPerSec: number): void {
    for (const ref of this.list) {
      if (!ref.alive || ref.isStatic) continue;
      const dx = ref.x - cx;
      const dy = ref.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius || dist < 0.0001) continue;
      const falloff = 1 - dist / radius;
      const body = this.handles.get(ref.id);
      if (!body) continue;
      const add = strengthPxPerSec * falloff * PX_PER_SEC_TO_ENGINE;
      Phys.Body.setVelocity(body, {
        x: body.velocity.x + (dx / dist) * add,
        y: body.velocity.y + (dy / dist) * add - add * 0.25,
      });
    }
  }

  remove(ref: PhysicsBody): void {
    const body = this.handles.get(ref.id);
    ref.alive = false;
    if (body && this.engine) {
      Phys.Composite.remove(this.engine.world, body);
      this.byEngineId.delete(body.id);
    }
    this.handles.delete(ref.id);
    const idx = this.list.indexOf(ref);
    if (idx >= 0) this.list.splice(idx, 1);
  }

  onCollision(fn: (ev: CollisionEvent) => void): void {
    this.collisionHandlers.push(fn);
    if (this.engine && !this.collisionBound) {
      this.collisionBound = true;
      Phys.Events.on(this.engine, 'collisionStart', (evt: Phys.IEventCollision<Phys.Engine>) => {
        for (const pair of evt.pairs) {
          const a = this.byEngineId.get(pair.bodyA.id);
          const b = this.byEngineId.get(pair.bodyB.id);
          if (!a || !b) continue;
          const rvx = pair.bodyA.velocity.x - pair.bodyB.velocity.x;
          const rvy = pair.bodyA.velocity.y - pair.bodyB.velocity.y;
          const relativeSpeed = Math.hypot(rvx, rvy) * ENGINE_TO_PX_PER_SEC;
          const ev: CollisionEvent = {
            a,
            b,
            relativeSpeed,
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
          };
          for (const h of this.collisionHandlers) h(ev);
        }
      });
    }
  }

  /** 외부 고정 스텝 루프가 호출한다. dt 는 초 단위. */
  step(dtSec: number): void {
    if (!this.engine) return;
    Phys.Engine.update(this.engine, dtSec * 1000);
    this.steps++;
    this.sync();
  }

  private sync(): void {
    for (const ref of this.list) {
      const body = this.handles.get(ref.id);
      if (!body) continue;
      ref.x = body.position.x;
      ref.y = body.position.y;
      ref.angle = body.angle;
    }
  }

  bodies(): readonly PhysicsBody[] {
    return this.list;
  }

  bodyCount(): number {
    return this.list.length;
  }

  stepCount(): number {
    return this.steps;
  }

  destroy(): void {
    if (this.engine) {
      Phys.Events.off(this.engine, 'collisionStart');
      Phys.Composite.clear(this.engine.world, false, true);
      Phys.Engine.clear(this.engine);
    }
    this.engine = null;
    this.handles.clear();
    this.byEngineId.clear();
    this.list = [];
    this.steps = 0;
    this.collisionHandlers = [];
    this.collisionBound = false;
  }

  /**
   * 개발 빌드 전용 디버그 오버레이. 프로덕션 번들에는 들어가지 않도록
   * 동적 import 를 개발 가드 안에 둔다.
   */
  async attachDebugOverlay(element: HTMLElement): Promise<void> {
    if (!import.meta.env.DEV) return;
    if (!this.engine) return;
    const mod = await import('matter-js');
    const renderer = mod.Render.create({
      element,
      engine: this.engine,
      options: { width: 960, height: 540, wireframes: true },
    });
    mod.Render.run(renderer);
  }
}
