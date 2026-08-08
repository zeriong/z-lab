// 월드 조립 + 입력 반응 + 충돌·파괴·판정 (플랜 S4/S5/S6/S7의 세션 부분).
// Session 하나가 스테이지 1판의 물리 월드와 게임 상태를 전부 소유한다.
// "다시하기" = 새 Session 생성, "메인으로" = dispose 후 폐기.

import Matter from 'matter-js';
import type { Material, StageData } from './types';
import { getStage } from './stages';
import {
  WORLD_W,
  WORLD_H,
  GROUND_Y,
  ANCHOR,
  PULL_RADIUS,
  LAUNCH_K,
  BIRD_R,
  BLOCK_BREAK_SPEED,
  PIG_BREAK_SPEED,
  MATERIAL_HP,
  MATERIAL_DMG_MULT,
  MATERIAL_COLORS,
  SETTLE_SPEED,
  SETTLE_TIMEOUT_MS,
  BIRD_RETIRE_MS,
  BIRD_CALM_TICKS,
  SCORE_BLOCK,
  SCORE_PIG,
  SCORE_BIRD_BONUS,
} from './constants';
import { burst } from './particles';
import { sfx } from './audio';

export interface BodyMeta {
  kind: 'block' | 'pig' | 'bird' | 'static';
  material?: Material;
  hp?: number;
  hp0?: number;
  r?: number;
}

export type Verdict = { type: 'clear'; score: number; stars: number } | { type: 'fail' };

export class Session {
  readonly stageNo: number;

  private readonly engine: Matter.Engine;
  private readonly data: StageData;
  private readonly meta = new Map<number, BodyMeta>();

  private pigCount = 0;
  private queueCount: number; // 대기열(장착된 새 제외)
  private loadedBird: Matter.Body | null = null;
  private flyingBird: Matter.Body | null = null;

  aiming = false;
  score = 0;

  private launchAt = 0; // 마지막 발사 시각 (0 = 아직 발사 없음)
  private calmTicks = 0;
  private clearAt: number | null = null;
  private toDestroy: Matter.Body[] = [];

