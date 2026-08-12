/**
 * npm run test:replay  (R34, §13-6)
 *
 * 스테이지 1~10 각각에 대해 기록된 발사 시퀀스를 **헤드리스로** 재생하고
 * `pigsRemaining === 0`에 도달하는지 단언한다. 10개 전부 통과해야 한다.
 *
 * 이 테스트가 잡는 것: materials.ts의 임계/HP나 §7.4 정지 임계를 만졌을 때
 * 어떤 스테이지가 클리어 불가능해지는 것. 그 회귀는 손 플레이로는 안 보인다.
 *
 * 결정성에 대해(§12):
 *  - 시뮬레이션 계층은 Math.random()을 쓰지 않는다(파티클은 렌더 계층이고
 *    헤드리스 러너는 렌더를 아예 만들지 않는다).
 *  - 그래도 부동소수 누적은 남으므로 assert는 좌표가 아니라 "클리어 도달"이다.
 *  - 벽시계도 쓰지 않는다: RAF/누산기를 건너뛰고 GameScene.step()을 직접 돌린다.
 */

import { describe, expect, it } from 'vitest';
import { GameScene } from '../src/game/scene';
import { parseStage, STAGE_COUNT, type StageDef } from '../src/data/schema';
import { STAGE_SOURCES, STAGE_FILE_NAMES } from '../src/data/stages';
import { isLaunchable, solveLaunch, MAX_LAUNCH_SPEED } from '../src/game/slingshot';
import { STEP_MS } from '../src/physics/loop';
import fixtures from './fixtures/replays.json';

interface Shot {
  target: [number, number];
  steps: number;
  tapAt?: number;
}

const SHOTS = fixtures.stages as unknown as Record<string, Shot[]>;

/** 한 턴이 끝날 때까지 돌리는 상한. 6초 타임아웃(360스텝)의 두 배 + 리로드 여유. */
const MAX_STEPS_PER_TURN = 900;
/** 새가 새총에 올라올 때까지 기다리는 상한 */
const MAX_STEPS_WAITING = 240;

function stageDef(id: number): StageDef {
  return parseStage(STAGE_SOURCES[id - 1], STAGE_FILE_NAMES[id - 1] ?? `stage-${id}`);
}

interface ReplayReport {
  cleared: boolean;
  pigsRemaining: number;
  shotsFired: number;
  score: number;
  unreachable: string[];
}

function replay(def: StageDef, shots: Shot[]): ReplayReport {
  const scene = new GameScene();
  scene.mount(def);

  const unreachable: string[] = [];
  let fired = 0;

  for (const shot of shots) {
    if (scene.pigsRemaining === 0) break;

    // 새가 준비될 때까지 스텝을 돌린다(리로드 지연 600ms 소화).
    let waited = 0;
    while (!scene.getReadyBird() && waited < MAX_STEPS_WAITING) {
      scene.step(STEP_MS);
      waited += 1;
    }
    const bird = scene.getReadyBird();
    if (!bird) break; // 새가 떨어졌다 — 남은 시퀀스는 의미 없다

    const velocity = solveLaunch(
      { x: bird.position.x, y: bird.position.y },
      { x: shot.target[0], y: shot.target[1] },
      shot.steps,
      def.gravity,
    );

    if (!isLaunchable(velocity)) {
      // 새총으로 만들 수 없는 속도를 픽스처가 요구하고 있다.
      // 조용히 클램프하면 "왜 안 맞는지"가 영원히 안 보이므로 기록해서 실패시킨다.
      const speed = Math.hypot(velocity.x, velocity.y).toFixed(2);
      unreachable.push(
        `stage ${def.id} shot ${fired + 1}: 필요 속도 ${speed} > 상한 ${MAX_LAUNCH_SPEED.toFixed(2)} (겨냥점 ${shot.target.join(',')}, steps ${shot.steps})`,
      );
      break;
    }

    scene.launch(velocity);
    fired += 1;

    let i = 0;
    while (scene.isTurnActive && i < MAX_STEPS_PER_TURN) {
      if (shot.tapAt !== undefined && i === shot.tapAt) scene.tapAbility();
      scene.step(STEP_MS);
      i += 1;
    }
  }

  // 마지막 턴의 결론(클리어/실패 판정)이 나올 때까지 조금 더 돌린다.
  let tail = 0;
  while (!scene.isFinished && tail < MAX_STEPS_PER_TURN) {
    scene.step(STEP_MS);
    tail += 1;
  }

  const report: ReplayReport = {
    cleared: scene.pigsRemaining === 0,
    pigsRemaining: scene.pigsRemaining,
    shotsFired: fired,
    score: scene.score,
    unreachable,
  };
  scene.unmount();
  return report;
}

describe('리플레이 회귀 (§13-6)', () => {
  it('10개 스테이지 전부에 시퀀스가 기록되어 있다', () => {
    for (let id = 1; id <= STAGE_COUNT; id += 1) {
      expect(SHOTS[String(id)], `stage ${id} 시퀀스 누락`).toBeDefined();
      expect(SHOTS[String(id)].length).toBeGreaterThan(0);
    }
  });

  it('기록된 발사는 전부 새총이 낼 수 있는 속도 안에 있다', () => {
    const problems: string[] = [];
    for (let id = 1; id <= STAGE_COUNT; id += 1) {
      const def = stageDef(id);
      const origin = def.slingshot;
      SHOTS[String(id)].forEach((shot, i) => {
        const v = solveLaunch(origin, { x: shot.target[0], y: shot.target[1] }, shot.steps, def.gravity);
        if (!isLaunchable(v)) {
          problems.push(`stage ${id} shot ${i + 1}: |v| = ${Math.hypot(v.x, v.y).toFixed(2)}`);
        }
      });
    }
    expect(problems).toEqual([]);
  });

  it('발사 수가 스테이지가 주는 새 수를 넘지 않는다', () => {
    for (let id = 1; id <= STAGE_COUNT; id += 1) {
      const def = stageDef(id);
      expect(SHOTS[String(id)].length).toBeLessThanOrEqual(def.birds.length);
    }
  });

  for (let id = 1; id <= STAGE_COUNT; id += 1) {
    it(`stage ${String(id).padStart(2, '0')} — 기록된 시퀀스로 돼지가 0마리가 된다`, () => {
      const def = stageDef(id);
      const report = replay(def, SHOTS[String(id)]);

      expect(report.unreachable).toEqual([]);
      expect(
        report.pigsRemaining,
        `stage ${id}: ${report.shotsFired}발 발사 후 돼지 ${report.pigsRemaining}마리 잔존 (점수 ${report.score})`,
      ).toBe(0);
      expect(report.cleared).toBe(true);
    });
  }
});
