> plan-smith · part 3/9 · B1 · index: [plan.md](../plan.md)

### 5.4 파일별 공개 함수 (정확한 시그니처, 각 이름은 전체 파일에서 한 번만 선언)

| 파일 | 시그니처 | 하는 일(본문은 구현자가 쓴다) |
|---|---|---|
| stages.js | `const STAGES = [ /* 객체 10개, §6 */ ];` | 데이터만 |
| physics.js | `function createEngine()` → engine | `Engine.create()`; `engine.gravity.y = 1`; `Events.on(engine, "collisionStart", onCollisionStart)` 를 **여기서 1회** 등록 |
| physics.js | `function onCollisionStart(event)` | `event.pairs` 순회. 각 `pair.bodyA/bodyB` 의 상대속도 `Vector.magnitude(Vector.sub(a.velocity, b.velocity))` 로 돼지/블록 판정 → `G.removeQueue.push(...)` 만 한다(여기서 제거하지 않는다) |
| physics.js | `function buildWorld(engine, stage)` | `Composite.clear(engine.world, false)`; 지면 `Bodies.rectangle(CANVAS_W/2, GROUND_Y+40, CANVAS_W*2, 80, {isStatic:true, label:"ground"})`; 블록·돼지 생성해 `Composite.add`; `G.pigsLeft = stage.pigs.length`; `G.birdsLeft = stage.birds`; `G.removeQueue = []` |
| physics.js | `function spawnBird()` → body | `Bodies.circle(SLING_ANCHOR.x, SLING_ANCHOR.y, BIRD_R, BIRD_OPTS)`; **월드에 추가하지 않고** `G.bird` 에 넣고 `G.birdPhase = "IDLE"`, `flightTicks`/`restTicks` 0 |
| physics.js | `function clampDrag(point)` → {x,y} | 앵커→point 벡터 길이를 `MAX_PULL` 로 제한한 점 |
| physics.js | `function launchVelocity(dragPoint)` → {x,y} | `Vector.mult(Vector.sub(SLING_ANCHOR, dragPoint), LAUNCH_SCALE)` |
| physics.js | `function launchBird(dragPoint)` | `Body.setPosition(G.bird, dragPoint)`; `Body.setVelocity(G.bird, launchVelocity(dragPoint))`; `Composite.add(G.engine.world, G.bird)`; `G.birdPhase = "FLYING"`; `G.birdsLeft -= 1` |
| physics.js | `function predictTrajectory(dragPoint)` → Array<{x,y}> | 초기속도 v = launchVelocity, 틱당 중력 g = `G.engine.gravity.y * G.engine.gravity.scale * STEP_MS * STEP_MS`; n = 4, 8, …, 120 틱에서 `x = drag.x + v.x*n`, `y = drag.y + v.y*n + 0.5*g*n*n` 인 점 30개 (근사) |
| physics.js | `function stepPhysics()` | `Engine.update(G.engine, STEP_MS)` |
| render.js | `function drawFrame(ctx)` | 배경·지면 → `Composite.allBodies(G.engine.world)` 전부(원은 `body.circleRadius`, 나머지는 `body.vertices` 다각형; 색은 `label`/`plugin.material`) → 발사 전 새(`G.birdPhase` 가 IDLE/DRAG 면 `G.bird.position` 에 원) → 새총 기둥과 DRAG 시 고무줄 2줄·궤적 점 → 파티클·플래시 |
| game.js | `function main()` | **첫 문장** `canvas = document.getElementById("game-canvas"); ctx = canvas.getContext("2d");` → `typeof window.Matter === "undefined"` 면 `#boot-error` 표시 후 return; `loadProgress()`; DOM 리스너 바인딩(버튼 13개 click + `canvas` 의 `pointerdown`/`pointermove`/`pointerup`/`pointercancel`, §5.6 배선 문단); `renderStageSelect()`; `setState("MENU")` |
| game.js | `function setState(next)` | `G.state = next` 후 §7.1 표대로 화면/오버레이 `.hidden` 토글 — 화면·오버레이 6개(`#screen-*` 3, `#overlay-*` 3)의 `.hidden` 을 바꾸는 **유일한 함수** |
| game.js | `function startStage(index)` | `G.stageIndex = index; G.score = 0;` `G.engine` 이 null 이면 `createEngine()`; `buildWorld(G.engine, STAGES[index])`; `spawnBird()`; `G.particles = []; G.flashes = []; G.endTicks = 0`; `setState("PLAYING")`; `G.rafId` 가 0 이면 `requestAnimationFrame(loop)` |
| game.js | `function restartStage()` / `function nextStage()` / `function goToMenu()` / `function togglePause()` | 각각 `startStage(G.stageIndex)` / `startStage(G.stageIndex+1)` (마지막이면 `goToMenu()`) / `setState("MENU")` / PLAYING↔PAUSED (DRAG 중이면 `Body.setPosition(G.bird, SLING_ANCHOR)` 후 IDLE) |
| game.js | `function toCanvasPoint(e)` → {x,y} | `canvas.getBoundingClientRect()` 로 `(e.clientX-rect.left) * CANVAS_W/rect.width` (y 동일) |
| game.js | `function onPointerDown(e)` / `onPointerMove(e)` / `onPointerUp(e)` | §7.2 |
| game.js | `function loop(ts)` | §7.3 |
| game.js | `function flushRemovals()` | 큐를 비우며 `Composite.remove(G.engine.world, body)`, 점수·파티클·플래시·소리, 돼지면 `G.pigsLeft -= 1` |
| game.js | `function updateFlight()` | §7.4 |
| game.js | `function finishStage()` | 별 계산·보너스·`saveProgress()`·오버레이 텍스트·`#btn-next` 표시 여부·`setState("CLEARED")` |
| game.js | `function updateParticles()` / `function updateHud()` / `function renderStageSelect()` | 파티클 수명·중력 0.3; HUD 4개 텍스트; 선택 버튼 10개 재생성 |
| game.js | `function loadProgress()` / `function saveProgress()` | `try { localStorage ... } catch (e) {}` 로 감싼다 |
| game.js | `function playSound(name)` | `"launch"|"hit"|"pop"|"clear"|"fail"`; `G.progress.muted` 면 즉시 return; `G.audioCtx` 없으면 `new (window.AudioContext || window.webkitAudioContext)()` |

