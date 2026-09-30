# Context Packet — angry-birds-web-game
- Date: 2026-09-29
- Requested by: zeriong (배치 실행 — 비교 실험 셀 `fable-5.1_plan-smith_r1`)
- Language of artifacts: 한국어

## Run stamp — record, never guess
- plan-smith version: 1.6.0 (`plugins/plan-smith/.claude-plugin/plugin.json`에서 읽음)
- frames.md fingerprint: 430 lines / 69,121 bytes / MD5 `5e9b824a37bb08d1ebe7dd03bd4dd43c`
- Main agent model: claude-fable-5-1
- plan-writer model: claude-fable-5-1 (agent 정의가 `model: inherit` — 메인 에이전트와 동일)
- Skill invocation: batch/scripted — `/plan-smith:forge`가 실험 하네스(`real-skill-tco-1.6.0`)에서 호출됨. 사용자 확인 게이트는 사용자 지시("배치 실행이므로 스스로 승인하고 진행")에 따라 메인 에이전트가 자체 승인.

## Task (one line)
웹 브라우저용 앵그리버드류 물리 슬링샷 게임(10 스테이지, 인게임 우측 일시정지 → 다시하기/메인으로)을, **파일 읽기·쓰기 도구만 가진 claude-fable-5-1 구현자가 이 계획서 하나만 읽고 구현할 수 있도록** 하는 구현 계획서를 작성한다.

## Background (why now)
- 이 요청은 비교 실험의 공통 입력이다: `{fable, opus, sonnet} × {/plan(베이스라인), /plan-smith(스킬)}` 6개 셀에 동일한 요구사항이 주어지고, 각 셀은 **계획서(md) 하나만** 산출한다. 게임을 구현하지 않는다.
- 이 셀은 fable-5.1 × plan-smith, 1회차(r1). 실험 메타 정보는 계획서 본문에 들어갈 필요가 없다 — 계획서는 구현자를 위한 문서다.
- 요구사항 파일은 3개의 명시 요구와, 계획서가 답해야 할 7개의 "핵심 질문"을 담고 있다(아래 Relevant files 참조).
- 사용자는 이 단계에서 **코드를 작성하지 말라**고 했다. 계획서만 만든다.

## Goal — definition of success
구현자(claude-fable-5-1)가 계획서만 읽고 파일을 써서 만든 결과물을 사람이 브라우저에서 `index.html`로 열었을 때 다음이 모두 성립한다:
1. 메인 화면 → 게임 시작 → 스테이지 1 인게임으로 진입한다.
2. 새총 위의 발사체를 마우스로 드래그해 놓으면 발사되고, 중력 아래 포물선으로 날아가 구조물·돼지와 충돌하며, 구조물이 밀리고 부서지고, 돼지가 제거된다.
3. 돼지를 전부 제거하면 클리어 판정, 발사체를 다 쓰고도 돼지가 남으면 실패 판정이 나며, 클리어 시 다음 스테이지로 넘어갈 수 있다.
4. 스테이지 1~10이 **각각 실제로 저작된 배치(구조물·돼지·발사체 수)**를 가지고 모두 플레이 가능하다 — 로더 하나에 스테이지 한 개가 아니다.
5. 인게임 화면 **우측**에 일시정지 버튼이 있고, 클릭하면 게임이 멈추고 **다시하기 / 메인으로** 버튼이 있는 오버레이가 뜬다. 다시하기는 현재 스테이지를 처음부터, 메인으로는 메인 화면으로 보낸다.
6. 계획서는 위 명시 요구 외에, 게임이 "완성됐다"고 느끼기 위해 필요한 표면(점수 표시, 남은 발사체 수, 클리어/실패 화면, 파괴 피드백, 스테이지 전환)을 침묵으로 빠뜨리지 않는다 — 모든 셀이 build / defer(+트리거) / n-a(+이유) 중 하나다.
7. 계획서는 요구사항 파일의 "핵심 질문" 7개 모두에 답한다.

