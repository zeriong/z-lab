# 컨텍스트 패킷 — 노트 저장 방식 결정

## Run stamp — 확인된 정보만 기록
- plan-smith version: 1.6.0 (.codex-plugin/plugin.json에서 확인; 디렉터리명과 구분)
- frames.md fingerprint: SHA-256 a3df58434a23a187fe9cf84d0737bbeb8201a27cff08ff8fd87c5482fc1cd760
- Main agent model: 정확한 resolved ID는 unknown; 호스트는 GPT-6 기반 Codex로 명시함.
- plan-writer model: 메인 모델과 effort 상속; 정확한 resolved ID는 unknown. opus는 모델 ID가 아님.
- Skill invocation: scripted, 사용자 입력에 사전 승인 포함. Codex adapter의 fresh subagent 경로.
- 날짜: 2026-09-29
- 문서 언어: 한국어 (사용자 AGENTS.md 지시)

## Task
작은 오프라인 노트 앱에 JSON 파일 또는 SQLite 중 하나를 선택하는 간결한 결정 문서 작성.

## Background
사용자는 실제 forge 스킬과 Codex 격리 작성자 경로의 실행을 요구했다. 메인 에이전트는 의도만 정리하고 문서 작성은 새 작성자에게 맡긴다.

## Goal — 성공 기준
두 후보의 장단점을 현재 범위에 맞게 비교하고 하나를 선택하며 이유, 가정, 재검토 조건을 제시한다. 문서는 1500단어 미만이다.

## Hard constraints
- 로컬 사용자 한 명, 오프라인, 동기화 없음, 동시성 없음 — 사용자 승인 및 source.txt.
- 노트 필드는 title과 body — source.txt.
- 사람이 구현한다. 이번 산출물은 결정 문서이며 앱 코드 구현은 하지 않는다 — 사용자 승인.
- source.txt와 플러그인 수정 금지. stage/commit/push, 설정 변경, 플러그인 설치 금지 — 사용자 및 AGENTS.md.
- 이 일회용 fixture에 요청된 계획 산출물만 작성한다 — AGENTS.md.
- 계획 본문 1500단어 미만, 모든 사용자 대상 본문은 한국어 — 사용자.

## Soft preferences
- 간결하고 읽기 쉬운 결정 문서. 추가적인 제품 요구는 지정되지 않았다.

## Rejected alternatives
- 호스팅 데이터베이스 — 사용자가 명시적으로 제외했다. 로컬 오프라인 범위와 맞지 않는다. 그 외 거부 이유는 별도로 제공되지 않았다.

## Decisions already made / 사전 확인 기록
- 목표, 결정 문서 유형, 사람 구현, 단일 로컬 사용자, 동기화·동시성 없음, 호스팅 DB 제외, opus 문체는 사용자 메시지에서 이미 승인됨.
- 사용자는 위 조건을 다시 묻지 말고 진행하라고 명시했다. 이 사전 승인으로 확인 게이트를 충족한다.
- 프레임 선택 및 이유 기록은 사용자에게 위임받았다. 저장 방식 결론은 작성자가 결정한다.

## Relevant files & paths
- `/private<fixture>/source.txt` — 요구 검증 근거. 로컬 단일 사용자, title/body, 동기화와 동시 쓰기 없음.
- `/private<fixture>/AGENTS.md` — 작업 경계. fixture 산출물만 작성하고 원본·플러그인·git 상태 변경 금지.
- `<plugin>/skills/forge/SKILL.md` — 격리 작성과 원문 전달 계약의 원본.

## Unknowns & open questions
- 구현 언어·런타임·운영체제, 노트 총량, 검색 요구, 내구성 수준은 미지정. 요구를 만들어내지 말고 선택에 필요한 가정과 틀릴 때의 영향만 명시한다.
- 정확한 모델 ID는 호스트에서 제공되지 않아 unknown으로 기록한다. 모델 ID나 성능 수치를 추측하지 않는다.

## Deliverable type (Gate 0)
- Type: decision.
- Rationale: JSON 파일 대 SQLite라는 선택이 열려 있고 주된 위험은 잘못된 선택이다. 완성된 구현 명세의 누락을 검사하는 작업이 아니다.
- Implementer: 사람. 숙련도는 미지정. 작은 앱 규모에 맞춰 불필요한 도구·설치·빌드 명세를 추가하지 않는다.
- Load-bearing path: build-out이 아니므로 해당 없음. wiring audit 생략.

## Frame selection
- Frame: constraint-first.
- Rationale: 로컬·오프라인·단일 사용자라는 확정된 제약이 후보의 적합성을 판단하는 기준이다. 제약의 모순 여부부터 확인하되 두 후보 모두 통과할 가능성을 인정하고 그 안에서 선택한다. option-parallel은 최종 선택을 독자에게 넘기므로 하나를 골라 달라는 요청에 덜 맞는다.
- 이는 사용자가 위임한 프레임 판단이며 새로운 제품 요구 추정이 아니다.

## Style selection
- Style: opus.
- Execution mode: standalone, 단일 작성 패스.
- Rationale: 사용자 명시 지정. 문체 지시만 적용하고 모델을 바꾸지 않는다.

## Output contract
- Plan file: `/private<fixture>/plans/note-storage-decision/plan.md`
- 작성자만 plan.md를 작성한다. 메인 에이전트는 packet.md, writer-prompt.md, writer-evidence.md를 기록하고 최종 본문은 원문으로 전달한다.
- 본문은 한국어로 간결하게, 1500단어 미만. 필수 고정 제목 Frame deviations & habit regressions는 그대로 사용해도 된다.
- 외부 조사나 앱 구현은 요구되지 않는다. 기술적 세부 보증을 추측하지 말고 결정의 경계와 사람의 확인 사항을 적는다.

## Retrospective
- 사용자 최종 채택·수정·거절 판정 대기.
