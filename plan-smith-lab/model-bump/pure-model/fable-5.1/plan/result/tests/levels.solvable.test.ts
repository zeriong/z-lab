/**
 * 정답 샷 테스트 (§10.1 levels.solvable):
 * 레벨마다 solutionShots 를 순서대로 발사(각 샷 후 정착까지 진행, 최대 480틱 + 대기).
 * 마지막에 돼지 0 → 통과. 고정 스텝이라 결정적. 달성 점수를 출력해 별 임계값 근거로 쓴다.
 */
import { describe, expect, it } from 'vitest';
import { Session } from '../src/gameplay/Session';
import { LEVELS } from '../src/levels/index';

describe('levels.solvable', () => {
  it.each(LEVELS)('level $id ($name) is cleared by its solution shots', (lv) => {
    const s = new Session(lv);
    const outcome = s.playShots(lv.solutionShots);
    const line =
      `level ${String(lv.id).padStart(2)} ${lv.name}: outcome=${outcome} ` +
      `score=${s.score.value} shots=${s.shot.shotsFired}/${lv.birds.length} ` +
      `pigsLeft=${s.pigsAlive()} ticks=${s.tick}`;
    // eslint-disable-next-line no-console
    console.log(line);
    expect(s.pigsAlive()).toBe(0);
    expect(outcome).toBe('clear');
    s.dispose();
  });

  it('a level with no shots fired ends in failure only after the last bird settles', () => {
    const lv = LEVELS[0];
    const s = new Session(lv);
    // 새를 전부 최소 파워로 헛발사 (빗나가게)
    for (let i = 0; i < lv.birds.length; i++) {
      expect(s.fire(80, 0.2)).toBe(true);
      s.runUntilShotDone(900);
    }
    s.runTicks(200);
    expect(s.outcome).toBe('failed');
    expect(s.birdsRemaining).toBe(0);
    s.dispose();
  });
});
