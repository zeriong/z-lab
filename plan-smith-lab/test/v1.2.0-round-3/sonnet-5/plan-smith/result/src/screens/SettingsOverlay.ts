import { isMuted, playSfx, toggleMuted } from "../audio";

/** R32 — 설정(음소거 토글, thin). 토글 후 새로고침에도 상태가 유지된다(progress.muted). */
export function renderMuteToggle(container: HTMLElement): void {
  const muteButton = document.createElement("button");
  muteButton.className = "mute-toggle";

  const syncLabel = () => {
    muteButton.textContent = isMuted() ? "🔇" : "🔊";
  };
  syncLabel();

  muteButton.addEventListener("click", () => {
    toggleMuted();
    syncLabel();
    playSfx("uiClick");
  });

  container.appendChild(muteButton);
}
