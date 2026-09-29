# 웹 브라우저 앵그리버드 게임: 구현 계획서

## 0. 구현자 전제와 이 문서 사용법

- 구현자는 **파일 읽기와 쓰기만** 할 수 있다. 설치, 빌드, 실행, 테스트는 불가능하다. 그래서 이 계획은 다음을 기준으로 짰다.
  - **빌드 도구 없이** 정적 파일만으로 동작해야 한다. `index.html`을 더블클릭해 `file://`로 열어도 돌아가야 한다.
  - 수치, 좌표, 상태 전이를 가능한 한 **이 문서에서 확정**해 두었다. 구현자는 튜닝 판단을 하지 않고 명세를 옮긴다.
  - 실행해서 검증할 수 없으니 **§17 정적 자기검증 체크리스트**를 반드시 수행한다.
- 이 문서의 값(상수, 좌표, 문자열)은 그대로 사용한다. 명세에 없는 세부(색 미세조정, 폰트 크기 등)는 구현자가 정한다.
- UI 문구는 한국어로, 코드 식별자와 주석은 영어로 쓴다.

---

## 1. 산출물

작업 루트(이 plan.md가 있는 디렉터리)를 기준으로 `game/` 아래에 만든다.

```
game/
  index.html        # DOM 골격, 오버레이, 스크립트 로드
  style.css         # 레이아웃, 오버레이, 버튼
  README.md         # 실행법, 조작법, 오프라인 대비, 수동 테스트 절차(§18 요약)
  js/
    config.js       # 모든 상수, 재질/돼지/새 정의
    stages.js       # 프리팹 헬퍼 + 10개 스테이지 데이터 + 데이터 검증 함수
    storage.js      # localStorage 진행도
    level.js        # Matter 월드 생성, 충돌/데미지, 능력, 턴 판정, 궤적 예측 (게임 규칙 전부)
    render.js       # Canvas 2D 그리기 (월드, HUD, 이펙트)
    ui.js           # DOM 화면/오버레이 표시, 버튼 바인딩, 스테이지 선택 그리드
    game.js         # 최상위 상태 머신, 입력 처리, 메인 루프
    main.js         # 부트스트랩(Matter 로드 확인, 초기화, 오류 화면)
```

`game/vendor/`는 만들지 않는다(다운로드 불가). README에 사용자가 직접 넣는 방법을 안내한다(§5.1).

---

## 2. 핵심 결정 요약

| 질문 | 결정 | 이유 |
|---|---|---|
| 물리 엔진 | **Matter.js 0.20.0**을 CDN `<script>`로 로드하고 로컬 폴백을 둔다 | 구조물 적층과 회전 강체를 직접 구현하면 실행 없이 안정성을 보장할 수 없다. Matter는 API가 안정적이고 잘 알려져 있다 |
| 렌더링 | **Canvas 2D로 직접 그림** (`Matter.Render` 미사용). 메뉴와 오버레이는 **DOM** | 카메라 변환, 궤적 점, 손상 표현을 자유롭게 그릴 수 있다. 버튼은 DOM이 클릭 판정과 접근성 면에서 확실하다 |
| 모듈 방식 | **ES 모듈과 fetch 미사용**. classic `<script>` 여러 개를 쓰고 전역 네임스페이스 `window.AB` 하나만 둔다 | `file://`에서는 모듈과 fetch가 CORS로 막힌다 |
| 카메라 | **고정 카메라**. 1600×900 월드 전체를 화면에 맞춰 스케일하고 레터박스를 둔다 | 팬/줌은 검증 비용이 크다. 모든 스테이지를 이 영역 안에 설계한다 |
| 물리 스텝 | **고정 스텝 1000/60 ms**. 누적기 방식이고 프레임당 최대 5스텝 | 결정적 동작, 궤적 예측 일치, 일시정지 정확성 |
| 스테이지 데이터 | JS 객체 배열(`AB.STAGES`)로 두고 **프리팹 헬퍼**(`frame`, `post`, `plank`, `block`, `pig`)로 조립한다. 좌표는 "지면 위 높이(b)"로 적는다 | 수작업 좌표 오류와 겹침을 줄인다 |
| 궤적 예측 | 조준 중 **초반 50스텝 분량의 점선**을 보여 주고, **직전 발사의 실제 궤적**을 흐린 점으로 남긴다 | 조준을 돕되 게임이 너무 쉬워지지 않게 한다 |
| 파괴 모델 | 충돌 순간 **법선 방향 상대속도로 데미지**를 계산해 HP를 깎고, 0 이하가 되면 제거한다 | 앵그리버드식 "세게 맞으면 부서짐"을 단순한 규칙으로 구현한다 |
| 별점 | 클리어 시 **남은(미발사) 새 수로 결정**: `1 + min(2, 남은 새)` | 실행 튜닝 없이도 의미 있는 기준이다 |
| 새 종류 | 빨강(기본), 노랑(비행 중 탭하면 가속), 검정(탭하면 폭발, 충돌 1.5초 후 자동 폭발) | 앵그리버드다운 변주. 각 능력은 규칙 몇 줄로 끝난다 |
| 일시정지 | 인게임 **우측 상단** DOM 버튼. 오버레이에 **계속하기 / 다시하기 / 메인으로**. Esc 키로도 토글하고, 탭이 숨겨지면 자동으로 일시정지 | 요구사항 3 충족(계속하기는 추가 편의 기능) |
| 사운드 | 넣지 않음 | 에셋이 없고 검증도 불가능하다 |

---

## 3. 아키텍처

### 3.1 스크립트 로드 순서 (index.html의 `<body>` 끝)

1. `https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js`
2. 인라인 한 줄: `window.Matter`가 없으면 `document.write`로 `vendor/matter.min.js`를 로드한다. 문자열 안의 닫는 태그는 `<\/script>`로 이스케이프한다.
3. `js/config.js` → `js/stages.js` → `js/storage.js` → `js/level.js` → `js/render.js` → `js/ui.js` → `js/game.js` → `js/main.js`

규칙:
- 모든 파일은 `(function () { 'use strict'; ... })();` IIFE로 감싸고 `window.AB = window.AB || {};`에 자기 모듈을 붙인다.
- **로드 시점에 다른 모듈을 호출하는 것은 config와 stages 참조만 허용**한다. 그 외 모듈 간 호출은 `main.js`의 초기화 이후 런타임에만 한다.
- `import`, `export`, `type="module"`, `fetch`, `XMLHttpRequest`, 외부 이미지/폰트/사운드 파일은 쓰지 않는다. 모든 그래픽은 Canvas 도형으로 그린다.

### 3.2 모듈 계약 (전역 `AB`)

