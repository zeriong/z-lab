# 웹 앵그리버드 구현 계획서

> 이 문서 하나만 읽고 구현한다. 외부 문서·검색·질문 없이 작성 가능하도록 모든 수치와 계약을 여기 적었다.
> **판단이 필요한 지점은 이미 결정해 두었다. 재설계하지 말고 그대로 옮겨라.**

---

## 0. 구현자 실행 조건 (먼저 읽을 것)

구현자는 **파일 읽기/쓰기만 가능**하다. 다음이 **불가능**하다.

| 불가능한 것 | 그래서 생긴 제약 |
|---|---|
| `npm install` / 패키지 설치 | `node_modules` 전제 금지. 번들러·TypeScript·프레임워크 금지 |
| 빌드 / 트랜스파일 | 소스가 곧 실행물. `import`/`export` 문 금지 |
| 브라우저 실행 / 콘솔 확인 | 런타임 시행착오 불가. 코드는 **한 번에 맞아야** 한다 |
| 테스트 실행 | "테스트 통과" 주장 금지 |
| 바이너리 파일 생성 | **이미지·오디오 에셋 0개.** 모든 그래픽은 Canvas 벡터 드로잉 |

여기서 파생되는 결정 3가지 (이유 포함, 변경 금지):

1. **`<script type="module">` 을 쓰지 않는다.** 모듈 스크립트는 `file://` 로 열면 CORS로 차단되어 게임이 아예 안 뜬다. 서버를 띄울 수 없으므로 **클래식 `<script>` + 전역 네임스페이스 `window.AB`** 로 간다. 로드 순서가 곧 의존성 순서다.
2. **물리는 Matter.js를 CDN으로 가져온다.** 회전 강체 + 접촉 해석을 직접 구현하면 실행 검증 없이는 성공률이 사실상 0이다. CDN `<script>` 는 설치가 아니라 런타임 다운로드이므로 이 제약과 충돌하지 않는다. (오프라인이면 안 뜬다 → §9.2의 에러 오버레이로 처리)
3. **에셋이 없으므로 도형·그라디언트만으로 그린다.** 새=원+부리 삼각형, 돼지=원+눈+코, 블록=사각형, 배경=선형 그라디언트+언덕 곡선.

### 구현자가 하지 말아야 할 것

- 파일 목록에 없는 파일을 만들지 말 것 (README, package.json, 설정 파일, 테스트 파일 전부 금지).
- 이 문서의 **좌표·상수·수식을 "개선"하지 말 것.** 서로 맞물려 계산된 값이다.
- 캔버스 안에 클릭 가능한 UI를 그리지 말 것. **UI는 전부 DOM.** (캔버스 히트테스트 버그가 가장 흔한 실패다)
- 카메라 스크롤, 사운드, 리플레이, 멀티터치 제스처 구현 금지 (§11 비목표).
- 코드에 `TODO`/`FIXME`/빈 함수 남기지 말 것. 남길 거면 그 기능을 아예 넣지 말 것.

---

## 1. 산출물 구조

**루트 = 이 문서(`plan.md`)가 있는 디렉토리.** 그 아래에 정확히 아래 9개 파일만 만든다.

```
<루트>/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── config.js     상수 (다른 파일이 참조하는 단일 진실원)
    ├── levels.js     10개 스테이지 데이터
    ├── physics.js    Matter 엔진 래핑, 바디 생성, 데미지/파괴
    ├── render.js     Canvas 2D 드로잉 전담
    ├── input.js      포인터 입력 → 슬링샷 드래그/발사
    ├── ui.js         DOM 오버레이·HUD·버튼 바인딩
    └── game.js       상태 머신 + 게임 루프 + 레벨 생명주기
```

`index.html` 의 스크립트 로드 순서 (**이 순서 고정**):

```
matter.js(CDN) → config.js → levels.js → physics.js → render.js → input.js → ui.js → game.js
```

부트스트랩은 `game.js` 맨 아래에서 `window.addEventListener('load', AB.Game.init)` 로 처리한다 (main.js 없음).

CDN 태그 (버전 고정, 변경 금지):

```
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
```

각 파일은 즉시실행함수 안에서 `window.AB` 의 하위 객체 하나만 붙인다. 파일당 250줄을 넘기지 말 것. 넘으면 로직이 과하다는 신호다.

---

## 2. 전체 설계 요약

| 항목 | 결정 | 근거 |
|---|---|---|
| 물리 엔진 | **Matter.js 0.19.0 (CDN)** | 직접 구현은 무검증 환경에서 실패 확률이 압도적 |
| 렌더링 | **Canvas 2D, 직접 드로잉** | Matter의 `Render` 모듈은 디버그용이라 게임 그림에 부적합. 바디의 `vertices`/`angle`만 읽어 우리가 그린다 |
| 좌표계 | **논리 해상도 1280×720 고정, 카메라 없음** | 모든 레벨이 한 화면에 들어오도록 설계됨 → 카메라/스크롤 버그 원천 제거 |
| 화면 맞춤 | `#app` 을 `transform: scale(s)` 로 축소 (`s = min(vw/1280, vh/720)`) | 캔버스와 DOM UI가 같은 배율로 움직여 정렬이 깨지지 않음 |
| 시간 | **고정 스텝 16.667ms + 누산기** | 물리 재현성 확보. 프레임 지연 시 최대 5스텝까지만 따라잡음 |
| UI | **전부 DOM/CSS**, 캔버스는 월드 전용 | 버튼 히트테스트를 브라우저에 위임 |
| 저장 | `localStorage`, 실패 시 메모리 폴백 | `file://` 에서 막힐 수 있음 |

### 상태 머신

