/**
 * 조준·발사·비행·정착·다음 새 라이프사이클 (§5.2, §6.1, §6.3).
 *
 * idle(새 없음) → ready(새총 위) → dragging → flying → settling → waiting → ready/idle
 *
 * 새총은 제약(Constraint) 대신 "드래그 중 정적 배치 → 놓을 때 속도 직접 설정" 방식이다.
 * 발사 속도는 당김 벡터의 결정적 함수라서 궤적 예측·헤드리스 재현이 정확하다.
 */
import Matter from 'matter-js';
import { ANCHOR, GRAB_RADIUS, MAX_PULL, MIN_PULL, SETTLE } from '../core/config';
import { add, clampLen, dist, len, sub, type Vec } from '../core/math';
import { createBird } from '../entities/Bird';
import type { Entity } from '../entities/Entity';
import type { BirdKind, Shot } from '../levels/types';
import { isBodyQuiet, SettleTracker } from '../physics/Settle';
import type { PhysicsWorld } from '../physics/World';
import { pullToShot, pullToVelocity, shotToPull, shotVelocity } from './Ballistics';

const { Body, Sleeping } = Matter;

export type ShotPhase = 'idle' | 'ready' | 'dragging' | 'flying' | 'settling' | 'waiting';

export interface ShotEvents {
  onBirdPlaced?: (bird: Entity) => void;
  onLaunch?: (shot: Shot, bird: Entity) => void;
  onDragCancel?: () => void;
  /** 샷 하나가 완전히 끝나(정착·대기 후) 다음 새로 넘어가기 직전 */
  onShotComplete?: () => void;
}

const TRAIL_MAX = 240;

export class ShotController {
  phase: ShotPhase = 'idle';
  queue: BirdKind[] = [];
  /** 새총 위 또는 비행 중인 새 */
  current: Entity | null = null;
  /** 앵커→새 당김 벡터 (클램프 완료). 드래그 중에만 의미 있음 */
  pull: Vec = { x: 0, y: 0 };
  lastShot: Shot | null = null;
  /** 현재/직전 샷의 실제 비행 궤적 (이전 샷 흔적용) */
  trail: Vec[] = [];
  prevTrail: Vec[] = [];
  ticksSinceLaunch = 0;
  /** 발사 횟수 */
  shotsFired = 0;

  private readonly settle = new SettleTracker();
  private birdQuietTicks = 0;
  private waitTicks = 0;

  constructor(
    private readonly world: PhysicsWorld,
    private readonly events: ShotEvents = {},
  ) {}

  /** 새 큐 구성 후 첫 새 배치 */
  load(birds: readonly BirdKind[]): void {
    this.queue = [...birds];
    this.current = null;
    this.phase = 'idle';
    this.pull = { x: 0, y: 0 };
    this.trail = [];
    this.prevTrail = [];
    this.lastShot = null;
    this.shotsFired = 0;
    this.settle.reset();
    this.placeNext();
  }

  /** 남은 새 = 큐 + 새총 위(아직 안 쏜) 새 */
  get birdsRemaining(): number {
    const onSling = this.current && (this.phase === 'ready' || this.phase === 'dragging') ? 1 : 0;
    return this.queue.length + onSling;
  }

  /** 진행 중인 샷이 없음 (실패 판정 조건) */
  get shotSettled(): boolean {
    return this.phase === 'ready' || this.phase === 'idle';
  }

  get shotInProgress(): boolean {
    return this.phase === 'flying' || this.phase === 'settling' || this.phase === 'waiting';
  }

  get isDragging(): boolean {
    return this.phase === 'dragging';
  }

  /** 드래그 중 예측용 발사 속도. 당김이 최소 미만이면 null */
  get dragVelocity(): Vec | null {
    if (this.phase !== 'dragging' || len(this.pull) < MIN_PULL) return null;
    return pullToVelocity(this.pull);
  }

  get dragShot(): Shot | null {
    return this.phase === 'dragging' ? pullToShot(this.pull) : null;
  }

  get birdPosition(): Vec | null {
    return this.current?.alive ? { ...this.current.body.position } : null;
  }

  /** 다음 새를 새총에 배치. 없으면 idle 로 가고 false */
  placeNext(): boolean {
    const kind = this.queue.shift();
    if (!kind) {
      this.current = null;
      this.phase = 'idle';
      return false;
    }
    const bird = createBird(kind, ANCHOR);
    this.world.add(bird);
    this.current = bird;
    this.phase = 'ready';
    this.pull = { x: 0, y: 0 };
    this.events.onBirdPlaced?.(bird);
    return true;
  }

  // ---------- 포인터 입력 (월드 좌표) ----------

