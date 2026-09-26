import { AABB as PlAABB, Box, Circle, Polygon, Vec2, World } from 'planck';
import type { Body, Contact, Fixture } from 'planck';
import { DT, G, POS_ITERS, PPM, VEL_ITERS } from '../../config/constants';
import type { FixtureSpec } from '../../config/catalog';
import type { Vec } from '../math';

/**
 * Planck 래퍼 (ADR-1). 엔진 API는 이 파일 밖에서 직접 부르지 않는다.
 * - 바깥은 모두 px(위치), m/s(속도), N·s(충격량)로 말한다. px↔m 변환은 여기서만 한다.
 * - post-solve 콜백에서는 충격량을 큐에 쌓기만 하고 월드를 수정하지 않는다.
 * - 바디 제거는 월드가 잠겨 있지 않을 때만 한다(잠겨 있으면 지연 큐로 보낸다).
 * - Box2D 다각형에는 스킨(polygonRadius = 2 × linearSlop)이 붙는다. 스테이지 데이터처럼 "정확히 맞닿게"
 *   배치한 블록이 스폰 직후 서로 밀려나지 않도록, 다각형 코어를 스킨 두께만큼 안쪽으로 줄여 만든다.
 *   (충돌 외곽 = 코어 + 스킨 = 데이터상의 크기)
 */

export type PhysBody = Body;

export type BodyRole = 'bird' | 'pig' | 'block' | 'tnt' | 'terrain' | 'ground';

export interface BodyTag {
  role: BodyRole;
  id: number;
}

export interface DynamicOpts {
  bullet?: boolean;
  linearDamping?: number;
  angularDamping?: number;
}

export interface ImpulseRecord {
  tagA: BodyTag;
  tagB: BodyTag;
  /** 접촉점들의 법선 충격량 중 최대값 (N·s) */
  impulse: number;
}

export interface Pose {
  x: number;
  y: number;
  angle: number;
}

export interface Motion {
  awake: boolean;
  /** m/s */
  speed: number;
  /** rad/s */
  angSpeed: number;
}

/** Box2D 기본값: linearSlop 0.005 m, polygonRadius = 2 × linearSlop */
export const POLYGON_SKIN_M = 0.01;

export const toM = (px: number): number => px / PPM;
export const toPx = (m: number): number => m * PPM;

let liveWorlds = 0;
/** S-8 누수 테스트용: 파괴되지 않은 월드 수 */
export function liveWorldCount(): number {
  return liveWorlds;
}

/** 볼록 다각형을 각 변에서 d만큼 안쪽으로 줄인다 (단위 무관, 순수 함수) */
export function insetConvex(points: readonly Vec[], d: number): Vec[] {
  const n = points.length;
  if (n < 3 || d <= 0) return points.map((p) => ({ x: p.x, y: p.y }));
  let area2 = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    area2 += a.x * b.y - b.x * a.y;
  }
  const sign = area2 >= 0 ? 1 : -1;
  // 변 i: points[i] → points[i+1], 안쪽 법선과 오프셋 직선 n·x = c
  const lines = [];
  for (let i = 0; i < n; i++) {
    const a = points[i]!;
    const b = points[(i + 1) % n]!;
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const l = Math.hypot(ex, ey) || 1;
    const nx = (-ey / l) * sign;
    const ny = (ex / l) * sign;
    lines.push({ nx, ny, c: nx * a.x + ny * a.y + d });
  }
  const out: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const l1 = lines[(i - 1 + n) % n]!;
    const l2 = lines[i]!;
    const det = l1.nx * l2.ny - l1.ny * l2.nx;
    if (Math.abs(det) < 1e-12) {
      const p = points[i]!;
      out.push({ x: p.x + l2.nx * d, y: p.y + l2.ny * d });
    } else {
      out.push({ x: (l1.c * l2.ny - l2.c * l1.ny) / det, y: (l1.nx * l2.c - l2.nx * l1.c) / det });
    }
  }
  return out;
}

