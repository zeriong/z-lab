/**
 * 레벨 검증 (§10.1 levels.validate):
 * id 1..10 유일, 돼지 ≥ 1, 새 ≥ 1, 모든 엔티티가 월드 안,
 * 팩토리 생성 후 60틱 사전 정착 시 최대 변위 < 2px (초기 겹침·불안정 구조 검출).
 */
import { describe, expect, it } from 'vitest';
import { GROUND_Y, WORLD_W } from '../src/core/config';
import { buildLevel } from '../src/entities/Factory';
import { LEVELS } from '../src/levels/index';
import { PhysicsWorld } from '../src/physics/World';

describe('levels.validate', () => {
  it('has exactly 10 levels with unique ids 1..10', () => {
    expect(LEVELS.length).toBe(10);
    const ids = LEVELS.map((l) => l.id).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const names = new Set(LEVELS.map((l) => l.name));
    expect(names.size).toBe(10);
  });

  it.each(LEVELS)('level $id has pigs, birds and solution shots', (lv) => {
    const pigs = lv.entities.filter((e) => e.kind === 'pig');
    expect(pigs.length).toBeGreaterThanOrEqual(1);
    expect(lv.birds.length).toBeGreaterThanOrEqual(1);
    expect(lv.solutionShots.length).toBeGreaterThanOrEqual(1);
    expect(lv.solutionShots.length).toBeLessThanOrEqual(lv.birds.length);
    for (const s of lv.solutionShots) {
      expect(s.power).toBeGreaterThan(0);
      expect(s.power).toBeLessThanOrEqual(1);
      expect(s.angle).toBeGreaterThan(0);
      expect(s.angle).toBeLessThan(90);
    }
    expect(lv.star3).toBeGreaterThan(lv.star2);
    expect(lv.star2).toBeGreaterThan(0);
  });

  it.each(LEVELS)('level $id entities are inside the world and right of the slingshot', (lv) => {
    for (const e of lv.entities) {
      expect(e.x).toBeGreaterThan(300);
      expect(e.x).toBeLessThan(WORLD_W - 10);
      expect(e.y).toBeLessThanOrEqual(GROUND_Y);
      expect(e.y).toBeGreaterThan(0);
    }
  });

  it.each(LEVELS)('level $id layouts differ from every other level', (lv) => {
    const sig = JSON.stringify(lv.entities);
    for (const other of LEVELS) {
      if (other.id === lv.id) continue;
      expect(JSON.stringify(other.entities)).not.toBe(sig);
    }
  });

  it.each(LEVELS)('level $id is initially stable (60 ticks, max displacement < 2px)', (lv) => {
    const world = new PhysicsWorld();
    const created = buildLevel(world, lv);
    const start = created.map((e) => ({ x: e.body.position.x, y: e.body.position.y }));
    for (let i = 0; i < 60; i++) world.step();
    let maxDisp = 0;
    created.forEach((e, i) => {
      const d = Math.hypot(e.body.position.x - start[i].x, e.body.position.y - start[i].y);
      if (d > maxDisp) maxDisp = d;
    });
    world.dispose();
    expect(maxDisp).toBeLessThan(2);
  });
});
