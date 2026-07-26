import type { StateHandler } from '../StateMachine.ts';
import type { StateContext } from './StateContext.ts';

export function createMainMenuState(ctx: StateContext): StateHandler {
  return {
    onEnter() {
      ctx.refreshMenu();
      ctx.menu.show();
      ctx.hud.hide();
      ctx.pause.hide();
      ctx.result.hide();
    },
    onExit() {
      ctx.menu.hide();
    },
  };
}
