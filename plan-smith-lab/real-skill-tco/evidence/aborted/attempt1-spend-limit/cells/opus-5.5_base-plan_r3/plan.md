# 웹 브라우저 앵그리버드 스타일 게임 — 구현 계획서

> 구현자: claude-opus-5-5. 참고할 문서는 이 계획서 하나뿐이다.
> 구현 환경: 파일 읽기/쓰기만 할 수 있다. 설치, 빌드, 실행, 테스트는 **불가능**하다.
> 따라서 이 계획은 두 가지를 전제로 한다. (1) 한 번도 실행해 보지 않은 코드가 첫 실행에서 동작해야 한다. (2) 튜닝이 불가능하므로 모든 수치는 이 문서에서 미리 계산해 확정한다.

---

## 0. 이 문서를 읽는 법 (구현자 필독)

- **우선순위**: ① 원 요구사항(§1) → ② 이 문서의 "필수" 항목 → ③ "권장" 항목. 둘이 충돌하면 앞의 것을 따른다.
- **수치는 바꾸지 않는다.** §6의 상수와 §13의 스테이지 좌표는 계산을 거쳐 서로 맞물리게 정했다(§8.2 보정표, §13.4 검증표). 실행해서 확인할 방법이 없으니 "더 좋아 보이는" 값으로 바꾸지 말 것. 정말 틀린 부분이 보이면 §17 절차로 원인을 확인한 뒤 가장 작은 범위만 고친다.
- **이름은 §4 계약표를 그대로 쓴다.** 파일끼리의 참조가 어긋나면 실행 전에는 잡아낼 수 없다.
- 작업은 §16 순서로 진행하고, 각 단계가 끝날 때마다 §17의 정적 검증을 한다.
- 이 문서에 나오는 수식과 절차는 사양이다. 코드는 구현자가 작성한다.

---

## 1. 요구사항과 추적표

| ID | 원 요구사항 | 충족 위치 |
|---|---|---|
| R1 | 스테이지 10단계 | `js/stages.js`의 `AB.STAGES` 10개(§13), 스테이지 선택 화면(§11), 클리어 시 다음 스테이지 해제(§14) |
| R2 | 게임시작 → 앵그리버드식 게임 시스템(새총 당겨 쏘기, 포물선·중력·충돌·구조물 파괴로 돼지 제거) | 메인 → 게임시작 → 스테이지 선택 → 인게임(§10). 물리(§7), 슬링샷(§9), 피해·파괴·점수·판정(§8) |
| R3 | 인게임 **우측**에 일시정지 버튼. 누르면 **다시하기 / 메인으로** 버튼 표시 | 우측 상단 `#btn-pause`(§11). 일시정지 오버레이에 `계속하기`·`다시하기`·`메인으로`(§10, §11) |

`계속하기`는 요구에 없던 추가 버튼이다. `다시하기`와 `메인으로`는 이 **정확한 라벨**로 반드시 있어야 한다.

---

## 2. 핵심 결정 요약 (요구 문서의 질문에 대한 답)

| 질문 | 결정 | 이유 |
|---|---|---|
| 물리 엔진 | **직접 구현.** Box2D-Lite(Erin Catto) 방식의 순차 임펄스 강체 엔진. 원과 회전 박스(OBB) 지원, 접촉 지속과 웜스타트, 수면(sleep), 스펙큘러티브 마진 | 라이브러리는 설치할 수 없고 CDN은 런타임 네트워크 의존이며 API 버전도 검증할 수 없다. 직접 구현하면 피해 계산 훅, 관통, 수면 규칙을 게임에 맞게 넣을 수 있다 |
| 렌더링 | **Canvas 2D** 하나에 절차적 도형으로 그린다(이미지 파일 없음). 메뉴·HUD·오버레이는 **DOM** | 에셋을 만들 수 없는 환경이다. DOM 버튼은 클릭 판정과 한글 렌더링에서 실수할 여지가 적다 |
| 모듈 방식 | ES 모듈을 쓰지 않는다. **클래식 `<script>` + 전역 네임스페이스 `window.AB`** | `file://`로 열면 `type="module"`이 CORS 때문에 로드되지 않는다. 사용자가 index.html을 더블클릭만 해도 동작해야 한다 |
| 카메라 | **고정.** 월드 40m × 22.5m를 화면 전체에 표시하고 팬·줌은 없다 | 카메라 버그 가능성을 없애고, 조준할 때 목표가 항상 보인다 |
| 스테이지 데이터 | 선언적 배열(프리셋 블록과 frame 헬퍼) → `Level.build`가 매번 새 월드를 만든다 | 다시하기와 전환이 "새로 빌드" 하나로 끝나서 상태가 새지 않는다 |
| 초기 구조물 안정성 | 모든 블록과 돼지가 **수면 상태로 시작**하고, 맞거나 지지대가 사라질 때 깨어난다 | 시작하자마자 탑이 흔들리거나 무너지는 전형적인 자작 엔진 버그를 구조적으로 막는다 |
| 슬링샷 UX | 새를 잡고 드래그해 반대 방향으로 발사한다. 최대 당김 3m, 세기는 당긴 거리에 비례한다. **초반 0.9초 궤적 점을 미리 표시**하고, 직전 발사의 궤적 흔적을 남긴다 | 조준을 돕되 퍼즐의 답까지 보여 주지는 않는다 |
| 피해 모델 | 충돌 직전 법선 접근속도를 쓴 에너지형 피해 `0.5·m_eff·(v−3)²`. 한 번의 충돌로 파괴되면 **관통**(속도 일부만 감쇠) | 무게와 속도에 비례하는 직관적인 결과가 나오고, 정지 접촉은 피해가 0이다 |
| 판정 | 돼지가 모두 죽으면 안정화를 기다린 뒤 클리어. 새가 다 떨어졌는데 돼지가 남아 있으면 안정화를 기다린 뒤 실패. 대기 시간에는 상한이 있다 | 앵그리버드와 같은 흐름이다. 무한 대기를 막는다 |
| 시간 | 모든 게임 타이머는 **시뮬레이션 시간**으로 센다. `setTimeout`·`setInterval`은 쓰지 않는다 | 일시정지가 모든 것을 정확히 멈추게 된다 |
| 완료 기준 | §18. 구현자의 정적 완료 조건과, 사람이 실행해 확인하는 수용 시나리오 두 층으로 나눈다 | 구현자는 실행할 수 없기 때문이다 |

---

## 3. 실행 환경 제약에서 나오는 원칙

1. **산출물 위치**: 이 plan.md와 같은 디렉터리의 `game/`, 즉 `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/opus-5.5/base-plan/r3/game/`. 작업 지시에서 다른 경로를 주면 그 경로를 쓴다. 이하 경로는 모두 `game/` 기준이다.
2. **의존성 0**: 외부 라이브러리, CDN, 웹폰트, 이미지, 오디오 파일을 모두 쓰지 않는다.
3. **`file://` 호환**: `fetch`, XHR, ES 모듈, Worker를 쓰지 않는다. 스테이지 데이터는 JS 파일 안에 넣는다.
4. **문법 수준**: ES2020까지(클래스, 화살표 함수, const/let, 템플릿 문자열, `?.`, `??`). 최상위 await와 import/export는 쓰지 않는다.
5. **파일 캡슐화**: 각 JS 파일 전체를 `(function () { 'use strict'; ... })();`로 감싼다. 첫 파일(config.js)만 `window.AB = {}`를 만들고, 나머지 파일은 `const AB = window.AB;`로 받아 쓴 다음 자기 모듈을 `AB.X = {...}` 형태로 붙인다. 최상위 `const`가 여러 파일에서 겹쳐 선언되는 SyntaxError를 막기 위해서다.
6. **지연 참조 규칙**: 다른 모듈의 함수는 **호출하는 시점에** `AB.Render.draw(...)`처럼 참조한다. 파일 최상위에서 다른 모듈을 구조분해해 두지 않는다. 예외는 config 상수로, 가장 먼저 로드되므로 최상위에서 참조해도 된다.
7. **루프 방어**: 메인 루프에서 `requestAnimationFrame`을 먼저 다시 예약하고, 그 뒤 업데이트와 렌더를 `try/catch`로 감싼다. 에러는 `console.error`로 남기되 같은 메시지는 한 번만 찍는다. 코드 어딘가에 버그가 있어도 버튼과 화면 전환은 계속 살아 있게 하려는 것이다.
8. **이벤트 리스너는 init에서 한 번만 등록**한다. 스테이지 시작이나 다시하기 때 등록하지 않는다.

---

## 4. 파일 구조, 로드 순서, 모듈 계약

```
game/
  index.html
  css/style.css
  js/config.js      AB.CFG, AB.MATERIALS, AB.BLOCK_SIZES, AB.PIG_TYPES, AB.PIG_COMMON, AB.BIRD_TYPES, AB.BIRD_COMMON
  js/physics.js     AB.Physics
  js/stages.js      AB.STAGES
  js/level.js       AB.Level
  js/sling.js       AB.Sling
  js/effects.js     AB.Effects
  js/storage.js     AB.Storage
  js/render.js      AB.Render
  js/ui.js          AB.UI
  js/input.js       AB.Input
  js/game.js        AB.Game
  js/selftest.js    AB.SelfTest
  js/main.js        부트스트랩
```

`index.html`의 `<script>` 순서는 위 목록 순서 그대로다(`config` → … → `main`). `defer`나 `async` 없이 `</body>` 직전에 둔다.

### 4.1 모듈 계약표 (이 이름을 정확히 쓴다)

| 모듈 | 공개 멤버 | 설명 |
|---|---|---|
| `AB.Physics` | `World` (클래스), `createBox(opts)`, `createCircle(opts)`, `collide(a, b)`, `distanceToBody(body, x, y)`, `computeAABB(body)` | §7 |
| `World` 인스턴스 | `bodies`, `arbiters`(Map), `preSolve`(함수 또는 null), `add(body)`, `remove(body)`, `step(dt)`, `wake(body)`, `neighbors(body)` | §7.2 |
| `AB.STAGES` | 길이 10인 배열 | §13 |
| `AB.Level` | `build(stageIndex)` → level 객체, `expand(stageDef)` → 원시 스펙 배열 | §13.2 |
| `AB.Sling` | `clampDrag(wx, wy)` → `{x, y, dist}`, `velocityFor(dragX, dragY)` → `{vx, vy, power}`, `predict(vx, vy)` → `[{x, y}]` | §9 |
| `AB.Effects` | `create()`, `debris(fx, x, y, color, n)`, `puff(fx, x, y, color, n)`, `popup(fx, x, y, text, color)`, `ring(fx, x, y, radius)`, `update(fx, dt)` | §12.4 |
| `AB.Storage` | `load()`, `get()`, `isUnlocked(stageIndex)`, `recordClear(stageIndex, score, stars)` | §14 |
| `AB.Render` | `init(canvas)`, `resize()`, `toWorld(cssX, cssY)`, `toScreen(wx, wy)`, `draw(game)`, 읽기 전용 `scale` | §5, §12 |
| `AB.UI` | `init()`, `applyState(game)`, `renderSelect()`, `updateHUD(game)`, `showClear(result)`, `showFail(result)`, `setHint(text 또는 null)` | §11 |
| `AB.Input` | `init(canvas)` | §9.1 |
| `AB.Game` | `init()`, `goMenu()`, `goSelect()`, `startStage(i)`, `restart()`, `nextStage()`, `pause()`, `resume()`, `onPointerDown(wx, wy, id)`, `onPointerMove(wx, wy, id)`, `onPointerUp(wx, wy, id)`, `onPointerCancel(id)`, `onKey(key)`, `onHidden()`, 상태 필드(§8.1) | §8, §10 |
| `AB.SelfTest` | `run()` → `{passed, failed, results}` | §15 |