```
MENU ──[게임 시작]──► PLAYING ──[일시정지 ⏸]──► PAUSED
  ▲  └─[스테이지 선택]─► SELECT ──[해금된 칸]──► PLAYING      │
  │                                    │                      ├─[계속하기]─► PLAYING
  │                          ┌─────────┴─────────┐            ├─[다시하기]─► PLAYING(같은 레벨 재시작)
  │                          ▼                   ▼            └─[메인으로]─► MENU
  │                        CLEAR               FAIL
  └────────────[메인으로]────┴─────────┬─────────┘
                                       └─[다시하기]─► PLAYING(같은 레벨 재시작)
   CLEAR ─[다음 스테이지]─► PLAYING(다음 레벨)   ※ 10스테이지 클리어 시 '다음' 버튼 숨김
```

상태 전이는 **오직 `AB.Game.setState(next)` 한 곳에서만** 일어난다. 다른 파일이 상태 변수를 직접 바꾸지 않는다.

- `PAUSED` 진입: 물리 스텝 중단, 렌더는 계속(정지 화면), 입력 무시.
- `PAUSED` 해제: **누산기를 0으로 리셋**한다. 안 하면 정지 시간만큼 물리가 폭주한다. (흔한 버그)
- `CLEAR`/`FAIL`: 물리 스텝 중단. 렌더는 계속.

---

## 3. `config.js` — 상수 (`AB.C`)

다른 모든 파일은 숫자 리터럴을 쓰지 말고 여기를 참조한다.

### 3.1 화면·시간

| 키 | 값 | 뜻 |
|---|---|---|
| `W`, `H` | 1280, 720 | 논리 해상도 |
| `GROUND_Y` | 600 | 지면 윗면 y (아래로 갈수록 y 증가) |
| `FIXED_DT` | 16.667 | 고정 물리 스텝(ms) |
| `MAX_SUBSTEPS` | 5 | 한 프레임 최대 물리 스텝 수 |
| `MAX_FRAME_MS` | 100 | 프레임 델타 상한 (탭 복귀 대비) |

### 3.2 슬링샷·발사

| 키 | 값 | 뜻 |
|---|---|---|
| `SLING.x`, `SLING.y` | 180, 470 | 새총 앵커(= 새 대기 위치) |
| `SLING.forkBottom` | 600 | 새총 기둥 밑동 y |
| `GRAB_R` | 70 | 이 반경 안을 눌러야 드래그 시작 |
| `DRAG_MAX` | 110 | 당길 수 있는 최대 거리(px) |
| `DRAG_MIN` | 12 | 이보다 짧게 당기고 놓으면 발사 취소 |
| `LAUNCH_K` | 0.2 | 속도 = 당긴 거리 × K |
| `SPEED_MAX` | 22 | 속도 상한 (= DRAG_MAX × LAUNCH_K) |

**단위 주의:** Matter의 `velocity` 는 "초당 px" 가 아니라 **"한 스텝당 px"** 이다. 22 = 초당 약 1320px.

### 3.3 중력·궤적 예측

- 엔진 중력은 기본값(`y: 1`, `scale: 0.001`) 그대로 쓴다.
- 그 결과 **한 스텝당 y속도 증가량 ≈ `1 × 0.001 × 16.667² = 0.2778`** 이다. 이 값을 `GRAVITY_STEP = 0.2778` 로 둔다.
- 궤적 예측은 이 값으로 오일러 적분해서 그린다 → 실제 비행과 거의 일치한다.
  - **새의 `frictionAir` 를 0으로 두는 이유가 이것이다.** 공기저항이 있으면 예측선이 어긋난다.
  - 예측은 근사다. 충돌 이후는 예측하지 않는다.

| 키 | 값 |
|---|---|
| `GRAVITY_STEP` | 0.2778 |
| `TRAJ_DOTS` | 30 (점 개수) |
| `TRAJ_STEP` | 4 (몇 스텝마다 점 하나) |

### 3.4 재질 (블록)

| type | density | restitution | friction | hp | 면 색 | 테두리 색 |
|---|---|---|---|---|---|---|
| `wood` | 0.0025 | 0.05 | 0.60 | 55 | `#c98b44` | `#8a5a24` |
| `ice` | 0.0018 | 0.10 | 0.20 | 28 | `#9fd8ee` (알파 0.75) | `#5aa8c8` |
| `stone` | 0.0055 | 0.02 | 0.70 | 140 | `#9aa0a6` | `#5f656b` |

파괴 점수는 재질 무관 **500점 고정**.

### 3.5 새

| type | 반지름 | density | restitution | friction | frictionAir | 능력 | 색 |
|---|---|---|---|---|---|---|---|
| `red` | 14 | 0.010 | 0.35 | 0.6 | 0 | 없음 | `#e0402e` |
| `yellow` | 12 | 0.008 | 0.30 | 0.6 | 0 | 대시 | `#f2c230` |
| `black` | 15 | 0.014 | 0.20 | 0.6 | 0 | 폭발 | `#3a3a40` |

능력은 **비행 중 화면을 한 번 탭(pointerdown)** 하면 발동하고, 새 한 마리당 1회만 쓸 수 있다.

- `yellow` 대시: `velocity × 1.6`, 단 속도 상한 34로 클램프.
- `black` 폭발: 즉시 §5.4 폭발 처리 후 자기 자신 제거.

| 키 | 값 |
|---|---|
| `DASH_MUL` / `DASH_MAX` | 1.6 / 34 |
| `BLAST_R` | 130 (폭발 반경) |
| `BLAST_DMG` | 90 (중심 데미지, 거리 비례 선형 감쇠) |
| `BLAST_IMPULSE` | 0.036 (질량당 힘 계수 → 중심에서 약 10px/step 가속) |

### 3.6 돼지

| 종류 | 반지름 | density | restitution | friction | hp | 점수 |
|---|---|---|---|---|---|---|
| small | 18 | 0.0022 | 0.25 | 0.6 | 24 | 5000 |
| big | 28 | 0.0022 | 0.25 | 0.6 | 60 | 7000 |

