import { STAGES } from '../data/stages.ts';

// 메인 메뉴: 타이틀 + 스테이지 선택 그리드(잠금 표시).
export class MainMenu {
  private root: HTMLElement;
  private grid: HTMLElement;
  private onSelect: (stageId: number) => void;

  constructor(parent: HTMLElement, onSelect: (stageId: number) => void) {
    this.onSelect = onSelect;
    this.root = document.createElement('div');
    this.root.className = 'main-menu hidden';
    this.root.innerHTML = `
      <h1 class="menu-title">🐦 앵그리 슬링샷</h1>
      <p class="menu-sub">새총을 당겨 돼지를 전부 쓰러뜨리세요!</p>
      <div class="stage-grid"></div>
      <p class="menu-hint">새를 드래그해서 조준하고, 놓으면 발사됩니다</p>`;
    this.grid = this.root.querySelector('.stage-grid')!;
    parent.appendChild(this.root);
  }

  // 잠금 해제 상태를 반영해 스테이지 버튼을 다시 그린다.
  refresh(maxCleared: number): void {
    this.grid.innerHTML = '';
    for (const s of STAGES) {
      const unlocked = s.id <= maxCleared + 1;
      const btn = document.createElement('button');
      btn.className = 'stage-btn' + (unlocked ? '' : ' locked');
      btn.disabled = !unlocked;
      btn.innerHTML = unlocked
        ? `<span class="stage-num">${s.id}</span>${s.id <= maxCleared ? '<span class="stage-star">⭐</span>' : ''}`
        : `<span class="stage-num">🔒</span>`;
      if (unlocked) btn.addEventListener('click', () => this.onSelect(s.id));
      this.grid.appendChild(btn);
    }
  }

  show(): void {
    this.root.classList.remove('hidden');
  }

  hide(): void {
    this.root.classList.add('hidden');
  }
}
