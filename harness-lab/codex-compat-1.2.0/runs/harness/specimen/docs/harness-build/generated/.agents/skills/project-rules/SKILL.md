---
name: project-rules
description: compat-fixture의 사용자 요청에서 도출한 단일 규칙. 프롬프트 훅 신뢰 및 활성화 후 주입된다.
---

# Project Rules

## §1 src JavaScript 파일의 리터럴 TODO 금지
- ID: no-literal-todo
- Severity: P2
- Gate: yes
- Source: user-recommended — 사용자 요청(request.txt:1).
- Evidence: src/greet.js:1은 현재 규칙을 준수한다.
- Reference: docs/conventions/no-literal-todo.md
- Detail: .agents/skills/project-rules/references/no-literal-todo.md

src 아래 .js, .mjs, .cjs, .jsx 파일의 원문에서 대소문자가 정확히 일치하는 TODO 부분문자열을 금지한다.
주석과 문자열도 검사하며, 파일 추적 여부와 diff 유무에 관계없이 전체 범위를 검사한다.
다른 코드 규칙이나 advisory 규칙은 추가하지 않는다.
