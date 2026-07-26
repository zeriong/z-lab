// Game 레이어: 상태 머신 + 스테이지 라이프사이클 + 점수/파괴/클리어-실패 판정.
// UI는 이 클래스의 공개 메서드(startStage/pause/resume/restart/goMain/nextStage)만 호출하고,
// 상태 변화는 eventBus 를 구독해서 받는다 (단방향).
import Matter from "matter-js";
import { PhysicsWorld, WORLD_HEIGHT } from "../core/physics";
import type { BlockPlugin, PigPlugin, BirdPlugin } from "../core/physics";
import { Camera } from "../render/camera";
import { Slingshot } from "./slingshot";
import { getStage, STAGE_COUNT } from "../data/stageLoader";
import { MATERIALS } from "../data/materials";
import { BIRDS, SPEEDY_BOOST, BOMB_RADIUS, BOMB_FORCE } from "../data/birds";
import { bus, Events } from "../eventBus";
import type { GameState, StageData, BirdType } from "../types";
import { loadProgress, markStageCleared } from "./progress";

const { Body, Vector } = Matter;

const PIG_SCORE = 500;
const REMAINING_BIRD_BONUS = 1000;
const DAMAGE_SCALE = 1.4;
const PIG_KILL_IMPACT = 25;
const SETTLE_SPEED_EPS = 0.06;
const SETTLE_TIME_MS = 900;
const MAX_WAIT_MS = 9000;
const OUT_OF_BOUNDS_MARGIN = 300;

export class Game {
  private _state: GameState = "Main";
  private canvas: HTMLCanvasElement;

  physics: PhysicsWorld | null = null;
  slingshot: Slingshot | null = null;
  camera: Camera | null = null;
  stage: StageData | null = null;

  score = 0;
  birdsLaunchedCount = 0;

  private accumulator = 0;
  private watchedBird: Matter.Body | null = null;
  private idleTimer = 0;
  private waitTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  get state(): GameState {
    return this._state;
  }

  private setState(next: GameState): void {
    this._state = next;
    bus.emit(Events.StateChanged, next);
  }

  // ---------------------------------------------------------------- Main

  goMain(): void {
    this.teardownStage();
    this.setState("Main");
  }

  // ---------------------------------------------------------------- InGame

  startStage(id: number): void {
    this.teardownStage();
    const stage = getStage(id);
    this.stage = stage;
    this.score = 0;
    this.birdsLaunchedCount = 0;
    this.watchedBird = null;
    this.idleTimer = 0;
    this.waitTimer = 0;
    this.accumulator = 0;

    this.physics = new PhysicsWorld(stage.worldWidth, stage.groundY);
    this.physics.onCollision((hit) => this.handleCollision(hit));

    for (const b of stage.blocks) this.physics.createBlock(b);
    for (const p of stage.pigs) this.physics.createPig(p);

    this.camera = new Camera(stage.worldWidth);
    this.camera.centerOn(stage.slingshotAnchor.x);

    this.slingshot = new Slingshot(this.physics, this.canvas, this.camera, stage.slingshotAnchor, {
      onLaunch: (bird, type, velocity) => this.handleLaunch(bird, type, velocity),
      onAbility: (bird, type) => this.handleAbility(bird, type),
    });
    this.slingshot.loadBird(stage.birds[0]);

    this.setState("InGame");
    bus.emit(Events.StageStarted, stage);
    bus.emit(Events.BirdReady, { type: stage.birds[0], remaining: this.birdsRemaining() });
    bus.emit(Events.ScoreChanged, this.score);
  }

  private teardownStage(): void {
    this.slingshot?.destroy();
    this.slingshot = null;
    this.physics?.destroy();
    this.physics = null;
    this.camera = null;
    this.watchedBird = null;
  }

  birdsRemaining(): number {
    if (!this.stage) return 0;
    return this.stage.birds.length - this.birdsLaunchedCount;
  }

