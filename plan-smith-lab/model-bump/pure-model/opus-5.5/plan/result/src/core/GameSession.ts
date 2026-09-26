import {
  BIRD_DONE_SPEED,
  BIRD_DONE_TIME,
  BOMB_AUTO_FUSE,
  DT,
  GRACE_SECONDS,
  L_MIN,
  SETTLE_HOLD,
  TRAIL_EVERY_STEPS,
  YELLOW_BOOST,
  YELLOW_MAX_SPEED,
} from '../config/constants';
import { BIRDS, EXPLOSIONS, MATERIAL_SPECS } from '../config/catalog';
import type { BirdKind, ExplosionSource, ExplosionSpec } from '../config/catalog';
import { createBird, spawnBirdBody } from './entities/bird';
import type { Bird } from './entities/bird';
import { createBlock } from './entities/block';
import type { Block } from './entities/block';
import { createPig } from './entities/pig';
import type { Pig } from './entities/pig';
import { createGround, createTerrain } from './entities/terrain';
import type { Terrain } from './entities/terrain';
import { createTnt } from './entities/tnt';
import type { Tnt } from './entities/tnt';
import { Emitter } from './events';
import type { SessionEventMap } from './events';
import type { Vec } from './math';
import { len } from './math';
import { PhysicsWorld } from './physics/world';
import type { BodyTag, PhysBody, Pose } from './physics/world';
import { breakthroughKeep, breakthroughVelocity, contactDamage, isOutOfBounds } from './rules/damage';
import { explosionHit } from './rules/explosion';
import { blockScore, birdsLeftBonus, pigScore, starsFor, tntScore } from './rules/scoring';
import { heldFor, holdSince, isWorldCalm } from './rules/settle';
import type { MotionSample } from './rules/settle';
import { initialTurn, isTerminal, turnReducer } from './rules/turn';
import type { TurnCtx, TurnInput, TurnState } from './rules/turn';
import { anchorFor, canGrab, clampPull, launchPosition, pullFromPointer, pullToVelocity } from './slingshot';
import type { StageData } from './stage/schema';
import { predictDots } from './trajectory';

/**
 * 스테이지 1회 플레이 (§3.1). create → step(dt)* → destroy.
 * - DOM을 모른다. 모든 타이머는 simTime 기준이다(ADR-4).
 * - 다시하기/다음 스테이지는 언제나 destroy() 후 새 세션을 만든다(§6.3). 리셋 메서드는 없다.
 */

export interface SessionOptions {
  /** 데미지 유예 시간. 스폰 안정성 검사(S-4)는 0으로 돌린다. */
  graceSeconds?: number;
}

export interface SessionSnapshot {
  stageId: number;
  turnState: TurnState;
  birdsLeft: number;
  pigsLeft: number;
  score: number;
  simTime: number;
}

type Damageable = Pig | Block | Tnt;

interface PendingExplosion {
  x: number;
  y: number;
  spec: ExplosionSpec;
  source: ExplosionSource;
}

let liveSessions = 0;
/** S-8 누수 테스트용 */
export function liveSessionCount(): number {
  return liveSessions;
}

export class GameSession {
  readonly stage: StageData;
  readonly events = new Emitter<SessionEventMap>();
  readonly anchor: Vec;
  readonly initialBirds: number;
  readonly initialPigs: number;

  simTime = 0;
  stepCount = 0;
  score = 0;

  readonly pigs: Pig[] = [];
  readonly blocks: Block[] = [];
  readonly tnts: Tnt[] = [];
  readonly terrain: Terrain[] = [];
  /** 아직 발사하지 않은 새 (0번이 새총에 올라가는 새) */
  readonly birdQueue: BirdKind[];
  /** 발사된 새 (EVALUATE에서 제거) */
  bird: Bird | null = null;
  /** AIMING 중 당김 벡터 (px) */
  aimPull: Vec | null = null;
  /** 직전 발사 궤적 흔적. 다음 발사 때 지운다. */
  trail: Vec[] = [];

