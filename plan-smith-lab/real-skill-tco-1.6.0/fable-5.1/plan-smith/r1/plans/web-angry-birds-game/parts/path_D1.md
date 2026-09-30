> plan-smith · part 6/9 · D1 · index: [plan.md](../plan.md)

## 8. 하중 경로 — "당겨서 쏘면 돼지가 죽고 클리어가 뜬다"

후보 그대로 채택한다(메인 "게임 시작" → 월드 구성 → 드래그·발사 → 물리 스텝·충돌 → 클리어). 이 경로가 안 닫히면 10 스테이지도 일시정지도 장식이기 때문이며, 후보와 다른 점은 새를 `isStatic` 토글이 아니라 "발사 순간 월드에 추가"하는 것뿐이다(§5.4 `spawnBird`/`launchBird`).

| 홉 | 이름 | 통과 조건 | 그 조건이 처음 참이 되는 곳 |
|---|---|---|---|
| 1 | `#btn-start` click → `startStage(0)` | `main()` 이 `load` 에서 실행돼 리스너를 달았고 `window.Matter` 가 정의됨 | S0: §4.1 스크립트 순서(CDN 이 첫 태그) + `game.js` 끝의 `addEventListener("load", main)` |
| 2 | `startStage(0)` → `createEngine()`·`buildWorld(G.engine, STAGES[0])`·`spawnBird()` | `G.engine` 이 null 에서 엔진으로 바뀌고, `STAGES[0].pigs.length ≥ 1`·`birds ≥ 1`, 결과 `G.pigsLeft ≥ 1`, `G.birdPhase === "IDLE"`, `setState("PLAYING")` 로 오버레이 hidden | S1: `startStage` 본문(§5.4 행) + `stages.js` 스테이지 1 원문 |
| 3 | 캔버스 pointerdown→move→up → `launchBird(G.dragPoint)` | `G.state === "PLAYING"` 이고 `birdPhase` 가 IDLE→DRAG 로 갔고(잡기 반경 ≤ 40) 당김 ≥ `MIN_PULL`; 오버레이가 `display:none` 이라 캔버스가 포인터를 받음 | S1: §7.2 핸들러 + 홉 2 의 IDLE; `.hidden` 규칙은 S0 |
| 4 | `loop` → `stepPhysics()` → `collisionStart` → `G.removeQueue` → `flushRemovals()` → `G.pigsLeft -= 1` | `G.rafId !== 0`(루프 시작됨), 상태 PLAYING, 리스너가 `createEngine` 에서 등록됨, 돼지 `label === "pig"`, 새와 돼지 상대속도 ≥ `PIG_KILL_SPEED`(=6; 당김 90px 이면 초기 속도 16.2 로 충분) | S1: `startStage` 가 `requestAnimationFrame(loop)` 호출; `createEngine` 의 `Events.on`; `buildWorld` 의 label |
| 5 | `updateFlight()` : `G.pigsLeft === 0` → `endTicks` 60 → `finishStage()` → `setState("CLEARED")` 오버레이 표시 | `pigsLeft` 가 `buildWorld` 에서만 설정되고 `flushRemovals` 에서만 감소; `finishStage` 가 PLAYING 에서 1회만 호출 | S1: §7.4 + §7.3 3번(while 조건의 `G.state === "PLAYING"` 검사 — 전이 후 같은 프레임의 남은 스텝이 `updateFlight` 를 다시 부르지 않는다) |

콜드스타트 표 — "통과 조건"에 나온 모든 상태:

| 상태/플래그 | 최초 값 | 누가 바꾸나 | 언제 실행되나 |
|---|---|---|---|
| `window.Matter` | undefined | CDN `<script>` 실행 | 페이지 파싱 중, `stages.js` 보다 먼저 |
| `STAGES` | undefined | `stages.js` 최상위 `const STAGES = [...]`(§5.4 첫 행, §6 객체 10개) | 페이지 파싱 중, CDN 태그 뒤·`physics.js` 앞(§4.1 순서) |
| `canvas` / `ctx` | `null` / `null` | `main()` 첫 문장(§5.3) | `window` `load` 이벤트 |
| `#btn-start` 리스너 | 없음 | `main()` | `window` `load` 이벤트 |
| `#screen-game` `.hidden` + 캔버스 포인터 리스너 | HTML 에서 hidden / 리스너 없음 | `setState("PLAYING")` 이 `.hidden` 제거; `main()` 이 `canvas` 에 `pointerdown`/`pointermove`/`pointerup`/`pointercancel` 4개를 `addEventListener`(§5.6 배선 문단) | `startStage` 끝(첫 "게임 시작" 클릭) / `window` `load` 이벤트 |
| `G.state` | `"MENU"` | `setState()` 만 | `main()` → MENU; `startStage` → PLAYING; 이후 §7.1 |
| `G.engine` | `null` | `startStage` (`createEngine()` 1회) | 첫 "게임 시작" 클릭 |
| `collisionStart` 리스너 | 없음 | `createEngine` 의 `Events.on` | `G.engine` 생성 시 1회 |
| 돼지 몸체(`label:"pig"`) | 월드에 없음 | `buildWorld` 가 `stage.pigs` 마다 `Bodies.circle(p.x, p.y, p.r, PIG_OPTS)` 로 만들어 `Composite.add`; `flushRemovals` 가 `Composite.remove` | `startStage` 안(`setState("PLAYING")` 전) / 루프 스텝 안 |
| `G.pigsLeft` | `0` | `buildWorld` 가 설정, `flushRemovals` 가 −1 | 스테이지 시작 / 루프의 스텝마다 |
| `G.birdsLeft` | `0` | `buildWorld` 가 설정, `launchBird` 가 −1 | 스테이지 시작 / pointerup |
| `G.bird` | `null` | `spawnBird` | `startStage`, 이후 `updateFlight` 가 다음 새 |
| `G.birdPhase` | `"NONE"` | `spawnBird`→IDLE, `onPointerDown`→DRAG, `launchBird`→FLYING, `updateFlight`→NONE | 각 함수 실행 시 |
| `G.dragPoint` | `null` | `onPointerDown` 이 `SLING_ANCHOR` 복사본으로 초기화, `onPointerMove` 갱신, `onPointerUp` null | 드래그 시작 / 드래그 중 / 발사 |
| `G.removeQueue` | `[]` | `onCollisionStart` push, `flushRemovals` 비움 | 스텝 안 |
| `G.endTicks` | `0` | `startStage` 0, `updateFlight` +1 | 돼지 0 이후 스텝마다 |
| `G.rafId` / `G.acc` / `G.lastTime` | `0` / `0` / `0` | `startStage`(첫 rAF), `loop` | 첫 스테이지 시작부터 계속 |
| 오버레이 `.hidden` | HTML 에서 셋 다 hidden | `setState` 만 | 상태 전이 시 |
| `G.audioCtx` | `null` | `onPointerDown`/버튼 클릭 | 첫 사용자 입력 |

일시정지 배선은 하중 경로가 아니지만 S2 의 검증 조건으로 별도 고정했다(§7.5 S2).

---

> plan-smith · next: [numbers_E0.md](numbers_E0.md)
