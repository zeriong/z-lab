import { renderMainMenu } from "./screens/MainMenu";
import { renderStageSelect } from "./screens/StageSelect";
import { renderGameScreen } from "./screens/GameScreen";

const app = document.getElementById("app");
if (!app) throw new Error("#app 컨테이너를 찾을 수 없습니다.");

let cleanupCurrentScreen: (() => void) | null = null;

function teardownAndClear(): void {
  cleanupCurrentScreen?.();
  cleanupCurrentScreen = null;
}

// R1 — 첫 로드 시 MainMenu.
function showMainMenu(): void {
  teardownAndClear();
  renderMainMenu(app!, { onStart: showStageSelect });
}

// R2 — StageSelect: 10개 타일.
function showStageSelect(): void {
  teardownAndClear();
  renderStageSelect(app!, { onSelectStage: showGame, onBack: showMainMenu });
}

// R1~R17 인게임 루프. "메인으로"는 Explicit assumptions에 따라 항상 MainMenu로 향한다.
function showGame(stageId: number): void {
  teardownAndClear();
  cleanupCurrentScreen = renderGameScreen(app!, stageId, { onExitToMain: showMainMenu });
}

showMainMenu();
