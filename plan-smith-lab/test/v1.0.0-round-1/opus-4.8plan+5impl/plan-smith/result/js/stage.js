/* stage.js — 키스톤: 스테이지 데이터 → 월드 (멱등 로더).
 *
 * A1xA4: 엔진은 데이터를 읽을 뿐이다. A5xA1: "다시하기"와 "스테이지 로드"는 같은 함수다.
 * 멱등성 보장 방식 — 로드마다 새 Matter 엔진을 만들고, 이전 엔진은 통째로 폐기한다.
 * 따라서 N회 연속 다시하기 후 바디 수는 항상 동일(누수 0).
 */
(function (AB) {
  'use strict';

  var CFG = AB.CFG;
  var Physics = AB.Physics;

  var Stage = {};

  Stage.count = function () {
    return AB.STAGES.length;
  };

  Stage.data = function (index) {
    return AB.STAGES[index];
  };

  /**
   * 스테이지 세션 생성. 기존 세션이 있으면 먼저 폐기한다(멱등).
   * @param {number} index 0-based
   * @param {object|null} previous 폐기할 이전 세션
   */
  Stage.load = function (index, previous) {
    if (previous) Stage.destroy(previous);

    var data = AB.STAGES[index];
    var engine = Physics.createEngine();

    var session = {
      index: index,
      data: data,
      engine: engine,
      groundTop: data.groundTop || CFG.GROUND_TOP,
      anchor: { x: data.slingshot.x, y: data.slingshot.y },
      blocks: [],
      pigs: [],
      bird: null,
      birdsLeft: data.birds,
      birdsTotal: data.birds,
      score: 0,
      destroyedBlocks: 0,
      // phase: 'aim' | 'drag' | 'flight' | 'settling' | 'over'
      phase: 'aim',
      pull: { x: 0, y: 0 },
      dragging: false,
      trail: [],
      lastTrails: [],
      flightSteps: 0,
      quietSteps: 0,
      result: null,          // 'clear' | 'fail'
      resultTimer: 0,
      shakeTimer: 0
    };

    // 정적 지형
    Physics.add(engine, [Physics.makeGround(session.groundTop)]);
    Physics.add(engine, Physics.makeWalls());

    // 데이터 → 블록
    (data.blocks || []).forEach(function (spec) {
      var body = Physics.makeBlock(spec);
      session.blocks.push(body);
      Physics.add(engine, [body]);
    });

    // 데이터 → 돼지
    (data.pigs || []).forEach(function (spec) {
      var body = Physics.makePig(spec);
      session.pigs.push(body);
      Physics.add(engine, [body]);
    });

    session.initialBodyCount = Physics.bodyCount(engine);

    Stage.spawnBird(session);
    AB.Judge.attach(session);

    return session;
  };

  Stage.destroy = function (session) {
    if (!session) return;
    Physics.destroyEngine(session.engine);
    session.engine = null;
    session.blocks.length = 0;
    session.pigs.length = 0;
    session.bird = null;
  };

  // 걸이 위에 다음 새를 올린다(정적 상태로 대기).
  Stage.spawnBird = function (session) {
    if (session.birdsLeft <= 0) return null;
    var bird = Physics.makeBird(session.anchor.x, session.anchor.y);
    session.bird = bird;
    session.pull.x = 0;
    session.pull.y = 0;
    session.phase = 'aim';
    session.trail = [];
    session.flightSteps = 0;
    session.quietSteps = 0;
    Physics.add(session.engine, [bird]);
    return bird;
  };

  // 비행이 끝난 새 제거 + 다음 새 준비. 새가 없으면 판정은 Judge가 처리.
  Stage.retireBird = function (session) {
    if (session.bird) {
      if (session.trail.length > 1) {
        session.lastTrails.push(session.trail.slice(0));
        if (session.lastTrails.length > 3) session.lastTrails.shift();
      }
      Physics.remove(session.engine, session.bird);
      session.bird = null;
    }
    session.phase = 'aim';
  };

  AB.Stage = Stage;
})(window.AB);
