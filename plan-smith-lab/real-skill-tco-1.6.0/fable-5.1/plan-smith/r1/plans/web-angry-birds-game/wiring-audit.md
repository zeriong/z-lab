# 배선 감사 — web-angry-birds-game/plan.md

감사 대상: `plans/web-angry-birds-game/plan.md` (469행). 문서 대 문서 판정만 한다 — 빌드·실행·열어보기 없음. 각 소견은 "절 / 빠진 것 / 닫는 최소 추가" 세 줄이다.

---

## Q1. 하중 경로 ≤5홉, 모든 홉에 "통과 조건"과 "처음 참이 되는 곳"이 있는가

**결과: 5홉(§8 표), 두 열이 비어 있는 홉은 없다.** 홉 1~5 모두 "통과 조건"과 "처음 참이 되는 곳" 셀이 채워져 있고, 각 셀이 단계(S0/S1)와 절(§4.1, §5.4, §7.2, §7.4)을 가리킨다. 빠진 홉: **없음.**

단, 셀은 채워졌으나 그 셀이 가리키는 절이 조건을 실제로 성립시키지 않는 홉이 하나 있다.

- **F1 (비차단) — §8 홉 5 / §7.3 3번 / §7.4 2번째 항목.**
  - 빠진 것: 홉 5 통과 조건 "`finishStage` 가 PLAYING 에서 **1회만** 호출"의 성립 근거가 "S1: §7.4"로 적혀 있는데, §7.4 는 "(한 번만)"이라고 **주장**만 하고 보장하는 문장이 없다. §7.3 3번의 `while (G.acc >= STEP_MS) { stepPhysics(); flushRemovals(); updateFlight(); … }` 는 상태 검사를 while **진입 전**에만 하므로, 한 프레임에 스텝이 2개 이상 누적된 경우(dt > 33 ms, 탭 복귀 시 최대 6스텝) 첫 반복에서 `finishStage()` → `setState("CLEARED")` 가 되어도 다음 반복이 다시 `updateFlight()` 를 부르고, `G.endTicks++` → `>= CLEAR_DELAY_TICKS` 가 다시 참이 되어 `finishStage()` 가 두 번째 호출된다(보너스 점수 이중 가산, `saveProgress` 이중 호출, "clear" 음 이중 재생). FAILED 경로도 같은 구조로 `playSound("fail")`·`setState("FAILED")` 가 반복된다.
  - 닫는 최소 추가: §7.3 3번의 while 조건에 `G.state === "PLAYING" &&` 한 구절을 추가한다(또는 §7.4 의 `>= CLEAR_DELAY_TICKS` 를 `=== CLEAR_DELAY_TICKS` 로 고정한다는 문장 한 줄). 어느 쪽이든 홉 5 의 "처음 참이 되는 곳" 셀이 가리키는 절에 그 문장이 들어가야 한다.

---

## Q2. 콜드스타트 표가 홉 조건의 모든 상태를 덮고, 빈 셀이 없는가

**빈 셀: 없음** (15행 × 4열 전부 채워짐). 그러나 홉 "통과 조건" 셀에 등장하는 전제 중 표에 행이 없는 것이 있다.

