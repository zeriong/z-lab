# hook-injection-2.1.283 지표

`python3 metrics.py > METRICS.md` 로 생성. 입력 토큰 = input + cache_creation + cache_read (CLI 자가보고).

| arm | run | 훅 출력 bytes | 입력 토큰 | usd | wall ms |
|---|---|---|---|---|---|
| declared | r1 | 1425 | 6,881 | 0.013957 | 2486 |
| declared | r2 | 1425 | 6,881 | 0.014017 | 2740 |
| declared | r3 | 1425 | 6,881 | 0.013957 | 2661 |
| undeclared | r1 | 1425 | 6,881 | 0.014422 | 3676 |
| undeclared | r2 | 1425 | 6,881 | 0.013952 | 2585 |
| undeclared | r3 | 1425 | 6,878 | 0.013961 | 2423 |
| none | r1 | — | 6,520 | 0.013235 | 2555 |
| none | r2 | — | 6,514 | 0.013228 | 2644 |
| none | r3 | — | 6,517 | 0.013238999999999999 | 2482 |

- declared: 중앙값 6,881 (범위 6,881–6,881), none 대비 Δ 364
- undeclared: 중앙값 6,881 (범위 6,878–6,881), none 대비 Δ 364
- none: 중앙값 6,517 (범위 6,514–6,520), none 대비 Δ 0