  private readonly physics: PhysicsWorld;
  private turn: TurnCtx;
  private readonly graceSeconds: number;
  private pendingExplosions: PendingExplosion[] = [];
  private settleSince: number | null = null;
  private lastPigCount: number;
  private destroyed = false;
  private nextId = 1;
  private readonly pigById = new Map<number, Pig>();
  private readonly blockById = new Map<number, Block>();
  private readonly tntById = new Map<number, Tnt>();

  constructor(stage: StageData, opts: SessionOptions = {}) {
    this.stage = stage;
    this.graceSeconds = opts.graceSeconds ?? GRACE_SECONDS;
    this.physics = new PhysicsWorld();
    this.anchor = anchorFor(stage.slingshot.x);

    this.terrain.push(createGround(this.physics, this.id()));
    for (const t of stage.terrain) this.terrain.push(createTerrain(this.physics, t, this.id()));
    for (const b of stage.blocks) {
      const block = createBlock(this.physics, b, this.id());
      this.blocks.push(block);
      this.blockById.set(block.id, block);
    }
    for (const p of stage.pigs) {
      const pig = createPig(this.physics, p, this.id());
      this.pigs.push(pig);
      this.pigById.set(pig.id, pig);
    }
    for (const t of stage.tnt ?? []) {
      const tnt = createTnt(this.physics, t, this.id());
      this.tnts.push(tnt);
      this.tntById.set(tnt.id, tnt);
    }
    this.birdQueue = [...stage.birds];
    this.initialBirds = this.birdQueue.length;
    this.initialPigs = this.pigs.length;
    this.lastPigCount = this.pigs.length;
    this.turn = initialTurn(this.birdQueue.length, this.pigs.length, 0);
    liveSessions++;
  }

  // ── 읽기 전용 상태 ──────────────────────────────────────────────────

  get stageId(): number {
    return this.stage.id;
  }
  get turnState(): TurnState {
    return this.turn.state;
  }
  get turnSince(): number {
    return this.turn.since;
  }
  get birdsLeft(): number {
    return this.birdQueue.length;
  }
  get pigsLeft(): number {
    let n = 0;
    for (const p of this.pigs) if (p.alive) n++;
    return n;
  }
  get isDestroyed(): boolean {
    return this.destroyed;
  }
  /** 발사 후 경과 시간 (s) */
  get flightTime(): number {
    return this.bird ? this.simTime - this.bird.launchedAt : 0;
  }
  /** 새총 위(또는 이동 중)의 다음 새 */
  get loadedBird(): BirdKind | null {
    const s = this.turn.state;
    if (s === 'LOADING' || s === 'READY' || s === 'AIMING') return this.birdQueue[0] ?? null;
    return null;
  }

  snapshot(): SessionSnapshot {
    return {
      stageId: this.stage.id,
      turnState: this.turn.state,
      birdsLeft: this.birdsLeft,
      pigsLeft: this.pigsLeft,
      score: this.score,
      simTime: this.simTime,
    };
  }

  poseOf(body: PhysBody | null): Pose | null {
    if (!body || this.destroyed) return null;
    return this.physics.pose(body);
  }

  isAwake(body: PhysBody | null): boolean {
    if (!body || this.destroyed) return false;
    return this.physics.motion(body).awake;
  }

  bodyCount(): number {
    return this.physics.bodyCount();
  }

  /** AIMING 중 궤적 예측 점 (px) */
  predictedPath(): Vec[] {
    if (this.turn.state !== 'AIMING' || !this.aimPull) return [];
    const kind = this.birdQueue[0];
    if (!kind) return [];
    const start = launchPosition(this.anchor, this.aimPull, BIRDS[kind].radius);
    return predictDots(start, pullToVelocity(this.aimPull));
  }

  // ── 입력 (월드 좌표) ────────────────────────────────────────────────

  /** 'aim': 조준 시작, 'ability': 능력 발동, null: 무시 */
  pointerDown(x: number, y: number): 'aim' | 'ability' | null {
    if (this.destroyed) return null;
    const s = this.turn.state;
    if (s === 'READY' && canGrab({ x, y }, this.anchor)) {
      this.dispatch({ type: 'grab', now: this.simTime });
      this.aimPull = pullFromPointer({ x, y }, this.anchor);
      return 'aim';
    }
    if (s === 'FLYING' && this.activateAbility()) return 'ability';
    return null;
  }

