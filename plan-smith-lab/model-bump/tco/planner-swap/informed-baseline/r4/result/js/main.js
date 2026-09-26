window.AB = window.AB || {};

(function() {
  'use strict';

  function start() {
    const canvas = document.getElementById('game-canvas');
    AB.Game.init(canvas);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
