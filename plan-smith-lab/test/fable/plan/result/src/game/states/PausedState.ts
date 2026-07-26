import type { StateHandler } from '../StateMachine.ts';
import type { StateContext } from './StateContext.ts';

// Paused: 물리 스텝은 루프에서 Playing일 때만 돌므로 여기서는 UI만 다룬다.
// 진행 중이던 드래그는 취소해 새를 앵커로 되돌린다.
export function createPausedState(ctx: StateContext): StateHandler {
  return {
    onEnter() {
      ctx.slingshot.cancelDrag();
      ctx.pause.show();
    },
    onExit() {
      ctx.pause.hide();
    },
  };
}
