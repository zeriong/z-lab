/**
 * 인게임 컨트롤러 — 스테이지 로드/언로드, 슬링샷 루프, 판정.
 * 상태 머신(PLAYING/PAUSED 등)은 main.ts 가 소유하고, 여기서는 PLAYING 하위 페이즈만 다룬다.
 *
 * 일시정지 계약(§10-2): PAUSED 동안 main 이 stepOnce() 를 호출하지 않는다 →
 * 물리 스텝 0, 타이머(스텝 카운터) 정지, 새 위치·당김 상태 그대로 유지 → 정확히 재개된다.
 */

import type Matter from 'matter-js';
import { metaOf, PhysicsWorld, type Meta } from './physics';
import { resolvePairs, type DamageHooks } from './damage';
import { Effects } from './effects';
import { attachInput, predictPath } from './input';
import { drawWorld, type AimVisual, type RenderScene } from './render';
import { runningScore, starsFor, totalScore } from './score';
import { AudioBus } from './audio';
import type { BirdKind, HudData, Phase, StageDef, StageResult, Vec2 } from './types';
import {
  ATTACK_FACTOR,
  BASE_SEED,
  BIRD_REST_SPEED,
  BIRD_REST_STEPS,
  DASH_MULTIPLIER,
  DEBRIS_CAP,
  DEBRIS_LIFE_STEPS,
  DEBRIS_PER_BLOCK,
  GROUND_Y,
  LOGICAL_H,
  LOGICAL_W,
  MAX_LAUNCH_SPEED,
  MAX_PULL,
  MIN_PULL,
  REST_SPEED,
  REST_STEPS,
  RESULT_DELAY_STEPS,
  SETTLE_HARD_CAP_STEPS,
} from './tuning';

export interface GameHooks {
  /** 클리어/실패가 확정되었을 때 정확히 한 번 */
  onResolved(result: StageResult): void;
}

interface PendingFx {
  body: Matter.Body;
  meta: Meta;
  at: Vec2;
  impact: number;
}

export class Game {
  private world: PhysicsWorld | null = null;
  private detach: () => void;
  private effects = new Effects(Math.random);

  stage: StageDef | null = null;
  /** PLAYING 상태에서만 true — 오버레이가 떠 있는 동안 입력이 월드로 새지 않는다 */
  interactive = false;

  private phase: Phase = 'IDLE';
  private queue: BirdKind[] = [];
  private bird: Matter.Body | null = null;
  private birdKind: BirdKind = 'basic';

  private pulling = false;
  private pullPos: Vec2 = { x: 0, y: 0 };
  private predicted: Vec2[] = [];

  private killedPigs = 0;
  private destroyedBlocks = 0;

  private birdRestSteps = 0;
  private sinceLaunch = 0;
  private settleSteps = 0;
  private restSteps = 0;
  private resultTimer = -1;
  private resolved = false;

  private debris: Matter.Body[] = [];
  private pendingBlockFx: PendingFx[] = [];
  private pendingPigFx: PendingFx[] = [];
  private lastImpactSoundStep = -99;

  /** 스테이지 로드 직후의 바디 수 — 왕복 후 기준선 복귀 확인용(§10-2) */
  baselineBodies = 0;

  constructor(
    private canvas: HTMLCanvasElement,
    private ctx: CanvasRenderingContext2D,
    private audio: AudioBus,
    private hooks: GameHooks,
  ) {
    this.detach = attachInput(this.canvas, {
      onPullStart: (p) => this.onPullStart(p),
      onPullMove: (p) => this.onPullMove(p),
      onPullEnd: (p) => this.onPullEnd(p),
      onTap: (p) => this.onTap(p),
    });
  }

  // ---------- 로드 / 언로드 ----------

  loadStage(stage: StageDef): void {
    this.unload();

    // 시드는 스테이지 id 로만 결정된다 → 다시하기해도 파편까지 재현된다(§7-A 제약 3)
    const seed = (BASE_SEED * 31 + stage.id * 7919) >>> 0;
    const world = new PhysicsWorld(seed);
    this.world = world;
    this.effects.setRandom(() => world.random());
    this.effects.reset();

    world.addGround();
    for (const t of stage.terrain) world.addTerrain(t);
    for (const b of stage.blocks) world.addBlock(b);
    for (const p of stage.pigs) world.addPig(p);

    world.onCollisionStart((pairs) => resolvePairs(pairs, this.damageHooks));

    this.stage = stage;
    this.queue = [...stage.birds];
    this.bird = null;
    this.killedPigs = 0;
    this.destroyedBlocks = 0;
    this.debris = [];
    this.pendingBlockFx = [];
    this.pendingPigFx = [];
    this.resultTimer = -1;
    this.resolved = false;
    this.restSteps = 0;
    this.settleSteps = 0;
    this.sinceLaunch = 0;
    this.birdRestSteps = 0;
    this.pulling = false;
    this.predicted = [];
    this.phase = 'IDLE';

    this.baselineBodies = world.bodyCount();
    this.spawnNextBird();
    this.audio.startMusic();
  }

