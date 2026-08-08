# 웹 브라우저 앵그리버드 — 구현 플랜

작성 기준: 1인 개발(필요 시 2인 병렬), 웹 단독 배포(정적 호스팅), 데스크톱 우선 + 모바일 터치 대응.
이 문서는 "읽고 바로 코딩 시작 가능한 수준"을 목표로 한다. 수치는 전부 초기값이며 튜닝 대상이지만,
**튜닝 전까지는 이 값을 그대로 쓴다**(임의로 바꾸면 밸런싱 회귀를 추적할 수 없다).

---

## 0. 스코프

### 만드는 것
- 메인 메뉴 → 스테이지 선택 → 인게임(슬링샷 물리) → 클리어/실패 → 다음 스테이지의 완결 루프
- 스테이지 10개 (데이터 주도)
- 우측 상단 일시정지 버튼 + 오버레이(다시하기 / 메인으로)
- 점수, 별 3단계, localStorage 진행도 저장

### 안 만드는 것 (Non-goals — 논쟁 방지용으로 명시)
- 멀티플레이, 서버 랭킹/계정
- 인게임 레벨 에디터 UI (레벨은 TS 모듈로 손으로 짠다)
- 리플레이 저장/공유
- i18n (한국어 하드코딩)
- 상용 앵그리버드 에셋 사용 (저작권 — 도형 렌더 또는 자체 제작 스프라이트)

---

## 1. 기술 선택 (결정과 근거)

### 1.1 물리 엔진: **Matter.js 채택** (직접 구현 안 함)

| 항목 | 직접 구현 | Matter.js |
|---|---|---|
| 원 vs 원, 원 vs 회전 사각형 충돌 | 직접 SAT/GJK 작성 | 제공 |
| 다물체 스택 안정성(resting contact) | 여기가 지옥. 반복 솔버·슬롭·워밍스타팅 직접 튜닝 | positionIterations/sleeping 제공 |
| 관통(터널링) 처리 | 직접 | 부분 제공 |
| 예상 비용 | 5~8일 | 0.5일(학습) |

앵그리버드의 재미는 "쌓인 구조물이 그럴듯하게 무너지는 것"이고, 그건 충돌 검출이 아니라
**stacking solver 품질**에서 나온다. 직접 구현 시 여기서 일정이 무너진다. Matter.js는
합성 바디, sleeping, 충돌 이벤트, 충돌 필터를 모두 제공하고 순수 JS라 번들이 가볍다(~90KB min).

- 버전: `matter-js@0.20.x` 고정(`package.json`에 캐럿 없이 정확한 버전). 물리 거동이 마이너 버전에서 바뀌면 레벨 밸런싱이 전부 깨진다.
- 타입: `@types/matter-js`
- **Matter의 Renderer는 쓰지 않는다.** `?debug=1`일 때만 디버그 오버레이로 사용.
- Box2D-wasm은 정확도는 낫지만 wasm 로딩·타입·디버깅 비용 대비 이득이 이 규모에선 없다. 기각.

### 1.2 렌더링: **Canvas 2D 직접 렌더**

- 오브젝트 수가 스테이지당 120개 이하 + 파티클 300개 수준 → Canvas 2D로 60fps 충분.
- PixiJS(WebGL)는 이 물량에 오버킬이고, 번들 +400KB와 씬그래프 학습 비용을 추가한다. 기각.
- 단, 렌더 진입점을 `renderBody(ctx, body)` 하나로 좁혀 둔다. 나중에 WebGL로 갈아탈 때 여기만 바꾸면 되게.

### 1.3 UI 레이어: **HUD/오버레이는 DOM, 게임은 Canvas**

canvas 안에 버튼을 그리면 히트테스트·포커스·키보드 접근성·호버 커서를 전부 직접 만들어야 한다.
일시정지 버튼과 오버레이는 `position: absolute` DOM으로 canvas 위에 얹는다. 공짜로 얻는 것:
`:hover`, `:focus-visible`, Tab 이동, `aria-*`, 트랜지션.

### 1.4 빌드/언어

- Vite + TypeScript (strict). 프레임워크 없음 — 화면 수가 5개뿐이라 React를 넣으면 rAF 루프와
  React 렌더 사이클을 조율하는 비용이 이득보다 크다.
- 테스트: Vitest (Node 환경에서 Matter.js 헤드리스 구동 가능 → 물리 회귀 테스트를 CI에서 돌릴 수 있다)
- 린트: ESLint + Prettier, `noUncheckedIndexedAccess` 켬.

### 1.5 좌표계·단위 (전 모듈 공통 규약)

- **논리 해상도 1280 × 720 고정.** 화면 크기에 따라 CSS transform으로 letterbox 스케일. 물리는 항상 논리 좌표계에서 돈다.
- 원점 좌상단, **y는 아래가 양수** (Canvas와 Matter 기본이 동일 → 변환 없음)
- 1 물리 단위 = 1 논리 픽셀
- 중력 `engine.gravity = { x: 0, y: 1, scale: 0.001 }` (Matter 기본값 유지)
- DPR: `canvas.width = 1280 * min(devicePixelRatio, 2)`, `ctx.scale(dpr, dpr)`

```
[화면 1920x1080] --letterbox--> [논리 1280x720] --camera.x 팬--> [월드 최대 3200x720]
```

---

## 2. 모듈 구조

