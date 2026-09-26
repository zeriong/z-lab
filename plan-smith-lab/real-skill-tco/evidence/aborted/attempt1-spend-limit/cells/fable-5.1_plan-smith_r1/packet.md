# Context Packet — angry-birds-web-game
- Date: 2026-09-26
- Requested by: zeriong
- Language of artifacts: 한국어 (코드 식별자·API명·URL은 원문 유지)

## Run stamp — record, never guess
- plan-smith version: 1.4.2 (`.claude-plugin/plugin.json`에서 읽음)
- frames.md fingerprint: 431 lines
- Main agent model: claude-fable-5-1
- plan-writer model: claude-fable-5-1 (`agents/plan-writer.md` frontmatter `model: inherit` → 메인과 동일)
- Skill invocation: batch/scripted — `runner.sh`가 헤드리스 `claude -p`로 `/plan-smith:plan-smith` 호출, `--effort xhigh`, 도구 `Read,Write,Glob,Grep,Agent,Skill`, `AskUserQuestion` 미제공. 확인 게이트는 프롬프트의 "배치 실행이므로 스스로 승인" 지시에 따라 메인 에이전트가 자가 승인함(아래 "확인 게이트 기록" 참조).

## Task (one line)
웹 브라우저에서 동작하는 앵그리버드형 물리 슬링샷 게임(10스테이지, 인게임 우측 일시정지 → 다시하기/메인으로)을, 설치·빌드·실행·테스트가 불가능한 구현자(claude-fable-5-1, Read/Write 도구만)가 계획서 하나만 읽고 구현할 수 있도록 하는 계획서를 작성한다.

## Background (why now)
- 실험 `real-skill-tco`: 같은 요구사항으로 `base-plan`(방법론 없음) vs `plan-smith`(v1.4.2 실제 스킬)를 비교한다. 계획자와 구현자는 같은 모델. 이 셀은 `fable-5.1 / plan-smith / r1`.
- 입력은 요구사항 파일 하나뿐이며 세션 대화 맥락은 없다.
- 구현 단계: 구현자는 "계획서 경로 + 출력 디렉터리(`<cell>/result/`)"만 받고 `Read, Write`만으로 작성한다. 구현 프롬프트 원문: "파일 구성·개수·분량은 전부 네가 정한다. 너에게는 파일을 읽고 쓰는 도구만 있다. 설치·빌드·실행·테스트는 할 수 없다." → 계획서가 파일 목록·순서·심볼을 고정하지 않으면 구현자의 기본값이 빈자리를 채운다.
- 판정(SPEC.md): DONE = 사다리 L5 + 프로브 중 uncaught JS 에러 0. 사다리 L0~L6의 정의는 이 저장소에 없다. 프로브는 리스너·좌표를 **소스에서 읽고** 스크린샷으로 대조하며, `setPointerCapture`를 **무력화**한다.

## Goal — definition of success
구현자가 이 계획서만 읽고 쓴 파일들을 브라우저에서 `index.html`로 열었을 때:
1. 콘솔에 uncaught 에러 없이 메인 화면이 뜬다.
2. 게임 시작 → 스테이지 1에서 새총을 드래그해 발사 → 포물선·중력·충돌·구조물 파괴 → 돼지 제거 → 클리어/실패 판정 → 다음 스테이지 진행이 10스테이지까지 이어진다.
3. 인게임 우측의 일시정지 버튼을 누르면 "다시하기"/"메인으로" 버튼이 있는 오버레이가 뜨고, 각 버튼이 실제로 스테이지 재시작/메인 복귀를 수행한다.

계획서 자체의 성공 조건: 구현자가 외부 질문·재량 판단 없이 (a) 파일 목록과 로드 순서, (b) 각 파일의 공개 심볼과 정확한 시그니처, (c) 상태 머신과 판정 규칙(수치 포함), (d) 10스테이지의 실제 데이터를 그대로 옮겨 적을 수 있다. 구현자는 자기 출력을 **읽어서** 검사할 수 있을 뿐 실행할 수 없으므로, 계획서의 완료 기준 중 구현자 몫은 전부 읽기 검사여야 한다.

