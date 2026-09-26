import { describe, expect, it } from 'vitest';
import { newSession, stepFor } from './helpers';

// S-6: TNT 2개를 150px 간격으로 두고 하나를 파괴하면 둘 다 폭발한다.
// 연쇄 폭발은 다음 스텝 후처리에서 일어난다(같은 스텝 안에서 재귀하지 않는다).

describe('S-6 TNT 연쇄', () => {
  it('하나를 파괴하면 둘 다 폭발한다', () => {
    const s = newSession({ tnt: [{ x: 900, y: 960 }, { x: 1050, y: 960 }] }, { graceSeconds: 0 });
    stepFor(s, 0.5);
    const explosions: string[] = [];
    s.events.on('explosion', (e) => explosions.push(`${e.source}@${Math.round(e.x)}`));

    s.markDestroyed('tnt', 0);
    expect(s.tnts[0]!.alive).toBe(false);
    expect(explosions).toHaveLength(0); // 파괴 즉시가 아니라 다음 스텝에 터진다

    s.step();
    expect(explosions).toHaveLength(1);
    expect(s.tnts[1]!.alive).toBe(false);

    s.step();
    expect(explosions).toHaveLength(2);
    expect(s.score).toBe(2000);
    s.destroy();
  });

  it('반경 밖의 TNT는 폭발하지 않는다', () => {
    const s = newSession({ tnt: [{ x: 700, y: 960 }, { x: 1000, y: 960 }] }, { graceSeconds: 0 });
    s.markDestroyed('tnt', 0);
    stepFor(s, 0.3);
    expect(s.tnts[1]!.alive).toBe(true);
    s.destroy();
  });
});