```
src/
  main.ts                 부트스트랩, canvas/DOM 마운트, rAF 루프 소유
  core/
    loop.ts               고정 타임스텝 루프 (accumulator)
    stateMachine.ts       앱 상태 머신 (전이표 + 가드)
    input.ts              Pointer Events 정규화 → 논리좌표
    audio.ts              WebAudio, 풀링, 일시정지 시 suspend
    storage.ts            localStorage 진행도 (버전 키 + 마이그레이션)
  game/
    world.ts              Matter Engine 생성/파기, 스테이지 → 바디 빌드
    entities.ts           BodyKind, plugin.gameData 정의, 팩토리
    damage.ts             충돌 임펄스 → 데미지 → 파괴
    slingshot.ts          드래그 조준, 발사 속도 산출
    trajectory.ts         샌드박스 엔진 기반 궤적 예측
    settle.ts             정지 감지 → 클리어/실패 판정
    camera.ts             추적/데드존/클램프
    score.ts              점수·별 계산
    abilities.ts          새 능력 (yellow 가속, black 폭발)
  render/
    renderer.ts           레이어 순서, 카메라 적용
    shapes.ts             renderBody — 도형/스프라이트 단일 진입점
    particles.ts          파편·먼지 (물리 아님, 순수 파티클)
    debug.ts              ?debug=1 오버레이
  ui/
    hud.ts                남은 새, 점수, 일시정지 버튼
    pauseOverlay.ts       일시정지 패널 (포커스 트랩)
    resultOverlay.ts      클리어/실패 패널
    mainMenu.ts, stageSelect.ts
  stages/
    schema.ts             StageData 타입 + 런타임 검증
    prefabs.ts            구조물 프리팹 조립 헬퍼
    stage01.ts ... stage10.ts
    index.ts              STAGES 배열
```

---

## 3. 게임 루프 (고정 타임스텝)

물리를 가변 dt로 돌리면 프레임 드랍 시 궤적이 달라져 레벨 밸런싱이 무의미해진다. 고정 스텝 필수.

```ts
const FIXED_DT = 1000 / 60;      // 16.6667ms
const MAX_STEPS_PER_FRAME = 5;   // 스파이럴 오브 데스 방지

let acc = 0, last = performance.now();
function frame(now: number) {
  requestAnimationFrame(frame);
  let elapsed = now - last; last = now;
  if (elapsed > 250) elapsed = 250;   // 탭 복귀 시 점프 컷
  acc += elapsed;

  let steps = 0;
  while (acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
    if (sm.isSimulating()) fixedUpdate(FIXED_DT);  // PAUSED면 false
    acc -= FIXED_DT; steps++;
  }
  if (steps === MAX_STEPS_PER_FRAME) acc = 0;      // 부채 탕감

  render(acc / FIXED_DT);  // 보간 계수(초기엔 미사용, 후반 폴리시 때 적용)
}
```

`fixedUpdate` 내부 순서(고정):
1. `input.consume()` — 이번 스텝의 포인터 이벤트 적용
2. `Engine.update(engine, FIXED_DT)`
3. 충돌 이벤트로 큐잉된 데미지 처리 → 파괴 확정 (**콜백 안에서 `Composite.remove` 금지** — 솔버 순회 중 월드 변경은 크래시/미정의 동작. 반드시 큐에 쌓고 update 이후 처리)
4. 화면 밖 바디 정리
5. `settle.tick()` — 정지 감지
6. `camera.update()`
7. 파티클 업데이트

렌더는 `fixedUpdate` 횟수와 무관하게 프레임당 1회.

---

## 4. 엔티티 모델

### 4.1 충돌 카테고리

```ts
export const CAT = {
  BIRD:   0x0001,
  PIG:    0x0002,
  BLOCK:  0x0004,
  GROUND: 0x0008,
  DEBRIS: 0x0010,   // 파괴 잔해(있다면). 서로 충돌 안 함
} as const;
```

- BIRD mask: PIG | BLOCK | GROUND
- DEBRIS mask: GROUND 만 (잔해끼리 충돌시키면 바디 수가 폭증한다)

### 4.2 게임 데이터 부착

Matter body를 상속/래핑하지 않고 `body.plugin`에 붙인다(Matter가 공식으로 남겨둔 슬롯).

```ts
type Material = 'wood' | 'ice' | 'stone' | 'pig' | 'ground';
type Kind = 'bird' | 'pig' | 'block' | 'ground';

interface GameData {
  kind: Kind;
  material: Material;
  hp: number;
  maxHp: number;
  dead: boolean;          // 이번 스텝에 파괴 확정 (중복 처리 방지)
  birdType?: 'red' | 'yellow' | 'black';
  abilityUsed?: boolean;
}
// body.plugin.game = GameData
```

### 4.3 재료 상수표 (튜닝 시 이 표만 고친다)

| material | density | restitution | friction | hp(기본) | 데미지 임계 | 파괴 점수 | 색 |
|---|---|---|---|---|---|---|---|
| wood   | 0.0015 | 0.20 | 0.6 | 60  | 8  | 60 | `#c88a4a` |
| ice    | 0.0010 | 0.10 | 0.15 | 35 | 5  | 40 | `#a8dcf0` |
| stone  | 0.0035 | 0.10 | 0.8 | 140 | 14 | 90 | `#8f8f95` |
| pig    | 0.0012 | 0.35 | 0.5 | 45  | 6  | 500 | `#7dc242` |
| ground | static | 0.20 | 0.9 | ∞ | — | — | `#5b4636` |