  pointerMove(x: number, y: number): void {
    if (this.turn.state !== 'AIMING') return;
    this.aimPull = pullFromPointer({ x, y }, this.anchor);
  }

  pointerUp(x: number, y: number): void {
    if (this.turn.state !== 'AIMING') return;
    this.aimPull = pullFromPointer({ x, y }, this.anchor);
    this.release();
  }

  /** pointercancel, 일시정지, 탭 숨김: 조준을 취소하고 READY로. 새는 소모되지 않는다. */
  cancelAim(): void {
    if (this.turn.state !== 'AIMING') return;
    this.aimPull = null;
    this.dispatch({ type: 'cancel', now: this.simTime });
  }

  /** 프로그램 발사 (기준 해법 재생, 테스트 훅). READY에서만 동작한다. pull은 앵커 기준 당김(px). */
  launch(pull: readonly [number, number] | Vec): boolean {
    if (this.destroyed || this.turn.state !== 'READY') return false;
    const p: Vec = 'x' in pull ? { x: pull.x, y: pull.y } : { x: pull[0], y: pull[1] };
    this.dispatch({ type: 'grab', now: this.simTime });
    this.aimPull = clampPull(p);
    return this.release();
  }

  private release(): boolean {
    const pull = this.aimPull ?? { x: 0, y: 0 };
    this.aimPull = null;
    this.dispatch({ type: 'release', now: this.simTime, pullLen: len(pull), minPull: L_MIN });
    if (this.turn.state !== 'FLYING') return false;
    this.fire(pull);
    return true;
  }

  private fire(pull: Vec): void {
    const kind = this.birdQueue.shift();
    if (!kind) return;
    const bird = createBird(this.id(), kind);
    const pos = launchPosition(this.anchor, pull, bird.radius);
    spawnBirdBody(this.physics, bird, pos, pullToVelocity(pull));
    bird.launchedAt = this.simTime;
    bird.launchStep = this.stepCount;
    this.bird = bird;
    this.trail = [pos];
    this.events.emit('birdLaunched', { kind, x: pos.x, y: pos.y });
  }

  /** FLYING 중 1회. 노랑: 진행 방향 속도 ×2.2(상한 60 m/s). 폭탄: 즉시 폭발. */
  activateAbility(): boolean {
    const b = this.bird;
    if (this.turn.state !== 'FLYING' || !b || !b.body || b.abilityUsed || b.done) return false;
    if (b.kind === 'red') return false;
    b.abilityUsed = true;
    const pos = this.physics.pose(b.body);
    this.events.emit('abilityUsed', { kind: b.kind, x: pos.x, y: pos.y });
    if (b.kind === 'yellow') {
      const v = this.physics.linearVelocity(b.body);
      const speed = len(v);
      if (speed > 1e-6) {
        const target = Math.min(speed * YELLOW_BOOST, YELLOW_MAX_SPEED);
        this.physics.setLinearVelocity(b.body, { x: (v.x / speed) * target, y: (v.y / speed) * target });
      }
    } else {
      this.explodeBird();
    }
    return true;
  }

  // ── 스텝 ────────────────────────────────────────────────────────────

  step(dt: number = DT): void {
    if (this.destroyed || isTerminal(this.turn.state)) return;
    const birdBody = this.bird?.body ?? null;
    const preVel = birdBody ? this.physics.linearVelocity(birdBody) : null;

    this.physics.step(dt);
    this.simTime += dt;
    this.stepCount++;

    // 이전 스텝에서 파괴된 TNT의 연쇄 폭발은 이번 스텝 후처리에서 터진다(같은 스텝 안에서 재귀하지 않음).
    const due = this.pendingExplosions;
    this.pendingExplosions = [];

    this.processImpulses(birdBody, preVel);
    for (const e of due) this.applyExplosion(e.x, e.y, e.spec, e.source, null);
    this.processOutOfBounds();
    this.resolveDestruction();
    this.updateBird();
    this.updateTurn();
  }

