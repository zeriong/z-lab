# Context Packet — angry-birds-web-game
- Date: 2026-09-26
- Requested by: zeriong
- Language of artifacts: 한국어 (계획서 본문은 한국어. 코드 식별자·파일명·URL은 영어 그대로)

## Run stamp — record, never guess
- plan-smith version: 1.4.2 (`~/.claude/plugins/cache/plan-smith-marketplace/plan-smith/1.4.2/.claude-plugin/plugin.json`에서 읽음)
- frames.md fingerprint: 431 lines (digest는 계산 불가 — 셸 도구 없음)
- Main agent model: claude-opus-5-5
- plan-writer model: claude-opus-5-5 (agent frontmatter `model: inherit` → 메인 에이전트와 동일)
- Skill invocation: batch/scripted — `/plan-smith:plan-smith`에 인자로 호출됨. 사용자 확인 게이트는 사용자의 지시("배치 실행이므로 스스로 승인하고 진행")에 따라 메인 에이전트가 자체 승인함

## Task (one line)
웹 브라우저에서 동작하는 앵그리버드식 물리 슬링샷 게임(10 스테이지, 인게임 우측 일시정지 → 다시하기/메인으로)을 구현하기 위한 구현 계획서를 작성한다.

## Background (why now)
- 비교 실험의 공통 입력(`game-prompt.md`)으로 받은 요구사항이다. 이 셀의 산출물은 **계획서 한 편**이며, 이 단계에서 게임 코드는 작성하지 않는다.
- 계획서는 이후 **claude-opus-5-5**에게 넘어가 구현된다. 구현자는 **이 계획서 하나만** 읽고, **파일 읽기/쓰기 도구만으로** 작업한다. 설치·빌드·실행·테스트는 불가능하다 — 즉 구현자는 자기가 쓴 코드를 한 번도 돌려보지 못한 채 완성해야 한다.

## Goal — definition of success
- 구현자가 이 계획서만 읽고 파일을 써 내려가면, 누군가 그 결과물의 `index.html`을 브라우저로 열었을 때 **메인 화면 → 게임 시작 → 새총 발사 → 구조물 붕괴·돼지 제거 → 클리어/실패 → 다음 스테이지** 가 끊김 없이 돌아가고, 10개 스테이지가 모두 플레이 가능하며, 인게임 우측 일시정지 버튼이 다시하기/메인으로를 제공한다.
- 실행 피드백이 없는 구현자이므로, 계획서는 "돌려보면 드러났을" 결함(미정의 심볼, 잘못된 import, 존재하지 않는 라이브러리 버전, 스크립트 로딩 순서, 초기 상태 누락)을 **문서 단계에서 결정해 고정**해야 한다.
- 요구사항 파일의 "플랜이 답해야 할 핵심 질문" 7개(물리 엔진, 렌더링, 10 스테이지 데이터 구조·로딩·전환, 슬링샷 입력과 궤적 예측 UX, 충돌·파괴·점수·클리어 판정, 일시정지 오버레이와 상태 머신, 완료 판정 기준)에 계획서가 각각 명시적으로 답한다.

## Hard constraints
- 웹 브라우저에서 동작하는 게임 — source: user (game-prompt.md 요청사항)
- **stage는 10단계** — source: user (요청사항 1)
- **게임시작 → 앵그리버드와 같은 게임 시스템**: 새총으로 발사체를 당겨 쏘고, 포물선 궤적·중력·충돌·구조물 파괴로 목표(돼지 등)를 제거하는 물리 기반 슬링샷 게임 — source: user (요청사항 2)
- **일시정지 버튼이 인게임 우측**에 존재하고, 클릭 시 **다시하기 / 메인으로** 버튼이 존재 — source: user (요청사항 3)
- 구현자 = claude-opus-5-5, **이 계획서 하나만** 읽는다 → 계획서는 자기완결적이어야 한다. 패킷·요구사항 파일·기타 문서를 참조하라고 쓰면 안 된다 — source: user
- 구현자의 도구 = **파일 읽기/쓰기만**. 설치·빌드·실행·테스트 불가 — source: user. 따라서:
  - npm install / 번들러 / tsc / 트랜스파일 불가 → 브라우저가 그대로 읽는 순수 파일이어야 한다.
  - 외부 파일 다운로드 불가 → 라이브러리를 로컬에 벤더링할 수 없고, 이미지·사운드 에셋 파일도 구할 수 없다.
  - 코드를 실행해 확인할 수 없다 → 완료 기준 중 구현자 몫은 "자기 산출물을 읽어서 확인할 수 있는 것"이어야 한다.