새:

| birdType | radius | density | 데미지 배율 | 능력 |
|---|---|---|---|---|
| red    | 14 | 0.004 | 1.0 | 없음 |
| yellow | 13 | 0.0035 | 1.3 | 탭 시 진행 방향 속도 ×1.9 (1회) |
| black  | 16 | 0.005 | 1.0 | 탭 또는 첫 충돌 0.6초 후 폭발 |

---

## 5. 슬링샷

### 5.1 입력 → 발사 속도

물리 constraint(고무줄)로 당겨서 놓는 방식은 그럴듯하지만 **놓는 순간 속도가 예측 불가**해서
궤적 예측선과 실제가 어긋난다. 속도를 직접 지정하는 방식을 쓴다.

```ts
const ANCHOR = stage.sling;          // 예: {x: 220, y: 430}
const MAX_PULL = 110;                // px
const LAUNCH_SCALE = 0.22;           // 최대 속도 = 110 * 0.22 = 24.2 px/step
const GRAB_RADIUS = 120;             // 이 반경 안에서 pointerdown 해야 잡힘
const CANCEL_PULL = 12;              // 이보다 짧게 당기면 발사 취소

// pointermove
pull = clampMagnitude(sub(ANCHOR, pointerWorld), MAX_PULL);
birdPos = add(ANCHOR, negate(pull));           // 새는 당긴 방향으로 이동
launchVel = mul(pull, LAUNCH_SCALE);           // 당긴 반대 방향으로 날아감

// pointerup
if (magnitude(pull) < CANCEL_PULL) { cancelDrag(); }
else {
  Body.setStatic(bird, false);
  Body.setPosition(bird, birdPos);
  Body.setVelocity(bird, launchVel);
  Body.setAngularVelocity(bird, launchVel.x * 0.01);
  sm.toFlying();
}
```

- 조준 중 새는 `isStatic = true`로 두고 `Body.setPosition`으로만 옮긴다(솔버 개입 차단).
- `touch-action: none`을 canvas에 지정, pointermove 리스너는 `{ passive: false }`.
- 포인터 좌표 변환: `(clientX - rect.left) / rect.width * 1280 + camera.x`
- 키보드 대체 조작(접근성): ←→로 각도, ↑↓로 파워, Space 발사. 각도 1도/파워 2% 단위.

### 5.2 궤적 예측 — 샌드박스 엔진 방식

Matter는 semi-implicit + position-based 보정을 섞어 적분한다. 해석적 포물선 공식으로 그린 예측선은
`frictionAir`와 보정 때문에 실제와 어긋난다(길수록 오차 누적). 그래서 **실제 엔진 복제본으로 시뮬**한다.

```
DRAGGING 진입 시 1회:
  predictEngine = Engine.create(동일 gravity 설정)
  현재 월드의 모든 바디를 static 스냅샷으로 복제해 넣는다
  (조준 중엔 구조물이 정지 상태이므로 static 취급이 정확도 손실 거의 없음)
  predictBird = 현재 새와 동일 파라미터로 1개 생성

pointermove마다 (rAF 코얼레스로 프레임당 최대 1회):
  Body.setPosition(predictBird, birdPos)
  Body.setVelocity(predictBird, launchVel)   // positionPrev 갱신 목적
  for (i = 0; i < 60; i++) {
    Engine.update(predictEngine, FIXED_DT)
    if (i % 3 === 0) points.push({...predictBird.position})
    if (충돌 감지 or 화면 밖) break
  }
  표시: 앞 25스텝(약 8점)만 — 전부 보여주면 난이도가 사라진다
```

비용: 60스텝 × 소규모 월드 ≈ 1ms 미만. 프레임당 1회면 문제없다.
점 렌더: 반지름 3px 흰 원, 알파를 거리에 따라 0.9 → 0.25로 감쇠.

> 리스크: `Body.setVelocity`가 `positionPrev`를 함께 갱신하는지 버전에 따라 다르다.
> M2 첫날에 **골든 테스트**(§10.2)로 실제 궤적과 예측 궤적의 최대 편차를 측정하고,
> 60스텝 지점에서 **2px 초과면** `positionPrev`를 수동 설정하는 헬퍼를 만든다.

---

## 6. 데미지 · 파괴

### 6.1 충돌 임펄스 산출

`collisionStart`에서 상대속도와 감소질량으로 충격량을 근사한다.

```ts
Events.on(engine, 'collisionStart', (e) => {
  for (const pair of e.pairs) {
    const a = pair.bodyA, b = pair.bodyB;
    const rel = Vector.sub(a.velocity, b.velocity);
    const speed = Vector.magnitude(rel);
    if (speed < 2) continue;                      // 잔진동 무시

    const ma = a.isStatic ? Infinity : a.mass;
    const mb = b.isStatic ? Infinity : b.mass;
    const mEff = (ma === Infinity) ? mb : (mb === Infinity) ? ma : (ma * mb) / (ma + mb);

    const impact = mEff * speed * IMPACT_GAIN;    // IMPACT_GAIN = 45
    queueDamage(a, impact, b);
    queueDamage(b, impact, a);
  }
});

function queueDamage(target, impact, other) {
  const g = target.plugin?.game; if (!g || g.dead || target.isStatic) return;
  const mat = MATERIAL[g.material];
  let dmg = impact - mat.threshold;
  if (dmg <= 0) return;
  if (other.plugin?.game?.kind === 'bird') dmg *= BIRD[other.plugin.game.birdType].dmgMul;
  damageQueue.push({ body: target, dmg });
}
```

