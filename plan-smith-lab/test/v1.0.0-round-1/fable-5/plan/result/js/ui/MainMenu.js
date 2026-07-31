// 메인 메뉴: 스테이지 선택 그리드 (localStorage 진행도 기반 잠금 해제).

import { STAGES } from '../data/stages.js';

export class MainMenu {
  /** @param onSelect (stageId) => void */
  constructor(onSelect) {
    this.root = document.getElementById('main-menu');
    this.grid = document.getElementById('stage-grid');
    this.onSelect = onSelect;
  }

  /** @param unlockedCount 잠금 해제된 스테이지 수 (1 이상) */
  refresh(unlockedCount) {
    this.grid.innerHTML = '';
    for (const def of STAGES) {
      const btn = document.createElement('button');
      const locked = def.id > unlockedCount;
      if (locked) {
        btn.classList.add('locked');
        btn.textContent = 'LOCK';
        btn.disabled = true;
      } else {
        btn.textContent = String(def.id);
        btn.addEventListener('click', () => this.onSelect(def.id));
      }
      this.grid.appendChild(btn);
    }
  }

  setVisible(visible) {
    this.root.classList.toggle('hidden', !visible);
  }
}