## Hard constraints
- **구현자는 claude-fable-5-1이며, 이 계획서 하나만 읽고, 파일 읽기·쓰기 도구만으로 작업한다. 설치·빌드·실행·테스트가 불가능하다.** — source: 사용자 지시.
- 위에서 파생되는 절대 조건 (source: 사용자 지시 + frames.md "machinery budget"):
  - **빌드 체인 없음.** npm/번들러/TypeScript 컴파일/패키지 설치를 전제하는 스택은 금지. 브라우저가 직접 로드하는 플레인 파일(HTML/CSS/JS)이어야 한다.
  - **외부 의존성은 CDN `<script>` 태그의 완전한 URL(정확한 버전 포함)로만** 도입 가능하며, 그 URL은 실제로 존재해야 한다(아래 "검증된 외부 사실" 참조). 이름만 적고 버전을 회상하게 두면 안 된다.
  - **바이너리 에셋 없음.** 구현자는 텍스트 파일만 쓸 수 있으므로 PNG/JPG/MP3/OGG 등을 만들 수 없다. 그래픽은 Canvas 도형/그라디언트/텍스트로, 소리는 (넣는다면) WebAudio 합성으로만 가능하다.
  - **구현자는 자기 결과물을 실행해 볼 수 없다.** 완료 기준은 구현자가 자기 파일을 읽어서 확인할 수 있는 형태여야 한다. 커맨드형 완료 기준(`... exits 0`)은 구현자에게 무의미하다 — 넣더라도 "외부(사람) 검증자용"으로 분리 표기한다.
  - 접합부(의존성 alias 줄, 각 파일의 공개 함수 시그니처 표, 초기 상태 선언)는 계획서 안에 **복사 가능한 verbatim 블록**으로 실어야 한다 — 회상하게 두면 환각된다.
- **스테이지는 10단계.** — source: 요구사항 1.
- **앵그리버드와 같은 게임 시스템으로 플레이 가능**: 새총으로 발사체를 당겨 쏘고, 포물선 궤적·중력·충돌·구조물 파괴로 목표(돼지 등)를 제거하는 물리 기반 슬링샷. — source: 요구사항 2.
- **일시정지 버튼이 인게임 우측에 존재하고, 클릭 시 다시하기 / 메인으로 버튼이 존재.** — source: 요구사항 3.
- **이 단계에서 코드를 작성하지 않는다.** 산출물은 계획서 하나. 계획서 안의 복사용 접합부 블록(시그니처 표, 초기 상태, alias 줄, 스테이지 데이터 스키마 예시)은 구현이 아니라 접합부 고정이므로 허용되지만, 함수 본문을 채운 전체 파일은 계획서에 넣지 않는다. — source: 사용자 지시.
- 산출물 언어: 한국어. — source: 사용자가 한국어로 대화.
- 출력 경로: `plans/angry-birds-web-game/plan.md` (작업 디렉터리 기준; 절대 경로는 Output contract 참조). — source: 스킬 계약.

## Soft preferences
- 요구사항 파일이 나열한 "핵심 질문" 7개(물리 엔진 / 렌더링 / 10 스테이지 데이터 구조·로딩·전환 / 슬링샷 입력·조준·발사·궤적 예측 UX / 충돌·파괴·점수·클리어 판정 규칙 / 일시정지 오버레이와 상태 머신 / 완료 판정 기준)에 계획서가 **명시적으로** 답하기를 바란다. 이 질문들은 "참고"로 표기되어 있으나 실험의 채점 축으로 보인다.
- 렌더링은 Canvas 2D가 자연스러운 정답으로 지목되어 있다("Canvas 2D vs 기타"). 다른 선택을 하려면 이유가 필요하다.
- 요구사항이 예시로 든 상태 머신: 메인 → 인게임 → 일시정지 → 클리어/실패. 이 골격을 유지하되 필요한 상태(예: 조준 중/비행 중/정착 대기)는 추가해도 된다.
- 원작 앵그리버드의 "완성감" 표면 — 스테이지당 여러 발사체(남은 수 표시), 점수와 별점, 재질별 구조물(나무/유리/돌 등 내구도 차이), 파괴 시 시각 피드백, 스테이지 선택 화면, 진행 저장(localStorage) — 은 명세에 없지만 ledger에 올라와야 한다. 원작의 다종 새(능력 새)는 요구되지 않았다.
- 계획서는 구현자가 **순서대로 파일을 써 내려갈 수 있는** 의존성 순서와, 파일별 공개 심볼이 서로 맞물리는지 문서 안에서 확인 가능한 형태를 선호한다. 구현자는 한 번 쓰면 끝이다(반복 수정 루프 없음).

