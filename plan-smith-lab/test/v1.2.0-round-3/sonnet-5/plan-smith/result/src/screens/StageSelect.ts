import { getAllStages } from "../stageRegistry";
import { loadProgress } from "../progress";
import { playSfx } from "../audio";

export interface StageSelectCallbacks {
  onSelectStage: (stageId: number) => void;
  onBack: () => void;
}

/** R2 — 10개 타일, 각 타일에 잠금 아이콘 또는 별점(0~3)이 항상 표시됨. */
export function renderStageSelect(container: HTMLElement, callbacks: StageSelectCallbacks): void {
  container.innerHTML = "";

  const screen = document.createElement("div");
  screen.className = "screen";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = "스테이지 선택";
  title.style.fontSize = "28px";

  const grid = document.createElement("div");
  grid.className = "stage-grid";

  const progress = loadProgress();

  for (const stage of getAllStages()) {
    const tile = document.createElement("div");
    const stageProgress = progress.stages[stage.id];
    const unlocked = stageProgress?.unlocked ?? stage.id === 1;

    tile.className = unlocked ? "stage-tile" : "stage-tile locked";
    const number = document.createElement("div");
    number.textContent = String(stage.id);

    if (unlocked) {
      const stars = document.createElement("div");
      stars.className = "stars";
      const starCount = stageProgress?.stars ?? 0;
      stars.textContent = "★".repeat(starCount) + "☆".repeat(3 - starCount);
      tile.appendChild(number);
      tile.appendChild(stars);
      tile.addEventListener("click", () => {
        playSfx("uiClick");
        callbacks.onSelectStage(stage.id);
      });
    } else {
      const lock = document.createElement("div");
      lock.className = "lock-icon";
      lock.textContent = "🔒";
      tile.appendChild(lock);
    }

    grid.appendChild(tile);
  }

  const backButton = document.createElement("button");
  backButton.className = "secondary";
  backButton.textContent = "메인으로";
  backButton.addEventListener("click", () => {
    playSfx("uiClick");
    callbacks.onBack();
  });

  screen.appendChild(title);
  screen.appendChild(grid);
  screen.appendChild(backButton);
  container.appendChild(screen);
}
