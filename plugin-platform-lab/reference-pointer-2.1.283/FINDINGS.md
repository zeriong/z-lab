# reference-pointer-2.1.283 발견

지표: [`METRICS.md`](METRICS.md)(생성물) · 원본: `runs/<arm>/r<k>/`. 실행 2026-09-28, 6 단위 전부 DONE(1-shot, 재개분 없음), 두 arm 번갈아 실행.
선행: [`../skill-plugin-root-2.1.283/`](../skill-plugin-root-2.1.283/)(V01–V02), [`../reference-plugin-root-2.1.283/`](../reference-plugin-root-2.1.283/)(V03–V04).

## 측정한 것

| ID | 관측 | n | 근거 |
|---|---|---|---|
| V05 | **arm `pointer`** — reference가 "SKILL.md의 'Check' 절의 명령을 실행하라"고만 하고 명령은 SKILL.md에 중괄호로 있을 때, 첫 Bash 호출이 절대 경로로 나가 스크립트가 실행됐다(`HELLO-MARK`, Bash 1회) | 3/3 | METRICS pointer 행 |
| V06 | **arm `alias`** — SKILL.md가 `<plugin>` 을 `${CLAUDE_PLUGIN_ROOT}` 로 정의하고 reference가 `bash "<plugin>/scripts/hello.sh"` 를 쓸 때도, 첫 Bash 호출이 절대 경로로 나가 스크립트가 실행됐다(Bash 1회) | 3/3 | METRICS alias 행 |
| V07 | 두 arm의 비용 차이는 작다: 입력 토큰 중앙값 71,954 대 72,197, 비용 합계 $0.1109 대 $0.1133. 실패한 V03(중앙값 157,463토큰, Bash 3–4회)보다 입력 토큰이 절반 아래다 — 실패한 뒤의 복구 시도가 비용을 키운다(다른 실험과의 비교라 방향만 읽는다) | 3+3 | METRICS 요약, V03 METRICS |

## 해석

- V01–V06을 합치면 because-i-needed의 규칙(루트 `CLAUDE.md` Rule 1)은 이렇게 정리된다: 스크립트 명령의 경로는 **SKILL.md 텍스트**에서만
  풀린다. reference는 SKILL.md의 명령을 가리키거나(plan-smith 1.6.0 `split.md`), SKILL.md가 정의한 이름을 쓰면(claude-x-codex `run` 의 `<plugin>`)
  동작한다. reference에 변수를 직접 적으면 깨진다(V03).
- 두 방식 모두 모델이 SKILL.md에서 본 절대 경로를 옮겨 적는 데 기댄다. 그래서 이 실험은 SKILL.md가 방금 로드된 짧은 세션만 쟀다.

## 측정하지 않은 것

SPEC의 목록 그대로: 대화형 세션, haiku 외 모델, 실제 plan-smith·claude-x-codex 스킬 본문(최소 스킬로 그 문장만 옮겨 쟀다), 긴 세션에서
SKILL.md가 컨텍스트에서 멀어진 뒤의 동작.
