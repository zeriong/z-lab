// 클리어/실패 판정 (§4.6). 매 스텝 flushRemovals 다음에 실행한다.
import {
  CLEAR_DELAY_STEPS,
  FAIL_MAX_STEPS,
  FAIL_REST_STEPS,
  NEXT_BIRD_DELAY_STEPS,
  REST_SPEED,
  SCORE_BIRD_LEFT,
} from '../config';
import type { StageSession } from '../physics/session';
import { isFlightOver } from './birds';

export interface RulesState {
  /** 현재 대기 단계에서 지난 스텝 수 */
  timer: number;
  /** FAIL_PENDING: 월드 전체가 멈춰 있는 연속 스텝 수 */
  restSteps: number;
}

export function createRulesState(): RulesState {
  return { timer: 0, restSteps: 0 };
}

/** 동적 바디 전부의 속도 < 0.2 */
export function worldAtRest(s: StageSession): boolean {
  for (const rec of s.registry.values()) {
    const b = rec.body;
    if (b.isStatic) continue;
    if (Math.hypot(b.velocity.x, b.velocity.y) >= REST_SPEED) return false;
  }
  return true;
}

export function afterStep(s: StageSession): void {
  if (s.resultSent) return;
  const st = s.rules;

  // phase와 상관없이 돼지 전멸을 먼저 확인
  if (s.pigsAlive <= 0 && s.phase !== 'CLEAR_PENDING') {
    s.phase = 'CLEAR_PENDING';
    st.timer = 0;
    s.slingshot.cancel();
    s.hooks.onChange?.();
  }

  switch (s.phase) {
    case 'CLEAR_PENDING': {
      st.timer++;
      if (st.timer >= CLEAR_DELAY_STEPS) {
        s.score += s.birdsLeft * SCORE_BIRD_LEFT;
        s.finish('clear');
      }
      break;
    }
    case 'FLYING': {
      if (!s.flight || isFlightOver(s.flight)) {
        s.flight = null;
        st.timer = 0;
        st.restSteps = 0;
        s.phase = s.birdsLeft > 0 ? 'WAITING_NEXT' : 'FAIL_PENDING';
        s.hooks.onChange?.();
      }
      break;
    }
    case 'WAITING_NEXT': {
      st.timer++;
      if (st.timer >= NEXT_BIRD_DELAY_STEPS) s.loadNext();
      break;
    }
    case 'FAIL_PENDING': {
      st.timer++;
      st.restSteps = worldAtRest(s) ? st.restSteps + 1 : 0;
      if ((st.restSteps >= FAIL_REST_STEPS || st.timer >= FAIL_MAX_STEPS) && s.pigsAlive > 0) {
        s.finish('fail');
      }
      break;
    }
    case 'AIMING':
      break;
  }
}
