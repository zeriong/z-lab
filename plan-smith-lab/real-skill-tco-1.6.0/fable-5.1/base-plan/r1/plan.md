# 웹 브라우저 앵그리버드 — 구현 계획서

> 대상 구현자: claude-fable-5-1. 구현자는 **이 문서만** 읽고, **파일 읽기/쓰기 도구만**으로 작업한다(설치·빌드·실행·테스트 불가).
> 그래서 이 문서는 "한 번에 맞게 쓰기"를 목표로 모든 결정·상수·좌표·공식·API 이름을 확정해 두었다.
> `[검증됨]` 표시는 계획 단계에서 Matter.js 0.20.0 실제 소스 확인 또는 수치 시뮬레이션으로 확인한 사실이다. 이 값들은 임의로 바꾸지 말 것.

---

## 0. 한눈에 보기

| 요구사항 | 결정 |
|---|---|
| 스테이지 10단계 | `js/levels.js`의 `AB.LEVELS` 배열 10개. 전체 데이터는 §9에 수록(겹침 없음·전부 지지됨·모든 돼지가 사거리 안에 있음을 검증). 1번만 해금, 클리어 시 다음 해금, 진행은 localStorage 저장 |
| 앵그리버드식 게임 시스템 | 물리: **Matter.js 0.20.0(CDN)**. 렌더: **Canvas 2D 절차적 드로잉**(에셋 없음). 새총 드래그→놓기 발사, 궤적 예측 점선, 이전 샷 궤적 잔상, 재질(나무/얼음/돌)별 HP·파괴, 돼지 HP·제거, 새 3종(레드/척=가속/봄=폭발), 점수·별 3개 |
| 일시정지 버튼(인게임 우측) → 다시하기/메인으로 | HUD 우상단 DOM 버튼 `#btn-pause`. 클릭 시 `#overlay-pause`에 **계속하기 / 다시하기 / 메인으로** 3버튼(요구된 2개 + 재개 버튼). Esc 키로도 토글 |

핵심 질문에 대한 답:

- **물리 엔진**: 라이브러리(Matter.js). 이유 — 회전·적층·마찰·수면(sleeping)이 포함된 강체 물리를 실행 검증 없이 직접 짜는 것은 실패 확률이 훨씬 높다. Matter.js는 API가 안정적이고 이 문서에 필요한 호출을 전부 명시했다. 설치가 불가하므로 CDN `<script>`로 로드하고 2중 fallback을 둔다.
- **렌더링**: Canvas 2D(게임 월드) + DOM(메뉴/HUD/오버레이). 버튼·텍스트는 DOM이 훨씬 안전하고, 월드는 Canvas가 자연스럽다.
- **스테이지 데이터**: 순수 데이터 배열(중심 좌표 기반). 로딩은 엔진을 새로 만들어 body를 채우는 방식. 전환은 상태 머신이 담당.
- **슬링샷 UX**: Pointer Events로 앵커 반경 70px 안을 잡아 드래그, 최대 90px 당김, 속도 = 당김벡터 × 0.2(최대 18 px/step). 드래그 중 예측 점선(엔진과 동일한 이산 공식으로 계산하므로 실제 궤적과 일치).
- **충돌·파괴·점수·클리어**: §11에 공식으로 명시.
- **상태 머신**: MENU → SELECT → PLAYING(AIMING/FLYING/ENDING) ↔ PAUSED → CLEARED/FAILED. §7.
- **완료 판정**: §15 체크리스트(기능 기준 + 코드를 읽어서 확인 가능한 정적 기준).

---

## 1. 제약에서 나온 설계 원칙 (반드시 지킬 것)

1. **`file://`로 더블클릭해 열어도 동작해야 한다.** → ES 모듈(`import`/`export`/`type="module"`) **금지**. 클래식 `<script src>`를 순서대로 로드하고, 전역 네임스페이스 `window.AB` 하나에 모듈을 붙인다.
2. **외부 의존성은 Matter.js 하나.** CDN 1차 실패 시 2차 CDN으로 fallback. 둘 다 실패하면 화면에 안내 문구를 띄운다(콘솔 에러로 끝나지 않게).
3. **이미지·사운드 에셋 없음.** 모두 Canvas 절차적 드로잉. 사운드는 범위 외.
4. **모든 튠 상수는 `js/config.js` 한 곳.** 다른 파일에 매직 넘버를 쓰지 않는다.
5. **인터페이스 고정.** 이 문서의 파일명·전역 이름·함수 시그니처·DOM id를 그대로 쓴다. 파일 간 이름 불일치는 실행 없이 잡기 어려운 최악의 버그다.
6. **방어적으로 쓴다.** localStorage는 try/catch, `body.gameEntity`는 null 체크, 배열 순회 중 제거는 복사본으로.
7. **Matter body 제거는 물리 스텝 종료 후에만.** 충돌 콜백 안에서 `Composite.remove`를 호출하지 않는다(제거 예약 → 스텝 후 처리).

---

## 2. 기술 결정 상세

### 2.1 Matter.js 0.20.0 — 검증된 사실과 사용 규칙

**로드** `[검증됨: 3개 URL 모두 HTTP 200]`
- 1차: `https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js`
- 2차: `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js`
- (예비) `https://unpkg.com/matter-js@0.20.0/build/matter.min.js`
- fallback 방식: 1차 script 태그 다음에 인라인 script로 `window.Matter`가 없으면 `document.write`로 2차 script 태그를 삽입한다(닫는 태그는 `<\/script>`로 이스케이프). 그 다음 게임 스크립트들을 로드. `main.js` 진입부에서 `window.Matter`가 없으면 `#error-overlay`를 표시하고 중단.

**엔진 업데이트 순서** `[검증됨: Engine.update 소스]`
중력 적용 → 적분(Body.update) → 충돌 검출 → **`collisionStart` 이벤트 발생** → 위치 해소 → 속도 해소 → `collisionActive`/`collisionEnd` 이벤트.
→ `collisionStart` 핸들러에서 읽는 속도는 **충돌 해소 전(접근) 속도**다. 피해 계산에 그대로 쓴다.

**적분 공식과 단위** `[검증됨: Body.update 소스]`
- 매 스텝: `v = v_prev × (1 − frictionAir) + (force/mass) × dt²`, `p += v`. dt = 1000/60 ms 고정.
- 중력 가속도(스텝당) = `gravity.y × gravity.scale × dt²` = `1 × 0.001 × (16.667)²` = **0.27778 px/step²** (≈ 1000 px/s²).
- **속도 단위 = px/step (1 step = 1/60 s).** `Body.setVelocity`, `Body.getVelocity`, `body.speed`, `body.velocity` 모두 이 단위. 18 px/step ≈ 1080 px/s.
- 새로 만든 body의 `deltaTime` 기본값은 1000/60이므로 **생성 직후 `setVelocity`를 해도 정확히 동작**한다.
- `Engine.update(engine, 1000/60)`를 고정 스텝으로 호출한다. `Matter.Runner`, `Matter.Render`는 사용하지 않는다(자체 루프·자체 렌더).

**body 기본값** `[검증됨]`: density 0.001, friction 0.1, frictionStatic 0.5, frictionAir 0.01, restitution 0, slop 0.05, sleepThreshold 60(스텝).

**body 생성 규칙**
- `Matter.Bodies.rectangle(x, y, w, h, options)` — **x, y는 중심**. `Matter.Bodies.circle(x, y, r, options)` → `body.circleRadius = r`가 세팅된다 `[검증됨]`.
- `Body.create`는 options를 **deep-extend**한다 `[검증됨]`. 따라서 options에 우리 엔티티 객체를 넣지 말고, 생성 후 `body.gameEntity = entity`로 **직접 할당**한다. `label` 문자열은 options로 넣어도 된다.
- **`isStatic` 토글 금지.** 새는 슬링샷에 있는 동안 물리 body가 아니다(그냥 좌표만 그린다). 발사 순간에 body를 생성해 world에 추가하고 `setVelocity`한다. 이렇게 하면 정적↔동적 전환의 질량 복원 문제를 전부 피한다.
- 정적 body(`isStatic: true`)의 `mass`는 Infinity다 `[검증됨]`. 피해 공식에서 `isStatic`을 먼저 분기한다.

**수면(sleeping)** `[검증됨: Sleeping 소스]`
- `Engine.create({ enableSleeping: true })`. 잠든 body는 중력·적분을 건너뛰어 적층이 안정된다.
- 움직이는 body와 접촉하면 자동으로 깨어난다(`Sleeping.afterCollisions`). **그러나 밑을 받치던 body가 "제거"되면 자동으로 깨어나지 않는다.** → 블록을 제거할 때마다 `wakeAll()`(모든 동적 body에 `Matter.Sleeping.set(body, false)`).
- 폭발 등으로 속도를 직접 줄 때도 먼저 `Sleeping.set(body, false)`.
- 잠든 body의 `Body.getVelocity` 결과는 (0,0)이다(positionPrev = position).

