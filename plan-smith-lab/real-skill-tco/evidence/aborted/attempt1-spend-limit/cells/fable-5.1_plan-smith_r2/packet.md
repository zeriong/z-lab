# Context Packet — angry-birds-web
- Date: 2026-09-26
- Requested by: zeriong (<EMAIL>)
- Language of artifacts: 한국어 (패킷·계획서 모두 한국어. 코드 식별자·API 이름은 원문 그대로)

## Run stamp — record, never guess
- plan-smith version: 1.4.2 (`/Users/jeonjelyong/.claude/plugins/cache/plan-smith-marketplace/plan-smith/1.4.2/.claude-plugin/plugin.json` 에서 읽음)
- frames.md fingerprint: 431 lines (`skills/plan-smith/references/frames.md`, Read 결과의 마지막 줄 번호)
- Main agent model: claude-fable-5-1
- plan-writer model: claude-fable-5-1 (`agents/plan-writer.md` 의 `model: inherit` → 메인과 동일)
- Skill invocation: **batch/scripted** — 헤드리스 `claude -p`, `--tools Read,Write,Glob,Grep,Agent,Skill`, AskUserQuestion 미제공. 사용자 확인 게이트는 프롬프트 지시("배치 실행이므로 스스로 승인")에 따라 메인 에이전트가 자가 승인했다. 아래 `⚠guess` 표시는 그 자가 승인으로 해소된 항목이다(사용자 확인 아님).

## Task (one line)
웹 브라우저용 앵그리버드류 물리 슬링샷 게임(10 스테이지, 인게임 우측 일시정지 → 다시하기/메인으로)을, **파일 읽기·쓰기 도구만 가진 claude-fable-5-1** 이 이 계획서 하나만 읽고 구현할 수 있도록 하는 구현 계획서를 쓴다.

## Background (why now)
- 입력은 요구사항 파일 하나뿐이다(`inputs/game-prompt.md`). 대화 맥락은 없고, 프롬프트에 구현자 조건이 명시돼 있다.
- 이 계획서는 비교 실험의 산출물이다: 같은 요구사항으로 `{opus, fable} × {기본 계획, plan-smith}` 셀이 각각 계획서를 쓰고, **같은 모델이 계획서만 읽고 구현**한 뒤 브라우저에서 작동 여부를 판정한다. 즉 계획서의 가치는 "구현자가 한 번에 작동하는 게임을 쓰게 하는가"로만 측정된다.
- 구현자는 설치·빌드·실행·테스트를 할 수 없다. 계획서에 적힌 것 중 구현자가 "기억해서 재현"해야 하는 부분(라이브러리 URL, API 이름, 파일 간 호출 규약)이 곧 실패 지점이다. 이 패킷은 그 부분을 최대한 **복사 가능한 문자열**로 고정한다.

## Goal — definition of success
계획서를 읽은 claude-fable-5-1 이 Read/Write 만으로 파일들을 써냈을 때, 그 파일들을 브라우저로 열면:
1. 메인 화면 → 게임 시작 → 스테이지 1 이 뜨고, 새총의 새를 드래그해 놓으면 포물선으로 날아가 구조물·돼지와 충돌하고, 구조물이 부서지며, 돼지가 제거된다.
2. 돼지를 전부 제거하면 클리어 판정 → 다음 스테이지로 이어지며, 스테이지 10까지 **서로 다른 내용의** 10개 스테이지가 있다.
3. 인게임 **우측**에 일시정지 버튼이 있고, 누르면 **다시하기 / 메인으로** 버튼이 있는 오버레이가 뜬다(각 버튼이 실제로 동작한다).
4. 위 과정에서 잡히지 않은 JS 에러(uncaught error)가 0건이다.
5. 이 모든 것이 **수리 라운드 없이** 첫 구현에서 나온다. 계획서 분량은 이 목표에 봉사하는 만큼만.

