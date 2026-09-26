/**
 * 고스트 엔진 기반 궤적 예측 (§6.2).
 * 새 1개만 담긴 별도 Engine 을 두고, 드래그 중 매 프레임 발사 조건으로 리셋한 뒤
 * 90틱 돌려 3틱마다 점을 찍는다. 실제 엔진과 같은 적분기를 쓰므로 항상 일치한다.
 */
import Matter from 'matter-js';
import {
  GRAVITY_SCALE,
  GRAVITY_Y,
  POSITION_ITERATIONS,
  STEP_MS,
  TRAJECTORY,
  VELOCITY_ITERATIONS,
} from '../core/config';
import type { Vec } from '../core/math';
import { BIRD } from '../physics/Materials';

const { Engine, Bodies, Body, Composite } = Matter;

export interface PredictOptions {
  ticks?: number;
  every?: number;
  groundY?: number;
}

export class TrajectoryPredictor {
  private readonly engine: Matter.Engine;
  private readonly ghost: Matter.Body;

  constructor() {
    this.engine = Engine.create({
      enableSleeping: false,
      positionIterations: POSITION_ITERATIONS,
      velocityIterations: VELOCITY_ITERATIONS,
    });
    this.engine.gravity.y = GRAVITY_Y;
    this.engine.gravity.scale = GRAVITY_SCALE;
    this.ghost = Bodies.circle(0, 0, BIRD.r, {
      density: BIRD.density,
      friction: BIRD.friction,
      restitution: BIRD.restitution,
      frictionAir: BIRD.frictionAir,
      label: 'ghost',
    });
    Composite.add(this.engine.world, this.ghost);
  }

  /** 발사 위치·속도로부터 예측 점 목록. 지면(groundY)에 닿으면 중단. */
  predict(pos: Vec, vel: Vec, opts: PredictOptions = {}): Vec[] {
    const ticks = opts.ticks ?? TRAJECTORY.ticks;
    const every = opts.every ?? TRAJECTORY.every;
    const groundY = opts.groundY ?? TRAJECTORY.groundY;
    const g = this.ghost;
    Body.setAngle(g, 0);
    Body.setAngularVelocity(g, 0);
    Body.setPosition(g, { x: pos.x, y: pos.y });
    Body.setVelocity(g, { x: vel.x, y: vel.y });

    const pts: Vec[] = [];
    for (let t = 1; t <= ticks; t++) {
      Engine.update(this.engine, STEP_MS);
      if (t % every === 0) pts.push({ x: g.position.x, y: g.position.y });
      if (g.position.y >= groundY) break;
    }
    return pts;
  }

  dispose(): void {
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
  }
}