interface ImpulseLike {
  normalImpulses: ArrayLike<number>;
}

export class PhysicsWorld {
  private world: World | null;
  private impulses: ImpulseRecord[] = [];
  private readonly deferred = new Set<Body>();

  constructor(gravity: number = G) {
    this.world = new World({ gravity: new Vec2(0, gravity) });
    this.world.on('post-solve', this.onPostSolve);
    liveWorlds++;
  }

  get disposed(): boolean {
    return this.world === null;
  }

  private get w(): World {
    if (!this.world) throw new Error('PhysicsWorld가 이미 파괴되었다');
    return this.world;
  }

  private readonly onPostSolve = (contact: Contact, impulse: ImpulseLike): void => {
    const count = contact.getManifold().pointCount;
    let max = 0;
    for (let i = 0; i < count; i++) {
      const j = impulse.normalImpulses[i] ?? 0;
      if (j > max) max = j;
    }
    if (max <= 0) return;
    const tagA = contact.getFixtureA().getBody().getUserData() as BodyTag | null;
    const tagB = contact.getFixtureB().getBody().getUserData() as BodyTag | null;
    if (!tagA || !tagB) return;
    this.impulses.push({ tagA, tagB, impulse: max });
  };

  // ── 생성 ──────────────────────────────────────────────────────────

  private fixture(spec: FixtureSpec) {
    return { density: spec.density, friction: spec.friction, restitution: spec.restitution };
  }

  /** px 크기 사각형 → 스킨을 뺀 코어 Box (m) */
  private box(w: number, h: number): Box {
    const hx = Math.max(toM(w / 2) - POLYGON_SKIN_M, toM(w / 2) * 0.5);
    const hy = Math.max(toM(h / 2) - POLYGON_SKIN_M, toM(h / 2) * 0.5);
    return new Box(hx, hy);
  }

  /** px 꼭짓점 → 스킨을 뺀 코어 Polygon (m) */
  private polygon(points: readonly Vec[]): Polygon {
    const m = points.map((p) => ({ x: toM(p.x), y: toM(p.y) }));
    return new Polygon(insetConvex(m, POLYGON_SKIN_M).map((p) => new Vec2(p.x, p.y)));
  }

  createStaticRect(x: number, y: number, w: number, h: number, angle: number, tag: BodyTag, spec: FixtureSpec): Body {
    const body = this.w.createBody({ type: 'static', position: new Vec2(toM(x), toM(y)), angle, userData: tag });
    body.createFixture(this.box(w, h), this.fixture(spec));
    return body;
  }

  /** 절대 좌표 꼭짓점으로 정적 볼록 다각형을 만든다 */
  createStaticPolygon(points: readonly Vec[], tag: BodyTag, spec: FixtureSpec): Body {
    const body = this.w.createBody({ type: 'static', position: new Vec2(0, 0), userData: tag });
    body.createFixture(this.polygon(points), this.fixture(spec));
    return body;
  }

  createDynamicRect(
    x: number, y: number, w: number, h: number, angle: number,
    tag: BodyTag, spec: FixtureSpec, opts: DynamicOpts = {},
  ): Body {
    const body = this.createDynamicBody(x, y, angle, tag, opts);
    body.createFixture(this.box(w, h), this.fixture(spec));
    return body;
  }

  createDynamicCircle(x: number, y: number, r: number, tag: BodyTag, spec: FixtureSpec, opts: DynamicOpts = {}): Body {
    const body = this.createDynamicBody(x, y, 0, tag, opts);
    body.createFixture(new Circle(toM(r)), this.fixture(spec));
    return body;
  }

  /** 바디 원점(x, y) 기준 로컬 꼭짓점(px)으로 동적 볼록 다각형을 만든다 */
  createDynamicPolygon(
    x: number, y: number, local: readonly Vec[], angle: number,
    tag: BodyTag, spec: FixtureSpec, opts: DynamicOpts = {},
  ): Body {
    const body = this.createDynamicBody(x, y, angle, tag, opts);
    body.createFixture(this.polygon(local), this.fixture(spec));
    return body;
  }

