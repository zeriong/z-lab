import { describe, expect, it, vi } from 'vitest';
import { PauseOverlay } from '../src/ui/pauseOverlay';

describe('PauseOverlay', () => {
  it('renders exactly two buttons: 다시하기 and 메인으로', () => {
    const container = document.createElement('div');
    const onRestart = vi.fn();
    const onMainMenu = vi.fn();

    new PauseOverlay(container, { onRestart, onMainMenu });

    const buttons = container.querySelectorAll('[data-testid="pause-overlay"] button');
    expect(buttons.length).toBe(2);
    expect(buttons[0].textContent).toBe('다시하기');
    expect(buttons[1].textContent).toBe('메인으로');
  });

  it('invokes the correct callback per button', () => {
    const container = document.createElement('div');
    const onRestart = vi.fn();
    const onMainMenu = vi.fn();

    new PauseOverlay(container, { onRestart, onMainMenu });

    (container.querySelector('[data-testid="pause-restart"]') as HTMLButtonElement).click();
    expect(onRestart).toHaveBeenCalledTimes(1);

    (container.querySelector('[data-testid="pause-main-menu"]') as HTMLButtonElement).click();
    expect(onMainMenu).toHaveBeenCalledTimes(1);
  });
});
