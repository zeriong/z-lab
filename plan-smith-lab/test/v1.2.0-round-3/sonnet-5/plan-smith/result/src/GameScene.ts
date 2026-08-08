import Matter from "matter-js";
import type { DebrisParticle, GameState, StageConfig, Vec2 } from "./types";
import {
  buildWorld,
  bodyGameData,
  createBird,
  createEngine,
  impulseMagnitude,
  isBodyAtRest,
  teardownWorld
} from "./physics";
import { getStage } from "./stageRegistry";
import { BLOCK_DESTROY_POINTS, PIG_REMOVE_POINTS, exceedsThreshold, starsForScore } from "./scoring";
import { SlingshotInput } from "./input";
import { LAUNCH_POWER_SCALE, MAX_DRAG_DISTANCE_PX, MIN_LAUNCH_THRESHOLD_PX } from "./input-config";
import { recordStageResult } from "./progress";
import { playSfx } from "./audio";
import { renderFrame } from "./render";

const { World, Events, Runner } = Matter;

const MAX_DEBRIS = 20; // declared arbitrary — R12 thin 정의, Step 9 QA에서 조정
const DEBRIS_TTL_MS = 600;
const PREVIEW_GRAVITY = 0.9; // declared arbitrary — 순수 시각용 프리뷰 궤적 계수, 실제 물리 중력과 별개
const PREVIEW_STEPS = 22;

export interface GameSceneCallbacks {
  onHudUpdate: (birdsRemaining: number, score: number) => void;
  onCleared: (stageId: number, score: number, stars: number, hasNextStage: boolean) => void;
  onFailed: (stageId: number) => void;
}

/**
 * R1~R26 게임 루프의 배선 지점. Load-bearing path 5홉(§plan)을 실제로 구현하는 클래스.
 */
