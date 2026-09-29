# Context Packet — angry-birds-web-game
- Date: 2026-09-26
- Requested by: zeriong
- Language of artifacts: 한국어 (계획서 본문 한국어. 코드 식별자·파일명·URL은 영문 그대로)

## Run stamp — record, never guess
- plan-smith version: 1.4.2 (`<HOME>/.claude/plugins/cache/plan-smith-marketplace/plan-smith/1.4.2/.claude-plugin/plugin.json`의 `"version"` 필드에서 읽음)
- frames.md fingerprint: 430 lines
- Main agent model: claude-opus-5-5
- plan-writer model: claude-opus-5-5 (agent 정의 `model: inherit` → 메인 에이전트 모델 상속)
- Skill invocation: batch/scripted — `/plan-smith:plan-smith` 호출이지만 사용자가 "확인 게이트는 배치 실행이므로 스스로 승인하고 진행"이라고 지시. 확인 게이트는 메인 에이전트 자체 승인으로 처리됨(아래 ⚠guess 해소 기록 참조).

## Task (one line)
웹 브라우저에서 동작하는 앵그리버드류 물리 슬링샷 게임(10 스테이지, 일시정지 오버레이 포함)을, 파일 읽기/쓰기 도구만 가진 구현자(claude-opus-5-5)가 이 계획서 하나만 보고 완성할 수 있도록 하는 구현 계획서를 작성한다.

## Background (why now)
- 비교 실험의 공통 입력 요구사항(`inputs/game-prompt.md`)에 대한 plan-smith 셀의 계획서다. 동일 요구사항을 베이스라인 `/plan`과 `/plan-smith`로 각각 계획하고 비교한다.
- 이 단계에서는 게임 코드를 작성하지 않는다. 계획서만 만든다. 이후 구현자가 이 계획서만 읽고 구현한다.
- 구현자는 설치·빌드·실행·테스트를 전혀 할 수 없다. 즉 구현 중 **피드백 루프가 0**이다. 브라우저에서 한 번도 돌려보지 못한 채 코드가 완성되어야 하므로, 계획서가 배선(wiring)과 접합부(glue)를 미리 결정해 두지 않으면 구현자의 기억(recall)이 그 빈자리를 채우고, 그 오류는 아무도 발견하지 못한다.

## Goal — definition of success
- 구현자가 이 계획서 **한 문서만** 읽고, 파일 쓰기만으로, 브라우저에서 열면 바로 플레이 가능한 게임을 만들어 낸다.
- 완성된 게임에서: 메인 화면 → 게임 시작 → 새총으로 새를 당겨 쏘고 → 포물선·중력·충돌·구조물 파괴로 돼지를 제거 → 모든 돼지 제거 시 클리어 / 새 소진 시 실패 → 10개 스테이지를 진행할 수 있다.
- 인게임 우측의 일시정지 버튼을 누르면 게임이 멈추고 **다시하기 / 메인으로** 버튼이 있는 오버레이가 뜨며, 두 버튼이 각각 정확히 동작한다.
- 계획서는 요구사항 파일이 던진 핵심 질문(물리 엔진 선택, 렌더링, 스테이지 데이터 구조·로딩·전환, 슬링샷 입력과 궤적 예측 UX, 충돌·파괴·점수·클리어 판정, 일시정지 오버레이와 상태 머신, 완료 판정 기준)에 모두 명시적으로 답한다.

## Hard constraints
- 웹 브라우저에서 동작 — source: user said (game-prompt.md "웹브라우저로 앵그리버드 게임을 만드세요")
- 스테이지는 정확히 10단계 — source: user said (game-prompt.md 요청 1)
- 게임 시작 → 앵그리버드와 같은 시스템(새총 드래그 발사, 포물선 궤적·중력·충돌·구조물 파괴로 목표(돼지) 제거) — source: user said (game-prompt.md 요청 2)
- 일시정지 버튼이 인게임 **우측**에 존재, 클릭 시 **다시하기 / 메인으로** 버튼 존재 — source: user said (game-prompt.md 요청 3)
- 구현자 = claude-opus-5-5. 구현자는 **이 계획서 하나만** 읽는다(패킷·요구사항 파일·대화에 접근하지 않는다고 가정) → 계획서는 자기완결적이어야 하며 필요한 정보를 다른 파일에 위임할 수 없다 — source: user said
- 구현자는 **파일 읽기/쓰기 도구만** 사용. 설치(npm 등)·빌드·실행·테스트 불가 — source: user said
  - 파생 제약: 빌드 체인(번들러, TypeScript 컴파일, npm 패키지) 사용 불가 → 브라우저가 직접 로드하는 평문 HTML/CSS/JS 파일로 구성해야 한다 — source: 위 제약에서 직접 도출
  - 파생 제약: 완료 기준에 "명령 X가 exit 0" 형태를 둘 수 없다(구현자가 실행 불가). 완료 기준은 구현자가 **자기 산출물을 읽어서** 확인할 수 있는 정적 점검이어야 한다 — source: 위 제약 + frames.md machinery budget
  - 파생 제약: 외부 라이브러리를 쓴다면 구현자가 파일을 다운로드할 수 없으므로 CDN `<script src>` 완전한 URL(정확한 버전 포함)로만 가능. 라이브러리 소스를 기억으로 직접 써 넣는(vendoring) 방식은 불가 — source: 위 제약에서 도출
