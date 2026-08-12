// 씬 상태 머신 (M19) — 모든 화면 전환은 이 파일의 goTo() 한 곳에서만 일어난다.
// 전이 목록에 없는 전환은 금지 (§5).

import type { SceneName } from './types';

export interface SceneData {
  /** PLAYING 진입 시 스테이지 번호. 없으면 PAUSED→PLAYING 재개(월드 유지) */
  stage?: number;
}

type Listener = (to: SceneName, from: SceneName, data: SceneData) => void;

/**
 * §5 전이 목록:
 * MAIN → SELECT → PLAYING ⇄ PAUSED, PLAYING → CLEAR | FAIL,
 * CLEAR → (다음) PLAYING | SELECT | MAIN, FAIL → PLAYING(재시도) | MAIN,
 * PAUSED → PLAYING(계속/다시하기) | MAIN(메인으로, M17)
 */
const ALLOWED: Record<SceneName, SceneName[]> = {
  MAIN: ['SELECT'],
  SELECT: ['PLAYING'],
  PLAYING: ['PAUSED', 'CLEAR', 'FAIL'],
  PAUSED: ['PLAYING', 'MAIN'],
  CLEAR: ['PLAYING', 'SELECT', 'MAIN'],
  FAIL: ['PLAYING', 'MAIN'],
};

let current: SceneName = 'MAIN'; // 콜드스타트: 부팅 시 MAIN (§9)

const listeners: Listener[] = [];

export function scene(): SceneName {
  return current;
}

export function onScene(l: Listener): void {
  listeners.push(l);
}

/** 유일한 전이 함수 — 여기 외의 곳에서 씬을 바꾸면 M19 위반이다. */
export function goTo(to: SceneName, data: SceneData = {}): void {
  if (!ALLOWED[current].includes(to)) {
    // 금지 전이는 무시하고 기록만 남긴다 — 유령 상태(M19 부재 시나리오)를 만들지 않는다.
    console.error(`[scene] 금지된 전이: ${current} → ${to}`);
    return;
  }
  const from = current;
  current = to;
  for (const l of listeners) l(to, from, data);
}
