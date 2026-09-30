---
name: project-rules
description: compat-fixture의 사용자 요청에 근거한 단일 규칙.
---

# Project Rules

## §1 src JavaScript 파일의 리터럴 TODO 금지
- ID: no-literal-todo
- Severity: P2
- Gate: yes
- 근거: 사용자 요청(request.txt:1); 현재 준수 코드: src/greet.js:1.
- src/ 아래 .js, .jsx, .mjs, .cjs 파일에서 대소문자를 구분하는 ASCII 리터럴 `TODO`를 금지한다. 주석, 문자열, 식별자를 포함한다.
- 전체 파일을 검사하며 추적되지 않은 파일도 포함한다.
- 상세: references/no-literal-todo.md 및 docs/conventions/no-literal-todo.md.
- 검사: `.codex/scripts/review-gate.sh --mode=full`.

추가 규칙 및 advisory 규칙은 없다.