### 3.7 데미지·점수·타이머

| 키 | 값 | 뜻 |
|---|---|---|
| `IMPACT_MIN` | 4 | 이 미만의 상대속도는 데미지 0 |
| `DMG_SCALE` | 2.2 | 상대속도 → 데미지 환산 |
| `BIRD_BONUS` | 2.5 | 새가 낀 충돌 데미지 배수 |
| `SCORE_BLOCK` | 500 | |
| `SCORE_BIRD_LEFT` | 10000 | 남은 새 1마리당 클리어 보너스 |
| `SETTLE_SPEED` | 0.6 | 이 속도 미만이면 "정지"로 본다 |
| `SETTLE_MS` | 1000 | 월드 전체가 이만큼 정지하면 턴 종료 |
| `SHOT_TIMEOUT_MS` | 8000 | 발사 후 이 시간이 지나면 강제 턴 종료 |
| `NEXT_BIRD_MS` | 900 | 턴 종료 후 다음 새가 올라올 때까지 |
| `CLEAR_DELAY_MS` | 800 | 마지막 돼지 제거 후 클리어 패널까지 |
| `OUT_MARGIN` | 150 | 화면 밖 판정 여유(px) |

### 3.8 그 외

`STORAGE_KEY = 'ab_progress_v1'`, `LEVEL_COUNT = 10`.

---

## 4. `levels.js` — 10개 스테이지 데이터

### 4.1 데이터 스키마

`AB.LEVELS` = 길이 10의 배열. 각 원소:

```
{
  id: 1..10,
  name: '문자열',
  terrain: [ {x, y, w, h} ],        // 정적 지형(지면은 자동 생성이라 제외). 좌표는 중심 기준
  blocks:  [ {type, x, y, w, h} ],  // type: 'wood'|'ice'|'stone'. x,y = 중심
  pigs:    [ {x, y, r} ],           // r: 18(small) | 28(big)
  birds:   ['red'|'yellow'|'black', ...],  // 발사 순서
  star2: 숫자, star3: 숫자
}
```

### 4.2 조립 헬퍼 (levels.js 안에 정의하고, 레벨 배열은 이 헬퍼 호출로 만든다)

모든 조각은 **바닥 기준(bottom-anchored)** 이고, **실제 바닥 y = base − 1** 로 1px 띄운다(초기 겹침 방지).

기본 조각 규격:

| 이름 | w × h | 설명 |
|---|---|---|
| V (세로기둥) | 18 × 110 | |
| H (가로보) | 150 × 18 | |
| B (상자) | 46 × 46 | |
| S (받침) | 90 × 24 | |

헬퍼 (인자: `x` = 구조물 중심 x, `mat` = 재질, `base` = 올려놓을 면의 y):

| 헬퍼 | 만들어내는 것 |
|---|---|
| `hut(x, mat, base)` | V@`x−64`, V@`x+64` (둘 다 base 위), H@`x` (base−110 위) + **small 돼지 @ (x, base−19)** |
| `tower2(x, mat, base)` | `hut` 1층 조각 + 2층 V@`x−64`,V@`x+64` (base−128 위), H@`x` (base−238 위) + **돼지 2마리 @ (x, base−19), (x, base−147)** |
| `wall(x, mat, base, n)` | B를 n개 수직으로 쌓음. i번째 중심 y = `base − 24 − 46×i` |
| `platform(x, mat, base)` | S@`x` (base 위) + **small 돼지 @ (x, base−43)** |

중심 좌표 환산(구현자가 계산할 것):
- V 중심 y = `base − 1 − 55`
- H 중심 y = `(놓이는 면) − 1 − 9`
- 1층 H 윗면 = `base − 128` (2층의 base가 된다)

**기하 규칙:** 서로 다른 구조물의 x 구간은 겹치지 않는다. 아래 표의 좌표는 이 규칙을 만족하도록 계산되어 있다. **좌표를 바꾸면 초기 상태가 서로 파고들어 폭발한다. 바꾸지 말 것.**

### 4.3 스테이지 표

`base` 표기가 없으면 600(지면).

| # | 이름 | 지형(terrain) | 구조물 | 새 | 블록/돼지 | star2 | star3 |
|---|---|---|---|---|---|---|---|
| 1 | 첫 발사 | — | `hut(880, wood, 600)` | red, red | 3 / 1 | 10000 | 14000 |
| 2 | 이웃집 | — | `hut(760, wood, 600)`, `hut(1010, wood, 600)` | red×3 | 6 / 2 | 20000 | 28000 |
| 3 | 2층집 | — | `tower2(920, wood, 600)` | red, yellow, red | 6 / 2 | 20000 | 28000 |
| 4 | 돌담 | — | `wall(700, stone, 600, 3)`, `hut(930, wood, 600)`, `platform(1140, wood, 600)` | yellow, red, red | 7 / 2 | 20000 | 28000 |
| 5 | 언덕 위 | `{x:1060, y:640, w:440, h:160}` (윗면 560) | `hut(960, wood, 560)`, `hut(1160, ice, 560)` | red, yellow, red | 6 / 2 | 20000 | 28000 |
| 6 | 얼음집 | — | `wall(760, stone, 600, 3)`, `hut(950, ice, 600)`, **big 돼지 @ (1140, 573)** | red, yellow, black, red | 6 / 2(big 1) | 27000 | 38000 |
| 7 | 탑 | — | `platform(700, wood, 600)`, `wall(850, stone, 600, 4)`, `tower2(1060, wood, 600)` | yellow, red, black, red | 11 / 3 | 30000 | 42000 |
| 8 | 요새 | `{x:1120, y:660, w:320, h:240}` (윗면 540) | `wall(700, stone, 600, 4)`, `hut(870, wood, 600)`, `hut(1120, stone, 540)` | black, yellow, red, red | 10 / 2 | 27000 | 38000 |
| 9 | 긴 사거리 | `{x:1150, y:700, w:260, h:400}` (윗면 500) | `wall(830, ice, 600, 4)`, `tower2(1150, wood, 500)` | yellow, black, red, red, red | 10 / 2 | 33000 | 46000 |
| 10 | 보스 | `{x:1140, y:660, w:280, h:240}` (윗면 540) | `wall(680, stone, 600, 4)`, `hut(850, wood, 600)`, **big 돼지 @ (960, 573)**, `hut(1120, stone, 540)` | red, yellow, black, yellow, red | 10 / 3(big 1) | 37000 | 52000 |

