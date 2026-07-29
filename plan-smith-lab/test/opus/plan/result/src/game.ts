import Matter from 'matter-js';
import { sfx } from './audio';
import {
  BIRD_MAX_FLIGHT_MS,
  BIRD_SETTLE_MS,
  CULL_MARGIN,
  LOGICAL_H,
  LOGICAL_W,
  RELOAD_DELAY_MS,
  RESULT_DELAY_MS,
  SCORE_UNUSED_BIRD,
  SETTLE_SPEED,
  TIMESTEP,
  WORLD_SETTLE_MS,
} from './constants';
import { Effects } from './effects';
import {
  addBodies,
  attachCollisionDamage,
  clearWorld,
  createBird,
  createBlock,
  createEngine,
  createGround,
  createLeftWall,
  createPig,
  getGameData,
  launchBird,
  maxDynamicSpeed,
  removeBody,
} from './physics';
import { Renderer } from './renderer';
import { Slingshot } from './slingshot';
import { STAGES, STAGE_COUNT, getStage } from './stages';
import { drawsWorld, StateMachine, updatesPhysics } from './state';
import { Progress } from './storage';
import { UI } from './ui';
import type { GameBody, GameData, GameStateName, StageDef } from './types';

const { Composite, Vector } = Matter;

export class Game {
  private engine = createEngine();
  private renderer: Renderer;
  private ui: UI;
  private slingshot: Slingshot;
  private effects = new Effects();
  private state = new StateMachine();

  private stageIndex = 0;
  private stage: StageDef = STAGES[0];

  private pigs: GameBody[] = [];
  private blocks: GameBody[] = [];
  private loadedBird: GameBody | null = null;
  private activeBird: GameBody | null = null;
  private birdsLeft = 0;
  private score = 0;

  private pendingRemoval: GameBody[] = [];
  private trail: Matter.Vector[] = [];

