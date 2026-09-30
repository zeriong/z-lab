# 배선 감사 (wiring audit) — angry-birds-browser-game / plan.md

- 감사 대상: `plan.md` (읽기 전용). 감사자는 작성자가 아닌 새 인스턴스다.
- 범위: 문서 수준의 다섯 문항만 다룬다. 산출물을 실행하거나 열어 보라는 요구는 하지 않는다. 결함만 보고하고 계획서는 고치지 않는다.
- 항목마다 **위치 / 빠진 것 / 최소 추가**를 적는다. `[심각]`은 적힌 그대로 구현하면 load-bearing path(§7)나 핵심 상호작용이 끊기는 결함, `[경미]`는 표현 수준의 틈이다.

## 요약

| 문항 | 판정 | 발견 수 |
|---|---|---|
| Q1 홉 체인과 두 칸 | 5홉(≤5) 체인이 있고 모든 홉의 두 칸이 채워져 있다. 다만 4개 홉은 칸이 있어도 그 홉의 실제 가드를 빠뜨렸거나, 두 칸이 서로 다른 조건을 가리킨다 | 5 |
| Q2 cold-start 표 | 16행이고 빈 칸은 없다. 홉에 나오는 조건 2개는 행이 없고, 1개 셀은 시점을 적지 않았다 | 3 |
| Q3 고아·시그니처 | 규칙 절이 약속하지 않은 홉 단계 1개, 시그니처나 소유가 호출과 어긋나는 곳 6개 | 7 |
| Q4 동사 문장 | build 27행, 문장 27개. 모두 표 밖에 있다. 셋째 절이 약한 문장 2개 | 1 |
| Q5 구현자 계약 | 부활 트리거가 있고 버전도 고정돼 있다. 보장 가운데 done 항목이 없거나 done 항목끼리 충돌하는 것이 있다 | 5 |

---

## Q1. load-bearing path — 모든 홉에 "통과 조건"과 "처음 참이 되는 곳"이 있는가

§7에 5홉 체인이 있다. 두 칸이 모두 빈 홉은 없다. 아래는 칸이 채워져 있어도 그 홉이 실제로 통과하는 조건을 담지 못한 홉이다.

**Q1-1 [심각] hop 3 — release()와 moveAim()에 가드가 없다**
- 위치: §7 hop 3, §4.7 "입력"
- 빠진 것: 통과 조건 칸에는 beginAim의 가드(phase 'ready', 45px 이내)만 있다. 같은 홉의 moveAim과 release()를 막는 조건은 없다. §4.7은 "move:"와 "up/cancel: release()를 호출한다"를 조건 없이 적었고, release()는 `|pull|`만 확인한다. pull은 발사한 뒤에도, pause가 조준을 취소한 뒤에도(cold-start 표 "pause(aiming → 'ready')") 지워지지 않는다. 문서를 그대로 따르면 세 가지가 생긴다.
  - (a) 비행 중에 탭하면 pointerdown이 useAbility()를 부르고, 이어서 pointerup이 release()를 부른다. 그러면 직전 샷의 pull(≥ MIN_PULL)로 addBird와 launch가 한 번 더 실행된다. birdQueue를 줄이지 않은 두 번째 새가 발사되고, 첫 새의 몸체는 shot.body에서 떨어져 나가 영영 제거되지 않는다. 노란 새 가속과 검은 새 탭 폭발(L12)도 쓸 때마다 새 새를 하나 더 낳는다.
  - (b) 조준 중에 Esc를 누르면 pause가 phase를 'ready'로 돌린다. 캡처된 pointerup이 release()를 부르면 PAUSED 상태에서 새가 발사된다. L26 "캔버스 클릭이 무시된다"와 모순이다.
  - (c) 마우스는 버튼을 누르지 않아도 pointermove를 낸다. 그래서 'ready' 상태에서도 moveAim이 pull을 갱신한다. 새에서 먼 곳을 클릭하면 beginAim은 실패하지만, pointerup의 release()가 그 pull로 새를 발사한다.
- 최소 추가: §4.7 입력에 한 줄을 넣는다. "move·up·cancel은 `screen==='PLAYING'` 그리고 `shot.phase==='aiming'`일 때만 moveAim/release를 부른다. beginAim은 pull을 {0,0}으로 초기화한다." hop 3 통과 조건에는 "release 시점에 `phase==='aiming'` 그리고 `|pull| ≥ MIN_PULL`"을, 처음 참 칸에는 "phase는 beginAim, pull은 moveAim"을 더한다.