별 판정: 클리어하면 최소 1★, `score ≥ star2` 면 2★, `score ≥ star3` 면 3★.

지면은 레벨 데이터가 아니라 `physics.js` 가 항상 만든다: 정적 사각형 중심 `(640, 660)`, `w=2560`, `h=120` → 윗면 600, `label='ground'`, `friction=0.9`.

---

## 5. `physics.js` — `AB.Physics`

Matter 별칭은 파일 상단에서 한 번만 뽑는다: `Engine, Composite, Bodies, Body, Events`.

### 5.1 공개 API (다른 파일이 부르는 계약)

| 함수 | 인자 → 반환 | 하는 일 |
|---|---|---|
| `init()` | → 없음 | 엔진 생성. `Engine.create({ enableSleeping: true })`. 중력 기본값 유지. `collisionStart` 리스너 1회 등록 |
| `loadLevel(level)` | 레벨 객체 | 월드 비우고 지면 + terrain + blocks + pigs 생성 |
| `spawnBird(type)` | 문자열 → body | 앵커 위치에 **`isStatic: true`** 로 생성 |
| `launch(bird, vx, vy)` | | `Body.setStatic(bird,false)` → `Body.setVelocity(bird,{x:vx,y:vy})` |
| `step()` | | `Engine.update(engine, AB.C.FIXED_DT)` 한 번 + 제거 큐 비우기 |
| `explode(x, y)` | | §5.4 |
| `remove(body)` | | 제거 큐에 넣기(즉시 제거 금지) |
| `pigsLeft()` | → 숫자 | 살아있는 돼지 수 |
| `isSettled()` | → bool | 지면·terrain 제외 모든 바디가 `speed < SETTLE_SPEED` 또는 `isSleeping` |
| `bodies()` | → 배열 | 렌더가 순회할 목록 |
| `clear()` | | 월드 전체 비우기 |

콜백은 `AB.Physics.on = { onDestroy(body), onDamage(body, dmg) }` 형태로 `game.js` 가 주입한다. `physics.js` 는 게임 상태를 몰라야 한다(점수 가산·클리어 판정은 `game.js` 몫).

### 5.2 바디 생성 규칙

- 블록: `Bodies.rectangle(x, y, w, h, {density, restitution, friction, label: type})`
- 돼지: `Bodies.circle(x, y, r, {..., label: 'pig'})`
- 새: `Bodies.circle(x, y, r, {..., label: 'bird', isStatic: true})`
- 지형/지면: `Bodies.rectangle(..., { isStatic: true, label: 'ground' })`
- 생성 직후 커스텀 필드를 **직접 대입**한다: `body.hp`, `body.maxHp`, `body.gScore`, `body.dead = false`.
  (Matter 옵션 객체에 임의 키를 넣지 말고 생성 후 대입 — 예측 가능성 우선)
- **w, h, r 이 0이거나 음수인 바디를 절대 만들지 말 것.** 질량 0 → 좌표 NaN → 화면 전체가 사라진다.

### 5.3 충돌 데미지 (`collisionStart` 핸들러)

각 `pair`의 `bodyA`, `bodyB` 에 대해:

```
rel = hypot(A.velocity.x - B.velocity.x, A.velocity.y - B.velocity.y)
if (rel < IMPACT_MIN) → 무시
dmg = (rel - IMPACT_MIN) * DMG_SCALE
if (A.label==='bird' || B.label==='bird') dmg *= BIRD_BONUS
A, B 각각에 대해: label이 wood/ice/stone/pig 이면 applyDamage(body, dmg)
```

`applyDamage(body, dmg)`:
```
if (body.dead) return
body.hp -= dmg
on.onDamage(body, dmg)                 // 렌더 흔들림/파편용
if (body.hp <= 0) { body.dead = true; on.onDestroy(body); remove(body) }
```

- 정적 바디는 velocity가 0이므로 `rel` = 움직인 쪽 속도가 된다 → 낙하 데미지가 자동으로 처리된다.
- **`collisionStart` 콜백 안에서 `Composite.remove` 를 호출하지 말 것.** 순회 중 배열을 건드리면 그 프레임 충돌이 유실된다. 반드시 제거 큐에 넣고 `step()` 끝에서 비운다.
- `collisionActive` 는 쓰지 않는다(중복 데미지 원인).

### 5.4 폭발 (`explode(x, y)`)

지면·terrain을 제외한 모든 바디에 대해:
```
d = 중심까지 거리
if (d > BLAST_R) 건너뜀
f = 1 - d / BLAST_R                       // 0..1
dir = 정규화(body.position - {x,y})        // d < 1 이면 dir = (0,-1)
Body.applyForce(body, body.position, { x: dir.x * BLAST_IMPULSE * f * body.mass,
                                       y: dir.y * BLAST_IMPULSE * f * body.mass })
파괴 가능 바디면 applyDamage(body, BLAST_DMG * f)
```
폭발 이펙트(확장하는 원)는 `game.js` 가 `render` 에 넘기는 이펙트 배열에 추가한다.

---

