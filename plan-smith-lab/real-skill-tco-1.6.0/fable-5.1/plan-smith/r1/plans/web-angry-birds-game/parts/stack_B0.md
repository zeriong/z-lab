> plan-smith · part 2/9 · B0 · index: [plan.md](../plan.md)

## 4. 전달 스택과 산 이유

- **HTML + CSS + 클래식 `<script>` JS, 빌드 없음** — 구현자와 사용자 어느 쪽도 설치·빌드를 하지 않는다. 강제하는 것: 파일을 그대로 열면 동작.
- **Matter.js 0.20.0 (CDN 한 줄, 아래 그대로 복사)** — 회전 강체 적층·붕괴·마찰·수면·충돌 이벤트를 직접 짜지 않기 위해 산다. 강제하는 것: 물리 코드는 §5.4 에 열거한 API 이름만 쓴다.
  ```html
  <script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>
  ```
- **Canvas 2D 직접 렌더(월드만) + DOM(메뉴·오버레이·HUD·일시정지 버튼)** — 내장 렌더러는 고무줄·궤적·HUD 를 못 그리고, 캔버스 안 버튼 히트테스트는 무테스트 구현에서 좌표 버그의 온상이라 DOM 에 맡긴다.
- **Pointer Events** — 마우스와 터치를 한 경로로.
- **Web Audio 합성** — 오디오 파일을 만들 수 없다.
- **`localStorage` 키 하나** — 영속에 서버가 없다.

### 4.1 파일과 스크립트 순서 (index.html 의 `<body>` 끝, 이 순서 그대로)

```html
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>
<script src="stages.js"></script>
<script src="physics.js"></script>
<script src="render.js"></script>
<script src="game.js"></script>
```

파일 5개 + CSS 1개, 모두 한 폴더: `index.html`, `style.css`, `stages.js`, `physics.js`, `render.js`, `game.js`. 규칙: **어떤 JS 파일도 최상위에서 실행문을 두지 않는다**(선언만 — `const`/`let`/`function` 선언은 실행문이 아니며, §5.3 의 `let canvas = null, ctx = null;` 도 이 선언에 해당한다). 유일한 진입은 `game.js` 끝의 `window.addEventListener("load", main);`.

---

## 5. 이음새 고정 블록 (그대로 복사한다)

### 5.1 Matter 별칭 줄 — `physics.js` 의 첫 두 줄, 다른 파일에는 쓰지 않는다

```js
const M = window.Matter || {};
const { Engine, Bodies, Body, Composite, Events, Vector } = M;
```
(`Matter` 가 없어도 이 줄은 예외를 던지지 않는다. 없음의 처리는 `main()` 이 한다.)

### 5.2 상수 — `physics.js` 의 별칭 줄 바로 아래 (숫자 태그는 §9 표)

```js
const CANVAS_W = 960, CANVAS_H = 540, GROUND_Y = 500, OUT_MARGIN = 50;
const SLING_ANCHOR = { x: 150, y: 380 };
const BIRD_R = 18, GRAB_RADIUS = 40, MAX_PULL = 90, MIN_PULL = 10;
const LAUNCH_SCALE = 0.18;
const PIG_KILL_SPEED = 6, BLOCK_DAMAGE_MIN = 3;
const REST_SPEED = 0.15, REST_TICKS = 45, MAX_FLIGHT_TICKS = 480, CLEAR_DELAY_TICKS = 60;
const STEP_MS = 1000 / 60, MAX_FRAME_MS = 100;
const SCORE_PIG = 5000, SCORE_BIRD_BONUS = 10000;
const BIRD_OPTS = { label: "bird", density: 0.004, restitution: 0.3, friction: 0.5 };
const PIG_OPTS  = { label: "pig",  density: 0.001, restitution: 0.2, friction: 0.5 };
const MATERIALS = {
  wood:  { hp: 3, density: 0.002, color: "#b5793c", score: 500 },
  stone: { hp: 6, density: 0.004, color: "#8a8f98", score: 800 },
  ice:   { hp: 1, density: 0.001, color: "#a8dcff", score: 300 }
};
const STATE = { MENU: "MENU", SELECT: "SELECT", PLAYING: "PLAYING", PAUSED: "PAUSED", CLEARED: "CLEARED", FAILED: "FAILED" };
const PROGRESS_KEY = "ab-progress-v1";
```

### 5.3 초기 상태 선언 — `game.js` 의 첫 선언 (다른 파일은 함수 본문 안에서만 `G` 를 참조)

```js
const G = {
  state: "MENU",        // STATE 값 중 하나. setState() 만 바꾼다
  stageIndex: 0,        // STAGES 인덱스 (0..9)
  engine: null,         // createEngine() 결과, 최초 startStage 에서 1회 생성
  bird: null,           // 현재 새 body. 발사 전에는 월드 밖, 발사 순간 Composite.add
  birdPhase: "NONE",    // "NONE" | "IDLE" | "DRAG" | "FLYING"
  birdsLeft: 0,         // 아직 쏘지 않은 새 수 (발사 순간 감소)
  pigsLeft: 0,          // 월드에 남은 돼지 수 (flushRemovals 만 감소)
  score: 0,
  dragPoint: null,      // 드래그 중 새 위치 {x,y}
  flightTicks: 0, restTicks: 0, endTicks: 0,
  removeQueue: [],      // { body, kind: "pig"|"block", material } — 충돌 핸들러가 push, flushRemovals 가 비움
  particles: [],        // { x, y, vx, vy, life, color, r }
  flashes: [],          // { x, y, life }
  acc: 0, lastTime: 0,  // 고정 스텝 누산기
  rafId: 0,
  audioCtx: null,       // 첫 사용자 입력 때 생성
  progress: { unlocked: 1, stars: {}, muted: false }   // localStorage 미러
};
```

`G` 바로 아래, 같은 파일 최상위에 다음 한 줄을 둔다(선언이므로 §4.1 규칙에 어긋나지 않는다; `toCanvasPoint`·`onPointerDown`·`loop` 가 이 두 이름을 읽는다):

```js
let canvas = null, ctx = null;  // main() 의 첫 문장에서 canvas = document.getElementById("game-canvas"); ctx = canvas.getContext("2d"); 로 대입
```

> plan-smith · next: [api_B1.md](api_B1.md)