`stageIndex`는 내부에서 모두 **0부터** 센다(0–9). 화면에 보일 때만 +1 한다.

---

## 5. 좌표계, 단위, 화면 변환

- **월드 단위는 미터**이고 **y축은 위쪽이 +**다. 지면 윗면이 y=0이다.
- **보이는 영역(VIEW)**: x ∈ [0, 40], y ∈ [−2, 20.5]. 폭 40, 높이 22.5, 비율 16:9. 아래쪽 2m는 흙이 보이는 영역이다.
- 캔버스는 창 전체를 채운다. CSS 크기가 `cssW × cssH`이면 백버퍼는 `round(cssW·dpr) × round(cssH·dpr)`로 둔다.
- `scale = min(cssW / 40, cssH / 22.5)` (CSS px/m), `offX = (cssW − 40·scale)/2`, `offY = (cssH − 22.5·scale)/2`.
- **toScreen(x, y)** = `(offX + x·scale, offY + (20.5 − y)·scale)`
- **toWorld(px, py)** = `((px − offX)/scale, 20.5 − (py − offY)/scale)`. px와 py는 캔버스 bounding rect 기준 CSS 좌표다.
- 매 프레임 시작 시 `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`을 적용한 뒤 CSS px 단위로 그린다.
- **회전**: 월드 각도는 반시계가 +다. 화면에서 바디를 그릴 때는 `translate(toScreen(x, y))` 다음 `rotate(−angle)`을 적용하고, 로컬 도형은 화면 방향(아래가 +y)으로 그린다. 눈처럼 "위쪽"에 있어야 하는 부위는 로컬 −y 쪽에 그린다.
- 레터박스 여백에도 하늘, 언덕, 지면이 이어서 그려지므로 검은 띠는 생기지 않는다(§12.1).
- 창 `resize` 이벤트가 오면 `Render.resize()`를 다시 계산한다.

---

## 6. 설정 상수 (`js/config.js`)

### 6.1 `AB.CFG`

| 이름 | 값 | 의미 |
|---|---|---|
| `VIEW` | `{x0: 0, y0: -2, w: 40, h: 22.5}` | §5 |
| `GRAVITY` | −20 | m/s², y 성분 |
| `DT` | 1/120 | 고정 물리 스텝 |
| `MAX_STEPS` | 12 | 한 프레임에 돌릴 최대 스텝 수 |
| `MAX_FRAME_DT` | 0.1 | 프레임 dt 상한(초) |
| `ITERATIONS` | 10 | 솔버 반복 횟수 |
| `BAUMGARTE` | 0.2 | 위치 보정 계수 |
| `SLOP` | 0.01 | 허용 침투(m) |
| `MARGIN` | 0.02 | 접촉 생성 마진(m). 맞닿아 있으면 이 값 이하로 떨어져 있어도 접촉으로 본다 |
| `REST_THRESH` | 1.0 | 이 속도(m/s) 이상으로 접근할 때만 반발 적용 |
| `WARM_DIST` | 0.1 | 웜스타트할 때 이전 접촉점과 매칭하는 거리 |
| `SLEEP_LIN` / `SLEEP_ANG` / `SLEEP_TIME` | 0.12 / 0.15 / 0.5 | 수면 조건(m/s, rad/s, s) |
| `WAKE_LIN` / `WAKE_ANG` | 0.3 / 0.5 | 깨어 있는 이웃이 이 속도를 넘으면 수면 바디를 깨운다 |
| `ANG_DAMP_BOX` / `ANG_DAMP_CIRCLE` | 0.3 / 1.5 | 각감쇠(1/s). 원에 주는 값은 구름 저항 역할 |
| `DMG_V_MIN` | 3.0 | 피해가 생기는 최소 접근속도 |
| `SLING` | `{AX: 6, AY: 3.3, MAX_DRAG: 3.0, MIN_DRAG: 0.4, MAX_SPEED: 28, GRAB_R: 1.5, MIN_Y: 0.35, PREVIEW_TIME: 0.9, PREVIEW_EVERY: 7}` | §9 |
| `BIRD_DONE_SPEED` / `BIRD_DONE_STILL` / `BIRD_MAX_LIFE` | 0.3 / 1.0 / 7 | 새 턴 종료 조건 |
| `NEXT_BIRD_DELAY` | 0.4 | 다음 새를 장전하기까지의 지연 |
| `SETTLE_LIN` / `SETTLE_ANG` / `SETTLE_HOLD` | 0.3 / 0.5 / 0.6 | 월드 안정화 판정 |
| `CLEAR_MAX_WAIT` / `FAIL_MAX_WAIT` | 2.5 / 4.0 | 종료 대기 상한(s) |
| `BOUNDS` | `{minX: -8, maxX: 48, minY: -6}` | 이 범위를 벗어난 바디는 제거한다 |
| `SCORE` | `{PIG: 5000, BIRD_BONUS: 10000}` | |
| `STAR_BLOCK_RATIO` | 0.3 | §8.5 |
| `EXPLOSION` | `{R: 3.5, DAMAGE: 700, IMPULSE: 20}` | 폭탄 새 |
| `BOOST` | `{FACTOR: 1.9, MAX: 38}` | 노란 새 |
| `FUSE` | 1.5 | 폭탄 새가 첫 충돌한 뒤 자동 폭발까지의 시간 |
| `GROUND` | `{cx: 20, cy: -5, w: 80, h: 10}` | 정적 지면 박스. 윗면 y=0, x −20~60 |
| `HINT_TIME` | 4.0 | 스테이지 힌트 표시 시간 |
| `TRAIL_EVERY` | 0.04 | 궤적 흔적 기록 간격(s) |
| `STORAGE_KEY` | `'slingbirds.progress.v1'` | |

### 6.2 `AB.MATERIALS`

| 키 | density | friction | restitution | hpPerArea | absorb | score | fill / stroke |
|---|---|---|---|---|---|---|---|
| `glass` | 1.0 | 0.4 | 0.1 | 26 | 0.25 | 300 | `rgba(170,220,255,0.6)` / `#5aa9d6` |
| `wood` | 0.8 | 0.7 | 0.1 | 75 | 0.45 | 500 | `#c8894a` / `#7a4e24` |
| `stone` | 2.4 | 0.8 | 0.05 | 450 | 0.7 | 800 | `#9aa0a6` / `#5f6368` |
| `ground` | – | 0.9 | 0.0 | – | – | – | 지면·지형용 |

- 블록 HP는 `Math.round(hpPerArea × w × h)`로 정한다.
- `absorb`는 이 재질이 관통당할 때 상대의 속도에서 깎는 비율이다(§8.3).

### 6.3 `AB.BLOCK_SIZES` (w × h, m)

| 키 | w × h | 용도 |
|---|---|---|
| `P2` | 0.4 × 2.0 | 기둥 |
| `P1` | 0.4 × 1.2 | 짧은 기둥 |
| `B24` | 2.4 × 0.4 | 보 |
| `B16` | 1.6 × 0.4 | 짧은 보 |
| `B40` | 4.0 × 0.4 | 긴 보 |
| `SQ` | 0.8 × 0.8 | 정사각 |
| `CB` | 0.4 × 0.4 | 작은 큐브(예비. 현재 스테이지에서는 쓰지 않음) |

**HP 확인표**(구현 결과와 대조할 값):

| | P2 | P1 | B24 | B16 | B40 | SQ | CB |
|---|---|---|---|---|---|---|---|
| glass | 21 | 12 | 25 | 17 | 42 | 17 | 4 |
| wood | 60 | 36 | 72 | 48 | 120 | 48 | 12 |
| stone | 360 | 216 | 432 | 288 | 720 | 288 | 72 |

### 6.4 돼지와 새

- `AB.PIG_COMMON` = `{density: 0.8, friction: 0.6, restitution: 0.2, absorb: 0.3}`
- `AB.PIG_TYPES`:
  - `small {r: 0.35, hp: 6}`
  - `normal {r: 0.45, hp: 10}`
  - `large {r: 0.6, hp: 18}`
  - `helmet {r: 0.45, hp: 24, helmet: true}`
- `AB.BIRD_COMMON` = `{density: 3.5, friction: 0.6, restitution: 0.3}`
- `AB.BIRD_TYPES`:
  - `red {r: 0.45, ability: null, color: '#d62828'}`
  - `yellow {r: 0.40, ability: 'boost', color: '#f5c518'}`
  - `black {r: 0.55, ability: 'bomb', color: '#2b2b2b'}`

---

## 7. 물리 엔진 명세 (`js/physics.js`)

Box2D-Lite의 구조를 따른다. 원본과 다른 점은 다섯 가지다. 원 도형 추가, 접촉 마진(스펙큘러티브 접촉), 거리 기반 웜스타트 매칭, 수면과 깨우기, preSolve 훅.

### 7.1 Body

- **필드**: `id, shape('box'|'circle'), hw, hh, r, x, y, angle, vx, vy, w, mass, invMass, inertia, invInertia, friction, restitution, isStatic, sleeping, sleepTime, angDamp, removed, data`
- `createBox({x, y, w, h, angle = 0, density, friction, restitution, isStatic = false})`
  - `hw = w/2`, `hh = h/2`
  - 동적 바디: `mass = density·w·h`, `inertia = mass·(w² + h²)/12`
  - `angDamp = CFG.ANG_DAMP_BOX`
- `createCircle({x, y, r, density, friction, restitution, isStatic = false})`
  - 동적 바디: `mass = density·π·r²`, `inertia = 0.5·mass·r²`
  - `angDamp = CFG.ANG_DAMP_CIRCLE`
- 정적 바디는 mass, invMass, inertia, invInertia가 모두 0이다.
- `sleeping`은 false, `removed`는 false로 시작한다. `data`는 호출자가 채운다(`{kind: ...}`).
- **id는 `World.add`에서 부여한다**(`world.nextId++`, 1부터).
- **AABB**: 박스는 `ex = |cos|·hw + |sin|·hh`, `ey = |sin|·hw + |cos|·hh`. 원은 r. 겹침 검사를 할 때는 양쪽 AABB를 `MARGIN`만큼 넓힌다.
- **실효 역질량**: 솔버에서 쓰는 역질량과 역관성은, 바디가 정적이거나 **수면 중이면 0**으로 본다. 수면 바디는 잠시 정적 바디처럼 다뤄진다.

### 7.2 World.step(dt)의 순서 (그대로 따른다)

1. **쌍 수집과 접촉 생성**
   - 제거되지 않은 모든 바디 쌍 (i < j)을 순회한다. **둘 다 정적인 쌍만 건너뛴다.** 수면–수면, 수면–정적 쌍도 계산하는데, 깨우기 전파와 제거 시 이웃 찾기에 접촉 그래프가 필요하기 때문이다. 바디는 최대 약 30개라 비용은 문제가 되지 않는다.
   - A는 id가 작은 쪽, B는 큰 쪽이다. 키는 `A.id·100000 + B.id`.
   - AABB가 겹치면 `collide(A, B)`를 호출한다. 접촉이 1개 이상 나오면 새 Map에 Arbiter를 넣는다. 이전 Map에 같은 키가 있으면 §7.4의 웜스타트 매칭을 한다.
   - 순회가 끝나면 `this.arbiters = newMap`으로 교체한다. 순회 중에 Map을 수정하지 않는다.
