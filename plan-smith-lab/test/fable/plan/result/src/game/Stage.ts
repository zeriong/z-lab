import Matter from 'matter-js';
import {
  BIRD_MAX_FLIGHT_STEPS,
  BIRD_REST_SPEED,
  BIRD_REST_STEPS,
  CALM_SPEED,
  DAMAGE_COEFF,
  DAMAGE_MIN_SPEED,
  GRAVITY_SCALE,
  GRAVITY_Y,
  GROUND_Y,
  OOB_MARGIN,
  PREROLL_STEPS,
  SCORE_BIRD_BONUS,
  SCORE_BLOCK,
  SCORE_PIG,
  SETTLE_MAX_STEPS,
  SETTLE_MIN_STEPS,
  SLING_X,
  SLING_Y,
  STEP_MS,
  VIRTUAL_H,
  VIRTUAL_W,
  type BirdType,
} from '../core/constants.ts';
import type { StageDef } from '../data/stages.ts';
import { Bird } from './entities/Bird.ts';
import { Block } from './entities/Block.ts';
import { Pig } from './entities/Pig.ts';

const { Engine, Bodies, Body, Composite, Events, Vector } = Matter;

// 시도(attempt) 수명 주기. 판정은 오직 settle 종료 시점의 judge() 한 곳에서만 한다.
export type StagePhase = 'idle' | 'preroll' | 'aim' | 'flight' | 'settle' | 'done';

export type StageEvent =
  | { type: 'blockDestroyed'; x: number; y: number; material: string; points: number }
  | { type: 'pigKilled'; x: number; y: number; points: number }
  | { type: 'cleared'; score: number; birdsLeft: number }
  | { type: 'failed'; score: number };

type EventListener = (e: StageEvent) => void;

export class Stage {
  readonly engine: Matter.Engine;

  def: StageDef | null = null;
  phase: StagePhase = 'idle';

  blocks: Block[] = [];
  pigs: Pig[] = [];
  queue: BirdType[] = [];
  currentBird: Bird | null = null;
  score = 0;

  private statics: Matter.Body[] = [];
  private restSteps = 0;
  private flightSteps = 0;
  private settleSteps = 0;
  private listeners: EventListener[] = [];

  constructor() {
    this.engine = Engine.create({ enableSleeping: true });
    this.engine.gravity.y = GRAVITY_Y;
    this.engine.gravity.scale = GRAVITY_SCALE;
    Events.on(this.engine, 'collisionStart', (ev) => this.onCollision(ev));
  }

  onEvent(fn: EventListener): void {
    this.listeners.push(fn);
  }

  private emit(e: StageEvent): void {
    for (const fn of this.listeners) fn(e);
  }

  // --- 로딩 / 리셋 -----------------------------------------------------------
  // 엔진 재생성 없이 월드만 리셋한다. "다시하기"도 같은 경로.
  load(def: StageDef): void {
    Composite.clear(this.engine.world, false);
    this.def = def;
    this.blocks = [];
    this.pigs = [];
    this.currentBird = null;
    this.queue = [...def.birds];
    this.score = 0;
    this.restSteps = 0;
    this.flightSteps = 0;
    this.settleSteps = 0;

    // 지면 + 추가 플랫폼
    this.statics = [
      Bodies.rectangle(VIRTUAL_W / 2, GROUND_Y + 35, VIRTUAL_W + 400, 70, {
        isStatic: true,
        friction: 1,
        label: 'ground',
      }),
    ];
    for (const p of def.ground.platforms ?? []) {
      this.statics.push(
        Bodies.rectangle(p.x, p.y, p.w, p.h, { isStatic: true, friction: 1, label: 'platform' }),
      );
    }
    Composite.add(this.engine.world, this.statics);

    for (const b of def.blocks) {
      const block = new Block(b.x, b.y, b.w, b.h, b.material, b.angle ?? 0);
      this.blocks.push(block);
      Composite.add(this.engine.world, block.body);
    }
    for (const p of def.pigs) {
      const pig = new Pig(p.x, p.y, p.size);
      this.pigs.push(pig);
      Composite.add(this.engine.world, pig.body);
    }

    // 안정화 프리롤: 스택 미세 진동을 입력 허용 전에 소진시킨다. (피해 판정 없음)
    this.phase = 'preroll';
    for (let i = 0; i < PREROLL_STEPS; i++) Engine.update(this.engine, STEP_MS);

    this.loadNextBird();
  }

  private loadNextBird(): void {
    const type = this.queue.shift();
    if (!type) {
      // judge()에서 이미 걸러지므로 도달하지 않지만 방어적으로 처리
      this.phase = 'done';
      return;
    }
    this.currentBird = new Bird(type, SLING_X, SLING_Y);
    Composite.add(this.engine.world, this.currentBird.body);
    this.phase = 'aim';
  }

  // --- 발사 -----------------------------------------------------------------
  fire(velocity: Matter.Vector): void {
    const bird = this.currentBird;
    if (!bird || this.phase !== 'aim') return;
    Body.setStatic(bird.body, false);
    Body.setVelocity(bird.body, velocity);
    bird.phase = 'flying';
    this.phase = 'flight';
    this.restSteps = 0;
    this.flightSteps = 0;
  }

  get birdsRemaining(): number {
    const onSling = this.currentBird && this.currentBird.phase === 'ready' ? 1 : 0;
    return this.queue.length + onSling;
  }

  get pigsAlive(): number {
    return this.pigs.filter((p) => !p.dead).length;
  }

