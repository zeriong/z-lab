# Context Packet — angry-birds-web
- Date: 2026-09-26
- Requested by: zeriong
- Language of artifacts: 한국어

## Run stamp — record, never guess
- plan-smith version: 1.4.2 (`~/.claude/plugins/cache/plan-smith-marketplace/plan-smith/1.4.2/.claude-plugin/plugin.json`에서 읽음)
- frames.md fingerprint: 431줄
- Main agent model: claude-fable-5-1
- plan-writer model: claude-fable-5-1 (`agents/plan-writer.md`의 `model: inherit` → 주 에이전트와 동일)
- Skill invocation: batch/scripted — 헤드리스 `claude -p`. AskUserQuestion 도구가 제공되지 않으며, 프롬프트가 "확인 게이트는 스스로 승인하고 진행"을 지시함. 아래 `⚠guess` 항목은 주 에이전트가 게이트에서 스스로 해소했고, 해소 근거를 각 항목 옆에 적었다.

## Task (one line)
웹 브라우저에서 동작하는 앵그리버드형 물리 슬링샷 게임(스테이지 10단계, 인게임 우측 일시정지 버튼 → 다시하기/메인으로)을, 파일 읽기·쓰기 도구만 가진 claude-fable-5-1이 이 계획서 하나만 읽고 구현할 수 있도록 하는 구현 계획서를 쓴다.

## Background (why now)
- 사용자는 요구사항 파일 하나(`inputs/game-prompt.md`)를 주고 "이 게임을 구현하기 위한 계획서"를 요청했다. 그 외 대화 맥락은 없다(세션은 이 요청 하나로 시작했다).
- 구현자는 사람이 아니라 모델(claude-fable-5-1)이며, 도구는 파일 Read/Write뿐이다. 설치·빌드·실행·테스트를 할 수 없고, 계획서 외에는 아무것도 읽지 않는다. 따라서 계획서는 **자기완결적**이어야 하고, 계획서가 요구하는 기계 장치(빌드 체인, 설정 파일, 의존 버전)는 전부 구현자가 손으로 재현해야 할 실패 표면이 된다.
- 이 단계에서는 코드를 쓰지 않는다. 계획서만 만든다.

## Goal — definition of success
계획서만 읽은 구현자가 평문 파일 묶음(HTML/CSS/JS)을 써내고, 그 묶음의 `index.html`을 현대 데스크톱 브라우저에서 열었을 때 다음이 전부 성립하면 성공이다:
1. 로드 시 uncaught JS 에러 0건으로 메인 화면(게임 시작 버튼)이 보인다.
2. 게임 시작 → 스테이지 1이 그려지고, 새총 위의 새를 포인터로 당겼다 놓으면 중력 아래 포물선으로 날아가, 구조물과 충돌해 구조물이 무너지거나 부서지고 돼지가 제거된다.
3. 돼지를 전부 제거하면 클리어 판정과 다음 스테이지 진행이 되고, 새를 다 써도 돼지가 남으면 실패 판정이 된다. 이 흐름이 스테이지 10까지 이어진다(10개 스테이지 전부 실제 배치 데이터가 있어야 한다).
4. 인게임 화면 **우측**에 일시정지 버튼이 있고, 누르면 게임이 멈추며 **다시하기 / 메인으로** 버튼이 있는 오버레이가 뜬다. 다시하기는 현재 스테이지를 처음부터, 메인으로는 메인 화면으로 보낸다.
5. 점수·남은 새·스테이지 번호가 인게임에서 읽힌다(요구사항의 "핵심 질문"이 점수 규칙을 요구한다).
6. 계획서가 요구사항의 7개 핵심 질문(물리 엔진 / 렌더링 / 스테이지 데이터·로딩·전환 / 슬링샷 입력·궤적 예측 UX / 충돌·파괴·점수·클리어 판정 / 일시정지 오버레이·상태 머신 / 완료 판정 기준)에 각각 명시적으로 답한다.