| 모듈 | 공개 이름 | 책임 |
|---|---|---|
| config.js | `AB.C` (상수), `AB.MATERIALS`, `AB.PIGS`, `AB.BIRDS` | 값 정의만 한다. 로직은 없다 |
| stages.js | `AB.STAGES` (길이 10 배열), `AB.validateStages()` | 프리팹 헬퍼는 파일 내부 전용. 데이터는 불변으로 취급한다 |
| storage.js | `AB.storage.load()`, `AB.storage.recordClear(stageIndex, score, stars)`, `AB.storage.getUnlocked()` | 저장 스키마는 §14 |
| level.js | `AB.level.create(stageDef)` → Level, `AB.level.step(L)`, `AB.level.launch(L, pos, vel)`, `AB.level.triggerAbility(L)`, `AB.level.predict(pos, vel)` → 점 배열, `AB.level.birdsLeft(L)` | 물리와 게임 규칙 전부. DOM을 모른다 |
| render.js | `AB.render.init(canvas)`, `AB.render.resize()`, `AB.render.draw(game)`, `AB.render.screenToWorld(clientX, clientY)` | 그리기와 좌표 변환만 한다. 상태를 바꾸지 않는다 |
| ui.js | `AB.ui.init(handlers)`, `AB.ui.sync(game)` | DOM 표시/숨김은 **오직 `sync`에서만** 한다. 버튼은 전달받은 handler만 호출한다 |
| game.js | `AB.game` (객체), `AB.game.init()` | 상태 머신, 입력, 루프. level/render/ui/storage를 조율한다 |
| main.js | (없음) | Matter 존재 확인 → `validateStages` → `game.init()` → 오류 시 에러 오버레이 |

---

## 4. 좌표계와 상수 (`AB.C`)

- 월드 단위는 px, y축은 아래로 증가한다. 월드 크기는 **1600 × 900**, 지면 윗면은 **y = 800**이다.
- 속도 단위는 **px/step**(1 step = 1000/60 ms)이다. Matter 0.20의 `Body.setVelocity`와 `body.velocity`가 이 단위를 쓴다(엔진 델타가 기본값 1000/60과 같을 때).

| 이름 | 값 | 의미 |
|---|---|---|
| `WORLD_W`, `WORLD_H` | 1600, 900 | 월드 크기 |
| `GROUND_Y` | 800 | 지면 윗면 y |
| `STEP_MS` | 1000/60 | 물리 스텝 |
| `MAX_FRAME_MS` | 100 | 프레임 dt 상한 |
| `MAX_STEPS_PER_FRAME` | 5 | 스텝 누적 상한 |
| `GRAVITY_Y`, `GRAVITY_SCALE` | 1, 0.001 | Matter 중력 설정 |
| `G_STEP` | `GRAVITY_Y * GRAVITY_SCALE * STEP_MS * STEP_MS` (≈0.2778) | 스텝당 속도 증가량. **식으로 계산**하고 하드코딩하지 않는다 |
| `SLING_X`, `SLING_Y` | 230, 650 | 새총 앵커 = 대기 중인 새의 중심 |
| `BIRD_R` | 20 | 모든 새의 반지름 |
| `MAX_PULL` | 120 | 최대 당김 거리 |
| `MIN_PULL` | 15 | 이보다 짧게 놓으면 발사를 취소한다 |
| `GRAB_RADIUS` | 70 | 새를 잡을 수 있는 반경(터치 고려) |
| `MAX_LAUNCH_SPEED` | 20 | 최대 당김일 때 발사 속도(px/step) |
| `PREDICT_STEPS`, `PREDICT_DOT_EVERY` | 50, 3 | 예측 궤적 길이와 점 간격 |
| `TRAIL_EVERY`, `TRAIL_MAX` | 3, 200 | 실제 궤적 기록 |
| `MIN_IMPACT` | 1.5 | 이 충격속도 미만은 데미지 없음 |
| `DAMAGE_K` | 10 | 데미지 계수 |
| `REST_SPEED`, `REST_ANG`, `REST_STEPS` | 0.25, 0.02, 30 | "월드 정지" 판정 |
| `BIRD_SLOW_SPEED`, `BIRD_SLOW_STEPS` | 0.3, 40 | "새가 멈춤" 판정 |
| `FLIGHT_MAX_STEPS` | 480 | 발사 후 새 턴 최대 길이(8초) |
| `SETTLE_MAX_STEPS` | 240 | 정지 대기 최대(4초) |
| `CLEAR_SETTLE_MAX_STEPS` | 90 | 돼지 전멸 후 정지 대기 최대(1.5초) |
| `OOB_MARGIN` | 100 | 월드 밖 제거 여백 |
| `BIRD_BONUS` | 10000 | 남은 새 1마리당 보너스 |
| `BIRD_FRICTION_AIR_AFTER_HIT` | 0.02 | 첫 충돌 뒤 새 감쇠(무한히 구르는 것 방지) |
| `YELLOW_BOOST`, `YELLOW_MIN_SPEED`, `YELLOW_MAX_SPEED` | 2, 16, 26 | 노랑 가속 |
| `EXPLOSION_R`, `EXPLOSION_DAMAGE`, `EXPLOSION_IMPULSE`, `EXPLOSION_MAX_DV` | 170, 170, 60, 20 | 검정 폭발 |
| `BLACK_FUSE_STEPS` | 90 | 첫 충돌 뒤 자동 폭발까지의 스텝 |
| `PARTICLE_MAX` | 300 | 파티클 상한 |
| `DPR_MAX` | 2 | devicePixelRatio 상한 |

사거리 검증(구현자가 바꾸지 말 것): v=20, 45°이면 수평 사거리가 약 1440px이고 최고점은 발사점 위 약 360px(y≈290)이다. 새총(x=230)에서 가장 먼 목표(x≈1470, 높이 360)까지 도달 가능하다.

### 4.1 재질 `AB.MATERIALS`

| 키 | density | friction | frictionStatic | restitution | hp | 파괴 점수 | 채움 / 외곽선 |
|---|---|---|---|---|---|---|---|
| `wood` | 0.0015 | 0.7 | 1.0 | 0.05 | 60 | 500 | #c8893d / #7a4f1d |
| `ice` | 0.0010 | 0.3 | 0.6 | 0.10 | 30 | 300 | rgba(170,220,255,0.85) / #5fa8d8 |
| `stone` | 0.0040 | 0.9 | 1.2 | 0.02 | 140 | 1000 | #9aa0a6 / #5f6368 |
| `terrain` | isStatic | 1.0 | 1.0 | 0.1 | 파괴 불가 | 0 | #8b5a2b / #5c3a1a, 윗면 잔디 #6b8e23 |

### 4.2 돼지 `AB.PIGS` (물리 형상은 **8각형**이고 `Bodies.polygon(x, y, 8, r)`로 만든다. 그리기는 원)

| 키 | r(외접반경) | hp | 점수 | 외형 |
|---|---|---|---|---|
| `small` | 18 | 15 | 3000 | 기본 |
| `medium` | 24 | 30 | 5000 | 기본 |
| `large` | 32 | 60 | 7000 | 기본 |
| `helmet` | 24 | 70 | 7000 | 회색 헬멧 반원 |
| `king` | 40 | 120 | 10000 | 노란 왕관 |

- 공통 물성: density 0.0012, friction 0.8, frictionStatic 1.0, restitution 0.1.
- 8각형을 쓰는 이유: 원형 강체는 판자 위에서 미세 진동만 있어도 굴러떨어진다. Matter의 `Bodies.polygon`은 8변일 때 윗변과 아랫변이 수평이다.
- 배치할 때 중심 y는 `GROUND_Y - b - r*cos(π/8)`이다(아포템 기준). 그리기 반지름은 `r*0.95`.

### 4.3 새 `AB.BIRDS` (모두 원, 반지름 `BIRD_R`, density 0.004, friction 0.5, restitution 0.35, **frictionAir 0**)

| 키 | 색 | 재질별 데미지 배수 {wood, ice, stone, pig} | 능력 |
|---|---|---|---|
| `red` | #d62828 | {1, 1, 0.5, 1} | 없음 |
| `yellow` | #f4c20d | {2, 1, 0.4, 1} | `dash` |
| `black` | #2b2b2b | {1, 1, 1, 1} | `bomb` |

