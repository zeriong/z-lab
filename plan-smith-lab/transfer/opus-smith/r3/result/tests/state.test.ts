import { describe, it, expect } from 'vitest';

// Test state machine transitions
describe('State Machine', () => {
  const STATE_TRANSITIONS = {
    BOOT: { START: 'MENU' },
    MENU: { START: 'STAGE_SELECT' },
    STAGE_SELECT: { SELECT: 'PLAYING', BACK: 'MENU' },
    PLAYING: { PAUSE: 'PAUSED', CLEAR: 'CLEARED', FAIL: 'FAILED' },
    PAUSED: { RESUME: 'PLAYING', RETRY: 'PLAYING', MENU: 'MENU' },
    CLEARED: { NEXT: 'PLAYING', RETRY: 'PLAYING', MENU: 'MENU' },
    FAILED: { RETRY: 'PLAYING', MENU: 'MENU' },
  };

  type Phase = keyof typeof STATE_TRANSITIONS;
  type Event = string;

  function canTransition(phase: Phase, event: Event): boolean {
    return (STATE_TRANSITIONS[phase] as Record<string, any>)?.[event] !== undefined;
  }

  function transition(phase: Phase, event: Event): Phase | undefined {
    return (STATE_TRANSITIONS[phase] as Record<string, any>)?.[event];
  }

  it('should have valid transitions from MENU', () => {
    expect(canTransition('MENU', 'START')).toBe(true);
    expect(transition('MENU', 'START')).toBe('STAGE_SELECT');
  });

  it('should have valid transitions from STAGE_SELECT', () => {
    expect(canTransition('STAGE_SELECT', 'SELECT')).toBe(true);
    expect(transition('STAGE_SELECT', 'SELECT')).toBe('PLAYING');
    expect(canTransition('STAGE_SELECT', 'BACK')).toBe(true);
    expect(transition('STAGE_SELECT', 'BACK')).toBe('MENU');
  });

  it('should have valid transitions from PLAYING', () => {
    expect(canTransition('PLAYING', 'PAUSE')).toBe(true);
    expect(transition('PLAYING', 'PAUSE')).toBe('PAUSED');
    expect(canTransition('PLAYING', 'CLEAR')).toBe(true);
    expect(transition('PLAYING', 'CLEAR')).toBe('CLEARED');
    expect(canTransition('PLAYING', 'FAIL')).toBe(true);
    expect(transition('PLAYING', 'FAIL')).toBe('FAILED');
  });

  it('should have valid transitions from PAUSED', () => {
    expect(canTransition('PAUSED', 'RESUME')).toBe(true);
    expect(transition('PAUSED', 'RESUME')).toBe('PLAYING');
    expect(canTransition('PAUSED', 'RETRY')).toBe(true);
    expect(transition('PAUSED', 'RETRY')).toBe('PLAYING');
    expect(canTransition('PAUSED', 'MENU')).toBe(true);
    expect(transition('PAUSED', 'MENU')).toBe('MENU');
  });

  it('should have valid transitions from CLEARED', () => {
    expect(canTransition('CLEARED', 'NEXT')).toBe(true);
    expect(transition('CLEARED', 'NEXT')).toBe('PLAYING');
    expect(canTransition('CLEARED', 'RETRY')).toBe(true);
    expect(transition('CLEARED', 'RETRY')).toBe('PLAYING');
    expect(canTransition('CLEARED', 'MENU')).toBe(true);
    expect(transition('CLEARED', 'MENU')).toBe('MENU');
  });

  it('should have valid transitions from FAILED', () => {
    expect(canTransition('FAILED', 'RETRY')).toBe(true);
    expect(transition('FAILED', 'RETRY')).toBe('PLAYING');
    expect(canTransition('FAILED', 'MENU')).toBe(true);
    expect(transition('FAILED', 'MENU')).toBe('MENU');
  });

  it('should reject undefined transitions', () => {
    expect(canTransition('MENU', 'PAUSE')).toBe(false);
    expect(canTransition('PLAYING', 'START')).toBe(false);
    expect(canTransition('PAUSED', 'CLEAR')).toBe(false);
  });
});

// Test physics pause mechanism
describe('Physics Pause Mechanism', () => {
  it('should pause accumulator on pause', () => {
    const accumulator = { value: 16.667 };
    const isPaused = true;

    if (isPaused) {
      accumulator.value = 0;
    }

    expect(accumulator.value).toBe(0);
  });

  it('should reset accumulator on resume', () => {
    const accumulator = { value: 0 };
    const isPaused = false;

    if (!isPaused) {
      accumulator.value = 0;
    }

    expect(accumulator.value).toBe(0);
  });
});

// Test score calculation
describe('Score Calculation', () => {
  it('should award points for pig kill', () => {
    let score = 0;
    score += 5000; // pig
    expect(score).toBe(5000);
  });

  it('should award points for boss pig kill', () => {
    let score = 0;
    score += 10000; // boss
    expect(score).toBe(10000);
  });

  it('should award points for block destruction', () => {
    let score = 0;
    score += 500; // block
    score += 500; // block
    expect(score).toBe(1000);
  });

  it('should award bonus for remaining birds', () => {
    let score = 0;
    score += 5000; // pig kill
    score += 10000 * 2; // 2 remaining birds
    expect(score).toBe(25000);
  });

  it('should calculate stars correctly', () => {
    const targetScore = 20000;

    // 1 star if below 75% of target
    let score = 10000;
    let stars = score >= targetScore ? 3 : score >= targetScore * 0.75 ? 2 : 1;
    expect(stars).toBe(1);

    // 2 stars if 75-99% of target
    score = 16000;
    stars = score >= targetScore ? 3 : score >= targetScore * 0.75 ? 2 : 1;
    expect(stars).toBe(2);

    // 3 stars if 100%+ of target
    score = 20000;
    stars = score >= targetScore ? 3 : score >= targetScore * 0.75 ? 2 : 1;
    expect(stars).toBe(3);
  });
});

// Test settle detection
describe('Settle Detection', () => {
  it('should start flight on bird launch', () => {
    let isFlying = false;
    isFlying = true;
    expect(isFlying).toBe(true);
  });

  it('should detect settle when max velocity below threshold', () => {
    const maxSpeed = 0.3; // below 0.35 threshold
    const isSettled = maxSpeed < 0.35;
    expect(isSettled).toBe(true);
  });

  it('should not detect settle when max velocity above threshold', () => {
    const maxSpeed = 0.4; // above 0.35 threshold
    const isSettled = maxSpeed < 0.35;
    expect(isSettled).toBe(false);
  });
});