**Q1-2 hop 3 — 캔버스 위 요소 가운데 `#hud`만 다룬다**
- 위치: §7 hop 3, §4.3 DOM id 절
- 빠진 것:
  - (1) canvas#view에 pointer 리스너가 붙어 있어야 한다는 전제가 없다. hop 1은 UI.init의 버튼 리스너를 조건으로 적었는데, hop 3은 그에 해당하는 Input.init(boot)을 적지 않았다.
  - (2) `inset:0`으로 캔버스를 덮는 화면 요소 다섯 개(`#screen-menu`, `#screen-select`, `#overlay-pause`, `#screen-clear`, `#screen-fail`)가 PLAYING 동안 실제로 `display:none`이어야 한다. §4.3은 숨김을 클래스 `.hidden{display:none}`으로만 정한다. 같은 요소에 id 선택자로 display를 주면(예: 버튼을 가운데 두려고 쓴 `#screen-menu{display:flex}`) 명시도에서 `.hidden`이 진다. 그러면 메뉴가 캔버스를 덮은 채 남아 새를 잡을 수 없다. 문서에는 이를 막는 규칙이 없다.
- 최소 추가: hop 3 통과 조건에 두 가지를 더한다. "Input.init이 canvas에 pointerdown/move/up/cancel을 바인딩함(boot)", "`#hud` 밖의 모든 화면 요소가 hidden(PLAYING 진입 시 setScreen → UI.show)". §4.3에는 "`.hidden{display:none !important;}`" 한 줄을 넣는다.

**Q1-3 hop 4 — "relSpeed > 1.5"는 피해가 0보다 크다는 것만 보장한다**
- 위치: §7 hop 4
- 빠진 것: 이 홉이 이름으로 약속한 결과("sweepDead가 pigs에서 제거")는 두 경우에만 생긴다. 돼지 hp ≤ 0(누적 d ≥ PIG.hp 40, 한 번에 맞으면 relSpeed ≥ 5.5)이거나 OUT 밖으로 나갔을 때다. 이 조건과 그 "처음 참" 칸이 없다. 또 onCollisionPair는 `bodyA.ab`/`bodyB.ab`만 읽는데(§4.5), `body.ab = entity` 대입(지면·블록·돼지는 loadStage, 새는 release의 addBird 직후)이 이 홉의 전제로 적혀 있지 않다. 새 몸체에 `.ab`가 없으면 첫 충돌에서 핸들러가 멈춘다.
- 최소 추가: 통과 조건에 "그리고 돼지 hp ≤ 0(누적 피해 ≥ 40) 또는 OUT 밖, 그리고 두 몸체에 `.ab`가 있음"을 더한다. 처음 참 칸에는 "hp: onCollisionPair·explode의 차감(stepCount ≥ 30 이후). `.ab`: loadStage 2단계, 새는 release의 addBird 직후"를 더한다.

**Q1-4 hop 5 — 두 칸이 서로 다른 조건을 가리킨다**
- 위치: §7 hop 5
- 빠진 것: 통과 조건 칸은 "카운트다운 중 screen PLAYING"만 적는다. 처음 참 칸은 "sweepDead가 마지막 돼지를 제거한 같은 스텝", 즉 `pigs.length === 0`이 참이 되는 때를 적는다. 그래서 checkResult (1)의 실제 가드인 `pigs.length === 0` 그리고 `pendingResult !== 'CLEAR'`는 조건 칸에 없다. 조건 칸에 적힌 "screen === 'PLAYING'"은 처음 참이 되는 곳이 없다. CLEAR_DELAY_STEPS(90) 동안 PLAYING 스텝이 90번 돌아야 한다는 조건도 빠졌다.
- 최소 추가: 조건 칸은 "`pigs.length === 0` 그리고 `pendingResult !== 'CLEAR'` 그리고 그 뒤 PLAYING 스텝 90회"로 한다. 처음 참 칸은 "pigs 0: hop 4 sweepDead와 같은 스텝. screen: hop 2의 setScreen('PLAYING'), 일시정지 뒤에는 resume"으로 한다.

**Q1-5 [경미] hop 1 — startGame 자체의 전제 두 개가 조건 칸에 없다**
- 위치: §7 hop 1
- 빠진 것: 시작 index를 계산하려면 `state.save !== null`이어야 한다. 또 startGame은 Audio.unlock()을 부른 다음에야 loadStage를 부르므로, unlock이 예외 없이 끝나야 한다. cold-start 표에는 두 행(`state.save`, AudioContext)이 이미 있다.
- 최소 추가: hop 1 조건 칸에 "그리고 `state.save !== null` 그리고 `Audio.unlock()`이 예외 없이 반환"을 더한다.