  pigsRemaining(): number {
    if (!this.physics) return 0;
    let n = 0;
    for (const b of this.physics.allBodies()) {
      if ((b.plugin as PigPlugin | undefined)?.kind === "pig") n++;
    }
    return n;
  }

  // ---------------------------------------------------------------- Pause

  pause(): void {
    if (this._state !== "InGame") return;
    this.slingshot?.setEnabled(false);
    this.setState("Paused");
    bus.emit(Events.StagePaused);
  }

  resume(): void {
    if (this._state !== "Paused") return;
    this.slingshot?.setEnabled(true);
    this.setState("InGame");
    bus.emit(Events.StageResumed);
  }

  restart(): void {
    if (!this.stage) return;
    const id = this.stage.id;
    this.startStage(id);
  }

  nextStage(): void {
    if (!this.stage) return;
    const nextId = this.stage.id + 1;
    if (nextId > STAGE_COUNT) {
      this.goMain();
      return;
    }
    this.startStage(nextId);
  }

  // ---------------------------------------------------------------- Update loop

  update(dtMsReal: number): void {
    if (this._state !== "InGame" || !this.physics) return;

    this.accumulator += Math.min(dtMsReal, 250);
    const FIXED_DT = 1000 / 60;
    let steps = 0;
    while (this.accumulator >= FIXED_DT && steps < 5) {
      this.physics.step(FIXED_DT);
      this.accumulator -= FIXED_DT;
      steps++;
      this.postPhysicsStep(FIXED_DT);
    }

    if (this.camera && this.stage) {
      const targetX = this.watchedBird ? this.watchedBird.position.x : this.stage.slingshotAnchor.x;
      this.camera.follow(targetX, dtMsReal);
    }
  }

  private postPhysicsStep(dt: number): void {
    if (!this.physics || !this.stage) return;

    // 화면 밖으로 나간 바디 정리
    const bodies = this.physics.allBodies();
    for (const b of bodies) {
      if (b.isStatic) continue;
      const outOfBounds =
        b.position.y > this.stage.groundY + OUT_OF_BOUNDS_MARGIN ||
        b.position.x < -OUT_OF_BOUNDS_MARGIN ||
        b.position.x > this.stage.worldWidth + OUT_OF_BOUNDS_MARGIN;
      if (!outOfBounds) continue;

      const plugin = b.plugin as PigPlugin | BirdPlugin | BlockPlugin | undefined;
      if (plugin?.kind === "pig") {
        this.removePig(b);
      } else {
        if (b === this.watchedBird) this.resolveShot();
        this.physics.remove(b);
      }
    }

    if (this.watchedBird) {
      if (!bodies.includes(this.watchedBird)) {
        // 이미 위에서 제거된 경우
        this.watchedBird = null;
      } else {
        const speed = this.watchedBird.speed;
        this.waitTimer += dt;
        if (speed < SETTLE_SPEED_EPS) {
          this.idleTimer += dt;
        } else {
          this.idleTimer = 0;
        }
        if (this.idleTimer >= SETTLE_TIME_MS || this.waitTimer >= MAX_WAIT_MS) {
          this.resolveShot();
        }
      }
    }
  }

  // ---------------------------------------------------------------- Slingshot callbacks

  private handleLaunch(bird: Matter.Body, type: BirdType, _velocity: { x: number; y: number }): void {
    this.birdsLaunchedCount++;
    this.watchedBird = bird;
    this.idleTimer = 0;
    this.waitTimer = 0;
    bus.emit(Events.BirdLaunched, { type, remaining: this.birdsRemaining() });
  }

