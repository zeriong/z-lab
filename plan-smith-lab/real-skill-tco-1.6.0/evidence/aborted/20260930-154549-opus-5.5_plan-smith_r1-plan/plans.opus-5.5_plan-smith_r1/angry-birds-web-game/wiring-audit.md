# 배선 감사 (wiring-audit) — `plans/angry-birds-web-game/plan.md`
- 방식: 문서 수준 감사다. 모든 지적은 계획서 본문에서 읽히는 내용만 근거로 한다. 계획서는 고치지 않았다.
- 범위: 아래 다섯 질문(Q1~Q5)에만 답한다.

---

## Q1. 5홉 이하의 로드베어링 체인이 있고, 모든 홉에 "통과 조건"과 "처음 참이 되는 곳"이 있는가
**판정: defects: 3**

§8에 5홉 체인이 있고, 두 열 모두 다섯 행에 채워져 있다. 결함은 셀 안에 있다. 세 홉에서 "통과 조건"에 적힌 조건 일부가 "처음 참이 되는 곳"에 대응 항목을 갖지 못했다.

- **Q1-1 — §8 홉 3, "처음 참이 되는 곳" 셀**
  - 빠진 것: 통과 조건 4개 가운데 "같은 `activePointerId`"와 "`|d| ≥ MIN_PULL`"이 처음 참이 되는 지점이 없다. 셀은 `state`/`phase`(홉 2의 마지막 줄), 리스너 등록, `birdPos`만 다룬다.
  - 최소 추가(셀에 덧붙일 문장): "`activePointerId`: 같은 제스처의 `pointerdown` 잡기 분기에서 `e.pointerId`로 설정된다(§5.8 잡기). `|d| ≥ MIN_PULL`: `pointermove`가 `G.pull`에 15px 이상의 벡터를 대입하는 순간(§5.8 당김)."
- **Q1-2 — §8 홉 4, "처음 참이 되는 곳" 셀**
  - 빠진 것: "`rel ≥ DAMAGE_MIN_SPEED`"와 "누적 피해 ≥ 돼지 hp"가 처음 참이 되는 지점이 없다. 셀은 `startLoop`와 `stepCount`만 다룬다. 이 두 조건이 체인에서 유일하게 물리 값에 의존하는 경비인데, 채워지지 않은 곳도 이 두 조건이다.
  - 최소 추가: "피해 ≥ 15: 빨간 새(질량≈4.07, 최대 20.4px/스텝)가 `rel ≥ 3.7`로 돼지에 닿는 첫 `collisionStart`, 또는 나무 보(질량≈5.6)가 40px 떨어져 `rel≈4.7`로 돼지를 치는 스텝(§5.8 설계 부등식)."
- **Q1-3 — §8 홉 5, "처음 참이 되는 곳" 셀**
  - 빠진 것: 셀이 적은 "홉 4의 감소가 일어난 그 스텝의 승리 판정"은 `pigsAlive===0`이 참이 되는 곳이다. 통과 조건으로 적힌 `!resultWin`과 "스텝이 계속 돎(PLAYING)"이 참이 되는 곳이 아니다.
  - 최소 추가: "`!resultWin`: `loadStage`가 false로 둔다(§5.7). PLAYING: `loadStage`의 마지막 줄에서 참이 된다. `WIN_DELAY` 60스텝 동안 일시정지하지 않는 한 유지된다."

---

## Q2. 콜드 스타트 표가 홉에 나온 모든 조건을 빈 칸 없이 덮는가
**판정: defects: 4** (빈 칸은 0개다. 결함은 모두 빠진 행이다)

- **Q2-1 — §8 콜드 스타트 표, `G.pull` 행 없음**
  - 빠진 것: 홉 3의 `|d| ≥ MIN_PULL`이 읽는 상태는 `G.pull`이다. 이 값을 쓰는 곳은 §5.8의 `pointermove` 하나뿐이다. `loadStage`, 잡기, 취소, 턴 종료 어디에서도 리셋하지 않는다. 행을 쓰면 이 공백이 바로 드러난다(결과는 Q3-1).
  - 최소 추가(행): `G.pull | {x:0, y:0} | pointermove(대입), pointerdown 잡기 분기({x:0,y:0}로 리셋) | 입력 이벤트`
