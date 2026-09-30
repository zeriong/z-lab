# 구현 계획서 — 웹 브라우저 앵그리버드 (10 스테이지)

> 대상 독자: 이 문서 하나만 보고 파일 읽기·쓰기 도구로 구현하는 구현자.
> 구현자는 **설치·빌드·실행·테스트를 할 수 없다.** 그래서 이 계획은 (1) 외부 의존성 0, (2) 실행 없이 코드를 읽어서 검증할 수 있는 구조, (3) 실제로 돌려 보지 않아도 맞게 짜이도록 모든 수치·공식·좌표를 명시하는 것을 원칙으로 한다.

---

## 0. 결정 요약 (핵심 질문에 대한 답)

| 질문 | 결정 | 이유 |
|---|---|---|
| 물리 엔진 | **직접 구현** (Box2D-Lite 방식: 충격량 순차 솔버 + warm starting + 수면) | 설치·다운로드 불가 → Matter.js를 vendoring할 수 없음. CDN은 오프라인에서 깨지고 API 버전을 확인할 수 없음. 원·박스 두 가지 도형만 필요하므로 ~700줄이면 충분함 |
| 렌더링 | **Canvas 2D** (월드) + **DOM** (메뉴·HUD·오버레이) | Canvas 2D는 의존성이 없고 결과를 예측할 수 있음. 버튼은 DOM이 클릭 판정·접근성·스타일 면에서 확실함 |
| 모듈 방식 | **classic `<script>` 여러 개 + 전역 네임스페이스 `window.AB`**, 파일마다 IIFE로 감쌈 | `index.html`을 더블클릭(file://)으로 열면 ES 모듈이 CORS 때문에 막힘. 빌드 도구도 쓸 수 없음 |
| 스테이지 | JS 데이터 파일 `stages.js`에 10개 객체 배열. 로드는 동기식으로 월드를 새로 만들어서 함 | 비동기 로딩·fetch 없음 (file://에서 fetch가 막힘) |
| 슬링샷 | 새 주변을 포인터로 누르고 → 끌고 → 놓으면 발사. 당긴 거리에 비례하는 속도. 조준 중에는 예측 점선(0.8초분), 직전 발사의 궤적은 흐린 점으로 표시 | 앵그리버드 표준 UX |
| 판정 | 충돌 순간의 접근 속도 × 유효질량으로 피해량을 계산 → HP가 0 이하면 파괴. 돼지를 모두 없애면 클리어, 새를 다 쓰고 월드가 멈췄는데 돼지가 남아 있으면 실패 | 결정적이고 수치로 검증할 수 있음 |
| 상태 머신 | `MAIN → SELECT → PLAYING ⇄ PAUSED → CLEARED/FAILED`, PLAYING 안에 턴 페이즈(`READY/AIMING/FLYING/NEXT_WAIT/FAIL_WAIT/CLEAR_WAIT`) | §8, §9 |
| 일시정지 | 인게임 **우측 상단** DOM 버튼 → 오버레이에 **계속하기 / 다시하기 / 메인으로** | 요구사항 3 |
| 완료 기준 | §14의 정적 자가검증 체크리스트를 모두 통과하고, 사람이 수행할 수동 시나리오 목록을 충족 | 구현자는 실행할 수 없으므로 두 단계로 나눔 |

**범위 밖(하지 않음):** 사운드, 카메라 팬/줌, 외부 이미지·폰트, 레벨 에디터, 온라인 기능, 모바일 전용 레이아웃(단, 포인터 이벤트라서 터치로도 조작 가능).

---

## 1. 작업 환경 제약과 코딩 규칙

1. **산출물 위치:** 이 plan.md와 같은 폴더 아래 `game/` 디렉터리.
   (절대경로: `<FIXTURE>`) 진입점은 `game/index.html`.
2. **외부 리소스 0:** CDN, 웹폰트, 이미지, 오디오 파일을 쓰지 않는다. 모든 그래픽은 Canvas 도형으로 그린다. 네트워크 요청이 하나도 없어야 한다.
3. **스크립트 규칙:**
   - `import`/`export`/`type="module"` 금지.
   - 각 JS 파일 전체를 IIFE로 감싸고 첫 줄에 `'use strict'`를 둔다. 공개할 것만 `window.AB.<이름>`에 붙인다. classic 스크립트들은 전역 렉시컬 스코프를 공유하므로, 최상위 `const`/`let`/`class` 이름이 파일끼리 겹치면 SyntaxError가 난다. IIFE로 감싸면 이 문제가 생기지 않는다.
   - 파일 로드 순서는 §2의 순서를 반드시 지킨다. 다른 파일의 심볼은 **함수가 실행되는 시점**에 `AB.X`로 참조한다. 파일이 로드되는 시점에 참조하는 것은 앞 순서 파일의 것만 허용한다.
   - 문법은 ES2020까지(클래스, 화살표 함수, `Map`, 옵셔널 체이닝 허용). `ctx.roundRect`, `ctx.letterSpacing`, `ctx.filter`, `structuredClone`는 쓰지 않는다(호환성 때문에). 둥근 사각형은 arc/quadraticCurveTo로 직접 그린다.
4. **방어적 코딩:** 벡터 정규화는 길이가 1e-9 미만이면 기본값을 반환한다. `localStorage`는 항상 try/catch로 감싼다. 물리 스텝 뒤에 좌표가 `NaN`/`Infinity`가 된 바디는 제거한다(안전망).
5. **배열 순회 중 삭제 금지:** 삭제할 대상은 모아 두었다가 루프가 끝난 뒤 한꺼번에 처리한다(`filter`로 재구성하거나 역순 루프 사용).
6. **모든 튜닝 수치는 `config.js` 한 곳에 모은다.** 다른 파일에 매직 넘버를 두지 않는다. 사람이 나중에 실행해 보고 튜닝할 수 있게 하기 위해서다.

---

## 2. 파일 구조와 책임

```
game/
├─ index.html      DOM 뼈대, 스크립트 로드
├─ style.css       레이아웃·버튼·오버레이 스타일
└─ js/
   ├─ config.js    AB.CONFIG (모든 상수), AB.MATERIALS, AB.BLOCK_SIZES, AB.PIG_TYPES, AB.BIRD_TYPES, AB.BIRD_MULT
   ├─ math.js      AB.V (2D 벡터 헬퍼), clamp, 회전 등
   ├─ physics.js   AB.Physics: createBody, World(step, addBody, removeBody, wakeBody, …)
   ├─ stages.js    AB.STAGES (10개 스테이지 데이터)
   ├─ storage.js   AB.Storage (진행도 저장/로드)
   ├─ level.js     AB.Level: 한 스테이지의 게임 로직(생성, 피해, 파괴, 폭발, 새, 턴, 점수, 판정)
   ├─ renderer.js  AB.Renderer: Canvas 그리기
   ├─ input.js     AB.Input: 포인터·키보드 → 논리 좌표 → Game/Level 호출
   ├─ ui.js        AB.UI: DOM 화면 전환, HUD 갱신, 스테이지 선택 그리드, 결과 패널
   └─ game.js      AB.Game: 최상위 상태 머신, 화면 스케일링, 메인 루프, 부트스트랩
```

`index.html`의 스크립트 로드 순서: config → math → physics → stages → storage → level → renderer → input → ui → game. 모두 `</body>` 바로 앞에 `defer` 없이 둔다. 부트스트랩은 `game.js` 끝에서 `DOMContentLoaded`(이미 로드된 상태면 즉시)로 `AB.Game.init()`을 호출한다.

예상 분량(참고): physics 600~800줄, level 500~700줄, renderer 400~600줄, 나머지는 각각 50~250줄.

---

## 3. 좌표계·단위·화면 스케일링

### 3.1 월드 좌표 (물리)
- 단위는 **미터**, **y축은 위쪽이 +**, 각도는 라디안이고 **반시계 방향이 +**.
- 지면 윗면은 y = 0. 월드에서 보이는 범위는 x ∈ [0, 32], y ∈ [-2, 16].
- 슬링샷 앵커(새가 대기하는 중심)는 (5.0, 2.9). 구조물은 x ∈ [17, 30] 구간에 둔다.

### 3.2 논리 화면 좌표 (렌더/입력)
- 논리 해상도는 **1280 × 720**이고 y축은 아래쪽이 +.
- `PPM = 40` (1 m = 40 px), `GROUND_SCREEN_Y = 640`.
- 변환은 **딱 두 함수로만** 한다(다른 곳에서 부호를 직접 뒤집지 않는다).
  - worldToScreen(x, y) = (x·PPM, GROUND_SCREEN_Y − y·PPM)
  - screenToWorld(sx, sy) = (sx / PPM, (GROUND_SCREEN_Y − sy) / PPM)
- **회전한 바디 그리기 규칙:** 화면 중심 S(c)로 translate → `rotate(−angle)` → 로컬 좌표 (lx, ly)[m]는 (lx·PPM, −ly·PPM)[px]로 그린다.
  (유도: y 반전 행렬 F에 대해 F·R(θ)·F = R(−θ). 로컬에서 "위쪽"인 요소, 예컨대 돼지 눈은 음수 px y에 그린다.)
- 새총 앵커의 화면 좌표 확인값: (200, 524). 돼지 M(r=0.5)이 (21, 0.5)에 있으면 화면 (840, 620).

### 3.3 창 크기 맞춤
- `#stage-root`(1280×720 고정 CSS px)에 canvas와 모든 DOM UI를 넣는다. 창 크기 변화(`resize`) 때마다 `s = min(innerWidth/1280, innerHeight/720)`로 계산하고 `transform: scale(s)`, `transform-origin: 0 0`을 적용한다. left/top은 `(innerWidth − 1280s)/2`, `(innerHeight − 720s)/2`로 정해 중앙에 레터박스로 배치한다.
- canvas의 CSS 크기는 1280×720으로 고정한다. 백킹 스토어는 `width = round(1280·s·dpr)`, `height = round(720·s·dpr)`(dpr = devicePixelRatio || 1)이다. 매 프레임 렌더를 시작할 때 `setTransform(k,0,0,k,0,0)`, `k = canvas.width/1280`을 적용한 뒤 논리 px로 그린다.
- 포인터 → 논리 좌표: `rect = canvas.getBoundingClientRect()`, `lx = (clientX − rect.left)·1280/rect.width`, `ly = (clientY − rect.top)·720/rect.height`. transform이 걸려 있어도 rect에 반영되므로 이 식이 정확하다.

---

## 4. 물리 엔진 명세 (`physics.js`)

Box2D-Lite(Erin Catto, 2006)의 구조를 그대로 따른다. 아래는 그 구조와 **다른 점**과 **정확한 식**이다. 구현자가 Box2D-Lite를 알고 있다고 가정하지만, 이 절만으로도 구현할 수 있도록 적었다.

### 4.1 수학 규약
- cross(a, b) = a.x·b.y − a.y·b.x (스칼라)
- cross(ω, r) = (−ω·r.y, ω·r.x) (스칼라 × 벡터: 회전에 의한 점 속도)
- R(θ) = [[c, −s], [s, c]]. col1 = (c, s), col2 = (−s, c). Rᵀ·v = (c·vx + s·vy, −s·vx + c·vy)
- 벡터는 `{x, y}` 객체다. 핫루프에서 객체 할당이 좀 생겨도 괜찮다(바디가 60개 미만).

### 4.2 Body 필드
`id`(증가하는 정수), `shape`('circle' | 'box'), `r` 또는 `hw, hh`(반폭·반높이), `pos {x,y}`, `angle`, `vel {x,y}`, `av`(각속도), `mass, invMass, inertia, invI`(= 1/inertia, 식에서는 invI로 표기), `friction`, `restitution`, `isStatic`, `awake`, `sleepTime`, `linDamp`, `angDamp`, `group`(같은 non-null 값이면 서로 충돌하지 않음. 새는 'bird'), `contactCount`(매 스텝 0으로 초기화하고, 활성 접촉이 있을 때 +1), `removed`.
게임 필드(`kind`, `material`, `hp`, `maxHp`, `birdType`, `pigType` 등)도 같은 객체에 붙인다. 물리 코드는 이 필드들을 무시한다.

- 질량: `mass = density × 면적`. 박스 면적 = 4·hw·hh, 원 = π r².
- 관성: 박스 `I = m·((2hw)² + (2hh)²)/12`, 원 `I = m r²/2`.
- 정적 바디: invMass = invI = 0, awake는 의미 없음. 섬(island) 계산에서 제외한다.

### 4.3 World.step(dt) 순서 (dt = 1/120 고정)
1. 모든 바디의 `contactCount = 0`.
2. **충돌 검출:** 모든 쌍 (i<j)에 대해 다음 중 하나면 건너뛴다: 둘 다 정적, `removed`인 바디 포함, group이 같음. AABB를 `CONTACT_MARGIN`만큼 늘려서 겹치지 않으면 기존 아비터를 삭제하고 건너뛴다. 겹치면 좁은 단계 판정(4.4)을 한다. 접촉점이 0개면 아비터를 삭제하고, 1개 이상이면 아비터를 생성하거나 병합(4.5)한 뒤 두 바디의 contactCount를 +1 한다.
   - 잠든 바디끼리의 쌍도 **검출은 한다**(섬 전파에 필요). 풀지 않을 뿐이다.
3. **섬 계산과 깨우기:** 비정적 바디를 대상으로 union-find를 한다. 활성 아비터 가운데 두 바디가 모두 비정적인 쌍을 union한다. 섬 안에 깨어 있는 바디가 하나라도 있으면 섬 전체를 깨운다(새로 깨어난 바디는 `sleepTime = 0`).
4. **힘 적분:** 깨어 있는 동적 바디에 `vel.y += GRAVITY·dt`를 적용하고, 감쇠 `vel *= 1/(1 + dt·linDamp)`, `av *= 1/(1 + dt·angDamp)`를 적용한다.
5. **PreStep:** 두 바디 중 적어도 하나가 깨어 있는 동적 바디인 아비터마다 4.6의 preStep을 수행한다. 여기서 충격 콜백을 호출하고 warm start를 한다.
6. **반복:** `ITERATIONS`(10)회 동안 disabled가 아닌 활성 아비터에 applyImpulse를 한다.
7. **위치 적분:** 깨어 있는 동적 바디에 `pos += vel·dt`, `angle += av·dt`.
8. **안전망:** pos/vel/angle 중 비유한수가 있는 바디는 removed로 표시하고 배열에서 제거한다.
9. **수면 갱신:** 깨어 있는 동적 바디마다 `|vel|² < SLEEP_LIN²`이고 `|av| < SLEEP_ANG`이면 `sleepTime += dt`, 아니면 0으로 되돌린다. 3단계의 섬(접촉이 없는 바디는 단독 섬)마다 모든 구성원의 sleepTime이 `TIME_TO_SLEEP` 이상이면 섬 전체를 재운다(`awake=false`, vel=0, av=0).

외부 API:
- `addBody(body)`: id를 부여하고 배열에 추가한다.
- `removeBody(body)`: removed로 표시하고 배열과 관련 아비터를 제거한다. **스텝 밖에서만 호출한다.**
- `wakeBody(b)`: awake = true, sleepTime = 0.
- `bodies`: 배열, 읽기용.
- `impactHandler`: 함수 또는 null. 4.7에서 설명한다.
- `isQuiet(speed, angSpeed)`: 모든 비정적 바디가 잠들었거나 임계값보다 느리면 true.

### 4.4 좁은 단계 판정 (접촉 생성)
공통 출력은 접촉점 배열(최대 2개)이다. 각 원소는 `{pos(월드), normal(A→B 단위벡터), sep(분리거리: 음수면 관통), Pn:0, Pt:0}`이다. **normal은 항상 A에서 B로 향한다.** 판정은 `sep ≤ CONTACT_MARGIN`인 점만 포함한다(마진 안의 양수 sep는 "추측 접촉").

**원–원** (A 원, B 원): d = pB − pA, dist = |d|, sep = dist − rA − rB. `sep > MARGIN`이면 없음. n = dist > 1e-9 ? d/dist : (0,1). 접촉점 = pA + n·rA.

**원–박스** (원 C, 박스 X):
1. local = Xᵀ·(pC − pX). q = (clamp(local.x, −hw, hw), clamp(local.y, −hh, hh)).
2. 원 중심이 박스 안에 있는 경우(|local.x| ≤ hw 이고 |local.y| ≤ hh): dx = hw − |local.x|, dy = hh − |local.y|. dx < dy면 nLocal = (sign(local.x), 0), 표면점 = (sign·hw, local.y), sep = −(dx + r). 아니면 y축으로 같은 방식을 적용한다. (sign(0)은 +1로 취급)
3. 밖에 있는 경우: d = local − q, dist = |d|, sep = dist − r. `sep > MARGIN`이면 없음. nLocal = d/dist, 표면점 = q.
4. 박스→원 방향 법선은 X_R·nLocal, 접촉점은 pX + X_R·표면점.
5. 쌍 순서가 (A=원, B=박스)면 normal = −(박스→원), (A=박스, B=원)이면 normal = 박스→원.

**박스–박스** (Box2D-Lite `Collide`와 동일하고 마진만 추가):
1. dp = pB − pA, dA = RAᵀ·dp, dB = RBᵀ·dp, C = RAᵀ·RB, absC = 원소별 절댓값, absCᵀ = 그 전치.
2. faceA = |dA| − hA − absC·hB. 성분 중 하나라도 > MARGIN이면 없음.
   faceB = |dB| − absCᵀ·hA − hB. 성분 중 하나라도 > MARGIN이면 없음. (hA = (hwA, hhA))
3. 최적 축 선택 (relTol = 0.95, absTol = 0.01):
   - 초기값: axis = A_X, sep = faceA.x, normal = dA.x > 0 ? RA.col1 : −RA.col1
   - faceA.y > relTol·sep + absTol·hA.y 이면 axis = A_Y, sep = faceA.y, normal = dA.y > 0 ? RA.col2 : −RA.col2
   - faceB.x > relTol·sep + absTol·hB.x 이면 axis = B_X, sep = faceB.x, normal = dB.x > 0 ? RB.col1 : −RB.col1
   - faceB.y > relTol·sep + absTol·hB.y 이면 axis = B_Y, sep = faceB.y, normal = dB.y > 0 ? RB.col2 : −RB.col2
4. 클리핑 평면 설정:
   - A_X: frontN = normal, front = pA·frontN + hA.x, sideN = RA.col2, side = pA·sideN, negSide = −side + hA.y, posSide = side + hA.y. 박스 B에서 incident edge를 구한다.
   - A_Y: frontN = normal, front = pA·frontN + hA.y, sideN = RA.col1, side = pA·sideN, negSide = −side + hA.x, posSide = side + hA.x. 박스 B에서 incident edge를 구한다.
   - B_X: frontN = −normal, front = pB·frontN + hB.x, sideN = RB.col2, side = pB·sideN, negSide = −side + hB.y, posSide = side + hB.y. 박스 A에서 incident edge를 구한다.
   - B_Y: frontN = −normal, front = pB·frontN + hB.y, sideN = RB.col1, side = pB·sideN, negSide = −side + hB.x, posSide = side + hB.x. 박스 A에서 incident edge를 구한다.
5. incident edge (박스 h, pos, R, frontN): n = −(Rᵀ·frontN), nAbs = |n|.
   - nAbs.x > nAbs.y: n.x > 0이면 (h.x, −h.y),(h.x, h.y), 아니면 (−h.x, h.y),(−h.x, −h.y)
   - 그 외: n.y > 0이면 (h.x, h.y),(−h.x, h.y), 아니면 (−h.x, −h.y),(h.x, −h.y)
   - 두 점을 pos + R·v로 월드 좌표로 바꾼다.
6. 선분 클리핑 clip(v0, v1, n, offset): d0 = n·v0 − offset, d1 = n·v1 − offset. d0 ≤ 0이면 v0 유지, d1 ≤ 0이면 v1 유지. d0·d1 < 0이면 교점 v0 + (d0/(d0 − d1))·(v1 − v0)을 추가한다. 먼저 (−sideN, negSide)로 자르고, 그 결과를 (sideN, posSide)로 자른다. 어느 단계에서든 점이 2개 미만이면 접촉 없음.
7. 남은 각 점 v에 대해 s = frontN·v − front. `s ≤ MARGIN`이면 접촉 {sep: s, normal: normal, pos: v − s·frontN}.

**손 검증 예시 (구현한 뒤 코드를 따라가며 확인):** A = 지면(정적 박스, 중심 (16,−1), h=(30,1)), B = 기둥(중심 (20,1), h=(0.15,1), 각도 0).
dA = (4, 2) → faceA = (4−30−0.15, 2−1−1) = (−26.15, 0). faceB도 같다. 축은 A_X(−26.15)에서 시작해 faceA.y = 0 > 0.95·(−26.15)+0.01 이므로 A_Y로 바뀐다. faceB.x는 조건 불충족, faceB.y = 0 > 0.95·0 + 0.01·1 = 0.01도 불충족 → **A_Y, normal (0,1)**. incident edge는 기둥 밑변 (20.15,0),(19.85,0)이고 둘 다 클리핑을 통과하며 sep = 0이다. **접촉 2개, 법선 위쪽.**
원–박스 예시: 돼지 S(r 0.35, 중심 (21, 2.65))가 들보(중심 (21, 2.15), h=(1.5, 0.15)) 위에 있을 때 local = (0, 0.5), q = (0, 0.15), dist = 0.35, sep = 0, 박스→원 = (0,1).

### 4.5 아비터 (접촉 지속과 warm start)
- `Map`의 키는 `minId + ':' + maxId`. 아비터에는 bodyA/bodyB, contacts, friction = √(fA·fB), restitution = max(eA, eB), disabled를 둔다.
- 병합: 새 접촉마다 기존 접촉 중 월드 좌표 거리가 가장 가깝고 `WARM_MATCH_DIST`(0.05 m) 이내인 것을 찾는다(기존 접촉 하나는 한 번만 매칭). 찾으면 Pn, Pt를 복사하고, 못 찾으면 0이다. 그 뒤 contacts를 새 배열로 교체한다.
- 쌍 순서: 아비터와 충돌 함수 호출 모두 **id가 작은 쪽을 A**로 고정한다. bodies 배열은 추가한 순서를 유지하므로(제거는 filter로 함) i<j면 id도 작다.

### 4.6 솔버
**preStep(arb, dt):** 각 접촉 c에 대해
- rA = c.pos − A.pos, rB = c.pos − B.pos, n = c.normal, t = (n.y, −n.x)
- kN = A.invMass + B.invMass + A.invI·cross(rA,n)² + B.invI·cross(rB,n)², `c.massN = 1/kN` (kT도 t로 같은 방식으로 구해 `c.massT`)
- 상대속도 dv = (vB + cross(ωB, rB)) − (vA + cross(ωA, rA)), vn = dv·n
- `reach = (c.sep ≤ −vn·dt)` (이번 스텝 안에 실제로 닿는지)
- 바이어스:
  - c.sep > 0 (추측 접촉): c.bias = −c.sep/dt (그 틈만큼은 다가오는 것을 허용)
  - c.sep ≤ 0: c.bias = min(MAX_CORRECTION_VEL, BAUMGARTE/dt · max(0, −c.sep − SLOP))
  - 반발: vn < −RESTITUTION_THRESHOLD 이고 reach면 c.bias = max(c.bias, −e·vn)
- 충격 추적: reach이고 −vn > maxApproach면 maxApproach = −vn

모든 접촉을 처리한 뒤: `maxApproach > 0`이고 `impactHandler`가 있으면 `arb.disabled = impactHandler(A, B, maxApproach, mEff)`. 여기서 mEff = 1/(A.invMass + B.invMass)이다. disabled면 모든 접촉의 Pn = Pt = 0으로 두고 warm start를 건너뛴다.
disabled가 아니면 warm start를 한다: P = c.Pn·n + c.Pt·t, A.vel −= A.invMass·P, A.av −= A.invI·cross(rA,P), B.vel += B.invMass·P, B.av += B.invI·cross(rB,P).

**applyImpulse(arb):** 각 접촉에 대해
- dv를 다시 계산하고 vn = dv·n. dPn = massN·(−vn + bias). Pn0 = c.Pn, c.Pn = max(Pn0 + dPn, 0), dPn = c.Pn − Pn0. P = dPn·n을 적용한다(A에서 빼고 B에 더함).
- dv를 다시 계산하고 vt = dv·t. dPt = massT·(−vt). maxPt = friction·c.Pn. c.Pt = clamp(Pt0 + dPt, −maxPt, maxPt), 차분만큼 적용한다.

**손 검증:** 지면 위에 기둥 하나가 있을 때 중력 적분 후 vy = −0.0833. 두 접촉의 vn은 −0.0833, bias는 0이다. 반복이 끝나면 vy ≈ 0이 된다. 부호가 반대로 나오면 normal 방향이나 A/B 적용 부호가 틀린 것이다.

### 4.7 충격 콜백 계약
`impactHandler(A, B, approachSpeed, effMass) → boolean`
- 물리 엔진은 피해를 알지 못한다. Level이 이 콜백으로 피해를 계산한다(§6.1).
- true를 반환하면 이번 스텝에서 그 아비터를 풀지 않는다. 즉 부서지는 물체를 새가 뚫고 지나가는 연출이 된다.
- 콜백 안에서 바디를 삭제하면 안 된다. `hp`를 줄이고 파괴 표시(`dead = true`)만 한다.

### 4.8 물리 상수 (config.js)
| 이름 | 값 | 비고 |
|---|---|---|
| FIXED_DT | 1/120 | 고정 스텝 |
| MAX_STEPS_PER_FRAME | 8 | 넘치면 누적 시간을 버림 |
| MAX_FRAME_DT | 0.1 s | 탭 전환 등으로 생긴 큰 dt를 자름 |
| GRAVITY | −10 m/s² | |
| ITERATIONS | 10 | |
| BAUMGARTE | 0.2 | |
| SLOP | 0.01 m | |
| MAX_CORRECTION_VEL | 4 m/s | |
| CONTACT_MARGIN | 0.02 m | |
| RESTITUTION_THRESHOLD | 1.0 m/s | |
| WARM_MATCH_DIST | 0.05 m | |
| SLEEP_LIN / SLEEP_ANG | 0.08 m/s / 0.12 rad/s | |
| TIME_TO_SLEEP | 0.5 s | |

**터널링 확인:** 최고 속도인 노랑 새 가속 26 m/s는 스텝당 0.217 m 이동한다. 가장 얇은 블록 반두께 0.15 + 가장 작은 새 반지름 0.25 = 0.4 > 0.217이므로 뚫고 지나가지 않는다.

---

## 5. 게임 엔티티 정의 (`config.js`)

### 5.1 재질
| 재질 | density | friction | restitution | baseHp | 파괴 점수 | 색(채움/테두리) |
|---|---|---|---|---|---|---|
| glass (유리/얼음) | 2.5 | 0.4 | 0.05 | 8 | 300 | `rgba(190,233,255,0.75)` / `#6fb7d8` |
| wood (나무) | 5 | 0.7 | 0.1 | 20 | 500 | `#c8894b` / `#7a4f24` |
| stone (돌) | 12 | 0.8 | 0.05 | 60 | 800 | `#9ea4a8` / `#5f666b` |
| tnt | 4 | 0.6 | 0.1 | **5 고정** | 1000 | `#d9432f` / `#7a1d12`, 흰 글씨 "TNT" |
| ground/rock (정적) | — | 0.9 | 0.1 | ∞ | — | 지면: 잔디 `#5fa83a`, 흙 `#8a6642` / 바위 `#7c6f64`, `#4e453d` |

블록 HP = `baseHp × max(0.5, 면적/0.6)` (tnt 제외). 블록 감쇠는 linDamp 0.02, angDamp 0.1.

### 5.2 블록 크기 코드 (w × h, 단위 m)
| 코드 | w | h | 용도 |
|---|---|---|---|
| P2 | 0.3 | 2.0 | 세로 기둥 |
| P1 | 0.3 | 1.2 | 짧은 기둥 |
| B3 | 3.0 | 0.3 | 긴 들보 |
| B2 | 2.0 | 0.3 | 들보 |
| C1 | 1.0 | 1.0 | 큰 상자 |
| C06 | 0.6 | 0.6 | 작은 상자 |
| TNT | 0.8 | 0.8 | 재질이 항상 tnt |

### 5.3 돼지
| 코드 | r | density | hp | friction | restitution | linDamp / angDamp |
|---|---|---|---|---|---|---|
| S | 0.35 | 4 | 8 | 0.6 | 0.2 | 0.05 / 0.8 |
| M | 0.5 | 4 | 15 | 0.6 | 0.2 | 0.05 / 0.8 |
| L | 0.7 | 4 | 28 | 0.6 | 0.2 | 0.05 / 0.8 |

### 5.4 새
| 타입 | 한글명 | r | density | 색 | 능력 (비행 중 탭/클릭/Space) |
|---|---|---|---|---|---|
| red | 빨강 새 | 0.35 | 12 | `#e53935` | 없음 |
| blue | 파랑 새 | 0.25 | 12 | `#42a5f5` | **분열:** 첫 충돌 전에 1회. 현재 새는 그대로 두고, 속도 벡터를 ±0.25 rad 회전한 새 2마리를 위치 ±(속도에 수직인 단위벡터 × 0.35)에 생성 |
| yellow | 노랑 새 | 0.35 | 10 | `#fdd835` | **가속:** 첫 충돌 전에 1회. 현재 진행 방향으로 속력을 26 m/s로 설정 |
| black | 폭탄 새 | 0.45 | 12 | `#333333` | **폭발:** 발사 후 언제든 1회. 첫 충돌 뒤 1.5초가 지나면 자동 폭발(반경 3.0, 충격량 60, 피해 90). 폭발하면 새는 제거 |

새의 공통 속성: friction 0.5, restitution 0.3, group 'bird'(새끼리는 충돌하지 않음). 비행 중(첫 충돌 전)에는 **linDamp = angDamp = 0**이어야 궤적 예측과 일치한다. 첫 충돌이 일어나면 linDamp 0.3, angDamp 1.5로 바꿔서 굴러다니다 빨리 멈추게 한다.

### 5.5 새 타입별 재질 피해 배율 (AB.BIRD_MULT)
| | glass | wood | stone | tnt | pig |
|---|---|---|---|---|---|
| red | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| blue | 2.5 | 0.6 | 0.4 | 1.0 | 1.0 |
| yellow | 1.0 | 2.0 | 0.6 | 1.0 | 1.0 |
| black | 1.0 | 1.0 | 1.3 | 1.0 | 1.0 |

---

## 6. 피해·파괴·폭발·점수 규칙 (`level.js`)

### 6.1 충돌 피해 (impactHandler 구현)
1. `approach < DAMAGE_MIN_SPEED(1.0)`이면 false를 반환한다.
2. 기본 피해 `dmg = DAMAGE_K(1.0) × effMass × (approach − DAMAGE_MIN_SPEED)`.
3. 각 바디 X에 대해(상대 바디를 O라 할 때): X가 파괴 가능(블록/돼지/tnt, 정적 아님, dead 아님)하면 `d = dmg × 배율`을 적용한다. 배율은 O가 새면 BIRD_MULT[O.birdType][X의 재질 또는 'pig'], 아니면 1이다. `d ≥ MIN_DAMAGE(0.5)`면 X.hp −= d. X.hp ≤ 0이면 X.dead = true로 두고 파괴 큐에 넣는다.
4. 이번 호출에서 어느 쪽이든 dead가 되었으면, 상대가 살아 있는 동적 바디일 때 그 속도에 `BREAK_SLOWDOWN(0.75)`을 곱하고 **true**를 반환한다(뚫고 지나감). 이미 dead인 바디가 들어오면 피해 없이 true를 반환한다.
5. 새·지면·바위는 피해를 받지 않는다.

**수치 확인 (설계 의도):**
- 빨강 새(4.62 kg)가 15 m/s로 나무 기둥 P2(3.0 kg)에 맞으면 mEff 1.82 × 14 = 25.5 > HP 20이라 파괴된다. 돌 기둥 P2(7.2 kg)는 39 < 60이라 버틴다.
- 유리 P2(1.5 kg)는 빨강 새 약 8 m/s 이상에서 깨진다.
- 돼지가 지면으로 2.3 m 이상 떨어지면(약 6.8 m/s) S/M/L 모두 죽고, 1 m 낙하는 모두 버틴다.

### 6.2 파괴 처리 (스텝 뒤, 스텝 밖)
큐를 비울 때까지 반복한다:
- `world.removeBody(b)`, 점수 추가(블록은 재질 점수, 돼지는 5000), 점수 팝업, 파편 파티클 8개(재질 색), 돼지는 초록 연기 원 6개.
- b의 AABB를 0.15 m 늘린 범위와 겹치는 비정적 바디를 `wakeBody`한다.
- 돼지면 `pigsAlive −= 1`.
- tnt면 폭발 큐에 추가한다(반경 2.5, 충격량 45, 피해 70).
- 폭발 큐를 처리하는 중에 새 dead가 생기면 다시 파괴 큐로 들어간다. 연쇄가 끝날 때까지 while 루프를 돈다. **재귀를 쓰지 않는다.** tnt는 한 번만 터진다(dead 플래그가 있으므로).

### 6.3 폭발 (center, R, impulse, damage)
제거되지 않은 비정적 바디 각각에 대해: d = |b.pos − center|. d < R이면 f = 1 − d/R, dir = normalize(b.pos − center)(0이면 (0,1)).
- `wakeBody(b)`, `b.vel += dir × impulse × f × b.invMass`, `b.av += −sign(dir.x) × 3 × f`.
- 파괴 가능한 바디면 hp −= damage × f(배율 없음). 0 이하면 파괴 큐에 넣는다.
- 새(group 'bird')에는 충격량만 주고 피해는 주지 않는다.
- 연출: 링 파티클(0.35초 동안 반경 0→R, 알파 1→0) + 주황/노랑 파편 14개.

### 6.4 월드 경계
스텝마다 비정적 바디가 x < −5, x > 40, y < −5 중 하나를 만족하면 제거한다. 돼지는 처치로 처리(점수 포함)하고, 블록은 점수 없이 제거한다. 위쪽 경계는 없다(떨어져 돌아온다).

### 6.5 점수와 별
- 돼지 5000, 블록은 재질 점수(§5.1), **클리어 시 남은 새 1마리당 10000**.
- 스테이지를 로드할 때 계산한다: P = 돼지 수 × 5000, B = 모든 블록(tnt 포함) 점수 합.
  - ★1: 클리어
  - ★2: 점수 ≥ floor100(P + 0.2·B + 10000)
  - ★3: 점수 ≥ floor100(P + 0.45·B + 20000)
  - (floor100 = 100 단위 내림)

---

## 7. 슬링샷 입력과 궤적 예측

### 7.1 상수
SLING_ANCHOR (5.0, 2.9), GRAB_RADIUS 1.5 m, MAX_PULL 2.2 m, MIN_PULL 0.45 m, MAX_LAUNCH_SPEED 20 m/s, PREVIEW_TIME 0.8 s, PREVIEW_SAMPLE 5스텝마다 점 1개.

### 7.2 흐름
1. **READY:** 새가 앵커에 있다(아직 물리 바디가 아니라 렌더링만 함). 포인터를 누른 위치가 앵커에서 GRAB_RADIUS 안이면 → **AIMING**. canvas에 `setPointerCapture`를 건다.
2. **AIMING (pointermove):** pull = 포인터월드 − 앵커. |pull| > MAX_PULL이면 MAX_PULL로 줄인다. 새 위치 = 앵커 + pull이고, 새 위치의 y는 (r + 0.05) 이상으로 제한한다(제한한 뒤 pull을 다시 계산).
3. **발사 (pointerup):** |pull| < MIN_PULL이면 취소하고 READY로 돌아가 새를 앵커로 되돌린다. 아니면 속도 v = −(pull / MAX_PULL) × MAX_LAUNCH_SPEED로 새 바디를 **현재 당긴 위치에** 생성한다(awake, 비행 중 감쇠 0). 페이즈는 **FLYING**이 된다. 직전 궤적 기록을 비우고 새로 기록을 시작한다.
4. `pointercancel`, 일시정지, 페이즈 강제 전환(돼지 전멸 등)이 일어나면 조준을 취소한다.

### 7.3 궤적 예측 (AIMING 중 매 프레임)
물리와 **같은 적분기**로 시뮬레이션한다: p = 발사 위치, v = 발사 속도. 0.8초 ÷ FIXED_DT = 96스텝 동안 v.y += GRAVITY·dt; p += v·dt를 반복하고, 5스텝마다 점을 기록한다. y < 0이거나 x > 32이면 멈춘다. 점은 흰색이고, 반지름은 앞쪽 5px에서 뒤쪽 2px로 줄어들며 알파도 1에서 0.3으로 줄어든다. 충돌은 예측하지 않는다.

### 7.4 직전 궤적 표시
FLYING 동안 주 새(분열 전 원본)의 위치를 0.04초마다 기록한다(최대 250점). 다음 발사 전까지 반지름 2px, 알파 0.45의 흰 점으로 표시한다.

### 7.5 능력 발동
FLYING 중 canvas `pointerdown`이나 Space 키가 들어오면, 현재 주 새의 능력이 사용 가능한지 확인하고 발동한다(§5.4의 조건). 발동은 턴당 1회다.

---

## 8. 턴 진행과 클리어/실패 판정 (Level 내부 페이즈)

### 8.1 Level 상태 필드
`stageIndex`, `world`, `pigs[]`, `pigsAlive`, `birdQueue[]`(아직 올리지 않은 타입 목록), `slingBird`(타입 또는 null), `activeBirds[]`(발사된 새 바디), `mainBird`, `score`, `phase`, `phaseTimer`, `quietTimer`, `trail[]`, `lastTrail[]`, `particles[]`, `popups[]`, `destroyQueue[]`, `explosionQueue[]`, `outcome`(null | {cleared, score, bonus, stars, newBest}), `shotsFired`.

### 8.2 생성 (new Level(stageIndex))
1. 새 World를 만든다. 정적 지면: 중심 (16, −1), hw 30, hh 1(윗면 y=0, x −14~46).
2. 스테이지 데이터의 statics를 정적 박스로 만든다. 중심 = (x, b + h/2), kind 'rock'.
3. blocks: 크기 코드 → w, h. 중심 = (x, b + h/2), 각도 0. 재질 속성을 적용하고 kind는 'block'(TNT면 'tnt'). **awake=false, sleepTime=TIME_TO_SLEEP**(시작할 때 잠든 상태 → 누가 건드리기 전까지 구조물이 절대 무너지지 않음).
4. pigs: 중심 = (x, b + r). 역시 잠든 상태로 시작한다. kind 'pig'.
5. birdQueue = 스테이지의 birds 사본. 첫 번째를 꺼내 slingBird로 올리고 phase는 READY.
6. `world.impactHandler`를 연결하고 별 기준을 계산한다.

### 8.3 update(dt) 순서 (고정 스텝마다)
1. `world.step(dt)`
2. 파괴/폭발 큐 처리(§6.2), 월드 경계 처리(§6.4)
3. 새 갱신: 각 활성 새마다
   - `contactCount > 0`이면 `hasCollided = true`로 두고, 처음이면 감쇠값을 바꾼다. 폭탄 새면 퓨즈 타이머를 시작한다.
   - 폭탄 새 퓨즈가 끝나면 폭발시킨다.
   - 제거 조건: (a) 월드 경계 밖, (b) hasCollided이고 속력 < 0.25 및 |av| < 0.5 상태가 1.0초 지속(또는 잠듦), (c) 발사 후 9초 경과, (d) 폭발함. 제거할 때 작은 연기 파티클을 만든다.
4. 파티클·팝업 갱신(수명 감소, 파티클은 중력 적용·충돌 없음)
5. 페이즈 로직 (아래 표). 단, 모든 페이즈보다 먼저 **pigsAlive == 0이고 phase ≠ CLEAR_WAIT이면 → 조준을 취소하고 CLEAR_WAIT(타이머 0)**.

| 페이즈 | 동작 / 전이 |
|---|---|
| READY | 입력 대기 → AIMING |
| AIMING | 드래그 → 발사하면 FLYING, 취소하면 READY |
| FLYING | 활성 새가 0마리가 되면: 큐가 남아 있으면 NEXT_WAIT(0.8초), 없으면 FAIL_WAIT |
| NEXT_WAIT | 타이머가 끝나면 큐에서 하나 꺼내 slingBird로 올림 → READY |
| FAIL_WAIT | `world.isQuiet(0.15, 0.3)`인 상태가 1.0초 지속되거나 진입 후 6초 경과 → **outcome = 실패** |
| CLEAR_WAIT | 1.5초 동안 물리는 계속 돌리고 입력은 받지 않음. 끝나면 보너스 = (birdQueue.length + (slingBird ? 1 : 0)) × 10000을 점수에 더하고, 별 계산 → **outcome = 클리어** |

- 활성 새가 날아가는 도중에도 다음 새를 발사할 수는 없다(턴 단위 진행).
- `outcome`이 정해지면 Game이 그 스텝 직후 감지해서 상태를 전환한다(§9).

---

## 9. 전체 상태 머신과 UI

### 9.1 Game 상태
| 상태 | 보이는 것 | 들어오는 경로 | 나가는 경로 |
|---|---|---|---|
| MAIN | `#screen-main` + canvas 배경 | 부팅, "메인으로" | 게임 시작 → PLAYING(스테이지 = 클리어하지 않은 첫 해금 스테이지, 모두 클리어했으면 1), 스테이지 선택 → SELECT |
| SELECT | `#screen-select` | MAIN | 해금된 스테이지 클릭 → PLAYING, 뒤로 → MAIN |
| PLAYING | canvas + `#hud`(일시정지 버튼 포함) | 스테이지 시작, 계속하기 | 일시정지 버튼/Esc/P/탭 숨김 → PAUSED, outcome 클리어 → CLEARED, outcome 실패 → FAILED |
| PAUSED | 멈춘 장면 + `#overlay-pause` | PLAYING | 계속하기/일시정지 버튼/Esc/P → PLAYING, **다시하기** → 같은 스테이지 새로 로드 → PLAYING, **메인으로** → Level 폐기 → MAIN |
| CLEARED | 멈춘 장면 + `#overlay-result`(클리어) | PLAYING | 다음 스테이지(10단계가 아닐 때) → PLAYING(n+1), 다시하기 → PLAYING(n), 메인으로 → MAIN |
| FAILED | `#overlay-result`(실패 모드) | PLAYING | 다시하기, 메인으로 |

- PAUSED에서는 Level.update를 호출하지 않고 렌더만 한다. PLAYING으로 돌아올 때는 누적 시간을 0으로 초기화한다.
- CLEARED/FAILED에서도 물리는 멈춘다(update를 호출하지 않음).
- 스테이지를 시작(다시하기 포함)할 때는 항상 `new Level(i)`로 새로 만든다. 이전 Level에 대한 참조는 모두 버린다.
- 일시정지 버튼은 PLAYING/PAUSED에서만 보이고, CLEARED/FAILED/MAIN/SELECT에서는 숨긴다.
- `document.visibilitychange`로 탭이 숨겨졌는데 PLAYING이면 자동으로 PAUSED로 전환한다.
- 클리어하면 저장(§12): 0-base 인덱스 i 스테이지를 클리어하면 `unlocked = min(10, max(unlocked, i + 2))`로 갱신한다(unlocked는 해금된 스테이지 수이고 1-base). `best[i]`, `stars[i]`는 기존 값과 비교해 큰 값으로 갱신한다.

### 9.2 메인 루프 (game.js)
`requestAnimationFrame(loop)`: frameDt = min((now − last)/1000, MAX_FRAME_DT). 첫 프레임은 0이다. PLAYING이면 acc += frameDt를 하고, `acc ≥ FIXED_DT`이며 스텝 수 < 8인 동안 level.update(FIXED_DT)를 반복한다. 스텝 수 한도에 걸리면 acc = 0. 매 스텝 뒤 outcome을 확인한다. 이어서 renderer.render(game)을 호출하고 UI.updateHUD(level)을 호출한다(값이 바뀌었을 때만 textContent 갱신).

### 9.3 DOM 구조 (index.html) — id를 JS와 정확히 일치시킬 것
- `#stage-root`
  - `canvas#game-canvas` (CSS `touch-action: none`)
  - `#hud` (컨테이너는 `pointer-events: none`, 버튼만 `auto`)
    - `#hud-stage` 왼쪽 위: "스테이지 3 · 파랑 새 등장"
    - `#hud-score` 왼쪽 위 둘째 줄: "점수 12,340" (천 단위 콤마)
    - `#hud-best` 셋째 줄: "최고 20,000"
    - `#hud-hint` 아래쪽 중앙: 안내 문구(비어 있으면 숨김)
    - `button#btn-pause` **오른쪽 위**(`top: 20px; right: 20px; 64×64`), 표시 "❚❚", `aria-label="일시정지"`
  - `#screen-main`: 제목 "앵그리 버드", 부제 "새총으로 돼지를 물리쳐라!", `button#btn-start` "게임 시작", `button#btn-select` "스테이지 선택", `#main-progress` "클리어 3 / 10"
  - `#screen-select`: 제목 "스테이지 선택", `#stage-grid`(JS가 버튼 10개를 5열 × 2행으로 생성), `button#btn-back` "뒤로"
  - `#overlay-pause`: 반투명 배경 + 패널: 제목 "일시정지", `button#btn-resume` "계속하기", `button#btn-retry-pause` "다시하기", `button#btn-main-pause` "메인으로"
  - `#overlay-result`: 패널: `#result-title`("스테이지 클리어!" / "실패…" / 10단계 클리어면 "모든 스테이지 클리어!"), `#result-stars`(★ 3개, 획득한 별은 금색 `#ffc107`, 나머지는 회색), `#result-score`, `#result-bonus`("새 보너스 +20,000", 실패면 숨김), `#result-best`("최고 기록 …", 신기록이면 "신기록!" 표시), `button#btn-next` "다음 스테이지"(실패이거나 10단계면 숨김), `button#btn-retry-result` "다시하기", `button#btn-main-result` "메인으로"
- 숨김은 `.hidden { display: none !important; }` 클래스 하나로 통일한다.
- 스테이지 버튼 내용: 큰 번호, 작은 이름, 별 "★★☆". 잠긴 스테이지는 `disabled`, 자물쇠 🔒, 흐린 스타일.
- 폰트: `"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`. 버튼은 둥근 모서리, 두꺼운 테두리, 주황–노랑 그라데이션, hover/active 시 살짝 확대.
- `body`: margin 0, overflow hidden, 배경 `#1b1b1b`, `user-select: none`, `-webkit-tap-highlight-color: transparent`.

### 9.4 안내 문구 (`#hud-hint`)
- 1단계에서 첫 발사 전 READY/AIMING일 때: "새를 뒤로 끌어당겼다 놓아서 발사하세요!"
- 슬링의 새가 특수 새면 READY/AIMING일 때: 파랑 "파랑 새: 비행 중 화면을 누르면 3마리로 분열", 노랑 "노랑 새: 비행 중 화면을 누르면 가속", 폭탄 "폭탄 새: 비행 중 화면을 누르면 폭발 (충돌 1.5초 후 자동 폭발)".
- 그 외에는 빈 문자열.

### 9.5 입력 (input.js)
- canvas의 pointerdown/move/up/cancel → 논리 px → 월드 좌표 → PLAYING일 때만 `level.pointerDown/Move/Up/Cancel` 호출.
- keydown: Escape 또는 P → PLAYING/PAUSED에서 일시정지 토글. Space → PLAYING에서 `level.activateAbility()` (preventDefault).
- DOM 버튼 클릭은 ui.js가 Game 메서드에 연결한다: `startGame, openSelect, startStage(i), pause, resume, retry, toMain, nextStage`.

---

## 10. 스테이지 데이터

### 10.1 형식 (`AB.STAGES`, 인덱스 0~9)
각 스테이지 객체의 필드: `name`(문자열), `birds`(타입 문자열 배열, 발사 순서), `statics`(배열: x, b, w, h), `blocks`(배열: m=재질, s=크기 코드, x, b), `pigs`(배열: s=S|M|L, x, b, 선택: king=true).
- **x = 중심 x, b = 바닥면 y.** 로더가 중심 y를 계산한다(블록 b + h/2, 돼지 b + r). 이렇게 하면 쌓기 계산이 "아래 물체의 윗면 = 위 물체의 b"라는 덧셈 하나로 끝난다.
- TNT는 blocks에 `m: 'tnt', s: 'TNT'`로 적는다.
- 아래 표의 모든 좌표는 겹침 여부와 지지 여부를 손으로 검산한 값이다. **그대로 옮겨 적는다.** 임의로 바꾸지 않는다.

### 10.2 스테이지 목록
표에서 "top"은 확인용 윗면 높이다(데이터에는 넣지 않음).

**1. 첫 비행** — birds: red, red, red
| 종류 | 재질/코드 | x | b | (top) |
|---|---|---|---|---|
| block | wood P2 | 20 | 0 | 2.0 |
| block | wood P2 | 22 | 0 | 2.0 |
| block | wood B3 | 21 | 2.0 | 2.3 |
| pig | M | 21 | 0 | 1.0 |
| pig | S | 21 | 2.3 | 3.0 |

**2. 유리 조심** — birds: red, red, red
| 종류 | 재질/코드 | x | b | (top) |
|---|---|---|---|---|
| block | glass P2 | 18 | 0 | 2.0 |
| block | glass P2 | 20 | 0 | 2.0 |
| block | wood B3 | 19 | 2.0 | 2.3 |
| pig | S | 19 | 0 | 0.7 |
| pig | S | 19 | 2.3 | 3.0 |
| block | glass P2 | 24 | 0 | 2.0 |
| block | glass P2 | 26 | 0 | 2.0 |
| block | wood B3 | 25 | 2.0 | 2.3 |
| pig | M | 25 | 2.3 | 3.3 |

**3. 파랑 새 등장** — birds: blue, blue, red
| 종류 | 재질/코드 | x | b | (top) |
|---|---|---|---|---|
| block | glass P2 | 20 | 0 | 2.0 |
| block | glass P2 | 22 | 0 | 2.0 |
| block | wood B3 | 21 | 2.0 | 2.3 |
| block | glass P1 | 20 | 2.3 | 3.5 |
| block | glass P1 | 22 | 2.3 | 3.5 |
| block | wood B3 | 21 | 3.5 | 3.8 |
| pig | M | 21 | 0 | 1.0 |
| pig | S | 21 | 2.3 | 3.0 |
| pig | S | 21 | 3.8 | 4.5 |
| block | glass C06 | 24.5 | 0 | 0.6 |
| pig | S | 24.5 | 0.6 | 1.3 |

**4. 노랑 새 등장** — birds: yellow, yellow, red
| 종류 | 재질/코드 | x | b | (top) |
|---|---|---|---|---|
| block | wood C1 | 17.5 | 0 | 1.0 |
| block | wood C1 | 17.5 | 1.0 | 2.0 |
| block | wood P2 | 19.8 | 0 | 2.0 |
| block | wood P2 | 22.2 | 0 | 2.0 |
| block | wood B3 | 21 | 2.0 | 2.3 |
| block | wood P2 | 19.8 | 2.3 | 4.3 |
| block | wood P2 | 22.2 | 2.3 | 4.3 |
| block | wood B3 | 21 | 4.3 | 4.6 |
| pig | M | 21 | 0 | 1.0 |
| pig | M | 21 | 2.3 | 3.3 |
| pig | S | 21 | 4.6 | 5.3 |

**5. 쌍둥이 언덕** — birds: red, blue, yellow, red
| 종류 | 재질/코드 | x | b | (top) |
|---|---|---|---|---|
| static | 바위 w3 h1.5 | 19 | 0 | 1.5 |
| static | 바위 w3 h3.0 | 26 | 0 | 3.0 |
| block | glass P2 | 18.2 | 1.5 | 3.5 |
| block | glass P2 | 19.8 | 1.5 | 3.5 |
| block | wood B2 | 19 | 3.5 | 3.8 |
| pig | S | 19 | 1.5 | 2.2 |
| pig | M | 19 | 3.8 | 4.8 |
| block | wood P2 | 25.2 | 3.0 | 5.0 |
| block | wood P2 | 26.8 | 3.0 | 5.0 |
| block | glass B2 | 26 | 5.0 | 5.3 |
| pig | M | 26 | 3.0 | 4.0 |
| pig | S | 26 | 5.3 | 6.0 |

**6. 돌 요새** — birds: black, red, black, red
| 종류 | 재질/코드 | x | b | (top) |
|---|---|---|---|---|
| block | stone P2 | 19.8 | 0 | 2.0 |
| block | stone P2 | 22.2 | 0 | 2.0 |
| block | stone B3 | 21 | 2.0 | 2.3 |
| pig | L | 21 | 0 | 1.4 |
| block | wood C1 | 19.9 | 2.3 | 3.3 |
| block | wood C1 | 22.1 | 2.3 | 3.3 |
| pig | S | 21 | 2.3 | 3.0 |
| block | stone B3 | 21 | 3.3 | 3.6 |
| pig | M | 21 | 3.6 | 4.6 |
| block | stone C1 | 26 | 0 | 1.0 |
| block | stone C1 | 26 | 1.0 | 2.0 |
| pig | M | 26 | 2.0 | 3.0 |

**7. TNT 창고** — birds: red, yellow, red
| 종류 | 재질/코드 | x | b | (top) |
|---|---|---|---|---|
| block | wood P2 | 19.8 | 0 | 2.0 |
| block | wood P2 | 22.2 | 0 | 2.0 |
| block | tnt TNT | 21 | 0 | 0.8 |
| pig | S | 21 | 0.8 | 1.5 |
| block | stone B3 | 21 | 2.0 | 2.3 |
| block | glass P1 | 20 | 2.3 | 3.5 |
| block | glass P1 | 22 | 2.3 | 3.5 |
| block | wood B3 | 21 | 3.5 | 3.8 |
| pig | M | 21 | 2.3 | 3.3 |
| pig | S | 21 | 3.8 | 4.5 |
| block | tnt TNT | 25 | 0 | 0.8 |
| block | wood C1 | 26.2 | 0 | 1.0 |
| pig | M | 26.2 | 1.0 | 2.0 |

**8. 얼음 궁전** — birds: blue, blue, yellow, black
| 종류 | 재질/코드 | x | b | (top) |
|---|---|---|---|---|
| block | glass P2 | 18.8 | 0 | 2.0 |
| block | glass P2 | 21.2 | 0 | 2.0 |
| block | wood B3 | 20 | 2.0 | 2.3 |
| pig | M | 20 | 0 | 1.0 |
| block | glass C06 | 19 | 2.3 | 2.9 |
| block | glass C06 | 21 | 2.3 | 2.9 |
| block | glass B2 | 20 | 2.9 | 3.2 |
| pig | S | 20 | 3.2 | 3.9 |
| block | stone C06 | 22 | 0 | 0.6 |
| pig | S | 22 | 0.6 | 1.3 |
| block | glass P2 | 22.8 | 0 | 2.0 |
| block | glass P2 | 25.2 | 0 | 2.0 |
| block | wood B3 | 24 | 2.0 | 2.3 |
| pig | M | 24 | 0 | 1.0 |
| block | glass P1 | 23 | 2.3 | 3.5 |
| block | glass P1 | 25 | 2.3 | 3.5 |
| block | wood B3 | 24 | 3.5 | 3.8 |
| pig | M | 24 | 2.3 | 3.3 |
| pig | S | 24 | 3.8 | 4.5 |

**9. 절벽 위 요새** — birds: yellow, black, blue, red
| 종류 | 재질/코드 | x | b | (top) |
|---|---|---|---|---|
| block | wood C1 | 18.5 | 0 | 1.0 |
| pig | S | 18.5 | 1.0 | 1.7 |
| static | 바위 w6 h2 | 23 | 0 | 2.0 |
| block | stone P2 | 21.3 | 2.0 | 4.0 |
| block | stone P2 | 23.7 | 2.0 | 4.0 |
| block | wood B3 | 22.5 | 4.0 | 4.3 |
| pig | L | 22.5 | 2.0 | 3.4 |
| block | glass C06 | 21.5 | 4.3 | 4.9 |
| block | glass C06 | 23.5 | 4.3 | 4.9 |
| block | glass B3 | 22.5 | 4.9 | 5.2 |
| pig | S | 22.5 | 5.2 | 5.9 |
| block | tnt TNT | 25.2 | 2.0 | 2.8 |
| pig | M | 27.5 | 0 | 1.0 |
| block | wood P1 | 28.5 | 0 | 1.2 |

**10. 돼지 왕의 성** — birds: red, blue, yellow, black, black
| 종류 | 재질/코드 | x | b | (top) |
|---|---|---|---|---|
| block | stone C1 | 18 | 0 | 1.0 |
| block | stone C1 | 18 | 1.0 | 2.0 |
| pig | S | 18 | 2.0 | 2.7 |
| block | stone P2 | 20.8 | 0 | 2.0 |
| block | stone P2 | 23.2 | 0 | 2.0 |
| block | stone B3 | 22 | 2.0 | 2.3 |
| pig | L (king) | 22 | 0 | 1.4 |
| block | wood P2 | 20.8 | 2.3 | 4.3 |
| block | wood P2 | 23.2 | 2.3 | 4.3 |
| block | wood B3 | 22 | 4.3 | 4.6 |
| pig | M | 22 | 2.3 | 3.3 |
| block | glass P1 | 21 | 4.6 | 5.8 |
| block | glass P1 | 23 | 4.6 | 5.8 |
| block | glass B3 | 22 | 5.8 | 6.1 |
| pig | M | 22 | 4.6 | 5.6 |
| pig | S | 22 | 6.1 | 6.8 |
| block | wood P2 | 25.3 | 0 | 2.0 |
| block | wood P2 | 27.7 | 0 | 2.0 |
| block | tnt TNT | 26.5 | 0 | 0.8 |
| pig | S | 26.5 | 0.8 | 1.5 |
| block | wood B3 | 26.5 | 2.0 | 2.3 |
| pig | M | 26.5 | 2.3 | 3.3 |

난이도 곡선: 1~2 기본 조작, 3 파랑 새+유리, 4 노랑 새+나무, 5 고지대+혼합, 6 폭탄 새+돌, 7 TNT, 8 넓은 유리 구조, 9 절벽+돌, 10 종합(돼지 7마리, 새 5마리).

### 10.3 데이터를 옮겨 적은 뒤 검증 규칙 (구현자 자가검증)
각 스테이지의 각 요소에 대해:
1. b는 0이거나, 정적 바위의 윗면이거나, 바로 아래에서 가로로 겹치는 블록의 (b + h)와 정확히 같아야 한다.
2. 같은 높이 구간에 있는 두 물체의 가로 구간 [x − w/2, x + w/2]가 겹치지 않아야 한다(돼지는 w = 2r).
3. 기둥 사이에 있는 돼지는 top(= b + 2r)이 위 들보의 b 이하여야 한다.

---

## 11. 렌더링 명세 (`renderer.js`)

### 11.1 그리기 순서 (매 프레임)
1. 하늘: 세로 그라데이션 `#8fd3ff` → `#e6f7ff`.
2. 구름: 원 3~4개를 묶은 덩어리 4개. `time × 8px/s`로 오른쪽으로 흐르며, 화면 밖으로 나가면 반대쪽에서 다시 나온다. 흰색 알파 0.9.
3. 원경 언덕: 큰 반원 3개, `#b5e3a1`.
4. 지면: y = 640부터 바닥까지 흙 `#8a6642`, 위쪽 12px는 잔디 `#5fa83a`.
5. (Level이 있을 때) 정적 바위, 새총 뒷팔과 뒷고무줄, 슬링 위의 새, 앞고무줄과 앞팔, 대기 중인 새(지면 위, x = 3.9 − i·0.9, y = r).
6. 블록, 돼지, 활성 새(각도 반영, §3.2의 규칙).
7. 직전 궤적 점, 조준 중이면 예측 점.
8. 파티클, 폭발 링, 점수 팝업(화면 좌표에서 글씨가 뒤집히지 않도록 그림. 팝업은 `bold 22px`, 흰 글씨에 검은 외곽선, 1초 동안 위로 30px 이동하며 사라짐).
- MAIN/SELECT 상태에서는 1~4와 장식용 새총만 그린다.
- `save()`/`restore()`는 반드시 짝을 맞춘다.

### 11.2 엔티티 모양
- **블록:** 채움과 테두리(2px). 나무는 가로결 선 2개, 돌은 어두운 점 3개, 유리는 대각선 하이라이트 1개. TNT는 빨간 상자에 흰 "TNT" 글씨(회전한 컨텍스트에서 그리므로 블록과 함께 돌아감). **손상 표현:** hp/maxHp < 0.66이면 균열선 1개, < 0.33이면 2개. 균열 모양은 body.id를 시드로 한 결정적 좌표로 만든다(매 프레임 같은 모양).
- **돼지:** 초록 `#7ed957` 원 + 테두리 `#3f8f2a`, 귀 2개(작은 원, 로컬 위쪽), 흰 눈 2개(로컬 (±0.35r, +0.25r))와 검은 눈동자, 주둥이 타원 `#a6ea85`(로컬 (0, −0.1r))와 콧구멍 2개. hp < 50%면 멍 자국(어두운 초록 원). king이면 금색 왕관(로컬 위쪽).
- **새:** 원형(노랑 새는 반지름 r 삼각형, 꼭짓점이 로컬 +x 방향), 흰 배, 흰 눈과 눈동자, 두꺼운 검은 눈썹(화난 표정), 주황 부리(로컬 +x). 폭탄 새는 머리 위에 심지가 있고, 퓨즈가 켜지면 심지 끝이 빨갛게 깜빡인다.
- **새총:** 갈색 `#6d4323` 굵은 선(8px). 몸통 (5.0, 0)→(5.0, 1.9), 뒷팔 (5.0, 1.9)→(5.3, 3.0), 앞팔 (5.0, 1.9)→(4.7, 3.0). 고무줄은 `#3b2412` 5px로, 각 팔 끝(y 2.95)에서 슬링 새의 중심까지(새가 없으면 두 팔 끝을 이음).
- **정적 바위:** `#7c6f64` 채움, `#4e453d` 테두리, 윗면에 잔디 띠 6px.

---

## 12. 진행 저장 (`storage.js`)
- 키: `ab-web-progress-v1`. 값(JSON): `{ unlocked: 1~10, stars: [10개 정수 0~3], best: [10개 정수] }`.
- load: 파싱에 실패하거나 형식이 틀리면 기본값 `{unlocked:1, stars:[0×10], best:[0×10]}`을 쓴다. 필드를 하나씩 검증하고 clamp한다.
- save: try/catch 안에서 하고, 실패는 무시한다(메모리 값만 유지).
- 디버그: `location.search`에 `unlock`이 들어 있으면 모든 스테이지를 해금한 것으로 **표시만** 한다(저장하지 않음). 사람이 10단계를 바로 확인할 때 쓴다.

---

## 13. 구현 순서 (마일스톤)

각 단계가 끝날 때 그 단계에서 만든 파일을 **처음부터 다시 읽으며** 해당 체크 항목을 확인한다.

1. **뼈대:** index.html, style.css, config.js, math.js, storage.js, ui.js, game.js(상태 머신, 스케일링, 루프, 빈 렌더).
   - 체크: 모든 버튼 id가 HTML과 JS에서 일치하는가, 상태 전이표(§9.1)의 모든 화살표에 핸들러가 있는가, 스크립트 순서가 맞는가.
2. **물리:** physics.js 전체.
   - 체크: §4.4의 손 검증 예시 2개와 §4.6의 손 검증을 코드 경로를 따라가며 확인한다. normal 방향이 A→B이고 충격량 부호가 A는 −, B는 +인지 확인한다.
3. **레벨 생성과 렌더링:** stages.js(10개 전부), level.js의 생성 부분, renderer.js.
   - 체크: §10.3 규칙으로 10개 스테이지 전부를 검산한다. 좌표 변환이 두 함수로만 이루어지는지 확인한다.
4. **슬링샷:** input.js, level.js의 조준·발사·예측·궤적.
   - 체크: 예측 적분식이 physics의 적분 순서(속도 먼저, 위치 나중)와 같은지, 비행 중 감쇠가 0인지 확인한다.
5. **피해·파괴·점수·판정:** impactHandler, 파괴 큐, 경계, 턴 페이즈, outcome → 결과 오버레이, 저장.
6. **특수 새·TNT·폭발.**
7. **연출:** 파티클, 팝업, 손상 표현, 안내 문구, 스테이지 선택 별 표시.
8. **최종 정적 검토:** §14.1 체크리스트 전체.

---

## 14. 완료 판정 기준

### 14.1 구현자 정적 자가검증 체크리스트 (실행할 수 없으므로 전부 코드를 읽어서 확인)
- [ ] `game/index.html`만 열면 되고, 외부 URL이나 `fetch`/`import`/`type="module"`가 없다.
- [ ] 모든 JS 파일이 IIFE로 감싸여 있고, 공개 심볼은 `AB.*`뿐이다. 파일 로드 순서가 §2와 같다.
- [ ] 로드 시점에 다음 순서 파일의 심볼을 참조하지 않는다.
- [ ] JS에서 쓰는 모든 DOM id가 index.html에 존재한다(§9.3 목록과 대조).
- [ ] 괄호, 중괄호, 쉼표, 세미콜론의 짝을 확인했다. 특히 stages.js의 긴 배열 리터럴.
- [ ] 월드↔화면 변환이 두 함수로만 되어 있고, 회전 렌더링이 `rotate(−angle)`, 로컬 y 반전을 따른다.
- [ ] physics: 박스–박스 4축 선택, incident edge, 2회 클리핑, 접촉점 공식이 §4.4와 일치한다. 원–박스의 내부/외부 두 경로, 쌍 순서에 따른 법선 부호가 맞다.
- [ ] physics: 잠든 바디끼리도 검출하고, 섬 전파로 깨우며, 풀이는 깨어 있는 쪽이 포함된 아비터만 한다.
- [ ] 스테이지를 로드하면 동적 바디가 모두 잠든 상태로 시작한다.
- [ ] 콜백 안에서 바디를 삭제하지 않고, 파괴와 폭발은 스텝 밖 while 루프에서 처리한다.
- [ ] 10개 스테이지 전부 §10.3 검산을 통과했고, 각 스테이지에 돼지 ≥ 1, 새 ≥ 3이다.
- [ ] 상태 전이: 일시정지 중에는 update 없음, 다시하기는 `new Level`, 메인으로는 Level 폐기와 HUD 숨김, 클리어는 저장과 해금, 10단계 클리어 시 "다음 스테이지" 숨김.
- [ ] 0으로 나누는 곳(정규화, 1/kN, dist)마다 가드가 있다.
- [ ] 일시정지 버튼이 `#hud` 안 오른쪽 위에 있고, 클릭 이벤트가 canvas로 새지 않는다(canvas 위에 있는 별도 DOM 요소).

### 14.2 사람 수동 시나리오 (구현 후 사람이 브라우저에서 확인. "된 것"의 정의)
1. `index.html`을 더블클릭해 최신 Chrome/Edge/Firefox/Safari에서 열었을 때 콘솔 에러가 0개이고 메인 화면(제목, 게임 시작, 스테이지 선택)이 보인다.
2. **게임 시작** → 1단계가 바로 시작된다. 구조물은 건드리기 전까지 가만히 서 있다.
3. 새를 끌면 고무줄이 늘어나고 예측 점선이 보인다. 놓으면 포물선으로 날아간다. 짧게 당기고 놓으면 발사가 취소된다.
4. 새가 구조물을 치면 블록이 기울고 무너지고 부서진다(파편, 점수 팝업). 충분한 충격을 받거나 낙하한 돼지는 사라지고 점수 +5000.
5. 새가 멈추거나 화면 밖으로 나가면 다음 새가 슬링에 올라온다.
6. 돼지를 모두 제거하면 약 1.5초 뒤 클리어 패널(별, 점수, 새 보너스, 최고 기록, 다음/다시하기/메인으로)이 나온다.
7. 새를 모두 쓰고 돼지가 남으면 실패 패널(다시하기/메인으로)이 나온다.
8. 인게임 **오른쪽 위 일시정지 버튼** → 물리가 멈추고 **계속하기 / 다시하기 / 메인으로**가 보인다. 다시하기는 해당 스테이지를 처음 상태로 되돌리고, 메인으로는 메인 화면으로 간다. Esc로도 토글된다.
9. 파랑(분열), 노랑(가속), 폭탄(폭발), TNT 연쇄 폭발이 동작한다.
10. 스테이지 선택에 10개가 표시된다. 클리어하면 다음 스테이지가 해금되고, 새로고침해도 유지된다. `?unlock`을 붙이면 10단계까지 바로 진입할 수 있다.
11. 창 크기를 바꿔도 화면이 비율을 유지한 채 중앙에 오고, 드래그 위치가 새와 정확히 맞는다.
12. 10개 스테이지 모두 클리어할 수 있다.

### 14.3 요구사항 추적
| 요구사항 | 충족 위치 |
|---|---|
| 1. stage 10단계 | §10 (10개 데이터), §9.3 스테이지 선택, §12 해금 |
| 2. 게임시작 → 앵그리버드식 플레이 | §9.1 MAIN의 게임 시작 → PLAYING, §4 물리, §6 파괴, §7 슬링샷, §8 판정 |
| 3. 우측 일시정지 → 다시하기/메인으로 | §9.3 `#btn-pause`(right: 20px), `#overlay-pause`, §9.1 PAUSED 전이 |

---

## 15. 위험 요소와 대응 / 튜닝 노브

| 위험 | 대응 (구현 시) | 사람이 실행해 본 뒤의 튜닝 노브 (config.js) |
|---|---|---|
| 쌓인 구조물이 저절로 흔들리거나 무너짐 | 시작할 때 수면 상태, warm start, 2개 접촉점, 마진 | 떨림 → ITERATIONS 12~16, BAUMGARTE 0.1~0.15. 잘 안 잠듦 → SLEEP_LIN 0.12 |
| 좌표 부호 실수(뒤집힌 화면, 반대 회전) | 변환 두 함수, 회전 규칙 명시(§3.2) | — |
| 새가 블록을 뚫고 지나감 | 120 Hz 스텝, 터널링 계산(§4.8) | FIXED_DT 1/180 |
| 너무 약하거나 너무 강한 파괴 | 피해 공식과 수치 확인(§6.1) | DAMAGE_K, 재질 baseHp, BIRD_MULT |
| 새가 너무 멀리 또는 너무 짧게 날아감 | 최대 20 m/s에서 45° 사거리 약 40 m, 목표는 13~25 m 거리 | MAX_LAUNCH_SPEED 16~22 |
| 스테이지 데이터 오타로 겹침이 생겨 시작하자마자 튕김 | §10.3 검산. 잠든 상태로 시작하므로 겹쳐도 첫 충돌 전까지는 드러나지 않음 | 해당 좌표 수정 |
| file:// 환경에서 localStorage 예외 | try/catch, 메모리 대체 | — |
| 턴이 끝나지 않음(새가 계속 굴러감) | 굴러갈 때 감쇠 증가, 9초 수명 제한, 실패 대기 최대 6초 | BIRD_REST_TIME, BIRD_MAX_LIFETIME |

### 15.1 게임플레이 상수 모음 (config.js에 전부 넣을 것)
SLING_ANCHOR (5.0, 2.9) · GRAB_RADIUS 1.5 · MAX_PULL 2.2 · MIN_PULL 0.45 · MAX_LAUNCH_SPEED 20 · PREVIEW_TIME 0.8 · PREVIEW_SAMPLE 5 · DAMAGE_MIN_SPEED 1.0 · DAMAGE_K 1.0 · MIN_DAMAGE 0.5 · BREAK_SLOWDOWN 0.75 · BIRD_REST_SPEED 0.25 · BIRD_REST_ANG 0.5 · BIRD_REST_TIME 1.0 · BIRD_MAX_LIFETIME 9 · NEXT_BIRD_DELAY 0.8 · CLEAR_DELAY 1.5 · FAIL_QUIET_TIME 1.0 · FAIL_MAX_WAIT 6 · QUIET_SPEED 0.15 · QUIET_ANG 0.3 · KILL_BOUNDS (x −5~40, y > −5) · SCORE_PIG 5000 · SCORE_BIRD_LEFT 10000 · BLACK_FUSE 1.5 · BLACK_EXPLOSION (R 3.0, J 60, D 90) · TNT_EXPLOSION (R 2.5, J 45, D 70) · YELLOW_BOOST_SPEED 26 · BLUE_SPLIT_ANGLE 0.25 · BLUE_SPLIT_OFFSET 0.35 · TRAIL_INTERVAL 0.04 · TRAIL_MAX 250 · PPM 40 · VIEW 1280×720 · GROUND_SCREEN_Y 640 · 물리 상수는 §4.8.