모든 새의 크기와 밀도가 같으므로 궤적 예측 공식 하나로 충분하다.

---

## 5. 물리 (Matter.js 사용 규칙)

### 5.1 로드와 폴백
- CDN 로드에 실패하면 `vendor/matter.min.js`를 폴백으로 시도한다(§3.1).
- 둘 다 실패해 `window.Matter`가 없으면 main.js가 에러 오버레이를 띄운다: "물리 엔진(Matter.js)을 불러오지 못했습니다. 인터넷 연결을 확인하거나 README의 오프라인 설치 방법을 따르세요."
- README 안내: matter-js 0.20.0의 `build/matter.min.js`를 받아 `game/vendor/matter.min.js`에 두면 오프라인에서 동작한다.

### 5.2 사용 API 화이트리스트 (이 외에는 쓰지 않는다)
- `Matter.Engine.create({ gravity: {x:0, y: GRAVITY_Y, scale: GRAVITY_SCALE}, positionIterations: 10, velocityIterations: 10, enableSleeping: false })`
- `Matter.Engine.update(engine, C.STEP_MS)`: **항상 정확히 STEP_MS**를 넘긴다(0.20은 16.667 초과 시 경고).
- `Matter.Bodies.rectangle(x, y, w, h, opts)`, `Matter.Bodies.circle(x, y, r, opts)`, `Matter.Bodies.polygon(x, y, 8, r, opts)`
- `Matter.Composite.add(engine.world, body)`, `Matter.Composite.remove(engine.world, body)`
- `Matter.Body.setVelocity(body, {x, y})`
- `Matter.Events.on(engine, 'collisionStart', handler)`: `event.pairs[i].bodyA / bodyB / collision.normal`
- 읽기 전용 속성: `body.id`, `body.position`, `body.angle`, `body.velocity`, `body.speed`, `body.angularSpeed`, `body.mass`, `body.isStatic`, `body.parent`
- 쓰기 속성: `body.frictionAir`(새 첫 충돌 시에만)

### 5.3 엔진 운용 규칙
- **스테이지를 로드할 때마다 새 Engine을 만든다.** 다시하기나 메인으로 이동 시 기존 Level 참조를 버리는 것으로 정리한다(이벤트 핸들러도 엔진과 함께 버려짐).
- **sleeping은 끈다.** Matter의 sleeping은 받침이 제거돼도 위의 물체가 공중에 떠 있는 문제가 있다.
- **Events 핸들러 안에서는 `Composite.remove`를 하지 않는다.** 핸들러는 HP 감소와 `dead` 표시만 하고 `pendingDeaths`에 넣는다. 제거는 `Engine.update`가 반환된 뒤 `level.step`에서 처리한다(§9.3).
- 지면은 static 사각형 하나다: 중심 `(WORLD_W/2, GROUND_Y + 250)`, 크기 `6000 × 500`, 재질 `terrain`. 두껍게 만들어 관통을 막는다.
- 스테이지의 `terrain` 블록은 static 사각형이다.
- 블록과 돼지의 frictionAir는 Matter 기본값(0.01)을 둔다.
- 새는 **발사 순간에 생성해 월드에 추가**한다. 대기와 조준 중에는 물리 바디가 없고 그리기만 한다.

---

## 6. 런타임 데이터 모델

**Entity** (level.js 내부. render.js는 읽기만 함)
- `id`, `kind`: `'block' | 'pig' | 'bird' | 'terrain'`, `body`
- 블록/지형: `material`, `w`, `h`
- 돼지: `pigType`, `r` / 새: `birdType`, `r`
- `hp`, `maxHp`(지형과 새는 Infinity), `dead`(boolean)
- 새 전용: `abilityUsed`, `hasCollided`, `collidedAtStep`

**Level** (`AB.level.create`의 반환값)
- `def`: 스테이지 정의(읽기 전용), `engine`, `entities`: Entity[], `byBodyId`: Map<number, Entity>
- `pigsAlive`, `score`, `damageArmed`(첫 발사 전에는 false), `stepCount`
- `queue`: 아직 새총에 오르지 않은 새 타입 배열, `current`: 새총 위의 새 타입 또는 null
- `phase`: `'ready' | 'aiming' | 'flying' | 'settling'`
- `bird`: 발사된 새 Entity 또는 null, `aimPos`: 조준 중인 새 위치 {x,y} 또는 null
- 카운터: `flightSteps`, `birdSlowSteps`, `settleSteps`, `settledSteps`, `settleCap`
- `trail`: 점 배열(현재 또는 직전 발사), `pendingDeaths`: Entity[]
- `fx`: `{ particles: [], popups: [], rings: [] }`
- `outcome`: `null | 'clear' | 'fail'`(level이 판정하고 game이 소비). `stars`, `bonus`(클리어 시 기록)

`birdsLeft(L)` = `queue.length + (current ? 1 : 0)`: 아직 발사하지 않은 새의 수.

---

## 7. 스테이지

### 7.1 스키마 (프리팹을 펼친 뒤의 최종 형태)
```
{ id: 1..10, name: string, hint: string|null, birds: BirdType[],
  blocks: [{ m: 'wood'|'ice'|'stone'|'terrain', x, b, w, h }],
  pigs:   [{ t: PigType, x, b }] }
```
- `x`: 중심 x(월드 좌표). `b`: **지면 윗면(GROUND_Y) 위로 물체 바닥까지의 높이**.
- 블록 중심 y = `GROUND_Y - b - h/2`. 회전(angle)은 없고 모든 블록은 축 정렬 상태로 시작한다.
- 돼지 중심 y = `GROUND_Y - b - r*cos(π/8)`.

### 7.2 프리팹 헬퍼 (stages.js 내부 함수, 블록 객체 배열을 반환)
- `block(m, x, b, w, h)` → 블록 1개
- `post(m, x, b, h = 100)` → `block(m, x, b, 20, h)`
- `plank(m, x, b, w)` → `block(m, x, b, w, 20)`
- `frame(m, x, b, span, h = 100)` → 기둥 2개와 판자 1개
  - 기둥: 중심 x = `x - span/2 + 10`, `x + span/2 - 10`, 바닥 `b`, 크기 20×h
  - 판자: 중심 x = `x`, 바닥 `b + h`, 크기 span×20
  - **윗면 높이 = b + h + 20.** 기둥의 바깥 모서리는 판자 양 끝과 일치한다.
- `pig(t, x, b)` → 돼지 객체
- 스테이지의 `blocks`는 헬퍼 결과를 이어 붙여(concat) 만든다.

### 7.3 배치 불변식 (모든 스테이지가 만족해야 함)
1. 모든 블록과 돼지는 x ∈ [760, 1540], b ≥ 0이다. 새총 쪽(x < 700)에는 아무것도 없다.
2. 블록끼리 **겹치는 면적이 0**이다(모서리와 변이 닿는 것은 허용).
3. 모든 비정적 블록의 바닥 변 전체 폭이 지면, 지형, 또는 다른 블록의 윗면 위에 놓인다. 받침 폭 밖으로 삐져나오는 것은 판자가 기둥 2개 위에 걸치는 경우만 허용한다.
4. 돼지는 중심 x 아래에 받침면이 있어야 한다(틈 위에 걸치지 않음). 좌우로 벽/기둥과 겹치지 않는다.
5. 프레임 안의 돼지는 `2r ≤ h`이고, 돼지 x가 [안쪽 기둥 면 + r, 반대쪽 안쪽 면 - r] 안에 있다.
6. 쌓는 frame의 span은 아래 frame의 span 이하이며, 위층 기둥이 아래 판자 위에 완전히 올라가야 한다.