- 이 단계에서는 코드를 작성하지 않는다 — source: user. (해석은 아래 "Decisions already made" D4 참조)

## Soft preferences
- 핵심 질문 7개에 각각 답이 보이도록(요구사항 파일에 "참고"로 표시됨 — 목차 강제는 아니지만 누락은 안 됨).
- UI 텍스트는 한국어 ⚠guess (버튼 라벨이 "다시하기 / 메인으로"로 한국어 지정됨 → 자체 승인됨)

## Rejected alternatives (and why)
- 사용자가 명시적으로 기각한 대안은 없음. (writer가 자체 대안을 세우고 각각 revival trigger를 붙일 것)

## Decisions already made
- D1. 산출물은 계획서 문서 하나(`plans/angry-birds-web-game/plan.md`) — user 지시.
- D2. 구현자와 도구 범위(위 hard constraints) — user 지시.
- D3. **Machinery budget은 최소-기계장치 형태로 적용한다** — 메인 에이전트 판단, 게이트에서 자체 승인.
  근거: 구현자는 강한 모델이지만, machinery budget이 막으려는 실패(구현자가 재현하지 못하는 빌드 체인·설정·의존성 버전)는 *실행 피드백 부재*에서 생긴다. 이 구현자는 아무것도 실행할 수 없으므로 잘못된 import·버전·스크립트 순서가 플레이 시점에야 드러난다. 따라서:
  - 빌드 체인 없음, package.json/tsconfig 같은 설정 파일 없음, 설정이 설정을 참조하는 구조 없음.
  - 외부 의존성이 있다면 **정확한 버전이 박힌 완전한 URL 문자열 한 줄**로 복사 가능하게 적는다(이름만 적고 기억에 맡기지 않는다).
  - 고위험 연결부(의존성 별칭 한 줄, 파일별 공개 함수의 정확한 시그니처 표, 초기 상태 선언)를 **그대로 복사 가능한 블록**으로 계획서에 싣는다.
  - 구현자가 실행할 수 없는 명령형 완료 기준(예: "`tsc` exits 0")은 쓰지 않는다. 명령으로만 증명되는 보장(타입체크 등)을 스택 선택의 근거로 사지 않는다.
  - 다만 구현자 역량이 높으므로 배선 규칙(load-bearing path, verb sentences)은 전부 그대로 적용한다.
- D4. "코드를 작성하지 않는다"의 해석 ⚠guess (자체 승인됨): 게임 소스 파일을 만들지 않으며, 계획서 안에 **함수 본문/알고리즘 구현을 쓰지 않는다**. 단 D3의 고정용 블록(별칭 한 줄, 시그니처, 상수·데이터 스키마, 초기 상태 선언, 스크립트 태그 순서)은 frames.md가 "구현이 아니라 이음매를 고정하는 것"으로 규정한 범위라 허용한다. 스테이지 10개의 레이아웃 데이터를 계획서에 표/좌표로 싣는 것은 콘텐츠 명세로서 허용한다.

