# 구현 플랜 — 웹 브라우저 앵그리버드 (10 스테이지)

> **구현자 전제**: 파일 읽기/쓰기 도구만 사용 가능. 설치·빌드·실행·테스트 불가. 이 문서 하나만 읽고 작업한다.
> 따라서 이 플랜은 "선택지 나열"이 아니라 **결정된 사양서**다. 좌표·상수·수식·DOM id·문구는 전부 확정값으로 적혀 있다.
> 판단이 필요한 지점은 이미 결정해 두었으니, **임의로 바꾸지 말고 그대로 옮겨라.**

---

## 0. 이 문서 사용법

1. §1 수용 기준 → §2 결정 사항을 먼저 읽어 전체 그림을 잡는다.
2. §3~§12 는 사양. 구현 중 계속 되돌아와 참조한다.
3. §13 작업 순서대로 파일을 만든다. 순서를 지키면 "아직 없는 것"을 참조하는 사고가 안 난다.
4. §14 정적 자가검증 체크리스트를 통과시키는 것이 **완료**다.
5. §15 금지 사항은 예외 없다.

**경로 규칙**: 모든 경로는 너에게 지정된 구현 루트 디렉토리 기준 상대경로다. 별도 지정이 없으면 이 플랜 파일이 있는 디렉토리를 루트로 삼는다.

---

## 1. 수용 기준 (무엇이 되면 "된 것"인가)

실행·검증이 불가능한 환경이므로, 완료는 **런타임 동작이 아니라 산출물의 정적 속성**으로 정의한다.

### 1.1 필수 수용 기준 (요구사항 직결)

| # | 기준 | 근거 | 정적 확인 방법 |
|---|---|---|---|
| A1 | 스테이지 데이터가 **정확히 10개** 존재하고, 각 스테이지에 돼지 ≥1, 새 ≥3 | 요구사항 1 | `src/stages.js` 의 `STAGES` 길이 = 10, §11 표와 1:1 일치 |
| A2 | 새총 드래그 → 조준 → 발사 → 포물선 비행 → 충돌 → 구조물 파괴 → 돼지 제거의 전 경로가 코드로 존재 | 요구사항 2 | §6~§9 의 각 함수/분기가 실제 파일에 존재 |
| A3 | 중력·충돌·파괴가 **물리 시뮬레이션**으로 처리(스크립트된 애니메이션 아님) | 요구사항 2 | `src/physics.js` 에 적분·충돌해결·임펄스가 존재 |
| A4 | 인게임 **우측 상단**에 일시정지 버튼(`#btn-pause`)이 존재 | 요구사항 3 | `styles.css` 에서 `#btn-pause { position:absolute; top:16px; right:16px }` |
| A5 | 일시정지 클릭 시 오버레이가 뜨고 그 안에 **"다시하기"**, **"메인으로"** 버튼이 존재 | 요구사항 3 | `index.html` 에 `#btn-retry`(텍스트 `다시하기`), `#btn-menu`(텍스트 `메인으로`) |
| A6 | 상태 머신 메인 → 인게임 → 일시정지 → 클리어/실패 전이가 모두 구현 | 요구사항 참고질문 | §6 전이표의 모든 행이 코드에 대응 |
| A7 | 별도 설치·빌드 없이 `index.html` 을 브라우저에서 직접 열면 로드되는 구조 | 구현자 제약 | ES 모듈/번들러/CDN/`package.json` 부재 |

### 1.2 비수용 기준 (하지 않아도 되는 것)

- 이미지·오디오 **에셋 파일** 생성 (전부 코드로 벡터 그리기 / WebAudio 합성)
- 모바일 최적화, 반응형 레이아웃 정밀 대응 (캔버스 letterbox 스케일링만)
- 멀티플레이, 리더보드, 서버 통신
- 유닛 테스트 파일

### 1.3 **측정하지 않는 것 (중요)**

구현자는 실행 수단이 없다. 그러므로 완료 보고에 다음을 **쓰지 마라**:

- "동작한다 / 플레이 가능하다 / 테스트했다 / 버그 없다"
- 프레임률·성능 수치
- 브라우저 호환성 확인 결과

쓸 수 있는 것: "파일 N개를 작성했다", "§14 체크리스트 중 X항목을 자가확인했다", "확인 불가한 항목은 Y다".

---

## 2. 핵심 설계 결정 (탈락시킨 대안 포함)

구현자가 흔들리지 않도록 근거까지 남긴다.

| 질문 | **결정** | 근거 | 탈락시킨 대안과 이유 |
|---|---|---|---|
| 물리 엔진 | **직접 구현** (`src/physics.js`, 회전 없는 임펄스 기반 2D) | 설치 불가·CDN 의존 불가. 회전을 빼면 코드량이 1/3로 줄고 검증 없이도 정확도가 예측 가능 | Matter.js(npm 설치 불가), CDN 로드(오프라인/무결성 검증 불가), 회전 포함 강체(관성모멘트·마찰 토크·박스-박스 SAT 접점 클리핑 필요 → 미검증 환경에서 실패 확률 급증) |
| 렌더링 | **Canvas 2D**, 1280×720 고정 내부 해상도 | 벡터 도형만으로 전 화면 구성 가능, 에셋 0개 | WebGL(셰이더 오타 하나로 검은 화면, 복구 불가), DOM/SVG(수십 개 바디 이동 시 레이아웃 비용) |
| 모듈 시스템 | **클래식 `<script>` 태그 순차 로드 + 전역 네임스페이스** | `file://` 로 직접 열어야 하는데 ES 모듈은 CORS로 차단됨 | ESM(`file://` 에서 로드 실패), 번들러(빌드 불가) |
| UI(메뉴/일시정지) | **DOM 오버레이** (`<div class="screen">`) | 캔버스 히트테스트는 좌표 버그를 실행 없이 못 잡는다. DOM 버튼은 클릭 판정을 브라우저가 보장 | 캔버스 내부 버튼(미검증 환경에서 고위험) |
| 스테이지 데이터 | **선언적 데이터 + 바닥기준(bottom-anchored) 빌더** | 블록이 공중에 뜨거나 겹치는 사고를 산술로 정적 검증 가능 (§11.3) | 자유 좌표 하드코딩(실행 없이 배치 오류 검출 불가) |
| 상태 저장 | `localStorage` 1개 키 | 서버 불필요 | IndexedDB(과함) |

---

## 3. 파일 구조와 전역 계약

### 3.1 파일 목록

```
index.html
styles.css
src/util.js
src/const.js
src/materials.js
src/physics.js
src/stages.js
src/audio.js
src/render.js
src/input.js
src/game.js
src/ui.js
src/main.js
```

총 13개. **이 외의 파일을 만들지 마라** (README, 테스트, 설정 파일 전부 금지).