2. **깨우기 패스**: 각 Arbiter에서 한쪽이 "깨어 있는 동적 바디" X이고 다른 쪽이 수면 바디 Y일 때, `|vX| > WAKE_LIN` 또는 `|wX| > WAKE_ANG`이면 `wake(Y)`를 호출한다. 여기서 쓰는 속도는 중력을 적용하기 **전** 값, 즉 이전 스텝의 결과다.
3. **힘 적분**: 깨어 있는 동적 바디마다 `vy += GRAVITY·dt`, `w *= 1/(1 + dt·angDamp)`. 선형 감쇠는 없다. 비행 궤적이 예측선과 정확히 일치해야 하기 때문이다.
4. **사전 처리(pre-step)**: 적어도 한쪽이 깨어 있는 동적 바디인 Arbiter만 "활성"으로 본다. 활성 Arbiter마다 다음을 한다.
   1. 접촉점별로 §7.5의 `rA, rB, massN, massT`와 상대 법선속도 `vn`을 계산한다.
   2. `approach = max(0, max over contacts(−vn))`
   3. `this.preSolve`가 있으면 `disabled = preSolve(arb, approach)`. 훅은 모든 활성 Arbiter에 대해 **매 스텝** 호출된다.
   4. disabled가 아니면 접촉점별 `bias`(§7.5)를 계산하고 웜스타트 임펄스 `Pn·n + Pt·t`를 적용한다.
5. **반복 솔브**: `ITERATIONS`번 반복한다. 매번 활성이면서 disabled가 아닌 모든 Arbiter의 모든 접촉에 대해 법선 임펄스, 이어서 마찰 임펄스를 적용한다(§7.5).
6. **위치 적분**: 깨어 있는 동적 바디마다 `x += vx·dt`, `y += vy·dt`, `angle += w·dt`.
7. **수면 갱신**: 깨어 있는 동적 바디가 `|v| < SLEEP_LIN`이고 `|w| < SLEEP_ANG`이면 `sleepTime += dt`, 아니면 0으로 되돌린다. `sleepTime ≥ SLEEP_TIME`이 되면 `sleeping = true`로 하고 `vx = vy = w = 0`.

`step` 도중에는 바디를 추가하거나 제거하지 않는다. 파괴 처리는 step이 끝난 뒤 게임이 한다(§8.7).

### 7.3 충돌 검출 `collide(A, B)` → 접촉 배열

- 접촉 하나는 `{px, py, nx, ny, sep, Pn: 0, Pt: 0}`이다.
- **법선 n은 항상 A → B 방향**이다. `sep < 0`이면 침투, `0 ≤ sep ≤ MARGIN`이면 근접 접촉이다.
- 분기: 원–원, 박스–박스, 박스(A)–원(B), 원(A)–박스(B). 마지막 경우는 박스–원 함수를 (B, A) 순서로 부른 결과의 법선을 뒤집어서 쓴다.

**원–원**
- `d = pB − pA`, `dist = |d|`, `sep = dist − rA − rB`. `sep > MARGIN`이면 접촉 없음.
- `n = dist > 1e−9 ? d/dist : (0, 1)`
- 접촉점 = `pA + n·(rA + sep/2)`

**박스(Bx)–원(C)**: 법선은 박스에서 원 쪽을 향한다.
- 원 중심을 박스 로컬로 옮긴다: `d = Rᵀ(pC − pBx)`. `q = clamp(d, −h, h)`(성분별).
- **d ≠ q (원 중심이 박스 밖)**:
  - `diff = d − q`, `dist = |diff|`, `sep = dist − r`. `sep > MARGIN`이면 접촉 없음.
  - `nLocal = diff/dist`, 접촉점 로컬 좌표 = q.
- **d = q (원 중심이 박스 안)**:
  - `penX = hw − |d.x|`, `penY = hh − |d.y|`
  - `penX < penY`이면 `nLocal = (sgn(d.x), 0)`, 점 = `(sgn(d.x)·hw, d.y)`, `sep = −penX − r`
  - 아니면 `nLocal = (0, sgn(d.y))`, 점 = `(d.x, sgn(d.y)·hh)`, `sep = −penY − r`
  - sgn(0)은 +1로 본다.
- 법선은 `R·nLocal`, 접촉점은 `pBx + R·점`으로 월드 좌표에 돌려놓는다.

**박스–박스**: Box2D-Lite `Collide`를 이식한다. R은 회전 행렬로, `col1 = (cos, sin)`, `col2 = (−sin, cos)`이다.
1. `dp = pB − pA`, `dA = RAᵀ·dp`, `dB = RBᵀ·dp`, `C = RAᵀ·RB`, `absC = |C|`(성분별 절댓값)
2. `faceA = |dA| − hA − absC·hB`, `faceB = |dB| − absCᵀ·hA − hB`. 어느 성분이든 **MARGIN보다 크면** 접촉 없음. 원본의 0을 MARGIN으로 바꾼 것이다.
3. 축 선택. 순서는 A.x → A.y → B.x → B.y.
   - 먼저 `sep = faceA.x`, `normal = sgn(dA.x)·RA.col1`
   - `faceA.y > 0.95·sep + 0.01·hA.y`이면 A.y 축으로 바꾼다(`normal = sgn(dA.y)·RA.col2`).
   - B.x 축은 `faceB.x > 0.95·sep + 0.01·hB.x`일 때, B.y 축은 `faceB.y > 0.95·sep + 0.01·hB.y`일 때 각각 바꾼다. 법선은 `sgn(dB.k)·RB.colk`.
   - 어느 경우든 normal은 A → B 방향이다.
4. 기준면 설정
   - **A면(A.x 또는 A.y)일 때**
     - `front = dot(pA, normal) + hA.k`, `frontN = normal`
     - `sideN = RA.(다른 축 열)`, `side = dot(pA, sideN)`
     - `negSide = −side + hA.other`, `posSide = side + hA.other`
     - 사건(incident) 박스는 B다.
   - **B면일 때**
     - `frontN = −normal`, `front = dot(pB, frontN) + hB.k`
     - `sideN = RB.(다른 축 열)`, 나머지는 같은 방식
     - 사건 박스는 A다.
5. 사건 변(incident edge) 구하기
   - 사건 박스 로컬에서 `m = −(Rincᵀ·frontN)`
   - `|m.x| > |m.y|`일 때
     - `m.x > 0` → 꼭짓점 `(hx, −hy), (hx, hy)`
     - 그 외 → `(−hx, hy), (−hx, −hy)`
   - 그렇지 않을 때
     - `m.y > 0` → `(hx, hy), (−hx, hy)`
     - 그 외 → `(−hx, −hy), (hx, −hy)`
   - 두 꼭짓점을 `pInc + Rinc·v`로 월드 좌표에 옮긴다.
6. 클리핑
   - 선분을 평면 `(−sideN, negSide)`로 자르고, 이어서 `(sideN, posSide)`로 자른다.
   - 평면 `(n, off)`에 대한 거리는 `dot(n, v) − off`이고, 이 값이 0 이하인 점을 남긴다. 부호가 엇갈리면 보간점을 추가한다.
   - 어느 단계에서든 점이 2개 미만이면 접촉 없음.
7. 남은 두 점 각각에 대해 `sep = dot(frontN, v) − front`를 구한다. `sep ≤ MARGIN`이면 접촉으로 채택하고, 접촉점은 `v − sep·frontN`(기준면 위로 투영), 법선은 normal이다.

### 7.4 Arbiter와 웜스타트

- **필드**: `a, b, contacts[], friction = √(fa·fb), restitution = max(ea, eb), disabled`
- 매 스텝 새 접촉 배열이 나오면, 새 접촉점마다 이전 Arbiter의 접촉 가운데 **거리가 `WARM_DIST` 이내인 가장 가까운 점**의 `Pn, Pt`를 물려받는다. 없으면 0이다. feature ID는 쓰지 않는다.
- `disabled`는 매 스텝 false로 초기화한다.

### 7.5 솔버 공식 (접촉점 하나 기준)

**기호**
- 2D 외적 `cross(a, b) = a.x·b.y − a.y·b.x`
- `cross(w, r) = (−w·r.y, w·r.x)`
- `t = (n.y, −n.x)`
- `imA, iIA, imB, iIB`는 §7.1의 실효 역질량과 역관성

**사전 처리**
- `rA = p − pA`, `rB = p − pB`
- `massN = 1 / (imA + imB + iIA·cross(rA, n)² + iIB·cross(rB, n)²)`
- massT는 같은 식에 n 대신 t를 넣는다.
- 상대속도 `dv = (vB + cross(wB, rB)) − (vA + cross(wA, rA))`, `vn = dot(dv, n)`
- bias
  - `sep > 0`: `bias = −sep/dt`. 스펙큘러티브 접촉으로, 간격을 좁히는 만큼의 접근은 허용한다.
  - 그 외: `bias = (BAUMGARTE/dt)·max(0, −sep − SLOP)`
  - 추가로 `vn < −REST_THRESH`이면 `bias = max(bias, −restitution·vn)`
- 웜스타트: `P = Pn·n + Pt·t`를 적용한다.
  - `vA −= imA·P`, `wA −= iIA·cross(rA, P)`
  - `vB += imB·P`, `wB += iIB·cross(rB, P)`

**반복 1회**
1. 법선 임펄스
   - dv를 다시 계산하고 `vn = dot(dv, n)`
   - `dPn = massN·(−vn + bias)`
   - 누적 클램프: `Pn_new = max(Pn + dPn, 0)`. 실제로 적용할 양은 `Pn_new − Pn`이고, 그다음 `Pn = Pn_new`로 갱신한다.
   - `dPn·n`을 적용한다.
2. 마찰 임펄스
   - dv를 다시 계산하고 `vt = dot(dv, t)`
   - `dPt = massT·(−vt)`
   - 누적값을 `[−μ·Pn, μ·Pn]`으로 클램프한 뒤 차이만큼 `dPt·t`를 적용한다.

### 7.6 수면과 깨우기

- `wake(b)`: b가 정적이거나 이미 깨어 있으면 아무것도 하지 않는다. 아니면 스택으로 전파한다.
  1. `b.sleeping = false`, `b.sleepTime = 0`
  2. `neighbors(b)` 가운데 수면 중인 동적 바디를 모두 스택에 넣고, 같은 처리를 반복한다.
  - 결과적으로 한 구조물 전체가 한꺼번에 깨어난다. 정적 바디(지면)를 거쳐서는 전파되지 않는다.
- `neighbors(b)`: 현재 `arbiters`에서 b를 포함하는 쌍의 상대 바디 목록을 돌려준다. 전체 순회 방식이면 충분하다.
- 스테이지의 블록과 돼지는 **모두 `sleeping = true`로 생성한다.** 발사한 새는 깨어 있는 상태로 생성한다.
- 수면 바디의 속도는 항상 0이다. 게임이 수면 바디에 속도나 임펄스를 주려면 **먼저 `wake`를 호출한다**(폭발 등).

### 7.7 제거와 훅

- `remove(b)` (step 밖에서만 호출)
  1. `b.removed = true`
  2. b를 포함한 Arbiter의 상대 바디를 모두 `wake`한다. 지지대가 사라진 물체가 공중에 떠 있지 않게 하려는 것이다.
  3. 그 Arbiter들의 키를 먼저 모아 두었다가 Map에서 지운다.
  4. `bodies`에서 b를 뺀다.
