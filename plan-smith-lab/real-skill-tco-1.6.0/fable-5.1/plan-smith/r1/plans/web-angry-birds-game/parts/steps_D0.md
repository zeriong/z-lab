> plan-smith · part 5/9 · D0 · index: [plan.md](../plan.md)

## 7. 접근과 단계 (의존 순서; 각 단계는 전제 → 산출 → 읽어서 확인하는 검증 → 섬기는 행)

### 7.1 상태 전이와 화면 가시성 (`setState` 가 강제)

| 상태 | 보이는 것 | 들어오는 전이 |
|---|---|---|
| MENU | `#screen-menu` | `main()`, `goToMenu()` |
| SELECT | `#screen-select` | `#btn-select` |
| PLAYING | `#screen-game` (캔버스·HUD·`#btn-pause`), 오버레이 전부 hidden | `startStage`, `togglePause`(PAUSED→) |
| PAUSED | `#screen-game` + `#overlay-pause` | `togglePause`(PLAYING→) |
| CLEARED | `#screen-game` + `#overlay-cleared` | `finishStage` |
| FAILED | `#screen-game` + `#overlay-failed` | `updateFlight` |

그 외 전이는 없다. 오버레이가 열린 상태(PAUSED/CLEARED/FAILED)에서는 `loop` 가 물리·입력을 건너뛴다(그리기는 계속해 마지막 프레임이 보인다).

### 7.2 입력 규칙 (Pointer Events, 캔버스에만)

- `onPointerDown`: `G.state !== "PLAYING"` 또는 `G.birdPhase !== "IDLE"` 이면 무시. `toCanvasPoint(e)` 와 `G.bird.position` 거리 ≤ `GRAB_RADIUS` 면 `G.birdPhase = "DRAG"`, `G.dragPoint = { x: SLING_ANCHOR.x, y: SLING_ANCHOR.y }` (앵커 복사본으로 초기화 — 이동 없이 곧바로 pointerup 이 와도 `onPointerUp` 이 `null` 을 읽지 않고 "당김 < `MIN_PULL`" 분기로 빠진다), `canvas.setPointerCapture(e.pointerId)`, `G.audioCtx` 없으면 생성.
- `onPointerMove`: DRAG 일 때만 `G.dragPoint = clampDrag(toCanvasPoint(e))`; `Body.setPosition(G.bird, G.dragPoint)`.
- `onPointerUp`(및 `pointercancel`): DRAG 일 때만. 앵커와 `G.dragPoint` 거리 < `MIN_PULL` 이면 새를 앵커로 되돌리고 IDLE; 아니면 `launchBird(G.dragPoint)`, `playSound("launch")`, `G.dragPoint = null`.

### 7.3 프레임 루프 `loop(ts)`

1. `G.rafId = requestAnimationFrame(loop)` (항상 첫 줄).
2. `dt = Math.min(ts - G.lastTime, MAX_FRAME_MS)`; 첫 호출(`G.lastTime === 0`)이면 dt = STEP_MS; `G.lastTime = ts`.
3. `G.state === "PLAYING"` 이면 `G.acc += dt` 후 `while (G.state === "PLAYING" && G.acc >= STEP_MS) { stepPhysics(); flushRemovals(); updateFlight(); updateParticles(); G.acc -= STEP_MS; }`; 아니면 `G.acc = 0`. while 조건 안의 상태 검사가 있어야 하는 이유: 한 프레임에 스텝이 여러 개 누적된 경우(dt > 33 ms, 탭 복귀 시 최대 6스텝) 첫 스텝의 `updateFlight` 가 `finishStage()`→`setState("CLEARED")` 또는 `setState("FAILED")` 로 전이하면, 남은 스텝이 `updateFlight` 를 다시 불러 같은 전이를 반복하는 것을 이 검사가 끊는다 — §8 홉 5 의 "1회만"은 여기서 성립한다.
4. `G.state !== "MENU" && G.state !== "SELECT"` 이면 `drawFrame(ctx)`, `updateHud()`.

### 7.4 판정 규칙 `updateFlight()` (PLAYING 에서만 호출됨)