- **Q2-2 — 같은 표, 돼지의 `plugin.hp` / `plugin.dead` 행 없음**
  - 빠진 것: 홉 4는 "누적 피해 ≥ 돼지 hp"를 조건으로 삼고, §5.8의 피해 규칙은 `!plugin.dead`를 조건으로 삼는다. 두 값 모두 표에 없다.
  - 최소 추가(행): `돼지 plugin.hp / plugin.dead | CONFIG.PIG.hp(15) / false | createWorld(생성), onImpact(감소 / true) | 스테이지 진입 / 충돌 스텝`
- **Q2-3 — 같은 표, `G.pendingRemove` 행 없음**
  - 빠진 것: 홉 4의 이름 칸에 "`pendingRemove` 처리"가 있지만 표에 행이 없다.
  - 최소 추가(행): `G.pendingRemove | [] | onImpact(push), stepOnce(처리 후 비움), teardownWorld([]) | 매 스텝`
- **Q2-4 — 같은 표, `G.save`(`unlocked`) 행 없음**
  - 빠진 것: 홉 1이 `loadStage(0)`에 도달하는 것은 `G.save.unlocked === 1`일 때뿐이다(§5.6의 인자가 `Math.min(G.save.unlocked, 10) - 1`이다). 이 상태가 표에 없다.
  - 최소 추가(행): `G.save | {unlocked:1, best:{}} → loadSave() 결과 | Game.init(loadSave), finish(갱신 + writeSave) | 부트 1회 / 승리 시`

---

## Q3. 모든 홉이 계획서가 다른 곳에서 만들기로 약속한 심볼·단계를 가리키는가 (고아 목록 + 접합부 일관성)
**판정: defects: 7**

파일 로드 순서(§5.1: Matter → config → stages → audio → physics → render → ui → game → main)에는 결함이 없다. 각 전역은 처음 쓰이기 전에 정의된다. `physics.js`의 별칭 줄이 로드 시점에 `Matter`를 읽는 것도 첫 줄 CDN 뒤라서 성립한다. 아래는 이름·바인딩 결함이다.

- **Q3-1 (가장 심각) — §5.8 "놓기"와 §8 홉 3의 경비 불일치 + 바인딩 없는 `d`**
  - 빠진 것: 홉 3은 "같은 `activePointerId`"를 통과 조건으로 적었다. 하지만 §5.8의 놓기(`pointerup`) 규칙에는 `phase==='AIMING'` 검사도 pointerId 검사도 없다. "같은 pointerId"는 당김 규칙에만 있다. 또 놓기에서 쓰는 `d`는 `pointermove`의 지역 이름이고, 놓기 쪽에서는 바인딩되지 않는다. 의도는 `G.pull`로 보인다. Q2-1(`G.pull` 리셋 없음)과 겹치면 두 가지 일이 생긴다. (1) FLYING 중에 캔버스를 한 번 누르면 이전 당김 값으로 새가 한 마리 더 발사된다. 노란 새의 대시 탭(§5.8 잡기의 두 번째 분기)도 여기에 해당한다. (2) 두 번째 턴부터는 READY에서 `GRAB_RADIUS` 밖을 눌러도 새가 발사된다. 덮어쓰인 이전 `G.bird` 바디는 월드에 그대로 남는다.
  - 최소 추가(§5.8 놓기 앞에 한 문장, 잡기에 한 구절): "놓기의 첫 줄: `G.phase !== 'AIMING' || e.pointerId !== activePointerId`이면 return한다. 놓기와 `pointercancel`의 `d`는 `G.pull`이다." 그리고 잡기 분기에 "`G.pull = {x:0, y:0}`"를 추가한다.