## Hard constraints
- **스테이지 10개** — 출처: 요구사항 파일 1번. 로더 하나 + 스테이지 1개가 아니라, 난이도 곡선을 가진 **10개의 서로 다른 저작 데이터**.
- **앵그리버드와 같은 게임 시스템** — 출처: 요구사항 파일 2번 괄호 설명. 새총 드래그·조준·발사, 포물선 궤적, 중력, 충돌, 구조물 파괴, 목표(돼지) 제거.
- **일시정지 버튼이 인게임 우측에 존재**, 클릭 시 **다시하기 / 메인으로** 버튼 존재 — 출처: 요구사항 파일 3번. 두 버튼은 실제로 재시작·메인 복귀를 수행해야 한다.
- **구현자 = claude-fable-5-1, 이 계획서 하나만 읽음, Read/Write 도구만 있음, 설치·빌드·실행·테스트 불가** — 출처: 사용자 프롬프트.
- 위에서 따라오는 **기계장치 예산(machinery budget)** — 출처: frames.md "The machinery budget" 절 + 사용자 프롬프트의 구현자 조건:
  - 빌드 체인 없음(npm·번들러·TypeScript 컴파일·tsconfig 없음). 브라우저가 **직접 여는 평문 HTML/JS 파일**만.
  - 파일 수 최소(대략 `index.html` + JS 3~6개), 설정 파일이 다른 설정 파일을 참조하는 구조 금지.
  - 외부 의존성은 **완전한 복사 가능 문자열**(정확한 버전이 박힌 전체 URL) 하나로만 표기. 이름만 적고 버전을 구현자가 떠올리게 하는 것 금지.
  - 명령 실행형 완료 기준(`npm test exits 0` 류) 금지 — 구현자는 실행할 수 없다. 완료 기준은 **구현자가 자기 출력 파일을 읽어서 확인할 수 있는 형태**로만.
  - 가장 위험한 접합부(의존성 별칭 줄, 파일별 공개 함수 시그니처 표, 초기 상태 선언)는 계획서 안에 **그대로 복사 가능한 블록**으로 싣는다. 이것은 코드 작성이 아니라 접합부 고정이다.
- **이 단계에서는 게임 소스코드를 작성하지 않는다** — 출처: 사용자 프롬프트. 산출물은 계획서 md 한 파일. (위 접합부 블록은 계획서의 일부이며, 별도 소스 파일을 만드는 것이 아니다.)
- **출력 경로**: `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r2/plans/angry-birds-web/plan.md` — 출처: 스킬 관례 `plans/<slug>/plan.md`. 실험 러너가 `plans/*/plan.md` 첫 파일을 집어가므로 이 경로 하나만 존재해야 한다.
- **판정 환경 사실** — 출처: 상위 디렉터리의 실험 사양 `real-skill-tco/SPEC.md` "판정" 절(Stage 1 에서 메인 에이전트가 읽음; 요구사항 파일에는 없는 정보임을 명시한다):
  - 산출물은 브라우저에서 열려 **합성 포인터 이벤트**로 조작되며, **uncaught JS 에러가 1건이라도 있으면 미완료**로 판정된다.
  - 프로브는 `setPointerCapture` 를 무력화한다 → 입력 코드는 `setPointerCapture` 에 의존하면 안 되고, `pointermove`/`pointerup` 은 캔버스가 아니라 `window` 에서 받아야 드래그 중 포인터가 캔버스를 벗어나도 발사가 된다.
  - 리스너와 좌표는 소스에서 읽어 스크린샷과 대조한다 → 클릭 대상(버튼)은 소스에서 위치·핸들러가 명확히 읽히는 형태가 유리하다(아래 소프트 선호 "DOM 오버레이" 참고).