### 3.2 `index.html` 의 스크립트 로드 순서 (이 순서 고정)

`util → const → materials → physics → stages → audio → render → input → game → ui → main`

각 스크립트는 `<body>` 끝에 `<script src="src/xxx.js"></script>` 로 나열한다. `defer`/`type="module"` 붙이지 않는다.

### 3.3 전역 계약 (각 파일이 `window` 에 노출하는 것)

| 파일 | 노출 전역 | 참조 가능한 전역 |
|---|---|---|
| `util.js` | `U` = {`clamp`, `lerp`, `dist`, `sign`, `fmt`} | — |
| `const.js` | `C` = §4 상수 전부 | — |
| `materials.js` | `MAT` = §10.1 재질 표, `BIRD` = §10.2 새 표 | `C` |
| `physics.js` | `P` = {`createWorld`, `addBox`, `addCircle`, `step`, `queryRadius`} | `U`, `C` |
| `stages.js` | `SB` = 빌더(§11.2), `STAGES` = 10개 배열(§11.4) | `C`, `MAT` |
| `audio.js` | `SFX` = {`play(name)`} | — |
| `render.js` | `R` = {`draw(ctx, game)`} | `C`, `MAT`, `U` |
| `input.js` | `INPUT` = {`attach(canvas, game)`} | `C`, `U`, `GAME` |
| `game.js` | `GAME` = §6.3 API | `U`,`C`,`MAT`,`P`,`SB`,`STAGES`,`SFX` |
| `ui.js` | `UI` = {`bind(game)`, `setScreen(name)`, `updateHud(game)`, `showClear`, `showFail`, `buildStageGrid`} | `GAME`, `C` |
| `main.js` | 없음(부트스트랩) | 전부 |

**규칙**: 어떤 파일도 자기보다 **뒤에 로드되는** 파일의 전역을 *로드 시점에* 읽으면 안 된다. 함수 **본문 안에서** 참조하는 것은 허용된다(호출 시점에는 이미 로드됨). 예: `input.js` 의 이벤트 핸들러 내부에서 `GAME.fire()` 호출 → 허용.

---

## 4. 좌표계와 상수 (`src/const.js`)

### 4.1 좌표계

- x: 오른쪽 +, y: **아래쪽 +** (Canvas 기본과 동일). 중력은 `+y`.
- 월드 크기 `WORLD_W = 1920`, `WORLD_H = 720`. 뷰포트(캔버스) `VIEW_W = 1280`, `VIEW_H = 720`.
- **지면 상단 `GROUND_Y = 620`.** 지면 바디는 정적 박스: 중심 (960, 680), 크기 1920×120 → y 620~740 점유.
- 카메라는 x축 이동만. `cam.x ∈ [0, WORLD_W - VIEW_W] = [0, 640]`.
- 박스 바디는 **중심 좌표 + 반너비(hw)/반높이(hh)** 로 저장한다. 스테이지 데이터는 **바닥 y(base)** 로 기술하고 빌더가 중심으로 변환한다(§11.2).

### 4.2 상수표 (전부 `C` 에 넣는다)

| 이름 | 값 | 설명 |
|---|---|---|
| `WORLD_W` / `WORLD_H` | 1920 / 720 | 월드 크기 |
| `VIEW_W` / `VIEW_H` | 1280 / 720 | 캔버스 내부 해상도 |
| `GROUND_Y` | 620 | 지면 상단 y |
| `GRAVITY` | 1300 | px/s² |
| `FIXED_DT` | 1/120 | 물리 고정 스텝(초) |
| `MAX_STEPS` | 5 | 프레임당 최대 서브스텝 |
| `MAX_FRAME_DT` | 0.25 | 프레임 dt 상한(초) |
| `SOLVER_ITER` | 8 | 임펄스 반복 횟수 |
| `PEN_SLOP` | 0.5 | 허용 관통(px) |
| `PEN_PERCENT` | 0.6 | 위치 보정 비율 |
| `LINEAR_DAMP` | 0.25 | 선형 감쇠(1/s) |
| `SLEEP_SPEED` | 6 | 슬립 판정 속도(px/s) |
| `SLEEP_TIME` | 0.6 | 슬립까지 유지 시간(초) |
| `WAKE_SPEED` | 30 | 이웃이 이 속도 이상이면 깨움 |
| `SLING_X` / `SLING_Y` | 200 / 500 | 새총 앵커(새의 정지 위치) |
| `SLING_MAX_PULL` | 110 | 최대 당김 거리(px) |
| `SLING_GRAB_R` | 70 | 이 반경 안에서 드래그 시작 |
| `LAUNCH_POWER` | 11 | 당김거리 → 초기속도 배수 |
| `MAX_LAUNCH_SPEED` | 1400 | 초기속도 상한(px/s) |
| `TRAJ_POINTS` | 35 | 궤적 예측 점 개수 |
| `TRAJ_STEP` | 0.06 | 궤적 샘플 간격(초) |
| `DMG_MIN_SPEED` | 150 | 이 접근속도 미만은 무피해 |
| `DMG_SCALE` | 0.08 | 피해 계수 |
| `DMG_MASS_CAP` | 3 | 질량비 상한 |
| `STATIC_MASS_FACTOR` | 1.2 | 정적 바디 충돌 시 유효 질량비 |
| `SETTLE_TIMEOUT` | 8 | 발사 후 강제 정리(초) |
| `SETTLE_GRACE` | 0.9 | 정지 판정 후 대기(초) |
| `SCORE_PIG` | 5000 | 돼지 처치 점수 |
| `SCORE_BIRD_LEFT` | 10000 | 클리어 시 남은 새당 보너스 |
| `EXPLODE_R` | 160 | 폭탄새 반경(px) |
| `EXPLODE_IMPULSE` | 900 | 폭발 임펄스 세기 |
| `EXPLODE_DMG` | 140 | 폭발 최대 피해 |
| `SAVE_KEY` | `"angrybird.progress.v1"` | localStorage 키 |

### 4.3 상수 정합성 산술 (구현 중 흔들리면 여기로 돌아올 것)

최대 발사 속도 = `SLING_MAX_PULL × LAUNCH_POWER` = 110 × 11 = **1210 px/s** (상한 1400 미만이므로 캡에 걸리지 않음).
45° 발사 시 수평 도달거리 ≈ v²/g = 1210² / 1300 ≈ **1126 px**.
새총 x=200, 스테이지 구조물 x ≈ 950~1650 → 필요 사거리 750~1450.
→ **최대 파워 45°로 1126px, 즉 x≈1326 까지 직접 도달.** 그보다 먼 목표(스테이지 6·9·10의 우측단)는 고각 발사 + 낙하 또는 연쇄 붕괴로 노리는 설계다. 이 값들은 이미 조정된 것이니 **임의로 바꾸지 마라.**

