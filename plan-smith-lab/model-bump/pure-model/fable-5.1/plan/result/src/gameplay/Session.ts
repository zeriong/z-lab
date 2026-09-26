/**
 * 한 스테이지의 헤드리스 게임 세션.
 * 월드 + 샷 컨트롤러 + 데미지 + 점수 + 판정을 묶고, 한 스텝의 순서(§4.3)를 강제한다.
 * DOM 을 참조하지 않으므로 vitest(Node) 에서 그대로 실행된다.
 *
 * 한 스텝: shot.beforeStep → Engine.update → 데미지 적용 → 경계 밖 제거 → 제거 큐 flush
 *          → shot.afterStep → 제거 큐 flush → 판정
 */
import { PRE_SETTLE_TICKS } from '../core/config';
import { buildLevel } from '../entities/Factory';
import type { Entity } from '../entities/Entity';
import type { LevelDef, Shot } from '../levels/types';
import { DamageSystem } from '../physics/Damage';
import { PIG } from '../physics/Materials';
import type { RemovalRecord, RemoveReason } from '../physics/World';
import { PhysicsWorld } from '../physics/World';
import { Judge } from './Judge';
import { destroyScore, Score, starsFor, unusedBirdBonus, type Stars } from './Score';
import { ShotController } from './ShotController';

export type Outcome = 'playing' | 'clear' | 'failed';

export interface SessionEvents {
  onRemoved?: (entity: Entity, reason: RemoveReason) => void;
  onLaunch?: (shot: Shot, bird: Entity) => void;
  onBirdPlaced?: (bird: Entity) => void;
  onOutcome?: (outcome: Outcome) => void;
}

export interface SessionOptions {
  preSettleTicks?: number;
}

export class Session {
  readonly world = new PhysicsWorld();
  readonly shot: ShotController;
  readonly score = new Score();
  readonly judge = new Judge();
  readonly damage: DamageSystem;
  outcome: Outcome = 'playing';
  /** 플레이 틱 (사전 정착 제외) */
  tick = 0;
  /** 클리어 시 남은 새 보너스 (오버레이 표시용) */
  birdBonus = 0;

  constructor(
    readonly level: LevelDef,
    private readonly events: SessionEvents = {},
    opts: SessionOptions = {},
  ) {
    this.damage = new DamageSystem(this.world);
    this.damage.attach();
    this.world.onRemoved = (rec) => this.handleRemoved(rec);

    buildLevel(this.world, level);
    this.world.preSettle(opts.preSettleTicks ?? PRE_SETTLE_TICKS);
    this.damage.reset();

    this.shot = new ShotController(this.world, {
      onLaunch: (shot, bird) => this.events.onLaunch?.(shot, bird),
      onBirdPlaced: (bird) => this.events.onBirdPlaced?.(bird),
    });
    this.shot.load(level.birds);
  }

  pigsAlive(): number {
    return this.world.entitiesOf('pig').length;
  }

  get birdsRemaining(): number {
    return this.shot.birdsRemaining;
  }

  stars(): Stars {
    return starsFor(this.score.value, this.level, this.outcome === 'clear');
  }

  /** 고정 스텝 1회. 결과가 확정되면 더 이상 진행하지 않는다. */
  step(): void {
    if (this.outcome !== 'playing') return;

    this.shot.beforeStep();
    this.world.step();
    this.damage.flush();
    this.world.pruneOutOfBounds();
    this.world.flushRemovals();
    this.shot.afterStep();
    this.world.flushRemovals();

    const verdict = this.judge.update({
      pigsAlive: this.pigsAlive(),
      birdsRemaining: this.shot.birdsRemaining,
      shotSettled: this.shot.shotSettled,
    });
    if (verdict === 'clear') {
      this.birdBonus = unusedBirdBonus(this.shot.birdsRemaining);
      this.score.add(this.birdBonus);
      this.outcome = 'clear';
      this.events.onOutcome?.('clear');
    } else if (verdict === 'failed') {
      this.outcome = 'failed';
      this.events.onOutcome?.('failed');
    }
    this.tick += 1;
  }

  private handleRemoved(rec: RemovalRecord): void {
    const e = rec.entity;
    if (rec.reason === 'destroyed') {
      this.score.add(destroyScore(e));
    } else if (rec.reason === 'outOfBounds' && e.kind === 'pig') {
      this.score.add(PIG.score);
    }
    this.events.onRemoved?.(e, rec.reason);
  }

  // ---------- 헤드리스 헬퍼 ----------

  fire(angle: number, power: number): boolean {
    return this.shot.fire(angle, power);
  }

  runTicks(n: number): void {
    for (let i = 0; i < n && this.outcome === 'playing'; i++) this.step();
  }

  /** 현재 샷이 끝나 다음 새가 준비되거나(또는 새가 없어 idle) 결과가 날 때까지 진행 */
  runUntilShotDone(maxTicks = 800): number {
    let n = 0;
    while (n < maxTicks && this.outcome === 'playing' && this.shot.shotInProgress) {
      this.step();
      n++;
    }
    return n;
  }

  /** 정답 샷을 순서대로 발사해 결과를 낸다 (levels.solvable 테스트용) */
  playShots(shots: readonly Shot[], maxTicksPerShot = 800): Outcome {
    for (const s of shots) {
      if (this.outcome !== 'playing') break;
      if (this.shot.phase !== 'ready') this.runUntilShotDone(maxTicksPerShot);
      if (this.shot.phase !== 'ready') break;
      this.fire(s.angle, s.power);
      this.runUntilShotDone(maxTicksPerShot);
    }
    // 마지막 샷의 여파(클리어 유예 등)까지 소화
    this.runTicks(200);
    return this.outcome;
  }

  dispose(): void {
    this.damage.detach();
    this.world.onRemoved = null;
    this.world.dispose();
  }
}
