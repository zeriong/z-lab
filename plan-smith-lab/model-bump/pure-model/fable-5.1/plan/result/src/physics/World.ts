/**
 * Matter Engine 래퍼 (§4.4, §7.3).
 * - Engine/Bodies/Composite/Sleeping/Events 만 사용 (Render/Runner 미사용)
 * - 엔티티 맵, 제거 큐, 경계 밖 제거, 사전 정착을 담당한다.
 * DOM 을 참조하지 않는다.
 */
import Matter from 'matter-js';
import {
  BOUNDS,
  GRAVITY_SCALE,
  GRAVITY_Y,
  GROUND_THICKNESS,
  GROUND_WIDTH,
  GROUND_Y,
  POSITION_ITERATIONS,
  STEP_MS,
  VELOCITY_ITERATIONS,
  WORLD_W,
} from '../core/config';
import { allocEntityId, type Entity } from '../entities/Entity';

const { Engine, Bodies, Composite, Sleeping, Events } = Matter;

export type RemoveReason = 'destroyed' | 'outOfBounds' | 'consumed';

export interface RemovalRecord {
  entity: Entity;
  reason: RemoveReason;
}

/** 파괴된 바디 주변 이 거리 안의 수면 바디를 깨운다 (받침이 사라진 블록이 공중에 떠 있지 않도록). */
const WAKE_RADIUS = 220;

export class PhysicsWorld {
  readonly engine: Matter.Engine;
  readonly entities = new Map<number, Entity>();
  ground: Entity;
  /** 누적 스텝 수 */
  tick = 0;
  /** 스텝 종료 후 제거된 엔티티마다 호출 */
  onRemoved: ((rec: RemovalRecord) => void) | null = null;

  private removeQueue: RemovalRecord[] = [];
  private queued = new Set<number>();

  constructor() {
    this.engine = Engine.create({
      enableSleeping: true,
      positionIterations: POSITION_ITERATIONS,
      velocityIterations: VELOCITY_ITERATIONS,
    });
    this.engine.gravity.y = GRAVITY_Y;
    this.engine.gravity.scale = GRAVITY_SCALE;
    this.ground = this.createGround();
  }

  get world(): Matter.World {
    return this.engine.world;
  }

  private createGround(): Entity {
    const body = Bodies.rectangle(
      WORLD_W / 2,
      GROUND_Y + GROUND_THICKNESS / 2,
      GROUND_WIDTH,
      GROUND_THICKNESS,
      { isStatic: true, friction: 0.8, restitution: 0, label: 'ground' },
    );
    const entity: Entity = {
      id: allocEntityId(),
      kind: 'ground',
      body,
      health: Infinity,
      maxHealth: Infinity,
      alive: true,
    };
    this.entities.set(body.id, entity);
    Composite.add(this.engine.world, body);
    return entity;
  }

  /** 엔티티를 월드에 추가한다. */
  add(entity: Entity): Entity {
    this.entities.set(entity.body.id, entity);
    Composite.add(this.engine.world, entity.body);
    return entity;
  }

  byBody(body: Matter.Body): Entity | undefined {
    return this.entities.get(body.id);
  }

  /** 이벤트 콜백 안에서 바디를 직접 제거하지 않고 큐에 넣는다. */
  queueRemove(entity: Entity, reason: RemoveReason): void {
    if (!entity.alive || this.queued.has(entity.body.id)) return;
    this.queued.add(entity.body.id);
    this.removeQueue.push({ entity, reason });
  }

  /** 스텝 종료 후 일괄 제거. 제거된 레코드를 돌려준다. */
  flushRemovals(): RemovalRecord[] {
    if (this.removeQueue.length === 0) return [];
    const removed = this.removeQueue;
    this.removeQueue = [];
    this.queued.clear();
    for (const rec of removed) {
      const e = rec.entity;
      if (!e.alive) continue;
      e.alive = false;
      const pos = { x: e.body.position.x, y: e.body.position.y };
      Composite.remove(this.engine.world, e.body);
      this.entities.delete(e.body.id);
      if (rec.reason === 'destroyed') this.wakeNear(pos, WAKE_RADIUS);
      this.onRemoved?.(rec);
    }
    return removed;
  }

  /** 주변 수면 바디를 깨운다. */
  wakeNear(pos: { x: number; y: number }, radius: number): void {
    const r2 = radius * radius;
    for (const e of this.entities.values()) {
      const b = e.body;
      if (b.isStatic || !b.isSleeping) continue;
      const dx = b.position.x - pos.x;
      const dy = b.position.y - pos.y;
      if (dx * dx + dy * dy <= r2) Sleeping.set(b, false);
    }
  }

  /** 고정 스텝 1회. */
  step(): void {
    Engine.update(this.engine, STEP_MS);
    this.tick += 1;
  }

  /** 경계 밖 바디를 제거 큐에 넣는다. ground/terrain 은 제외. */
  pruneOutOfBounds(): void {
    for (const e of this.entities.values()) {
      if (e.kind === 'ground' || e.kind === 'terrain') continue;
      if (!e.alive) continue;
      const p = e.body.position;
      if (p.x < BOUNDS.minX || p.x > BOUNDS.maxX || p.y > BOUNDS.maxY) {
        this.queueRemove(e, 'outOfBounds');
      }
    }
  }

  /** 정적이 아닌 엔티티 (새 포함). */
  dynamicEntities(): Entity[] {
    const out: Entity[] = [];
    for (const e of this.entities.values()) {
      if (e.alive && !e.body.isStatic) out.push(e);
    }
    return out;
  }

  entitiesOf(kind: Entity['kind']): Entity[] {
    const out: Entity[] = [];
    for (const e of this.entities.values()) if (e.alive && e.kind === kind) out.push(e);
    return out;
  }

  /** 모든 동적 바디를 강제 수면 (사전 정착 후 사용). */
  sleepAll(): void {
    for (const e of this.dynamicEntities()) Sleeping.set(e.body, true);
  }

  /** 사전 정착: n 틱 진행 후 강제 수면. */
  preSettle(ticks: number): void {
    for (let i = 0; i < ticks; i++) this.step();
    this.sleepAll();
  }

  /** 월드의 모든 바디 수 (누수 검사용). */
  bodyCount(): number {
    return Composite.allBodies(this.engine.world).length;
  }

  /** 지면만 남기고 전부 제거. */
  clear(): void {
    Composite.clear(this.engine.world, false);
    this.entities.clear();
    this.removeQueue = [];
    this.queued.clear();
    this.tick = 0;
    this.ground = this.createGround();
  }

  /** 완전 파기. 이후 재사용 불가. */
  dispose(): void {
    // Events.off(obj) 에 이름을 주지 않으면 모든 리스너를 제거한다.
    (Events.off as unknown as (obj: unknown) => void)(this.engine);
    Composite.clear(this.engine.world, false);
    Engine.clear(this.engine);
    this.entities.clear();
    this.removeQueue = [];
    this.queued.clear();
  }
}
