/**
 * 게임 오케스트레이터 (§4.1 core/Game, §5 상태 머신).
 * 상태 머신을 소유하고 씬(DOM UI) 전환과 루프를 구동한다.
 * 물리·판정은 전부 headless 인 Session 이 담당하고, Game 은 입력·렌더·UI 만 붙인다.
 */
import { DebugPanel, isDebugEnabled } from '../debug/DebugPanel';
import type { Entity } from '../entities/Entity';
import { Session } from '../gameplay/Session';
import { TrajectoryPredictor } from '../gameplay/Trajectory';
import { getLevel, LEVEL_COUNT } from '../levels/index';
import { MATERIALS } from '../physics/Materials';
import type { RemoveReason } from '../physics/World';
import { Particles } from '../render/Particles';
import { Renderer } from '../render/Renderer';
import { Hud } from '../ui/Hud';
import { MainMenu } from '../ui/MainMenu';
import { PauseOverlay } from '../ui/PauseOverlay';
import { ResultOverlay } from '../ui/ResultOverlay';
import { StageSelect } from '../ui/StageSelect';
import { LEVELS } from '../levels/index';
import { Input } from './Input';
import { Loop } from './Loop';
import type { Vec } from './math';
import { GAME_TRANSITIONS, StateMachine, type GameState } from './StateMachine';
import { ProgressStore } from './Storage';

export class Game {
  readonly fsm = new StateMachine<GameState>('MainMenu', GAME_TRANSITIONS);
  session: Session | null = null;
  currentLevelId = 1;

  private readonly renderer: Renderer;
  private readonly loop: Loop;
  private readonly input: Input;
  private readonly particles = new Particles();
  private readonly predictor = new TrajectoryPredictor();
  private readonly store = new ProgressStore();
  private trajectory: Vec[] = [];
  private wireframe = false;

  private readonly mainMenu: MainMenu;
  private readonly stageSelect: StageSelect;
  private readonly hud: Hud;
  private readonly pauseOverlay: PauseOverlay;
  private readonly resultOverlay: ResultOverlay;
  private readonly debug: DebugPanel | null = null;

  private lastBirdsShown = -1;
  private readonly disposers: Array<() => void> = [];

  constructor(
    canvas: HTMLCanvasElement,
    private readonly container: HTMLElement,
    uiRoot: HTMLElement,
  ) {
    this.renderer = new Renderer(canvas, container);

    // ---------- UI ----------
    this.mainMenu = new MainMenu(uiRoot, {
      onStart: () => this.startGame(),
      onStageSelect: () => this.openStageSelect(),
    });
    this.stageSelect = new StageSelect(uiRoot, LEVELS, {
      onSelect: (id) => this.selectStage(id),
      onBack: () => this.fsm.transition('MainMenu'),
    });
    this.hud = new Hud(uiRoot, { onPause: () => this.pause() });
    this.pauseOverlay = new PauseOverlay(uiRoot, {
      onResume: () => this.resume(),
      onRestart: () => this.restart(),
      onMenu: () => this.toMenu(),
    });
    this.resultOverlay = new ResultOverlay(uiRoot, {
      onNext: () => this.nextStage(),
      onRestart: () => this.restart(),
      onMenu: () => this.toMenu(),
    });

    // ---------- 입력 ----------
    this.input = new Input(
      canvas,
      {
        down: (p) => this.onPointerDown(p),
        move: (p) => this.onPointerMove(p),
        up: (p) => this.onPointerUp(p),
        cancel: () => this.onPointerCancel(),
      },
      () => this.fsm.state === 'Playing',
    );

    // ---------- 상태 훅 ----------
    this.fsm.onEnter('MainMenu', () => {
      this.disposeSession();
      this.hud.hide();
      this.pauseOverlay.hide();
      this.resultOverlay.hide();
      this.mainMenu.show();
    });
    this.fsm.onExit('MainMenu', () => this.mainMenu.hide());

    this.fsm.onEnter('StageSelect', () => this.stageSelect.show(this.store.load()));
    this.fsm.onExit('StageSelect', () => this.stageSelect.hide());

    this.fsm.onEnter('Playing', () => {
      this.pauseOverlay.hide();
      this.resultOverlay.hide();
      this.hud.show();
      this.hud.setPauseVisible(true);
      this.loop.resetAccumulator();
    });

    this.fsm.onEnter('Paused', () => {
      // 진행 중 드래그 취소 → 새는 앵커로 복귀
      this.input.cancelActive();
      this.session?.shot.cancelDrag();
      this.trajectory = [];
      this.hud.setPauseVisible(false);
      this.pauseOverlay.show();
    });
    this.fsm.onExit('Paused', () => this.pauseOverlay.hide());

    this.fsm.onEnter('StageClear', () => {
      const s = this.session;
      if (!s) return;
      this.hud.setPauseVisible(false);
      const stars = s.stars();
      this.store.record(s.level.id, s.score.value, stars);
      const hasNext = s.level.id < LEVEL_COUNT;
      this.resultOverlay.showClear({
        stageId: s.level.id,
        score: s.score.value,
        stars,
        bonus: s.birdBonus,
        hasNext,
        allCleared: !hasNext,
      });
    });
    this.fsm.onExit('StageClear', () => this.resultOverlay.hide());

    this.fsm.onEnter('StageFailed', () => {
      const s = this.session;
      if (!s) return;
      this.hud.setPauseVisible(false);
      this.resultOverlay.showFailed({ stageId: s.level.id, score: s.score.value });
    });
    this.fsm.onExit('StageFailed', () => this.resultOverlay.hide());

    // ---------- 루프 ----------
    this.loop = new Loop({
      step: () => this.step(),
      render: () => this.render(),
      shouldStep: () => this.fsm.state === 'Playing',
    });

    // ---------- 윈도우 이벤트 ----------
    const onResize = (): void => this.renderer.resize();
    window.addEventListener('resize', onResize);
    this.disposers.push(() => window.removeEventListener('resize', onResize));
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(onResize);
      ro.observe(container);
      this.disposers.push(() => ro.disconnect());
    }