**그 외 사용 API(이름 정확히)** `[검증됨]`
`Matter.Engine.create`, `Matter.Engine.update`, `Matter.Bodies.rectangle`, `Matter.Bodies.circle`, `Matter.Composite.add`, `Matter.Composite.remove`, `Matter.Composite.allBodies`, `Matter.Body.setVelocity`, `Matter.Body.getVelocity`, `Matter.Body.setPosition`, `Matter.Sleeping.set`, `Matter.Events.on`, `Matter.Vector.add/sub/mult/magnitude/normalise`(영국식 철자 `normalise`). 이벤트 객체: `event.pairs[i].bodyA`, `.bodyB`, `.collision.normal`. `engine.gravity`(기본 `{x:0, y:1, scale:0.001}`), `engine.world`. body 읽기 속성: `position`, `angle`, `vertices`, `circleRadius`, `speed`, `isStatic`, `isSleeping`, `mass`, `id`.

### 2.2 렌더링·UI 구조
- 논리 해상도 **1280×720** 고정. `#app`(1280×720 div)을 `transform: translate(ox, oy) scale(s)`로 창에 맞춰 레터박스 스케일. 캔버스와 DOM 레이어가 함께 스케일된다.
- 캔버스 backing store는 `devicePixelRatio`(최대 2) 배수로 잡고, 매 프레임 `ctx.setTransform(dpr,0,0,dpr,0,0)` 후 논리 좌표로 그린다. CSS 크기는 1280×720px 고정.
- 포인터 → 논리 좌표: `rect = canvas.getBoundingClientRect(); x = (clientX − rect.left) × 1280 / rect.width; y = (clientY − rect.top) × 720 / rect.height`.
- 월드 좌표 = 캔버스 논리 좌표(1 unit = 1 px, y 아래 방향). 카메라 스크롤/줌 없음(스테이지 전체가 한 화면에 들어오게 설계됨).
- 캔버스에 `touch-action: none`, `user-select: none`.

---

## 3. 좌표계·월드 상수 (`js/config.js`의 내용)

아래 값을 `AB.CONFIG` 객체로 정의한다. 값 자체가 스펙이다.

```
W: 1280, H: 720
GROUND_Y: 640                     // 땅 윗면 y. 땅 body: 중심(640, 680), 크기 1280×80, isStatic
STEP_MS: 1000/60, MAX_STEPS_PER_FRAME: 4
GRAVITY_STEP: 0.27778             // px/step² (엔진 기본 중력과 일치, 예측선 계산용) [검증됨]

SLING: {
  x: 180, y: 520,                 // 앵커(새가 놓이는 기본 위치, 새 중심)
  baseY: 640,                     // 새총 밑동
  maxPull: 90,                    // 최대 당김 거리(px)
  grabRadius: 70,                 // 이 반경 안을 pointerdown 해야 드래그 시작
  minLaunchPull: 12,              // 이보다 짧게 당기고 놓으면 발사 취소
  powerPerPx: 0.2                 // 발사 속도(px/step) = 당김(px) × 0.2 → 최대 18
}

BIRD: { radius: 18, density: 0.0015, friction: 0.5, restitution: 0.35, frictionAir: 0.003 }
BIRD_TYPES: {
  red:   { color: '#d9342b', ability: null },
  chuck: { color: '#f2c530', ability: 'boost' },
  bomb:  { color: '#3a3a3a', ability: 'explode' }
}
BOOST: { mult: 1.5, maxSpeed: 26 }             // 척: 탭 시 속도 ×1.5, 상한 26 px/step
EXPLOSION: { radius: 140, impulse: 14, damage: 120, fuseSec: 1.0 }   // 봄: 탭 또는 첫 충돌 1.0s 후 폭발

MATERIALS: {
  wood:  { hp: 60,  density: 0.0012, friction: 0.6, restitution: 0.1,  score: 500, fill: '#c8873a', stroke: '#8a5a22' },
  ice:   { hp: 30,  density: 0.0008, friction: 0.2, restitution: 0.05, score: 300, fill: 'rgba(170,220,255,0.78)', stroke: '#7fb8e6' },
  stone: { hp: 150, density: 0.0022, friction: 0.8, restitution: 0.05, score: 800, fill: '#9a9a9a', stroke: '#5c5c5c' }
}
BLOCK_SIZES: {                                 // [w, h]
  plank: [100, 20], longplank: [160, 20], post: [20, 80], shortpost: [20, 50],
  square: [40, 40], bigsquare: [60, 60], slab: [60, 20]
}
PIGS: { s: { r: 14, hp: 20 }, m: { r: 20, hp: 35 }, l: { r: 28, hp: 60 } }
PIG_PHYS: { density: 0.0008, friction: 0.5, restitution: 0.2 }
GROUND_PHYS: { friction: 0.8, restitution: 0 }

DAMAGE: { threshold: 2, scale: 4, massCap: 3 } // §11.1
SCORE: { pig: 5000, birdBonus: 10000 }
TURN: { settleSpeed: 0.3, settleSteps: 45, minSec: 1.0, maxSec: 10 }
WIN_DELAY_SEC: 1.2, FAIL_DELAY_SEC: 0.8
PRESETTLE_STEPS: 60
BOUNDS: { minX: -200, maxX: 1500, maxY: 900 } // 벗어나면 제거
TRAIL: { everySteps: 3, maxPoints: 120 }
PREDICT: { steps: 150, everySteps: 4 }
QUEUE_DRAW: { x0: 130, dx: 36, max: 4 }        // 대기 새 그리기 위치(x0 − i·dx, y = GROUND_Y − 18)
STORAGE_KEY: 'ab_progress_v1'
```

**사거리 검증** `[검증됨: 위 상수로 이산 시뮬레이션]`
- 최대 발사(18 px/step, frictionAir 0.003) 시 착지 최대 x ≈ 1245(발사각 40°). 화면 폭 안에서 모든 구조물에 닿는다.
- x별 "도달 가능한 최소 y"(포락선): x=600→106, 700→155, 800→219, 900→290, 1000→373, 1100→469, 1150→519, 1200→577. §9의 모든 돼지는 이 포락선 아래(도달 가능)에 있다. 단 6단계 벙커 속 돼지는 돌로 막혀 있어 봄 새 폭발로 잡는 설계다(그 스테이지에 봄 새 2마리 제공).

**터널링 안전** — 최대 속도 26(부스트 상한)에 대해 새 반지름 18 + 최소 블록 두께 20의 합 56 > 26 이므로 한 스텝에 블록을 통과하지 못한다.

---

## 4. 파일 구조와 로드 순서

```
index.html
css/style.css
js/config.js      AB.CONFIG
js/levels.js      AB.LEVELS (10개)
js/storage.js     AB.Storage
js/physics.js     AB.World (엔진 래퍼 + 엔티티 팩토리 + 피해/제거)
js/slingshot.js   AB.Slingshot (입력 상태·조준·예측; DOM 무관)
js/effects.js     AB.Effects (파티클·떠오르는 점수·폭발 링)
js/render.js      AB.Renderer (캔버스 드로잉 전부)
js/game.js        AB.Game (상태 머신·턴·점수·클리어 판정)
js/ui.js          AB.UI (DOM 화면/오버레이/HUD, 버튼 → Game 메서드)
js/main.js        부트스트랩: Matter 확인, 인스턴스 생성, 리사이즈, rAF 루프, 포인터/키보드 바인딩
```

`index.html`의 script 순서(반드시 이 순서): Matter(1차) → fallback 인라인 → config → levels → storage → physics → slingshot → effects → render → game → ui → main.
각 js 파일 첫 줄은 `window.AB = window.AB || {};`. 파일 최상위에서는 정의만 하고, 다른 모듈을 **호출**하는 코드는 함수 안에만 둔다(로드 순서 의존 최소화).

---

## 5. 데이터 모델

### 5.1 엔티티 (물리 body 1개 = 엔티티 1개)
```
Entity {
  kind: 'block' | 'pig' | 'bird' | 'terrain',
  body: Matter.Body,          // body.gameEntity === this
  hp, maxHp,                  // block/pig만. terrain/bird는 Infinity
  material: 'wood'|'ice'|'stone',   // block
  size: 's'|'m'|'l',          // pig
  shape: 'plank'|...,         // block (BLOCK_SIZES 키)
  birdType: 'red'|'chuck'|'bomb', abilityUsed: false, hitAtStep: null,   // bird
  dead: false
}
```

### 5.2 스테이지 (`AB.LEVELS[i]`)
```
{ id, name, birds: ['red'|'chuck'|'bomb', ...],   // 발사 순서. 첫 원소가 첫 새
  star2, star3,                                    // 별 2/3개 점수 기준
  terrain: [{ x, y, w, h }],                       // 추가 정적 발판(중심 좌표). 땅은 항상 자동 생성
  blocks:  [{ t: material, s: shape, x, y }],      // 중심 좌표
  pigs:    [{ size, x, y }] }                      // 중심 좌표
```

