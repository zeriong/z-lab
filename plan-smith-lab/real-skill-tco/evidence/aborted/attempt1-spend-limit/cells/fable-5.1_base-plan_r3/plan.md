# 웹 브라우저 앵그리버드 게임 — 구현 계획서

> 구현자: claude-fable-5-1. 구현자는 이 문서 **하나만** 읽고, 파일 읽기/쓰기 도구만으로 작업한다. 설치·빌드·실행·테스트는 **불가능**하다. 따라서 이 문서는 "무엇을 만들지"뿐 아니라 "실행해 보지 않고도 맞게 만들었는지 어떻게 확인하는지"까지 포함한다.

---

## 0. 결정 요약 (요구사항의 핵심 질문에 대한 답)

| 질문 | 결정 | 이유 |
|---|---|---|
| 물리 엔진 | **Matter.js 0.20.0, CDN 로드**(jsDelivr, unpkg 폴백) | 쌓인 구조물의 안정성·슬립·충돌 이벤트를 직접 구현하면 실행 검증 없이는 거의 확실히 흔들리거나 무너진다. Matter는 API가 안정적이고 잘 알려져 있어 "보지 않고" 정확히 쓸 수 있다. |
| 렌더링 | **Canvas 2D 직접 그리기**(Matter.Render 미사용) + UI는 **DOM** | 새/돼지/블록을 도형으로 예쁘게 그리고, 버튼·오버레이·HUD는 DOM으로 만들어 클릭 처리 코드를 없앤다. |
| 모듈 방식 | ES 모듈 **금지**. 전역 네임스페이스 `AB` + 클래식 `<script>` 순서 로드 | `file://`로 더블클릭 열기에서 ES 모듈은 CORS로 실패한다. 번들러도 없다. |
| 카메라 | **고정 카메라**, 논리 해상도 1280×720, CSS로 화면에 맞춤 | 스크롤/줌은 입력 좌표 변환 버그의 온상. 모든 스테이지가 한 화면에 들어오게 설계한다. |
| 스테이지 데이터 | `levels.js`에 10개 객체. **빌더 헬퍼**(`frame`, `tower`, `stack` 등)로 좌표를 계산해 손계산 오류를 없앤다 | 좌표를 손으로 쓰면 겹침/공중부양이 생기고 실행 없이는 못 잡는다. |
| 슬링샷 | 장전된 새는 물리 바디가 **아님**(그림만). 놓는 순간 그 위치에 바디 생성 + 속도 부여 | static↔dynamic 전환, 새총과의 충돌 등 실패 모드를 제거한다. |
| 궤적 예측 | Matter의 적분식과 동일한 식으로 점 찍기(중력·공기저항 동일) | 예측선과 실제 궤적이 어긋나지 않는다. |
| 파괴/점수 | 충돌 시작 이벤트에서 상대속도 기반 데미지 → HP ≤ 0이면 제거 | 단순하고 결정적. 상수 표로 튜닝 가능. |
| 상태 머신 | 화면 상태 `MENU / STAGES / PLAYING / PAUSED / CLEAR / FAIL` + 인게임 페이즈 `AIM / FLIGHT / WAIT_NEXT / END_CHECK / ENDING_CLEAR` | 일시정지는 페이즈를 건드리지 않고 tick만 멈춘다. 모든 타이머는 tick 단위라 정지 시 자연히 멈춘다. |
| 스테이지 잠금 | **10개 모두 처음부터 선택 가능**, 별/최고점수만 localStorage에 저장 | 평가자가 10단계 존재를 바로 확인할 수 있어야 한다. |
| 완료 판정 | §18의 수용 기준 전부 + §17의 정적 검증 체크리스트 전부 통과 | |

---

## 1. 구현자 작업 원칙 (반드시 지킬 것)

1. **파일은 한 번의 Write로 완성본을 쓴다.** 부분 수정이 필요하면 파일을 Read한 뒤 전체를 다시 Write한다.
2. **모든 파일을 쓴 뒤, 모든 파일을 다시 Read하고 §17 체크리스트를 항목별로 수행한다.** 이것이 이 프로젝트의 "테스트"다.
3. **이 문서에 없는 기능을 추가하지 않는다.** 사운드, 이미지 에셋, 카메라 스크롤, 추가 새 종류, 폰트 로드 금지. 외부 리소스는 Matter.js CDN 하나뿐이다.
4. **이 문서의 이름을 그대로 쓴다.** 파일명, 전역 함수명, DOM id, CSS 클래스, 상수명은 §3~§5, §14의 표와 정확히 일치시킨다. 파일 간 이름 불일치가 실행 없이 잡기 가장 어려운 버그다.
5. **Matter API는 §9.1의 목록 안에서만 사용한다.** 목록에 없는 API가 필요해 보이면 목록 안의 조합으로 대체한다.
6. **어떤 파일도 최상위(top-level)에서 `Matter`를 참조하지 않는다.** 함수 안에서만 참조한다(CDN 폴백이 늦게 로드될 수 있음).
7. **시간은 전부 tick(물리 스텝) 단위로 센다.** `Date.now()`나 `performance.now()`는 게임 루프의 프레임 간격 계산에만 쓴다.
8. UI 문구는 **한국어**. 코드 식별자는 영어.
9. 불확실하면 이 문서의 값을 따른다. 문서에 없는 사소한 판단(색상 톤, 여백 등)은 자유.

---

## 2. 산출물 파일 구조와 로드 순서

```
angry-birds-web/
  index.html
  style.css
  README.md
  js/
    config.js     — 상수 (AB.CFG)
    levels.js     — 빌더 헬퍼 + 10개 스테이지 (AB.LEVELS, AB.LevelBuild)
    physics.js    — Matter 월드 생성, 바디 팩토리, 데미지/제거 (AB.Physics)
    render.js     — Canvas 2D 그리기 (AB.Render)
    input.js      — 포인터 입력, 드래그 클램프, 발사 속도, 궤적 예측 (AB.Input)
    ui.js         — DOM 화면/HUD/오버레이 (AB.UI)
    game.js       — 상태 머신, 레벨 생명주기, 게임 루프, 점수/저장, 부트스트랩 (AB.Game)
```

`index.html`의 `<script>` 순서(모두 클래식 스크립트, `defer/async/type=module` 없음):

1. Matter.js CDN: `https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js` — 태그에 `onerror` 핸들러를 달아 실패 시 `https://unpkg.com/matter-js@0.20.0/build/matter.min.js`를 `document.createElement('script')`로 삽입(인라인 스크립트 한 개로 처리, `async=false`).
2. `js/config.js`
3. `js/levels.js`
4. `js/physics.js`
5. `js/render.js`
6. `js/input.js`
7. `js/ui.js`
8. `js/game.js` — 맨 아래에서 `window.addEventListener('load', AB.Game.init)` 등록. (`DOMContentLoaded`가 아니라 **`load`**인 이유: 폴백으로 삽입된 Matter 스크립트까지 기다리기 위해.)

각 JS 파일 첫 줄은 `window.AB = window.AB || {};` 로 시작하고, 자기 네임스페이스 객체 하나만 `AB`에 붙인다. 파일들은 IIFE로 감싸 지역 변수를 숨긴다.

예상 분량: config 80줄, levels 250줄, physics 250줄, render 300줄, input 150줄, ui 200줄, game 450줄, html 120줄, css 200줄.

---

## 3. 전역 네임스페이스 계약