- 큐는 `Engine.update` **이후** 일괄 처리. HP 차감 → `hp <= 0`이면 `dead = true`, 제거 목록에 추가.
- 제거: `Composite.remove(world, body)` + 파티클 8~14개 + 점수 가산 + 사운드.
- 돼지는 파괴 시 `pigsAlive--`. **돼지가 화면 밖으로 떨어져도 처치로 친다.**
- `IMPACT_GAIN = 45`는 "wood 블록이 최대 파워 red에 정면으로 맞으면 hp 60을 한 방에 넘긴다"를
  기준으로 역산한 값이다. 수치가 아니라 이 **기준**이 스펙이다 — 밸런싱은 이 문장을 유지하도록 조정한다.

### 6.2 폭발 (black bird / TNT)

```ts
function explode(center, radius = 90, power = 0.055) {
  for (const body of Composite.allBodies(world)) {
    if (body.isStatic) continue;
    const d = Vector.sub(body.position, center);
    const dist = Math.max(Vector.magnitude(d), 1);
    if (dist > radius) continue;
    const falloff = 1 - dist / radius;
    Body.applyForce(body, body.position,
      Vector.mult(Vector.normalise(d), power * falloff * body.mass));
    queueDamage(body, 120 * falloff, null);
  }
}
```

---

## 7. 클리어 / 실패 판정 — 정지(settle) 감지

여기를 대충 만들면 "돼지 다 죽었는데 결과창이 안 뜬다" / "굴러가는 도중에 실패 처리된다"가 나온다.

```ts
const SETTLE_SPEED = 0.35;        // px/step
const SETTLE_ANG   = 0.05;        // rad/step
const SETTLE_FRAMES = 45;         // 0.75초 연속 유지
const SETTLE_TIMEOUT = 300;       // 5초 강제 종료

function tick() {
  const quiet = Composite.allBodies(world).every(b =>
    b.isStatic || b.isSleeping || (b.speed < SETTLE_SPEED && b.angularSpeed < SETTLE_ANG));
  quietFrames = quiet ? quietFrames + 1 : 0;
  elapsed++;
  return quietFrames >= SETTLE_FRAMES || elapsed >= SETTLE_TIMEOUT;
}
```

SETTLING 종료 시 판정 순서(**이 순서 고정**):
1. `pigsAlive === 0` → **CLEAR** (남은 새 × 10000 보너스 가산 → 별 계산 → 저장)
2. `birdsRemaining === 0` → **FAIL**
3. 그 외 → 다음 새를 슬링샷에 로드, `AIMING`

추가 규칙:
- FLYING 중 새가 정지하거나(속도 < 0.5가 30프레임) 화면 밖으로 나가면 그 새는 소모 처리 후 SETTLING 진입.
- 발사 후 최대 12초가 지나면 강제 SETTLING (엣지케이스 안전망).
- 화면 밖 판정: `y > world.height + 300 || x < -400 || x > world.width + 400`

---

## 8. 상태 머신

### 8.1 상태

```
BOOT → MAIN_MENU ⇄ STAGE_SELECT → LOADING → PLAYING → CLEAR | FAIL
                                              ↕
                                            PAUSED
```

`PLAYING`은 서브상태를 가진다: `AIMING → DRAGGING → FLYING → SETTLING → (AIMING | CLEAR | FAIL)`

### 8.2 전이표 (구현은 이 표 그대로. 표에 없는 전이는 개발 모드에서 throw)

| from | event | to | 부수효과 |
|---|---|---|---|
| BOOT | assetsReady | MAIN_MENU | 진행도 로드 |
| MAIN_MENU | START | STAGE_SELECT | — |
| STAGE_SELECT | SELECT(id) | LOADING | 잠금 스테이지면 무시 |
| LOADING | built | PLAYING/AIMING | 월드 생성, 카메라 슬링샷 위치 |
| AIMING | pointerDownOnBird | DRAGGING | 예측 샌드박스 구축 |
| DRAGGING | pointerUp(pull≥12) | FLYING | 발사, 새 소모 |
| DRAGGING | pointerUp(pull<12) / ESC | AIMING | 새 원위치 |
| FLYING | tap | FLYING | 능력 발동(1회) |
| FLYING | birdStopped / offscreen / t>12s | SETTLING | — |
| SETTLING | settled & pigs=0 | CLEAR | 보너스·별·저장 |
| SETTLING | settled & birds=0 | FAIL | — |
| SETTLING | settled | AIMING | 다음 새 로드 |
| AIMING/FLYING/SETTLING | PAUSE | PAUSED | 물리 정지, audio.suspend, 이전 상태 저장 |
| PAUSED | RESUME | 이전 상태 | audio.resume |
| PAUSED/CLEAR/FAIL | RETRY | LOADING | **월드 완전 파기 후 재생성** |
| PAUSED/CLEAR/FAIL | TO_MAIN | MAIN_MENU | 월드 파기 |
| CLEAR | NEXT | LOADING | 마지막 스테이지면 STAGE_SELECT |

