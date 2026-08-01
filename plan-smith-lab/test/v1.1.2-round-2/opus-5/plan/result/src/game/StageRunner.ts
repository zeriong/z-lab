import { Camera, type Vec2 } from '../core/Camera';
import type { Sfx } from '../core/Sfx';
import {
  GRAVITY_Y,
  MATERIALS,
  PIGS,
  SCORE,
  type MaterialName,
} from '../data/materials';
import {
  slingAnchor,
  trajectoryPointCount,
  type StageDef,
} from '../data/stages';
import { CATEGORY } from '../physics/collisionCategories';
import { World, type BodyRef, type ImpactEvent } from '../physics/World';
import type { ParticleSystem } from '../render/ParticleSystem';
import { Bird } from './Bird';
import { Block } from './Block';
import { Pig } from './Pig';
import { ScoreRule } from './ScoreRule';
import { SettleDetector } from './SettleDetector';
import { Slingshot } from './Slingshot';
import { predictTrajectory } from './Trajectory';

export type Outcome = 'clear' | 'fail' | 'continue';
export type RunnerPhase = 'presettle' | 'aiming' | 'flying';

/**
 * R1 4단계 완화 스위치 (플랜 §7).
 * 프리세틀(3단계)까지로 안정화되지 않을 때만 true로 올린다:
 * 블록을 static으로 시작해 첫 충돌에서 동적 전환.
 */
const STATIC_UNTIL_FIRST_HIT = false;

/** 프리세틀 시간 (플랜 R1 3단계) */
const PRESETTLE_MS = 500;

/**
 * 스테이지 1회 플레이 전체를 소유한다 (플랜 §2 game/StageRunner).
 * World 인스턴스를 직접 만들고 destroy()로 통째로 버린다 — 전환 시 잔여 리스너 누수 차단(§4).
 */
export class StageRunner {
  readonly world: World;
  readonly blocks: Block[] = [];
  readonly pigs: Pig[] = [];
  readonly birds: Bird[] = [];
  readonly slingshot: Slingshot;
  readonly settle = new SettleDetector();

  phase: RunnerPhase = 'presettle';
  score = 0;
  destroyedBlocks = 0;
  killedPigs = 0;
  shotsFired = 0;
  /** 발사체 정지 감지 완료 (main이 SETTLING 전이를 판단) */
  shotSettled = false;

  private presettleLeft = PRESETTLE_MS;
  private blockByBody = new Map<number, Block>();
  private pigByBody = new Map<number, Pig>();
  private birdBodyIds = new Set<number>();
  private pendingRemove: BodyRef[] = [];
  private groundRef: BodyRef;
  private staticBlocks = STATIC_UNTIL_FIRST_HIT;

  constructor(
    readonly stage: StageDef,
    private readonly camera: Camera,
    private readonly particles: ParticleSystem,
    private readonly sfx: Sfx,
  ) {
    this.world = new World(GRAVITY_Y);
    this.slingshot = new Slingshot(slingAnchor(stage));

    this.groundRef = this.world.addGround(stage.ground.y, -800, stage.camera.x + 2400);

    for (const b of stage.blocks) this.spawnBlock(b.material, b.x, b.y, b.w, b.h, b.angle ?? 0);
    for (const p of stage.pigs) this.spawnPig(p.size, p.x, p.y);
    for (const t of stage.birds) this.birds.push(new Bird(t));

    this.world.onImpact(this.handleImpact);

    // 카메라: 스테이지 전체 뷰 + 경계 클램프
    this.camera.setBounds({
      minX: stage.camera.x - stage.camera.width * 0.42,
      maxX: stage.camera.x + stage.camera.width * 0.45,
      minY: stage.camera.y - 320,
      maxY: stage.camera.y + 220,
    });
    this.frameStage();
  }

  // ---------- 생성 ----------

  private spawnBlock(
    material: MaterialName,
    x: number,
    y: number,
    w: number,
    h: number,
    angle: number,
  ): Block {
    const m = MATERIALS[material];
    const ref = this.world.addBox(x, y, w, h, {
      density: m.density,
      friction: m.friction,
      frictionStatic: m.frictionStatic,
      restitution: m.restitution,
      angle,
      isStatic: this.staticBlocks,
      category: CATEGORY.BLOCK,
      label: `block:${material}`,
    });
    const block = new Block(ref, material, w, h);
    this.blocks.push(block);
    this.blockByBody.set(ref.id, block);
    return block;
  }

  private spawnPig(size: 'small' | 'large', x: number, y: number): Pig {
    const d = PIGS[size];
    const ref = this.world.addCircle(x, y, d.r, {
      density: d.density,
      friction: 0.5,
      frictionStatic: 0.6,
      restitution: 0.15,
      category: CATEGORY.PIG,
      label: `pig:${size}`,
    });
    const pig = new Pig(ref, size);
    this.pigs.push(pig);
    this.pigByBody.set(ref.id, pig);
    return pig;
  }

  // ---------- 상태 조회 ----------

