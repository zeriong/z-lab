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