## Soft preferences
- **물리: Matter.js 0.20.0 을 CDN 으로** (결정 사항 참고). 렌더는 Matter.Render 를 쓰지 않고 Canvas 2D 에 직접 그린다(새·돼지·블록을 식별 가능한 색·모양으로). Matter.Runner 도 쓰지 않고 `requestAnimationFrame` 안에서 `Engine.update(engine, 1000 / 60)` 를 직접 호출한다 — 일시정지가 "update 를 건너뛴다" 한 줄로 끝나고, 0.20.0 의 속도 단위가 기준 delta(16.666ms)와 일치한다.
- **화면 구성: 고정 논리 해상도의 캔버스 1장(예: 1280×720) + 그 위에 DOM 오버레이**(메인 메뉴, HUD, 일시정지 버튼, 일시정지/클리어/실패 오버레이). 월드는 카메라 스크롤 없이 한 화면에 다 들어가게 설계한다(스테이지 데이터도 그 좌표계로 저작). 캔버스가 CSS 로 축소되면 포인터 좌표를 `getBoundingClientRect` 비율로 논리 좌표에 매핑해야 한다 — 이걸 빠뜨리면 드래그가 새를 못 잡는다.
- **상태 머신을 명시적으로**: `MAIN → INGAME ⇄ PAUSED`, `INGAME → CLEAR | FAIL`, `PAUSED/CLEAR/FAIL → INGAME(재시작) | MAIN`, `CLEAR → INGAME(다음 스테이지)`. 각 전이에서 월드를 어떻게 정리하는지(`Composite.clear` 후 재빌드 등)가 적혀 있어야 "다시하기"가 실제로 동작한다.
- **턴 흐름**: 새 발사 → 정착 판정(모든 동적 바디가 느리거나 잠듦, 또는 타임아웃) 또는 새가 화면 밖 → 새 제거 → 다음 새 장전 또는 클리어/실패 판정. 클리어 = 돼지 0마리(짧은 정착 지연 후 판정해 낙하 점수를 포함). 실패 = 남은 새 0 + 월드 정착 + 돼지 잔존.
- **점수·별·진행 저장**: 블록 파괴·돼지 제거·남은 새 보너스로 점수, 스테이지별 별 임계값(데이터에 저작), `localStorage` 에 클리어/별 저장(`try/catch` 로 감싸서 저장 실패가 게임을 막지 않게). 스테이지 선택 화면은 있으면 좋지만 요구사항은 아니다 — 있다면 메인 → 스테이지 선택 → 인게임.
- **파괴 피드백·궤적 예측**: 파괴 시 단순 파티클, 드래그 중 예측 점선(같은 적분 규칙으로 몇 십 스텝 미리 계산). 오디오는 외부 파일 없이 WebAudio 오실레이터로만, 있으면 좋고 없어도 된다(단, 있으면 사용자 제스처 후에만 AudioContext 를 만들어 경고를 피한다).
- **에셋 없음**: 이미지·오디오 파일을 받을 수 없으므로 모든 시각 요소는 캔버스 프리미티브로 그린다.
- **`fetch`/`XMLHttpRequest`/`import`/`export`/`type="module"` 사용 금지** — `file://` 로 열면 전부 실패한다. 스테이지 데이터는 JSON 파일이 아니라 **JS 파일 안의 전역 배열**로 둔다. 스크립트는 고전 `<script src>` 태그로, 의존 순서대로 나열한다.
- 계획서 본문은 **구현 지시가 다수**여야 한다. 프레임·스타일 논증은 이 패킷이 이미 담고 있으므로 계획서에는 헤더 한 줄만.

## Rejected alternatives (and why)
- **물리 엔진 직접 구현** — 기각: 정지 접촉·적층 안정성(블록이 떨리거나 서로 뚫고 들어가는 문제)은 실행해 보며 튜닝해야 하는데 구현자는 실행할 수 없다. 원 ⚠guess 를 자가 승인. **부활 조건**: 판정 환경에서 CDN 이 차단되어 `Matter` 가 정의되지 않는 것이 관측되면, 원·AABB 충돌만 갖춘 최소 물리를 직접 구현하는 경로를 연다.
- **npm / 번들러 / TypeScript / ES modules** — 기각: 구현자가 설치·빌드를 못 하고, `type="module"` 은 `file://` 에서 CORS 로 실패한다. **부활 조건**: 구현자에게 셸이 생기고 판정이 http 서버로 이루어짐이 확인될 때.
- **Matter.js 를 구현자가 직접 파일로 써 넣기(벤더링) 또는 `document.write` 폴백** — 기각: 수십 KB 의 압축 라이브러리를 기억으로 재현할 수 없고, 폴백 파일을 아무도 만들지 않는 실패가 관측됐다(frames.md). **부활 조건**: 없음(구현자 도구가 바뀌어도 이 선택은 열리지 않는다).
- **CDN 여러 개를 `onerror` 로 연쇄 폴백** — 기각: 움직이는 부품을 늘린다. 대신 시작 시 `typeof Matter === 'undefined'` 면 화면에 눈에 보이는 오류 문구를 그린다(무음 실패 금지). **부활 조건**: jsDelivr 만 차단되는 환경이 관측될 때 — 그때는 아래 cdnjs 문자열로 교체.
- **Matter.Render / Matter.Runner 사용** — 기각(약함): Render 는 디버그 렌더에 가깝고, Runner 는 일시정지·고정 스텝 제어를 어렵게 한다. **부활 조건**: 직접 그리기 코드가 계획의 병목이 되면 `Render.create({ options: { wireframes: false } })` 로 대체 가능.
- **MouseConstraint 로 새 드래그** — 기각: 새총 제약 튜닝이 필요하고 `setPointerCapture`/캔버스 좌표계에 얽힌다. 대신 드래그 중엔 새를 `isStatic` 으로 두고 `Body.setPosition` 으로 끌다가, 놓을 때 `Body.setStatic(bird, false)` + `Body.setVelocity` 로 발사한다. **부활 조건**: 없음.

