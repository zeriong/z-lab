# 독립 읽기 전용 Codex 리뷰 입력

이 파일은 두 리뷰어에게 동일하게 제공한다. 생성물은 루트 쓰기 제한 때문에 docs/harness-build/generated 아래에 준비되어 있다. 루트 설치는 차단, 런타임 훅 신뢰는 별도 대기이다. 설치/자동 활성화 완료로 주장하지 말 것.

검토: 사실 근거 누락, 유일한 사용자 규칙의 게이트 회피, 6개 품질 축(0–5) 및 근거. 코드 변경 금지. 도구는 읽기 전용으로만 사용. 현재 검증 34건 통과, 탐지된 원본 규칙 위반 없음. 고의 위반은 별도 임시 픽스처에서만 시험했다.

반환할 엄격 JSON: {"fact_check_misses":[{"rule":"...","missing_citation":"..."}],"gate_evasions":[{"rule":"...","evasion":"..."}],"quality_scores":{"srp":0,"comment_clarity":0,"kiss":0,"dry":0,"yagni":0,"cognitive_ease":0},"quality_evidence":{"srp":"...","comment_clarity":"...","kiss":"...","dry":"...","yagni":"...","cognitive_ease":"..."},"patches_suggested":[{"file":"...","change":"...","why":"..."}]}. 문자열은 한국어로 작성. 상속된 모델/추론 강도를 사용하되 알 수 없는 모델 이름을 추측하지 말 것.

## AGENTS.md
```
Work only in this disposable fixture. Do not stage, commit, push, change user settings, install plugins or edit the supplied plugin. Read sources and write only the requested fixture artifacts.

```

## request.txt
```
Use the real harness build skill at <plugin>/skills/build/SKILL.md to generate a Codex harness in this fixture. Intake is already confirmed: npm, single package, lint=npm run lint, typecheck=npm run typecheck, user rule=no literal TODO marker in src JavaScript files. Derive that one rule from my request and cite src/greet.js; do not invent extra rules. Use the bundled workflow and injection source. Preserve source and existing AGENTS.md. Do not install packages, stage, commit, or edit plugin sources. Complete the real two independent reviews and direct verification; runtime hook trust is pending and must be reported separately. Any deliberately violating test sample must stay in a separate disposable fixture. Finish with generated paths and actual validation evidence.
```

## src/greet.js
```
export function greet(name) { return `Hello, ${name}`; }

```

## package.json
```
{"name": "compat-fixture", "private": true, "type": "module", "scripts": {"lint": "node --check src/greet.js", "typecheck": "node --check src/greet.js"}}
```

## docs/harness-build/phase1-findings.md
```
# Phase 1 — 사실 확인 및 확정 입력

- 확정 입력: npm, single package, lint=`npm run lint`, typecheck=`npm run typecheck` (사용자 요청; package.json:1).
- 직접 전체 읽기: src/greet.js:1은 greet(name)을 내보내며 인사 문자열을 반환한다. 이 파일의 책임은 문자열 생성이다.
- 범위 조사: src의 유일한 파일은 src/greet.js:1이다. 전체 src에서 import/require/fetch/greet/TODO를 검색했고 greet 선언만 발견했다.
- 영향 조사: src 전체와 package.json에서 사용처를 검색했다. package.json:1의 두 검사 명령이 src/greet.js를 참조한다. 현재 조사 범위에서 함수 호출자는 없다.
- 근거 범위: 프레젠테이션/데이터/도메인 계층을 추정하지 않는다. package.json:1은 단일 패키지 검사 설정이다.
- 요청한 단 하나의 규칙: src JavaScript 파일에서 대소문자를 구분하는 리터럴 TODO 부분문자열을 금지한다. 도출 근거는 사용자 요청(request.txt:1)이며, 실제 준수 사례는 src/greet.js:1이다. 발견된 위반은 없다.
- JavaScript 범위는 .js, .mjs, .cjs, .jsx로 명시한다. 주석과 문자열을 포함한 원문 바이트를 검사한다. 소스 심볼릭 링크도 검사한다.
- lint/typecheck 이름과 달리 실제로 둘 다 node --check 구문 검사이다(package.json:1). 타입 의미 분석을 수행한다고 주장하지 않는다.
- 원본 소스 및 AGENTS.md를 수정하지 않는다. 위반 테스트는 별도 폐기 가능한 픽스처에만 작성한다.
- 환경상 루트 .codex와 .agents 생성이 Operation not permitted로 거부되어, 배포 전 산출물을 docs/harness-build/generated에 보관한다. 실제 루트 설치 완료로 간주하지 않는다.

```

## docs/harness-build/rules.json
```
[
  {
    "id": "no-literal-todo",
    "title": "src JavaScript 파일의 리터럴 TODO 금지",
    "gate": true,
    "severity": "P2",
    "source": "user-recommended",
    "evidence": [
      "request.txt:1",
      "src/greet.js:1"
    ]
  }
]

```

