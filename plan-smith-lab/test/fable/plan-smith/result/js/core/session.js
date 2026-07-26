// 게임 세션 — 스테이지 JSON의 인터프리터 (플랜 A1×A2).
// 물리 세계 구축, 슬링샷 발사, 충격량 누적 파괴, settle 기반 클리어/실패 판정을
// 전부 소유한다. 렌더/입력/UI는 이 객체를 읽기만 한다.
//
// 틱 소유권(플랜 A3): 이 모듈은 스스로 시간을 진행하지 않는다.
// 외부 루프가 step()을 호출할 때만 정확히 1 고정 틱(1000/60ms)이 흐른다.
// Matter.Runner는 어디에도 없다.
//
// Matter는 인자로 주입받는다 — 브라우저(window.Matter)와 Node(require)가 같은
// 코드를 공유하기 위함(리플레이 검증 하네스, 플랜 6단계).

import { CONFIG } from './config.js';

export function createSession(Matter, stage) {
  const { Engine, Bodies, Body, Composite, Events, Vector } = Matter;
  const C = CONFIG;

  const engine = Engine.create({ enableSleeping: false });
  engine.gravity.x = 0;
  engine.gravity.y = 1;

  // ── 상태 ──────────────────────────────────────────────
  let tick = 0;
  let finished = false;
  let outcome = null;        // 'clear' | 'fail'
  let verdictPath = null;    // 'pigs-cleared' | 'settle' | 'timeout'
  let birdsRemaining = stage.birds; // 아직 장전되지 않은 새 수
  let currentBird = null;    // 장전 또는 비행 중인 새 바디
  let birdPhase = 'none';    // 'loaded' | 'flying' | 'none'
  let flightTicks = 0;
  let slowTicks = 0;
  let lastSpentTick = -1;    // 마지막 새 소진 시점(판정 타이머 기점)
  let settleCounter = 0;
  let shotsFired = 0;
  let aiming = false;

  const pigs = [];           // 살아있는 돼지 바디
  const damageQueue = [];    // collisionStart에서 누적, step 후반에 일괄 적용
  const fx = [];             // 렌더용 이벤트(파괴 등) — drainFx()로 소비
  let damageDealt = 0;       // 솔버 점수용 누적 피해량
  let blocksDestroyed = 0;

  const anchor = { x: C.SLING.x, y: C.SLING.y };

  // ── 월드 구축 (스테이지 데이터 → 물리 바디) ──────────────
  const ground = Bodies.rectangle(
    C.WORLD.width / 2, C.WORLD.groundY + 30, C.WORLD.width + 800, 60,
    { isStatic: true, friction: 0.8, restitution: 0, label: 'ground' }
  );
  ground.plugin.g = { kind: 'ground' };
  Composite.add(engine.world, ground);

  for (const p of stage.platforms || []) {
    const body = Bodies.rectangle(p.x, p.y, p.w, p.h, {
      isStatic: true, friction: 0.8, restitution: 0, angle: (p.angle || 0) * Math.PI / 180,
    });
    body.plugin.g = { kind: 'platform', w: p.w, h: p.h };
    Composite.add(engine.world, body);
  }

  for (const b of stage.blocks || []) {
    const mat = C.MATERIALS[b.material];
    if (!mat) throw new Error(`unknown material: ${b.material}`);
    const body = Bodies.rectangle(b.x, b.y, b.w, b.h, {
      density: mat.density, friction: mat.friction, restitution: mat.restitution,
      angle: (b.angle || 0) * Math.PI / 180,
    });
    body.plugin.g = { kind: 'block', material: b.material, hp: mat.hp, maxHp: mat.hp, w: b.w, h: b.h };
    Composite.add(engine.world, body);
  }

  for (const p of stage.pigs || []) {
    const r = p.r || C.PIG.radius;
    const body = Bodies.circle(p.x, p.y, r, {
      density: C.PIG.density, friction: C.PIG.friction, restitution: C.PIG.restitution,
    });
    body.plugin.g = { kind: 'pig', hp: C.PIG.hp, maxHp: C.PIG.hp, r };
    Composite.add(engine.world, body);
    pigs.push(body);
  }

  // ── 파괴 규칙: 충격량 누적 → 내구도 차감 (플랜 4단계) ──────
  function effMass(body) {
    return body.isStatic ? C.DAMAGE.staticMass : Math.min(body.mass, C.DAMAGE.massCap);
  }

  function onCollisionStart(event) {
    for (const pair of event.pairs) {
      const { bodyA, bodyB } = pair;
      const rel = Vector.sub(bodyA.velocity, bodyB.velocity);
      const relN = Math.abs(Vector.dot(rel, pair.collision.normal));
      if (relN < C.DAMAGE.minRelSpeed) continue;
      const dmgToA = 0.5 * effMass(bodyB) * relN * relN * C.DAMAGE.scale;
      const dmgToB = 0.5 * effMass(bodyA) * relN * relN * C.DAMAGE.scale;
      damageQueue.push([bodyA, dmgToA], [bodyB, dmgToB]);
    }
  }
  Events.on(engine, 'collisionStart', onCollisionStart);

  function applyDamageQueue() {
    for (const [body, dmg] of damageQueue) {
      const g = body.plugin.g;
      if (!g || g.hp == null) continue; // 새·지면·플랫폼은 비파괴
      if (g.hp <= 0) continue;          // 이미 죽음 처리 대기
      g.hp -= dmg;
      damageDealt += Math.min(dmg, g.maxHp);
    }
    damageQueue.length = 0;
    // 사망 처리 — 큐 적용 후 일괄 제거(충돌 콜백 내 제거를 피한다)
    for (const body of Composite.allBodies(engine.world)) {
      const g = body.plugin.g;
      if (g && g.hp != null && g.hp <= 0) removeDestroyed(body);
    }
  }

  function removeDestroyed(body) {
    const g = body.plugin.g;
    Composite.remove(engine.world, body);
    if (g.kind === 'pig') {
      const i = pigs.indexOf(body);
      if (i >= 0) pigs.splice(i, 1);
      fx.push({ type: 'pig-dead', x: body.position.x, y: body.position.y, r: g.r });
    } else if (g.kind === 'block') {
      blocksDestroyed++;
      fx.push({ type: 'block-destroy', x: body.position.x, y: body.position.y, material: g.material, w: g.w, h: g.h });
    }
  }

  // ── 월드 밖 이탈 정리 ─────────────────────────────────
  function processOOB() {
    for (const body of Composite.allBodies(engine.world)) {
      if (body.isStatic) continue;
      const { x, y } = body.position;
      if (x < C.OOB.minX || x > C.OOB.maxX || y > C.OOB.maxY) {
        const g = body.plugin.g || {};
        Composite.remove(engine.world, body);
        if (g.kind === 'pig') {
          const i = pigs.indexOf(body);
          if (i >= 0) pigs.splice(i, 1);
          fx.push({ type: 'pig-dead', x, y, r: g.r });
        }
        if (body === currentBird && birdPhase === 'flying') {
          currentBird = null;
          onBirdSpent();
        }
      }
    }
  }

  // ── 새 장전/발사/소진 라이프사이클 ──────────────────────
  function loadNextBird() {
    if (finished || birdsRemaining <= 0 || pigs.length === 0) return;
    birdsRemaining--;
    // 주의: isStatic:true로 "생성"하면 Matter가 원래 질량을 저장하지 않아
    // 동적 전환 시 mass=Infinity(NaN 폭주)가 된다. 동적 생성 → 정적 전환 순서 고정.
    currentBird = Bodies.circle(anchor.x, anchor.y, C.BIRD.radius, {
      density: C.BIRD.density, friction: C.BIRD.friction,
      restitution: C.BIRD.restitution, frictionAir: C.BIRD.frictionAir,
    });
    Body.setStatic(currentBird, true);
    currentBird.plugin.g = { kind: 'bird', r: C.BIRD.radius };
    Composite.add(engine.world, currentBird);
    birdPhase = 'loaded';
  }

  function doLaunch(velocity) {
    if (birdPhase !== 'loaded' || finished) return false;
    aiming = false;
    Body.setStatic(currentBird, false);
    Body.setVelocity(currentBird, velocity);
    birdPhase = 'flying';
    flightTicks = 0;
    slowTicks = 0;
    shotsFired++;
    fx.push({ type: 'launch', x: currentBird.position.x, y: currentBird.position.y });
    return true;
  }

  function onBirdSpent() {
    birdPhase = 'none';
    if (birdsRemaining > 0 && pigs.length > 0) {
      loadNextBird();
    } else {
      lastSpentTick = tick; // 판정 타이머 기점 (플랜 A4)
      settleCounter = 0;
    }
  }

  function updateBirdLifecycle() {
    if (birdPhase !== 'flying' || !currentBird) return;
    flightTicks++;
    const speed = Math.hypot(currentBird.velocity.x, currentBird.velocity.y);
    if (speed < C.VERDICT.birdSpentSpeed) slowTicks++;
    else slowTicks = 0;
    if (slowTicks >= C.VERDICT.birdSpentTicks || flightTicks >= C.VERDICT.birdMaxFlight) {
      onBirdSpent(); // 시체는 월드에 남는다 — settle 판정 대상
    }
  }

  // ── 판정 (플랜 A4: 돼지 수만 세지 않는다) ─────────────────
  // clear: 돼지 전멸 즉시(잔여 새 무관).
  // fail: 잔여 새 없음 + 세계 settle + 돼지 잔존 — 진행 중 붕괴를 기다린다.
  // timeout: settle 미도달(미세 진동)이라도 10s 후 강제 재평가 — 영원한 대기 금지.
  function worldIsCalm() {
    for (const body of Composite.allBodies(engine.world)) {
      if (body.isStatic) continue;
      if (Math.hypot(body.velocity.x, body.velocity.y) >= C.VERDICT.settleSpeed) return false;
    }
    return true;
  }

  function finish(result, path) {
    finished = true;
    outcome = result;
    verdictPath = path;
  }

  function updateVerdict() {
    if (finished) return;
    if (pigs.length === 0) { finish('clear', 'pigs-cleared'); return; }
    const noBirdsLeft = birdsRemaining === 0 && birdPhase === 'none';
    if (!noBirdsLeft) return;
    if (worldIsCalm()) settleCounter++;
    else settleCounter = 0;
    if (settleCounter >= C.VERDICT.settleTicks) { finish('fail', 'settle'); return; }
    if (tick - lastSpentTick >= C.VERDICT.timeoutTicks) {
      finish(pigs.length > 0 ? 'fail' : 'clear', 'timeout');
    }
  }

  // ── 고정 틱 진행 — 유일한 시간 전진점 ─────────────────────
  function step() {
    if (finished) return false;
    tick++;
    Engine.update(engine, C.DT_MS);
    applyDamageQueue();
    processOOB();
    updateBirdLifecycle();
    updateVerdict();
    return true;
  }

  // ── 조준 API (수동 입력용) ─────────────────────────────
  function setAim(x, y) {
    if (birdPhase !== 'loaded' || finished) return;
    aiming = true;
    let dx = x - anchor.x, dy = y - anchor.y;
    const dist = Math.hypot(dx, dy);
    if (dist > C.SLING.maxDrag) {
      dx *= C.SLING.maxDrag / dist;
      dy *= C.SLING.maxDrag / dist;
    }
    const py = Math.min(anchor.y + dy, C.WORLD.groundY - C.BIRD.radius - 2);
    Body.setPosition(currentBird, { x: anchor.x + dx, y: py });
  }

  function launchVelocityFromAim() {
    if (birdPhase !== 'loaded') return null;
    const dx = anchor.x - currentBird.position.x;
    const dy = anchor.y - currentBird.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 10) return null; // 너무 약한 당김 — 발사 아님
    const speed = (Math.min(dist, C.SLING.maxDrag) / C.SLING.maxDrag) * C.SLING.maxSpeed;
    return { x: (dx / dist) * speed, y: (dy / dist) * speed };
  }

  function release() {
    const v = launchVelocityFromAim();
    aiming = false;
    if (!v) { cancelAim(); return false; }
    return doLaunch(v);
  }

  function cancelAim() {
    aiming = false;
    if (birdPhase === 'loaded' && currentBird) Body.setPosition(currentBird, { ...anchor });
  }

  // ── 발사 API (리플레이/솔루션용): 각도(도)·힘(0..1) ─────────
  function launch(angleDeg, power) {
    if (birdPhase !== 'loaded' || finished) return false;
    Body.setPosition(currentBird, { ...anchor });
    const rad = angleDeg * Math.PI / 180;
    const speed = Math.max(0, Math.min(1, power)) * C.SLING.maxSpeed;
    return doLaunch({ x: Math.cos(rad) * speed, y: -Math.sin(rad) * speed });
  }

  // ── 개발 모드 계측 (플랜 완료 정의 2) ───────────────────
  function bodyCount() { return Composite.allBodies(engine.world).length; }
  function listenerCount() {
    let n = 0;
    for (const k of Object.keys(engine.events || {})) n += engine.events[k].length;
    return n;
  }
  function snapshotHash() {
    // 결정성 시험용 — 전체 바디의 최종 좌표/각도 서명
    return Composite.allBodies(engine.world)
      .map(b => `${b.plugin.g?.kind || '?'}:${b.position.x.toFixed(3)},${b.position.y.toFixed(3)},${b.angle.toFixed(4)}`)
      .sort().join('|');
  }

  function dispose() {
    Events.off(engine, 'collisionStart', onCollisionStart);
    Composite.clear(engine.world, false, true);
    Engine.clear(engine);
  }

  loadNextBird();

  return {
    // 조회
    get tick() { return tick; },
    get finished() { return finished; },
    get outcome() { return outcome; },
    get verdictPath() { return verdictPath; },
    get pigsLeft() { return pigs.length; },
    get birdsLeft() { return birdsRemaining + (birdPhase === 'loaded' ? 1 : 0); },
    get birdPhase() { return birdPhase; },
    get canLaunch() { return birdPhase === 'loaded' && !finished; },
    get currentBird() { return currentBird; },
    get aiming() { return aiming; },
    get shotsFired() { return shotsFired; },
    get damageDealt() { return damageDealt; },
    get blocksDestroyed() { return blocksDestroyed; },
    anchor,
    allBodies: () => Composite.allBodies(engine.world),
    drainFx: () => fx.splice(0, fx.length),
    launchVelocityFromAim,
    // 진행/조작
    step, setAim, release, cancelAim, launch,
    // 계측/수명
    bodyCount, listenerCount, snapshotHash, dispose,
  };
}
