// 일시정지 오버레이: 계속하기 / 다시하기 / 메인으로.

export class PauseOverlay {
  /** @param cb { onResume, onRetry, onMain } */
  constructor(cb) {
    this.root = document.getElementById('pause-overlay');
    document.getElementById('btn-resume').addEventListener('click', cb.onResume);
    document.getElementById('btn-pause-retry').addEventListener('click', cb.onRetry);
    document.getElementById('btn-pause-main').addEventListener('click', cb.onMain);
  }

  setVisible(visible) {
    this.root.classList.toggle('hidden', !visible);
  }
}
