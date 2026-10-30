# METRICS — record (E8)

W 런 72개. 원자료 `runs-public/*/summary.json`, 생성 `make_metrics.py`.

- 실행 환경(init): {'2.1.312': 72}
- 실행 오류(rc≠0): 0 · 판정기 오류: 0

## D — 결정론

- v030: 관할 파일 2681 · 결정 빠진 파일 0 · 모드 회귀 0 · 결정 수 회사 훅 1749 → 1749 · 최악 6995자 · E7 대상 금지줄·slug·문구 4/4
- v020: 관할 파일 2681 · 결정 빠진 파일 3 · 모드 회귀 2 · 결정 수 회사 훅 1749 → 1726 · 최악 7000자 · E7 대상 금지줄·slug·문구 4/4
- 조건 1(D): 충족

## W — 기록 행동

| arm | N 기록 (절 있음) | U 기록 (기록 없음) | Q 완료 | Q 과잉 기록 |
|---|---:|---:|---:|---:|
| none | 2/9 | 0/9 | 6/6 | 0/6 |
| v020 | 8/9 | 3/9 | 6/6 | 0/6 |
| v030 | 7/9 | 8/9 | 6/6 | 0/6 |

판정 분포:

| arm | 종류 | 판정 |
|---|---|---|
| none | new | {'NEW-UNRECORDED': 7, 'NEW-RECORDED': 2} |
| none | unrecorded | {'NEW-UNRECORDED': 9} |
| none | quiet | {'COMPLETED': 6} |
| v020 | new | {'NEW-RECORDED': 8, 'NEW-UNRECORDED': 1} |
| v020 | unrecorded | {'NEW-RECORDED': 3, 'NEW-UNRECORDED': 6} |
| v020 | quiet | {'COMPLETED': 6} |
| v030 | new | {'NEW-RECORDED': 7, 'NEW-UNRECORDED': 2} |
| v030 | unrecorded | {'NEW-RECORDED': 8, 'NEW-UNRECORDED': 1} |
| v030 | quiet | {'COMPLETED': 6} |

## 읽는 법 (SPEC)

- 조건 2(쓰기 안내 작동): v030 U 8/9 · v020 3 · none 0 → 충족
- 조건 3(과잉 기록): v030 Q 0/6 → 충족
- 조건 4(N 회귀 없음): v030 N 7 vs v020 8 → 충족
- 전달(참고): v030 U 런 중 기록 없음 안내 도착 7/9
- #5 읽기: none U 0/9 · N 2/9
- 종합: 0.3.0 릴리즈 조건 충족
- 참고 Fisher 양측 p — U 기록 v030 vs none: 0.00041 · v030 vs v020: 0.05

## 기록 위치·형태 (U · NEW-RECORDED)

| arm | 대상과 같은 디렉터리 | 한정어 없는 결정 줄 |
|---|---:|---:|
| none | 0/0 | 0/0 |
| v020 | 3/3 | 3/3 |
| v030 | 8/8 | 8/8 |

## 비용·턴 (자가보고)

| arm | 종류 | 비용 합 | 비용 중앙 | 턴 중앙 |
|---|---|---:|---:|---:|
| none | new | $2.95 | $0.321 | 6 |
| none | unrecorded | $2.89 | $0.318 | 5 |
| none | quiet | $1.47 | $0.253 | 4 |
| v020 | new | $3.09 | $0.344 | 6 |
| v020 | unrecorded | $3.08 | $0.323 | 7 |
| v020 | quiet | $1.51 | $0.254 | 4 |
| v030 | new | $2.99 | $0.329 | 6 |
| v030 | unrecorded | $3.23 | $0.361 | 8 |
| v030 | quiet | $1.53 | $0.259 | 5 |

- 합계: $22.74

## 런별