아래 표의 이름·시그니처·의미를 그대로 구현한다. "→"는 반환값.

### 3.1 `AB.CFG` (config.js) — §5 참조

### 3.2 `AB.LevelBuild` (levels.js) — 빌더 헬퍼

| 이름 | 시그니처 | 의미 |
|---|---|---|
| `G` | 숫자 상수 `650` | 지면 윗면 y (= `AB.CFG.GROUND_Y`) |
| `block` | `(m, x, y, w, h, angle=0)` → `{kind:'block', m, x, y, w, h, angle}` | 중심 좌표 기준 사각 블록. `m` ∈ `'wood'|'ice'|'stone'` |
| `pig` | `(x, y, size='small')` → `{kind:'pig', x, y, size}` | 중심 좌표 기준 돼지 |
| `pigOnGround` | `(x, size='small')` → pig | `y = G - r` (r은 `AB.CFG.PIG[size].r`) |
| `pigOn` | `(topY, x, size='small')` → pig | `y = topY - r` |
| `stack` | `(x, bottomY, parts)` → `{items, top}` | `parts`는 아래→위 순서의 `{m, w, h}` 배열. 각 블록 `y = 현재바닥 - h/2`, 바닥을 `h`만큼 올린다. `top`은 최종 윗면 y |
| `frame` | `(x, bottomY, innerW, mat, opts?)` → `{items, top, floorBottom, x, innerW}` | "ㅁ"자 층 하나: 기둥 2 + 들보 1. `mat`는 문자열 또는 `{pillar, beam}`. `opts` 기본 `{pillarW:20, pillarH:70, beamH:20}`. 기둥 중심 `(x ∓ (innerW/2 + pillarW/2), bottomY - pillarH/2)`, 들보 중심 `(x, bottomY - pillarH - beamH/2)`, 들보 폭 `innerW + 2*pillarW`. `top = bottomY - pillarH - beamH`, `floorBottom = bottomY` |
| `pigInFrame` | `(f, size='small')` → pig | `pig(f.x, f.floorBottom - r, size)`. 제약: small은 innerW ≥ 60, large는 innerW ≥ 80 |
| `tower` | `(x, bottomY, floors, innerW, mats)` → `{items, top, frames}` | `frame`을 `floors`번 위로 쌓음. `mats`는 단일 mat 또는 층별(아래→위) 배열. `frames[i]`는 i층 frame 결과 |
| `level` | `(id, name, birds, groups)` → 레벨 객체 | `groups`는 `{items}` 객체·엔티티 객체·배열이 섞인 배열. 평탄화하여 `entities`로 만든다 |

레벨 객체 스키마: `{ id: 1..10, name: string, birds: string[], entities: (block|pig)[] }`.
`AB.LEVELS`는 id 오름차순 길이 10 배열. `AB.LEVELS[i].id === i + 1`.

### 3.3 `AB.Physics` (physics.js)

| 이름 | 시그니처 | 의미 |
|---|---|---|
| `create` | `()` → `phys` | 새 Engine/World 생성, 지면 추가, 충돌 리스너 연결. `phys = { engine, world, damageEnabled:false, toRemove: Set<body>, events: [] }` |
| `addBlock` | `(phys, spec)` → body | `spec`은 `block()` 결과. `body.ab = {kind:'block', m, w, h, hp, maxHp}` |
| `addPig` | `(phys, spec)` → body | `body.ab = {kind:'pig', size, r, hp, maxHp}` |
| `addBird` | `(phys, type, x, y, velocity)` → body | 바디 생성 + world 추가 + `Body.setVelocity`. `body.ab = {kind:'bird', type, r, ticks:0, lowSpeedTicks:0, abilityUsed:false}` |
| `queueRemove` | `(phys, body, reason)` | `toRemove`에 추가하고 `events`에 이벤트 예약(§9.5) |
| `step` | `(phys)` → events 배열 | `Engine.update(engine, CFG.STEP)` 후 `flush`. 반환 후 `phys.events`는 비운다 |
| `flush` | `(phys)` → events 배열 | `toRemove`의 각 바디에 대해 이웃 깨우기 → `Composite.remove` → 비우기. `events` 반환 |
| `settle` | `(phys, n)` | damage 끔 → `Engine.update` n회 → 모든 비정적 바디 `Sleeping.set(b, true)` → damage 켬 |
| `pigsAlive` | `(phys)` → 수 | world 안 `ab.kind==='pig'` 바디 수 |
| `allSleeping` | `(phys)` → bool | 비정적 바디 전부 `isSleeping` |
| `bodies` | `(phys)` → body[] | `Composite.allBodies(world)` |
| `cullOutOfBounds` | `(phys)` | 경계 밖 바디를 `queueRemove` (§9.6) |

### 3.4 `AB.Render` (render.js)

| 이름 | 시그니처 | 의미 |
|---|---|---|
| `init` | `(canvas)` | 캔버스 크기 1280×720 설정, ctx 저장 |
| `draw` | `(view)` | 한 프레임 그리기. `view` 스키마는 §13.1 |

### 3.5 `AB.Input` (input.js)

| 이름 | 시그니처 | 의미 |
|---|---|---|
| `init` | `(canvas, hooks)` | 포인터 이벤트 바인딩. `hooks = { canDrag():bool, onRelease(velocity, pos), onTap() }` |
| `drag` | 상태 객체 `{active:false, pos:{x,y}}` | 렌더가 읽는다 |
| `reset` | `()` | `drag.active=false` |
| `clampPull` | `(p)` → `{x,y}` | 앵커 기준 벡터 길이를 `maxPull`로 제한한 위치 |
| `launchVelocity` | `(pos)` → `{x,y}` | `(anchor - pos) * power` |
| `previewPoints` | `(pos, v)` → `{x,y}[]` | §10.3 궤적 예측 점 |

### 3.6 `AB.UI` (ui.js)

| 이름 | 시그니처 | 의미 |
|---|---|---|
| `init` | `(handlers)` | 모든 버튼 바인딩. `handlers = { onStart, onSelectStage(index), onStagesBack, onPause, onResume, onRestart, onMenu, onNext, onResetSave }` |
| `showScreen` | `('menu'|'stages'|'game')` | 화면 전환(§14.2 표) |
| `showOverlay` | `('pause'|'clear'|'fail'|null)` | 오버레이 하나만 표시 |
| `updateHUD` | `({stage, score, birds})` | `birds`는 타입 문자열 배열(장전 새 + 대기열). 값이 바뀔 때만 DOM 갱신 |
| `showHint` | `(bool)` | 1스테이지 첫 발사 전 힌트 |
| `renderStageList` | `(levels, save)` | 10개 카드 생성(별·최고점수) |
| `setClearInfo` | `({score, stars, isLast})` | 클리어 오버레이 내용. `isLast`면 "다음 스테이지" 숨김 |
| `showError` | `(msg)` | 에러 오버레이 |

### 3.7 `AB.Game` (game.js)

| 이름 | 시그니처 | 의미 |
|---|---|---|
| `init` | `()` | 부트스트랩(§15.1) |
| 내부 | `startLevel(index)`, `restart()`, `toMenu()`, `pause()`, `resume()`, `launch(v,pos)`, `useAbility()`, `tick()`, `frame(ts)`, `loadNextBird()`, `finishClear()`, `finishFail()`, `applyEvents(events)`, `buildView()`, `Save.load/save/record` | 노출 불필요. 디버그용으로 `AB.Game.state`(현재 상태 문자열)만 노출 |