    const onVisibility = (): void => {
      if (document.hidden && this.fsm.state === 'Playing') this.pause();
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.disposers.push(() => document.removeEventListener('visibilitychange', onVisibility));

    const onKey = (e: KeyboardEvent): void => this.onKey(e);
    window.addEventListener('keydown', onKey);
    this.disposers.push(() => window.removeEventListener('keydown', onKey));

    // ---------- 디버그 ----------
    if (isDebugEnabled()) {
      this.debug = new DebugPanel(uiRoot, {
        getShotInfo: () => this.session?.shot.dragShot ?? null,
        getStats: () => ({
          fps: this.loop.fps,
          frameMs: this.loop.frameMs,
          bodies: this.bodyCount(),
          state: this.fsm.state,
        }),
        jumpToLevel: (id) => this.jumpToLevel(id),
        killPigs: () => this.killAllPigs(),
        setWireframe: (on) => (this.wireframe = on),
      });
    }

    // 초기 화면
    this.mainMenu.show();
  }

  start(): void {
    this.loop.start();
  }

  // ---------- 씬 전환 ----------

  startGame(): void {
    this.goPlaying(1);
  }

  openStageSelect(): void {
    this.fsm.transition('StageSelect');
  }

  selectStage(id: number): void {
    this.goPlaying(id);
  }

  pause(): void {
    this.fsm.transition('Paused');
  }

  resume(): void {
    if (this.fsm.state === 'Paused') this.fsm.transition('Playing');
  }

  /** 현재 스테이지를 처음부터. Playing 에서 호출되면 상태 전이 없이 재로드. */
  restart(): void {
    if (this.fsm.state === 'Playing') {
      this.loadLevel(this.currentLevelId);
      this.loop.resetAccumulator();
      return;
    }
    if (this.fsm.can('Playing')) {
      this.loadLevel(this.currentLevelId);
      this.fsm.transition('Playing');
    }
  }

  toMenu(): void {
    this.fsm.transition('MainMenu');
  }

  nextStage(): void {
    if (this.fsm.state !== 'StageClear') return;
    if (this.currentLevelId >= LEVEL_COUNT) {
      this.toMenu();
      return;
    }
    this.goPlaying(this.currentLevelId + 1);
  }

  private goPlaying(levelId: number): void {
    if (!this.fsm.can('Playing')) return;
    this.loadLevel(levelId);
    this.fsm.transition('Playing');
  }

  private jumpToLevel(id: number): void {
    if (this.fsm.state === 'Playing') {
      this.loadLevel(id);
      return;
    }
    if (this.fsm.state === 'MainMenu' || this.fsm.state === 'StageSelect') {
      this.goPlaying(id);
      return;
    }
    // Paused/Clear/Failed → Playing 으로
    this.loadLevel(id);
    this.fsm.transition('Playing');
  }

