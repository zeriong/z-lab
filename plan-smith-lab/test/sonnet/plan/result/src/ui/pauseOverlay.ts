// UI 레이어: 일시정지 오버레이. "다시하기" / "메인으로" 두 버튼만 노출한다
// (계속하기 버튼은 요구사항에 없어 1차 범위에서 제외 — plan.md 참고).
import type { Game } from "../game/game";
import { bus, Events } from "../eventBus";
import type { GameState } from "../types";

export class PauseOverlay {
  el: HTMLDivElement;

  constructor(private game: Game) {
    this.el = document.createElement("div");
    this.el.className = "overlay pause-overlay";
    this.el.innerHTML = `
      <div class="overlay-panel">
        <h2>일시정지</h2>
        <button class="big-btn restart-btn">다시하기</button>
        <button class="big-btn ghost main-btn">메인으로</button>
      </div>
    `;
    this.el.querySelector(".restart-btn")!.addEventListener("click", () => this.game.restart());
    this.el.querySelector(".main-btn")!.addEventListener("click", () => this.game.goMain());

    bus.on<GameState>(Events.StateChanged, (state) => {
      this.el.classList.toggle("visible", state === "Paused");
    });
  }
}