| run | 판정 | 기록 디렉터리 | 새 블록 | 결정 줄(정확) | 훅 메시지(기록없음·Edit알림·절없음·문구) |
|---|---|---|---:|---|---|
| none-N1-r1 | NEW-UNRECORDED | src/tabs | 0 | False | 0·0·0·0 |
| none-N1-r2 | NEW-UNRECORDED | src/tabs | 0 | False | 0·0·0·0 |
| none-N1-r3 | NEW-UNRECORDED | src/tabs | 0 | False | 0·0·0·0 |
| none-N2-r1 | NEW-UNRECORDED | src/auth | 0 | False | 0·0·0·0 |
| none-N2-r2 | NEW-RECORDED | src/auth | 1 | True | 0·0·0·0 |
| none-N2-r3 | NEW-RECORDED | src/auth | 1 | True | 0·0·0·0 |
| none-N3-r1 | NEW-UNRECORDED | src/layout | 0 | False | 0·0·0·0 |
| none-N3-r2 | NEW-UNRECORDED | src/layout | 0 | False | 0·0·0·0 |
| none-N3-r3 | NEW-UNRECORDED | src/layout | 0 | False | 0·0·0·0 |
| none-Q1-r1 | COMPLETED | None | 0 | False | 0·0·0·0 |
| none-Q1-r2 | COMPLETED | None | 0 | False | 0·0·0·0 |
| none-Q1-r3 | COMPLETED | None | 0 | False | 0·0·0·0 |
| none-Q2-r1 | COMPLETED | None | 0 | False | 0·0·0·0 |
| none-Q2-r2 | COMPLETED | None | 0 | False | 0·0·0·0 |
| none-Q2-r3 | COMPLETED | None | 0 | False | 0·0·0·0 |
| none-U1-r1 | NEW-UNRECORDED | None | 0 | False | 0·0·0·0 |
| none-U1-r2 | NEW-UNRECORDED | None | 0 | False | 0·0·0·0 |
| none-U1-r3 | NEW-UNRECORDED | None | 0 | False | 0·0·0·0 |
| none-U2-r1 | NEW-UNRECORDED | None | 0 | False | 0·0·0·0 |
| none-U2-r2 | NEW-UNRECORDED | None | 0 | False | 0·0·0·0 |
| none-U2-r3 | NEW-UNRECORDED | None | 0 | False | 0·0·0·0 |
| none-U3-r1 | NEW-UNRECORDED | None | 0 | False | 0·0·0·0 |
| none-U3-r2 | NEW-UNRECORDED | None | 0 | False | 0·0·0·0 |
| none-U3-r3 | NEW-UNRECORDED | None | 0 | False | 0·0·0·0 |
| v020-N1-r1 | NEW-RECORDED | src/tabs | 1 | True | 0·1·1·2 |
| v020-N1-r2 | NEW-RECORDED | src/tabs | 1 | True | 0·1·1·2 |
| v020-N1-r3 | NEW-RECORDED | src/tabs | 1 | True | 0·1·1·2 |
| v020-N2-r1 | NEW-RECORDED | src/auth | 1 | True | 0·1·1·1 |
| v020-N2-r2 | NEW-RECORDED | src/auth | 1 | True | 0·0·1·2 |
| v020-N2-r3 | NEW-RECORDED | src/auth | 1 | True | 0·1·1·2 |
| v020-N3-r1 | NEW-RECORDED | src/layout | 1 | True | 0·1·0·2 |
| v020-N3-r2 | NEW-RECORDED | src/layout | 1 | True | 0·1·0·2 |
| v020-N3-r3 | NEW-UNRECORDED | src/layout | 0 | False | 0·0·0·2 |
| v020-Q1-r1 | COMPLETED | None | 0 | False | 0·0·0·0 |
| v020-Q1-r2 | COMPLETED | None | 0 | False | 0·0·0·1 |
| v020-Q1-r3 | COMPLETED | None | 0 | False | 0·0·0·0 |
| v020-Q2-r1 | COMPLETED | None | 0 | False | 0·0·0·0 |
| v020-Q2-r2 | COMPLETED | None | 0 | False | 0·0·0·0 |
| v020-Q2-r3 | COMPLETED | None | 0 | False | 0·0·0·0 |
| v020-U1-r1 | NEW-RECORDED | src/ui | 1 | True | 0·0·1·1 |
| v020-U1-r2 | NEW-UNRECORDED | None | 0 | False | 0·0·1·1 |
| v020-U1-r3 | NEW-UNRECORDED | None | 0 | False | 0·0·0·2 |
| v020-U2-r1 | NEW-RECORDED | src/format | 1 | True | 0·0·1·2 |
| v020-U2-r2 | NEW-UNRECORDED | None | 0 | False | 0·0·0·1 |
| v020-U2-r3 | NEW-RECORDED | src/format | 1 | True | 0·0·1·1 |
| v020-U3-r1 | NEW-UNRECORDED | None | 0 | False | 0·0·0·2 |
| v020-U3-r2 | NEW-UNRECORDED | None | 0 | False | 0·0·0·2 |
| v020-U3-r3 | NEW-UNRECORDED | None | 0 | False | 0·0·0·2 |
| v030-N1-r1 | NEW-RECORDED | src/tabs | 1 | True | 0·1·0·2 |
| v030-N1-r2 | NEW-UNRECORDED | src/tabs | 0 | False | 0·0·0·2 |
| v030-N1-r3 | NEW-UNRECORDED | src/tabs | 0 | False | 0·0·0·2 |
| v030-N2-r1 | NEW-RECORDED | src/auth | 1 | True | 0·1·1·2 |
| v030-N2-r2 | NEW-RECORDED | src/auth | 1 | True | 0·1·1·2 |
| v030-N2-r3 | NEW-RECORDED | src/auth | 1 | True | 0·0·1·2 |
| v030-N3-r1 | NEW-RECORDED | src/layout | 1 | True | 0·1·0·2 |
| v030-N3-r2 | NEW-RECORDED | src/layout | 1 | True | 0·1·0·2 |
| v030-N3-r3 | NEW-RECORDED | src/layout | 1 | True | 0·1·0·2 |
| v030-Q1-r1 | COMPLETED | None | 0 | False | 1·0·0·0 |
| v030-Q1-r2 | COMPLETED | None | 0 | False | 1·0·0·0 |
| v030-Q1-r3 | COMPLETED | None | 0 | False | 1·0·0·0 |
| v030-Q2-r1 | COMPLETED | None | 0 | False | 1·0·0·0 |
| v030-Q2-r2 | COMPLETED | None | 0 | False | 1·0·0·0 |
| v030-Q2-r3 | COMPLETED | None | 0 | False | 1·0·0·0 |
| v030-U1-r1 | NEW-RECORDED | src/ui | 1 | True | 1·0·1·1 |
| v030-U1-r2 | NEW-RECORDED | src/ui | 1 | True | 1·0·1·1 |
| v030-U1-r3 | NEW-RECORDED | src/ui | 1 | True | 0·0·1·2 |
| v030-U2-r1 | NEW-RECORDED | src/format | 1 | True | 1·0·1·1 |
| v030-U2-r2 | NEW-RECORDED | src/format | 1 | True | 1·0·0·2 |
| v030-U2-r3 | NEW-RECORDED | src/format | 1 | True | 1·0·1·1 |
| v030-U3-r1 | NEW-RECORDED | src/store | 1 | True | 1·0·1·1 |
| v030-U3-r2 | NEW-UNRECORDED | None | 0 | False | 0·0·0·2 |
| v030-U3-r3 | NEW-RECORDED | src/store | 1 | True | 1·0·0·1 |