- **Q3-2 — §5.7·§5.8·§8의 접두어 없는 상수 이름**
  - 빠진 것: `ANCHOR`, `STEP_MS`, `GRAB_RADIUS`, `MAX_PULL`, `MIN_PULL`, `LAUNCH_K`, `DASH_SPEED`, `G_PER_STEP`, `TRAJ_STEPS`, `GRACE_STEPS`, `DAMAGE_MIN_SPEED`, `STATIC_MASS`, `DAMAGE_SCALE`, `SETTLE_*`, `*_FLIGHT_STEPS`, `WIN_DELAY`, `LOSE_DELAY`, `OOB`, `SCORE_PIG`, `BIRD_BONUS`, `SAVE_KEY`가 모두 접두어 없이 쓰였다. 홉 3~5도 `GRAB_RADIUS`, `MIN_PULL`, `GRACE_STEPS`, `DAMAGE_MIN_SPEED`, `WIN_DELAY`를 이렇게 부른다. 그런데 §5.5는 이것들을 `CONFIG`의 속성으로만 정의하고, §5.3의 심볼 표에는 이런 전역이 없다. 적힌 대로 옮기면 `loadStage`의 `G.birdPos = { x: ANCHOR.x, ... }`가 홉 2에서 ReferenceError를 낸다.
  - 최소 추가(§5.3 세부 규약에 한 문장): "§5.7·§5.8·§8에 나오는 대문자 이름은 모두 `CONFIG`의 속성이다. 코드에서는 항상 `CONFIG.ANCHOR`처럼 접두어를 붙여 쓰고, 별칭 변수는 만들지 않는다."
- **Q3-3 — §5.7 `Game.init`와 §5.8의 `canvas`, `handlers`: 선언이 없음**
  - 빠진 것: `Render.init(canvas)`, 캔버스 리스너 등록, §5.8 좌표 변환의 `canvas.getBoundingClientRect()`, `canvas.setPointerCapture`가 모두 `game.js` 안의 `canvas`를 쓴다. 하지만 §5.4의 선언 블록(`loopStarted`, `lastTs`, `acc`, `activePointerId`)에도, 다른 어디에도 `canvas`가 없다. `UI.init(handlers)`의 `handlers`도 정의된 곳이 없다. §5.3에는 키 목록 `h`만 있다. 홉 1(부트)과 홉 3(입력)이 모두 이 바인딩을 지나간다.
  - 최소 추가: §5.4 블록에 `let canvas = null;`을 추가하고, §5.7 `Game.init` 순서의 첫 단계로 "`canvas = document.getElementById('game')`"를 넣는다. 여기에 한 문장을 더한다: "`handlers`는 §5.3의 9개 키를 가진 객체 리터럴이고, 각 값은 §5.6 전이표에서 이름이 같은 행(start=`#btn-start` 행, …)을 구현한다."
- **Q3-4 — §5.7 `fit()`: 이 이름으로 정의된 곳이 없음**
  - 빠진 것: `Game.init`는 `fit()`을 부르지만, 계획서 어디에도 `fit`이라는 이름의 정의가 없다. §5.6 DOM 단락의 resize 계산이 그 내용으로 보이지만, 이름도 소속 파일도 적혀 있지 않다. `fit()`이 ReferenceError를 내면 그 뒤의 `UI.show('main')`과 `startLoop()`가 실행되지 않는다. 그러면 홉 1의 "처음 참" 근거와 홉 4의 `startLoop`가 함께 끊긴다.
  - 최소 추가(§5.6 DOM 단락 끝에 한 문장): "이 계산은 `game.js`의 내부 함수 `fit()`이고, `resize` 리스너도 `fit`을 부른다."
- **Q3-5 — §8 홉 1의 `loadStage(0)`과 §5.6의 `loadStage(Math.min(G.save.unlocked, 10) - 1)` 불일치**
  - 빠진 것: 같은 전이(MAIN → `#btn-start`)의 인자가 두 섹션에서 다르게 적혀 있다.
  - 최소 추가(홉 1 이름 셀 수정): "`loadStage(Math.min(G.save.unlocked, 10) - 1)` (콜드 스타트에서는 `loadSave` 기본값이 unlocked=1이므로 0)". Q2-4의 행과 짝을 이룬다.
