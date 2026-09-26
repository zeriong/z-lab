// Game: 씬 머신 + 현재 세션 + 저장 + 오디오를 묶는다. DOM에 의존하지 않아 node 테스트에서 그대로 쓴다.
import type { AudioLike } from '../audio/audio';
import { StageSession } from '../physics/session';
import type { SaveStore } from '../storage/storage';
import type { ResultInfo, SceneId, StageData, Vec2 } from '../types';
import { starsFor } from '../game/score';
import { STAGE_COUNT } from '../config';
import { INITIAL_SCENE, sceneEffects, transition, type SceneEffect, type SceneEvent, type SceneState } from './scene-manager';

export interface GameDeps {
  stages: readonly StageData[];
  save: SaveStore;
  audio?: AudioLike;
  /** 상태가 바뀌면 호출 (UI 갱신) */
  onChange?: () => void;
  /** 씬이 바뀌면 호출 (페이드) */
  onSceneChange?: (prev: SceneState, next: SceneState) => void;
  /** RESUME·RESTART 때 루프 누적기 초기화 */
  resetAccumulator?: () => void;
}

export type PointerResult = 'grab' | 'ability' | null;

export class Game {
  state: SceneState = { ...INITIAL_SCENE };
  session: StageSession | null = null;
  lastResult: ResultInfo | null = null;

  constructor(private readonly deps: GameDeps) {}

  get scene(): SceneId {
    return this.state.scene;
  }

  get save(): SaveStore {
    return this.deps.save;
  }

  stageData(n: number): StageData {
    const s = this.deps.stages.find((st) => st.id === n);
    if (!s) throw new Error(`stage ${n} not found`);
    return s;
  }

  dispatch(event: SceneEvent): boolean {
    const prev = this.state;
    const next = transition(prev, event);
    if (!next) return false;
    this.state = next;
    for (const eff of sceneEffects(prev, event, next)) this.run(eff);
    if (event.type === 'STAGE_FAILED') this.recordFail();
    if (prev.scene !== next.scene || prev.stage !== next.stage) this.deps.onSceneChange?.(prev, next);
    this.deps.onChange?.();
    return true;
  }

  private run(eff: SceneEffect): void {
    switch (eff.type) {
      case 'create':
        this.createSession(eff.stage);
        break;
      case 'dispose':
        this.session?.dispose();
        this.session = null;
        break;
      case 'cancelDrag':
        this.session?.cancelDrag();
        break;
      case 'resetAccumulator':
        this.deps.resetAccumulator?.();
        break;
      case 'saveClear':
        this.recordClear();
        break;
    }
  }

  private createSession(n: number): void {
    this.session?.dispose();
    this.lastResult = null;
    const stage = this.stageData(n);
    const audio = this.deps.audio;
    const session = StageSession.create(stage, {
      onSound: (id, k) => audio?.play(id, k),
      onChange: () => this.deps.onChange?.(),
      onResult: (kind) => {
        if (this.session !== session) return; // 이미 버려진 세션
        this.dispatch({ type: kind === 'clear' ? 'STAGE_CLEARED' : 'STAGE_FAILED' });
      },
    });
    this.session = session;
  }

  private recordClear(): void {
    const s = this.session;
    if (!s) return;
    const stars = starsFor(s.stage, s.score, true);
    const newBest = this.deps.save.recordClear(s.stage.id, s.score, stars);
    this.lastResult = {
      stageId: s.stage.id,
      cleared: true,
      score: s.score,
      stars,
      bestScore: this.deps.save.record(s.stage.id).bestScore,
      newBest,
      isLast: s.stage.id >= STAGE_COUNT,
    };
  }

  private recordFail(): void {
    const s = this.session;
    if (!s) return;
    this.lastResult = {
      stageId: s.stage.id,
      cleared: false,
      score: s.score,
      stars: 0,
      bestScore: this.deps.save.record(s.stage.id).bestScore,
      newBest: false,
      isLast: s.stage.id >= STAGE_COUNT,
    };
  }

  // ── UI에서 쓰는 명령 ─────────────────────────────────────────
  startGame(): boolean {
    return this.dispatch({ type: 'START_GAME' });
  }
  selectStage(n: number): boolean {
    return this.dispatch({ type: 'SELECT_STAGE', stage: n, unlocked: this.deps.save.unlocked });
  }
  back(): boolean {
    return this.dispatch({ type: 'BACK' });
  }
  pause(): boolean {
    return this.dispatch({ type: 'PAUSE' });
  }
  resume(): boolean {
    return this.dispatch({ type: 'RESUME' });
  }
  /** ESC·일시정지 버튼: PLAYING ↔ PAUSED */
  togglePause(): boolean {
    if (this.state.scene === 'PLAYING') return this.pause();
    if (this.state.scene === 'PAUSED') return this.resume();
    return false;
  }
  restart(): boolean {
    return this.dispatch({ type: 'RESTART' });
  }
  toMain(): boolean {
    return this.dispatch({ type: 'TO_MAIN' });
  }
  nextStage(): boolean {
    return this.dispatch({ type: 'NEXT_STAGE' });
  }
  /** visibilitychange → hidden */
  onHidden(): boolean {
    return this.state.scene === 'PLAYING' ? this.pause() : false;
  }

  toggleMute(): boolean {
    const muted = !this.deps.save.muted;
    this.deps.save.setMuted(muted);
    this.deps.audio?.setMuted(muted);
    this.deps.onChange?.();
    return muted;
  }

  // ── 루프 ─────────────────────────────────────────────────────
  shouldStep(): boolean {
    return this.state.scene === 'PLAYING' && !!this.session && !this.session.resultSent;
  }

  step(): void {
    if (!this.shouldStep()) return;
    this.session!.step();
  }

  // ── 입력 (월드 좌표) ─────────────────────────────────────────
  pointerDown(p: Vec2, pointerId: number | null = null): PointerResult {
    const s = this.session;
    if (this.state.scene !== 'PLAYING' || !s) return null;
    if (s.phase === 'FLYING') {
      if (s.flight && !s.flight.abilityUsed && s.useAbility()) {
        this.deps.onChange?.();
        return 'ability';
      }
      return null;
    }
    if (s.grab(p, pointerId)) {
      this.deps.onChange?.();
      return 'grab';
    }
    return null;
  }

  pointerMove(p: Vec2): void {
    if (this.state.scene !== 'PLAYING') return;
    this.session?.drag(p);
  }

  pointerUp(): boolean {
    if (this.state.scene !== 'PLAYING' || !this.session) return false;
    const launched = this.session.release();
    this.deps.onChange?.();
    return launched;
  }

  pointerCancel(): void {
    this.session?.cancelDrag();
  }
}