  private accumulator = 0;
  private worldQuietMs = 0;
  private birdQuietMs = 0;
  private birdFlightMs = 0;
  private reloadTimer = 0;
  private resultTimer = 0;
  private pendingResult: 'CLEAR' | 'FAIL' | null = null;
  private lastTime = 0;
  private fps = 60;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas);

    this.ui = new UI({
      onStageSelect: (index) => this.startStage(index),
      onPause: () => this.pause(),
      onResume: () => this.resume(),
      onRestart: () => this.startStage(this.stageIndex),
      onToMenu: () => this.toMenu(),
      onNextStage: () => this.startStage(Math.min(STAGE_COUNT - 1, this.stageIndex + 1)),
    });

    this.slingshot = new Slingshot(canvas, {
      canAim: () => this.state.is('PLAYING') && !!this.loadedBird,
      loadedBird: () => this.loadedBird,
      onLaunch: (velocity) => this.launch(velocity),
    });

    // 충돌 데미지 핸들러는 엔진 생애 동안 단 한 번만 등록한다.
    attachCollisionDamage(this.engine, {
      onDestroyed: (body, data) => this.destroy(body, data),
      onDamaged: (_body, data, impact, at) => {
        this.effects.dust(at.x, at.y);
        if (data.material === 'glass' && impact > 12) sfx.glass();
      },
      onImpact: (impact, at) => {
        if (impact > 6) {
          sfx.thud(impact);
          this.effects.dust(at.x, at.y);
        }
      },
    });

    this.state.onChange((next) => this.syncUI(next));
    this.ui.showMenu();
    this.loadStage(0);

    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  /* ---------------- 상태 전이 ---------------- */

  private syncUI(next: GameStateName): void {
    if (next === 'MENU') this.ui.showMenu();
    else if (next === 'PLAYING') this.ui.showPlaying();
    else if (next === 'PAUSED') this.ui.showPaused();
  }

  private startStage(index: number): void {
    this.stageIndex = Math.max(0, Math.min(STAGE_COUNT - 1, index));
    this.loadStage(this.stageIndex);
    if (this.state.is('PLAYING')) this.ui.showPlaying();
    else this.state.set('PLAYING');
  }

  private pause(): void {
    if (!this.state.is('PLAYING')) return;
    this.slingshot.cancelDrag();
    this.state.set('PAUSED');
  }

  private resume(): void {
    if (!this.state.is('PAUSED')) return;
    this.state.set('PLAYING');
  }

  private toMenu(): void {
    this.slingshot.cancelDrag();
    this.state.set('MENU');
    this.loadStage(this.stageIndex);
  }

  /* ---------------- 스테이지 로딩 (StageManager) ---------------- */

  private loadStage(index: number): void {
    const stage = getStage(index);
    this.stage = stage;

    // 월드 정리 — 리스너는 엔진에 붙어 있으므로 살아남는다.
    clearWorld(this.engine);
    this.effects.clear();
    this.pendingRemoval.length = 0;
    this.trail.length = 0;

    this.blocks = stage.blocks.map(createBlock);
    this.pigs = stage.pigs.map(createPig);
    addBodies(this.engine, [createGround(), createLeftWall(), ...this.blocks, ...this.pigs]);

    this.slingshot.setAnchor(stage.slingshot.x, stage.slingshot.y);
    this.birdsLeft = stage.birds;
    this.score = 0;
    this.loadedBird = null;
    this.activeBird = null;
    this.accumulator = 0;
    this.worldQuietMs = 0;
    this.birdQuietMs = 0;
    this.birdFlightMs = 0;
    this.reloadTimer = 0;
    this.resultTimer = 0;
    this.pendingResult = null;

    this.loadBird();
    this.ui.updateHud(this.stage, this.score, this.stage.birds, this.birdsLeft);
  }

  /* ---------------- 발사체 ---------------- */

  private loadBird(): void {
    if (this.loadedBird || this.activeBird) return;
    if (this.birdsLeft <= 0) return;
    const bird = createBird(this.slingshot.anchor.x, this.slingshot.anchor.y);
    addBodies(this.engine, [bird]);
    this.loadedBird = bird;
  }

  private launch(velocity: Matter.Vector): void {
    const bird = this.loadedBird;
    if (!bird) return;
    this.loadedBird = null;
    this.activeBird = bird;
    this.birdsLeft = Math.max(0, this.birdsLeft - 1);
    this.birdQuietMs = 0;
    this.birdFlightMs = 0;
    this.trail.length = 0;
    launchBird(bird, velocity);
    sfx.launch();
    this.ui.updateHud(this.stage, this.score, this.stage.birds, this.birdsLeft);
  }

  private retireActiveBird(): void {
    if (!this.activeBird) return;
    this.queueRemoval(this.activeBird);
    this.activeBird = null;
    this.trail.length = 0;
    this.reloadTimer = RELOAD_DELAY_MS;
  }

  /* ---------------- 파괴 / 제거 ---------------- */

  private queueRemoval(body: GameBody): void {
    if (!this.pendingRemoval.includes(body)) this.pendingRemoval.push(body);
  }

  /** collisionStart 안에서 호출될 수 있으므로 월드를 직접 건드리지 않는다. */
  private destroy(body: GameBody, data: GameData): void {
    data.dead = true;
    this.score += data.score;
    this.effects.burst(body.position.x, body.position.y, data.color, data.gameType === 'pig' ? 22 : 14);
    if (data.score > 0) this.effects.score(body.position.x, body.position.y - 18, data.score);

    if (data.gameType === 'pig') sfx.pigPop();
    else if (data.material === 'glass') sfx.glass();
    else if (data.material === 'stone') sfx.stoneBreak();
    else sfx.woodBreak();

    this.queueRemoval(body);
  }

  private flushRemovals(): void {
    if (this.pendingRemoval.length === 0) return;
    for (const body of this.pendingRemoval) {
      removeBody(this.engine, body);
      this.pigs = this.pigs.filter((p) => p !== body);
      this.blocks = this.blocks.filter((b) => b !== body);
      if (this.activeBird === body) {
        this.activeBird = null;
        this.trail.length = 0;
        this.reloadTimer = RELOAD_DELAY_MS;
      }
      if (this.loadedBird === body) this.loadedBird = null;
    }
    this.pendingRemoval.length = 0;
    this.ui.updateHud(this.stage, this.score, this.stage.birds, this.birdsLeft);
  }

  /** 화면을 벗어난 바디는 제거한다(안정 판정을 막지 않도록). */
  private cullOutOfBounds(): void {
    for (const body of Composite.allBodies(this.engine.world)) {
      if (body.isStatic) continue;
      const { x, y } = body.position;
      const out = x < -CULL_MARGIN || x > LOGICAL_W + CULL_MARGIN || y > LOGICAL_H + CULL_MARGIN;
      if (!out) continue;
      const data = getGameData(body as GameBody);
      if (data && !data.dead && (data.gameType === 'pig' || data.gameType === 'block')) {
        this.destroy(body as GameBody, data);
      } else {
        this.queueRemoval(body as GameBody);
      }
    }
  }

  /* ---------------- 판정 ---------------- */

  private updateTimers(elapsedMs: number): void {
    const quiet = maxDynamicSpeed(this.engine) < SETTLE_SPEED;
    this.worldQuietMs = quiet ? this.worldQuietMs + elapsedMs : 0;

    if (this.activeBird) {
      this.birdFlightMs += elapsedMs;
      const speed = Vector.magnitude(this.activeBird.velocity);
      this.birdQuietMs = speed < SETTLE_SPEED ? this.birdQuietMs + elapsedMs : 0;
      if (this.birdQuietMs >= BIRD_SETTLE_MS || this.birdFlightMs >= BIRD_MAX_FLIGHT_MS) {
        this.retireActiveBird();
      }
    } else if (this.reloadTimer > 0) {
      this.reloadTimer -= elapsedMs;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        if (!this.pendingResult) this.loadBird();
      }
    }
  }

  private judge(elapsedMs: number): void {
    if (this.pendingResult) {
      this.resultTimer -= elapsedMs;
      if (this.resultTimer <= 0) this.commitResult(this.pendingResult);
      return;
    }

    // 클리어: 살아있는 돼지 0
    if (this.pigs.length === 0) {
      this.pendingResult = 'CLEAR';
      this.resultTimer = RESULT_DELAY_MS;
      this.score += this.birdsLeft * SCORE_UNUSED_BIRD;
      this.slingshot.cancelDrag();
      this.ui.updateHud(this.stage, this.score, this.stage.birds, this.birdsLeft);
      return;
    }

    // 실패: 새 소진 + 월드 안정 + 돼지 잔존
    const noBirds = this.birdsLeft <= 0 && !this.activeBird && !this.loadedBird;
    if (noBirds && this.worldQuietMs >= WORLD_SETTLE_MS) {
      this.pendingResult = 'FAIL';
      this.resultTimer = RESULT_DELAY_MS;
    }
  }

  private commitResult(kind: 'CLEAR' | 'FAIL'): void {
    this.pendingResult = null;
    this.resultTimer = 0;
    if (!this.state.set(kind)) return;

    const hasNext = this.stageIndex < STAGE_COUNT - 1;
    if (kind === 'CLEAR') {
      Progress.saveClear(this.stage.id, this.score);
      sfx.clear();
    } else {
      sfx.fail();
    }
    this.ui.showResult(kind, this.stage, this.score, kind === 'CLEAR' && hasNext);
  }

  /* ---------------- 루프 ---------------- */

  private frame = (now: number): void => {
    const dtMs = Math.min(100, now - this.lastTime);
    this.lastTime = now;
    this.fps = this.fps * 0.9 + (1000 / Math.max(1, dtMs)) * 0.1;

    if (updatesPhysics(this.state.current)) {
      this.step(dtMs);
      this.effects.update(dtMs / 1000);
    }

    this.draw();
    this.ui.setFps(this.fps);
    requestAnimationFrame(this.frame);
  };

  private step(dtMs: number): void {
    this.accumulator += dtMs;
    let steps = 0;
    while (this.accumulator >= TIMESTEP && steps < 5) {
      Matter.Engine.update(this.engine, TIMESTEP);
      this.accumulator -= TIMESTEP;
      steps++;
      this.flushRemovals();
    }
    if (steps >= 5) this.accumulator = 0;
    if (steps === 0) return;

    const elapsed = steps * TIMESTEP;
    this.cullOutOfBounds();
    this.flushRemovals();

    if (this.activeBird) {
      this.trail.push({ x: this.activeBird.position.x, y: this.activeBird.position.y });
      if (this.trail.length > 46) this.trail.shift();
    }

    this.updateTimers(elapsed);
    this.flushRemovals();
    this.judge(elapsed);
  }

  private draw(): void {
    const { renderer } = this;
    const onMenu = this.state.is('MENU');
    renderer.begin();
    renderer.drawBackground(onMenu ? null : this.stage);
    renderer.drawGround(onMenu ? null : this.stage);

    if (drawsWorld(this.state.current)) {
      renderer.drawSlingshot(
        this.slingshot.anchor,
        this.loadedBird ? this.loadedBird.position : null,
        this.slingshot.dragging,
      );
      renderer.drawFlightTrail(this.trail);
      renderer.drawBodies(Composite.allBodies(this.engine.world));
      renderer.drawTrajectory(this.slingshot.trajectory());
      this.effects.draw(renderer.ctx);
      if (this.state.is('PAUSED')) renderer.drawPauseVeil();
    }

    renderer.end();
  }
}