---

## Q2. cold-start 표가 홉에 나오는 모든 조건을 빈 칸 없이 덮는가

표는 16행이고 문자 그대로 빈 칸은 없다. 홉 조건 칸과 대조한 결과는 다음과 같다. hop 1의 세 조건, hop 2의 STAGES, hop 3의 screen·phase·`#hud`, hop 4의 screen·engine·핸들러·stepCount, hop 5의 screen은 행이 있다. 아래 둘은 행이 없다.

**Q2-1 hop 4의 `relSpeed > 1.5` — 행 없음**
- 최소 추가: 행 "충돌 상대속도 relSpeed | 0(새 몸체 없음, 구조물 정지·수면) | release의 launch, 중력 낙하 | hop 3 발사 이후 매 스텝". Q1-3을 받아들이면 행 "돼지 엔티티 hp | PIG.hp(40) | onCollisionPair·explode(차감) | stepCount ≥ 30 이후 충돌 스텝"도 더한다.

**Q2-2 hop 3의 "toWorld 좌표가 SLING에서 45px 이내" — 행 없음**
- 빠진 것: hop 3의 처음 참 칸은 "toWorld는 상태가 없음"이라고 적는다. 그러나 toWorld가 rect를 얻으려면 Render.init이 받아 둔 canvas 참조가 필요하다(Q3-2).
- 최소 추가: 행 "Render의 canvas 참조 | 없음 | Render.init | boot". Q1-2를 받아들이면 행 "캔버스 pointer 리스너 | 없음 | Input.init | boot"도 더한다.

**Q2-3 [경미] `lastTime` / `accumulator` 행의 "언제" 칸이 시점을 적지 않았다**
- 빠진 것: "첫 프레임 dt가 커도 100ms로 제한됨"은 성질이지 시점이 아니다. 사실상 빈 칸이다.
- 최소 추가: "frame이 호출될 때마다(lastTime = now) / loadStage(accumulator = 0)".

---

## Q3. 홉이 이름으로 부르는 기호·단계를 계획이 다른 곳에서 만들기로 약속했는가

hop 1~5에 나오는 심볼은 모두 §4.3(id, 로드 순서), §4.4(기호표, game.js 내부 함수 목록), §4.5(상태 필드), §4.6(상태), §4.7(규칙)에 소유처가 있다. 이름 차원의 고아는 없다. 규칙 절이 약속하지 않은 **단계**, 그리고 시그니처나 소유가 호출과 어긋나는 곳은 아래와 같다.

**Q3-1 [심각] hop 4 "sweepDead가 pigs에서 제거" — 규칙 절이 약속하지 않은 단계**
- 위치: §7 hop 4와 cold-start 표 "`state.pigs` | sweepDead(제거)" ↔ §4.7 스텝 2, §9 "dead 플래그로 중복을 막음"
- 빠진 것: §4.7 sweepDead 규칙이 약속하는 것은 "dead = true로 표시하고 remove·점수·파편·팝업·효과음 처리"뿐이다. 기호표에서 remove는 `AB.Physics.remove(engine, body)`로, 세계에서 몸체를 빼는 함수다. 게다가 dead 플래그가 있다는 사실은 엔티티가 배열에 남는다고 읽게 만든다. 배열에서 빼는 단계는 §7에만 있다. 규칙 절대로 구현하면 `pigs.length`가 0이 되지 않으므로 hop 5가 참이 될 수 없다. 오히려 checkResult (2)의 "돼지가 남아 있으며"가 참이 되어, 돼지를 다 잡아도 마지막 샷 뒤에 FAIL이 뜬다.
- 최소 추가: 둘 중 하나로 고정한다. §4.7 스텝 2에 "그리고 그 엔티티를 blocks/pigs 배열에서 뺀다(splice)"를 넣거나, checkResult의 두 돼지 판정을 "dead가 아닌 돼지 수"로 바꾼다.