- `preSolve(arb, approach)`: 게임이 설정한다. 반환값이 true면 그 Arbiter를 이번 스텝에서 무시한다(관통이나 유령 처리).
- `distanceToBody(body, x, y)`: 점에서 도형까지의 최단 거리이고, 점이 도형 안에 있으면 0이다.
  - 원: `max(0, |p − c| − r)`
  - 박스: 로컬로 옮겨 clamp한 점까지의 거리

---

## 8. 게임 규칙 (`js/game.js`)

### 8.1 엔티티와 게임 상태

**엔티티** (`body.data`에 연결)
- 지면: `{kind: 'ground'}`
- 지형: `{kind: 'terrain'}`
- 블록: `{kind: 'block', material, size, hp, maxHp, body, pendingDestroy: false}`
- 돼지: `{kind: 'pig', type, hp, maxHp, body, dead: false, pendingDestroy: false}`
- 새: `{kind: 'bird', type, body, launchedAt, collided: false, collideAt: 0, abilityUsed: false, stillTime: 0}`

**`AB.Game` 상태 필드**
- 진행: `state`, `stageIndex`, `level`, `score`, `simTime`, `acc`, `lastTs`
- 새총과 새: `sling {state: 'ready'|'dragging'|'empty', birdType, dragX, dragY, pointerId}`, `queue`(아직 장전하지 않은 새 타입 배열), `activeBird`(새 엔티티 또는 null), `nextBirdTimer`, `pendingAbility`
- 처리 대기: `destroyQueue`, `endPending`(null 또는 `{type: 'clear'|'fail', t, settled}`)
- 연출: `fx`, `trail`, `lastTrail`, `trailTimer`, `hintTimer`
- 결과와 디버그: `result`, `debug`, `debugDraw`

### 8.2 피해 모델 — preSolve 훅

`world.preSolve = (arb, approach) => {...}`의 처리 순서는 다음과 같다.

1. A나 B의 `data.pendingDestroy`가 true면 **true를 반환**한다. 이번 스텝에 이미 파괴가 확정된 바디는 유령처럼 통과시킨다.
2. 한쪽이 새이고 `collided`가 false면 `collided = true`, `collideAt = simTime`.
3. `approach ≤ DMG_V_MIN`이면 false를 반환한다.
4. `m_eff`를 구한다. 한쪽이 정적이면 다른 쪽의 mass, 둘 다 동적이면 `mA·mB/(mA + mB)`.
5. 피해량 `dmg = 0.5·m_eff·(approach − DMG_V_MIN)²`
6. A와 B 가운데 피해를 받는 쪽(kind가 'block' 또는 'pig')은 `hp −= dmg`. 새, 지면, 지형은 피해를 받지 않는다.
   - hp가 0 이하가 되면 `pendingDestroy = true`로 하고 `destroyQueue`에 넣는다.
7. 이번 호출에서 파괴된 쪽이 있으면 **관통**(§8.3)을 적용하고 true를 반환한다. 없으면 false.

**보정표** (구현을 확인할 때와 수치를 바꾸고 싶어질 때 참고한다. 빨강 새 질량 2.227, 일반 돼지 0.509)

| 상황 | 접근속도 | m_eff | 피해 | 결과 |
|---|---|---|---|---|
| 빨강 20 m/s → 나무 B24 (0.768kg, HP 72) | 20 | 0.571 | 82.5 | 파괴·관통 |
| 빨강 16 m/s → 나무 B24 | 16 | 0.571 | 48 | 손상만 |
| 빨강 12 m/s → 유리 B24 (HP 25) | 12 | 0.671 | 27 | 파괴 |
| 빨강 28 m/s(최대) → 돌 B24 (HP 432) | 28 | 1.132 | 354 | 버팀(빨강은 돌을 못 부순다) |
| 일반 돼지 3m 낙하 (HP 10) | 10.95 | 0.509 | 16.1 | 사망 |
| 일반 돼지 2m 낙하 | 8.94 | 0.509 | 9.0 | 생존(손상) |
| 빨강 10 m/s → 일반 돼지 | 10 | 0.414 | 10.1 | 사망 |
| 나무 B24가 2m 낙하해 일반 돼지 위로 | 8.94 | 0.306 | 5.4 | 손상 |
| 정지 접촉과 떨림 | ≤ 0.2 | – | 0 | 피해 없음 |

### 8.3 파괴와 관통

- 훅 안에서 X가 파괴되고 상대 Y가 동적 바디면 `k = 1 − absorb(X)`를 구하고 `Y.vx *= k`, `Y.vy *= k`, `Y.w *= k`. 이 Arbiter는 disabled다.
- absorb는 블록이면 재질값, 돼지면 `PIG_COMMON.absorb`다.
- 이 규칙 덕분에 새가 유리나 나무를 뚫고 지나가며 느려진다.
- `processDestroyQueue()`는 step 직후에 호출한다. 큐의 각 엔티티에 대해 다음을 하고, 끝나면 큐를 비운다.
  1. 이미 `body.removed`면 건너뛴다.
  2. `world.remove(body)`
  3. 돼지면 `dead = true`, `score += SCORE.PIG`, 초록 퍼프와 팝업 `+5000`
  4. 블록이면 `score += material.score`, 재질 색 파편 10개와 팝업
- **경계 이탈**: 동적 바디가 `x < BOUNDS.minX`, `x > BOUNDS.maxX`, `y < BOUNDS.minY` 가운데 하나에 해당하면 제거한다.
  - 돼지는 사망으로 처리하고 점수도 준다.
  - 블록은 점수 없이 제거한다.
  - 새는 턴 종료(§8.4)로 처리한다.

### 8.4 새의 수명과 능력

**발사** (§9에서 호출)
- 새 타입에 맞는 원 바디를 `(SLING.AX, SLING.AY)`에 만든다. 속도는 `velocityFor`의 결과를 쓰고 수면 상태는 false로 둔다.
- 월드에 추가하고 `activeBird`를 설정한다.
- `sling.state = 'empty'`, `trail = []`, `hintTimer = 0`(힌트를 숨긴다).

**매 스텝 `updateActiveBird(dt)`**
1. `body.removed`면(폭발이나 경계 이탈) 턴을 종료한다.
2. 폭탄 새이고 아직 능력을 쓰지 않았을 때
   - `collided`이고 `simTime − collideAt ≥ FUSE`면 폭발한다.
   - `simTime − launchedAt ≥ BIRD_MAX_LIFE`여도 폭발한다.
   - 이 상태의 폭탄 새에는 아래 정지 판정을 적용하지 않는다. 폭발하기 전에 조용히 사라지는 일을 막기 위해서다.
3. 그 밖의 새
   - 속도가 `BIRD_DONE_SPEED`보다 작으면 `stillTime += dt`, 아니면 0.
   - `stillTime ≥ BIRD_DONE_STILL`이거나 `simTime − launchedAt ≥ BIRD_MAX_LIFE`면 턴을 종료한다. 바디를 제거하고 깃털 퍼프를 낸다.
4. 궤적 흔적: 첫 충돌 전까지 `TRAIL_EVERY`마다 새 위치를 `trail`에 추가한다(최대 200개).

**턴 종료**
1. 바디가 아직 있으면 제거한다.
2. `lastTrail = trail`, `activeBird = null`
3. `endPending`이 없고 `queue`가 비어 있지 않으면 `nextBirdTimer = NEXT_BIRD_DELAY`.

**다음 새 장전**
- `nextBirdTimer`가 0 이하로 떨어지면 `loadNextBird()`를 호출한다.
- `loadNextBird()`: `endPending`이 있거나 queue가 비어 있으면 아무것도 하지 않는다. 아니면 `sling.birdType = queue.shift()`, `sling.state = 'ready'`.

**능력** (비행 중 캔버스 탭 → `pendingAbility = true`. 다음 fixedUpdate의 첫 단계에서 처리한다)
- `yellow`(가속): `!collided && !abilityUsed`일 때만 쓸 수 있다.
  - `s = |v|`. s < 0.01이면 무시한다.
  - 새 속력 = `min(s·BOOST.FACTOR, BOOST.MAX)`. 방향은 그대로 둔다.
  - 새 위치에 흰색 퍼프를 낸다.
- `black`(폭발): `!abilityUsed`면 충돌 전이든 후든 쓸 수 있다. `explode(bird)`를 호출한다.
- `red`: 능력 없음. 탭은 무시한다.
- 공통: 쓰고 나면 `abilityUsed = true`.

**`explode(bird)`**
1. 폭심 `c`는 새의 현재 위치다.
2. 월드의 동적 바디(새 자신과 제거된 바디는 제외)마다 `d = distanceToBody(b, c)`를 구한다. `d < R`이면 다음을 한다.
   - `f = 1 − d/R`
   - `world.wake(b)`
   - 방향 `u = normalize(b 중심 − c)`. 길이가 0이면 (0, 1).
   - `b.v += u·(IMPULSE·f)·b.invMass`, `b.w += (Math.random() − 0.5)·4·f`
   - 피해를 받는 대상이면 `hp −= DAMAGE·f²`. 0 이하가 되면 파괴 큐에 넣는다.
3. 새 바디를 제거하고 링과 파편 연출을 낸다. `processDestroyQueue()`를 호출한 뒤 턴을 종료한다.

**폭발 보정** (d는 표면까지의 거리)

| d | 0.55(접촉) | 1.0 | 2.0 | 3.0 |
|---|---|---|---|---|
| 피해 | 497 | 357 | 129 | 14 |

- 접촉한 채 터지면 돌 보(HP 432)도 부서진다.
- 나무 B40은 2m 거리까지 부서진다.
- 일반 돼지는 약 3m 이내에서 죽는다.

### 8.5 점수와 별

- 돼지 5000점, 블록은 유리 300 / 나무 500 / 돌 800점.
- 클리어할 때 남은 새 한 마리당 10000점을 더한다. 남은 새 = `queue.length + (sling.state !== 'empty' ? 1 : 0)`.
- 스테이지를 빌드할 때 기준 점수를 미리 구한다.
  - `pigTotal = 돼지 수 × 5000`
  - `blockTotal = Σ 블록 점수`
  - `star2 = pigTotal + round(STAR_BLOCK_RATIO·blockTotal)`
  - `star3 = star2 + 10000`
- 별 개수: 클리어하면 1개. `score ≥ star2`면 2개, `score ≥ star3`면 3개.

### 8.6 종료 판정 `checkEnd(dt)`

- `pigsAlive = level.pigs` 중 `!dead`인 수
- **endPending이 없을 때**
  - `pigsAlive === 0`이면 `endPending = {type: 'clear', t: 0, settled: 0}`. 드래그 중이었다면 취소해서 `sling.state = 'ready'`로 되돌린다.
  - 그렇지 않고 `pigsAlive > 0`이면서 다음 조건이 모두 참이면 `endPending = {type: 'fail', t: 0, settled: 0}`.
    - `sling.state === 'empty'`
    - `!activeBird`
    - `queue.length === 0`
    - `nextBirdTimer ≤ 0`
- **endPending이 있을 때**
  1. `t += dt`
  2. 월드가 안정 상태면 `settled += dt`, 아니면 0. 안정 상태란 제거되지 않은 모든 동적 바디가 수면 중이거나, `|v| < SETTLE_LIN`이면서 `|w| < SETTLE_ANG`인 경우다.
  3. `type === 'fail'`인데 `pigsAlive === 0`이 되었으면 `type = 'clear'`, `t = 0`으로 바꾼다.
  4. `settled ≥ SETTLE_HOLD`이거나 `t ≥ (clear면 CLEAR_MAX_WAIT, fail이면 FAIL_MAX_WAIT)`면 확정한다.
