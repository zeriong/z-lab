import { beforeEach, describe, expect, it } from 'vitest';
import { getUnlockedStage, isStageUnlocked, resetProgress, unlockStage } from '../src/progress/progressStore';

describe('progressStore', () => {
  beforeEach(() => {
    resetProgress();
  });

  it('defaults to stage 0 unlocked when nothing is stored', () => {
    expect(getUnlockedStage()).toBe(0);
    expect(isStageUnlocked(0)).toBe(true);
    expect(isStageUnlocked(1)).toBe(false);
  });

  it('updates unlockedStage after a cleared event unlocks the next stage', () => {
    unlockStage(1);
    expect(getUnlockedStage()).toBe(1);
    expect(isStageUnlocked(1)).toBe(true);
  });

  it('never regresses to a lower unlocked stage', () => {
    unlockStage(3);
    unlockStage(1);
    expect(getUnlockedStage()).toBe(3);
  });
});
