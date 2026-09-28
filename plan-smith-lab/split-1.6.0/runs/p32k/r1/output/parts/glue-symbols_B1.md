> plan-smith · part 3/8 · B1 · index: [plan.md](../plan.md)

### 5.3 심볼 표 — 이 시그니처 그대로 정의한다

| 파일 | 심볼 | 시그니처 | 계약 |
|---|---|---|---|
| stages.js | `W`, `H` | `const W = 1280, H = 720` | 캔버스 논리 크기 |
| stages.js | `GROUND_Y` | `const GROUND_Y = 620` | 지면 윗면 y |
| stages.js | `SLING` | `const SLING = { x: 210, y: 520, maxPull: 120 }` | 새총 고정점과 최대 당김 |
| stages.js | `STEP_MS`, `G_STEP`, `LAUNCH_K` | §5.4 참조 | 물리·궤적의 단일 출처 |
| stages.js | `IMPACT_MIN`, `SETTLE_SPEED`, `SETTLE_FRAMES`, `FLIGHT_MAX_FRAMES` | §5.4 참조 | 판정 임계값 |
| stages.js | `SCORE` | `const SCORE = { pig: 5000, block: 500, birdLeft: 10000 }` | 점수 단가 |
| stages.js | `STAGES` | `const STAGES = [ … ]` | 길이 10, §5.11 스키마 |
| physics.js | `MATERIAL` | `const MATERIAL = { wood:{…}, ice:{…}, stone:{…} }` | hp/density/color |
| physics.js | `PIG_HP` | `const PIG_HP = 15` | 돼지 내구도 |
| physics.js | `createEngine()` | `-> engine` | 엔진 1회 생성, 중력 설정. **게임당 한 번만 호출** |
| physics.js | `bindCollisions(engine)` | `-> void` | `collisionStart` 1회 바인딩. 두 번 부르면 데미지가 두 배가 된다 |
| physics.js | `buildStage(engine, stage)` | `-> { blocks: Body[], pigs: Body[] }` | 월드를 비우고 지면·블록·돼지를 세운다 |
| physics.js | `spawnBirdAtSling(engine)` | `-> Body` | `isStatic:true`인 새를 슬링 위치에 놓는다 |
| physics.js | `impactSpeed(a, b)` | `-> number` | 두 바디의 상대 속도 크기 |
| physics.js | `damageBody(body, impact)` | `-> boolean` | hp 차감. 0 이하면 `body.destroyed = true` 후 true |
| physics.js | `removeBody(engine, body)` | `-> void` | `Composite.remove` 래퍼 |
| render.js | `drawFrame(ctx, game)` | `-> void` | 한 프레임 전체 |
| render.js | `drawBackground(ctx)` | `-> void` | 하늘·언덕·지면 |
| render.js | `drawBody(ctx, body)` | `-> void` | 원이면 arc, 아니면 `body.vertices` 폴리곤 |
| render.js | `drawSling(ctx, game)` | `-> void` | 기둥 2개 + 당김 중 고무줄 |
| render.js | `drawTrajectory(ctx, points)` | `-> void` | 점 배열 렌더 |
| render.js | `drawParticles(ctx, game)` | `-> void` | 파편 |
| render.js | `drawLoadError(ctx)` | `-> void` | `physics library not loaded` 문구 |
| game.js | `canvas`, `ctx` | `const canvas = document.getElementById('game')` / `const ctx = canvas.getContext('2d')` | 스크립트가 body 끝에 있으므로 최상위 선언 가능 |
| game.js | `GAME` | `const GAME = { … }` | §5.4 초기 상태 |
| game.js | `init()` | `-> void` | `window.addEventListener('load', init)` 로 1회 |
| game.js | `loop()` | `-> void` | rAF 루프, `init`에서 1회 시작 |
| game.js | `goMenu()` | `-> void` | 월드 비우고 `state='MENU'` |
| game.js | `startStage(index)` | `-> void` | 스테이지 로드 + `state='PLAYING'` |
| game.js | `restartStage()` | `-> void` | `startStage(GAME.stageIndex)` |
| game.js | `pauseGame()` / `resumeGame()` | `-> void` | `state` 전환 + 오버레이 |
| game.js | `finishStage(cleared)` | `-> void` | 점수 정산·저장·오버레이 |
| game.js | `checkOutcome()` | `-> void` | 클리어/실패 판정 |
| game.js | `updateShotPhase()` | `-> void` | 비행 종료 감지 |
| game.js | `worldSettled()` | `-> boolean` | 새·블록·돼지 전부 저속인가 |
| game.js | `resolveShot()` | `-> void` | 새 회수 + 다음 장전 |
| game.js | `sweepDestroyed()` | `-> void` | 파괴 표시된 바디 일괄 제거 |
| game.js | `launchBird()` | `-> void` | §5.7 순서 그대로 |
| game.js | `pullPoint(p)` | `-> {x,y}` | 최대 당김 클램프 |
| game.js | `pullVelocity(p)` | `-> {x,y}` | 발사 속도(px/step) |
| game.js | `trajectoryPoints(p)` | `-> Array<{x,y}>` | 미리보기 점 |
| game.js | `canvasPoint(e)` | `-> {x,y}` | 포인터 → 캔버스 좌표 |
| game.js | `onPointerDown(e)` / `onPointerMove(e)` / `onPointerUp(e)` | `-> void` | 조준·발사 |
| game.js | `syncHud()` | `-> void` | HUD 3칸 갱신 |
| game.js | `showOverlay(id)` / `hideOverlays()` | `-> void` | `.hidden` 토글 |
| game.js | `buildStageGrid()` | `-> void` | 10칸 버튼 생성 |
| game.js | `starsFor(stage, score)` | `-> number` | 1~3 |
| game.js | `loadProgress()` | `-> {unlocked, best}` | §5.10 |
| game.js | `saveProgress(progress)` | `-> void` | §5.10 |
| game.js | `playSfx(kind)` | `-> void` | kind: `'launch'|'hit'|'pig'|'clear'|'fail'` |
| game.js | `spawnDebris(x, y, color, n)` | `-> void` | 파편 생성 |
| game.js | `updateParticles()` | `-> void` | 파편 갱신·수거 |