- **Q3-6 — §5.6 `UI.show` 표: `#btn-start`의 DOM 위치를 약속하지 않음**
  - 빠진 것: 홉 1의 트리거는 `#btn-start`다. 그런데 `'main'` 행은 `#screen-main`만 보이게 하고 "나머지는 `.hidden`"이라고 적었다. `'paused'`와 `'result'` 행은 괄호 안에 자식 요소를 나열했지만, `'main'`과 `'select'` 행은 `#btn-start`, `#btn-select`, 제목, `#select-grid`, `#btn-select-back`이 자식이라는 것을 약속하지 않는다. `#select-grid`는 §5.3에만 나오기 때문에 A7("§5.6에 나오는 모든 id")의 점검 범위에서도 빠진다.
  - 최소 추가(표 셀 두 개): `'main'` → `#screen-main` (제목 "새총 대작전", `#btn-start`, `#btn-select`), `'select'` → `#screen-select` (`#select-grid`, `#btn-select-back`).
- **Q3-7 — §5.8 `finish(win)`: 바인딩 없는 이름과 저장 위치 없는 값**
  - 빠진 것: `best[id]`의 `id`, `UI.showResult({ ..., best, ... })`의 `best`, 실패 시의 `stars`가 모두 바인딩되지 않았다. `stars`는 승리 때만 계산된다. 또 `left`는 "phase를 NONE으로 바꾸기 **전에** 기록"해야 하는데, 승리 판정은 `finish`보다 `WIN_DELAY` 스텝 앞서 `phase='NONE'`을 대입한다. 그 사이에 이 값을 둘 `G` 필드가 §5.4에 없다. 그런데 §5.4는 선언 블록에 없는 필드를 새로 쓰지 못하게 한다.
  - 최소 추가: §5.4에 `birdsLeft: 0,`을 추가한다. §5.8의 승리 판정과 실패 판정에는 "`phase='NONE'` 직전에 `G.birdsLeft = birdQueue.length + (phase가 READY/AIMING이면 1)`"을 넣는다. `finish`에는 "`id = STAGES[G.stageIndex].id`, `best = G.save.best[id]`, 실패 시 `stars = 0`"을 넣는다.

---

## Q4. 모든 `build` 요구사항에 표 밖의 동사 문장이 있는가
**판정: defects: 6** — `build` 행 32개(§1.1의 L01~L32), 표 밖 문장 32개(§1.3 목록, L01~L32). 개수는 일치한다. 결함은 문장 형식 규칙 위반이다. 셋째 절이 둘째 절을 부정문으로 되풀이하거나 보이지 않는 결과를 적은 경우, 그리고 행위자·행동 절이 없는 경우다.

- **Q4-1 — §1.3 L06**: "발사 전에 어디로 갈지 알 수 없다"는 보이는 증상이 아니다.
  - 최소 추가(셋째 절 교체): "없으면(또는 `G_PER_STEP`이 어긋나면) 점선의 끝과 실제 비행 경로가 눈에 띄게 벌어진다."
- **Q4-2 — §1.3 L11**: "두 번째 새가 영영 나오지 않는다"는 둘째 절의 부정이다.
  - 최소 추가: "없으면 첫 발사 뒤 새총이 빈 채로 남고, HUD의 남은 새 아이콘은 줄지 않으며, 실패 결과도 뜨지 않는다."
- **Q4-3 — §1.3 L18**: "점수가 오르는 이유를 알 수 없다"는 보이는 증상이 아니다.
  - 최소 추가: "없으면 HUD 숫자만 바뀌고 파괴 지점에는 아무 숫자도 떠오르지 않는다."
- **Q4-4 — §1.3 L23**: "게임이 무음이다"는 둘째 절의 부정이다.
  - 최소 추가: "없으면 첫 클릭 이후에도 무음이고 콘솔에 AudioContext 자동재생 경고가 찍히거나, 모든 이벤트에서 같은 소리가 난다."
- **Q4-5 — §1.3 L32**: "무슨 게임인지 알 수 없다"는 보이는 증상이 아니다.
  - 최소 추가: "없으면 메인 화면에 버튼 두 개만 하늘 배경 위에 떠 있다."
