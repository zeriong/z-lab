var AB = window.AB || (window.AB = {});

// Step 5 -- explicit game state machine: MENU -> PLAYING -> PAUSED ->
// CLEAR/FAIL. Only the edges listed in TABLE are legal; send() for any
// other action in a given state is a no-op (returns false).
AB.StateMachine = (function () {
  const TABLE = {
    MENU: { start: 'PLAYING' },
    PLAYING: { pause: 'PAUSED', clear: 'CLEAR', fail: 'FAIL' },
    PAUSED: { resume: 'PLAYING', retry: 'PLAYING', menu: 'MENU' },
    CLEAR: { retry: 'PLAYING', next: 'PLAYING', menu: 'MENU' },
    FAIL: { retry: 'PLAYING', menu: 'MENU' }
  };

  let current = 'MENU';
  const enterListeners = {};
  const exitListeners = {};

  function onEnter(state, fn) {
    (enterListeners[state] = enterListeners[state] || []).push(fn);
  }

  function onExit(state, fn) {
    (exitListeners[state] = exitListeners[state] || []).push(fn);
  }

  function send(action, payload) {
    const row = TABLE[current];
    const next = row && row[action];
    if (!next) return false;
    const from = current;
    (exitListeners[from] || []).forEach(function (fn) { fn(payload); });
    current = next;
    (enterListeners[current] || []).forEach(function (fn) { fn(payload); });
    return true;
  }

  function getState() { return current; }

  return { send: send, onEnter: onEnter, onExit: onExit, getState: getState, TABLE: TABLE };
})();
