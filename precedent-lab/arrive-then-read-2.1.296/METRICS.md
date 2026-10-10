# METRICS — arrive-then-read (PRECEDENT.md 도착 훅) 실측

생성: make-metrics.py ← results.csv (analyze.py 가 runs/*.jsonl 의 `result` 이벤트와 tool_use, diffs/*.diff, 훅 마커 디렉터리에서 뽑음).
토큰은 Claude Code `result.usage` 자가보고값이다(제4조). `input` 은 캐시 열을 제외한 입력, `cache_read`·`cache_create` 는 프롬프트 캐시 읽기·생성. 턴당 입력 = (input + cache_read + cache_create) ÷ num_turns.

## 런별 원지표

| run | model | turns | 소요 s | cost USD | input | cache_read | cache_create | output | 훅 발화(마커) | 관할 PRECEDENT 읽음 | diff 줄 | 1차 판정 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---|
| A-T1-r1 | claude-opus-5-5 | 4 | 30 | 0.313 | 8 | 119702 | 31003 | 2050 | 0 | True | 0 | DECLINED |
| A-T1-r2 | claude-opus-5-5 | 5 | 27 | 0.219 | 10 | 174361 | 18317 | 1889 | 0 | True | 0 | DECLINED |
| A-T2-r0 | claude-opus-5-5 | 4 | 33 | 0.403 | 8 | 131786 | 40817 | 2480 | 2 | True | 0 | DECLINED |
| A-T2-r1 | claude-opus-5-5 | 4 | 31 | 0.283 | 8 | 146970 | 25612 | 2455 | 2 | True | 0 | DECLINED |
| A-T2-r2 | claude-opus-5-5 | 4 | 24 | 0.251 | 6 | 102253 | 24450 | 1736 | 2 | True | 0 | DECLINED |
| A-T3-r1 | claude-opus-5-5 | 4 | 21 | 0.379 | 8 | 139661 | 40083 | 1521 | 0 | True | 0 | DECLINED |
| A-T3-r2 | claude-opus-5-5 | 4 | 23 | 0.272 | 8 | 146638 | 25880 | 1774 | 0 | True | 0 | DECLINED |
| A-T4-r1 | claude-opus-5-5 | 4 | 29 | 0.315 | 8 | 119622 | 30835 | 2210 | 0 | True | 0 | DECLINED |
| A-T4-r2 | claude-opus-5-5 | 4 | 25 | 0.194 | 8 | 132091 | 15859 | 2030 | 0 | True | 0 | DECLINED |
| A-T5-r1 | claude-opus-5-5 | 7 | 41 | 0.339 | 12 | 191718 | 29827 | 3103 | 3 | True | 44 | RECORDED? |
| A-T5-r2 | claude-opus-5-5 | 5 | 33 | 0.247 | 8 | 138344 | 20360 | 2815 | 3 | True | 35 | RECORDED? |
| B-T1-r1 | claude-opus-5-5 | 6 | 33 | 0.353 | 12 | 214773 | 33448 | 2098 | 0 | True | 0 | DECLINED |
| B-T1-r2 | claude-opus-5-5 | 5 | 26 | 0.231 | 10 | 170247 | 19406 | 2106 | 0 | True | 0 | DECLINED |
| B-T2-r1 | claude-opus-5-5 | 4 | 25 | 0.287 | 8 | 112457 | 28074 | 2006 | 0 | True | 0 | DECLINED |
| B-T2-r2 | claude-opus-5-5 | 3 | 19 | 0.142 | 6 | 89193 | 12049 | 1410 | 0 | True | 0 | DECLINED |
| B-T3-r1 | claude-opus-5-5 | 4 | 29 | 0.384 | 8 | 138748 | 39235 | 2139 | 0 | True | 0 | DECLINED |
| B-T3-r2 | claude-opus-5-5 | 4 | 32 | 0.277 | 8 | 152216 | 25093 | 2265 | 0 | True | 0 | DECLINED |
| B-T4-r1 | claude-opus-5-5 | 4 | 27 | 0.289 | 8 | 115125 | 28155 | 2017 | 0 | True | 0 | DECLINED |
| B-T4-r2 | claude-opus-5-5 | 5 | 29 | 0.25 | 10 | 177537 | 21576 | 2103 | 0 | True | 0 | DECLINED |
| B-T5-r1 | claude-opus-5-5 | 7 | 38 | 0.337 | 14 | 229640 | 29387 | 2782 | 0 | True | 29 | RECORDED? |
| B-T5-r2 | claude-opus-5-5 | 7 | 38 | 0.281 | 14 | 267191 | 21048 | 2939 | 0 | True | 34 | RECORDED? |
| C-T1-r1 | claude-opus-5-5 | 2 | 18 | 0.41 | 4 | 63554 | 46375 | 1319 | 0 | False | 0 | DECLINED |
| C-T1-r2 | claude-opus-5-5 | 2 | 14 | 0.105 | 4 | 101958 | 7530 | 1207 | 0 | True | 0 | DECLINED |
| C-T2-r1 | claude-opus-5-5 | 2 | 24 | 0.319 | 4 | 50503 | 33974 | 1855 | 0 | False | 0 | DECLINED |
| C-T2-r2 | claude-opus-5-5 | 2 | 26 | 0.129 | 4 | 75856 | 9292 | 1993 | 0 | True | 0 | DECLINED |
| C-T3-r1 | claude-opus-5-5 | 2 | 19 | 0.312 | 4 | 50518 | 33576 | 1649 | 0 | True | 0 | DECLINED |
| C-T3-r2 | claude-opus-5-5 | 2 | 24 | 0.128 | 4 | 75886 | 8662 | 2180 | 0 | True | 0 | DECLINED |
| C-T4-r1 | claude-opus-5-5 | 2 | 18 | 0.651 | 4 | 92255 | 75149 | 1558 | 0 | False | 0 | DECLINED |
| C-T4-r2 | claude-opus-5-5 | 2 | 17 | 0.121 | 4 | 159360 | 7498 | 1439 | 0 | False | 0 | DECLINED |
| C-T5-r1 | claude-opus-5-5 | 2 | 22 | 0.294 | 4 | 48257 | 31120 | 1752 | 0 | False | 0 | DECLINED |
| C-T5-r2 | claude-opus-5-5 | 2 | 17 | 0.103 | 4 | 71364 | 7767 | 1326 | 0 | False | 0 | DECLINED |

## 조건별 요약 (스모크 런 A-T2-r0 제외, 조건당 10런)

| 조건 | 런 | 평균 turns | 평균 소요 s | 합계 cost | 평균 cost | 평균 cache_create | 평균 cache_read | 평균 턴당 입력 | 훅 발화 런 | 관할 읽은 런 | 금지 그대로 구현 | 기록 갱신하며 구현 | 거부·확인 요청 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| A hook | 10 | 4.5 | 28 | 2.81 | 0.281 | 26223 | 141136 | 37711 | 4 | 10 | 0 | 2 | 8 |
| B rule | 10 | 4.9 | 30 | 2.83 | 0.283 | 25747 | 166713 | 39085 | 0 | 10 | 0 | 2 | 8 |
| C resident | 10 | 2.0 | 20 | 2.57 | 0.257 | 26094 | 78951 | 52525 | 0 | 4 | 0 | 0 | 10 |

## 델타 (A hook 기준)

| 지표 | B rule vs A | C resident vs A | 계산 |
|---|---:|---:|---|
| 평균 턴당 입력 토큰 | +3.6% | +39.3% | 조건 평균 ÷ A 평균 − 1 |
| 평균 turns | +8.9% | -55.6% | 동상 |
| 평균 cost | +0.7% | -8.5% | 동상 |
| 평균 소요 | +4.2% | -29.9% | 동상 |

## 훅 주입 상한 프로브 (evidence/hook-cap/)

`inject-context.sh`(UserPromptSubmit) 로 critical-core.md 를 N자로 채우고 끝에 마커를 둔 뒤, `claude -p --max-turns 1` 로 마커가 보이는지 물었다. 각 행의 훅 출력 JSON 과 결과 JSON 이 파일로 있다.

```
chars=2000 additionalContext=2396자/2481B hook_stdout=2515자 -> YES cache_create=8900 model=['claude-opus-5-5']
chars=9600 additionalContext=9996자/15617B hook_stdout=10296자 -> YES cache_create=0 model=['claude-opus-5-5']
chars=9650 additionalContext=10046자/15676B hook_stdout=10348자 -> NO cache_create=8907 model=['claude-opus-5-5']
chars=12500 additionalContext=12896자/20358B hook_stdout=13254자 -> NO cache_create=8908 model=['claude-opus-5-5']
CLAUDE.md 107KB -> YES cache_create 66904
```

additionalContext 9,996자 → 전달, 10,046자 → 통째로 누락(cache_create 가 기본 지시문만 있을 때 수준으로 떨어짐). 같은 전문을 루트 CLAUDE.md 에 붙이면 전달되고 cache_create 가 66,904 토큰이 된다.

## 산술 참고

- 레포의 PRECEDENT.md 88개 합계 970KB. 이번 실험에서 CLAUDE.md 상주 104KB → cache_create 약 67k 토큰(기본 약 16k 포함)이었으므로, 970KB 전부를 상주시키면 대략 47만 토큰 규모로 200k 컨텍스트에 들어가지 않는다(선형 외삽, 실측 아님).
- 도착 훅의 안내는 400B 이하(훅 코드의 상한)다.