- **클리어 확정**
  1. 보너스를 더한다.
  2. 별을 계산한다.
  3. `Storage.recordClear(stageIndex, score, stars)`
  4. `result = {stageIndex, score, bonus, birdsLeft, stars, best, isLast: stageIndex === 9}`
  5. `setState('clear')`
- **실패 확정**: `result = {stageIndex, pigsLeft}`, `setState('fail')`.
- endPending 중에는 새총 드래그를 받지 않는다. 비행 중인 새의 능력 탭은 받는다.

### 8.7 `fixedUpdate(dt)` 순서 (고정)

1. `simTime += dt`
2. `pendingAbility`가 있으면 능력을 처리하고 플래그를 끈다.
3. `level.world.step(dt)`
4. `processDestroyQueue()`
5. 경계 이탈 검사
6. `updateActiveBird(dt)`
7. 다음 새 타이머
8. `Effects.update(fx, dt)`
9. `checkEnd(dt)`
10. 힌트 타이머. 다 되면 `UI.setHint(null)`.

---

## 9. 슬링샷 입력과 궤적 예측 (`js/sling.js`, `js/input.js`)

- 앵커(새가 놓이는 자리)는 `A = (6, 3.3)`이다.
- **잡기**: 조건은 `state === 'playing'`, `sling.state === 'ready'`, `!endPending`, 그리고 포인터가 앵커에서 `GRAB_R`(1.5m) 이내일 것. 조건이 맞으면 `sling.state = 'dragging'`으로 바꾸고 pointerId를 기록한다.
- **`clampDrag(wx, wy)`**
  1. `d = (wx, wy) − A`
  2. `|d| > MAX_DRAG`이면 `d = d/|d|·MAX_DRAG`
  3. 드래그 점의 y가 `MIN_Y`보다 작으면 y를 MIN_Y로 올린다.
  4. `dist`를 다시 계산해 `{x, y, dist}`를 반환한다.
- **`velocityFor(dragX, dragY)`**: `d = drag − A`
  - 속도는 `v = −d·(MAX_SPEED/MAX_DRAG)`. 당긴 반대 방향이고 세기는 당긴 거리에 비례한다.
  - `power = |d|/MAX_DRAG`
- **놓기**
  - `dist < MIN_DRAG`이면 취소한다(`sling.state = 'ready'`).
  - 아니면 §8.4의 발사를 한다. 새는 **앵커 위치에서** 출발한다. 드래그 위치에서 출발하면 지면과 겹칠 수 있기 때문이다.
- **`predict(vx, vy)`**
  - 앵커에서 시작해 k = 1…⌊PREVIEW_TIME/DT⌋ 동안 매번 `vy += GRAVITY·DT; x += vx·DT; y += vy·DT`를 반복한다. 물리 스텝과 같은 반암시적 오일러라서 결과가 정확히 일치한다.
  - k가 `PREVIEW_EVERY`의 배수일 때만 점을 기록한다.
  - y < 0이 되면 멈춘다.
  - 드래그 중에는 매 프레임 렌더러가 호출한다. `dist ≥ MIN_DRAG`일 때만 표시한다.
- 드래그 중인 새는 드래그 점에 그리고, 고무줄은 두 갈래 끝에서 새까지 그린다(§12.3).
- 일시정지, 창 숨김, 스테이지 전환, 클리어 대기가 시작되면 드래그를 취소한다.

### 9.1 `AB.Input.init(canvas)`

- `canvas`의 `pointerdown`
  - `e.preventDefault()`
  - `rect = canvas.getBoundingClientRect()`로 좌표를 구하고 `Render.toWorld`로 월드 좌표를 얻어 `Game.onPointerDown(wx, wy, e.pointerId)`를 호출한다.
- `window`의 `pointermove`, `pointerup`, `pointercancel` → 각각 `Game.onPointerMove`, `Game.onPointerUp`, `Game.onPointerCancel`
- `window`의 `keydown` → `Game.onKey(e.key)`
- `document`의 `visibilitychange`: hidden이 되면 `Game.onHidden()`
- **`Game.onPointerDown`의 판정 순서**
  1. state가 'playing'이 아니면 무시한다.
  2. `activeBird`가 있고 능력을 쓸 수 있으면 `pendingAbility = true`로 하고 끝낸다.
  3. 잡기 조건(§9)을 검사한다.
- **`Game.onKey`**
  - `Escape` 또는 `p`: playing이면 pause, paused면 resume.
  - 디버그 모드에서만: `d`는 디버그 드로우 토글, `k`는 살아 있는 돼지를 모두 파괴 큐에 넣는다(흐름 테스트용).

---

## 10. 상태 머신과 화면 흐름

상태는 `'menu' | 'select' | 'playing' | 'paused' | 'clear' | 'fail'`이다. 인게임 세부 상태는 `sling.state`와 `endPending`으로 표현한다.

| 현재 | 이벤트 | 다음 | 동작 |
|---|---|---|---|
| (부팅) | init 완료 | menu | |
| menu | `게임시작` | select | `UI.renderSelect()` |
| select | 해제된 스테이지 n 클릭 | playing | `startStage(n)` |
| select | `뒤로` | menu | |
| playing | `#btn-pause` / Esc / 창 숨김 | paused | 드래그 취소. 시뮬레이션 정지 |
| paused | `계속하기` / Esc | playing | `acc = 0` |
| paused | `다시하기` | playing | `startStage(현재)`로 처음부터 다시 빌드 |
| paused | `메인으로` | menu | `level = null` |
| playing | 클리어 확정 | clear | 저장, 결과 표시 |
| playing | 실패 확정 | fail | |
| clear | `다음 스테이지` (마지막 스테이지 제외) | playing | `startStage(n+1)` |
| clear / fail | `다시하기` | playing | `startStage(현재)` |
| clear / fail | `메인으로` | menu | `level = null` |

- **`startStage(i)`**: 이전 상태를 하나도 재사용하지 않는다.
  1. `level = Level.build(i)`
  2. `world.preSolve`에 훅을 연결한다.
  3. `score = 0`, `simTime = 0`, `acc = 0`
  4. `queue = def.birds.slice()`, `activeBird = null`, `nextBirdTimer = 0`, `pendingAbility = false`, `destroyQueue = []`, `endPending = null`
  5. `fx = Effects.create()`, `trail = []`, `lastTrail = []`
  6. `loadNextBird()`
  7. 힌트가 있으면 `hintTimer = HINT_TIME`으로 하고 `UI.setHint(hint)`
  8. `setState('playing')`
- **`setState(s)`는 UI 동기화를 한곳에서 처리한다.** `state = s`로 바꾼 다음 `UI.applyState(this)`를 호출한다. 다른 곳에서 DOM의 표시 여부를 직접 바꾸지 않는다.
- **일시정지 의미**: paused, clear, fail에서는 `fixedUpdate`를 호출하지 않는다. 렌더러는 멈춘 월드를 계속 그리고, 그 위에 오버레이가 덮인다. 타이머와 연출도 모두 시뮬레이션 시간 기준이라 함께 멈춘다.
- **메인 루프** (`requestAnimationFrame`, init에서 한 번만 시작)
  1. `dt = min(MAX_FRAME_DT, (ts − lastTs)/1000)`, `lastTs = ts`. `lastTs`는 상태와 관계없이 매 프레임 갱신한다. 그래야 일시정지를 풀 때 큰 dt가 들어오지 않는다.
  2. playing이면 `acc += dt`. 이어서 `acc ≥ DT`이고 스텝 수가 `MAX_STEPS` 미만인 동안 `fixedUpdate(DT)`를 돌리고 `acc −= DT`. 스텝 수가 상한에 닿으면 `acc = 0`.
  3. `UI.updateHUD(this)`, `Render.draw(this)`
  4. 전체를 §3-7의 try/catch로 감싼다.

---

## 11. DOM과 UI (`index.html`, `css/style.css`, `js/ui.js`)

### 11.1 요소 id 목록 (ui.js가 참조하는 id는 여기 있는 것만 쓴다)

| id | 요소 | 내용 |
|---|---|---|
| `app` | div | 전체 컨테이너 |
| `game-canvas` | canvas | |
| `hud` | div | 인게임 HUD. 전체 화면을 덮지만 `pointer-events: none` |
| `hud-stage` | span | "스테이지 3 · 나무 요새" |
| `hud-score` | span | "점수 12,340" |
| `hud-hint` | div | 화면 상단 중앙의 힌트 문구 |
| `btn-pause` | button | **우측 상단**, "❚❚", `aria-label="일시정지"`, `pointer-events: auto` |
| `screen-menu` | div | 타이틀 "앵그리 버드", 부제 "새총으로 돼지들을 물리쳐라!" |
| `btn-start` | button | "게임시작" |
| `screen-select` | div | 제목 "스테이지 선택" |
| `stage-grid` | div | 스테이지 버튼 10개를 동적으로 생성(5×2) |
| `btn-select-back` | button | "뒤로" |
| `overlay-pause` | div | 제목 "일시정지" |
| `btn-resume` | button | "계속하기" |
| `btn-restart` | button | "다시하기" |
| `btn-main` | button | "메인으로" |
| `overlay-clear` | div | 제목 "스테이지 클리어!" |
| `clear-stars` | div | ★ 3개. 획득한 별은 금색, 나머지는 회색 ☆ |
| `clear-score` | div | "점수 45,300 (남은 새 보너스 +20,000)" |
| `clear-best` | div | "최고 점수 45,300" |
| `clear-msg` | div | 마지막 스테이지일 때만 "모든 스테이지를 클리어했습니다!" |
| `btn-next` | button | "다음 스테이지". 마지막 스테이지에서는 숨김 |
| `btn-clear-restart` | button | "다시하기" |
| `btn-clear-main` | button | "메인으로" |
| `overlay-fail` | div | 제목 "스테이지 실패" |
| `fail-msg` | div | "남은 돼지: 2마리" |
| `btn-fail-restart` | button | "다시하기" |
| `btn-fail-main` | button | "메인으로" |

### 11.2 레이아웃과 스타일

- `html, body`: `margin: 0; height: 100%; overflow: hidden; background: #000;`
  - 폰트는 `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`
  - `user-select: none`
- `#app`: `position: fixed; inset: 0`
- 캔버스: `position: absolute; inset: 0; width: 100%; height: 100%; display: block; touch-action: none`
- `.hidden { display: none !important; }`
- `#hud`: `position: absolute; inset: 0; pointer-events: none`
  - 좌상단에 스테이지명과 점수를 흰 글씨(검은 그림자)로 표시한다.
- **`#btn-pause`**: `position: absolute; top: 16px; right: 16px; width: 56px; height: 56px; border-radius: 12px; pointer-events: auto`. 반투명 흰 배경에 큰 글자. 이것이 요구사항 R3의 "우측"이다.
- `.screen`(메뉴와 선택 화면)과 `.overlay`
  - `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center`
  - 오버레이 배경은 `rgba(0, 0, 0, 0.45)`. 그 안에 `.panel`(흰색, 둥근 모서리, 세로로 버튼 나열)을 둔다.
  - 메뉴 배경은 투명해서 캔버스 배경 그림이 비친다.
- 버튼: 최소 높이 52px, 폰트 20px 이상, 굵게, 주황 계열 배경. 잠긴 스테이지 버튼은 `disabled`에 회색으로 표시하고 "잠김"이라고 쓴다.