- FLYING 이면 `flightTicks++`; `G.bird.speed < REST_SPEED` 면 `restTicks++` 아니면 0. 종료 조건: `restTicks >= REST_TICKS` 또는 `flightTicks >= MAX_FLIGHT_TICKS` 또는 새 x < −OUT_MARGIN / x > CANVAS_W+OUT_MARGIN / y > CANVAS_H+OUT_MARGIN. 종료 시 `Composite.remove`, `G.birdPhase = "NONE"`.
- 그 다음: `G.pigsLeft === 0` 이면 `G.endTicks++`, `>= CLEAR_DELAY_TICKS` 에서 `finishStage()` (한 번만 — `finishStage` 가 `setState("CLEARED")` 로 상태를 바꾸는 순간 §7.3 3번의 while 조건이 같은 프레임의 남은 스텝을 끊고, 다음 프레임부터는 PLAYING 이 아니라 스텝 자체가 돌지 않는다). 아니면 `birdPhase === "NONE"` 일 때 `birdsLeft > 0` 이면 `spawnBird()`, `birdsLeft === 0` 이면 `playSound("fail")` 후 `setState("FAILED")`.
- `finishStage()`: `stars = Math.min(3, 1 + G.birdsLeft)`; `G.score += G.birdsLeft * SCORE_BIRD_BONUS`; `progress.unlocked = Math.max(progress.unlocked, Math.min(10, G.stageIndex + 2))`; `progress.stars[String(G.stageIndex+1)] = Math.max(기존, stars)`; `saveProgress()`; 제목 = 마지막이면 "모든 스테이지 클리어!" 아니면 `"스테이지 N 클리어!"`; `#btn-next` 는 마지막이면 `.hidden` 추가, 아니면 제거(이 한 요소의 `.hidden` 만 `setState` 밖에서 바뀐다); `playSound("clear")`; `setState("CLEARED")`.
- 충돌 판정(`onCollisionStart`): 쌍마다 `rel = Vector.magnitude(Vector.sub(a.velocity, b.velocity))`. 한쪽이 `pig` 이고 `rel >= PIG_KILL_SPEED` 면 그 돼지를 큐에(중복 방지: `body.plugin.dead = true` 표시, 이미 표시된 몸체는 건너뜀). 한쪽이 `block` 이고 `rel >= BLOCK_DAMAGE_MIN` 면 `plugin.hp -= rel`, `hp <= 0` 이면 큐에(같은 표시). 상대가 지면인 경우도 같은 규칙(높이에서 떨어진 블록은 깨진다). `flushRemovals`: 돼지 → `SCORE_PIG`, 플래시, `playSound("pop")`; 블록 → `MATERIALS[m].score`, 파편 8개, `playSound("hit")`.

### 7.5 단계

- **S0 골격** — 전제: 없음. 산출: `index.html`(§5.6 골격 + §4.1 스크립트 순서), `style.css`(§5.6 규칙), 빈 `stages.js`/`physics.js`/`render.js`/`game.js` 에 §5.1~5.3 블록과 `main()`·`setState()`·부팅 에러. 검증(읽기): 스크립트 태그 5개가 §4.1 순서 그대로; `main()` 첫 문장이 `canvas`/`ctx` 대입이고 둘째 문장이 Matter 존재 검사. 섬기는 행: L, T.
- **S1 얇은 종단 슬라이스** — 전제: S0. 산출: `stages.js` 에 스테이지 1 만이라도 §5.5 원문으로; `createEngine`/`buildWorld`/`spawnBird`/`clampDrag`/`launchVelocity`/`launchBird`/`stepPhysics`/`onCollisionStart`; `drawFrame` 의 몸체·발사 전 새 그리기; `startStage`/`loop`/`flushRemovals`/`updateFlight`/`finishStage`/포인터 3종; `#btn-start` 배선. 검증(읽기): §8 하중 경로 5홉의 심볼이 모두 정의돼 있고 콜드스타트 표의 "누가 바꾸나" 함수가 존재. 섬기는 행: D, E, F, G, H, I.
- **S2 상태 머신 전부** — 전제: S1. 산출: `togglePause`/`restartStage`/`nextStage`/`goToMenu`, 오버레이 3개 버튼 전부 배선, `setState` 가시성 표 7.1 완성, FAILED 경로. 검증(읽기): §5.6 의 버튼 id 13개가 각각 `game.js` 에 한 번 이상 등장; `#btn-pause` 가 `#screen-game` 안. 섬기는 행: J, K, P, C.
- **S3~S6 은 S2 뒤 서로 독립이며 어느 순서로 해도 된다.**
- **S3 조준 UX** — 산출: `predictTrajectory`, 고무줄 2줄(기둥 (140,395),(160,395) → 새 중심), 점 30개. 검증: `drawFrame` 안에 `G.birdPhase === "DRAG"` 분기 존재. 행: N.
- **S4 점수·별·HUD·영속·스테이지 선택** — 산출: `updateHud`, `finishStage` 의 별·보너스, `loadProgress`/`saveProgress`(try/catch), `renderStageSelect`(잠금 `disabled`, 별 문자열). 검증: `localStorage` 문자열이 `try` 블록 안에서만 등장; `renderStageSelect` 가 `STAGES.length` 로 반복. 행: B, M, O, Q, U.
- **S5 콘텐츠** — 산출: §6 표의 스테이지 2~10 을 `STAGES` 에 추가. 검증: 객체 10개, `id` 1..10 오름차순, 모든 `pigs.length ≥ 1`, `birds ≥ 3`. 행: A.
- **S6 폴리시 — 파괴 피드백과 소리** (이름 붙은 별도 단계라서 생략되지 않는다) — 산출: `updateParticles`, 파편/플래시 생성, `playSound` 5종(§7.6), `#btn-mute` 라벨·영속. 검증: `flushRemovals` 에 `G.particles.push` 와 `playSound(` 가 있고, `playSound` 첫 줄이 muted 검사. 행: R, S.

### 7.6 합성음 사양 (`playSound`)

| name | 파형 | 주파수 | 길이 | 언제 |
|---|---|---|---|---|
| launch | sawtooth | 300→150 Hz 선형 | 0.15 s | 발사 |
| hit | square | 120 Hz | 0.08 s | 블록 소멸 |
| pop | sine | 600→900 Hz | 0.12 s | 돼지 제거 |
| clear | sine | 523, 659, 784 Hz 차례로 | 각 0.12 s | 클리어 |
| fail | sine | 220→110 Hz | 0.4 s | 실패 |

게인 0.15, 각 음은 `OscillatorNode` + `GainNode` 를 만들어 `start()` 후 길이만큼 지나 `stop()`.

---

> plan-smith · next: [path_D1.md](path_D1.md)