구현 규약:
- `sm.isSimulating()`은 `PLAYING`의 서브상태일 때만 true. `PAUSED`에서 `Engine.update` 절대 호출 금지.
- `PAUSED` 진입 시 `pausedFrom`에 이전 상태 저장. RESUME은 그걸로 복귀.
- `visibilitychange`(hidden) 또는 `window.blur` → 시뮬레이션 중이면 자동 PAUSE.
- **다시하기는 부분 리셋이 아니라 전체 재생성**이다. `Engine.clear` + `Composite.clear` + 엔진 참조 폐기 후
  스테이지 데이터로 다시 빌드. 부분 리셋은 잔여 상태(파티클, 큐, 카메라, 능력 플래그) 버그의 온상이다.

### 8.3 월드 파기 체크리스트 (RETRY/TO_MAIN 공통 — 누락 시 메모리 누수)

```
Events.off(engine)            // 모든 리스너 해제
Composite.clear(world, false)
Engine.clear(engine)
predictEngine 동일 처리
damageQueue = [], removeQueue = [], particles = []
settle.reset(), camera.reset(), input.reset()
audio.stopAll()
```

---

## 9. 일시정지 UI (요구사항 3)

### 9.1 버튼

- 위치: 인게임 **우측 상단**. `position:absolute; top:16px; right:16px;`
- 크기: 56×56 (터치 최소 히트영역 48×48 충족), 아이콘 ‖, `aria-label="일시정지"`
- 클릭 외 `Esc`, 게임패드 Start도 동일 이벤트 발행
- FLYING 중에도 눌러진다(물리가 멈춘 채 유지되고 RESUME 시 그대로 이어짐)

### 9.2 오버레이

```html
<div class="overlay" role="dialog" aria-modal="true" aria-labelledby="pause-title">
  <div class="panel">
    <h2 id="pause-title">일시정지</h2>
    <button data-act="resume">계속하기</button>
    <button data-act="retry">다시하기</button>
    <button data-act="main">메인으로</button>
  </div>
</div>
```

- 배경 `rgba(0,0,0,0.55)`, 패널 폭 320px 중앙 정렬, 버튼 높이 52px, 간격 12px
- **요구 필수 버튼은 "다시하기 / 메인으로"** 2개. "계속하기"는 추가(오버레이를 닫을 방법이 없으면 안 되므로).
- 포커스 관리: 열릴 때 첫 버튼에 focus, Tab 순환을 패널 안에 가둠(포커스 트랩), 닫을 때 일시정지 버튼으로 복귀
- `Esc` = 계속하기
- 패널 바깥 클릭 = 계속하기 (오조작 방지를 원하면 끌 수 있게 상수 하나로)
- 열릴 때 `sm.dispatch('PAUSE')`가 먼저, DOM 표시가 나중 — 순서가 반대면 한 프레임 물리가 더 돈다
- 트랜지션 120ms opacity. `prefers-reduced-motion` 존중.

### 9.3 클리어/실패 오버레이

동일 컴포넌트 재사용. 버튼 구성만 다르다.
- CLEAR: 별 3개 애니메이션, 점수, [다음 스테이지] [다시하기] [메인으로]
- FAIL: [다시하기] [메인으로]

---

## 10. 스테이지 시스템

### 10.1 데이터 스키마

```ts
export interface StageData {
  id: number;                 // 1..10
  name: string;
  world: { width: number; height: number };   // height는 720 고정, width는 1280~3200
  sling: { x: number; y: number };
  birds: BirdType[];                          // 순서대로 소모. 길이 = 발사 가능 횟수
  ground: Array<{ x: number; y: number; w: number; h: number }>;   // static, 좌상단 기준
  blocks: Array<{
    shape: 'box' | 'ball';
    material: 'wood' | 'ice' | 'stone';
    x: number; y: number;      // 중심
    w: number; h: number;      // ball이면 w를 지름으로
    angle?: number;            // rad, 기본 0
    hp?: number;               // 생략 시 재료 기본값
  }>;
  pigs: Array<{ x: number; y: number; r: number; hp?: number }>;
  starThresholds: [number, number, number];   // 오름차순
}
```

### 10.2 로딩/전환

- 스테이지는 **정적 TS 모듈**. `stages/index.ts`에서 `export const STAGES: StageData[]`로 한 번에 번들.
  10개 × 수 KB라 코드 스플리팅 이득이 없다. 네트워크 실패 경로도 사라진다.
- `buildWorld(stage)`가 순수 함수처럼 동작: 데이터 → Matter 바디 배열. 전역 상태 참조 금지.
- 전환: `LOADING` 상태에서 (a) 이전 월드 파기 → (b) 빌드 → (c) **안정화 60프레임 프리롤**
  (렌더 없이 `Engine.update` 60회 — 저작 시 미세한 겹침으로 구조물이 스스로 튀는 것을 시작 전에 흡수) → (d) `PLAYING`.
  프리롤 후 바디가 원 위치에서 8px 이상 움직였으면 개발 모드 콘솔 경고(레벨 저작 버그 신호).

### 10.3 프리팹 (레벨 저작 비용을 줄이는 핵심 장치)

10개 스테이지를 좌표로 손코딩하면 이게 일정의 최대 리스크가 된다. 조립 헬퍼를 먼저 만든다.