- **Q4-6 — §1.3 L24, L25**: 행위자·행동 절("⟨행위자⟩가 ⟨행동⟩을 하면")이 없고, 상태 서술("인게임에서", "어느 스테이지에서든")로 시작한다.
  - 최소 추가: 두 문장의 앞머리를 "플레이어가 아무 스테이지나 열면"으로 바꾼다.

---

## Q5. 구현자 계약에 되살리기 조건, 해석 가능한 고정 버전, 그리고 스택으로 산 보장마다 "done"에 명령과 exit status가 있는가
**판정: defects: 5** (고정 버전에는 결함이 없다. `matter-js@0.19.0`의 jsDelivr URL은 패킷이 확인한 배포 버전과 일치하고, §5.1·§12 두 곳에 같은 문자열로 적혀 있다)

- **Q5-1 — §9 / §12, 되살리기 조건 누락: 빌드 체인과 로컬 벤더링**
  - 빠진 것: 빌드 체인(npm, 번들러, TypeScript)은 §4에 이유만 있고 되살리기 조건이 없다. 로컬 벤더 파일(`vendor/matter.min.js`)과 `document.write` 폴백은 계획서 어디에도 언급이 없다. A1(네트워크 의존)을 걱정한 구현자가 바로 이 관측된 실패 패턴(아무도 만들지 않은 벤더 파일로 폴백)을 추가할 수 있다.
  - 최소 추가(§9 두 행):
    - `빌드 체인·TypeScript | 구현자가 설치·빌드할 수 없다 | 구현자가 명령을 실행할 수 있는 환경이 되면`
    - `로컬 벤더 파일·document.write 폴백 | 구현자가 파일을 받을 수 없어 존재하지 않는 경로를 가리키게 된다 | 사람이 matter-js 0.19.0 파일을 저장소에 넣어 주면(그때 §5.1 첫 줄만 로컬 경로로 바꾼다)`
- **Q5-2 — §5.2, 금지 목록에 이유와 되살리기 조건이 없음**
  - 빠진 것: `Runner`와 `Render`는 §9에 행이 있다. 하지만 `World`, `Mouse`, `MouseConstraint` 금지는 이유도 되살리기 조건도 없다. `World`의 회상 오류 위험만 §10에 이유로 나온다. 슬링샷 드래그에서 가장 흔히 떠올리는 패턴이 `MouseConstraint`이므로, 설명 없는 금지로 남으면 뒤집힐 가능성이 가장 크다.
  - 최소 추가(§5.2에 한 문장): "`Mouse`/`MouseConstraint`를 쓰지 않는 이유는 새총 위의 새가 바디가 아니어서 끌 대상이 없기 때문이다(§5.3 `launchBird`). §9 마지막 행이 되살아나면 함께 재검토한다. `World`는 `Composite`와 기능이 겹쳐 회상 혼동만 늘린다(§10 첫 행). 재검토 조건은 없다."
- **Q5-3 — §11(B) B0: IIFE로 산 보장(파일 사이 이름 충돌 없음)을 증명하는 명령이 없음**
  - 빠진 것: §4는 "파일마다 IIFE 하나"를 최상위 이름 충돌을 없애려고 샀다고 적었다. 하지만 B0의 `node --check`는 파일마다 따로 구문만 검사하므로, 파일 사이의 `const`/`let` 중복은 잡지 못한다.
  - 최소 추가(B0 옆에 한 줄): "`cat js/config.js js/stages.js js/audio.js js/physics.js js/render.js js/ui.js js/game.js js/main.js > <FIXTURE> && node --check <FIXTURE>`가 exit 0이다."
- **Q5-4 — §11 A3 / B1: file:// 로드 보장이 속성과 관찰로만 적혀 있음**
  - 빠진 것: "빌드 없이 브라우저가 직접 로드함"의 코드 쪽 조건(모듈과 fetch 없음, A3)은 읽어서 확인하는 속성이다. B1은 스톱워치로 하는 관찰이다. 둘 다 명령과 exit status가 아니다.
  - 최소 추가(B 항목 한 줄): "`! grep -nE '\b(import|export)\b|type="module"|fetch\(|XMLHttpRequest' index.html js/*.js`가 exit 0이다."