## Decisions already made
(모두 대화에서 확정된 것이 아니라 메인 에이전트의 ⚠guess 를 배치 게이트에서 자가 승인한 것이다. 계획서는 이를 확정으로 취급하되 "Alternatives" 절에 부활 조건을 그대로 옮긴다.)
- **물리 = Matter.js 0.20.0, 아래 문자열 하나로 로드** (⚠guess, 자가 승인):
  `<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>`
  대체 문자열(부활 조건 발동 시에만): `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js`
- **렌더 = Canvas 2D 직접 그리기, 고정 스텝 `Engine.update(engine, 1000 / 60)` 을 rAF 에서 호출** (⚠guess, 자가 승인).
- **전달 형태 = `index.html` + 고전 `<script>` 로 로드되는 평문 JS 파일들, 전역 이름공간, 빌드 없음** (구현자 제약에서 도출).
- **언어 = JavaScript(ES2015+, 브라우저 네이티브), TypeScript 아님** (구현자 제약에서 도출).
- **입력 = Pointer Events**(`pointerdown` 은 캔버스, `pointermove`/`pointerup` 은 `window`), `setPointerCapture` 미사용, 캔버스 CSS `touch-action: none` (판정 환경 사실에서 도출).
- **메뉴·HUD·오버레이 = DOM 요소**(id 를 가진 `<button>`), 게임 월드 = 캔버스 (⚠guess, 자가 승인 — 프로브가 소스에서 버튼 위치·핸들러를 읽기 쉽다).

## Relevant files & paths
- `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/inputs/game-prompt.md` — **유일한 요구사항 원문.** 요구 3개(10 스테이지 / 앵그리버드식 물리 슬링샷 / 우측 일시정지 → 다시하기·메인으로)와, 계획서가 답해야 할 참고 질문 7개(물리 엔진, 렌더링, 스테이지 데이터·전환, 슬링샷 입력·궤적 예측 UX, 충돌·파괴·점수·클리어 규칙, 일시정지 오버레이·상태 머신, 완료 판정 기준). 참고 질문은 "답해야 할 것"이지 계획서의 목차가 아니다.
- `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r2/` — 작업 디렉터리. **비어 있다(기존 코드베이스 없음, 그린필드).** 구현 결과는 나중에 이 아래 `result/` 에 쓰인다. 계획서는 파일 경로를 `result/` 기준 상대 경로가 아니라 "구현자가 정한 출력 폴더 아래의 상대 경로"로 적으면 된다(구현 프롬프트가 출력 폴더를 따로 지정한다).
- `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/SPEC.md` — 실험 사양. 계획서 내용의 출처는 아니지만 "판정 환경 사실"(위 하드 제약)의 근거. 판정 사다리 L0~L6 의 정의는 이 파일에 없으므로 **계획서가 사다리 단계를 지어내면 안 된다.**