---

## 4. 월드 좌표계와 레이아웃

- 논리 캔버스 `W=1280`, `H=720`. 1 논리 px = 1 Matter 단위. y는 아래로 증가.
- 지면: 정적 사각형 중심 `(640, 685)`, 크기 `1280×70` → 윗면 `y=650` (`GROUND_Y`).
- 새총: 바닥 `(220, 650)`, 기둥 상단 `(220, 600)`, 갈래 끝 `(205, 560)`, `(235, 560)`. 새 장전 위치(앵커) `(220, 555)`.
- 구조물 영역: x ∈ [600, 1240]. 가장 높은 구조물 꼭대기 y ≥ 250.
- 발사 최대 속도 ≈ 110 × 0.19 ≈ 21 px/tick. 중력 0.2778 px/tick². 45° 최대 사거리 ≈ 1590 px → 화면 끝까지 충분.
- 터널링 방지: 블록 최소 두께 20 px, 새 지름 ≥ 36 px, 최대 속도(옐로 부스트 포함) ≈ 34 px/tick < 56 px 이므로 안전.

---

## 5. 상수 (`AB.CFG`)

모두 `AB.CFG` 아래에 정의한다. 다른 파일은 이 값을 하드코딩하지 않고 참조한다.

| 키 | 값 | 설명 |
|---|---|---|
| `W`, `H` | 1280, 720 | 캔버스 논리 크기 |
| `STEP` | `1000/60` | 물리 스텝(ms) |
| `MAX_STEPS_PER_FRAME` | 4 | 프레임당 최대 tick |
| `GROUND_Y` | 650 | |
| `G_PER_STEP` | `1 * 0.001 * STEP * STEP` (≈0.2778) | 궤적 예측용 tick당 중력 가속 |
| `SLING` | `{x:220, y:555, forkY:560, forkL:205, forkR:235, baseY:650, grabRadius:70, maxPull:110, minPull:12, power:0.19}` | |
| `SETTLE_STEPS` | 90 | 레벨 로드 직후 동기 안정화 스텝 |
| `ENGINE` | `{positionIterations:8, velocityIterations:6}` | |
| `MAT` | 표 §9.2 | 재질별 hp/밀도/마찰/반발/색/점수 |
| `PIG` | 표 §9.2 | small/large |
| `BIRD` | 표 §9.2 + `common:{restitution:0.3, friction:0.5, frictionAir:0.004}` | |
| `DMG` | `{MIN_SPEED:2.5, SCALE:2.2, MASS_CAP:8, STATIC_FACTOR:1.5}` | §9.4 |
| `SPENT` | `{lowSpeed:0.3, lowSpeedTicks:60, maxTicks:480}` | §11.2 |
| `TIMERS` | `{nextBird:36, clearDelay:72, failSettleMax:180}` | tick |
| `SCORE` | `{pig:5000, birdBonus:10000}` (블록 점수는 `MAT[m].score`) | |
| `OOB` | 150 | 경계 여유 px |
| `PREVIEW` | `{steps:120, every:4, maxDots:30}` | |
| `SAVE_KEY` | `'ab_web_save_v1'` | |

---

## 6. 상태 머신

### 6.1 화면 상태 `state`

| 상태 | 화면 | 진입 동작 | 나가는 전이 |
|---|---|---|---|
| `MENU` | `screen-menu` | `phys=null`, 오버레이 없음 | 게임 시작 → `STAGES` |
| `STAGES` | `screen-stages` | `renderStageList` | 카드 클릭 → `startLevel(i)` → `PLAYING`; 뒤로 → `MENU` |
| `PLAYING` | `screen-game` + HUD | tick 진행 | 일시정지/Esc → `PAUSED`; 클리어 → `CLEAR`; 실패 → `FAIL` |
| `PAUSED` | game + `overlay-pause` | tick 정지(렌더는 계속) | 계속하기/Esc → `PLAYING`; 다시하기 → `startLevel(cur)`; 메인으로 → `toMenu()` → `MENU` |
| `CLEAR` | game + `overlay-clear` | 저장, 별 표시 | 다음 스테이지 → `startLevel(cur+1)`; 다시하기; 메인으로 |
| `FAIL` | game + `overlay-fail` | | 다시하기; 메인으로 |

규칙: `tick()`은 `state === 'PLAYING'`일 때만 호출된다. 일시정지 버튼은 `PLAYING`에서만 동작한다(`ENDING_CLEAR` 페이즈 포함 — 어차피 tick 기반이라 안전).

### 6.2 인게임 페이즈 `phase` (PLAYING 내부)

| 페이즈 | 진입 시 | 매 tick | 전이 |
|---|---|---|---|
| `AIM` | `loaded = queue.shift()`(있으면). 힌트 표시 판단 | 드래그 허용 | `launch` → `FLIGHT` |
| `FLIGHT` | `active` 바디 생성, `shots++`, 힌트 숨김 | §11.2 spent 판정 | spent → `active` 제거 → `WAIT_NEXT` |
| `WAIT_NEXT` | `timer = TIMERS.nextBird` | `timer--` | 0 이면: `queue.length>0` → `AIM`; 아니면 → `END_CHECK` |
| `END_CHECK` | `timer = TIMERS.failSettleMax` | `timer--` | `allSleeping` 또는 `timer==0` → `finishFail()` |
| `ENDING_CLEAR` | `timer = TIMERS.clearDelay` | `timer--` | 0 → `finishClear()` |

**전역 규칙(페이즈 로직보다 먼저, 매 tick):** `phase !== 'ENDING_CLEAR'` 이고 `pigsAlive === 0` 이면 즉시 `ENDING_CLEAR`로. 이 규칙이 `END_CHECK` 중 뒤늦게 죽는 돼지도 클리어로 처리한다.

`tick()` 순서:
1. `events = Physics.step(phys)` → `applyEvents`
2. `Physics.cullOutOfBounds(phys)`; `events = Physics.flush(phys)` → `applyEvents`
3. `active`가 있으면 spent 판정(§11.2)
4. 전역 클리어 규칙 → 페이즈 로직
5. fx(파티클, 점수 팝업) 갱신
6. `UI.updateHUD`

---

## 7. 레벨 생명주기

`startLevel(index)`:
1. `cur = index`, `level = AB.LEVELS[index]`, `state='PLAYING'`
2. `phys = Physics.create()`; `Input.reset()`; `fx = {particles:[], popups:[]}`; `score=0`; `shots=0`; `active=null`; `loaded=null`
3. `level.entities` 순회: block → `addBlock`, pig → `addPig`
4. `pigCount = Physics.pigsAlive(phys)` (별 기준 계산용)
5. `Physics.settle(phys, CFG.SETTLE_STEPS)`
6. `queue = level.birds.slice()`; `phase = 'AIM'` 진입 처리
7. `UI.showScreen('game')`, `UI.showOverlay(null)`, HUD 갱신

`restart()` = `startLevel(cur)`. `toMenu()` = `phys=null; active=null; loaded=null; Input.reset(); state='MENU'; UI.showOverlay(null); UI.showScreen('menu')`.

`finishClear()`: `remaining = queue.length + (loaded ? 1 : 0)`; `score += remaining * SCORE.birdBonus`(팝업 없이 HUD만); 별 계산(§12); `Save.record(level.id, score, stars)`; `state='CLEAR'`; `UI.setClearInfo({score, stars, isLast: cur === 9})`; `UI.showOverlay('clear')`.