## Hard constraints
- **웹 브라우저 게임이다.** — source: `game-prompt.md` 요청사항 첫 줄.
- **스테이지는 10단계다.** 10개 전부가 작성된 콘텐츠(배치·난이도)여야 하며, 로더 하나에 스테이지 하나가 아니다. — source: `game-prompt.md` #1 (콘텐츠 축 요구는 frames.md spec-coverage 필수 구성요소).
- **게임시작 → 앵그리버드와 같은 시스템으로 플레이 가능**: 새총으로 발사체를 당겨 쏘고, 포물선 궤적·중력·충돌·구조물 파괴로 목표(돼지 등)를 제거하는 물리 기반 슬링샷. — source: `game-prompt.md` #2.
- **일시정지 버튼이 인게임 우측에 존재하고, 클릭 시 다시하기 / 메인으로 버튼이 존재한다.** — source: `game-prompt.md` #3. 세 요구사항 모두 명시된 것이므로 매트릭스에서 `build`만 허용된다.
- **구현자 = claude-fable-5-1. 이 계획서 하나만 읽고, 파일 읽기·쓰기 도구만으로 작업한다. 설치·빌드·실행·테스트 불가.** — source: 사용자 프롬프트. 파생되는 제약(전부 구속력 있음):
  - 빌드 체인 없음: npm, 번들러, TypeScript 컴파일, 테스트 러너 전부 불가. 브라우저가 **직접 로드하는 평문 파일**(HTML/CSS/JS)만.
  - 외부 의존은 `<script src="완전한 URL(버전 포함)">` 한 줄로만 들어온다. 이름만 적힌 의존("matter-js 최신")은 아무도 해석할 수 없다.
  - **바이너리 자산 불가**: 구현자의 Write는 텍스트만 쓴다. PNG 스프라이트·MP3 파일은 만들 수 없다 → 그래픽은 Canvas 도형/그라디언트/텍스트로, 사운드는 Web Audio API 합성이거나 없음.
  - **명령형 완료 기준은 무의미**(`npm test exits 0` 같은 것): 구현자는 명령을 실행할 수 없다. "완료"는 구현자가 **자기 산출물을 읽어서** 확인할 수 있는 문장이어야 한다(예: "심볼 표의 모든 함수가 지정된 파일에 같은 시그니처로 정의되어 있다", "스크립트 태그 순서가 의존 순서와 같다", "10개 스테이지 객체 각각에 돼지가 1개 이상 있다").
  - 계획서는 **자기완결**: 패킷·감사 파일·이 대화를 참조하면 안 된다. 구현자에게는 plan.md 경로 하나만 주어진다.
- **구현자의 출력 루트는 `result/` 폴더**다. 구현자가 받는 프롬프트 원문: "아래 계획서를 읽고, 그 계획대로 소스코드를 작성하라. — 계획서: <경로> — 출력: <셀>/result/ 아래에 Write (하위 경로를 포함해 Write하면 폴더는 자동 생성된다). 파일 구성·개수·분량은 전부 네가 정한다. 너에게는 파일을 읽고 쓰는 도구만 있다. 설치·빌드·실행·테스트는 할 수 없다." → 계획서의 파일 경로는 **출력 루트 기준 상대경로**(`index.html`, `js/...`)로 쓴다. 절대경로 금지. — source: 실행 하네스의 구현 프롬프트(주 에이전트가 확인).
- **file:// 로 열려도 동작해야 한다.** 산출물이 file://로 열릴지 http://로 서빙될지 미지이므로 양쪽 모두 동작하는 쪽을 택한다: `<script type="module">` 금지(Chromium은 file://에서 모듈 로드를 CORS로 차단), `fetch()`/XHR로 로컬 JSON 읽기 금지(같은 이유), 스테이지 데이터는 **JS 파일 안에 인라인**. 고전 `<script>` 태그를 고정 순서로 나열하고 전역 네임스페이스 하나로 공유한다. — source: ⚠guess(주 에이전트 파생) → 게이트에서 채택. 근거: 지원 비용이 사실상 0이고, 어기면 로드 단계에서 전부 죽는다.
- **이 단계에서 코드를 쓰지 않는다.** 단, 계획서 안의 **짧은 복사용 접합 블록**(의존 alias 한 줄, 파일별 공개 함수 심볼 표와 정확한 시그니처, 초기 상태 선언, 스테이지 데이터 스키마와 샘플 1개)은 허용된다 — frames.md 기계 예산 조항이 요구하는 "관절 고정"이며 구현이 아니다. 게임 로직 본문을 쓰는 것은 금지. — source: 사용자 프롬프트 + frames.md.
- **계획서는 요구사항의 7개 핵심 질문에 각각 명시적으로 답한다.** — source: `game-prompt.md` "플랜이 답해야 할 핵심 질문 (참고)".
- **언어: 한국어.** — source: 사용자 대화 언어.

