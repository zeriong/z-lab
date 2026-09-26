const { Engine, Composite, Bodies, Body, Events } = Matter;
// physics.js — Matter 별칭(위 한 줄이 프로젝트 전체의 유일한 선언), 재질, 월드 생성/파괴, 충돌.
// Matter가 로드되지 않았다면 위 줄에서 이 파일만 멈춘다. game.js init()의 typeof 가드가 그 경우를 화면에 알린다.
// render.js / game.js는 Engine·Composite·Bodies·Body·Events를 다시 선언하지 않고 그대로 쓴다.

const MATERIAL = {
  wood:  { hp: 26, density: 0.0018, color: '#c8873c' },
  ice:   { hp: 13, density: 0.0011, color: '#9ad8e8' },
  stone: { hp: 52, density: 0.0032, color: '#9aa0a6' }
};
const PIG_HP = 15;

// 엔진 1회 생성 + 중력 설정. 게임당 한 번만 호출한다(init).
function createEngine() {
  const engine = Engine.create({ positionIterations: 10, velocityIterations: 8 });
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;   // G_STEP = 1 * 0.001 * STEP_MS^2 와 짝을 이룬다
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

// collisionStart 1회 바인딩. 두 번 부르면 데미지가 두 배가 된다(init에서 1회).
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

// 월드를 비우고 지면·블록·돼지를 세운다. 새는 넣지 않는다(spawnBirdAtSling).
function buildStage(engine, stage) {
  Composite.clear(engine.world, false);

  const ground = Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120,
    { isStatic: true, friction: 0.9, label: 'ground' });
  Composite.add(engine.world, ground);

  const blocks = [];
  const pigs = [];
  const blockDefs = (stage && stage.blocks) || [];
  const pigDefs = (stage && stage.pigs) || [];

  for (let i = 0; i < blockDefs.length; i++) {
    const d = blockDefs[i];
    const m = MATERIAL[d.mat] || MATERIAL.wood;
    const body = Bodies.rectangle(d.x, d.y, d.w, d.h, {
      angle: d.angle || 0,
      density: m.density,
      friction: 0.7,
      restitution: 0.05,
      label: 'block'
    });
    body.hp = m.hp;
    body.maxHp = m.hp;
    body.mat = MATERIAL[d.mat] ? d.mat : 'wood';
    body.color = m.color;
    blocks.push(body);
  }

  for (let i = 0; i < pigDefs.length; i++) {
    const p = pigDefs[i];
    const body = Bodies.circle(p.x, p.y, p.r, {
      density: 0.0016,
      friction: 0.6,
      restitution: 0.2,
      label: 'pig'
    });
    body.hp = PIG_HP;
    body.maxHp = PIG_HP;
    body.color = '#7ccc46';
    pigs.push(body);
  }

  Composite.add(engine.world, blocks);
  Composite.add(engine.world, pigs);
  return { blocks: blocks, pigs: pigs };
}

// isStatic:true 인 새를 슬링 위치에 놓는다. 새에는 hp를 주지 않는다(damageBody가 새를 부수지 않음).
// frictionAir: 0 — Matter 기본값(0.01)이면 매 스텝 속도가 1%씩 줄어, 공기저항 없는 trajectoryPoints
// 미리보기와 실제 비행이 갈라지고 §12의 사거리 계산(≈1,680px)도 성립하지 않는다.
// 지면에 닿은 뒤 구르기 감쇠는 game.js updateShotPhase()가 켠다.
function spawnBirdAtSling(engine) {
  const bird = Bodies.circle(SLING.x, SLING.y, 18, {
    isStatic: true, density: 0.004, restitution: 0.35, friction: 0.6, frictionAir: 0, label: 'bird'
  });
  Composite.add(engine.world, bird);
  return bird;
}

// Composite.remove 래퍼. collisionStart 콜백 안에서는 호출하지 않는다.
function removeBody(engine, body) {
  Composite.remove(engine.world, body);
}
