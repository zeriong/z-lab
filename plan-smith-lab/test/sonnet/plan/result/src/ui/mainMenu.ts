// UI 레이어: 메인 메뉴 (스테이지 선택). Game 인스턴스의 startStage() 만 호출한다.
import { STAGE_COUNT } from "../data/stageLoader";
import { loadProgress } from "../game/progress";
import type { Game } from "../game/game";

export class MainMenu {
  el: HTMLDivElement;

  constructor(private game: Game) {
    this.el = document.createElement("div");
    this.el.className = "screen main-menu";
    this.render();
  }

  render(): void {
    const progress = loadProgress();
    this.el.innerHTML = "";

    const title = document.createElement("h1");
    title.className = "game-title";
    title.textContent = "Sling Birds";
    this.el.appendChild(title);

    const subtitle = document.createElement("p");
    subtitle.className = "game-subtitle";
    subtitle.textContent = "스테이지를 선택하세요";
    this.el.appendChild(subtitle);

    const grid = document.createElement("div");
    grid.className = "stage-grid";
    for (let i = 1; i <= STAGE_COUNT; i++) {
      const locked = i > progress.unlockedStage;
      const btn = document.createElement("button");
      btn.className = "stage-btn" + (locked ? " locked" : "");
      btn.disabled = locked;
      const best = progress.bestScores[i];
      btn.innerHTML = `<span class="stage-num">${i}</span>${
        locked ? '<span class="lock-icon">🔒</span>' : best ? `<span class="stage-best">${best}</span>` : ""
      }`;
      btn.addEventListener("click", () => this.game.startStage(i));
      grid.appendChild(btn);
    }
    this.el.appendChild(grid);
  }

  show(): void {
    this.render();
    this.el.classList.add("visible");
  }

  hide(): void {
    this.el.classList.remove("visible");
  }
}
