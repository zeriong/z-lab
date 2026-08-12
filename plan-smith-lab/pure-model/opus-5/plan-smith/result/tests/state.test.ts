/**
 * npm run test:state  (§13-5)
 *
 * 단언 네 가지가 이 파일의 존재 이유다:
 *   (a) PAUSED 동안 Engine.update 스파이 호출 횟수 = 0
 *   (b) PAUSED → RETRY 후 pigsRemaining이 StageDef.pigs.length와 일치
 *   (c) PAUSED → MENU 후 엔진의 등록 리스너 수 = 0
 *   (d) §5 표에 없는 전이는 전부 거부
 *
 * 이 넷은 "플랜의 어떤 방어 장치로도 자동 충족되지 않는다"고 §13이 적어 둔 항목이다.
 */

import { describe, expect, it, vi } from 'vitest';
import { StateMachine, TRANSITIONS, type GameEvent, type Phase } from '../src/app';
import { GameScene } from '../src/game/scene';
import { PhysicsLoop, STEP_MS } from '../src/physics/loop';
import { listenerCount } from '../src/physics/world';
import { parseStage, type StageDef } from '../src/data/schema';
import { STAGE_SOURCES, STAGE_FILE_NAMES } from '../src/data/stages';

const PHASES: Phase[] = ['BOOT', 'MENU', 'STAGE_SELECT', 'PLAYING', 'PAUSED', 'CLEARED', 'FAILED'];
const EVENTS: GameEvent[] = [
  'READY',
  'START',
  'SELECT',
  'BACK',
  'PAUSE',
  'RESUME',
  'RETRY',
  'MENU',
  'CLEAR',
  'FAIL',
  'NEXT',
  'TO_SELECT',
];

/** §5 표를 손으로 옮겨 적은 것. 코드의 TRANSITIONS와 이 표가 갈리면 테스트가 깨진다. */
const EXPECTED: Record<Phase, Partial<Record<GameEvent, Phase>>> = {
  BOOT: { READY: 'MENU' },
  MENU: { START: 'STAGE_SELECT' },
  STAGE_SELECT: { SELECT: 'PLAYING', BACK: 'MENU' },
  PLAYING: { PAUSE: 'PAUSED', CLEAR: 'CLEARED', FAIL: 'FAILED' },
  PAUSED: { RESUME: 'PLAYING', RETRY: 'PLAYING', MENU: 'MENU' },
  CLEARED: { NEXT: 'PLAYING', RETRY: 'PLAYING', MENU: 'MENU', TO_SELECT: 'STAGE_SELECT' },
  FAILED: { RETRY: 'PLAYING', MENU: 'MENU' },
};

function stage(id: number): StageDef {
  const raw = STAGE_SOURCES[id - 1];
  return parseStage(raw, STAGE_FILE_NAMES[id - 1] ?? `stage-${id}`);
}

describe('상태 머신 (§5)', () => {
  it('(d) 표에 정의된 전이만 받아들이고 나머지는 전부 거부한다', () => {
    for (const phase of PHASES) {
      for (const event of EVENTS) {
        const machine = new StateMachine();
        machine.forcePhase(phase);
        const expected = EXPECTED[phase][event];
        const accepted = machine.dispatch(event);

        expect(accepted).toBe(expected !== undefined);
        expect(machine.phase).toBe(expected ?? phase);
      }
    }
  });

  it('코드의 전이표가 §5 표와 정확히 같다', () => {
    expect(TRANSITIONS).toEqual(EXPECTED);
  });

  it('전이 로그가 from/to/event를 남긴다', () => {
    const machine = new StateMachine();
    machine.dispatch('READY');
    machine.dispatch('START');
    machine.dispatch('SELECT', 3);
    expect(machine.phase).toBe('PLAYING');
    expect(machine.log.map((l) => l.to)).toEqual(['MENU', 'STAGE_SELECT', 'PLAYING']);
    expect(machine.log[2].payload).toBe(3);
  });
});

describe('일시정지가 실제로 물리를 멈춘다 (§13-5a, R26)', () => {
  it('(a) PAUSED 동안 물리 적분 호출 횟수가 0이다', () => {
    const updateSpy = vi.fn();
    const scene = new GameScene({ updatePhysics: updateSpy });
    scene.mount(stage(1));

    scene.frame(STEP_MS * 3);
    expect(updateSpy.mock.calls.length).toBeGreaterThan(0);

    scene.pause();
    updateSpy.mockClear();
    for (let i = 0; i < 10; i += 1) scene.frame(100);
    expect(updateSpy).toHaveBeenCalledTimes(0);

    scene.resume();
    scene.frame(STEP_MS * 2);
    expect(updateSpy.mock.calls.length).toBeGreaterThan(0);

    scene.unmount();
  });

  it('재개 시 누산기가 0에서 시작한다 (밀린 시간을 한꺼번에 적분하지 않는다)', () => {
    const loop = new PhysicsLoop();
    loop.tick(STEP_MS * 2.5, () => undefined);
    expect(loop.pendingMs).toBeGreaterThan(0);
    loop.pause();
    expect(loop.pendingMs).toBe(0);
    loop.resume();
    expect(loop.pendingMs).toBe(0);
  });

  it('한 프레임에 최대 5스텝까지만 소비한다 (§7.1)', () => {
    const loop = new PhysicsLoop();
    const step = vi.fn();
    loop.tick(5000, step);
    expect(step).toHaveBeenCalledTimes(5);
    expect(loop.pendingMs).toBe(0);
  });
});

describe('다시하기와 메인으로 (§13-5b, §13-5c)', () => {
  it('(b) RETRY 후 pigsRemaining이 스테이지 정의값으로 돌아온다', () => {
    const def = stage(3);
    const scene = new GameScene({ updatePhysics: () => undefined });
    scene.mount(def);

    // 진행된 상태를 흉내 낸다: 돼지가 줄고 점수가 쌓인 상태.
    const runtime = scene.stage;
    expect(runtime).not.toBeNull();
    runtime!.pigsRemaining = 0;
    runtime!.score = 12345;
    runtime!.birdsUsed = 2;

    scene.retry();

    expect(scene.pigsRemaining).toBe(def.pigs.length);
    expect(scene.score).toBe(0);
    expect(scene.birdsRemaining).toBe(def.birds.length);
    expect(scene.stage?.blocks.length).toBe(def.bodies.length);

    scene.unmount();
  });

  it('(c) MENU(=unmount) 후 엔진에 남은 리스너가 0개다', () => {
    const scene = new GameScene({ updatePhysics: () => undefined });
    scene.mount(stage(2));

    const engine = scene.engine;
    expect(engine).not.toBeNull();
    expect(listenerCount(engine!)).toBeGreaterThan(0);

    scene.unmount();

    expect(listenerCount(engine!)).toBe(0);
    expect(scene.stage).toBeNull();
    expect(scene.engine).toBeNull();
  });

  it('스테이지를 10번 오가도 바디가 누적되지 않는다 (R32)', () => {
    const def = stage(1);
    const scene = new GameScene({ updatePhysics: () => undefined });

    let firstCount = -1;
    for (let i = 0; i < 10; i += 1) {
      scene.mount(def);
      const count = scene.stage!.blocks.length + scene.stage!.pigs.length + scene.stage!.ground.length;
      if (firstCount < 0) firstCount = count;
      expect(count).toBe(firstCount);
    }
    scene.unmount();
  });
});