### 5.3 진행 저장 (`localStorage[STORAGE_KEY]`, JSON)
```
{ unlocked: 1..10, best: { "1": { score, stars }, ... } }
```

---

## 6. 게임 루프와 타이밍 (`main.js` + `game.js`)

```
tick(now):
  dt = min((now − last)/1000, 0.1); last = now
  if game.state === 'PLAYING':
      acc += dt; n = 0
      while acc ≥ 1/60 and n < MAX_STEPS_PER_FRAME: game.step(); acc −= 1/60; n++
      if acc > 4/60: acc = 0            // 스파이럴 방지
  if state ∈ {PLAYING, CLEARED, FAILED}: effects.update(dt)
  renderer.draw(game)                   // 모든 상태에서 호출(메뉴에서는 배경만 보임)
  AB.UI.updateHud(game)
  requestAnimationFrame(tick)
```
- `game.step()` = `Matter.Engine.update(engine, 1000/60)` → `world.afterStep()`(제거 예약 처리·경계 밖 제거·이벤트 배출) → 턴 로직(§11.4) → 승패 검사(§11.5).
- PAUSED 중에는 `step()`이 전혀 호출되지 않는다. 재개 시 `acc = 0`, `last = performance.now()`로 리셋.
- 프레임 시간 기반 타이머(WIN_DELAY 등)는 "스텝 수 / 60"으로 계산해 일시정지의 영향을 받지 않게 한다.

---

## 7. 상태 머신

`game.state ∈ { 'MENU', 'SELECT', 'PLAYING', 'PAUSED', 'CLEARED', 'FAILED' }`
`game.phase ∈ { 'AIMING', 'FLYING', 'ENDING' }` (PLAYING/PAUSED 안에서만 의미 있음)

| 현재 | 트리거 | 다음 | 부수 효과 |
|---|---|---|---|
| MENU | `#btn-start` | SELECT | 타일 갱신(해금/별) |
| SELECT | 타일(해금된 것) 클릭 | PLAYING | `loadLevel(id)` |
| SELECT | `#btn-select-back` | MENU | |
| PLAYING | `#btn-pause` 또는 Esc | PAUSED | 드래그 중이면 취소(`slingshot.cancel()`), 물리 정지 |
| PAUSED | `#btn-resume` 또는 Esc | PLAYING | acc 리셋 |
| PAUSED | `#btn-pause-restart` | PLAYING | `loadLevel(같은 id)` |
| PAUSED | `#btn-pause-menu` | MENU | `world.dispose()` |
| PLAYING | 돼지 0 → 1.2s 경과 | CLEARED | 보너스 합산, 별 계산, `Storage.markCleared` |
| PLAYING | 새 소진 + 정착 + 돼지 잔존 → 0.8s | FAILED | |
| CLEARED | `#btn-next` (id<10) | PLAYING | `loadLevel(id+1)` |
| CLEARED/FAILED | `#btn-result-restart` | PLAYING | `loadLevel(같은 id)` |
| CLEARED/FAILED | `#btn-result-menu` | MENU | |

phase 전이: `loadLevel` → AIMING → (발사) FLYING → (턴 종료) 큐 있으면 AIMING / 없으면 ENDING(FAIL) ; 어느 phase에서든 돼지 0이면 ENDING(WIN).

UI 표시 규칙(`AB.UI.sync(game)`): 상태별로 `#screen-menu`, `#screen-select`, `#hud`, `#overlay-pause`, `#overlay-result` 중 보일 것만 `hidden` 해제. HUD는 PLAYING/PAUSED/CLEARED/FAILED에서 표시. PAUSED에서는 HUD 위에 오버레이.

---

## 8. 모듈별 상세 스펙

### 8.1 `index.html`
- `<meta viewport>`, `<link css>`. body 안에 `<div id="app">` 하나. 그 안에 아래 순서(뒤가 위에 쌓임):
  1. `<canvas id="game" width="1280" height="720">`
  2. `<div id="hud" class="layer" hidden>` : 좌측 `<div id="hud-left">`에 `<span id="hud-stage">`, `<span id="hud-score">`, `<span id="hud-birds">`; 우측 `<button id="btn-pause" aria-label="일시정지">Ⅱ</button>`
  3. `<div id="screen-menu" class="layer screen">` : `<h1>ANGRY BIRDS WEB</h1>`, `<p>10개의 스테이지</p>`, `<button id="btn-start">게임 시작</button>`
  4. `<div id="screen-select" class="layer screen" hidden>` : `<h2>스테이지 선택</h2>`, `<div id="stage-grid"></div>`(JS가 10개 `button.stage-tile` 생성, `data-id`), `<button id="btn-select-back">메인으로</button>`
  5. `<div id="overlay-pause" class="layer overlay" hidden>` : `<div class="panel"><h2>일시정지</h2><button id="btn-resume">계속하기</button><button id="btn-pause-restart">다시하기</button><button id="btn-pause-menu">메인으로</button></div>`
  6. `<div id="overlay-result" class="layer overlay" hidden>` : `<div class="panel"><h2 id="result-title"></h2><div id="result-stars"></div><p id="result-score"></p><button id="btn-next">다음 스테이지</button><button id="btn-result-restart">다시하기</button><button id="btn-result-menu">메인으로</button></div>`
  7. `<div id="error-overlay" class="layer overlay" hidden>` : "물리 엔진(Matter.js)을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침하세요."
- script 태그 순서는 §4. Matter 태그 뒤 fallback 인라인 script.

### 8.2 `css/style.css`
- `html, body { margin:0; height:100%; background:#1b2a38; overflow:hidden; font-family: "Apple SD Gothic Neo","Malgun Gothic",sans-serif; }`
- `#app { position:absolute; left:0; top:0; width:1280px; height:720px; transform-origin:0 0; }` (transform은 JS가 설정)
- `#game { position:absolute; left:0; top:0; width:1280px; height:720px; touch-action:none; user-select:none; display:block; }`
- `.layer { position:absolute; inset:0; }` ; `[hidden] { display:none !important; }`
- `#hud { pointer-events:none; }` `#hud button, #hud-left { pointer-events:auto; }` — HUD는 드래그를 캔버스로 통과시키되 버튼만 클릭 가능.
- `#hud-left { position:absolute; left:16px; top:12px; color:#fff; font-weight:700; text-shadow:0 1px 2px #000; font-size:20px; line-height:1.5 }`
- `#btn-pause { position:absolute; right:16px; top:12px; width:56px; height:56px; border-radius:12px; font-size:26px; border:3px solid #fff; background:rgba(0,0,0,.45); color:#fff; cursor:pointer; }` — **요구사항: 우측**.
- `.screen, .overlay { display:flex; align-items:center; justify-content:center; flex-direction:column; gap:16px; }` ; `.overlay { background:rgba(0,0,0,.55); pointer-events:auto; }` ; `.screen { background:linear-gradient(#7ec8f7,#dff3ff); }`
- `.panel { background:#fff; border-radius:16px; padding:32px 48px; display:flex; flex-direction:column; gap:12px; min-width:320px; align-items:center; }`
- 버튼 공통: 큼직하게(`font-size:22px; padding:12px 28px; border-radius:10px; cursor:pointer`). `.stage-tile { width:96px; height:96px; font-size:28px }` `.stage-tile.locked { opacity:.45; cursor:not-allowed }` `#stage-grid { display:grid; grid-template-columns: repeat(5, 96px); gap:16px }`. 타일 안에 번호와 별 문자열(`★★☆` / 잠금은 `🔒`).

### 8.3 `js/config.js`
§3의 `AB.CONFIG` 그대로. 추가로 헬퍼 `AB.CONFIG.blockSize(shape) → [w,h]`는 두지 않고 `BLOCK_SIZES[shape]`를 직접 읽는다.

### 8.4 `js/levels.js`
`AB.LEVELS = [ ... ]` — §9 데이터를 **그대로** 옮긴다(좌표 수정 금지).

### 8.5 `js/storage.js` — `AB.Storage`
- `load() → { unlocked, best }` : 파싱 실패/없음이면 `{ unlocked: 1, best: {} }`. try/catch.
- `save(progress)` : try/catch.
- `markCleared(id, score, stars) → progress` : `best[id]`는 더 높은 점수/별로만 갱신, `unlocked = max(unlocked, min(10, id+1))`, 저장.
- `unlockAll()` : `unlocked = 10` 저장. `main.js`가 `location.search`에 `unlockall`이 있으면 호출(리뷰 편의).

### 8.6 `js/physics.js` — `AB.World` (클래스)
스테이지마다 **새 인스턴스**를 만든다(엔진 상태 누적 방지). 이전 인스턴스는 `dispose()`.