## 6. `render.js` — `AB.Render`

### 6.1 API

- `init(canvas)` — `canvas.width=1280, canvas.height=720`, 2D 컨텍스트 보관.
- `draw(view)` — 한 프레임 전체를 그린다. `view` 는 `game.js` 가 만든 스냅샷:
  ```
  { bodies, bird, drag: {active, x, y} | null, trajectory: [{x,y}...], particles: [...], blasts: [...] }
  ```
- `Render` 는 게임 상태를 저장하지 않는다. 매 프레임 받은 것만 그린다.

### 6.2 드로잉 순서 (고정)

1. **하늘** — 세로 그라디언트 `#7ec8f0` → `#cfeaf7`.
2. **먼 언덕** — `#a9d68b` 로 2~3개의 완만한 곡선(`quadraticCurveTo`) 실루엣.
3. **지면** — y 600~720 을 `#7bbf5a` 로 채우고 윗면에 `#5f9e42` 3px 라인.
4. **terrain** — 정적 바디를 지면과 같은 색으로 채우고 테두리.
5. **새총 뒤쪽 기둥** — (180,600)→(180,470) 굵기 12, `#6b4525`. 갈래는 앵커에서 좌우로 ±14 벌어진 짧은 선 2개.
6. **고무줄 뒤줄** — 드래그 중이면 오른쪽 갈래 → 새 중심, `#3b2a1a` 굵기 6.
7. **블록** — 각 바디의 `vertices` 로 path를 만들고 재질 색 채움 + 테두리 2px.
   - 데미지 표시: `hp/maxHp < 0.6` 이면 대각선 crack 1개, `< 0.3` 이면 2개를 어두운 색으로 덧그림.
8. **돼지** — 초록 원(`#7ac943`) + 배 밝은 타원 + 흰자 2개 + 검은 눈동자 + 코(가로 타원 + 콧구멍 점 2개) + 귀. 회전(`body.angle`) 적용.
9. **새** — 몸 원 + 배 밝은 원 + 눈 + 주황 부리 삼각형 + 눈썹 선. 회전 적용.
10. **고무줄 앞줄** — 왼쪽 갈래 → 새 중심.
11. **파티클** — 작은 사각형/원, `life` 비율로 알파 감소.
12. **폭발 원** — 반경 커지며 알파 감소.
13. **궤적 점** — 드래그 중일 때만. 반지름 3의 흰색 원(알파 0.75), 뒤로 갈수록 작아짐.
14. **당김 보조선** — 앵커에서 새까지 점선(`setLineDash([6,6])`).

회전 바디 그리기: `ctx.save() → translate(pos) → rotate(angle) → 로컬 좌표로 그림 → restore()`. 사각형은 `vertices` 가 이미 월드 좌표이므로 그대로 path로 써도 된다.

### 6.3 궤적 계산 (`game.js` 에서 만들어 `view.trajectory` 로 넘김)

시작점은 **현재 새 위치**(드래그된 위치)다. 앵커가 아니다.

```
vx = (anchor.x - dragX) * LAUNCH_K
vy = (anchor.y - dragY) * LAUNCH_K        // 크기를 SPEED_MAX 로 클램프
x = dragX; y = dragY
for i in 1..(TRAJ_DOTS * TRAJ_STEP):
    vy += GRAVITY_STEP
    x += vx; y += vy
    if (i % TRAJ_STEP === 0) 점 추가
    if (y > GROUND_Y) 중단
```

---

## 7. `input.js` — `AB.Input`

**Pointer Events만 사용한다** (`pointerdown/pointermove/pointerup/pointercancel`). mouse+touch 이중 등록 금지(더블 발사 버그). CSS에 `touch-action: none` 필수.

### 7.1 좌표 변환 (필수)

캔버스가 CSS로 축소되어 있으므로 클라이언트 좌표를 그대로 쓰면 안 된다.

```
r = canvas.getBoundingClientRect()
worldX = (e.clientX - r.left) * (1280 / r.width)
worldY = (e.clientY - r.top)  * (720  / r.height)
```

### 7.2 API

`AB.Input.attach(canvas, handlers)` — `handlers` 는 `game.js` 가 준다:

| 핸들러 | 호출 시점 |
|---|---|
| `onDragStart(x, y)` | 앵커로부터 거리 ≤ `GRAB_R` 인 지점을 눌렀을 때 |
| `onDragMove(x, y)` | 드래그 중 이동 |
| `onDragEnd(x, y)` | 포인터 업 |
| `onTap()` | 드래그가 아닌 단순 탭 (능력 발동용) |

- `pointerdown` 에서 `canvas.setPointerCapture(e.pointerId)` 를 호출한다(캔버스 밖으로 나가도 드래그 유지).
- 드래그 여부 판정: `pointerdown` 지점이 `GRAB_R` 안이면 드래그 모드, 아니면 탭 후보. 탭 후보는 `pointerup` 에서 이동거리 < 10px 이면 `onTap()`.
- 게임 상태 확인은 `input.js` 가 하지 않는다. `game.js` 의 핸들러가 상태를 보고 무시한다.
- 키보드: `keydown` 에서 `Escape` → `AB.Game.togglePause()`, `KeyR` → PLAYING/PAUSED/FAIL/CLEAR 에서 재시작.

### 7.3 드래그 클램프

```
dx = x - anchor.x, dy = y - anchor.y
len = hypot(dx, dy)
if (len > DRAG_MAX) { dx *= DRAG_MAX/len; dy *= DRAG_MAX/len }
새 위치 = anchor + (dx, dy)   ← Body.setPosition (새는 아직 static)
```

발사 시:
```
len < DRAG_MIN  → 취소, 새를 앵커로 복귀
else vx = -dx * LAUNCH_K, vy = -dy * LAUNCH_K  (당긴 반대 방향)
     속도 크기를 SPEED_MAX 로 클램프
```

