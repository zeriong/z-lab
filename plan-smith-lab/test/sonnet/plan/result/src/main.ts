// 애플리케이션 진입점: DOM 골격 구성 + 각 레이어 인스턴스 생성/배선 + 메인 루프.
import "./style.css";
import { Game } from "./game/game";
import { Renderer } from "./render/renderer";
import { MainMenu } from "./ui/mainMenu";
import { Hud } from "./ui/hud";
import { PauseOverlay } from "./ui/pauseOverlay";
import { ResultModal } from "./ui/resultModal";
import { bus, Events } from "./eventBus";
import type { GameState } from "./types";

const app = document.getElementById("app")!;

const gameStage = document.createElement("div");
gameStage.className = "game-stage";

const canvas = document.createElement("canvas");
canvas.id = "game-canvas";
gameStage.appendChild(canvas);

const game = new Game(canvas);
const renderer = new Renderer(canvas);

const hud = new Hud(game);
gameStage.appendChild(hud.el);

const pauseOverlay = new PauseOverlay(game);
gameStage.appendChild(pauseOverlay.el);

const resultModal = new ResultModal(game);
gameStage.appendChild(resultModal.el);

app.appendChild(gameStage);

const mainMenu = new MainMenu(game);
app.appendChild(mainMenu.el);

bus.on<GameState>(Events.StateChanged, (state) => {
  if (state === "Main") mainMenu.show();
  else mainMenu.hide();
});
bus.on(Events.StageStarted, () => renderer.clearParticles());

// 초기 화면: 메인 메뉴
mainMenu.show();

// ---------------------------------------------------------------- Main loop
let lastTime = performance.now();
function loop(now: number): void {
  const dt = now - lastTime;
  lastTime = now;

  game.update(dt);
  renderer.update(dt);
  renderer.draw(game);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
