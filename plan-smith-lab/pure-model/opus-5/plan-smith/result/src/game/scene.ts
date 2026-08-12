/**
 * GameScene — mount/unmount, 턴 진행 (§10 홉 2~5의 소재지).
 *
 * 설계 제약 하나: **이 파일은 DOM을 모른다.**
 * 렌더러·HUD·오디오는 전부 SceneHooks 콜백으로 밖에 있다. 이유는 두 가지다.
 *  (1) tests/replay.test.ts가 브라우저 없이 스테이지 10개를 헤드리스로 돌려야 한다(R34).
 *  (2) tests/state.test.ts가 Engine.update 호출 횟수를 스파이로 세야 한다(§13-5a) —
 *      그 이음매가 deps.updatePhysics다.
 */

import { Body, Composite, Engine, Events, Sleeping, Vector } from 'matter-js';
import type { StageDef } from '../data/schema';
import { createPhysics, destroyPhysics, type PhysicsHandle } from '../physics/world';
import { PhysicsLoop, STEP_MS } from '../physics/loop';
import {
  loadStage,
  unloadStage,
  createBird,
  birdsLeft,
  tagOf,
  type StageRuntime,
  type EntityTag,
} from '../data/loader';
import { DamageSystem, type CollisionPair } from './damage';
import { SettleTracker } from './settle';
import { BIRDS, DASH_MULTIPLIER } from './materials';
import { settleResult, type StageResult } from './score';

export type BirdState = 'NONE' | 'READY' | 'FLYING' | 'SPENT';

/** 턴이 끝나고 다음 새가 올라오기까지의 간격. 정산을 눈으로 볼 시간. */
const RELOAD_DELAY_MS = 600;
/** 궤적 잔상 샘플 간격(스텝) */
const TRAIL_SAMPLE_STEPS = 3;
/** 새가 월드 밖으로 나갔다고 보는 여유 */
const OUT_OF_BOUNDS_MARGIN = 600;

export interface SceneHooks {
  onScore?(total: number, gained: number, at: Vector): void;
  onHit?(tag: EntityTag, dmg: number, at: Vector): void;
  onDestroyed?(tag: EntityTag, at: Vector): void;
  onExplosion?(at: Vector, radius: number): void;
  onLaunch?(bird: Body): void;
  onBirdReady?(bird: Body): void;
  onAbility?(kind: 'detonate' | 'dash', at: Vector): void;
  onTurnEnd?(): void;
  onClear?(result: StageResult): void;
  onFail?(result: StageResult): void;
  onShake?(amp: number, ms: number): void;
}

export interface SceneDeps {
  hooks?: SceneHooks;
  /**
   * 물리 적분 이음매. 기본은 Matter.Engine.update.
   * 테스트가 여기에 스파이를 꽂아 "PAUSED 동안 호출 0회"를 단언한다.
   */
  updatePhysics?: (engine: Engine, dtMs: number) => void;
}

export class GameScene {
  private physics: PhysicsHandle | null = null;
  private runtime: StageRuntime | null = null;
  private damage: DamageSystem | null = null;
  private settle = new SettleTracker();
  private loop = new PhysicsLoop();

  private collisionHandler: ((event: { pairs: CollisionPair[] }) => void) | null = null;

  birdState: BirdState = 'NONE';
  private reloadTimer = 0;
  private stepIndex = 0;
  private elapsedMs = 0;
  /** 턴이 끝난 뒤 결론(클리어/실패)을 한 번만 내기 위한 래치 */
  private outcomeSent = false;

  private readonly hooks: SceneHooks;
  private readonly updatePhysics: (engine: Engine, dtMs: number) => void;

  constructor(deps: SceneDeps = {}) {
    this.hooks = deps.hooks ?? {};
    this.updatePhysics = deps.updatePhysics ?? ((engine, dt) => Engine.update(engine, dt));
  }

  // ------------------------------------------------------------ 조회 API

  get stage(): StageRuntime | null {
    return this.runtime;
  }

  get engine(): Engine | null {
    return this.physics?.engine ?? null;
  }

  get physicsLoop(): PhysicsLoop {
    return this.loop;
  }

  get pigsRemaining(): number {
    return this.runtime?.pigsRemaining ?? 0;
  }

  get score(): number {
    return this.runtime?.score ?? 0;
  }

  get birdsRemaining(): number {
    return this.runtime ? birdsLeft(this.runtime) : 0;
  }

  get isPaused(): boolean {
    return this.loop.isPaused;
  }

  get isTurnActive(): boolean {
    return this.birdState === 'FLYING' || this.reloadTimer > 0;
  }

  getReadyBird(): Body | null {
    return this.birdState === 'READY' ? (this.runtime?.activeBird ?? null) : null;
  }