```
constructor()
  engine = Matter.Engine.create({ enableSleeping: true })   // 중력 기본값 유지
  entities = []            // 모든 엔티티(terrain 포함)
  toRemove = []            // 스텝 후 제거 예약
  events = []              // { type:'pigKilled'|'blockDestroyed', x, y, material?, size? }
  stepCount = 0
  Matter.Events.on(engine, 'collisionStart', e => this._onCollision(e.pairs))
  addGround()

addGround()                      → terrain 엔티티: rectangle(640, 680, 1280, 80, {isStatic:true, friction:.8, label:'ground'})
addTerrain({x,y,w,h})            → terrain 엔티티(isStatic)
addBlock({t,s,x,y})              → [w,h]=BLOCK_SIZES[s]; mat=MATERIALS[t]; rectangle(x,y,w,h,{density,friction,restitution,label:'block'}); hp=mat.hp
addPig({size,x,y})               → circle(x,y,PIGS[size].r,{...PIG_PHYS,label:'pig'}); hp=PIGS[size].hp
addBird(type, x, y, velocity)    → circle(x,y,BIRD.radius,{density,friction,restitution,frictionAir,label:'bird'}); Composite.add; Body.setVelocity(body, velocity); 엔티티 반환
  (모든 add*는 body 생성 → Composite.add(engine.world, body) → entity 생성 → body.gameEntity = entity → entities.push)

step()                           → Matter.Engine.update(engine, 1000/60); stepCount++; afterStep()
afterStep()
  1) toRemove 처리: 각 엔티티 Composite.remove(engine.world, body), entities에서 제거. 하나라도 block이 제거됐으면 wakeAll()
  2) 경계 밖: entities 복사본 순회, position.y > BOUNDS.maxY 또는 x < minX 또는 x > maxX → pig면 events.push({type:'pigKilled', x, y, size}); 즉시 제거(remove)
remove(entity)                   → dead=true, Composite.remove, entities에서 제거 (스텝 밖에서 호출될 때 사용: 턴 종료 시 새 제거, 폭발한 봄)
scheduleRemove(entity)           → dead=true 후 toRemove.push (충돌 콜백 안에서는 이것만 사용)
wakeAll()                        → Composite.allBodies(world) 중 !isStatic 에 Matter.Sleeping.set(b, false)
damage(entity, amount)           → block/pig만. hp −= amount; hp ≤ 0 && !dead → scheduleRemove; events.push(pig→'pigKilled' / block→'blockDestroyed', 좌표·material/size 포함)
explode(cx, cy)                  → §11.3
dynamicBodies()                  → allBodies 중 !isStatic
pigs()                           → entities.filter(kind==='pig' && !dead)
allSettled()                     → dynamicBodies().every(b => b.isSleeping || b.speed < TURN.settleSpeed)
presettle()                      → PRESETTLE_STEPS번 Matter.Engine.update(engine, 1000/60) 후, 모든 동적 body에 Matter.Sleeping.set(b, true). (stepCount는 0으로 유지)
drainEvents()                    → events를 반환하고 비운다
dispose()                        → Matter.Events.off(engine) 없이도 됨: 인스턴스 참조만 끊는다(entities=[], engine=null)

_onCollision(pairs)              → §11.1 공식. 여기서는 damage()와 hitAtStep 기록만 하고 body 제거는 하지 않는다.
```
`explode`와 `damage`는 Game이 아닌 World에 둔다(엔티티·body 접근이 여기 있으므로).

### 8.7 `js/slingshot.js` — `AB.Slingshot` (클래스, DOM/물리 무관한 순수 상태)
```
constructor(cfg = AB.CONFIG.SLING)
state: dragging=false, birdPos={x:cfg.x, y:cfg.y}
reset()                       → dragging=false, birdPos=앵커
cancel()                      → 같음(일시정지 시)
tryGrab(x, y) → bool          → dist((x,y), 앵커) ≤ grabRadius 이면 dragging=true, 반환 true
drag(x, y)                    → dragging일 때: d = (x,y) − 앵커; |d| > maxPull이면 d를 maxPull로 클램프; birdPos = 앵커 + d
release() → velocity | null   → dragging=false; pull = |앵커 − birdPos|; pull < minLaunchPull → birdPos=앵커, null 반환
                                 아니면 v = (앵커 − birdPos) × powerPerPx 반환 (birdPos는 발사 위치로 유지)
launchVelocity()              → release 없이 현재 예상 속도 계산(예측선용)
predict(pos, v) → [{x,y}]     → 이산 시뮬레이션: f=BIRD.frictionAir, g=GRAVITY_STEP
                                 for i in 1..PREDICT.steps: vx*=(1−f); vy=vy*(1−f)+g; x+=vx; y+=vy;
                                   i % everySteps === 0 → 점 추가; y > GROUND_Y − BIRD.radius 또는 x > W+20 → 중단
```
이 공식은 Matter의 `Body.update`와 동일한 순서(감쇠 → 가속 → 위치)이므로 실제 궤적과 점선이 일치한다 `[검증됨]`.

### 8.8 `js/effects.js` — `AB.Effects` (클래스)
- `particles[]` `{x,y,vx,vy,size,color,life,maxLife,rot,vrot}`, `texts[]` `{x,y,str,life}`, `rings[]` `{x,y,r,maxR,life}`
- `burst(x, y, color, count=8)` : 속도 랜덤(120~320 px/s), 위쪽 편향, 중력 900 px/s², life 0.5~0.8s
- `text(x, y, str)` : 1.0s 동안 위로 40px 떠오르며 페이드
- `ring(x, y, maxR)` : 0.35s 동안 반지름 0→maxR, 주황 스트로크 페이드
- `update(dt)`, `draw(ctx)`, `clear()`
- 용도: 블록 파괴(재질 색 burst + 점수 text), 돼지 제거(녹색 burst + "+5000"), 새 소멸(회색 연기 burst 소량), 폭발(ring + 주황 burst 16개), 척 부스트(노란 burst 6개)