`AB.validateStages()`(부팅 시 1회, 막지 않고 `console.warn`만): 스테이지 수 10, 새/돼지/재질 키 유효성, 불변식 1·2(AABB 겹침 면적 > 1px²), 돼지와 블록의 겹침(돼지를 반지름 `r*cos(π/8) - 1`인 원으로 보고 AABB와 교차 검사)을 확인한다.

### 7.4 10개 스테이지 명세

표기: `frame(재질, x, b, span[, h])` 등은 §7.2 헬퍼 호출이다. 괄호 안 "윗면"은 계산 결과이므로 구현자가 검산한다.

**1. 첫 발사**: 새 `[red, red, red]`, hint: "새를 뒤로 끌어 조준하고, 놓아서 발사하세요!"
- `frame(wood, 1150, 0, 140)` (윗면 120)
- `pig(small, 1150, 0)` (프레임 안), `pig(small, 1150, 120)` (위)

**2. 두 개의 탑**: `[red, red, red]`
- `frame(wood, 1000, 0, 120)` (윗면 120), `pig(small, 1000, 120)`
- `frame(wood, 1300, 0, 120)`, `frame(wood, 1300, 120, 120)` (윗면 240)
- `pig(small, 1300, 0)`, `pig(medium, 1300, 240)`

**3. 얼음 탑**: `[red, red, red]`, hint: "얼음은 약하고, 나무는 조금 더 단단합니다."
- `frame(ice, 1050, 0, 140)`, `frame(ice, 1050, 120, 140)` (윗면 240)
- `pig(small, 1050, 0)`, `pig(small, 1050, 120)`, `pig(medium, 1050, 240)`
- `frame(wood, 1350, 0, 100, 60)` (윗면 80), `pig(small, 1350, 80)`

**4. 두 칸 집**: `[red, red, red]`
- `frame(wood, 1000, 0, 200)` (x 900–1100, 윗면 120)
- `frame(wood, 1210, 0, 200)` (x 1110–1310, 윗면 120)
- `frame(ice, 1105, 120, 140)` (기둥 1045와 1165가 각각 왼쪽과 오른쪽 판자 위, 윗면 240)
- `pig(medium, 1000, 0)`, `pig(medium, 1210, 0)`, `pig(small, 1105, 240)`

**5. 돌의 등장**: `[red, yellow, red]`, hint: "노란 새: 날아가는 중에 화면을 탭하면 가속합니다."
- `block(stone, 1150, 0, 280, 40)` (x 1010–1290, 윗면 40)
- `frame(wood, 1080, 40, 120)` (x 1020–1140), `frame(wood, 1220, 40, 120)` (x 1160–1280), 둘 다 윗면 160
- `plank(stone, 1150, 160, 280)` (윗면 180)
- `pig(small, 1080, 40)`, `pig(small, 1220, 40)`, `pig(medium, 1150, 180)`

**6. 높은 탑**: `[red, yellow, yellow]`
- `block(stone, 1000, 0, 40, 120)` (앞쪽 돌벽)
- `frame(wood, 1250, 0, 140)`, `frame(wood, 1250, 120, 140)`, `frame(wood, 1250, 240, 140)` (윗면 360)
- `pig(small, 1250, 0)`, `pig(small, 1250, 120)`, `pig(small, 1250, 240)`, `pig(medium, 1250, 360)`

**7. 폭탄 새**: `[red, black, black]`, hint: "검은 새: 날아가는 중에 탭하면 폭발합니다. 부딪힌 뒤 잠시 후 자동으로 터집니다."
- `frame(stone, 1150, 0, 200)` (x 1050–1250, 윗면 120), `pig(large, 1150, 0)`
- `frame(stone, 1150, 120, 140)` (윗면 240), `pig(medium, 1150, 120)`, `pig(small, 1150, 240)`
- `block(ice, 1320, 0, 40, 40)`, `block(ice, 1320, 40, 40, 40)`, `block(ice, 1320, 80, 40, 40)` (윗면 120), `pig(small, 1320, 120)`

**8. 절벽 위 요새**: `[red, yellow, black, red]`
- 지형: `block(terrain, 1300, 0, 400, 160)` (x 1100–1500, 윗면 160)
- `frame(wood, 1200, 160, 140)`, `frame(ice, 1400, 160, 140)` (둘 다 윗면 280)
- `pig(medium, 1200, 160)`, `pig(medium, 1400, 160)`, `pig(small, 1200, 280)`, `pig(small, 1400, 280)`
- 절벽 앞 지면: `frame(stone, 950, 0, 120)`, `pig(small, 950, 0)`

**9. 대형 성**: `[red, yellow, black, black]`
- 1층: `frame(stone, 1000, 0, 160)` (920–1080), `frame(wood, 1170, 0, 160)` (1090–1250), `frame(stone, 1340, 0, 160)` (1260–1420), 모두 윗면 120
- 2층: `frame(wood, 1085, 120, 160)` (1005–1165, 기둥 1015와 1155), `frame(wood, 1255, 120, 160)` (1175–1335, 기둥 1185와 1325), 윗면 240
- 3층: `frame(ice, 1170, 240, 180)` (1080–1260, 기둥 1090과 1250), 윗면 360
- 돼지: `pig(medium, 1000, 0)`, `pig(helmet, 1170, 0)`, `pig(medium, 1340, 0)`, `pig(small, 1052, 120)`, `pig(small, 1288, 120)`, `pig(large, 1170, 360)`
- 주의: 2층 돼지의 x(1052, 1288)는 아래 1층 판자 위이면서 2층 기둥과 겹치지 않도록 계산한 값이다. 바꾸지 않는다.

**10. 킹 피그**: `[red, yellow, black, yellow, black]`, hint: "마지막 스테이지! 킹 피그를 쓰러뜨리세요."
- 지형: `block(terrain, 1250, 0, 500, 80)` (x 1000–1500, 윗면 80)
- `frame(stone, 1120, 80, 180)` (1030–1210), `frame(stone, 1380, 80, 180)` (1290–1470), 둘 다 윗면 200
- `pig(medium, 1120, 80)`, `pig(medium, 1380, 80)`, `pig(small, 1250, 80)` (두 프레임 사이 틈 1210–1290)
- `plank(stone, 1250, 200, 320)` (다리, 1090–1410, 윗면 220)
- `frame(wood, 1250, 220, 200)` (1150–1350, 윗면 340), `pig(king, 1250, 220)` (프레임 안)
- `pig(small, 1250, 340)`
- 앞쪽 지면: `block(ice, 900, 0, 40, 160)`

돼지 수: 2, 3, 4, 3, 3, 4, 4, 5, 6, 5.

---

## 8. 슬링샷 입력과 궤적 예측