  private processImpulses(birdBody: PhysBody | null, preVel: Vec | null): void {
    const records = this.physics.drainImpulses();
    let minKeep: number | null = null;
    for (const r of records) {
      const birdHit = r.tagA.role === 'bird' || r.tagB.role === 'bird';
      if (birdHit && this.bird && this.bird.firstContactAt === null) this.bird.firstContactAt = this.simTime;
      for (const tag of [r.tagA, r.tagB]) {
        const ent = this.damageable(tag);
        if (!ent || !ent.alive || ent.hp <= 0) continue;
        const factor = tag.role === 'block' ? MATERIAL_SPECS[(ent as Block).material].impactFactor : 1;
        const dmg = contactDamage({
          role: tag.role,
          impulse: r.impulse,
          simTime: this.simTime,
          factor,
          graceSeconds: this.graceSeconds,
        });
        if (dmg <= 0) continue;
        const hpBefore = ent.hp;
        ent.hp -= dmg;
        if (ent.hp <= 0 && birdHit) {
          const keep = breakthroughKeep(hpBefore, dmg);
          minKeep = minKeep === null ? keep : Math.min(minKeep, keep);
        }
      }
    }
    if (minKeep !== null && preVel && birdBody && this.bird?.body === birdBody) {
      const post = this.physics.linearVelocity(birdBody);
      const next = breakthroughVelocity(preVel, post, minKeep);
      if (next !== post) this.physics.setLinearVelocity(birdBody, next);
    }
  }

  private damageable(tag: BodyTag): Damageable | undefined {
    switch (tag.role) {
      case 'pig':
        return this.pigById.get(tag.id);
      case 'block':
        return this.blockById.get(tag.id);
      case 'tnt':
        return this.tntById.get(tag.id);
      default:
        return undefined;
    }
  }

  private applyExplosion(x: number, y: number, spec: ExplosionSpec, source: ExplosionSource, exclude: PhysBody | null): void {
    this.events.emit('explosion', { x, y, radius: spec.radius, source });
    for (const body of this.physics.queryAABB(x, y, spec.radius)) {
      if (body === exclude || !this.physics.isDynamic(body)) continue;
      const tag = this.physics.tagOf(body);
      if (!tag) continue;
      const pose = this.physics.pose(body);
      const hit = explosionHit(x, y, pose.x, pose.y, spec);
      if (!hit) continue;
      this.physics.applyImpulse(body, { x: hit.dirX * hit.impulse, y: hit.dirY * hit.impulse }, pose);
      const ent = this.damageable(tag);
      if (ent && ent.alive && ent.hp > 0) ent.hp -= hit.damage;
    }
  }

  private explodeBird(): void {
    const b = this.bird;
    if (!b || !b.body) return;
    const pos = this.physics.pose(b.body);
    const body = b.body;
    b.body = null;
    this.physics.destroyBody(body);
    this.applyExplosion(pos.x, pos.y, EXPLOSIONS.bomb, 'bomb', null);
    this.resolveDestruction();
    this.finishBird();
    this.checkPigs();
  }

  private processOutOfBounds(): void {
    for (const p of this.pigs) {
      if (!p.alive || !p.body) continue;
      const pose = this.physics.pose(p.body);
      if (isOutOfBounds(pose.x, pose.y)) this.killPig(p, 'outOfBounds');
    }
    for (const b of this.blocks) {
      if (!b.alive || !b.body) continue;
      const pose = this.physics.pose(b.body);
      if (isOutOfBounds(pose.x, pose.y)) this.removeBody(b);
    }
    for (const t of this.tnts) {
      if (!t.alive || !t.body) continue;
      const pose = this.physics.pose(t.body);
      if (isOutOfBounds(pose.x, pose.y)) this.removeBody(t);
    }
    const bird = this.bird;
    if (bird?.body) {
      const pose = this.physics.pose(bird.body);
      if (isOutOfBounds(pose.x, pose.y)) {
        // 폭탄 새가 아무것에도 맞지 않고 밖으로 나가면 폭발하지 않고 종료한다.
        this.physics.destroyBody(bird.body);
        bird.body = null;
        this.finishBird();
      }
    }
  }