- **Q5-5 — §12 "증명"과 §4의 모순: 산 보장이 하나로 줄어 있음**
  - 빠진 것: §12는 스택으로 사는 보장이 "빌드 없이 브라우저가 직접 로드함" 하나라고 적었다. 하지만 §4는 적어도 두 개를 더 샀다. 하나는 자체 루프(Runner 미사용)로 일시정지를 조건 하나로 만든다는 것이고, 다른 하나는 `Matter`를 `physics.js` 안에만 둔다는 것이다. 두 보장의 done 항목(A2, A4, A5)은 속성이고, B4는 관찰이다.
  - 최소 추가(§12 증명 줄에 한 문장, §11(B)에 두 줄): "`! grep -nE 'setTimeout|setInterval|Runner\.|Matter\.Render' js/*.js`가 exit 0이다." 그리고 "`test "$(grep -l Matter js/*.js | tr '\n' ' ')" = 'js/main.js js/physics.js '`가 exit 0이다."

---

## 요약: 최소 추가 목록 (심각도 순)
1. §5.8 놓기의 첫 줄에 `phase !== 'AIMING' || e.pointerId !== activePointerId`이면 return을 넣고, `d`는 `G.pull`이라고 명시한다. 잡기 분기에 `G.pull = {x:0, y:0}`을 넣는다. (Q3-1, Q2-1)
2. §5.3에 "대문자 상수는 항상 `CONFIG.` 접두어로 쓴다"는 한 문장을 넣는다. (Q3-2)
3. §5.4에 `let canvas = null;`을 넣고, `Game.init` 첫 단계로 `canvas = document.getElementById('game')`를 넣는다. `handlers` 객체의 정의 문장도 넣는다. (Q3-3)
4. §5.6 DOM 단락에 "이 계산은 `game.js` 내부 함수 `fit()`이다"를 넣는다. (Q3-4)
5. §5.6 `UI.show` 표의 `'main'`/`'select'` 셀에 자식 요소(`#btn-start`, `#btn-select`, 제목 / `#select-grid`, `#btn-select-back`)를 적는다. (Q3-6)
6. §5.4에 `birdsLeft: 0,`을 넣고, 승패 판정에서 `phase='NONE'` 직전에 그 값을 대입한다. `finish`에서 `id`, `best`, 실패 시 `stars = 0`을 바인딩한다. (Q3-7)
7. §8 홉 1의 인자를 `loadStage(Math.min(G.save.unlocked, 10) - 1)`로 맞추고, 콜드 스타트 표에 `G.save` 행을 넣는다. (Q3-5, Q2-4)
8. §9에 빌드 체인·TypeScript 행과 로컬 벤더·`document.write` 폴백 행(되살리기 조건 포함)을 넣는다. (Q5-1)
9. §11(B)에 이어 붙인 파일 전체에 대한 `node --check` exit 0 명령을 넣는다. (Q5-3)
10. §11(B)에 타이머·Runner 부재 grep(exit 0)과 `Matter` 사용 파일 test(exit 0)를 넣고, §12 증명 줄에 이 보장들을 적는다. (Q5-5)
11. §11(B)에 모듈·fetch 부재 grep(exit 0)을 넣는다. (Q5-4)
12. §8 홉 4 셀에 피해 ≥ 15가 처음 참이 되는 충돌(§5.8 부등식)을 적는다. (Q1-2)
13. §8 홉 3 셀에 `activePointerId` 설정 지점과 `|d| ≥ MIN_PULL` 대입 지점을 적는다. (Q1-1)
14. 콜드 스타트 표에 돼지 `plugin.hp`/`plugin.dead` 행과 `G.pendingRemove` 행을 넣는다. (Q2-2, Q2-3)
15. §8 홉 5 셀에 `!resultWin`(loadStage)과 PLAYING 유지 조건을 적는다. (Q1-3)
16. §5.2에 `Mouse`/`MouseConstraint`/`World` 금지 이유와 재검토 조건을 넣는다. (Q5-2)
17. §1.3 L06, L11, L18, L23, L32의 셋째 절을 보이는 증상으로 바꾸고, L24와 L25에 행위자·행동 절을 넣는다. (Q4-1~Q4-6)
