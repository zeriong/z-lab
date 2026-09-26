// StageSession: 스테이지 한 판의 전체 상태 (§4.9, §6 콜드 스타트 표)
// 세션마다 새 Engine을 만들고, dispose에서 리스너·바디·레지스트리를 모두 비운다.
import Matter from 'matter-js';
import type { Engine, IEventCollision } from 'matter-js';
import {
  MATERIALS,
  OUT_MAX_X,
  OUT_MAX_Y,
  OUT_MIN_X,
  SCORE_BLOCK,
  SCORE_PIG,
  STEP_MS,
} from '../config';
import type { BirdType, Phase, SoundId, StageData, Vec2 } from '../types';
import { EntityRegistry } from './entities';
import { buildWorld, createBirdBody, createEngine } from './world-factory';
import { handleCollisionStart } from './damage';
import { Effects } from '../fx/effects';
import { Slingshot, clampPull } from '../game/slingshot';
import { activateAbility, createFlight, updateFlight, type Flight } from '../game/birds';
import { afterStep, createRulesState, type RulesState } from '../game/rules';
import { launchPosition, launchVelocity, predictTrajectory } from '../game/trajectory';

const { Engine: MEngine, Events, Composite, Body } = Matter;

export interface SessionHooks {
  onSound?(id: SoundId, intensity?: number): void;
  /** 결과는 세션당 한 번만 호출된다 (resultSent) */
  onResult?(kind: 'clear' | 'fail'): void;
  /** HUD 갱신이 필요한 사건 (점수·새·돼지·phase) */
  onChange?(): void;
}

export type RemovalReason = 'destroyed' | 'out';

export interface RemovalRequest {
  id: number;
  reason: RemovalReason;
}

export class StageSession {
  readonly stage: StageData;
  readonly engine: Engine;
  readonly registry = new EntityRegistry();
  readonly removalQueue: RemovalRequest[] = [];
  readonly effects: Effects;
  readonly slingshot = new Slingshot();
  readonly rules: RulesState = createRulesState();
  readonly hooks: SessionHooks;

  stepCount = 0;
  pigsAlive: number;
  score = 0;
  birdQueue: BirdType[];
  birdsLeft: number;
  phase: Phase = 'AIMING';
  flight: Flight | null = null;
  resultSent = false;
  result: 'clear' | 'fail' | null = null;
  /** 직전(현재) 비행 궤적. 다음 발사 때 비운다 */
  trail: Vec2[] = [];
  hintVisible: boolean;
  lastImpactSoundStep = -999;
  readonly initialBodyCount: number;
  disposed = false;

  private readonly collisionHandler: (e: IEventCollision<Engine>) => void;

  private constructor(stage: StageData, hooks: SessionHooks) {
    this.stage = stage;
    this.hooks = hooks;
    this.engine = createEngine();
    this.effects = new Effects(stage.id * 7919 + 17);

    const built = buildWorld(this.engine, this.registry, stage);
    this.initialBodyCount = built.bodyCount;
    this.pigsAlive = built.pigCount;
    this.birdQueue = [...stage.birds];
    this.birdsLeft = stage.birds.length;
    this.hintVisible = !!stage.hint;

    // hop 3: 리스너는 현재 세션의 engine에 등록
    this.collisionHandler = (e) => handleCollisionStart(this, e);
    Events.on(this.engine, 'collisionStart', this.collisionHandler);
  }

  static create(stage: StageData, hooks: SessionHooks = {}): StageSession {
    const s = new StageSession(stage, hooks);
    s.loadNext();
    return s;
  }

  // ── 새총 ─────────────────────────────────────────────────────
  loadNext(): boolean {
    const next = this.birdQueue.shift();
    if (!next) return false;
    this.slingshot.load(next);
    this.phase = 'AIMING';
    this.hooks.onChange?.();
    return true;
  }

  /** hop 1 */
  grab(p: Vec2, pointerId: number | null = null): boolean {
    if (this.disposed || this.phase !== 'AIMING') return false;
    const ok = this.slingshot.grab(p, pointerId);
    if (ok) {
      this.hintVisible = false;
      this.refreshPreview();
    }
    return ok;
  }

  drag(p: Vec2): void {
    if (this.slingshot.state !== 'DRAGGING') return;
    this.slingshot.drag(p);
    this.refreshPreview();
  }

  /** hop 2 */
  release(): boolean {
    if (this.slingshot.state !== 'DRAGGING') return false;
    const pull = this.slingshot.release();
    if (!pull) return false;
    return this.launch(pull);
  }

  cancelDrag(): void {
    this.slingshot.cancel();
  }

