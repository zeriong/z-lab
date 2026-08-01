// 게임 코어 — 슬링샷 드래그·궤적 예측·발사·충돌·파괴·판정·점수 (플랜 S1·S4)

import { PhysicsWorld, PhysBody } from '../physics/adapter';
import type { StageDef, Material } from '../stages/schema';
import { Particles } from './particles';
import * as sound from '../audio/sound';

export const WORLD_W = 1280;
export const WORLD_H = 720;
export const GROUND_TOP = 660;
export const BIRD_R = 16;

const STEP_MS = 1000 / 60;
const MAX_PULL = 90; // 최대 당김 거리 px
const POWER = 0.22; // 당김 px -> 초기 속도(px/step) 계수
const GRAVITY_Y = 1;
const BIRD_FRICTION_AIR = 0.005;
const GRAB_RADIUS = 70; // 새 잡기 허용 반경
const MIN_LAUNCH_PULL = 12; // 이보다 짧은 당김은 발사 취소

// 점수 규칙 (플랜 S4 — 임의값, S7 실측 교체 예정)
const SCORE_BLOCK = 500;
const SCORE_PIG = 1000;
const SCORE_BIRD_BONUS = 5000;

// 실패 판정: 새 소진 후 5초 경과 (플랜 S4 — 임의값)
const FAIL_TIMEOUT_MS = 5000;
// 발사된 새의 최대 활동 시간 — 이후 소진 처리
const BIRD_LIFETIME_MS = 8000;

const MATERIAL_HP: Record<Material, number> = { wood: 60, glass: 30, stone: 130 };
const MATERIAL_DENSITY: Record<Material, number> = { wood: 0.0009, glass: 0.0006, stone: 0.0018 };
const MATERIAL_COLOR: Record<Material, string> = { wood: '#b5651d', glass: '#9fd8ef', stone: '#8a8a8a' };
const PIG_HP = 50;
const PIG_R = 18;

export interface ClearResult {
  score: number;
  stars: number;
  birdsLeft: number;
}

export interface GameEvents {
  onCleared(result: ClearResult): void;
  onFailed(): void;
  onHudChange(birds: number, pigs: number, score: number): void;
}

export class Game {
  readonly world: PhysicsWorld;
  readonly stage: StageDef;
  readonly particles = new Particles();
  readonly anchor: { x: number; y: number };

  score = 0;
  /** 아직 슬링샷에 장전되지 않은 대기 새 수 */
  birdsQueued = 0;
  birdOnSling: PhysBody | null = null;
  activeBird: PhysBody | null = null;

  dragging = false;
  dragPos = { x: 0, y: 0 };

  blocks = new Set<PhysBody>();
  pigs = new Set<PhysBody>();

  private finished = false;
  private failTimerMs = 0;
  private birdLifeMs = 0;
  private accumulator = 0;
  private readonly events: GameEvents;

  constructor(stage: StageDef, events: GameEvents) {
    this.stage = stage;
    this.events = events;
    this.anchor = { x: stage.slingshot.x, y: stage.slingshot.y };
    this.world = new PhysicsWorld(GRAVITY_Y);

    // 지면 (정적)
    this.world.addRectangle(WORLD_W / 2, GROUND_TOP + (WORLD_H - GROUND_TOP) / 2, WORLD_W * 2, WORLD_H - GROUND_TOP, { kind: 'ground' }, { isStatic: true, friction: 0.8 });

    // 블록 (재질별 내구도·밀도)
    for (const b of stage.blocks) {
      const body = this.world.addRectangle(
        b.x,
        b.y,
        b.w,
        b.h,
        { kind: 'block', material: b.material, hp: b.hp ?? MATERIAL_HP[b.material], maxHp: b.hp ?? MATERIAL_HP[b.material] },
        { angle: b.angle ?? 0, density: MATERIAL_DENSITY[b.material], friction: 0.6, restitution: 0.05 },
      );
      this.blocks.add(body);
    }

    // 돼지
    for (const p of stage.pigs) {
      const body = this.world.addCircle(
        p.x,
        p.y,
        p.r ?? PIG_R,
        { kind: 'pig', hp: p.hp ?? PIG_HP, maxHp: p.hp ?? PIG_HP },
        { density: 0.0008, friction: 0.5, restitution: 0.2 },
      );
      this.pigs.add(body);
    }

    this.world.onCollision((a, b, impact) => this.handleCollision(a, b, impact));

    this.birdsQueued = stage.birds;
    this.loadNextBird();
    this.emitHud();
  }

