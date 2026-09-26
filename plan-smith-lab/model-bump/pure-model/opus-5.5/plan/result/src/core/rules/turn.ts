import {
  CLEAR_PENDING_SECONDS,
  FLY_TIMEOUT,
  LOADING_SECONDS,
  SETTLE_TIMEOUT,
} from '../../config/constants';

/**
 * 턴 서브상태 머신 (§4.2). 순수 리듀서다.
 * 시간은 모두 세션의 simTime으로 들어오므로, 세션 스텝을 멈추면(일시정지) 턴 전체가 얼어붙는다.
 * CLEARED / FAILED는 cleared / failed 이벤트를 낸 뒤의 종료 상태다.
 */
export type TurnState =
  | 'LOADING'
  | 'READY'
  | 'AIMING'
  | 'FLYING'
  | 'SETTLING'
  | 'EVALUATE'
  | 'CLEAR_PENDING'
  | 'CLEARED'
  | 'FAILED';

export interface TurnCtx {
  state: TurnState;
  /** 현재 상태에 들어온 simTime */
  since: number;
  /** 아직 발사하지 않은 새 수 (새총 위의 새 포함) */
  birdsLeft: number;
  pigsLeft: number;
}

export type TurnInput =
  | { type: 'tick'; now: number }
  | { type: 'grab'; now: number }
  | { type: 'release'; now: number; pullLen: number; minPull: number }
  | { type: 'cancel'; now: number }
  | { type: 'birdDone'; now: number }
  | { type: 'settled'; now: number }
  | { type: 'pigs'; now: number; pigsLeft: number }
  | { type: 'evaluate'; now: number };

export interface TurnTimings {
  loading: number;
  flyTimeout: number;
  settleTimeout: number;
  clearPending: number;
}

export const DEFAULT_TIMINGS: TurnTimings = {
  loading: LOADING_SECONDS,
  flyTimeout: FLY_TIMEOUT,
  settleTimeout: SETTLE_TIMEOUT,
  clearPending: CLEAR_PENDING_SECONDS,
};

const EPS = 1e-9;

export function initialTurn(birds: number, pigs: number, now = 0): TurnCtx {
  return { state: 'LOADING', since: now, birdsLeft: birds, pigsLeft: pigs };
}

export function isTerminal(s: TurnState): boolean {
  return s === 'CLEARED' || s === 'FAILED';
}

const to = (ctx: TurnCtx, state: TurnState, now: number, patch: Partial<TurnCtx> = {}): TurnCtx => ({
  ...ctx,
  ...patch,
  state,
  since: now,
});

export function turnReducer(ctx: TurnCtx, input: TurnInput, t: TurnTimings = DEFAULT_TIMINGS): TurnCtx {
  if (isTerminal(ctx.state)) return ctx;
  const { now } = input;
  const elapsed = now - ctx.since;

  switch (input.type) {
    case 'pigs': {
      const next = { ...ctx, pigsLeft: input.pigsLeft };
      // 어느 상태에서든 마지막 돼지가 죽으면 즉시 CLEAR_PENDING으로 간다.
      if (input.pigsLeft <= 0 && ctx.state !== 'CLEAR_PENDING') return to(next, 'CLEAR_PENDING', now);
      return next;
    }
    case 'tick':
      if (ctx.state === 'LOADING' && elapsed >= t.loading - EPS) return to(ctx, 'READY', now);
      if (ctx.state === 'FLYING' && elapsed >= t.flyTimeout - EPS) return to(ctx, 'SETTLING', now);
      if (ctx.state === 'SETTLING' && elapsed >= t.settleTimeout - EPS) return to(ctx, 'EVALUATE', now);
      if (ctx.state === 'CLEAR_PENDING' && elapsed >= t.clearPending - EPS) return to(ctx, 'CLEARED', now);
      return ctx;
    case 'grab':
      return ctx.state === 'READY' ? to(ctx, 'AIMING', now) : ctx;
    case 'release':
      if (ctx.state !== 'AIMING') return ctx;
      if (input.pullLen < input.minPull) return to(ctx, 'READY', now);
      return to(ctx, 'FLYING', now, { birdsLeft: ctx.birdsLeft - 1 });
    case 'cancel':
      return ctx.state === 'AIMING' ? to(ctx, 'READY', now) : ctx;
    case 'birdDone':
      return ctx.state === 'FLYING' ? to(ctx, 'SETTLING', now) : ctx;
    case 'settled':
      return ctx.state === 'SETTLING' ? to(ctx, 'EVALUATE', now) : ctx;
    case 'evaluate':
      if (ctx.state !== 'EVALUATE') return ctx;
      if (ctx.pigsLeft <= 0) return to(ctx, 'CLEAR_PENDING', now);
      // 실패는 EVALUATE에서만 판정한다.
      if (ctx.birdsLeft <= 0) return to(ctx, 'FAILED', now);
      return to(ctx, 'LOADING', now);
    default:
      return ctx;
  }
}
