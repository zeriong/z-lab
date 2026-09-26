// 오케스트레이터. 상태 머신 전이 → 화면 표시, 스테이지 시작/재시작, 판정 → 결과, 저장. 하중 경로의 배선이 여기 모인다.
import { AudioSystem } from './audio';
import { Camera } from './camera';
import { installDamage } from './damage';
import { Effects } from './effects';
import { SlingshotInput } from './input';
import { Judge, summarizeScore } from './judge';
import { GameLoop } from './loop';
import { advanceBird, createEngine, launch, spawnStage, type MBody, type StageWorld } from './physics';
import { Renderer } from './render';
import { createHud, type Hud } from './screens/hud';
import { createMainScreen, type MainScreen } from './screens/main';
import { installOrientationOverlay } from './screens/orientation';
import { createPauseOverlay, type PauseOverlay } from './screens/pause';
import { createResultOverlay, type ResultOverlay } from './screens/result';
import { createSelectScreen, type SelectScreen } from './screens/select';
import { STAGES, getStage, nextStageId } from './stages';
import { gameState, type GameState, type StateMachine } from './state';
import { applyResult, loadSave, writeSave, type SaveData } from './storage';
import { MATERIAL, type Vec2 } from './types';
import { Viewport } from './viewport';

export interface GameRoots {
  app: HTMLElement;
  stage: HTMLElement;
  canvas: HTMLCanvasElement;
  rotate: HTMLElement;
}

/** e2e·디버깅용 훅(window.__ab). 게임 로직은 이 인터페이스에 의존하지 않는다. */
export interface GameDebug {
  version: string;
  state(): GameState;
  stageId(): number | null;
  score(): number;
  pigsRemaining(): number;
  birdsRemaining(): number;
  /** 슬링샷 위 새 위치(없으면 null). */
  birdPos(): Vec2 | null;
  /** 비행 중인 새 위치(없으면 null). */
  flyingBirdPos(): Vec2 | null;
  /** 현재 새를 drag 벡터로 발사. 성공 시 true. */
  launch(dx: number, dy: number): boolean;
  /** 다음 발사 준비 완료(또는 결과 상태). */
  idle(): boolean;
  /** 잠금과 무관하게 스테이지 시작(디버그 전용). */
  startStage(id: number): void;
}

declare global {
  interface Window {
    __ab?: GameDebug;
  }
}

const HIT_SOUND_COOLDOWN = 4;

export class Game {
  private readonly state: StateMachine = gameState;
  private readonly engine = createEngine();
  private readonly judge = new Judge();
  private readonly camera = new Camera(0);
  private readonly effects = new Effects();
  private readonly audio = new AudioSystem();
  private readonly viewport: Viewport;
  private readonly renderer: Renderer;
  private readonly input: SlingshotInput;
  private readonly loop: GameLoop;

  private mainScreen!: MainScreen;
  private selectScreen!: SelectScreen;
  private hud!: Hud;
  private pauseOverlay!: PauseOverlay;
  private resultOverlay!: ResultOverlay;

  private save: SaveData = loadSave();
  private world: StageWorld | null = null;
  private uninstallDamage: (() => void) | null = null;
  private stageId: number | null = null;
  private hitCooldown = 0;

  constructor(private readonly roots: GameRoots) {
    this.viewport = new Viewport(roots.app, roots.stage, roots.canvas);
    this.renderer = new Renderer(roots.canvas, () => this.viewport.dpr);
    this.input = new SlingshotInput({
      target: roots.canvas,
      getState: () => this.state.state,
      getWorld: () => this.world,
      toWorld: (ev) => this.viewport.pointerToWorld(ev, this.camera.x),
      onGrab: () => this.audio.play('stretch'),
      onLaunch: (bird, drag) => this.handleLaunched(bird, drag),
      onAnyPointerDown: () => this.unlockAudio(),
    });
    this.loop = new GameLoop(this.engine, this.state, {
      afterStep: () => this.afterStep(),
      render: () => this.render(),
    });
  }

