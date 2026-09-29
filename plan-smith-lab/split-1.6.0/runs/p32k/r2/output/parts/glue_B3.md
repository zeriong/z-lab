> plan-smith · part 6/11 · B3 · index: [plan.md](../plan.md)

### 5.9 메인 루프 — 일시정지 게이트가 여기 하나뿐이다 (그대로 복사)

```js
function loop() {
  if (GAME.state === 'PLAYING') {
    Engine.update(GAME.engine, STEP_MS);
    sweepDestroyed();
    updateParticles();
    updateShotPhase();
    checkOutcome();
    syncHud();
  }
  if (typeof Matter === 'undefined') drawLoadError(ctx);
  else drawFrame(ctx, GAME);
  requestAnimationFrame(loop);
}
```

렌더는 상태와 무관하게 매 프레임 돈다. 그래서 일시정지·클리어·실패 오버레이 뒤에 정지 화면이 그대로 비친다.

### 5.10 저장소 — 예외가 게임을 죽이지 않게 (그대로 복사)

```js
const MEM = { data: null };

function loadProgress() {
  try {
    const raw = localStorage.getItem('ab.progress.v1');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* file:// 등에서 접근 차단 — 메모리로 대체 */ }
  return MEM.data || { unlocked: 1, best: {} };
}

function saveProgress(progress) {
  MEM.data = progress;
  try { localStorage.setItem('ab.progress.v1', JSON.stringify(progress)); } catch (e) {}
}
```

`playSfx`도 같은 형태로 전체를 `try { … } catch (e) {}` 로 감싸고, `AudioContext`는 **첫 호출 때** 만든다(로드 시점에 만들면 브라우저 자동재생 정책이 정지 상태로 붙잡는다).

### 5.11 스테이지 스키마 + 1번 스테이지 완본 (그대로 복사, 2~10번은 §6 표대로)

```js
const STAGES = [
  {
    id: 1, name: '첫 발사', birds: 3, star2: 5500, star3: 16000,
    blocks: [
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 548, w: 140, h: 24, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 950, y: 512, r: 22 } ]
  }
  // … id 2 ~ 10
];
```

좌표 규칙 4가지:
- `x, y`는 **중심** 좌표다(Matter의 `Bodies.rectangle`/`circle`이 중심 기준).
- 지면 위에 놓는 블록은 `y = GROUND_Y - h/2`.
- 위에 얹는 블록은 `y = (아래 블록 윗면) - h/2`, 겹치지 않게 1~2px 띄운다. 초기에 겹쳐 있으면 시작하자마자 구조물이 튕겨 날아간다.
- 배치는 x가 400~1240 사이에만 둔다(그 왼쪽은 새총 사거리 안쪽이라 난이도가 없다).

`buildStage`가 하는 일 순서: `Composite.clear(engine.world, false)` → 지면 `Bodies.rectangle(W/2, GROUND_Y + 60, W + 400, 120, { isStatic: true, friction: 0.9 })` → `stage.blocks`를 `MATERIAL[mat]`의 hp/density/color를 붙여 생성 → `stage.pigs`를 `hp = PIG_HP`로 생성 → 배열 반환.

재질 값(§5.3 `MATERIAL`):

```js
const MATERIAL = {
  wood:  { hp: 26, density: 0.0018, color: '#c8873c' },
  ice:   { hp: 13, density: 0.0011, color: '#9ad8e8' },
  stone: { hp: 52, density: 0.0032, color: '#9aa0a6' }
};
const PIG_HP = 15;
```

새: `Bodies.circle(SLING.x, SLING.y, 18, { isStatic: true, density: 0.004, restitution: 0.35, friction: 0.6, label: 'bird' })` — 새에는 `hp`를 주지 않는다(그래서 `damageBody`가 새를 부수지 않는다).

`drawBody`는 `body.vertices`가 이미 회전이 반영된 **월드 좌표**라는 점에 의존한다. `ctx.rotate`를 추가로 걸면 회전이 두 번 적용된다.

---

> plan-smith · next: [stages_C0.md](stages_C0.md)