**Q3-2 `AB.Render.toWorld(clientX, clientY)` — "상태 없음"이라는 주장과 필요한 입력이 어긋난다**
- 위치: §4.4 toWorld 행("저장 상태 없음"), §7 hop 3("toWorld는 상태가 없음") ↔ §4.8 "`(clientX − rect.left) × 1280 / rect.width`"
- 빠진 것: rect를 얻을 canvas가 인자에 없다. canvas는 `Render.init(canvas)`만 받는다.
- 최소 추가: toWorld 책임 칸을 "Render.init이 보관한 canvas의 getBoundingClientRect()를 호출마다 읽음(보관하는 것은 canvas 참조뿐, rect는 보관하지 않음)"으로 한다.

**Q3-3 `beginAim(wx,wy) → bool`과 "이때 setPointerCapture를 건다"가 어긋난다**
- 위치: §4.4 game.js 입력 행 ↔ §4.7 입력 첫 항목
- 빠진 것: setPointerCapture(pointerId)에는 요소와 pointerId가 필요하다. beginAim은 월드 좌표만 받으므로 이 호출을 할 수 없다. 누가 거는지 정해져 있지 않다.
- 최소 추가: "beginAim이 true를 돌려주면 input.js가 `canvas.setPointerCapture(e.pointerId)`를 부른다".

**Q3-4 호출할 때의 인자 수가 기호표와 다르다**
- 위치: §4.7 release의 `addBird(engine, type, SLING+pull)`(인자 3개, 셋째가 벡터) ↔ 기호표 `(engine, type, x, y)`. §4.7 explode의 `nudge(blastPush×f)`(스칼라 1개) ↔ 기호표 `(body, dvx, dvy)`
- 최소 추가: "`addBird(engine, type, SLING.x+pull.x, SLING.y+pull.y)`", "`nudge(body, ux×blastPush×f, uy×blastPush×f)`, (ux,uy) = 폭심에서 몸체로 향하는 단위벡터".

**Q3-5 `AB.Storage.recordClear(index, stars, score) → void` — 무엇을 갱신하는지 정해져 있지 않다 (hop 5 경로 위의 호출)**
- 위치: §4.4 storage.js 행, §4.5 `save: null // boot에서 AB.Storage.load()`, §4.7 "finishStage('CLEAR')는 Storage.recordClear를 호출한 뒤 setScreen('CLEAR')", §4.8 "음소거는 save.muted로 저장"
- 빠진 것: SaveData의 원본은 `AB.state.save`다. game.js가 소유하고 startGame과 `renderSelect(save)`가 읽는다. 그런데 recordClear와 setMuted(bool)는 이 객체를 인자로 받지 않고, 어느 객체를 고쳐 저장하는지도 적혀 있지 않다. Storage가 사본을 따로 들고 있으면, 같은 세션 안에서 선택 화면과 startGame이 해금 전 값을 읽는다. finishStage가 부르는 recordClear의 인자도 적혀 있지 않다.
- 최소 추가: "recordClear와 setMuted는 `AB.state.save`를 제자리에서 고친 뒤 `Storage.save(AB.state.save)`를 부른다. finishStage는 `recordClear(stageIndex, stars, score)`로 부른다" 한 줄.

**Q3-6 hop 2 "몸체 생성" — `StageKit.frame`의 반환형과 `StageDef.blocks`가 어긋난다**
- 위치: §4.4 `frame → BlockSpec[3]`, `STAGES: {…, blocks: BlockSpec[]}` ↔ §5 표의 "구조물" 칸
- 빠진 것: §5의 구조물 칸은 F(배열), K(단일 BlockSpec), H(TerrainSpec)를 한 목록에 섞어 적는다. 그런데 배열을 평탄하게 펴는 규칙도, H를 terrain으로 보내는 규칙도 없다. `blocks: [F(...)]`로 쓰면 `addBlock(engine, 배열)`에서 spec.m이 undefined가 되어 `CONFIG.MATERIALS[undefined]`를 읽는다. 그러면 스테이지 1 로드(hop 2)에서 끊긴다.
- 최소 추가: §5 표기 줄에 "blocks = `[].concat(F(...), K(...), …)`, H(...)는 terrain 배열에만 넣는다"를 넣는다.

**Q3-7 [경미] hop 5 "#screen-clear에 '스테이지 클리어!'" — 이 문구를 쓰는 단계가 홉에 없다**
- 위치: §7 hop 5, §4.4 `AB.UI.showResult` 행
- 빠진 것: §4.7에는 finishStage가 UI.showResult를 부른다는 말만 있다. 기호표의 showResult 책임 칸은 `#clear-title` 문구(일반 클리어 / L5 완주)를 맡기지 않는다.
- 최소 추가: showResult 책임 칸에 "kind·isLast에 따라 `#clear-title`·`#clear-score`·`#clear-stars`를 쓰고, isLast면 `#btn-next`를 숨김"을 넣는다. hop 5 이름 칸에는 `UI.showResult`를 더한다.

