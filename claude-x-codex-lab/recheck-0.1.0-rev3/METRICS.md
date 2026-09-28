# recheck-0.1.0-rev3 지표

`python3 metrics.py > METRICS.md` 로 생성. 비교 행은 형제 실험을 읽기만 한다. 토큰·비용·턴은 CLI 자가보고, wall 은 러너 측정 ms.

## C12 Claude 리뷰어(opus) — 같은 스모크 phase

| 형태 | 구조화 출력 | verdict | cache_creation | cache_read | turns | usd | wall |
|---|---|---|---|---|---|---|---|
| X12 수정 전 (`--allowedTools` 만) | yes | pass | 26,766 | 18,183 | 3 | 0.2222 | 12912 |
| R12 `--tools` 화이트리스트 | yes | pass | 243,611 | 5,918 | 3 | 1.9562 | 17153 |
| C12 최종 (`--disallowedTools` 거부 목록) | yes | pass | 28,922 | 20,241 | 3 | 0.2398 | 18586 |

C12의 phase diff는 R12와 같다 (`phase-matches-R12.txt`).

## S01

- `passed=57 failed=0`