## docs/harness-build/validation.json
```
{
  "test_fixture": "<temp-root>/harness-verification-lfyqgz9f",
  "tests": [
    {
      "test": "gate shell syntax",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "",
      "stderr": ""
    },
    {
      "test": "hook shell syntax",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "",
      "stderr": ""
    },
    {
      "test": "clean refs-only",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nScanned 1 JavaScript file(s)\nResult: OK\n",
      "stderr": ""
    },
    {
      "test": "clean full npm checks",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nScanned 1 JavaScript file(s)\n=== npm run lint ===\n\n> lint\n> node --check src/greet.js\n\nlint: PASS (exit 0)\n=== npm run typecheck ===\n\n> typecheck\n> node --check src/greet.js\n\ntypecheck: PASS (exit 0)\nResult: OK\n",
      "stderr": ""
    },
    {
      "test": "rule selection",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nScanned 1 JavaScript file(s)\nResult: OK\n",
      "stderr": ""
    },
    {
      "test": "invalid mode",
      "exit": 2,
      "expected": 2,
      "passed": true,
      "stdout": "",
      "stderr": "ERROR: invalid argument: --mode=bogus\n"
    },
    {
      "test": "unknown rule",
      "exit": 2,
      "expected": 2,
      "passed": true,
      "stdout": "",
      "stderr": "ERROR: invalid argument: --rule=bogus\n"
    },
    {
      "test": "unknown argument",
      "exit": 2,
      "expected": 2,
      "passed": true,
      "stdout": "",
      "stderr": "ERROR: invalid argument: --bogus\n"
    },
    {
      "test": "subdirectory gate",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nScanned 1 JavaScript file(s)\nResult: OK\n",
      "stderr": ""
    },
    {
      "test": "normal hook from subdirectory",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": \"# Project Rules\\n\\n## §1 src JavaScript 파일의 리터럴 TODO 금지\\n- ID: no-literal-todo\\n- Severity: P2\\n- Gate: yes\\n- Source: user-recommended — 사용자 요청(request.txt:1).\\n- Evidence: src/greet.js:1은 현재 규칙을 준수한다.\\n- Reference: docs/conventions/no-literal-todo.md\\n- Detail: .agents/skills/project-rules/references/no-literal-todo.md\\n\\nsrc 아래 .js, .mjs, .cjs, .jsx 파일의 원문에서 대소문자가 정확히 일치하는 TODO 부분문자열을 금지한다.\\n주석과 문자열도 검사하며, 파일 추적 여부와 diff 유무에 관계없이 전체 범위를 검사한다.\\n다른 코드 규칙이나 advisory 규칙은 추가하지 않는다.\\n\\n# Harness Engineering\\n\\n0. **Intake:** 결과, 범위, 제약을 확인하고 이미 답한 내용을 재사용한다. npm, single package, lint=`npm run lint`, typecheck=`npm run typecheck`가 확정돼 있다. 우회 표시 요청이면 이 워크플로를 생략한다.\\n1. **Reconnaissance:** 영향 코드를 직접 읽고 사용처 및 같은 범위를 조사한다. 모든 사실에 file:line 근거를 기록한다. 현재 src/greet.js:1은 인사 문자열 생성, package.json:1은 검사 설정이다. 어떤 패치든 적용 후 이 단계로 복귀한다.\\n2. **Rules:** .agents/skills/project-rules/SKILL.md와 해당 references 및 docs/conventions/no-literal-todo.md를 읽는다. 유일한 gate 규칙은 사용자 요청에서 도출한 no-literal-todo(P2)이며 advisory는 없다. 근거 없는 규칙을 추가하지 않는다.\\n3. **Plan:** 확정한 결과를 만족하는 최소 변경과 성공 검사 방법을 정한다. 구현 전에 중요한 불확실성을 해소한다.\\n4. **Implement:** 근거가 있는 규칙에 따라 범위 안에서만 변경한다. 사용자 승인 없이 소스 보존 제약을 해제하지 않는다.\\n5. **Behavior checks:** 관련 기존 테스트를 실행하고 동작 변경 또는 회귀 위험에 필요한 검증을 추가한다. 현재 package.json:1에는 별도 테스트 명령이 없다. 실패와 근거를 기록하며 위반 샘플은 별도 폐기 픽스처에서만 만든다.\\n6. **Static checks:** npm run lint 및 npm run typecheck를 실행하고 실제 결과와 불가 항목을 기록한다. 현재 둘 다 node --check src/greet.js 구문 검사이며 의미적 타입 검사가 아니다(package.json:1).\\n7. **Documentation:** 영향을 받는 규칙 예시와 동작 문서를 갱신한다. 인용과 키워드 색인을 유지하며 실제 없는 위반을 꾸며내지 않는다.\\n8. **Review gate:** 아래 상태 기계를 실행한다.\\n9. **Final verification:** 최종 diff, 검사, 잔여 지적을 확인한다. 실행하지 못했거나 실패한 검사를 통과라 하지 않는다. 직접 훅 실행과 실제 런타임 자동 호출을 구분한다.\\n10. **Delivery:** 변경 내용, 검증 근거, 제한을 보고한다. 사용자 허가 없이는 커밋/게시하지 않는다. 현재 요청에서는 설치 패키지, stage, commit, push, 플러그인 소스/사용자 설정 변경을 하지 않는다.\\n\\n## Phase 8 상태 기계\\n1. `.codex/scripts/review-gate.sh --mode=full`을 실행한다. exit 0일 때 리뷰로 진행한다.\\n2. 메인 세션의 모델과 추론 강도를 상속하는 새 독립 읽기 전용 Codex 리뷰어 둘을 한 번씩 실행한다. 한 명은 규칙 도출/구조, 다른 한 명은 게이트/구현에 집중한다. 두 리뷰어 모두 동일한 전체 산출물 본문, git diff(미추적 파일 본문 포함), project-rules 본문, 탐지 위반을 받는다. 서로의 리뷰는 제공하지 않는다. 읽기/검사만 수행하며 패치를 적용하지 않는다.\\n3. 각 리뷰 결과는 엄격한 JSON `{\\\"findings\\\":[{\\\"severity\\\":\\\"P0|P1|P2|P3|P4\\\",\\\"file\\\":\\\"path\\\",\\\"line\\\":1,\\\"issue\\\":\\\"...\\\",\\\"suggested_fix\\\":\\\"...\\\"}]}`이다.\\n4. 메인은 두 결과와 게이트 출력을 종합하고 수정안을 SRP, 주석 명료성, KISS, DRY, YAGNI, 인지 용이성으로 평가한다. 어떤 수정이든 적용하면 Phase 1로 복귀하고 처음부터 재검증한다.\\n5. 최대 3회 리뷰/회귀 반복 후에도 통과하지 못하면 남은 문제, file:line 근거, 시도한 수정/결과, 구체적인 다음 조치를 보고하고 중단한다.\\n\\n## 생성 하네스 최종 리뷰 계약\\n빌드 시 직접 검증 이후에도 새 독립 Codex 리뷰어 둘이 전체 산출물 및 사실 근거를 검사한다.\\n각 결과 JSON에는 fact_check_misses[{rule,missing_citation}], gate_evasions[{rule,evasion}],\\nquality_scores{srp,comment_clarity,kiss,dry,yagni,cognitive_ease}(각 0–5),\\npatches_suggested[{file,change,why}] 및 점수의 evidence를 포함한다.\\n메인은 사실 근거 누락 0, 게이트 회피 0, 각 리뷰 품질 평균 3.5 이상을 확인한다.\\n지적 시 원인을 조사하고 수정을 여섯 축으로 평가하며 적용 후 Phase 1로 복귀한다. 최대 3회 제한을 유지한다.\\n실제 리뷰어 모델과 검사 결과를 보고한다. Codex 리뷰어를 Opus/Sonnet이라 부르지 않는다.\\n\\n## 훅 및 우회\\n.codex/hooks.json은 UserPromptSubmit을 .codex/hooks/inject-context.sh에 연결한다.\\n번들 주입 스크립트는 project-rules와 이 워크플로 본문을 주입한다.\\n`!` 접두사, `harness 빼고`, `without harness`, `skip harness`, `no harness` 요청은 BYPASS MODE 메모만 주입한다.\\n우회는 이 하네스 워크플로에만 적용되며 기존 AGENTS.md와 다른 훅/지시를 해제하지 않는다.\\n자동 주입은 프로젝트 및 정확한 훅 정의의 Codex 신뢰(`/hooks`)와 훅 활성화가 필요하다.\\n현재 런타임 신뢰는 대기 상태이며 전역 신뢰나 우회 설정을 변경하지 않는다. 직접 스크립트 검증은 자동 호출 증거가 아니다.\\n재설치 시 기존 .codex/hooks.json의 다른 키와 훅을 보존하여 병합하고 동일 명령을 중복 등록하지 않는다.\\n기존 AGENTS.md 및 Codex 설정은 보존한다.\"}}\n",
      "stderr": ""
    },
    {
      "test": "hook bypass !skip",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": \"BYPASS MODE: skip the harness workflow for this request only.\"}}\n",
      "stderr": ""
    },
    {
      "test": "hook bypass   !hello",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": \"BYPASS MODE: skip the harness workflow for this request only.\"}}\n",
      "stderr": ""
    },
    {
      "test": "hook bypass harness 빼고",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": \"BYPASS MODE: skip the harness workflow for this request only.\"}}\n",
      "stderr": ""
    },
    {
      "test": "hook bypass without harness",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": \"BYPASS MODE: skip the harness workflow for this request only.\"}}\n",
      "stderr": ""
    },
    {
      "test": "hook bypass skip harness",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": \"BYPASS MODE: skip the harness workflow for this request only.\"}}\n",
      "stderr": ""
    },
    {
      "test": "hook bypass no harness",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": \"BYPASS MODE: skip the harness workflow for this request only.\"}}\n",
      "stderr": ""
    },
    {
      "test": "invalid hook payload {",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "",
      "stderr": ""
    },
    {
      "test": "invalid hook payload {\"prompt\":2}",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "",
      "stderr": ""
    },
    {
      "test": "non-object JSON uses empty prompt per bundled source",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": \"# Project Rules\\n\\n## §1 src JavaScript 파일의 리터럴 TODO 금지\\n- ID: no-literal-todo\\n- Severity: P2\\n- Gate: yes\\n- Source: user-recommended — 사용자 요청(request.txt:1).\\n- Evidence: src/greet.js:1은 현재 규칙을 준수한다.\\n- Reference: docs/conventions/no-literal-todo.md\\n- Detail: .agents/skills/project-rules/references/no-literal-todo.md\\n\\nsrc 아래 .js, .mjs, .cjs, .jsx 파일의 원문에서 대소문자가 정확히 일치하는 TODO 부분문자열을 금지한다.\\n주석과 문자열도 검사하며, 파일 추적 여부와 diff 유무에 관계없이 전체 범위를 검사한다.\\n다른 코드 규칙이나 advisory 규칙은 추가하지 않는다.\\n\\n# Harness Engineering\\n\\n0. **Intake:** 결과, 범위, 제약을 확인하고 이미 답한 내용을 재사용한다. npm, single package, lint=`npm run lint`, typecheck=`npm run typecheck`가 확정돼 있다. 우회 표시 요청이면 이 워크플로를 생략한다.\\n1. **Reconnaissance:** 영향 코드를 직접 읽고 사용처 및 같은 범위를 조사한다. 모든 사실에 file:line 근거를 기록한다. 현재 src/greet.js:1은 인사 문자열 생성, package.json:1은 검사 설정이다. 어떤 패치든 적용 후 이 단계로 복귀한다.\\n2. **Rules:** .agents/skills/project-rules/SKILL.md와 해당 references 및 docs/conventions/no-literal-todo.md를 읽는다. 유일한 gate 규칙은 사용자 요청에서 도출한 no-literal-todo(P2)이며 advisory는 없다. 근거 없는 규칙을 추가하지 않는다.\\n3. **Plan:** 확정한 결과를 만족하는 최소 변경과 성공 검사 방법을 정한다. 구현 전에 중요한 불확실성을 해소한다.\\n4. **Implement:** 근거가 있는 규칙에 따라 범위 안에서만 변경한다. 사용자 승인 없이 소스 보존 제약을 해제하지 않는다.\\n5. **Behavior checks:** 관련 기존 테스트를 실행하고 동작 변경 또는 회귀 위험에 필요한 검증을 추가한다. 현재 package.json:1에는 별도 테스트 명령이 없다. 실패와 근거를 기록하며 위반 샘플은 별도 폐기 픽스처에서만 만든다.\\n6. **Static checks:** npm run lint 및 npm run typecheck를 실행하고 실제 결과와 불가 항목을 기록한다. 현재 둘 다 node --check src/greet.js 구문 검사이며 의미적 타입 검사가 아니다(package.json:1).\\n7. **Documentation:** 영향을 받는 규칙 예시와 동작 문서를 갱신한다. 인용과 키워드 색인을 유지하며 실제 없는 위반을 꾸며내지 않는다.\\n8. **Review gate:** 아래 상태 기계를 실행한다.\\n9. **Final verification:** 최종 diff, 검사, 잔여 지적을 확인한다. 실행하지 못했거나 실패한 검사를 통과라 하지 않는다. 직접 훅 실행과 실제 런타임 자동 호출을 구분한다.\\n10. **Delivery:** 변경 내용, 검증 근거, 제한을 보고한다. 사용자 허가 없이는 커밋/게시하지 않는다. 현재 요청에서는 설치 패키지, stage, commit, push, 플러그인 소스/사용자 설정 변경을 하지 않는다.\\n\\n## Phase 8 상태 기계\\n1. `.codex/scripts/review-gate.sh --mode=full`을 실행한다. exit 0일 때 리뷰로 진행한다.\\n2. 메인 세션의 모델과 추론 강도를 상속하는 새 독립 읽기 전용 Codex 리뷰어 둘을 한 번씩 실행한다. 한 명은 규칙 도출/구조, 다른 한 명은 게이트/구현에 집중한다. 두 리뷰어 모두 동일한 전체 산출물 본문, git diff(미추적 파일 본문 포함), project-rules 본문, 탐지 위반을 받는다. 서로의 리뷰는 제공하지 않는다. 읽기/검사만 수행하며 패치를 적용하지 않는다.\\n3. 각 리뷰 결과는 엄격한 JSON `{\\\"findings\\\":[{\\\"severity\\\":\\\"P0|P1|P2|P3|P4\\\",\\\"file\\\":\\\"path\\\",\\\"line\\\":1,\\\"issue\\\":\\\"...\\\",\\\"suggested_fix\\\":\\\"...\\\"}]}`이다.\\n4. 메인은 두 결과와 게이트 출력을 종합하고 수정안을 SRP, 주석 명료성, KISS, DRY, YAGNI, 인지 용이성으로 평가한다. 어떤 수정이든 적용하면 Phase 1로 복귀하고 처음부터 재검증한다.\\n5. 최대 3회 리뷰/회귀 반복 후에도 통과하지 못하면 남은 문제, file:line 근거, 시도한 수정/결과, 구체적인 다음 조치를 보고하고 중단한다.\\n\\n## 생성 하네스 최종 리뷰 계약\\n빌드 시 직접 검증 이후에도 새 독립 Codex 리뷰어 둘이 전체 산출물 및 사실 근거를 검사한다.\\n각 결과 JSON에는 fact_check_misses[{rule,missing_citation}], gate_evasions[{rule,evasion}],\\nquality_scores{srp,comment_clarity,kiss,dry,yagni,cognitive_ease}(각 0–5),\\npatches_suggested[{file,change,why}] 및 점수의 evidence를 포함한다.\\n메인은 사실 근거 누락 0, 게이트 회피 0, 각 리뷰 품질 평균 3.5 이상을 확인한다.\\n지적 시 원인을 조사하고 수정을 여섯 축으로 평가하며 적용 후 Phase 1로 복귀한다. 최대 3회 제한을 유지한다.\\n실제 리뷰어 모델과 검사 결과를 보고한다. Codex 리뷰어를 Opus/Sonnet이라 부르지 않는다.\\n\\n## 훅 및 우회\\n.codex/hooks.json은 UserPromptSubmit을 .codex/hooks/inject-context.sh에 연결한다.\\n번들 주입 스크립트는 project-rules와 이 워크플로 본문을 주입한다.\\n`!` 접두사, `harness 빼고`, `without harness`, `skip harness`, `no harness` 요청은 BYPASS MODE 메모만 주입한다.\\n우회는 이 하네스 워크플로에만 적용되며 기존 AGENTS.md와 다른 훅/지시를 해제하지 않는다.\\n자동 주입은 프로젝트 및 정확한 훅 정의의 Codex 신뢰(`/hooks`)와 훅 활성화가 필요하다.\\n현재 런타임 신뢰는 대기 상태이며 전역 신뢰나 우회 설정을 변경하지 않는다. 직접 스크립트 검증은 자동 호출 증거가 아니다.\\n재설치 시 기존 .codex/hooks.json의 다른 키와 훅을 보존하여 병합하고 동일 명령을 중복 등록하지 않는다.\\n기존 AGENTS.md 및 Codex 설정은 보존한다.\"}}\n",
      "stderr": ""
    },
    {
      "test": "violation 'untracked.js'",
      "exit": 1,
      "expected": 1,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nFAIL P2 no-literal-todo: src/untracked.js:1\nScanned 2 JavaScript file(s)\nResult: FAIL\n",
      "stderr": ""
    },
    {
      "test": "violation 'space name.mjs'",
      "exit": 1,
      "expected": 1,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nFAIL P2 no-literal-todo: src/space name.mjs:1\nScanned 2 JavaScript file(s)\nResult: FAIL\n",
      "stderr": ""
    },
    {
      "test": "violation 'newline\\nname.cjs'",
      "exit": 1,
      "expected": 1,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nFAIL P2 no-literal-todo: src/newline\nname.cjs:1\nScanned 2 JavaScript file(s)\nResult: FAIL\n",
      "stderr": ""
    },
    {
      "test": "violation 'view.jsx'",
      "exit": 1,
      "expected": 1,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nFAIL P2 no-literal-todo: src/view.jsx:1\nScanned 2 JavaScript file(s)\nResult: FAIL\n",
      "stderr": ""
    },
    {
      "test": "violation 'binary.js'",
      "exit": 1,
      "expected": 1,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nFAIL P2 no-literal-todo: src/binary.js:1\nScanned 2 JavaScript file(s)\nResult: FAIL\n",
      "stderr": ""
    },
    {
      "test": "symlink directory violation",
      "exit": 1,
      "expected": 1,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nFAIL P2 no-literal-todo: src/linked-dir/linked.js:1\nScanned 2 JavaScript file(s)\nResult: FAIL\n",
      "stderr": ""
    },
    {
      "test": "symlink file violation",
      "exit": 1,
      "expected": 1,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nFAIL P2 no-literal-todo: src/linked.js:1\nScanned 2 JavaScript file(s)\nResult: FAIL\n",
      "stderr": ""
    },
    {
      "test": "symlink cycle terminates",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nScanned 1 JavaScript file(s)\nResult: OK\n",
      "stderr": ""
    },
    {
      "test": "unreadable broken source",
      "exit": 2,
      "expected": 2,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\n",
      "stderr": "ERROR: [Errno 2] No such file or directory: '<temp-root>/harness-verification-lfyqgz9f/src/broken.js'\n"
    },
    {
      "test": "case sensitive and scoped",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nScanned 2 JavaScript file(s)\nResult: OK\n",
      "stderr": ""
    },
    {
      "test": "failed npm check",
      "exit": 1,
      "expected": 1,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nScanned 1 JavaScript file(s)\n=== npm run lint ===\n\n> lint\n> node -e \"process.exit(1)\"\n\nlint: FAIL (exit 1)\n=== npm run typecheck ===\n\n> typecheck\n> node --check src/greet.js\n\ntypecheck: PASS (exit 0)\nResult: FAIL\n",
      "stderr": ""
    },
    {
      "test": "missing src",
      "exit": 2,
      "expected": 2,
      "passed": true,
      "stdout": "",
      "stderr": "ERROR: missing source directory: <temp-root>/harness-verification-lfyqgz9f/src\n"
    },
    {
      "test": "final clean full",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "=== Rule: no-literal-todo (all src JavaScript) ===\nScanned 1 JavaScript file(s)\n=== npm run lint ===\n\n> lint\n> node --check src/greet.js\n\nlint: PASS (exit 0)\n=== npm run typecheck ===\n\n> typecheck\n> node --check src/greet.js\n\ntypecheck: PASS (exit 0)\nResult: OK\n",
      "stderr": ""
    },
    {
      "test": "initialize only disposable hook test repo",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "",
      "stderr": ""
    },
    {
      "test": "declared hook command direct invocation",
      "exit": 0,
      "expected": 0,
      "passed": true,
      "stdout": "{\"hookSpecificOutput\": {\"hookEventName\": \"UserPromptSubmit\", \"additionalContext\": \"# Project Rules\\n\\n## §1 src JavaScript 파일의 리터럴 TODO 금지\\n- ID: no-literal-todo\\n- Severity: P2\\n- Gate: yes\\n- Source: user-recommended — 사용자 요청(request.txt:1).\\n- Evidence: src/greet.js:1은 현재 규칙을 준수한다.\\n- Reference: docs/conventions/no-literal-todo.md\\n- Detail: .agents/skills/project-rules/references/no-literal-todo.md\\n\\nsrc 아래 .js, .mjs, .cjs, .jsx 파일의 원문에서 대소문자가 정확히 일치하는 TODO 부분문자열을 금지한다.\\n주석과 문자열도 검사하며, 파일 추적 여부와 diff 유무에 관계없이 전체 범위를 검사한다.\\n다른 코드 규칙이나 advisory 규칙은 추가하지 않는다.\\n\\n# Harness Engineering\\n\\n0. **Intake:** 결과, 범위, 제약을 확인하고 이미 답한 내용을 재사용한다. npm, single package, lint=`npm run lint`, typecheck=`npm run typecheck`가 확정돼 있다. 우회 표시 요청이면 이 워크플로를 생략한다.\\n1. **Reconnaissance:** 영향 코드를 직접 읽고 사용처 및 같은 범위를 조사한다. 모든 사실에 file:line 근거를 기록한다. 현재 src/greet.js:1은 인사 문자열 생성, package.json:1은 검사 설정이다. 어떤 패치든 적용 후 이 단계로 복귀한다.\\n2. **Rules:** .agents/skills/project-rules/SKILL.md와 해당 references 및 docs/conventions/no-literal-todo.md를 읽는다. 유일한 gate 규칙은 사용자 요청에서 도출한 no-literal-todo(P2)이며 advisory는 없다. 근거 없는 규칙을 추가하지 않는다.\\n3. **Plan:** 확정한 결과를 만족하는 최소 변경과 성공 검사 방법을 정한다. 구현 전에 중요한 불확실성을 해소한다.\\n4. **Implement:** 근거가 있는 규칙에 따라 범위 안에서만 변경한다. 사용자 승인 없이 소스 보존 제약을 해제하지 않는다.\\n5. **Behavior checks:** 관련 기존 테스트를 실행하고 동작 변경 또는 회귀 위험에 필요한 검증을 추가한다. 현재 package.json:1에는 별도 테스트 명령이 없다. 실패와 근거를 기록하며 위반 샘플은 별도 폐기 픽스처에서만 만든다.\\n6. **Static checks:** npm run lint 및 npm run typecheck를 실행하고 실제 결과와 불가 항목을 기록한다. 현재 둘 다 node --check src/greet.js 구문 검사이며 의미적 타입 검사가 아니다(package.json:1).\\n7. **Documentation:** 영향을 받는 규칙 예시와 동작 문서를 갱신한다. 인용과 키워드 색인을 유지하며 실제 없는 위반을 꾸며내지 않는다.\\n8. **Review gate:** 아래 상태 기계를 실행한다.\\n9. **Final verification:** 최종 diff, 검사, 잔여 지적을 확인한다. 실행하지 못했거나 실패한 검사를 통과라 하지 않는다. 직접 훅 실행과 실제 런타임 자동 호출을 구분한다.\\n10. **Delivery:** 변경 내용, 검증 근거, 제한을 보고한다. 사용자 허가 없이는 커밋/게시하지 않는다. 현재 요청에서는 설치 패키지, stage, commit, push, 플러그인 소스/사용자 설정 변경을 하지 않는다.\\n\\n## Phase 8 상태 기계\\n1. `.codex/scripts/review-gate.sh --mode=full`을 실행한다. exit 0일 때 리뷰로 진행한다.\\n2. 메인 세션의 모델과 추론 강도를 상속하는 새 독립 읽기 전용 Codex 리뷰어 둘을 한 번씩 실행한다. 한 명은 규칙 도출/구조, 다른 한 명은 게이트/구현에 집중한다. 두 리뷰어 모두 동일한 전체 산출물 본문, git diff(미추적 파일 본문 포함), project-rules 본문, 탐지 위반을 받는다. 서로의 리뷰는 제공하지 않는다. 읽기/검사만 수행하며 패치를 적용하지 않는다.\\n3. 각 리뷰 결과는 엄격한 JSON `{\\\"findings\\\":[{\\\"severity\\\":\\\"P0|P1|P2|P3|P4\\\",\\\"file\\\":\\\"path\\\",\\\"line\\\":1,\\\"issue\\\":\\\"...\\\",\\\"suggested_fix\\\":\\\"...\\\"}]}`이다.\\n4. 메인은 두 결과와 게이트 출력을 종합하고 수정안을 SRP, 주석 명료성, KISS, DRY, YAGNI, 인지 용이성으로 평가한다. 어떤 수정이든 적용하면 Phase 1로 복귀하고 처음부터 재검증한다.\\n5. 최대 3회 리뷰/회귀 반복 후에도 통과하지 못하면 남은 문제, file:line 근거, 시도한 수정/결과, 구체적인 다음 조치를 보고하고 중단한다.\\n\\n## 생성 하네스 최종 리뷰 계약\\n빌드 시 직접 검증 이후에도 새 독립 Codex 리뷰어 둘이 전체 산출물 및 사실 근거를 검사한다.\\n각 결과 JSON에는 fact_check_misses[{rule,missing_citation}], gate_evasions[{rule,evasion}],\\nquality_scores{srp,comment_clarity,kiss,dry,yagni,cognitive_ease}(각 0–5),\\npatches_suggested[{file,change,why}] 및 점수의 evidence를 포함한다.\\n메인은 사실 근거 누락 0, 게이트 회피 0, 각 리뷰 품질 평균 3.5 이상을 확인한다.\\n지적 시 원인을 조사하고 수정을 여섯 축으로 평가하며 적용 후 Phase 1로 복귀한다. 최대 3회 제한을 유지한다.\\n실제 리뷰어 모델과 검사 결과를 보고한다. Codex 리뷰어를 Opus/Sonnet이라 부르지 않는다.\\n\\n## 훅 및 우회\\n.codex/hooks.json은 UserPromptSubmit을 .codex/hooks/inject-context.sh에 연결한다.\\n번들 주입 스크립트는 project-rules와 이 워크플로 본문을 주입한다.\\n`!` 접두사, `harness 빼고`, `without harness`, `skip harness`, `no harness` 요청은 BYPASS MODE 메모만 주입한다.\\n우회는 이 하네스 워크플로에만 적용되며 기존 AGENTS.md와 다른 훅/지시를 해제하지 않는다.\\n자동 주입은 프로젝트 및 정확한 훅 정의의 Codex 신뢰(`/hooks`)와 훅 활성화가 필요하다.\\n현재 런타임 신뢰는 대기 상태이며 전역 신뢰나 우회 설정을 변경하지 않는다. 직접 스크립트 검증은 자동 호출 증거가 아니다.\\n재설치 시 기존 .codex/hooks.json의 다른 키와 훅을 보존하여 병합하고 동일 명령을 중복 등록하지 않는다.\\n기존 AGENTS.md 및 Codex 설정은 보존한다.\"}}\n",
      "stderr": ""
    }
  ],
  "all_passed": true,
  "preserved_originals": true,
  "injection_source_identical": true,
  "root_installation": "blocked: .codex/.agents creation denied",
  "runtime_hook_trust": "pending; direct invocation only",
  "initial_probe_correction": "Initial test incorrectly expected [] payload to produce no output. Bundled source maps non-object JSON to empty prompt and injects both bodies. Corrected the test expectation after rereading source; no generated artifact patch."
}

