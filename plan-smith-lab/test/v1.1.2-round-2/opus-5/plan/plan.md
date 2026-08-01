# 웹 브라우저 슬링샷 물리 게임 — 구현 플랜

대상: 데스크톱/모바일 웹, 10 스테이지, 물리 기반 슬링샷, 인게임 우측 일시정지 오버레이.
분량 기준 1인 개발 약 8.5 개발일. 아래는 실제로 순서대로 짜 나갈 계획이다.

---

## 1. 기술 선택과 근거

**물리: Matter.js (직접 구현 안 함).**
이 게임의 재미는 "구조물이 그럴듯하게 무너지는 것"에서 나온다. 그러려면 볼록다각형 충돌, 회전 강체,
마찰/반발, 그리고 무엇보다 **쌓인 블록이 가만히 있는 안정성**(sequential impulse solver + sleeping +
broadphase)이 필요하다. 이걸 직접 쓰면 최소 2~3주고, 그 시간은 게임플레이가 아니라 solver 디버깅에
들어간다. Matter.js는 ~87KB(min), 복합 바디·제약·`collisionStart` 이벤트를 다 준다.
- 트레이드오프(알고 들어간다): Matter.js는 solver 정확도가 낮아 높게 쌓은 스택이 미세하게 떨리거나
  스스로 붕괴한다. 대응은 §7 R1.
- 대안 검토: Planck.js/Box2D 포팅은 안정성이 더 좋지만 API가 무겁고 다각형 제약(정점 8개, CCW)이 까다롭다.
  스테이지 규모(바디 60~120개)에서는 Matter.js로 충분하다고 판단. R1 완화가 실패하면 Planck.js로 교체하는
  것이 유일한 큰 재작업 지점이므로, 물리 접근은 `physics/World.ts` 래퍼 뒤에 두고 엔진 타입을 밖으로
  노출하지 않는다.

**렌더링: Canvas 2D 직접 렌더러.**
동시 표시 오브젝트가 100개대, 텍스처는 몇 종뿐이라 WebGL/PixiJS는 오버킬이다. Canvas 2D면 카메라를
`setTransform` 하나로 처리할 수 있다. `Matter.Render`는 **디버그 전용**으로만 켜고 게임 화면은 자체 렌더러가
그린다(엔진 렌더러에 묶이면 카메라·스프라이트·파티클 확장이 막힌다).

**앱 셸: Vanilla TypeScript + Vite. UI 오버레이는 DOM.**
게임 루프와 React 렌더 사이클을 섞으면 이득 없이 문제만 생긴다. 대신 메뉴/HUD/일시정지/결과 오버레이는
**캔버스에 그리지 않고 DOM으로** 만든다 — 버튼 히트테스트, 포커스, 접근성, 반응형을 직접 구현하지 않아도 되고
요구사항 3의 "우측 버튼"을 CSS로 배치할 수 있다.

## 2. 구조

```
main.ts                 부트 + requestAnimationFrame 루프
core/    Loop(고정 timestep accumulator), GameStateMachine, Camera, AssetLoader, Input
physics/ World(엔진 래퍼), collisionCategories, impactResolver
game/    Slingshot, Bird, Pig, Block, Trajectory, ScoreRule, SettleDetector, StageRunner
data/    stages/01..10.json, materials.ts
ui/      MainMenu, Hud, PauseOverlay, ResultOverlay (DOM)
render/  Renderer, ParticleSystem
```

루프는 **고정 timestep(1/60, accumulator, 최대 3스텝/프레임 클램프)**. 렌더는 가변. 이유는 두 가지: 저사양에서
터널링 방지, 그리고 §8의 결정성 완료 기준을 만족시키기 위해.

## 3. 상태 머신

| 현재 | 이벤트 | 다음 | 물리 스텝 | 조준 입력 |
|---|---|---|---|---|
| BOOT | assets loaded | MAIN_MENU | X | X |
| MAIN_MENU | 스테이지 선택 | LOADING | X | X |
| LOADING | 월드 구축 완료 | PLAYING | O(프리세틀) | X |
| PLAYING | 일시정지 클릭 / visibilitychange | PAUSED | **X** | X |
| PAUSED | 계속하기 | PLAYING | O | O |
| PAUSED | 다시하기 | LOADING(동일 stageId) | - | - |
| PAUSED | 메인으로 | MAIN_MENU(월드 파괴) | - | - |
| PLAYING | 발사체 정지 감지 | SETTLING | O | X |
| SETTLING | 돼지 0 | CLEAR | O | X |
| SETTLING | 새 0 && 돼지>0 | FAIL | O | X |
| SETTLING | 그 외 | PLAYING(다음 새) | O | O |
| CLEAR/FAIL | 다시하기 / 다음 / 메인으로 | LOADING or MAIN_MENU | - | - |