`finishFail()`: `state='FAIL'`; `UI.showOverlay('fail')`.

---

## 8. 스테이지 데이터 (10개)

`levels.js`는 §3.2 헬퍼를 정의한 뒤 `AB.LEVELS`를 아래 명세대로 만든다. 아래 표기는 헬퍼 호출 명세다(코드 그대로 옮기되 계산은 헬퍼가 한다). `G = 650`. 재질 약어: wood/ice/stone. `{p:stone, b:wood}`는 `{pillar:'stone', beam:'wood'}`.

**기하 규칙(작성 후 반드시 확인):**
- innerW 60 프레임 폭 = 100, innerW 80 프레임 폭 = 120. 같은 바닥에 놓인 프레임 중심 간격은 폭 합의 절반 이상(정확히 맞닿는 것은 허용).
- 위층 프레임의 두 기둥은 각각 아래층 어떤 들보 위에 완전히 올라가야 한다.
- 돼지는 `pigInFrame`/`pigOn`/`pigOnGround`로만 놓는다.
- 모든 엔티티 x ∈ [600, 1240], y > 200.

| id | name | birds (발사 순서) | 구성 | 돼지 수 |
|---|---|---|---|---|
| 1 | 첫 발사 | red, red, red | `f=frame(900,G,60,wood)`; `pigInFrame(f)`; `pigOnGround(1060)` | 2 |
| 2 | 이층집 | red, red, red | `t=tower(920,G,2,60,wood)`; `pigInFrame(t.frames[0])`; `pigInFrame(t.frames[1])`; `pigOn(t.top,920)` | 3 |
| 3 | 얼음 벽 | red, red, yellow, red | `stack(760,G,[{ice,20,60},{ice,20,60},{ice,20,60}])`; `f=frame(940,G,80,wood)`; `pigInFrame(f,'large')`; `pigOn(f.top,940)`; `pigOnGround(1120)` | 3 |
| 4 | 돌 지붕 | red, yellow, red, red | `t=tower(940,G,3,60,{p:wood,b:stone})`; `pigInFrame(t.frames[0])`; `pigInFrame(t.frames[2])`; `pigOn(t.top,940)`; `pigOnGround(1120)` | 4 |
| 5 | 두 탑 | red, yellow, red, big | `tA=tower(820,G,2,60,wood)`; `pigInFrame(tA.frames[0])`; `pigInFrame(tA.frames[1])`; `tB=tower(1100,G,3,60,[wood,ice,ice])`; `pigInFrame(tB.frames[0])`; `pigOn(tB.top,1100)` | 4 |
| 6 | 돌 기둥 | big, red, yellow, red, red | `fA=frame(880,G,80,{p:stone,b:wood})`; `pigInFrame(fA,'large')`; `stack(880,fA.top,[{stone,40,40}])`; `pigOnGround(990)`; `fB=frame(1100,G,60,wood)`; `pigInFrame(fB)`; `pigOn(fB.top,1100)` | 4 |
| 7 | 피라미드 | red, red, yellow, yellow, big | 1층: `f1=frame(800,G,60,wood)`, `f2=frame(900,G,60,wood)`, `f3=frame(1000,G,60,wood)` (top 560); 2층: `f4=frame(850,560,60,wood)`, `f5=frame(950,560,60,wood)` (top 470); 3층: `f6=frame(900,470,60,wood)` (top 380); `pigInFrame(f1)`, `pigInFrame(f3)`, `pigInFrame(f4)`, `pigInFrame(f6)`, `pigOn(380,900)` | 5 |
| 8 | 유리성 | yellow, yellow, red, big, red | `t=tower(860,G,3,60,ice)`; `pigInFrame(t.frames[0..2])` 3개; `pigOn(t.top,860)`; `f=frame(1080,G,80,stone)`; `pigInFrame(f,'large')`; `stack(1080,f.top,[{stone,40,40}])` | 5 |
| 9 | 요새 | red, big, yellow, red, big, red | `tA=tower(820,G,2,60,{p:stone,b:wood})`; `pigInFrame(tA.frames[0])`, `pigInFrame(tA.frames[1])`; `c=stack(950,G,[{stone,40,40},{stone,40,40},{wood,40,40}])`; `pigOn(c.top,950)`; `tB=tower(1100,G,4,60,[wood,wood,ice,ice])`; `pigInFrame(tB.frames[0])`, `pigInFrame(tB.frames[2])`, `pigOn(tB.top,1100)` | 6 |
| 10 | 돼지 왕 | red, yellow, big, red, yellow, big, red | 1층(G): `frame(780/880/980/1080, G, 60, {p:wood,b:stone})` 4개 (top 560); 2층(560): `frame(830/930/1030, 560, 60, wood)` 3개 (top 470); 3층(470): `frame(880/980, 470, 60, ice)` 2개 (top 380); 4층(380): `f4=frame(930,380,80,wood)` (top 290); 돼지: 1층 780·980 프레임 안, 2층 830·1030 안, 3층 880 안, `pigInFrame(f4,'large')`, `pigOn(290,930)`, `pigOnGround(1200)` | 8 |

7층 피라미드/10층 성의 기둥 착지 검증(구현자가 재확인): 2층 프레임(중심 c) 기둥 중심은 c±40, 폭 20 → 1층 들보(중심 b, 폭 100 → b±50) 위에 있으려면 `|c±40 - b| ≤ 40`. 예: 850의 기둥 810은 800의 들보(750~850) 안, 890은 900의 들보(850~950) 안. ✓

별 기준(레벨 데이터에 넣지 않고 게임에서 계산): `star2 = 5000*pigCount + 2000`, `star3 = 5000*pigCount + 12000`.

---

## 9. 물리

### 9.1 사용하는 Matter.js API (이 목록만 사용)

- `Matter.Engine.create({ enableSleeping:true, positionIterations, velocityIterations })`, `engine.world`, `engine.gravity`(기본 y=1, scale=0.001 그대로 둠)
- `Matter.Engine.update(engine, deltaMs)`
- `Matter.Composite.add(world, bodyOrArray)`, `Matter.Composite.remove(world, body)`, `Matter.Composite.allBodies(world)`
- `Matter.Bodies.rectangle(x, y, w, h, options)`, `Matter.Bodies.circle(x, y, r, options)`
- `Matter.Body.setVelocity(body, {x,y})`
- `Matter.Events.on(engine, 'collisionStart', fn)` — `fn(evt)`에서 `evt.pairs[i].bodyA / bodyB`
- `Matter.Sleeping.set(body, isSleeping)`
- `Matter.Query.region(bodies, bounds)` — bounds `{min:{x,y}, max:{x,y}}`와 겹치는 바디 배열
- `Matter.Vector.sub`, `Matter.Vector.magnitude`, `Matter.Vector.mult`
- 바디 속성 읽기: `position`, `angle`, `velocity`, `speed`, `mass`, `isStatic`, `isSleeping`, `bounds`, `label`
- 바디 옵션: `isStatic, density, restitution, friction, frictionAir, label`. 커스텀 데이터는 생성 후 `body.ab = {...}`로 붙인다(옵션으로 넘기지 않는다).

### 9.2 재질/개체 표

블록 (`CFG.MAT[m]`):

