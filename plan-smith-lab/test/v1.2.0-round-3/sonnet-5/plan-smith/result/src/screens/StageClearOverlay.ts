import { playSfx } from "../audio";

export interface StageClearOverlayCallbacks {
  onNextStage: () => void;
  onMain: () => void;
  hasNextStage: boolean;
}

/** R13 — 마지막 pig 제거 후 즉시 표시, 점수·별점 포함. */
export function showStageClearOverlay(
  root: HTMLElement,
  score: number,
  stars: number,
  callbacks: StageClearOverlayCallbacks
): () => void {
  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const panel = document.createElement("div");
  panel.className = "overlay-panel";

  const heading = document.createElement("h2");
  heading.textContent = "스테이지 클리어!";

  const starLine = document.createElement("div");
  starLine.style.fontSize = "28px";
  starLine.style.color = "#ffd166";
  starLine.textContent = "★".repeat(stars) + "☆".repeat(3 - stars);

  const scoreLine = document.createElement("div");
  scoreLine.textContent = `점수: ${score}`;

  panel.appendChild(heading);
  panel.appendChild(starLine);
  panel.appendChild(scoreLine);

  if (callbacks.hasNextStage) {
    const nextButton = document.createElement("button");
    nextButton.textContent = "다음 스테이지";
    nextButton.addEventListener("click", () => {
      playSfx("uiClick");
      callbacks.onNextStage();
    });
    panel.appendChild(nextButton);
  }

  const mainButton = document.createElement("button");
  mainButton.className = "secondary";
  mainButton.textContent = "메인으로";
  mainButton.addEventListener("click", () => {
    playSfx("uiClick");
    callbacks.onMain();
  });
  panel.appendChild(mainButton);

  overlay.appendChild(panel);
  root.appendChild(overlay);

  return () => overlay.remove();
}
