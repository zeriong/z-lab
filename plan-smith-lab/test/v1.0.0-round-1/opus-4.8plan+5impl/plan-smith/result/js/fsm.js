/* fsm.js — 명시적 상태 머신 (A5).
 * 불리언 플래그 난립 금지: 화면 표시/입력 허용/시뮬레이션 진행은 모두 이 state 하나에서 파생된다.
 *
 *   BOOT → MENU
 *   MENU → PLAYING
 *   PLAYING → PAUSED | CLEAR | FAIL | MENU
 *   PAUSED → PLAYING(계속) | PLAYING(다시하기) | MENU
 *   CLEAR → PLAYING(다음/다시하기) | MENU
 *   FAIL → PLAYING(다시하기) | MENU
 *   * → ERROR (엔진 로드 실패)
 */
(function (AB) {
  'use strict';

  var TRANSITIONS = {
    BOOT: ['MENU', 'ERROR'],
    MENU: ['PLAYING', 'ERROR'],
    PLAYING: ['PAUSED', 'CLEAR', 'FAIL', 'MENU', 'ERROR'],
    PAUSED: ['PLAYING', 'MENU', 'ERROR'],
    CLEAR: ['PLAYING', 'MENU', 'ERROR'],
    FAIL: ['PLAYING', 'MENU', 'ERROR'],
    ERROR: []
  };

  var FSM = {
    state: 'BOOT',
    listeners: []
  };

  FSM.on = function (fn) {
    FSM.listeners.push(fn);
  };

  FSM.can = function (next) {
    var allowed = TRANSITIONS[FSM.state] || [];
    return allowed.indexOf(next) >= 0;
  };

  FSM.set = function (next) {
    if (next === FSM.state) return true;
    if (!FSM.can(next)) {
      // 잘못된 전이는 조용히 삼키지 않는다(콘솔로 노출).
      if (window.console) console.warn('[FSM] 거부된 전이:', FSM.state, '->', next);
      return false;
    }
    var prev = FSM.state;
    FSM.state = next;
    FSM.listeners.forEach(function (fn) { fn(next, prev); });
    return true;
  };

  FSM.is = function (s) {
    return FSM.state === s;
  };

  // 물리 시뮬레이션이 진행되는 유일한 상태
  FSM.isSimulating = function () {
    return FSM.state === 'PLAYING';
  };

  AB.FSM = FSM;
})(window.AB);