---

## 5. 물리 모델 사양 (`src/physics.js`)

### 5.1 바디 표현

모든 바디는 하나의 평면 객체다. 필드:

| 필드 | 의미 |
|---|---|
| `id` | 정수 일련번호 |
| `shape` | `'circle'` 또는 `'box'` |
| `x`, `y` | **중심** 좌표 |
| `vx`, `vy` | 속도(px/s) |
| `r` | 원 반지름 (circle 전용) |
| `hw`, `hh` | 반너비/반높이 (box 전용) |
| `mass`, `invMass` | 질량. 정적이면 `mass = Infinity`, `invMass = 0` |
| `e` | 반발계수 |
| `mu` | 마찰계수 |
| `isStatic` | 불리언 |
| `sleeping`, `sleepTimer` | 슬립 상태 |
| `hp`, `maxHp` | 내구도. 파괴 불가면 `Infinity` |
| `kind` | `'ground' \| 'block' \| 'pig' \| 'bird'` |
| `mat` | 재질 키 (`'glass'\|'wood'\|'stone'\|'pig'\|'bird'\|'ground'`) |
| `dead` | 제거 예약 플래그 |
| `angle` | **렌더 전용** 회전각(물리 미반영, §12.3) |

**질량 계산**: 박스 `mass = (2hw × 2hh × density) / 1000`, 원 `mass = (π r² × density) / 1000`. 정적 바디는 계산 없이 `Infinity`.

### 5.2 스텝 알고리즘

`P.step(world, dt)` 는 이미 고정 스텝 dt(=`FIXED_DT`)로 호출된다. 내부 순서:

```
1) 적분 (정적/슬립 바디 제외)
   vy += GRAVITY * dt
   vx -= vx * LINEAR_DAMP * dt
   vy -= vy * LINEAR_DAMP * dt
   x  += vx * dt ;  y += vy * dt

2) 접촉 수집 (브로드페이즈 없이 전체 쌍 O(n²); n ≤ 40 이므로 충분)
   - 둘 다 정적이면 건너뜀
   - 둘 다 슬립이면 건너뜀
   - 형상별 판정 → 접촉 {a, b, nx, ny, depth} 생성 (n 은 a→b 방향 단위벡터)

3) 피해 계산 (반복 전에 1회만)
   각 접촉의 접근속도 vn = -( (b.vx-a.vx)*nx + (b.vy-a.vy)*ny )
   vn > DMG_MIN_SPEED 이면 §5.5 로 양쪽에 피해 적용

4) 임펄스 반복 SOLVER_ITER회 → §5.4

5) 위치 보정 (반복 후 1회)
   corr = max(depth - PEN_SLOP, 0) / (a.invMass + b.invMass) * PEN_PERCENT
   a.x -= corr * a.invMass * nx ;  a.y -= corr * a.invMass * ny
   b.x += corr * b.invMass * nx ;  b.y += corr * b.invMass * ny

6) 슬립 갱신 → §5.6
7) dead 플래그 바디를 배열에서 제거
```

### 5.3 충돌 판정 3종

**원-원**: `d = dist(a,b)`. `d < a.r + b.r` 이면 충돌. `n = (b - a)/d`, `depth = a.r + b.r - d`. `d = 0` 이면 `n = (0,-1)`, `depth = a.r + b.r`.

**원-박스** (a=원, b=박스): 박스 AABB로 원 중심을 클램프한 점 `q = (clamp(a.x, b.x-b.hw, b.x+b.hw), clamp(a.y, b.y-b.hh, b.y+b.hh))`.
- `q ≠ a.center` (원 중심이 박스 밖): `d = dist(a, q)`; `d < a.r` 이면 `n = (q - a)/d`, `depth = a.r - d`.
- `q == a.center` (원 중심이 박스 안): 네 면까지 거리 중 최소인 축으로 밀어낸다. `dx = b.hw - |a.x-b.x|`, `dy = b.hh - |a.y-b.y|`; 작은 쪽 축을 법선으로, `depth = 그 값 + a.r`, 방향은 중심에서 멀어지는 쪽.

**박스-박스**: `ox = (a.hw+b.hw) - |b.x-a.x|`, `oy = (a.hh+b.hh) - |b.y-a.y|`. 둘 다 > 0 이면 충돌. 작은 쪽을 분리축으로 선택: `ox < oy` 면 `n = (sign(b.x-a.x), 0)`, `depth = ox`. 아니면 `n = (0, sign(b.y-a.y))`, `depth = oy`.

### 5.4 임펄스 해결 (접촉 1개당)

```
rvn = (b.vx-a.vx)*nx + (b.vy-a.vy)*ny
if (rvn > 0) return                    // 이미 분리 중
inv = a.invMass + b.invMass ; if (inv == 0) return
e   = min(a.e, b.e)
if (|rvn| < 60) e = 0                  // 저속 반발 억제 → 스택 안정화
j   = -(1 + e) * rvn / inv
a.vx -= j*nx*a.invMass ; a.vy -= j*ny*a.invMass
b.vx += j*nx*b.invMass ; b.vy += j*ny*b.invMass

// 마찰: 접선 t = (-ny, nx)
rvt = (b.vx-a.vx)*tx + (b.vy-a.vy)*ty
jt  = -rvt / inv
mu  = sqrt(a.mu * b.mu)
jt  = clamp(jt, -|j|*mu, |j|*mu)
a.vx -= jt*tx*a.invMass ; a.vy -= jt*ty*a.invMass
b.vx += jt*tx*b.invMass ; b.vy += jt*ty*b.invMass
```

`|rvn| < 60` 에서 `e = 0` 으로 두는 처리를 **반드시 넣어라.** 이게 없으면 쌓인 블록이 영원히 떨린다.

### 5.5 피해 모델

접촉의 접근속도 `vn > DMG_MIN_SPEED` 일 때, 각 바디에 대해:

```
otherMassEff = other.isStatic ? (self.mass * STATIC_MASS_FACTOR) : other.mass
ratio = min(DMG_MASS_CAP, otherMassEff / self.mass)
dmg   = (vn - DMG_MIN_SPEED) * DMG_SCALE * ratio
self.hp -= dmg
if (self.hp <= 0 && self.hp !== Infinity) → 파괴 큐에 넣음
```

`hp = Infinity` 인 바디(새, 지면)는 피해를 무시한다.

**검산** (구현이 맞는지 판단하는 기준값):
- 새(질량 6.03)가 900px/s로 나무 세로기둥(질량 2.64) 타격 → ratio 3(캡), dmg = (900-150)×0.08×3 = 180 → hp 60 즉시 파괴 ✔
- 같은 조건으로 돌기둥(질량 5.81) 타격 → ratio = 1.04, dmg = 62.4 → hp 140 생존(2~3회 필요) ✔
- 나무판(2.64)이 400px/s로 지면 낙하 → ratio 1.2, dmg = 24 → hp 60 생존 ✔
- 돼지(2.51)가 새에 직격(900) → ratio 2.4, dmg = 144 → hp 40 즉사 ✔

