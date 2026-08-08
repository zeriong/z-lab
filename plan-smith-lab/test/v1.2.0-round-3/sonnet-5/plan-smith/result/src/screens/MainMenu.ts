import { playSfx } from "../audio";
import { renderMuteToggle } from "./SettingsOverlay";

export interface MainMenuCallbacks {
  onStart: () => void;
}

/** R1 — 메인 메뉴: "시작" 버튼 1개, 클릭 시 StageSelect로 전환. */
export function renderMainMenu(container: HTMLElement, callbacks: MainMenuCallbacks): void {
  container.innerHTML = "";

  const screen = document.createElement("div");
  screen.className = "screen";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = "앵그리버드류 슬링샷";

  const startButton = document.createElement("button");
  startButton.textContent = "시작";
  startButton.addEventListener("click", () => {
    playSfx("uiClick");
    callbacks.onStart();
  });

  screen.appendChild(title);
  screen.appendChild(startButton);
  container.appendChild(screen);

  renderMuteToggle(container);
}
