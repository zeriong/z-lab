import { describe, expect, it } from 'vitest';
import { STAGE00, STAGES } from '../../stages';
import { ROBUSTNESS_JITTER, SPAWN_MAX_DRIFT, SPAWN_OVERLAP_TOLERANCE } from '../../src/config/constants';
import { GameSession } from '../../src/core/GameSession';
import { replaySolution } from '../../src/core/replay';
import { starThresholdsFromReference } from '../../src/core/rules/scoring';
import { spawnOverlaps } from '../../src/core/stage/geometry';
import type { StageData } from '../../src/core/stage/schema';
import { cloneStage } from '../../src/core/stage/schema';
import { maxDrift, poses, stepFor } from './helpers';

// S-4 스폰 안정성, S-5 기준 해법 재생(+여유 규칙), S-7 견고성. §6.4 물리 규칙.

const ALL: StageData[] = [STAGE00, ...STAGES];

describe('S-4 스폰 안정성 (A2 포함)', () => {
  for (const stage of ALL) {
    it(`stage ${stage.id} ${stage.name}: 겹침 없음, 3s 동안 데미지 0, 파괴 0, 이동 < 5px`, () => {
      expect(spawnOverlaps(stage, SPAWN_OVERLAP_TOLERANCE)).toEqual([]);
      // 유예 시간 없이 돌린다
      const s = new GameSession(cloneStage(stage), { graceSeconds: 0 });
      const before = poses(s);
      stepFor(s, 3);
      const after = poses(s);
      const damaged = [...s.blocks, ...s.pigs, ...s.tnts].filter((e) => !e.alive || e.hp < e.maxHp);
      expect(damaged.map((e) => e.id)).toEqual([]);
      expect(s.score).toBe(0);
      expect(maxDrift(before, after)).toBeLessThan(SPAWN_MAX_DRIFT);
      s.destroy();
    });
  }
});

describe('S-5 기준 해법 재생', () => {
  for (const stage of STAGES) {
    it(`stage ${stage.id} ${stage.name}: solution을 재생하면 클리어되고 여유 규칙을 만족한다`, () => {
      const s = new GameSession(cloneStage(stage));
      const r = replaySolution(s, stage.solution);
      // 별 기준 튜닝(§6.6)을 위해 기준 해법 점수를 남긴다.
      console.info(
        `[S-5] stage ${stage.id}: ${r.outcome} score=${r.score} birdsLeft=${r.birdsLeft} shots=${r.shotsFired} ` +
          `t=${r.simTime.toFixed(1)}s suggestedStars=${JSON.stringify(starThresholdsFromReference(r.score))}`,
      );
      expect(r.outcome).toBe('cleared');
      // 여유 규칙: 1~7단계는 새를 1마리 이상 남기고 클리어
      if (stage.id <= 7) expect(r.birdsLeft).toBeGreaterThanOrEqual(1);
      s.destroy();
    });
  }

  it('stage00: 기준 해법으로 클리어되고, 모두 빗나가면 실패한다', () => {
    const ok = new GameSession(cloneStage(STAGE00));
    expect(replaySolution(ok, STAGE00.solution).outcome).toBe('cleared');
    ok.destroy();

    const miss = new GameSession(cloneStage(STAGE00));
    // 뒤로 쏘면 월드 왼쪽 밖으로 나가 새가 종료된다
    const r = replaySolution(miss, [{ pull: [120, 20] }], { repeatLast: true });
    expect(r.outcome).toBe('failed');
    expect(r.birdsLeft).toBe(0);
    miss.destroy();
  });
});

describe('S-7 견고성 (스테이지 1~5)', () => {
  const J = ROBUSTNESS_JITTER;
  const offsets: [number, number][] = [
    [J, 0], [-J, 0], [0, J], [0, -J], [J, J], [J, -J], [-J, J], [-J, -J],
  ];
  for (const stage of STAGES.filter((s) => s.id <= 5)) {
    it(`stage ${stage.id}: ±${J}px로 흔든 변형 8개 중 6개 이상 클리어`, () => {
      let cleared = 0;
      for (const jitter of offsets) {
        const s = new GameSession(cloneStage(stage));
        // 해법이 끝났는데 새가 남으면 마지막 샷을 반복한다(여유 새로 재시도하는 플레이어를 흉내 냄).
        const r = replaySolution(s, stage.solution, { jitter, repeatLast: true });
        if (r.outcome === 'cleared') cleared++;
        s.destroy();
      }
      console.info(`[S-7] stage ${stage.id}: ${cleared}/8`);
      expect(cleared).toBeGreaterThanOrEqual(6);
    });
  }
});
