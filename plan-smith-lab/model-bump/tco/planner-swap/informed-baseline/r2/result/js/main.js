window.AB = window.AB || {};

(function() {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const canvas = document.getElementById('game-canvas');
      AB.Game.init(canvas);
    });
  } else {
    const canvas = document.getElementById('game-canvas');
    AB.Game.init(canvas);
  }
})();