### 5.6 슬립

- 정적이 아니고 `speed² < SLEEP_SPEED²` 이면 `sleepTimer += dt`, 아니면 `0`.
- `sleepTimer > SLEEP_TIME` → `sleeping = true`, `vx = vy = 0`.
- 접촉 수집 시 한쪽이 깨어 있고 속도가 `WAKE_SPEED` 이상이면 상대를 깨운다(`sleeping=false`, `sleepTimer=0`).
- 바디가 파괴되면 반경 120px 내 모든 바디를 깨운다.

### 5.7 `P.queryRadius(world, x, y, r)`

중심으로부터 `r` 이내(원은 중심거리, 박스는 중심거리로 근사)의 바디 배열을 반환. 폭탄새 폭발에만 쓴다.

---

## 6. 게임 상태 머신 (`src/game.js`)

### 6.1 화면 상태

`MENU`, `STAGES`, `PLAYING`, `PAUSED`, `CLEAR`, `FAIL` — `game.state` 에 문자열로 보관.

### 6.2 전이표 (전부 구현)

| 현재 | 트리거 | 다음 | 부수 효과 |
|---|---|---|---|
| MENU | `#btn-start` | PLAYING | 해금된 최고 스테이지 로드 |
| MENU | `#btn-stages` | STAGES | 스테이지 그리드 갱신 |
| STAGES | 스테이지 버튼(해금됨) | PLAYING | 해당 스테이지 로드 |
| STAGES | `#btn-stages-back` | MENU | — |
| PLAYING | `#btn-pause` | PAUSED | 물리 업데이트 중단 |
| PLAYING | 탭 비활성(`visibilitychange`) | PAUSED | 동일 |
| PAUSED | `#btn-resume` | PLAYING | 재개 |
| PAUSED | `#btn-retry` | PLAYING | 현재 스테이지 재로드 |
| PAUSED | `#btn-menu` | MENU | 스테이지 파기 |
| PLAYING | 돼지 0마리 & 월드 정지 | CLEAR | 점수 정산·저장·해금 |
| PLAYING | 새 소진 & 돼지 잔존 & 월드 정지 | FAIL | — |
| CLEAR | `#btn-next` | PLAYING | 다음 스테이지(10단계면 버튼 숨김) |
| CLEAR | `#btn-clear-retry` | PLAYING | 재로드 |
| CLEAR | `#btn-clear-menu` | MENU | — |
| FAIL | `#btn-fail-retry` | PLAYING | 재로드 |
| FAIL | `#btn-fail-menu` | MENU | — |

**PAUSED 규칙**: `GAME.update()` 는 `state !== 'PLAYING'` 이면 즉시 반환한다(렌더는 계속). 입력 핸들러도 `PLAYING` 이 아니면 무시한다. 이것 하나로 "일시정지 중 조작됨" 버그가 전부 막힌다.

### 6.3 `GAME` API

| 함수 | 역할 |
|---|---|
| `GAME.create(canvas)` | 게임 객체 생성(상태·월드·카메라·점수 초기화) |
| `GAME.loadStage(id)` | 1~10 스테이지 로드. 월드 재생성, 바디 배치, 새 큐 채움, 첫 새 장전, 카메라 리셋, `state='PLAYING'` |
| `GAME.update(dt)` | 고정스텝 누적 → `P.step` 반복 → 샷 수명주기(§6.4) → 카메라 → HUD 갱신 |
| `GAME.startDrag(px,py)` / `GAME.moveDrag(px,py)` / `GAME.release()` | 슬링샷 입력(§9) |
| `GAME.tapAbility()` | 비행 중 특수능력 발동(§10.2) |
| `GAME.pause()` / `GAME.resume()` / `GAME.retry()` / `GAME.toMenu()` | 상태 전이 |

### 6.4 샷(발사) 수명주기

`game.shot` 은 `'ARMED' | 'DRAG' | 'FLYING' | 'SETTLING'`.

1. **ARMED**: 새가 앵커 위치에 고정(물리 비활성, 월드에 없음). 궤적 예측 미표시.
2. **DRAG**: 포인터로 당기는 중. 궤적 예측 표시.
3. **FLYING**: 새 바디를 월드에 추가하고 초기속도 부여. `flyTime` 누적.
4. **SETTLING** 진입 조건 (셋 중 하나):
   - 월드의 모든 **비정적** 바디가 `sleeping` 이고 새도 정지/소멸
   - `flyTime > SETTLE_TIMEOUT`
   - 새가 월드 밖(x < -50, x > WORLD_W+50, y > WORLD_H+100)으로 이탈
5. **SETTLING** 에서 `SETTLE_GRACE` 초 대기 후 판정:
   - 돼지 0 → `CLEAR`
   - 새 남음 → 새 바디 제거 후 `ARMED` 로 복귀(다음 새 장전)
   - 새 없음 → `FAIL`

---

## 7. 게임 루프 (`src/main.js`)

```
window.addEventListener('load'):
  canvas = #game-canvas ; ctx = canvas.getContext('2d')
  game = GAME.create(canvas)
  INPUT.attach(canvas, game)
  UI.bind(game)
  UI.setScreen('main')
  requestAnimationFrame(loop)

loop(t):
  dt = min((t - last)/1000, C.MAX_FRAME_DT) ; last = t
  GAME.update(dt)          // PLAYING 아니면 내부에서 즉시 반환
  R.draw(ctx, game)        // 항상 그린다
  requestAnimationFrame(loop)
```

고정 스텝 누적은 `GAME.update` 안에서:
`acc += dt; steps = 0; while (acc >= FIXED_DT && steps < MAX_STEPS) { P.step(world, FIXED_DT); acc -= FIXED_DT; steps++ } if (steps === MAX_STEPS) acc = 0`

---

## 8. 캔버스 스케일링과 좌표 변환

- `<canvas id="game-canvas" width="1280" height="720">` — **속성으로** 내부 해상도 고정.
- CSS: `width: 100%; max-width: 1280px; aspect-ratio: 16 / 9; display: block; touch-action: none;`
- 포인터 → 월드 좌표 변환 (`input.js` 에서 단일 함수로):
  ```
  rect = canvas.getBoundingClientRect()
  sx = 1280 / rect.width
  wx = (ev.clientX - rect.left) * sx + game.cam.x
  wy = (ev.clientY - rect.top)  * sx        // 세로도 같은 배율(비율 고정이므로)
  ```
- 렌더는 `ctx.save(); ctx.translate(-cam.x, 0); ... ctx.restore()` 로 카메라를 적용하고, HUD는 DOM이므로 변환 대상이 아니다.

