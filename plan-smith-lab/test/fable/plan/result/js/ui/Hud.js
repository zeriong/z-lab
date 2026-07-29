// 인게임 HUD: 스테이지·점수·남은 새 + 우측 상단 일시정지 버튼.

export class Hud {
  /** @param onPauseToggle 일시정지 버튼 클릭 콜백 */
  constructor(onPauseToggle) {
    this.root = document.getElementById('hud');
    this.stageEl = document.getElementById('hud-stage');
    this.scoreEl = document.getElementById('hud-score');
    this.birdsEl = document.getElementById('hud-birds');
    document.getElementById('btn-pause').addEventListener('click', onPauseToggle);
    this.cache = { stage: -1, score: -1, birds: -1 };
  }

  set(stage, score, birds) {
    if (this.cache.stage !== stage) {
      this.cache.stage = stage;
      this.stageEl.textContent = `STAGE ${stage}`;
    }
    if (this.cache.score !== score) {
      this.cache.score = score;
      this.scoreEl.textContent = `SCORE ${score}`;
    }
    if (this.cache.birds !== birds) {
      this.cache.birds = birds;
      this.birdsEl.textContent = `남은 새 ${birds}`;
    }
  }

  setVisible(visible) {
    this.root.classList.toggle('hidden', !visible);
  }
}