  // --- 고정 스텝 -------------------------------------------------------------
  step(): void {
    if (this.phase === 'idle' || this.phase === 'done') return;
    Engine.update(this.engine, STEP_MS);
    this.cullOutOfBounds();

    if (this.phase === 'flight') {
      this.trackFlight();
    } else if (this.phase === 'settle') {
      this.trackSettle();
    }

    // 돼지 전멸은 어느 시점이든 발생 가능(지연 붕괴 포함) — 판정은 settle을 거쳐 judge()로 수렴
    if (this.pigsAlive === 0 && (this.phase === 'aim' || this.phase === 'flight')) {
      this.beginSettle();
    }
  }

  private trackFlight(): void {
    const bird = this.currentBird;
    if (!bird) {
      this.beginSettle();
      return;
    }
    this.flightSteps++;
    const { x, y } = bird.body.position;
    const oob = x < -OOB_MARGIN || x > VIRTUAL_W + OOB_MARGIN || y > VIRTUAL_H + OOB_MARGIN;
    if (bird.body.speed < BIRD_REST_SPEED) this.restSteps++;
    else this.restSteps = 0;

    if (oob || this.restSteps >= BIRD_REST_STEPS || this.flightSteps >= BIRD_MAX_FLIGHT_STEPS) {
      this.endAttempt();
    }
  }

  private endAttempt(): void {
    if (this.currentBird) {
      Composite.remove(this.engine.world, this.currentBird.body);
      this.currentBird = null;
    }
    this.beginSettle();
  }

  private beginSettle(): void {
    if (this.phase === 'settle') return;
    // 날아가던 새가 남아 있으면(조기 전멸 등) 시도도 함께 종료한다
    if (this.currentBird && this.currentBird.phase === 'flying') {
      Composite.remove(this.engine.world, this.currentBird.body);
      this.currentBird = null;
    }
    this.phase = 'settle';
    this.settleSteps = 0;
  }

  private trackSettle(): void {
    this.settleSteps++;
    const calm = this.allCalm();
    if ((this.settleSteps >= SETTLE_MIN_STEPS && calm) || this.settleSteps >= SETTLE_MAX_STEPS) {
      this.judge();
    }
  }

  private allCalm(): boolean {
    for (const b of Composite.allBodies(this.engine.world)) {
      if (b.isStatic || b.isSleeping) continue;
      if (b.speed > CALM_SPEED) return false;
    }
    return true;
  }

  // --- 판정 (단일 지점) --------------------------------------------------------
  // "시도 종료 이벤트 이후에만 판정" — 마지막 새가 날아가는 도중의 오판정을 원천 차단한다.
  private judge(): void {
    if (this.pigsAlive === 0) {
      const birdsLeft = this.birdsRemaining;
      this.score += birdsLeft * SCORE_BIRD_BONUS;
      this.phase = 'done';
      this.emit({ type: 'cleared', score: this.score, birdsLeft });
      return;
    }
    if (this.queue.length === 0 && !this.currentBird) {
      this.phase = 'done';
      this.emit({ type: 'failed', score: this.score });
      return;
    }
    this.loadNextBird();
  }

  // --- 충돌 → 충격량 → HP -----------------------------------------------------
  private onCollision(ev: Matter.IEventCollision<Matter.Engine>): void {
    if (this.phase === 'preroll') return;
    for (const pair of ev.pairs) {
      const { bodyA, bodyB } = pair;
      const relSpeed = Vector.magnitude(Vector.sub(bodyA.velocity, bodyB.velocity));
      if (relSpeed <= DAMAGE_MIN_SPEED) continue;
      const impactMass = Math.min(
        bodyA.isStatic ? Infinity : bodyA.mass,
        bodyB.isStatic ? Infinity : bodyB.mass,
      );
      if (!Number.isFinite(impactMass)) continue;
      const damage = (relSpeed - DAMAGE_MIN_SPEED) * impactMass * DAMAGE_COEFF;
      this.applyDamage(bodyA, damage);
      this.applyDamage(bodyB, damage);
    }
  }

  private applyDamage(body: Matter.Body, damage: number): void {
    const block = this.blocks.find((b) => !b.destroyed && b.body === body);
    if (block) {
      block.hp -= damage;
      if (block.hp <= 0) this.destroyBlock(block);
      return;
    }
    const pig = this.pigs.find((p) => !p.dead && p.body === body);
    if (pig) {
      pig.hp -= damage;
      if (pig.hp <= 0) this.killPig(pig);
    }
  }

  private destroyBlock(block: Block): void {
    block.destroyed = true;
    Composite.remove(this.engine.world, block.body);
    this.score += SCORE_BLOCK;
    const { x, y } = block.body.position;
    this.emit({ type: 'blockDestroyed', x, y, material: block.material, points: SCORE_BLOCK });
  }

  private killPig(pig: Pig): void {
    pig.dead = true;
    Composite.remove(this.engine.world, pig.body);
    this.score += SCORE_PIG;
    const { x, y } = pig.body.position;
    this.emit({ type: 'pigKilled', x, y, points: SCORE_PIG });
  }

  private cullOutOfBounds(): void {
    for (const pig of this.pigs) {
      if (pig.dead) continue;
      const { x, y } = pig.body.position;
      if (x < -OOB_MARGIN || x > VIRTUAL_W + OOB_MARGIN || y > VIRTUAL_H + OOB_MARGIN) {
        this.killPig(pig);
      }
    }
    for (const block of this.blocks) {
      if (block.destroyed) continue;
      const { x, y } = block.body.position;
      if (x < -OOB_MARGIN * 3 || x > VIRTUAL_W + OOB_MARGIN * 3 || y > VIRTUAL_H + OOB_MARGIN) {
        block.destroyed = true;
        Composite.remove(this.engine.world, block.body);
      }
    }
  }
}
