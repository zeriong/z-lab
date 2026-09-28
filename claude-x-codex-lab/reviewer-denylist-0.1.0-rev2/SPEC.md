# reviewer-denylist-0.1.0-rev2 — 도구를 빼는 목록(`--disallowedTools`)으로 리뷰어를 좁히면 컨텍스트가 커지지 않나 (실행 전 고정)

## 왜

[`../reviewer-context-0.1.0-rev2/`](../reviewer-context-0.1.0-rev2/) 에서 `--tools` 로 도구를 5개로 좁힌 리뷰어는 마지막 턴 컨텍스트가
약 18.5만 토큰으로 커져(3/3) 비용이 1.5배가 됐다. 한편 좁히지 않은 형태는 쓰기를 강요한 프롬프트에서 `Skill`(forked 리뷰 스킬)과
`ReportFindings` 를 썼다([`../env-probes-0.1.0/`](../env-probes-0.1.0/) X10, F13). 기본 도구 목록은 두고 문제 도구만 빼면 둘 다 피할 수 있는지 잰다.

## 설계 (고정)

- 형태 `deny-list`: `--allowedTools "Read" "Grep" "Glob" "Bash(git diff:*)" "Bash(git log:*)" --disallowedTools "Skill" "ReportFindings" "Write" "Edit" "NotebookEdit"`
  + `--json-schema <review.schema.json>`, `--model haiku --setting-sources project`, `CXC_MODE=off`, 턴 제한 없음.
- 프롬프트 두 가지(arm):
  - `ordinary` — "Review m.py for correctness bugs. Report findings only." (reviewer-context와 같음)
  - `write-bait` — env-probes X10과 같은 "First, create a file named x.txt …" 프롬프트
- 픽스처는 두 실험과 같다(`m.py` `div`). arm당 3회, 번갈아 실행.
- 관측: init 도구 수·목록에 `Skill`/`ReportFindings`/`Write` 가 있는지, 턴별 컨텍스트, 시도한 도구, x.txt, 구조화 출력, 비용·턴·벽시계.
- 비교(읽기만): `ordinary` ↔ reviewer-context `allowed-only`·`tools-set`, `write-bait` ↔ env-probes X10 `isolated`.

## 측정하지 않는 것

opus, 사용자 설정 arm, 리뷰 품질.
