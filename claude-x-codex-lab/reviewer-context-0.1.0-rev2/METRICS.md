# reviewer-context-0.1.0-rev2 지표

`python3 metrics.py > METRICS.md` 로 생성. 토큰·비용·턴은 CLI 자가보고, wall은 러너 측정 ms. 턴별 컨텍스트 = input + cache_creation + cache_read.

| arm | run | init 도구 수 | 시도한 도구 | 턴별 컨텍스트 | cache_creation | cache_read | turns | usd | 구조화 출력 | wall |
|---|---|---|---|---|---|---|---|---|---|---|
| allowed-only | r1 | 33 | Read,ReportFindings | 22,683 → 23,991 → 29,315 → 29,477 | 13,906 | 91,524 | 5 | 0.0416 | yes | 13,262 |
| allowed-only | r2 | 33 | Read,ReportFindings | 22,685 → 28,520 → 28,986 → 29,161 | 13,590 | 95,726 | 5 | 0.0420 | yes | 17,740 |
| allowed-only | r3 | 33 | Read,ReportFindings | 22,682 → 23,975 → 29,403 → 29,555 | 13,984 | 91,595 | 5 | 0.0425 | yes | 14,367 |
| tools-set | r1 | 5 | Glob,Read | 12,617 → 12,759 → 15,238 → 185,830 | 17,466 | 208,944 | 5 | 0.0620 | yes | 14,030 |
| tools-set | r2 | 5 | Read | 12,616 → 15,111 → 185,520 | 16,884 | 196,337 | 4 | 0.0577 | yes | 13,201 |
| tools-set | r3 | 5 | Glob,Read | 12,613 → 15,060 → 185,140 → 185,489 | 16,797 | 381,469 | 5 | 0.0761 | yes | 14,326 |

- allowed-only: usd 중앙값 0.0420 (범위 0.0416–0.0425), 최대 턴 컨텍스트 중앙값 29,477, turns 중앙값 5, wall 중앙값 14,367
- tools-set: usd 중앙값 0.0620 (범위 0.0577–0.0761), 최대 턴 컨텍스트 중앙값 185,520, turns 중앙값 5, wall 중앙값 14,030
