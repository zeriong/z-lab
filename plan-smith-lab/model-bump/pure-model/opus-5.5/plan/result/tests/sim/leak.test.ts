import { describe, expect, it } from 'vitest';
import { STAGES } from '../../stages';
import { GameSession, liveSessionCount } from '../../src/core/GameSession';
import { liveWorldCount } from '../../src/core/physics/world';
import { cloneStage } from '../../src/core/stage/schema';
import { launchWhenReady, stepFor } from './helpers';

// S-8 누수: 같은 스테이지를 생성하고 파괴하기를 50회 반복해도 활성 월드는 1개, 바디 수와 리스너 수가 일정하다.

describe('S-8 누수', () => {
  it('생성/파괴 50회 반복', () => {
    const baseWorlds = liveWorldCount();
    const baseSessions = liveSessionCount();
    const stage = STAGES[8]!;
    let bodyCount: number | null = null;

    for (let i = 0; i < 50; i++) {
      const s = new GameSession(cloneStage(stage));
      expect(liveWorldCount()).toBe(baseWorlds + 1);
      expect(liveSessionCount()).toBe(baseSessions + 1);
      // 새 세션은 언제나 같은 바디 수, 리스너 0개로 시작한다(이전 판의 흔적 없음)
      if (bodyCount === null) bodyCount = s.bodyCount();
      expect(s.bodyCount()).toBe(bodyCount);
      expect(s.events.listenerCount()).toBe(0);
      expect(s.score).toBe(0);
      expect(s.birdsLeft).toBe(stage.birds.length);

      // App처럼 구독하고 몇 스텝 진행(가끔 발사)한 뒤 파괴한다
      s.events.on('cleared', () => undefined);
      s.events.on('failed', () => undefined);
      s.events.on('scoreChanged', () => undefined);
      expect(s.events.listenerCount()).toBe(3);
      if (i % 5 === 0) launchWhenReady(s, stage.solution[0]!.pull);
      stepFor(s, 0.3);
      s.destroy();

      expect(s.isDestroyed).toBe(true);
      expect(s.events.listenerCount()).toBe(0);
      expect(s.bodyCount()).toBe(0);
      expect(liveWorldCount()).toBe(baseWorlds);
      expect(liveSessionCount()).toBe(baseSessions);
    }
  });

  it('파괴를 두 번 불러도 안전하고, 파괴 후 스텝은 무시된다', () => {
    const s = new GameSession(cloneStage(STAGES[0]!));
    s.destroy();
    expect(() => s.destroy()).not.toThrow();
    expect(() => s.step()).not.toThrow();
    expect(s.simTime).toBe(0);
  });

  it('원본 스테이지 데이터는 세션 플레이로 바뀌지 않는다', () => {
    const before = JSON.stringify(STAGES[1]);
    const s = new GameSession(cloneStage(STAGES[1]!));
    launchWhenReady(s, STAGES[1]!.solution[0]!.pull);
    stepFor(s, 2);
    s.destroy();
    expect(JSON.stringify(STAGES[1])).toBe(before);
  });
});
