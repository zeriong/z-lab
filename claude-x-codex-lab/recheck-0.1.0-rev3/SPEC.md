# recheck-0.1.0-rev3 — 최종 Claude 리뷰어 형태(거부 목록)의 끝까지 확인 (실행 전 고정)

## 왜

[`../reviewer-context-0.1.0-rev2/`](../reviewer-context-0.1.0-rev2/) 와 [`../reviewer-denylist-0.1.0-rev2/`](../reviewer-denylist-0.1.0-rev2/) 의 결과로
문서의 Claude 리뷰어 형태를 `--tools` 화이트리스트에서 `--disallowedTools` 거부 목록으로 바꿨다. 그 최종 형태를 문서 기본 모델(opus)로 한 번 돌린다.

## 테스트 대상 (고정)

`subject/` (`SUBJECT.sha256`). rev2 대비 바뀐 파일: `references/transport-standalone.md` 하나.

## 프로브 (고정)

| ID | 질문 | 방법 | n | 관측 | 비교 |
|---|---|---|---|---|---|
| C12 | 최종 형태의 Claude 리뷰어(opus)가 스모크 phase를 스키마 적합으로 리뷰하나, 비용·컨텍스트는 | [`../recheck-0.1.0-rev2/runs/R12`](../recheck-0.1.0-rev2/runs/R12/) 의 `phase.diff` 를 적용해 같은 픽스처를 복원하고, 같은 리뷰 프롬프트로 **리뷰어만** 실행 | 1 | exit, 스키마, verdict, cache_creation/read, usd, turns, wall | X12 opus($0.22), R12 opus($1.96) |
| S01 | 스크립트 결정적 테스트 57개 | `suite/cxc-tests.sh` → subject | 1 | pass/fail | rev2 S01 |

**Codex는 부르지 않는다** — 사용자 확인 전(2026-09-28)이라 Codex 워커·리뷰어 단계는 rev2 R12의 결과를 그대로 입력으로 쓴다.

## 측정하지 않는 것

Codex 단계의 재실행, 반복(n=1), 리뷰 품질.
