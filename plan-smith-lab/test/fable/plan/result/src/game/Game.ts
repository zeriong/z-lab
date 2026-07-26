import { getMaxCleared, setCleared } from '../core/storage.ts';
import { STAGES, stageById } from '../data/stages.ts';
import type { Hud } from '../ui/Hud.ts';
import type { MainMenu } from '../ui/MainMenu.ts';
import type { PauseOverlay } from '../ui/PauseOverlay.ts';
import type { ResultOverlay } from '../ui/ResultOverlay.ts';
import type { Particles } from './Particles.ts';
import type { Slingshot } from './Slingshot.ts';
import type { Stage } from './Stage.ts';
import { StateMachine } from './StateMachine.ts';
import { createMainMenuState } from './states/MainMenuState.ts';
import { createPausedState } from './states/PausedState.ts';
import { createPlayingState } from './states/PlayingState.ts';
import { createStageClearState } from './states/StageClearState.ts';
import { createStageFailedState } from './states/StageFailedState.ts';
import type { StateContext } from './states/StateContext.ts';
import { MATERIALS } from '../core/constants.ts';

// 게임 오케스트레이터: 상태 전이 액션(스테이지 로드 등)과 스테이지 이벤트 배선.
export class Game {
  readonly sm = new StateMachine();
  currentStageId = 1;

  constructor(
    readonly stage: Stage,
    slingshot: Slingshot,
    private particles: Particles,
    private ui: { menu: MainMenu; hud: Hud; pause: PauseOverlay; result: ResultOverlay },
  ) {
    const ctx: StateContext = {
      ...ui,
      slingshot,
      refreshMenu: () => ui.menu.refresh(getMaxCleared()),
    };
    this.sm.register('MainMenu', createMainMenuState(ctx));
    this.sm.register('Playing', createPlayingState(ctx));
    this.sm.register('Paused', createPausedState(ctx));
    this.sm.register('StageClear', createStageClearState(ctx));
    this.sm.register('StageFailed', createStageFailedState(ctx));

    stage.onEvent((e) => {
      switch (e.type) {
        case 'blockDestroyed':
          this.particles.burst(e.x, e.y, MATERIALS[e.material as keyof typeof MATERIALS].fill);
          this.particles.popup(e.x, e.y - 20, `+${e.points}`);
          break;
        case 'pigKilled':
          this.particles.burst(e.x, e.y, '#6fbf49', 14);
          this.particles.popup(e.x, e.y - 24, `+${e.points}`);
          break;
        case 'cleared': {
          setCleared(this.currentStageId);
          const isLast = this.currentStageId >= STAGES.length;
          this.ui.result.showClear(e.score, e.birdsLeft, isLast);
          this.sm.transition('StageClear');
          break;
        }
        case 'failed':
          this.ui.result.showFail(e.score);
          this.sm.transition('StageFailed');
          break;
      }
    });
  }

  start(): void {
    this.sm.start();
  }

  // --- 전이 액션들 (전이 표 밖의 요청은 no-op) ------------------------------------
  startStage(id: number): void {
    if (this.sm.transition('Playing')) {
      this.currentStageId = id;
      this.particles.clear();
      this.stage.load(stageById(id));
    }
  }

  pause(): void {
    this.sm.transition('Paused');
  }

  resume(): void {
    this.sm.transition('Playing'); // 리로드 없음 — 물리 상태 그대로 재개
  }

  // ⏸ 버튼: Playing이면 일시정지, Paused면 재클릭으로 해제
  togglePause(): void {
    if (this.sm.is('Playing')) this.pause();
    else if (this.sm.is('Paused')) this.resume();
  }

  retry(): void {
    // Paused/StageClear/StageFailed → Playing, 동일 스테이지 재로드
    if (this.sm.transition('Playing')) {
      this.particles.clear();
      this.stage.load(stageById(this.currentStageId));
    }
  }

  nextStage(): void {
    if (this.currentStageId < STAGES.length) this.startStage(this.currentStageId + 1);
  }

  toMain(): void {
    this.sm.transition('MainMenu');
  }

  get isPlaying(): boolean {
    return this.sm.is('Playing');
  }
}