### 8.1 좌표 변환
- `render.resize()`가 캔버스 CSS 크기(cw, ch)로 `scale = min(cw/WORLD_W, ch/WORLD_H)`, `offX = (cw - WORLD_W*scale)/2`, `offY = (ch - WORLD_H*scale)/2`를 계산해 보관한다.
- `screenToWorld(clientX, clientY)`: `rect = canvas.getBoundingClientRect()`로 `wx = (clientX - rect.left - offX)/scale`, `wy = (clientY - rect.top - offY)/scale`를 구한다.
- 캔버스 픽셀 크기는 `cw*dpr × ch*dpr`(dpr = min(devicePixelRatio, DPR_MAX))이고, 그리기 변환은 `setTransform(dpr*scale, 0, 0, dpr*scale, dpr*offX, dpr*offY)`이다.

### 8.2 입력 처리 (game.js, Pointer Events로 마우스와 터치를 통합)
- 캔버스 CSS에 `touch-action: none`을 두고, `contextmenu`는 preventDefault한다.
- **pointerdown**(state가 PLAYING일 때만):
  - phase `ready`이고 포인터 월드 좌표가 `(SLING_X, SLING_Y)`에서 `GRAB_RADIUS` 안이면 phase를 `aiming`으로 바꾸고, `setPointerCapture`, 활성 pointerId를 기록한다.
  - phase `flying`이면 `level.triggerAbility(L)`를 호출한다.
- **pointermove**(aiming, 같은 pointerId): `pull = pointer - anchor`. `|pull| > MAX_PULL`이면 길이를 MAX_PULL로 자른다. 결과 `aimPos = anchor + pull`에서 `aimPos.y`는 `GROUND_Y - BIRD_R - 2` 이하로 제한한다.
- **pointerup / pointercancel**(aiming): `d = |aimPos - anchor|`.
  - `d < MIN_PULL`이면 취소한다: phase를 `ready`로, aimPos를 null로.
  - 아니면 `vel = (anchor - aimPos) / MAX_PULL * MAX_LAUNCH_SPEED`로 `level.launch(L, aimPos, vel)`를 호출한다.
- 키보드: `Escape`로 PLAYING ↔ PAUSED를 토글한다. `Space`는 flying 중 능력 발동이다.
- 일시정지로 들어갈 때 aiming 중이면 조준을 취소한다(phase ready, aimPos null, pointer capture 해제).

### 8.3 발사 (`level.launch`)
1. `damageArmed = true`로 한다(첫 발사부터 데미지 활성).
2. `current` 타입으로 새 Entity를 만든다(`Bodies.circle(aimPos, BIRD_R, {density, friction, restitution, frictionAir: 0})`). 월드에 추가하고 `Body.setVelocity(body, vel)`.
3. `current = null`, `bird = entity`, `phase = 'flying'`, 카운터를 초기화하고 `trail = []`.

### 8.4 궤적 예측 (`level.predict(pos, vel)`, 순수 함수)
- Matter의 Verlet 적분과 같은 순서를 따른다. 스텝마다 `vy += G_STEP`, 그다음 `x += vx`, `y += vy`.
- `PREDICT_STEPS`회 반복하면서 `PREDICT_DOT_EVERY` 스텝마다 점을 기록한다. `y > GROUND_Y - BIRD_R`이면 중단한다.
- 렌더: 흰 점. 뒤로 갈수록 반지름 4→2, 불투명도 0.9→0.3.
- 전제: 새의 `frictionAir = 0`. 예측은 충돌을 고려하지 않는다.

### 8.5 실제 궤적
- flying 중 새가 있으면 `TRAIL_EVERY` 스텝마다 위치를 `trail`에 추가한다(최대 `TRAIL_MAX`).
- 다음 발사 전까지 흐린 흰 점(반지름 3, 불투명도 0.35)으로 남긴다.

---

## 9. 충돌, 데미지, 파괴, 점수

### 9.1 `collisionStart` 핸들러 (level.create에서 등록)
각 pair에 대해 다음을 수행한다.
1. `A = byBodyId.get(pair.bodyA.parent.id)`, `B`도 같은 방식. 없으면 무시한다.
2. 한쪽이 새이고 `!hasCollided`이면 `hasCollided = true`, `collidedAtStep = stepCount`, `body.frictionAir = BIRD_FRICTION_AIR_AFTER_HIT`.
3. `!damageArmed`이면 여기서 끝낸다.
4. `n = pair.collision.normal`, `rv = A.body.velocity - B.body.velocity`(static은 0), `impact = |rv·n|`. `impact < MIN_IMPACT`이면 끝낸다.
5. `base = (impact - MIN_IMPACT) * DAMAGE_K`.
6. A와 B 각각(X)에 대해: X가 `block`(비지형)이나 `pig`이고 `!dead`이면
   - 상대(O)가 새이면 `mult = AB.BIRDS[O.birdType].dmg[X가 돼지면 'pig', 아니면 X.material]`, 아니면 `mult = 1`
   - `X.hp -= base * mult`. `X.hp <= 0`이면 `X.dead = true`로 하고 `pendingDeaths`에 넣는다.
- 새, 지면, 지형은 데미지를 받지 않는다.
- 참고: Matter 0.20에서 collisionStart는 충돌 해소 **전**에 발생하므로 `body.velocity`는 충돌 직전 속도다.

### 9.2 폭발 데미지 (§10.2)는 핸들러 밖에서 같은 `hp` 감소와 `pendingDeaths` 경로를 쓴다.

### 9.3 `level.step(L)` 순서 (1 스텝)
1. `Engine.update(engine, STEP_MS)`, `stepCount++`
2. **월드 밖 검사**: `kind !== 'terrain'`인 모든 Entity 중 `x < -OOB_MARGIN || x > WORLD_W + OOB_MARGIN || y > WORLD_H + OOB_MARGIN`이면 `dead = true`로 하고 pendingDeaths에 넣는다(돼지는 처치로 인정).
3. **검정 자동 폭발**: `bird`가 black이고 `hasCollided && !abilityUsed`이며 `stepCount - collidedAtStep ≥ BLACK_FUSE_STEPS`이면 폭발한다.
4. **pendingDeaths 처리**(중복 방지: 이미 제거된 것은 건너뜀): `Composite.remove`, `entities`와 `byBodyId`에서 제거한다.
   - 블록: `score += 재질 점수`, 파편 파티클 8개
   - 돼지: `pigsAlive--`, `score += 돼지 점수`, 초록 연기 파티클 10개, 팝업 "+점수"
   - 새: `L.bird`가 이 새이면 `L.bird = null`
5. 파티클, 팝업, 링 갱신(스텝 기반이라 일시정지 시 함께 멈춤)
6. 턴 로직(§11)

### 9.4 손상 표현
- `hp/maxHp < 0.66`이면 금 1줄, `< 0.33`이면 2줄. 블록 로컬 좌표에 고정된 사선으로 그려 깜빡이지 않게 한다.
- 돼지: `hp/maxHp < 0.5`이면 눈 주위에 멍(어두운 원)을 그린다.

---

## 10. 새 능력 (`level.triggerAbility(L)`)

phase가 `flying`이고 `L.bird`가 존재하며 `!abilityUsed`일 때만 동작한다. 그 외에는 아무것도 하지 않는다.

### 10.1 노랑 `dash`
- 조건: `!hasCollided`
- `s = |v|`. `s < 1`이면 무시한다. 새 속력 = `min(max(s * YELLOW_BOOST, YELLOW_MIN_SPEED), YELLOW_MAX_SPEED)`이고 방향은 유지한다. `Body.setVelocity`.
- `abilityUsed = true`, 새 위치에 흰 링 이펙트(짧게).

