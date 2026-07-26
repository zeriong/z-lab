import type { StateHandler } from '../StateMachine.ts';
import type { StateContext } from './StateContext.ts';

export function createPlayingState(ctx: StateContext): StateHandler {
  return {
    onEnter() {
      ctx.menu.hide();
      ctx.pause.hide();
      ctx.result.hide();
      ctx.hud.show();
    },
  };
}