  // ── 새 장전 ─────────────────────────────────────────────

  private loadNextBird(): void {
    if (this.birdsQueued <= 0 || this.birdOnSling) return;
    this.birdsQueued--;
    this.birdOnSling = this.world.addCircle(
      this.anchor.x,
      this.anchor.y,
      BIRD_R,
      { kind: 'bird' },
      { isStatic: true, density: 0.004, friction: 0.5, restitution: 0.35, frictionAir: BIRD_FRICTION_AIR },
    );
  }

  /** HUD용 남은 새 = 대기 + 장전 */
  get birdsRemaining(): number {
    return this.birdsQueued + (this.birdOnSling ? 1 : 0);
  }

  // ── 입력 (PointerEvent 좌표는 main.ts에서 월드 좌표로 변환됨 — 가정 A2 선제 완화) ──

  pointerDown(x: number, y: number): void {
    if (this.finished || !this.birdOnSling) return;
    if (Math.hypot(x - this.anchor.x, y - this.anchor.y) <= GRAB_RADIUS) {
      this.dragging = true;
      this.pointerMove(x, y);
    }
  }

  pointerMove(x: number, y: number): void {
    if (!this.dragging || !this.birdOnSling) return;
    const dx = x - this.anchor.x;
    const dy = y - this.anchor.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, MAX_PULL);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    this.dragPos = { x: this.anchor.x + nx * clamped, y: this.anchor.y + ny * clamped };
    this.world.setPosition(this.birdOnSling, this.dragPos.x, this.dragPos.y);
  }

  pointerUp(): void {
    if (!this.dragging || !this.birdOnSling) return;
    this.dragging = false;
    const pullX = this.anchor.x - this.dragPos.x;
    const pullY = this.anchor.y - this.dragPos.y;
    if (Math.hypot(pullX, pullY) < MIN_LAUNCH_PULL) {
      // 당김이 짧으면 발사 취소, 제자리 복귀
      this.world.setPosition(this.birdOnSling, this.anchor.x, this.anchor.y);
      return;
    }
    const bird = this.birdOnSling;
    this.birdOnSling = null;
    this.world.setStatic(bird, false);
    this.world.setVelocity(bird, pullX * POWER, pullY * POWER);
    this.activeBird = bird;
    this.birdLifeMs = 0;
    sound.playLaunch();
    this.emitHud();
  }

  // ── 궤적 예측 점선 (플랜 R2-c) — Matter 적분 근사(step당 중력 가속 + 공기저항) ──

  trajectory(): { x: number; y: number }[] | null {
    if (!this.dragging || !this.birdOnSling) return null;
    const pullX = this.anchor.x - this.dragPos.x;
    const pullY = this.anchor.y - this.dragPos.y;
    if (Math.hypot(pullX, pullY) < MIN_LAUNCH_PULL) return null;

    // Matter.js 근사: step당 dv = gravity * 0.001 * dt^2
    const gPerStep = GRAVITY_Y * 0.001 * STEP_MS * STEP_MS;
    let vx = pullX * POWER;
    let vy = pullY * POWER;
    let px = this.dragPos.x;
    let py = this.dragPos.y;
    const points: { x: number; y: number }[] = [];
    for (let i = 1; i <= 90; i++) {
      vx *= 1 - BIRD_FRICTION_AIR;
      vy = vy * (1 - BIRD_FRICTION_AIR) + gPerStep;
      px += vx;
      py += vy;
      if (i % 4 === 0) points.push({ x: px, y: py });
      if (py >= GROUND_TOP - BIRD_R) break;
    }
    return points;
  }

  // ── 스텝 (paused 중에는 main.ts가 호출하지 않음 → 물리 틱 0, R3-c) ──

  update(dtMs: number): void {
    if (this.finished) return;

    this.accumulator += dtMs;
    while (this.accumulator >= STEP_MS) {
      this.world.step(STEP_MS);
      this.accumulator -= STEP_MS;
    }

    this.particles.update(dtMs);
    this.cleanupOutOfBounds();

    // 발사된 새 수명 관리
    if (this.activeBird) {
      this.birdLifeMs += dtMs;
      const b = this.activeBird;
      const out = b.position.x < -100 || b.position.x > WORLD_W + 150 || b.position.y > WORLD_H + 100;
      if (out || b.isSleeping || this.birdLifeMs > BIRD_LIFETIME_MS) {
        this.world.remove(b);
        this.activeBird = null;
        this.loadNextBird();
        this.emitHud();
      }
    }

    // 실패 판정: 새 소진 후 모든 바디 sleep 또는 5초 경과 (플랜 S4)
    if (!this.finished && this.pigs.size > 0 && this.birdsRemaining === 0 && !this.activeBird) {
      this.failTimerMs += dtMs;
      if (this.failTimerMs >= FAIL_TIMEOUT_MS || this.world.allSleeping()) {
        this.finished = true;
        this.events.onFailed();
      }
    }
  }

  // ── 충돌 → 내구도 감소 → 파괴 (플랜 R2-d) ──

  private handleCollision(a: PhysBody, b: PhysBody, impact: number): void {
    if (this.finished) return;
    this.applyDamage(a, impact);
    this.applyDamage(b, impact);
    if (impact > 3 && (a.meta.kind !== 'ground' || b.meta.kind !== 'ground')) {
      sound.playHit();
    }
  }

  private applyDamage(body: PhysBody, impact: number): void {
    const meta = body.meta;
    if (meta.kind === 'block') {
      const threshold = 3;
      if (impact > threshold && meta.hp !== undefined) {
        meta.hp -= (impact - threshold) * 9;
        if (meta.hp <= 0) this.destroyBlock(body);
      }
    } else if (meta.kind === 'pig') {
      const threshold = 2;
      if (impact > threshold && meta.hp !== undefined) {
        meta.hp -= (impact - threshold) * 14;
        if (meta.hp <= 0) this.destroyPig(body);
      }
    }
  }

  private destroyBlock(body: PhysBody): void {
    if (!this.blocks.has(body)) return;
    this.blocks.delete(body);
    this.world.remove(body);
    const color = body.meta.material ? MATERIAL_COLOR[body.meta.material] : '#b5651d';
    this.particles.burst(body.position.x, body.position.y, color, 12);
    this.score += SCORE_BLOCK;
    this.emitHud();
  }

  private destroyPig(body: PhysBody): void {
    if (!this.pigs.has(body)) return;
    this.pigs.delete(body);
    this.world.remove(body);
    this.particles.burst(body.position.x, body.position.y, '#5cb85c', 16);
    this.score += SCORE_PIG;
    sound.playPigPop();
    this.emitHud();
    this.checkClear();
  }

  private cleanupOutOfBounds(): void {
    for (const pig of [...this.pigs]) {
      if (pig.position.y > WORLD_H + 120 || pig.position.x > WORLD_W + 200 || pig.position.x < -200) {
        this.destroyPig(pig); // 낙사도 제거로 인정
      }
    }
    for (const block of [...this.blocks]) {
      if (block.position.y > WORLD_H + 120 || block.position.x > WORLD_W + 200 || block.position.x < -200) {
        this.destroyBlock(block);
      }
    }
  }

  // ── 클리어 판정 = 모든 돼지 제거 (플랜 R2-e) + 별 등급 (R2-f) ──

  private checkClear(): void {
    if (this.finished || this.pigs.size > 0) return;
    this.finished = true;
    const birdsLeft = this.birdsRemaining;
    this.score += birdsLeft * SCORE_BIRD_BONUS;
    // 별: 클리어 1개, 점수 임계 2개, (2개 충족 +) 잔여 새 >= 1이면 3개 (플랜 S4 — 임계 임의값)
    let stars = 1;
    if (this.score >= this.stage.scoreStar2) stars = 2;
    if (stars === 2 && birdsLeft >= 1) stars = 3;
    this.emitHud();
    sound.playClear();
    this.events.onCleared({ score: this.score, stars, birdsLeft });
  }

  private emitHud(): void {
    this.events.onHudChange(this.birdsRemaining, this.pigs.size, this.score);
  }
}

export { MATERIAL_COLOR };
