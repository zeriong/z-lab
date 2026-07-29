var AB = window.AB || (window.AB = {});

// Bootstrap: owns the canvas, the physics world, the session (score/pigs/
// birds), and the fixed-timestep accumulator loop (Step 6 -- reproducibility
// contract: fixed dt, full teardown on load/restart, seeded RNG reset).
(function () {
  const CONFIG = AB.CONFIG;
  const FIXED_DT = 1 / 120;
  const MAX_STEPS = 6; // clamp to avoid the spiral-of-death if a frame stalls
  const SETTLE_SPEED = 15; // px/s, declared arbitrary "at rest" threshold
  const SETTLE_TIME = 0.6; // s, declared arbitrary

  const canvas = document.getElementById('game-canvas');
  canvas.width = CONFIG.width;
  canvas.height = CONFIG.height;
  const ctx = canvas.getContext('2d');

  const world = new AB.Physics.World(CONFIG.gravity);

  const session = {
    stageIndex: 0,
    score: 0,
    pigsRemaining: 0,
    birdsRemaining: 0,
    activeBird: null,
    outcome: null,
    restTimer: 0,
    groundY: CONFIG.groundY,
    slingAnchor: CONFIG.slingAnchor
  };

  let birdRadius = 14;

  // Step 6: full physics teardown + RNG reseed on every load/restart, so a
  // given stage always starts from the exact same state.
  function loadStage(index) {
    world.clear();
    const data = AB.STAGES[index];
    AB.RNG.seed(data.seed);
    const info = AB.Stages.build(world, data);

    session.stageIndex = index;
    session.score = 0;
    session.pigsRemaining = info.pigCount;
    session.birdsRemaining = info.birdCount;
    session.activeBird = null;
    session.outcome = null;
    session.restTimer = 0;
    birdRadius = info.birdRadius;

    spawnNextBird();
  }

  function spawnNextBird() {
    if (session.birdsRemaining <= 0) { AB.Slingshot.setReady(false); return; }
    AB.Slingshot.setReady(true, birdRadius);
  }

  function onLaunch(vx, vy) {
    const anchor = session.slingAnchor;
    const bird = AB.Physics.createCircle({
      x: anchor.x, y: anchor.y, radius: birdRadius,
      density: 1.2, restitution: 0.4, friction: 0.5,
      tag: 'bird', breakImpulse: Infinity
    });
    bird.vx = vx;
    bird.vy = vy;
    world.add(bird);
    session.activeBird = bird;
    session.birdsRemaining -= 1;
    session.restTimer = 0;
  }

  AB.Slingshot.init(canvas, { slingAnchor: CONFIG.slingAnchor, gravity: CONFIG.gravity }, onLaunch);

  AB.StateMachine.onEnter('PLAYING', function (payload) {
    const idx = (payload && payload.stageIndex != null) ? payload.stageIndex : session.stageIndex;
    loadStage(idx);
  });
  AB.StateMachine.onEnter('PAUSED', function () { AB.Slingshot.setReady(false); });
  AB.StateMachine.onExit('PAUSED', function () {
    if (session.activeBird == null && session.birdsRemaining > 0) AB.Slingshot.setReady(true, birdRadius);
  });

  AB.UI.init({
    onStageSelect: function (i) { AB.StateMachine.send('start', { stageIndex: i }); },
    getStageIndex: function () { return session.stageIndex; },
    getScore: function () { return session.score; }
  });

  function fixedUpdate() {
    world.step(FIXED_DT);
    AB.Judge.processCollisions(world, session);
    world.cleanup();

    if (session.activeBird && session.activeBird.destroyed) {
      session.activeBird = null;
      session.restTimer = 0;
    } else if (session.activeBird) {
      const b = session.activeBird;
      const speed = Math.hypot(b.vx, b.vy);
      if (speed < SETTLE_SPEED) {
        session.restTimer += FIXED_DT;
        if (session.restTimer > SETTLE_TIME) {
          session.activeBird = null;
          session.restTimer = 0;
        }
      } else {
        session.restTimer = 0;
      }
    }

    const outcome = AB.Judge.checkOutcome(session);
    if (outcome === 'clear') {
      AB.StateMachine.send('clear');
    } else if (outcome === 'fail') {
      AB.StateMachine.send('fail');
    } else if (!session.activeBird && session.birdsRemaining > 0) {
      spawnNextBird();
    }
  }

  let lastTime = null;
  let accumulator = 0;

  function loop(now) {
    requestAnimationFrame(loop);

    if (AB.StateMachine.getState() !== 'PLAYING') {
      lastTime = null;
      render();
      return;
    }

    if (lastTime == null) lastTime = now;
    let frameTime = Math.min((now - lastTime) / 1000, 0.25);
    lastTime = now;
    accumulator += frameTime;

    let steps = 0;
    while (accumulator >= FIXED_DT && steps < MAX_STEPS) {
      fixedUpdate();
      accumulator -= FIXED_DT;
      steps++;
      if (AB.StateMachine.getState() !== 'PLAYING') break;
    }

    render();
  }

  function render() {
    AB.UI.updateHUD(session);
    AB.Renderer.render(ctx, world, session, AB.Slingshot.getAimState());
  }

  requestAnimationFrame(loop);
})();
