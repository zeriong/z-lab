// UI 레이어: 인게임 HUD (점수, 남은 새, 일시정지 버튼).
// 일시정지 버튼은 요구사항대로 화면 우측(고정)에 배치한다.
import type { Game } from "../game/game";
import { bus, Events } from "../eventBus";
import { BIRDS } from "../data/birds";
import type { GameState } from "../types";

export class Hud {
  el: HTMLDivElement;
  private scoreEl: HTMLSpanElement;
  private stageNameEl: HTMLSpanElement;
  private birdsEl: HTMLDivElement;

  constructor(private game: Game) {
    this.el = document.createElement("div");
    this.el.className = "hud";
    this.el.innerHTML = `
      <div class="hud-top-left">
        <span class="hud-stage-name"></span>
        <span class="hud-score-label">점수 <span class="hud-score">0</span></span>
      </div>
      <div class="hud-birds"></div>
      <button class="pause-btn" aria-label="일시정지" title="일시정지">⏸</button>
    `;
    this.scoreEl = this.el.querySelector(".hud-score")!;
    this.stageNameEl = this.el.querySelector(".hud-stage-name")!;
    this.birdsEl = this.el.querySelector(".hud-birds")!;

    this.el.querySelector<HTMLButtonElement>(".pause-btn")!.addEventListener("click", () => {
      this.game.pause();
    });

    bus.on<number>(Events.ScoreChanged, (score) => {
      this.scoreEl.textContent = String(score);
    });
    bus.on(Events.BirdReady, () => this.renderBirdQueue());
    bus.on(Events.BirdLaunched, () => this.renderBirdQueue());
    bus.on<GameState>(Events.StateChanged, (state) => this.applyVisibility(state));
    bus.on(Events.StageStarted, () => this.onStageStart());
  }

  private renderBirdQueue(): void {
    const stage = this.game.stage;
    if (!stage) return;
    this.birdsEl.innerHTML = "";
    const upcoming = stage.birds.slice(this.game.birdsLaunchedCount);
    for (const type of upcoming) {
      const dot = document.createElement("span");
      dot.className = "bird-dot";
      dot.style.background = BIRDS[type].color;
      dot.title = BIRDS[type].label;
      this.birdsEl.appendChild(dot);
    }
  }

  onStageStart(): void {
    if (this.game.stage) this.stageNameEl.textContent = this.game.stage.name;
    this.renderBirdQueue();
  }

  private applyVisibility(state: GameState): void {
    if (state === "InGame" || state === "Paused") {
      this.el.classList.add("visible");
    } else {
      this.el.classList.remove("visible");
    }
  }
}