## Rejected alternatives (and why)
- **npm 설치 + 번들러/TypeScript 스택** — 구현자가 설치·빌드를 할 수 없다(하드 제약). 부활 조건: 구현자에게 셸 실행 권한이 주어지면.
- **라이브러리 소스를 파일에 인라인 복사(오프라인 번들)** — Matter.js 미니파이 빌드는 83,476바이트이고 구현자는 이를 "회상"으로 써야 하므로 환각이 확실하다. 부활 조건: 사람이 라이브러리 파일을 직접 프로젝트 폴더에 넣어 주는 절차가 보장되면 `<script src="./matter.min.js">`로 전환.
- **좁히기 프레임(backward / delete-first / api-first)으로 계획서 작성** — frames.md Gate 0의 A/B 관찰(같은 브라우저 게임 과제에서 `backward` 프레임이 명시 요구를 "cosmetic"으로 재분류하고 사운드/이펙트/저장/스택을 침묵으로 누락). 패킷 수준 결정이며 계획서 본문에서 재논의하지 않는다.
- **relay 스타일(2패스)** — 비용 2배를 정당화할 "되돌리기 어려운 결정"이 없다. 이 과제의 위험은 선택 오류가 아니라 누락이다. 부활 조건: 사용자가 "더 철저히"를 요구하거나, 회고에서 단일 패스 계획서의 누락이 반복 관찰되면.
- **이미지 스프라이트/오디오 파일 사용** — 구현자가 바이너리를 만들 수 없다(하드 제약). 부활 조건: 에셋 폴더가 사람에 의해 제공되면.

## Decisions already made
- 산출물은 계획서 md 1개. 코드 없음. — 사용자 지시.
- 프레임 `spec-coverage`(build-out), 스타일 `fable` standalone. — 패킷 수준(아래 Frame/Style selection).
- 구현자 = claude-fable-5-1, 읽기·쓰기 전용. machinery budget 적용. — 사용자 지시.
- 사용자 확인 게이트는 자체 승인(배치). — 사용자 지시.
- 외부 물리 라이브러리를 쓴다면 **Matter.js 0.20.0**, 아래 검증된 CDN URL 중 하나를 verbatim 사용. 0.20.0은 npm `latest`이며 CDN에 실존한다(2026-09-29 검증). — 메인 에이전트 검증. (라이브러리를 쓸지 여부 자체는 아래 "열린 하위 결정".)

## Relevant files & paths
- `<FIXTURE>` — 요구사항 원문(유일한 입력). 핵심: 명시 요구 3개(10 스테이지 / 앵그리버드식 물리 슬링샷 플레이 / 우측 일시정지 → 다시하기·메인으로) + 계획서가 답해야 할 핵심 질문 7개 + 실험 메타(계획서에 넣지 말 것). 요구사항 2의 괄호 설명("새총으로 발사체를 당겨 쏘고, 포물선 궤적·중력·충돌·구조물 파괴로 목표(돼지 등)를 제거")이 게임 시스템의 정의다.
- 작업 디렉터리 `<FIXTURE>` — **코드베이스가 없다(그린필드).** 여기에는 요구사항 파일과 하네스 마커 파일(`plan.start`, `plan.end`, `plan.err`, `plan.json`)뿐이다. 읽을 소스 코드를 찾지 말 것. 다른 실험 셀 디렉터리(`../opus-5.5_*`, `../fable-5.1_*`)는 오염 방지를 위해 읽지 말 것.

