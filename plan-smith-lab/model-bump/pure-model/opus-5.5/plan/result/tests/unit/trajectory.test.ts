import { describe, expect, it } from 'vitest';
import { BIRDS } from '../../src/config/catalog';
import { DT, GROUND_Y, PREVIEW_SECONDS } from '../../src/config/constants';
import { createBird, spawnBirdBody } from '../../src/core/entities/bird';
import { PhysicsWorld } from '../../src/core/physics/world';
import { anchorFor, launchPosition, pullToVelocity } from '../../src/core/slingshot';
import { predictDots, simulateBallistic } from '../../src/core/trajectory';

// U-3 / S3: 예측 함수와 실제 엔진(헤드리스)의 오차가 1s 동안 2px 미만. 지면 아래에서 멈춤.

const PULLS: [number, number][] = [
  [-130, 0],
  [-91.92, 91.92],
  [-120, 45],
  [-60, 100],
  [-30, -20],
  [80, 60],
];

describe('trajectory (U-3)', () => {
  for (const [dx, dy] of PULLS) {
    it(`당김 (${dx}, ${dy}): 1s 동안 엔진과의 오차 < 2px`, () => {
      const anchor = anchorFor(260);
      const pull = { x: dx, y: dy };
      const start = launchPosition(anchor, pull, BIRDS.red.radius);
      const vel = pullToVelocity(pull);
      const steps = Math.round(1 / DT);
      const predicted = simulateBallistic(start, vel, steps);

      // 공중에서만 비교하도록 지면 없는 월드를 쓴다 (새 바디는 bullet=true, linearDamping=0)
      const physics = new PhysicsWorld();
      const bird = createBird(1, 'red');
      spawnBirdBody(physics, bird, start, vel);
      let maxErr = 0;
      for (let i = 0; i < steps; i++) {
        physics.step(DT);
        const p = physics.pose(bird.body!);
        const q = predicted[i]!;
        maxErr = Math.max(maxErr, Math.hypot(p.x - q.x, p.y - q.y));
      }
      physics.dispose();
      expect(maxErr).toBeLessThan(2);
    });
  }

  it('예측 점은 3스텝마다 하나, 0.75s 분량(약 15개)', () => {
    const dots = predictDots({ x: 200, y: 500 }, { x: 10, y: -10 });
    expect(dots.length).toBe(Math.floor(Math.round(PREVIEW_SECONDS / DT) / 3));
  });

  it('지면 아래로 내려가면 멈춘다', () => {
    const dots = predictDots({ x: 200, y: GROUND_Y - 5 }, { x: 5, y: 10 }, { seconds: 2 });
    for (const d of dots) expect(d.y).toBeLessThanOrEqual(GROUND_Y);
    expect(dots.length).toBeLessThan(Math.round(2 / DT) / 3);
  });
});