### 10.2 검정 `bomb` (탭 발동 또는 §9.3-3 자동)
- 중심 c = 새 위치. `kind`가 block(비지형) 또는 pig이고 `!dead`인 각 Entity E에 대해:
  - 거리 d: 돼지는 `max(0, |E.pos - c| - E.r)`. 블록은 c를 블록 로컬 좌표(-angle 회전)로 옮긴 뒤 `[-w/2,w/2]×[-h/2,h/2]`로 clamp한 가장 가까운 점까지의 거리.
  - `d < EXPLOSION_R`이면 `f = 1 - d/EXPLOSION_R`
    - 방향 `dir = normalize(E.pos - c)`(길이 0이면 (0,-1))
    - `dv = min(EXPLOSION_IMPULSE * f / E.body.mass, EXPLOSION_MAX_DV)`로 `Body.setVelocity(E.body, v + dir*dv)`
    - `E.hp -= EXPLOSION_DAMAGE * f`. 0 이하이면 dead와 pendingDeaths.
- 새 자신은 `abilityUsed = true`, `dead = true`, pendingDeaths에 넣는다.
- 주황 링 이펙트(반지름 0→EXPLOSION_R, 20스텝)와 파티클 12개.
- settling 중 자동 폭발이 일어나면 `settledSteps = 0`으로 되돌린다.

---

## 11. 턴 진행과 클리어/실패 판정 (level.step의 마지막 단계)

`resolve()`:
1. `L.bird`가 남아 있으면 제거한다(월드와 entities에서 빼고 점수는 없음).
2. `pigsAlive === 0`이면: `bonus = birdsLeft * BIRD_BONUS`, `score += bonus`, `stars = 1 + min(2, birdsLeft)`, `outcome = 'clear'`.
3. 아니고 `queue.length > 0`이면: `current = queue.shift()`, `phase = 'ready'`.
4. 아니면 `outcome = 'fail'`.

phase별 처리(`outcome`이 이미 정해졌으면 아무것도 하지 않음):

| phase | 매 스텝 처리 |
|---|---|
| `ready`, `aiming` | `pigsAlive === 0`이면 즉시 `resolve()`(대기 중인 새도 남은 새로 계산) |
| `flying` | `flightSteps++`. 새가 있으면 궤적을 기록하고 `speed < BIRD_SLOW_SPEED`면 `birdSlowSteps++`, 아니면 0으로. **새 종료 조건**: 새가 없음(월드 밖/폭발), `birdSlowSteps ≥ BIRD_SLOW_STEPS`, `flightSteps ≥ FLIGHT_MAX_STEPS`, `pigsAlive === 0` 중 하나. 종료되면 phase를 `settling`으로, `settleSteps = settledSteps = 0`, `settleCap = pigsAlive === 0 ? CLEAR_SETTLE_MAX_STEPS : SETTLE_MAX_STEPS` |
| `settling` | `settleSteps++`. 모든 비정적 Entity(새 포함)가 `speed < REST_SPEED && angularSpeed < REST_ANG`이면 `settledSteps++`, 아니면 0으로. 돼지가 이 도중 전멸하면 `settleCap = min(settleCap, settleSteps + CLEAR_SETTLE_MAX_STEPS)`. `settledSteps ≥ REST_STEPS` 또는 `settleSteps ≥ settleCap`이면 `resolve()` |

- 모든 타이머는 **스텝 단위**다. 일시정지 중에는 스텝이 돌지 않으므로 자동으로 멈춘다.
- 다음 새는 `ready`가 된 뒤에만 조준할 수 있다(연속 발사 불가).
- game.js는 매 스텝 뒤 `L.outcome`을 확인하고, 값이 있으면 **한 번만** CLEARED 또는 FAILED로 전이한다.

---

## 12. 상태 머신과 UI

### 12.1 최상위 상태 (`AB.game.state`)
`BOOT`, `MAIN`, `SELECT`, `PLAYING`, `PAUSED`, `CLEARED`, `FAILED`, `ERROR`

| 현재 | 트리거 | 다음 | 동작 |
|---|---|---|---|
| BOOT | 초기화 성공 | MAIN | 진행도 로드 |
| BOOT/어느 상태든 | Matter 없음 또는 루프 예외 | ERROR | 오류 메시지 표시, 루프 정지 |
| MAIN | "게임 시작" | PLAYING | `startStage(unlocked - 1)` |
| MAIN | "스테이지 선택" | SELECT | 그리드 재생성 |
| SELECT | 해금된 스테이지 버튼 | PLAYING | `startStage(i)` |
| SELECT | "뒤로" | MAIN | |
| PLAYING | 일시정지 버튼, Esc, `visibilitychange`(hidden) | PAUSED | 조준 취소 |
| PLAYING | `L.outcome === 'clear'` | CLEARED | `storage.recordClear` |
| PLAYING | `L.outcome === 'fail'` | FAILED | |
| PAUSED | "계속하기" 또는 Esc | PLAYING | 누적기 0, lastTime 재설정 |
| PAUSED | "다시하기" | PLAYING | `startStage(현재)` |
| PAUSED | "메인으로" | MAIN | `level = null` |
| CLEARED | "다음 스테이지"(1–9 스테이지만) | PLAYING | `startStage(현재 + 1)` |
| CLEARED/FAILED | "다시하기" | PLAYING | `startStage(현재)` |
| CLEARED/FAILED | "메인으로" | MAIN | `level = null` |

- `setState(next)`는 위 표에 없는 전이를 `console.warn` 후 무시한다(중복 클릭 방어). 전이 후 항상 `ui.sync(game)`를 호출한다.
- `startStage(i)`: `stageIndex = i`, `level = AB.level.create(AB.STAGES[i])`(매번 새로 생성하고 정의는 복사해 사용), `current = queue.shift()`, `phase = 'ready'`, `score = 0`, `damageArmed = false`, 그리고 `setState('PLAYING')`.

### 12.2 DOM 구조 (index.html, id 고정)
- `#app`: `position: fixed; inset: 0; overflow: hidden`
  - `canvas#game-canvas`: 100%×100%
  - `button#btn-pause`: **우측 상단**(`position: absolute; top: 16px; right: 16px`), 56×56px, 두 세로 막대 아이콘, `aria-label="일시정지"`
  - `div#screen-main.overlay`: 제목 "앵그리버드", `button#btn-start` "게임 시작", `button#btn-select` "스테이지 선택"
  - `div#screen-select.overlay`: 제목 "스테이지 선택", `div#stage-grid`(JS가 5×2 버튼 생성), `button#btn-select-back` "뒤로"
  - `div#overlay-pause.overlay`: "일시정지", `button#btn-resume` "계속하기", `button#btn-retry-pause` "다시하기", `button#btn-main-pause` "메인으로"
  - `div#overlay-result.overlay`: `h2#result-title`("스테이지 클리어!" 또는 "실패..."), `div#result-stars`(클리어 시 ★ 3칸 채움/빈칸), `p#result-score`, `p#result-best`, `p#result-allclear`("모든 스테이지를 클리어했습니다!", 10스테이지 클리어 시), `button#btn-next` "다음 스테이지", `button#btn-retry-result` "다시하기", `button#btn-main-result` "메인으로"
  - `div#overlay-error.overlay`: "오류", `p#error-message`
- `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`, body에 `user-select: none`.

