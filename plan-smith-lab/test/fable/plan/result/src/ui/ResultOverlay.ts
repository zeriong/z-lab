// 클리어/실패 결과 오버레이.
export class ResultOverlay {
  private root: HTMLElement;
  private title: HTMLElement;
  private detail: HTMLElement;
  private nextBtn: HTMLButtonElement;

  constructor(
    parent: HTMLElement,
    actions: { onNext: () => void; onRetry: () => void; onMain: () => void },
  ) {
    this.root = document.createElement('div');
    this.root.className = 'overlay hidden';
    this.root.innerHTML = `
      <div class="panel">
        <h2 class="result-title"></h2>
        <p class="result-detail"></p>
        <div class="panel-buttons">
          <button class="btn btn-primary" data-act="next">다음 스테이지</button>
          <button class="btn" data-act="retry">다시하기</button>
          <button class="btn" data-act="main">메인으로</button>
        </div>
      </div>`;
    this.title = this.root.querySelector('.result-title')!;
    this.detail = this.root.querySelector('.result-detail')!;
    this.nextBtn = this.root.querySelector('[data-act=next]')!;
    this.nextBtn.addEventListener('click', actions.onNext);
    this.root.querySelector('[data-act=retry]')!.addEventListener('click', actions.onRetry);
    this.root.querySelector('[data-act=main]')!.addEventListener('click', actions.onMain);
    parent.appendChild(this.root);
  }

  showClear(score: number, birdsLeft: number, isLastStage: boolean): void {
    this.title.textContent = isLastStage ? '🎉 모든 스테이지 클리어!' : '⭐ 스테이지 클리어!';
    this.detail.textContent = `점수 ${score.toLocaleString()}점 · 남은 새 보너스 ×${birdsLeft}`;
    this.nextBtn.classList.toggle('hidden', isLastStage);
    this.root.classList.remove('hidden');
  }

  showFail(score: number): void {
    this.title.textContent = '💥 실패...';
    this.detail.textContent = `점수 ${score.toLocaleString()}점 · 돼지가 남아 있어요`;
    this.nextBtn.classList.add('hidden');
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
