// physics.js — Matter 별칭, 재질, 월드 생성/파괴, 충돌
// Matter 별칭은 프로젝트에서 여기 딱 한 번만 선언한다. render.js / game.js는 이 전역을 그대로 쓴다.

const { Engine, Composite, Bodies, Body, Events } = Matter;

const MATERIAL = {
  wood:  { hp: 26, density: 0.0018, color: '#c8873c' },
  ice:   { hp: 13, density: 0.0011, color: '#9ad8e8' },
  stone: { hp: 52, density: 0.0032, color: '#9aa0a6' }
};
const PIG_HP = 15;

// 엔진 1회 생성, 중력 설정. 게임당 한 번만 호출한다.
function createEngine() {
  const engine = Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;
  return engine;
}

// 두 바디의 상대 속도 크기
function impactSpeed(a, b) {
  return Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
}

// hp 차감. 0 이하면 body.destroyed = true 후 true.
// 실제 제거는 game.js의 sweepDestroyed()에서 한다 (충돌 이벤트 안에서 제거하지 않는다).
function damageBody(body, impact) {
  if (body.isStatic || body.hp === undefined || body.destroyed) return false;
  body.hp -= impact;
  if (body.hp > 0) return false;
  body.destroyed = true;              // 표시만 한다. 실제 제거는 sweepDestroyed()에서
  return true;
}

// collisionStart 1회 바인딩. 두 번 부르면 데미지가 두 배가 된다.
function bindCollisions(engine) {
  Events.on(engine, 'collisionStart', function (ev) {
    for (let i = 0; i < ev.pairs.length; i++) {
      const a = ev.pairs[i].bodyA, b = ev.pairs[i].bodyB;
      const s = impactSpeed(a, b);
      if (s < IMPACT_MIN) continue;
      const da = damageBody(a, s), db = damageBody(b, s);
      if (da || db) playSfx('hit');
    }
  });
}

// 월드를 비우고 지면·블록·돼지를 세운다. -> { blocks, pigs }
function buildStage(engine, stage) {
  Composite.clear(engine.world, false);

  const ground = Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120, {
    isStatic: true, friction: 0.9, label: 'ground'
  });
  ground.color = '#5a8f3c';
  Composite.add(engine.world, ground);

  const blocks = [];
  for (let i = 0; i < stage.blocks.length; i++) {
    const b = stage.blocks[i];
    const m = MATERIAL[b.mat] || MATERIAL.wood;
    const body = Bodies.rectangle(b.x, b.y, b.w, b.h, {
      angle: b.angle || 0,
      density: m.density,
      friction: 0.6,
      restitution: 0.1,
      label: 'block'
    });
    body.hp = m.hp;
    body.color = m.color;
    body.mat = b.mat;
    body.destroyed = false;
    blocks.push(body);
  }
  Composite.add(engine.world, blocks);

  const pigs = [];
  for (let i = 0; i < stage.pigs.length; i++) {
    const p = stage.pigs[i];
    const body = Bodies.circle(p.x, p.y, p.r, {
      density: 0.0015,
      friction: 0.5,
      restitution: 0.2,
      label: 'pig'
    });
    body.hp = PIG_HP;
    body.color = '#6ccf5a';
    body.destroyed = false;
    pigs.push(body);
  }
  Composite.add(engine.world, pigs);

  return { blocks: blocks, pigs: pigs };
}

// isStatic:true인 새를 슬링 위치에 놓는다. 새에는 hp를 주지 않는다 (damageBody가 새를 부수지 않게).
function spawnBirdAtSling(engine) {
  const bird = Bodies.circle(SLING.x, SLING.y, 18, {
    isStatic: true, density: 0.004, restitution: 0.35, friction: 0.6, label: 'bird'
  });
  bird.color = '#d9382a';
  Composite.add(engine.world, bird);
  return bird;
}

// Composite.remove 래퍼
function removeBody(engine, body) {
  Composite.remove(engine.world, body);
}