  private createDynamicBody(x: number, y: number, angle: number, tag: BodyTag, opts: DynamicOpts): Body {
    return this.w.createBody({
      type: 'dynamic',
      position: new Vec2(toM(x), toM(y)),
      angle,
      bullet: opts.bullet ?? false,
      linearDamping: opts.linearDamping ?? 0,
      angularDamping: opts.angularDamping ?? 0,
      allowSleep: true,
      userData: tag,
    });
  }

  // ── 스텝과 콜백 큐 ──────────────────────────────────────────────────

  step(dt: number = DT): void {
    this.w.step(dt, VEL_ITERS, POS_ITERS);
    this.flushDeferred();
  }

  /** 이번 스텝에 쌓인 충격량 기록을 꺼낸다 */
  drainImpulses(): ImpulseRecord[] {
    const out = this.impulses;
    this.impulses = [];
    return out;
  }

  destroyBody(body: Body): void {
    if (!this.world) return;
    if (this.world.isLocked()) {
      this.deferred.add(body);
      return;
    }
    this.world.destroyBody(body);
  }

  private flushDeferred(): void {
    if (!this.world || this.deferred.size === 0 || this.world.isLocked()) return;
    for (const b of this.deferred) this.world.destroyBody(b);
    this.deferred.clear();
  }

  // ── 읽기/쓰기 ──────────────────────────────────────────────────────

  tagOf(body: Body): BodyTag | null {
    return (body.getUserData() as BodyTag | null) ?? null;
  }

  pose(body: Body): Pose {
    const p = body.getPosition();
    return { x: toPx(p.x), y: toPx(p.y), angle: body.getAngle() };
  }

  /** m/s */
  linearVelocity(body: Body): Vec {
    const v = body.getLinearVelocity();
    return { x: v.x, y: v.y };
  }

  /** m/s */
  setLinearVelocity(body: Body, v: Vec): void {
    body.setLinearVelocity(new Vec2(v.x, v.y));
    body.setAwake(true);
  }

  motion(body: Body): Motion {
    const v = body.getLinearVelocity();
    return { awake: body.isAwake(), speed: Math.hypot(v.x, v.y), angSpeed: Math.abs(body.getAngularVelocity()) };
  }

  isDynamic(body: Body): boolean {
    return body.isDynamic();
  }

  /** 충격량(N·s)을 px 좌표의 한 점에 가한다 */
  applyImpulse(body: Body, impulse: Vec, atPx: Vec): void {
    body.applyLinearImpulse(new Vec2(impulse.x, impulse.y), new Vec2(toM(atPx.x), toM(atPx.y)), true);
  }

  /** 중심 (x, y), 반경 r(px)의 AABB와 겹치는 바디 목록 (중복 제거) */
  queryAABB(x: number, y: number, r: number): Body[] {
    const found = new Set<Body>();
    const box = new PlAABB(new Vec2(toM(x - r), toM(y - r)), new Vec2(toM(x + r), toM(y + r)));
    this.w.queryAABB(box, (fixture: Fixture) => {
      found.add(fixture.getBody());
      return true;
    });
    return [...found];
  }

  bodyCount(): number {
    return this.world ? this.world.getBodyCount() : 0;
  }

  /** 월드 참조를 끊는다. 이후 생성·스텝 호출은 예외를 던진다. */
  dispose(): void {
    if (!this.world) return;
    const world = this.world;
    world.off('post-solve', this.onPostSolve);
    const bodies: Body[] = [];
    for (let b = world.getBodyList(); b; b = b.getNext()) bodies.push(b);
    for (const b of bodies) world.destroyBody(b);
    this.deferred.clear();
    this.impulses = [];
    this.world = null;
    liveWorlds--;
  }
}