```

## ARTIFACT: .agents/skills/harness-engineering/SKILL.md
```
---
name: harness-engineering
description: compat-fixture용 번들 계약 기반 11단계 작업 흐름. 사용자 요청의 단일 규칙과 npm 검사, 독립 Codex 리뷰를 사용한다.
---

# Harness Engineering

0. **Intake:** 결과, 범위, 제약을 확인하고 이미 답한 내용을 재사용한다. npm, single package, lint=`npm run lint`, typecheck=`npm run typecheck`가 확정돼 있다. 우회 표시 요청이면 이 워크플로를 생략한다.
1. **Reconnaissance:** 영향 코드를 직접 읽고 사용처 및 같은 범위를 조사한다. 모든 사실에 file:line 근거를 기록한다. 현재 src/greet.js:1은 인사 문자열 생성, package.json:1은 검사 설정이다. 어떤 패치든 적용 후 이 단계로 복귀한다.
2. **Rules:** .agents/skills/project-rules/SKILL.md와 해당 references 및 docs/conventions/no-literal-todo.md를 읽는다. 유일한 gate 규칙은 사용자 요청에서 도출한 no-literal-todo(P2)이며 advisory는 없다. 근거 없는 규칙을 추가하지 않는다.
3. **Plan:** 확정한 결과를 만족하는 최소 변경과 성공 검사 방법을 정한다. 구현 전에 중요한 불확실성을 해소한다.
4. **Implement:** 근거가 있는 규칙에 따라 범위 안에서만 변경한다. 사용자 승인 없이 소스 보존 제약을 해제하지 않는다.
5. **Behavior checks:** 관련 기존 테스트를 실행하고 동작 변경 또는 회귀 위험에 필요한 검증을 추가한다. 현재 package.json:1에는 별도 테스트 명령이 없다. 실패와 근거를 기록하며 위반 샘플은 별도 폐기 픽스처에서만 만든다.
6. **Static checks:** npm run lint 및 npm run typecheck를 실행하고 실제 결과와 불가 항목을 기록한다. 현재 둘 다 node --check src/greet.js 구문 검사이며 의미적 타입 검사가 아니다(package.json:1).
7. **Documentation:** 영향을 받는 규칙 예시와 동작 문서를 갱신한다. 인용과 키워드 색인을 유지하며 실제 없는 위반을 꾸며내지 않는다.
8. **Review gate:** 아래 상태 기계를 실행한다.
9. **Final verification:** 최종 diff, 검사, 잔여 지적을 확인한다. 실행하지 못했거나 실패한 검사를 통과라 하지 않는다. 직접 훅 실행과 실제 런타임 자동 호출을 구분한다.
10. **Delivery:** 변경 내용, 검증 근거, 제한을 보고한다. 사용자 허가 없이는 커밋/게시하지 않는다. 현재 요청에서는 설치 패키지, stage, commit, push, 플러그인 소스/사용자 설정 변경을 하지 않는다.