핵심 두 가지:
- **PAUSED 진입 시 accumulator를 0으로 리셋**한다. 안 하면 탭 복귀 시 누적 dt가 한꺼번에 소비되어 블록이
  순간이동한다. 이건 이 장르에서 가장 흔한 버그다.
- `visibilitychange`(탭 이탈)와 `blur`는 자동으로 PAUSED로 보낸다.
- 전이는 전부 `GameStateMachine.transition(from, to)` 화이트리스트를 통과해야 하고, 비합법 전이는 no-op + 경고.

## 4. 스테이지 데이터와 로딩

JSON 스키마(스테이지 1개):
```
{ id, name,
  camera: { x, y, width },        // 월드 좌표, 높이는 종횡비로 계산
  ground:  { y },
  birds:   ["basic","basic","basic"],
  blocks:  [{ material:"wood", shape:"box", x, y, w, h, angle }],
  pigs:    [{ size:"small", x, y }],
  stars:   [12000, 20000, 30000] }
```
재료 테이블은 `materials.ts`로 분리: `density / friction / restitution / hp / breakThreshold`.
스테이지 JSON이 물리 수치를 갖지 않게 해서 밸런싱을 한 곳에서 돌린다.

로딩: 10개 전부 정적 import(총 수십 KB, lazy load 불필요). 전환은 `world.clear()`가 아니라 **World 인스턴스
재생성** — Matter의 잔여 제약/이벤트 리스너 누수를 구조적으로 없앤다(§8 완료 기준 5의 근거).

난이도 커브: 1~2 튜토리얼(돼지 1, 새 2, 구조물 없음) → 3~5 나무 구조물 도입 → 6~8 얼음/돌 혼합, 다단 구조,
새 3마리 → 9~10 복합(연쇄 붕괴로만 닿는 돼지). **10개를 손으로 배치하는 작업이 이 프로젝트 최대의 시간
리스크**여서, 개발용 배치 에디터를 별도 단계로 잡는다(§6 P4).

## 5. 게임플레이 규칙

**슬링샷 입력.** `pointerdown` 시 새 반경 ×1.8 관용 범위로 히트테스트 → 드래그 중 `pull = clamp(anchor - pointer,
maxPull=96px)` → `pointerup`에 `impulse = normalize(pull) * (|pull|/maxPull) * maxSpeed`. `pointercancel`과
창 밖 릴리즈는 발사 취소가 아니라 **그 시점 값으로 발사**(모바일에서 취소가 더 불쾌하다). 터치는
`touch-action: none` + non-passive 리스너.

**궤적 예측.** 엔진 시뮬레이션을 미리 돌리지 않고 해석식(`x = vt`, `y = vt + ½gt²`)으로 12~15개 점을 찍는다.
중력 상수는 물리 월드와 **같은 값을 참조**한다. 충돌은 무시 — 목적은 정확한 예언이 아니라 조준 보조다.
스테이지 1~3은 점 15개, 이후 8개로 줄여 난이도를 만든다.

**카메라.** 발사 후 새를 lerp(0.12)로 추적 + 속도 방향 lookahead, 스테이지 경계 클램프, SETTLING에서 전체 뷰로 복귀.

**충돌·파괴.** `collisionStart`에서 충격량을 `상대 법선속도 × 유효질량`으로 추정 →
`hp -= max(0, impact - breakThreshold)`. hp ≤ 0이면 바디 제거 + 파편은 **물리 바디가 아닌 파티클**로 처리
(파편을 바디로 만들면 바디 수가 폭발해 프레임이 죽는다). 돼지는 hp가 낮고, 임팩트 누적 또는 화면 하단
낙하로 제거.

**점수/클리어.** 돼지 5000, 파괴 블록 500, 남은 새 10000/마리. 별 3단계는 스테이지별 `stars` 임계값.
클리어 = 돼지 0, 실패 = 새 0 && 돼지 ≥ 1 && 월드 정지.

**정지(settle) 판정** — 별도로 명시하는 이유는 여기가 체감 품질을 좌우하기 때문이다.
모든 동적 바디가 `speed < 0.4 && angularSpeed < 0.05`를 **연속 30프레임** 만족하거나 **3.5초 타임아웃**.
이 규칙이 없으면 다음 새 지급 타이밍이 흔들리고 "아직 무너지는 중인데 실패 판정" 버그가 난다.