  /** 언로드(로드와 쌍) — 바디·리스너를 남기지 않는다(§9 누수 리스크) */
  unload(): void {
    if (this.world) {
      this.world.dispose();
      this.world = null;
    }
    this.effects.reset();
    this.stage = null;
    this.bird = null;
    this.queue = [];
    this.debris = [];
    this.pendingBlockFx = [];
    this.pendingPigFx = [];
    this.phase = 'IDLE';
    this.pulling = false;
    this.predicted = [];
    this.resolved = false;
    this.resultTimer = -1;
    this.audio.stopMusic();
  }

  /** 앱 종료 수준의 정리 */
  dispose(): void {
    this.unload();
    this.detach();
  }

  /** 진단용: 현재 월드 바디 수 (일시정지 계약 검증에서 콘솔로 읽는다) */
  bodyCount(): number {
    return this.world ? this.world.bodyCount() : 0;
  }

  physicsStepCount(): number {
    return this.world ? this.world.stepCount : 0;
  }

  // ---------- 입력 ----------

  private anchor(): Vec2 {
    return this.stage ? this.stage.slingshot : { x: 0, y: 0 };
  }

  private clampPull(p: Vec2): Vec2 {
    const a = this.anchor();
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    const d = Math.hypot(dx, dy);
    if (d <= MAX_PULL || d === 0) return { x: p.x, y: p.y };
    return { x: a.x + (dx / d) * MAX_PULL, y: a.y + (dy / d) * MAX_PULL };
  }

  private onPullStart(p: Vec2): boolean {
    if (!this.interactive || this.phase !== 'AIM' || !this.bird) return false;
    const a = this.anchor();
    if (Math.hypot(p.x - a.x, p.y - a.y) > MAX_PULL + 70) return false; // 새총 근처만 잡힌다
    this.pulling = true;
    this.audio.unlock();
    this.onPullMove(p);
    return true;
  }

  private onPullMove(p: Vec2): void {
    if (!this.pulling || !this.bird) return;
    this.pullPos = this.clampPull(p);
    this.setBirdPosition(this.pullPos);
    const v = this.launchVelocity(this.pullPos);
    this.predicted = predictPath(this.pullPos, v.x, v.y);
  }

  private onPullEnd(p: Vec2): void {
    if (!this.pulling || !this.bird || !this.world) return;
    this.pulling = false;
    const pos = this.clampPull(p);
    const a = this.anchor();
    const dist = Math.hypot(pos.x - a.x, pos.y - a.y);
    if (dist < MIN_PULL) {
      // 조준 취소 — 새를 새총 위로 돌려놓는다
      this.setBirdPosition(a);
      this.predicted = [];
      return;
    }
    const v = this.launchVelocity(pos);
    this.world.launchBird(this.bird, v.x, v.y);
    this.phase = 'FLYING';
    this.sinceLaunch = 0;
    this.birdRestSteps = 0;
    this.predicted = [];
    this.audio.play('launch');
  }

  private onTap(_p: Vec2): void {
    if (!this.interactive) return;
    this.audio.unlock();
    if (this.phase !== 'FLYING' || !this.bird) return;
    const meta = metaOf(this.bird);
    if (!meta || meta.birdKind !== 'dash' || meta.dashUsed) return;
    meta.dashUsed = true;
    meta.attack = ATTACK_FACTOR.bird * DASH_MULTIPLIER;
    const v = this.bird.velocity;
    const speed = Math.hypot(v.x, v.y) || 1;
    const boost = Math.min(MAX_LAUNCH_SPEED * 1.35, speed * 1.55);
    this.world?.launchBird(this.bird, (v.x / speed) * boost, (v.y / speed) * boost);
    this.effects.spark(this.bird.position, 90);
    this.audio.play('dash');
  }

  private launchVelocity(pullPos: Vec2): Vec2 {
    const a = this.anchor();
    const dx = a.x - pullPos.x;
    const dy = a.y - pullPos.y;
    const d = Math.hypot(dx, dy);
    if (d === 0) return { x: 0, y: 0 };
    const speed = (Math.min(d, MAX_PULL) / MAX_PULL) * MAX_LAUNCH_SPEED;
    return { x: (dx / d) * speed, y: (dy / d) * speed };
  }

