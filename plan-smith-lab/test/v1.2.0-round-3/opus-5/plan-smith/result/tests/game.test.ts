// 스펙 요구 ③(우측 일시정지 + 되돌리기)과 진행도·스키마의 단위 판정.

import { beforeEach, describe, expect, it } from 'vitest';
import { StateMachine } from '../src/core/stateMachine';
import { isOnRightHalf, pauseButtonRect, rectCenterX } from '../src/ui/pauseButton';
import { VIRTUAL_W } from '../src/physics/units';
import { validateStage } from '../src/stages/schema';
import type { StageDef } from '../src/stages/schema';
import { defaultSave, isUnlocked, recordClear } from '../src/core/save';
import { stageDefs } from '../src/stages';
import { loadStage, restartWorld, destroyWorld } from '../src/game/world';
import { releaseBird } from '../src/game/launch';
import { FIXED_STEP_SEC } from '../src/physics/units';

describe('일시정지 표면', () => {
  it('일시정지 버튼 히트 영역 중심 x 가 캔버스 폭의 절반보다 크다', () => {
    const r = pauseButtonRect();
    expect(rectCenterX(r)).toBeGreaterThan(VIRTUAL_W / 2);
    expect(isOnRightHalf(r)).toBe(true);
  });

  it('일시정지 중에는 물리 스텝이 진행되지 않는다', () => {
    const sm = new StateMachine();
    sm.transition('MENU');
    sm.transition('STAGE_SELECT');
    sm.transition('PLAYING');
    const world = loadStage(stageDefs[0]);

    // PLAYING 60 프레임
    for (let i = 0; i < 60; i++) world.adapter.step(FIXED_STEP_SEC);
    const before = world.adapter.stepCount();
    expect(before).toBe(60);

    sm.transition('PAUSED');
    expect(sm.inputEnabled).toBe(false);
    // 일시정지 상태에서는 루프가 step 을 부르지 않는다 — 앱의 fixedStep 규칙을 그대로 흉내낸다.
    for (let i = 0; i < 60; i++) {
      if (sm.state === 'PLAYING') world.adapter.step(FIXED_STEP_SEC);
    }
    expect(world.adapter.stepCount() - before).toBe(0);
    destroyWorld(world);
  });

  it("'다시하기'는 월드를 초기 상태로 되돌리고 '메인으로'는 월드를 파기한다", () => {
    const def = stageDefs[0];
    let world = loadStage(def);
    releaseBird(world, 100, -80);
    for (let i = 0; i < 200; i++) {
      world.adapter.step(FIXED_STEP_SEC);
    }
    expect(world.birdsRemaining).toBe(def.birds - 1);

    world = restartWorld(world);
    expect(world.birdsRemaining).toBe(def.birds);
    expect(world.pigsAlive).toBe(def.pigs.length);
    expect(world.score.total).toBe(0);
    expect(world.camera.x).toBe(0);

    destroyWorld(world);
    expect(world.adapter.bodyCount()).toBe(0);
  });
});

describe('상태 머신', () => {
  it('허용되지 않은 전이는 예외를 던진다', () => {
    const sm = new StateMachine();
    expect(() => sm.transition('PLAYING')).toThrow();
    sm.transition('MENU');
    expect(sm.canTransition('STAGE_SELECT')).toBe(true);
    expect(sm.canTransition('PAUSED')).toBe(false);
  });
});

describe('스테이지 검증기', () => {
  let broken: StageDef;
  beforeEach(() => {
    broken = JSON.parse(JSON.stringify(stageDefs[0])) as StageDef;
  });

  it('재질명이 틀리면 파일명·필드명과 함께 실패한다', () => {
    (broken.blocks[0] as { material: string }).material = 'plastic';
    const errors = validateStage(broken, 'stage01.ts');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('stage01.ts');
    expect(errors[0]).toContain('material');
  });

  it('최소 두께 미만 블록을 잡는다', () => {
    broken.blocks[0].h = 8;
    expect(validateStage(broken).length).toBeGreaterThan(0);
  });
});

describe('진행도', () => {
  it('클리어를 기록하면 다음 스테이지가 해금된다', () => {
    const save = defaultSave();
    expect(isUnlocked(stageDefs[0], save)).toBe(true);
    expect(isUnlocked(stageDefs[1], save)).toBe(false);
    recordClear(save, 1, 24000, 3);
    expect(isUnlocked(stageDefs[1], save)).toBe(true);
    expect(save.best[1]).toBe(24000);
    expect(save.stars[1]).toBe(3);
  });
});
