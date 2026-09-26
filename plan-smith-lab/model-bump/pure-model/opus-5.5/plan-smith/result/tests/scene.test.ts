// scene: §4.3 표의 모든 행, 표에 없는 조합은 null, visibility hidden → PAUSED, RESTART 10회 후 누수 없음
import { describe, expect, it } from 'vitest';
import { SilentAudio } from '../src/audio/audio';
import { Game } from '../src/core/game';
import { transition, type SceneEvent, type SceneState } from '../src/core/scene-manager';
import { STAGES } from '../src/stages';
import { MemoryStorage, SaveStore } from '../src/storage/storage';
import type { SceneId } from '../src/types';

const S = (scene: SceneId, stage: number | null = null): SceneState => ({ scene, stage });

function makeGame(unlocked = 1) {
  const save = new SaveStore(new MemoryStorage());
  save.load();
  for (let n = 1; n < unlocked; n++) save.recordClear(n, 1000, 1);
  let resets = 0;
  const game = new Game({ stages: STAGES, save, audio: new SilentAudio(), resetAccumulator: () => resets++ });
  return { game, save, resets: () => resets };
}

describe('transition (pure)', () => {
  const rows: Array<[SceneState, SceneEvent, SceneState]> = [
    [S('MAIN_MENU'), { type: 'START_GAME' }, S('STAGE_SELECT')],
    [S('STAGE_SELECT'), { type: 'SELECT_STAGE', stage: 1, unlocked: 1 }, S('PLAYING', 1)],
    [S('STAGE_SELECT'), { type: 'BACK' }, S('MAIN_MENU')],
    [S('PLAYING', 2), { type: 'PAUSE' }, S('PAUSED', 2)],
    [S('PAUSED', 2), { type: 'RESUME' }, S('PLAYING', 2)],
    [S('PAUSED', 2), { type: 'RESTART' }, S('PLAYING', 2)],
    [S('PAUSED', 2), { type: 'TO_MAIN' }, S('MAIN_MENU')],
    [S('PLAYING', 3), { type: 'STAGE_CLEARED' }, S('RESULT_CLEAR', 3)],
    [S('PLAYING', 3), { type: 'STAGE_FAILED' }, S('RESULT_FAIL', 3)],
    [S('RESULT_CLEAR', 3), { type: 'NEXT_STAGE' }, S('PLAYING', 4)],
    [S('RESULT_CLEAR', 3), { type: 'RESTART' }, S('PLAYING', 3)],
    [S('RESULT_FAIL', 3), { type: 'RESTART' }, S('PLAYING', 3)],
    [S('RESULT_CLEAR', 3), { type: 'TO_MAIN' }, S('MAIN_MENU')],
    [S('RESULT_FAIL', 3), { type: 'TO_MAIN' }, S('MAIN_MENU')],
  ];

  it.each(rows)('%o + %o → %o', (from, ev, to) => {
    expect(transition(from, ev)).toEqual(to);
  });

  const invalid: Array<[SceneState, SceneEvent]> = [
    [S('STAGE_SELECT'), { type: 'SELECT_STAGE', stage: 2, unlocked: 1 }], // 잠김
    [S('STAGE_SELECT'), { type: 'SELECT_STAGE', stage: 11, unlocked: 10 }],
    [S('RESULT_CLEAR', 10), { type: 'NEXT_STAGE' }], // 10 다음은 없음
    [S('RESULT_FAIL', 3), { type: 'NEXT_STAGE' }],
    [S('MAIN_MENU'), { type: 'PAUSE' }],
    [S('PAUSED', 1), { type: 'PAUSE' }],
    [S('PLAYING', 1), { type: 'RESUME' }],
    [S('PLAYING', 1), { type: 'RESTART' }],
    [S('PLAYING', 1), { type: 'TO_MAIN' }],
    [S('PAUSED', 1), { type: 'STAGE_CLEARED' }], // 일시정지 중 결과 금지
    [S('MAIN_MENU'), { type: 'BACK' }],
    [S('STAGE_SELECT'), { type: 'START_GAME' }],
  ];

  it.each(invalid)('%o + %o → null', (from, ev) => {
    expect(transition(from, ev)).toBeNull();
  });

  it('every (scene, event) pair not in the table returns null', () => {
    const scenes: SceneId[] = ['MAIN_MENU', 'STAGE_SELECT', 'PLAYING', 'PAUSED', 'RESULT_CLEAR', 'RESULT_FAIL'];
    const events: SceneEvent[] = [
      { type: 'START_GAME' },
      { type: 'SELECT_STAGE', stage: 1, unlocked: 10 },
      { type: 'BACK' },
      { type: 'PAUSE' },
      { type: 'RESUME' },
      { type: 'RESTART' },
      { type: 'TO_MAIN' },
      { type: 'STAGE_CLEARED' },
      { type: 'STAGE_FAILED' },
      { type: 'NEXT_STAGE' },
    ];
    const allowed = new Set([
      'MAIN_MENU:START_GAME',
      'STAGE_SELECT:SELECT_STAGE',
      'STAGE_SELECT:BACK',
      'PLAYING:PAUSE',
      'PLAYING:STAGE_CLEARED',
      'PLAYING:STAGE_FAILED',
      'PAUSED:RESUME',
      'PAUSED:RESTART',
      'PAUSED:TO_MAIN',
      'RESULT_CLEAR:NEXT_STAGE',
      'RESULT_CLEAR:RESTART',
      'RESULT_CLEAR:TO_MAIN',
      'RESULT_FAIL:RESTART',
      'RESULT_FAIL:TO_MAIN',
    ]);
    for (const sc of scenes) {
      for (const ev of events) {
        const stage = sc === 'MAIN_MENU' || sc === 'STAGE_SELECT' ? null : 3;
        const r = transition(S(sc, stage), ev);
        expect(r === null, `${sc}:${ev.type}`).toBe(!allowed.has(`${sc}:${ev.type}`));
      }
    }
  });
});