---

## Q4. build 요구마다 표 밖의 동사 문장이 있는가

- build 행(§1.2): L1~L18(18개)과 L22~L30(9개), 합계 **27행**. defer 4행(L19~L21, L31)과 n-a 4행(L32~L35)은 제외했다.
- 동사 문장(§1.4): **27개**로 ID가 같다. 모두 글머리표 목록에 있어 표 밖이다. C10의 "27개"와도 맞는다. 문장이 없는 행은 0개다.

**Q4-1 [경미] L8과 L12의 셋째 절이 보이는 증상이 아니라 결과를 적는다**
- 위치: §1.4 L8 "보정할 근거가 없어진다", L12 "돌 요새 스테이지(6~10)를 풀 수단이 없다"
- 빠진 것: 둘째 절이 없을 때 화면에 무엇이 보이는지가 없다.
- 최소 추가: L8은 "조준 중 새총 앞에 점이 하나도 없고, 발사 뒤 화면에 경로 점이 남지 않는다", L12는 "비행 중 탭해도 노란 새의 속도와 검은 새의 모습이 그대로다".

---

## Q5. 구현자 계약 — 부활 트리거, 해석되는 고정 버전, 보장마다 done의 명령(여기서는 읽기 점검 또는 사람 테스트)

- **부활 트리거:** §8의 기각 7개에 모두 트리거가 있고, §11에 두 개(물리 자체 구현, ES 모듈·fetch)를 다시 적었다. 결함은 Q5-5 하나다.
- **버전 고정:** Matter.js `0.19.0`이 §3 A3, §4.3, §11에서 같은 값이다. URL 두 줄은 문자 그대로 복사하도록 돼 있다. 문서 안에 모순은 없다. URL이 실제로 존재하는지는 문서만으로 판정할 수 없으며, 계획이 이를 스스로 인정하고 A3에 사람 확인 절차를 두었다. 결함 없음.
- **보장과 done의 대응:**

| 계획이 사는 보장(출처) | done의 확인 수단 | 판정 |
|---|---|---|
| 빌드 없음, 브라우저가 파일을 그대로 읽음(§4.1 행 1) | C1 | 있음 |
| 적층 안정(§4.1 행 2, §11) | T4 | 있음 |
| Matter API 제한, 엔진 교체 시 한 파일만 바뀜(§4.1 행 2, §4.2 (1)(2)) | C3 | **C3이 C1과 충돌(Q5-1)** |
| rAF 루프 하나(§4.1 행 3) | C4 | 있음 |
| 블록은 `body.vertices` 한 경로로만 그림(§4.1 행 3) | 없음 | **없음(Q5-2)** |
| DOM 버튼과 id 배선(§4.1 행 4) | C6 | 있음 |
| IIFE와 `AB` 네임스페이스로 전역 충돌 방지(§4.1 행 5, §4.3 규칙) | 없음(C2는 이름만 봄) | **없음(Q5-2)** |
| 최상위에서 다른 파일 함수를 부르는 곳은 boot 하나(§4.3 규칙) | 없음 | **없음(Q5-2)** |
| 시그니처 고정(§2 목표, §4.4 제목) | 없음(C2는 정의 횟수만 봄) | **없음(Q5-3)** |
| 오류 시 원인 표시(§4.2 (3), L28, §11) | T9 | 있음 |
| 저장·오디오 격리, `Audio.play`는 절대 예외 없음(L29, §4.8) | C9(생성자와 localStorage만) | **부분(Q5-4)** |

**Q5-1 [심각] C3과 C1은 동시에 참이 될 수 없다**
- 위치: §10 C1, C3, §4.3 폴백 줄, L28 문장
- 빠진 것: C1은 index.html의 script 13줄이 §4.3과 글자 단위로 같기를 요구하는데, 그 둘째 줄에 `window.Matter`가 있다. C3은 `Matter` 식별자가 physics.js 밖에서 0회이기를 요구한다. L28 문장("물리 엔진(Matter.js)을…")을 main.js에 쓰면 그 파일에도 `Matter`가 생긴다. 이 보장을 증명하는 유일한 done 항목이 충족될 수 없다. 구현자에게 남는 선택은 둘이다. 폴백 줄을 고쳐 C1을 깨고 폴백을 잃거나, C3이 거짓인 채로 두는 것이다.
- 최소 추가: C3에 "대상은 `js/` 안의 physics.js 이외 파일이고 문자열 리터럴은 제외한다. index.html의 §4.3 폴백 줄은 예외다"를 넣는다.

