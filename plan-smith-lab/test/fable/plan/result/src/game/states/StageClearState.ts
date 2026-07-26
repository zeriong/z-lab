import type { StateHandler } from '../StateMachine.ts';
import type { StateContext } from './StateContext.ts';

// 결과 오버레이 내용은 Game이 전이 직전에 채운다(showClear).
export function createStageClearState(ctx: StateContext): StateHandler {
  return {
    onExit() {
      ctx.result.hide();
    },
  };
}
