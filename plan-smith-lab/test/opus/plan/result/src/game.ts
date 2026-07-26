// Core game orchestrator: Matter.js physics + state machine + slingshot input +
// collision/damage + clear/fail detection + scoring + the 10-stage manager.
// Rendering is delegated to Renderer; menus/HUD/overlays to UI.

import * as Matter from 'matter-js';
import {
  W, H, GROUND_Y, GRAVITY_Y, MAX_PULL, LAUNCH_POWER, BIRD_RADIUS,
  IMPACT_MIN, IMPACT_SCALE, SETTLE_SPEED, SETTLE_HOLD,
  GameState, BodyMeta, MATERIALS, StageData,
} from './types';
import { STAGES } from './stages';
import { Renderer, AimState } from './render';
import { UI, Progress } from './ui';

const FIXED = 1 / 60;              // physics timestep (seconds)
const FIXED_MS = 1000 / 60;
const GRAB_RADIUS = 95;            // how close the pointer must be to grab the bird
const PIG_KILL_SCORE = 5000;
const BLOCK_SCORE = 500;
const UNUSED_BIRD_BONUS = 1000;
const PROGRESS_KEY = 'angrybirds.progress.v1';

type BirdState = 'ready' | 'aiming' | 'flying' | null;

export class Game {
  private engine: Matter.Engine;
  private world: Matter.World;
  private renderer: Renderer;
  private ui: UI;

  state: GameState = 'MENU';
  private stageIndex = 0;
  private stage!: StageData;

  private meta = new Map<number, BodyMeta>();
  private deadQueue = new Set<number>();

  private bird: Matter.Body | null = null;
  private birdState: BirdState = null;
  private birdsQueued = 0;         // shots still waiting (excludes the loaded one)
  private flightTime = 0;
  private birdRestTimer = 0;

  private dragging = false;
  private aimPull = { x: 0, y: 0 }; // clamped pull offset from the anchor

  private pigCount = 0;
  private score = 0;
  private settleTimer = 0;

  private gStep = 0.44;            // per-step gravity delta, calibrated at init
  private lastTime = 0;
  private acc = 0;
  private fps = 60;

  constructor(root: HTMLElement) {
    this.ui = new UI(root, {
      onSelectStage: (i) => this.startStage(i),
      onPause: () => this.pause(),
      onResume: () => this.resume(),
      onRestart: () => this.restart(),
      onMenu: () => this.toMenu(),
      onNext: () => this.nextStage(),
    });

    this.engine = Matter.Engine.create();
    this.engine.gravity.y = GRAVITY_Y;
    this.engine.enableSleeping = true;
    this.world = this.engine.world;

    this.renderer = new Renderer(this.ui.canvas);
    this.calibrateGravity();

    Matter.Events.on(this.engine, 'collisionStart', (e) => this.onCollision(e));
    this.bindInput();
    this.exposeDebug();

    this.toMenu();
    requestAnimationFrame((t) => this.loop(t));

    if (location.search.includes('selftest')) this.runSelfTest();
    const demo = location.search.match(/demo=(\d+)/);
    if (demo) {
      this.startStage(Math.max(0, Math.min(STAGES.length - 1, +demo[1] - 1)));
      if (location.search.includes('pause')) this.pause();
    }
  }

