// physics.js — Matter 별칭, 재질, 월드 생성/파괴, 충돌.
// Matter 별칭은 프로젝트 전체에서 이 줄 하나뿐이다. render.js / game.js는 이 전역을 그대로 쓰고 다시 선언하지 않는다.
const { Engine, Composite, Bodies, Body, Events } = Matter;

// 재질 값. hp(13/26/52)와 PIG_HP는 최대 발사 속도 21.6px/step에서
// "얼음 1회, 나무 2회, 돌 3회, 돼지 1회"가 되도록 역산한 초기값이다(실행 검증 전 — 조정 지점은 여기 한 곳).
const MATERIAL = {
  wood:  { hp: 26, density: 0.0018, color: '#c8873c' },
  ice:   { hp: 13, density: 0.0011, color: '#9ad8e8' },
  stone: { hp: 52, density: 0.0032, color: '#9aa0a6' }
};
const PIG_HP = 15;

// 엔진 1회 생성. 게임당 한 번만 호출한다(init). 스테이지 전환은 buildStage의 Composite.clear로 처리한다.
function createEngine() {
  const engine = Engine.create();
  engine.gravity.x = 0;
  engine.gravity.y = 1;              // G_STEP = gravity.y(1) * gravity.scale(0.001) * STEP_MS^2
  engine.gravity.scale = 0.001;
  engine.positionIterations = 10;    // 적재 안정성 보강 (기본 6)
  engine.velocityIterations = 8;     // (기본 4)
  return engine;
}

function impactSpeed(a, b) {
  return Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
}

function damageBody(body, impact) {
  if (body.isStatic || body.hp === undefined || body.destroyed) return false;
  body.hp -= impact;
  if (body.hp > 0) return false;
  body.destroyed = true;              // 표시만 한다. 실제 제거는 sweepDestroyed()에서
  return true;
}

// collisionStart 1회 바인딩. 두 번 부르면 데미지가 두 배가 되므로 init에서만 호출한다.
// 이 콜백 안에서는 바디를 제거하지 않는다(같은 프레임의 남은 충돌쌍이 사라진 바디를 참조하게 된다).
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

// 월드를 비우고 지면·블록·돼지를 세운다. 반환: { blocks: Body[], pigs: Body[] }
function buildStage(engine, stage) {
  Composite.clear(engine.world, false);
  // 이전 스테이지 바디를 참조하는 충돌쌍 캐시도 함께 비운다(없는 빌드에서도 죽지 않게 존재 확인).
  if (typeof Engine.clear === 'function') Engine.clear(engine);

  const ground = Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120, { isStatic: true, friction: 0.9 });
  ground.label = 'ground';
  Composite.add(engine.world, ground);

  const blocks = [];
  const pigs = [];
  const blockDefs = (stage && stage.blocks) || [];
  const pigDefs = (stage && stage.pigs) || [];

  for (let i = 0; i < blockDefs.length; i++) {
    const d = blockDefs[i];
    const m = MATERIAL[d.mat] || MATERIAL.wood;
    const b = Bodies.rectangle(d.x, d.y, d.w, d.h, {
      angle: d.angle || 0,
      density: m.density,
      friction: 0.8,
      restitution: 0.05,
      label: 'block'
    });
    b.mat = d.mat;
    b.hp = m.hp;
    b.maxHp = m.hp;
    b.color = m.color;
    b.destroyed = false;
    blocks.push(b);
  }

  for (let i = 0; i < pigDefs.length; i++) {
    const d = pigDefs[i];
    const p = Bodies.circle(d.x, d.y, d.r, {
      density: 0.0015,
      friction: 0.6,
      restitution: 0.2,
      label: 'pig'
    });
    p.hp = PIG_HP;
    p.maxHp = PIG_HP;
    p.color = '#7ccf4a';
    p.destroyed = false;
    pigs.push(p);
  }

  Composite.add(engine.world, blocks);
  Composite.add(engine.world, pigs);
  return { blocks: blocks, pigs: pigs };
}

// isStatic:true 인 새를 슬링 위치에 놓는다. 새에는 hp를 주지 않는다(damageBody가 새를 부수지 않는다).
// frictionAir: 0 — 궤적 미리보기(trajectoryPoints)에는 공기저항 항이 없으므로 실제 비행과 일치시키기 위해 끈다.
function spawnBirdAtSling(engine) {
  const bird = Bodies.circle(SLING.x, SLING.y, 18, {
    isStatic: true, density: 0.004, restitution: 0.35, friction: 0.6, frictionAir: 0, label: 'bird'
  });
  bird.color = '#d8322a';
  Composite.add(engine.world, bird);
  return bird;
}

// Composite.remove 래퍼. collisionStart 콜백 밖(sweepDestroyed / resolveShot)에서만 호출된다.
function removeBody(engine, body) {
  Composite.remove(engine.world, body);
}
