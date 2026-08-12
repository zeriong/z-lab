import { Camera } from './Camera';
import { Input, type PointerSample } from './Input';
import { Loop } from './Loop';
import { StateMachine } from './StateMachine';
import { Storage } from './Storage';
import { LEVELS, LEVEL_COUNT, getLevel } from '../data/levels';
import { Level, type LevelEvents, type LevelResult, type RoundPhase } from '../game/Level';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type { DebugInfo } from '../render/DebugRender';
import { Particles } from '../render/Particles';
import { Renderer } from '../render/Renderer';
import { Screens, type UiAction } from '../ui/Screens';
import { Sfx } from '../audio/Sfx';

/**
 * Root controller (plan §2.1). Owns the state machine, the loop, and the
 * lifetime of the physics world. Nothing else is allowed to create or destroy
 * a Level — restart/next-stage/back-to-menu all funnel through startLevel()
 * and teardownLevel() so there is exactly one teardown path.
 */
export class Game {
  private readonly renderer: Renderer;
  private readonly screens: Screens;
  private readonly camera = new Camera();
  private readonly particles = new Particles(700);
  private readonly storage: Storage;
  private readonly sfx = new Sfx();
  private readonly loop: Loop;
  private readonly input: Input;
  private readonly fsm: StateMachine;

  private physics: PhysicsWorld | null = null;
  private level: Level | null = null;
  private currentLevelId = 1;

  private debugEnabled = false;
  private readonly trail: Array<{ x: number; y: number }> = [];

  private panning = false;
  private panLastX = 0;
  private panLastY = 0;
  private manualCamera = false;

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.storage = new Storage(LEVEL_COUNT);
    this.sfx.setEnabled(this.storage.soundEnabled);

    this.renderer = new Renderer(canvas, uiRoot);
    this.screens = new Screens(uiRoot, (action) => this.onUiAction(action));

    this.fsm = new StateMachine('BOOT', { strict: import.meta.env.DEV });

    this.loop = new Loop(
      (dt) => this.fixedUpdate(dt),
      (alpha) => this.render(alpha),
    );

    this.input = new Input(canvas, (cx, cy) => this.renderer.clientToLogical(cx, cy), {
      onPointerDown: (p) => this.onPointerDown(p),
      onPointerMove: (p) => this.onPointerMove(p),
      onPointerUp: (p) => this.onPointerUp(p),
      onPointerCancel: () => this.onPointerCancel(),
      onKeyDown: (key, event) => this.onKeyDown(key, event),
    });

    try {
      this.debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
    } catch {
      this.debugEnabled = false;
    }

    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  start(): void {
    this.input.attach();
    this.loop.start();
    this.fsm.go('MAIN_MENU');
    this.showMainMenu();
  }

  /** Not used by the app shell, but keeps the object honest about teardown. */
  destroy(): void {
    this.loop.stop();
    this.input.detach();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.teardownLevel();
  }

  // ------------------------------------------------------------------ loop

  private fixedUpdate(dt: number): void {
    const simulating = this.fsm.is('PLAYING', 'LEVEL_CLEAR', 'LEVEL_FAIL');
    if (simulating && this.physics && this.level) {
      // Order matters: step, then read the collisions the step produced.
      this.physics.step(dt);
      this.level.fixedUpdate();
      this.particles.update();

      if (!this.manualCamera) {
        const target = this.level.getCameraTarget();
        this.camera.moveTo(target.x, target.y, target.zoom, target.lerp);
      }

      if (this.debugEnabled) {
        const bird = this.level.activeBird;
        if (bird?.launched) {
          this.trail.push({ x: bird.x, y: bird.y });
          if (this.trail.length > 400) this.trail.shift();
        }
      }
    }
    this.camera.update();
  }

  private render(alpha: number): void {
    this.screens.hud.tick();
    this.renderer.render({
      level: this.level,
      camera: this.camera,
      particles: this.particles,
      alpha,
      debug: this.buildDebugInfo(),
    });
  }

