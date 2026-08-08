import { GameScene } from "../GameScene";
import { WORLD_HEIGHT, WORLD_WIDTH } from "../stageRegistry";
import { showPauseOverlay } from "./PauseOverlay";
import { showStageClearOverlay } from "./StageClearOverlay";
import { showStageFailOverlay } from "./StageFailOverlay";
import { playSfx } from "../audio";

export interface GameScreenCallbacks {
  onExitToMain: () => void;
}

/**
 * 인게임 화면 컨테이너 — 캔버스(물리/렌더) + HUD(R3/R4) + 우측 고정 일시정지 버튼(R5) +
 * 오버레이(R13/R14/R15) 배선. 반환값은 화면을 떠날 때 호출할 정리 함수.
 */
export function renderGameScreen(container: HTMLElement, stageId: number, callbacks: GameScreenCallbacks): () => void {
  container.innerHTML = "";

  const root = document.createElement("div");
  root.className = "game-root";

  const canvas = document.createElement("canvas");
  canvas.id = "game-canvas";
  canvas.width = WORLD_WIDTH;
  canvas.height = WORLD_HEIGHT;

  const hud = document.createElement("div");
  hud.className = "hud";
  const hudLeft = document.createElement("div");
  hudLeft.className = "hud-left";
  const birdsLabel = document.createElement("div");
  const scoreLabel = document.createElement("div");
  hudLeft.appendChild(birdsLabel);
  hudLeft.appendChild(scoreLabel);
  hud.appendChild(hudLeft);

  // R5 — 뷰포트 크기와 무관하게 항상 화면 우측 안에 보임(고정 위치, .game-root가 inset:0).
  const pauseButton = document.createElement("button");
  pauseButton.id = "pause-button";
  pauseButton.textContent = "⏸";

  root.appendChild(canvas);
  root.appendChild(hud);
  root.appendChild(pauseButton);
  container.appendChild(root);

  let removeOverlay: (() => void) | null = null;

  const scene = new GameScene(canvas, {
    onHudUpdate: (birdsRemaining, score) => {
      birdsLabel.textContent = `새: ${birdsRemaining}`;
      scoreLabel.textContent = `점수: ${score}`;
    },
    onCleared: (clearedStageId, score, stars, hasNextStage) => {
      removeOverlay?.();
      removeOverlay = showStageClearOverlay(root, score, stars, {
        hasNextStage,
        onNextStage: () => {
          removeOverlay?.();
          removeOverlay = null;
          scene.load(clearedStageId + 1);
        },
        onMain: () => {
          removeOverlay?.();
          removeOverlay = null;
          scene.goToMain();
          callbacks.onExitToMain();
        }
      });
    },
    onFailed: () => {
      removeOverlay?.();
      removeOverlay = showStageFailOverlay(root, {
        onRetry: () => {
          removeOverlay?.();
          removeOverlay = null;
          scene.retry();
        },
        onMain: () => {
          removeOverlay?.();
          removeOverlay = null;
          scene.goToMain();
          callbacks.onExitToMain();
        }
      });
    }
  });

  pauseButton.addEventListener("click", () => {
    if (scene.state === "Paused") return;
    playSfx("uiClick");
    scene.pause();
    removeOverlay?.();
    removeOverlay = showPauseOverlay(root, {
      onRetry: () => {
        removeOverlay?.();
        removeOverlay = null;
        scene.retry();
      },
      onMain: () => {
        removeOverlay?.();
        removeOverlay = null;
        scene.goToMain();
        callbacks.onExitToMain();
      }
    });
  });

  scene.load(stageId);

  return () => {
    removeOverlay?.();
    scene.destroy();
  };
}