## Phase 8 상태 기계
1. `.codex/scripts/review-gate.sh --mode=full`을 실행한다. exit 0일 때 리뷰로 진행한다.
2. 메인 세션의 모델과 추론 강도를 상속하는 새 독립 읽기 전용 Codex 리뷰어 둘을 한 번씩 실행한다. 한 명은 규칙 도출/구조, 다른 한 명은 게이트/구현에 집중한다. 두 리뷰어 모두 동일한 전체 산출물 본문, git diff(미추적 파일 본문 포함), project-rules 본문, 탐지 위반을 받는다. 서로의 리뷰는 제공하지 않는다. 읽기/검사만 수행하며 패치를 적용하지 않는다.
3. 각 리뷰 결과는 엄격한 JSON `{"findings":[{"severity":"P0|P1|P2|P3|P4","file":"path","line":1,"issue":"...","suggested_fix":"..."}]}`이다.
4. 메인은 두 결과와 게이트 출력을 종합하고 수정안을 SRP, 주석 명료성, KISS, DRY, YAGNI, 인지 용이성으로 평가한다. 어떤 수정이든 적용하면 Phase 1로 복귀하고 처음부터 재검증한다.
5. 최대 3회 리뷰/회귀 반복 후에도 통과하지 못하면 남은 문제, file:line 근거, 시도한 수정/결과, 구체적인 다음 조치를 보고하고 중단한다.

