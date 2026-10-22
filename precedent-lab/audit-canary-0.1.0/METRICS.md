# METRICS — audit canary (생성: make_metrics.py)

`named` 는 사전 등록한 자동 문자열 지표다. 정상본에서는 부정문에 걸려 참이 되기도 했다(FINDINGS U3). 거짓 결함 판정은 사람이 읽은 값이다.

| 런 | CLI | 변경 파일 | 검사 실행 | named(자동) | 턴 | 초 | 비용 USD |
|---|---|---:|---:|---|---:|---:|---:|
| broken-r1 | 2.1.308 | 0 | 6/6 | {'orphan_heading': True, 'block_without_decision': True, 'hook_differs': True} | 6 | 45.4 | 0.392 |
| broken-r2 | 2.1.308 | 0 | 6/6 | {'orphan_heading': True, 'block_without_decision': True, 'hook_differs': True} | 6 | 44.1 | 0.380 |
| ok-r1 | 2.1.308 | 0 | 6/6 | {'orphan_heading': False, 'block_without_decision': True, 'hook_differs': True} | 6 | 38.2 | 0.347 |
| ok-r2 | 2.1.308 | 0 | 6/6 | {'orphan_heading': False, 'block_without_decision': True, 'hook_differs': False} | 4 | 21.5 | 0.287 |

- 합계 비용(자가보고): $1.41
