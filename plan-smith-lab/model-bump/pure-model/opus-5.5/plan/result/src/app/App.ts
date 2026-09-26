import type { SessionEventMap } from '../core/events';
import { GameSession } from '../core/GameSession';
import type { SessionSnapshot } from '../core/GameSession';
import type { StageData } from '../core/stage/schema';
import { cloneStage } from '../core/stage/schema';
import { KeyboardInput } from '../input/keyboard';
import { PointerInput } from '../input/pointer';
import { Effects } from '../render/effects';
import { Renderer } from '../render/renderer';
import { Viewport } from '../render/viewport';
import type { ProgressStore } from '../storage/progress';
import { el, setVisible } from '../ui/dom';
import { Hud } from '../ui/screens/hud';
import { MainMenu } from '../ui/screens/mainMenu';
import { PauseOverlay } from '../ui/screens/pauseOverlay';
import type { PauseAction } from '../ui/screens/pauseOverlay';
import { ResultOverlay } from '../ui/screens/resultOverlay';
import type { ResultAction } from '../ui/screens/resultOverlay';
import { StageSelect } from '../ui/screens/stageSelect';
import { holdsSession, INITIAL_APP_STATE, transition } from './appMachine';
import type { AppContext, AppEffect, AppEvent, AppState } from './appMachine';
import { FixedStepLoop } from './loop';

/**
 * 화면 전환, 세션 생성/파괴, rAF 루프 소유 (§3.1).
 * 불변식(§4.1): PLAYING·PAUSED에서는 세션이 정확히 1개, 결과 화면에서는 배경용 멈춘 세션 1개, 그 외 0개.
 */

export interface AppOptions {
  debug: boolean;
  /** ?stage=N (dev/test 전용) */
  startStage: number | null;
}

export class App {
  private state: AppState = INITIAL_APP_STATE;
  private session: GameSession | null = null;

  private readonly gameArea: HTMLElement;
  private readonly canvas: HTMLCanvasElement;
  private readonly rotateHint: HTMLElement;
  private readonly viewport: Viewport;
  private readonly renderer: Renderer;
  private readonly effects = new Effects();
  private readonly loop: FixedStepLoop;
  private readonly pointer: PointerInput;
  private readonly keyboard: KeyboardInput;
  private readonly mainMenu: MainMenu;
  private readonly stageSelect: StageSelect;
  private readonly hud: Hud;
  private readonly pauseOverlay: PauseOverlay;
  private readonly resultOverlay: ResultOverlay;
  private readonly disposers: Array<() => void> = [];

  private lastCleared: SessionEventMap['cleared'] | null = null;
  private lastFailed: SessionEventMap['failed'] | null = null;
  private lastNewBest = false;
  private portrait = false;
  private fps = 60;
  private stepMs = 0;