### 11.3 `AB.UI`

- **`init()`**
  - 위 요소들을 캐시한다.
  - 버튼마다 `click` 리스너를 **한 번만** 등록한다. 각 리스너는 `AB.Game`의 대응 메서드를 호출하고 `e.currentTarget.blur()`를 한다.
  - 연결: `btn-start → goSelect`, `btn-select-back → goMenu`, `btn-pause → pause`, `btn-resume → resume`, `btn-restart`와 `btn-clear-restart`와 `btn-fail-restart → restart`, `btn-main`과 `btn-clear-main`과 `btn-fail-main → goMenu`, `btn-next → nextStage`
- **`applyState(game)`**: 상태별 표시 규칙. 여기에 적힌 것 외에는 모두 숨긴다.
  - menu: `screen-menu`
  - select: `screen-select`
  - playing: `hud`, `btn-pause`
  - paused: `hud`, `overlay-pause` (btn-pause는 숨김)
  - clear: `hud`, `overlay-clear` (호출 직전에 `showClear(game.result)`로 내용을 채운다)
  - fail: `hud`, `overlay-fail` (`showFail`로 내용을 채운다)
- **`renderSelect()`**
  - `stage-grid`를 비우고 버튼 10개를 만든다.
  - 버튼 내용은 번호, `Storage.get().best`의 별, 최고 점수다.
  - 잠긴 스테이지는 disabled로 둔다. 해제된 스테이지의 클릭은 `Game.startStage(i)`에 연결한다.
  - 버튼을 매번 새로 만드므로 리스너가 쌓이지 않는다.
- **`updateHUD(game)`**
  - 문자열을 만들어 이전 값과 다를 때만 DOM에 쓴다.
  - 숫자는 `toLocaleString('ko-KR')`로 표기한다.
- **`setHint(text)`**: null이면 숨기고, 아니면 표시한다.

---

## 12. 렌더링 (`js/render.js`, `js/effects.js`)

### 12.1 그리기 순서 (매 프레임)

1. **하늘**: 화면 공간 전체에 세로 그라디언트(`#5ec8f2` → `#d9f2fb`)
2. **원경**: 월드 좌표에 고정한 구름 5개(흰 원 3–4개 겹침, 알파 0.9)와 먼 언덕 3개(큰 타원, `#a8d88a`). 레터박스까지 자연스럽게 이어지도록 폭을 넉넉히 잡는다.
3. **지면**: y=0 아래에서 화면 끝까지 가로 전체를 흙색 `#8d6e4a`로 채우고, 위쪽 0.3m에 풀 `#6ab04c`를 칠한다.
4. **지형 박스**: 흙색 본체에 윗면 0.25m 풀띠
5. **새총 뒤쪽**: 오른쪽 갈래와 뒤 고무줄
6. **블록 → 돼지 → 비행 중인 새**
7. **장전된 새, 앞 고무줄, 왼쪽 갈래**
8. **대기 중인 새들**: `queue`의 i번째 새를 `(4.8 − 1.1·i, r)`에 놓아 지면 위에 앉힌다.
9. **궤적 흔적**: `lastTrail`과 현재 `trail`을 반지름 0.07m 흰 점(알파 0.7)으로 그린다. **예측점**: 반지름 0.13m에서 0.05m로 줄고 알파 0.9에서 0.3으로 옅어진다.
10. **연출**: 파편, 퍼프, 폭발 링, 점수 팝업
11. **디버그 드로우**(`debugDraw`일 때)
    - 모든 바디 외곽선: 깨어 있으면 빨강, 수면 중이면 회색
    - 접촉점
    - FPS

- menu와 select 상태에서는 1–3번과 새총만 그린다(`level`이 null).
- 선 두께는 `max(1, 0.05·scale)` px를 기준으로 삼는다.

### 12.2 바디 그리기

- **블록**
  - 재질의 fill과 stroke로 사각형을 그린다.
  - 나무: 긴 축 방향으로 결 2줄
  - 돌: 반점 4개. 위치는 `body.id`를 시드로 한 결정적 PRNG(mulberry32)로 정한다. 매 프레임 `Math.random`을 쓰면 반점이 깜빡인다.
  - 유리: 대각선 하이라이트 1줄
  - 균열: `hp/maxHp < 0.66`이면 1개, `< 0.33`이면 3개. 모양은 시드 PRNG로 만든 꺾은선이다.
- **돼지**
  - 초록 원(`#7ac943`)에 진한 외곽선
  - 로컬 위쪽에 귀 2개, 흰 눈 2개와 검은 동공, 가운데에 연두 코(타원과 콧구멍 2개)
  - 헬멧 돼지: 위쪽 반원 회색 헬멧
  - 체력이 50% 미만이면 한쪽 눈을 찡그리고 멍 자국을 그린다.
- **새**: 타입 색의 원, 흰 눈과 동공, 검은 눈썹, 주황 삼각 부리, 꼬리 깃털 3개
  - 빨강: 배를 밝은 색으로
  - 노랑: 몸통을 조금 삼각형 느낌으로 장식
  - 폭탄: 머리 위에 심지. 충돌 후 심지가 타는 동안에는 몸통이 빨갛게 깜빡인다(주기 0.15초).
- 모든 바디는 `rotate(−angle)`을 적용해 회전 상태로 그린다.

### 12.3 새총

- 갈색(`#6b3e1f`) 기둥이 (6, 0)에서 (6, 2.4)까지 올라가고, 두 갈래가 왼쪽 끝 L = (5.7, 3.55)와 오른쪽 끝 R = (6.3, 3.55)까지 뻗는다.
- 고무줄: 짙은 갈색, 두께 0.16m
  - 새가 장전되어 있으면 R → 새, 새 → L 순서로 그려서 새가 고무줄 사이에 끼어 보이게 한다.
  - 비어 있으면 L과 R을 직선으로 잇는다.
- 드래그 중에는 새를 드래그 점에, 장전만 된 상태에서는 앵커에 그린다.

### 12.4 `AB.Effects` (시뮬레이션 시간으로 갱신)

- `fx = {particles: [], popups: [], rings: []}`
- **`debris`**: 한 변 0.1–0.25m인 사각 조각. 속도는 무작위로 2–7 m/s 범위이고 위쪽으로 치우친다. 중력을 받으며 회전하고 수명은 0.9초다. 충돌 처리는 하지 않는다.
- **`puff`**: 반지름이 커지다가 사라지는 원. 0.6초.
- **`popup`**: 텍스트가 1초 동안 1m 올라가며 사라진다. 폰트는 굵게 `0.6·scale` px.
- **`ring`**: 0.3초 동안 반지름이 0에서 R까지 커진다. 주황 채움에 알파가 줄어든다.
- `update`는 수명이 다한 항목을 제거한다. 배열을 역순으로 순회하며 splice한다.

---

## 13. 스테이지 데이터 (`js/stages.js`, `js/level.js`)

### 13.1 형식

스테이지 하나는 `{name, birds: [...], hint (없으면 null), terrain: [[cx, yb, w, h], ...], items: [...]}`이다. items의 각 항목은 아래 튜플 중 하나다.

- `['frame', postMat, beamMat, cx, yb]`
- `['wide', postMat, beamMat, cx, yb]`
- `['small', postMat, beamMat, cx, yb]`
- `['block', mat, sizeKey, cx, yb]`
- `['pig', type, cx, yb]`

`yb`는 **바닥면의 y**다. 중심 y는 `yb + h/2`(원이면 `yb + r`)로 코드에서 계산한다. 쌓을 때는 높이만 더하면 되므로 좌표 실수가 줄어든다.

### 13.2 헬퍼 확장 규칙 (`Level.expand`)

| 헬퍼 | 생성 블록 | x 범위 | 윗면 | 내부 빈 공간 |
|---|---|---|---|---|
| `frame` | P2(postMat) 2개 @ (cx±1.0, yb), B24(beamMat) @ (cx, yb+2.0) | cx±1.2 | yb+2.4 | 폭 1.6, 높이 2.0 |
| `wide` | P2 2개 @ (cx±1.8, yb), B40 @ (cx, yb+2.0) | cx±2.0 | yb+2.4 | 폭 3.2, 높이 2.0 |
| `small` | P1 2개 @ (cx±0.6, yb), B16 @ (cx, yb+1.2) | cx±0.8 | yb+1.6 | 폭 0.8, 높이 1.2 |

위 표의 좌표는 (중심 x, 바닥 y)다.

`Level.build(i)` 순서:
1. `new World()`를 만든다.
2. 지면 정적 박스를 추가한다(`CFG.GROUND`, 재질 ground, data `{kind: 'ground'}`).
3. 지형 정적 박스를 추가한다(중심 `(cx, yb + h/2)`).
4. `expand` 결과대로 블록과 돼지를 **수면 상태로** 만든다. 각 엔티티를 `level.blocks`와 `level.pigs`에 넣고 `body.data`에 연결한다.
5. `pigTotal`, `blockTotal`, `star2`, `star3`를 계산한다.
6. `{stageIndex, def, world, blocks, pigs, pigTotal, blockTotal, star2, star3}`를 반환한다.

**확장 예시** (구현을 검산할 때 쓴다) — 스테이지 1의 결과:
- 나무 P2: 중심 (24, 1.0), (26, 1.0)
- 나무 B24: 중심 (25, 2.2)
- 일반 돼지: 중심 (25, 0.45), (25, 2.85)

### 13.3 10개 스테이지

| # | name | birds | hint |
|---|---|---|---|
| 1 | 첫 발사 | red, red, red | "새를 뒤로 끌었다가 놓으면 발사됩니다. 돼지를 모두 없애세요!" |
| 2 | 유리 오두막 | red, red, red | "유리는 쉽게 깨집니다." |
| 3 | 나무 요새 | red, red, red | "구조물 아래쪽을 노리면 무너뜨릴 수 있어요." |
| 4 | 노란 새 | yellow, red, yellow | "노란 새: 날아가는 중 화면을 누르면 급가속!" |
| 5 | 돌의 무게 | red, yellow, red, red | "돌은 단단합니다. 받침을 무너뜨리세요." |
| 6 | 폭탄 새 | black, red, black | "폭탄 새: 날아가는 중 누르거나, 부딪히고 잠시 뒤 폭발!" |
| 7 | 언덕 위의 성 | red, yellow, red, black | "높은 곳에서 떨어지면 돼지도 버티지 못해요." |
| 8 | 3층 탑 | red, black, yellow, red | null |
| 9 | 쌍둥이 요새 | red, yellow, black, red, yellow | null |
| 10 | 최후의 성 | red, yellow, black, red, black | null |

**items와 terrain** (나열한 순서대로 넣는다)

- **S1**
  - terrain 없음
  - `frame(wood, wood, 25, 0)`
  - `pig(normal, 25, 0)`, `pig(normal, 25, 2.4)`
- **S2**
  - terrain 없음
  - `frame(glass, glass, 22, 0)`, `pig(normal, 22, 2.4)`
  - `frame(glass, glass, 29, 0)`, `frame(glass, glass, 29, 2.4)`
  - `pig(small, 29, 0)`, `pig(normal, 29, 4.8)`
- **S3**
  - terrain 없음
  - `block(wood, SQ, 23, 0)`, `block(wood, SQ, 23, 0.8)`
  - `wide(wood, wood, 28, 0)`, `frame(wood, wood, 28, 2.4)`
  - `pig(normal, 28, 0)`, `pig(normal, 28, 2.4)`, `pig(small, 28, 4.8)`