```ts
prefab.tower(x, groundY, { floors: 3, material: 'wood' })   // 기둥2+상판 반복
prefab.hut(x, groundY, { material: 'stone', pigInside: true })
prefab.bridge(x, groundY, { span: 240, pillars: 2 })
prefab.pyramid(x, groundY, { rows: 4, material: 'ice' })
```

각 프리팹은 `{blocks, pigs}` 조각을 반환하고 스테이지 파일에서 spread로 합친다.
프리팹 4종이면 10스테이지 저작이 스테이지당 20~40줄로 끝난다.

### 10.4 10스테이지 난이도 설계

| # | 이름 | 새 | 돼지 | 주 재료 | 신규 요소 | 목표 클리어율 |
|---|---|---|---|---|---|---|
| 1 | 첫 발사 | 3 red | 1 | wood | 튜토(조준 힌트) | 95% |
| 2 | 무너지는 탑 | 3 red | 2 | wood | 스택 붕괴 | 90% |
| 3 | 얼음집 | 3 red | 2 | ice+wood | ice 취성 | 80% |
| 4 | 돌벽 | 4 red | 2 | stone | stone은 red로 안 깨짐(관통 대신 무너뜨리기) | 70% |
| 5 | 두 언덕 | 4 red | 3 | 혼합 | 지형 고저차, 카메라 팬 | 65% |
| 6 | 노란 새 | 3 red+2 yellow | 3 | stone+wood | yellow 가속 | 60% |
| 7 | 다리 | 4 혼합 | 3 | wood | 지지대 파괴 연쇄 | 55% |
| 8 | 폭탄 | 2 red+1 black | 4 | stone | black 폭발 | 50% |
| 9 | 요새 | 5 혼합 | 4 | stone+ice | 2층 구조 | 45% |
| 10 | 최후 | 5 혼합 | 5 | 전부 | 복합, 월드 폭 3200 | 35% |

- **각 스테이지는 "의도한 정답 풀이"를 주석으로 남긴다** (예: `// 의도: 1발째 좌측 하단 기둥 → 상단 붕괴로 돼지2 압사`).
  이게 없으면 밸런싱 회귀 시 무엇이 깨졌는지 알 수 없다.
- `starThresholds`는 저작자가 실제로 3회 플레이해 얻은 점수 기준: `[대충 클리어, 잘함, 의도한 정답 풀이]`.

### 10.5 진행도 저장

```ts
// localStorage key: "ab.progress.v1"
{ version: 1, unlocked: number, stars: Record<number, 0|1|2|3>, best: Record<number, number> }
```
- 파싱 실패/버전 불일치 → 초기값으로 리셋(에러 삼키되 콘솔 경고). 저장 실패(사파리 프라이빗)도 게임은 계속 되어야 한다.
- 클리어 시 `unlocked = max(unlocked, id + 1)`, `stars`/`best`는 더 높을 때만 갱신.

---

## 11. 카메라

```ts
const DEADZONE = { x: 480, w: 320 };   // 화면 좌표 기준 이 밖으로 나가면 따라감
FLYING:   target = clamp(bird.x - 480, 0, world.width - 1280); camera.x = lerp(camera.x, target, 0.12)
SETTLING: 마지막 위치 유지
AIMING:   target = 0 (슬링샷 화면)으로 0.15 lerp 복귀
```
- 렌더는 `ctx.translate(-camera.x, 0)` 한 번으로 처리.
- 배경 패럴랙스 2겹: 원경 `camera.x * 0.2`, 근경 `camera.x * 0.6`.
- 월드 폭 > 1280일 때만 팬. 1280이면 카메라 고정.

---

## 12. 렌더링

레이어 순서(고정):
1. 하늘 그라디언트
2. 배경 원경 → 근경 (패럴랙스)
3. 지형(static)
4. 블록 → 돼지 (파괴 임박 시 균열 오버레이: `hp/maxHp < 0.5`면 알파 0.3의 균열선 2~4개)
5. 새, 슬링샷(앞쪽 고무줄은 새보다 위에)
6. 궤적 예측 점 (DRAGGING일 때만)
7. 파티클
8. (DOM) HUD, 오버레이

- 1단계는 전부 도형 렌더. `renderBody(ctx, body)`가 `body.vertices`로 path를 그린다.
  스프라이트는 M7에서 같은 함수 안에서 분기 추가.
- 파티클은 물리 바디가 아니다. `{x,y,vx,vy,life,color}` 배열을 직접 적분한다.
  최대 300개, 초과 시 오래된 것부터 버린다.
- 화면 밖 컬링: `body.bounds`가 카메라 뷰포트와 겹치지 않으면 스킵.

디버그(`?debug=1`): 바디 외곽선, 속도 벡터, `pigsAlive/birdsLeft`, 바디 수, FPS,
프레임 시간 p95, `Engine.update` 소요시간 p95.

---

## 13. 사운드

- WebAudio, `AudioContext`는 첫 사용자 제스처에서 생성(자동재생 정책).
- 이벤트: 당기기(루프), 발사, 충돌(재료별 3종 랜덤), 파괴, 돼지 처치, 클리어, 실패.
- 동일 사운드 40ms 내 중복 재생 억제(충돌 연쇄에서 소리가 뭉개짐 방지).
- PAUSED → `ctx.suspend()`, RESUME → `ctx.resume()`.
- 음소거 토글은 HUD에. 상태는 localStorage.

---

## 14. 구현 단계

