# reference-plugin-root-2.1.283 지표

`python3 metrics.py > METRICS.md` 로 생성. stream-json의 `tool_use` / `tool_result` 원문에서 셌고, mktemp 경로 앞부분은 `<tmp>/probe/` 로 줄였다. 입력 토큰 = input + cache_creation + cache_read, `duration_ms`·턴·비용과 함께 CLI 자가보고.

| run | Read 결과에 리터럴 변수 | 첫 Bash 명령 | 첫 Bash 결과 | HELLO-MARK 도달 | Bash 호출 수 | turns | 입력 토큰 | duration ms | usd |
|---|---|---|---|---|---|---|---|---|---|
| r1 | yes | `bash "${CLAUDE_PLUGIN_ROOT}/scripts/hello.sh"` | `Exit code 127 bash: /scripts/hello.sh: No such file or directory` | no | 4 | 7 | 157,463 | 22,334 | 0.0508 |
| r2 | yes | `bash "${CLAUDE_PLUGIN_ROOT}/scripts/hello.sh"` | `Exit code 127 bash: /scripts/hello.sh: No such file or directory` | no | 3 | 6 | 160,792 | 22,977 | 0.0513 |
| r3 | yes | `bash "${CLAUDE_PLUGIN_ROOT}/scripts/hello.sh"` | `Exit code 127 bash: /scripts/hello.sh: No such file or directory` | no | 3 | 6 | 157,437 | 19,965 | 0.0513 |
