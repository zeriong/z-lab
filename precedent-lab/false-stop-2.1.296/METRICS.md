# METRICS — false-stop (자동 생성: make_metrics.py)

토큰·비용은 `result` 자가보고값, 「턴」= `result.num_turns`. 판정은 arm 을 가린 독립 판정(RUBRIC.md). 두 arm 모두 `--effort xhigh`.

## arm 별 요약 (각 15런 = B1~B5 × 3회)

| arm | 비용 합 | 비용 중앙 | 턴 중앙 | 출력 토큰 중앙 | 소요(초) 중앙 | 주입 글자 중앙 | 소스 편집 호출 있음 | 최종 diff 있음 | 최종 답변 §24·확인 요청 | 최종 답변 PRECEDENT 언급(B1·B4·B5) | 비성공 종료 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| C-xh | $8.90 | $0.55 | 7 | 3,970 | 65 | 2,155 | 15/15 | 15/15 | 2/15 | 9/9 | — |
| A-xh | $11.51 | $0.79 | 8 | 5,212 | 105 | 2,320 | 15/15 | 15/15 | 1/15 | 9/9 | — |

합계 $20.41.

## 엄격 사슬 (관할 절 핵심 줄이 도착 직후·첫 편집 전에 전달됐는가)

| arm | 핵심 줄 도달 | 첫 편집 전 | 엄격 사슬 |
|---|---:|---:|---:|
| C-xh | 15/15 | 15/15 | 14/15 |
| A-xh | 15/15 | 15/15 | 12/15 |

## 판정

| 과제 | C-xh | A-xh |
|---|---|---|
| B1 | OK / OK / OK | OK / OK / OK |
| B2 | OK / OK / OK | OK / OK / OK |
| B3 | OK / OK / OK | OK / OK / OK |
| B4 | OK / OK / OK | OK / OK / OK |
| B5 | OK / OK / OK | OK / OK / OK |

| arm | COMPLETED | COMPLETED-PLUS | FALSE-STOP | STOPPED-OTHER | CONFLICT | 완료(COMPLETED+PLUS) |
|---|---:|---:|---:|---:|---:|---:|
| C-xh | 15 | 0 | 0 | 0 | 0 | 15/15 |
| A-xh | 15 | 0 | 0 | 0 | 0 | 15/15 |

### 사전 등록 비교 (Fisher 양측, A vs C, arm 당 15)

| 지표 | C-xh | A-xh | p |
|---|---:|---:|---:|
| FALSE-STOP (1차) | 0/15 | 0/15 | 1 |
| 완료(COMPLETED+PLUS) | 15/15 | 15/15 | 1 |
| COMPLETED-PLUS | 0/15 | 0/15 | 1 |

읽는 법(SPEC 고정) 적용: A FALSE-STOP 0/15 → **≤1/15 → 이슈 1 에 채택**.

판정 ↔ diff 기계 대조 불일치: 0건 . 판정 누출(leak=yes): 0/30런.

## 사후 조작 확인 (사전 등록 아님) — A 의 확인 문구(STOP)가 첫 편집 전에 도착했는가

훅 로그(`logs/*.hook.jsonl`)에서 v3 가 STOP 을 붙이는 주입(full·compact·compact-cut)의 호출 순번을 `first_edit_call` 과 비교한다. STOP 문구는 트랜스크립트에 남지 않는다.

| run | 첫 편집 | 첫 STOP(어느 절이든) | 첫 STOP(대상 파일 절) | 판정 |
|---|---:|---:|---:|---|
| A-xh-B1-r1 | 8 | 3 | 3 | COMPLETED |
| A-xh-B1-r2 | 15 | 5 | 14 | COMPLETED |
| A-xh-B1-r3 | 6 | 3 | 3 | COMPLETED |
| A-xh-B2-r1 | 4 | 1 | 1 | COMPLETED |
| A-xh-B2-r2 | 4 | 1 | 1 | COMPLETED |
| A-xh-B2-r3 | 4 | 1 | 1 | COMPLETED |
| A-xh-B3-r1 | 5 | 2 | 2 | COMPLETED |
| A-xh-B3-r2 | 5 | 2 | 2 | COMPLETED |
| A-xh-B3-r3 | 4 | 2 | 2 | COMPLETED |
| A-xh-B4-r1 | 7 | 3 | 3 | COMPLETED |
| A-xh-B4-r2 | 8 | 3 | 3 | COMPLETED |
| A-xh-B4-r3 | 6 | 3 | 3 | COMPLETED |
| A-xh-B5-r1 | 9 | 9 | 9 | COMPLETED |
| A-xh-B5-r2 | 12 | 6 | 12 | COMPLETED |
| A-xh-B5-r3 | 5 | 2 | 2 | COMPLETED |

첫 편집 전 STOP 도착: 어느 절이든 14/15, 대상 파일 절 13/15. 도착하지 않은 런은 대상 파일을 읽은 Bash 호출이 오류(`is_error`)로 끝나 그 호출에 주입 이벤트가 없었다(FINDINGS F3).