- **F2 (비차단) — §8 콜드스타트 표.**
  - 빠진 것:
    1. 홉 2 조건 "`STAGES[0].pigs.length ≥ 1`·`birds ≥ 1`" — `STAGES` 자체(최초 값 undefined → 배열, 누가: `stages.js` 최상위 `const`, 언제: 페이지 파싱 중 CDN 뒤·`physics.js` 앞)의 행이 없다.
    2. 홉 4 조건 "돼지 `label === "pig"`" — 돼지 몸체가 월드에 존재하고 라벨이 붙는 시점(누가: `buildWorld` 가 `PIG_OPTS` 로 생성·`Composite.add`, 언제: `startStage`)의 행이 없다. 표의 `G.pigsLeft` 행은 **개수**만 다루고 몸체 존재는 다루지 않는다.
    3. 홉 3 이 전제하는 "캔버스가 포인터를 받음"은 `#screen-game` 의 `.hidden` 이 제거되는 것과 캔버스 `pointerdown/move/up/cancel` 리스너가 달려 있는 것 두 가지에 걸리는데, 표의 "오버레이 `.hidden`" 행은 오버레이 3개만 다루고(`#screen-game` 은 화면이지 오버레이가 아님), 리스너 행은 `#btn-start` 하나뿐이다.
  - 닫는 최소 추가: 표에 행 3개 — `STAGES` / 돼지 몸체(`label:"pig"`) / `#screen-game .hidden` + 캔버스 포인터 리스너 — 를 같은 4열 형식으로 추가한다.
  - 참고(소견 아님): 홉 4 의 "상대속도 ≥ `PIG_KILL_SPEED`" 는 상태·플래그가 아니라 물리 결과라 표에 둘 수 없고, §9 의 수명 제한 태그가 이미 그 불확실성을 담고 있다.

- **F3 (비차단) — §8 콜드스타트 표 `G.dragPoint` 행 / §7.2.**
  - 빠진 것: 표는 `G.dragPoint` 를 "`onPointerMove` 설정, `onPointerUp` null"로 적었고 §7.2 도 그대로다. 그런데 §7.2 `onPointerDown` 은 이동 없이도 `birdPhase = "DRAG"` 로 넣고, `onPointerUp` 은 "DRAG 일 때만 … 앵커와 `G.dragPoint` 거리"를 계산한다. pointerdown 직후 pointermove 없이 pointerup 이 오면(클릭) `G.dragPoint` 는 초기값 `null` 이므로 거리 계산이 `null` 을 읽는다 — 핸들러가 예외로 끊기면 `birdPhase` 가 DRAG 에 남아 홉 3 이 다시는 IDLE 로 돌아오지 않는다. 표의 "최초 값 null"과 "누가 바꾸나 onPointerMove" 사이에 읽는 쪽(`onPointerUp`)이 먼저 올 수 있는 순서 구멍이다.
  - 닫는 최소 추가: §7.2 `onPointerDown` 에 "`G.dragPoint = { x: SLING_ANCHOR.x, y: SLING_ANCHOR.y }` 로 초기화" 한 구절(그리고 표의 `G.dragPoint` 행 "누가 바꾸나"에 `onPointerDown` 추가).

---

## Q3. 홉이 이름 붙인 심볼/단계를 계획이 다른 곳에서 만들기로 약속했는가 — 고아 목록

홉 표에 직접 적힌 이름(`#btn-start`, `main`, `startStage`, `createEngine`, `buildWorld`, `spawnBird`, `STAGES`, `setState`, `launchBird`, `loop`, `stepPhysics`, `onCollisionStart`/`Events.on`, `G.removeQueue`, `flushRemovals`, `updateFlight`, `finishStage`, `G.*` 필드, `MIN_PULL`/`GRAB_RADIUS`/`PIG_KILL_SPEED`, `.hidden`)은 전부 §4.1·§5.1~5.6·§6 에 선언·배선 약속이 있다. 고아는 홉 셀이 가리키는 절(§5.4·§7.2·§7.3) 안에서 쓰이는 이름 중 두 개다.