describe('Game (effects)', () => {
  it('menu → select → stage 1 creates a session in AIMING', () => {
    const { game } = makeGame();
    expect(game.scene).toBe('MAIN_MENU');
    expect(game.startGame()).toBe(true);
    expect(game.scene).toBe('STAGE_SELECT');
    expect(game.selectStage(2)).toBe(false); // 잠김
    expect(game.selectStage(1)).toBe(true);
    expect(game.scene).toBe('PLAYING');
    expect(game.session?.phase).toBe('AIMING');
    expect(game.session?.slingshot.state).toBe('LOADED');
  });

  it('paused world does not step; resume resets accumulator', () => {
    const { game, resets } = makeGame();
    game.startGame();
    game.selectStage(1);
    for (let i = 0; i < 10; i++) game.step();
    const steps = game.session!.stepCount;
    game.togglePause();
    expect(game.scene).toBe('PAUSED');
    expect(game.shouldStep()).toBe(false);
    for (let i = 0; i < 10; i++) game.step();
    expect(game.session!.stepCount).toBe(steps);
    game.togglePause();
    expect(game.scene).toBe('PLAYING');
    expect(resets()).toBeGreaterThanOrEqual(1);
  });

  it('pause cancels an in-progress drag and ignores canvas input while paused', () => {
    const { game } = makeGame();
    game.startGame();
    game.selectStage(1);
    expect(game.pointerDown({ x: 240, y: 680 })).toBe('grab');
    game.pointerMove({ x: 180, y: 720 });
    game.pause();
    expect(game.session!.slingshot.state).toBe('LOADED');
    expect(game.pointerDown({ x: 240, y: 680 })).toBeNull();
  });

  it('visibility hidden while PLAYING → PAUSED', () => {
    const { game } = makeGame();
    game.startGame();
    game.selectStage(1);
    expect(game.onHidden()).toBe(true);
    expect(game.scene).toBe('PAUSED');
    expect(game.onHidden()).toBe(false);
  });

  it('restart after one shot restores all birds and the original world', () => {
    const { game } = makeGame();
    game.startGame();
    game.selectStage(1);
    const s0 = game.session!;
    const initialBodies = s0.worldBodyCount();
    for (let i = 0; i < 70; i++) game.step();
    s0.launch({ x: 100, y: -40 });
    for (let i = 0; i < 20; i++) game.step();
    expect(game.session!.birdsLeft).toBe(2);
    game.pause();
    game.restart();
    expect(game.scene).toBe('PLAYING');
    expect(game.session).not.toBe(s0);
    expect(s0.disposed).toBe(true);
    expect(game.session!.birdsLeft).toBe(3);
    expect(game.session!.worldBodyCount()).toBe(initialBodies);
  });

  it('RESTART ×10 leaves exactly one collisionStart listener and a fresh world', () => {
    const { game } = makeGame();
    game.startGame();
    game.selectStage(1);
    const expectedBodies = game.session!.initialBodyCount;
    for (let i = 0; i < 10; i++) {
      for (let k = 0; k < 5; k++) game.step();
      expect(game.pause()).toBe(true);
      expect(game.restart()).toBe(true);
    }
    expect(game.session!.collisionListenerCount()).toBe(1);
    expect(game.session!.worldBodyCount()).toBe(expectedBodies);
  });

  it('TO_MAIN disposes the session', () => {
    const { game } = makeGame();
    game.startGame();
    game.selectStage(1);
    const s = game.session!;
    game.pause();
    game.toMain();
    expect(game.scene).toBe('MAIN_MENU');
    expect(game.session).toBeNull();
    expect(s.disposed).toBe(true);
    expect(s.collisionListenerCount()).toBe(0);
  });

  it('clear → saves, unlocks next; NEXT_STAGE loads stage n+1 fresh', () => {
    const { game, save } = makeGame();
    game.startGame();
    game.selectStage(1);
    const s = game.session!;
    // 돼지를 강제로 제거해 클리어 경로를 태운다
    for (const rec of s.registry.list()) if (rec.entity.kind === 'pig') s.queueRemoval(rec.body.id, 'destroyed');
    for (let i = 0; i < 200 && game.scene === 'PLAYING'; i++) game.step();
    expect(game.scene).toBe('RESULT_CLEAR');
    expect(game.lastResult?.cleared).toBe(true);
    expect(game.lastResult!.stars).toBeGreaterThanOrEqual(1);
    expect(save.unlocked).toBe(2);
    expect(save.record(1).bestScore).toBe(game.lastResult!.score);
    // 결과가 한 번만 전송됐는지: 더 돌려도 씬 유지
    for (let i = 0; i < 50; i++) game.step();
    expect(game.scene).toBe('RESULT_CLEAR');
    expect(game.nextStage()).toBe(true);
    expect(game.session!.stage.id).toBe(2);
    expect(game.session!.birdsLeft).toBe(STAGES[1]!.birds.length);
    expect(s.disposed).toBe(true);
  });
});
