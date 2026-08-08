/**
 * §5.2 궤적 예측 — 샌드박스 엔진 방식.
 *
 * 해석적 포물선 공식은 frictionAir와 Matter의 위치 보정 때문에 실제와 어긋난다(길수록 오차 누적).
 * 그래서 "실제 엔진 복제본"으로 시뮬레이션한다. 조준 중에는 구조물이 정지 상태이므로
 * 모든 바디를 static 스냅샷으로 복제해도 정확도 손실이 거의 없다.
 */

import { Bodies, Body, Composite, Engine, Events, Vector } from 'matter-js';
import type { GameWorld } from './world';
import { BIRD, getGame } from './entities';
import { FIXED_DT } from '../core/loop';

/** 시뮬레이션 스텝 수 */
export const PREDICT_STEPS = 60;
/** 실제로 화면에 보여줄 스텝 수 — 전부 보여주면 난이도가 사라진다 */
export const VISIBLE_STEPS = 25;
/** 몇 스텝마다 점을 찍는가 */
export const SAMPLE_EVERY = 3;

export class TrajectoryPredictor {
  private engine: Engine | null = null;
  private ghost: Body | null = null;
  private hit = false;
  private onHit = (): void => {
    this.hit = true;
  };

  /** DRAGGING 진입 시 1회 호출한다. */
  build(gw: GameWorld): void {
    this.destroy();

    const engine = Engine.create();
    engine.gravity.x = gw.engine.gravity.x;
    engine.gravity.y = gw.engine.gravity.y;
    engine.gravity.scale = gw.engine.gravity.scale;
    engine.positionIterations = gw.engine.positionIterations;
    engine.velocityIterations = gw.engine.velocityIterations;
    engine.enableSleeping = false;

    const clones: Body[] = [];
    for (const body of Composite.allBodies(gw.engine.world)) {
      if (body === gw.bird) continue;
      const clone = cloneStatic(body);
      if (clone) clones.push(clone);
    }
    Composite.add(engine.world, clones);

    const type = (gw.bird && getGame(gw.bird)?.birdType) ?? 'red';
    const spec = BIRD[type];
    const ghost = Bodies.circle(-9999, -9999, spec.radius, {
      density: spec.density,
      restitution: 0.35,
      friction: 0.55,
      frictionAir: 0.002,
    });
    Composite.add(engine.world, ghost);

    Events.on(engine, 'collisionStart', this.onHit);

    this.engine = engine;
    this.ghost = ghost;
  }

  /** 발사 위치/속도로 궤적 점들을 만든다. 프레임당 최대 1회 호출한다. */
  predict(from: Vector, vel: Vector, worldWidth: number, worldHeight: number): Vector[] {
    const engine = this.engine;
    const ghost = this.ghost;
    if (!engine || !ghost) return [];

    this.hit = false;
    Body.setStatic(ghost, false);
    Body.setPosition(ghost, { x: from.x, y: from.y });
    Body.setVelocity(ghost, { x: vel.x, y: vel.y });
    // §5.2 리스크: setVelocity가 positionPrev를 갱신하는지 버전에 따라 다르다 → 수동 동기화.
    ghost.positionPrev.x = from.x - vel.x;
    ghost.positionPrev.y = from.y - vel.y;
    Body.setAngularVelocity(ghost, 0);

    const points: Vector[] = [];
    for (let i = 0; i < PREDICT_STEPS; i++) {
      Engine.update(engine, FIXED_DT);

      if (i < VISIBLE_STEPS && i % SAMPLE_EVERY === 0) {
        points.push({ x: ghost.position.x, y: ghost.position.y });
      }
      if (this.hit) break;
      const p = ghost.position;
      if (p.y > worldHeight + 200 || p.x < -300 || p.x > worldWidth + 300) break;
      if (i >= VISIBLE_STEPS) break;
    }
    return points;
  }

  destroy(): void {
    if (!this.engine) return;
    Events.off(this.engine, 'collisionStart', this.onHit);
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.engine = null;
    this.ghost = null;
  }
}

/**
 * 바디를 static 복제한다.
 * 사각형은 vertices에서 폭/높이를 역산해 재생성한다(Body.create({vertices})는
 * 옵션 적용 순서에 따라 position이 흔들릴 수 있어 쓰지 않는다).
 */
function cloneStatic(body: Body): Body | null {
  const g = getGame(body);
  const pos = body.position;

  if (g?.round && g.radius) {
    return Bodies.circle(pos.x, pos.y, g.radius, { isStatic: true });
  }

  const v = body.vertices;
  if (v.length < 3) return null;
  const v0 = v[0]!;
  const v1 = v[1]!;
  const v2 = v[2]!;
  const w = Math.hypot(v1.x - v0.x, v1.y - v0.y);
  const h = Math.hypot(v2.x - v1.x, v2.y - v1.y);
  if (w < 1 || h < 1) return null;

  return Bodies.rectangle(pos.x, pos.y, w, h, { isStatic: true, angle: body.angle });
}