  getFlyingBird(): Body | null {
    return this.birdState === 'FLYING' ? (this.runtime?.activeBird ?? null) : null;
  }

  getAnchor(): Vector {
    return this.runtime?.anchor ?? { x: 0, y: 0 };
  }

  getGravity(): number {
    return this.runtime?.def.gravity ?? 1;
  }

  // -------------------------------------------------------- mount/unmount

  mount(def: StageDef): void {
    this.unmount(); // 재진입은 항상 완전 파기 후 재생성 (R23의 "월드째")

    this.physics = createPhysics(def.gravity);
    this.runtime = loadStage(this.physics, def);
    this.damage = new DamageSystem(this.physics, this.runtime, {
      onHit: (_body, tag, dmg, at) => this.hooks.onHit?.(tag, dmg, at),
      onDestroyed: (_body, tag, at) => {
        this.hooks.onDestroyed?.(tag, at);
        this.hooks.onShake?.(tag.kind === 'pig' ? 4 : 3, 150);
      },
      onExplosion: (at, radius) => {
        this.hooks.onExplosion?.(at, radius);
        this.hooks.onShake?.(7, 260);
      },
      onScore: (total, gained, at) => this.hooks.onScore?.(total, gained, at),
    });

    const handler = (event: { pairs: CollisionPair[] }): void => {
      if (!this.damage) return;
      this.damage.handlePairs(event.pairs, this.elapsedMs);
    };
    this.collisionHandler = handler;
    Events.on(this.physics.engine, 'collisionStart', handler as unknown as () => void);

    this.settle.disarm();
    this.loop.reset();
    this.loop.resume();
    this.stepIndex = 0;
    this.elapsedMs = 0;
    this.reloadTimer = 0;
    this.outcomeSent = false;
    this.birdState = 'NONE';

    this.reloadBird();
  }

  /** 등록한 것을 정확히 되돌린다. 순서: 리스너 → 콘텐츠 → 엔진 (R24, R32) */
  unmount(): void {
    if (this.physics && this.collisionHandler) {
      Events.off(this.physics.engine, 'collisionStart', this.collisionHandler as unknown as () => void);
    }
    this.collisionHandler = null;

    if (this.physics && this.runtime) unloadStage(this.physics, this.runtime);
    destroyPhysics(this.physics);

    this.physics = null;
    this.runtime = null;
    this.damage = null;
    this.birdState = 'NONE';
    this.settle.disarm();
    this.loop.reset();
  }

  /** R23: 월드째 파기·재로드. 새 수·점수·파괴 상태가 전부 초기값으로 돌아간다. */
  retry(): void {
    const def = this.runtime?.def;
    if (!def) return;
    this.mount(def);
  }

  // ------------------------------------------------------------- 루프

  /** RAF에서 호출. PAUSED면 loop가 스텝을 0개 꺼낸다(§13-5a). */
  frame(elapsedMs: number): number {
    if (!this.physics) return 0;
    return this.loop.tick(elapsedMs, (dt) => this.step(dt));
  }

