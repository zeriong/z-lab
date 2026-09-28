# 모델 호출 사용량 (2026-09-28 실험 전체)

`python3 analyze/usage.py > analyze/USAGE.md` (claude-x-codex-lab/ 에서) 로 생성. 전부 CLI 자가보고. Codex in 은 캐시 입력을 포함한다.
인증 없이 돌린 Codex 호출(임시 `CODEX_HOME`, 401)은 계정 사용이 아니므로 따로 센다.

| 실험 | Codex 호출(인증) | Codex in | 그중 cached | Codex out | Codex 인증 없음 | Claude 호출 | Claude usd |
|---|---|---|---|---|---|---|---|
| claude-x-codex-lab/effort-flags-0.1.0 | 0 | 0 | 0 | 0 | 3 | 3 | 0.05 |
| claude-x-codex-lab/env-probes-0.1.0 | 30 | 748,892 | 559,616 | 6,059 | 1 | 32 | 1.88 |
| claude-x-codex-lab/recheck-0.1.0-rev2 | 2 | 74,486 | 50,432 | 663 | 0 | 7 | 3.34 |
| claude-x-codex-lab/recheck-0.1.0-rev3 | 0 | 0 | 0 | 0 | 0 | 1 | 0.24 |
| claude-x-codex-lab/reviewer-context-0.1.0-rev2 | 0 | 0 | 0 | 0 | 0 | 6 | 0.32 |
| claude-x-codex-lab/reviewer-denylist-0.1.0-rev2 | 0 | 0 | 0 | 0 | 0 | 6 | 0.26 |
| plugin-platform-lab/claude-code-2.1.283 | 0 | 0 | 0 | 0 | 0 | 10 | 0.64 |
| plugin-platform-lab/hook-injection-2.1.283 | 0 | 0 | 0 | 0 | 0 | 9 | 0.12 |
| **합계** | 32 | 823,378 | 610,048 | 6,722 | 4 | 74 | 6.85 |

이 표는 z-lab의 runs/에 남은 호출만 센다. 초안 작성 세션에서 scratchpad에서 돌린 확인 호출(Codex 5회 등)은 포함하지 않는다.
