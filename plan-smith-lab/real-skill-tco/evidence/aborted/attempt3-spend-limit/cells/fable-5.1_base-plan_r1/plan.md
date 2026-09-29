# 웹 브라우저 앵그리버드 구현 계획서

- 대상 구현자: claude-fable-5-1
- 구현자 제약: **이 문서만 읽고**, 파일 읽기/쓰기 도구만으로 작업한다. 설치·빌드·실행·테스트 **불가**.
- 따라서 이 문서는 "무엇을 만들지"뿐 아니라 "한 번에 동작하도록 어떻게 쓸지"까지 확정한다. 문서에 적힌 수치·이름·규칙을 **임의로 바꾸지 말 것**. 바꿔야 할 이유가 있으면 파일 상단 주석에 이유를 남기고 바꾼다.

---

## 0. 한 페이지 요약

| 항목 | 결정 |
|---|---|
| 배포 형태 | `index.html`을 브라우저에서 **file://로 더블클릭**해도 동작하는 정적 파일 묶음. 빌드/서버/npm 없음 |
| 물리 엔진 | **Matter.js 0.20.0을 CDN `<script>`로 로드** (직접 구현 안 함). 이유는 §2.1 |
| 렌더링 | **Canvas 2D 직접 그리기**(Matter.Render 사용 금지). 모든 그래픽은 도형으로 절차적 생성, 이미지 파일 없음 |
| UI(메뉴/HUD/오버레이) | **DOM 요소**(HTML+CSS). 캔버스 위에 절대 배치 |
| 스크립트 형태 | **classic `<script src>` 8개를 순서대로 로드**. ES module/`import`/`fetch`/`XMLHttpRequest` **금지**(file://에서 CORS로 실패) |
| 월드 | 논리 좌표 1600×900 고정 카메라, 창 크기에 맞춰 비율 유지 스케일(레터박스) |
| 스테이지 | 10개. `levels.js`에 **JS 데이터로 내장**(외부 JSON 로드 금지) |
| 게임 루프 | rAF + 고정 타임스텝 1000/60ms 누산기. `Matter.Engine.update(engine, 1000/60)` |
| 상태 머신 | MENU → PLAYING(AIM/DRAG/FLYING/AFTERMATH) → PAUSED / CLEAR / FAIL |
| 일시정지 | 인게임 **우측 상단** DOM 버튼. 오버레이에 **계속하기 / 다시하기 / 메인으로** |
| 언어 | UI 텍스트 한국어. 코드 식별자 영어 |

---

## 1. 목표 · 범위 · 완료 기준

### 1.1 요구사항(원문 요약)
1. 스테이지 10단계.
2. 게임 시작 → 앵그리버드식 플레이: 새총 드래그 → 발사 → 포물선·중력·충돌·구조물 파괴 → 돼지 제거.
3. 인게임 우측에 일시정지 버튼. 클릭 시 **다시하기 / 메인으로** 버튼.

### 1.2 완료 기준 (Definition of Done)
아래 전부가 Chrome(최신)에서 `index.html`을 file://로 열었을 때 성립해야 "완료"다. 구현자는 실행할 수 없으므로 §12의 무실행 체크리스트로 대신 검증한다.

- [ ] D1. 메인 화면에 **게임 시작** 버튼과 **스테이지 선택** 격자(1~10)가 보인다. 콘솔 에러 0건.
- [ ] D2. 게임 시작 → 스테이지 1이 로드되고, 새총 위에 새가 놓여 있으며, 남은 새들이 새총 왼쪽 땅에 줄지어 그려진다.
- [ ] D3. 마우스/터치로 새를 당기면 새가 손을 따라오고, 점선 **예측 궤적**이 보인다. 놓으면 새가 **포물선**으로 날아간다. 실제 궤적이 예측 점선과 일치한다.
- [ ] D4. 새가 구조물에 부딪히면 블록이 밀리고 넘어지며, 강한 충격을 받은 블록은 **부서져 사라지고** 파편 파티클과 `+점수` 텍스트가 뜬다.
- [ ] D5. 돼지가 강한 충격을 받거나 화면 밖으로 떨어지면 사라지고 점수가 오른다.
- [ ] D6. 돼지가 모두 사라지면 **클리어 오버레이**(별 1~3개, 점수, 다음 스테이지/다시하기/메인으로)가 뜬다. 다음 스테이지로 2, 3, … 10까지 이어지고, 10 클리어 시 "모든 스테이지 클리어!"가 뜬다.
- [ ] D7. 새를 모두 소진했는데 돼지가 남으면 **실패 오버레이**(다시하기/메인으로)가 뜬다.
- [ ] D8. 인게임 **우측 상단 일시정지 버튼** → 오버레이에 **계속하기 / 다시하기 / 메인으로**가 있다. 일시정지 중 물리가 멈춘다. 계속하기로 이어서 진행, 다시하기로 같은 스테이지 처음부터, 메인으로로 메인 화면 복귀.
- [ ] D9. 노란 새는 비행 중 클릭/탭으로 가속, 검은 새는 클릭/탭 또는 충돌 1초 뒤 폭발해 주변을 날려버린다.
- [ ] D10. 창 크기를 바꿔도 게임 화면이 비율을 유지하며 화면 안에 들어오고, 일시정지 버튼은 계속 게임 화면 우측 상단에 붙어 있다.
- [ ] D11. 클리어 결과(별/최고점수)가 새로고침 후에도 스테이지 선택 격자에 남는다(localStorage). localStorage가 막힌 환경에서도 게임은 죽지 않는다.

### 1.3 비목표 (하지 않는다)
사운드, 카메라 스크롤/줌, 이미지/스프라이트 에셋, 파란 새(분열) 등 추가 새 종류, 스테이지 잠금(검수 편의를 위해 10개 모두 항상 선택 가능), 레벨 에디터, 다국어, 모바일 전용 레이아웃 최적화(비율 스케일만 지원), 서버/계정.

---

## 2. 핵심 기술 결정과 근거

### 2.1 물리: Matter.js 0.20.0 (CDN)
- **선택 이유**: 앵그리버드의 핵심 재미(탑이 흔들리다 무너짐, 회전하는 블록의 적층)는 회전 강체 + 반복 솔버 + 슬립 처리가 필요하다. 이를 직접 구현하면 튜닝 없이는 적층이 떨리거나 스스로 무너지는데, 구현자는 **실행해 볼 수 없으므로** 튜닝이 불가능하다. 검증된 엔진을 쓰는 것이 유일하게 안전한 길이다.
- **설치 불가 대응**: npm 없이 `<script src="CDN">`으로 런타임 로드. 1차 jsDelivr, 실패 시 unpkg 폴백, 둘 다 실패하면 메인 화면에 오류 문구 표시(§10.5). `index.html`에 아래 2줄을 그대로 넣는다.

```html
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>
<script>if (!window.Matter) { document.write('<script src="https://unpkg.com/matter-js@0.20.0/build/matter.min.js"><\/script>'); }</script>
```

- **사용 허용 API(이 목록 밖의 Matter API는 쓰지 않는다)**

| API | 용도 |
|---|---|
| `Matter.Engine.create({ enableSleeping: true, positionIterations: 8, velocityIterations: 6 })` | 스테이지마다 새 엔진 생성. 중력은 기본값(y=1, scale=0.001) 그대로 둔다 |
| `Matter.Engine.update(engine, 1000/60)` | 고정 스텝 |
| `Matter.Composite.add(engine.world, body)` / `Matter.Composite.remove(engine.world, body)` / `Matter.Composite.allBodies(engine.world)` | 바디 추가·제거·순회 (`Matter.World`는 쓰지 않음) |
| `Matter.Bodies.rectangle(cx, cy, w, h, opts)` / `Matter.Bodies.circle(cx, cy, r, opts)` | 바디 생성. 좌표는 **중심** |
| `Matter.Body.setVelocity(body, {x, y})` | 발사, 가속, 폭발 킥 |
| `Matter.Sleeping.set(body, false)` | 잠든 바디에 `setVelocity` 하기 **직전** 반드시 호출 |
| `Matter.Events.on(engine, 'collisionStart', fn)` / `Matter.Events.off(engine, 'collisionStart', fn)` | 충돌 리스너 등록/해제. `fn(e)`의 `e.pairs[i].bodyA / bodyB` 만 사용 |
| 바디 읽기 전용 필드 | `position`, `angle`, `velocity`, `speed`, `mass`, `isStatic`, `isSleeping`, `circleRadius`, `id` |
| 바디 쓰기 필드 | `frictionAir`(직접 대입 허용), 커스텀 필드 `meta`(우리가 붙임) |
| 바디 생성 옵션 | `isStatic, density, friction, frictionAir, restitution, angle, label` |

- **금지**: `Matter.Render`, `Matter.Runner`, `Matter.Mouse`, `Matter.MouseConstraint`, `Matter.Constraint`, `Matter.World`, `Matter.Vector`(영국식 철자 `normalise` 등 실수 유발 → 벡터 헬퍼는 `config.js`에 직접 작성).
- **단위**: Matter의 `velocity`는 **px/스텝**(스텝 = 1000/60ms). 중력에 의한 스텝당 속도 증가 `G_STEP = 1 × 0.001 × (1000/60)² ≈ 0.27778 px/스텝²`. 이 값이 궤적 예측(§8.4)의 기준이다.

### 2.2 렌더링: Canvas 2D 직접 그리기
- Matter.Render는 디버그 용도라 시각 품질과 UI 제어가 안 되므로, 매 프레임 `Composite.allBodies`를 순회하며 `body.meta.kind`별로 그린다.
- 캔버스 백킹 크기 = `1600×900 × dpr`(dpr은 `min(devicePixelRatio, 2)`), 매 프레임 시작 시 `ctx.setTransform(dpr,0,0,dpr,0,0)`. CSS 크기는 창에 맞춘 스케일(§4.2).

### 2.3 파일/로딩 형태
- classic script 8개. 같은 페이지의 classic script들은 전역 스코프를 공유하므로 각 파일 최상위에 `const`/`function`으로 선언한 이름을 뒤 파일에서 그대로 쓴다. 로드 순서는 §3 표대로.
- 앞 파일이 뒤 파일의 전역(예: `slingshot.js`가 `Game`)을 쓰는 것은 **이벤트 핸들러·함수 본문 안에서만** 허용된다(호출 시점에는 전부 로드됨). 파일 최상위 실행 코드에서 뒤 파일의 이름을 읽으면 ReferenceError다.
- 레벨 데이터는 `levels.js` 안의 JS 배열. 이미지·JSON·폰트 파일 없음.

### 2.4 입력: Pointer Events
- 캔버스에 `pointerdown/pointermove/pointerup/pointercancel` + `setPointerCapture`. CSS `touch-action: none; user-select: none`. 마우스·터치 공통 처리.

### 2.5 UI: DOM
- 메뉴, HUD, 오버레이는 DOM. 캔버스 히트테스트 없음. 오버레이가 캔버스와 HUD를 덮으므로(z-index) 오버레이 표시 중에는 캔버스 입력이 자연히 차단된다.

---

## 3. 파일 구성 · 로드 순서 · 전역 이름 계약

### 3.1 파일 목록 (모두 같은 폴더, 서브폴더 없음)

| 순서 | 파일 | 역할 | 예상 분량 |
|---|---|---|---|
| – | `index.html` | DOM 골격(§10.1), CDN 태그, 스크립트 8개 순서 로드 | ~90줄 |
| – | `style.css` | 레이아웃·오버레이·버튼 스타일(§10.3) | ~140줄 |
| 1 | `config.js` | 상수 `CFG`, 재질/새/돼지 테이블, 벡터 헬퍼 `V` | ~130줄 |
| 2 | `levels.js` | 레벨 빌더 매크로 + `LEVELS`(10개) + `Levels.build` | ~260줄 |
| 3 | `physics.js` | 엔진/월드 생성, 바디 팩토리, 충돌 데미지, 제거 큐, OOB, 폭발 → `Physics` | ~260줄 |
| 4 | `slingshot.js` | 포인터 입력, 당기기/조준/발사, 예측 궤적 계산 → `Slingshot` | ~180줄 |
| 5 | `render.js` | 배경/지면/새총/바디/파티클/텍스트 그리기 → `Render` | ~360줄 |
| 6 | `ui.js` | 화면 전환, 오버레이, HUD, 스테이지 격자, 진행도 저장 → `UI`, `Progress` | ~180줄 |
| 7 | `game.js` | 상태 머신, 루프, 스테이지 로드/샷 진행/판정, 부트스트랩 → `Game` | ~320줄 |

`index.html`의 `<body>` 끝에서 CDN 태그(§2.1) 다음에 위 1~7 순서로 `<script src="...">`를 둔다. `defer`/`async`/`type="module"` 쓰지 않는다.

### 3.2 전역 식별자 레지스트리 (철자 고정)

| 전역 이름 | 정의 파일 | 사용 파일 | 내용 |
|---|---|---|---|
| `CFG` | config.js | 전부 | 숫자 상수 객체(§4.1) |
| `MATERIALS`, `BIRDS`, `PIGS` | config.js | levels, physics, render, game, slingshot | 재질/새/돼지 테이블(§7.1) |
| `V` | config.js | slingshot, physics, render | `V.len(a)`, `V.sub(a,b)`, `V.add(a,b)`, `V.scale(a,k)`, `V.norm(a)`, `V.dist(a,b)` |
| `LEVELS` | levels.js | game, ui | 길이 10 배열. 요소 `{ id, name, birds, build }` |
| `Levels` | levels.js | game | `Levels.build(def) → { platforms:[], blocks:[], pigs:[] }` (중심 좌표로 변환된 스펙) |
| `Physics` | physics.js | game, slingshot, render | §7.4 |
| `Slingshot` | slingshot.js | game, render | §8.6 |
| `Render` | render.js | game | `Render.init(canvas)`, `Render.frame(game)` |
| `UI` | ui.js | game | §10.4 |
| `Progress` | ui.js | game, ui | `Progress.load()`, `Progress.save(p)`, `Progress.record(stageId, stars, score)` |
| `Game` | game.js | ui(콜백으로만), slingshot(이벤트 핸들러 안에서만) | §5.4 |

각 파일 첫 줄에 주석으로 "정의: …, 의존: …"을 적는다. 모든 파일은 `'use strict';`로 시작한다. `class`/`this`는 쓰지 않고 객체 리터럴 + 클로저 + 함수 선언만 쓴다(바인딩 실수 방지). 위 표의 전역 이름 외의 최상위 이름은 파일별 IIFE 안에 감추거나 파일 접두어(`sl_`, `rd_` 등)를 붙여 **파일 간 최상위 `const` 충돌**(SyntaxError로 페이지 전체가 죽음)을 막는다.

---

## 4. 월드 · 좌표 · 상수 (`config.js`)

### 4.1 `CFG` 상수 (전부 이 값으로)

| 이름 | 값 | 의미 |
|---|---|---|
| `WORLD_W`, `WORLD_H` | 1600, 900 | 논리 월드 크기(px). 좌상단 원점, y 아래 방향 |
| `GROUND_Y` | 820 | 지면 윗면 y |
| `STEP_MS` | 1000/60 | 고정 물리 스텝 |
| `G_STEP` | 0.27778 | 스텝당 중력 속도 증가 (= 1 × 0.001 × STEP_MS²) |
| `SLING_X`, `SLING_Y` | 230, 640 | 새총 걸이(anchor) 좌표. 새는 여기에 놓인다 |
| `MAX_PULL` | 110 | 최대 당김 거리(px) |
| `MAX_SPEED` | 20 | 최대 당김 시 발사 속도(px/스텝) |
| `MIN_PULL` | 12 | 이 미만으로 당기고 놓으면 발사 취소 |
| `GRAB_RADIUS` | 80 | anchor에서 이 거리 안을 눌러야 드래그 시작 |
| `SETTLE_GRACE_STEPS` | 60 | 스테이지 로드 직후 이 스텝 동안 충돌 데미지 무시 |
| `DAMAGE_MIN_SPEED` | 3 | 상대 속도가 이 미만인 충돌은 데미지 없음 |
| `SHOT_STOP_SPEED`, `SHOT_STOP_STEPS` | 0.3, 90 | 새 속도가 0.3 미만으로 90스텝 연속이면 샷 종료 |
| `SHOT_MAX_STEPS` | 600 | 발사 후 10초 지나면 무조건 샷 종료 |
| `AFTERMATH_MIN_STEPS`, `AFTERMATH_MAX_STEPS` | 30, 180 | 샷 종료 후 판정까지 대기 범위 |
| `AFTERMATH_SETTLE_SPEED` | 0.5 | 모든 동적 바디가 이 속도 미만이면 "가라앉음" |
| `OOB_MARGIN` | 150 | 월드 밖 여유. 이 밖으로 나간 바디 제거 |
| `EXPLOSION_R`, `EXPLOSION_KICK`, `EXPLOSION_DMG` | 220, 14, 120 | 검은 새 폭발 반경, 중심 속도 킥(px/스텝), 중심 데미지 |
| `EXPLODE_DELAY_STEPS` | 60 | 검은 새 첫 충돌 후 자동 폭발까지 |
| `BOOST_MULT`, `BOOST_MAX` | 1.7, 32 | 노란 새 가속 배율/상한 |
| `BIRD_AIR_AFTER_HIT` | 0.02 | 첫 충돌 후 새의 `frictionAir`(빨리 멈추게) |
| `TRAIL_EVERY` | 2 | 궤적 점 기록 간격(스텝) |
| `SCORE_BIRD_LEFT` | 10000 | 클리어 시 남은 새 1마리당 보너스 |
| `STAR2_EXTRA`, `STAR3_EXTRA` | 4000, 12000 | 별 기준(§7.6) |

### 4.2 화면 스케일
- `scale = min(innerWidth / 1600, innerHeight / 900)`. `#game` 래퍼의 CSS width/height를 `1600*scale`, `900*scale`로 설정하고 화면 중앙 정렬. 캔버스는 래퍼를 100% 채움. HUD/오버레이는 래퍼 기준 절대 배치 → 일시정지 버튼이 항상 게임 화면 우측 상단(D10).
- `resize` 이벤트마다 재계산. 초기 1회 호출.
- 포인터 → 월드 좌표: `rect = canvas.getBoundingClientRect()`; `wx = (clientX − rect.left) × 1600 / rect.width`; `wy = (clientY − rect.top) × 900 / rect.height`.

### 4.3 지면과 월드 경계
- 지면: 정적 사각형, x −200~1800(폭 2000), y 820~900(중심 (800, 860), 높이 80). `meta.kind = 'ground'`.
- 벽 없음. 동적 바디가 `x < −150`, `x > 1750`, `y > 1050` 이면 제거(§7.5).

---

## 5. 게임 상태 머신과 루프 (`game.js`)

### 5.1 상위 상태
```
MENU ──게임 시작/스테이지 선택──▶ PLAYING ──일시정지 버튼/Esc──▶ PAUSED ──계속하기──▶ PLAYING
PLAYING ──돼지 0──▶ CLEAR ──다음 스테이지/다시하기──▶ PLAYING     CLEAR ──메인으로──▶ MENU
PLAYING ──새 소진 & 돼지 잔존──▶ FAIL ──다시하기──▶ PLAYING       FAIL/PAUSED ──메인으로──▶ MENU
PAUSED ──다시하기──▶ PLAYING(같은 스테이지 재로드)
```

### 5.2 PLAYING 하위 상태 (`game.sub`)
| sub | 의미 | 진입 | 이탈 |
|---|---|---|---|
| `AIM` | 새가 새총에 얹혀 대기(월드에 바디 없음, 렌더만) | 스테이지 로드 / 다음 새 준비 | GRAB_RADIUS 안 pointerdown → `DRAG` |
| `DRAG` | 당기는 중 | | pointerup: 당김 ≥ MIN_PULL → 발사 → `FLYING`; 아니면 `AIM`. pointercancel/일시정지 → `AIM` |
| `FLYING` | 새 바디가 월드에 있음 | 발사 | §5.3 샷 종료 조건 → 새 제거 → `AFTERMATH` |
| `AFTERMATH` | 잔해가 가라앉길 대기 | 샷 종료 | §5.3 판정 → `CLEAR` / `FAIL` / `AIM`(다음 새) |

### 5.3 샷 진행 규칙
- **발사**: `Physics.addBird(world, type, pos, vel)`로 바디 생성·추가. `game.shot = { bird, steps: 0, stopSteps: 0, hitStep: -1, exploded: false, abilityUsed: false }`. `queue`에서 해당 새는 이미 pop된 상태.
- **매 스텝(FLYING)**: `shot.steps++`. `bird.speed < SHOT_STOP_SPEED`면 `stopSteps++` 아니면 0으로. 종료 조건 중 하나라도: (a) `stopSteps ≥ SHOT_STOP_STEPS`, (b) `steps ≥ SHOT_MAX_STEPS`, (c) 새 바디가 OOB로 이미 제거됨(`bird.meta.removed`), (d) 검은 새가 폭발함. → 새 바디 제거(`Physics.destroy(world, bird, 'done')`, 포프 파티클; 이미 제거됐으면 no-op) → `AFTERMATH`, `after = { steps: 0 }`.
- **매 스텝(AFTERMATH)**: `after.steps++`. `steps ≥ AFTERMATH_MIN_STEPS` 이고 (모든 비정적 바디 `speed < AFTERMATH_SETTLE_SPEED` 또는 `isSleeping`) 이거나 `steps ≥ AFTERMATH_MAX_STEPS` 이면 판정:
  - `world.pigsAlive === 0` → `CLEAR` (§7.6 점수 확정 → `UI.showOverlay('clear', …)`, `Progress.record`).
  - 아니고 `queue.length === 0` → `FAIL`.
  - 아니면 다음 새를 큐에서 꺼내 `current`로 두고 `AIM`.
- 돼지가 FLYING 중 전부 죽어도 즉시 클리어하지 않고 위 흐름을 그대로 탄다(잔해 점수가 더 들어올 수 있음).

### 5.4 `Game` 객체 필드/함수
- 필드: `state`, `sub`, `stageId`, `levelDef`, `world`(Physics 월드), `queue`(남은 새 타입 배열, 현재 새 제외), `current`(AIM/DRAG 중인 새 타입), `shot`, `after`, `score`, `trail`(현재 샷 점 배열), `prevTrail`(직전 샷), `effects`(파티클/플로터 배열), `acc`, `lastTs`, `dpr`, `canvas`.
- 함수: `init()`(부트스트랩: Matter 존재 확인, Render.init, Slingshot.create, UI.bind, resize, rAF 시작), `startStage(id)`, `restart()`, `next()`, `toMain()`, `pause()`, `resume()`, `launch(pos, vel)`, `tapDuringFlight()`, `stepOnce()`(고정 스텝 1회의 게임 로직: §5.5), `loop(ts)`.

### 5.5 루프
- `loop(ts)`: `dt = min(ts − lastTs, 100)`; `lastTs = ts`. `state === 'PLAYING'`일 때만 `acc += dt; while (acc ≥ STEP_MS) { stepOnce(); acc −= STEP_MS; }`. 그다음 `state !== 'MENU'`면 `Render.frame(Game)`. 항상 `requestAnimationFrame(loop)`.
- `stepOnce()`: ① `Physics.step(world)`(엔진 업데이트 + 제거 큐 + OOB + 유예 카운트) ② `world.effects` 큐를 꺼내 `Game.effects`(파티클/플로터)로 변환하고 `world.score`를 `Game.score`에 반영, `birdHit` 이펙트면 `shot.hitStep = shot.steps` ③ sub별 규칙(§5.3, §8.5 자동 폭발) ④ 궤적 기록(FLYING, `TRAIL_EVERY` 스텝마다 `bird.position` 복사) ⑤ 파티클·플로터 갱신(§9.6) ⑥ HUD 점수 갱신(값이 바뀐 경우만).
- `pause()`: `state = 'PAUSED'`, DRAG 중이면 `Slingshot.cancel()`→`sub = 'AIM'`. `UI.showOverlay('pause')`. `resume()`: `state = 'PLAYING'`, `lastTs = performance.now()`, `acc = 0`, `UI.showOverlay(null)`.
- `document.visibilitychange`에서 숨겨지면 PLAYING일 때 `pause()`. 키보드 `Escape`/`p`: PLAYING→pause, PAUSED→resume.

### 5.6 스테이지 로드 `startStage(id)`
1. 이전 `world`가 있으면 `Physics.dispose(world)`(리스너 참조 해제; 엔진은 그냥 버림). `Slingshot.cancel()`.
2. `levelDef = LEVELS[id−1]`, `world = Physics.createWorld(Levels.build(levelDef))`.
3. `stageId = id`, `queue = levelDef.birds.slice()`, `current = queue.shift()`, `score = 0`, `trail = []`, `prevTrail = []`, `effects = []`, `shot = null`, `after = null`.
4. `state = 'PLAYING'`, `sub = 'AIM'`, `UI.showScreen('game')`, `UI.showOverlay(null)`, `UI.setHud({ stage: id, score: 0 })`, `acc = 0`, `lastTs = performance.now()`.
- `restart()` = `startStage(stageId)`. `next()` = `startStage(stageId + 1)`. `toMain()` = `Slingshot.cancel()`, `UI.showOverlay(null)`, `state = 'MENU'`, `UI.showScreen('menu')`.

---

## 6. 레벨 데이터 (`levels.js`)

### 6.1 좌표 규약
- 모든 매크로는 **바닥 y(bottom)** 또는 **윗면 y(top)** 기준으로 받고, 중심 좌표로 변환해 스펙에 넣는다. 기본 바닥은 `CFG.GROUND_Y`(820).
- 스펙 객체 형식(`Levels.build` 결과):
  - `platforms: [{ x, y, w, h }]` (중심, 정적 돌 판)
  - `blocks: [{ material, x, y, w, h, angle }]` (중심, 동적)
  - `pigs: [{ size, x, y }]` (중심, `size` = `'small' | 'large'`)
- 배치 가능 영역: 모든 구조물 x는 700~1560 안. 새총 쪽(x<600)에는 아무것도 놓지 않는다.

### 6.2 빌더 `L` (각 레벨의 `build(L)`에 넘겨지는 객체). 모든 매크로는 **그 결과물의 윗면 y**를 반환한다.

| 매크로 | 동작 |
|---|---|
| `L.platform(cx, top, w, h)` | 정적 판. 중심 `(cx, top + h/2)`. 반환 `top` |
| `L.box(mat, w, h, cx, bottom, angle = 0)` | 동적 블록. 중심 `(cx, bottom − h/2)`. 반환 `bottom − h` |
| `L.pig(size, cx, bottom)` | 돼지. `r = PIGS[size].r`, 중심 `(cx, bottom − r)`. 반환 `bottom − 2r` |
| `L.house(mat, cx, bottom, w, h, pigSize)` | 기둥 2개 `box(mat, 20, h, cx − w/2 + 10, bottom)`, `box(mat, 20, h, cx + w/2 − 10, bottom)`; 보 `box(mat, w, 20, cx, bottom − h)`; `pigSize`가 있으면 `pig(pigSize, cx, bottom)`. 반환 `bottom − h − 20` |
| `L.tower(cx, bottom, floors)` | `floors = [{ mat, w, h, pig }...]`를 아래층부터 `house`로 쌓음(각 층의 bottom = 직전 반환값). 반환 최상단 |
| `L.pile(mat, cx, bottom, cols, rows, size = 40)` | 정육면 블록 격자. 열 c의 중심 x = `cx + (c − (cols−1)/2) × size`, 행 r의 bottom = `bottom − r × size`. 반환 `bottom − rows × size` |

- 안정성 규칙(이미 아래 레벨은 만족): 탑의 윗층 `w`는 아랫층 `w` 이하. 돼지가 들어가는 집의 `h`는 `2r + 20` 이상(small r=18 → h≥56, large r=27 → h≥74). 서로 다른 구조물의 x 범위가 겹치지 않는다.

### 6.3 10개 스테이지 명세 (이 표를 그대로 `build`로 옮긴다)

| id | name | birds(발사 순서) | build(L) 호출 순서 | 돼지 수 |
|---|---|---|---|---|
| 1 | 첫 발 | red, red, red | `house('wood', 1100, 820, 140, 80, 'small')` | 1 |
| 2 | 두 채 | red, red, red | `t = house('wood', 950, 820, 120, 80, 'small')`; `box('ice', 120, 20, 950, t)`; `house('wood', 1250, 820, 120, 80, 'small')` | 2 |
| 3 | 이층집 | red, red, yellow | `t = tower(1150, 820, [{mat:'wood', w:160, h:100, pig:'small'}, {mat:'wood', w:120, h:80, pig:'small'}])`; `box('ice', 40, 40, 1150, t)` | 2 |
| 4 | 얼음 요새 | red, yellow, red, yellow | `house('ice', 900, 820, 120, 80, 'small')`; `t = pile('ice', 1100, 820, 2, 3)`; `pig('small', 1100, t)`; `tower(1350, 820, [{mat:'ice', w:140, h:100, pig:'small'}, {mat:'ice', w:100, h:60, pig:null}])` | 3 |
| 5 | 돌담 너머 | red, yellow, red, yellow | `box('stone', 40, 200, 800, 820)`; `house('wood', 1000, 820, 140, 90, 'small')`; `t = house('wood', 1250, 820, 140, 90, 'small')`; `pig('small', 1250, t)` | 3 |
| 6 | 고지대 | black, red, yellow, red | `house('stone', 950, 820, 120, 80, 'small')`; `platform(1300, 560, 300, 40)`; `house('wood', 1300, 560, 140, 80, 'small')`; `pig('small', 1430, 560)` | 3 |
| 7 | 삼층탑 | red, yellow, yellow, black | `tower(1200, 820, [{mat:'wood', w:180, h:100, pig:'small'}, {mat:'wood', w:140, h:80, pig:'small'}, {mat:'ice', w:100, h:70, pig:'small'}])` | 3 |
| 8 | 쌍둥이 요새 | red, black, yellow, red, black | `t = tower(1000, 820, [{mat:'stone', w:140, h:90, pig:'small'}, {mat:'wood', w:120, h:80, pig:null}])`; `pig('small', 1000, t)`; `tower(1350, 820, [{mat:'stone', w:140, h:90, pig:'small'}, {mat:'ice', w:120, h:80, pig:'small'}])` | 4 |
| 9 | 대왕 돼지 | red, yellow, black, red, yellow | `house('wood', 900, 820, 120, 80, 'small')`; `box('stone', 40, 160, 1050, 820)`; `t = house('stone', 1250, 820, 180, 110, 'large')`; `pig('small', 1250, t)`; `t2 = pile('ice', 1450, 820, 2, 2)`; `pig('small', 1450, t2)` | 4 |
| 10 | 돼지 성 | red, yellow, black, yellow, black, red, yellow | `box('stone', 40, 240, 780, 820)`; `tower(1000, 820, [{mat:'stone', w:160, h:100, pig:'small'}, {mat:'wood', w:120, h:90, pig:'small'}, {mat:'ice', w:80, h:60, pig:null}])`; `tower(1300, 820, [{mat:'stone', w:200, h:120, pig:'large'}, {mat:'wood', w:160, h:90, pig:'small'}, {mat:'ice', w:120, h:60, pig:'small'}])`; `pig('large', 1520, 820)` | 6 |

- `LEVELS[i].id === i + 1` 이어야 한다. `birds` 배열은 그대로 복사해 큐로 쓴다.
- `Levels.build(def)`는 빈 스펙 배열 3개를 가진 `L`을 만들어 `def.build(L)`을 호출한 뒤 스펙을 반환한다. 레벨 로드마다 새로 build한다(스펙 객체 재사용 금지 → 재시작 시 상태 오염 방지).

---

## 7. 물리 · 엔티티 · 충돌 · 파괴 · 점수 (`physics.js`, 테이블은 `config.js`)

### 7.1 테이블

**`MATERIALS`**

| key | density | friction | restitution | hp | score | 색(fill / stroke) |
|---|---|---|---|---|---|---|
| `wood` | 0.0012 | 0.6 | 0.10 | 35 | 500 | `#c8894a` / `#8a5a2b` |
| `ice` | 0.0009 | 0.15 | 0.15 | 12 | 300 | `rgba(170,220,255,0.85)` / `#7fb7e6` |
| `stone` | 0.0030 | 0.7 | 0.05 | 80 | 800 | `#9a9a9a` / `#5f5f5f` |

**`BIRDS`** (모두 원형 바디, `frictionAir` 0, `friction` 0.5, `restitution` 0.35)

| key | r | density | 색 | 특수 능력 |
|---|---|---|---|---|
| `red` | 20 | 0.004 | `#d33` | 없음 |
| `yellow` | 18 | 0.004 | `#f2c122` | 비행 중(첫 충돌 전) 탭 1회: 속도 벡터 × `BOOST_MULT`, 크기 상한 `BOOST_MAX` |
| `black` | 24 | 0.005 | `#333` | 비행 중 탭 또는 첫 충돌 후 `EXPLODE_DELAY_STEPS`: 폭발(§7.5) |

**`PIGS`** (원형, density 0.002, friction 0.5, restitution 0.2, frictionAir 0.01 기본)

| key | r | hp | score |
|---|---|---|---|
| `small` | 18 | 20 | 5000 |
| `large` | 27 | 40 | 8000 |

지면·플랫폼: `isStatic: true`, friction 0.8, restitution 0.1.

### 7.2 바디 메타
모든 바디에 생성 직후 `body.meta = { kind, material, size, birdType, hp, maxHp, w, h, r, removed: false, hit: false, crackSeed }`를 붙인다.
- `kind` ∈ `'ground' | 'platform' | 'block' | 'pig' | 'bird'`.
- 블록은 `w, h, material`, 돼지는 `size, r`, 새는 `birdType, r`. `hp/maxHp`는 블록·돼지만(새·정적은 `Infinity`). `crackSeed`는 생성 시 `Math.random()` 1회(균열 방향용).
- 사각형 바디의 폭/높이는 Matter가 보관하지 않으므로 반드시 `meta.w/h`로 그린다.

### 7.3 월드 객체 `world`
`{ engine, ground, pigsAlive, graceSteps, removeQueue: [], effects: [], score: 0, onCollision }`
- `createWorld(spec)`: 엔진 생성(§2.1 옵션) → 지면 추가 → `spec.platforms/blocks/pigs`를 팩토리로 바디화해 추가 → `pigsAlive = spec.pigs.length` → `graceSteps = SETTLE_GRACE_STEPS` → `onCollision` 클로저 생성 후 `Events.on(engine, 'collisionStart', onCollision)`. **엔진은 스테이지마다 새로 만든다**(리스너와 잔여 바디가 섞이지 않게).

### 7.4 `Physics` 공개 함수

| 함수 | 동작 |
|---|---|
| `createWorld(spec) → world` | 위 |
| `dispose(world)` | `Events.off(engine, 'collisionStart', world.onCollision)` 시도(try/catch), 참조 비움 |
| `step(world)` | `Engine.update(engine, STEP_MS)` → `graceSteps > 0`면 감소 → OOB 검사(§7.5) → `removeQueue`를 비우며 `Composite.remove` |
| `addBird(world, type, pos, vel) → body` | `Bodies.circle` + 메타 + `Body.setVelocity` + add |
| `applyDamage(world, body, dmg)` | 파괴 가능(`kind` block/pig, `!removed`)이면 `hp −= dmg`; `hp ≤ 0` → `destroy(world, body, 'break')` |
| `destroy(world, body, reason)` | `meta.removed`면 즉시 return. `meta.removed = true`; `removeQueue.push(body)`; 점수(블록: 재질 score, 돼지: 돼지 score, 새: 0; `reason === 'oob'`인 블록은 0)를 `world.score`에 더하고 `reason !== 'oob'`면 `effects.push({ type: 'debris' \| 'poof', x, y, color, count })`, 점수 > 0이면 `effects.push({ type: 'score', x, y, value })`; 돼지면 `pigsAlive−−` |
| `explode(world, center, selfBody)` | §7.5 |
| `dynamicBodies(world) → array` | `allBodies` 중 `!isStatic && !meta.removed` |

### 7.5 규칙

**충돌 데미지(`onCollision`)** — `e.pairs`를 순회하며 각 `(A, B)`에 대해:
1. `world.graceSteps > 0`이면 전부 무시.
2. `relSpeed = V.len(V.sub(A.velocity, B.velocity))`. `relSpeed < DAMAGE_MIN_SPEED`면 무시.
3. `m = min(A.mass, B.mass)`(정적 바디는 mass가 Infinity라 자연히 상대 질량이 선택됨). `dmg = relSpeed × m`.
4. `applyDamage(world, A, dmg)`, `applyDamage(world, B, dmg)`(파괴 불가 종류는 함수 안에서 무시).
5. A 또는 B가 새이고 `meta.hit === false`면 `meta.hit = true`, `body.frictionAir = BIRD_AIR_AFTER_HIT`, `world.effects.push({ type: 'birdHit', bodyId: body.id })`(game.js가 `shot.hitStep`을 기록하는 데 사용).
- 콜백 안에서는 **바디를 제거하지 않는다**(큐에만 넣고 `step` 끝에서 제거).
- 수치 감각: 빨간 새(질량≈5)가 속도 12로 나무 기둥(≈2.9)에 맞으면 dmg≈35 → 나무 hp 35 정확히 파괴. 얼음은 속도 6이면 깨짐. 돌(80)은 속도 16 이상 직격 또는 폭발이 필요. 돼지 small은 새 속도 10 직격이면 즉사, 떨어지는 나무 보에 맞으면 두 번.

**OOB** — `step`마다 `dynamicBodies` 중 `position.x < −OOB_MARGIN || position.x > WORLD_W + OOB_MARGIN || position.y > WORLD_H + OOB_MARGIN`이면 `destroy(world, body, 'oob')`. 돼지는 점수 인정, 블록은 점수 0(파편도 없음), 새는 점수 0.

**폭발 `explode(world, center, selfBody)`** — `dynamicBodies`에서 `selfBody`를 제외한 바디 중 `d = V.dist(body.position, center) ≤ EXPLOSION_R`인 바디에 대해 `f = 1 − d / EXPLOSION_R`:
- 킥: `dir = V.norm(V.sub(body.position, center))`(d < 1이면 `{x:0, y:−1}`), `Sleeping.set(body, false)` 후 `Body.setVelocity(body, V.add(body.velocity, V.scale(dir, EXPLOSION_KICK × f)))`.
- 데미지: `applyDamage(world, body, EXPLOSION_DMG × f)`.
- `effects.push({ type: 'blast', x, y })`.
- 마지막에 `destroy(world, selfBody, 'explode')`. 데미지는 `graceSteps`와 무관하게 적용.

**돼지 사망 조건 정리**: hp ≤ 0(충돌/폭발) 또는 OOB. 둘 다 `pigsAlive−−`는 `destroy`에서 한 번만.

### 7.6 점수와 별
- 스테이지 점수 = 파괴 블록 점수 합 + 돼지 점수 합 + (클리어 시) 남은 새 수 × `SCORE_BIRD_LEFT`. "남은 새" = `queue.length`(AFTERMATH 판정 시점, 현재 새는 이미 소모).
- `base = Σ 돼지 score`(레벨의 돼지 전부, `Levels.build` 결과의 `pigs`로 계산). 별: 클리어면 1개, `score ≥ base + STAR2_EXTRA`면 2개, `score ≥ base + STAR3_EXTRA`면 3개.
- 재시작하면 점수는 0부터.

---

## 8. 슬링샷 입력 · 조준 · 발사 · 예측 (`slingshot.js`)

### 8.1 상태
`{ dragging: false, pointerId: null, pull: {x:0, y:0} }`. `pull` = 손 위치 − anchor, 길이 `MAX_PULL`로 클램프(방향 제한 없음).

### 8.2 이벤트 (캔버스에 등록, `create`에서 한 번만)
- `pointerdown`: `Game.state !== 'PLAYING'`이면 무시. 월드 좌표 `p` 계산(§4.2).
  - `Game.sub === 'AIM'` 이고 `V.dist(p, anchor) ≤ GRAB_RADIUS` → `dragging = true`, `pointerId = e.pointerId`, `canvas.setPointerCapture(pointerId)`(try/catch), `pull = clamp(p − anchor)`, `Game.sub = 'DRAG'`.
  - `Game.sub === 'FLYING'` → `Game.tapDuringFlight()`.
- `pointermove`: `dragging && e.pointerId === pointerId` 일 때만 `pull` 갱신.
- `pointerup`/`pointercancel`(같은 pointerId): `dragging = false`, `releasePointerCapture`(try/catch). pointerup이고 `V.len(pull) ≥ MIN_PULL` → **발사**: `pos = anchor + pull`, `vel = V.scale(V.norm(pull), −(V.len(pull) / MAX_PULL) × MAX_SPEED)`, `Game.launch(pos, vel)`. 그 외 → `pull = 0`, `Game.sub = 'AIM'`.
- `Slingshot.cancel()`: dragging 해제, `pull = 0`, capture 해제(try/catch). (일시정지·스테이지 전환 시 game.js가 호출.)

### 8.3 발사 (`Game.launch(pos, vel)`)
- `shot = { bird: Physics.addBird(world, current, pos, vel), steps: 0, stopSteps: 0, hitStep: -1, exploded: false, abilityUsed: false }`; `sub = 'FLYING'`; `prevTrail = trail; trail = []`; `Slingshot`의 `pull = 0`(launch를 부른 쪽에서 이미 처리).
- 새 바디는 발사 순간에만 생성된다(당기는 동안은 바디 없음 → 탄성 제약 불필요, 결정적 동작).

### 8.4 예측 궤적 `Slingshot.previewPoints() → [{x,y}]`
- `dragging`이고 `V.len(pull) ≥ MIN_PULL`일 때만. `p = anchor + pull`, `v = 발사 속도(8.2와 같은 식)`, `r = BIRDS[Game.current].r`.
- 반복 최대 120스텝: `v.y += G_STEP; p = p + v;` 3스텝마다 `p` 복사 저장. `p.y > GROUND_Y − r` 이면 중단.
- 새의 `frictionAir`가 0이고 엔진을 정확히 `STEP_MS`로 고정 스텝하므로 이 반복은 Matter의 Verlet 적분과 **정확히 일치**한다(D3). `G_STEP`을 다른 값으로 바꾸거나 새에 공기저항을 주면 어긋난다.

### 8.5 비행 중 탭 (`Game.tapDuringFlight()`)
- `shot`이 없거나 `abilityUsed`면 무시.
- `yellow`: `shot.bird.meta.hit === false`일 때만. `v = bird.velocity`, `s = min(V.len(v) × BOOST_MULT, BOOST_MAX)`, `Body.setVelocity(bird, V.scale(V.norm(v), s))`(속도 0이면 무시). `abilityUsed = true`, `effects.push({type:'boost', x, y})`.
- `black`: `Physics.explode(world, bird.position, bird)`; `shot.exploded = true`, `abilityUsed = true`.
- `red`: 아무것도 안 함.
- 검은 새 자동 폭발: `stepOnce`에서 `shot.bird.meta.birdType === 'black' && shot.hitStep ≥ 0 && !shot.exploded && shot.steps − shot.hitStep ≥ EXPLODE_DELAY_STEPS` → 위 `black` 처리와 동일.

### 8.6 `Slingshot` 공개 인터페이스
`Slingshot.create(canvas)`(리스너 등록), `Slingshot.isDragging()`, `Slingshot.birdPos() → anchor + pull`(AIM이면 anchor), `Slingshot.previewPoints()`, `Slingshot.cancel()`, `Slingshot.anchor` (= `{x: SLING_X, y: SLING_Y}`).

---

## 9. 렌더링 (`render.js`)

`Render.frame(game)`는 매 프레임 아래 순서로 그린다. 모든 좌표는 월드 좌표(변환은 `setTransform(dpr…)` 하나만). 프레임 시작 시 전체를 clear한다.

### 9.1 배경
- 하늘: 세로 그라디언트 `#8fd3ff`(위) → `#e8f7ff`(아래, y=820).
- 구름 3개(흰 원 3~4개 묶음, 고정 좌표 (300,140), (900,90), (1350,180)), 언덕 2개(연녹 `#bfe3a0` 타원, 지면과 겹치게).
- 지면: y 820~900 갈색 `#8d6a44`, 윗면 12px 녹색 `#5aa64a`. 플랫폼: 회색 사각형 + 어두운 테두리(`meta.kind === 'platform'`).

### 9.2 새총
- 기둥: `(SLING_X−8, SLING_Y+20)`~`(SLING_X+8, GROUND_Y)` 갈색 사각형. 갈퀴: 기둥 위에서 `(SLING_X−16, SLING_Y−12)`와 `(SLING_X+16, SLING_Y−12)`로 뻗는 선(두께 10, 갈색 `#6b4423`).
- 고무줄: DRAG 중에만 두 갈퀴 끝에서 `Slingshot.birdPos()`까지 선 2개(두께 6, `#3a2a1a`). 그리기 순서: 뒤 갈퀴 → 뒤 고무줄 → 새 → 앞 고무줄 → 앞 갈퀴(뒤/앞은 좌/우로 간단히 구분).

### 9.3 대기 중인 새
- AIM/DRAG 중 `game.current` 타입의 새를 `Slingshot.birdPos()`에 그린다(각도 0).
- `game.queue`의 새들을 `x = SLING_X − 70 − i × 45, y = GROUND_Y − r`에 그린다.

### 9.4 바디 (`Matter.Composite.allBodies` 순회, `meta.removed`는 건너뜀)
- 공통: `save → translate(position) → rotate(angle) → 그리기 → restore`.
- 블록: `fillRect(−w/2, −h/2, w, h)` 재질 색 + 테두리 2px. 나무는 긴 축 방향 어두운 줄 2개, 돌은 안쪽 밝은 사각형(베벨), 얼음은 좌상단 흰 하이라이트 선. `hp/maxHp < 0.5`면 검은 균열 선 2~3개(방향은 `meta.crackSeed`로 결정, 매 프레임 랜덤 금지).
- 돼지: 녹색 `#6cc04a` 원 + 어두운 테두리, 코(타원 `#5aa63a`, 콧구멍 2개), 눈 2개(흰 원+검은 동공), 귀(작은 삼각형 2개). `hp/maxHp < 0.5`면 반투명 어두운 패치(멍).
- 새: 종류 색 원 + 테두리, 오른쪽 눈 2개, 주황 부리(삼각형), 빨간 새는 머리 위 볏 2개, 노란 새는 살짝 큰 부리, 검은 새는 회색 하이라이트 + 정수리 도화선(짧은 선).
- 원형 바디의 회전도 `angle`을 적용해 얼굴이 돌게 한다(회전감).

### 9.5 궤적 · 예측
- `prevTrail`: 반투명 회색(alpha 0.35) 반지름 3 점. `trail`: 흰색(alpha 0.7) 반지름 3 점.
- 예측: `previewPoints()` 결과를 흰 점(반지름 4, alpha 0.9 → 0.3 선형 감소)으로.

### 9.6 이펙트 (데이터는 `game.effects`, 갱신은 `stepOnce` ⑤에서)
- 파편 `debris`: 개수 10(돼지 8, poof 8), 크기 4~8, `vx ∈ [−4, 4]`, `vy ∈ [−7, −1]`, 매 스텝 `vy += 0.25`, 수명 45스텝, alpha = 남은수명/45, 색 = 재질/새/돼지 색.
- `blast`: 반지름 0 → `EXPLOSION_R`로 12스텝 동안 커지는 주황 링(alpha 감소).
- `boost`: 노란 원 짧게 8스텝.
- 플로터 `score`: 텍스트 `+N`(굵은 24px, 흰색 + 검은 외곽선), 매 스텝 y −1, 수명 50스텝, alpha 감소.
- `Math.random`은 생성 시점에만 쓰고 그릴 때는 쓰지 않는다(깜빡임 방지).

### 9.7 HUD는 DOM(§10)이라 캔버스에 그리지 않는다.

---

## 10. UI (`index.html`, `style.css`, `ui.js`)

### 10.1 DOM 골격과 ID (철자 고정)
```
#app
 ├─ section#screen-menu
 │    h1 "앵그리버드" · p 부제 · button#btn-start "게임 시작" · h2 "스테이지 선택" · div#stage-grid (button.stage-btn ×10, data-stage=1..10)
 │    p#menu-error (hidden; Matter 로드 실패 시 문구)
 └─ div#game (hidden)                         ← 래퍼, position:relative, 크기는 JS가 설정
      canvas#canvas
      div#hud
      │   div#hud-left  → span#hud-stage "STAGE 1" · span#hud-score "0"
      │   button#btn-pause "❚❚" (title "일시정지")      ← position:absolute; top:12px; right:12px
      div#overlay-pause.overlay (hidden) → h2 "일시정지" · button#btn-resume "계속하기" · button#btn-restart-pause "다시하기" · button#btn-main-pause "메인으로"
      div#overlay-clear.overlay (hidden) → h2#clear-title · div#clear-stars · p#clear-score · button#btn-next "다음 스테이지" · button#btn-restart-clear "다시하기" · button#btn-main-clear "메인으로"
      div#overlay-fail.overlay (hidden)  → h2 "스테이지 실패" · p "새를 모두 사용했습니다" · button#btn-restart-fail "다시하기" · button#btn-main-fail "메인으로"
```
- 처음에는 `#game`과 오버레이 3개 모두 `hidden` 속성. `#screen-menu`만 보임.

### 10.2 텍스트 (그대로 사용)
게임 시작 / 스테이지 선택 / 일시정지 / 계속하기 / 다시하기 / 메인으로 / 다음 스테이지 / `스테이지 N 클리어!` / 모든 스테이지 클리어! / 스테이지 실패 / 새를 모두 사용했습니다 / `물리 엔진(Matter.js)을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침하세요.`

### 10.3 CSS 필수 항목
- `html, body { margin:0; height:100%; background:#1b2a3a; overflow:hidden; font-family: system-ui, sans-serif; }`
- `#app { width:100%; height:100%; display:flex; align-items:center; justify-content:center; }`
- `#game { position:relative; }` `#canvas { display:block; width:100%; height:100%; touch-action:none; user-select:none; }`
- `#hud { position:absolute; inset:0; pointer-events:none; }` `#hud button { pointer-events:auto; }` `#hud-left { position:absolute; top:12px; left:12px; color:#fff; font-weight:700; text-shadow: 0 1px 2px #000; }`
- `#btn-pause { position:absolute; top:12px; right:12px; width:48px; height:48px; border-radius:10px; font-size:20px; }`
- `.overlay { position:absolute; inset:0; z-index:10; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; background:rgba(0,0,0,.55); color:#fff; }`
- **반드시** `[hidden] { display:none !important; }` — `.overlay`의 `display:flex`가 `hidden` 속성을 무시하지 않도록. 이 한 줄이 없으면 오버레이가 항상 보인다.
- 버튼 공통: 최소 `min-width:200px; padding:12px 20px; font-size:18px; border-radius:10px; cursor:pointer;`. 스테이지 격자: 5열 grid, 각 셀에 번호와 별(★ 개수, 미클리어는 `☆☆☆`).

### 10.4 `UI` 공개 함수
| 함수 | 동작 |
|---|---|
| `UI.bind(handlers)` | `handlers = { onStart, onSelectStage(id), onPause, onResume, onRestart, onMain, onNext }`를 각 버튼 click에 연결(한 번만). 다시하기/메인으로 3벌은 모두 같은 `onRestart`/`onMain`에 연결 |
| `UI.showScreen('menu' \| 'game')` | 한쪽만 표시. `'menu'`일 때 `renderStageGrid(Progress.load())` 재호출 |
| `UI.showOverlay(null \| 'pause' \| 'clear' \| 'fail', data)` | 오버레이 3개 중 하나만 표시(나머지 `hidden`). `'clear'`의 `data = { stageId, score, stars, isLast }`: 제목(`isLast`면 "모든 스테이지 클리어!"), 별 `★★☆` 문자열, 점수, `isLast`면 `#btn-next` 숨김 |
| `UI.setHud({ stage, score })` | 텍스트 갱신 |
| `UI.renderStageGrid(progress)` | 10개 버튼 생성/갱신, 클릭 → `onSelectStage(id)` |
| `UI.showFatal(msg)` | `#menu-error` 표시 + `#btn-start`와 격자 비활성화 |

### 10.5 `Progress` (ui.js 하단)
- 키 `'angry-birds-web.progress.v1'`. 형식 `{ stars: { "1": 3, ... }, best: { "1": 32000, ... } }`.
- `load()`: try/catch로 `localStorage.getItem` + `JSON.parse`, 실패 시 `{ stars: {}, best: {} }`. `save(p)`: try/catch. `record(id, stars, score)`: 기존보다 큰 값만 갱신 후 save.
- 게임 시작 버튼: `stars`에 없는 가장 작은 id(전부 있으면 1)로 `startStage`.

### 10.6 부트스트랩 (`game.js` 맨 아래)
- 스크립트가 body 끝에 있으므로 `load` 이벤트를 기다리지 않고 바로 `Game.init()` 호출.
- `Game.init`: `if (!window.Matter) { UI.bind({ 빈 핸들러 7개 }); UI.showFatal(...); return; }` → 나머지 초기화. rAF는 여기서 딱 한 번 시작.

---

## 11. 구현 순서 (작업 단위)와 단위별 셀프 체크

파일당 Write 1회를 원칙으로 하고, 쓴 직후 **다시 읽어** 아래 항목을 확인한다. 순서를 지키면 뒤 파일이 앞 파일의 이름만 참조하게 되어 누락이 줄어든다.

1. **`config.js`** — §4.1 값 전부, §7.1 테이블, `V` 헬퍼. 체크: `G_STEP` 0.27778, 재질 3·새 3·돼지 2 키 철자.
2. **`levels.js`** — 빌더 `L` 6개 매크로, `LEVELS` 10개, `Levels.build`. 체크: 각 매크로 반환값이 윗면 y인지, `house`의 기둥 x가 `cx ± (w/2 − 10)`인지, 표 §6.3의 인자 개수·순서 일치, id 1..10.
3. **`physics.js`** — §7.3~7.5. 체크: 콜백 내 제거 없음, `graceSteps` 게이트, `Sleeping.set` 후 `setVelocity`, `destroy` 중복 방지(`removed` 체크 후 return), `pigsAlive` 감소가 `destroy` 한 곳뿐.
4. **`slingshot.js`** — §8. 체크: 리스너 등록 1회, pointerId 필터, capture release try/catch, 발사 속도 부호(당긴 반대 방향 = `−pull`), `Game` 참조가 핸들러 안에만 있음.
5. **`render.js`** — §9. 체크: 매 프레임 `setTransform` 후 전체 clear, `save/restore` 짝, `meta.removed` 건너뜀, 랜덤은 생성 시에만.
6. **`ui.js`** — §10.4~10.5. 체크: 모든 ID가 `index.html`과 동일, 다시하기/메인으로 3벌 모두 바인딩, `hidden` 토글은 `el.hidden = true/false`로 통일.
7. **`game.js`** — §5. 체크: `Engine.update`는 `stepOnce` 안에서만, PAUSED에서 누산 안 함, `resume`에서 `lastTs` 리셋, `startStage`가 이전 월드 dispose, 판정 3분기, 별 계산, `Progress.record`.
8. **`index.html`, `style.css`** — §10.1~10.3, §2.1 CDN 태그, 스크립트 순서. 체크: `[hidden]` 규칙, 초기 hidden 속성, 스크립트 8개 순서.
9. **교차 검토 패스(§12)** — 모든 파일을 다시 읽으며 레지스트리 대조.

---

## 12. 무실행 검증 체크리스트 (구현자가 마지막에 반드시 수행)

실행할 수 없으므로 아래를 **파일을 다시 읽으며** 하나씩 확인하고, 계획서 대비 어긋난 곳은 고친다.

**A. 로딩/환경**
- [ ] `index.html`에 `type="module"`, `import`, `export`, `require`, `fetch(`, `XMLHttpRequest`, `<img`, `.json` 참조가 없다.
- [ ] 스크립트 순서: CDN(+폴백) → config → levels → physics → slingshot → render → ui → game.
- [ ] `Game.init`이 `window.Matter` 부재를 처리한다.
- [ ] `[hidden] { display:none !important; }` 존재. `#game`, 오버레이 3개에 초기 `hidden`.

**B. 이름 대조** (§3.2 레지스트리와 §10.1 ID 표를 옆에 두고)
- [ ] 다른 파일에서 참조하는 모든 전역/함수/필드 이름이 정의 파일의 철자와 같다(특히 `Levels`/`LEVELS`, `pigsAlive`, `previewPoints`, `showOverlay`, `setHud`, `meta.removed`, `world.effects`).
- [ ] `ui.js`의 `getElementById` 문자열 전부가 `index.html`에 있다(총 20개 내외를 하나씩 대조).
- [ ] Matter 호출이 §2.1 허용 목록 안에만 있다. `Matter.Vector`, `World`, `Runner`, `Render` 사용 없음.
- [ ] 파일 최상위 실행 코드가 뒤에 로드되는 파일의 전역을 읽지 않는다.

**C. 논리**
- [ ] 발사 속도 = `−norm(pull) × (|pull|/MAX_PULL) × MAX_SPEED`, 새 바디 생성 위치 = `anchor + pull`.
- [ ] 예측 루프가 `v.y += G_STEP` 다음 `p += v` 순서이고 새 `frictionAir`가 0.
- [ ] 충돌 콜백: grace 게이트 → 상대속도 임계 → `min(mass)` → 양쪽 데미지 → 새 hit 플래그·frictionAir 변경. 제거는 큐.
- [ ] `step`: update → grace 감소 → OOB → 큐 제거 순서.
- [ ] 샷 종료 4조건, AFTERMATH 판정 3분기, 클리어 시 남은 새 보너스와 별 계산, 10스테이지 `isLast` 처리.
- [ ] 일시정지: DRAG 취소, 누산 중단, 오버레이 표시, 재개 시 `lastTs` 리셋. 다시하기 = `startStage(stageId)`. 메인으로 = 오버레이 닫기 + `showScreen('menu')` + `state='MENU'`.
- [ ] `visibilitychange`·`Escape` 처리.
- [ ] 레벨 10개 모두 `birds.length ≥ 3`, 표 §6.3와 인자 일치, 돼지 수 합 = 1,2,2,3,3,3,3,4,4,6.

**D. 문법(정독)**
- [ ] 각 파일 괄호·중괄호·백틱 짝, 세미콜론, 객체 리터럴 쉼표, `const` 재대입 없음, 선언 전 사용 없음(같은 파일 내 함수 선언은 호이스팅되지만 `const`는 아님).
- [ ] 한 파일 안에서 같은 최상위 이름을 두 번 선언하지 않았고, 파일 간에도 최상위 `const`/`let`/`function` 이름 충돌이 없다(예: 두 파일 모두 최상위 `const anchor` 금지). 파일별 지역 헬퍼는 IIFE 안에 두거나 파일 접두어를 붙인다.

---

## 13. 사람 검수자용 QA 시나리오 (구현자는 수행 불가, 결과 판정용)

1. `index.html` 더블클릭(file://). 메뉴 표시, 콘솔 에러 없음. (D1)
2. 게임 시작 → 스테이지 1. 새 당김 → 점선 → 발사 → 궤적 일치. (D2, D3)
3. 집을 맞혀 나무 파괴·돼지 제거·`+점수`·클리어 오버레이·별. 다음 스테이지 → 2. (D4~D6)
4. 스테이지 1에서 일부러 허공에 3발 → 실패 오버레이 → 다시하기 → 처음 상태. (D7)
5. 비행 중 우측 상단 ❚❚ → 새가 공중에 멈춤 → 계속하기 → 이어짐. 일시정지 → 메인으로 → 메뉴. (D8)
6. 스테이지 3에서 노란 새 탭 가속, 스테이지 6에서 검은 새 폭발로 돌집 파괴. (D9)
7. 창 크기 변경 → 비율 유지, ❚❚ 위치 우측 상단 유지. (D10)
8. 스테이지 클리어 후 새로고침 → 격자에 별 남음. (D11)
9. 스테이지 선택으로 10 진입 → 클리어 시 "모든 스테이지 클리어!" 표시, 다음 버튼 없음.

---

## 14. 리스크와 완화

| 리스크 | 영향 | 완화 |
|---|---|---|
| CDN 접근 불가(오프라인) | 게임 불가 | 폴백 CDN + 메인 화면 오류 문구(§10.5). 오프라인 환경에서는 검수 불가임을 오류 문구로 알림 |
| Matter API 철자/버전 차이 | 런타임 예외 | 허용 API 목록(§2.1)만 사용, 벡터 헬퍼 자작, 0.20.0 고정 |
| file://에서 fetch/module 차단 | 로딩 실패 | 데이터 내장, classic script만 |
| 적층 불안정(스스로 무너짐) | 판정 혼란 | `enableSleeping`, 반복 횟수 상향, 60스텝 데미지 유예, 윗층 ≤ 아랫층 폭 규칙 |
| 새가 굴러서 샷이 안 끝남 | 대기 지연 | 첫 충돌 후 `frictionAir 0.02`, 정지 90스텝 + 10초 상한 + OOB 제거 |
| 오버레이가 `display:flex` 때문에 항상 보임 | UI 파손 | `[hidden]{display:none!important}` 필수 규칙 |
| 파일 간 최상위 이름 충돌 | 전체 SyntaxError | 파일별 IIFE/접두어, §12 D 체크 |
| 테스트 없이 밸런스 어긋남 | 너무 쉽거나 어려움 | 수치는 계산으로 근거 제시(§7.5). 밸런스는 완료 기준이 아님(클리어·실패가 모두 도달 가능하면 충분) |
| 잠든 바디에 `setVelocity`가 안 먹음 | 폭발이 밀지 못함 | `Sleeping.set(body,false)` 선행 |
| 큰 dt(탭 전환) 후 폭주 | 프레임 정지 | dt 100ms 클램프, 숨김 시 자동 일시정지 |