## Relevant files & paths
- `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/inputs/game-prompt.md` — 유일한 요구사항 출처. 핵심: 요구사항 3개(10 스테이지 / 앵그리버드식 슬링샷 물리 / 우측 일시정지 → 다시하기·메인으로) + 계획서가 답해야 할 핵심 질문 7개. **주의:** 파일 하단 "실험 메타" 섹션(6셀 매트릭스, `test/<model>/<method>/plan.md` 경로)은 실험 관리용이지 게임 요구사항이 아니다 — 계획서 내용에 반영하지 말 것. 출력 경로는 이 패킷의 Output contract를 따른다.
- 코드베이스 없음 — 작업 디렉터리 `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/opus-5.5/plan-smith/r2`는 비어 있다(그린필드). 게임 파일의 루트 위치는 writer가 정한다(계획서에 명시).

## Unknowns & open questions
(모두 ⚠guess였고 배치 모드 게이트에서 아래 방향으로 자체 승인됨. writer는 사실이 아니라 **가정 + "틀리면 어떻게 되나"**로 다룰 것.)
- U1. **실행 방식**: `index.html`을 더블클릭(file://)으로 열어도 동작해야 한다고 가정. 결과: ES module(`type="module"`)·`fetch()`로 JSON 로드는 file://에서 CORS로 막힐 수 있음 → classic `<script>` 순서 로딩, 스테이지 데이터는 JS 파일에 내장. 틀려도(로컬 서버로 서빙) classic script는 그대로 동작하므로 손해 없음.
- U2. **플레이 시 네트워크**: 인터넷 연결 여부 불명. CDN 라이브러리는 오프라인에서 동작하지 않고, 구현자는 라이브러리를 벤더링할 수 없다. → **물리 엔진(라이브러리 via CDN vs 직접 구현)이 이 과제에서 유일하게 진짜로 열린 결정이다.** 직접 구현은 오프라인에 강하지만, 실행 없이 강체 적층(블록 탑) 안정성을 맞추기 어렵다. 라이브러리는 적층·회전·충돌이 검증돼 있지만 네트워크와 정확한 URL/버전에 의존한다. writer가 판정하고 기각된 쪽에 revival trigger를 붙인다.
- U3. **입력 장치**: 데스크톱 마우스 기본, Pointer Events로 터치 겸용 가정.
- U4. **에셋**: 이미지·사운드 파일을 구할 수 없음 → 캔버스 도형/그라디언트로 그림. 사운드는 WebAudio 합성으로 만들 수 있으나 요구사항에 없음 → writer가 build/defer 결정.
- U5. **대상 브라우저**: 최신 Chrome/Edge/Firefox/Safari 가정.
- U6. **"완성감" 항목**(요구사항에 명시 안 됨): 점수, 별점, 스테이지 선택/잠금 해제, 진행 저장(localStorage), 파괴 이펙트, 효과음, 클리어/실패 결과 화면, 화면 크기 대응. spec-coverage는 "산출물이 완성돼 보이려면 당연히 필요한 것"도 행으로 올리라고 요구한다. 메인 에이전트의 판단: 앵그리버드식이라면 점수·클리어/실패 화면·파괴 피드백·진행 저장은 기대되는 수준. 최종 build/defer/n-a는 writer 몫(빈칸 금지).
- U7. **실패 조건**: "새를 모두 쓰고 모든 물체가 정지했는데 돼지가 남아 있으면 실패"가 장르 표준 — writer가 정확한 정지 판정(속도 임계·타임아웃)을 정의.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 스펙이 완결돼 있다(10 스테이지, 슬링샷 물리, 우측 일시정지 + 두 버튼). 계획서를 문자 그대로 따랐을 때의 위험은 "잘못 고름"이 아니라 **빠뜨림**(얇은 표면, 발사 경로가 닫히지 않음, 스테이지 콘텐츠 1개 + 로더만 있음, 효과/점수/저장 누락)과 **통합 실패**(실행 피드백 없이 작성된 파일들이 서로 맞물리지 않음)다.
- Frame is `spec-coverage`; 차용: **`constraint-first`를 "물리 엔진·렌더링·로딩 방식" 한 셀(한 섹션)에만** 차용한다. 벽: 설치 불가 / 다운로드·벤더링 불가 / 실행·테스트 불가 / file:// 가정(U1) / 네트워크 불명(U2). 이 벽 안에서 모순 여부부터 판정하고 결정을 내릴 것. 차용 사실을 계획서 헤더나 해당 섹션에 한 줄로 기록.
- **Implementer**: claude-opus-5-5 (강한 모델) — 단 **실행 피드백 0**(파일 읽기/쓰기만) 환경.
- **Machinery budget applies (최소-기계장치 형태)** — D3 참조. 요약: 빌드 체인 없음, 설정-참조-설정 없음, 의존성은 정확한 버전의 완전한 URL 문자열, 고위험 연결부는 그대로 복사 가능한 블록, 구현자가 돌릴 수 없는 명령형 완료 기준 금지(구현자 몫의 완료 기준은 자기 산출물을 읽어 확인 가능한 형태로).

## Load-bearing path candidate (build-out only)
- Path: 메인 화면의 "게임 시작" 클릭 → 스테이지 1 데이터가 물리 월드 + 렌더 루프에 적재되고 게임 상태가 인게임이 됨 → 플레이어가 새총의 새를 포인터로 끌었다 놓으면 새에 발사 속도가 부여되고 중력으로 포물선 비행 → 새(또는 무너진 블록)와의 충돌 충격이 임계를 넘으면 돼지가 제거되고 점수 반영 → 남은 돼지 0 → 클리어 판정·결과 화면 → 다음 스테이지 진입.
- Why this one: 발사가 되지 않거나 충돌이 돼지를 제거하지 못하면 10 스테이지·일시정지·점수는 모두 장식이 된다. frames.md에 같은 도메인에서 "표면 커버리지 만점, 주 상호작용 사망"이 관측돼 있다. 특히 실행 피드백 없는 구현자에게 이 경로의 가드 조건들(입력 상태, 새 바디의 static→dynamic 전환, 충돌 이벤트 구독, 게임 상태 값)이 **같은 순간에 모두 참일 수 있는지**를 문서가 결정해 둬야 한다.
- 보조 후보(writer 판단): 일시정지 버튼 → 오버레이 → 다시하기(월드 완전 재구성) / 메인으로 — 일시정지가 물리 스텝과 입력을 실제로 멈추는지, 재시작이 이전 월드의 바디·이벤트 리스너를 남기지 않는지.

## Frame selection
- Frame: **spec-coverage** (+ `constraint-first` 차용: 물리 엔진·렌더링·로딩 셀 한정)
- Rationale: Gate 0 = build-out → spec-coverage. 예측자 ①(불확실성 위치): 원인·시장·실행자 불명 아님, 실행만 남음 → Gate 0 결정. 단 물리 엔진 선택은 벽(U1·U2·실행 불가)에 끼인 진짜 either/or라 그 셀만 constraint-first로 판정. Runner-up `backward`는 기각 — frames.md의 통제 A/B가 바로 이 도메인(브라우저 게임, 10 스테이지)에서 backward가 사운드·이펙트·저장·스택을 누락시키고 명시 요구사항을 "cosmetic"으로 재분류했음을 기록. 좁히는 프레임은 완결 스펙에 부적합.

## Style selection
- Style: **opus**
- Execution mode: **standalone** (다른 pass 없음 — 고백 로그에서 "다음 pass"로 미루기 금지)
- Rationale: auto-routing — 첫 초안이며, build-out이라 커버리지(빠뜨림 방지)가 핵심 → opus 신호. relay 신호(되돌리기 어려움·장기 실행·"철저히")는 없음. 비용 추적 실험(TCO)이므로 단일 pass.

## Output contract
- Plan file: `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/opus-5.5/plan-smith/r2/plans/angry-birds-web-game/plan.md`
- Wiring audit (Stage 2c, build-out 필수): `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/opus-5.5/plan-smith/r2/plans/angry-birds-web-game/wiring-audit.md`

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, model <writer model>, one-line note -->