## Soft preferences
- 요구사항이 예시로 든 기술: 물리 = Matter.js 등 라이브러리, 렌더링 = Canvas 2D. 사용자는 이 둘을 인지하고 있으며 강제하지는 않았다.
- 궤적 예측 UX(당기는 동안 예상 궤적 점선)가 질문 목록에 있다 → 있으면 좋은 것으로 취급.
- 상태 머신은 최소 "메인 → 인게임 → 일시정지 → 클리어/실패"를 가진다(요구사항이 이 상태들을 이름으로 부른다).
- 점수·별 등급 같은 앵그리버드 관례 요소는 "앵그리버드와 같은 게임 시스템"의 일부로 읽는다. 없어도 요구사항 위반은 아니지만, 없으면 "된 것"처럼 느껴지지 않는다.
- 주 대상은 데스크톱 Chromium + 마우스. 포인터 이벤트로 터치까지 덮이면 좋음.
- 파일 수는 적을수록 좋다(파일 하나가 늘 때마다 로드 순서·전역 공유라는 배선 실패 표면이 하나 는다). 단일 `index.html` 또는 소수의 고전 스크립트.
- 사운드·파티클·배경 같은 마감 요소는 **이름 붙은 단계**로 존재해야 한다(frames.md 관측: 이름이 없으면 만들어지지 않는다). 사운드는 Web Audio 합성으로만 가능하므로 비중은 작게.

## Rejected alternatives (and why)
- **npm / 번들러 / TypeScript / 테스트 러너 기반 스택** — 구현자가 설치·빌드·실행을 할 수 없다(하드 제약). 부활 조건: 구현자에게 셸이 생기면.
- **ES 모듈(`type="module"`) 또는 `fetch()`로 스테이지 JSON 로딩** — file:// 에서 로드 실패. 부활 조건: http 서빙이 보장되면.
- **이미지/오디오 파일 자산** — 구현자가 바이너리를 쓸 수 없다. 부활 조건: 자산 제공 경로가 생기면.
- **존재하지 않는 로컬 vendored 파일로의 `document.write` 폴백** — frames.md 관측 실패(아무도 만들지 않은 파일로 폴백). CDN 로드 실패 시 폴백은 **화면에 보이는 오류 문구**여야 한다.
- **하드코딩 스테이지 1 + "나머지는 같은 방식으로"** — 콘텐츠 축 요구 위반(10개 전부 작성). 부활 조건: 없음(요구사항 명시).

## Decisions already made
- Gate 0 = **build-out** → 프레임 `spec-coverage`. 물리 엔진 셀 하나에만 `dialectic`을 빌린다. — 주 에이전트, 아래 Deliverable type 참조.
- 스타일 = **opus-style, standalone**(다른 패스 없음). — 아래 Style selection 참조.
- 구현자 = claude-fable-5-1, 도구 Read/Write. — 사용자 프롬프트.
- 출력 = `plans/angry-birds-web/plan.md` 단 하나. plans/ 아래 다른 슬러그 디렉터리를 만들지 않는다. — 파이프라인 관례 + 하네스가 `plans/*/plan.md` 첫 항목을 집는다.
- 확인 게이트: 배치 실행이라 주 에이전트가 자가 승인. `⚠guess` 해소 기록은 각 항목 옆.

