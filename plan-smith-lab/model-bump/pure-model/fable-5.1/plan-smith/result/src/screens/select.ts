// A2: 스테이지 선택 — 1~10 카드 그리드. 잠금/해제/별 표시, 잠긴 카드는 클릭 무시.
import type { SaveData } from '../storage';
import { isUnlocked } from '../storage';
import type { StageDef } from '../types';
import { button, el, starsText } from './dom';

export interface SelectScreenCallbacks {
  onPick(stageId: number): void;
  onBack(): void;
}

export interface SelectScreen {
  root: HTMLElement;
  show(): void;
  hide(): void;
  update(save: SaveData, stages: readonly StageDef[]): void;
}

export function createSelectScreen(parent: HTMLElement, cb: SelectScreenCallbacks): SelectScreen {
  const grid = el('div', { id: 'stage-grid' });
  const root = el('div', { id: 'select-screen', class: 'screen' }, [
    el('h2', { text: '스테이지 선택' }),
    grid,
    el('div', { class: 'row' }, [button('btn-select-back', '메인으로', 'btn ghost', cb.onBack)]),
  ]);
  parent.append(root);

  grid.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('.stage-card');
    if (!target) return;
    if (target.dataset.locked === 'true') return; // 잠긴 카드: 무시
    const id = Number(target.dataset.stage);
    if (Number.isFinite(id)) cb.onPick(id);
  });

  return {
    root,
    show: () => root.removeAttribute('hidden'),
    hide: () => root.setAttribute('hidden', ''),
    update: (save, stages) => {
      grid.replaceChildren();
      for (const s of stages) {
        const unlocked = isUnlocked(save, s.id);
        const card = el('button', {
          class: `stage-card${unlocked ? '' : ' locked'}`,
          type: 'button',
          'data-stage': String(s.id),
          'data-locked': unlocked ? 'false' : 'true',
          'aria-disabled': unlocked ? 'false' : 'true',
          'aria-label': `${s.id}단계 ${s.name}${unlocked ? '' : ' (잠김)'}`,
        });
        card.append(el('span', { text: String(s.id) }));
        card.append(
          unlocked
            ? el('span', { class: 'stars', text: starsText(save.stars[s.id - 1] ?? 0) })
            : el('span', { class: 'lock', text: '🔒' }),
        );
        grid.append(card);
      }
    },
  };
}
