import { playSfx } from "../audio";

export interface PauseOverlayCallbacks {
  onRetry: () => void;
  onMain: () => void;
}

/** R15 — 버튼은 "다시하기"/"메인으로" 이 둘뿐. 그 외 버튼(이어하기 등)은 요청사항에 없다. */
export function showPauseOverlay(root: HTMLElement, callbacks: PauseOverlayCallbacks): () => void {
  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const panel = document.createElement("div");
  panel.className = "overlay-panel";

  const heading = document.createElement("h2");
  heading.textContent = "일시정지";

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
