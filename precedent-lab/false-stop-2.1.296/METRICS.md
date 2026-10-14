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