**카메라**: `shot === 'FLYING'` 이면 목표 `cam.x = clamp(bird.x - 420, 0, 640)`, 아니면 목표 `0`. 매 프레임 `cam.x = lerp(cam.x, target, 1 - Math.pow(0.001, dt))` (프레임률 독립 보간).

---

## 9. 슬링샷 입력과 궤적 예측 (`src/input.js`)

### 9.1 이벤트

Pointer Events만 사용(`pointerdown`/`pointermove`/`pointerup`/`pointercancel`). `pointerdown` 에서 `canvas.setPointerCapture(ev.pointerId)`. `touch-action: none` 이 CSS에 있어야 모바일에서 스크롤로 새지 않는다.

### 9.2 동작

| 이벤트 | 조건 | 처리 |
|---|---|---|
| pointerdown | `state==='PLAYING'` && `shot==='ARMED'` && 포인터가 앵커에서 `SLING_GRAB_R` 이내 | `shot='DRAG'` |
| pointerdown | `state==='PLAYING'` && `shot==='FLYING'` && 능력 미사용 | `GAME.tapAbility()` |
| pointermove | `shot==='DRAG'` | 새 위치 = 앵커 + clampLen(포인터-앵커, `SLING_MAX_PULL`) |
| pointerup | `shot==='DRAG'` | 당김거리 < 12px 이면 취소(`shot='ARMED'`, 새를 앵커로 복귀). 아니면 발사 |

**발사 속도**: `vx = (SLING_X - bird.x) * LAUNCH_POWER`, `vy = (SLING_Y - bird.y) * LAUNCH_POWER`, 이후 크기를 `MAX_LAUNCH_SPEED` 로 클램프. (당긴 반대 방향으로 날아간다.)

### 9.3 키보드 대체 조작 (필수)

포인터가 없을 때를 위해 넣는다. `state==='PLAYING' && shot==='ARMED'` 일 때:

| 키 | 동작 |
|---|---|
| ← / → | 조준각 `aimAngle` ∓3° (범위 -85°~+10°) |
| ↑ / ↓ | 파워 `aimPower` ±0.05 (범위 0.15~1.0) |
| Space | 새를 `앵커 + (-cos, -sin)(aimAngle) × SLING_MAX_PULL × aimPower` 로 옮긴 뒤 즉시 발사 |
| Esc | 일시정지 토글 |

기본값 `aimAngle = -35°`, `aimPower = 0.8`.

### 9.4 궤적 예측

`shot === 'DRAG'` 일 때만 그린다. 충돌은 무시하고 순수 포물선:

```
v0 = 발사 속도(§9.2 공식, 현재 드래그 위치 기준)
for k in 1..TRAJ_POINTS:
   t = k * TRAJ_STEP
   px = bird.x + v0x*t
   py = bird.y + v0y*t + 0.5*GRAVITY*t*t
   py > GROUND_Y 이면 중단
   반지름 3의 원, alpha = 0.85 * (1 - k/TRAJ_POINTS) + 0.1, 색 #ffffff
```

---

## 10. 재질·새·돼지 스펙

### 10.1 재질 표 (`MAT`)

| 키 | density | hp | e | mu | 색 | 테두리 | 파괴 점수 |
|---|---|---|---|---|---|---|---|
| `glass` | 0.6 | 30 | 0.15 | 0.30 | `#a8dced` | `#6fb6d6` | 250 |
| `wood` | 1.0 | 60 | 0.20 | 0.50 | `#c98b4b` | `#8a5a2b` | 500 |
| `stone` | 2.2 | 140 | 0.10 | 0.60 | `#9aa3ab` | `#6b7178` | 750 |
| `pig` | 2.0 | 40 | 0.25 | 0.40 | `#7fc855` | `#4e8f33` | 5000 |
| `bird` | 7.5 | ∞ | 0.35 | 0.40 | 새 종류별(§10.2) | `#000000` | 0 |
| `ground` | — (정적) | ∞ | 0.20 | 0.80 | `#6ab04c` | — | 0 |

### 10.2 새 종류 (`BIRD`)

| 키 | 색 | 반지름 | 능력(비행 중 탭 1회) |
|---|---|---|---|
| `red` | `#e2483c` | 16 | 없음 |
| `yellow` | `#f2c327` | 14 | 현재 속도 ×1.9 (크기 상한 2400) |
| `black` | `#2f3237` | 18 | 즉시 폭발. 첫 충돌 후 0.6초가 지나면 자동 폭발 |

**폭발 처리**: `P.queryRadius(world, bird.x, bird.y, EXPLODE_R)` 의 각 바디 b에 대해
`f = 1 - d/EXPLODE_R` (0 미만이면 스킵),
`b.vx += nx * EXPLODE_IMPULSE * f * b.invMass`, `b.vy += ny * ...`,
`b.hp -= EXPLODE_DMG * f`. 이후 새 바디를 제거하고 `SETTLING` 로 진입시킨다. (`nx,ny` 는 폭심 → 바디 방향 단위벡터.)

### 10.3 돼지

원형 바디, 기본 반지름 20 (스테이지 데이터가 지정하면 그 값). `kind='pig'`, `mat='pig'`. 파괴 시 점수 `SCORE_PIG`, 파티클 8개 생성(§12.4).

---

## 11. 스테이지 데이터 (`src/stages.js`)

### 11.1 설계 원칙

모든 조각은 **바닥 y(base)** 를 기준으로 기술한다. 그러면 "블록이 공중에 떠 있는가"를 산술로 검증할 수 있다(§11.3). 자유 좌표로 적지 마라.

### 11.2 빌더 (`SB`)

| 빌더 | 생성물 | 중심 좌표 | 점유 y 범위 | 윗면 y |
|---|---|---|---|---|
| `SB.V(cx, base, mat)` | 세로기둥 24×110 | (cx, base-55) | base-110 ~ base | `base-110` |
| `SB.H(cx, base, len, mat)` | 가로판 len×24 | (cx, base-12) | base-24 ~ base | `base-24` |
| `SB.BLK(cx, base, w, h, mat)` | 임의 박스 | (cx, base-h/2) | base-h ~ base | `base-h` |
| `SB.HUT(cx, base, mat, span)` | **오두막 3조각**: `V(cx-span/2, base)`, `V(cx+span/2, base)`, `H(cx, base-110, span+48)` | — | base-134 ~ base | `base-134` |
| `SB.PIG(cx, base, r=20)` | 돼지 원 | (cx, base-r) | base-2r ~ base | — |

`span` 기본값 110. **오두막의 총 높이는 항상 134** (기둥 110 + 지붕 24). 이 값을 외워라 — 층을 쌓을 때 `base` 를 134씩 빼면 된다.

