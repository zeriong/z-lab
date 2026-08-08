import { playSfx } from "../audio";

export interface StageFailOverlayCallbacks {
  onRetry: () => void;
  onMain: () => void;
}

/** R14 — 새가 모두 소진되고 투사체가 정지했는데 pig가 남아있으면 표시. */
export function showStageFailOverlay(root: HTMLElement, callbacks: StageFailOverlayCallbacks): () => void {
  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const panel = document.createElement("div");
  panel.className = "overlay-panel";

  const heading = document.createElement("h2");
  heading.textContent = "스테이지 실패";

  const retryButton = document.createElement("button");
  retryButton.textContent = "다시하기";
  retryButton.addEventListener("click", () => {
    playSfx("uiClick");
    callbacks.onRetry();
  });

  const mainButton = document.createElement("button");
  mainButton.className = "secondary";
  mainButton.textContent = "메인으로";
  mainButton.addEventListener("click", () => {
    playSfx("uiClick");
    callbacks.onMain();
  });

  panel.appendChild(heading);
  panel.appendChild(retryButton);
  panel.appendChild(mainButton);
  overlay.appendChild(panel);
  root.appendChild(overlay);

  return () => overlay.remove();
}
