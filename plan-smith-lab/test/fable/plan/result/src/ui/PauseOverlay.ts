// 일시정지 오버레이: 반투명 딤 + 중앙 패널(계속하기 / 다시하기 / 메인으로).
export class PauseOverlay {
  private root: HTMLElement;

  constructor(
    parent: HTMLElement,
    actions: { onResume: () => void; onRetry: () => void; onMain: () => void },
  ) {
    this.root = document.createElement('div');
    this.root.className = 'overlay hidden';
    this.root.innerHTML = `
      <div class="panel">
        <h2>일시정지</h2>
        <div class="panel-buttons">
          <button class="btn btn-primary" data-act="resume">계속하기</button>
          <button class="btn" data-act="retry">다시하기</button>
          <button class="btn" data-act="main">메인으로</button>
        </div>
      </div>`;
    this.root.querySelector('[data-act=resume]')!.addEventListener('click', actions.onResume);
    this.root.querySelector('[data-act=retry]')!.addEventListener('click', actions.onRetry);
    this.root.querySelector('[data-act=main]')!.addEventListener('click', actions.onMain);
    parent.appendChild(this.root);
  }

  show(): void {
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