  private killAllPigs(): void {
    const s = this.session;
    if (!s) return;
    for (const pig of s.world.entitiesOf('pig')) s.world.queueRemove(pig, 'destroyed');
    s.world.flushRemovals();
  }

  // ---------- 레벨 ----------

  private loadLevel(id: number): void {
    const level = getLevel(id);
    if (!level) return;
    this.disposeSession();
    this.currentLevelId = id;
    this.particles.clear();
    this.trajectory = [];
    this.lastBirdsShown = -1;

    const session = new Session(level, {
      onRemoved: (e, reason) => this.onEntityRemoved(e, reason),
    });
    session.score.onChange((delta, total) => {
      this.hud.setScore(total);
      if (delta > 0) this.hud.popScore(delta);
    });
    this.session = session;

    this.hud.setStage(level.id, level.name);
    this.hud.setScore(0);
    this.syncBirdsHud();
    this.store.setLastPlayed(id);
  }

  private disposeSession(): void {
    if (!this.session) return;
    this.session.dispose();
    this.session = null;
    this.trajectory = [];
    this.particles.clear();
  }

  private onEntityRemoved(e: Entity, reason: RemoveReason): void {
    if (reason !== 'destroyed') return;
    const color =
      e.kind === 'pig' ? '#5cbf3a' : e.material ? MATERIALS[e.material].color : '#bbb';
    this.particles.spawn(e.body.position.x, e.body.position.y, color, e.kind === 'pig' ? 12 : 10);
  }

  private syncBirdsHud(): void {
    const s = this.session;
    if (!s) return;
    const n = s.shot.birdsRemaining;
    if (n === this.lastBirdsShown) return;
    this.lastBirdsShown = n;
    const kinds = [...s.shot.queue];
    if (s.shot.current && (s.shot.phase === 'ready' || s.shot.phase === 'dragging')) {
      kinds.unshift(s.shot.current.birdKind ?? 'red');
    }
    this.hud.setBirds(kinds);
  }

  /** 월드에 남은 바디 수 (메인 화면에서는 0 — 누수 검사) */
  bodyCount(): number {
    return this.session ? this.session.world.bodyCount() : 0;
  }

  // ---------- 루프 ----------

  private step(): void {
    const s = this.session;
    if (!s) return;
    s.step();
    this.particles.update();
    this.syncBirdsHud();

    if (s.outcome === 'clear') this.fsm.transition('StageClear');
    else if (s.outcome === 'failed') this.fsm.transition('StageFailed');
  }

  private render(): void {
    const s = this.session;
    if (!s) {
      this.renderer.render(null);
      this.debug?.update();
      return;
    }
    const onSling = s.shot.phase === 'ready' || s.shot.phase === 'dragging';
    this.renderer.render({
      entities: s.world.entities.values(),
      slingBird: onSling ? s.shot.birdPosition : null,
      trajectory: this.trajectory,
      prevTrail: s.shot.prevTrail,
      particles: this.particles,
      debug: this.wireframe,
    });
    this.debug?.update();
  }

  // ---------- 입력 ----------

  private onPointerDown(p: Vec): void {
    const s = this.session;
    if (!s) return;
    if (s.shot.pointerDown(p)) this.updateTrajectory();
  }

  private onPointerMove(p: Vec): void {
    const s = this.session;
    if (!s || !s.shot.isDragging) return;
    s.shot.pointerMove(p);
    this.updateTrajectory();
  }

  private onPointerUp(p: Vec): void {
    const s = this.session;
    if (!s) return;
    s.shot.pointerUp(p);
    this.trajectory = [];
  }

  private onPointerCancel(): void {
    this.session?.shot.cancelDrag();
    this.trajectory = [];
  }

  private updateTrajectory(): void {
    const s = this.session;
    if (!s) return;
    const v = s.shot.dragVelocity;
    const pos = s.shot.birdPosition;
    this.trajectory = v && pos ? this.predictor.predict(pos, v) : [];
  }

  private onKey(e: KeyboardEvent): void {
    if (e.repeat) return;
    const k = e.key;
    if (k === 'Escape' || k === 'p' || k === 'P') {
      if (this.fsm.state === 'Playing') this.pause();
      else if (this.fsm.state === 'Paused') this.resume();
      e.preventDefault();
    } else if (k === 'r' || k === 'R') {
      if (this.fsm.is('Playing', 'Paused', 'StageClear', 'StageFailed')) {
        this.restart();
        e.preventDefault();
      }
    }
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
    this.disposeSession();
    this.predictor.dispose();
    for (const d of this.disposers) d();
    this.disposers.length = 0;
    void this.container;
  }
}