  private handleAbility(bird: Matter.Body, type: BirdType): void {
    if (!this.physics) return;
    if (type === "speedy") {
      const v = bird.velocity;
      Body.setVelocity(bird, { x: v.x * SPEEDY_BOOST, y: v.y * SPEEDY_BOOST * 0.5 });
    } else if (type === "bomb") {
      const center = bird.position;
      for (const other of this.physics.allBodies()) {
        if (other === bird || other.isStatic) continue;
        const d = Vector.sub(other.position, center);
        const dist = Vector.magnitude(d);
        if (dist > BOMB_RADIUS || dist < 1) continue;
        const falloff = 1 - dist / BOMB_RADIUS;
        const dir = Vector.normalise(d);
        Body.applyForce(other, other.position, Vector.mult(dir, BOMB_FORCE * falloff * other.mass));

        const plugin = other.plugin as PigPlugin | BlockPlugin | undefined;
        if (plugin?.kind === "pig" && dist < BOMB_RADIUS * 0.75) {
          this.removePig(other);
        } else if (plugin?.kind === "block") {
          plugin.hp -= 60 * falloff;
          if (plugin.hp <= 0) this.destroyBlock(other);
        }
      }
      bus.emit(Events.BlockDestroyed, { x: center.x, y: center.y, color: "#ff8a3d", big: true });
    }
  }

  private resolveShot(): void {
    this.watchedBird = null;
    this.idleTimer = 0;
    this.waitTimer = 0;
    if (this._state !== "InGame") return;
    if (this.pigsRemaining() <= 0) return; // Cleared 는 removePig 에서 이미 처리됨

    if (!this.stage) return;
    if (this.birdsLaunchedCount < this.stage.birds.length) {
      this.slingshot?.loadBird(this.stage.birds[this.birdsLaunchedCount]);
      bus.emit(Events.BirdReady, { type: this.stage.birds[this.birdsLaunchedCount], remaining: this.birdsRemaining() });
    } else {
      this.fail();
    }
  }

  // ---------------------------------------------------------------- Collision / destruction

  private handleCollision(hit: { bodyA: Matter.Body; bodyB: Matter.Body; impact: number }): void {
    this.applyImpact(hit.bodyA, hit.impact);
    this.applyImpact(hit.bodyB, hit.impact);
  }

  private applyImpact(body: Matter.Body, impact: number): void {
    const plugin = body.plugin as BlockPlugin | PigPlugin | undefined;
    if (!plugin) return;

    if (plugin.kind === "block") {
      plugin.hp -= impact * DAMAGE_SCALE;
      if (plugin.hp <= 0) this.destroyBlock(body);
    } else if (plugin.kind === "pig") {
      if (impact > PIG_KILL_IMPACT) this.removePig(body);
    }
  }

  private destroyBlock(body: Matter.Body): void {
    if (!this.physics) return;
    const plugin = body.plugin as BlockPlugin;
    const spec = MATERIALS[plugin.material];
    this.physics.remove(body);
    this.addScore(spec.score);
    bus.emit(Events.BlockDestroyed, { x: body.position.x, y: body.position.y, color: spec.debrisColor, big: false });
  }

  private removePig(body: Matter.Body): void {
    if (!this.physics) return;
    this.physics.remove(body);
    this.addScore(PIG_SCORE);
    bus.emit(Events.PigRemoved, { x: body.position.x, y: body.position.y });
    if (this.pigsRemaining() <= 0) this.clear();
  }

  private addScore(v: number): void {
    this.score += v;
    bus.emit(Events.ScoreChanged, this.score);
  }

  // ---------------------------------------------------------------- Cleared / Failed

  private clear(): void {
    this.watchedBird = null;
    const bonus = REMAINING_BIRD_BONUS * this.birdsRemaining();
    this.addScore(bonus);
    this.slingshot?.setEnabled(false);
    this.setState("Cleared");
    if (this.stage) markStageCleared(this.stage.id, this.score);
    bus.emit(Events.StageCleared, {
      score: this.score,
      stageId: this.stage?.id ?? 0,
      hasNext: (this.stage?.id ?? 0) < STAGE_COUNT,
    });
  }

  private fail(): void {
    this.slingshot?.setEnabled(false);
    this.setState("Failed");
    bus.emit(Events.StageFailed, { score: this.score, stageId: this.stage?.id ?? 0 });
  }
}

export { loadProgress };
