import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function read(relativePath: string): string {
  return readFileSync(resolve(__dirname, '..', relativePath), 'utf-8');
}

/**
 * 스텝 10 — 엔드투엔드 슬라이스 검증(스테이지 1 한정).
 * 로드베어링 경로 5홉의 "first becomes true at" 열이 가리키는 파일:함수가 실제로 존재하고
 * 서로를 호출하는지 정적 추적한다(grep 등가).
 */
describe('load-bearing path (5 hops) — static trace', () => {
  it('hop1: main menu click handler dispatches LOAD_STAGE', () => {
    const mainMenu = read('src/ui/mainMenu.ts');
    expect(mainMenu).toContain('onSelectStage');
    const app = read('src/App.ts');
    expect(app).toContain("dispatch({ type: 'LOAD_STAGE'");
  });

  it('hop2: drag release calls launchProjectile which applies velocity via Matter.Body', () => {
    const app = read('src/App.ts');
    expect(app).toContain('dragToLaunchVector');
    expect(app).toContain('launchProjectile');
    const launch = read('src/game/launch.ts');
    expect(launch).toContain('adapter.setVelocity');
    const adapter = read('src/engine/physicsAdapter.ts');
    expect(adapter).toContain('Matter.Body.setVelocity');
  });

  it('hop3: loadStage adds terrain/structure/pig bodies into the shared physics world', () => {
    const loadStageSrc = read('src/stages/loadStage.ts');
    expect(loadStageSrc).toContain('adapter.addBodies');
    const adapter = read('src/engine/physicsAdapter.ts');
    expect(adapter).toContain('Matter.World.add');
  });

  it('hop4: collisionStart handler branches on destructible/pig labels and checks material.threshold', () => {
    const collisions = read('src/game/collisions.ts');
    expect(collisions).toContain("kind === 'destructible'");
    expect(collisions).toContain("kind === 'pig'");
    expect(collisions).toContain('MATERIAL_THRESHOLDS');
  });

  it('hop5: pig-count check runs after every collision and drives the cleared event', () => {
    const app = read('src/App.ts');
    expect(app).toContain('onCollisionOutcome');
    expect(app).toContain('evaluateOutcome');
    const outcome = read('src/game/outcome.ts');
    expect(outcome).toContain('loaded.pigs.length === 0');
  });
});
