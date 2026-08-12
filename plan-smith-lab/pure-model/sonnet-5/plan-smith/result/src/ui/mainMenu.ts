import { StageDef } from '../types/stage';
import { getUnlockedStage, isStageUnlocked } from '../progress/progressStore';

export interface MainMenuCallbacks {
  onSelectStage: (stageIndex: number) => void;
}

/**
 * 스텝 9 — 메인 메뉴 / 스테이지 선택 화면.
 * quality floor: 클릭 한 번으로 최근 미해금 스테이지부터 시작할 수 있고, 해금된 모든 스테이지를
 * 개별 선택할 수 있어야 한다.
 * 로드베어링 hop1(진입점): 여기의 클릭 핸들러가 LOAD_STAGE 전이를 디스패치한다.
 */
export function renderMainMenu(
  container: HTMLElement,
  stages: StageDef[],
  callbacks: MainMenuCallbacks
): HTMLElement {
  const el = document.createElement('div');
  el.className = 'main-menu';
  el.setAttribute('data-testid', 'main-menu');

  const title = document.createElement('h1');
  title.textContent = '슬링샷 어드벤처';
  el.appendChild(title);

  const startBtn = document.createElement('button');
  startBtn.textContent = '게임시작';
  startBtn.setAttribute('data-testid', 'main-menu-start');
  startBtn.addEventListener('click', () => {
    const unlocked = getUnlockedStage();
    const startIndex = Math.min(unlocked, stages.length - 1);
    callbacks.onSelectStage(startIndex);
  });
  el.appendChild(startBtn);

  const list = document.createElement('ul');
  list.className = 'stage-list';
  list.setAttribute('data-testid', 'stage-list');

  stages.forEach((stage, index) => {
    const item = document.createElement('li');
    const unlocked = isStageUnlocked(index);

    const btn = document.createElement('button');
    btn.textContent = unlocked ? `${index + 1}. ${stage.name}` : `${index + 1}. 잠김`;
    btn.disabled = !unlocked;
    btn.setAttribute('data-testid', `stage-select-${index}`);
    if (unlocked) {
      btn.addEventListener('click', () => callbacks.onSelectStage(index));
    }

    item.appendChild(btn);
    list.appendChild(item);
  });

  el.appendChild(list);
  container.appendChild(el);
  return el;
}
