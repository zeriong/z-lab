# METRICS — platform-unit-2.1.306

원지표는 `runs-public/<case>/summary.json` 의 `emitted`(훅 출력 글자·바이트)·`rendered`(transcript 렌더 글자·바이트·persisted 여부)·`cost_usd`.

| 케이스 | 출력 글자 | 출력 바이트 | 렌더 글자 | 렌더 바이트 | persisted | 비용 USD | 초 |
|---|---:|---:|---:|---:|---|---:|---:|
| uK1 | 4,000 | 11,952 | 4,079 | 12,031 | False | 0.0599 | 6.5 |
| uK2 | 9,990 | 29,922 | 10,069 | 30,001 | False | 0.0841 | 7.2 |
| uK3 | 4,000 | 11,952 | 4,079 | 12,031 | False | 0.0408 | 6.8 |

- 합계 비용(자가보고): $0.1848