  private removeBody(ent: Damageable): void {
    ent.alive = false;
    if (ent.body) this.physics.destroyBody(ent.body);
    ent.body = null;
  }

  /** HP ≤ 0인 바디를 제거하고 점수·이벤트를 낸다. 파괴된 TNT는 다음 스텝에 폭발한다. */
  private resolveDestruction(): void {
    for (const p of this.pigs) if (p.alive && p.hp <= 0) this.killPig(p, 'damage');
    for (const b of this.blocks) {
      if (!b.alive || b.hp > 0 || !b.body) continue;
      const pose = this.physics.pose(b.body);
      this.removeBody(b);
      this.addScore(blockScore(b.material), pose.x, pose.y);
      this.events.emit('blockDestroyed', { id: b.id, x: pose.x, y: pose.y, material: b.material, w: b.w, h: b.h });
    }
    for (const t of this.tnts) {
      if (!t.alive || t.hp > 0 || !t.body) continue;
      const pose = this.physics.pose(t.body);
      this.removeBody(t);
      this.addScore(tntScore(), pose.x, pose.y);
      this.events.emit('blockDestroyed', { id: t.id, x: pose.x, y: pose.y, material: 'tnt', w: t.w, h: t.h });
      this.pendingExplosions.push({ x: pose.x, y: pose.y, spec: EXPLOSIONS.tnt, source: 'tnt' });
    }
  }

  private killPig(p: Pig, reason: 'damage' | 'outOfBounds' | 'test'): void {
    if (!p.alive) return;
    const pose = p.body ? this.physics.pose(p.body) : { x: 0, y: 0 };
    p.hp = Math.min(p.hp, 0);
    p.alive = false;
    if (p.body) this.physics.destroyBody(p.body);
    p.body = null;
    this.addScore(pigScore(), pose.x, pose.y);
    this.events.emit('pigKilled', { id: p.id, x: pose.x, y: pose.y, size: p.size, reason });
  }

  private addScore(delta: number, x: number, y: number): void {
    if (delta === 0) return;
    this.score += delta;
    this.events.emit('scoreChanged', { score: this.score, delta, x, y });
  }

  private updateBird(): void {
    const b = this.bird;
    if (!b || !b.body || b.done) return;
    const pose = this.physics.pose(b.body);
    if (this.turn.state === 'FLYING' && (this.stepCount - b.launchStep) % TRAIL_EVERY_STEPS === 0) {
      this.trail.push({ x: pose.x, y: pose.y });
    }
    // 폭탄: 탭하지 않으면 첫 충돌 후 2.0s에 자동 폭발
    if (b.kind === 'bomb' && !b.abilityUsed && b.firstContactAt !== null) {
      if (this.simTime - b.firstContactAt >= BOMB_AUTO_FUSE - 1e-9) {
        b.abilityUsed = true;
        this.explodeBird();
      }
      return; // 퓨즈가 도는 동안에는 속도 기반 종료를 보류한다
    }
    const speed = this.physics.motion(b.body).speed;
    b.slowSince = holdSince(b.slowSince, speed < BIRD_DONE_SPEED, this.simTime);
    if (heldFor(b.slowSince, this.simTime, BIRD_DONE_TIME)) this.finishBird();
  }

  /** 새 종료 조건 충족: FLYING → SETTLING */
  private finishBird(): void {
    const b = this.bird;
    if (!b || b.done) return;
    b.done = true;
    this.dispatch({ type: 'birdDone', now: this.simTime });
  }

  private updateTurn(): void {
    this.checkPigs();
    this.dispatch({ type: 'tick', now: this.simTime });
    if (this.turn.state === 'SETTLING') {
      this.settleSince = holdSince(this.settleSince, isWorldCalm(this.motionSamples()), this.simTime);
      if (heldFor(this.settleSince, this.simTime, SETTLE_HOLD)) this.dispatch({ type: 'settled', now: this.simTime });
    }
  }

