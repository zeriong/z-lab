/**
 * StateMachine + 씬 전환 (§5).
 *
 * 전이표는 `Record<Phase, Partial<Record<GameEvent, Phase>>>` 리터럴이다.
 * 정의되지 않은 전이는 타입 수준에서 `undefined`로 드러나고, dispatch는
 * 그것을 거부하며 false를 돌려준다 — §13-5d가 단언하는 성질이 이것이다.
 *
 * §5 표에 없는데 여기 있는 전이는 둘뿐이고, 둘 다 근거가 문서 안에 있다:
 *  - PAUSED --RESUME--> PLAYING : R25(추가 요구. 없으면 일시정지가 탈출구 없는 상태)
 *  - CLEARED --TO_SELECT--> STAGE_SELECT : §5의 STAGE_SELECT 진입 계기가
 *    "시작 버튼, 클리어 후"이고, R28이 10스테이지에서 그 버튼을 요구한다.
 */

import { GameScene } from './game/scene';
import { Camera } from './render/camera';
import { Renderer } from './render/canvas';
import { Effects } from './render/effects';
import { AudioSystem } from './audio/audio';
import { Hud } from './ui/hud';
import { OverlayLayer, type UiAction, type StageCellView } from './ui/overlay';
import { Progress } from './storage/progress';
import { SlingshotController } from './game/slingshot';
import { parseStage, STAGE_COUNT, StageSchemaError, type StageDef, type Theme } from './data/schema';
import { STAGE_SOURCES, STAGE_FILE_NAMES } from './data/stages';
import type { StageResult } from './game/score';

export type Phase = 'BOOT' | 'MENU' | 'STAGE_SELECT' | 'PLAYING' | 'PAUSED' | 'CLEARED' | 'FAILED';

export type GameEvent =
  | 'READY'
  | 'START'
  | 'SELECT'
  | 'BACK'
  | 'PAUSE'
  | 'RESUME'
  | 'RETRY'
  | 'MENU'
  | 'CLEAR'
  | 'FAIL'
  | 'NEXT'
  | 'TO_SELECT';

export const TRANSITIONS: Record<Phase, Partial<Record<GameEvent, Phase>>> = {
  BOOT: { READY: 'MENU' },
  MENU: { START: 'STAGE_SELECT' },
  STAGE_SELECT: { SELECT: 'PLAYING', BACK: 'MENU' },
  PLAYING: { PAUSE: 'PAUSED', CLEAR: 'CLEARED', FAIL: 'FAILED' },
  PAUSED: { RESUME: 'PLAYING', RETRY: 'PLAYING', MENU: 'MENU' },
  CLEARED: { NEXT: 'PLAYING', RETRY: 'PLAYING', MENU: 'MENU', TO_SELECT: 'STAGE_SELECT' },
  FAILED: { RETRY: 'PLAYING', MENU: 'MENU' },
};

export interface TransitionInfo {
  from: Phase;
  to: Phase;
  event: GameEvent;
  payload?: number;
}

export class StateMachine {
  private current: Phase = 'BOOT';
  private listeners: Array<(info: TransitionInfo) => void> = [];
  /** 진단·테스트용 전이 로그 */
  readonly log: TransitionInfo[] = [];

  get phase(): Phase {
    return this.current;
  }

  can(event: GameEvent): boolean {
    return TRANSITIONS[this.current][event] !== undefined;
  }

  onTransition(fn: (info: TransitionInfo) => void): void {
    this.listeners.push(fn);
  }

  /** @returns 전이가 실제로 일어났으면 true. 정의되지 않은 전이는 조용히 거부. */
  dispatch(event: GameEvent, payload?: number): boolean {
    const next = TRANSITIONS[this.current][event];
    if (next === undefined) return false;

    const info: TransitionInfo = { from: this.current, to: next, event, payload };
    this.current = next;
    this.log.push(info);
    this.listeners.forEach((fn) => fn(info));
    return true;
  }

  /** 테스트 전용 — 임의 상태에서 시작하기 위한 이음매 */
  forcePhase(phase: Phase): void {
    this.current = phase;
  }
}

// ==========================================================================
// App — 상태 전이에 따라 씬/오버레이/오디오를 붙였다 뗀다
// ==========================================================================

export class App {
  private readonly machine = new StateMachine();
  private readonly camera = new Camera();
  private readonly effects = new Effects();
  private readonly progress = new Progress();
  private readonly audio: AudioSystem;
  private readonly renderer: Renderer;
  private readonly overlay: OverlayLayer;
  private readonly hud: Hud;
  private readonly scene: GameScene;
  private readonly slingshot: SlingshotController;

  private stages: StageDef[] = [];
  private stageErrors: string[] = [];
  private currentStageId = 1;
  private lastResult: StageResult | null = null;
  private theme: Theme = 'meadow';

  private lastFrameMs = 0;
  private rafId = 0;
  private readonly onResize = (): void => this.renderer.resize(this.camera);

