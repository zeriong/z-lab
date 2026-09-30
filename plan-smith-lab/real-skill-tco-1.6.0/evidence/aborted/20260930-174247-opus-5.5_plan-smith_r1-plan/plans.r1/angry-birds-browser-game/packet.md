# Context Packet — angry-birds-browser-game
- Date: 2026-09-30
- Requested by: zeriong (사용자)
- Language of artifacts: 한국어 (사용자가 한국어로 대화함 — 계획서 본문·UI 문구 설명 모두 한국어)

## Run stamp — record, never guess
- plan-smith version: 1.6.0 (출처: `<LAB>/plan-smith-lab/real-skill-tco-1.6.0/subject/plugins/plan-smith/.claude-plugin/plugin.json` 의 `"version": "1.6.0"`)
- frames.md fingerprint: 430 lines, sha256 `a3df58434a23a187fe9cf84d0737bbeb8201a27cff08ff8fd87c5482fc1cd760`
- Main agent model: claude-opus-5-5
- plan-writer model: claude-opus-5-5 (agent 정의가 `model: inherit` — 메인 에이전트와 동일)
- Skill invocation: batch/scripted — `/plan-smith:forge` 가 배치 하네스로 호출됨. 사용자 지시: "사용자 확인 게이트가 나오면 배치 실행이므로 스스로 승인하고 진행한다." 따라서 확인 게이트는 메인 에이전트가 자체 승인함(아래 "Confirmation gate record" 참조).

## Task (one line)
웹 브라우저에서 동작하는 앵그리버드류 물리 슬링샷 게임(10개 스테이지, 우측 일시정지 버튼 → 다시하기/메인으로)을 구현하기 위한 **구현 계획서**를 작성한다. 이 단계에서 게임 코드는 작성하지 않는다.

## Background (why now)
- 요구사항 파일(`game-prompt.md`)은 비교 실험의 공통 입력이다: `{fable, opus, sonnet} × {/plan, /plan-smith}` 6개 셀이 같은 요구사항으로 각자 구현 플랜을 쓴다. 이 셀은 opus × /plan-smith.
- 산출물은 계획서 1개. 이후 별도 단계에서 **claude-opus-5-5 가 이 계획서 하나만 읽고** 게임을 구현한다.
- 실험 맥락이지만, 계획서는 실험을 의식해 쓰지 말고 "이 게임을 실제로 완성시키는 계획"으로 써야 한다.

## Goal — definition of success
- 구현자(claude-opus-5-5)가 이 계획서 **한 개만** 읽고, 파일 읽기/쓰기 도구만으로(실행·테스트 없이) 코드를 작성했을 때, 사람이 브라우저로 열자마자 다음이 성립하는 게임이 나온다:
  1. 메인 화면 → "게임 시작" → 스테이지 플레이가 된다.
  2. 새총을 끌어당겨 조준·발사 → 포물선 궤적, 중력, 충돌, 구조물 파괴 → 목표(돼지) 제거 → 클리어/실패 판정이 된다.
  3. **10개 스테이지**가 각각 저작된 콘텐츠(서로 다른 배치·난이도 곡선)로 존재하고 순서대로 전환된다.
  4. 인게임 화면 **우측**에 일시정지 버튼이 있고, 누르면 **다시하기 / 메인으로** 버튼이 있는 오버레이가 뜨며 두 버튼이 각각 의도대로 동작한다.
- 계획서는 "실행해 보지 못한 구현자"가 첫 시도에 **한 번도 실행되지 않은 코드로 동작하는 게임**을 만들 확률을 최대화해야 한다. 즉 배선(wiring)·심볼 정의·초기 상태가 계획서 수준에서 결정되어 있어야 한다.
- 계획서는 요구사항 파일이 제시한 "핵심 질문" 7개(물리 엔진 선택, 렌더링 방식, 10개 스테이지 데이터 구조·로딩·전환, 슬링샷 입력과 궤적 예측 UX, 충돌·파괴·점수·클리어 판정 규칙, 일시정지 오버레이와 상태 머신, 완료 판정 기준)에 모두 명시적으로 답해야 한다.