## 생성 하네스 최종 리뷰 계약
빌드 시 직접 검증 이후에도 새 독립 Codex 리뷰어 둘이 전체 산출물 및 사실 근거를 검사한다.
각 결과 JSON에는 fact_check_misses[{rule,missing_citation}], gate_evasions[{rule,evasion}],
quality_scores{srp,comment_clarity,kiss,dry,yagni,cognitive_ease}(각 0–5),
patches_suggested[{file,change,why}] 및 점수의 evidence를 포함한다.
메인은 사실 근거 누락 0, 게이트 회피 0, 각 리뷰 품질 평균 3.5 이상을 확인한다.
지적 시 원인을 조사하고 수정을 여섯 축으로 평가하며 적용 후 Phase 1로 복귀한다. 최대 3회 제한을 유지한다.
실제 리뷰어 모델과 검사 결과를 보고한다. Codex 리뷰어를 Opus/Sonnet이라 부르지 않는다.

## 훅 및 우회
.codex/hooks.json은 UserPromptSubmit을 .codex/hooks/inject-context.sh에 연결한다.
번들 주입 스크립트는 project-rules와 이 워크플로 본문을 주입한다.
`!` 접두사, `harness 빼고`, `without harness`, `skip harness`, `no harness` 요청은 BYPASS MODE 메모만 주입한다.
우회는 이 하네스 워크플로에만 적용되며 기존 AGENTS.md와 다른 훅/지시를 해제하지 않는다.
자동 주입은 프로젝트 및 정확한 훅 정의의 Codex 신뢰(`/hooks`)와 훅 활성화가 필요하다.
현재 런타임 신뢰는 대기 상태이며 전역 신뢰나 우회 설정을 변경하지 않는다. 직접 스크립트 검증은 자동 호출 증거가 아니다.
재설치 시 기존 .codex/hooks.json의 다른 키와 훅을 보존하여 병합하고 동일 명령을 중복 등록하지 않는다.
기존 AGENTS.md 및 Codex 설정은 보존한다.

