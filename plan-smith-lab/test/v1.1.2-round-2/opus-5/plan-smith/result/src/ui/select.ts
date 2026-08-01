/** 스테이지 선택 화면 (R1): 10칸 + 해금 상태 + 획득 별. 미해금 칸은 클릭해도 진입하지 않는다. */

import { STAGES, TOTAL_STAGES } from '../stages';
import { starsOf, type SaveData } from '../storage';
import { STR } from './strings';
import { q } from './dom';

export function renderStageGrid(save: SaveData, onPick: (id: number) => void): void {
  const grid = q<HTMLElement>('#stage-grid');
  grid.textContent = '';

  for (let id = 1; id <= TOTAL_STAGES; id += 1) {
    const stage = STAGES.find((s) => s.id === id);
    const locked = id > save.unlocked || !stage;
    const stars = starsOf(save, id);

    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = `stage-cell${locked ? ' locked' : ''}`;
    cell.disabled = locked;
    cell.setAttribute(
      'aria-label',
      locked
        ? `스테이지 ${id} — ${STR.locked}`
        : `스테이지 ${id} — ${stage?.name ?? ''}, 별 ${stars}개`,
    );

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = String(id);
    cell.appendChild(num);

    const st = document.createElement('span');
    st.className = 'cell-stars';
    for (let i = 0; i < 3; i += 1) {
      const s = document.createElement('span');
      s.textContent = '★';
      if (i >= stars) s.className = 'off';
      st.appendChild(s);
    }
    cell.appendChild(st);

    if (!locked) {
      cell.addEventListener('click', () => onPick(id));
    }
    grid.appendChild(cell);
  }
}