층별 base 값: 1층 620 → 2층 486 → 3층 352 → 4층 218.

### 11.3 배치 검증 규칙 (구현 후 반드시 손으로 확인)

1. 모든 조각의 `base` 는 **620(지면)** 이거나, **그 아래에 있는 다른 조각의 윗면 y** 와 정확히 같아야 한다.
2. 위에 얹는 조각의 x 범위는 아래 지지물의 x 범위 안에 있어야 한다. (오두막 지붕의 x 범위 = `cx ± (span+48)/2`, span=110이면 `cx ± 79`)
3. 돼지의 `base` 도 같은 규칙을 따른다.
4. 같은 층 조각끼리 x 범위가 겹치면 안 된다.

### 11.4 스테이지 10종 (확정 데이터)

새 구성은 발사 순서다. `R`=red, `Y`=yellow, `B`=black.

| # | 이름 | 새 | 구조물 (빌더 호출) | 돼지 |
|---|---|---|---|---|
| 1 | 첫 발사 | R,R,R | `HUT(1150,620,wood)` | `PIG(1150,620)` |
| 2 | 이층집 | R,R,R | `HUT(1150,620,wood)`, `HUT(1150,486,wood)` | `PIG(1150,620)`, `PIG(1150,486)` |
| 3 | 쌍둥이 | R,Y,R | `HUT(1000,620,wood)`, `HUT(1320,620,wood)` | `PIG(1000,620)`, `PIG(1320,620)` |
| 4 | 유리 지붕 | R,R,Y | `HUT(1100,620,glass)`, `HUT(1400,620,glass)`, `H(1250,486,340,wood)` | `PIG(1100,620)`, `PIG(1400,620)` |
| 5 | 돌 오두막 | R,Y,B | `HUT(1200,620,stone)`, `HUT(1200,486,wood)` | `PIG(1200,620)`, `PIG(1200,486)` |
| 6 | 삼각 마을 | R,Y,Y,R | `HUT(980,620,wood)`, `HUT(1240,620,stone)`, `HUT(1500,620,wood)` | `PIG(980,620)`, `PIG(1240,620)`, `PIG(1500,620)` |
| 7 | 탑 | R,Y,B,R | `HUT(1250,620,stone)`, `HUT(1250,486,stone)`, `HUT(1250,352,wood)` | `PIG(1080,620)`, `PIG(1250,486)`, `PIG(1250,352)` |
| 8 | 유리 성 | R,R,Y,B | `HUT(1050,620,glass)`, `HUT(1350,620,glass)`, `H(1200,486,420,stone)` | `PIG(1050,620)`, `PIG(1350,620)`, `PIG(1200,462)` |
| 9 | 요새 | R,Y,B,Y,R | `HUT(1000,620,stone)`, `HUT(1300,620,stone)`, `H(1150,486,420,stone)`, `HUT(1150,462,wood)`, `HUT(1620,620,wood)` | `PIG(1000,620)`, `PIG(1300,620)`, `PIG(1150,462)`, `PIG(1620,620)`, `PIG(1150,328)` |
| 10 | 최종 요새 | R,Y,B,Y,B | `HUT(950,620,stone)`, `HUT(1250,620,stone)`, `HUT(1550,620,stone)`, `H(1100,486,340,stone)`, `H(1400,486,340,stone)`, `HUT(1250,462,wood)` | `PIG(950,620)`, `PIG(1250,620)`, `PIG(1550,620)`, `PIG(1250,462)`, `PIG(1250,328)` |

**배치 산술 확인 예시(스테이지 9)**: 오두막(1000,620) 윗면 = 486, 오두막(1300,620) 윗면 = 486. `H(1150,486,420)` 은 x 940~1360 을 점유하며 두 지붕(921~1079, 1221~1379) 위에 얹힌다 ✔. 그 판의 윗면 = 486-24 = **462**. `HUT(1150,462,wood)` 의 기둥은 x=1095, 1205 → 판 범위(940~1360) 안 ✔. 그 오두막 윗면 = 462-134 = **328** → `PIG(1150,328)` ✔.

### 11.5 스테이지 객체 형태

각 스테이지는 `{ id, name, birds: ['red',...], build: 함수 }` 형태이며, `build` 는 월드를 받아 위 표의 빌더를 순서대로 호출한다. 지면 바디는 `loadStage` 가 공통으로 먼저 추가한다.

### 11.6 별 기준 (하드코딩 금지, 계산으로)

스테이지 로드 시 계산:
`maxScore = (돼지수 × SCORE_PIG) + (블록들의 파괴점수 합) + (새 수 × SCORE_BIRD_LEFT)`
- ★1 = 클리어
- ★2 = `score ≥ maxScore × 0.50`
- ★3 = `score ≥ maxScore × 0.75`

---

## 12. 렌더링 (`src/render.js`)

### 12.1 그리기 순서 (뒤 → 앞)

1. 하늘: 세로 그라디언트 `#87ceeb` → `#e6f4fb` (뷰포트 전체, 카메라 변환 **밖**)
2. 원경 언덕: 카메라 x의 0.3배만 이동하는 패럴랙스. 반투명 `rgba(255,255,255,0.35)` 원호 3개
3. `ctx.translate(-cam.x, 0)` 적용 시작
4. 지면: y 620~720 을 `#6ab04c` 로, 상단 6px 을 `#4f8f3a` 로
5. 새총: x=`SLING_X` 에 두 개의 갈색 기둥(`#7a4a1e`), 폭 12, y 500~620. 고무줄은 DRAG 중일 때 기둥 끝 → 새 중심 선 2개(`#5a3a1a`, 두께 6)
6. 블록: 재질 색 + 2px 테두리. **hp 비율에 따라 균열 표현**: `hp/maxHp < 0.66` 이면 대각선 1개, `< 0.33` 이면 2개(`rgba(0,0,0,0.35)`)
7. 돼지: 몸통 원 + 흰자/눈동자 2개 + 코(가로 타원 + 콧구멍 2점). hp 비율 낮으면 눈을 `X` 형태 선으로
8. 새: 종류 색 원 + 부리(주황 삼각형) + 눈. `angle` 만큼 회전
9. 파티클(§12.4)
10. 궤적 예측 점(§9.4)
11. `ctx.restore()`

### 12.2 HUD

HUD는 **DOM**이다(§13.2). 캔버스에 점수를 그리지 마라.

### 12.3 새의 렌더 회전

물리에 회전이 없으므로 시각용으로만: 비행 중 `bird.angle = atan2(vy, vx)`. 블록은 회전하지 않으므로 `angle = 0` 고정.

### 12.4 파티클

