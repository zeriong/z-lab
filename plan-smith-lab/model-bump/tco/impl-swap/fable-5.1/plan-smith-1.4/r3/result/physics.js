// physics.js — Matter 별칭, 재질, 월드 생성/파괴, 충돌.
// Matter 별칭은 여기서 딱 한 번만 선언한다. render.js / game.js 는 이 전역을 그대로 쓴다.
// (Matter 전역이 없으면 아래 첫 줄에서 ReferenceError 가 나 이 파일 전체가 평가되지 않는다.
//  그 경우는 game.js 의 init() 가드와 loop() 의 drawLoadError 가 화면에 원인을 드러낸다.)

const { Engine, Composite, Bodies, Body, Events } = Matter;

const MATERIAL = {
  wood:  { hp: 26, density: 0.0018, color: '#c8873c' },
  ice:   { hp: 13, density: 0.0011, color: '#9ad8e8' },
  stone: { hp: 52, density: 0.0032, color: '#9aa0a6' }
};
const PIG_HP = 15;

// 엔진 1회 생성 + 중력 설정. 게임당 한 번만 호출한다.
function createEngine() {
  const engine = Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;          // G_STEP = 1 * 0.001 * STEP_MS^2
  engine.enableSleeping = false;         // 정지 판정은 worldSettled() 가 속도로 직접 한다
  return engine;
}

// 두 바디의 상대 속도 크기 (px/step)
function impactSpeed(a, b) {
  return Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
}

// hp 차감. 0 이하가 되면 destroyed 표시만 하고 true 를 돌려준다.
// 실제 제거는 game.js 의 sweepDestroyed() 가 프레임 끝에서 일괄 처리한다.
function damageBody(body, impact) {
  if (body.isStatic || body.hp === undefined || body.destroyed) return false;
  body.hp -= impact;
  if (body.hp > 0) return false;
  body.destroyed = true;              // 표시만 한다. 실제 제거는 sweepDestroyed()에서
  return true;
}

// collisionStart 1회 바인딩. 두 번 부르면 데미지가 두 배가 된다.
// 이 콜백 안에서는 어떤 바디도 제거하지 않는다 (같은 프레임의 남은 pair 가 사라진 바디를 참조하게 된다).
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

// 월드를 비우고 지면·블록·돼지를 세운다. { blocks, pigs } 를 돌려준다.
function buildStage(engine, stage) {
  Composite.clear(engine.world, false);

  const ground = Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120, {
    isStatic: true, friction: 0.9, label: 'ground'
  });
  Composite.add(engine.world, ground);

  const blocks = stage.blocks.map(function (b) {
    const m = MATERIAL[b.mat] || MATERIAL.wood;
    const body = Bodies.rectangle(b.x, b.y, b.w, b.h, {
      angle: b.angle || 0,
      density: m.density,
      friction: 0.6,
      restitution: 0.1,
      label: 'block'
    });
    body.hp = m.hp;
    body.hpMax = m.hp;
    body.color = m.color;
    body.mat = b.mat;
    body.destroyed = false;
    return body;
  });

  const pigs = stage.pigs.map(function (p) {
    const body = Bodies.circle(p.x, p.y, p.r, {
      density: 0.002,
      friction: 0.5,
      restitution: 0.2,
      label: 'pig'
    });
    body.hp = PIG_HP;
    body.hpMax = PIG_HP;
    body.color = '#6cc24a';
    body.destroyed = false;
    return body;
  });

  Composite.add(engine.world, blocks);
  Composite.add(engine.world, pigs);
  return { blocks: blocks, pigs: pigs };
}

// isStatic:true 인 새를 슬링 위치에 놓는다. 새에는 hp 를 주지 않는다 (damageBody 가 새를 부수지 않도록).
function spawnBirdAtSling(engine) {
  const bird = Bodies.circle(SLING.x, SLING.y, 18, {
    isStatic: true, density: 0.004, restitution: 0.35, friction: 0.6, label: 'bird'
  });
  bird.color = '#d9342b';
  Composite.add(engine.world, bird);
  return bird;
}

// Composite.remove 래퍼. collisionStart 콜백 바깥에서만 호출된다.
function removeBody(engine, body) {
  Composite.remove(engine.world, body);
}