| m | hp | density | friction | restitution | 색(채움/테두리) | score |
|---|---|---|---|---|---|---|
| wood | 90 | 0.001 | 0.6 | 0.10 | `#c8913a` / `#8a5a1c` | 500 |
| ice | 40 | 0.0008 | 0.10 | 0.05 | `rgba(170,220,245,0.85)` / `#6fb3d6` | 300 |
| stone | 170 | 0.002 | 0.7 | 0.05 | `#8a8f98` / `#4f545c` | 800 |

돼지 (`CFG.PIG[size]`): 공통 density 0.0012, friction 0.5, restitution 0.2, 색 `#7bc043`/테두리 `#4f8a2a`, score 5000.

| size | r | hp |
|---|---|---|
| small | 18 | 25 |
| large | 26 | 45 |

새 (`CFG.BIRD[type]`): 공통 restitution 0.3, friction 0.5, frictionAir 0.004.

| type | r | density | 색 | 능력 |
|---|---|---|---|---|
| red | 20 | 0.003 | `#e2372b` | 없음 |
| yellow | 18 | 0.003 | `#f2c12e` | 비행 중 탭 1회: 속도 ×1.6 |
| big | 30 | 0.0035 | `#a83228` | 없음(질량이 커서 밀어붙임) |

지면: `isStatic:true, friction:0.8, label:'ground'`, `ab={kind:'ground'}`.

### 9.3 팩토리 규칙

- 블록: `Bodies.rectangle(x, y, w, h, {density, friction, restitution, label:'block', angle})`. `ab.hp = ab.maxHp = MAT[m].hp`.
- 돼지: `Bodies.circle(x, y, r, {...})`, `label:'pig'`.
- 새: `Bodies.circle(x, y, r, {...common, density, label:'bird'})`, `Composite.add` 후 `Body.setVelocity(body, velocity)`.
- 모든 팩토리는 `Composite.add(phys.world, body)`까지 수행하고 body를 반환한다.

### 9.4 충돌 데미지 (`collisionStart` 핸들러)

```
if (!phys.damageEnabled) return
for each pair (A, B):
  relSpeed = |A.velocity - B.velocity|
  if relSpeed < DMG.MIN_SPEED: continue
  applyDamage(A, other=B, relSpeed); applyDamage(B, other=A, relSpeed)

applyDamage(target, other, s):
  if !target.ab or target.ab.hp == null: return        // 새·지면은 hp 없음
  factor = other.isStatic ? DMG.STATIC_FACTOR : min(other.mass, DMG.MASS_CAP)
  target.ab.hp -= (s - DMG.MIN_SPEED) * DMG.SCALE * factor
  if target.ab.hp <= 0 and !phys.toRemove.has(target): queueRemove(phys, target, 'destroyed')
```
(위는 규칙 서술이며 그대로 구현한다. 콜백 안에서 바디를 제거하지 않고 반드시 큐에 넣는다.)

보정 예시(구현자가 상수 의미를 이해하기 위한 참고): red(질량≈3.8)가 15 px/tick으로 wood에 직격 → (15−2.5)×2.2×3.8 ≈ 104 ≥ 90 파괴. stone은 104 데미지로 금만 감. big(질량 cap 8)이 15로 stone → 220 ≥ 170 파괴. stone 블록(질량 2.8)이 8 px/tick으로 small 돼지에 낙하 → 34 ≥ 25 사망. 돼지가 지면에 10 px/tick 이상으로 떨어지면(약 180 px 높이) 사망.

### 9.5 제거와 이벤트

`queueRemove(phys, body, reason)`은 `toRemove.add(body)`와 함께 이벤트를 `phys.events`에 넣는다:

| 대상 | 이벤트 |
|---|---|
| pig | `{type:'pig-dead', x, y}` |
| block | `{type:'block-broken', m, x, y, reason}` — `reason==='oob'`면 점수 없음 |
| bird | `{type:'bird-gone'}` |

`flush(phys)`: `toRemove`의 각 바디에 대해 (1) `bounds`를 8 px 확장한 영역으로 `Query.region(allBodies, bounds)`한 뒤 결과 중 비정적 바디를 `Sleeping.set(b, false)`, (2) `Composite.remove(world, body)`. 그 후 `toRemove.clear()`, `events`를 복사해 반환하고 비운다. (1)이 없으면 잠든 돼지가 들보가 사라져도 공중에 떠 있는다.

### 9.6 경계 정리

`cullOutOfBounds`: 비정적 바디 중 `position.x < -OOB || position.x > W+OOB || position.y > H+OOB` 인 것을 `queueRemove(…, 'oob')`. 돼지는 `pig-dead`(점수 지급), 블록은 점수 없음, 새는 `bird-gone`.

### 9.7 안정화

`settle(phys, n)`: `damageEnabled=false` → `Engine.update` n회(동기, 렌더 없음) → `allBodies` 중 비정적 바디 전부 `Sleeping.set(b, true)` → `damageEnabled=true`. 강제 슬립 덕에 로드 직후 구조물이 미동도 하지 않고, 새가 부딪히면 Matter가 깨운다.

---

## 10. 슬링샷 입력과 궤적 예측

### 10.1 좌표 변환
`rect = canvas.getBoundingClientRect()`; `x = (clientX - rect.left) * (W / rect.width)`, y 동일. 캔버스 CSS에 `touch-action:none`.

### 10.2 포인터 이벤트 (`pointerdown / pointermove / pointerup / pointercancel`, 캔버스에 바인딩, down 시 `setPointerCapture`)

- **down**: `hooks.canDrag()`이고 `dist(p, SLING.{x,y}) ≤ grabRadius` → `drag.active=true, drag.pos=clampPull(p)`. 아니면 `hooks.onTap()` 호출(옐로 부스트 판단은 게임 쪽).
- **move**: `drag.active`면 `drag.pos = clampPull(p)`.
- **up**: `drag.active`면 `active=false`; `pull = |drag.pos - anchor|`; `pull < minPull`이면 취소, 아니면 `hooks.onRelease(launchVelocity(drag.pos), drag.pos)`.
- **cancel**: `drag.active=false`.
- `clampPull(p)`: `d = p - anchor`; `|d| > maxPull`이면 `d`를 `maxPull` 길이로 정규화; 반환 `anchor + d`.
- `launchVelocity(pos)`: `{x: (anchor.x - pos.x) * power, y: (anchor.y - pos.y) * power}`.

게임 쪽 hooks:
- `canDrag`: `state==='PLAYING' && phase==='AIM' && loaded != null`
- `onRelease(v, pos)`: `launch(v, pos)` → `active = Physics.addBird(phys, loaded, pos.x, pos.y, v)`; `loaded=null`; `phase='FLIGHT'`; `shots++`; `UI.showHint(false)`
- `onTap`: `state==='PLAYING' && phase==='FLIGHT' && active && active.ab.type==='yellow' && !active.ab.abilityUsed` → `Body.setVelocity(active, Vector.mult(active.velocity, 1.6))`, `abilityUsed=true`

키보드: `window keydown` `Escape` → `PLAYING`이면 `pause()`, `PAUSED`면 `resume()`.

### 10.3 궤적 예측 `previewPoints(pos, v)`
Matter의 적분과 같은 식을 tick 단위로 반복: `v.x *= (1 - fa)`, `v.y = v.y*(1 - fa) + G_PER_STEP`, `p += v` (`fa = CFG.BIRD.common.frictionAir`). `PREVIEW.steps`까지 돌리며 `every`번째마다 점을 기록, `p.y > GROUND_Y`이면 중단, 최대 `maxDots`개. 시작 `p = pos`.

