import type { Progress } from '../core/Progress';
import { STAGES } from '../data/stages';
import { ScoreRule } from '../game/ScoreRule';
import { button, el, fmt } from './dom';

/** 메인 메뉴: 스테이지 10개 선택 (플랜 §3 MAIN_MENU). */
export class MainMenu {
  readonly root: HTMLDivElement;
  onSelect: (stageId: number) => void = () => {};

  private grid: HTMLDivElement;
  private totalLine: HTMLParagraphElement;

  constructor(parent: HTMLElement, private readonly progress: Progress) {
    this.root = el('div', 'menu');
    this.root.hidden = true;

    const title = el('h1', undefined, 'SLINGSHOT SIEGE');
    const sub = el('p', 'sub', '새총으로 구조물을 무너뜨려 초록 목표를 전부 제거하세요.');
    this.totalLine = el('p', 'sub', '');

    this.grid = el('div', 'stage-grid');

    const foot = el('div', 'foot');
    foot.textContent = '드래그하여 조준 · 손을 떼면 발사 · 인게임 우측 상단 II 버튼으로 일시정지';

    const reset = button('진행도 초기화', 'btn ghost');
    reset.addEventListener('click', () => {
      this.progress.resetAll();
      this.refresh();
    });

    this.root.append(title, sub, this.totalLine, this.grid, foot, reset);
    parent.appendChild(this.root);
    this.refresh();
  }

  refresh(): void {
    this.grid.textContent = '';
    for (const stage of STAGES) {
      const unlocked = this.progress.isUnlocked(stage.id);
      const cell = button(String(stage.id), `stage-cell${unlocked ? '' : ' locked'}`);
      cell.disabled = !unlocked;
      const stars = el('span', 'stars', ScoreRule.starString(this.progress.stars(stage.id)));
      cell.appendChild(stars);
      cell.title = `${stage.name} · 최고 ${fmt(this.progress.best(stage.id))}`;
      cell.addEventListener('click', () => {
        if (!unlocked) return;
        this.onSelect(stage.id);
      });
      this.grid.appendChild(cell);
    }
    this.totalLine.textContent = `획득한 별 ${this.progress.totalStars()} / ${STAGES.length * 3}`;
  }

  show(): void {
    this.refresh();
    this.root.hidden = false;
  }

  hide(): void {
    this.root.hidden = true;
  }
}