- 이 단계(계획)에서는 코드를 작성하지 않는다 — source: user said. 해석: 게임 구현 코드는 쓰지 않는다. 단 frames.md machinery budget이 요구하는 **짧은 복사용 접합부 블록**(의존성 alias 한 줄, 파일별 공개 함수 시그니처 표, 초기 상태 선언, 스테이지 데이터 스키마 예시 1건)은 계획서의 명세 내용으로 허용한다 (⚠guess → 배치 자체 승인으로 확정. 아래 기록 참조)
- 산출물: `plans/angry-birds-web-game/plan.md` 한 파일 — source: skill output contract

## Soft preferences
- "완성된 게임처럼 느껴지는" 표면: 점수 표시, 별(1~3) 평가, 스테이지 선택 화면과 잠금 해제, 진행 상황 저장(localStorage), 파괴·명중 시각 피드백(파티클/흔들림 등), 배경, 간단한 효과음 — 요구사항에 명시되진 않았으나 앵그리버드류 게임이 끝나 보이려면 필요한 것들. spec-coverage 프레임의 "the artifact plainly needs in order to feel finished"에 해당. 명시 요구가 아니므로 ledger에서 `build` / `defer(+trigger)` / `n-a(+reason)` 판정은 writer 몫이지만 **침묵은 금지** (⚠guess: 사용자가 명시하진 않음)
- 효과음은 외부 오디오 파일 없이 Web Audio API로 합성하는 쪽이 자산 파일 0개 제약과 맞다 (⚠guess, 기술적 제안일 뿐)
- UI 문구는 한국어("다시하기", "메인으로" 등 요구사항 표기 그대로) (⚠guess → 배치 자체 승인)
- 입력: 데스크톱 마우스가 1순위, Pointer Events로 터치도 같이 받으면 좋음 (⚠guess)

