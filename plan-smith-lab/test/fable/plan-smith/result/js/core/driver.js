// 솔루션 리플레이 드라이버 (플랜 6단계 — 검증 하네스의 코어).
// "깰 수 있나?"라는 질문을 프로브(자동 발사 실행)로 바꾼다.
// Node 검증 스크립트와 브라우저 개발 모드가 같은 코드를 쓴다.

import { CONFIG } from './config.js';
import { createSession } from './session.js';

// 오토파일럿: 매 틱 tick()을 호출하면, 발사 가능 + 월드 안정 시점에
// 솔루션 시퀀스의 다음 발사를 수행한다.
export function createAutopilot(session, solution) {
  let index = 0;
  let waitTicks = 0;
  const A = CONFIG.AUTOPILOT;

  function worldCalmEnough() {
    for (const body of session.allBodies()) {
      if (body.isStatic) continue;
      if (Math.hypot(body.velocity.x, body.velocity.y) >= A.calmSpeed) return false;
    }
    return true;
  }

  return {
    get done() { return index >= solution.length; },
    get index() { return index; },
    tick() {
      if (session.finished || index >= solution.length) return;
      if (!session.canLaunch) { waitTicks = 0; return; }
      waitTicks++;
      if (waitTicks < A.minWaitTicks) return;
      if (worldCalmEnough() || waitTicks >= A.maxWaitTicks) {
        const shot = solution[index++];
        session.launch(shot.angle, shot.power);
        waitTicks = 0;
      }
    },
  };
}

// 스테이지 + 솔루션을 헤드리스로 끝까지 실행한다.
// maxTicks: 안전 상한(기본 120s 시뮬레이션) — 영원한 대기 금지의 하네스판.
export function runSolution(Matter, stage, solution, { maxTicks = 7200 } = {}) {
  const session = createSession(Matter, stage);
  const pilot = createAutopilot(session, solution || stage.solution || []);
  let ticks = 0;
  while (!session.finished && ticks < maxTicks) {
    pilot.tick();
    session.step();
    ticks++;
  }
  const result = {
    cleared: session.outcome === 'clear',
    outcome: session.outcome, // null이면 maxTicks 초과(판정 미도달 — 버그)
    verdictPath: session.verdictPath,
    ticks,
    pigsLeft: session.pigsLeft,
    shotsFired: session.shotsFired,
    damageDealt: session.damageDealt,
    blocksDestroyed: session.blocksDestroyed,
    hash: session.snapshotHash(),
    bodyCount: session.bodyCount(),
    listenerCount: session.listenerCount(),
  };
  session.dispose();
  return result;
}