## Hard constraints
1. 스테이지는 10단계 — source: 요구사항 1.
2. 앵그리버드와 같은 게임 시스템: 새총으로 발사체를 당겨 쏘고, 포물선 궤적·중력·충돌·구조물 파괴로 목표(돼지)를 제거하는 물리 기반 슬링샷 — source: 요구사항 2.
3. 인게임 **우측**에 일시정지 버튼이 있고, 클릭 시 **"다시하기"**/**"메인으로"** 버튼이 존재한다. 버튼 라벨은 이 한국어 문자열 그대로 — source: 요구사항 3.
4. 구현자 = `claude-fable-5-1`, 도구는 Read/Write뿐, 설치·빌드·실행·테스트 불가, 입력은 계획서 단독 — source: 사용자 프롬프트.
5. 빌드 체인 없음: npm·번들러·TypeScript·트랜스파일 금지. 브라우저가 직접 로드하는 HTML/CSS/JS(클래식 `<script>`)만 — derived from 4.
6. `file://`로 열어도 동작해야 한다: `<script type="module">`, `fetch`/XHR, 별도 JSON 파일, 서버 전제 금지. 모든 데이터(10스테이지 포함)는 클래식 스크립트 안의 JS 리터럴 — source: 플랫폼 제약(Chromium은 file:// 출처의 모듈 로드·fetch를 CORS로 차단) + 4.
7. 바이너리 에셋 없음(PNG/MP3 등): 구현자는 텍스트 파일만 쓸 수 있다 → 모든 그래픽은 Canvas 2D 절차적 드로잉, 오디오가 있다면 Web Audio 합성 — derived from 4.
8. 외부 의존성은 **정확한 버전이 박힌 완전한 복사 가능 URL 문자열**로만 지정한다(이름만 적고 버전을 회상하게 두지 않는다) — source: frames.md machinery budget + 4.
9. 런타임 uncaught JS 에러 0 — source: SPEC.md 판정 기준. 특히: DOM 조회 null 가드, `window.Matter` 부재 시 throw 대신 화면 안내, localStorage 접근 try/catch.
10. 계획서 단계에서 코드를 작성하지 않는다 — source: 사용자 프롬프트. **해석(⚠guess, 배치 자가 승인):** "구현 파일을 쓰지 않는다"는 뜻으로 읽는다. 기계 예산 규칙이 요구하는 **복사 가능한 접합부 블록**(의존성 `<script>` 태그 한 줄, Matter 별칭 한 줄, 파일별 공개 심볼 표와 시그니처, 초기 상태 선언, 스테이지 데이터 스키마 예시 1개)은 계획서의 일부로 허용한다. 단 블록당 15줄 이내, 함수 본문·게임 로직 구현은 금지.
11. 출력 계약: 계획서는 `plans/angry-birds-web-game/plan.md` 하나(하네스는 `plans/*/plan.md` 중 첫 파일만 인식). 구현 파일 경로는 구현자에게 주어질 **출력 루트 기준 상대 경로**로 기술하고, 진입점은 그 루트의 `index.html` — source: runner.sh.
12. 계획서 언어는 한국어 — source: 사용자 대화 언어.

## Soft preferences
- 궤적 예측 점선(조준 중 예상 궤적 표시) — 요구사항 "핵심 질문"에 명시된 항목이므로 build 권장.
- 점수·별(1~3)·스테이지 선택 화면·진행 저장(localStorage, try/catch, 실패 시 메모리 폴백) — "완성된 느낌"에 필요한 표면. 요구사항에 명시되진 않았으나 spec-coverage의 "artifact plainly needs" 축.
- 파일 수는 적게(대략 5~8개), `<script>` 태그 순서 고정, 모두 `<body>` 끝에 배치.
- UI는 DOM 오버레이(실제 `<button>` 요소, 고유 id), 게임 월드는 Canvas 2D. 일시정지 버튼은 캔버스 위 `position:absolute; right: …; top: …`.
- 입력은 Pointer Events로 통일: `pointerdown`은 canvas에, `pointermove`/`pointerup`/`pointercancel`은 `window`에 등록. **`setPointerCapture`는 호출하지 않는다**(프로브가 무력화함). 좌표 변환은 `getBoundingClientRect()` + 논리 해상도/CSS 크기 비율.
- 명명된 상수(캔버스 논리 크기, 새총 앵커 좌표, 최대 당김 거리, 발사 계수 등)는 한 파일 최상단에 모아 둔다 — 프로브가 소스에서 좌표를 읽는다.
- 카메라 스크롤/줌 없음: 스테이지 전체가 고정 논리 해상도 안에 들어가도록 설계(좌표 매핑 위험 최소화).
- 오디오는 요구사항에 없다. 넣는다면 합성음 + 사용자 제스처 이후 AudioContext 생성 + 전부 try/catch. `defer(+trigger)`로 두는 것도 허용.
- 일시정지 오버레이에는 요구된 두 버튼 외에 재개 경로(예: "계속하기" 버튼 또는 일시정지 버튼 재클릭)가 있어야 게임이 막히지 않는다.
- 10스테이지 데이터는 계획서가 표로 소유한다(스테이지별 새 수, 돼지 수·위치, 구조물 구성·재질, 별 점수 기준). 난이도 곡선이 보여야 한다.

## Rejected alternatives (and why)
- **물리 엔진 직접 구현** — 거부: 테스트 불가 환경에서 강체 스태킹·회전·충돌 해소·터널링은 최고 버그 위험이고, 오류가 JS 예외가 아니라 "구조물이 폭발/침몰"로 나타나 읽기 검사로 못 잡는다. frames.md 기록: CDN URL 하나가 맞으면 약한 구현자도 발사 단계까지 도달했다. **부활 조건:** 실행 환경에 네트워크가 없어 CDN 로드가 실패한다고 관측되면 — 그때는 원/AABB만 다루는 최소 엔진으로 재설계.
- **TypeScript / 번들러 / npm** — 거부: 구현자가 빌드를 못 돌린다. 부활: 구현자에게 Bash가 주어지면.
- **ES 모듈 + fetch로 JSON 스테이지 로딩** — 거부: file://에서 CORS로 차단. 부활: http 서버 배포가 확정되면.
- **Matter.js 공식 slingshot 데모 방식(MouseConstraint + Constraint로 새 매달기)** — 거부: MouseConstraint 리스너가 canvas 요소에 묶여 포인터가 캔버스를 벗어나면 끊기고, 발사 후 제약 해제 타이밍(앵커 통과 검사)이 버그 온상. 대신 조준 중 새를 `isStatic`으로 두고 `Body.setPosition`으로 끌다가, 릴리즈 시 `Body.setStatic(bird,false)` + `Body.setVelocity(bird, launchVelocity)`. 부활: 직접 드래그 방식이 프로브에서 동작하지 않는다고 관측되면.
- **Matter.Render 내장 렌더러** — 거부: 디버그 외형, DOM UI·HUD와 통합 곤란. `body.vertices`/`position`/`angle`/`circleRadius`를 읽어 직접 Canvas 2D로 그린다. 부활: 커스텀 드로잉이 계획 분량을 넘치면 `wireframes:false`로 대체.
- **캔버스 안에 그린 버튼(히트테스트)** — 거부: 실제 DOM `<button>`이 클릭 신뢰성·소스 가독성(프로브가 리스너를 소스에서 읽음)에서 우월하고 코드가 적다. 부활: 오버레이가 캔버스 포인터 이벤트를 가로채는 문제가 CSS `pointer-events`로 해결되지 않을 때.
- **relay 스타일(2패스)** — 거부: 비용 2배, 사용자의 "철저히" 신호 없음, 실험이 토큰 비용을 잰다.

## Decisions already made
- **프레임 = spec-coverage, 스타일 = opus, standalone** — Gate 0(아래) 및 auto-routing.
- **물리 = Matter.js 0.20.0 via CDN** (⚠guess, 배치 자가 승인). 주 URL: `https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js` (전역 `window.Matter`). 보조 URL: `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js`. 부트 시 `window.Matter`가 없으면 throw 하지 말고 화면에 한국어 안내를 표시한다(제약 9). 폴백은 두 번째 CDN 문자열까지만 허용하며, 존재하지 않는 로컬 파일(vendored)로의 폴백은 금지.
- **렌더링 = Canvas 2D**, 고정 논리 해상도(예: 1280×720 ⚠guess — 작성자가 확정) + CSS 스케일. UI/HUD/오버레이 = DOM.
- **새총 = static-drag 방식**(위 거부 항목 참조).
- **상태 머신**: MENU → STAGE_SELECT(⚠guess, 작성자 재량으로 MENU에 합쳐도 됨) → PLAYING → PAUSED → CLEARED / FAILED. 요구사항 핵심 질문의 "메인 → 인게임 → 일시정지 → 클리어/실패" 그대로 + 선택 화면.
- **스테이지 데이터 = `levels.js` 안의 배열 리터럴 10개**, 스키마는 계획서가 고정.
- **Matter.js API 사용 원칙**: 0.20.0에서 존재가 확실한 것만 — `Engine.create()`, `engine.gravity.y`, `Composite.add/remove/allBodies/clear(world, false)`, `Bodies.rectangle(x,y,w,h,opts)`(중심 좌표), `Bodies.circle(x,y,r,opts)`, `Body.setStatic/setPosition/setVelocity/setAngularVelocity`, `Engine.update(engine, 1000/60)`, `Events.on(engine, 'collisionStart', fn)` → `event.pairs[i].bodyA/bodyB`, `Vector.sub/magnitude`, body 속성 `vertices/position/angle/circleRadius/label/speed/velocity/isStatic/id`. 게임 데이터는 body에 커스텀 속성(예: `body.game = {kind, hp}`)으로 붙인다. `World.add`(deprecated) 대신 `Composite.add`.
- **계획서 안 코드 = 접합부 블록만**(제약 10).

## Relevant files & paths
- `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/inputs/game-prompt.md` — 요구사항 정본(3개 요구 + 플랜이 답해야 할 핵심 질문 7개). takeaway: 요구 3개는 전부 `build`이며, 핵심 질문 7개(물리 엔진, 렌더링, 스테이지 데이터/전환, 슬링샷 입력·궤적 UX, 충돌·파괴·점수·클리어 규칙, 일시정지 오버레이·상태 머신, 완료 판정 기준)는 계획서가 빠짐없이 답해야 하는 섹션 체크리스트로 쓴다.
- `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/SPEC.md` — 실험 스펙(읽기 전용, 계획서에 인용하지 말 것). takeaway: 구현 도구 Read/Write만; 판정 DONE = L5 + uncaught 에러 0; 프로브는 `setPointerCapture` 무력화, 리스너·좌표를 소스에서 읽음.
- `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/runner.sh` — 하네스 정본. takeaway: 구현 프롬프트는 "계획서 경로 + 출력 `<cell>/result/`"뿐이고 파일 구성은 구현자 재량 → 계획서가 파일 목록을 고정해야 한다. 플랜 파일은 `plans/*/plan.md` 하나만 인식.
- 코드베이스: **비어 있음(그린필드)**. 작업 디렉터리 `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r1/`에 기존 파일 없음.

## Unknowns & open questions
- 판정 사다리 L0~L6의 정의(이 저장소에 없음). L5가 정확히 무엇인지 모른다 → 계획은 "발사→파괴→클리어→10스테이지 진행→일시정지 3버튼 동작"을 전부 갖추는 것으로 대응한다.
- 프로브 실행 환경의 네트워크 가용성(CDN 로드 가능 여부) — 모름. 위험으로 기재하고 물리 엔진 거부 항목의 부활 조건과 연결.
- 프로브가 합성하는 이벤트 종류(pointer / mouse / touch) — 모름 → Pointer Events만 사용(Chromium은 마우스·터치 모두에 pointer 이벤트를 발생시킴). 리스너는 이름 있는 함수로 등록해 소스에서 식별 가능하게.
- file:// vs http:// — 모름 → 둘 다에서 동작(제약 6).
- Matter.js 0.20.0 API 세부는 메인 에이전트의 기억이며 이 환경에서 검증 불가 → 위 "사용 원칙" 목록 밖의 API는 쓰지 않는다.
- 클래식 스크립트 다중 파일 함정: 최상위 `const`/`let`은 전역 렉시컬 스코프를 공유하므로 **다른 파일에서 같은 식별자를 재선언하면 SyntaxError**로 전부 죽는다. 계획서는 이를 규칙으로 막아야 한다(예: Matter 별칭은 정확히 한 파일에서만 선언, 파일 간 공유는 단일 네임스페이스 객체 또는 "식별자당 선언 1회" 규칙). 작성자가 방식을 확정할 것.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 요구사항은 완결돼 있다(요구 3개 + 답해야 할 질문 7개). 이 계획을 문자 그대로 따랐을 때의 위험은 "잘못 고름"이 아니라 "빠뜨림"이다 — 10스테이지 콘텐츠, 일시정지 오버레이의 배선, 클리어/실패 판정, 테스트 못 하는 구현자가 기본값으로 메울 빈칸. frames.md의 A/B에서 좁히는 프레임(backward)이 명시 요구를 잘라낸 것이 관측된 바로 그 과제 유형이다. 유일한 진짜 either/or(물리 엔진)는 이 패킷에서 결정하고 부활 조건을 달았으므로 **차용 프레임 없음**.
- (build-out) Frame is `spec-coverage`; borrowed frame: **none** (물리 엔진 결정은 패킷에서 완료).
- **Implementer**: `claude-fable-5-1` — 강한 모델이지만 **실행 환경이 0**(Read/Write만, 설치·빌드·실행·테스트 불가, 질문 불가).
- **Machinery budget applies** (구현자 능력이 아니라 실행 환경 때문): 빌드 체인 없음, config-referencing-config 없음, 의존성은 완전한 복사 가능 URL 문자열, 최고 위험 접합부(의존성 별칭 줄, 파일별 공개 심볼 표와 정확한 시그니처, 초기 상태 선언)는 계획서에 verbatim 복사 블록으로, 구현자 몫 완료 기준은 명령이 아니라 **읽기 검사**. 브라우저에서 확인하는 명령형 검사는 "검증자(브라우저를 가진 사람/하네스) 몫"으로 별도 표기해 구현자에게 실행을 요구하지 않는다.

## Load-bearing path candidate (build-out only)
- Path: canvas `pointerdown`(장전된 새 근처) → `window` `pointermove`(당김 갱신) → `window` `pointerup`(발사: `setStatic(false)` + `setVelocity`) → rAF 루프의 `Engine.update` + `collisionStart` 피해 처리 → 새가 포물선으로 날아가 구조물을 치고 돼지가 제거되며 돼지 수 0이면 CLEARED.
- Why this one: 발사가 안 되면 10스테이지도 일시정지도 무의미하다. 일시정지 경로(요구 3)는 짧은 보조 체인(≤3홉: `#pause-btn` click → PAUSED+오버레이 표시 → "다시하기"→스테이지 재시작 / "메인으로"→MENU)으로 같은 섹션에 덧붙일 것을 권장 — 명시 요구이며 자체 배선을 갖기 때문.
- 콜드스타트 표에 반드시 나와야 할 조건(예시): `game.state`(초기 MENU, `startStage`가 PLAYING으로), `game.currentBird`(초기 null, `loadNextBird`가 세팅), `game.aiming`(초기 false, hop 1이 true로), 새의 `isStatic`(장전 시 true, hop 3이 false로), `pigsAlive`(스테이지 빌드가 세팅), `engine`(부트에서 생성), rAF 루프 시작 시점, `window.Matter` 정의 시점(스크립트 태그 순서), 리스너 등록 시점(`init()`).

## Frame selection
- Frame: `spec-coverage`
- Rationale: Gate 0 = build-out. 술어 ①(불확실성 위치): 원인·시장·실행자 모두 알려짐, 실행만 남음 → Gate 0가 결정 → spec-coverage. 차점 `backward`는 frames.md의 동일 과제 A/B에서 명시 요구를 "cosmetic"으로 재분류하고 스택을 침묵시킨 전력이 있어 배제. `emotion-curve`(게임 도메인 힌트)는 감정 곡선이 아니라 누락이 위험이므로 배제.

## Style selection
- Style: `opus`
- Execution mode: **standalone** (다른 패스 없음 — 고백 로그에서 작업을 미룰 다음 패스는 존재하지 않는다)
- Rationale: auto-routing 1행 "first draft; coverage-critical" 발화. 차점 `fable`은 소비자가 기계 구현자라 규칙 인코딩이 유용하나, level-shift 지시가 이미 완결된 스펙을 재구성하도록 유도하고, 필요한 규칙 구조(원장, 하중 경로, 콜드스타트 표)는 spec-coverage가 이미 요구한다. `relay`는 신호 없음 + 비용 2배로 거부.

## Output contract
- Plan file: `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r1/plans/angry-birds-web-game/plan.md`
- Wiring audit (Stage 2c, build-out 필수): `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r1/plans/angry-birds-web-game/wiring-audit.md`

## 확인 게이트 기록 (batch self-approval)
- `AskUserQuestion` 미제공 + 프롬프트의 "배치 실행이므로 스스로 승인" 지시에 따라 메인 에이전트가 승인.
- ⚠guess 해소 내역: (1) 물리 = Matter.js 0.20.0 CDN → 승인(부활 조건 기재). (2) "코드를 쓰지 않는다" = 구현 파일 금지, 접합부 복사 블록 허용(15줄 상한) → 승인. (3) 논리 해상도 1280×720, STAGE_SELECT 상태 → 작성자 재량으로 위임. (4) 구현자의 기계 예산 적용(강한 모델이나 실행 환경 0) → 승인.

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, model <model>, one-line note -->
