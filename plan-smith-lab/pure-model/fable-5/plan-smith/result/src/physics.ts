// 물리 어댑터 — Matter.js API 접촉은 이 파일 한 곳뿐이다 (§6 패자 논거 승격 / §13 격리 규칙).
// 게임 규칙 코드는 여기의 인터페이스(스냅샷·id·severity)만 본다.

import Matter from 'matter-js';
import { CFG } from './config';

export interface BodySnapshot {
  x: number;
  y: number;
  angle: number;
  vx: number;
  vy: number;
  speed: number;
}

export interface BodyOptions {
  isStatic?: boolean;
  density?: number;
  friction?: number;
  restitution?: number;
  frictionAir?: number;
}

export type CollisionHandler = (aId: number, bId: number, severity: number) => void;

export class PhysicsWorld {
  private engine: Matter.Engine;
  private bodies = new Map<number, Matter.Body>();
  private handler: CollisionHandler | null = null;
  private a1Logged = false;

  /**
   * 폐형식 궤적 공식용 틱당 중력 가속(px/tick²).
   * Matter 기본 gravity y=1, scale=0.001 — Δv/tick = y·scale·dt² (§5 M8).
   */
  readonly gravityPerTick: number;

  constructor() {
    // §11 적층 불안정 완화: sleeping 활성 + positionIterations 상향
    this.engine = Matter.Engine.create({ enableSleeping: true });
    this.engine.positionIterations = 10;

    // §11 타입 정의 불일치 흡수: gravity 위치(engine vs world)는 any로 국지 처리
    const eng = this.engine as any;
    const grav = eng.gravity ?? eng.world.gravity;
    this.gravityPerTick = grav.y * grav.scale * CFG.fixedDt * CFG.fixedDt;

    // 충돌 핸들러는 부트스트랩에서 1회 등록되고 재등록되지 않는다 (§9 콜드스타트)
    Matter.Events.on(this.engine, 'collisionStart', (ev: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of ev.pairs) {
        const a = pair.bodyA;
        const b = pair.bodyB;
        // §5 데미지 모델: severity = |v_A − v_B| (두 바디 속도 벡터 차의 크기)
        const severity = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        if (!this.a1Logged) {
          this.a1Logged = true;
          // A1 하중 가정의 최저가 조기 검증 (§7): 첫 충돌 쌍의 velocity를 1회 로그
          console.log('[A1 검증] collisionStart 쌍 velocity', {
            a: { x: a.velocity.x, y: a.velocity.y },
            b: { x: b.velocity.x, y: b.velocity.y },
            severity,
          });
        }
        if (this.handler) this.handler(a.id, b.id, severity);
      }
    });
  }

  onCollision(h: CollisionHandler): void {
    this.handler = h;
  }

  /** 월드 재조립용 — 모든 바디 제거 (M2) */
  clear(): void {
    Matter.Composite.clear(this.engine.world, false);
    this.bodies.clear();
  }

  addBox(x: number, y: number, w: number, h: number, angle: number, opts: BodyOptions = {}): number {
    const body = Matter.Bodies.rectangle(x, y, w, h, {
      angle,
      isStatic: opts.isStatic ?? false,
      density: opts.density ?? 0.001,
      friction: opts.friction ?? 0.5,
      restitution: opts.restitution ?? 0,
      frictionAir: opts.frictionAir ?? 0.01,
    });
    Matter.Composite.add(this.engine.world, body);
    this.bodies.set(body.id, body);
    return body.id;
  }

  addCircle(x: number, y: number, r: number, opts: BodyOptions = {}): number {
    const body = Matter.Bodies.circle(x, y, r, {
      isStatic: opts.isStatic ?? false,
      density: opts.density ?? 0.001,
      friction: opts.friction ?? 0.5,
      restitution: opts.restitution ?? 0,
      frictionAir: opts.frictionAir ?? 0.01,
    });
    Matter.Composite.add(this.engine.world, body);
    this.bodies.set(body.id, body);
    return body.id;
  }

  remove(id: number): void {
    const body = this.bodies.get(id);
    if (!body) return;
    Matter.Composite.remove(this.engine.world, body);
    this.bodies.delete(id);
  }

  setVelocity(id: number, vx: number, vy: number): void {
    const body = this.bodies.get(id);
    if (body) Matter.Body.setVelocity(body, { x: vx, y: vy });
  }

  get(id: number): BodySnapshot | null {
    const b = this.bodies.get(id);
    if (!b) return null;
    return {
      x: b.position.x,
      y: b.position.y,
      angle: b.angle,
      vx: b.velocity.x,
      vy: b.velocity.y,
      speed: b.isSleeping ? 0 : b.speed,
    };
  }

  /** 정지 판정용 — 동적 바디 전체 순회 (M11). sleeping 바디는 speed 0으로 취급 */
  eachDynamic(cb: (id: number, snap: BodySnapshot) => void): void {
    for (const b of this.bodies.values()) {
      if (b.isStatic) continue;
      cb(b.id, {
        x: b.position.x,
        y: b.position.y,
        angle: b.angle,
        vx: b.velocity.x,
        vy: b.velocity.y,
        speed: b.isSleeping ? 0 : b.speed,
      });
    }
  }

  /** 고정 스텝 1회 (M15). PAUSED 동안 호출되지 않는다 (M18) */
  step(dtMs: number): void {
    Matter.Engine.update(this.engine, dtMs);
  }
}