  get activeBird(): Bird | null {
    return this.birds.find((b) => !b.launched) ?? null;
  }

  get birdsRemaining(): number {
    return this.birds.filter((b) => !b.launched).length;
  }

  get pigsRemaining(): number {
    return this.pigs.filter((p) => p.alive).length;
  }

  get inputLocked(): boolean {
    return this.phase !== 'aiming' || this.activeBird === null;
  }

  get trajectoryPoints(): Vec2[] {
    if (this.phase !== 'aiming' || !this.slingshot.pulling) return [];
    const v = this.slingshot.releaseVelocity();
    if (!v) return [];
    const p = this.slingshot.birdPos;
    return predictTrajectory(
      p.x,
      p.y,
      v.x,
      v.y,
      this.world.gravityPerStep,
      trajectoryPointCount(this.stage.id),
      5,
    );
  }

  /** 렌더러가 새 위치를 알아야 한다 */
  birdPosition(bird: Bird): Vec2 {
    if (bird.ref && this.world.has(bird.ref)) return this.world.position(bird.ref);
    return this.slingshot.birdPos;
  }

  // ---------- 입력 ----------

  pointerDown(pt: Vec2): void {
    const bird = this.activeBird;
    if (this.phase !== 'aiming' || !bird) return;
    this.slingshot.tryGrab(pt, bird.r);
  }

  pointerMove(pt: Vec2): void {
    if (this.phase !== 'aiming') return;
    this.slingshot.drag(pt);
  }

  /** 발사되면 true. pointercancel/창 밖 릴리즈도 이 경로로 들어온다. */
  pointerUp(pt: Vec2): boolean {
    const bird = this.activeBird;
    if (this.phase !== 'aiming' || !bird || !this.slingshot.pulling) {
      this.slingshot.reset();
      return false;
    }
    this.slingshot.drag(pt);
    const v = this.slingshot.releaseVelocity();
    const from = this.slingshot.birdPos;
    this.slingshot.pulling = false;

    if (!v) {
      this.slingshot.reset();
      return false;
    }

    const def = bird.def;
    bird.ref = this.world.addCircle(from.x, from.y, def.r, {
      density: def.density,
      friction: def.friction,
      frictionStatic: 0.5,
      frictionAir: 0.001,
      restitution: def.restitution,
      category: CATEGORY.BIRD,
      label: 'bird',
    });
    this.birdBodyIds.add(bird.ref.id);
    this.world.setVelocity(bird.ref, v.x, v.y);
    this.world.setAngularVelocity(bird.ref, v.x * 0.02);
    bird.launched = true;

    this.slingshot.reset();
    this.phase = 'flying';
    this.shotSettled = false;
    this.shotsFired++;
    this.settle.begin();
    this.sfx.play('launch');
    this.particles.dust(from.x, from.y);
    return true;
  }

  // ---------- 루프 ----------

  step(stepMs: number): void {
    this.world.step(stepMs);

    if (this.phase === 'presettle') {
      // 프리세틀: 입력 잠금 상태로 월드를 안정화시킨다 (R1 3단계)
      this.presettleLeft -= stepMs;
      if (this.presettleLeft <= 0) this.phase = 'aiming';
      this.pendingRemove.length = 0; // 프리세틀 중 데미지는 무시
      this.particles.update(stepMs);
      this.updateCamera();
      return;
    }

    this.flushRemovals();
    this.cullOutOfBounds();
    this.particles.update(stepMs);

    if (this.phase === 'flying' && this.settle.update(this.world, stepMs)) {
      this.shotSettled = true;
    }

    this.updateCamera();
  }

  /** SETTLING 진입 시: 전체 뷰로 복귀 */
  frameStage(): void {
    this.camera.frame(this.stage.camera.x, this.stage.camera.y, this.stage.camera.width);
  }

  private updateCamera(): void {
    const bird = this.birds.find((b) => b.launched && b.ref && this.world.has(b.ref));
    if (this.phase === 'flying' && bird?.ref) {
      const p = this.world.position(bird.ref);
      const v = this.world.velocity(bird.ref);
      this.camera.zoomTowards(this.stage.camera.width * 0.78, 0.05);
      this.camera.follow(p, v, 0.12, 14);
    } else {
      this.camera.zoomTowards(this.stage.camera.width, 0.06);
      this.camera.moveTowards(this.stage.camera.x, this.stage.camera.y, 0.08);
    }
  }

  /** SETTLING 종료 판정 (플랜 §3/§5) */
  outcome(): Outcome {
    if (this.pigsRemaining === 0) return 'clear';
    if (this.birdsRemaining === 0) return 'fail';
    return 'continue';
  }

  /** 다음 새 지급: 날아간 새의 바디를 회수하고 조준 상태로 되돌린다 */
  nextBird(): void {
    for (const b of this.birds) {
      if (b.launched && b.ref && this.world.has(b.ref)) {
        this.world.remove(b.ref);
        this.birdBodyIds.delete(b.ref.id);
        b.retired = true;
      }
    }
    this.settle.reset();
    this.shotSettled = false;
    this.slingshot.reset();
    this.phase = 'aiming';
  }

