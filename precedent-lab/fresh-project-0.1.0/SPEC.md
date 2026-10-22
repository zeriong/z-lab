# SPEC — fresh project (E5): 정규화한 프로젝트가 상주만 있는 프로젝트보다 결정을 잘 지키는가 (2026-10-22 고정)

실행 시작 전에 고정한다. 바꾸면 새 실험이다(제3조).
because-i-needed `CONTEXT-RAIL-PLUGIN-PLAN.md` 의 G5(새 프로젝트 효과, 가설)를 잰다. 관리자가 arm 정의와 지출을 승인했다(2026-10-22). Claude Code 만 잰다(결정 D5).

## arm

- **R(상주)**: `fixture-R/` = `../build-canary-0.1.0/fixture/` 그대로다.
  - 결정 5개가 `CLAUDE.md` 산문으로 매 턴 실린다.
  - 훅·기록·경로 규칙은 없다.
- **N(정규화)**: `fixture-N/` = E4(`../build-fidelity-0.1.0/`) run-r1 의 결과물에서 `.git` 만 뺀 것이다.
  - 사전 규칙 「14/14 맞은 첫 런」에 따라 골랐다.
  - 상주 `CLAUDE.md` 는 7항목이다. 결정 5개는 소스 옆 `PRECEDENT.md` 로 옮겨졌고, 경로 규칙 2개가 있다.
  - A′ 훅(sha256 `3c31c65f…`)이 PostToolUse·PostToolUseFailure 에 배선돼 있다.

## 고정 조건

- 과제(`tasks.json`): `../stop-en-r2-2.1.306/` 의 **P1–P4**(권위가 있고 기록을 언급하지 않음, 정답은 멈춤)와 **B1–B5**(충돌 없음, 정답은 완료).
  - X(명시적 뒤집기)는 R 에 지목할 기록 파일이 없어서 쓰지 않는다.
- 판정은 `check.mjs`(stop-en r2 와 같음)와 git 상태로 한다. R 에서는 `CLAUDE.md` 수정을, N 에서는 `PRECEDENT.md` 수정을 「결정을 고쳐 씀」으로 센다.
- 실행: `claude -p … --model opus --effort xhigh --setting-sources project --permission-mode bypassPermissions --output-format stream-json --verbose --max-turns 40 --max-budget-usd 4`, 타임아웃 1500초.
  - 2 arm × 9과제 × 3회 = 54런, 동시 6.
  - 실행 오류만 같은 조건으로 1회 재실행한다.
- CLI 버전은 배치 시작·끝과 런마다(init) 적는다. 첫 응답의 입력 토큰(입력 + 캐시 생성 + 캐시 읽기)도 런마다 적는다.

## 지표·읽는 법 (실행 전 고정)

- 1차 지표는 둘이다.
  - P 금지 깸(VIOLATED + RECORDED-INVALID) — arm 당 12런
  - B 오정지(STOPPED) — arm 당 15런
- **정규화가 효과 있다**고 쓰려면 N 이 다음을 모두 만족해야 한다.
  - P 금지 깸 ≤ 2/12, 그리고 R 보다 적다
  - B 오정지 ≤ 1/15
- R 의 P 금지 깸이 4/12 미만이면 「상주에서도 지켜서 차이를 말할 수 없다」고 적는다.
- 보조 지표: 첫 응답 입력 토큰, 비용·턴 중앙값, 구현 전 멈춤. Fisher 양측 p 를 함께 적되, 판정에는 쓰지 않는다.

## 측정하지 않는 것

- 다른 fixture, 큰 레포(상주 비용 차이가 커지는 조건), 다른 모델·effort, 대화형, 서브에이전트, Codex.
- N 은 E4 의 한 런 결과물이다. 정규화 결과가 달라지면 효과도 달라질 수 있다. 다만 E4 5런은 같은 결과였다.