  /** true 면 드래그가 시작됨 */
  pointerDown(p: Vec): boolean {
    if (this.phase === 'waiting') {
      // 탭으로 다음 새 대기 건너뛰기
      this.waitTicks = 0;
      return false;
    }
    if (this.phase !== 'ready' || !this.current) return false;
    if (dist(p, this.current.body.position) > GRAB_RADIUS) return false;
    this.phase = 'dragging';
    this.setPull(p);
    return true;
  }

  pointerMove(p: Vec): void {
    if (this.phase !== 'dragging') return;
    this.setPull(p);
  }

  pointerUp(p: Vec): void {
    if (this.phase !== 'dragging' || !this.current) return;
    this.setPull(p);
    if (len(this.pull) < MIN_PULL) {
      this.cancelDrag();
      return;
    }
    this.launch(pullToVelocity(this.pull), pullToShot(this.pull));
  }

  /** 드래그 취소: 새를 앵커로 되돌린다 (일시정지·pointercancel) */
  cancelDrag(): void {
    if (this.phase !== 'dragging' || !this.current) return;
    this.pull = { x: 0, y: 0 };
    Body.setPosition(this.current.body, { x: ANCHOR.x, y: ANCHOR.y });
    this.phase = 'ready';
    this.events.onDragCancel?.();
  }

  private setPull(p: Vec): void {
    if (!this.current) return;
    this.pull = clampLen(sub(p, ANCHOR), MAX_PULL);
    const pos = add(ANCHOR, this.pull);
    Body.setPosition(this.current.body, pos);
  }

  // ---------- 헤드리스 발사 ----------

  /** 각도(°)·파워(0..1)로 발사. ready 가 아니면 false */
  fire(angle: number, power: number): boolean {
    if (this.phase !== 'ready' || !this.current) return false;
    const shot: Shot = { angle, power };
    this.pull = shotToPull(shot);
    Body.setPosition(this.current.body, add(ANCHOR, this.pull));
    this.launch(shotVelocity(angle, power), shot);
    return true;
  }

  private launch(vel: Vec, shot: Shot): void {
    const bird = this.current;
    if (!bird) return;
    const b = bird.body;
    Body.setStatic(b, false);
    Sleeping.set(b, false);
    Body.setAngularVelocity(b, 0);
    Body.setVelocity(b, { x: vel.x, y: vel.y });

    this.phase = 'flying';
    this.ticksSinceLaunch = 0;
    this.birdQuietTicks = 0;
    this.settle.reset();
    this.prevTrail = this.trail;
    this.trail = [{ x: b.position.x, y: b.position.y }];
    this.lastShot = shot;
    this.pull = { x: 0, y: 0 };
    this.shotsFired += 1;
    this.events.onLaunch?.(shot, bird);
  }

  // ---------- 틱 ----------

  /** Engine.update 이전 (현재는 할 일 없음; 확장 새 능력 훅 자리) */
  beforeStep(): void {
    /* no-op for red bird */
  }

  /** Engine.update·제거 처리 이후 호출 */
  afterStep(): void {
    switch (this.phase) {
      case 'flying':
        this.tickFlying();
        break;
      case 'settling':
        this.tickSettling();
        break;
      case 'waiting':
        this.tickWaiting();
        break;
      default:
        break;
    }
  }

  private tickFlying(): void {
    this.ticksSinceLaunch += 1;
    const bird = this.current;
    const dyn = this.world.dynamicEntities().map((e) => e.body);
    const allSettled = this.settle.update(dyn);

    if (!bird || !bird.alive) {
      // 경계 밖으로 나가 제거됨
      this.current = null;
      this.phase = 'settling';
      if (allSettled) this.startWaiting();
      return;
    }

    if (this.ticksSinceLaunch % 2 === 0 && this.trail.length < TRAIL_MAX) {
      this.trail.push({ x: bird.body.position.x, y: bird.body.position.y });
    }

    this.birdQuietTicks = isBodyQuiet(bird.body) ? this.birdQuietTicks + 1 : 0;
    const timedOut = this.ticksSinceLaunch >= SETTLE.timeoutTicks;
    if (this.birdQuietTicks >= SETTLE.quietTicks || timedOut) {
      this.world.queueRemove(bird, 'consumed');
      this.current = null;
      this.phase = 'settling';
      if (allSettled || timedOut) this.startWaiting();
    }
  }

  private tickSettling(): void {
    this.ticksSinceLaunch += 1;
    const dyn = this.world.dynamicEntities().map((e) => e.body);
    const settled = this.settle.update(dyn) || this.ticksSinceLaunch >= SETTLE.timeoutTicks;
    if (settled) this.startWaiting();
  }

  private startWaiting(): void {
    this.phase = 'waiting';
    this.waitTicks = SETTLE.nextBirdDelayTicks;
  }

  private tickWaiting(): void {
    this.waitTicks -= 1;
    if (this.waitTicks > 0) return;
    this.events.onShotComplete?.();
    this.placeNext();
  }
}