`game.particles` 배열. 항목 `{x, y, vx, vy, life, maxLife, color, size}`.
- 블록 파괴 시 10개, 돼지 처치 시 8개(색 `#7fc855`), 폭발 시 20개(`#f2a33c`).
- 초기 속도: 무작위 방향 × 무작위 크기 120~320. `life = 0.7`.
- 매 프레임 `vy += GRAVITY*0.5*dt`, 위치 적분, `life -= dt`, `life <= 0` 이면 제거. alpha = `life/maxLife`.
- **`Math.random()` 사용 가능** (물리 결정성은 요구사항이 아님). 단 물리 스텝 안에서는 쓰지 마라.

---

## 13. 작업 순서 (이 순서대로 파일 작성)

각 단위는 앞 단위의 산출물만 참조한다. 한 파일을 다 쓰고 다음으로 간다.

| 순서 | 파일 | 핵심 산출물 | 이 단위의 자가확인 |
|---|---|---|---|
| 1 | `src/util.js` | `U.clamp/lerp/dist/sign/fmt` | 순수 함수만, 다른 전역 참조 0 |
| 2 | `src/const.js` | §4.2 표의 **모든** 행 | 표의 행 수와 `C` 의 키 수가 같은가 |
| 3 | `src/materials.js` | §10.1, §10.2 표 | 6개 재질 + 3종 새 |
| 4 | `src/physics.js` | §5 전부 | `step` 안에 §5.2 의 7단계가 순서대로 있는가 |
| 5 | `src/stages.js` | §11.2 빌더 + §11.4 10개 | 배열 길이 10, §11.3 규칙 손검증 |
| 6 | `src/audio.js` | `SFX.play('launch'\|'hit'\|'break'\|'win'\|'lose')` | §16 참조. `AudioContext` 없으면 무음 처리 |
| 7 | `index.html` | §13.2 DOM 골격 + 스크립트 13줄 | id 목록 전수 대조 |
| 8 | `styles.css` | 화면 전환·HUD·버튼 스타일 | `#btn-pause` 가 `right:16px` |
| 9 | `src/render.js` | §12 그리기 순서 | `R.draw` 가 게임 상태를 **변경하지 않는가**(읽기 전용) |
| 10 | `src/game.js` | §6 상태머신 + 샷 수명주기 + 점수/저장 | 전이표 15행이 전부 대응되는가 |
| 11 | `src/input.js` | §9 포인터 + 키보드 | `PLAYING` 아닐 때 전부 무시하는가 |
| 12 | `src/ui.js` | 화면 전환·HUD 갱신·스테이지 그리드·결과 표시 | 모든 버튼 id에 리스너가 붙었는가 |
| 13 | `src/main.js` | §7 부트스트랩 | 로드 순서 마지막인가 |

### 13.2 `index.html` DOM 계약 (id·문구 확정 — 바꾸지 마라)

```
#app
├── #game-canvas                     (width=1280 height=720)
├── #hud                             (PLAYING 일 때만 표시)
│   ├── #hud-left  → #hud-stage("스테이지 1"), #hud-score("점수 0")
│   ├── #hud-birds                   (남은 새 아이콘 컨테이너)
│   └── #btn-pause                   텍스트: "일시정지"      ← 우측 상단 고정
├── #screen-main      .screen
│   ├── h1 "앵그리버드"
│   ├── #btn-start    "게임 시작"
│   └── #btn-stages   "스테이지 선택"
├── #screen-stages    .screen
│   ├── h2 "스테이지 선택"
│   ├── #stage-grid                  (버튼 10개를 JS로 생성)
│   └── #btn-stages-back  "뒤로"
├── #screen-pause     .screen
│   ├── h2 "일시정지"
│   ├── #btn-resume   "계속하기"
│   ├── #btn-retry    "다시하기"      ← 요구사항 3 필수
│   └── #btn-menu     "메인으로"      ← 요구사항 3 필수
├── #screen-clear     .screen
│   ├── h2 "스테이지 클리어"
│   ├── #clear-stars, #clear-score
│   ├── #btn-next     "다음 스테이지"
│   ├── #btn-clear-retry "다시하기"
│   └── #btn-clear-menu  "메인으로"
└── #screen-fail      .screen
    ├── h2 "실패"
    ├── #fail-msg "새를 모두 사용했습니다"
    ├── #btn-fail-retry "다시하기"
    └── #btn-fail-menu  "메인으로"
```

**화면 전환 방식**: `.screen { display:none }`, `.screen.active { display:flex }`. `UI.setScreen(name)` 은 모든 `.screen` 에서 `active` 를 빼고 대상에만 넣는다. `#hud` 는 `state === 'PLAYING' || state === 'PAUSED'` 일 때 표시.

`#screen-pause`, `#screen-clear`, `#screen-fail` 은 캔버스를 덮는 반투명 배경(`rgba(0,0,0,0.55)`)을 갖고, `#screen-main`/`#screen-stages` 는 불투명 배경으로 캔버스를 완전히 가린다.

### 13.3 진행 저장

`localStorage[SAVE_KEY]` 에 `{ v: 1, unlocked: 1..10, stars: {스테이지id: 0..3}, best: {스테이지id: 점수} }` 를 JSON 으로. 읽기는 `try/catch` 로 감싸고 실패 시 기본값(`unlocked:1`). 클리어 시 `unlocked = max(unlocked, stageId+1)` (상한 10), `stars`/`best` 는 최대값 갱신.

---

## 14. 정적 자가검증 체크리스트 (= 완료 조건)

구현을 마친 뒤 **파일을 다시 읽으며** 아래를 하나씩 확인하라. 실행은 하지 않는다(할 수도 없다).

### 14.1 구조

- [ ] 파일이 정확히 13개다. 추가 파일 없음.
- [ ] `index.html` 의 `<script>` 태그가 §3.2 순서와 정확히 같고, 총 11개다.
- [ ] 어떤 `.js` 파일에도 `import`, `export`, `require(`, `type="module"` 이 없다.
- [ ] `http://`, `https://`, `cdn`, `unpkg`, `jsdelivr` 문자열이 없다.
- [ ] `package.json`, `node_modules`, 빌드 설정 파일이 없다.
- [ ] 이미지/오디오 바이너리 파일 참조(`.png`, `.mp3`, `.jpg`, `.wav`)가 없다.

### 14.2 전역 참조 정합성

- [ ] 각 파일이 사용하는 전역(`U`,`C`,`MAT`,`BIRD`,`P`,`SB`,`STAGES`,`SFX`,`R`,`INPUT`,`GAME`,`UI`)이 **모두 §3.3 표에 정의된 것**이며, 로드 시점 규칙(§3.3 마지막 문단)을 위반하지 않는다.
- [ ] 오타 점검: 각 전역 객체의 **메서드 이름**을 정의부와 호출부에서 눈으로 1:1 대조했다.

### 14.3 DOM 정합성