**Q5-2 §4.1 행 3·5와 §4.3 규칙이 사는 보장에 done 항목이 없다. §4.5 블록은 그 규칙과 자체 모순이다**
- 위치: §4.1 표, §4.3 "규칙" 두 줄, §4.5 `// js/config.js` 블록, §10
- 빠진 것: done에는 다음을 확인하는 항목이 없다. 모든 js 파일의 첫 줄이 `window.AB = window.AB || {};`이고 본문이 `'use strict'` IIFE 안에 있는지, 최상위에서 다른 파일을 부르는 곳이 boot 말고 0개인지, 블록을 `body.vertices`로만 그리는지. 게다가 §4.5가 "그대로 복사"하라는 config.js 블록은 IIFE 없이 최상위에 `AB.CONFIG = {…}`를 둔다. §4.3의 "본문은 IIFE 안" 규칙과 문서 스스로 어긋난다.
- 최소 추가: C11 "js 10개 파일 각각 첫 줄이 `window.AB = window.AB || {};`이고 나머지 본문은 IIFE 안이다(config.js는 IIFE로 감싸 복사하거나 예외로 명시한다, 둘 중 하나로 고정). 파일 최상위 실행 코드에서 다른 파일의 `AB.*` 호출은 0개다(`AB.Main.boot()` 인라인 제외). render.js의 블록 그리기는 `body.vertices`만 읽는다."

**Q5-3 "시그니처 고정"을 확인하는 done 항목이 없다**
- 위치: §2("이음새(전역 이름, 시그니처, 로드 순서, 초기 상태)를 고정"), §4.4 제목, §10 C2
- 빠진 것: C2는 심볼이 한 번 정의되고 기호표에 있는지만 본다. 매개변수 목록과 호출처의 인자 수를 대조하는 항목이 없다. Q3-4의 addBird/nudge 불일치가 바로 이 틈으로 통과한다. §4.5에서 "그대로 복사"하라는 상수 블록과 초기 상태 블록이 실제 파일과 같은지도 done에 없다.
- 최소 추가: C2에 "각 정의의 매개변수 목록이 기호표와 같고 모든 호출처의 인자 수도 같다. config.js의 `AB.CONFIG`와 game.js의 `AB.state`가 §4.5 블록과 값 단위로 같다"를 넣는다.

**Q5-4 C9가 L29·§4.8의 보장보다 좁고, hop 1이 그 틈에 걸려 있다**
- 위치: §10 C9 ↔ §4.8 "모든 함수를 try/catch로 감싼다. `AB.Audio.play`는 절대 예외를 던지지 않는다", cold-start AudioContext 행("예외는 없음"), §4.4 startGame("`Audio.unlock()` 후 loadStage")
- 빠진 것: C9는 `localStorage.*` 호출과 `new AudioContext` 생성자가 try 안에 있는지만 본다. unlock 안의 `ctx.resume()`, play 안의 노드 생성과 connect에서 나는 예외는 C9 밖이다. unlock이 예외를 던지면 hop 1은 loadStage에 닿지 못한다.
- 최소 추가: C9에 "audio.js와 storage.js의 모든 공개 함수는 본문 전체가 try 블록 안에 있다"를 넣는다.

**Q5-5 [경미] A7의 `??`/`?.` 금지에 부활 조건도 done 항목도 없다**
- 위치: §3 A7
- 빠진 것: A7은 대상을 "최신 브라우저"로 가정하면서, 그 가정이 틀린 경우를 근거로 금지를 둔다. 그래서 빌더에게는 조건 없는 금지로 읽힌다. 이 금지를 확인하는 C 항목도 없다.
- 최소 추가: A7 끝에 "대상 브라우저가 최신 버전으로 확정되면 다시 연다"를 넣고, C 한 줄 "`??`·`?.` 0회"를 더한다.

---

## 가장 심각한 발견

Q1-1이다. §4.7의 move/up 처리기에 `phase==='aiming'` 가드가 없고, release()는 `|pull|`만 확인한다. 그래서 비행 중 탭(능력 사용)이나 조준 중 일시정지 뒤의 pointerup마다, 직전 pull로 새가 한 번 더 발사된다. 이 새는 큐를 줄이지 않는다.
