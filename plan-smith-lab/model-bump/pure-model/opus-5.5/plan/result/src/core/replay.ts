import { DT, REPLAY_MAX_SECONDS } from '../config/constants';
import type { GameSession } from './GameSession';
import type { ShotDef } from './stage/schema';

/**
 * 기준 해법 재생 (§11.2). 턴 상태가 READY가 되면 다음 샷을 launch(pull)로 넣고,
 * FLYING 중 abilityAt초가 되면 activateAbility()를 부른다.
 * cleared/failed가 나오거나 시뮬레이션 시간이 maxSeconds에 도달할 때까지 반복한다.
 */

export type ReplayOutcome = 'cleared' | 'failed' | 'timeout' | 'outOfShots';

export interface ReplayResult {
  outcome: ReplayOutcome;
  score: number;
  birdsLeft: number;
  pigsLeft: number;
  shotsFired: number;
  simTime: number;
}

export interface ReplayOptions {
  maxSeconds?: number;
  /** 모든 샷의 당김 벡터에 더할 오프셋 (견고성 확인 S-7) */
  jitter?: readonly [number, number];
  /** 해법이 끝났는데 새가 남으면 마지막 샷을 반복한다 (S-7 변형 재생) */
  repeatLast?: boolean;
}

export function replaySolution(session: GameSession, shots: readonly ShotDef[], opts: ReplayOptions = {}): ReplayResult {
  const maxSeconds = opts.maxSeconds ?? REPLAY_MAX_SECONDS;
  const [jx, jy] = opts.jitter ?? [0, 0];
  let fired = 0;
  let current: ShotDef | null = null;
  let outcome: ReplayOutcome = 'timeout';

  while (session.simTime < maxSeconds) {
    const state = session.turnState;
    if (state === 'CLEARED') {
      outcome = 'cleared';
      break;
    }
    if (state === 'FAILED') {
      outcome = 'failed';
      break;
    }
    if (state === 'READY') {
      const shot = shots[fired] ?? (opts.repeatLast && shots.length > 0 ? shots[shots.length - 1] : undefined);
      if (!shot) {
        outcome = 'outOfShots';
        break;
      }
      fired++;
      current = shot;
      if (!session.launch([shot.pull[0] + jx, shot.pull[1] + jy])) {
        outcome = 'outOfShots';
        break;
      }
    }
    if (
      session.turnState === 'FLYING' &&
      current?.abilityAt !== undefined &&
      session.flightTime >= current.abilityAt - 1e-9
    ) {
      session.activateAbility();
    }
    session.step(DT);
  }

  return {
    outcome,
    score: session.score,
    birdsLeft: session.birdsLeft,
    pigsLeft: session.pigsLeft,
    shotsFired: fired,
    simTime: session.simTime,
  };
}