```

## ARTIFACT: .agents/skills/project-rules/SKILL.md
```
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

```

## ARTIFACT: .agents/skills/project-rules/references/no-literal-todo.md
```
# no-literal-todo

사용자 요청(request.txt:1)에서 도출했다. src/greet.js:1은 준수 사례이며 발견된 기존 위반은 없다.
검사 대상: src 아래 .js, .mjs, .cjs, .jsx 파일. 바이트 부분문자열 b"TODO"를 대소문자 구분하여 검사한다.
주석/문자열/식별자/긴 단어 안에서도 정확한 리터럴이 존재하면 P2 위반이다. 인코딩 해제 없이 파일 전체를 검사한다.
심볼릭 링크를 따라가며 같은 디렉터리는 한 번만 검사한다. 읽기 오류는 통과가 아닌 환경 오류다.

`.codex/scripts/review-gate.sh --mode=refs-only --rule=no-literal-todo`

종료 코드: 0=통과, 1=규칙 또는 정적 검사 실패, 2=인자/환경/읽기 오류.
`--mode=full`은 추가로 npm run lint 및 npm run typecheck를 실행한다.
전체 소스 검사이므로 --base 또는 Git diff에 의존하지 않는다.
실제 예시는 docs/conventions/no-literal-todo.md를 참조한다.