  constructor(canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.renderer = new Renderer(canvas);
    this.audio = new AudioSystem(this.progress.muted);
    this.overlay = new OverlayLayer(uiRoot, (action) => this.onUiAction(action));
    this.hud = new Hud(uiRoot, { onPause: () => this.dispatch('PAUSE') });

    this.scene = new GameScene({
      hooks: {
        onScore: (total, gained, at) => {
          this.hud.setScore(total);
          if (gained > 0) this.effects.popup(at.x, at.y, `+${gained.toLocaleString('en-US')}`);
        },
        onHit: (tag, dmg, at) => {
          this.effects.hit(at.x, at.y, tag.shard);
          this.audio.play('hit', Math.min(1, dmg / 30));
        },
        onDestroyed: (tag, at) => {
          this.effects.burst(at.x, at.y, tag.shard, tag.kind === 'pig' ? 1.3 : 1);
          this.audio.play(tag.kind === 'pig' ? 'pig' : 'break');
        },
        onExplosion: (at, radius) => {
          this.effects.explosion(at.x, at.y, radius);
          this.audio.play('explode');
        },
        onLaunch: (bird) => {
          this.audio.play('launch');
          this.camera.follow(() => bird.position);
          this.hud.setBirds(this.scene.stage?.birdPlan ?? [], this.scene.stage?.birdsUsed ?? 0);
        },
        onBirdReady: () => {
          this.camera.returnToAnchor();
          this.hud.setBirds(this.scene.stage?.birdPlan ?? [], this.scene.stage?.birdsUsed ?? 0);
        },
        onAbility: (kind, at) => {
          if (kind === 'dash') this.effects.dust(at.x, at.y, 6);
        },
        onTurnEnd: () => this.camera.returnToAnchor(),
        onShake: (amp, ms) => this.camera.shake(amp, ms),
        onClear: (result) => this.onStageClear(result),
        onFail: (result) => this.onStageFail(result),
      },
    });

    this.slingshot = new SlingshotController(canvas, this.camera, {
      getAnchor: () => this.scene.getAnchor(),
      getReadyBird: () => this.scene.getReadyBird(),
      getFlyingBird: () => this.scene.getFlyingBird(),
      isInteractive: () => this.machine.phase === 'PLAYING',
      getGravity: () => this.scene.getGravity(),
      onLaunch: (velocity) => this.scene.launch(velocity),
      onTap: () => this.scene.tapAbility(),
    });

    this.machine.onTransition((info) => this.onTransition(info));
  }

  // ------------------------------------------------------------------ 부팅

  start(): void {
    this.overlay.showLoading();
    this.hud.setVisible(false);

    this.loadStages();
    this.progress.countViewport(window.innerHeight > window.innerWidth);

    this.renderer.resize(this.camera);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    this.slingshot.attach();

    this.lastFrameMs = performance.now();
    this.rafId = window.requestAnimationFrame((t) => this.frame(t));

    this.dispatch('READY'); // BOOT → MENU
  }

