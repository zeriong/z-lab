import { describe, expect, it, vi } from 'vitest';
import { GameStateMachine } from '../src/state/stateMachine';

describe('GameStateMachine', () => {
  it('starts in MainMenu', () => {
    const sm = new GameStateMachine();
    expect(sm.getState()).toBe('MainMenu');
  });

  it('transitions MainMenu -> Loading -> Playing and fires enter/exit callbacks', () => {
    const sm = new GameStateMachine();
    const loadingEnter = vi.fn();
    const mainMenuExit = vi.fn();
    const playingEnter = vi.fn();

    sm.onEnter('Loading', loadingEnter);
    sm.onExit('MainMenu', mainMenuExit);
    sm.onEnter('Playing', playingEnter);

    sm.dispatch({ type: 'LOAD_STAGE', stageIndex: 0 });
    expect(sm.getState()).toBe('Loading');
    expect(loadingEnter).toHaveBeenCalledTimes(1);
    expect(mainMenuExit).toHaveBeenCalledTimes(1);

    sm.dispatch({ type: 'STAGE_READY' });
    expect(sm.getState()).toBe('Playing');
    expect(playingEnter).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid transitions', () => {
    const sm = new GameStateMachine();
    const ok = sm.dispatch({ type: 'CLEARED' });
    expect(ok).toBe(false);
    expect(sm.getState()).toBe('MainMenu');
  });

  it('Paused only allows RESTART/MAIN_MENU (no resume transition, per assumption)', () => {
    const sm = new GameStateMachine();
    sm.dispatch({ type: 'LOAD_STAGE', stageIndex: 0 });
    sm.dispatch({ type: 'STAGE_READY' });
    sm.dispatch({ type: 'PAUSE' });
    expect(sm.getState()).toBe('Paused');

    const resumeAttempt = sm.dispatch({ type: 'STAGE_READY' });
    expect(resumeAttempt).toBe(false);
    expect(sm.getState()).toBe('Paused');

    sm.dispatch({ type: 'MAIN_MENU' });
    expect(sm.getState()).toBe('MainMenu');
  });
});
