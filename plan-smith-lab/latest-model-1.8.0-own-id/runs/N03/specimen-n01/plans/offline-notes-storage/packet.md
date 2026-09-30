# Context Packet — offline-notes-storage
- Date: 2026-09-30
- Requested by: user
- Language of artifacts: 한국어

## Run stamp — record, never guess
- plan-smith version: 1.7.0 (`<plugin>/.codex-plugin/plugin.json`)
- frames.md fingerprint: 430 lines; SHA-256 `a3df58434a23a187fe9cf84d0737bbeb8201a27cff08ff8fd87c5482fc1cd760`
- Main agent model: unknown (현재 세션의 실제 모델 ID는 노출되지 않음; 로컬 Codex 설정은 `gpt-6.1-sol`)
- plan-writer model: gpt-6.1-sol (격리 writer의 native `spawn_agent` 호출에 지정한 ID; 도구 응답에는 별도 실행 모델 헤더가 없음)
- Writer effort: medium (`PLAN_SMITH_CODEX_EFFORT`)
- Skill invocation: Codex `$plan-smith:forge`, interactive

## Task (one line)
오프라인 단일 사용자 메모 앱의 제목·본문 저장 방식으로 JSON 파일과 SQLite 중 하나를 선택하는 짧은 결정 계획.

## Background (why now)
사용자가 `source.txt`의 앱 조건과 결정 대상, 프레임·스타일을 지정했다. 이 계획은 사람이 구현한다.

## Goal — definition of success
승인된 조건에 맞춰 JSON 파일과 SQLite의 선택 기준, 권고, 검증 방법, 선택이 뒤집힐 조건을 250단어 미만의 실행 가능한 결정 계획으로 제시한다.

## Hard constraints
- 오프라인, 단일 사용자, 제목·본문 레코드, 동기화·동시성 없음 — 사용자 및 `source.txt`.
- 결정 대상은 JSON 파일 대 SQLite — 사용자.
- 호스팅 데이터베이스는 제외 — 사용자 결정. 제외 사유는 제시되지 않음.
- `backward` 프레임, `opus` 스타일 — 사용자.
- 계획 250단어 미만, 앱 코드 구현·커밋 금지 — 사용자 및 `AGENTS.md`.
- 사용자에게 보여 줄 모든 내용과 계획은 한국어 — 사용자 제공 `AGENTS.md`.

## Soft preferences
- 간결한 결정 문서.

## Rejected alternatives (and why)
- 호스팅 데이터베이스 — 사용자가 이미 제외함; 별도의 이유는 제시되지 않음. 다시 권고하지 않는다.

## Decisions already made
- 입력 조건과 계획 작업을 사용자가 확인함. 추가 확인을 요청하지 않는다.
- 구현자는 사람.

## Relevant files & paths
- `source.txt` — 앱 범위를 확인하는 원문; 로컬·오프라인·1인용이며 제목·본문만 있고 동기화·동시성은 없다.
- `AGENTS.md` — 작업 규칙; 커밋하지 않고 요청 범위만 작업한다.

## Unknowns & open questions
- 메모 수, 본문 크기, 검색·정렬·마이그레이션 필요성, 구현 언어와 런타임은 지정되지 않았다. 이를 사실로 단정하지 말고 선택 조건으로 다룬다.
- 호스팅 데이터베이스 제외의 세부 사유는 알려지지 않았다.

## Deliverable type (Gate 0)
- Type: decision
- Rationale: 문자 그대로 따랐을 때 핵심 위험은 기능 누락보다 저장 방식을 잘못 선택하는 것이다.
- **Implementer**: 사람. 과도한 도구·절차를 요구하지 않는다.

## Frame selection
- Frame: backward
- Rationale: 사용자 지정. 최대 5개 수용 기준에서 출발해 저장 방식의 선택을 역으로 도출한다.

## Style selection
- Style: opus
- Execution mode: standalone
- Rationale: 사용자 지정. 사람이 읽을 첫 결정 계획이므로 간결하고 폭넓게 비교한다.

## Output contract
- Plan file: `plans/offline-notes-storage/plan.md`

## Retrospective
<!-- 사용자 verdict 후 기록 -->