- **F4 (비차단) — 고아 심볼 `canvas`, `ctx`.**
  - 빠진 것: `canvas` 는 §5.4 `toCanvasPoint` (`canvas.getBoundingClientRect()`)와 §7.2 `onPointerDown` (`canvas.setPointerCapture(e.pointerId)`)에서, `ctx` 는 §7.3 4번 (`drawFrame(ctx)`)에서 쓰이는데, §5.3 `G` 에도 §5.4 시그니처 표에도 선언 위치가 없다. §4.1 은 "어떤 JS 파일도 최상위에서 실행문을 두지 않는다"고 하고 §3 은 "모든 최상위 이름은 … §5 표에 전부 나열한다"고 하므로, 구현자는 이 두 이름을 어디에 어떻게 만들지(최상위 `let`? `G.canvas`? `main()` 클로저?) 스스로 발명해야 한다 — §2 의 "이음새를 하나도 발명하지 않는다"와 어긋난다.
  - 닫는 최소 추가: §5.3 `G` 선언 바로 아래 한 줄 — `let canvas = null, ctx = null;  // game.js 최상위, main() 첫 문장에서 getElementById("game-canvas") / getContext("2d") 로 대입` — 그리고 §5.4 `main()` 행에 그 대입을 첫 문장으로 명기.

- 부수 불일치(고아 아님, 한 단어 수정): §5.4 `setState` 행과 §12-4 는 "화면·오버레이 **7개**"라고 하지만 §5.6 골격에는 `#screen-*` 3 + `#overlay-*` 3 = **6개**다. 숫자를 6 으로 고치거나 일곱째 요소를 지목해야 §12-4 의 읽기 검증이 참/거짓으로 결정된다.

---

## Q4. build 행마다 표 밖 동사 문장이 있는가 — 행 수 대 문장 수

- 장부(§1 표)에서 `build` 로 표시된 행: **21개** (A~U).
- 표 밖 동사 문장(§1.1, 글머리표 목록): **21개** (A~U). 모든 build 행에 대응 문장이 있고, 표 안에 있는 문장은 없다. **21 / 21.**

형식 규칙("셋째 절은 둘째 절의 부정이 아니어야 한다") 위반이 셋 있다.

- **F5 (비차단) — §1.1 G·H·N.**
  - 빠진 것: 세 문장의 증상 절이 결과 절의 부정으로 끝난다 — G "직격해도 **아무것도 없어지지 않음**"(= 블록·돼지가 사라진다의 부정), H "새를 다 쓴 뒤 **아무 일도 안 일어남**"(= 제거·다음 새·실패 오버레이의 부정), N "조준 중 **아무 보조선이 없음**"(= 고무줄·궤적이 그려진다의 부정). 규칙이 금지하는 "it doesn't happen" 형태다.
  - 닫는 최소 추가: 각 증상 절을 화면에서 **보이는 상태**로 바꾼다. 예컨대 G 는 "새가 블록에 부딪힌 뒤 블록이 그대로 서 있고 HUD 돼지 수가 변하지 않음", H 는 "날아간 새가 화면 구석에 멈춘 채 조준 새가 앵커에 나타나지 않음", N 은 "드래그 중 새만 움직이고 새총 기둥과 새 사이가 비어 있음" 같은 형태.

---

## Q5. 구현자 계약 — 부활 트리거 / 해석 가능한 고정 버전 / "완료" 안의 읽기 검증

**부활 트리거:** §10 의 기각 9건 모두 굵은 글씨 트리거를 가진다(9/9). 장부의 `defer` 3건(V·X·Z)도 트리거를 가진다. **결손 없음.**

**고정 버전:** 의존성은 `matter-js@0.20.0` (jsDelivr `build/matter.min.js`) 하나이고 §4·§4.1·§13 에 같은 URL 로 세 번 적혀 서로 일치한다. 문서 자체는 "2026-09-30 존재 확인"을 적었고, 이 감사자의 지식으로도 0.20.0 은 npm 에 발행된 버전이며 경로도 패키지 관례와 일치한다. **결손 없음.**

**"완료" 안의 읽기 검증:** §13 이 명령 대신 "§12 자체 점검 7개가 증명"이라고 올바르게 선언했고, 7개 모두 파일 텍스트로 참/거짓이 정해진다. 그러나 §4 에서 "산 이유"를 적은 스택 항목 중 §12 에 대응 항목이 없는 것이 있다.

