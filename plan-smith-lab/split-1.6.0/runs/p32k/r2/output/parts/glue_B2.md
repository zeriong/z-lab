> plan-smith · part 5/11 · B2 · index: [plan.md](../plan.md)

### 5.5 포인터 → 캔버스 좌표 (그대로 복사)

```js
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width),
           y: (e.clientY - r.top) * (H / r.height) };
}
```

`pointermove`/`pointerup`은 `window`에 건다(캔버스 밖에서 손을 떼도 발사돼야 한다). `pointerdown`만 캔버스에 건다.

### 5.6 당김과 궤적 — 발사와 미리보기의 단일 출처 (그대로 복사)

```js
function pullPoint(p) {
  let dx = p.x - SLING.x, dy = p.y - SLING.y;
  const d = Math.hypot(dx, dy);
  if (d > SLING.maxPull) { dx = dx * SLING.maxPull / d; dy = dy * SLING.maxPull / d; }
  return { x: SLING.x + dx, y: SLING.y + dy };
}

function pullVelocity(p) {
  const q = pullPoint(p);
  return { x: (SLING.x - q.x) * LAUNCH_K, y: (SLING.y - q.y) * LAUNCH_K };
}

function trajectoryPoints(p) {
  const v = pullVelocity(p);
  const pts = [];
  let x = SLING.x, y = SLING.y, vx = v.x, vy = v.y;
  for (let i = 0; i < 112; i++) {
    vy += G_STEP; x += vx; y += vy;
    if (i % 4 === 3) pts.push({ x: x, y: y });
    if (y > GROUND_Y) break;
  }
  return pts;
}
```

### 5.7 발사 순서 — 이 세 줄의 순서가 뒤집히면 새가 날지 않는다 (그대로 복사)

```js
function launchBird() {
  const q = pullPoint(GAME.dragPoint);
  const v = pullVelocity(GAME.dragPoint);
  Body.setStatic(GAME.bird, false);   // (1) 정적 바디는 질량이 무한이라 속도 설정이 무시된다
  Body.setPosition(GAME.bird, q);     // (2) 당긴 지점에서 출발
  Body.setVelocity(GAME.bird, v);     // (3)
  GAME.phase = 'FLYING';
  GAME.flightFrames = 0;
  GAME.settleFrames = 0;
  playSfx('launch');
}
```

### 5.8 충돌 — 이벤트 안에서 제거하지 않는다 (그대로 복사)

```js
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
```

`sweepDestroyed()`는 `GAME.blocks`, `GAME.pigs`를 **역순으로** 순회하며 `destroyed`인 것을 `removeBody` → `splice` → 점수 가산 → `spawnDebris` 순으로 처리하고, 마지막에 `GAME.pigsLeft = GAME.pigs.length`로 다시 계산한다(감산 누적이 아니라 재계산이다).

> plan-smith · next: [glue_B3.md](glue_B3.md)