### 12.3 상태별 표시 (`ui.sync`가 유일한 표시 제어 지점)

| 상태 | screen-main | screen-select | btn-pause | overlay-pause | overlay-result | overlay-error |
|---|---|---|---|---|---|---|
| MAIN | 표시 | | | | | |
| SELECT | | 표시 | | | | |
| PLAYING | | | **표시** | | | |
| PAUSED | | | | 표시 | | |
| CLEARED | | | | | 표시(클리어 내용, btn-next는 스테이지 10이면 숨김, allclear는 스테이지 10이면 표시) | |
| FAILED | | | | | 표시(실패 내용, btn-next와 stars와 allclear 숨김) | |
| ERROR | | | | | | 표시 |

- 표시/숨김은 `.hidden { display: none !important; }` 클래스 토글로 한다.
- 오버레이는 반투명 어두운 배경에 가운데 패널, 버튼은 최소 높이 48px.
- 스테이지 선택 버튼: 번호, 최고 별점(★☆), 최고 점수. 잠긴 스테이지는 `disabled`와 🔒.
- URL에 `?unlock=all`이 있으면 저장과 무관하게 전부 해금한다(테스트용, 저장하지 않음).

---

## 13. 렌더링 (`render.draw(game)`, 매 프레임)

그리는 순서:
1. 화면 전체(항등 변환): 하늘 세로 그라데이션 #87ceeb → #e0f6ff
2. 월드 변환 적용
   1. 먼 언덕 장식(연녹색 반원 2–3개, y≈GROUND_Y)
   2. 지면: x -2000~3600, y GROUND_Y~GROUND_Y+3000(레터박스 대비). 윗면 12px 잔디 띠
   3. 지형 블록(흙색 + 잔디 윗면)
   4. 새총 뒤쪽 가지(갈색 두꺼운 선, 앵커 기준 Y자)와 뒤쪽 고무줄(대기/조준 중일 때 뒤 가지 끝→새)
   5. `trail` 점
   6. 블록(회전 사각형 + 외곽선 + 금), 돼지(원 + 눈 + 코 + 헬멧/왕관 + 멍), 비행 중인 새
   7. 새총 위의 새(ready면 앵커, aiming이면 aimPos)
   8. 앞쪽 고무줄과 앞쪽 가지
   9. 조준 중 예측 점(§8.4)
   10. 대기열 새: `queue`를 새총 왼쪽 지면 위(x = SLING_X - 60 - i*45)에 작게(r 14)
   11. 파티클, 팝업("+3000" 흰 글자, 검은 외곽선, 위로 떠오르며 페이드), 링
   12. HUD(월드 좌표 좌상단): "STAGE n / 10 · 이름", "점수 12,345". 우상단은 일시정지 버튼 자리라 비워 둔다.
   13. 힌트: phase가 ready이고 `def.hint`가 있으면 화면 하단 중앙에 반투명 띠로 표시(첫 발사 전까지만)
- `game.level`이 null(MAIN, SELECT)이면 1, 2.1, 2.2와 새총만 그린다.
- 새 외형: 빨강은 흰 배 반원, 흰 눈 2개, 주황 삼각 부리, 굵은 눈썹. 노랑은 같은 구성에 머리 깃털 삼각형. 검정은 머리 위 도화선 선 + 불꽃 점. 모두 `body.angle`로 회전해 그린다.
- `resize`: `window.resize` 때 호출한다. 캔버스 CSS 크기로 픽셀 크기와 스케일을 다시 계산한다(§8.1).

---

## 14. 저장 (storage.js)