  /** 페이지 언로드/HMR 시 — 리스너를 남기지 않는다 */
  destroy(): void {
    window.cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onResize);
    this.slingshot.detach();
    this.scene.unmount();
  }

  private loadStages(): void {
    this.stages = [];
    this.stageErrors = [];
    STAGE_SOURCES.forEach((raw, i) => {
      const source = STAGE_FILE_NAMES[i] ?? `stage-${i + 1}`;
      try {
        this.stages.push(parseStage(raw, source));
      } catch (err) {
        // 여기서 던지면 게임이 통째로 안 뜬다. 깨진 파일만 빼고 나머지를 살린다.
        const message = err instanceof StageSchemaError ? err.message : String(err);
        this.stageErrors.push(message);
        console.error(message);
      }
    });
    if (this.stages.length !== STAGE_COUNT) {
      console.warn(`스테이지 ${this.stages.length}/${STAGE_COUNT}개만 로드됨. npm run validate:stages 를 실행하세요.`);
    }
  }

  private stageById(id: number): StageDef | null {
    return this.stages.find((s) => s.id === id) ?? null;
  }

  // ------------------------------------------------------------- 전이 처리

  private dispatch(event: GameEvent, payload?: number): boolean {
    return this.machine.dispatch(event, payload);
  }

  private onTransition(info: TransitionInfo): void {
    switch (info.to) {
      case 'MENU':
        this.scene.unmount(); // R24: 메뉴 뒤에서 이전 스테이지가 계속 돌지 않게
        this.effects.clear();
        this.hud.setVisible(false);
        this.overlay.showMenu(this.audio.isMuted);
        break;

      case 'STAGE_SELECT':
        this.scene.unmount();
        this.effects.clear();
        this.hud.setVisible(false);
        this.overlay.showSelect(this.buildSelectView());
        break;

      case 'PLAYING':
        this.overlay.hide();
        this.hud.setVisible(true);
        if (info.event === 'RESUME') {
          this.scene.resume(); // 바디 위치·속도 그대로 이어진다 (R25)
        } else {
          const id =
            info.event === 'SELECT'
              ? (info.payload ?? 1)
              : info.event === 'NEXT'
                ? this.currentStageId + 1
                : this.currentStageId;
          this.enterStage(id);
        }
        break;

      case 'PAUSED':
        this.scene.pause(); // Engine.update 호출이 0이 된다 (§13-5a)
        this.overlay.showPause();
        break;

      case 'CLEARED':
        this.scene.pause();
        this.hud.setVisible(true);
        this.overlay.showClear(
          this.lastResult ?? emptyResult(this.currentStageId),
          this.currentStageId >= STAGE_COUNT,
          this.newRecord,
        );
        break;

      case 'FAILED':
        this.scene.pause();
        this.overlay.showFail(this.lastResult ?? emptyResult(this.currentStageId));
        break;

      default:
        break;
    }
  }

  private newRecord = false;

  private enterStage(id: number): void {
    const def = this.stageById(id);
    if (!def) {
      console.error(`스테이지 ${id}를 찾을 수 없습니다 — 선택 화면으로 되돌립니다.`);
      this.machine.forcePhase('STAGE_SELECT');
      this.overlay.showSelect(this.buildSelectView());
      return;
    }

    this.currentStageId = id;
    this.theme = def.theme;
    this.lastResult = null;
    this.newRecord = false;

    this.effects.clear();
    this.scene.mount(def);
    this.slingshot.reset();

    this.camera.setZoomBounds(def.camera.minZoom, def.camera.maxZoom);
    this.camera.setAnchor(def.slingshot.x, def.slingshot.y);
    this.camera.snapToAnchor();
    this.camera.preview(def.camera.previewRect, 1000); // R2: 1초 프리뷰 후 새총으로

    this.hud.resetScore();
    this.hud.setStageName(def.name, def.id);
    this.hud.setBirds(def.birds, 0);
  }

  private onStageClear(result: StageResult): void {
    this.lastResult = result;
    this.newRecord = this.progress.recordClear(result.stageId, result.total, result.stars);
    this.audio.play('clear');
    this.dispatch('CLEAR');
  }

  private onStageFail(result: StageResult): void {
    this.lastResult = result;
    this.progress.recordAttempt(result.stageId, result.baseScore);
    this.audio.play('fail');
    this.dispatch('FAIL');
  }

  private buildSelectView(): { cells: StageCellView[]; totalStars: number; maxStars: number; storageAvailable: boolean } {
    const cells: StageCellView[] = [];
    for (let id = 1; id <= STAGE_COUNT; id += 1) {
      const def = this.stageById(id);
      cells.push({
        id,
        name: def?.name ?? '(로드 실패)',
        unlocked: def !== null && this.progress.isUnlocked(id),
        stars: this.progress.starsOf(id),
        best: this.progress.bestOf(id),
      });
    }
    return {
      cells,
      totalStars: this.progress.totalStars(),
      maxStars: STAGE_COUNT * 3,
      storageAvailable: this.progress.available,
    };
  }

  // -------------------------------------------------------------- UI 액션

  private onUiAction(action: UiAction): void {
    switch (action.type) {
      case 'START':
        this.audio.unlock(); // 자동재생 정책: 첫 제스처 안에서 컨텍스트를 연다
        this.dispatch('START');
        break;
      case 'SELECT':
        this.dispatch('SELECT', action.stage);
        break;
      case 'BACK':
        this.dispatch('BACK');
        break;
      case 'RESUME':
        this.dispatch('RESUME');
        break;
      case 'RETRY':
        // PAUSED/CLEARED/FAILED → PLAYING. 전이 처리에서 enterStage가 재로드한다.
        this.dispatch('RETRY');
        break;
      case 'MENU':
        this.dispatch('MENU');
        break;
      case 'NEXT':
        this.dispatch('NEXT');
        break;
      case 'TO_SELECT':
        this.dispatch('TO_SELECT');
        break;
      case 'TOGGLE_SOUND': {
        const muted = !this.audio.isMuted;
        this.audio.setMuted(muted);
        this.progress.setMuted(muted);
        this.overlay.showMenu(muted);
        break;
      }
      default:
        break;
    }
  }

  // ---------------------------------------------------------------- 루프

  private frame(now: number): void {
    const elapsed = Math.min(100, now - this.lastFrameMs);
    this.lastFrameMs = now;

    if (this.machine.phase === 'PLAYING') {
      this.scene.frame(elapsed);
    }

    // 렌더 루프는 PAUSED에서도 계속 돈다(§3-26: "정지 화면을 그린다").
    this.camera.update(elapsed);
    this.effects.update(elapsed);
    this.hud.update(elapsed);

    this.renderer.draw({
      runtime: this.scene.stage,
      camera: this.camera,
      effects: this.effects,
      aim: this.slingshot.aim,
      theme: this.theme,
      showAim: this.machine.phase === 'PLAYING',
    });

    this.rafId = window.requestAnimationFrame((t) => this.frame(t));
  }
}

function emptyResult(stageId: number): StageResult {
  return {
    stageId,
    baseScore: 0,
    birdsLeft: 0,
    birdBonus: 0,
    total: 0,
    stars: 0,
    targetScore: 1,
    cleared: false,
  };
}