  private setBirdPosition(p: Vec2): void {
    if (!this.bird) return;
    // 조준 중 새는 isStatic 이므로 위치만 옮긴다 (질량에는 손대지 않는다 — §7-A 제약 2)
    const MatterBody = (this.bird as unknown as { position: Vec2 }).position;
    MatterBody.x = p.x;
    MatterBody.y = p.y;
    // Matter 내부 정점 갱신을 위해 setPosition 대신 직접 이동 후 각속도만 0으로 유지
    const b = this.bird as unknown as { positionPrev: Vec2; vertices: Array<{ x: number; y: number }> };
    const prev = b.positionPrev;
    const dx = p.x - prev.x;
    const dy = p.y - prev.y;
    prev.x = p.x;
    prev.y = p.y;
    for (const v of b.vertices) {
      v.x += dx;
      v.y += dy;
    }
    const bounds = (this.bird as unknown as { bounds: { min: Vec2; max: Vec2 } }).bounds;
    bounds.min.x += dx;
    bounds.max.x += dx;
    bounds.min.y += dy;
    bounds.max.y += dy;
  }

  // ---------- 데미지 훅 (월드 변경은 스텝 뒤로 미룬다) ----------

  private damageHooks: DamageHooks = {
    onBlockDestroyed: (body, meta, at, impact) => {
      this.pendingBlockFx.push({ body, meta, at, impact });
    },
    onPigDestroyed: (body, meta, at, impact) => {
      this.pendingPigFx.push({ body, meta, at, impact });
    },
    onDamaged: (_body, _meta, at, impact) => {
      this.effects.spark(at, impact);
      this.playImpactSound(impact);
    },
    onImpact: (_at, impact) => {
      this.effects.maybeShake(impact);
      this.playImpactSound(impact);
    },
  };

  private playImpactSound(impact: number): void {
    const step = this.world?.stepCount ?? 0;
    if (step - this.lastImpactSoundStep < 4) return;
    this.lastImpactSoundStep = step;
    if (impact >= 30) this.audio.play('hit');
    else this.audio.playImpact(impact);
  }

  // ---------- 고정 스텝 ----------

  stepOnce(): void {
    const world = this.world;
    if (!world) return;

    world.step();
    this.effects.update();
    this.flushDestroyed();
    this.updateDebris();
    this.cullOutOfBounds();
    this.updateFlight();
    this.evaluate();
  }

  private flushDestroyed(): void {
    const world = this.world;
    if (!world) return;

    for (const fx of this.pendingBlockFx) {
      world.remove(fx.body);
      this.destroyedBlocks += 1;
      const material = fx.meta.material ?? 'wood';
      this.effects.burst(fx.at, material, 1);
      this.effects.maybeShake(fx.impact);
      this.audio.play('break');
      // 제약 4: 파괴 = 바디 제거 + 파편 스폰
      if (this.debris.length + DEBRIS_PER_BLOCK <= DEBRIS_CAP) {
        const spawned = world.spawnDebris(
          fx.body.position.x,
          fx.body.position.y,
          material,
          DEBRIS_PER_BLOCK,
          DEBRIS_LIFE_STEPS,
        );
        this.debris.push(...spawned);
      }
    }
    this.pendingBlockFx = [];

    for (const fx of this.pendingPigFx) {
      world.remove(fx.body);
      this.killedPigs += 1;
      this.effects.pigPop(fx.at);
      this.audio.play('pig');
    }
    this.pendingPigFx = [];
  }

  private updateDebris(): void {
    const world = this.world;
    if (!world) return;
    // 수명 만료 + 상한 초과분(오래된 것부터) 제거
    const alive: Matter.Body[] = [];
    for (const d of this.debris) {
      const meta = metaOf(d);
      if (!meta) continue;
      meta.life = (meta.life ?? 0) - 1;
      if (meta.life <= 0) {
        world.remove(d);
        continue;
      }
      alive.push(d);
    }
    while (alive.length > DEBRIS_CAP) {
      const old = alive.shift();
      if (old) world.remove(old);
    }
    this.debris = alive;
  }

  private cullOutOfBounds(): void {
    const world = this.world;
    if (!world) return;
    for (const body of world.bodies()) {
      if (body.isStatic) continue;
      const { x, y } = body.position;
      if (x > -200 && x < LOGICAL_W + 300 && y < LOGICAL_H + 260) continue;
      const meta = metaOf(body);
      if (!meta) continue;
      if (meta.kind === 'pig') {
        // 화면 밖으로 떨어진 돼지는 제거된 것으로 본다
        meta.dead = true;
        this.killedPigs += 1;
        this.effects.pigPop({ x: Math.min(LOGICAL_W - 20, Math.max(20, x)), y: GROUND_Y - 20 });
        this.audio.play('pig');
        world.remove(body);
      } else if (meta.kind === 'bird') {
        if (body === this.bird) this.retireBird();
        else world.remove(body);
      } else {
        world.remove(body);
        this.debris = this.debris.filter((d) => d !== body);
      }
    }
  }

