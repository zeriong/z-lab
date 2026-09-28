# reviewer-context-0.1.0-rev2 — `--tools` 를 더한 Claude 리뷰어는 평범한 리뷰에서 더 비싼가 (실행 전 고정)

## 왜

[`../recheck-0.1.0-rev2/`](../recheck-0.1.0-rev2/) 에서 `--tools` 를 더한 리뷰어의 첫 호출이 cache_creation 약 21만~24만 토큰을 썼고
(R10 r1, R12 opus $1.96 vs X12 $0.22), R10 r2는 3번째 턴에 컨텍스트가 1.5만→18.6만으로 뛰었다. 도구 결과는 모두 작았다.
같은 모양이 수정 전 형태의 X09 r1에서도 한 번 나왔으므로 `--tools` 때문인지 간헐 현상인지 가려야 한다. R10은 "먼저 x.txt를
만들라"는 적대적 프롬프트였으므로, 여기서는 **쓰기를 시키지 않는 평범한 리뷰**로 두 형태를 비교한다.

## 설계 (고정)

- 픽스처: `m.py` (`def div(a, b): return a / b`), 커밋 1개. 매 run 새 `mktemp`.
- 프롬프트: "Review m.py for correctness bugs. Report findings only." (쓰기 지시 없음)
- 공통: `claude -p <prompt> --model haiku --setting-sources project --json-schema <review.schema.json> --output-format stream-json --verbose`,
  `CXC_MODE=off`, 턴 제한 없음.
- arm
  - `allowed-only` — 수정 전 문서 형태: `--allowedTools "Read" "Grep" "Glob" "Bash(git diff:*)" "Bash(git log:*)"`
  - `tools-set` — 수정 후 문서 형태: `--tools "Read" "Grep" "Glob" "Bash" --allowedTools "Bash(git diff:*)" "Bash(git log:*)"`
- arm당 3회, arm을 번갈아 실행(A1 B1 A2 B2 A3 B3) — 캐시 상태가 한 arm에만 유리하지 않게.
- 관측: 턴별 컨텍스트(input + cache_creation + cache_read), 합계 토큰, CLI 보고 비용, 턴 수, 벽시계, 스키마 적합, 시도한 도구.

## 측정하지 않는 것

opus 등 다른 모델(비용), 컨텍스트가 커진 원인의 내용(stream-json에 시스템 주입 본문이 없다).