  private checkPigs(): void {
    const n = this.pigsLeft;
    if (n === this.lastPigCount) return;
    this.lastPigCount = n;
    this.dispatch({ type: 'pigs', now: this.simTime, pigsLeft: n });
  }

  private motionSamples(): MotionSample[] {
    const out: MotionSample[] = [];
    const push = (body: PhysBody | null) => {
      if (body) out.push(this.physics.motion(body));
    };
    for (const p of this.pigs) if (p.alive) push(p.body);
    for (const b of this.blocks) if (b.alive) push(b.body);
    for (const t of this.tnts) if (t.alive) push(t.body);
    push(this.bird?.body ?? null);
    return out;
  }

  // ── 턴 전이와 진입 동작 ──────────────────────────────────────────────

  private dispatch(input: TurnInput): void {
    const prev = this.turn.state;
    this.turn = turnReducer(this.turn, input);
    if (this.turn.state !== prev) this.onEnter(this.turn.state, prev);
  }

  private onEnter(state: TurnState, from: TurnState): void {
    this.events.emit('turnChanged', { from, to: state });
    switch (state) {
      case 'SETTLING':
        this.settleSince = null;
        break;
      case 'EVALUATE': {
        // 사용한 새를 제거한다(연기 효과). 그다음 즉시 분기한다.
        const b = this.bird;
        if (b?.body) {
          const pose = this.physics.pose(b.body);
          this.physics.destroyBody(b.body);
          b.body = null;
          this.events.emit('birdRemoved', { x: pose.x, y: pose.y });
        }
        this.bird = null;
        this.dispatch({ type: 'evaluate', now: this.simTime });
        break;
      }
      case 'CLEAR_PENDING': {
        this.aimPull = null;
        this.addScore(birdsLeftBonus(this.birdQueue.length), this.anchor.x, this.anchor.y - 80);
        break;
      }
      case 'CLEARED':
        this.events.emit('cleared', {
          score: this.score,
          stars: starsFor(this.score, this.stage.stars, true),
          birdsLeft: this.birdQueue.length,
        });
        break;
      case 'FAILED':
        this.events.emit('failed', { score: this.score, pigsLeft: this.pigsLeft });
        break;
      default:
        break;
    }
  }

  // ── 테스트/디버그 훅 ────────────────────────────────────────────────

  /** E2E 폴백용: 모든 돼지를 즉시 처치한다 */
  killAllPigs(): void {
    if (this.destroyed) return;
    for (const p of this.pigs) this.killPig(p, 'test');
    this.checkPigs();
  }

  /** 앵커 A6, S-6용: 지정 위치에서 폭발을 일으킨다 */
  detonateAt(x: number, y: number, source: ExplosionSource): void {
    if (this.destroyed) return;
    this.applyExplosion(x, y, EXPLOSIONS[source], source, null);
    this.resolveDestruction();
    this.checkPigs();
  }

  /** 테스트용: 배열 인덱스의 블록/돼지/TNT를 HP 0으로 만들어 즉시 파괴한다 */
  markDestroyed(kind: 'block' | 'pig' | 'tnt', index: number): void {
    if (this.destroyed) return;
    const list: Damageable[] = kind === 'block' ? this.blocks : kind === 'pig' ? this.pigs : this.tnts;
    const ent = list[index];
    if (ent && ent.alive) ent.hp = 0;
    this.resolveDestruction();
    this.checkPigs();
  }

  // ── 파괴 ────────────────────────────────────────────────────────────

  /** 월드 참조, 이벤트 구독, 엔티티 목록을 모두 해제한다. 여러 번 불러도 안전하다. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.physics.dispose();
    this.events.clear();
    this.pigs.length = 0;
    this.blocks.length = 0;
    this.tnts.length = 0;
    this.terrain.length = 0;
    this.pigById.clear();
    this.blockById.clear();
    this.tntById.clear();
    this.pendingExplosions = [];
    this.bird = null;
    this.aimPull = null;
    this.trail = [];
    liveSessions--;
  }

  private id(): number {
    return this.nextId++;
  }
}