---

## 8. `index.html` / `css/style.css` / `ui.js`

### 8.1 DOM 구조 (id는 **정확히** 이 이름으로. `ui.js` 가 이 id로만 찾는다)

```
<div id="app">
  <canvas id="game-canvas"></canvas>

  <div id="hud">
    <div id="hud-stage">STAGE 1</div>
    <div id="hud-score">0</div>
    <div id="hud-birds"></div>          ← 남은 새 아이콘(span)들을 JS로 채움
  </div>

  <button id="pause-btn" aria-label="일시정지">❚❚</button>

  <div id="overlay">
    <section id="panel-main">   … <button id="btn-start">게임 시작</button>
                                  <button id="btn-select">스테이지 선택</button></section>
    <section id="panel-select"> … <div id="stage-grid"></div>
                                  <button id="btn-select-back">뒤로</button></section>
    <section id="panel-pause">  … <button id="btn-resume">계속하기</button>
                                  <button id="btn-restart">다시하기</button>
                                  <button id="btn-main">메인으로</button></section>
    <section id="panel-clear">  … <div id="clear-stars"></div><div id="clear-score"></div>
                                  <button id="btn-next">다음 스테이지</button>
                                  <button id="btn-clear-retry">다시하기</button>
                                  <button id="btn-clear-main">메인으로</button></section>
    <section id="panel-fail">   … <button id="btn-fail-retry">다시하기</button>
                                  <button id="btn-fail-main">메인으로</button></section>
    <section id="panel-error">  … 물리 엔진 로드 실패 안내</section>
  </div>
</div>
```

**요구사항 3 대응 (필수 준수):**
- `#pause-btn` 은 **인게임 화면 우측**에 있어야 한다 → `position:absolute; top:16px; right:16px;` 크기 56×56, `z-index:5`.
- `#pause-btn` 은 **`PLAYING` 상태에서만 보인다.**
- `#panel-pause` 에는 **「다시하기」와 「메인으로」 버튼이 반드시 존재**한다. 라벨 문구를 바꾸지 말 것. (「계속하기」는 정지 해제를 위해 추가로 둔다)

### 8.2 상태별 표시 규칙 (`AB.UI.show(state)`)

| 요소 | MENU | SELECT | PLAYING | PAUSED | CLEAR | FAIL |
|---|---|---|---|---|---|---|
| `#hud` | ✕ | ✕ | ○ | ○ | ○ | ○ |
| `#pause-btn` | ✕ | ✕ | **○** | ✕ | ✕ | ✕ |
| `#overlay` 딤 배경 | ○ | ○ | ✕ | ○ | ○ | ○ |
| 표시할 패널 | main | select | 없음 | pause | clear | fail |

구현: 모든 패널에 `hidden` 속성을 켜고, 현재 상태의 패널만 끈다. `#overlay` 는 패널이 없을 때 `pointer-events: none` 으로 (캔버스 입력을 막지 않도록).

### 8.3 CSS 요점

- `html, body { margin:0; height:100%; background:#1b1f24; overflow:hidden; }`
- `#app { position:absolute; width:1280px; height:720px; transform-origin: top left; }`
- 배율: 최초 로드와 `resize` 시 `s = Math.min(innerWidth/1280, innerHeight/720)` 를 계산해
  `#app.style.transform = 'scale(' + s + ')'`, `left = (innerWidth - 1280*s)/2`, `top = (innerHeight - 720*s)/2`.
- `#game-canvas { display:block; width:1280px; height:720px; touch-action:none; }`
- 버튼 공통: 라운드 12px, 패딩 14px 28px, 폰트 18px bold, 배경 `#f5b83d`, 호버 시 밝게, `cursor:pointer`.
- 패널: 반투명 검정 카드(`rgba(20,24,30,.88)`), 흰 글자, 가운데 정렬, `border-radius:20px`.
- **폰트 파일을 링크하지 말 것.** `font-family: system-ui, -apple-system, 'Malgun Gothic', sans-serif`.

### 8.4 `ui.js` API

| 함수 | 하는 일 |
|---|---|
| `init(handlers)` | 모든 버튼에 클릭 리스너 등록. `handlers` = `{onStart, onSelect, onStage(i), onResume, onRestart, onMain, onNext, onBack}` |
| `show(state)` | §8.2 표대로 표시 전환 |
| `setHUD({stage, score, birdsLeft})` | 텍스트 갱신. `birdsLeft` 는 새 타입 배열 → 색깔 원 span으로 렌더 |
| `renderStageGrid(progress)` | 10개 버튼. `i < progress.unlocked` 면 활성, 아니면 `disabled` + 자물쇠 표시. 획득 별 표시 |
| `setClear({score, stars, hasNext})` | 별 아이콘(★/☆ 3개), 점수, `#btn-next` 표시/숨김 |
| `showError(msg)` | `#panel-error` 표시 |

---

## 9. `game.js` — 상태 머신 + 루프 (핵심 파일)

### 9.1 내부 상태

```
state         : 'MENU'|'SELECT'|'PLAYING'|'PAUSED'|'CLEAR'|'FAIL'
levelIndex    : 0..9
score         : 숫자
queue         : 남은 새 타입 배열
bird          : 현재 새 body 또는 null
birdPhase     : 'READY'|'DRAG'|'FLYING'|'DONE'
abilityUsed   : bool
settleTimer   : ms 누적
shotTimer     : ms 누적
nextBirdTimer : ms 또는 null
clearTimer    : ms 또는 null
particles, blasts : 이펙트 배열
progress      : {unlocked:1, stars:{}}
acc, lastTs   : 루프 누산기
```

### 9.2 부팅 (`init`)