  /**
   * 고정 스텝 1회. 리플레이 러너는 frame()을 건너뛰고 이 함수를 직접 돌린다
   * — 헤드리스에서 RAF와 벽시계를 흉내 내지 않기 위해서다.
   */
  step(dt: number = STEP_MS): void {
    if (!this.physics || !this.runtime) return;

    this.elapsedMs += dt;
    this.stepIndex += 1;

    this.updatePhysics(this.physics.engine, dt); // 홉 3

    const bird = this.runtime.activeBird;

    if (this.birdState === 'FLYING' && bird) {
      if (this.stepIndex % TRAIL_SAMPLE_STEPS === 0) {
        this.runtime.trail.push({ x: bird.position.x, y: bird.position.y });
        if (this.runtime.trail.length > 240) this.runtime.trail.shift();
      }
      if (this.isOutOfBounds(bird)) {
        // 화면 밖으로 나간 새는 정지 판정을 기다릴 이유가 없다.
        this.consumeBird();
      }
    }

    if (this.settle.update(Composite.allBodies(this.physics.world), dt)) {
      this.endTurn();
    }

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        this.afterTurn();
      }
    }
  }

  pause(): void {
    this.loop.pause(); // 누산기 0 — 재개 시 밀린 시간이 한꺼번에 적분되지 않는다
  }

  resume(): void {
    this.loop.resume();
  }

  // ------------------------------------------------------------- 턴 진행

  private reloadBird(): void {
    if (!this.physics || !this.runtime) return;
    const kind = this.runtime.queue.shift();
    if (!kind) {
      this.birdState = 'NONE';
      return;
    }
    const anchor = this.runtime.anchor;
    const bird = createBird(kind, anchor.x, anchor.y);
    Composite.add(this.physics.world, bird);
    this.runtime.activeBird = bird;
    this.birdState = 'READY';
    this.hooks.onBirdReady?.(bird);
  }

  /**
   * 발사 (홉 2). 정적 → 동적 전환이 여기서 일어난다.
   * 속도를 직접 넣는 이유: 임펄스는 질량에 따라 결과가 달라져 새 3종의
   * 조준 감각이 달라지고, 리플레이 재현성도 나빠진다.
   */
  launch(velocity: Vector): void {
    if (!this.runtime || this.birdState !== 'READY') return;
    const bird = this.runtime.activeBird;
    if (!bird) return;

    Body.setStatic(bird, false);
    Sleeping.set(bird, false);
    Body.setVelocity(bird, velocity);
    Body.setAngularVelocity(bird, velocity.x * 0.004);

    this.runtime.birdsUsed += 1;
    this.runtime.lastTrail = this.runtime.trail.length > 1 ? [...this.runtime.trail] : this.runtime.lastTrail;
    this.runtime.trail = [{ x: bird.position.x, y: bird.position.y }];

    this.birdState = 'FLYING';
    this.settle.arm();
    this.hooks.onLaunch?.(bird);
  }

  /** R12: 비행 중 한 번만 발동하는 능력 */
  tapAbility(): void {
    if (!this.runtime || !this.damage || this.birdState !== 'FLYING') return;
    const bird = this.runtime.activeBird;
    if (!bird) return;
    const tag = tagOf(bird);
    if (!tag || tag.abilityUsed || !tag.birdKind) return;

    const spec = BIRDS[tag.birdKind];
    if (spec.ability === 'none') return;
    tag.abilityUsed = true;

    if (spec.ability === 'detonate') {
      const at = { x: bird.position.x, y: bird.position.y };
      this.hooks.onAbility?.('detonate', at);
      this.damage.detonate(at, this.elapsedMs);
      this.hooks.onShake?.(8, 300);
      this.consumeBird(); // 자폭한 새는 사라진다
    } else {
      this.hooks.onAbility?.('dash', { x: bird.position.x, y: bird.position.y });
      Body.setVelocity(bird, {
        x: bird.velocity.x * DASH_MULTIPLIER,
        y: bird.velocity.y * DASH_MULTIPLIER,
      });
    }
  }

  /** 새를 월드에서 치운다(자폭·장외). 턴은 정지 판정이 끝낸다. */
  private consumeBird(): void {
    if (!this.physics || !this.runtime) return;
    const bird = this.runtime.activeBird;
    if (!bird) return;
    Composite.remove(this.physics.world, bird);
    this.runtime.activeBird = null;
    this.birdState = 'SPENT';
  }

  private isOutOfBounds(bird: Body): boolean {
    const def = this.runtime?.def;
    if (!def) return false;
    const x = bird.position.x;
    const y = bird.position.y;
    return x < -OUT_OF_BOUNDS_MARGIN || x > 4000 + OUT_OF_BOUNDS_MARGIN || y > 2000;
  }

  /** 정지 판정이 났다. 새를 치우고 결론 또는 리로드로 넘긴다. */
  private endTurn(): void {
    if (!this.runtime) return;
    if (this.birdState === 'FLYING') {
      this.runtime.lastTrail = [...this.runtime.trail];
      this.consumeBird();
    }
    this.hooks.onTurnEnd?.();
    this.reloadTimer = RELOAD_DELAY_MS;
  }

  /**
   * 턴 종료 + 리로드 지연 후의 결론 (§7.6).
   * 클리어와 실패 모두 "정지 판정"을 공통 조건으로 쓴다 — 마지막 돼지가 죽는
   * 순간 무너지던 블록의 점수가 정산에 들어가야 하기 때문(§7.6).
   */
  private afterTurn(): void {
    if (!this.runtime || this.outcomeSent) return;

    if (this.runtime.pigsRemaining === 0) {
      this.outcomeSent = true;
      this.hooks.onClear?.(this.buildResult(true));
      return;
    }

    if (this.runtime.queue.length === 0 && !this.runtime.activeBird) {
      this.outcomeSent = true;
      this.hooks.onFail?.(this.buildResult(false));
      return;
    }

    this.reloadBird();
  }

  private buildResult(cleared: boolean): StageResult {
    const runtime = this.runtime;
    if (!runtime) {
      return settleResult({ stageId: 0, baseScore: 0, birdsLeft: 0, targetScore: 1, cleared: false });
    }
    return settleResult({
      stageId: runtime.def.id,
      baseScore: runtime.score,
      birdsLeft: birdsLeft(runtime),
      targetScore: runtime.def.targetScore,
      cleared,
    });
  }

  /** 리플레이 러너용 — 결론이 아직 안 났는데 새도 없고 조용한 상태를 감지 */
  get isFinished(): boolean {
    return this.outcomeSent;
  }
}