### 검증된 외부 사실 (메인 에이전트가 2026-09-29에 네트워크로 확인)
- npm `matter-js` dist-tag `latest` = **0.20.0**. 실존 버전 꼬리: 0.16.1, 0.17.0, 0.17.1, 0.18.0, 0.19.0, 0.20.0. (`2.0.20` 같은 버전은 존재하지 않는다 — frames.md가 기록한 환각 사례.)
- 다음 URL이 모두 HTTP 200으로 응답했다(복사용 완전 문자열):
  - `https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js`
  - `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js`
  - `https://unpkg.com/matter-js@0.20.0/build/matter.min.js`
  - `https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js`
  - `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js`
- 0.20.0 미니파이 빌드(83,476바이트)는 UMD로 전역 `window.Matter`를 노출한다(배너: `matter-js 0.20.0 by @liabru`). 빌드 문자열에서 존재가 확인된 API 이름: 모듈 `Engine, Runner, Bodies, Body, Composite, Composites, Constraint, Events, Sleeping, Query, Vector, Mouse, MouseConstraint, Collision, Detector, World(구식 별칭), Render, Common, Axes`; 함수 `Bodies.rectangle/circle/polygon/trapezoid/fromVertices`, `Body.applyForce/setVelocity/setAngularVelocity/setStatic/setPosition/setAngle/setMass/setInertia`, `Composite.add/remove/allBodies`, `Constraint.create`, `Events.on/off/trigger`, `Engine.update`, `Runner.run/stop`, `Query.point/region`, `Collision.collides`, `Composites.stack/pyramid`, `Vector.magnitude`; 옵션/필드 `isStatic, isSensor, isSleeping, collisionFilter, restitution, friction, frictionStatic, frictionAir, density, label, render, chamfer, angle, vertices, bounds, speed, angularSpeed, stiffness, damping, pointA, pointB, timing.timeScale, gravity, enableSleeping, positionIterations, velocityIterations, constraintIterations`; 이벤트 이름 `collisionStart, collisionActive, collisionEnd, beforeUpdate, afterUpdate`. `Composite.add`를 쓰고 `World.add`(구식)는 피할 것.
- 이 확인은 "심볼이 빌드에 존재한다"까지다. 각 함수의 인자 순서·이벤트 페이로드 형태(`event.pairs[i].bodyA/bodyB`, `pair.collision.depth/normal`)는 Matter.js 공개 문서의 안정된 형태를 따르되, 계획서는 그 형태를 **복사용 블록으로 고정**해야 한다(구현자가 회상하지 않도록).