1. `typeof Matter === 'undefined'` 면 `UI.showError('물리 엔진(Matter.js) 로드 실패 — 인터넷 연결을 확인하세요')` 후 **중단**.
2. `Render.init(canvas)`, `Physics.init()`, `UI.init(handlers)`, `Input.attach(canvas, handlers)`, 배율 계산 + `resize` 리스너.
3. `progress` 로드 (`localStorage.getItem`; **try/catch 로 감싸고** 실패 시 `{unlocked:1, stars:{}}` 메모리 사용).
4. `setState('MENU')`, `requestAnimationFrame(loop)` 시작.

### 9.3 게임 루프 (의사코드)

```
loop(ts):
  requestAnimationFrame(loop)
  dt = min(ts - lastTs, MAX_FRAME_MS); lastTs = ts
  if (state === 'PLAYING'):
      acc += dt
      n = 0
      while (acc >= FIXED_DT && n < MAX_SUBSTEPS):
          Physics.step(); tick(FIXED_DT); acc -= FIXED_DT; n++
      if (n === MAX_SUBSTEPS) acc = 0          // 따라잡기 포기(스파이럴 방지)
  else:
      acc = 0                                   // 일시정지/메뉴에서 시간 누적 금지
  updateEffects(dt)
  Render.draw(buildView())
```

`tick(dt)` 가 하는 일 (물리 1스텝당 1회):
1. 클리어 판정: `Physics.pigsLeft() === 0` 이고 `clearTimer === null` 이면 `clearTimer = CLEAR_DELAY_MS`.
2. `clearTimer` 감소 → 0 이하면 `finishClear()` 후 return.
3. 새가 `FLYING` 이면:
   - `shotTimer += dt`
   - 화면 밖 판정: `x < -OUT_MARGIN || x > 1280+OUT_MARGIN || y > 720+OUT_MARGIN` → 턴 종료
   - `Physics.isSettled()` 면 `settleTimer += dt`, 아니면 0으로 리셋
   - `settleTimer >= SETTLE_MS || shotTimer >= SHOT_TIMEOUT_MS` → 턴 종료
4. 턴 종료(`endTurn`): 새 body 제거, `birdPhase='DONE'`, `nextBirdTimer = NEXT_BIRD_MS`.
5. `nextBirdTimer` 감소 → 0 이하면:
   - `queue` 에 남은 새가 있으면 `spawnBird(queue.shift())`, `birdPhase='READY'`, `abilityUsed=false`, HUD 갱신
   - 없으면 `finishFail()`

### 9.4 입력 핸들러 (game.js 쪽)

| 핸들러 | 동작 |
|---|---|
| `onDragStart` | `state==='PLAYING' && birdPhase==='READY'` 일 때만 `birdPhase='DRAG'` |
| `onDragMove` | `DRAG` 이면 클램프 후 `Body.setPosition(bird, …)`, 궤적 재계산 |
| `onDragEnd` | `DRAG` 이면 §7.3대로 발사 또는 취소. 발사 시 `birdPhase='FLYING'`, `shotTimer=0`, `settleTimer=0` |
| `onTap` | `state==='PLAYING' && FLYING && !abilityUsed` 이면 새 타입별 능력 발동, `abilityUsed=true` |

### 9.5 점수 콜백

- `Physics.on.onDestroy = (body) => { score += (body.label==='pig' ? body.gScore : SCORE_BLOCK); spawnParticles(body); UI.setHUD(...) }`
- 클리어 시: `score += 남은 새 수(queue.length + (아직 발사 안 한 새가 대기 중이면 1)) × SCORE_BIRD_LEFT`

### 9.6 클리어/실패 처리

`finishClear()`:
1. 남은 새 보너스 가산.
2. 별 계산 → `progress.stars[id] = max(기존, 별)`, `progress.unlocked = min(10, max(unlocked, levelIndex+2))`.
3. 저장(try/catch).
4. `UI.setClear({score, stars, hasNext: levelIndex < 9})` → `setState('CLEAR')`.

`finishFail()`: `setState('FAIL')`.

`startLevel(i)`: `Physics.clear()` → `Physics.loadLevel(AB.LEVELS[i])` → 상태 변수 전부 초기화 → 첫 새 스폰 → `UI.setHUD` → `setState('PLAYING')`.

**재시작은 반드시 `startLevel(levelIndex)` 를 다시 부르는 것으로 구현한다.** 부분 초기화 금지(잔여 바디·타이머가 남는 버그의 원인).

### 9.7 이펙트

- 파괴 시 파티클 10개: 위치는 바디 중심, 속도 랜덤(−3..3, −5..0), `life=600ms`, 중력 0.25/step 적용, 색은 재질 색.
- 폭발: `{x, y, r:0, life:400}` → `r` 을 `BLAST_R` 까지 증가시키며 알파 감소.
- 이펙트는 물리와 무관한 순수 시각 요소다. `updateEffects(dt)` 에서 실제 경과 시간으로 갱신한다(일시정지 중에는 갱신하지 않아도 무방).

---

## 10. 구현 순서 (이 순서대로 파일을 만든다)

각 단계마다 "**읽어서 확인 가능한 것**"만 체크한다(실행 확인은 불가능하다).

| # | 만들 것 | 완료 조건 (읽기로 확인) |
|---|---|---|
| 1 | `index.html` | 스크립트 8개가 §1 순서대로 있음. §8.1의 id가 전부 존재 |
| 2 | `css/style.css` | §8.3의 선택자가 전부 있음. `#pause-btn` 이 `right:16px` |
| 3 | `js/config.js` | §3의 모든 키가 `AB.C` 에 있음. 누락 0 |
| 4 | `js/levels.js` | `AB.LEVELS.length === 10`, 헬퍼 4개 정의, §4.3 좌표 그대로 |
| 5 | `js/physics.js` | §5.1의 함수 11개 전부 존재. 제거는 큐 방식 |
| 6 | `js/render.js` | §6.2의 14단계가 그 순서로 있음 |
| 7 | `js/input.js` | Pointer 이벤트만 사용. 좌표 변환식 포함 |
| 8 | `js/ui.js` | §8.4의 함수 6개 존재. `getElementById` 대상이 전부 HTML에 있음 |
| 9 | `js/game.js` | §9의 루프·전이·핸들러 전부. 파일 끝에 `load` 리스너 |
| 10 | 교차 점검 | 아래 §12 체크리스트 전 항목 |

