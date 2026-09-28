# split-1.6.0 지표

`python3 metrics.py > METRICS.md` 로 생성한다. 비용·턴은 CLI 자가보고(시도 합계), wall은 러너가 잰 ms(시도 합계). 문자 수는 Python `len`(=`wc -m`).

| 입력 | run | unsplit 문자 | 검사(시도별) | 파트 수 | 파트 | 최대 파트 문자 | 10,000자 초과 파트 | 인덱스 경고문 | turns | usd | wall | 첫 실패 사유 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| p20k | r1 | 20,344 | pass | 7 | overview_A0, coverage_B0, goal_C0, steps_D0, load-bearing_E0, risks_F0, contract_G0 | 6,058 | 0 | yes | 10 | 0.81 | 156,637 | — |
| p20k | r2 | 20,344 | pass | 6 | overview_A0, coverage-matrix_B0, approach_C0, load-bearing-path_D0, risks_E0, contract_F0 | 6,066 | 0 | yes | 9 | 0.77 | 148,933 | — |
| p32k | r1 | 32,073 | pass | 8 | overview_A0, stack_B0, glue-symbols_B1, glue-code_B2, stages-steps_C0, load-bearing_D0, risks_E0, contract_F0 | 6,320 | 0 | yes | 11 | 1.08 | 213,471 | — |
| p32k | r2 | 32,073 | pass | 11 | overview_A0, overview_A1, files_B0, symbols_B1, glue_B2, glue_B3, stages_C0, steps_C1, load-bearing-path_D0, risks_E0, contract_F0 | 5,234 | 0 | yes | 14 | 1.08 | 251,842 | — |
| p37k | r1 | 36,970 | pass | 7 | overview_A0, coverage_A1, requirements_B0, steps_C0, steps_C1, load-bearing-path_D0, contract_E0 | 9,933 | 0 | yes | 10 | 0.68 | 156,425 | — |
| p37k | r2 | 36,970 | pass | 7 | overview_A0, coverage_A1, requirements_B0, steps_C0, steps_C1, load-bearing-path_D0, contract_E0 | 9,933 | 0 | yes | 10 | 0.66 | 141,655 | — |

## 요약

- 최종 통과 6/6, 첫 시도 통과 6/6
- 파트 수 범위 6–11, 10,000자 초과 파트 합계 0
- run당 비용 중앙값 $0.79 (합계 $5.09), 벽시계 중앙값 157초