```

## ARTIFACT: .codex/hooks/inject-context.sh
```
#!/usr/bin/env bash
# Copy to the target project's .claude/hooks/ or .codex/hooks/ directory.
# Resolves generated skills from this file, independent of the invocation cwd.
set -uo pipefail
agent_dir="$(cd "$(dirname "$0")/.." && pwd)" || exit 1
exec python3 - "$agent_dir" 3<&0 <<'PY'
import json
import os
from pathlib import Path
import re
import sys

agent_dir = Path(sys.argv[1])
try:
    payload = json.load(os.fdopen(3))
except (ValueError, OSError):
    sys.exit(0)
prompt = payload.get("prompt", "") if isinstance(payload, dict) else ""
if not isinstance(prompt, str):
    sys.exit(0)

if re.search(r"^\s*!|harness\s*빼고|\b(?:without|skip|no)\s+harness\b", prompt, re.I):
    context = "BYPASS MODE: skip the harness workflow for this request only."
else:
    skills = agent_dir.parent / ".agents" / "skills" if agent_dir.name == ".codex" else agent_dir / "skills"
    bodies = []
    for name in ("project-rules", "harness-engineering"):
        source = skills / name / "SKILL.md"
        try:
            body = source.read_text(encoding="utf-8")
        except OSError:
            bodies.append(f"HARNESS SETUP INCOMPLETE: missing {source}. Repair before claiming the harness is active.")
            continue
        body = re.sub(r"\A---\r?\n.*?\r?\n---(?:\r?\n|\Z)", "", body, count=1, flags=re.S)
        bodies.append(body.strip())
    context = "\n\n".join(bodies)