## 6. 구현 단계 (각 단계에 종료 조건)

- **P0 스캐폴딩 (0.5d)** — Vite/TS, 고정 timestep 루프, Matter 디버그 렌더.
  *종료:* 바닥 위 상자 3단이 10초간 위치 변화 1px 미만.
- **P1 슬링샷 코어 (1.5d)** — 드래그/발사/궤적/카메라, 새 1종.
  *종료:* 동일 드래그 벡터로 3회 발사 시 착지점 편차 2px 미만.
- **P2 파괴·판정 (1.5d)** — 재료 테이블, hp/파괴, settle, 클리어/실패, 점수.
  *종료:* 임시 스테이지 1개를 새 3마리 안에 클리어 → CLEAR 진입.
- **P3 상태 머신 + UI (1.0d)** — 메인/HUD/**우측 일시정지 + 다시하기/메인으로**/결과 오버레이.
  *종료:* §3 표의 합법 전이 전부 수동 통과, 비합법 전이 no-op.
- **P4 스테이지 10개 + 배치 에디터 (2.5d)** — 드래그 배치 후 JSON dump하는 개발 전용 모드(`?editor=1`),
  10 스테이지 제작 및 별 임계값 튜닝. *종료:* 완료 기준 1.
- **P5 폴리시/성능/모바일 (1.5d)** — 파티클, 사운드, DPR 캡, 터치, localStorage 진행 저장.
  *종료:* 완료 기준 2·7.

## 7. 리스크

- **R1 스택 jitter / 자체 붕괴 (가장 확률 높음).** 완화 순서: 고정 60Hz → `slop` 조정 및 최소 바디 크기 하한
  → 스테이지 로드 후 0.5초 프리세틀(입력 잠금) → 그래도 떨리면 **스테이지 시작 시 블록을 `isStatic`으로 두고
  첫 충돌 시 동적 전환**. 4단계까지 실패하면 Planck.js 교체(§1의 래퍼가 이 비용을 흡수).
- **R2 스테이지 밸런싱 시간 초과 (가장 큰 일정 리스크).** 에디터를 먼저 만들고, 스테이지당 튜닝 예산을
  40분으로 상한. 초과하면 구조를 단순화하고 다음으로 넘어간다.
- **R3 재현 불가 버그.** 고정 timestep + 시드 난수(난수는 파티클 등 시각 요소에만).
- **R4 모바일 성능.** 파티클 상한 120, `devicePixelRatio` 캡 2, 파편 수명 1.2초.
- **R5 아트 자산 없음.** 도형 + 단색 팔레트로 시작. 스프라이트는 교체 가능한 후속 작업.
- **R6 IP.** 원작 명칭·캐릭터·자산을 쓰지 않는다. 오리지널 도형/이름으로 진행.

## 8. 완료 판정 기준 (측정 방법 포함)

1. **클리어 가능성:** 10개 스테이지 전부, 지급된 새 수 이내로 클리어한 기록 **10/10**. 각 스테이지 입력
   시퀀스를 JSON으로 저장해 회귀 재생.
2. **성능(실측):** 바디 수가 가장 많은 스테이지 10에서 발사 직후 3초간 **평균 ≥ 60fps, 1% low ≥ 45fps**
   (Chrome 데스크톱, 1440×900, DPR 2). `performance.now()` 기반 계측 오버레이(`?stats=1`)로 측정.
3. **결정성:** 동일 입력 시퀀스 5회 재생 → 종료 시 돼지 제거 수와 최종 점수 동일.
4. **일시정지 정확성:** PLAYING 임의 시점 일시정지 → 물리 스텝 카운터 증가 **0**, 재개 첫 프레임 dt ≤ 33ms,
   재개 시 바디 위치 점프 없음.
5. **누수 없음:** 다시하기/메인으로를 각 20회 반복 후 Matter 바디 수가 초기값과 동일, JS heap 증가 < 10MB.
6. **상태 머신:** §3 표의 모든 합법 전이 1회 이상 실행, 비합법 전이 시도 시 상태 불변.
7. **모바일:** iOS Safari, Android Chrome에서 드래그 조준·발사·일시정지 동작.

## 9. 이번 범위에서 제외

멀티플레이, 서버 저장/리더보드(진행도는 localStorage만), 새 종류별 특수 능력(초기 1종), 사용자용 레벨 에디터
공개, 사운드 믹싱, 11스테이지 이상 확장.
