import { describe, expect, it } from 'vitest';
import { STAGES } from '../../stages';
import { GameSession } from '../../src/core/GameSession';
import { cloneStage } from '../../src/core/stage/schema';
import { poses, stepFor, stepUntil } from './helpers';

// S-9 일시정지 의미론: 세션 스텝을 멈춘 동안 simTime, 턴 상태, 바디 좌표가 변하지 않는다.
// (앱은 PAUSED에서 session.step()을 부르지 않는다. 렌더러와 HUD는 읽기만 한다.)

function freezeCheck(s: GameSession): void {
  const snap = s.snapshot();
  const p = poses(s);
  const flying = s.poseOf(s.bird?.body ?? null);
  // "일시정지" 동안 렌더러/HUD가 하는 읽기를 여러 번 반복한다
  for (let i = 0; i < 300; i++) {
    s.snapshot();
    s.predictedPath();
    poses(s);
    s.poseOf(s.bird?.body ?? null);
  }
  expect(s.snapshot()).toEqual(snap);
  expect(poses(s)).toEqual(p);
  expect(s.poseOf(s.bird?.body ?? null)).toEqual(flying);
}

describe('S-9 일시정지 의미론', () => {
  it('LOADING / FLYING / SETTLING 중 멈추면 모두 얼어붙는다', () => {
    const stage = STAGES[1]!;
    const s = new GameSession(cloneStage(stage));
    stepFor(s, 0.2);
    expect(s.turnState).toBe('LOADING');
    freezeCheck(s);

    stepUntil(s, () => s.turnState === 'READY');
    s.launch(stage.solution[0]!.pull);
    stepFor(s, 0.3);
    expect(s.turnState).toBe('FLYING');
    freezeCheck(s);

    stepUntil(s, () => s.turnState === 'SETTLING' || s.turnState === 'CLEAR_PENDING', 10);
    freezeCheck(s);
    s.destroy();
  });

  it('재개하면 남은 시간을 이어서 진행한다 (CLEAR_PENDING 1.5s)', () => {
    const s = new GameSession(cloneStage(STAGES[0]!));
    stepUntil(s, () => s.turnState === 'READY');
    s.killAllPigs();
    expect(s.turnState).toBe('CLEAR_PENDING');
    stepFor(s, 0.5);
    freezeCheck(s); // 일시정지
    let cleared = false;
    s.events.on('cleared', () => (cleared = true));
    stepFor(s, 0.9);
    expect(cleared).toBe(false);
    stepFor(s, 0.2);
    expect(cleared).toBe(true);
    s.destroy();
  });

  it('조준 중 일시정지: 조준이 취소되어 READY, 새는 소모되지 않고 다시 발사할 수 있다 (E13 코어)', () => {
    const s = new GameSession(cloneStage(STAGES[0]!));
    stepUntil(s, () => s.turnState === 'READY');
    const birds = s.birdsLeft;
    expect(s.pointerDown(s.anchor.x, s.anchor.y)).toBe('aim');
    s.pointerMove(s.anchor.x - 100, s.anchor.y + 30);
    expect(s.turnState).toBe('AIMING');
    expect(s.predictedPath().length).toBeGreaterThan(0);
    s.cancelAim(); // App은 pause 효과(cancelAim)로 이것을 부른다
    expect(s.turnState).toBe('READY');
    expect(s.birdsLeft).toBe(birds);
    expect(s.launch([-100, 30])).toBe(true);
    expect(s.turnState).toBe('FLYING');
    expect(s.birdsLeft).toBe(birds - 1);
    s.destroy();
  });

  it('짧게 당겼다 놓으면 발사가 취소된다', () => {
    const s = new GameSession(cloneStage(STAGES[0]!));
    stepUntil(s, () => s.turnState === 'READY');
    s.pointerDown(s.anchor.x, s.anchor.y);
    s.pointerUp(s.anchor.x - 10, s.anchor.y);
    expect(s.turnState).toBe('READY');
    expect(s.birdsLeft).toBe(3);
    s.destroy();
  });
});