## Reference — Matter.js 0.20.0 에서 고정해야 할 API 사실 (메인 에이전트 기억 기반, 계획서의 복사 블록은 이 범위 안에서)
- 전역: `Matter`. 별칭 줄: `const { Engine, Composite, Bodies, Body, Events, Vector } = Matter;` (`World` 는 `Composite` 의 구식 별칭 — 쓰지 않는다.)
- 엔진: `const engine = Engine.create(); engine.gravity.y = 1;` (기본 `gravity.scale = 0.001` → 스텝당 가속 ≈ `1 × 0.001 × 16.666² ≈ 0.278 px/step²`). `engine.enableSleeping = true` 로 적층 안정·정착 판정을 돕는다.
- 스텝: `Engine.update(engine, 1000 / 60)` (0.20.0 은 두 번째 인자 이후의 `correction` 을 받지 않는다).
- 바디: `Bodies.rectangle(x, y, w, h, options)`, `Bodies.circle(x, y, r, options)`. `options` 의 임의 키(`label`, `hp`, `kind` 등)는 `Body.create` 가 바디 객체에 그대로 복사하므로 `body.hp` 로 읽을 수 있다. 주요 옵션: `isStatic`, `restitution`, `friction`, `frictionAir`, `density`, `label`.
- 추가/제거: `Composite.add(engine.world, bodyOrArray)`, `Composite.remove(engine.world, body)`, `Composite.clear(engine.world, false)` (두 번째 인자 `keepStatic=false` 면 정적 바디까지 지움). `Composite.allBodies(engine.world)` 로 순회.
- 조작: `Body.setPosition(body, {x, y})`, `Body.setStatic(body, bool)`, `Body.setVelocity(body, {x, y})` (단위: 기준 delta 당 px — 위 스텝 delta 를 쓰면 "프레임당 px"와 같음), `body.speed`, `body.velocity`, `body.position`, `body.angle`, `body.isSleeping`, `body.isStatic`, `body.id`.
- 충돌: `Events.on(engine, 'collisionStart', (evt) => { for (const pair of evt.pairs) { pair.bodyA; pair.bodyB; } })`. 충격 세기는 `Vector.magnitude(Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity))` 로 구한다. 콜백 안에서 바로 `Composite.remove` 하지 말고 제거 목록에 넣었다가 `Engine.update` 뒤에 처리한다.
- 궤적 예측(드래그 중 점선)은 같은 규칙으로 수십 스텝 미리 계산: `v.y += 0.278; v *= (1 - frictionAir); p += v` (새의 `frictionAir` 를 0 에 가깝게 두면 예측이 더 맞는다). 이 수치들은 초기값이며 구현자가 측정할 수 없으므로 "대략 맞으면 됨"으로 표기한다.
- 그리기: 원은 `body.position` + 반지름(저작 데이터에서 보관), 사각형은 `body.vertices` 4점 또는 `ctx.translate/rotate` + 저작한 w/h. 라이브러리에 원 반지름은 `body.circleRadius` 로 남아 있다.

## Unknowns & open questions
(계획서는 이것들을 가정·리스크로 옮기되, 지어내서 해결하지 않는다.)
- **판정 브라우저의 네트워크 접근 여부** — CDN 이 막히면 물리가 없다. 완화: 시작 시 `Matter` 미정의면 캔버스에 오류 문구를 그린다(무음 실패 금지). 부활 조건은 "Rejected alternatives" 참고.
- **`file://` 로 여는지 http 로 서빙하는지** — 모름. 두 경우 모두 작동하도록 고전 스크립트·인라인 데이터·fetch 금지로 설계한다(⚠guess 를 안전한 쪽으로 고정).
- **판정 브라우저의 뷰포트 크기** — 모름. 고정 논리 해상도 + CSS 축소 + 좌표 매핑으로 흡수.
- **판정 사다리 L0~L6 의 정확한 정의** — 모름. 계획서의 완료 정의는 요구사항 3개 + "uncaught 에러 0" 으로 쓴다.
- **Matter.js 0.20.0 의 세부 수치 거동**(속도 단위·중력 스케일)은 메인 에이전트의 기억이다. 계획서의 모든 물리 수치는 "초기값·측정 불가·대략 맞으면 됨"으로 태그한다.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 요구사항은 완결돼 있고(10 스테이지, 장르 기준 시스템, 명시된 UI 하나) 진짜 열린 양자택일이 없다. 이 계획서를 문자 그대로 따랐을 때의 위험은 "잘못 골랐다"가 아니라 **"빠뜨렸다"** 이다 — 스테이지 10개 중 1개만 저작, 점수·별·파괴 피드백 침묵, 다시하기가 월드를 안 지움, 접합부(URL·API·시그니처)를 구현자가 떠올리다 틀림. frames.md 의 A/B 관측(같은 과제에서 `backward` 프레임이 요구사항을 "장식"으로 재분류하고 스택을 침묵)이 그대로 해당한다.
- Frame is `spec-coverage`; borrowed frame: **없음.** 유일하게 열려 있던 하위 결정(물리 엔진 직접 구현 vs 라이브러리)은 이 패킷의 "Decisions already made" 에서 해소했다(구현자가 실행할 수 없다는 사실이 결정을 강제한다). 계획서는 그 결정을 부활 조건과 함께 옮기기만 한다.
- **Implementer**: `claude-fable-5-1` (모델은 강하지만) **도구가 Read/Write 뿐이고 설치·빌드·실행·테스트 불가.** 실행 불가라는 점이 "약한/미상 구현자"와 같은 위험 프로파일을 만든다(명령을 못 돌리는 구현자는 실패하는 산출물 위에 "검증 준비 완료"라고 쓴다 — frames.md).
- **Machinery budget applies — 전면 적용**: 빌드 체인 없음, 설정 참조 설정 없음, 의존성은 완전 복사 문자열, 접합부(별칭 줄·시그니처 표·초기 상태)는 그대로 복사 가능한 블록, 명령형 완료 기준 없음.

