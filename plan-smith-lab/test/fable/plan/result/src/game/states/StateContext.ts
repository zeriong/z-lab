import type { Hud } from '../../ui/Hud.ts';
import type { MainMenu } from '../../ui/MainMenu.ts';
import type { PauseOverlay } from '../../ui/PauseOverlay.ts';
import type { ResultOverlay } from '../../ui/ResultOverlay.ts';
import type { Slingshot } from '../Slingshot.ts';

// 상태 핸들러들이 공유하는 컨텍스트 — 상태는 UI 표시/숨김만 책임진다.
// (스테이지 로드 등 액션은 Game이 전이 전에 수행한다.)
export interface StateContext {
  menu: MainMenu;
  hud: Hud;
  pause: PauseOverlay;
  result: ResultOverlay;
  slingshot: Slingshot;
  refreshMenu(): void;
}