## Relevant files & paths
- `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/inputs/game-prompt.md` — 유일한 요구사항 원문. 3개 번호 요구사항 + "플랜이 답해야 할 핵심 질문" 7개. 하단 "실험 메타" 절(테스트 매트릭스, 셀 경로)은 계획서와 무관하며 **계획서에 새어 들어가면 안 된다**(구현자는 실험을 모른다).
- 코드베이스 없음(그린필드). 현재 작업 디렉터리는 비어 있고, 구현자가 `result/` 아래에 처음부터 쓴다.

## Unknowns & open questions
- **산출물이 열리는 방식(file:// vs http://)** — 미지. 계획서는 양쪽 다 동작하는 선택만 한다(하드 제약에 반영).
- **네트워크 접근(CDN 로드 가능 여부)** — 미지. 라이브러리를 쓰면 이것이 가정이 되고, 실패 시 화면에 보이는 문구가 폴백이다. 직접 구현을 택하면 이 미지수는 사라진다(dialectic 셀의 논점).
- **CDN URL의 실존 여부는 이 파이프라인의 누구도 검증할 수 없다**(주 에이전트·작성자·구현자 모두 웹 접근 없음). 주 에이전트 기억 기준 후보(⚠guess — 기억이며 검증 불가; 게이트에서 "후보로 전달, 작성자가 하나를 핀 고정"으로 해소):
  - `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js` (Matter.js 0.20.0, 2024년 릴리스 — 주 에이전트의 1순위)
  - `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js` (0.19.0, 2023년 릴리스 — 튜토리얼에서 가장 널리 쓰인 경로)
  - jsdelivr 형식: `https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js`
  - 존재하지 않는 버전을 지어내지 말 것(frames.md: "matter-js 2.0.20" 환각이 세 번 독립 재현됨). Matter.js는 0.x 버전대만 존재한다.
  - Matter.js 전역은 `Matter`이며, 자주 쓰는 alias: `const { Engine, Runner, World, Bodies, Body, Composite, Events, Constraint, Mouse, MouseConstraint, Vector } = Matter;` (0.19+에서 `World`는 `Composite`의 별칭으로 남아 있음.)
- **대상 브라우저·입력 장치** — 미지. 데스크톱 Chromium + 마우스를 기본으로, 포인터 이벤트로 터치 포함.
- **논리 캔버스 크기** — 미지. 작성자가 고정 논리 해상도 하나를 정해 화면에 맞춰 스케일하고, 그 수치는 "declared arbitrary"로 태그.
- **스테이지 난이도 곡선의 근거 데이터 없음** — 새 수·돼지 수·재질·구조 높이 같은 수치는 전부 declared arbitrary 또는 derived(한 줄 근거)로 태그.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 요구사항은 완결적이다(10 스테이지, 슬링샷 물리, 우측 일시정지 → 다시하기/메인으로). 문자 그대로 따랐을 때의 위험은 "잘못 골랐다"가 아니라 "빠뜨렸다"이다 — 점수, 클리어/실패 판정, 스테이지 전환, 오버레이 배선, 10개 스테이지 콘텐츠, 로드 실패 폴백 같은 표면이 조용히 빠지는 것. frames.md의 A/B는 정확히 이 과제 유형(브라우저 게임·10 스테이지·물리 루프·이름 붙은 UI 요구)에서 narrowing 프레임이 요구사항을 떨어뜨리는 것을 관측했다. Tie-break 규칙("확신 없으면 build-out")도 같은 방향.
- (build-out) Frame is `spec-coverage`; borrowed frame: **`dialectic`을 "물리 엔진: 직접 구현 vs Matter.js(CDN)" 셀 하나에만** 빌린다. 이 셀은 진짜 양자택일이며 실패 비용이 비대칭이다(CDN URL 한 글자 오류 = 로드 단계에서 전부 사망 vs 직접 구현의 적층 안정성 결함 = 부분 동작). dialectic의 판정 함수·패자 논거 승격·재판정 트리거를 그 절 안에서만 쓰고, 나머지 문서는 spec-coverage가 소유한다.
- **Implementer**: **claude-fable-5-1**(강한 모델) — 그러나 도구는 Read/Write뿐, 명령 실행 불가. 기계 예산 적용 방식:
  - "빌드 체인 없음 / 설정-참조-설정 없음 / 의존은 완전한 복사용 문자열 / 명령형 완료 기준 금지"는 **제약에 의해 강제**된다(약한 구현자 프로파일과 같은 결과).
  - 배선 규율(부하 경로 체인, 콜드스타트 표, 동사 문장, 심볼 표)은 **강한 구현자 기준으로 전부** 적용한다 — 구현자가 흡수할 수 있다.
  - **복사용 접합 블록 필수**: 의존 alias 한 줄, 파일별 공개 함수 심볼 표(정확한 시그니처), 초기 상태 선언, 스테이지 스키마 + 완성된 샘플 스테이지 1개, 스크립트 태그 로드 순서. 복사 가능한 것은 환각되지 않는다.

## Load-bearing path candidate (build-out only)
- Path: 메인 화면 "게임 시작" 클릭 → 스테이지 1 데이터로 물리 월드가 구성되고 캔버스에 그려짐(게임 루프가 돌기 시작) → 새총 위의 새를 포인터로 누르고 당겼다가 놓음 → 놓는 순간 새가 당긴 벡터에 비례한 초기 속도로 발사되어 중력 아래 포물선을 그림 → 구조물/돼지와 충돌해 돼지가 제거되고, 돼지 0이 되면 클리어 판정이 나 "다음 스테이지"가 뜬다.
- Why this one: 이 경로가 닫히지 않으면 10개 스테이지·일시정지 오버레이·점수는 전부 장식이다. 특히 "드래그 → 놓음 → 속도 적용 → 물리 스텝이 매 프레임 실제로 돌고 있음 → 충돌 이벤트가 돼지 제거로 이어짐"의 고리가 frames.md가 관측한 "부품은 전부 있는데 주 상호작용이 죽어 있는" 실패의 자리다. 작성자는 이 경로를 바꿀 수 있으나 바꾸면 어느 경로를 골랐는지 밝혀야 한다.

## Frame selection
- Frame: **spec-coverage** (+ `dialectic` 1셀 차용)
- Rationale: Gate 0 → build-out. 예측 ①(불확실성의 위치): 원인·시장·실행자 모두 미지가 아니고 실행만 남았다 → Gate 0가 결정 → build-out → spec-coverage. 차점 후보 `backward`(그린필드 도메인 힌트)는 frames.md가 같은 과제 유형에서 관측한 손실(off-anchor 절이 사운드·이펙트·영속성·스택을 떨어뜨림) 때문에 기각. `emotion-curve`(게임 도메인 힌트)는 이 과제가 감정 곡선을 설계할 만큼 열린 문제가 아니라 완결된 스펙이라 기각.

## Style selection
- Style: **opus** (coverage-first disciplined draft)
- Execution mode: **standalone** — 다른 패스는 없다. 고백 절에서 "다음 패스"에 일을 미룰 수 없다.
- Rationale: 자동 라우팅 신호 "첫 초안 / 커버리지 폭이 핵심"이 발화했다. fable 신호(기존 플랜 레드팀, 모순되는 제약, 막힌 문제, 운영 규칙 산출물)는 발화하지 않았다 — 소비자가 모델이긴 하나 산출물은 구현 계획서이지 런북이 아니다. relay 신호(수개월 실행, 되돌리기 어려움)도 아니다. 신호 충돌 시 사용자에게 묻는 규칙은 배치 모드라 주 에이전트가 해소했다(⚠guess → opus 채택. 근거: spec-coverage 프레임 자체가 커버리지 규율이며 opus-style의 "coverage before depth"와 결이 같다).

## Output contract
- Plan file: `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r3/plans/angry-birds-web/plan.md`
- Wiring audit (Stage 2c, build-out 필수): `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r3/plans/angry-birds-web/wiring-audit.md`

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, model <model>, one-line note -->