- **S4**
  - terrain 없음
  - `block(wood, SQ, 23, 0)`, `block(wood, SQ, 23, 0.8)`, `block(wood, SQ, 23, 1.6)`, `block(wood, SQ, 23, 2.4)`
  - `frame(wood, glass, 31, 0)`, `frame(glass, wood, 31, 2.4)`
  - `pig(normal, 31, 0)`, `pig(normal, 31, 2.4)`, `pig(small, 31, 4.8)`
- **S5**
  - terrain 없음
  - `frame(stone, stone, 24, 0)`, `pig(small, 24, 0)`, `pig(normal, 24, 2.4)`
  - `frame(wood, wood, 32, 0)`, `frame(stone, stone, 32, 2.4)`
  - `pig(normal, 32, 2.4)`, `pig(helmet, 32, 4.8)`
- **S6**
  - terrain 없음
  - `wide(stone, stone, 29, 0)`, `small(stone, stone, 29, 2.4)`
  - `pig(normal, 28.2, 0)`, `pig(normal, 29.8, 0)`, `pig(small, 29, 2.4)`, `pig(helmet, 29, 4.0)`
  - `frame(wood, wood, 35, 0)`, `pig(normal, 35, 0)`
- **S7**
  - terrain `[31, 0, 8, 3]`
  - `block(wood, SQ, 23, 0)`, `block(wood, SQ, 23, 0.8)`
  - `frame(wood, wood, 29.5, 3)`, `frame(glass, glass, 32.5, 3)`
  - `pig(normal, 29.5, 3)`, `pig(normal, 29.5, 5.4)`, `pig(small, 32.5, 3)`, `pig(normal, 32.5, 5.4)`
- **S8**
  - terrain 없음
  - `wide(stone, wood, 29, 0)`, `wide(wood, wood, 29, 2.4)`, `frame(glass, glass, 29, 4.8)`
  - `pig(large, 29, 0)`, `pig(normal, 29, 2.4)`, `pig(normal, 29, 4.8)`, `pig(helmet, 29, 7.2)`
  - `small(wood, wood, 35, 0)`, `pig(small, 35, 0)`, `pig(normal, 35, 1.6)`
- **S9**
  - terrain `[33, 0, 6, 1.6]`
  - `frame(stone, wood, 23.5, 0)`, `frame(wood, glass, 23.5, 2.4)`
  - `pig(helmet, 23.5, 0)`, `pig(normal, 23.5, 2.4)`, `pig(normal, 23.5, 4.8)`
  - `wide(stone, stone, 33, 1.6)`, `frame(glass, wood, 33, 4.0)`
  - `pig(large, 33, 1.6)`, `pig(normal, 33, 4.0)`, `pig(helmet, 33, 6.4)`
- **S10**
  - terrain `[34, 0, 8, 2]`
  - `block(stone, SQ, 21, 0)`, `block(stone, SQ, 21, 0.8)`, `block(stone, SQ, 21, 1.6)`
  - `frame(wood, stone, 25.5, 0)`, `frame(glass, wood, 25.5, 2.4)`
  - `pig(normal, 25.5, 0)`, `pig(helmet, 25.5, 2.4)`, `pig(small, 25.5, 4.8)`
  - `wide(stone, wood, 34, 2)`, `wide(wood, stone, 34, 4.4)`, `frame(glass, glass, 34, 6.8)`
  - `pig(large, 34, 2)`, `pig(normal, 34, 4.4)`, `pig(helmet, 34, 6.8)`, `pig(normal, 34, 9.2)`

### 13.4 검증표 (계획 단계에서 계산을 마쳤다. 구현 후 `SelfTest`가 같은 항목을 다시 검사한다)

| # | 돼지 | 블록 | 구조물 x 범위 | 최고 돼지 중심 y | 비고 |
|---|---|---|---|---|---|
| 1 | 2 | 3 | 23.8–26.2 | 2.85 | |
| 2 | 3 | 9 | 20.8–23.2, 27.8–30.2 | 5.25 | |
| 3 | 3 | 8 | 22.6–23.4, 26–30 | 5.15 | 위 frame 기둥 26.8–27.2, 28.8–29.2가 B40(26–30) 위에 놓인다 |
| 4 | 3 | 10 | 22.6–23.4, 29.8–32.2 | 5.15 | |
| 5 | 4 | 9 | 22.8–25.2, 30.8–33.2 | 5.25 | |
| 6 | 5 | 9 | 27–31, 33.8–36.2 | 4.45 | 바닥 돼지 두 마리의 x 범위 27.75–28.65, 29.35–30.25는 내부 27.4–30.6 안에 있다 |
| 7 | 4 | 8 | 22.6–23.4, 지형 27–35 (28.3–30.7, 31.3–33.7) | 5.85 | |
| 8 | 6 | 12 | 27–31, 34.2–35.8 | 7.65 | |
| 9 | 6 | 12 | 22.3–24.7, 지형 30–36 (31–35) | 6.85 | |
| 10 | 7 | 18 | 20.6–21.4, 24.3–26.7, 지형 30–38 (32–36) | 9.65 | |

- **도달성**: 발사점 (6, 3.3), 최대속도 28, g = 20일 때 도달 가능한 높이의 포락선은 `y ≤ 3.3 + 19.6 − 0.01276·(x − 6)²`이다. x = 35에서 12.2m, x = 34에서 12.9m이므로 모든 돼지가 1m 이상 여유를 두고 도달 가능하다.
- **겹침**: 모든 쌓기는 윗면 = 다음 층 바닥면으로 정확히 맞닿아 있고(sep = 0), 서로 다른 구조물의 x 범위는 겹치지 않는다. 돼지는 내부 빈 공간의 폭과 높이보다 작다(small 0.7, normal·helmet 0.9, large 1.2).

---

## 14. 저장 (`js/storage.js`)

- 키는 `CFG.STORAGE_KEY`, 값은 JSON `{unlocked: 1..10, best: {"<stageIndex>": {score, stars}}}`.
- **`load()`**
  - `try { JSON.parse(localStorage.getItem(key)) } catch`로 읽는다.
  - 값을 검증한다. `unlocked`는 1–10 범위의 정수로 clamp하고, `best`는 객체여야 한다.
  - 읽기에 실패하면 `{unlocked: 1, best: {}}`로 시작한다. localStorage를 쓸 수 없는 환경(사파리 비공개 모드 등)에서는 메모리에만 보관한다.
- **`isUnlocked(i)`**: `debug`면 항상 true, 아니면 `i < unlocked`.
- **`recordClear(i, score, stars)`**
  1. `unlocked = max(unlocked, min(10, i + 2))`
  2. 최고 점수는 더 높을 때만 갱신한다. stars는 기존 값과 비교해 큰 쪽을 남긴다.
  3. 저장도 try/catch로 감싼다.
  4. 갱신된 best를 반환한다.
- 디버그 모드의 전체 해제는 저장하지 않는다.

---

## 15. 디버그와 셀프테스트 (`js/selftest.js`, `js/main.js`)

- **`main.js`**
  1. `DOMContentLoaded`에서 `AB.Game.init()`을 호출한다.
  2. URL에 `debug=1`이 있으면 `Game.debug = true`로 하고 `AB.SelfTest.run()`을 실행해 결과를 `console.table`로 출력한다.
  3. 디버그 모드에서는 화면 좌하단에 "SELFTEST n/m PASS" 문구를 캔버스에 그린다.
- **`Game.init()`**
  1. `Storage.load()`
  2. `Render.init(canvas)`
  3. `UI.init()`
  4. `Input.init(canvas)`
  5. `resize` 리스너 등록
  6. `setState('menu')`
  7. rAF 루프 시작
- **`SelfTest.run()` 항목** (각 항목을 try/catch로 감싸 PASS/FAIL과 메시지를 기록한다)
  1. `AB.STAGES.length === 10`. 각 스테이지에 새가 1–5마리, 돼지가 1마리 이상 있다.
  2. 각 스테이지에 대해 `Level.build(i)`가 예외 없이 끝나고, 돼지 수와 블록 수가 §13.4와 같다.
  3. 겹침 검사: 각 스테이지에서 정적–정적을 뺀 모든 쌍에 `collide`를 호출해 `sep < −0.005`인 접촉이 없어야 한다.
  4. 도달성 검사: 모든 돼지 중심이 §13.4의 포락선보다 1m 이상 아래에 있다.
  5. 낙하 안정성: 지면 위 y = 3에 1×1 나무 박스(깨어 있음)를 두고 240스텝을 돌린다. `|y − 0.5| < 0.03`, `|angle| < 0.02`이고, 수면 중이거나 속도가 0.05 미만이어야 한다.
  6. 적층 안정성: `frame(wood, wood, 25, 0)`을 **깨어 있는 상태로** 만들고 360스텝을 돌린다. 보의 위치 변화가 0.03 미만, 각도 변화가 0.02 미만이어야 한다.
  7. 예측 일치: 빈 월드(지면만)에서 새를 `velocityFor(A + (−2, −1.5))`로 발사하고 60스텝 뒤의 위치를 `predict`의 해당 점과 비교한다. 오차가 1e−6 이하여야 한다(PREVIEW_EVERY 배수 스텝에서 비교).
  8. 피해 보정: 정적 지면 위 y = 3.45에 일반 돼지를 깨어 있는 상태로 두고(3m 낙하), 이 월드에 게임과 같은 피해 훅을 연결해 돌린다. 돼지가 파괴 판정을 받아야 한다. 2m 낙하에서는 살아남아야 한다.
- 셀프테스트는 게임 상태를 건드리지 않는다. 자기만의 World를 만들어 쓴다.
- 피해 훅은 `Game` 안의 함수를 테스트에서도 재사용할 수 있게 `AB.Game.makePreSolve(ctx)` 같은 팩토리로 분리한다. 팩토리가 받는 ctx는 destroyQueue, simTime 접근자, onBirdCollide를 담는다. 이 팩토리는 §4.1 계약표에 추가되는 유일한 항목이다.

---

## 16. 구현 순서 (마일스톤)

각 단계가 끝나면 §17.2의 해당 체크 항목을 확인한다.

1. **M1 뼈대**
   - `index.html`, `style.css`, `config.js`
   - `storage.js`, `ui.js`, `input.js`(골격), `render.js`(배경, 지면, 새총만), `game.js`(상태 머신, 루프, 빈 스테이지), `main.js`
   - 메뉴 → 선택 → (빈) 인게임 → 일시정지 → 다시하기/메인으로 흐름을 완성한다. R3는 이 단계에서 끝난다.
2. **M2 물리** `physics.js` 전체. §17.1의 손 계산 T3–T6을 코드와 대조한다.
3. **M3 스테이지** `stages.js`, `level.js`, 렌더러의 블록과 돼지 그리기. 확장 예시(§13.2)를 코드로 따라가며 검산한다.
4. **M4 새총** `sling.js`, 드래그, 예측점, 발사, 새 수명, 대기열 표시, 궤적 흔적.
5. **M5 규칙** 피해 훅, 파괴와 관통, 점수와 팝업, `effects.js`, 종료 판정, 클리어·실패 오버레이, 저장과 잠금 해제.
6. **M6 능력** 노란 새 가속, 폭탄 새 폭발.
7. **M7 마감** 그림 다듬기(균열, 표정, 헬멧), 힌트, 디버그 드로우, `selftest.js`.
8. **M8 최종 정적 검증** §17 전체와 §18-A를 모두 통과시킨다.

---