---

## 11. 새 생명주기와 클리어/실패 판정

### 11.1 개념
- `queue`: 아직 장전 안 된 타입 배열. `loaded`: 새총에 올라간 타입(물리 바디 아님). `active`: 비행 중 바디(최대 1개).
- HUD의 남은 새 = `[loaded, ...queue]`(loaded가 있을 때).

### 11.2 spent 판정 (FLIGHT, 매 tick, `active`에 대해)
`ab.ticks++`. 다음 중 하나면 spent:
1. `Physics.bodies`에 더 이상 없음(OOB로 제거됨)
2. `active.isSleeping`
3. `active.speed < SPENT.lowSpeed`가 `SPENT.lowSpeedTicks` 연속(아니면 카운터 0으로 리셋)
4. `ab.ticks > SPENT.maxTicks`

spent 처리: 아직 world에 있으면 `queueRemove(phys, active, 'spent')` 후 `flush`; `active=null`; `phase='WAIT_NEXT'`.

### 11.3 클리어/실패
- 클리어: §6.2 전역 규칙 → `ENDING_CLEAR`(72 tick 대기, 물리 계속) → `finishClear()`.
- 실패: `WAIT_NEXT` 종료 시 `queue`가 비었으면 `END_CHECK` → 전부 잠들거나 180 tick 경과 → `finishFail()`. 그 사이 돼지가 다 죽으면 전역 규칙이 먼저 클리어로 보낸다.

---

## 12. 점수·별·저장