Matter 몸체 속성 중 쓰는 것: `position`, `velocity`, `speed`, `angle`, `vertices`, `circleRadius`, `label`, `plugin`(사용자 데이터: `{ material, hp, dead }`). 블록 옵션: `{ label:"block", density: MATERIALS[m].density, friction: 0.6, plugin: { material: m, hp: MATERIALS[m].hp } }`. 돼지 옵션: `PIG_OPTS`. 쓰지 않는 것: `World.*`, `Render`, `Runner`, `Engine.run`, `Body.setStatic`, `engine.world.gravity`, `pair.collision.depth`.

### 5.5 스테이지 객체 스키마 (예시 = 스테이지 1 원문)

```js
{ id: 1, name: "첫 만남", birds: 3,
  blocks: [ { x: 660, y: 460, w: 20, h: 80, material: "wood" } ],
  pigs:   [ { x: 720, y: 480, r: 20 } ] }
```
`x,y` 는 중심 좌표, `w,h` 는 사각형 크기, `material` 은 `MATERIALS` 의 키, `r` 은 돼지 반지름, `birds` 는 정수. 선택 필드 `angle`(라디안)은 이번 10개에서 쓰지 않는다.

### 5.6 DOM 골격 (index.html `<body>`, id 와 라벨 문구 그대로)

```html
<div id="boot-error" class="hidden">물리 엔진(Matter.js)을 불러오지 못했습니다. 인터넷 연결을 확인하세요.</div>
<section id="screen-menu">
  <h1>앵그리버드</h1>
  <button id="btn-start">게임 시작</button>
  <button id="btn-select">스테이지 선택</button>
  <button id="btn-mute">소리 끄기</button>
</section>
<section id="screen-select" class="hidden">
  <h2>스테이지 선택</h2>
  <div id="select-grid"></div>
  <button id="btn-select-back">메인으로</button>
</section>
<section id="screen-game" class="hidden">
  <canvas id="game-canvas" width="960" height="540"></canvas>
  <div id="hud"><span id="hud-stage"></span><span id="hud-score"></span><span id="hud-birds"></span><span id="hud-pigs"></span></div>
  <button id="btn-pause">일시정지</button>
  <div id="overlay-pause" class="overlay hidden">
    <h2>일시정지</h2>
    <button id="btn-resume">계속하기</button>
    <button id="btn-retry-pause">다시하기</button>
    <button id="btn-menu-pause">메인으로</button>
  </div>
  <div id="overlay-cleared" class="overlay hidden">
    <h2 id="cleared-title"></h2>
    <p id="cleared-stars"></p><p id="cleared-score"></p>
    <button id="btn-next">다음 스테이지</button>
    <button id="btn-retry-cleared">다시하기</button>
    <button id="btn-menu-cleared">메인으로</button>
  </div>
  <div id="overlay-failed" class="overlay hidden">
    <h2>실패… 새를 모두 썼습니다</h2>
    <button id="btn-retry-failed">다시하기</button>
    <button id="btn-menu-failed">메인으로</button>
  </div>
</section>
```

id 는 모두 30개, 그중 버튼 id 는 13개(`btn-start`, `btn-select`, `btn-mute`, `btn-select-back`, `btn-pause`, `btn-resume`, `btn-retry-pause`, `btn-menu-pause`, `btn-next`, `btn-retry-cleared`, `btn-menu-cleared`, `btn-retry-failed`, `btn-menu-failed`).

`style.css` 필수 규칙: `.hidden { display: none !important; }` / `#screen-game { position: relative; width: 960px; max-width: 100%; margin: 0 auto; }` / `#game-canvas { display: block; width: 100%; height: auto; touch-action: none; background: #cfe9ff; }` / `#btn-pause { position: absolute; top: 12px; right: 12px; z-index: 3; }` / `#hud { position: absolute; top: 12px; left: 12px; pointer-events: none; z-index: 2; }` (span 사이 여백) / `.overlay { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; background: rgba(0,0,0,0.55); color: #fff; }` / `#boot-error { color: #c00; font-weight: bold; padding: 12px; }`.

버튼 → 함수 배선(`main()` 에서 전부 `addEventListener("click", …)`): `#btn-start`→`startStage(0)`, `#btn-select`→`setState("SELECT")`, `#btn-mute`→음소거 토글+라벨 갱신+`saveProgress()`, `#btn-select-back`→`goToMenu()`, `#select-grid` 의 버튼 k→`startStage(k-1)`, `#btn-pause`→`togglePause()`, `#btn-resume`→`togglePause()`, `#btn-retry-pause`/`#btn-retry-cleared`/`#btn-retry-failed`→`restartStage()`, `#btn-menu-pause`/`#btn-menu-cleared`/`#btn-menu-failed`→`goToMenu()`, `#btn-next`→`nextStage()`. 캔버스: `pointerdown`/`pointermove`/`pointerup`/`pointercancel`(=up) → 위 세 핸들러.

---

> plan-smith · next: [stages_C0.md](stages_C0.md)