각 마일스톤은 **끝났는지 눈으로 확인 가능한 기준**을 갖는다. 기준을 못 채우면 다음으로 넘어가지 않는다.

| M | 내용 | 기간 | 완료 기준 (검증 방법) |
|---|---|---|---|
| M0 | Vite+TS 스캐폴드, canvas 마운트, letterbox 스케일, 고정 타임스텝 루프 | 0.5d | 창 크기를 바꿔도 논리 1280×720 비율 유지, 디버그 HUD에 안정적 60fps |
| M1 | Matter 통합, 지형+블록 static/dynamic 배치, 도형 렌더, 디버그 렌더 | 1d | 블록 10개를 쌓아 5초 방치 시 스스로 무너지지 않고 전부 `isSleeping=true` |
| M2 | 슬링샷 드래그, 발사, 카메라 추적, 궤적 예측 | 1.5d | 예측선 마지막 점과 실제 새 위치의 편차가 60스텝 지점에서 ≤ 2px (골든 테스트) |
| M3 | 데미지·파괴·파티클·점수, settle 감지, 클리어/실패 | 1.5d | 새 3발로 돼지 2마리 스테이지를 클리어/실패 양쪽 모두 재현 가능, 결과창 전이 |
| M4 | 상태 머신 전면화, 일시정지 버튼/오버레이, 다시하기/메인으로, 메뉴·스테이지 선택 | 1d | 전이표의 모든 행을 수동으로 1회씩 실행 성공. 다시하기 20회 반복 후 `Composite.allBodies` 수가 첫 회와 동일 |
| M5 | 프리팹 4종 + 스테이지 1~10 저작 + 진행도 저장 | 2d | 10개 전부 로드되고 스키마 검증 통과, 각 스테이지 클리어 1회 기록 |
| M6 | 새 능력 3종, 별 3단계, 클리어 연출 | 1d | yellow/black 능력이 1회만 발동, 별 임계가 실제 점수 분포와 맞음 |
| M7 | 아트/사운드 교체, 폴리시, 성능 튜닝, 모바일 터치 | 1.5d | iPhone Safari + Android Chrome 각 1대에서 스테이지 1,5,10 플레이 가능 |
| M8 | QA 패스, 버그 수정, 배포 | 1d | §15 완료 기준 전 항목 통과 |

합계 **약 11 작업일**. M5의 레벨 저작은 M4와 병렬 가능(2인이면 ~8일).

크리티컬 패스: M1 → M2 → M3. 이 셋이 흔들리면 나머지가 전부 밀린다.

---

## 15. 완료 판정 기준 (Definition of Done)

### 15.1 기능 수용 기준 — 요구사항 직접 매핑

| 요구 | 수용 기준 |
|---|---|
| 1. 스테이지 10단계 | 스테이지 선택 화면에 10개가 보이고, 1번부터 순차 해금되며, 10번 클리어 시 엔딩/선택화면 복귀가 동작한다 |
| 2. 앵그리버드형 게임플레이 | 새총을 드래그해 당기고 놓으면 포물선으로 날아가 구조물에 충돌하고, 구조물이 무너지며, 돼지가 제거되면 클리어된다. 이 문장의 모든 동사가 스테이지 1~10 전부에서 동작한다 |
| 3. 우측 일시정지 | 인게임 우측 상단 버튼 클릭 → 오버레이에 **다시하기 / 메인으로** 버튼 존재 → 각각 눌러 현재 스테이지 재시작 / 메인 메뉴 이동이 동작한다 |

### 15.2 측정 가능한 기준 (숫자로 통과/실패가 갈리는 것)

1. **성능**: 데스크톱 Chrome, 1280×720 창에서 스테이지 1·5·10을 각 3회 플레이. `?debug=1`의
   프레임 시간 p95가 **모든 회차에서 22ms 이하**, 평균 FPS **55 이상**.
2. **클리어 가능성**: 10개 스테이지 각각에 대해 "주어진 새 개수 안에 클리어"를 **최소 1회 기록**.
   기록은 `docs/clear-log.md`에 (스테이지, 사용한 새 수, 점수)로 남긴다.
3. **궤적 정확도**: 골든 테스트에서 예측 궤적과 실제 궤적의 60스텝 지점 편차 **≤ 2px** (5개 발사각 케이스).
4. **누수 없음**: 스테이지 로드 → 다시하기를 30회 반복한 뒤 `Composite.allBodies(world).length`가
   1회차 값과 **정확히 동일**, `performance.memory.usedJSHeapSize` 증가분 **10MB 이하**.
5. **정지 판정 신뢰성**: 스테이지 1~10에서 각 5회 발사, 발사 후 **12초 이내에 반드시** 다음 상태
   (AIMING/CLEAR/FAIL) 중 하나로 전이. 무한 SETTLING 0건.
6. **에러 0**: 전 스테이지 1회 플레이스루 동안 콘솔 error/warning **0건**.
7. **자동 테스트**: `vitest run` 전부 통과, 상태 전이표 §8.2의 **모든 행이 테스트로 커버**.

### 15.3 수동 QA 체크리스트

