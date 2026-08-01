// 얇은 물리 어댑터 — Matter.js 호출을 이 모듈 뒤에 격리한다 (플랜 §물리 엔진 결정: 교체 가능성 보존).
// 게임 코드는 이 파일 밖에서 Matter를 import하지 않는다.

import Matter from 'matter-js';
import type { Material } from '../stages/schema';

export type BodyKind = 'bird' | 'pig' | 'block' | 'ground';

export interface BodyMeta {
  kind: BodyKind;
  material?: Material;
  hp?: number;
  maxHp?: number;
  // 렌더링용 형상 정보 (어댑터 밖에서 Matter vertices에 의존하지 않기 위함)
  w?: number;
  h?: number;
  r?: number;
}

export type PhysBody = Matter.Body & { meta: BodyMeta };

export interface BodyOptions {
  isStatic?: boolean;
  density?: number;
  friction?: number;
  frictionAir?: number;
  restitution?: number;
  angle?: number;
}

export type CollisionHandler = (a: PhysBody, b: PhysBody, impact: number) => void;

export class PhysicsWorld {
  private engine: Matter.Engine;
  /** 검증용 물리 스텝 카운터 — paused 동안 0 증가 확인 (플랜 완료 정의 2) */
  stepCount = 0;

  constructor(gravityY = 1) {
    this.engine = Matter.Engine.create({ enableSleeping: true });
    this.engine.gravity.y = gravityY;
  }

  addRectangle(x: number, y: number, w: number, h: number, meta: BodyMeta, opts: BodyOptions = {}): PhysBody {
    const body = Matter.Bodies.rectangle(x, y, w, h, opts) as PhysBody;
    body.meta = { ...meta, w, h };
    Matter.Composite.add(this.engine.world, body);
    return body;
  }

  addCircle(x: number, y: number, r: number, meta: BodyMeta, opts: BodyOptions = {}): PhysBody {
    const body = Matter.Bodies.circle(x, y, r, opts) as PhysBody;
    body.meta = { ...meta, r };
    Matter.Composite.add(this.engine.world, body);
    return body;
  }

  remove(body: PhysBody): void {
    Matter.Composite.remove(this.engine.world, body);
  }

  /** 고정 스텝 전진. paused 상태에서는 호출 자체가 일어나지 않는다 (R3-c). */
  step(dtMs: number): void {
    Matter.Engine.update(this.engine, dtMs);
    this.stepCount++;
  }

  setVelocity(body: PhysBody, vx: number, vy: number): void {
    Matter.Body.setVelocity(body, { x: vx, y: vy });
  }

  setPosition(body: PhysBody, x: number, y: number): void {
    Matter.Body.setPosition(body, { x, y });
  }

  setStatic(body: PhysBody, flag: boolean): void {
    Matter.Body.setStatic(body, flag);
  }

  onCollision(handler: CollisionHandler): void {
    Matter.Events.on(this.engine, 'collisionStart', (ev: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of ev.pairs) {
        const a = pair.bodyA as PhysBody;
        const b = pair.bodyB as PhysBody;
        // 충격량 근사: 상대 속도 크기 (px/step)
        const impact = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        handler(a, b, impact);
      }
    });
  }

  dynamicBodies(): PhysBody[] {
    return Matter.Composite.allBodies(this.engine.world).filter((b) => !b.isStatic) as PhysBody[];
  }

  allSleeping(): boolean {
    const dyn = this.dynamicBodies();
    return dyn.length === 0 || dyn.every((b) => b.isSleeping);
  }
}
