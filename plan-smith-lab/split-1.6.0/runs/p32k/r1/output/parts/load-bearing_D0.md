> plan-smith · part 6/8 · D0 · index: [plan.md](../plan.md)

## 8. Load-bearing path — 이 사슬이 닫히지 않으면 나머지는 장식이다

경로: **메인 메뉴에서 '게임 시작'을 눌러 → 스테이지가 서고 → 루프가 물리를 돌리고 → 당겨 놓은 새가 날아가 → 돼지가 사라지고 클리어가 뜬다.**

| hop | 이름 | 통과 조건 | 그 조건이 처음 참이 되는 곳 |
|---|---|---|---|
| 1 | `#btn-play` click → `startStage(GAME.progress.unlocked - 1)` | `init()`이 로드 시 실행돼 리스너를 걸었고 `STAGES[0]`이 존재 | S2의 `window.addEventListener('load', init)` + S3의 `stages.js` 1번 스테이지 정의 |
| 2 | `startStage(i)` → `buildStage(GAME.engine, STAGES[i])` + `spawnBirdAtSling(GAME.engine)` | `typeof Matter !== 'undefined'` 이고 `GAME.engine !== null` | §5.1의 matter CDN `<script>`가 `game.js`보다 앞 + S3의 `init()` 안 `GAME.engine = createEngine()` |
| 3 | `loop()`가 `Engine.update(GAME.engine, STEP_MS)`를 호출 | `GAME.state === 'PLAYING'` | S7 이전에는 `startStage()` 마지막 줄 `GAME.state = 'PLAYING'` (루프 자체는 `init()`에서 1회 시작) |
| 4 | `onPointerUp` → `launchBird()`가 `Body.setVelocity(GAME.bird, v)` | `GAME.state==='PLAYING'` && `GAME.phase==='AIM'` && `GAME.dragging===true` && `GAME.bird.isStatic===false` | `phase`/`bird`: `spawnBirdAtSling()` 직후 `GAME.phase='AIM'; GAME.bird=<새 바디>`; `dragging`: `onPointerDown`; `isStatic=false`: §5.7 `launchBird()` 첫 줄 |
| 5 | `collisionStart` → `damageBody(pig)` → `sweepDestroyed()` → `checkOutcome()` → `GAME.state='CLEAR'` → `showOverlay('overlay-clear')` | `GAME.pigsLeft === 0` && `GAME.state === 'PLAYING'` | `pigsLeft` 초기값: `startStage()`의 `GAME.pigsLeft = GAME.pigs.length`; 0 도달: `sweepDestroyed()`의 재계산 줄 |

### 8.1 콜드 스타트 표 — 빈 칸 없음

| 상태/조건 | 최초 진입 시 값 | 바꾸는 주체 | 언제 실행되나 |
|---|---|---|---|
| `Matter` 전역 | 로드 전엔 undefined | 브라우저의 CDN 스크립트 실행 | `game.js` 평가 이전(§5.1 태그 순서) |
| `GAME.engine` | `null` (§5.4) | `init()`의 `GAME.engine = createEngine()` | `load` 이벤트 1회 |
| `collisionStart` 핸들러 | 미바인딩 | `init()`의 `bindCollisions(GAME.engine)` | `load` 이벤트 1회 |
| rAF 루프 | 미기동 | `init()`의 `requestAnimationFrame(loop)` | `load` 이벤트 1회 |
| `#btn-play` 리스너 | 미바인딩 | `init()`의 버튼 8개 배선 블록 | `load` 이벤트 1회 |
| `STAGES` | 배열 10개 (정적 데이터) | 없음(상수) | `stages.js` 평가 시점 |
| `GAME.state` | `'MENU'` | `startStage`→`'PLAYING'`, `pauseGame`→`'PAUSED'`, `resumeGame`→`'PLAYING'`, `finishStage`→`'CLEAR'`/`'FAIL'`, `goMenu`→`'MENU'` | 각 버튼 클릭 / 판정 시점 |
| `GAME.phase` | `'AIM'` | `launchBird`→`'FLYING'`, `resolveShot`→`'AIM'` | 발사 시 / 비행 종료 시 |
| `GAME.bird` | `null` | `spawnBirdAtSling()` 반환값 대입 | `startStage` 끝, `resolveShot` 안(남은 새 있을 때) |
| `GAME.bird.isStatic` | `true` (슬링에 고정) | `Body.setStatic(bird, false)` | `launchBird()` 첫 줄 |
| `GAME.dragging` | `false` | `onPointerDown`→true, `onPointerUp`→false | 포인터 입력 |
| `GAME.pigsLeft` | `0` | `startStage`에서 `GAME.pigs.length` 대입, 이후 `sweepDestroyed`가 재계산 | 스테이지 로드 / 매 프레임 파괴 처리 후 |
| `GAME.birdsLeft` | `0` | `startStage`에서 `stage.birds` 대입, `resolveShot`에서 1 감소 | 스테이지 로드 / 비행 종료 |
| `GAME.score` | `0` | `sweepDestroyed`(파괴), `finishStage`(잔여 새 보너스) | 파괴 시 / 클리어 시 |
| `GAME.progress` | `{unlocked:1, best:{}}` | `init()`의 `GAME.progress = loadProgress()` | `load` 이벤트 1회, 이후 `finishStage`에서 갱신·저장 |
| `AudioContext` | 미생성 | `playSfx`의 첫 호출 | 첫 클릭(게임 시작) 이후 |

---

> plan-smith · next: [risks_E0.md](risks_E0.md)