## Hard constraints
- 웹 브라우저에서 동작 — source: 요구사항 "웹브라우저로 앵그리버드 게임을 만드세요".
- 스테이지는 정확히 **10단계** — source: 요구사항 1.
- 게임 시작 → 앵그리버드와 같은 게임 시스템(새총 당겨 쏘기, 포물선 궤적·중력·충돌·구조물 파괴로 목표 제거, 물리 기반) — source: 요구사항 2.
- 일시정지 버튼이 인게임 **우측**에 존재, 클릭 시 **다시하기 / 메인으로** 버튼 존재 — source: 요구사항 3.
- 구현자는 **claude-opus-5-5**, 이 계획서 **하나만** 읽는다 — source: 사용자 지시. (패킷·요구사항 파일·이 대화는 구현자에게 전달되지 않는다고 가정해야 함 → 계획서는 자기완결적이어야 한다.)
- 구현자는 **파일 읽기/쓰기 도구만** 사용, **설치·빌드·실행·테스트 불가** — source: 사용자 지시. 귀결: npm install, 번들러, TypeScript 컴파일, 로컬 서버 기동, 브라우저로 확인, 자동 테스트 실행 모두 불가. "완료" 기준 중 구현자가 스스로 확인할 수 있는 것은 **자기가 쓴 파일을 읽어서 확인 가능한 것**뿐이다.
- 이 단계에서는 코드를 작성하지 않는다(게임 구현 금지, 계획서만) — source: 사용자 지시. 단, frames.md의 machinery budget이 요구하는 "고위험 접합부(glue)의 복사 가능한 짧은 블록"(의존성 alias 한 줄, 파일별 공개 함수 시그니처 표, 초기 상태 선언)은 구현이 아니라 계약이므로 허용된다 — 게임 로직 본문 구현으로 번지지 않게 할 것.

## Soft preferences
- UI 문구는 한국어, 버튼 라벨은 요구사항 표기 그대로 "게임 시작", "다시하기", "메인으로" ⚠guess (요구사항이 한국어로 버튼명을 지정한 데서 추론)
- 이미지/사운드 에셋 파일 없이 코드로 그리는 도형 기반 그래픽(외부 에셋 의존 최소화) ⚠guess (구현자가 에셋을 만들 수 없고 실행 확인도 못 하므로 추론)

## Rejected alternatives (and why)
- 빌드 체인이 필요한 스택(npm 패키지 설치, Vite/webpack 등 번들러, TypeScript 컴파일, 프레임워크 CLI) — rejected because 구현자가 설치·빌드·실행을 할 수 없다(사용자 지시). 빌드 없이 브라우저가 직접 로드하는 평범한 파일이어야 한다.
- (그 외 사용자가 명시적으로 기각한 대안은 없음. 물리 엔진 직접 구현 vs 라이브러리, Canvas 2D vs 기타는 **열린 질문**이며 계획서가 결정해야 한다.)

## Decisions already made
- 산출물은 계획서 문서 1개(아래 Output contract). 코드 없음 — 사용자 지시.
- 계획서 언어: 한국어 — 사용자 대화 언어.
- 배치 실행: 확인 게이트는 메인 에이전트가 자체 승인 — 사용자 지시.

## Relevant files & paths
- `<FIXTURE>` — 요구사항 원문이자 유일한 사양 출처. 한 줄 요지: "10 스테이지 / 슬링샷 물리 게임플레이 / 우측 일시정지 → 다시하기·메인으로" 3개 요구사항과, 계획서가 답해야 할 핵심 질문 7개(물리 엔진, 렌더링, 스테이지 데이터·전환, 슬링샷 입력·궤적 예측, 충돌·파괴·점수·클리어 규칙, 일시정지·상태 머신, 완료 기준)가 들어 있다. 하단 "실험 메타"는 계획서 내용과 무관(실험 운영 정보).
- 작업 디렉터리 `<FIXTURE>` — 기존 코드베이스 없음(그린필드). `plan.start/plan.end/plan.json/plan.err`는 실험 하네스 파일이며 계획 내용과 무관.