- **F6 (비차단) — §4 산 이유 ↔ §12 자체 점검 대응 누락.**
  - 빠진 것:
    1. **Matter.js** — 산 이유는 "물리를 직접 짜지 않기 위해". §12-3 은 금지 문자열(`World.`/`Runner`/`Render`/`setStatic`) 부재와 `Events.on(` 1회만 검사한다 — 라이브러리를 선언만 하고 손으로 짠 경우(규칙 본문이 든 관측 사례)를 잡는 **존재** 검사가 없다.
    2. **Pointer Events** — 산 이유는 "마우스·터치 한 경로". `pointerdown`/`pointermove`/`pointerup`/`pointercancel` 문자열 존재, `mousedown`/`touchstart` 부재, `style.css` 의 `touch-action: none` 존재 중 어느 것도 §12 에 없다.
    3. **Web Audio 합성**·**`localStorage` 키 하나** — §7.5 S4·S6 의 "검증(읽기)"(`localStorage` 가 `try` 안에서만, `playSound` 첫 줄이 muted 검사 등)은 읽기 검증이지만 §12 에 편입되지 않았고, §13 은 "§12 의 7개"만 증명으로 인정하므로 그 검증들은 완료 조건 밖에 있다.
  - 닫는 최소 추가: §12 에 항목 두 줄 — "8. `physics.js` 에 `Engine.update(`, `Bodies.rectangle(`, `Bodies.circle(`, `Composite.add(` 문자열이 각 1회 이상 있다; `game.js` 에 `pointerdown`·`pointermove`·`pointerup`·`pointercancel` 이 각 1회 이상, `mousedown`·`touchstart` 는 없다; `style.css` 에 `touch-action: none` 이 있다." / "9. §7.5 S3~S6 의 '검증(읽기)' 조건이 전부 참이다." — 그리고 §13 의 "7개"를 "9개"로.

- **F7 (비차단) — §12 "사람 검수 항목" 4개가 완료 정의 제목 아래에 있다.**
  - 빠진 것: 4개 항목 모두 "브라우저에서 `file://` 로 연 `index.html` … 플레이"라는 **실행·관찰형** 기준이다. 구현자는 열거나 실행할 수 없으므로 완료 조건으로는 만족 불가이며, 규칙이 "run, open, watch or inspect" 를 계획서의 검증에서 배제하는 바로 그 형태다. §13 이 7개만 증명으로 세는 것과도 어긋나 "완료"의 범위가 문서 안에서 둘로 갈린다.
  - 닫는 최소 추가: 그 목록 위에 소제목 한 줄 — "인수 검수(구현자 완료 조건이 **아님**; §9 첫 검수와 같은 검수자가 수행)" — 를 넣어 §12 의 "완료"를 1~7(+F6 의 8·9)로 한정한다.

---

## 판정

- **차단(경로가 종이 위에서 닫히지 않음): 0건.** 홉 1~5 는 모두 두 열이 채워졌고, 이름 붙은 심볼은 `canvas`/`ctx` 두 개를 제외하면 전부 선언 약속이 있으며, 그 둘도 경로의 논리를 끊지는 않는다.
- **비차단: 7건** — F1(홉 5 "1회만" 보장 부재), F2(콜드스타트 행 3개 누락), F3(`G.dragPoint` 읽기-쓰기 순서 구멍), F4(고아 `canvas`/`ctx` + "7개/6개" 숫자 불일치), F5(동사 문장 G·H·N 의 부정형 증상), F6(§4 산 이유 4건의 §12 읽기 검증 누락), F7(§12 안의 실행형 검수 4개).
- **의도 수준(사용자 판단 필요): 없음.** 7건 모두 한두 줄 추가로 닫힌다. 문서가 스스로 고백한 물리 임계값(§9 수명 제한, §8 홉 4 의 상대속도)의 검수 의존은 무실행 제약에서 오는 것이지 문서 결손이 아니며, 이 감사의 소견에 넣지 않았다.
