(function() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      AB.Game.init(document.getElementById('game-canvas'));
    });
  } else {
    AB.Game.init(document.getElementById('game-canvas'));
  }
})();
