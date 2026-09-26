(function() {
  function init() {
    const canvas = document.getElementById('game-canvas');
    window.AB.Game.init(canvas);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
