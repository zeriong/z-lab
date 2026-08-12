import Matter from 'matter-js';

export interface CollisionPair {
  bodyA: Matter.Body;
  bodyB: Matter.Body;
  collision: Matter.Collision;
}

export type CollisionHandler = (pairs: CollisionPair[]) => void;

// 리스크 완화: 밀도/질량 설정 누락으로 정적 바디가 비정상 질량으로 계산되어
// 위치값이 NaN이 되는 경우, 월드에 추가되기 전에 즉시 실패시킨다.
export function assertBodyPositionValid(body: Matter.Body): void {
  if (Number.isNaN(body.position.x) || Number.isNaN(body.position.y)) {
    throw new Error(`[physicsAdapter] body "${body.label}" position is NaN — check density/mass config`);
  }
}

/**
 * 스텝 1 — Matter.js 엔진 접근을 어댑터 모듈 뒤에 둔다(가정: Matter.js가 요구 표현력을 못 주면
 * Planck.js 등으로 교체할 폴백 대비, 게임 로직은 이 인터페이스에만 의존한다).
 */
export class PhysicsAdapter {
  readonly engine: Matter.Engine;
  readonly world: Matter.World;
  private runner: Matter.Runner | null = null;
  private collisionHandlers: CollisionHandler[] = [];

  constructor(gravityY = 1) {
    this.engine = Matter.Engine.create();
    this.engine.gravity.y = gravityY;
    this.world = this.engine.world;
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      const pairs: CollisionPair[] = event.pairs.map((pair) => ({
        bodyA: pair.bodyA,
        bodyB: pair.bodyB,
        collision: pair.collision,
      }));
      this.collisionHandlers.forEach((handler) => handler(pairs));
    });
  }

  onCollisionStart(handler: CollisionHandler): void {
    this.collisionHandlers.push(handler);
  }

  addBody(body: Matter.Body): void {
    assertBodyPositionValid(body);
    Matter.World.add(this.world, body);
  }

  addBodies(bodies: Matter.Body[]): void {
    bodies.forEach((b) => assertBodyPositionValid(b));
    Matter.World.add(this.world, bodies);
  }

  removeBody(body: Matter.Body): void {
    Matter.World.remove(this.world, body);
  }

  clearWorld(): void {
    Matter.World.clear(this.world, false);
  }

  setVelocity(body: Matter.Body, velocity: Matter.Vector): void {
    Matter.Body.setVelocity(body, velocity);
  }

  // 리스크 완화: 일시정지 중 물리 시뮬레이션이 계속 진행되면 오버레이 뒤에서 게임이 흘러간다.
  // Paused 전이의 필수 부수효과로 Runner를 정지시킨다(App.ts의 Paused onEnter에서 호출).
  start(): void {
    if (this.runner) return;
    this.runner = Matter.Runner.create();
    Matter.Runner.run(this.runner, this.engine);
  }

  stop(): void {
    if (!this.runner) return;
    Matter.Runner.stop(this.runner);
    this.runner = null;
  }

  isRunning(): boolean {
    return this.runner !== null;
  }
}