- `pig-dead`: `+SCORE.pig`, 팝업 "+5000" (이벤트 x,y).
- `block-broken`(reason≠'oob'): `+MAT[m].score`, 팝업.
- 클리어 시 남은 새 × 10000 보너스.
- 별: 클리어면 1, `score ≥ star2`면 2, `score ≥ star3`면 3.
- 저장 형식: `{ v:1, stars:{"1":3,...}, best:{"1":31500,...} }`, 키 `CFG.SAVE_KEY`. `localStorage` 접근은 전부 `try/catch`(file:// 또는 사파리 차단 대비, 실패 시 메모리만).
- `Save.record(id, score, stars)`: 기존보다 클 때만 갱신.
- 메뉴의 "기록 초기화" 버튼: 키 삭제 후 `renderStageList` 재호출.

---

## 13. 렌더링 (Canvas 2D)

### 13.1 `view` 스키마 (게임이 매 프레임 `buildView()`로 조립)
```
{ engine: Engine|null, phase, loaded: type|null,
  drag: { active, pos },            // AB.Input.drag 그대로
  preview: {x,y}[]|null,            // drag.active일 때만 previewPoints(drag.pos, launchVelocity(drag.pos))
  fx: { particles:[], popups:[] } }
```

### 13.2 그리기 순서
1. 배경: 하늘 세로 그라데이션(`#79c5ff` → `#dff4ff`), 원경 언덕 타원 2~3개(연녹), 구름 생략 가능.
2. 지면: `y=650~662` 녹색 `#6fbf4a`, 그 아래 갈색 `#8b5a2b`.
3. 새총 뒤 갈래: 기둥 `(220,650)→(220,600)`, 뒤 갈래 `(220,600)→(205,560)`; 두꺼운 갈색 선(lineWidth 10, `#5b3a1a`).
4. 고무줄 뒤쪽: `drag.active`면 `(205,560)→drag.pos`, 아니면 `loaded`가 있을 때 `(205,560)→(220,555)`. 색 `#3b2a1a`, lineWidth 5.
5. 월드 바디 (`engine`이 있을 때 `Composite.allBodies` 순회, `ab.kind`로 분기):
   - `ground`: 건너뜀(2에서 그림).
   - `block`: `save → translate(position) → rotate(angle) → fillRect(-w/2,-h/2,w,h) + strokeRect`. `hp/maxHp < 0.66`이면 중심을 지나는 대각선 균열 1개, `< 0.33`이면 2개(어두운 선, alpha 0.6). `restore`.
   - `pig`: 원(`#7bc043`, 테두리 `#4f8a2a`), 눈 2개(흰 원 + 검은 점), 코(타원 `#5ea332` + 콧구멍 2점). `angle`만큼 회전. `hp/maxHp < 0.5`면 반투명 붉은 원 덧칠.
   - `bird`: 타입 색 원, 눈 2개, 부리(주황 삼각형, 진행 방향 +x 기준으로 회전은 `angle`), 배(밝은 원 아래쪽). big은 눈썹 두껍게.
6. 장전 새: `loaded`가 있으면 위치 = `drag.active ? drag.pos : (220,555)`에 bird 그리기 (angle 0).
7. 고무줄 앞쪽: 4와 같은 규칙으로 `(235,560)`에서.
8. 새총 앞 갈래: `(220,600)→(235,560)`.
9. 궤적 점: `preview`의 각 점을 흰색 alpha 0.7, 반지름 4 → 뒤로 갈수록 2까지 감소.
10. fx: 파티클(작은 사각형, 색상은 재질/돼지색), 점수 팝업(굵은 흰 글자 + 검은 외곽선, 위로 떠오르며 페이드).

렌더 함수는 상태를 바꾸지 않는다(순수 읽기). `engine`이 null이면 1~2, 3, 8만 그린다.

### 13.3 fx 규칙 (game.js에서 갱신, tick 단위)
- 파티클: `{x,y,vx,vy,life,color,size}`; 블록 파괴 시 8개, 돼지 사망 시 10개; `vy += 0.3`, `life--`(초기 40), `life≤0` 제거. 새 수는 `fx.particles.length ≤ 200`으로 제한.
- 팝업: `{x,y,text,life}`; `y -= 0.8`, 초기 life 50, alpha = life/50.

---

## 14. UI / DOM

### 14.1 index.html 요소 (id는 정확히 이 이름)

```
#game-wrap
  canvas#canvas (width=1280 height=720)
  #hud                     (게임 화면에서만 표시, pointer-events:none, 자식 버튼만 auto)
    #hud-left  > #hud-stage, #hud-score, #hud-birds
    #hud-hint  ("새를 드래그해서 뒤로 당긴 뒤 놓으세요")
    button#btn-pause  (텍스트 "II", aria-label="일시정지")   ← 우측 상단 고정
  #screen-menu   .screen  > 제목 "ANGRY BIRDS WEB", button#btn-start "게임 시작", button#btn-reset-save "기록 초기화"
  #screen-stages .screen  > 제목 "스테이지 선택", #stage-list, button#btn-stages-back "뒤로"
  #overlay-pause .overlay > 제목 "일시정지", button#btn-resume "계속하기", button#btn-pause-restart "다시하기", button#btn-pause-menu "메인으로"
  #overlay-clear .overlay > 제목 "STAGE CLEAR!", #clear-stars, #clear-score, button#btn-clear-next "다음 스테이지", button#btn-clear-restart "다시하기", button#btn-clear-menu "메인으로", #clear-all-msg "모든 스테이지 클리어!" (isLast일 때만)
  #overlay-fail  .overlay > 제목 "실패...", "새를 모두 사용했습니다", button#btn-fail-restart "다시하기", button#btn-fail-menu "메인으로"
  #overlay-error .overlay > #error-msg
```
스테이지 카드: `button.stage-card[data-index]` 안에 번호, 별 문자열(`★`×n + `☆`×(3−n)), 최고점수(없으면 "-").

### 14.2 화면 상태별 표시 (클래스 `hidden` = `display:none !important`)

| `showScreen` | `screen-menu` | `screen-stages` | `hud` + `btn-pause` |
|---|---|---|---|
| `'menu'` | 보임 | 숨김 | 숨김 |
| `'stages'` | 숨김 | 보임 | 숨김 |
| `'game'` | 숨김 | 숨김 | 보임 |

`showOverlay(name)`: 네 오버레이(pause/clear/fail/error) 중 `name`만 보이고 나머지 숨김. `null`이면 전부 숨김. 오버레이가 캔버스와 HUD를 덮으므로 오버레이 표시 중에는 캔버스 포인터 입력이 닿지 않는다.

### 14.3 style.css 핵심
- `html,body`: margin 0, height 100%, `background:#1b1f2a`, overflow hidden, `font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`. body는 flex 중앙 정렬.
- `#game-wrap`: `position:relative; aspect-ratio:16/9; width:min(100vw, calc(100vh * 16 / 9)); overflow:hidden`.
- `#canvas`: `position:absolute; inset:0; width:100%; height:100%; display:block; touch-action:none; user-select:none`.
- `.screen`: `position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:20px; z-index:4;` 불투명 배경(하늘색 그라데이션).
- `.overlay`: 같은 배치, `background:rgba(0,0,0,.55); z-index:3; color:#fff`.
- `#hud`: `position:absolute; inset:0; z-index:2; pointer-events:none; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,.6)`. `#hud-left`: 좌상단 16px. `#hud-hint`: 하단 중앙.
- `#btn-pause`: `position:absolute; top:12px; right:12px; width:56px; height:56px; border-radius:12px; font-weight:900; font-size:22px; pointer-events:auto; background:rgba(0,0,0,.45); color:#fff; border:2px solid #fff`.
- `.btn`: `font-size:clamp(14px, 2vw, 24px); padding:.6em 1.6em; border-radius:12px; border:0; cursor:pointer; background:#f2c12e; color:#3a2a00; font-weight:700`. hover 밝게.
- `#stage-list`: `display:grid; grid-template-columns:repeat(5, minmax(0,1fr)); gap:12px; width:min(90%, 900px)`. `.stage-card`: 흰 배경 카드, 번호 크게, 별 노란색.
- `#overlay-error`: `z-index:10`, 빨간 배경.
- `.hidden { display:none !important }`
- HUD·오버레이 글자 크기는 `clamp()`로 뷰포트에 비례.

### 14.4 버튼 → 핸들러 매핑 (`UI.init`)

| 버튼 | 핸들러 | Game 동작 |
|---|---|---|
| btn-start | onStart | `state='STAGES'`, `renderStageList`, `showScreen('stages')` |
| .stage-card | onSelectStage(i) | `startLevel(i)` |
| btn-stages-back | onStagesBack | `state='MENU'`, `showScreen('menu')` |
| btn-pause | onPause | `state==='PLAYING'`이면 `state='PAUSED'`, `Input.reset()`, `showOverlay('pause')` |
| btn-resume | onResume | `state==='PAUSED'`이면 `state='PLAYING'`, `showOverlay(null)`, `acc=0` |
| btn-pause-restart, btn-clear-restart, btn-fail-restart | onRestart | `restart()` |
| btn-pause-menu, btn-clear-menu, btn-fail-menu | onMenu | `toMenu()` |
| btn-clear-next | onNext | `startLevel(cur+1)` (cur<9일 때만) |
| btn-reset-save | onResetSave | 저장 삭제 |

---

## 15. 게임 루프와 부트스트랩

### 15.1 `init()`
1. `typeof Matter === 'undefined'`이면 `UI.showError('물리 엔진(Matter.js)을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침하세요.')` 후 return.
2. `Render.init(canvas)`, `UI.init(handlers)`, `Input.init(canvas, hooks)`, 키보드 바인딩, `Save.load()`.
3. `state='MENU'`, `UI.showScreen('menu')`, `requestAnimationFrame(frame)`.

### 15.2 `frame(ts)`
```
requestAnimationFrame(frame)
dt = ts - lastTs (첫 프레임은 0); lastTs = ts; dt = min(dt, 100)
if state === 'PLAYING':
  acc += dt; n = 0
  while acc >= STEP and n < MAX_STEPS_PER_FRAME: tick(); acc -= STEP; n++
  if n === MAX_STEPS_PER_FRAME: acc = 0
Render.draw(buildView())
```
`PAUSED`/`CLEAR`/`FAIL`에서도 렌더는 계속되어 마지막 장면이 보인다. `MENU`/`STAGES`에서는 `engine`이 null인 view를 그린다.

---

## 16. 구현 순서

각 단계 끝의 "확인"은 파일을 다시 Read하여 눈으로 수행한다.

1. **index.html + style.css** — §14 요소와 id 전부, 스크립트 순서, CDN 폴백 인라인 스크립트. 확인: id 목록 §14.1과 대조, 스크립트 8개 순서.
2. **config.js** — §5 표 전부. 확인: 키 이름 표와 동일, `G_PER_STEP` 계산식.
3. **levels.js** — 헬퍼 §3.2 → 10 레벨 §8. 확인: `AB.LEVELS.length===10`, id 1..10 순서, 각 레벨 `birds.length ≥ 1`, 돼지 수가 표와 일치, `pigInFrame` 크기 제약, 기둥 착지 규칙, x 범위.
4. **physics.js** — §9. 확인: API가 §9.1 안에 있는지, 콜백 안에서 `Composite.remove` 호출 없음, `flush`가 이웃을 깨우는지, `settle`이 damage를 껐다 켜는지.
5. **render.js** — §13. 확인: 그리기 순서, `ab.kind` 분기, `engine===null` 처리, `save/restore` 짝.
6. **input.js** — §10. 확인: 좌표 변환, `setPointerCapture`, `clampPull`, `launchVelocity` 부호(앵커 − 위치), `previewPoints` 식.
7. **ui.js** — §14. 확인: 모든 id `getElementById` 철자, `hidden` 토글, `updateHUD` 캐시 비교, 카드 `data-index`.
8. **game.js** — §6, §7, §11, §12, §15. 확인: 상태/페이즈 전이 표와 1:1, `tick` 순서, hooks/handlers 이름이 §3.5/§3.6과 동일, `load` 이벤트 등록.
9. **README.md** — 여는 법(`index.html` 더블클릭 또는 아무 정적 서버, 인터넷 필요), 조작법(드래그·놓기, 옐로 탭 부스트, Esc 일시정지), 파일 구조 한 줄씩.
10. **§17 정적 검증** 전체 수행. 발견한 문제는 해당 파일을 다시 Write하고 그 파일의 체크만 재수행.

---

## 17. 정적 검증 체크리스트 (실행 대신 수행)

### 17.1 파일 간 계약
- [ ] `index.html` 스크립트 순서가 §2와 같고 `type="module"`, `defer`, `async`가 없다.
- [ ] 각 JS 파일 첫 줄 `window.AB = window.AB || {};`, IIFE로 감싸짐, `import/export/require` 없음.
- [ ] `AB.CFG, AB.LevelBuild, AB.LEVELS, AB.Physics, AB.Render, AB.Input, AB.UI, AB.Game`이 각각 정확히 한 파일에서 정의된다.
- [ ] game.js에서 호출하는 `AB.Physics.*`, `AB.Render.*`, `AB.Input.*`, `AB.UI.*` 이름을 §3 표와 하나씩 대조(grep 대신 눈으로 목록 작성).
- [ ] ui.js가 참조하는 모든 id가 index.html에 존재한다(§14.1 목록으로 대조). `querySelector`의 클래스도 CSS/HTML에 존재.
- [ ] `hooks`(canDrag/onRelease/onTap)와 `handlers`(onStart…onResetSave) 키 이름이 정의 측과 호출 측에서 동일.

### 17.2 Matter 사용
- [ ] 최상위에서 `Matter` 참조 없음.
- [ ] 사용 API가 §9.1 목록 안에 있음. 특히 `Composite.add/remove`(`World.add` 아님), `engine.gravity`(`world.gravity` 아님).
- [ ] `collisionStart` 콜백 안에서는 hp 감소와 `queueRemove`만 하고 제거는 `flush`에서.
- [ ] `addBird`가 `Composite.add` **후** `Body.setVelocity`.
- [ ] `settle`이 `Sleeping.set(b, true)`를 비정적 바디에만 적용.

### 17.3 문법·논리
- [ ] 각 파일 괄호/중괄호/백틱 짝 맞음(파일 끝까지 훑는다).
- [ ] `const`/`let` 재선언 없음, 함수 정의 전에 호출되는 화살표 함수 없음(함수 선언문 우선 사용).
- [ ] `tick()` 순서가 §6.2와 같다. `phase` 문자열 철자 5종 일치. `state` 6종 일치.
- [ ] `finishClear`에서 남은 새 = `queue.length + (loaded?1:0)`, `active`는 미포함.
- [ ] `WAIT_NEXT` 종료 시 `queue.length>0`이면 반드시 `AIM` 진입 처리(`loaded = queue.shift()`)가 실행된다.
- [ ] `startLevel`이 `Input.reset()`, fx 초기화, `score=0`, HUD 갱신, 오버레이 숨김을 모두 한다.
- [ ] `toMenu`가 `phys=null`로 만들고 렌더가 null engine을 처리한다.
- [ ] `updateHUD`의 `birds` 배열 순서 `[loaded, ...queue]`.

### 17.4 데이터
- [ ] 10개 레벨 돼지 수: 2,3,3,4,4,4,5,5,6,8. 새 수: 3,3,4,4,4,5,5,5,6,7.
- [ ] `frame` 기하: 기둥 `x ∓ (innerW/2 + pillarW/2)`, 들보 폭 `innerW + 2*pillarW`, `top = bottomY − pillarH − beamH`.
- [ ] `stack`의 `top`이 마지막 블록 윗면.
- [ ] 레벨 7·10의 위층 기둥이 아래층 들보 위에 있음(§8 규칙으로 수치 확인).

### 17.5 책상 시뮬레이션 (각 시나리오를 코드 경로 따라 읽으며 확인)
1. 페이지 로드 → `load` → `init` → 메뉴 표시.
2. 게임 시작 → 스테이지 1 → `startLevel(0)` → 바디 생성 → settle → `AIM`, `loaded='red'`, HUD "STAGE 1 / 0 / 새 3".
3. 앵커 근처 down → move(당김 110 px 제한) → up → `launch` → 바디 생성·속도 → `FLIGHT`.
4. 충돌 → hp 감소 → 파괴 큐 → `flush` → `block-broken` → 점수·파티클.
5. 새 잠듦 → spent → `WAIT_NEXT` → 36 tick → `AIM`, `loaded='red'`, HUD 새 2.
6. 돼지 0 → `ENDING_CLEAR` → 72 tick → `finishClear` → 저장 → 오버레이, 별.
7. 비행 중 일시정지 → `PAUSED`, tick 없음, 장면 정지 → 계속하기 → 재개. 다시하기 → 같은 스테이지 처음부터. 메인으로 → 메뉴, `phys=null`.
8. 새 소진, 돼지 생존 → `END_CHECK` → 실패 오버레이 → 다시하기 동작.
9. 스테이지 10 클리어 → "다음 스테이지" 숨김, "모든 스테이지 클리어!" 표시.
10. Esc 키 토글.

---

## 18. 완료 판정 기준 (수용 기준)

아래가 모두 참이면 "된 것"이다. 구현자는 실행할 수 없으므로 §17로 대신 확인하고, 평가자는 브라우저에서 확인한다.

1. `index.html`을 Chrome에서 `file://`로 열면(인터넷 연결 상태) 콘솔 오류 없이 메인 메뉴가 뜬다. Matter 로드 실패 시 한국어 에러 오버레이가 뜬다.
2. "게임 시작" → 10개 스테이지 카드가 보이고, 모두 선택 가능하다.
3. 아무 스테이지나 열면 구조물·돼지가 정지 상태로 놓여 있다(흔들림·자동 붕괴 없음).
4. 새를 드래그하면 고무줄이 늘어나고 궤적 점이 보인다. 놓으면 포물선으로 날아가 블록·돼지와 충돌하고, 블록이 금 가고 파괴되며, 돼지가 죽고, 점수가 오른다. 옐로 새는 비행 중 탭으로 가속한다.
5. 돼지를 모두 제거하면 클리어 오버레이(점수·별)가 뜨고 "다음 스테이지"로 이어진다. 스테이지 10에서는 "다음 스테이지"가 없다.
6. 새를 모두 쓰고 돼지가 남으면 실패 오버레이에 "다시하기 / 메인으로"가 있다.
7. 인게임 **우측 상단**에 일시정지 버튼이 있고, 누르면 물리가 멈추며 "계속하기 / **다시하기** / **메인으로**" 버튼이 나온다. 각 버튼이 이름대로 동작한다. Esc로도 토글된다.
8. 새로고침 후에도 별·최고점수가 유지된다. 창 크기를 바꿔도 16:9 비율로 맞춰지고 입력 좌표가 어긋나지 않는다.

---

## 19. 리스크와 대응 / 튜닝 포인트

| 리스크 | 대응 |
|---|---|
| CDN 접근 불가 | unpkg 폴백 + 에러 오버레이. 그 이상은 범위 밖. |
| 구조물 자동 붕괴/떨림 | settle + 강제 슬립. 그래도 문제면 `ENGINE.positionIterations`를 10으로, `pillarH`를 60으로. |
| 너무 쉬움/어려움 | `DMG.SCALE`(전체 파괴력), `MAT[*].hp`, `PIG[*].hp`, `SLING.power`만 조정. 레벨 데이터는 건드리지 않는다. |
| 예측 궤적과 실제 불일치 | `frictionAir` 값이 `previewPoints`와 `BIRD.common`에서 같은 상수를 참조하는지 확인. |
| 잠든 돼지 공중부양 | `flush`의 이웃 깨우기(§9.5)가 유일한 방어선. 반드시 구현. |
| 새가 영원히 구름 | `SPENT.maxTicks` 480(8초) 상한. |
| localStorage 예외 | 전부 try/catch. |

---

## 20. 범위 밖 (하지 않는 것)

사운드, 이미지/스프라이트, 카메라 스크롤·줌, 스테이지 잠금, 새 종류 추가(블루 분열·블랙 폭탄 등), 모바일 전용 UI, 다국어, 리더보드, 서비스워커/오프라인 캐시, 빌드 도구.
