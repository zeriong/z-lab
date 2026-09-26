// trajectory: 예측(미니 Engine)과 실제 자유비행의 45스텝 최대 오차 ≤ 0.5
import { describe, expect, it } from 'vitest';
import { GRACE_STEPS, TRAJ_EVERY, TRAJ_STEPS } from '../src/config';
import { predictTrajectory } from '../src/game/trajectory';
import { StageSession } from '../src/physics/session';
import { fixture } from './helpers';

// 45스텝 동안 땅(새 중심 y < 798)에 닿지 않는 pull들
const pulls = [
  { x: 115, y: -30 },
  { x: 110, y: -35 },
  { x: 100, y: -60 },
  { x: 80, y: -80 },
  { x: 50, y: -100 },
];

describe('trajectory', () => {
  it('returns 15 points for 45 steps every 3', () => {
    expect(predictTrajectory('red', { x: 100, y: -50 })).toHaveLength(TRAJ_STEPS / TRAJ_EVERY);
  });

  it.each(pulls)('prediction matches real flight for pull %o', (pull) => {
    const predicted = predictTrajectory('red', pull);
    const s = StageSession.create(fixture());
    for (let i = 0; i < GRACE_STEPS; i++) s.step();
    expect(s.launch(pull)).toBe(true);
    const body = s.flight!.parts[0]!.body;
    let maxErr = 0;
    for (let i = 1; i <= TRAJ_STEPS; i++) {
      s.step();
      if (i % TRAJ_EVERY === 0) {
        const p = predicted[i / TRAJ_EVERY - 1]!;
        maxErr = Math.max(maxErr, Math.hypot(p.x - body.position.x, p.y - body.position.y));
      }
    }
    expect(maxErr).toBeLessThanOrEqual(0.5);
    s.dispose();
  });

  it('prediction is a curve, not a straight line (gravity)', () => {
    const pts = predictTrajectory('red', { x: 100, y: -60 });
    const a = pts[0]!;
    const m = pts[7]!;
    const b = pts[14]!;
    const onLine = a.y + ((b.y - a.y) * (m.x - a.x)) / (b.x - a.x);
    expect(Math.abs(m.y - onLine)).toBeGreaterThan(5);
  });
});
