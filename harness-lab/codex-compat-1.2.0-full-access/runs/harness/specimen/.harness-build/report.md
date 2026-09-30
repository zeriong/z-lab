# Codex 하네스 생성 및 직접 검증 완료

## 생성 경로
- `.codex/hooks/inject-context.sh`
- `.codex/hooks.json`
- `.codex/scripts/review-gate.sh`
- `.agents/skills/harness-engineering/SKILL.md`
- `.agents/skills/project-rules/SKILL.md`
- `.agents/skills/project-rules/references/no-literal-todo.md`
- `docs/conventions/no-literal-todo.md`

## 도출 규칙
- gate: no-literal-todo(P2) 하나. 사용자 요청(request.txt:1)이 규칙의 근거이고 src/greet.js:1은 현재 준수 사례다.
- advisory 없음. 추가 구조 규칙 없음.
- npm 단일 패키지; `npm run lint`, `npm run typecheck`. package.json:1에서 두 명령 모두 node --check src/greet.js이며 실제 타입 분석은 아니다.
- src/greet.js, AGENTS.md, package.json, request.txt의 원본 SHA-256 일치. 패키지 설치, stage, commit, push, 사용자 설정 변경, 플러그인 소스 수정 없음.

## 직접 검증 증거
[전체 실행 결과](validation.json), [재실행 스크립트](verify.py), [원본 해시](original-sha256.json), [검토된 생성 파일 해시](artifact-sha256.json).
- 23개 검증 기록 통과(예상 종료 코드 및 본문 검증 포함).
- full/refs-only 게이트 exit 0; lint/typecheck exit 0.
- 별도 일회용 fixture의 미추적·공백 경로 .js/.jsx/.mjs/.cjs 위반 표본: 각각 exit 1. 표본 fixture는 삭제됐다. 원본 src에는 위반 표본을 쓰지 않았다.
- 잘못된 mode/rule/인자, 읽기 불능 파일, 순환 가능한 심볼릭 링크 디렉터리, 인터프리터 시작 실패: 각각 exit 2.
- Bash 구문 검사 통과. src 하위 디렉터리에서 훅을 직접 실행해 두 스킬 본문 주입을 확인했다.
- 다섯 우회 문구 및 문서 인용문 속 우회 문구에서 BYPASS MODE를 확인했다. 이는 번들 동작이며 직접 게이트의 규칙 탐지에는 영향을 주지 않는다.
- 주입 스크립트는 번들 원본과 바이트 단위로 동일하며 실행 권한을 유지했다. 생성 워크플로는 번들 11단계를 포함한다.
- 최종 git diff --check 및 빈 staged diff 확인. 기존 파일도 처음부터 미추적 상태였으므로 원본 보존은 Git diff 대신 SHA-256으로 확인했다.

## 실제 독립 검토
내장 subagent 생성은 thread-store 오류로 실패하여 Codex 어댑터의 대체 절차를 사용했다. 각 회차는 서로 다른 `codex exec --ephemeral -s read-only -m gpt-6-astra -c 'model_reasoning_effort="xhigh"'` 두 프로세스이며, 동일 전체 번들과 서로 다른 검토 초점을 제공했다. 기존 설정에서 확인한 모델/강도를 명시적으로 전달했다.
- 1차: 번들 우회 문구의 인용문 매칭 지적. 번들 동작 변경 제안은 채택하지 않고 한계를 문서화했다. [통합 기록](iteration1-synthesis.md).
- 2차: here-document 시작 실패의 종료 코드 오분류를 두 검토자가 재현했다. Python -c 및 내부 위반 코드 분리로 수정하고 Phase 1부터 재검증했다. [통합 기록](iteration2-synthesis.md).
- 3차: 두 검토 모두 findings 0, fact_check_misses 0, gate_evasions 0, patches_suggested 0. 세 회차 한도 안에서 통과했다.
- derivation: gpt-6-astra / xhigh / read-only, 품질 평균 4.67/5, 세션 `<run-id>`. [JSON](review-derivation.json), [실행 로그](review-derivation.log).
- implementation: gpt-6-astra / xhigh / read-only, 품질 평균 4.50/5, 세션 `<run-id>`. [JSON](review-implementation.json), [실행 로그](review-implementation.log).

## 런타임 활성화 및 환경 한계 — 별도 상태
- Codex 프로젝트 및 정확한 훅 정의의 신뢰, 훅 활성화는 **pending**이다. 글로벌 신뢰나 설정을 변경하지 않았다.
- 직접 스크립트 성공은 Codex 런타임 자동 호출의 증거가 아니다. 자동 활성화는 /hooks에서 신뢰·활성화를 확인한 뒤 별도로 검증해야 한다.
- 읽기 전용 독립 검토 환경에서는 번들 훅의 Bash here-document 임시 파일 생성이 차단되어 exit 1이었다. 이 실행을 통과로 집계하지 않는다. 현재 full-access fixture에서의 직접 실행은 통과했다. 번들 소스는 요구대로 보존했다.

## 수동 실행
`.codex/scripts/review-gate.sh --mode=full`