  constructor(
    mount: HTMLElement,
    private readonly stages: readonly StageData[],
    private readonly progress: ProgressStore,
    private readonly opts: AppOptions,
  ) {
    // ── DOM ──
    this.canvas = el('canvas', { class: 'game-canvas is-hidden', testid: 'game-canvas', 'aria-label': '게임 화면' });
    this.mainMenu = new MainMenu({
      start: () => this.dispatch({ type: 'start' }),
      resetProgress: () => this.progress.reset(),
    });
    this.stageSelect = new StageSelect(this.stages.length, this.stages.map((s) => s.name), this.progress, {
      select: (n) => {
        this.stageSelect.lock();
        if (!this.dispatch({ type: 'select', stage: n })) this.stageSelect.refresh();
      },
      back: () => this.dispatch({ type: 'back' }),
    });
    this.hud = new Hud(() => this.dispatch({ type: 'pause' }));
    this.pauseOverlay = new PauseOverlay((a) => this.onPauseAction(a));
    this.resultOverlay = new ResultOverlay((a) => this.onResultAction(a));
    this.gameArea = el('div', { class: 'game-area', testid: 'game-area' }, [
      this.canvas,
      this.hud.root,
      this.mainMenu.root,
      this.stageSelect.root,
      this.resultOverlay.root,
      this.pauseOverlay.root,
    ]);
    this.rotateHint = el('div', { class: 'rotate-hint is-hidden', testid: 'rotate-hint', role: 'alert' }, [
      el('div', { class: 'rotate-icon', 'aria-hidden': 'true', text: '📱' }),
      el('div', { text: '가로로 돌려 주세요' }),
    ]);
    mount.replaceChildren(this.gameArea, this.rotateHint);

    // ── 렌더/입력 ──
    this.viewport = new Viewport(this.gameArea, this.canvas);
    this.renderer = new Renderer(this.canvas, this.viewport);
    this.pointer = new PointerInput(this.canvas, (x, y) => this.viewport.toWorld(x, y), {
      down: (p) => {
        if (this.state.name !== 'PLAYING' || !this.session) return false;
        return this.session.pointerDown(p.x, p.y) === 'aim';
      },
      move: (p) => {
        if (this.state.name === 'PLAYING') this.session?.pointerMove(p.x, p.y);
      },
      up: (p) => {
        if (this.state.name === 'PLAYING') this.session?.pointerUp(p.x, p.y);
      },
      cancel: () => this.session?.cancelAim(),
    });
    this.keyboard = new KeyboardInput({ escape: () => this.onEscape() });

    const onVisibility = () => {
      if (document.hidden && this.state.name === 'PLAYING') this.dispatch({ type: 'pause' });
    };
    document.addEventListener('visibilitychange', onVisibility);
    this.disposers.push(() => document.removeEventListener('visibilitychange', onVisibility));
    const offViewport = this.viewport.onChange(() => this.checkOrientation());
    this.disposers.push(() => {
      offViewport();
    });
    this.checkOrientation();

    // ── 루프 ──
    this.loop = new FixedStepLoop({
      shouldStep: () => this.state.name === 'PLAYING' && this.session !== null,
      step: (dt) => this.session?.step(dt),
      frame: (dt, _steps, stepMs) => this.frame(dt, stepMs),
    });
    this.loop.start();

    // ── 부트 ──
    this.dispatch({ type: 'ready' });
    const n = opts.startStage;
    if (n !== null && n >= 1 && n <= this.stages.length) {
      this.dispatch({ type: 'start' });
      this.dispatch({ type: 'select', stage: n }, { unlocked: this.stages.length });
    }
  }

  // ── 상태 전이 ──────────────────────────────────────────────────────

  /** 전이표에 따라 상태를 바꾼다. 무시된 이벤트면 false */
  dispatch(ev: AppEvent, ctxOverride: Partial<AppContext> = {}): boolean {
    const ctx: AppContext = { totalStages: this.stages.length, unlocked: this.progress.unlocked, ...ctxOverride };
    const tr = transition(this.state, ev, ctx);
    if (!tr) return false;
    const prev = this.state;
    this.state = tr.state;
    for (const eff of tr.effects) this.runEffect(eff);
    this.syncView(prev);
    return true;
  }

  private runEffect(eff: AppEffect): void {
    switch (eff) {
      case 'createSession':
        this.startSession(this.state.stage ?? 1);
        break;
      case 'recreateSession':
        this.destroySession();
        this.startSession(this.state.stage ?? 1);
        break;
      case 'destroySession':
        this.destroySession();
        break;
      case 'saveProgress':
        this.saveProgress();
        break;
      case 'cancelAim':
        this.session?.cancelAim();
        this.pointer.reset();
        break;
      case 'resetClock':
        this.loop.resetClock();
        break;
    }
  }

  private startSession(n: number): void {
    const data = this.stages[n - 1];
    if (!data) throw new Error(`스테이지 ${n}이 없다`);
    // 세션은 언제나 동결된 원본의 깊은 복사본으로 만든다.
    const session = new GameSession(cloneStage(data));
    this.session = session;
    this.lastCleared = null;
    this.lastFailed = null;
    this.effects.clear();
    this.effects.bind(session.events);
    session.events.on('cleared', (e) => {
      this.lastCleared = e;
      this.dispatch({ type: 'cleared' });
    });
    session.events.on('failed', (e) => {
      this.lastFailed = e;
      this.dispatch({ type: 'failed' });
    });
    this.hud.reset();
    this.hud.setStage(n, data.name);
    this.pointer.reset();
    this.loop.resetClock();
  }