  private updateFlight(): void {
    if (this.phase !== 'FLYING') return;
    this.sinceLaunch += 1;
    const b = this.bird;
    if (!b) {
      this.retireBird();
      return;
    }
    const sp = Math.hypot(b.velocity.x, b.velocity.y);
    if (sp < BIRD_REST_SPEED) this.birdRestSteps += 1;
    else this.birdRestSteps = 0;
    if (this.birdRestSteps >= BIRD_REST_STEPS || this.sinceLaunch > SETTLE_HARD_CAP_STEPS) {
      this.retireBird();
    }
  }

  private retireBird(): void {
    if (this.bird && this.world) this.world.remove(this.bird);
    this.bird = null;
    this.phase = 'SETTLING';
    this.settleSteps = 0;
    this.restSteps = 0;
  }

  /** 클리어/실패 판정 — 어느 쪽도 아닌 상태로 멈추지 않는다(하드 캡 포함) */
  private evaluate(): void {
    const world = this.world;
    if (!world || this.resolved) return;

    const pigsAlive = world.byKind('pig').length;

    if (pigsAlive === 0 && this.resultTimer < 0) {
      this.resultTimer = RESULT_DELAY_STEPS; // 판정 후 0.6초 연출 지연
    }
    if (this.resultTimer > 0) {
      this.resultTimer -= 1;
      if (this.resultTimer === 0) {
        this.finish(true);
        return;
      }
    }
    if (this.resultTimer >= 0) return; // 클리어 대기 중에는 실패 판정을 하지 않는다

    if (this.phase !== 'SETTLING') return;

    this.settleSteps += 1;
    if (world.allSlow(REST_SPEED)) this.restSteps += 1;
    else this.restSteps = 0;

    const settled = this.restSteps >= REST_STEPS || this.settleSteps > SETTLE_HARD_CAP_STEPS;
    if (!settled) return;

    if (this.queue.length > 0) {
      this.spawnNextBird();
    } else {
      this.finish(false); // 새 소진 + 월드 정지 + 돼지 잔존
    }
  }

  private spawnNextBird(): void {
    const world = this.world;
    const stage = this.stage;
    if (!world || !stage) return;
    const kind = this.queue.shift();
    if (!kind) {
      this.phase = 'SETTLING';
      return;
    }
    this.birdKind = kind;
    this.bird = world.addBird(kind, stage.slingshot.x, stage.slingshot.y);
    this.phase = 'AIM';
    this.pulling = false;
    this.predicted = [];
    this.pullPos = { ...stage.slingshot };
  }

  private finish(cleared: boolean): void {
    if (this.resolved || !this.stage) return;
    this.resolved = true;
    this.phase = 'DONE';
    this.interactive = false;

    const unused = this.queue.length + (this.bird && this.bird.isStatic ? 1 : 0);
    const parts = {
      pigs: this.killedPigs,
      blocks: this.destroyedBlocks,
      birdsLeft: cleared ? unused : 0,
    };
    const score = cleared ? totalScore(parts) : runningScore(parts);
    const result: StageResult = {
      stageId: this.stage.id,
      cleared,
      parts,
      score,
      stars: cleared ? starsFor(score, this.stage.parScore) : 0,
      par: this.stage.parScore,
    };
    this.audio.stopMusic();
    this.audio.play(cleared ? 'clear' : 'fail');
    this.hooks.onResolved(result);
  }

  // ---------- HUD / 렌더 ----------

  hudData(): HudData {
    const parts = { pigs: this.killedPigs, blocks: this.destroyedBlocks, birdsLeft: 0 };
    return {
      stageId: this.stage?.id ?? 1,
      score: runningScore(parts),
      birdsLeft: this.queue.length + (this.bird && this.bird.isStatic ? 1 : 0),
    };
  }

  hasStage(): boolean {
    return this.stage !== null && this.world !== null;
  }

  render(): void {
    const ctx = this.ctx;
    const world = this.world;
    if (!world || !this.stage) return;

    const shake = this.effects.shakeOffset();
    ctx.save();
    ctx.translate(shake.x, shake.y);

    const aim: AimVisual | null =
      this.phase === 'AIM' && this.bird
        ? {
            anchor: this.anchor(),
            birdPos: { x: this.bird.position.x, y: this.bird.position.y },
            kind: this.birdKind,
            pulling: this.pulling,
            power:
              Math.min(
                MAX_PULL,
                Math.hypot(
                  this.bird.position.x - this.anchor().x,
                  this.bird.position.y - this.anchor().y,
                ),
              ) / MAX_PULL,
            predicted: this.predicted,
          }
        : null;

    const scene: RenderScene = {
      stage: this.stage,
      bodies: world.bodies(),
      aim,
      waiting: this.queue,
      effects: this.effects,
    };
    drawWorld(ctx, scene);
    ctx.restore();
  }
}