export class GameScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: GameSceneCallbacks;

  private engine: Matter.Engine | null = null;
  private runner: Matter.Runner | null = null;
  private collisionHandler: ((event: Matter.IEventCollision<Matter.Engine>) => void) | null = null;
  private afterUpdateHandler: (() => void) | null = null;

  private stage: StageConfig | null = null;
  state: GameState = "Idle";

  private birdsRemaining = 0;
  private pigsAliveCount = 0;
  private score = 0;
  private clearFired = false;

  private currentBird: Matter.Body | null = null;
  private removedBlockIds = new Set<string>();
  private removedPigIds = new Set<string>();

  private debris: DebrisParticle[] = [];
  private trajectoryPoints: Vec2[] = [];
  private dragCurrentPos: Vec2 | null = null;

  private slingshotInput: SlingshotInput;
  private renderLoopId: number | null = null;

  constructor(canvas: HTMLCanvasElement, callbacks: GameSceneCallbacks) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D 캔버스 컨텍스트를 생성할 수 없습니다.");
    this.ctx = ctx;
    this.callbacks = callbacks;

    this.slingshotInput = new SlingshotInput(canvas, {
      getBirdPosition: () => (this.currentBird ? { x: this.currentBird.position.x, y: this.currentBird.position.y } : null),
      onDragStart: (pos) => this.handleDragStart(pos),
      onDragMove: (pos) => this.handleDragMove(pos),
      onDragEnd: (pos) => this.handleDragEnd(pos)
    });
  }

  /** hop1→2: StageSelect 클릭 이후 호출된다. 이전 world를 정리한 뒤 깨끗하게 다시 짓는다. */
  load(stageId: number): void {
    const stage = getStage(stageId);
    if (!stage) return;

    this.teardownWorldOnly();

    this.stage = stage;
    this.engine = createEngine();
    buildWorld(this.engine, stage);

    this.birdsRemaining = stage.birdLoadout;
    this.pigsAliveCount = stage.pigs.length;
    this.score = 0;
    this.clearFired = false;
    this.removedBlockIds.clear();
    this.removedPigIds.clear();
    this.debris = [];
    this.trajectoryPoints = [];
    this.dragCurrentPos = null;
    this.currentBird = null;

    this.collisionHandler = (event) => this.handleCollisionStart(event);
    this.afterUpdateHandler = () => this.handleAfterUpdate();
    Events.on(this.engine, "collisionStart", this.collisionHandler);
    Events.on(this.engine, "afterUpdate", this.afterUpdateHandler);

    this.runner = Runner.create();
    Runner.run(this.runner, this.engine);

    this.callbacks.onHudUpdate(this.birdsRemaining, this.score);
    this.spawnNextBird();

    if (this.renderLoopId === null) {
      this.startRenderLoop();
    }
  }

  /** R16 — "다시하기": teardown 후 동일 stageId로 재로드. */
  retry(): void {
    if (!this.stage) return;
    this.load(this.stage.id);
  }

  /** R17 — "메인으로": 인게임 리소스 정리(월드+렌더 루프+입력 리스너). */
  goToMain(): void {
    this.teardownWorldOnly();
    this.stopRenderLoop();
  }

  /** 인스턴스 완전 폐기(화면 전환으로 GameScene 자체가 더 이상 필요 없을 때). */
  destroy(): void {
    this.teardownWorldOnly();
    this.stopRenderLoop();
    this.slingshotInput.destroy();
  }

  /** R5/R15 — 우측 일시정지 버튼 클릭 시 호출. 물리를 완전히 정지한다. */
  pause(): void {
    if (this.state !== "ReadyToShoot" && this.state !== "Dragging" && this.state !== "InFlight") return;
    if (this.runner) Runner.stop(this.runner);
    this.state = "Paused";
    playSfx("uiClick");
  }

  private teardownWorldOnly(): void {
    if (this.runner) {
      Runner.stop(this.runner);
      this.runner = null;
    }
    if (this.engine) {
      if (this.collisionHandler) Events.off(this.engine, "collisionStart", this.collisionHandler);
      if (this.afterUpdateHandler) Events.off(this.engine, "afterUpdate", this.afterUpdateHandler);
      teardownWorld(this.engine);
      this.engine = null;
    }
    this.collisionHandler = null;
    this.afterUpdateHandler = null;
    this.currentBird = null;
    this.debris = [];
    this.trajectoryPoints = [];
    this.dragCurrentPos = null;
  }

  private spawnNextBird(): void {
    if (!this.stage || !this.engine) return;
    if (this.birdsRemaining <= 0) return;
    const anchor = this.stage.slingshotAnchor;
    const bird = createBird(anchor.x, anchor.y);
    World.add(this.engine.world, bird);
    this.currentBird = bird;
    this.state = "ReadyToShoot";
  }

  private handleDragStart(_pos: Vec2): void {
    if (this.state !== "ReadyToShoot") return;
    this.state = "Dragging";
  }

  private handleDragMove(pos: Vec2): void {
    if (this.state !== "Dragging" || !this.stage) return;
    this.dragCurrentPos = this.clampDragPos(pos);
    this.trajectoryPoints = this.simulateTrajectoryPreview(this.dragCurrentPos);
  }

  private handleDragEnd(pos: Vec2): void {
    if (this.state !== "Dragging" || !this.stage || !this.currentBird) return;
    const clamped = this.clampDragPos(pos);
    const anchor = this.stage.slingshotAnchor;
    const dx = anchor.x - clamped.x;
    const dy = anchor.y - clamped.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < MIN_LAUNCH_THRESHOLD_PX) {
      // hop4 조건 미달: 발사로 이어지지 않고 대기 상태로 복귀.
      this.dragCurrentPos = null;
      this.trajectoryPoints = [];
      this.state = "ReadyToShoot";
      return;
    }

    Matter.Body.setPosition(this.currentBird, anchor);
    Matter.Body.setVelocity(this.currentBird, { x: dx * LAUNCH_POWER_SCALE, y: dy * LAUNCH_POWER_SCALE });
    this.birdsRemaining -= 1;
    this.state = "InFlight";
    this.dragCurrentPos = null;
    this.trajectoryPoints = [];
    playSfx("launch");
    this.callbacks.onHudUpdate(this.birdsRemaining, this.score);
  }

  private clampDragPos(pos: Vec2): Vec2 {
    if (!this.stage) return pos;
    const anchor = this.stage.slingshotAnchor;
    const dx = pos.x - anchor.x;
    const dy = pos.y - anchor.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance <= MAX_DRAG_DISTANCE_PX) return pos;
    const ratio = MAX_DRAG_DISTANCE_PX / distance;
    return { x: anchor.x + dx * ratio, y: anchor.y + dy * ratio };
  }

  // R7 — 드래그 중 매 프레임 재계산되는 시각용 프리뷰(실제 중력값과는 독립된 상수 사용).
  private simulateTrajectoryPreview(dragPos: Vec2): Vec2[] {
    if (!this.stage) return [];
    const anchor = this.stage.slingshotAnchor;
    const vx = (anchor.x - dragPos.x) * LAUNCH_POWER_SCALE;
    const vy = (anchor.y - dragPos.y) * LAUNCH_POWER_SCALE;
    const points: Vec2[] = [];
    let x = anchor.x;
    let y = anchor.y;
    let velX = vx;
    let velY = vy;
    for (let i = 0; i < PREVIEW_STEPS; i++) {
      x += velX;
      y += velY;
      velY += PREVIEW_GRAVITY;
      points.push({ x, y });
    }
    return points;
  }

  private handleCollisionStart(event: Matter.IEventCollision<Matter.Engine>): void {
    if (this.state === "Paused") return;
    for (const pair of event.pairs) {
      this.processPair(pair);
    }
  }

  private processPair(pair: Matter.IPair): void {
    const dataA = bodyGameData(pair.bodyA);
    const dataB = bodyGameData(pair.bodyB);
    if (!dataA || !dataB) return;

    const impulse = impulseMagnitude(pair);
    const involvesBird = dataA.kind === "bird" || dataB.kind === "bird";

    this.tryBreakBlock(dataA, pair.bodyA, impulse);
    this.tryBreakBlock(dataB, pair.bodyB, impulse);
    this.tryKillPig(dataA, pair.bodyA, impulse);
    this.tryKillPig(dataB, pair.bodyB, impulse);

    if (involvesBird) playSfx("collision");
  }

  // R10 — 재질별 breakThreshold를 넘는 충격량이면 블록 즉시 제거.
  private tryBreakBlock(data: ReturnType<typeof bodyGameData>, body: Matter.Body, impulse: number): void {
    if (!data || data.kind !== "block" || data.breakThreshold === undefined) return;
    if (this.removedBlockIds.has(data.id)) return;
    if (!exceedsThreshold(impulse, data.breakThreshold)) return;

    this.removedBlockIds.add(data.id);
    if (this.engine) World.remove(this.engine.world, body);
    this.pushDebris(body.position.x, body.position.y, "#c7a26b");
    this.score += BLOCK_DESTROY_POINTS;
    this.callbacks.onHudUpdate(this.birdsRemaining, this.score);
  }

  // R11 — pig별 killThreshold를 넘는 충격량이면 즉시 제거.
  private tryKillPig(data: ReturnType<typeof bodyGameData>, body: Matter.Body, impulse: number): void {
    if (!data || data.kind !== "pig" || data.killThreshold === undefined) return;
    if (this.removedPigIds.has(data.id)) return;
    if (!exceedsThreshold(impulse, data.killThreshold)) return;

    this.removedPigIds.add(data.id);
    if (this.engine) World.remove(this.engine.world, body);
    this.pushDebris(body.position.x, body.position.y, "#8fbf3f");
    this.pigsAliveCount -= 1;
    this.score += PIG_REMOVE_POINTS;
    this.callbacks.onHudUpdate(this.birdsRemaining, this.score);
    playSfx("pigRemoved");
  }

  private pushDebris(x: number, y: number, color: string): void {
    this.debris.push({ x, y, color, createdAt: performance.now(), ttlMs: DEBRIS_TTL_MS });
    if (this.debris.length > MAX_DEBRIS) {
      this.debris.splice(0, this.debris.length - MAX_DEBRIS);
    }
  }

  // hop5 + R14 — afterUpdate 체커: 클리어(즉시)와 실패(비행 종료 후 정지 판정만)를 확인.
  private handleAfterUpdate(): void {
    if (this.state === "Paused" || !this.stage) return;
    this.checkClear();
    this.checkFail();
  }

  private checkClear(): void {
    if (this.pigsAliveCount > 0 || this.clearFired || !this.stage) return;
    this.clearFired = true;
    this.state = "Cleared";
    const stars = starsForScore(this.score, this.stage.parScore, true);
    recordStageResult(this.stage.id, this.score, stars);
    const hasNextStage = getStage(this.stage.id + 1) !== undefined;
    this.callbacks.onCleared(this.stage.id, this.score, stars, hasNextStage);
  }

  private checkFail(): void {
    if (this.state !== "InFlight" || !this.currentBird || !this.stage) return;
    if (!isBodyAtRest(this.currentBird)) return;
    if (this.pigsAliveCount === 0) return; // 클리어 경로에서 이미 처리됨(같은 tick 우선순위: checkClear가 먼저 호출됨)

    if (this.birdsRemaining > 0) {
      this.spawnNextBird();
    } else {
      this.state = "Failed";
      this.callbacks.onFailed(this.stage.id);
    }
  }

  private startRenderLoop(): void {
    const tick = () => {
      this.renderCurrentFrame();
      this.renderLoopId = requestAnimationFrame(tick);
    };
    this.renderLoopId = requestAnimationFrame(tick);
  }

  private stopRenderLoop(): void {
    if (this.renderLoopId !== null) {
      cancelAnimationFrame(this.renderLoopId);
      this.renderLoopId = null;
    }
  }

  private renderCurrentFrame(): void {
    if (!this.stage || !this.engine) return;
    const now = performance.now();
    this.debris = this.debris.filter((d) => now - d.createdAt < d.ttlMs);

    renderFrame({
      ctx: this.ctx,
      width: this.canvas.width,
      height: this.canvas.height,
      backgroundTint: this.stage.backgroundTint,
      world: this.engine.world,
      debris: this.debris,
      trajectoryPoints: this.trajectoryPoints,
      slingshotAnchor: this.stage.slingshotAnchor,
      isDragging: this.state === "Dragging",
      dragBirdPos: this.dragCurrentPos,
      now
    });
  }
}