### 5.4 공용 상수와 초기 상태 — 그대로 복사

`stages.js` 맨 위:

```js
const W = 1280, H = 720;
const GROUND_Y = 620;                  // 지면 윗면
const SLING = { x: 210, y: 520, maxPull: 120 };
const STEP_MS = 16.666;                // Engine.update 고정 델타
const G_STEP = 0.2777;                 // = gravity.y(1) * gravity.scale(0.001) * STEP_MS^2
const LAUNCH_K = 0.18;                 // 당긴 픽셀 -> px/step
const IMPACT_MIN = 4;                  // 이보다 느린 접촉은 무피해
const SETTLE_SPEED = 0.4;              // 정지 판정 속도 (px/step)
const SETTLE_FRAMES = 45;              // 연속 정지 프레임 수
const FLIGHT_MAX_FRAMES = 420;         // 7초 강제 종료
const SCORE = { pig: 5000, block: 500, birdLeft: 10000 };
```

`game.js` 상단:

```js
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const GAME = {
  state: 'MENU',          // 'MENU' | 'PLAYING' | 'PAUSED' | 'CLEAR' | 'FAIL'
  phase: 'AIM',           // 'AIM' | 'FLYING'
  stageIndex: 0,
  score: 0,
  birdsLeft: 0,
  pigsLeft: 0,
  engine: null,
  bird: null,             // Matter.Body | null
  blocks: [],
  pigs: [],
  particles: [],
  dragging: false,
  dragPoint: { x: SLING.x, y: SLING.y },
  settleFrames: 0,
  flightFrames: 0,
  clearDelay: 0,
  progress: { unlocked: 1, best: {} }
};
```

### 5.5 포인터 → 캔버스 좌표 (그대로 복사)

```js
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width),
           y: (e.clientY - r.top) * (H / r.height) };
}
```

`pointermove`/`pointerup`은 `window`에 건다(캔버스 밖에서 손을 떼도 발사돼야 한다). `pointerdown`만 캔버스에 건다.

> plan-smith · next: [glue-code_B2.md](glue-code_B2.md)