## Rejected alternatives (and why)
- 빌드 도구 기반 스택(Vite / TypeScript / npm 패키지 import) — 구현자가 설치·빌드를 할 수 없어 컴파일 여부조차 확인 불가. 타입 검사라는 구매 이유가 실행 불가 환경에서 사라진다. 부활 조건: 구현자가 명령 실행 권한을 얻으면 재검토.
- `<script type="module">` ES 모듈 분할 — ⚠guess 기반 거절: 평가자가 `index.html`을 더블클릭(file://)으로 열면 Chrome에서 모듈 import가 CORS로 차단되어 첫 화면부터 죽는다. 부활 조건: 게임이 로컬/원격 HTTP 서버로 제공된다는 것이 확정되면 재검토.
- 스테이지 데이터를 `fetch()`로 JSON 파일에서 로드 — 위와 같은 이유(file://에서 fetch 차단). 스테이지 데이터는 JS 파일 안의 전역 상수로 둔다. 부활 조건: 동일.
- (계획 문서 형식) 좁히는 프레임(backward / delete-first 등)으로 범위를 잘라내는 계획 — 요구사항이 이미 완결된 build-out이라 누락이 최대 위험. frames.md Gate 0 참조.

## Decisions already made
- 스택은 빌드 없는 평문 HTML/CSS/JS(classic script, 전역 네임스페이스) — 위 hard constraints에서 강제됨.
- 게임은 `index.html`을 브라우저로 직접 열어 동작해야 한다(file:// 호환) — ⚠guess → 배치 자체 승인으로 확정.
- 물리 엔진(직접 구현 vs Matter.js 등 라이브러리)과 렌더링 방식(Canvas 2D 등)은 **아직 결정되지 않음** — 계획서가 결정해야 하는 열린 하위 결정(아래 Deliverable type 참조).

## Relevant files & paths
- `<LAB>/plan-smith-lab/real-skill-tco/inputs/game-prompt.md` — 요구사항 원문. 핵심: 요청 3개(10 스테이지 / 앵그리버드 동일 시스템 / 우측 일시정지 + 다시하기·메인으로)와 "플랜이 답해야 할 핵심 질문" 7개. 실험 메타(6셀 비교)는 계획서 내용과 무관.
- 기존 코드베이스 없음 — 작업 디렉터리 `<LAB>/plan-smith-lab/real-skill-tco/opus-5.5/plan-smith/r1`는 비어 있다(그린필드). 구현 파일 배치 경로는 writer가 계획서에서 정한다.

## Unknowns & open questions
- **물리 엔진 선택** (진짜 열린 하위 결정): 
  - Matter.js CDN: 쌓인 구조물의 안정성·충돌 처리가 검증되어 있어, 테스트 없이도 "쌓아 놓은 블록이 가만히 서 있다"가 성립할 가능성이 높다. 대신 (a) 게임을 열 때 인터넷 연결 필요, (b) API를 기억으로 호출해야 하므로 alias·시그니처가 틀릴 위험, (c) 버전 URL이 실재해야 함. 메인 에이전트 지식 기준 npm `matter-js`에 `0.19.0`, `0.20.0` 버전이 존재함(0.20.0이 2024년 공개된 최신으로 알고 있음). frames.md는 존재하지 않는 `matter-js 2.0.20`이 여러 실행에서 환각된 사례를 기록 — 버전은 반드시 실재 버전으로 고정하고 URL 전체를 복사 가능한 문자열로 써야 한다. (⚠ 이 버전 사실은 메인 에이전트의 기억이며 이 파이프라인에서 검증 수단이 없다. writer는 리스크로 다룰 것.)
  - 직접 구현: 의존성 0, 오프라인 동작, 전체 코드를 구현자가 통제. 대신 적층 안정성(블록 떨림·가라앉음·폭발), 회전 강체 충돌 해석을 **실행·튜닝 없이** 맞춰야 한다 — 피드백 루프 0인 구현자에게 가장 어려운 부분.
  - 어느 쪽이든 결정과 그 구매 이유, 진 쪽의 가장 강한 논거가 승자에게 설계 제약으로 넘어가야 한다(예: CDN 선택 시 로드 실패 감지·안내 화면, 직접 구현 시 적층 안정화 규칙).
- 평가자의 실행 환경: 데스크톱 Chrome 계열로 가정 (⚠guess). 인터넷 연결 여부 미상.
- 구현 후 실제로 누가 어떻게 게임을 검증하는지 미상 — 계획서의 "done"은 구현자가 정적으로 확인 가능한 문장 + 사람이 브라우저에서 확인할 수 있는 관찰 가능한 문장을 구분해서 둘 것.
- 스테이지 난이도 곡선·새 종류(특수 능력 새 포함 여부)·블록 재질 종류(나무/돌/유리 등)는 요구사항에 없음 — writer 결정 사항. 단 "10 스테이지"는 **10개의 실제 저작된 레이아웃**이어야 하며 로더 + 1개 스테이지로 대체 불가(frames.md spec-coverage content axis).

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 요구사항이 기능 범위를 완결적으로 지정했다(10 스테이지, 앵그리버드 동일 시스템, 우측 일시정지 + 두 버튼). 계획대로 문자 그대로 따랐을 때의 위험은 "잘못 고름"이 아니라 "빠뜨림·얇은 표면·배선 누락"이다. 특히 구현자가 실행·테스트를 못 하므로 누락된 배선은 발견되지 않은 채 출하된다.
- Frame is `spec-coverage`; borrowed for one named sub-decision only: **물리 엔진 선택(직접 구현 vs 라이브러리)** 셀 하나에만 `dialectic` 차용(verdict function + loser's-argument promotion + re-verdict trigger). 차용 사실과 출처를 계획서에 기록.
- **Implementer**: claude-opus-5-5 (강한 모델). 단 도구가 파일 읽기/쓰기로 제한되어 설치·빌드·실행·테스트 불가.
- **Machinery budget applies (환경 축 기준)**: 구현자 모델은 강하지만, 실행 불가 환경이 machinery 비용을 약한 구현자 수준으로 만든다 — 빌드 체인 없음, config가 config를 참조하는 구조 없음, 외부 의존성은 완전한 복사용 문자열(정확한 버전 URL), 명령 실행형 완료 기준 없음, **가장 위험한 접합부(의존성 alias 줄, 파일별 공개 함수 정확한 시그니처 표, 초기 상태 선언, 스크립트 로드 순서)를 복사용 블록으로 제공**. 배선 규칙(load-bearing path, cold-start table)은 그대로 구속력 있음. 실행 피드백이 없으므로 "읽어서 확인 가능한" 자기 점검 목록이 구현자의 유일한 검증 수단이다.

## Load-bearing path candidate (build-out only)
- Path: 메인 화면의 "게임 시작" 클릭 → 스테이지 1 로드(지면·구조물·돼지·새총·새 생성, 게임 루프 가동, 상태=플레이 중) → 새총의 새를 포인터로 드래그·놓기 → 새가 포물선 비행 후 구조물/돼지와 충돌 → 돼지 체력 감소·제거 → 남은 돼지 0 → 클리어 판정 → 클리어 화면 표시.
- Why this one: 이 경로가 닫히지 않으면(드래그가 안 먹거나, 새가 날지 않거나, 충돌해도 돼지가 안 죽거나, 다 죽여도 클리어가 안 뜨면) 10 스테이지·일시정지·점수는 전부 장식이 된다. writer는 ≤5 hop으로 압축할 것.
- 메인 에이전트가 예상하는 배선 위험(참고용, writer가 채택·기각 판단): 포인터 핸들러의 가드 조건(상태 == 플레이 중 && 새가 새총 위에 대기)이 스테이지 로드 시점에 실제로 참이 되는지 / 게임 루프가 상태 전환 후에도 실제로 돌고 있는지 / 충돌 이벤트 리스너가 다시하기 때마다 중복 등록되지 않는지 / 다시하기·메인으로가 월드·타이머·리스너를 완전히 정리하는지 / 일시정지 중 물리 스텝과 입력이 멈추는지 / 스테이지 시작 직후 구조물이 스스로 무너져 돼지가 저절로 죽는(=클리어가 자동 발생하는) 경우를 막는 안정화 구간.

## Frame selection
- Frame: `spec-coverage` (+ 물리 엔진 셀에만 `dialectic` 차용)
- Rationale: Gate 0 = build-out → spec-coverage. predicate ①: 원인·시장·실행자 불확실성 없음, 실행만 남음 → Gate 0 결정. 게임 도메인 힌트(emotion-curve / failure-first)는 advisory이며 predicate가 우선. frames.md가 동일 과제(브라우저 게임 10 스테이지)에서 좁히는 프레임(backward)이 오디오·이펙트·저장·스택을 누락한 관찰 사례를 기록하고 있어, 범위를 자르는 프레임은 배제. 물리 엔진은 요구사항이 직접 "직접 구현 vs 라이브러리?"를 물은 유일한 진짜 양자택일이라 그 한 셀만 dialectic으로 판정.

## Style selection
- Style: opus
- Execution mode: standalone (다른 pass 없음. 확인·연기 대상 "다음 pass"는 존재하지 않는다)
- Rationale: auto-routing — "first draft of anything" + "breadth of coverage is the point"(build-out의 핵심 위험이 누락) → opus. relay 신호(비가역·고위험·수개월 실행)는 없음. fable의 level-shift 지시는 완결된 요구사항을 재정의하려는 압력이 되어 build-out에 역효과. 소비자는 AI 구현자(system-consumed 성격)지만 요구되는 것은 규칙 설계가 아니라 빠짐없는 구현 명세이므로 opus 유지.

## Output contract
- Plan file: `<LAB>/plan-smith-lab/real-skill-tco/opus-5.5/plan-smith/r1/plans/angry-birds-web-game/plan.md`
- Wiring audit (Stage 2c): `<LAB>/plan-smith-lab/real-skill-tco/opus-5.5/plan-smith/r1/plans/angry-birds-web-game/wiring-audit.md`

## Confirmation gate record (batch self-approval)
사용자 지시("확인 게이트가 나오면 배치 실행이므로 스스로 승인하고 진행")에 따라 메인 에이전트가 자체 승인. 해소된 ⚠guess:
- 계획서 내 짧은 복사용 접합부 블록 허용 → 승인(게임 구현 코드 전체는 금지 유지)
- file:// 더블클릭 실행 호환 → 승인(ES 모듈·fetch 금지로 확정)
- UI 문구 한국어 → 승인
- "완성감" 표면(점수·별·스테이지 선택·저장·이펙트·효과음) → soft 유지, writer가 ledger에서 명시 판정
- 평가 환경(데스크톱 Chrome, 네트워크 미상) → Unknowns에 유지(가정·리스크로 취급)

## Retrospective
<!-- appended after user verdict -->
