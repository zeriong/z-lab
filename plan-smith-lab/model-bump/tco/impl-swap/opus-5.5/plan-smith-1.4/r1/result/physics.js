// physics.js — Matter 별칭, 재질, 월드 생성/파괴, 충돌.
// Matter 별칭은 프로젝트 전체에서 여기 한 번만 선언한다. render.js / game.js 는 이 전역을 그대로 쓴다.
const { Engine, Composite, Bodies, Body, Events } = Matter;

// 재질 — 데미지 조정 지점은 이 블록의 hp 한 곳이다.
// (최대 발사 속도 21.6 px/step 기준 "얼음 1회, 나무 2회, 돌 3회"가 되도록 역산한 초기값)
const MATERIAL = {
  wood:  { hp: 26, density: 0.0018, color: '#c8873c' },
  ice:   { hp: 13, density: 0.0011, color: '#9ad8e8' },
  stone: { hp: 52, density: 0.0032, color: '#9aa0a6' }
};
const PIG_HP = 15;

// 엔진 1회 생성 + 중력 설정. 게임당 한 번만 호출한다(init).
function createEngine() {
  const engine = Engine.create({ positionIterations: 8, velocityIterations: 6 });
  engine.gravity.x = 0;
  engine.gravity.y = 1;          // G_STEP = 1 * 0.001 * STEP_MS^2 과 짝을 이룬다
  engine.gravity.scale = 0.001;
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
// 이 콜백 안에서는 바디를 제거하지 않는다 — 같은 프레임의 남은 충돌쌍이 사라진 바디를 참조한다.
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

// 월드를 비우고 지면·블록·돼지를 세운다.
function buildStage(engine, stage) {
  Composite.clear(engine.world, false);   // 이전 스테이지의 잔해·새까지 전부 제거

  const ground = Bodies.rectangle(W / 2, GROUND_Y + 60, W + 400, 120, { isStatic: true, friction: 0.9 });

  const blocks = [];
  const pigs = [];
  const srcBlocks = (stage && stage.blocks) || [];
  const srcPigs = (stage && stage.pigs) || [];

  for (let i = 0; i < srcBlocks.length; i++) {
    const b = srcBlocks[i];
    const m = MATERIAL[b.mat] || MATERIAL.wood;
    const body = Bodies.rectangle(b.x, b.y, b.w, b.h, {
      angle: b.angle || 0,
      density: m.density,
      friction: 0.8,
      restitution: 0.05,
      label: 'block'
    });
    body.hp = m.hp;
    body.maxHp = m.hp;
    body.color = m.color;
    body.mat = b.mat;
    blocks.push(body);
  }

  for (let i = 0; i < srcPigs.length; i++) {
    const p = srcPigs[i];
    const body = Bodies.circle(p.x, p.y, p.r, {
      density: 0.0012,
      friction: 0.6,
      restitution: 0.25,
      label: 'pig'
    });
    body.hp = PIG_HP;
    body.maxHp = PIG_HP;
    body.color = '#72c04a';
    pigs.push(body);
  }

  Composite.add(engine.world, [ground].concat(blocks, pigs));
  return { blocks: blocks, pigs: pigs };
}

// isStatic:true 인 새를 슬링 위치에 놓는다. 새에는 hp를 주지 않는다(그래서 damageBody가 새를 부수지 않는다).
// frictionAir: 0 — Matter 기본 공기저항(0.01)이 남아 있으면 매 스텝 속도가 1%씩 줄어
// trajectoryPoints()의 무저항 미리보기와 실제 비행이 눈에 띄게 갈라진다.
// (지면에 닿은 뒤에는 updateShotPhase()가 구름 감쇠를 켠다)
function spawnBirdAtSling(engine) {
  const bird = Bodies.circle(SLING.x, SLING.y, 18, {
    isStatic: true, density: 0.004, restitution: 0.35, friction: 0.6, frictionAir: 0, label: 'bird'
  });
  bird.color = '#d8302f';
  Composite.add(engine.world, bird);
  return bird;
}

function removeBody(engine, body) {
  Composite.remove(engine.world, body);
}