  /**
   * Headless self-check used for automated verification (only when the page is
   * loaded with ?selftest). Confirms all 10 stages build, that a fired bird
   * clears the open stage 1 (full collision -> pig death -> CLEAR chain), and
   * that shots damage a structured stage. Result is written to document.title.
   */
  private runSelfTest(): void {
    const runShots = (steps: number) => {
      for (let s = 0; s < steps && this.state === 'PLAYING'; s++) {
        Matter.Engine.update(this.engine, FIXED_MS);
        this.flushDead();
        this.step(FIXED);
      }
    };
    const livePigHp = (): number => {
      let hp = Infinity;
      for (const m of this.meta.values()) if (m.kind === 'pig') hp = Math.min(hp, m.hp);
      return hp === Infinity ? 0 : hp;
    };

    // 1) all stages build with the right number of pigs
    let builtOk = 0;
    for (let i = 0; i < STAGES.length; i++) {
      this.startStage(i);
      if (this.pigCount === STAGES[i].pigs.length && this.pigCount > 0) builtOk++;
    }

    // 2) stage 1 clear chain — brute-force launch onto the open pig
    let cleared = false, clearInfo = '';
    let minHp = 999;
    outer:
    for (const speed of [26, 24, 22, 20, 18]) {
      for (let deg = -55; deg <= 5; deg += 5) {
        this.startStage(0);
        const rad = (deg * Math.PI) / 180;
        this.fire(speed * Math.cos(rad), speed * Math.sin(rad));
        for (let s = 0; s < 340 && this.state === 'PLAYING'; s++) {
          Matter.Engine.update(this.engine, FIXED_MS);
          this.flushDead();
          this.step(FIXED);
        }
        if (this.state === 'CLEAR') { cleared = true; clearInfo = `s${speed}d${deg}`; break outer; }
        minHp = Math.min(minHp, livePigHp());
      }
    }

    // 3) FAIL path — fire all birds harmlessly straight up, expect FAIL
    this.startStage(0);
    let guard = 0;
    while (this.state === 'PLAYING' && guard < 4000) {
      if (this.birdState === 'ready') this.fire(0, -30);
      Matter.Engine.update(this.engine, FIXED_MS);
      this.flushDead();
      this.step(FIXED);
      guard++;
    }
    const failWorks = this.state === 'FAIL';

    // 4) HUMAN INPUT PATH — synthesize a real drag through the pointer handlers.
    // Drag down-left of the anchor and release; expect launch up-right (+x,-y).
    this.startStage(0);
    const rect = this.ui.canvas.getBoundingClientRect();
    const toClient = (lx: number, ly: number) => ({
      clientX: rect.left + (lx * rect.width) / W,
      clientY: rect.top + (ly * rect.height) / H,
      preventDefault() {},
    });
    const anchor = this.stage.slingshot;
    this.onPointerDown(toClient(anchor.x, anchor.y) as unknown as PointerEvent);
    const grabbed = this.birdState === 'aiming';
    this.onPointerMove(toClient(anchor.x - 90, anchor.y + 70) as unknown as PointerEvent);
    this.onPointerUp();
    const vx = this.bird ? this.bird.velocity.x : 0;
    const vy = this.bird ? this.bird.velocity.y : 0;
    const dragWorks = grabbed && this.birdState === 'flying' && vx > 0 && vy < 0;

    // 5) PER-STAGE reachability — can any shot kill at least one pig on each stage?
    const combos: [number, number][] = [[24, -25], [26, -15], [22, -35], [24, -45]];
    let killable = 0, autoCleared = 0;
    const zeroKill: number[] = [];
    for (let i = 0; i < STAGES.length; i++) {
      const initial = STAGES[i].pigs.length;
      let best = initial;
      for (const [sp, dg] of combos) {
        this.startStage(i);
        let g = 0;
        while (this.state === 'PLAYING' && g < 1400) {
          if (this.birdState === 'ready') {
            const r = (dg * Math.PI) / 180;
            this.fire(sp * Math.cos(r), sp * Math.sin(r));
          }
          Matter.Engine.update(this.engine, FIXED_MS);
          this.flushDead();
          this.step(FIXED);
          g++;
        }
        best = Math.min(best, this.pigCount);
        if (best === 0) break;
      }
      if (best < initial) killable++; else zeroKill.push(i + 1);
      if (best === 0) autoCleared++;
    }

    this.toMenu();
    const pass = builtOk === STAGES.length && cleared && failWorks && dragWorks && killable === STAGES.length;
    document.title = `ST ${pass ? 'PASS' : 'FAIL'} build=${builtOk}/10 drag=${dragWorks}(vx=${vx.toFixed(1)},vy=${vy.toFixed(1)}) clr1=${cleared} fail=${failWorks} killable=${killable}/10 autoclear=${autoCleared} zeroKill=[${zeroKill.join(',')}]`;
  }