  private destroySession(): void {
    this.pointer.reset();
    this.session?.destroy();
    this.session = null;
    this.effects.clear();
  }

  private saveProgress(): void {
    const stage = this.state.stage;
    const e = this.lastCleared;
    if (stage === null || !e) return;
    this.lastNewBest = this.progress.recordClear(stage, e.score, e.stars).newBest;
  }

  private syncView(prev: AppState, force = false): void {
    const s = this.state;
    if (!force && prev.name === s.name && prev.stage === s.stage) return;
    const inGame = holdsSession(s.name);
    setVisible(this.canvas, inGame);
    this.hud.show(inGame);
    this.hud.showPause(s.name === 'PLAYING');
    this.mainMenu.show(s.name === 'MAIN');
    this.stageSelect.show(s.name === 'STAGE_SELECT');
    this.pauseOverlay.show(s.name === 'PAUSED');

    if (s.name === 'CLEARED' && s.stage !== null) {
      const rec = this.progress.record(s.stage);
      const score = this.lastCleared?.score ?? 0;
      this.resultOverlay.showCleared({
        stage: s.stage,
        totalStages: this.stages.length,
        score,
        best: rec?.bestScore ?? score,
        newBest: this.lastNewBest,
        stars: this.lastCleared?.stars ?? 1,
        totalStars: this.progress.totalStars(),
      });
    } else if (s.name === 'FAILED' && s.stage !== null) {
      this.resultOverlay.showFailed({ stage: s.stage, pigsLeft: this.lastFailed?.pigsLeft ?? this.session?.pigsLeft ?? 0 });
    } else {
      this.resultOverlay.hide();
    }
  }

  private onPauseAction(a: PauseAction): void {
    if (!this.dispatch({ type: a })) this.pauseOverlay.unlock();
  }

  private onResultAction(a: ResultAction): void {
    // 무시된 이벤트였으면 결과 화면을 다시 그려 버튼을 되살린다.
    if (!this.dispatch({ type: a })) this.syncView(this.state, true);
  }

  private onEscape(): void {
    if (this.state.name === 'PLAYING') this.dispatch({ type: 'pause' });
    else if (this.state.name === 'PAUSED' && !this.portrait) this.dispatch({ type: 'resume' });
  }

  private checkOrientation(): void {
    this.portrait = this.viewport.isPortraitMobile();
    setVisible(this.rotateHint, this.portrait);
    if (this.portrait && this.state.name === 'PLAYING') this.dispatch({ type: 'pause' });
  }

  // ── 프레임 ─────────────────────────────────────────────────────────

  private frame(dt: number, stepMs: number): void {
    if (dt > 0) this.fps = this.fps * 0.9 + (1 / dt) * 0.1;
    this.stepMs = this.stepMs * 0.9 + stepMs * 0.1;
    const name = this.state.name;
    const session = this.session;
    if (!session || !holdsSession(name)) return;
    // PAUSED는 화면을 얼린다. 결과 화면에서는 이펙트만 계속 그린다.
    if (name !== 'PAUSED') this.effects.update(dt);
    this.renderer.render(session, this.effects, { debug: this.opts.debug, fps: this.fps, stepMs: this.stepMs });
    this.hud.update(session.score, session.birdQueue);
  }

  // ── 테스트 훅 (§11.4, dev/test 빌드 전용) ─────────────────────────

  getState(): AppState {
    return { ...this.state };
  }

  sessionSnapshot(): SessionSnapshot | null {
    return this.session && !this.session.isDestroyed && holdsSession(this.state.name) ? this.session.snapshot() : null;
  }

  testShoot(dx: number, dy: number): boolean {
    if (this.state.name !== 'PLAYING' || !this.session) return false;
    return this.session.launch([dx, dy]);
  }

  testKillAllPigs(): void {
    if (this.state.name !== 'PLAYING' || !this.session) return;
    this.session.killAllPigs();
  }

  dispose(): void {
    this.loop.stop();
    this.destroySession();
    this.pointer.dispose();
    this.keyboard.dispose();
    this.viewport.dispose();
    for (const d of this.disposers) d();
    this.disposers.length = 0;
  }
}