  constructor(stageNo: number) {
    this.stageNo = stageNo;
    this.data = getStage(stageNo);

    // 스태킹 지터 완화: 수면 허용 + iteration 상향 (플랜 위험 절)
    this.engine = Matter.Engine.create({ enableSleeping: true });
    this.engine.positionIterations = 10;
    this.engine.velocityIterations = 8;

    const world = this.engine.world;

    // 지면·경계벽 정적 바디 (S4)
    const ground = Matter.Bodies.rectangle(WORLD_W / 2, GROUND_Y + 20, WORLD_W + 400, 40, {
      isStatic: true,
      friction: 1,
    });
    const wallL = Matter.Bodies.rectangle(-20, WORLD_H / 2, 40, WORLD_H * 3, { isStatic: true });
    const wallR = Matter.Bodies.rectangle(WORLD_W + 20, WORLD_H / 2, 40, WORLD_H * 3, {
      isStatic: true,
    });
    const ceiling = Matter.Bodies.rectangle(WORLD_W / 2, -320, WORLD_W * 2, 40, { isStatic: true });
    const statics = [ground, wallL, wallR, ceiling];
    for (const b of statics) this.meta.set(b.id, { kind: 'static' });
    Matter.Composite.add(world, statics);

    // 블록 (내구도는 meta에 — S4)
    for (const spec of this.data.blocks) {
      const body = Matter.Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        friction: 0.9,
        restitution: 0.05,
      });
      this.meta.set(body.id, {
        kind: 'block',
        material: spec.material,
        hp: MATERIAL_HP[spec.material],
        hp0: MATERIAL_HP[spec.material],
      });
      Matter.Composite.add(world, body);
    }

    // 돼지
    for (const spec of this.data.pigs) {
      const body = Matter.Bodies.circle(spec.x, spec.y, spec.r, {
        friction: 0.6,
        restitution: 0.2,
      });
      this.meta.set(body.id, { kind: 'pig', r: spec.r });
      this.pigCount++;
      Matter.Composite.add(world, body);
    }

    // 새 대기열 생성 후 첫 새 장착 (S4)
    this.queueCount = this.data.birds;
    this.mountNextBird();

    // collisionStart 핸들러 등록 — loadStage 말미 (S6, 하중 경로 홉 3)
    Matter.Events.on(this.engine, 'collisionStart', (ev: Matter.IEventCollision<Matter.Engine>) => {
      for (const pair of ev.pairs) {
        const rel = Matter.Vector.magnitude(
          Matter.Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity),
        );
        this.applyHit(pair.bodyA, rel);
        this.applyHit(pair.bodyB, rel);
      }
    });
  }

  // ---- 조준·발사 (S5) ----

  /** 포인터가 장착된 새 근처면 조준 시작 */
  tryStartAim(x: number, y: number): boolean {
    if (!this.loadedBird) return false;
    const p = this.loadedBird.position;
    if (Math.hypot(x - p.x, y - p.y) > 60) return false;
    this.aiming = true;
    this.dragTo(x, y);
    return true;
  }

  /** 앵커 기준 PULL_RADIUS로 클램프해 새를 포인터에 붙인다 (L5) */
  dragTo(x: number, y: number): void {
    if (!this.aiming || !this.loadedBird) return;
    let dx = x - ANCHOR.x;
    let dy = y - ANCHOR.y;
    const len = Math.hypot(dx, dy);
    if (len > PULL_RADIUS) {
      dx *= PULL_RADIUS / len;
      dy *= PULL_RADIUS / len;
    }
    Matter.Body.setPosition(this.loadedBird, { x: ANCHOR.x + dx, y: ANCHOR.y + dy });
  }

  /** 놓으면 당김 벡터 × k를 초기 속도로 발사 (L8) */
  release(now: number): void {
    if (!this.aiming || !this.loadedBird) return;
    this.aiming = false;
    const bird = this.loadedBird;
    const pullX = ANCHOR.x - bird.position.x;
    const pullY = ANCHOR.y - bird.position.y;
    if (Math.hypot(pullX, pullY) < 6) {
      // 당김이 거의 없으면 발사하지 않고 제자리로
      Matter.Body.setPosition(bird, { x: ANCHOR.x, y: ANCHOR.y });
      return;
    }
    this.loadedBird = null;
    Matter.Body.setStatic(bird, false);
    Matter.Body.setVelocity(bird, { x: pullX * LAUNCH_K, y: pullY * LAUNCH_K });
    this.flyingBird = bird;
    this.launchAt = now;
    this.calmTicks = 0;
    sfx.shoot();
  }

  /** 일시정지 진입 시 조준 취소 — 오버레이 뒤에 당겨진 채 남지 않도록 */
  cancelAim(): void {
    if (this.aiming && this.loadedBird) {
      Matter.Body.setPosition(this.loadedBird, { x: ANCHOR.x, y: ANCHOR.y });
    }
    this.aiming = false;
  }

  /** 조준 중일 때의 발사 속도 벡터 (궤적 예측 L7이 같은 공식을 씀) */
  launchVelocity(): { x: number; y: number } | null {
    if (!this.aiming || !this.loadedBird) return null;
    const pullX = ANCHOR.x - this.loadedBird.position.x;
    const pullY = ANCHOR.y - this.loadedBird.position.y;
    if (Math.hypot(pullX, pullY) < 6) return null;
    return { x: pullX * LAUNCH_K, y: pullY * LAUNCH_K };
  }

  // ---- 물리 스텝 ----

  /** PLAYING일 때만 호출된다 — PAUSED 동안 물리 스텝 0회 (L20) */
  step(now: number): void {
    Matter.Engine.update(this.engine, 1000 / 60);
    this.flushDestroyed();
    this.tickBirdLifecycle(now);
  }

  private applyHit(body: Matter.Body, relSpeed: number): void {
    const m = this.meta.get(body.id);
    if (!m) return;
    if (m.kind === 'pig') {
      // 돼지: 임계 이상 1회로 소멸 (L10)
      if (relSpeed >= PIG_BREAK_SPEED && !this.toDestroy.includes(body)) {
        this.toDestroy.push(body);
      }
    } else if (m.kind === 'block' && m.material && m.hp !== undefined) {
      // 블록: 임계 이상이면 재질별 배수로 내구도 차감 (L9)
      if (relSpeed >= BLOCK_BREAK_SPEED) {
        m.hp -= relSpeed * MATERIAL_DMG_MULT[m.material];
        if (m.hp <= 0 && !this.toDestroy.includes(body)) this.toDestroy.push(body);
      }
    }
  }

  /** 충돌 이벤트 중 제거는 위험하므로 스텝 직후 일괄 처리 */
  private flushDestroyed(): void {
    for (const body of this.toDestroy) {
      const m = this.meta.get(body.id);
      if (!m) continue;
      Matter.Composite.remove(this.engine.world, body);
      this.meta.delete(body.id);
      if (m.kind === 'pig') {
        this.pigCount--;
        this.score += SCORE_PIG;
        burst(body.position.x, body.position.y, '#7ac74f');
      } else {
        this.score += SCORE_BLOCK;
        burst(body.position.x, body.position.y, m.material ? MATERIAL_COLORS[m.material] : '#c08a4a');
      }
      sfx.smash();
    }
    this.toDestroy.length = 0;
  }

  /** 발사된 새의 정착/이탈/수명 판정 → 다음 새 장착 (S6) */
  private tickBirdLifecycle(now: number): void {
    const b = this.flyingBird;
    if (!b) return;
    const oob = b.position.x < -60 || b.position.x > WORLD_W + 60 || b.position.y > WORLD_H + 80;
    if (b.speed < 0.3) this.calmTicks++;
    else this.calmTicks = 0;
    if (oob || this.calmTicks >= BIRD_CALM_TICKS || now - this.launchAt > BIRD_RETIRE_MS) {
      Matter.Composite.remove(this.engine.world, b);
      this.meta.delete(b.id);
      this.flyingBird = null;
      this.calmTicks = 0;
      if (this.pigCount > 0) this.mountNextBird();
    }
  }

  private mountNextBird(): void {
    if (this.queueCount <= 0 || this.loadedBird) return;
    this.queueCount--;
    const bird = Matter.Bodies.circle(ANCHOR.x, ANCHOR.y, BIRD_R, {
      density: 0.004,
      restitution: 0.35,
      friction: 0.7,
      frictionAir: 0, // 궤적 예측(L7)과 실궤적을 일치시키기 위해 공기저항 제거
    });
    // 동적으로 생성한 뒤 static화 — setStatic(false) 시 질량 복원이 보장되는 경로
    // (정적 생성 → 동적 전환의 무한질량 이슈 회피)
    Matter.Body.setStatic(bird, true);
    this.meta.set(bird.id, { kind: 'bird', r: BIRD_R });
    Matter.Composite.add(this.engine.world, bird);
    this.loadedBird = bird;
  }

  // ---- 판정 (S6 judgeTick) ----

  /** 매 틱 호출. 돼지 0 → clear / 새 소진+정착 → fail (L11, L12) */
  judge(now: number): Verdict | null {
    if (this.pigCount === 0) {
      if (this.clearAt === null) this.clearAt = now + 600; // 파괴 연출 후 1초 안에 표시 (L11)
      if (now >= this.clearAt) {
        const remaining = this.queueCount + (this.loadedBird ? 1 : 0);
        const total = this.score + remaining * SCORE_BIRD_BONUS;
        const rule = this.data.starRule ?? { two: 1, three: 2 };
        const stars = remaining >= rule.three ? 3 : remaining >= rule.two ? 2 : 1;
        this.score = total;
        return { type: 'clear', score: total, stars };
      }
      return null;
    }
    // 새 소진 + 마지막 새 발사 후 정착 대기(속도 하한 또는 타임아웃 — 둘 중 먼저) + 돼지 잔존
    if (this.queueCount === 0 && !this.loadedBird && !this.flyingBird && this.launchAt > 0) {
      const settled = this.allCalm() || now - this.launchAt > SETTLE_TIMEOUT_MS;
      if (settled) return { type: 'fail' };
    }
    return null;
  }

  private allCalm(): boolean {
    return Matter.Composite.allBodies(this.engine.world).every(
      (b) => b.isStatic || b.speed < SETTLE_SPEED,
    );
  }

  // ---- 렌더/HUD용 조회 ----

  bodies(): Matter.Body[] {
    return Matter.Composite.allBodies(this.engine.world);
  }

  getMeta(id: number): BodyMeta | undefined {
    return this.meta.get(id);
  }

  get waiting(): number {
    return this.queueCount;
  }

  get loadedBirdPos(): { x: number; y: number } | null {
    return this.loadedBird
      ? { x: this.loadedBird.position.x, y: this.loadedBird.position.y }
      : null;
  }

  remainingBirds(): number {
    return this.queueCount + (this.loadedBird ? 1 : 0);
  }

  dispose(): void {
    Matter.Engine.clear(this.engine);
  }
}
