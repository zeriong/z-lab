---
name: harness-engineering
description: compat-fixture의 근거 기반 변경 및 검증 절차.
---

# compat-fixture 하네스 엔지니어링

## 프로젝트별 실행 정보
- npm 단일 패키지. lint: `npm run lint`; typecheck: `npm run typecheck`. package.json:1에 따라 두 명령은 node --check 구문 검사다.
- 유일한 규칙: `.agents/skills/project-rules/SKILL.md`의 no-literal-todo(P2), 근거 request.txt:1 및 src/greet.js:1.
- 규칙 문서: docs/conventions/no-literal-todo.md.
- 게이트: `.codex/scripts/review-gate.sh --mode=full`.
- 훅: `.codex/hooks.json`, `.codex/hooks/inject-context.sh`.
- 런타임 자동 주입은 Codex /hooks에서 프로젝트와 정확한 훅 정의의 신뢰 및 활성화를 확인해야 한다. 직접 실행 성공만으로 런타임 활성화를 주장하지 않는다.

## 번들 우회 동작의 범위
번들 훅은 `!` 접두사 또는 프롬프트 어디에든 나타나는 `harness 빼고`, `without harness`, `skip harness`, `no harness` 문구를 우회 요청으로 처리한다. 인용문 속 문구에도 적용되므로 그런 요청은 본문 주입을 생략할 수 있다. 이는 번들 동작이며 자동 강제 집행을 보장하지 않는다. 필요한 검증은 `.codex/scripts/review-gate.sh --mode=full`을 직접 실행한다. 프롬프트 우회 여부는 직접 게이트의 검사 결과에 영향을 주지 않는다.

## Phase 8 독립 검토 실행 계약
전체 게이트 exit 0 이후 현재 세션 모델과 추론 강도를 상속하는 새로운 읽기 전용 Codex 검토자 두 명을 독립 실행한다. 한 명은 규칙 도출/구조, 다른 한 명은 게이트/구현에 초점을 둔다. 동일한 전체 diff, 생성 파일 본문, 프로젝트 규칙, 탐지 결과를 전달한다. 검토자는 패치 제안만 하고 주 작업자가 통합한다.
각 검토자는 다음 JSON을 반환한다:
```json
{"findings":[{"severity":"P2","file":"path","line":1,"issue":"description","suggested_fix":"description"}],"fact_check_misses":[],"gate_evasions":[],"quality_scores":{"srp":5,"comment_clarity":5,"kiss":5,"dry":5,"yagni":5,"cognitive_ease":5},"patches_suggested":[]}
```
점수에는 각 축의 근거를 별도 quality_evidence 객체로 덧붙인다. 두 검토의 fact_check_misses와 gate_evasions가 각각 0이고 품질 평균이 각각 3.5 이상이어야 한다. findings도 해결 여부를 명시한다. 사실 근거 누락은 Phase 1, 우회는 Phase 4, 낮은 품질은 Phase 6에서 수정한다. 패치 적용 후 항상 Phase 1부터 재검증한다. 패치를 SRP/주석 명확성/KISS/DRY/YAGNI/인지 용이성으로 평가한다. 최대 세 번의 검토/회귀 반복 이후 미해결 항목과 시도 내역을 정직하게 보고하고 중단한다.

## 번들 워크플로의 11개 단계
아래 번들 계약에서 review-gate.sh는 위 Codex 경로를 의미하며, SKILL.md Phase 6.2의 검토는 위 두 Codex 검토자 계약으로 구체화한다.

# Generated harness-engineering contract

This public contract is self-contained. It is based on the requirements in this
plugin, and does not require a private setup guide or research document.

Generate the project-specific `harness-engineering/SKILL.md` with these eleven phases.
Use the selected host's real paths and reviewer dispatch; retain the project's
existing commands and include only rules derived from the target repository.

0. **Intake:** resolve the requested outcome, scope and constraints; reuse already
   answered questions. A bypass-marked request skips this workflow.
1. **Reconnaissance:** read affected code, check claims against files and usages, and
   record `file:line` evidence. Recheck the affected scope after any patch.
2. **Rules:** select the applicable project-rules and convention references. Separate
   deterministic gate rules from advisory guidance; introduce no unsupported rules.
3. **Plan:** choose the smallest change satisfying the confirmed outcome and name
   the checks that establish success. Resolve material unknowns before implementation.
4. **Implement:** make the scoped change following the evidenced project conventions.
5. **Behavior checks:** run the relevant existing tests and add coverage where behavior
   changes or a regression needs it. Record failures and their evidence.
6. **Static checks:** run the lint/typecheck commands locked in intake; record the
   actual results, including any unavailable checks.
7. **Documentation:** update affected convention examples and user-facing behavior
   documentation; keep citations and keyword indexes consistent with the code.
8. **Review gate:** run `review-gate.sh --mode=full`, then obtain the two independent
   one-shot reviews described in SKILL.md Phase 6.2. Main synthesizes the results;
   reviewers propose changes only. Grade patches against the six quality axes. Every
   applied patch returns to Phase 1. Stop after three review/regression iterations
   with the remaining findings if the gate does not pass.
9. **Final verification:** verify the actual final diff, tests and remaining findings.
   Never call an unavailable or failed check a pass.
10. **Delivery:** report changed behavior, evidence and limitations. Commit or publish
    only when the user has authorized that action.

The prompt hook injects the generated project-rules and this generated workflow body.
For a bypass prompt (`!` prefix, `harness 빼고`, `without harness`, `skip harness`,
`no harness`), inject a short `BYPASS MODE` note instead. Bypass applies to this harness
workflow only and does not disable other project instructions or unrelated hooks.