  // ---- setup helpers ------------------------------------------------------

  /** Measure the actual per-step gravity increment so the aim guide matches. */
  private calibrateGravity(): void {
    const probe = Matter.Bodies.circle(-800, -800, 5, {});
    Matter.World.add(this.world, probe);
    Matter.Engine.update(this.engine, FIXED_MS);
    this.gStep = probe.velocity.y || this.gStep;
    Matter.World.remove(this.world, probe);
  }

  private loadProgress(): Progress {
    const empty: Progress = {
      cleared: STAGES.map(() => false),
      stars: STAGES.map(() => 0),
    };
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return empty;
      const p = JSON.parse(raw);
      if (Array.isArray(p.cleared) && Array.isArray(p.stars)) {
        return {
          cleared: STAGES.map((_, i) => !!p.cleared[i]),
          stars: STAGES.map((_, i) => p.stars[i] | 0),
        };
      }
    } catch { /* ignore corrupt storage */ }
    return empty;
  }

  private saveProgress(index: number, stars: number): void {
    const p = this.loadProgress();
    p.cleared[index] = true;
    p.stars[index] = Math.max(p.stars[index], stars);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch { /* ignore */ }
  }

  // ---- world / stage management -------------------------------------------

  private clearWorld(): void {
    Matter.World.clear(this.world, false);
    this.meta.clear();
    this.deadQueue.clear();
    this.bird = null;
    this.birdState = null;
  }

  private buildStage(stage: StageData): void {
    this.clearWorld();

    // static boundaries (ground + side walls; not drawn, not damageable)
    const ground = Matter.Bodies.rectangle(W / 2, (GROUND_Y + H) / 2, W, H - GROUND_Y, { isStatic: true, friction: 0.9 });
    const leftWall = Matter.Bodies.rectangle(-40, H / 2, 80, H * 2, { isStatic: true });
    const rightWall = Matter.Bodies.rectangle(W + 40, H / 2, 80, H * 2, { isStatic: true });
    for (const b of [ground, leftWall, rightWall]) {
      this.meta.set(b.id, { kind: 'ground', hp: Infinity, maxHp: Infinity });
    }
    Matter.World.add(this.world, [ground, leftWall, rightWall]);

    // blocks
    for (const spec of stage.blocks) {
      const def = MATERIALS[spec.material];
      const body = Matter.Bodies.rectangle(spec.x, spec.y, spec.w, spec.h, {
        density: def.density,
        restitution: def.restitution,
        friction: def.friction,
        angle: spec.angle ?? 0,
      });
      this.meta.set(body.id, {
        kind: 'block', material: spec.material,
        hp: def.hp, maxHp: def.hp, w: spec.w, h: spec.h,
      });
      Matter.World.add(this.world, body);
    }

    // pigs
    this.pigCount = 0;
    for (const spec of stage.pigs) {
      const r = spec.r ?? 22;
      const hp = spec.hp ?? 50;
      const body = Matter.Bodies.circle(spec.x, spec.y, r, {
        density: 0.005, restitution: 0.2, friction: 0.6,
      });
      this.meta.set(body.id, { kind: 'pig', hp, maxHp: hp, r });
      Matter.World.add(this.world, body);
      this.pigCount++;
    }

    this.birdsQueued = stage.birds;
    this.score = 0;
    this.settleTimer = 0;
    this.loadNextBird();
  }

  private loadNextBird(): void {
    if (this.birdsQueued > 0) {
      this.birdsQueued--;
      // Create the bird dynamic, THEN freeze it with setStatic(true). A body born
      // static never stores its real mass, so a later setStatic(false) would leave
      // it infinite-mass and the integrator produces NaN. Freezing a dynamic body
      // saves the original mass so releasing it on launch restores real physics.
      const b = Matter.Bodies.circle(this.stage.slingshot.x, this.stage.slingshot.y, BIRD_RADIUS, {
        density: 0.01, restitution: 0.35, friction: 0.4,
      });
      Matter.Body.setStatic(b, true);
      this.meta.set(b.id, { kind: 'bird', hp: Infinity, maxHp: Infinity, r: BIRD_RADIUS });
      Matter.World.add(this.world, b);
      this.bird = b;
      this.birdState = 'ready';
      this.aimPull = { x: 0, y: 0 };
    } else {
      this.bird = null;
      this.birdState = null;
    }
    this.refreshHud();
  }

  // ---- input / slingshot --------------------------------------------------

  private bindInput(): void {
    const canvas = this.ui.canvas;
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.state !== 'PLAYING' || this.birdState !== 'ready' || !this.bird) return;
    const p = this.renderer.toLogical(e.clientX, e.clientY);
    const dx = p.x - this.bird.position.x;
    const dy = p.y - this.bird.position.y;
    if (Math.hypot(dx, dy) > GRAB_RADIUS) return;
    this.dragging = true;
    this.birdState = 'aiming';
    e.preventDefault();
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.dragging || this.birdState !== 'aiming' || !this.bird) return;
    const p = this.renderer.toLogical(e.clientX, e.clientY);
    const anchor = this.stage.slingshot;
    let dx = p.x - anchor.x;
    let dy = p.y - anchor.y;
    const len = Math.hypot(dx, dy);
    if (len > MAX_PULL) { dx = (dx / len) * MAX_PULL; dy = (dy / len) * MAX_PULL; }
    this.aimPull = { x: dx, y: dy };
    Matter.Body.setPosition(this.bird, { x: anchor.x + dx, y: anchor.y + dy });
  }

  private onPointerUp(): void {
    if (!this.dragging || this.birdState !== 'aiming' || !this.bird) return;
    this.dragging = false;
    const pull = this.aimPull;
    const pullLen = Math.hypot(pull.x, pull.y);
    if (pullLen < 10) {
      // treat as a cancel — snap back to the anchor
      Matter.Body.setPosition(this.bird, { x: this.stage.slingshot.x, y: this.stage.slingshot.y });
      this.birdState = 'ready';
      return;
    }
    this.fire(-pull.x * LAUNCH_POWER, -pull.y * LAUNCH_POWER);
  }

  private fire(vx: number, vy: number): void {
    if (!this.bird) return;
    Matter.Body.setStatic(this.bird, false);
    Matter.Body.setVelocity(this.bird, { x: vx, y: vy });
    Matter.Body.setAngularVelocity(this.bird, 0.05);
    this.birdState = 'flying';
    this.flightTime = 0;
    this.birdRestTimer = 0;
    this.refreshHud();
  }

  /** Predicted flight path as dots, integrated with the calibrated gravity. */
  private trajectory(): { x: number; y: number }[] {
    if (this.birdState !== 'aiming') return [];
    const anchor = this.stage.slingshot;
    let px = anchor.x + this.aimPull.x;
    let py = anchor.y + this.aimPull.y;
    let vx = -this.aimPull.x * LAUNCH_POWER;
    let vy = -this.aimPull.y * LAUNCH_POWER;
    const pts: { x: number; y: number }[] = [];
    for (let step = 0; step < 46 && pts.length < 14; step++) {
      px += vx; py += vy; vy += this.gStep;
      if (py > GROUND_Y - 4 || px > W || px < 0) break;
      if (step % 3 === 0) pts.push({ x: px, y: py });
    }
    return pts;
  }

  // ---- collision / damage -------------------------------------------------

  private onCollision(event: Matter.IEventCollision<Matter.Engine>): void {
    if (this.state !== 'PLAYING') return;
    for (const pair of event.pairs) {
      const a = pair.bodyA, b = pair.bodyB;
      const relSpeed = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
      if (relSpeed <= IMPACT_MIN) continue;
      const dmg = (relSpeed - IMPACT_MIN) * IMPACT_SCALE;
      this.damage(a, dmg);
      this.damage(b, dmg);
    }
  }

  private damage(body: Matter.Body, amount: number): void {
    const m = this.meta.get(body.id);
    if (!m || (m.kind !== 'pig' && m.kind !== 'block')) return;
    m.hp -= amount;
    if (m.hp <= 0) this.deadQueue.add(body.id);
  }

  private flushDead(): void {
    if (this.deadQueue.size === 0) return;
    for (const id of this.deadQueue) {
      const m = this.meta.get(id);
      if (!m) continue;
      const body = this.findBody(id);
      if (body) Matter.World.remove(this.world, body);
      this.meta.delete(id);
      if (m.kind === 'pig') { this.pigCount--; this.score += PIG_KILL_SCORE; }
      else if (m.kind === 'block') { this.score += BLOCK_SCORE; }
    }
    this.deadQueue.clear();
    this.refreshHud();
  }

  private findBody(id: number): Matter.Body | undefined {
    return Matter.Composite.allBodies(this.world).find((b) => b.id === id);
  }

  // ---- per-step game logic ------------------------------------------------

  private step(dt: number): void {
    // resolve the flying bird once it leaves the field or comes to rest
    if (this.birdState === 'flying' && this.bird) {
      this.flightTime += dt;
      const b = this.bird;
      const off = b.position.x < -60 || b.position.x > W + 60 || b.position.y > H + 80;
      if (b.speed < SETTLE_SPEED) this.birdRestTimer += dt; else this.birdRestTimer = 0;
      if (off || this.birdRestTimer > 0.6 || this.flightTime > 9) {
        Matter.World.remove(this.world, b);
        this.meta.delete(b.id);
        this.bird = null;
        this.birdState = null;
        this.loadNextBird();
      }
    }

    // CLEAR — all pigs gone
    if (this.pigCount <= 0) { this.onClear(); return; }

    // FAIL — no birds left to shoot and the world has come to rest
    if (this.birdState === null && this.bird === null && this.pigCount > 0) {
      const maxSpeed = this.maxDynamicSpeed();
      if (maxSpeed < SETTLE_SPEED) this.settleTimer += dt; else this.settleTimer = 0;
      if (this.settleTimer > SETTLE_HOLD) this.onFail();
    }
  }

  private maxDynamicSpeed(): number {
    let max = 0;
    for (const b of Matter.Composite.allBodies(this.world)) {
      if (b.isStatic) continue;
      if (b.speed > max) max = b.speed;
    }
    return max;
  }

  // ---- state transitions --------------------------------------------------

  startStage(index: number): void {
    this.stageIndex = Math.max(0, Math.min(STAGES.length - 1, index));
    this.stage = STAGES[this.stageIndex];
    this.buildStage(this.stage);
    this.state = 'PLAYING';
    this.ui.showPlaying();
    this.refreshHud();
  }

  private pause(): void {
    if (this.state !== 'PLAYING') return;
    this.state = 'PAUSED';
    this.ui.showPaused();
  }

  private resume(): void {
    if (this.state !== 'PAUSED') return;
    this.state = 'PLAYING';
    this.ui.showPlaying();
  }

  private restart(): void {
    this.startStage(this.stageIndex);
  }

  private toMenu(): void {
    this.state = 'MENU';
    this.clearWorld();
    this.ui.showMenu(this.loadProgress());
  }

  private nextStage(): void {
    if (this.stageIndex + 1 < STAGES.length) this.startStage(this.stageIndex + 1);
    else this.toMenu();
  }

  private computeStars(finalScore: number): number {
    const t = this.stage.starThresholds;
    if (!t) return 3;
    if (finalScore >= t[2]) return 3;
    if (finalScore >= t[1]) return 2;
    if (finalScore >= t[0]) return 1;
    return 1;
  }

  private onClear(): void {
    if (this.state !== 'PLAYING') return;
    const unused = this.birdsQueued + (this.birdState === 'ready' || this.birdState === 'aiming' ? 1 : 0);
    this.score += unused * UNUSED_BIRD_BONUS;
    const stars = this.computeStars(this.score);
    this.saveProgress(this.stageIndex, stars);
    this.state = 'CLEAR';
    this.ui.showClear({
      stageIndex: this.stageIndex,
      score: this.score,
      stars,
      isLast: this.stageIndex === STAGES.length - 1,
    });
  }

  private onFail(): void {
    if (this.state !== 'PLAYING') return;
    this.state = 'FAIL';
    this.ui.showFail();
  }

  private refreshHud(): void {
    if (!this.stage) return;
    const birds = this.birdsQueued + (this.birdState === 'ready' || this.birdState === 'aiming' ? 1 : 0);
    this.ui.updateHud(this.stage.name, this.stage.id, birds, this.score);
  }

  // ---- main loop ----------------------------------------------------------

  private loop(now: number): void {
    const dt = this.lastTime ? (now - this.lastTime) / 1000 : 0;
    this.lastTime = now;
    if (dt > 0) this.fps = this.fps * 0.9 + (1 / dt) * 0.1;

    if (this.state === 'PLAYING') {
      this.acc += Math.min(dt, 0.1);
      let steps = 0;
      while (this.acc >= FIXED && steps < 5) {
        Matter.Engine.update(this.engine, FIXED_MS);
        this.flushDead();
        this.step(FIXED);
        this.acc -= FIXED;
        steps++;
        if (this.state !== 'PLAYING') { this.acc = 0; break; }
      }
    }

    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  private render(): void {
    if (!this.stage || this.state === 'MENU') return;
    const aim: AimState | null =
      this.birdState === 'aiming' && this.bird
        ? {
            anchor: this.stage.slingshot,
            birdPos: { x: this.bird.position.x, y: this.bird.position.y },
            points: this.trajectory(),
          }
        : null;
    this.renderer.draw({
      stage: this.stage,
      bodies: Matter.Composite.allBodies(this.world),
      meta: this.meta,
      slingshot: this.stage.slingshot,
      aim,
    });
  }

  // ---- debug hooks (used for automated verification) ----------------------

  private exposeDebug(): void {
    (window as any).__game = this;
    (window as any).__debug = {
      loadStage: (i: number) => this.startStage(i),
      state: () => this.state,
      pigs: () => this.pigCount,
      birds: () => this.birdsQueued + (this.birdState === 'ready' ? 1 : 0),
      fps: () => Math.round(this.fps),
      stageCount: () => STAGES.length,
      bodyCount: () => Matter.Composite.allBodies(this.world).length,
      // fire the loaded bird with an explicit velocity (game units)
      fire: (vx: number, vy: number) => { if (this.birdState === 'ready') this.fire(vx, vy); },
      // advance the simulation deterministically (independent of requestAnimationFrame)
      tick: (n = 180) => {
        for (let i = 0; i < n; i++) {
          if (this.state !== 'PLAYING') break;
          Matter.Engine.update(this.engine, FIXED_MS);
          this.flushDead();
          this.step(FIXED);
        }
        return { state: this.state, pigs: this.pigCount };
      },
      // aim from the anchor toward a target point at a given pull fraction (0..1)
      aimAt: (tx: number, ty: number, pull = 1) => {
        if (this.birdState !== 'ready') return false;
        const a = this.stage.slingshot;
        let dx = tx - a.x, dy = ty - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const draw = MAX_PULL * Math.max(0, Math.min(1, pull));
        this.fire((dx / len) * draw * LAUNCH_POWER, (dy / len) * draw * LAUNCH_POWER);
        return true;
      },
    };
  }
}