- 키: `angrybirds.save.v1`, 값(JSON): `{ v: 1, unlocked: 1..10, best: { "1": { score, stars }, ... } }`
- `load()`: 파싱에 실패하거나 스키마가 다르면 기본값 `{v:1, unlocked:1, best:{}}`. **모든 localStorage 접근은 try/catch**로 감싼다(file://, 사생활 보호 모드). 실패하면 메모리에만 유지한다.
- `recordClear(i, score, stars)`: 점수와 별 각각 기존보다 크면 갱신하고, `unlocked = max(unlocked, min(10, i + 2))`(i는 0 기반)로 한 뒤 저장한다.
- 결과 화면의 `#result-best`는 갱신 후의 최고 점수를 보여 준다. 신기록이면 "신기록!"을 덧붙인다.

---

## 15. 메인 루프와 오류 처리 (game.js)

- `requestAnimationFrame` 루프 하나를 계속 돌린다.
  - `dt = min(now - last, MAX_FRAME_MS)`
  - state가 PLAYING이면 `acc += dt`. `acc ≥ STEP_MS`이고 이번 프레임 스텝이 `MAX_STEPS_PER_FRAME` 미만인 동안 `level.step(L)`을 호출하고 `acc -= STEP_MS`. 스텝마다 `L.outcome`을 확인해 전이하고, 전이했으면 즉시 반복을 중단한다. 상한에 걸려 남은 acc는 0으로 버린다.
  - PLAYING이 아니면 `acc = 0`
  - 항상 `render.draw(game)`. PAUSED, CLEARED, FAILED에서는 멈춘 월드가 오버레이 뒤에 보인다.
- 루프 본문 전체를 try/catch로 감싼다. 예외가 나면 `console.error`, `setState('ERROR')`로 메시지를 표시하고 더 이상 rAF를 요청하지 않는다(실행 검증이 불가능하므로 사람이 테스트할 때 원인이 즉시 보이게).
- `document.visibilitychange`: hidden이 되고 PLAYING이면 PAUSED로.

---

## 16. 구현 순서

각 단계를 끝낼 때 해당 파일을 다시 읽어 §17의 관련 항목을 확인한다.

1. **index.html, style.css**: §12.2의 DOM 전체(모든 id), §3.1 스크립트 순서, 오버레이 스타일, `.hidden`.
2. **config.js**: §4 표 전부. `G_STEP`은 식으로.
3. **stages.js**: 헬퍼(§7.2), 10개 스테이지(§7.4), `validateStages`(§7.3). 스테이지마다 §7.3 불변식을 **손으로 검산**한다(각 블록의 x 범위와 b~b+h 범위를 적어 보고 겹침과 받침 확인).
4. **storage.js**: §14
5. **level.js**: create(엔진, 지면, 블록, 돼지, 핸들러) → launch → predict → step(§9.3) → 턴(§11) → 능력(§10) → birdsLeft
6. **render.js**: §13, §8.1 변환, screenToWorld
7. **ui.js**: 버튼 바인딩(handler 객체의 onStart, onSelect, onSelectStage(i), onBack, onPause, onResume, onRetry, onMain, onNext 호출), `sync`(§12.3), 그리드 생성, 결과 채우기
8. **game.js**: 상태/전이 표(§12.1), startStage, 입력(§8.2), 루프(§15), 키보드, visibilitychange, resize
9. **main.js**: Matter 확인 → `AB.validateStages()` → `AB.game.init()`. 예외는 에러 오버레이로
10. **README.md**: 실행 방법(index.html 열기, 또는 아무 정적 서버), 조작법, 새 능력, 오프라인 설치(§5.1), `?unlock=all`, §18 수동 테스트 목록
11. **§17 전체 체크리스트 수행** 후 발견한 문제 수정

---

## 17. 정적 자기검증 체크리스트 (실행 대신 수행)

**연결 무결성**
- [ ] JS에서 쓰는 모든 `getElementById`/`querySelector`의 id가 index.html에 존재한다(파일을 열어 하나씩 대조).
- [ ] 모든 `AB.xxx` 참조가 어딘가에서 정의되고, 로드 시점 참조는 config와 stages뿐이다.
- [ ] index.html의 스크립트 순서가 §3.1과 같고 경로 대소문자가 일치한다.
- [ ] `import`, `export`, `type="module"`, `fetch`, 외부 에셋 URL이 없다(Matter CDN 제외).
- [ ] Matter 호출이 §5.2 화이트리스트 안에 있다. 철자 확인: `Composite`, `Bodies.polygon`, `collision.normal`.

**물리와 규칙**
- [ ] `Engine.update`에 항상 `C.STEP_MS`를 넘긴다.
- [ ] 새 바디는 발사 시에만 생성하고 frictionAir 0으로 시작한다. 첫 충돌 때 0.02로 바꾼다.
- [ ] collisionStart 핸들러 안에 `Composite.remove`가 없다. 제거는 step의 pendingDeaths 처리에서만 하고, 같은 Entity를 두 번 제거하지 않는다.
- [ ] 데미지가 `damageArmed` 전에는 적용되지 않는다(폭발은 발사 후에만 가능하므로 무관).
- [ ] `predict`의 적분 순서(속도 먼저, 위치 나중)와 `G_STEP` 식이 §8.4와 같다.
- [ ] 모든 타이머와 파티클이 스텝 기반이다(프레임이나 벽시계 기반 없음).
- [ ] `resolve()`는 phase당 한 번만 호출되고, outcome이 정해진 뒤에는 step이 턴 로직을 건너뛴다.
- [ ] 돼지가 월드 밖으로 나가면 처치로 계산되고 `pigsAlive`가 정확히 1 감소한다.

**상태와 UI**
- [ ] §12.1 표의 모든 전이가 구현돼 있고 버튼마다 정확히 하나의 전이를 호출한다.
- [ ] DOM 표시와 숨김이 `ui.sync` 밖에서 일어나지 않는다.
- [ ] `btn-pause`는 PLAYING에서만 보이고 CSS가 우측 상단이다.
- [ ] 다시하기가 항상 새 Level을 만들고 STAGES 원본을 변경하지 않는다(create가 def를 읽기만 함).
- [ ] 일시정지 중에는 `level.step`이 호출되지 않는다. 재개 시 acc와 last를 재설정한다.
- [ ] 스테이지 10 클리어 시 "다음 스테이지"가 숨겨진다.
- [ ] 포인터 좌표 변환이 resize 후 갱신된 scale과 off를 쓴다.

**데이터**
- [ ] `AB.STAGES.length === 10`, 각 스테이지 birds가 비어 있지 않고 돼지가 1마리 이상이다.
- [ ] §7.4의 모든 수치가 그대로 옮겨졌다(특히 9번 돼지 x = 1052, 1288).
- [ ] 스테이지마다 §7.3 불변식 1–6을 손으로 검산했다.

---

## 18. 완료 판정 기준

### 18.1 구현자 기준(이 작업의 완료)
1. §1의 파일이 모두 존재하고 비어 있지 않다.
2. §17 체크리스트를 모두 확인했고, 확인 못 한 항목이 있으면 README 끝 "알려진 미검증 사항"에 적는다.
3. 계획과 다르게 구현한 부분이 있으면 README에 이유와 함께 기록한다.

### 18.2 사용자 실행 기준(브라우저에서 "된 것")
최신 Chrome에서 `game/index.html`을 직접 연다(인터넷 연결 상태).

| # | 확인 | 합격 조건 |
|---|---|---|
| 1 | 부팅 | 콘솔에 에러 없이 메인 화면. `validateStages` 경고 없음 |
| 2 | 게임 시작 | 스테이지 1 진입. 조작하지 않고 5초 두어도 구조물이 무너지지 않고 돼지가 죽지 않는다 |
| 3 | 조준 | 새를 끌면 고무줄이 늘어나고 예측 점선이 나온다. 120px 이상은 당겨지지 않는다. 짧게 놓으면 발사가 취소된다 |
| 4 | 발사 | 포물선으로 날아가고 초반 궤적이 예측 점선과 겹친다. 비행 경로 점이 남는다 |
| 5 | 파괴 | 세게 맞은 블록에 금이 가거나 사라지고 돼지가 죽으며 점수 팝업과 HUD 점수가 오른다 |
| 6 | 턴 | 월드가 멈추면 다음 새가 새총에 오르고 대기열이 줄어든다 |
| 7 | 클리어 | 돼지 전멸 → "스테이지 클리어!", 별과 점수(보너스 포함), 다음 스테이지 해금 |
| 8 | 실패 | 새를 모두 쓰고 돼지가 남으면 "실패..."와 다시하기/메인으로 |
| 9 | 일시정지 | 인게임 **우측 상단** 버튼 클릭 → 물체 움직임 정지, 계속하기/**다시하기**/**메인으로** 표시. 다시하기는 점수, 새, 구조물을 초기 상태로 되돌리고, 메인으로는 메인 화면. 계속하기와 Esc로 재개 |
| 10 | 능력 | 5스테이지 노랑 탭 → 급가속. 7스테이지 검정 탭 → 폭발로 주변이 날아가고, 탭하지 않으면 충돌 1.5초 뒤 자동 폭발 |
| 11 | 10스테이지 | `?unlock=all`로 1–10 모두 진입 가능하고 각 스테이지를 클리어할 수 있다. 10 클리어 시 전체 클리어 문구 |
| 12 | 진행 저장 | 새로고침 후에도 해금과 최고 기록 유지 |
| 13 | 반응형 | 창 크기를 바꿔도 비율이 유지되고 조준 좌표가 어긋나지 않는다. 모바일 터치로 조준과 발사 가능 |
| 14 | 탭 전환 | 다른 탭에 갔다 오면 일시정지 상태 |

요구사항 대응: 1번 요구(10단계)는 #11, 2번(게임 시작 → 물리 슬링샷)은 #2–#8과 #10, 3번(우측 일시정지 → 다시하기/메인으로)은 #9에 해당한다.

---

## 19. 범위 밖과 위험

**범위 밖**: 사운드, 카메라 팬/줌, 파란 새(분열), 레벨 에디터, 로그인/서버, 다국어.

| 위험 | 대응 |
|---|---|
| CDN 로드 실패 | vendor 폴백, 명확한 에러 화면, README 안내 |
| 적층 구조물이 저절로 흔들리거나 붕괴 | 높은 마찰과 반복 횟수, 8각형 돼지, 불변식을 지키는 보수적 배치, 첫 발사 전 데미지 비활성 |
| 턴이 끝나지 않음(미세 진동, 계속 구르는 새) | 정지 판정에 상한(FLIGHT_MAX, SETTLE_MAX), 새 첫 충돌 후 감쇠 |
| 빠른 물체 관통 | 속도 상한 26 < 새 지름+판자 두께, 두꺼운 지면 |
| 이벤트 중 바디 제거로 인한 오류 | 지연 제거(pendingDeaths) |
| 탭 복귀 시 거대한 dt | dt 상한, 프레임당 스텝 상한, 자동 일시정지 |
| file://와 localStorage 예외 | try/catch, 메모리 폴백 |
| 실행 없이 생긴 런타임 오류가 조용히 묻힘 | 루프 try/catch → 에러 오버레이에 메시지 표시 |
