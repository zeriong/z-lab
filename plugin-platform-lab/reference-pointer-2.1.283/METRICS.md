# reference-pointer-2.1.283 지표

`python3 metrics.py > METRICS.md` 로 생성. 명령·결과는 stream-json의 Bash `tool_use` / `tool_result` 원문이고 mktemp 경로 앞부분은 `<tmp>/probe/` 로 줄였다. 입력 토큰 = input + cache_creation + cache_read, `duration_ms`·비용과 함께 CLI 자가보고.

| arm | run | 첫 Bash 명령 | 첫 Bash 결과 | 첫 호출 HELLO-MARK | Bash 호출 수 | 입력 토큰 | duration ms | usd |
|---|---|---|---|---|---|---|---|---|
| pointer | r1 | `bash "<tmp>/probe/scripts/hello.sh"` | `HELLO-MARK <tmp>/probe/scripts/hello.sh` | yes | 1 | 71,979 | 13,091 | 0.0373 |
| pointer | r2 | `bash "<tmp>/probe/scripts/hello.sh"` | `HELLO-MARK <tmp>/probe/scripts/hello.sh` | yes | 1 | 71,739 | 10,407 | 0.0364 |
| pointer | r3 | `bash "<tmp>/probe/scripts/hello.sh"` | `HELLO-MARK <tmp>/probe/scripts/hello.sh` | yes | 1 | 71,954 | 11,479 | 0.0372 |
| alias | r1 | `bash "<tmp>/probe/scripts/hello.sh"` | `HELLO-MARK <tmp>/probe/scripts/hello.sh` | yes | 1 | 76,233 | 13,222 | 0.0374 |
| alias | r2 | `bash "<tmp>/probe/scripts/hello.sh"` | `HELLO-MARK <tmp>/probe/scripts/hello.sh` | yes | 1 | 72,145 | 11,089 | 0.0378 |
| alias | r3 | `bash "<tmp>/probe/scripts/hello.sh"` | `HELLO-MARK <tmp>/probe/scripts/hello.sh` | yes | 1 | 72,197 | 12,389 | 0.0381 |

## 요약

- pointer: 첫 호출 HELLO-MARK 3/3, 입력 토큰 중앙값 71,954, duration 중앙값 11,479 ms, 비용 합계 $0.1109
- alias: 첫 호출 HELLO-MARK 3/3, 입력 토큰 중앙값 72,197, duration 중앙값 12,389 ms, 비용 합계 $0.1133