## Load-bearing path candidate (build-out only)
- Path (≤5 hops):
  1. 메인 화면의 "게임 시작" 버튼 `click` → 상태 `INGAME`, 스테이지 1 데이터로 월드 빌드(지면·새총·블록·돼지 바디를 `Composite.add`), 첫 새를 새총 정지 위치에 `isStatic: true` 로 장전.
  2. 캔버스 `pointerdown` 이 (논리 좌표로 매핑 후) 장전된 새의 반지름 안 → `dragging = true`.
  3. `window` 의 `pointerup` (dragging 중) → `Body.setStatic(bird, false)` + `Body.setVelocity(bird, (anchor − dragPos) × k)` → rAF 루프의 `Engine.update` 가 새를 포물선으로 이동.
  4. `collisionStart` 에서 (새 또는 블록) × 돼지 쌍의 상대 속도 ≥ 임계 → `pig.hp -= 충격`, `hp ≤ 0` 이면 제거 목록 → update 뒤 `Composite.remove`.
  5. 관측 효과: 남은 돼지 0 → 정착 지연 뒤 상태 `CLEAR`, 클리어 오버레이(별·점수·다음 스테이지) 표시.
- Why this one: 이 사슬이 닫히지 않으면 나머지(10 스테이지, 일시정지, 점수)는 전부 장식이다. 특히 2→3 은 좌표 매핑·`window` 리스너·`isStatic` 토글 세 조건이 동시에 참이어야 하고, 4 는 제거 타이밍이 틀리면 에러가 난다 — 부품이 다 있어도 배선이 안 닫히는 전형적 지점.
- 콜드스타트 표에 반드시 들어가야 할 상태: `state`(초기 `MAIN`), `dragging`(초기 `false`), `currentBird`(초기 `null`, 장전 시 설정), `birdsLeft`(스테이지 데이터에서 설정), `pigsAlive`(월드 빌드 시 계산), `removeQueue`(초기 빈 배열), `paused`(초기 `false`), `engine`/`world`(시작 시 1회 생성, 스테이지 전환 시 `Composite.clear` 후 재사용).

## Frame selection
- Frame: **spec-coverage**
- Rationale: Gate 0 = build-out. 술어 ①(불확실성 위치) — 원인·시장·실행자 미지 없음, 실행만 남음 → Gate 0 이 결정. 술어 ③(실행자의 인지 여유) — 구현자는 실행 중 검증을 못 하므로 계획서가 접합부까지 미리 고정해야 한다는 점이 spec-coverage 의 "배선된 핵심 경로"·"기계장치 예산" 요구와 정확히 맞는다. 차점 후보 `backward`(도메인 힌트 "게임 → emotion-curve / 그린필드 → backward")는 같은 과제의 A/B 에서 요구사항 재분류·스택 침묵으로 실패한 기록이 있어 기각. `emotion-curve` 는 판정 기준(작동 여부)과 무관한 축이라 기각.

## Style selection
- Style: **opus** (coverage-first disciplined draft)
- Execution mode: **standalone** (다음 패스 없음 — 고백 절은 이 패스 안에서 고칠 수 있는 결함을 고친 뒤 남는 것만 적는다)
- Rationale: 자동 라우팅 1행 "첫 초안 / 폭 넓은 커버리지가 핵심"이 발화. 4행 기본값("시스템이 소비하는 계획은 fable")과 약하게 충돌하나(소비자가 모델 구현자), 1행이 먼저 발화하므로 기본값 행에 도달하지 않는다. relay 는 "수개월 실행이 걸린 고위험" 신호가 없고, 이 계획서는 한 번 소비되므로 이중 비용을 정당화하지 못한다. 배치 모드라 사용자에게 묻지 못했고, 자가 결정으로 기록한다.

## Output contract
- Plan file: `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r2/plans/angry-birds-web/plan.md`
- Wiring audit (Stage 2c, build-out 필수): `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r2/plans/angry-birds-web/wiring-audit.md`
- (relay 아님 — draft/audit 없음)

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, model <id>, one-line note -->
