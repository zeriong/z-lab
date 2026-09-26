import type { SessionSnapshot } from '../core/GameSession';
import type { App } from './App';
import type { AppStateName } from './appMachine';

/**
 * E2E 테스트 훅 (§11.4). dev와 test 빌드에서 ?test=1일 때만 main.ts가 동적 import한다.
 * 프로덕션 빌드에는 들어가지 않는다.
 */
export interface GameTestHook {
  appState(): AppStateName;
  session(): SessionSnapshot | null;
  shoot(dx: number, dy: number): boolean;
  killAllPigs(): void;
}

declare global {
  interface Window {
    __game?: GameTestHook;
  }
}

export function installTestHook(app: App): void {
  window.__game = {
    appState: () => app.getState().name,
    session: () => app.sessionSnapshot(),
    shoot: (dx, dy) => app.testShoot(dx, dy),
    killAllPigs: () => app.testKillAllPigs(),
  };
}
