// 헤드리스 재생 도구: 브라우저 없이 StageSession을 고정 스텝으로 돌린다.
import { GRACE_STEPS } from '../src/config';
import { StageSession } from '../src/physics/session';
import type { ShotDef, StageData } from '../src/types';

export interface RunResult {
  session: StageSession;
  result: 'clear' | 'fail' | null;
  score: number;
  steps: number;
  shotsFired: number;
}

/**
 * shots를 차례로 발사하며 결과가 나올 때까지 돌린다.
 * - 발사는 phase === AIMING이고 유예(60스텝)가 지난 뒤에만 한다 (사람이 1초 안에 쏘는 일은 드물다).
 * - abilityAtStep이 있으면 그 비행 스텝 수에 도달한 직후 능력을 쓴다.
 * - 쏠 새가 남지 않았는데 AIMING이면(풀이가 모자람) 곧바로 멈춘다.
 */
export function runShots(stage: StageData, shots: readonly ShotDef[], maxSteps = 8000): RunResult {
  const session = StageSession.create(stage);
  let next = 0;
  let current: ShotDef | null = null;
  let steps = 0;
  while (steps < maxSteps && !session.resultSent) {
    if (session.phase === 'AIMING' && session.slingshot.state === 'LOADED') {
      if (next >= shots.length) break;
      if (session.stepCount >= GRACE_STEPS) {
        current = shots[next++]!;
        session.launch(current.pull);
      }
    }
    session.step();
    steps++;
    const f = session.flight;
    if (current && current.abilityAtStep !== undefined && f && !f.abilityUsed && f.steps >= current.abilityAtStep) {
      session.useAbility();
    }
  }
  const out: RunResult = {
    session,
    result: session.result,
    score: session.score,
    steps,
    shotsFired: next,
  };
  return out;
}

export function runSolution(stage: StageData): RunResult {
  return runShots(stage, stage.solution);
}

/** 모든 새를 pull (20, 0)으로 쏜다 — 약한 사격으로는 클리어되면 안 된다 */
export function runNull(stage: StageData): RunResult {
  return runShots(
    stage,
    stage.birds.map(() => ({ pull: { x: 20, y: 0 } })),
  );
}

export interface SettleResult {
  pigsLost: number;
  blocksLost: number;
  maxDisplacement: number;
}

/** 입력 없이 n스텝 → 죽은 돼지 수, 파괴된 블록 수, 동적 바디 최대 변위 */
export function settle(stage: StageData, n = 300): SettleResult {
  const s = StageSession.create(stage);
  const start = new Map<number, { x: number; y: number }>();
  for (const rec of s.registry.values()) {
    if (rec.entity.kind === 'block' || rec.entity.kind === 'pig') {
      start.set(rec.body.id, { x: rec.body.position.x, y: rec.body.position.y });
    }
  }
  const pigs0 = s.pigsAlive;
  const blocks0 = s.registry.count('block');
  for (let i = 0; i < n; i++) s.step();
  let maxD = 0;
  for (const [id, p0] of start) {
    const body = s.registry.getBody(id);
    if (!body) continue;
    maxD = Math.max(maxD, Math.hypot(body.position.x - p0.x, body.position.y - p0.y));
  }
  const res = { pigsLost: pigs0 - s.pigsAlive, blocksLost: blocks0 - s.registry.count('block'), maxDisplacement: maxD };
  s.dispose();
  return res;
}

/** 테스트용 최소 스테이지 */
export function fixture(partial: Partial<StageData> = {}): StageData {
  return {
    id: 1,
    name: 'fixture',
    birds: ['red', 'red', 'red'],
    blocks: [],
    pigs: [{ type: 'small', x: 1500, y: 800 }],
    slack: 2,
    solution: [{ pull: { x: 100, y: -40 } }],
    ...partial,
  };
}