- [ ] 발사 도중 일시정지 → 계속하기 시 새가 정확히 같은 위치·속도로 이어진다
- [ ] 일시정지 상태에서 탭을 전환했다 돌아와도 일시정지가 유지된다
- [ ] 클리어 오버레이에서 다시하기 → 점수/남은 새가 초기값으로 리셋된다
- [ ] 브라우저 새로고침 후 해금 스테이지와 별이 유지된다
- [ ] 드래그를 canvas 밖으로 끌고 나갔다 놓아도 정상 발사된다(pointercapture)
- [ ] 마지막 새 발사 후 돼지가 모두 죽으면 FAIL이 아니라 CLEAR가 뜬다
- [ ] 돼지가 화면 밖으로 떨어져도 처치로 인정된다
- [ ] 키보드만으로 메인 → 스테이지 선택 → 발사 → 일시정지 → 메인 복귀가 가능하다
- [ ] 모바일에서 게임 중 화면 스크롤/줌이 발생하지 않는다

---

## 16. 테스트 전략

### 16.1 단위 테스트 (Vitest, 브라우저 불필요)

- `damage.ts`: 재료별 임계 근처 입력에서 파괴/미파괴 경계 (각 재료 3케이스)
- `settle.ts`: 정지 프레임 카운팅, 타임아웃 경로
- `stateMachine.ts`: §8.2 전이표 전체 + 표에 없는 전이가 throw 되는지
- `score.ts`: 별 임계 경계값(정확히 임계 = 해당 별)
- `schema.ts`: 스테이지 10개 전부 검증 — `id` 유일, `pigs.length ≥ 1`, `birds.length ≥ 1`,
  `starThresholds` 오름차순, 모든 블록이 world 경계 안, 블록 최소 두께 ≥ 12

### 16.2 물리 골든 테스트 (Node에서 Matter 헤드리스 구동)

```
케이스: 스테이지 1, 초기 속도 5종 [(20,-8),(24,-2),(15,-15),(22,-10),(18,-4)]
→ 300 스텝 실행 → 모든 dynamic 바디의 (x, y, angle) 스냅샷
→ 저장된 골든 파일과 비교, 허용 오차 ±0.5px / ±0.01rad
```

이게 있으면 물리 상수·엔진 버전·솔버 반복 횟수를 건드렸을 때 **레벨 밸런싱이 깨진 사실을 즉시** 안다.
튜닝으로 의도적으로 바뀐 경우엔 골든을 갱신하고 커밋 메시지에 이유를 적는다.

---

## 17. 리스크

| 리스크 | 조기 징후 | 완화 | 발동 트리거 |
|---|---|---|---|
| 구조물이 발사 전에 스스로 무너짐 | M1에서 5초 후 sleep 미진입 | `enableSleeping = true`, `positionIterations 8`, 로드 시 60프레임 프리롤, 겹침 검사 유틸 | M1 완료 기준 미달 시 즉시 |
| 고속 새가 얇은 블록을 관통 | 디버그에서 충돌 이벤트 없이 통과 | 블록 최소 두께 12px 스키마 강제, 발사 속도 상한 28, 필요 시 새의 프레임간 이동을 2 서브스텝으로 분할 | M2에서 1회라도 관측 |
| 궤적 예측과 실제 불일치 | 골든 테스트 편차 > 2px | `positionPrev` 수동 동기화 헬퍼, 그래도 안 되면 예측선을 4점으로 줄이고 "대략 방향" UX로 후퇴 | M2 완료 기준 미달 |
| SETTLING 무한 대기 | 결과창이 안 뜸 | 300프레임 타임아웃 (이미 설계에 포함) | — |
| **레벨 저작 시간이 일정을 잡아먹음 (최대 리스크)** | M5 1일차에 스테이지 3개 미만 완성 | 프리팹 4종을 M5 시작 전에 완성, 스테이지 1~5를 먼저 배포 가능 상태로 만들고 6~10은 후속 | M5 1일차 종료 시점 |
| 모바일 성능 미달 | 실기 FPS < 40 | 파티클 상한 150으로, 패럴랙스 1겹으로, DPR 상한 1.5 | M7 |
| 물리 상수 튜닝이 끝없이 이어짐 | M6 이후에도 상수 변경 커밋 지속 | §6.1의 "기준 문장"을 스펙으로 고정, 골든 테스트로 회귀 차단, 튜닝 타임박스 4시간 | M7 진입 시 |
| Matter 마이너 버전 업데이트로 거동 변화 | 골든 테스트 실패 | 정확한 버전 고정(캐럿 없음), lockfile 커밋 | 상시 |

---

## 18. 미결 질문 (착수 전에 답이 필요한 것)

1. **아트 에셋**: 도형 렌더로 최종 출시할 것인가, 자체 스프라이트를 제작할 것인가? (M7 규모가 0.5d ↔ 3d로 갈림)
2. **모바일 지원 범위**: "동작하면 됨" 수준인가, 세로 모드까지 지원하는가? (세로 모드는 UI 재설계 필요)
3. **별 3단계 시스템**: 요구사항에 없다. 넣을 것인가? (안 넣으면 M6에서 0.5d 절약)
4. **브라우저 지원 하한**: Chrome/Safari/Firefox 최신 2버전으로 가정했다. IE·구형 안드로이드 요구 시 재검토.
5. **10번 클리어 후**: 엔딩 화면이 필요한가, 스테이지 선택으로 복귀면 충분한가?

답이 없어도 M0~M4는 그대로 진행 가능하다. 1·3번은 M5 시작 전까지, 2·5번은 M7 전까지 답이 필요하다.
