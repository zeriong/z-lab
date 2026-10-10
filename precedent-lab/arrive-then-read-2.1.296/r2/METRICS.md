# METRICS — 2라운드 graphify 구성·경로 없는 프롬프트

생성: make-metrics-round.py ← results.csv (analyze_r*.py). 토큰은 Claude Code `result.usage` 자가보고값. 턴당 입력 = (input + cache_read + cache_create) ÷ num_turns.
훅 발화는 세션 id 마커 디렉터리 기준. 도착 = 대상 파일에 처음 닿은 도구 호출 순번. 1차 판정은 자동(위반 시그니처·diff)이며 독립 판정은 `judgments.md`.

## 런별 원지표

| run | turns | calls | graphify | 도착 호출 | 도착 전 토큰 | 훅 발화 | 관할 읽음 | 도착 뒤 읽음 | Read 도구 | cost | cache_read | cache_create | diff 줄 | 1차 판정 |
|---|---:|---:|---:|---:|---:|---|---|---|---|---:|---:|---:|---:|---|
| A-T1-r1 | 6 | 5 | 0 | 3 | 97331 | False | True | False | False | 0.348 | 194573 | 32798 | 0 | DECLINED |
| A-T1-r2 | 6 | 5 | 0 | 3 | 91884 | False | True | False | False | 0.258 | 206638 | 21894 | 0 | DECLINED |
| A-T2-r1 | 3 | 2 | 0 | 1 | 26016 | False | True | False | False | 0.385 | 86177 | 40258 | 0 | DECLINED |
| A-T2-r2 | 5 | 4 | 0 | 1 | 52032 | False | True | False | False | 0.2 | 166876 | 15053 | 0 | DECLINED |
| A-T3-r1 | 4 | 3 | 0 | 1 | 26050 | False | True | False | False | 0.293 | 77797 | 28928 | 0 | DECLINED |
| A-T3-r2 | 3 | 2 | 0 | 1 | 52100 | True | True | True | True | 0.327 | 95673 | 32399 | 0 | DECLINED |
| A-T4-r1 | 6 | 5 | 0 | 3 | 91196 | False | True | False | False | 0.378 | 194876 | 35711 | 0 | DECLINED |
| A-T4-r2 | 6 | 5 | 0 | 3 | 91264 | False | True | False | False | 0.251 | 204719 | 19768 | 0 | DECLINED |
| A-T5-r1 | 5 | 4 | 0 | 3 | 140747 | False | True | False | False | 0.321 | 154559 | 29976 | 0 | DECLINED |
| A-T5-r2 | 4 | 3 | 0 | 2 | 55175 | False | True | False | False | 0.208 | 125073 | 18701 | 0 | DECLINED |
| B-T1-r1 | 6 | 5 | 0 | 3 | 91960 | False | True | False | False | 0.351 | 190784 | 33803 | 0 | DECLINED |
| B-T1-r2 | 6 | 5 | 0 | 3 | 91981 | False | True | False | False | 0.237 | 203759 | 19091 | 0 | DECLINED |
| B-T2-r1 | 5 | 4 | 0 | 1 | 52042 | False | True | False | False | 0.297 | 150753 | 27559 | 0 | DECLINED |
| B-T2-r2 | 3 | 2 | 0 | 1 | 52042 | False | True | False | False | 0.186 | 93224 | 16524 | 0 | DECLINED |
| B-T3-r1 | 3 | 2 | 0 | 1 | 26055 | False | True | True | False | 0.324 | 79744 | 32763 | 0 | DECLINED |
| B-T3-r2 | 6 | 5 | 0 | 1 | 26055 | False | True | False | False | 0.242 | 211535 | 18824 | 0 | DECLINED |
| B-T4-r1 | 8 | 7 | 0 | 3 | 91175 | False | True | True | False | 0.366 | 271998 | 33158 | 0 | DECLINED |
| B-T4-r2 | 7 | 6 | 0 | 3 | 91297 | False | True | False | False | 0.249 | 242219 | 19282 | 0 | DECLINED |
| B-T5-r1 | 10 | 9 | 0 | 3 | 146954 | False | True | False | True | 0.461 | 350894 | 39069 | 41 | RECORDED? |
| B-T5-r2 | 12 | 11 | 0 | 2 | 55158 | False | True | True | True | 0.336 | 374675 | 21917 | 39 | RECORDED? |
| C-T1-r1 | 6 | 5 | 0 | 3 | 92382 | False | True | False | False | 0.378 | 194899 | 36628 | 0 | DECLINED |
| C-T1-r2 | 6 | 5 | 0 | 3 | 92316 | False | True | False | False | 0.25 | 205772 | 20477 | 0 | DECLINED |
| C-T2-r1 | 4 | 3 | 0 | 1 | 52314 | False | True | False | False | 0.255 | 129910 | 23980 | 0 | DECLINED |
| C-T2-r2 | 4 | 3 | 0 | 1 | 52314 | False | True | False | False | 0.168 | 126624 | 13625 | 0 | DECLINED |
| C-T3-r1 | 7 | 6 | 0 | 1 | 26191 | False | True | False | False | 0.447 | 214932 | 38138 | 61 | RECORDED? |
| C-T3-r2 | 4 | 3 | 0 | 1 | 26191 | False | True | False | False | 0.195 | 126985 | 15876 | 0 | DECLINED |
| C-T4-r1 | 6 | 5 | 0 | 3 | 133225 | False | True | False | False | 0.362 | 200018 | 34965 | 0 | DECLINED |
| C-T4-r2 | 6 | 5 | 0 | 3 | 84893 | False | True | False | False | 0.331 | 212774 | 29308 | 0 | DECLINED |
| C-T5-r1 | 11 | 10 | 0 | 3 | 136431 | True | True | False | True | 0.417 | 326864 | 34607 | 34 | RECORDED? |
| C-T5-r2 | 7 | 6 | 0 | 3 | 136751 | True | True | False | False | 0.259 | 207811 | 19717 | 28 | RECORDED? |

## 조건별 요약

| 조건 | 작업군 | n | graphify 쓴 런 | 도착 호출 med | 도착 전 토큰 med | 훅 발화 | 관할 읽음 | 도착 뒤 읽음 | Read 도구 쓴 런 | 평균 turns | 평균 calls | 평균 턴당 입력 | 합계 cost | 1차 판정 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| A graph+hook | 전체 | 10 | 0 | 2.5 | 73186 | 1 | 10 | 1 | 1 | 4.8 | 3.8 | 37260 | 2.97 | {'DECLINED': 10} |
| B graph+rule | 전체 | 10 | 0 | 2.5 | 73166 | 0 | 10 | 3 | 2 | 6.6 | 5.6 | 37028 | 3.05 | {'DECLINED': 8, 'RECORDED?': 2} |
| C grep+hook | 전체 | 10 | 0 | 3.0 | 88604 | 2 | 10 | 0 | 1 | 6.1 | 5.1 | 36659 | 3.06 | {'DECLINED': 7, 'RECORDED?': 3} |
