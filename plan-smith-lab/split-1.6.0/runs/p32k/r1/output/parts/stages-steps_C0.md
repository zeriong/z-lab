> plan-smith · part 5/8 · C0 · index: [plan.md](../plan.md)

## 6. 스테이지 10종 저작 표 (콘텐츠 축)

임계값 산식(모든 행이 이 식에서 나왔다): `star2 = 돼지수×5000 + 블록수×200`, `star3 = 돼지수×5000 + 블록수×350 + 10000`, 500 단위 반올림.

| # | 이름 | 새 | 돼지 | 블록 | 신규로 요구하는 것 | 배치 요지 | star2 | star3 |
|---|---|---|---|---|---|---|---|---|
| 1 | 첫 발사 | 3 | 1 | 3 | 조준 감각 | 기둥 2 + 상판 1, 그 위 돼지 | 5,500 | 16,000 |
| 2 | 나무 오두막 | 3 | 2 | 6 | 두 번 맞히기 | 2층 나무 상자, 돼지 2마리 분리 배치 | 11,000 | 22,000 |
| 3 | 얼음 창고 | 3 | 2 | 8 | 재질 구분(얼음은 1방) | 얼음 벽 뒤 돼지, 나무 지지대 | 11,500 | 23,000 |
| 4 | 돌 기둥 | 4 | 2 | 9 | 돌은 못 뚫는다는 학습 | 돌기둥 사이로 난 좁은 통로 | 12,000 | 23,000 |
| 5 | 2층 구조 | 4 | 3 | 12 | 붕괴 유도 | 아래층 지지대를 치면 위층이 무너짐 | 17,500 | 29,000 |
| 6 | 공중 발판 | 4 | 3 | 12 | 고각 사격 | 정적 발판 위 돼지 1 + 지상 2 | 17,500 | 29,000 |
| 7 | 좁은 틈 | 4 | 3 | 14 | 정밀 조준 | 벽 사이 틈으로만 돼지에 닿음 | 18,000 | 30,000 |
| 8 | 돌 요새 | 5 | 4 | 16 | 약점 탐색 | 돌 외벽 + 나무 내부, 측면만 취약 | 23,000 | 35,500 |
| 9 | 도미노 | 5 | 4 | 18 | 연쇄 | 얇은 기둥 줄세우기, 첫 칸을 치면 연쇄 | 23,500 | 36,500 |
| 10 | 최종 성채 | 5 | 5 | 20 | 전부 | 3층 혼합 재질 + 분산 배치 | 29,000 | 42,000 |

블록 수는 ±2까지 허용한다. 돼지 수와 새 수는 이 표의 값을 그대로 쓴다(별 임계값이 그 수에서 계산됐다).

---

## 7. 접근과 단계

각 단계는 선행 단계의 산출물을 소비한다. 검증은 구현자가 **자기 코드를 읽어 확인할 수 있는 것**으로만 적었다(구현자는 실행할 수 없다).

**S1 — 뼈대.** 선행: 없음. §5.1을 `index.html`로 그대로 쓴다. 검증: `<script>` 5개가 §5.1 순서와 같고 id 14개(`game`, `hud-stage`, `hud-score`, `hud-birds`, `btn-pause`, `overlay-menu`, `btn-play`, `stage-grid`, `overlay-pause`, `overlay-clear`, `overlay-fail`, `clear-stars`, `clear-score`, `fail-msg`)가 모두 존재한다. 매트릭스 행: 15, 22.

**S2 — 상수와 상태.** 선행: S1. §5.4를 `stages.js`/`game.js`에 넣고, `init()`이 `loop()`를 한 번 시작하며 `window.addEventListener('load', init)`로 걸린다. 검증: §5.4 상수 이름이 프로젝트 전체에서 각각 `const` 1회만 나타난다. 행: 16.

**S3 — 물리 월드 + 스테이지 1.** 선행: S2. `physics.js` 전체와 `stages.js`의 1번 스테이지. `createEngine()`/`bindCollisions()`는 `init()`에서 각각 1회만 호출한다. 검증: `Events.on(` 호출이 파일 전체에 1개다. 행: 1, 9, 10.

**S4 — 렌더.** 선행: S3(그릴 바디가 있어야 한다). `render.js` 전체. 검증: `drawFrame` 안에서 `clearRect` → `drawBackground` → 바디 → 파편 순서다. 행: 22.

**S5 — 조준·발사·궤적.** 선행: S4(당김이 보여야 의미가 있다). §5.5~5.7 + `drawSling`/`drawTrajectory`. 검증: `Body.setVelocity(GAME.bird` 바로 앞줄이 `Body.setStatic(GAME.bird, false)`다. 행: 5, 6, 7.

**S6 — 데미지·파괴·판정.** 선행: S5. §5.8 + `sweepDestroyed`/`updateShotPhase`/`worldSettled`/`resolveShot`/`checkOutcome`/`finishStage`. **여기서 얇은 종단 경로가 닫힌다**: 메뉴에서 시작 → 발사 → 돼지 제거 → 클리어. 검증: `Composite.remove` 호출이 `collisionStart` 콜백 바깥에만 있다. 행: 8, 11, 12, 13, 14.

**S7 — 오버레이와 상태 전이.** 선행: S6(클리어/실패 상태가 있어야 띄울 게 있다). `showOverlay`/`hideOverlays`/`pauseGame`/`resumeGame`/`restartStage`/`goMenu` + 버튼 8개 배선. 검증: `GAME.state = ` 에 대입되는 문자열이 `'MENU'|'PLAYING'|'PAUSED'|'CLEAR'|'FAIL'` 5종뿐이다. 행: 15, 16, 17, 18.

**S8 — 점수·별·저장·스테이지 선택.** 선행: S7(클리어 오버레이가 있어야 별을 붙인다). `syncHud`/`starsFor`/`loadProgress`/`saveProgress`/`buildStageGrid`. 검증: `saveProgress` 호출부에서 최고점을 `Math.max`로 비교한다. 행: 2, 3, 4, 19, 20, 21.

**S9 — 스테이지 2~10 저작.** 선행: S3(스키마). S6 이후 언제든 가능하며 S7·S8과 **병렬**이다. §6 표의 10행을 데이터로 옮긴다. 검증: `STAGES.length === 10`, id가 1~10 오름차순, 각 원소가 7개 키를 갖는다. 행: 1.

**S10 — 마감 레이어(이름 붙은 단계, 생략 금지).** 선행: S6. 배경 언덕·구름, 파괴 파편, 효과음 5종, 로드 실패 문구. 검증: `playSfx` 호출이 `'launch'`, `'hit'`, `'pig'`, `'clear'`, `'fail'` 5종 모두에 대해 존재하고, `spawnDebris` 호출이 `sweepDestroyed` 안에 있다. 행: 23, 24, 25.

---

> plan-smith · next: [load-bearing_D0.md](load-bearing_D0.md)