print(json.dumps({"hookSpecificOutput": {"hookEventName": "UserPromptSubmit", "additionalContext": context}}, ensure_ascii=False))
PY

```

## ARTIFACT: .codex/hooks.json
```
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$(git rev-parse --show-toplevel)/.codex/hooks/inject-context.sh\""
          }
        ]
      }
    ]
  }
}

```

## ARTIFACT: .codex/scripts/review-gate.sh
```
#!/usr/bin/env bash
# Generated for compat-fixture; one user-requested rule: no-literal-todo.
# Scan all src JavaScript files, including files absent from Git diffs.
# Exit 0: pass; 1: violation/check failure; 2: invalid input/environment.
set -euo pipefail
command -v python3 >/dev/null 2>&1 || { echo 'ERROR: python3 required' >&2; exit 2; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)" || exit 2
exec python3 - "$ROOT" "$@" <<'PYTHON'
import os
from pathlib import Path
import shutil
import subprocess
import sys

root = Path(sys.argv[1])
mode = "full"
for arg in sys.argv[2:]:
    if arg in ("--mode=full", "--mode=refs-only"):
        mode = arg.split("=", 1)[1]
    elif arg == "--rule=no-literal-todo":
        pass
    elif arg in ("-h", "--help"):
        print("review-gate.sh [--mode=full|refs-only] [--rule=no-literal-todo]")
        sys.exit(0)
    else:
        print(f"ERROR: invalid argument: {arg}", file=sys.stderr)
        sys.exit(2)

def walk_error(error):
    raise error

failed = False
try:
    source = root / "src"
    if not source.is_dir():
        raise OSError(f"missing source directory: {source}")
    print("=== Rule: no-literal-todo (all src JavaScript) ===", flush=True)
    visited = set()
    count = 0
    for directory, dirs, files in os.walk(source, followlinks=True, onerror=walk_error):
        stat = os.stat(directory)
        identity = (stat.st_dev, stat.st_ino)
        if identity in visited:
            dirs[:] = []
            continue
        visited.add(identity)
        dirs.sort()
        for name in sorted(files):
            path = Path(directory) / name
            if path.suffix not in {".js", ".mjs", ".cjs", ".jsx"}:
                continue
            content = path.read_bytes()
            count += 1
            if b"TODO" in content:
                failed = True
                for number, line in enumerate(content.split(b"\n"), 1):
                    if b"TODO" in line:
                        print(f"FAIL P2 no-literal-todo: {path.relative_to(root)}:{number}")
    print(f"Scanned {count} JavaScript file(s)", flush=True)
    if mode == "full":
        if not (root / "package.json").is_file() or shutil.which("npm") is None:
            raise OSError("full mode requires package.json and npm")
        for check in ("lint", "typecheck"):
            print(f"=== npm run {check} ===", flush=True)
            result = subprocess.run(["npm", "run", check], cwd=root, check=False)
            print(f"{check}: {'PASS' if result.returncode == 0 else 'FAIL'} (exit {result.returncode})", flush=True)
            failed = failed or result.returncode != 0
except OSError as error:
    print(f"ERROR: {error}", file=sys.stderr)
    sys.exit(2)
print("Result: FAIL" if failed else "Result: OK")
sys.exit(1 if failed else 0)
PYTHON

```

## ARTIFACT: docs/conventions/no-literal-todo.md
```
# src JavaScript 파일의 리터럴 TODO 금지

## Index keywords
TODO, src, JavaScript, greet, name, Hello, no-literal-todo, refs-only

## Worse case
현재 저장소에서 발견한 실제 위반은 없다. src/greet.js:1에 없는 위반을 기존 코드처럼 만들거나 인용하지 않는다.
리터럴 TODO가 src JavaScript 파일에 존재하면 사용자 요청(request.txt:1)에 위배된다.
의도적인 위반 샘플은 별도 폐기 가능한 검증 픽스처에만 생성하며 원본에는 넣지 않는다.

## Better case — 실제 저장소 인용
src/greet.js:1:
```js
export function greet(name) { return `Hello, ${name}`; }
```
원문에 금지 리터럴이 없으므로 준수한다. 코드 변경을 제안하지 않는다.

## Gate hook
- `.codex/scripts/review-gate.sh --mode=refs-only --rule=no-literal-todo`
- 실제 검사: src 아래 .js/.mjs/.cjs/.jsx 파일마다 `b"TODO" in path.read_bytes()`.
- 주석 및 문자열 포함, 대소문자 구분, 전체 소스 검사. 심볼릭 링크 포함.
- 발견 시 P2, exit 1. 환경/읽기 오류는 exit 2.
- full 모드: `npm run lint`, `npm run typecheck` 추가 실행. package.json:1에서 둘 다 구문 검사임을 확인했다.

```

## git diff (미추적 원문은 위에 포함)
```

```
## git status
```
?? AGENTS.md
?? docs/
?? package.json
?? request.txt
?? src/

```