## Unknowns & open questions
- **열린 하위 결정 — 물리 엔진: 직접 구현 vs Matter.js(CDN).** 대화에서 결정되지 않았다. 메인 에이전트의 읽기: 벽(설치 불가·실행/테스트 불가·1회 작성)은 "테스트 없이 회전 강체·적층 안정성·마찰·휴면을 손으로 맞게 쓴다"는 전제를 거의 확실히 무너뜨리므로 Matter.js 0.20.0(CDN)이 유리하고, 남는 위험은 API 회상 오류 → 복사용 블록으로 상쇄. 그러나 **결정은 작성자 몫**이며, 빌린 프레임(`constraint-first`)으로 판정하고 포기한 것을 명시할 것. 어느 쪽이든 부활 조건을 적을 것.
- **CDN 접근 가능성.** 게임을 여는 브라우저가 온라인이라고 가정한다. 오프라인이면 라이브러리 로드 실패 → 계획서는 이를 "가정 + 위반 시 결과(게임이 뜨지 않음, 메시지 표시)"로 명시해야 한다. 이 가정은 **전체가 매달린 가정**이므로 가장 싼 조기 확인(스크립트 로드 실패 시 `window.Matter` 부재를 감지해 안내 문구 표시)과 한 줄 폴백이 필요하다.
- **입력 장치.** 데스크톱 마우스가 기본. 터치(모바일)는 ledger에서 build/defer를 결정할 것 — 요구사항은 언급하지 않는다.
- **화면 크기.** 고정 논리 해상도(예: 1280×720)를 캔버스에 스케일링할지, 창 크기를 따를지 미정. 작성자가 정하되 값은 태그(파생/수명제한/임의 선언).
- **진행 저장(localStorage)과 스테이지 잠금.** 명세에 없음. 10 스테이지를 "게임시작"만으로 순차 진행할지, 스테이지 선택 화면을 둘지 미정. ledger에서 결정.
- **일시정지 오버레이의 "계속하기" 버튼.** 명세는 다시하기/메인으로만 명시한다. 일시정지에서 복귀할 수단이 없으면 일시정지가 무의미하므로 "게임이 완성되려면 명백히 필요한 것"으로 다루되, 명시 요구 두 버튼은 반드시 build.
- **10 스테이지의 난이도 곡선과 실제 배치 데이터.** 계획서는 10개 각각의 배치 개요(구조물 구성·돼지 수·발사체 수·의도된 공략)를 콘텐츠 축으로 담아야 한다 — 구현자가 즉흥으로 10개를 지어내면 곡선이 없다. 구체 좌표까지 계획서에 쓸지, 스키마 + 스테이지별 설계 노트로 둘지는 작성자 판단.
- **완료 판정을 누가 확인하는가.** 구현자는 실행 불가. 사람 검증자(실험 운영자)가 나중에 브라우저로 열 가능성이 있다. 완료 기준은 (a) 구현자가 파일을 읽어 확인하는 기준과 (b) 사람 검증자용 브라우저 절차로 나누어 쓸 것.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 명세가 완결되어 있다(10 스테이지, 정의된 게임 시스템, 위치까지 지정된 UI 요구). 이 계획서를 문자 그대로 따랐을 때의 위험은 "잘못 골랐다"가 아니라 "빠뜨렸다"(점수·남은 발사체·클리어 화면·파괴 피드백·10개 콘텐츠·스택 미명시)와 "부품은 다 있는데 발사가 안 된다"(배선 누락)다. frames.md의 A/B는 정확히 이 과제 형태(브라우저 게임, 10 스테이지, 물리 루프, 지정 UI)에서 좁히기 프레임이 요구사항을 누락시켰음을 기록한다. 판단이 갈리면 build-out으로 기우는 tie-break도 같은 방향.
- (build-out) Frame is `spec-coverage`; borrowed frame for one sub-decision: **`constraint-first`** — "물리 엔진: 직접 구현 vs Matter.js(CDN)" 한 셀에만 적용. 벽 = {설치 불가, 실행·테스트 불가, 단일 작성 패스, 플레인 파일, 바이너리 없음, 온라인 CDN 가정}. 모순 테스트(벽의 교집합 안에 각 후보가 들어가는가)를 먼저 하고, 벽이 포기시킨 것을 명시하며, 뚫은 구멍(CDN 온라인 가정)은 위반 시 결과와 함께 가정으로 선언할 것. 빌림의 출처를 계획서 헤더 줄 한 줄로만 기록(본문에서 방법론 서술 금지).
- **Implementer**: **claude-fable-5-1** — 강한 모델이지만 **도구가 읽기·쓰기 전용**이고 설치·빌드·실행·테스트가 불가하다. 이 계획서 하나만 읽는다.
- **Machinery budget applies** (모델 강도와 무관하게 도구 제약이 강제): 빌드 체인 없음, 설정 파일이 다른 설정 파일을 참조하는 구조 없음, 파일 수 최소, 모든 외부 의존성은 완전한 복사용 문자열(위 검증 URL), 접합부(alias 줄 / 파일별 공개 함수 시그니처 표 / 초기 상태 선언 / 스테이지 데이터 스키마)는 verbatim 복사 블록, 커맨드형 완료 기준은 구현자용으로 쓰지 말 것(사람 검증자용으로 분리 표기는 가능).

