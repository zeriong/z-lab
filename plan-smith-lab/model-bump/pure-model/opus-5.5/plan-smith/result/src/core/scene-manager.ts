// 씬 상태 머신 (§4.3). transition은 순수 함수, 부수 효과는 sceneEffects가 알려주는 목록대로 Game이 실행한다.
import { STAGE_COUNT } from '../config';
import type { SceneId } from '../types';

export type SceneEvent =
  | { type: 'START_GAME' }
  | { type: 'SELECT_STAGE'; stage: number; unlocked: number }
  | { type: 'BACK' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESTART' }
  | { type: 'TO_MAIN' }
  | { type: 'STAGE_CLEARED' }
  | { type: 'STAGE_FAILED' }
  | { type: 'NEXT_STAGE' };

export interface SceneState {
  scene: SceneId;
  /** 현재 스테이지 번호 (PLAYING/PAUSED/RESULT_*에서만 의미) */
  stage: number | null;
}

export const INITIAL_SCENE: SceneState = { scene: 'MAIN_MENU', stage: null };

/** 표에 없는 (상태, 이벤트) 조합은 null */
export function transition(state: SceneState, event: SceneEvent): SceneState | null {
  const { scene, stage } = state;
  switch (event.type) {
    case 'START_GAME':
      return scene === 'MAIN_MENU' ? { scene: 'STAGE_SELECT', stage: null } : null;
    case 'SELECT_STAGE':
      if (scene !== 'STAGE_SELECT') return null;
      if (!Number.isInteger(event.stage) || event.stage < 1 || event.stage > STAGE_COUNT) return null;
      if (event.stage > event.unlocked) return null;
      return { scene: 'PLAYING', stage: event.stage };
    case 'BACK':
      return scene === 'STAGE_SELECT' ? { scene: 'MAIN_MENU', stage: null } : null;
    case 'PAUSE':
      return scene === 'PLAYING' ? { scene: 'PAUSED', stage } : null;
    case 'RESUME':
      return scene === 'PAUSED' ? { scene: 'PLAYING', stage } : null;
    case 'RESTART':
      if (stage === null) return null;
      return scene === 'PAUSED' || scene === 'RESULT_CLEAR' || scene === 'RESULT_FAIL'
        ? { scene: 'PLAYING', stage }
        : null;
    case 'TO_MAIN':
      return scene === 'PAUSED' || scene === 'RESULT_CLEAR' || scene === 'RESULT_FAIL'
        ? { scene: 'MAIN_MENU', stage: null }
        : null;
    case 'STAGE_CLEARED':
      return scene === 'PLAYING' ? { scene: 'RESULT_CLEAR', stage } : null;
    case 'STAGE_FAILED':
      return scene === 'PLAYING' ? { scene: 'RESULT_FAIL', stage } : null;
    case 'NEXT_STAGE':
      if (scene !== 'RESULT_CLEAR' || stage === null || stage >= STAGE_COUNT) return null;
      return { scene: 'PLAYING', stage: stage + 1 };
  }
}

export type SceneEffect =
  | { type: 'create'; stage: number }
  | { type: 'dispose' }
  | { type: 'cancelDrag' }
  | { type: 'resetAccumulator' }
  | { type: 'saveClear' };

/**
 * onExit/onEnter에 해당하는 부수 효과 목록 (순서대로 실행).
 * 순수 함수라 테스트에서 표 전체를 검사할 수 있다.
 */
export function sceneEffects(prev: SceneState, event: SceneEvent, next: SceneState): SceneEffect[] {
  switch (event.type) {
    case 'SELECT_STAGE':
      return [{ type: 'create', stage: next.stage! }];
    case 'PAUSE':
      return [{ type: 'cancelDrag' }];
    case 'RESUME':
      return [{ type: 'resetAccumulator' }];
    case 'RESTART':
      return [{ type: 'dispose' }, { type: 'create', stage: next.stage! }, { type: 'resetAccumulator' }];
    case 'NEXT_STAGE':
      return [{ type: 'dispose' }, { type: 'create', stage: next.stage! }, { type: 'resetAccumulator' }];
    case 'TO_MAIN':
      return [{ type: 'dispose' }];
    case 'STAGE_CLEARED':
      return [{ type: 'saveClear' }];
    default:
      void prev;
      return [];
  }
}