  /** 클리어 시 남은 새 보너스 (플랜 §5) */
  applyClearBonus(): number {
    const bonus = this.birdsRemaining * SCORE.BIRD_LEFT;
    this.score += bonus;
    return bonus;
  }

  stars(): number {
    return ScoreRule.starsFor(this.score, this.stage.stars);
  }

  get bodyCount(): number {
    return this.world.bodyCount;
  }

  destroy(): void {
    this.world.destroy();
    this.blocks.length = 0;
    this.pigs.length = 0;
    this.birds.length = 0;
    this.blockByBody.clear();
    this.pigByBody.clear();
    this.birdBodyIds.clear();
    this.pendingRemove.length = 0;
    this.particles.clear();
  }

  // ---------- 충돌 / 파괴 ----------

  private handleImpact = (e: ImpactEvent): void => {
    if (this.phase === 'presettle') return;

    // R1 4단계: static으로 시작한 블록을 첫 충돌에서 동적으로 전환
    if (this.staticBlocks) {
      this.wakeStatic(e.a);
      this.wakeStatic(e.b);
    }

    const strong = e.impulse > 8;
    if (strong) this.sfx.play('hit', 45);

    this.damageTarget(e.a, e.impulse, e.point);
    this.damageTarget(e.b, e.impulse, e.point);

    if (e.impulse > 14) this.particles.dust(e.point.x, e.point.y);
  };

  private wakeStatic(ref: BodyRef | null): void {
    if (!ref) return;
    const block = this.blockByBody.get(ref.id);
    if (block && this.world.isStatic(block.ref)) this.world.setStatic(block.ref, false);
  }

  private damageTarget(ref: BodyRef | null, impulse: number, point: Vec2): void {
    if (!ref) return;

    const block = this.blockByBody.get(ref.id);
    if (block && block.alive) {
      if (block.damage(impulse)) this.breakBlock(block, point);
      return;
    }

    const pig = this.pigByBody.get(ref.id);
    if (pig && pig.alive) {
      if (pig.damage(impulse)) this.killPig(pig, point);
    }
  }

  private breakBlock(block: Block, at: Vec2): void {
    this.destroyedBlocks++;
    this.score += SCORE.BLOCK;
    this.particles.burst(at.x, at.y, block.def.debris, 10, 4, 7);
    this.pendingRemove.push(block.ref);
    this.blockByBody.delete(block.ref.id);
    this.sfx.play('break', 40);
  }

  private killPig(pig: Pig, at: Vec2): void {
    this.killedPigs++;
    this.score += SCORE.PIG;
    this.particles.burst(at.x, at.y, pig.def.fill, 14, 4.5, 8);
    this.pendingRemove.push(pig.ref);
    this.pigByBody.delete(pig.ref.id);
    this.sfx.play('pig', 40);
  }

  /** 바디 제거는 collisionStart 콜백 안에서 하지 않고 스텝 뒤로 미룬다 */
  private flushRemovals(): void {
    if (this.pendingRemove.length === 0) return;
    for (const ref of this.pendingRemove) {
      if (this.world.has(ref)) this.world.remove(ref);
      this.birdBodyIds.delete(ref.id);
    }
    this.pendingRemove.length = 0;
  }

  /** 화면 밖으로 떨어진 것 정리 (돼지는 낙하로도 제거된다 — 플랜 §5) */
  private cullOutOfBounds(): void {
    const floorY = this.stage.ground.y + 420;
    const minX = -900;
    const maxX = this.stage.camera.x + 2500;

    for (const pig of this.pigs) {
      if (!pig.alive || !this.world.has(pig.ref)) continue;
      const p = this.world.position(pig.ref);
      if (p.y > floorY || p.x < minX || p.x > maxX) {
        pig.kill();
        this.killedPigs++;
        this.score += SCORE.PIG;
        this.pendingRemove.push(pig.ref);
        this.pigByBody.delete(pig.ref.id);
        this.sfx.play('pig', 40);
      }
    }

    for (const block of this.blocks) {
      if (!block.alive || !this.world.has(block.ref)) continue;
      const p = this.world.position(block.ref);
      if (p.y > floorY || p.x < minX || p.x > maxX) {
        block.alive = false;
        block.hp = 0;
        this.destroyedBlocks++;
        this.score += SCORE.BLOCK;
        this.pendingRemove.push(block.ref);
        this.blockByBody.delete(block.ref.id);
      }
    }

    for (const bird of this.birds) {
      if (!bird.ref || !this.world.has(bird.ref)) continue;
      const p = this.world.position(bird.ref);
      if (p.y > floorY || p.x < minX || p.x > maxX) {
        this.pendingRemove.push(bird.ref);
        bird.retired = true;
      }
    }

    this.flushRemovals();
  }

  /** 지면 바디 참조 (렌더러가 필요로 하지 않지만 디버그용으로 노출) */
  get ground(): BodyRef {
    return this.groundRef;
  }
}