## Load-bearing path candidate (build-out only)
- Path: **발사체 위에서 마우스 다운 → 드래그(새총 제약에 매달린 발사체가 따라옴, 당김 거리 제한) → 마우스 업 → 발사체가 새총 제약에서 해제되어 당긴 반대 방향 속도로 날아감 → 중력 아래 포물선 비행 → 구조물/돼지와 충돌(collisionStart) → 충돌 세기에 따라 돼지·구조물 내구도 감소, 0이면 월드에서 제거 → 스테이지의 돼지 수가 0이 되면 클리어 판정.**
- Why this one: 이 사슬이 닫히지 않으면(드래그가 잡히지 않거나, 놓아도 발사체가 제약에 붙어 있거나, 충돌 이벤트가 내구도에 연결되지 않거나, 돼지 제거가 클리어 판정에 연결되지 않으면) 10개 스테이지도, 일시정지도, 점수도 전부 장식이 된다. frames.md가 "게임의 발사(launch)"를 도메인 표준 예로 든 바로 그 경로. 작성자는 이를 ≤5 홉으로 압축하고(예: 입력→해제→비행/충돌→내구도/제거→클리어), 각 홉의 "통과 조건"과 "그 조건이 처음 참이 되는 지점"을 채우며, 콜드스타트 표(상태 값·플래그·제약 존재 여부·돼지 카운트·발사체 카운트의 초기값과 변경자)에 빈칸을 남기지 않는다. 작성자가 다른 경로를 고르면 어느 경로인지와 이유를 밝힌다.

## Frame selection
- Frame: **spec-coverage** (+ `constraint-first`를 물리 엔진 하위 결정 한 셀에 빌림)
- Rationale: Gate 0 = build-out(위). 예측 ① "무엇이 미지인가" → 원인·시장·실행자 모두 미지가 아니고 실행만 남았으므로 Gate 0이 결정 → spec-coverage. 차점 후보 `backward`(그린필드 도메인 힌트)는 Gate 0의 A/B 관찰 때문에 기각 — 앵커에서 벗어난 명시 요구를 잘라낼 면허가 된다. `emotion-curve`(게임 도메인 힌트)는 난이도 곡선 한 축에 유용하지만 문서를 소유하면 메커닉/콘텐츠/UI 커버리지가 빠진다 — spec-coverage의 "콘텐츠 축" 컴포넌트가 이미 곡선을 요구하므로 별도 빌림 없이 그 안에서 처리. 예측 ② 자원 경직성 → 자원이 아니라 **도구**가 경직(설치/실행 불가)이며 이는 constraint-first를 한 셀에 빌리는 근거.

## Style selection
- Style: **fable**
- Execution mode: **standalone** (다른 패스 없음 — 고백·미루기 금지; relay 아님)
- Rationale: 자동 라우팅 기본 행 "시스템/에이전트가 소비하는 계획서 → fable" — 이 계획서의 독자는 사람이 아니라 읽기·쓰기 전용 AI 구현자다. 산출물의 가치가 산문의 소화 가능성이 아니라 **운영 규칙**(상태 머신의 전이 규칙, 클리어/실패 판정 게이트의 기본값, 파괴 임계값의 의미 고정, 파일별 계약)에 있다. fable의 필수 "커버리지 자체 감사" 섹션이 spec-coverage 매트릭스와 이중으로 누락을 잡는다. 차점 `opus`(첫 초안·커버리지 우선)는 그 강점이 이미 프레임 컴포넌트로 강제되고, 고백 로그는 사람 리뷰어/다음 패스가 있을 때 가치가 있는데 여기엔 둘 다 없다. `relay`는 기각(위 Rejected alternatives). 주의: 작성자 모델이 fable 계열이므로 스타일 효과와 모델 효과는 이 실행에서 분리되지 않는다 — 회고 model 필드에 기록.

## Output contract
- Packet: `<FIXTURE>`
- Plan file: `<FIXTURE>`
- Wiring audit (Stage 2c, build-out 필수): `<FIXTURE>`
- (Stage 2d) 20,000자 초과 시 분할: `plan.md`는 인덱스, `parts/<category>_<code>.md`가 본문.

## Gate record (Stage 1 confirmation)
- 배치 실행. 사용자 지시("사용자 확인 게이트가 나오면 배치 실행이므로 스스로 승인하고 진행한다")에 따라 메인 에이전트가 자체 승인.
- `⚠guess` 처리: 대화에서 확인되지 않은 항목은 모두 "Unknowns & open questions"로 강등해 작성자가 가정/위험으로 다루게 했다. 확정으로 승격한 항목은 없다. 물리 엔진 선택은 열린 하위 결정으로 작성자에게 위임(빌린 프레임 `constraint-first`).

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, model <id>, <split N parts | unsplit> (<characters> chars), one-line note -->