### 8.9 `js/render.js` — `AB.Renderer` (클래스)
- `constructor(canvas)` : ctx 저장, `resizeBackingStore()`(dpr ≤ 2).
- `draw(game)`가 읽는 game 필드: `state`, `phase`, `world`(null 가능 → 배경만), `world.entities`, `queue`, `currentBirdType`, `activeBird`, `slingshot`(`dragging`, `birdPos`, `launchVelocity()`, `predict()`), `trail`, `effects`. 그 외는 읽지 않는다.
- `draw(game)` 순서: 배경 → 지형(땅·발판) → 새총 뒤 기둥 → 대기 새들 → 블록 → 돼지 → 비행 중 새 → 조준 중 새(`currentBirdType`이 있을 때, 위치는 `slingshot.birdPos`) + 고무줄(드래그 중) → 새총 앞 기둥 → 이전 샷 잔상 → 예측 점선(드래그 중) → 이펙트.
- 배경: 하늘 그라데이션(#7ec8f7→#dff3ff), 구름 3개(고정 좌표 타원), 원경 언덕 2개(#9ad36a 원호), 땅(#6b4a2b, y 640~720) + 잔디띠(#4caf50, y 640~652). 게임 상태와 무관하게 항상 그린다.
- 블록: `body.vertices`로 다각형 path(회전 반영). 재질별 fill/stroke(CONFIG). 나무는 세로/가로 결 선 2개, 얼음은 하이라이트 대각선, 돌은 점 몇 개. **손상 표시**: hp/maxHp < 0.66 → 균열 1줄, < 0.33 → 균열 3줄 + `rgba(0,0,0,.18)` 덧칠.
- 돼지: `body.circleRadius`, `body.angle`로 회전. 몸(#6fcf4a, 스트로크 #3e8e2a), 코(밝은 녹색 타원 + 콧구멍 2개), 눈 2개(흰/검), 귀 2개. hp < 50% → 눈 위 붉은 멍 + 찌푸린 눈썹.
- 새: 타입 색 원, 배(밝은 톤 작은 원), 눈 2개(동공은 속도 방향을 향함), 주황 부리 삼각형. red: 머리 위 깃 2개. chuck: 뾰족한 깃. bomb: 위에 짧은 도화선 + 불꽃 점(abilityUsed 아니면 깜빡임).
- 새총: 밑동 (180,640)→(180,560) 두께 10 갈색(#6b3e1e); 좌 팔 (180,560)→(166,522), 우 팔 (180,560)→(194,522) 두께 8. 고무줄: 드래그 중이면 (166,522)와 (194,522)에서 birdPos로 각각 선(#3b2418, 두께 4). 좌 팔+뒤 고무줄은 새 뒤, 우 팔+앞 고무줄은 새 앞에 그린다. 드래그 중이 아니면 `slingshot.birdPos`는 앵커이므로 새가 앵커에 그려진다.
- 대기 새: `QUEUE_DRAW` 위치에 최대 4마리, 남은 수가 더 많으면 마지막 옆에 `+N` 텍스트.
- 예측 점선: 흰색 반지름 3, 알파 0.7에서 점 순서대로 0.15까지 감소.
- 잔상: `game.trail` 점들을 흰색 반지름 2.5 알파 0.45로.
- 이펙트: `game.effects.draw(ctx)`.

### 8.10 `js/game.js` — `AB.Game` (클래스)
```
필드: state='MENU', phase='AIMING', levelId=1, level=null, world=null, slingshot=new AB.Slingshot(), effects=new AB.Effects()
      queue=[], currentBirdType=null, activeBird=null(엔티티), score=0
      turnSteps=0, settleCounter=0, endingResult=null, endingSteps=0, trail=[], progress=AB.Storage.load()

goMenu()            → state='MENU'; world && world.dispose(); world=null; UI.sync
goSelect()          → state='SELECT'; UI.sync (UI가 타일 재생성)
startLevel(id)      → loadLevel(id)
restart()           → loadLevel(levelId)
nextLevel()         → levelId < 10 이면 loadLevel(levelId+1)
pause()             → state==='PLAYING'일 때만: slingshot.cancel(); state='PAUSED'; UI.sync
resume()            → state==='PAUSED'일 때만: state='PLAYING'; onResume 콜백(main이 acc 리셋); UI.sync
togglePause()       → PLAYING↔PAUSED

loadLevel(id)
  levelId=id; level=AB.LEVELS[id−1]; score=0; trail=[]; effects.clear()
  world && world.dispose(); world=new AB.World()
  level.terrain.forEach(addTerrain); level.blocks.forEach(addBlock); level.pigs.forEach(addPig)
  world.presettle()
  queue=level.birds.slice(); activeBird=null; nextBird(); state='PLAYING'; UI.sync

nextBird()          → currentBirdType=queue.shift(); slingshot.reset(); phase='AIMING'; turnSteps=0; settleCounter=0   (호출 측이 큐가 비어 있지 않음을 보장)

// 입력(main이 캔버스 포인터 좌표로 호출; state==='PLAYING'일 때만)
onPointerDown(x,y)
  phase==='AIMING' → slingshot.tryGrab(x,y)
  phase==='FLYING' && activeBird && !activeBird.dead && !activeBird.abilityUsed → useAbility()
onPointerMove(x,y)  → phase==='AIMING' && slingshot.dragging → slingshot.drag(x,y)
onPointerUp(x,y)
  phase==='AIMING' && slingshot.dragging → v=slingshot.release(); v && launch(v)

launch(v)
  pos=slingshot.birdPos; activeBird=world.addBird(currentBirdType, pos.x, pos.y, v); currentBirdType=null
  trail=[]; phase='FLYING'; turnSteps=0; settleCounter=0

useAbility()
  abilityUsed=true
  chuck: cur=Matter.Body.getVelocity(body); sp=|cur|; if sp>0: ns=min(sp×BOOST.mult, BOOST.maxSpeed); Body.setVelocity(body, cur×(ns/sp)); effects.burst(노랑,6)
  bomb : world.explode(body.position.x, body.position.y); effects.ring(…,140)+burst(주황,16); world.remove(activeBird); activeBird=null
  red  : 아무것도 안 함(abilityUsed만 true)

step()              // main 루프가 PLAYING일 때 고정 스텝으로 호출
  world.step()
  handleEvents(world.drainEvents())
  if phase==='FLYING': flyingStep()
  if phase==='ENDING': endingStep()
  else if world.pigs().length===0: beginEnding('WIN')

flyingStep()
  turnSteps++
  if activeBird && !activeBird.dead:
     turnSteps % TRAIL.everySteps===0 → trail.push(pos) (maxPoints 초과 시 shift)
     bomb && !abilityUsed && hitAtStep!=null && (world.stepCount − hitAtStep) ≥ fuseSec×60 → useAbility()
  world.allSettled() ? settleCounter++ : settleCounter=0
  sec=turnSteps/60
  if (sec ≥ TURN.minSec && settleCounter ≥ TURN.settleSteps) || sec ≥ TURN.maxSec: endTurn()

endTurn()
  if activeBird && !activeBird.dead: effects.burst(회색,5); world.remove(activeBird)
  activeBird=null
  if world.pigs().length===0: beginEnding('WIN'); return
  if queue.length===0: beginEnding('FAIL'); return
  nextBird()

beginEnding(result) → phase='ENDING'; endingResult=result; endingSteps=0; slingshot.cancel()
endingStep()
  endingSteps++
  delay = result==='WIN' ? WIN_DELAY_SEC : FAIL_DELAY_SEC
  if endingSteps ≥ delay×60: finish()
finish()
  WIN : bonus = (queue.length + (currentBirdType ? 1 : 0)) × SCORE.birdBonus   // 장전만 되고 미발사인 새도 포함
        score += bonus; stars = score ≥ level.star3 ? 3 : score ≥ level.star2 ? 2 : 1
        progress = AB.Storage.markCleared(levelId, score, stars); state='CLEARED'
  FAIL: state='FAILED'
  UI.sync(this)

handleEvents(events)
  pigKilled      → score += SCORE.pig; effects.burst(x,y,'#6fcf4a',10); effects.text(x,y,'+5000')
  blockDestroyed → score += MATERIALS[material].score; effects.burst(x,y,MATERIALS[material].fill,8); effects.text(x,y,'+'+score값)
birdsLeft()      → queue.length + (currentBirdType ? 1 : 0)
```
장전 상태의 표현: `nextBird()`가 큐에서 꺼내 `currentBirdType`에 두고, `launch()`가 body를 만든 뒤 `currentBirdType=null`로 비운다. 렌더러는 `currentBirdType`이 있을 때만 새총 위의 새를 그리고, HUD 남은 새 수와 클리어 보너스도 같은 값을 쓴다.
`flyingStep()`에서 봄 도화선으로 `useAbility()`를 호출하면 `activeBird`가 null이 되므로, 그 뒤 줄에서는 `activeBird`를 다시 참조하지 않는다(정착 판정은 `world.allSettled()`만 사용).

### 8.11 `js/ui.js` — `AB.UI` (객체)
- `init(game)` : 모든 버튼에 리스너. `#btn-start→game.goSelect()`, `#btn-select-back→goMenu()`, `#btn-pause→pause()`, `#btn-resume→resume()`, `#btn-pause-restart→restart()`, `#btn-pause-menu→goMenu()`, `#btn-next→nextLevel()`, `#btn-result-restart→restart()`, `#btn-result-menu→goMenu()`. `#stage-grid`는 클릭 위임: `.stage-tile:not(.locked)`의 `data-id`로 `game.startLevel(Number(id))`.
- `sync(game)` : 상태별 표시(§7 규칙). SELECT면 `buildStageGrid(game.progress)` 재생성. CLEARED/FAILED면 결과 패널 채움: 제목 `스테이지 클리어!` / `실패…`, 별 `★`×stars + `☆`×(3−stars)(FAIL이면 빈 문자열), 점수 `점수: N`(천 단위 콤마), `#btn-next`는 WIN이고 `levelId<10`일 때만 표시.
- `updateHud(game)` : `#hud-stage` = `STAGE {id} · {name}`, `#hud-score` = `점수 {score}`, `#hud-birds` = `남은 새 {birdsLeft()}`. 값이 바뀔 때만 textContent 갱신(문자열 캐시).
- `showError()` : `#error-overlay` 표시.

### 8.12 `js/main.js`
1. `if (!window.Matter) { AB.UI.showError(); return; }`(IIFE 안).
2. `location.search.includes('unlockall')` → `AB.Storage.unlockAll()`.
3. `game = new AB.Game(); renderer = new AB.Renderer(canvas); AB.UI.init(game); game.onResume = () => { acc = 0; last = performance.now(); }`.
4. 리사이즈: `fit()` = `s = min(innerWidth/1280, innerHeight/720); ox=(innerWidth−1280s)/2; oy=(innerHeight−720s)/2; app.style.transform = translate(ox px, oy px) scale(s)`. `window.addEventListener('resize', fit); fit()`.
5. 포인터: 캔버스에 `pointerdown`(→ `canvas.setPointerCapture(e.pointerId)`, 좌표 변환 후 `game.onPointerDown`), `pointermove`, `pointerup`/`pointercancel`(→ `onPointerUp`). `e.preventDefault()`. state가 PLAYING이 아니면 무시.
6. 키보드: `keydown` Escape → `game.togglePause()`(state가 PLAYING/PAUSED일 때만).
7. `game.goMenu()` 후 `requestAnimationFrame(tick)` 시작(§6).

---

## 9. 스테이지 데이터 (10개) `[검증됨]`

검증 내용: (a) 모든 블록·돼지·발판 AABB가 서로 겹치지 않음, (b) 모든 블록·돼지의 바닥이 땅(640) 또는 다른 물체의 윗면에 정확히 접함(공중 부양 없음), (c) 모든 물체가 x ≤ 1270 안, (d) 모든 돼지 윗면이 §3의 도달 포락선 안. 좌표는 모두 **중심**. 그대로 `AB.LEVELS`에 옮긴다.

구조 규칙(참고): "집" = 기둥(post 20×80) 2개 + 판자(plank 100×20). 1층 기둥 중심 y=600, 판자 y=550; 2층 기둥 y=500, 판자 y=450; 3층 기둥 y=400, 판자 y=350. 판자 위 돼지 중심 y = 판자 윗면 − r.

```
  { id: 1, name: '첫 걸음', birds: ["red", "red", "red"],
    star2: 15000, star3: 25000,
    terrain: [],
    blocks: [
      { t: 'wood', s: 'post', x: 720, y: 600 },
      { t: 'wood', s: 'post', x: 800, y: 600 },
      { t: 'wood', s: 'plank', x: 760, y: 550 },
    ],
    pigs: [
      { size: 'm', x: 760, y: 620 },
    ] },
  { id: 2, name: '두 채의 집', birds: ["red", "red", "red", "red"],
    star2: 20000, star3: 32000,
    terrain: [],
    blocks: [
      { t: 'wood', s: 'post', x: 660, y: 600 },
      { t: 'wood', s: 'post', x: 740, y: 600 },
      { t: 'wood', s: 'plank', x: 700, y: 550 },
      { t: 'wood', s: 'post', x: 900, y: 600 },
      { t: 'wood', s: 'post', x: 980, y: 600 },
      { t: 'wood', s: 'plank', x: 940, y: 550 },
    ],
    pigs: [
      { size: 'm', x: 700, y: 620 },
      { size: 's', x: 940, y: 626 },
    ] },
  { id: 3, name: '유리성', birds: ["red", "red", "red"],
    star2: 22000, star3: 34000,
    terrain: [],
    blocks: [
      { t: 'ice', s: 'post', x: 780, y: 600 },
      { t: 'ice', s: 'post', x: 860, y: 600 },
      { t: 'ice', s: 'plank', x: 820, y: 550 },
      { t: 'ice', s: 'post', x: 780, y: 500 },
      { t: 'ice', s: 'post', x: 860, y: 500 },
      { t: 'ice', s: 'plank', x: 820, y: 450 },
    ],
    pigs: [
      { size: 'm', x: 820, y: 620 },
      { size: 's', x: 820, y: 426 },
    ] },
  { id: 4, name: '높은 탑', birds: ["chuck", "red", "chuck", "red"],
    star2: 25000, star3: 40000,
    terrain: [],
    blocks: [
      { t: 'wood', s: 'post', x: 840, y: 600 },
      { t: 'wood', s: 'post', x: 920, y: 600 },
      { t: 'wood', s: 'plank', x: 880, y: 550 },
      { t: 'wood', s: 'post', x: 840, y: 500 },
      { t: 'wood', s: 'post', x: 920, y: 500 },
      { t: 'wood', s: 'plank', x: 880, y: 450 },
      { t: 'wood', s: 'post', x: 840, y: 400 },
      { t: 'wood', s: 'post', x: 920, y: 400 },
      { t: 'wood', s: 'plank', x: 880, y: 350 },
    ],
    pigs: [
      { size: 's', x: 880, y: 326 },
      { size: 'm', x: 880, y: 620 },
    ] },
  { id: 5, name: '돌담 너머', birds: ["red", "red", "chuck", "red", "red"],
    star2: 30000, star3: 48000,
    terrain: [],
    blocks: [
      { t: 'stone', s: 'post', x: 640, y: 600 },
      { t: 'stone', s: 'post', x: 640, y: 520 },
      { t: 'wood', s: 'post', x: 780, y: 600 },
      { t: 'wood', s: 'post', x: 860, y: 600 },
      { t: 'wood', s: 'plank', x: 820, y: 550 },
      { t: 'ice', s: 'post', x: 980, y: 600 },
      { t: 'ice', s: 'post', x: 1060, y: 600 },
      { t: 'ice', s: 'plank', x: 1020, y: 550 },
    ],
    pigs: [
      { size: 'm', x: 820, y: 620 },
      { size: 'm', x: 1020, y: 620 },
      { size: 's', x: 1020, y: 526 },
    ] },
  { id: 6, name: '벙커', birds: ["bomb", "red", "bomb", "red"],
    star2: 30000, star3: 48000,
    terrain: [],
    blocks: [
      { t: 'stone', s: 'square', x: 780, y: 620 },
      { t: 'stone', s: 'square', x: 860, y: 620 },
      { t: 'stone', s: 'plank', x: 820, y: 590 },
      { t: 'wood', s: 'square', x: 820, y: 560 },
      { t: 'wood', s: 'post', x: 920, y: 600 },
      { t: 'wood', s: 'post', x: 1000, y: 600 },
      { t: 'wood', s: 'plank', x: 960, y: 550 },
      { t: 'wood', s: 'post', x: 920, y: 500 },
      { t: 'wood', s: 'post', x: 1000, y: 500 },
      { t: 'wood', s: 'plank', x: 960, y: 450 },
    ],
    pigs: [
      { size: 's', x: 820, y: 626 },
      { size: 'm', x: 960, y: 620 },
      { size: 's', x: 960, y: 426 },
    ] },
  { id: 7, name: '공중 정원', birds: ["red", "chuck", "red", "chuck", "red"],
    star2: 32000, star3: 52000,
    terrain: [{ x: 1000, y: 470, w: 240, h: 20 }],
    blocks: [
      { t: 'ice', s: 'post', x: 960, y: 420 },
      { t: 'ice', s: 'post', x: 1040, y: 420 },
      { t: 'ice', s: 'plank', x: 1000, y: 370 },
      { t: 'wood', s: 'post', x: 660, y: 600 },
      { t: 'wood', s: 'post', x: 740, y: 600 },
      { t: 'wood', s: 'plank', x: 700, y: 550 },
      { t: 'wood', s: 'post', x: 660, y: 500 },
      { t: 'wood', s: 'post', x: 740, y: 500 },
      { t: 'wood', s: 'plank', x: 700, y: 450 },
    ],
    pigs: [
      { size: 'm', x: 1000, y: 440 },
      { size: 's', x: 700, y: 626 },
      { size: 'm', x: 700, y: 420 },
    ] },
  { id: 8, name: '혼합 재료', birds: ["red", "bomb", "chuck", "red", "red", "red"],
    star2: 40000, star3: 62000,
    terrain: [],
    blocks: [
      { t: 'wood', s: 'post', x: 720, y: 600 },
      { t: 'wood', s: 'post', x: 800, y: 600 },
      { t: 'wood', s: 'plank', x: 760, y: 550 },
      { t: 'wood', s: 'post', x: 720, y: 500 },
      { t: 'wood', s: 'post', x: 800, y: 500 },
      { t: 'wood', s: 'plank', x: 760, y: 450 },
      { t: 'stone', s: 'slab', x: 760, y: 430 },
      { t: 'ice', s: 'post', x: 860, y: 600 },
      { t: 'ice', s: 'post', x: 940, y: 600 },
      { t: 'ice', s: 'plank', x: 900, y: 550 },
      { t: 'ice', s: 'post', x: 860, y: 500 },
      { t: 'ice', s: 'post', x: 940, y: 500 },
      { t: 'ice', s: 'plank', x: 900, y: 450 },
      { t: 'ice', s: 'post', x: 860, y: 400 },
      { t: 'ice', s: 'post', x: 940, y: 400 },
      { t: 'ice', s: 'plank', x: 900, y: 350 },
    ],
    pigs: [
      { size: 'm', x: 760, y: 620 },
      { size: 's', x: 760, y: 526 },
      { size: 'm', x: 900, y: 620 },
      { size: 's', x: 900, y: 326 },
    ] },
  { id: 9, name: '요새', birds: ["chuck", "bomb", "red", "chuck", "red", "bomb"],
    star2: 45000, star3: 70000,
    terrain: [],
    blocks: [
      { t: 'stone', s: 'post', x: 600, y: 600 },
      { t: 'stone', s: 'post', x: 600, y: 520 },
      { t: 'stone', s: 'square', x: 600, y: 460 },
      { t: 'ice', s: 'post', x: 720, y: 600 },
      { t: 'ice', s: 'post', x: 800, y: 600 },
      { t: 'ice', s: 'plank', x: 760, y: 550 },
      { t: 'ice', s: 'post', x: 720, y: 500 },
      { t: 'ice', s: 'post', x: 800, y: 500 },
      { t: 'ice', s: 'plank', x: 760, y: 450 },
      { t: 'wood', s: 'post', x: 920, y: 600 },
      { t: 'wood', s: 'post', x: 1000, y: 600 },
      { t: 'wood', s: 'plank', x: 960, y: 550 },
      { t: 'wood', s: 'post', x: 920, y: 500 },
      { t: 'wood', s: 'post', x: 1000, y: 500 },
      { t: 'wood', s: 'plank', x: 960, y: 450 },
      { t: 'stone', s: 'shortpost', x: 1100, y: 615 },
      { t: 'stone', s: 'slab', x: 1100, y: 580 },
    ],
    pigs: [
      { size: 'm', x: 760, y: 620 },
      { size: 's', x: 760, y: 426 },
      { size: 'm', x: 960, y: 620 },
      { size: 'l', x: 1100, y: 542 },
    ] },
  { id: 10, name: '킹피그의 성', birds: ["red", "chuck", "bomb", "red", "chuck", "bomb", "red"],
    star2: 55000, star3: 85000,
    terrain: [],
    blocks: [
      { t: 'wood', s: 'post', x: 580, y: 600 },
      { t: 'wood', s: 'post', x: 660, y: 600 },
      { t: 'wood', s: 'plank', x: 620, y: 550 },
      { t: 'ice', s: 'post', x: 750, y: 600 },
      { t: 'ice', s: 'post', x: 830, y: 600 },
      { t: 'ice', s: 'plank', x: 790, y: 550 },
      { t: 'ice', s: 'post', x: 750, y: 500 },
      { t: 'ice', s: 'post', x: 830, y: 500 },
      { t: 'ice', s: 'plank', x: 790, y: 450 },
      { t: 'stone', s: 'post', x: 930, y: 600 },
      { t: 'stone', s: 'post', x: 1070, y: 600 },
      { t: 'stone', s: 'longplank', x: 1000, y: 550 },
      { t: 'stone', s: 'post', x: 930, y: 500 },
      { t: 'stone', s: 'post', x: 1070, y: 500 },
      { t: 'stone', s: 'longplank', x: 1000, y: 450 },
    ],
    pigs: [
      { size: 's', x: 620, y: 626 },
      { size: 'm', x: 790, y: 620 },
      { size: 's', x: 790, y: 426 },
      { size: 'l', x: 1000, y: 612 },
      { size: 'm', x: 1000, y: 420 },
    ] },
```

스테이지 설계 의도(구현에는 불필요, 이해용): 1~2 튜토리얼(나무), 3 얼음 소개, 4 척(가속) 소개·높은 탑, 5 돌담을 넘기는 로브샷, 6 봄(폭발) 소개·돌 벙커 속 돼지는 폭발로만 처리, 7 공중 발판, 8 세 재질 혼합·6마리, 9 요새(전방 돌담 + 받침대 위 대형 돼지), 10 최종(돌 성 + 5마리, 7마리 새).

---

## 10. 슬링샷·입력 UX 명세

1. **조준(AIMING)**: 앵커(180,520)에 새가 놓여 있다(물리 body 아님, 그리기만). 앵커 반경 70px 안에서 `pointerdown` → 드래그 시작. 그 밖의 `pointerdown`은 무시.
2. **드래그**: 새 중심 = 앵커 + 클램프(포인터 − 앵커, 최대 90px). 고무줄 두 줄이 새까지 늘어난다. 예측 점선을 `predict(birdPos, launchVelocity())`로 매 프레임 계산해 그린다(당김 < 12px이면 점선 없음).
3. **발사**: `pointerup`. 당김 < 12px → 취소(새가 앵커로 복귀). 아니면 속도 v = (앵커 − 새위치) × 0.2로 새 body 생성·투입. 잔상 배열 초기화.
4. **비행(FLYING)**: 화면 어디든 `pointerdown` 1회 → 새 능력. red 없음 / chuck 가속 / bomb 폭발. 매 3스텝마다 잔상 점 기록.
5. **턴 종료**(§11.4) → 다음 새가 앵커에 장전(AIMING) 또는 결과.
6. 일시정지·결과 오버레이가 떠 있으면 캔버스는 포인터 이벤트를 받지 않는다(오버레이가 `pointer-events:auto`로 전면을 덮음). 추가로 `main.js`가 `state==='PLAYING'`이 아니면 무시.

---

## 11. 규칙 명세

### 11.1 충돌 피해 (`World._onCollision(pairs)`)
```
for pair in pairs:
  A = pair.bodyA, B = pair.bodyB; ea = A.gameEntity, eb = B.gameEntity   // 없을 수 있음 → 건너뜀
  vA = Matter.Body.getVelocity(A), vB = Matter.Body.getVelocity(B)         // 잠든/정적 body는 (0,0)
  rel = |vA − vB|                                                          // px/step
  if ea?.kind==='bird' && ea.hitAtStep==null: ea.hitAtStep = stepCount     // 봄 도화선 시작
  if eb?.kind==='bird' && eb.hitAtStep==null: eb.hitAtStep = stepCount
  if rel ≤ DAMAGE.threshold(2): continue
  base = (rel − 2) × DAMAGE.scale(4)
  massFactor(body) = body.isStatic ? 1 : min(body.mass, DAMAGE.massCap(3))
  if ea && (ea.kind==='block' || ea.kind==='pig'): damage(ea, base × massFactor(B))
  if eb && (eb.kind==='block' || eb.kind==='pig'): damage(eb, base × massFactor(A))
```
새와 지형은 피해를 받지 않는다. 결과 감각(질량: 새≈1.5, 나무 기둥≈1.9, 돌 기둥≈3.5):
- 최대 속도 새(18)의 직격: 나무(60) 1방, 얼음(30) 1방, 돌(150) 2방, 모든 돼지 1방.
- 나무 기둥이 100px 높이에서 돼지 위로 낙하(v≈7.5): 약 42 피해 → 소/중 돼지 사망.
- 블록이 땅으로 100px 낙하: 약 22 피해 → 나무 생존, 얼음 생존(200px부터 파괴).
- 정지 접촉의 미세 진동은 threshold 2로 걸러진다.

### 11.2 파괴·제거
- `hp ≤ 0` → `dead=true`, 제거 예약, 이벤트 배출. 스텝 종료 후 body 제거 + 블록 제거 시 `wakeAll()`.
- 경계 밖(y > 900, x < −200, x > 1500): 돼지는 "제거됨"으로 점수 인정, 블록·새는 조용히 제거.

### 11.3 폭발 (`World.explode(cx, cy)`)
```
for b in dynamicBodies():  (b.gameEntity.kind === 'bird' 이면 건너뜀 — 봄 새 자신 제외)
  d = dist(b.position, (cx,cy)); if d ≥ EXPLOSION.radius(140): continue
  k = 1 − d/140
  dir = d < 1 ? (0,−1) : normalise(b.position − (cx,cy))
  Matter.Sleeping.set(b, false)
  Body.setVelocity(b, getVelocity(b) + dir × EXPLOSION.impulse(14) × k)
  e = b.gameEntity; e가 block/pig면 damage(e, EXPLOSION.damage(120) × k)
```
반경 안 나무·얼음·돼지는 대부분 파괴, 돌은 크게 손상(가까우면 파괴). 벽 관통(가림 판정 없음) — 6단계 벙커 설계의 전제.

### 11.4 턴 종료 판정 (FLYING 중 매 스텝)
- `settled = 모든 동적 body가 isSleeping 또는 speed < 0.3` 이면 `settleCounter++`, 아니면 0.
- 종료 조건: `(turnSec ≥ 1.0 && settleCounter ≥ 45)` **또는** `turnSec ≥ 10`.
- 종료 시 살아 있는 새 body 제거 → 돼지 0이면 WIN 진입, 큐 비었으면 FAIL 진입, 아니면 다음 새 장전.

### 11.5 클리어/실패
- **클리어**: 어느 시점이든(조준 중 늦은 붕괴 포함) 살아 있는 돼지 0 → ENDING(WIN) → 1.2초(72스텝, 물리는 계속) 후 결과. 보너스 = (큐에 남은 새 + 장전만 되고 미발사인 새) × 10000. 별: 클리어 1, `score ≥ star2` 2, `≥ star3` 3. `Storage.markCleared`.
- **실패**: 턴 종료 시점에 돼지가 남았고 큐가 비었음 → ENDING(FAIL) → 0.8초 후 결과(다시하기/메인으로). 실패는 저장하지 않는다.

### 11.6 점수
돼지 5000 / 나무 500 / 얼음 300 / 돌 800 / 클리어 시 남은 새 1마리당 10000. HUD와 결과 패널에 표시.

---

## 12. 일시정지·결과 오버레이 명세 (요구사항 3)

- 일시정지 버튼: HUD **우상단**(`right:16px; top:12px`) 56×56 DOM 버튼. PLAYING에서만 보이는 HUD의 일부(PAUSED에서도 HUD는 보이지만 오버레이가 위를 덮음).
- 클릭(또는 Esc) → `#overlay-pause`: 제목 "일시정지", 버튼 **계속하기**(`#btn-resume`), **다시하기**(`#btn-pause-restart`), **메인으로**(`#btn-pause-menu`). 배경은 반투명 검정으로 멈춘 장면이 비쳐 보인다.
- 일시정지 중: 물리 스텝 없음, 드래그 취소, 이펙트 정지, 렌더는 계속(정지화면).
- 다시하기: 같은 스테이지를 처음부터(점수 0, 새 전부 복구). 메인으로: 월드 폐기 후 MENU.
- 결과 오버레이(`#overlay-result`): 클리어 시 제목 "스테이지 클리어!", 별, 점수, **다음 스테이지**(10단계면 숨김), 다시하기, 메인으로. 실패 시 제목 "실패…", 다시하기, 메인으로.

---

## 13. 구현 순서 (구현자용)

파일을 이 순서로 쓰고, 각 파일을 쓸 때 앞 파일에서 정의한 이름만 참조한다.

1. `js/config.js` — §3 값 그대로.
2. `js/levels.js` — §9 그대로.
3. `js/storage.js` — §8.5.
4. `js/physics.js` — §8.6 + §11.1~11.3. 가장 중요한 파일. Matter API 이름을 §2.1과 대조.
5. `js/slingshot.js` — §8.7. 예측 공식 순서(감쇠→가속→위치) 확인.
6. `js/effects.js` — §8.8.
7. `js/render.js` — §8.9. 그리기 순서 준수, `vertices` 기반 다각형.
8. `js/game.js` — §8.10 + §11.4~11.6. 상태 전이 표(§7)와 1:1 대조.
9. `js/ui.js` — §8.11. DOM id를 §8.1과 1:1 대조.
10. `js/main.js` — §8.12 + §6.
11. `index.html` — §8.1, script 순서 §4, CDN fallback §2.1.
12. `css/style.css` — §8.2.
13. **정적 자체 검토**(§14)를 파일마다 수행하고, 발견한 불일치를 수정한다.

기능 우선순위(시간이 부족하면 뒤에서부터 축소하되, 축소했다면 보고할 것): 코어(발사·물리·파괴·클리어/실패·10스테이지·일시정지 오버레이) > 진행 저장·별 > 새 능력(척/봄) > 이펙트·잔상·손상 표시 > DPR 스케일링.
단, 6단계는 봄 폭발을 전제로 하므로 봄 능력을 빼면 6단계 벙커의 `stone plank(820,590)`를 `wood`로 바꿔야 한다.

---

## 14. 정적 자체 검토 체크리스트 (실행 없이 읽어서 확인)

- [ ] `index.html` script 순서 = Matter → fallback → config → levels → storage → physics → slingshot → effects → render → game → ui → main.
- [ ] 어떤 파일에도 `import`, `export`, `type="module"`이 없다. 모든 파일이 `window.AB = window.AB || {};`로 시작한다.
- [ ] 파일 최상위에서 다른 `AB.*`를 **호출**하는 코드가 없다(정의만). 유일한 예외는 `main.js`.
- [ ] `ui.js`가 참조하는 DOM id 전부가 `index.html`에 존재: `hud, hud-stage, hud-score, hud-birds, btn-pause, screen-menu, btn-start, screen-select, stage-grid, btn-select-back, overlay-pause, btn-resume, btn-pause-restart, btn-pause-menu, overlay-result, result-title, result-stars, result-score, btn-next, btn-result-restart, btn-result-menu, error-overlay, game, app`.
- [ ] `AB.CONFIG`에서 읽는 모든 키가 §3에 존재하고 철자가 같다.
- [ ] Matter 호출이 §2.1의 이름과 정확히 일치한다(특히 `normalise`, `Composite.allBodies`, `Sleeping.set`, `Body.getVelocity`).
- [ ] `Bodies.rectangle`/`circle`의 x, y를 중심으로 다룬다(왼쪽 위 아님).
- [ ] 충돌 콜백 안에서 `Composite.remove`를 호출하지 않는다(예약만). `afterStep`에서 제거하며, 배열 순회 중 제거는 복사본 위에서 한다.
- [ ] 블록 제거 후 `wakeAll()`이 호출된다. 폭발에서 `setVelocity` 전에 `Sleeping.set(b,false)`.
- [ ] 새는 `isStatic`을 쓰지 않으며 발사 시점에만 body가 생성된다. `addBird`가 `Composite.add` **후** `setVelocity`를 한다.
- [ ] PAUSED 동안 `Engine.update`가 호출되지 않고, 재개 시 `acc`가 0으로 리셋된다.
- [ ] 10개 `AB.LEVELS` 원소가 §9와 좌표까지 동일하고 `t ∈ {wood, ice, stone}`, `s ∈ BLOCK_SIZES 키`, `size ∈ {s,m,l}`, `birds 원소 ∈ {red, chuck, bomb}`.
- [ ] `finish()`의 별 계산과 `Storage.markCleared`의 해금(`min(10, id+1)`)이 맞다. 10단계 클리어 시 `#btn-next`가 숨겨진다.
- [ ] 모든 버튼 9개에 핸들러가 있고, 각 핸들러가 §7 전이표의 메서드를 호출한다.
- [ ] `#hud`는 `pointer-events:none`, 그 안 버튼은 `auto`. `.overlay`는 `pointer-events:auto`로 전체를 덮는다.
- [ ] `predict`의 감쇠 상수가 `BIRD.frictionAir`와 같은 값을 읽는다(하드코딩 아님).
- [ ] 숫자 표시에 `toLocaleString()` 등 예외 없는 API만 사용. `localStorage` 접근은 전부 try/catch.

---

## 15. 완료 판정 기준

### 15.1 기능 기준 (사용자가 Chrome/Safari에서 `index.html`을 열었을 때, 인터넷 연결 상태)
1. 메인 화면(제목 + **게임 시작**)이 보이고, 게임 시작 → 스테이지 선택 화면에 **10개 타일**이 보이며 1번만 해금되어 있다.
2. 1번 시작 → 새총에 새가 놓여 있고, 잡아 당기면 고무줄이 늘어나며 예측 점선이 보이고, 놓으면 새가 **포물선**으로 날아 **중력**으로 떨어지며 블록·돼지와 **충돌**하고 구조물이 밀리거나 무너진다. 충분히 강한 충격을 받은 블록은 균열 표시 후 파괴되고 파편·점수가 뜬다.
3. 돼지를 모두 없애면 "스테이지 클리어!" 오버레이(점수·별·**다음 스테이지**/다시하기/메인으로)가 뜨고 다음 스테이지가 해금된다. 새를 다 써도 돼지가 남으면 "실패…" 오버레이(다시하기/메인으로)가 뜬다.
4. 인게임 **우상단 일시정지 버튼**을 누르면 물리가 멈추고 오버레이에 **계속하기·다시하기·메인으로**가 나타나며, 각 버튼이 표기대로 동작한다. Esc도 동작한다.
5. 4·6단계에서 비행 중 화면을 탭하면 척은 가속, 봄은 폭발한다. 6단계 벙커 속 돼지를 폭발로 잡을 수 있다.
6. 10단계까지 순차 클리어 가능하며, 10단계 클리어 결과에는 다음 스테이지 버튼이 없다. 새로고침 후에도 해금·최고 점수·별이 유지된다.
7. 창 크기를 바꾸면 게임 화면이 비율을 유지하며 맞춰진다. 콘솔 에러가 없다.

### 15.2 코드 기준 (구현자가 실행 없이 스스로 확인해 보고할 것)
- §14 체크리스트 전 항목 통과.
- 파일 12개가 §4 경로에 존재. `AB.LEVELS.length === 10`.
- 구현자는 최종 보고에 "실행 검증은 하지 않았음"과 §14 결과, 축소한 범위(있다면)를 명시한다.

---

## 16. 위험과 완화

| 위험 | 완화 |
|---|---|
| CDN 접근 불가(오프라인) | 2중 CDN fallback + `#error-overlay` 안내. 근본 해결(로컬 번들)은 설치 불가로 범위 외 |
| `file://`에서 모듈 스크립트 차단 | 클래식 스크립트 + 전역 네임스페이스(§1) |
| 적층 구조 초기 흔들림/붕괴 | 정확히 맞닿는 좌표(§9 검증), `enableSleeping`, 로드 직후 60스텝 사전 정착 + 강제 수면 |
| 지지대가 제거된 뒤 위 블록이 공중에 떠 있음 | 블록 제거마다 `wakeAll()` |
| 새가 얇은 블록을 뚫음 | 최대 속도 18(부스트 상한 26) vs 반지름 18 + 두께 20 → 불가 |
| 턴이 끝나지 않음(굴러다니는 새) | 정착 판정 + 10초 상한 |
| 돼지에 닿을 수 없는 배치 | 도달 포락선으로 전 스테이지 검증. 6단계 벙커는 봄 폭발 전제 |
| 오버레이 아래로 드래그가 새어 들어감 | `.overlay { pointer-events:auto }` 전면 덮기 + `state` 체크 |
| 일시정지 후 재개 시 물리 점프 | 누적기 리셋, 프레임 dt 상한 0.1s, 프레임당 최대 4스텝 |
| 충돌 콜백 안 body 제거로 엔진 내부 상태 손상 | 제거 예약 → 스텝 후 처리 |
| `isStatic` 토글 시 질량 복원 문제 | 토글 자체를 하지 않음(새는 발사 때 생성) |
| 이벤트 핸들러에서 `gameEntity` 미정의(땅 등) | 모든 body에 엔티티를 붙이고, 그래도 null 체크 |

---

## 17. 범위 외 (이번 구현에서 하지 않음)
사운드, 이미지 에셋, 카메라 스크롤/줌, 파랑새 분열·흰새 알 등 추가 새, TNT, 스테이지 에디터, 모바일 전용 UI, 서버 저장, 자동 테스트. 필요하면 이 계획서의 상수·데이터 구조를 유지한 채 확장할 수 있다.