  private refreshPreview(): void {
    const t = this.slingshot.birdType;
    if (!t || this.slingshot.state !== 'DRAGGING') return;
    this.slingshot.preview = predictTrajectory(t, this.slingshot.pull);
  }

  /** 새총에 있는 새를 pull로 발사한다. 바디는 이 순간 만들어 world에 넣는다 */
  launch(rawPull: Vec2): boolean {
    if (this.disposed || this.phase !== 'AIMING') return false;
    const type = this.slingshot.birdType;
    if (!type || this.slingshot.state === 'EMPTY') return false;
    const pull = clampPull(rawPull, this.slingshot.radius());
    const pos = launchPosition(pull);
    const body = createBirdBody(type, pos.x, pos.y);
    Composite.add(this.engine.world, body);
    Body.setVelocity(body, launchVelocity(pull));
    this.registry.add(body, { kind: 'bird', birdType: type });
    this.flight = createFlight(type, body);
    this.slingshot.empty();
    this.phase = 'FLYING';
    this.birdsLeft -= 1;
    this.trail = [{ x: pos.x, y: pos.y }];
    this.hintVisible = false;
    this.hooks.onSound?.('launch');
    this.hooks.onChange?.();
    return true;
  }

  useAbility(): boolean {
    return activateAbility(this);
  }

  // ── 스텝 ─────────────────────────────────────────────────────
  /** 고정 스텝 하나: physics → flushRemovals → rules → fx */
  step(): void {
    if (this.disposed) return;
    MEngine.update(this.engine, STEP_MS);
    this.checkOutOfBounds();
    updateFlight(this);
    this.flushRemovals();
    afterStep(this);
    this.effects.step();
    this.stepCount++;
  }

  queueRemoval(id: number, reason: RemovalReason): void {
    if (this.removalQueue.some((r) => r.id === id)) return;
    this.removalQueue.push({ id, reason });
  }

  private checkOutOfBounds(): void {
    for (const rec of this.registry.values()) {
      if (rec.entity.kind !== 'block' && rec.entity.kind !== 'pig') continue;
      const p = rec.body.position;
      if (p.x < OUT_MIN_X || p.x > OUT_MAX_X || p.y > OUT_MAX_Y) this.queueRemoval(rec.body.id, 'out');
    }
  }

  /** 제거 큐 처리: Composite.remove, registry 삭제, 이펙트, 점수, 돼지 수 */
  flushRemovals(): void {
    if (this.removalQueue.length === 0) return;
    let changed = false;
    for (const req of this.removalQueue) {
      const body = this.registry.getBody(req.id);
      const e = this.registry.get(req.id);
      if (!body || !e) continue;
      Composite.remove(this.engine.world, body);
      this.registry.delete(req.id);
      const { x, y } = body.position;
      if (e.kind === 'block') {
        const pts = SCORE_BLOCK[e.material];
        this.score += pts;
        this.effects.debris(x, y, MATERIALS[e.material].color);
        this.effects.popup(x, y - 10, `+${pts}`, '#ffffff');
        this.hooks.onSound?.(`break-${e.material}` as SoundId);
        changed = true;
      } else if (e.kind === 'pig') {
        this.score += SCORE_PIG;
        this.pigsAlive -= 1;
        this.effects.smoke(x, y, '#8bc34a', 14);
        this.effects.popup(x, y - 20, `+${SCORE_PIG}`, '#c6ff00');
        this.hooks.onSound?.('pig');
        changed = true;
      }
    }
    this.removalQueue.length = 0;
    if (changed) this.hooks.onChange?.();
  }

  /** Rules가 호출. 세션당 한 번만 결과를 보낸다 */
  finish(kind: 'clear' | 'fail'): void {
    if (this.resultSent) return;
    this.resultSent = true;
    this.result = kind;
    this.slingshot.cancel();
    this.hooks.onSound?.(kind === 'clear' ? 'clear' : 'fail');
    this.hooks.onChange?.();
    this.hooks.onResult?.(kind);
  }

  /** 월드에 있는 바디 수 (테스트용) */
  worldBodyCount(): number {
    return Composite.allBodies(this.engine.world).length;
  }

  /** collisionStart 리스너 수 (테스트용) */
  collisionListenerCount(): number {
    const events = (this.engine as unknown as { events?: Record<string, unknown[] | undefined> }).events;
    return events?.['collisionStart']?.length ?? 0;
  }

  /** Events.off → Composite.clear → Engine.clear → registry·이펙트·큐 비우기 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    Events.off(this.engine, 'collisionStart', this.collisionHandler);
    Composite.clear(this.engine.world, false);
    MEngine.clear(this.engine);
    this.registry.clear();
    this.effects.clear();
    this.removalQueue.length = 0;
    this.flight = null;
    this.trail = [];
    this.slingshot.empty();
  }
}
