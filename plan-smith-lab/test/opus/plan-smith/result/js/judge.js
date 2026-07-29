/* judge.js — 데미지 처리 / 파괴 / 클리어·실패 판정.
 *
 * A3: 클리어는 "돼지 수 == 0"이 되는 제거 경로에서 발화한다(렌더 루프 폴링 아님).
 * A3xA5: 실패는 (새 소진) AND (돼지 잔존) AND (월드 정지 T ms 지속) 세 조건의 곱.
 *        비행 중에는 절대 실패로 넘어가지 않는다.
 */
(function (AB) {
  'use strict';

  var CFG = AB.CFG;
  var Physics = AB.Physics;

  var Judge = {};

  // 결과 콜백은 main.js가 주입한다(FSM 전이).
  Judge.onResult = function () {};

  Judge.attach = function (session) {
    Physics.onCollisionStart(session.engine, function (evt) {
      var pairs = evt.pairs;
      for (var i = 0; i < pairs.length; i++) {
        handlePair(session, pairs[i].bodyA, pairs[i].bodyB);
      }
    });
  };

  function handlePair(session, a, b) {
    applyIfDestructible(session, a, b);
    applyIfDestructible(session, b, a);
  }

  function applyIfDestructible(session, target, other) {
    if (!target || target.hp === undefined) return;
    if (target.gameKind !== 'block' && target.gameKind !== 'pig') return;
    var dmg = Physics.impactDamage(target, other);
    if (dmg <= 0) return;
    target.hp -= dmg;
    target.hitFlash = 6;
    if (target.hp <= 0) destroy(session, target);
  }

  function destroy(session, body) {
    if (body.gameDead) return;
    body.gameDead = true;

    if (body.gameKind === 'pig') {
      removeFrom(session.pigs, body);
      session.score += CFG.SCORE_PIG;
      spawnPop(session, body.position.x, body.position.y, '#8fd67a');
    } else {
      removeFrom(session.blocks, body);
      session.destroyedBlocks += 1;
      session.score += CFG.SCORE_BLOCK;
      spawnPop(session, body.position.x, body.position.y,
        (AB.MATERIALS[body.material] || AB.MATERIALS.wood).fill);
    }
    Physics.remove(session.engine, body);
    session.shakeTimer = Math.min(12, session.shakeTimer + 5);

    if (session.pigs.length === 0) setResult(session, 'clear');
    if (AB.UI) AB.UI.syncHud(session);
  }

  function removeFrom(arr, body) {
    var i = arr.indexOf(body);
    if (i >= 0) arr.splice(i, 1);
  }

  // 파괴 연출용 짧은 파편(렌더러가 소비) — off-anchor지만 비용 0에 가까운 피드백
  function spawnPop(session, x, y, color) {
    if (!session.pops) session.pops = [];
    for (var i = 0; i < 6; i++) {
      session.pops.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 5 - 1,
        life: 26 + Math.random() * 12,
        color: color
      });
    }
  }

  function setResult(session, result) {
    if (session.result) return;
    session.result = result;
    session.resultTimer = 0;
    if (result === 'clear') {
      session.score += session.birdsLeft * CFG.SCORE_BIRD_LEFT;
    }
    session.phase = 'over';
  }

  function outOfWorld(body) {
    return body.position.y > CFG.HEIGHT + 200 ||
      body.position.x < -200 || body.position.x > CFG.WIDTH + 200;
  }

  /* ---------- 매 물리 스텝 후 호출 ---------- */

  Judge.step = function (session) {
    updatePops(session);
    if (session.shakeTimer > 0) session.shakeTimer -= 1;

    // 월드 밖으로 떨어진 것들 정리 (돼지는 제거 = 사망)
    var i;
    for (i = session.pigs.length - 1; i >= 0; i--) {
      if (outOfWorld(session.pigs[i])) destroy(session, session.pigs[i]);
    }
    for (i = session.blocks.length - 1; i >= 0; i--) {
      if (outOfWorld(session.blocks[i])) destroy(session, session.blocks[i]);
    }

    // 결과 확정 대기(연출 여유)
    if (session.result) {
      session.resultTimer += 1;
      if (!session.resultFired && session.resultTimer >= CFG.RESULT_DELAY_STEPS) {
        session.resultFired = true;
        Judge.onResult(session, session.result);
      }
      return;
    }

    // 정지 감지 (공유 조건)
    if (Physics.isWorldQuiet(session.engine)) {
      session.quietSteps += 1;
    } else {
      session.quietSteps = 0;
    }

    if (session.phase === 'flight' && session.bird) {
      session.flightSteps += 1;
      if (session.flightSteps % 3 === 0) {
        session.trail.push({ x: session.bird.position.x, y: session.bird.position.y });
        if (session.trail.length > 200) session.trail.shift();
      }

      var done = outOfWorld(session.bird) ||
        session.flightSteps > CFG.BIRD_TIMEOUT_STEPS ||
        session.quietSteps >= CFG.SETTLE_STEPS;

      if (done) endOfShot(session);
      return;
    }

    // 새가 걸이에 없고(소진) 돼지가 남았고 월드가 멈췄으면 실패
    if (!session.bird && session.birdsLeft <= 0 &&
        session.pigs.length > 0 && session.quietSteps >= CFG.SETTLE_STEPS) {
      setResult(session, 'fail');
    }
  };

  function endOfShot(session) {
    AB.Stage.retireBird(session);
    if (session.pigs.length === 0) {
      setResult(session, 'clear');
      return;
    }
    if (session.birdsLeft > 0) {
      AB.Stage.spawnBird(session);
      if (AB.UI) AB.UI.syncHud(session);
    } else {
      session.quietSteps = 0;   // 실패 판정은 다시 "정지 지속"을 요구
      session.phase = 'aim';
    }
  }

  function updatePops(session) {
    if (!session.pops || !session.pops.length) return;
    for (var i = session.pops.length - 1; i >= 0; i--) {
      var p = session.pops[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.life -= 1;
      if (p.life <= 0) session.pops.splice(i, 1);
    }
  }

  AB.Judge = Judge;
})(window.AB);