  private buildDebugInfo(): DebugInfo | null {
    if (!this.debugEnabled || !this.physics || !this.level) return null;
    const level = this.level;
    return {
      shapes: this.physics.getDebugShapes(),
      trail: this.trail,
      lines: [
        `state   ${this.fsm.state}  phase ${level.phase}`,
        `fps     ${this.loop.fps}  steps/frame ${this.loop.lastStepCount}`,
        `bodies  ${this.physics.bodyCount}  particles ${this.particles.activeCount}`,
        `pigs    ${level.pigsRemaining}  birds ${level.birdsRemaining}`,
        `camera  x=${this.camera.x.toFixed(0)} zoom=${this.camera.zoom.toFixed(2)}`,
        `score   ${level.score.total}`,
      ],
    };
  }

  // ----------------------------------------------------------------- input

  private onPointerDown(p: PointerSample): void {
    this.sfx.unlock();
    if (!this.fsm.is('PLAYING') || !this.level) return;

    const world = this.camera.screenToWorld(p.x, p.y);
    const consumed = this.level.pointerDown(world.x, world.y);
    if (!consumed) {
      // Empty space: scout the structure by panning (plan §5.3).
      this.panning = true;
      this.panLastX = p.x;
      this.panLastY = p.y;
    }
  }

  private onPointerMove(p: PointerSample): void {
    if (!this.fsm.is('PLAYING') || !this.level) return;

    if (this.panning) {
      const dx = p.x - this.panLastX;
      const dy = p.y - this.panLastY;
      this.panLastX = p.x;
      this.panLastY = p.y;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) {
        this.manualCamera = true;
        this.camera.panBy(dx, dy);
      }
      return;
    }

