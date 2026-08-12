import { describe, expect, it, vi } from 'vitest';
import { renderMainMenu } from '../src/ui/mainMenu';
import { STAGES } from '../src/stages';
import { resetProgress, unlockStage } from '../src/progress/progressStore';

describe('renderMainMenu', () => {
  it('marks stages beyond unlockedStage as locked and disables their buttons', () => {
    resetProgress();
    unlockStage(2); // 스테이지 0,1,2 해금

    const container = document.createElement('div');
    renderMainMenu(container, STAGES, { onSelectStage: vi.fn() });

    for (let i = 0; i <= 2; i += 1) {
      const btn = container.querySelector(`[data-testid="stage-select-${i}"]`) as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    }
    for (let i = 3; i < STAGES.length; i += 1) {
      const btn = container.querySelector(`[data-testid="stage-select-${i}"]`) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    }
  });

  it('시작하기 selects the furthest unlocked stage', () => {
    resetProgress();
    unlockStage(4);

    const container = document.createElement('div');
    const onSelectStage = vi.fn();
    renderMainMenu(container, STAGES, { onSelectStage });

    (container.querySelector('[data-testid="main-menu-start"]') as HTMLButtonElement).click();
    expect(onSelectStage).toHaveBeenCalledWith(4);
  });
});
