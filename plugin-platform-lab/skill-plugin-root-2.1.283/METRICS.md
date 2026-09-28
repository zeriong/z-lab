# skill-plugin-root-2.1.283 지표

`python3 metrics.py > METRICS.md` 로 생성. 명령·결과는 stream-json의 Bash `tool_use` / `tool_result` 원문이고, mktemp 경로 앞부분만 `<tmp>/probe/` 로 줄였다. 입력 토큰 = input + cache_creation + cache_read, `duration_ms`·비용과 함께 CLI 자가보고.

| run | 명령 1 (중괄호 `${CLAUDE_PLUGIN_ROOT}`) | 텍스트 치환 | 결과 1 | 명령 2 (중괄호 없는 `$CLAUDE_PLUGIN_ROOT`) | 결과 2 | 입력 토큰 | duration ms | usd |
|---|---|---|---|---|---|---|---|---|
| r1 | `bash "<tmp>/probe/scripts/hello.sh"` | yes | `HELLO-MARK <tmp>/probe/scripts/hello.sh` | `echo "CPR=[$CLAUDE_PLUGIN_ROOT]"` | `CPR=[]` | 75,976 | 12,150 | 0.0365 |
| r2 | `bash "<tmp>/probe/scripts/hello.sh"` | yes | `HELLO-MARK <tmp>/probe/scripts/hello.sh` | `echo "CPR=[$CLAUDE_PLUGIN_ROOT]"` | `CPR=[]` | 75,938 | 10,259 | 0.0358 |
| r3 | `bash "<tmp>/probe/scripts/hello.sh"` | yes | `HELLO-MARK <tmp>/probe/scripts/hello.sh` | `echo "CPR=[$CLAUDE_PLUGIN_ROOT]"` | `CPR=[]` | 75,930 | 11,323 | 0.0361 |