- [ ] `index.html` 에 있는 id 목록과, `ui.js`/`main.js` 의 `getElementById` 인자 목록이 **완전히 일치**한다(양방향 누락 없음).
- [ ] `#btn-retry`, `#btn-menu` 의 텍스트가 각각 정확히 `다시하기`, `메인으로` 다.
- [ ] `#btn-pause` 가 `styles.css` 에서 `position:absolute; top:16px; right:16px` 로 우측에 배치된다.
- [ ] 모든 `.screen` 요소에 `active` 토글이 적용되는 경로가 있다.

### 14.4 게임 규칙

- [ ] `STAGES.length === 10` 이고 id 가 1~10 중복 없이 존재한다.
- [ ] 각 스테이지의 돼지 ≥ 1, 새 ≥ 3.
- [ ] §11.4 표의 모든 빌더 호출이 코드에 그대로 있다(좌표 오탈자 대조).
- [ ] §11.3 배치 규칙 4개를 10개 스테이지 전부에 대해 손으로 확인했다.
- [ ] §6.2 전이표 15행 각각에 대응하는 코드가 있다.
- [ ] `GAME.update` 첫 줄에 `state !== 'PLAYING'` 조기 반환이 있다.

### 14.5 물리

- [ ] `P.step` 이 §5.2 의 7단계를 순서대로 수행한다.
- [ ] 충돌 판정 3종(원-원, 원-박스, 박스-박스)이 모두 구현되어 있다.
- [ ] `|rvn| < 60 → e = 0` 처리가 있다.
- [ ] 위치 보정이 임펄스 반복 **이후**에 1회 수행된다.
- [ ] 정적 바디는 `invMass === 0` 이며 적분 대상에서 제외된다.
- [ ] §5.5 검산 4건의 수식이 코드와 일치한다.

### 14.6 보고

- [ ] 완료 보고에 "동작/플레이 가능/테스트 통과" 류의 문장이 **없다**.
- [ ] 확인 불가한 항목을 "미확인"으로 명시했다.

---

## 15. 금지 사항

1. **패키지 설치·빌드·번들·실행·테스트를 시도하지 마라.** 도구가 없다. 시도의 흔적(`package.json` 등)도 남기지 마라.
2. **외부 CDN·네트워크 리소스를 참조하지 마라.** 웹폰트 포함. 폰트는 `system-ui, -apple-system, "Apple SD Gothic Neo", sans-serif` 스택만 쓴다.
3. **ES 모듈 문법 금지.** `file://` 에서 깨진다.
4. **바이너리 에셋 생성 금지.** 모든 그래픽은 Canvas 벡터, 모든 소리는 WebAudio 합성.
5. **§4.2 상수와 §11.4 스테이지 데이터를 임의로 바꾸지 마라.** §4.3·§5.5 검산이 이 값에 묶여 있다.
6. **§13.2 의 id·문구를 바꾸지 마라.** 수용 기준 A4·A5 가 여기에 걸려 있다.
7. **플랜에 없는 기능을 추가하지 마라.** (레벨 에디터, 설정 화면, 업적, 애니메이션 트윈 라이브러리 등)
8. **git 명령을 실행하지 마라.**
9. **README·요약·보고 문서 파일을 만들지 마라.** 보고는 대화 응답으로만 한다.

---

## 16. 오디오 (`src/audio.js`) — 최소 사양

WebAudio 로 짧은 톤만 낸다. 실패해도 게임이 멈추면 안 된다.

- 최초 사용자 입력 시 `AudioContext` 를 lazily 생성(자동재생 정책 회피). 생성 실패 시 `SFX.play` 를 무동작으로 만든다.
- 각 소리 = `OscillatorNode` + `GainNode`(지수 감쇠) 1쌍, 길이 0.08~0.4초.

| 이름 | 파형 | 주파수 | 길이 |
|---|---|---|---|
| `launch` | `triangle` | 220 → 480 상승 | 0.12 |
| `hit` | `square` | 160 | 0.06 |
| `break` | `sawtooth` | 320 → 90 하강 | 0.18 |
| `win` | `sine` | 523 → 659 → 784 (0.1초 간격) | 0.35 |
| `lose` | `sine` | 330 → 220 하강 | 0.4 |

모든 `SFX.play` 호출은 `try/catch` 로 감싼다.

---

## 17. 알려진 한계 (설계상 의도된 것 — 버그로 오해하지 마라)

| 한계 | 원인 | 왜 수용하는가 |
|---|---|---|
| 블록이 **회전하지 않는다**. 넘어지지 않고 미끄러지며 무너진다 | 회전 없는 물리 채택(§2) | 회전 강체는 미검증 환경에서 실패 확률이 훨씬 크다. 슬링샷·파괴·클리어라는 핵심 루프는 온전히 성립한다 |
| 박스-박스 접점이 1개(중심 기준)라 스택이 약간 미끄러질 수 있다 | 접점 클리핑 미구현 | 마찰 + 저속 반발 억제로 실용 수준까지 안정화. 무너지는 것이 게임의 목적이므로 치명적이지 않다 |
| 궤적 예측이 충돌을 고려하지 않는다 | 순수 포물선 샘플링 | 원작도 동일. 구현 비용 대비 이득 없음 |
| 물리 결과가 프레임률에 따라 미세하게 달라질 수 있다 | 고정 스텝 + 잔여 누적 처리 | 재현성은 요구사항이 아님 |
| 스테이지 난이도 밸런스가 미검증이다 | 플레이 테스트 불가 | §4.3 사거리 산술로 "도달 가능"까지만 보장. **밸런스가 좋다고 주장하지 마라** |

---

## 18. 요구사항 → 구현 위치 추적표

| 요구사항 | 구현 위치 |
|---|---|
| stage 10단계 | §11.4 `STAGES`(10) + `GAME.loadStage` + `UI.buildStageGrid` |
| 새총으로 당겨 쏘기 | §9.2 드래그/발사 + §4.2 `SLING_*`, `LAUNCH_POWER` |
| 포물선 궤적 | §5.2 적분(`GRAVITY`) + §9.4 예측 표시 |
| 중력 | `C.GRAVITY = 1300`, §5.2 1단계 |
| 충돌 | §5.3 판정 3종 + §5.4 임펄스 |
| 구조물 파괴 | §5.5 피해 모델 + §10.1 hp/점수 + §12.4 파티클 |
| 목표(돼지) 제거 | §10.3 + §6.4 클리어 판정 |
| 일시정지 버튼이 우측에 | §13.2 `#btn-pause` + §8/styles `right:16px` (수용기준 A4) |
| 일시정지 → 다시하기 / 메인으로 | §13.2 `#screen-pause` 의 `#btn-retry`/`#btn-menu` + §6.2 전이표 (수용기준 A5) |
| 상태 머신 | §6.1~§6.2 |
| 완료 판정 기준 | §1 + §14 |