  boot(): void {
    const { stage, rotate } = this.roots;
    this.audio.setMuted(this.save.muted);

    this.mainScreen = createMainScreen(stage, {
      onStart: () => this.openSelect(),
      onContinue: () => this.continueGame(),
      onToggleMute: () => this.toggleMute(),
    });
    this.selectScreen = createSelectScreen(stage, {
      onPick: (id) => this.startStage(id),
      onBack: () => this.toMain(),
    });
    this.hud = createHud(stage, { onPause: () => this.pause() });
    this.pauseOverlay = createPauseOverlay(stage, {
      onResume: () => this.resume(),
      onRetry: () => this.retry(),
      onMain: () => this.toMain(),
    });
    this.resultOverlay = createResultOverlay(stage, {
      onNext: () => this.next(),
      onRetry: () => this.retry(),
      onMain: () => this.toMain(),
    });

    this.state.onChange((to) => this.syncScreens(to));
    this.viewport.attach();
    this.input.attach();
    installOrientationOverlay(rotate, (portrait) => {
      if (portrait && this.state.is('PLAYING')) this.pause();
    });

    document.addEventListener('pointerdown', () => this.unlockAudio(), { capture: true });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.state.is('PLAYING')) this.pause();
        else if (this.state.is('PAUSED')) this.resume();
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.state.is('PLAYING')) this.pause();
    });

    this.syncScreens(this.state.state);
    this.loop.start();
    window.__ab = this.debug();
  }

  // ---------- 화면 동기화 (D1: 상태 하나 = 화면 하나) ----------

  private syncScreens(to: GameState): void {
    this.mainScreen.setMuted(this.audio.muted);
    this.mainScreen.setContinue(this.save.unlocked);
    if (to === 'SELECT') this.selectScreen.update(this.save, STAGES);

    this.mainScreen[to === 'MAIN' ? 'show' : 'hide']();
    this.selectScreen[to === 'SELECT' ? 'show' : 'hide']();
    const inGame = to === 'PLAYING' || to === 'PAUSED' || to === 'CLEARED' || to === 'FAILED';
    this.hud[inGame ? 'show' : 'hide']();
    this.pauseOverlay[to === 'PAUSED' ? 'show' : 'hide']();
    if (to !== 'CLEARED' && to !== 'FAILED') this.resultOverlay.hide();

    if (to === 'MAIN' || to === 'SELECT') this.audio.startBgm('main');
    else if (to === 'PLAYING') this.audio.startBgm('game');
  }

  private unlockAudio(): void {
    const was = this.audio.unlocked;
    this.audio.unlock();
    if (!was && this.audio.unlocked) {
      this.audio.startBgm(this.state.is('PLAYING', 'PAUSED') ? 'game' : 'main');
    }
  }

  // ---------- 상태 전이 동사 ----------

  openSelect(): void {
    if (this.state.is('MAIN')) this.state.transition('SELECT');
  }

  continueGame(): void {
    if (!this.state.is('MAIN')) return;
    this.state.transition('SELECT');
    this.startStage(this.save.unlocked);
  }

  /** SELECT/PAUSED/CLEARED/FAILED → PLAYING. 잠긴 스테이지는 무시(A2). */
  startStage(id: number, opts: { ignoreLock?: boolean } = {}): void {
    const def = getStage(id);
    if (!def) return;
    if (!opts.ignoreLock && id > this.save.unlocked) return;
    if (this.state.is('MAIN')) this.state.transition('SELECT');
    if (this.state.is('PLAYING')) this.state.transition('PAUSED');

    this.teardownWorld();
    this.world = spawnStage(this.engine, def);
    this.uninstallDamage = installDamage(this.world, {
      onImpact: (impact, at) => this.onImpact(impact, at),
      onBlockBreak: (_body, meta, at) => {
        this.effects.burst(at.x, at.y, MATERIAL[meta.material ?? 'wood'].color, 12);
        this.audio.play('break');
      },
      onPigRemoved: (_body, _meta, at) => {
        this.effects.burst(at.x, at.y, '#6fcf4a', 16, 9);
        this.effects.shake(6);
        this.audio.play('pig');
      },
      onScore: (total) => this.hud.setScore(total),
    });
    this.judge.reset();
    this.camera.reset();
    this.effects.clear();
    this.input.cancel();
    this.stageId = id;
    this.hud.setStage(id);
    this.hud.setScore(0);
    this.hud.setBirds(this.world.birdsRemaining);

    this.state.transition('PLAYING');
  }

  pause(): void {
    if (!this.state.is('PLAYING')) return;
    this.input.cancel();
    this.state.transition('PAUSED');
    this.audio.play('click');
  }

  resume(): void {
    if (!this.state.is('PAUSED')) return;
    this.state.transition('PLAYING');
  }

  retry(): void {
    if (this.stageId === null || !this.state.is('PAUSED', 'CLEARED', 'FAILED')) return;
    this.startStage(this.stageId);
  }

  next(): void {
    if (!this.state.is('CLEARED') || this.stageId === null) return;
    const id = nextStageId(this.stageId);
    if (id !== null) this.startStage(id);
  }

  toMain(): void {
    if (!this.state.is('SELECT', 'PAUSED', 'CLEARED', 'FAILED')) return;
    this.teardownWorld();
    this.stageId = null;
    this.state.transition('MAIN');
  }

  toggleMute(): void {
    const muted = this.audio.toggleMuted();
    this.save = { ...this.save, muted };
    writeSave(this.save);
    this.mainScreen.setMuted(muted);
  }

  private teardownWorld(): void {
    this.uninstallDamage?.();
    this.uninstallDamage = null;
    this.input.cancel();
    if (this.world) {
      // 다음 spawnStage가 동적 body를 치우지만, 메인으로 나갈 때도 깨끗이 비운다.
      spawnStage(this.engine, { ...this.world.def, blocks: [], pigs: [], birds: [] });
      this.world = null;
    }
  }

  // ---------- 프레임 ----------

  private handleLaunched(bird: MBody, _drag: Vec2): void {
    if (!this.world) return;
    this.judge.onLaunch();
    this.camera.follow(() => (bird === this.world?.flyingBird ? bird.position : null));
    this.hud.setBirds(this.world.birdsRemaining);
    this.audio.play('launch');
  }

  private onImpact(impact: number, at: Vec2): void {
    if (this.hitCooldown > 0) return;
    this.hitCooldown = HIT_SOUND_COOLDOWN;
    this.audio.play('hit');
    if (impact > 20) this.effects.burst(at.x, at.y, 'rgba(120,90,60,0.6)', 8, 3);
  }

  private afterStep(): void {
    const world = this.world;
    if (!world) return;
    world.frame += 1;
    if (this.hitCooldown > 0) this.hitCooldown -= 1;

    const r = this.judge.tick(world);
    if (r.settled) {
      if (r.verdict === 'CLEARED') this.finish(true);
      else if (r.verdict === 'FAILED') this.finish(false);
      else {
        advanceBird(world);
        this.judge.onAdvanced();
        this.camera.returnHome();
        this.hud.setBirds(world.birdsRemaining);
      }
    }
    this.camera.update();
    this.effects.update();
  }

  private finish(cleared: boolean): void {
    const world = this.world;
    if (!world || this.stageId === null) return;
    const summary = summarizeScore(world);
    const stageId = this.stageId;
    if (cleared) {
      this.save = applyResult(this.save, stageId, summary.stars);
      writeSave(this.save);
    }
    this.camera.returnHome();
    this.state.transition(cleared ? 'CLEARED' : 'FAILED');
    this.audio.play(cleared ? 'clear' : 'fail');
    this.resultOverlay.show({
      cleared,
      stageId,
      stars: cleared ? summary.stars : 0,
      base: summary.base,
      bonus: cleared ? summary.bonus : 0,
      total: cleared ? summary.total : summary.base,
      hasNext: nextStageId(stageId) !== null,
    });
  }

  private render(): void {
    this.renderer.render({
      world: this.world,
      cameraX: this.camera.x,
      drag: this.input.drag,
      effects: this.effects,
      state: this.state.state,
    });
  }

  // ---------- 디버그 훅 ----------

  private debug(): GameDebug {
    return {
      version: '0.1.0',
      state: () => this.state.state,
      stageId: () => this.stageId,
      score: () => this.world?.score ?? 0,
      pigsRemaining: () => this.world?.pigsRemaining ?? 0,
      birdsRemaining: () => this.world?.birdsRemaining ?? 0,
      birdPos: () => {
        const b = this.world?.currentBird;
        return b ? { x: b.position.x, y: b.position.y } : null;
      },
      flyingBirdPos: () => {
        const b = this.world?.flyingBird;
        return b ? { x: b.position.x, y: b.position.y } : null;
      },
      launch: (dx, dy) => {
        if (!this.world || !this.state.is('PLAYING')) return false;
        this.input.cancel();
        const drag = { x: dx, y: dy };
        const bird = launch(this.world, drag);
        if (!bird) return false;
        this.handleLaunched(bird, drag);
        return true;
      },
      idle: () => {
        if (!this.state.is('PLAYING')) return true;
        return !this.judge.inFlight && this.world?.currentBird !== null;
      },
      startStage: (id) => this.startStage(id, { ignoreLock: true }),
    };
  }
}