## Unknowns & open questions
- **게임을 여는 방식** ⚠guess → 자체 승인됨: `index.html`을 더블클릭(file://)으로 열어도 동작해야 한다고 가정한다. 영향: file:// 에서는 `<script type="module">`(ES 모듈)과 `fetch()`로 JSON 로드가 브라우저 CORS 정책으로 막힐 수 있으므로, 클래식 `<script src>` 태그 + 전역 네임스페이스, 스테이지 데이터는 JS 파일 안의 리터럴로 두는 설계가 안전하다. 계획서는 이 가정과 그 "틀렸을 때 영향"을 명시해야 한다.
- **네트워크 가용성** — 플레이 시 인터넷(CDN) 접근 가능 여부 불명. 물리 라이브러리를 CDN으로 쓰면 오프라인에서 게임 전체가 죽는다. 라이브러리 채택 시 정확한 버전이 박힌 완전한 URL 문자열(기억으로 쓰면 버전 환각 위험 — frames.md에 `matter-js 2.0.20` 같은 존재하지 않는 버전이 반복 관측됨)과 로드 실패 시 동작을 계획서가 정해야 한다. 이는 아래 "열린 하위 결정"과 직결.
- **열린 하위 결정: 물리 엔진 — 직접 구현 vs 라이브러리(Matter.js 등)** — 요구사항이 명시적으로 묻는 진짜 양자택일. 판단 축 후보: 실행 없이 첫 시도에 동작할 확률(API 기억 오류 vs 자체 물리의 적분·충돌 버그), 오프라인 동작, 구조물 적층 안정성(쌓인 블록이 떨지 않고 서 있는가), 파괴 판정(충격량) 구현 용이성. 계획서가 판정하고, 기각된 쪽에 부활 조건을 붙여야 한다.
- 렌더링: Canvas 2D vs DOM/SVG/WebGL — 열린 질문이지만 캐논(Canvas 2D)이 강하다. 계획서가 선택과 그 선택이 사는 것(buy)을 명시할 것.
- 점수·별점·진행 저장(localStorage)·사운드·이펙트·반응형/모바일 터치 — 요구사항에 명시되지 않았으나 "완성된 게임처럼 느끼기 위해 명백히 필요한 것"에 해당할 수 있음. spec-coverage의 no-silent-drop ledger에서 각각 build / defer(+트리거) / n-a(+이유)로 처리해야 하며 공란은 결함.
- 사람(사용자)이 구현 후 브라우저로 실제 확인할지 여부는 불명. 계획서의 "done"은 (a) 구현자가 파일을 읽어서 자가 확인할 수 있는 항목과 (b) 이후 사람이 브라우저에서 수행할 수 있는 수용 테스트 문장을 구분해 두는 것이 좋다.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 계획서를 문자 그대로 따랐을 때의 위험은 "잘못 고름"이 아니라 "빠뜨림"이다. 요구사항 3개가 모두 확정되어 있고(10 스테이지, 슬링샷 물리, 우측 일시정지+2버튼), 실패 양상은 스테이지 콘텐츠 누락, 일시정지/재시작 배선 누락, 클리어 판정 미연결, 점수·저장·피드백 같은 "완성감" 표면의 무언의 누락이다. frames.md가 기록한 관측 사례(같은 브라우저 게임 과제에서 좁히는 프레임이 오디오·이펙트·저장·스택을 누락)와 정확히 같은 형태.
- (build-out) Frame is `spec-coverage`; 차용: **물리 엔진 선택(직접 구현 vs 라이브러리) 한 셀에만 `dialectic`을 차용**(진짜 양자택일이며 요구사항이 명시적으로 묻는 질문; 판정 함수와 패자 논거의 제약 승격, 재판정 트리거가 필요한 형태). 그 외 섹션은 spec-coverage가 소유.
- **Implementer**: **claude-opus-5-5** (강한 모델) — 단, **실행 불가 환경**: 파일 읽기/쓰기 도구만, 설치·빌드·실행·테스트 불가, 계획서 1개만 읽음.
- **Machinery budget applies (조정 적용)**: 구현자 능력은 강하지만 환경이 "눈먼 구현"이므로, machinery budget의 약한/미지 구현자 조항 중 환경에서 비롯된 항목을 적용한다 — 빌드 체인 없음(브라우저가 직접 로드하는 평범한 파일), config가 config를 참조하는 구조 없음, 외부 의존성은 정확한 버전이 박힌 **완전한 복사 가능 문자열**, 구현자가 실행할 수 없는 명령형 완료 기준 금지(대신 자기 출력물을 읽어서 확인 가능한 점검), 고위험 접합부의 **복사 가능한 블록**(의존성 alias 줄, 파일별 공개 함수 시그니처 표, 초기 상태 선언, 스크립트 로드 순서). 강한 구현자이므로 파일 수 제한은 느슨해도 되나, 파일 간 계약(전역 심볼 이름·시그니처·로드 순서)은 계획서가 고정해야 한다.

## Load-bearing path candidate (build-out only)
- Path: 메인 화면 "게임 시작" 클릭 → 스테이지 1 로드(지형·새총·구조물·돼지 생성, 물리 루프 가동) → 플레이어가 새총의 새를 드래그해 당겼다 놓음 → 새가 중력 포물선으로 날아가 구조물/돼지와 충돌 → 돼지 체력 0으로 제거 → 남은 돼지 0 판정으로 "스테이지 클리어" 화면 표시.
- Why this one: 이 경로가 끊기면(시작 버튼 무반응, 드래그 입력이 새에 안 붙음, 발사 후 새가 안 움직임, 충돌해도 돼지가 안 죽음, 다 죽여도 클리어가 안 뜸) 10개 스테이지·일시정지·점수가 전부 장식이 된다. 게임의 1차 상호작용 그 자체. 작가(writer)가 ≤5 홉으로 압축하고 최종 결정을 소유하되, 다른 경로를 택하면 이유를 밝힐 것.

## Frame selection
- Frame: `spec-coverage` (+ 물리 엔진 셀에 `dialectic` 차용)
- Rationale: Gate 0 = build-out(위). 예측 ①(불확실성 위치): 원인·시장·실행자 불확실성 없음, 실행만 남음 → Gate 0 규칙에 따라 spec-coverage. 도메인 힌트(games → emotion-curve / failure-first)는 참고용이며 술어가 우선 — 좁히는 프레임은 완결된 사양에서 요구사항 누락을 허가하므로 배제. 차선(runner-up)은 `failure-first`(실행 불가 구현자의 실패 모드 선제 봉쇄)였으나, 이 문서의 주 위험은 누락이므로 spec-coverage가 문서를 소유하고, "실행 불가"로 인한 배선 위험은 spec-coverage의 load-bearing path + machinery budget이 담당한다.

## Style selection
- Style: **opus** (coverage-first disciplined draft)
- Execution mode: **standalone** (다른 패스 없음 — 고백 로그에서 "다음 패스"로 미루기 금지)
- Rationale: auto 라우팅. 신호: 첫 초안 / 누락이 주 위험인 build-out이라 "breadth of coverage is the point" → opus. relay 신호(되돌리기 어려움, 수개월 실행, "철저히" 요청)는 발화하지 않음 — 게임 구현은 재작성 가능하고 사용자가 추가 비용을 요청하지 않음. fable 신호(기존 계획 리뷰, 모순된 제약, 운영 규칙 문서)도 불발. 계획서 소비자가 AI 구현자이긴 하나, 요구되는 것은 규칙 체계가 아니라 빠짐없는 구현 사양이므로 opus.

## Output contract
- Plan file: `<FIXTURE>`
- (build-out) Wiring audit: `plans/angry-birds-browser-game/wiring-audit.md` (Stage 2c, 별도 fresh writer)

## Confirmation gate record
- 배치 실행이므로 메인 에이전트가 자체 승인(사용자 지시에 근거). 승인된 ⚠guess: (1) file:// 더블클릭 실행 가정, (2) UI 한국어·버튼 라벨 원문 유지, (3) 외부 이미지/사운드 에셋 없이 코드로 그리는 도형 그래픽. 세 항목 모두 계획서의 "Explicit assumptions"에 impact-if-wrong과 함께 실려야 한다.

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, model <id>, <split N parts | unsplit> (<characters> chars), one-line note -->
