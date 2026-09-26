/**
 * 궤적 예측 (§10.1 trajectory):
 * 고스트 예측 점 vs 실제 엔진 60틱 궤적 오차 ≤ 4px (3가지 각도·파워).
 * 폐쇄식 simulateFlight / aim() 도 같은 기준으로 검증한다.
 */
import Matter from 'matter-js';
import { describe, expect, it } from 'vitest';
import { createBird } from '../src/entities/Bird';
import { aim, heightAtX, launchPosition, shotVelocity, simulateFlight } from '../src/gameplay/Ballistics';
import { TrajectoryPredictor } from '../src/gameplay/Trajectory';
import { PhysicsWorld } from '../src/physics/World';

const { Body, Sleeping } = Matter;

const CASES: Array<{ angle: number; power: number }> = [
  { angle: 45, power: 1 },
  { angle: 60, power: 0.9 },
  { angle: 35, power: 1 },
];

/** 빈 월드(지면만)에서 새를 실제로 날려 60틱 위치를 기록한다. */
function actualFlight(angle: number, power: number, ticks: number): Array<{ x: number; y: number }> {
  const world = new PhysicsWorld();
  const pos = launchPosition(angle, power);
  const bird = world.add(createBird('red', pos));
  Body.setStatic(bird.body, false);
  Sleeping.set(bird.body, false);
  Body.setAngularVelocity(bird.body, 0);
  Body.setVelocity(bird.body, shotVelocity(angle, power));
  const out: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < ticks; i++) {
    world.step();
    out.push({ x: bird.body.position.x, y: bird.body.position.y });
  }
  world.dispose();
  return out;
}

describe('trajectory', () => {
  it.each(CASES)('ghost prediction matches the real engine within 4px for 60 ticks ($angle°, $power)', ({ angle, power }) => {
    const predictor = new TrajectoryPredictor();
    const pos = launchPosition(angle, power);
    const vel = shotVelocity(angle, power);
    const predicted = predictor.predict(pos, vel, { ticks: 60, every: 1, groundY: 10_000 });
    const actual = actualFlight(angle, power, 60);
    expect(predicted.length).toBe(60);
    let maxErr = 0;
    for (let i = 0; i < 60; i++) {
      const e = Math.hypot(predicted[i].x - actual[i].x, predicted[i].y - actual[i].y);
      if (e > maxErr) maxErr = e;
    }
    expect(maxErr).toBeLessThanOrEqual(4);
    predictor.dispose();
  });

  it.each(CASES)('closed-form simulateFlight matches the real engine within 4px ($angle°, $power)', ({ angle, power }) => {
    const sim = simulateFlight(launchPosition(angle, power), shotVelocity(angle, power), 60);
    const actual = actualFlight(angle, power, 60);
    let maxErr = 0;
    for (let i = 0; i < 60; i++) {
      const e = Math.hypot(sim[i].x - actual[i].x, sim[i].y - actual[i].y);
      if (e > maxErr) maxErr = e;
    }
    expect(maxErr).toBeLessThanOrEqual(4);
  });

  it('predict() stops at the ground and samples every 3 ticks by default', () => {
    const predictor = new TrajectoryPredictor();
    const pts = predictor.predict(launchPosition(45, 1), shotVelocity(45, 1));
    expect(pts.length).toBeGreaterThan(5);
    expect(pts.length).toBeLessThanOrEqual(30);
    for (const p of pts) expect(p.y).toBeLessThanOrEqual(642 + 20);
    predictor.dispose();
  });

  it('aim() finds a power whose flight passes through the target', () => {
    const target = { x: 900, y: 640 };
    const shot = aim(target, 45);
    expect(shot.power).toBeGreaterThan(0.5);
    expect(shot.power).toBeLessThan(1);
    expect(Math.abs(heightAtX(shot.angle, shot.power, target.x) - target.y)).toBeLessThan(1);
    // 실제 엔진으로도 목표 근처를 지난다
    const actual = actualFlight(shot.angle, shot.power, 200);
    const nearest = Math.min(...actual.map((p) => Math.hypot(p.x - target.x, p.y - target.y)));
    expect(nearest).toBeLessThan(12);
  });

  it('aim() clamps to full power when the target is out of reach', () => {
    expect(aim({ x: 1250, y: 100 }, 45).power).toBe(1);
  });
});