    const world = this.camera.screenToWorld(p.x, p.y);
    this.level.pointerMove(world.x, world.y);
  }

  private onPointerUp(_p: PointerSample): void {
    if (this.panning) {
      this.panning = false;
      return;
    }
    if (!this.fsm.is('PLAYING') || !this.level) return;
    this.level.pointerUp();
  }

  private onPointerCancel(): void {
    this.panning = false;
    this.level?.cancelAim();
  }

  private onKeyDown(key: string, event: KeyboardEvent): void {
    switch (key) {
      case 'Escape':
      case 'p':
      case 'P': {
        if (this.fsm.is('PLAYING')) {
          event.preventDefault();
          this.pause();
        } else if (this.fsm.is('PAUSED')) {
          event.preventDefault();
          this.resume();
        }
        break;
      }
      case '`': {
        this.debugEnabled = !this.debugEnabled;
        this.trail.length = 0;
        break;
      }
      default:
        break;
    }
  }

  private onResize = (): void => {
    this.renderer.resize();
  };

  /** Tab switch auto-pause (plan §9, "tab switch physics explosion"). */
  private onVisibilityChange = (): void => {
    if (document.hidden && this.fsm.is('PLAYING')) this.pause();
  };

  // ------------------------------------------------------------------- ui

  private onUiAction(action: UiAction): void {
    this.sfx.unlock();
    if (action.type !== 'pause') this.sfx.play('click');

    switch (action.type) {
      case 'start':
        this.startLevel(this.storage.resumeLevelId());
        break;
      case 'open-levels':
        this.fsm.go('LEVEL_SELECT');
        this.showLevelSelect();
        break;
      case 'back-main':
        this.toMainMenu();
        break;
      case 'play-level':
        if (!this.storage.isUnlocked(action.id)) {
          this.screens.toast('이전 스테이지를 먼저 클리어하세요');
          return;
        }
        this.startLevel(action.id);
        break;
      case 'pause':
        this.pause();
        break;
      case 'resume':
        this.resume();
        break;
      case 'restart':
        this.startLevel(this.currentLevelId);
        break;
      case 'next-level': {
        const next = this.currentLevelId + 1;
        if (next > LEVEL_COUNT) {
          this.toMainMenu();
          return;
        }
        this.startLevel(next);
        break;
      }
      case 'toggle-sound': {
        const enabled = !this.storage.soundEnabled;
        this.storage.setSoundEnabled(enabled);
        this.sfx.setEnabled(enabled);
        this.showMainMenu();
        break;
      }
      default:
        break;
    }
  }

  private showMainMenu(): void {
    this.screens.showMainMenu({
      totalStars: this.storage.totalStars(),
      maxStars: LEVEL_COUNT * 3,
      soundEnabled: this.storage.soundEnabled,
      resumeLevelId: this.storage.resumeLevelId(),
    });
  }

  private showLevelSelect(): void {
    this.screens.showLevelSelect(
      LEVELS.map((level) => {
        const progress = this.storage.progressOf(level.id);
        return {
          id: level.id,
          name: level.name,
          unlocked: this.storage.isUnlocked(level.id),
          stars: progress.stars,
          best: progress.best,
        };
      }),
    );
  }

  // -------------------------------------------------------------- gameplay

  private startLevel(id: number): void {
    const data = getLevel(id);
    if (!data) {
      this.screens.toast(`스테이지 ${id} 를 찾을 수 없습니다`);
      return;
    }

    if (!this.fsm.is('LOADING')) this.fsm.go('LOADING');
    this.screens.hidePause();
    this.screens.hideResult();
    this.loop.setPaused(false);

    // One rebuild path only: the whole world is thrown away and recreated.
    this.teardownLevel();

    this.currentLevelId = id;
    this.physics = new PhysicsWorld(data.world.gravity);
    this.level = new Level(data, this.physics, this.particles, this.levelEvents);

    this.camera.setBounds({
      minX: data.camera.minX,
      maxX: data.camera.maxX,
      worldHeight: data.world.height,
      minZoom: data.camera.minZoom,
      maxZoom: data.camera.maxZoom,
    });
    const target = this.level.getCameraTarget();
    this.camera.moveTo(target.x, target.y, target.zoom, 1);
    this.camera.snapToTarget();

    this.manualCamera = false;
    this.panning = false;
    this.trail.length = 0;

    this.screens.showGame(`STAGE ${data.id} · ${data.name}`);
    this.fsm.go('PLAYING');
  }

  private teardownLevel(): void {
    this.level?.dispose();
    this.level = null;
    this.physics?.dispose();
    this.physics = null;
    this.particles.clear();
  }

  private pause(): void {
    if (!this.fsm.is('PLAYING')) return;
    this.fsm.go('PAUSED');
    this.loop.setPaused(true); // physics.step is not called at all while paused
    this.screens.showPause();
    this.sfx.play('click');
  }

  private resume(): void {
    if (!this.fsm.is('PAUSED')) return;
    this.screens.hidePause();
    this.loop.setPaused(false);
    this.fsm.go('PLAYING');
  }

  private toMainMenu(): void {
    if (this.fsm.is('PLAYING')) this.fsm.go('PAUSED');
    this.loop.setPaused(false);
    this.teardownLevel();
    this.screens.hidePause();
    this.screens.hideResult();
    this.fsm.go('MAIN_MENU');
    this.showMainMenu();
  }

  private onLevelResult(result: LevelResult): void {
    if (result.cleared) {
      this.storage.recordClear(result.levelId, result.total, result.stars);
    }
    const progress = this.storage.progressOf(result.levelId);
    const data = getLevel(result.levelId);

    this.fsm.go(result.cleared ? 'LEVEL_CLEAR' : 'LEVEL_FAIL');
    this.screens.showResult({
      cleared: result.cleared,
      levelId: result.levelId,
      levelName: data?.name ?? '',
      stars: result.stars,
      blockScore: result.blockScore,
      pigScore: result.pigScore,
      birdBonus: result.birdBonus,
      total: result.total,
      best: Math.max(progress.best, result.total),
      hasNext: result.levelId < LEVEL_COUNT,
      isFinalLevel: result.levelId === LEVEL_COUNT,
    });
  }

  private readonly levelEvents: LevelEvents = {
    onScoreChanged: (total: number) => {
      this.screens.hud.setScore(total);
    },
    onBirdsChanged: () => {
      /* the bird queue is drawn on the canvas (plan §1.3 exception) */
    },
    onPhaseChanged: (_phase: RoundPhase) => {
      // A phase change means the camera has a new job; drop the manual pan.
      this.manualCamera = false;
    },
    onResult: (result: LevelResult) => this.onLevelResult(result),
    onSfx: (name) => this.sfx.play(name),
    onShake: (strength: number) => this.camera.addShake(strength),
  };
}
