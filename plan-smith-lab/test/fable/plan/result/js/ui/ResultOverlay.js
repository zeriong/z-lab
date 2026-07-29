// 클리어/실패 결과 오버레이.

export class ResultOverlay {
  /** @param cb { onNext, onRetry, onMain } */
  constructor(cb) {
    this.root = document.getElementById('result-overlay');
    this.titleEl = document.getElementById('result-title');
    this.scoreEl = document.getElementById('result-score');
    this.nextBtn = document.getElementById('btn-next');
    this.nextBtn.addEventListener('click', cb.onNext);
    document.getElementById('btn-result-retry').addEventListener('click', cb.onRetry);
    document.getElementById('btn-result-main').addEventListener('click', cb.onMain);
  }

  showClear(stageId, score, bonus, hasNext) {
    this.titleEl.textContent = `STAGE ${stageId} CLEAR!`;
    this.scoreEl.textContent = `점수 ${score}\n(남은 새 보너스 +${bonus})`;
    this.nextBtn.classList.toggle('hidden', !hasNext);
    this.root.classList.remove('hidden');
  }

  showFail(stageId) {
    this.titleEl.textContent = `STAGE ${stageId} 실패...`;
    this.scoreEl.textContent = '새를 모두 소진했습니다. 다시 도전하세요!';
    this.nextBtn.classList.add('hidden');
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }
}
