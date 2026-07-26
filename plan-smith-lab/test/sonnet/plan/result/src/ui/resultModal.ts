// UI 레이어: 클리어/실패 결과 모달. "다음 스테이지" / "다시하기" / "메인으로".
import type { Game } from "../game/game";
import { bus, Events } from "../eventBus";
import type { GameState } from "../types";

export class ResultModal {
  el: HTMLDivElement;
  private titleEl: HTMLHeadingElement;
  private scoreEl: HTMLParagraphElement;
  private nextBtn: HTMLButtonElement;

  constructor(private game: Game) {
    this.el = document.createElement("div");
    this.el.className = "overlay result-modal";
    this.el.innerHTML = `
      <div class="overlay-panel">
        <h2 class="result-title"></h2>
        <p class="result-score"></p>
        <button class="big-btn next-btn">다음 스테이지</button>
        <button class="big-btn ghost restart-btn">다시하기</button>
        <button class="big-btn ghost main-btn">메인으로</button>
      </div>
    `;
    this.titleEl = this.el.querySelector(".result-title")!;
    this.scoreEl = this.el.querySelector(".result-score")!;
    this.nextBtn = this.el.querySelector(".next-btn")!;

    this.nextBtn.addEventListener("click", () => this.game.nextStage());
    this.el.querySelector(".restart-btn")!.addEventListener("click", () => this.game.restart());
    this.el.querySelector(".main-btn")!.addEventListener("click", () => this.game.goMain());

    bus.on<{ score: number; stageId: number; hasNext: boolean }>(Events.StageCleared, (p) => {
      this.titleEl.textContent = "스테이지 클리어!";
      this.scoreEl.textContent = `점수: ${p.score}`;
      this.nextBtn.style.display = p.hasNext ? "" : "none";
      if (!p.hasNext) this.titleEl.textContent = "모든 스테이지 클리어!";
    });
    bus.on<{ score: number; stageId: number }>(Events.StageFailed, (p) => {
      this.titleEl.textContent = "실패했습니다";
      this.scoreEl.textContent = `점수: ${p.score}`;
      this.nextBtn.style.display = "none";
    });
    bus.on<GameState>(Events.StateChanged, (state) => {
      this.el.classList.toggle("visible", state === "Cleared" || state === "Failed");
    });
  }
}