## 17. 정적 검증 절차 (실행할 수 없으니 대신 이것을 한다)

### 17.1 손 계산 트레이스 (코드 경로를 따라가 아래 기대값이 나오는지 확인한다)

- **T1 화면 변환**
  - 창이 1280×720일 때 `scale = 32`, `offX = offY = 0`
  - 앵커 (6, 3.3) → (192, 550.4)
  - 지면 y = 0 → py = 656
  - 월드 (0, 20.5) → (0, 0)
- **T2 드래그 → 속도**
  - 화면 (160, 600) → 월드 (5.0, 1.75)
  - `d = (−1, −1.55)`, `|d| = 1.845 ≤ 3`
  - `v = (9.33, 14.47)`: 오른쪽 위로 발사된다. 부호가 반대로 나오면 버그다.
- **T3 원–박스 법선**
  - S1의 위쪽 돼지(id 큼, 원)와 보(id 작음, 박스): A = 보, B = 돼지
  - 로컬 `d = (0, 0.65)` → `q = (0, 0.2)`, `diff = (0, 0.45)`, `sep = 0`
  - `n = (0, 1)`(A → B), 접촉점 (25, 2.4)
- **T4 박스–박스(보가 기둥 위에 놓인 경우)**
  - S1의 왼쪽 기둥 A (24, 1.0, h (0.2, 1.0))와 보 B (25, 2.2, h (1.2, 0.2))
  - `faceA = (−0.4, 0)`, `faceB = (−0.4, 0)`
  - 축은 A.y로 정해진다(0 > 0.95·(−0.4) + 0.01·1.0).
  - `normal = (0, 1)`, `front = 2.0`, `negSide = −23.8`, `posSide = 24.2`
  - 사건 변은 보의 아랫변 (23.8, 2.0)–(26.2, 2.0). 클리핑하면 (23.8, 2.0)과 (24.2, 2.0)이 남는다.
  - `sep = 0`. 결과는 **접촉 2개, 위치는 기둥 윗모서리, 법선 (0, 1)**이다.
- **T5 정지 접촉 솔브**
  - 지면 A(정적) 위의 돼지 B. 중력 적용 후 `vB.y = −0.1667`, `vn = −0.1667`
  - `rB = (0, −0.45)`, `cross(rB, n) = 0`이므로 `massN = mB`
  - `bias = 0`, `dPn = mB·0.1667 > 0`
  - 적용하면 `vB.y = 0`이 된다. 부호가 틀리면 바디가 바닥을 뚫고 떨어진다.
- **T6 수면 시작 → 타격 → 깨우기**
  - S1 로드 직후 모든 블록과 돼지가 수면 중이므로 step에서 아무것도 움직이지 않는다.
  - 새가 왼쪽 기둥에 닿는 스텝에서는 깨우기 패스가 기둥 → 보 → 위쪽 돼지까지 전파한다. 아래쪽 돼지는 지면에만 닿아 있으므로 깨어나지 않는다.
  - 같은 스텝의 pre-step에서 approach ≈ 발사속도가 되어 피해가 계산된다.
- **T7 흐름**
  - playing에서 `btn-pause`를 누르면 `setState('paused')`. `fixedUpdate`가 호출되지 않고 오버레이가 보인다.
  - `다시하기` → `startStage(같은 i)`로 월드를 새로 만들고 점수 0에서 다시 시작한다.
  - `메인으로` → menu, `level = null`
- **T8 클리어**
  - S1에서 첫 발로 돼지 둘을 죽인 경우: pending 상태에서 settled 0.6초가 쌓이거나 2.5초가 지나면 확정한다.
  - 보너스는 2 × 10000(queue에 1마리, 장전된 1마리)
  - `star2 = 10000 + 450`, `star3 = 20450`이므로 별 3개다.
  - `unlocked = 2`가 된다.

### 17.2 교차 참조 체크리스트 (파일 전체를 다시 읽으며 확인한다)

- [ ] `index.html`의 스크립트 순서가 §4와 같고, `type="module"`, `import`, `export`, `require`가 없다.
- [ ] 모든 JS 파일이 IIFE로 감싸져 있고, `window.AB`를 만드는 것은 config.js뿐이다.
- [ ] ui.js의 모든 `getElementById`와 querySelector id가 §11.1 표에 있고, index.html에도 실제로 있다(한 줄씩 대조).
- [ ] 모든 `AB.<모듈>.<멤버>` 호출이 §4.1 계약표 이름과 정확히 같다(철자, 인자 순서).
- [ ] 파일 최상위 실행 코드가 다른 모듈을 참조하지 않는다(config 제외).
- [ ] `setTimeout`, `setInterval`이 없다.
- [ ] `addEventListener`는 `UI.init`, `Input.init`, `Game.init`, `main.js`에만 있다. 예외는 `renderSelect`가 새로 만든 버튼에 붙이는 것뿐이다.
- [ ] `#hud`는 `pointer-events: none`, `#btn-pause`는 `auto`다. 이것이 틀리면 새총 입력이 막힌다.
- [ ] 벡터 정규화와 나눗셈(원–원 dist, 박스–원 dist, 폭발 방향, 부스트 속력, massN과 massT의 분모)에 0 가드가 있다.
- [ ] `World.step` 안에서 바디를 추가하거나 제거하지 않는다. `remove`는 step 밖에서만 호출된다.
- [ ] Map을 순회하는 도중에 그 Map을 수정하지 않는다.
- [ ] 정적 바디와 수면 바디의 실효 역질량이 솔버에서 0이다.
- [ ] 새 바디를 만들 때 `sleeping = false`, 스테이지 바디를 만들 때 `sleeping = true`.
- [ ] 수면 바디의 속도를 바꾸는 모든 코드(폭발, 관통 감속)가 먼저 `wake`를 호출하거나, 대상이 깨어 있음이 보장된다.
- [ ] 상태 전이표(§10)의 모든 행이 구현되어 있고, 모든 버튼이 연결되어 있다.
- [ ] `startStage`가 §10에 나열된 필드를 모두 초기화한다.
- [ ] 드래그 취소가 pause, onHidden, 클리어 대기 시작, startStage에서 호출된다.
- [ ] 괄호, 중괄호, 쉼표를 확인한다. 특히 stages.js의 긴 배열 리터럴은 항목 수를 §13.4와 대조한다.

---

## 18. 완료 판정 기준

### A. 구현자 완료 조건 (정적. 모두 충족해야 "구현 완료")

1. §4의 파일 14개가 모두 있다.
2. §17.1의 T1–T8을 코드 경로로 따라가 기대값을 확인했다.
3. §17.2의 체크리스트를 모두 통과했다.
4. §6의 모든 상수가 config.js에 같은 이름과 값으로 들어 있다. §13.3의 10개 스테이지 데이터가 순서와 수치까지 그대로 옮겨져 있다.
5. `TODO`, 미구현 스텁, 쓰지 않는 함수가 남아 있지 않다.
6. 마지막 보고에는 만든 파일 목록과 각 파일의 책임을 한 줄씩 적는다. 그리고 "실행 검증은 하지 못했다"는 사실과, 사람이 확인해야 할 §18-B 시나리오를 명시한다.

### B. 실행 수용 기준 (사람이나 이후 검증자가 브라우저로 확인. 최신 Chrome, Safari, Firefox 기준)

| # | 시나리오 | 기대 결과 |
|---|---|---|
| B1 | `game/index.html`을 더블클릭해서(`file://`) 연다 | 메인 화면(타이틀, 게임시작)이 뜨고 콘솔 에러가 0이다 |
| B2 | `index.html?debug=1` | 콘솔에서 SelfTest 8개 항목이 모두 PASS다 |
| B3 | 게임시작 → 스테이지 선택 | 1만 해제되어 있고 2–10은 잠겨 있다(debug면 모두 해제) |
| B4 | 스테이지 1 진입 | 구조물과 돼지가 **전혀 움직이지 않고** 정지해 있다. 새총에 빨강 새, 뒤에 2마리가 대기한다. 힌트가 보인다 |
| B5 | 새를 잡고 뒤로 끌기 | 고무줄이 늘어나고, 최대 3m에서 더 끌리지 않으며, 예측 점이 표시된다 |
| B6 | 놓기 | 포물선으로 비행하고, 궤적이 예측 점과 일치하며, 흔적이 남는다. 살짝 끌었다 놓으면 발사가 취소된다 |
| B7 | 구조물에 명중 | 블록이 밀리고 넘어지고 부서지며 점수 팝업이 뜬다. 돼지가 제거되면 +5000 |
| B8 | 모든 돼지 제거 | 잠시 뒤 클리어 오버레이(별, 점수, 보너스)가 뜨고 다음 스테이지가 해제된다 |
| B9 | 새를 모두 썼는데 돼지가 남음 | 실패 오버레이(남은 돼지 수, 다시하기, 메인으로) |
| B10 | 인게임 **우측 상단** 일시정지 버튼 | 시뮬레이션이 완전히 멈춘다(날던 새도 공중에 멈춤). `계속하기`, `다시하기`, `메인으로`가 보인다 |
| B11 | 일시정지 → 다시하기 | 같은 스테이지의 초기 상태, 점수 0, 새가 가득 찬 상태로 돌아간다 |
| B12 | 일시정지 → 메인으로 | 메인 화면으로 간다. 다시 게임시작을 눌러도 정상 동작한다 |
| B13 | Esc 키, 창을 다른 탭으로 전환 | 일시정지된다 |
| B14 | 노란 새(스테이지 4)가 비행 중 탭 | 눈에 띄게 가속한다. 충돌한 뒤에는 탭해도 반응이 없다 |
| B15 | 폭탄 새(스테이지 6)가 비행 중 탭, 또는 충돌 후 1.5초 | 폭발 링이 나오고 주변 블록과 돼지가 튕겨 나가며 파괴된다 |
| B16 | 스테이지 1–10을 모두 진입(debug) | 각 스테이지가 §13.3 배치대로 표시되고, 초기에 무너지거나 겹치는 곳이 없다 |
| B17 | 새로고침 | 해제 상태와 최고 점수, 별이 유지된다 |
| B18 | 창 크기 변경, 세로로 긴 창 | 16:9 월드가 비율을 유지한 채 가운데 정렬되고, 드래그 좌표가 어긋나지 않는다 |
| B19 | debug에서 `k` | 즉시 클리어 흐름이 진행된다. 스테이지 10을 클리어하면 "모든 스테이지를 클리어했습니다!"가 뜨고 다음 버튼은 숨겨진다 |
| B20 | 터치 기기 | 드래그로 발사하고 탭으로 능력을 쓸 수 있으며, 페이지가 스크롤되거나 확대되지 않는다 |

B1–B12와 B16이 **필수 수용선**이다(요구사항 R1–R3에 직결). 나머지는 품질 기준이다.

**알려진 한계**: 난이도 밸런스는 계산으로만 맞췄고 플레이테스트는 하지 않았다. 너무 어렵거나 쉬우면 §6의 `MAX_SPEED`, `DMG_V_MIN`, 재질 `hpPerArea`를 조정하면 된다. 모두 config.js 한 파일에 있다.

---

## 19. 범위 밖 (하지 않는다)

- 사운드와 음악
- 카메라 팬·줌
- 이미지 에셋
- 레벨 에디터
- 추가 새 종류(파랑 분열 등), TNT, 경사면·삼각형 블록
- 온라인 기능과 랭킹
- 다국어(한국어만 지원)
- 빌드 도구, 패키지 매니저, 테스트 프레임워크