---

## 11. 비목표 (하지 말 것)

- 카메라 스크롤/줌 (모든 레벨이 한 화면)
- 사운드, BGM, 진동
- 이미지·폰트·오디오 등 외부 에셋
- 새 능력 추가(빨강/노랑/검정 3종만)
- 레벨 에디터, 리더보드, 서버 통신
- 세로 모드 전용 레이아웃 (배율 축소로만 대응)
- 추상 레이어(이벤트 버스, DI, 클래스 계층 등)

---

## 12. 완료 판정 기준

### 12.1 정적 체크리스트 (구현자가 직접 확인 가능 — 전부 ✓ 여야 완료)

- [ ] 파일이 정확히 9개. 추가 파일 없음
- [ ] `import`/`export`/`require` 문 0개, `type="module"` 없음
- [ ] `node_modules`, `package.json`, 빌드 설정 없음
- [ ] JS에서 참조하는 모든 `getElementById` 대상 id가 `index.html` 에 존재 (양방향 대조)
- [ ] `AB.C` 에 §3 키 전부 존재하고, 다른 파일이 참조하는 키가 전부 정의되어 있음
- [ ] `AB.LEVELS` 길이 10, 각 레벨에 `birds.length ≥ 2`, `pigs.length ≥ 1`
- [ ] 어떤 바디도 w/h/r 이 0 이하가 아님
- [ ] `Composite.remove` 가 `collisionStart` 콜백 안에서 호출되지 않음
- [ ] `PAUSED` 해제 지점에서 누산기(`acc`)가 0으로 리셋됨
- [ ] `#pause-btn` 이 `PLAYING` 에서만 보이고 우측 상단에 고정
- [ ] `#panel-pause` 에 「다시하기」「메인으로」 버튼이 존재
- [ ] `localStorage` 접근이 전부 try/catch 안에 있음
- [ ] `TODO`/`FIXME`/빈 함수 본문 0개
- [ ] 각 파일이 다른 파일의 함수를 부를 때 §5.1/§6.1/§7.2/§8.4의 시그니처와 이름·인자 수가 정확히 일치

### 12.2 이 환경에서 **판정할 수 없는 것** (완료 보고에 "동작한다"고 쓰지 말 것)

- 게임이 실제로 렌더되는지, 프레임이 도는지
- 물리 파라미터(hp·데미지·발사 속도)의 체감 밸런스
- 10개 스테이지가 실제로 클리어 가능한지
- 구조물이 초기 상태에서 스스로 무너지지 않는지
- CDN 접근 가능 여부

→ 구현자는 **"명세대로 작성 완료"** 까지만 보고한다. "플레이 가능", "테스트 통과", "버그 없음" 은 근거가 없는 주장이므로 금지.

### 12.3 사람이 브라우저에서 확인할 항목 (참고용, 구현자 작업 아님)

1. `index.html` 을 열면 메인 화면과 「게임 시작」 버튼이 보인다
2. 시작 → 1스테이지 로드, 구조물이 스스로 무너지지 않는다
3. 새를 드래그하면 궤적 점이 보이고, 놓으면 포물선으로 날아간다
4. 새가 블록/돼지를 맞히면 구조물이 무너지고 점수가 오른다
5. 우측 ⏸ 버튼 → 물리가 멈추고 「계속하기/다시하기/메인으로」가 뜬다
6. 돼지를 다 잡으면 클리어 패널 + 별, 「다음 스테이지」로 2스테이지 진행
7. 새를 다 쓰고 돼지가 남으면 실패 패널
8. 새로고침 후에도 해금 진행도가 유지된다

---

## 13. 알려진 함정 (실행 검증 없이 실패하는 지점 — 반드시 피할 것)

| 함정 | 증상 | 회피 |
|---|---|---|
| 모듈 스크립트를 `file://` 로 로드 | 아무것도 안 뜸(콘솔 CORS 에러) | 클래식 `<script>` + `window.AB` |
| 캔버스 CSS 축소 후 좌표 미변환 | 드래그가 커서와 어긋남 | §7.1 변환식 필수 |
| 일시정지 후 누산기 폭주 | 재개 순간 물체가 순간이동 | 재개 시 `acc = 0` |
| 충돌 콜백 안에서 바디 제거 | 충돌 유실/간헐적 크래시 | 제거 큐 |
| 크기 0 바디 생성 | 좌표 NaN 전파 → 화면 백지 | 모든 w/h/r 양수 보장 |
| 초기 배치 겹침 | 시작하자마자 구조물이 튀어오름 | 조각 바닥 = `base − 1`, 구조물 x 구간 비겹침 |
| `velocity` 를 초당 단위로 착각 | 새가 안 날아가거나 순간이동 | **스텝당 px**. 상한 22 |
| 궤적 예측과 실제 비행 불일치 | 조준이 안 맞음 | 새 `frictionAir = 0`, `GRAVITY_STEP = 0.2778` 동일 사용 |
| mouse + touch 이벤트 이중 등록 | 한 번 당겼는데 두 번 발사 | Pointer Events만 |
| 부분 초기화 재시작 | 이전 판 바디/타이머 잔존 | `startLevel()` 전체 재실행 |
| `file://` 에서 localStorage 예외 | 스크립트 전체 중단 | try/catch + 메모리 폴백 |
