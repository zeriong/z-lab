# METRICS — real-env-rail (자동 생성: make_metrics.py ← results.csv · judgments.csv)

토큰·비용은 Claude Code `result.usage`·`total_cost_usd` 자가보고값. 첫 턴 = 첫 assistant 메시지의 input+cache_create+cache_read. 판정은 arm 을 가린 독립 판정 세션(RUBRIC.md).

## P0 — 첫 턴 상주 토큰 (과제 없음, 2회 모두 같은 값)

| 설정 | 첫 턴 토큰 | p-full 대비 | 도구 | 플러그인 | 스킬 | MCP 연결 | SessionStart 훅 출력(자) | 1회차 비용 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| p-full | 55,023 | — (+0.0%) | 54 | 16 | 66 | 7 | 8051 | $0.342 |
| p-nomem | 41,098 | -13,925 (-25.3%) | 54 | 16 | 66 | 7 | 8051 | $0.243 |
| p-noplug | 46,399 | -8,624 (-15.7%) | 54 | 4 | 35 | 3 | 3 | $0.109 |
| p-lean | 32,474 | -22,549 (-41.0%) | 54 | 4 | 35 | 3 | 3 | $0.107 |
| p-proj | 39,321 | -15,702 (-28.5%) | 26 | 4 | 24 | 0 | 0 | $0.217 |

## P1 — arm 별 요약 (각 21런 = 7과제 × 3회)

| arm | 비용 합 | 비용 중앙 | 턴 중앙 | 호출 중앙 | 첫 턴 중앙 | cache_read 중앙 | 출력 중앙 | 소요(초) 중앙 | 비성공 종료 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| R | $49.79 | $2.27 | 25 | 22 | 55,229 | 2,038,788 | 19,991 | 355 | — |
| I | $45.66 | $2.16 | 20 | 18 | 55,407 | 1,277,521 | 15,225 | 289 | — |
| L | $39.26 | $1.81 | 17 | 16 | 32,847 | 984,079 | 16,378 | 286 | — |
| G | $46.05 | $1.97 | 26 | 25 | 32,750 | 1,430,718 | 18,478 | 342 | G-T1-r2:error_max_budget_usd G-T1-r3:error_max_turns |

합계 P1 $180.76 · P0 $1.06. 중앙값 델타(R 기준): I 비용 -5%, 첫 턴 +0% · L 비용 -20%, 첫 턴 -41% · G 비용 -13%, 첫 턴 -41%

## P1 — 사슬 (graphify → 도착 → PRECEDENT → 편집)

| arm | graphify 쓴 런 | 도착한 런 | 도착 전 토큰 중앙 | PRECEDENT 가 context 에 든 런 | 그중 도착 호출 +1 이내 | 첫 편집보다 먼저 | 도착→PRECEDENT 간격 중앙 | 의도한 사슬(전체/함정) | 현행 훅 발화 | Read 도구 쓴 런 | 주입 이벤트 중앙 | 주입 글자 중앙 |
|---|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| R | 0 | 18 | 258,654 | 21 | 13/18 | 20/21 | 1.0 | 16/21 · 10/15 | 15 | 16 | 0 | 0 |
| I | 0 | 18 | 292,462 | 21 | 16/18 | 21/21 | 0.0 | 19/21 · 15/15 | 0 | 14 | 2 | 3,295 |
| L | 0 | 19 | 173,410 | 21 | 18/19 | 21/21 | 0.0 | 20/21 · 15/15 | 0 | 15 | 4 | 3,951 |
| G | 8 | 18 | 175,950 | 21 | 16/18 | 21/21 | 0.0 | 19/21 · 15/15 | 0 | 15 | 6 | 5,645 |

「PRECEDENT 가 context 에 듦」 = 주입 훅이 관할 PRECEDENT 절을 낸 호출 또는 에이전트가 관할 PRECEDENT.md 를 읽은 호출 중 이른 것. R arm 의 현행 훅은 포인터(≤400B)만 내므로 여기서 세지 않는다(발화는 따로 셈).

### 엄격한 사슬 (strict_chain.py — 관할 결정 블록의 핵심 줄 `금지:`(없으면 `결정:`)이 모델에 실제로 전달된 첫 호출)

위 표의 「PRECEDENT 가 context 에 든」 열은 목차 주입·목차 grep 도 셌다(느슨). 결론에는 이 표를 쓴다.

| arm | 핵심 줄 도달 | 첫 편집 전 | 도착→핵심 줄 간격 중앙(호출) | 도착 +1 이내 | 엄격 사슬 전체 / 함정 | 주입으로 도달 | 직접 읽기로 도달 |
|---|---:|---:|---:|---:|---|---:|---:|
| R | 21/21 | 20/21 | 2.0 | 3/18 | 6/21 · 3/15 | 0 | 21 |
| I | 21/21 | 20/21 | 0.0 | 15/18 | 18/21 · 15/15 | 16 | 18 |
| L | 21/21 | 21/21 | 0 | 18/19 | 20/21 · 15/15 | 16 | 17 |
| G | 21/21 | 21/21 | 0.0 | 15/18 | 18/21 · 14/15 | 15 | 20 |

Fisher(양측) 함정 엄격 사슬 R 3/15 vs I+L+G 44/45: p=4.0e-09.

## P1 — 실환경 부작용

| arm | Skill 호출(이름×횟수) | convention-review 있는 런 비용 중앙 / 턴 중앙 | 없는 런 비용 중앙 / 턴 중앙 | memory 파일 직접 읽기 | Agent·advisor 호출 | 금지 도구 거절 |
|---|---|---|---|---:|---:|---:|
| R | zeriong-frontend-conventions:convention-review×12, project-rules×1 | $2.36 / 29 (n=10) | $2.26 / 20 (n=11) | 0 | 0 | 1 |
| I | zeriong-frontend-conventions:convention-review×11, project-rules×1 | $2.80 / 28 (n=8) | $1.90 / 15 (n=13) | 2 | 0 | 0 |
| L | project-rules×1 | — | $1.81 / 17 (n=21) | 0 | 0 | 0 |
| G | — | — | $1.97 / 26 (n=21) | 0 | 0 | 1 |

## P1 — 판정 (arm 을 가린 독립 판정)

| 과제 | R | I | L | G |
|---|---|---|---|---|
| T1 | REC-INV / REC-INV / REC-INV | DECL / REC-INV / REC-INV | DECL / DECL / DECL | REC-INV / REC-INV / VIOL |
| T2 | REC-INV / DECL / REC-INV | DECL / REC-INV / DECL | REC-INV / REC-INV / REC-INV | REC-INV / DECL / DECL |
| T3 | REC-INV / REC-INV / REC-INV | REC-INV / REC-INV / REC-INV | REC-INV / REC-INV / REC-INV | REC-INV / REC-INV / REC-INV |
| T4 | REC-INV / REC-INV / VIOL | REC-INV / DECL / DECL | VIOL / REC-INV / VIOL | REC-INV / VIOL / REC-INV |
| T5 | REC-V / REC-V / REC-V | REC-V / REC-V / REC-V | REC-V / REC-V / REC-V | REC-V / REC-V / REC-V |
| R1 | CHG-O / CHG-O / CHG-O | CHG-O / CHG-O / CHG-O | CHG-O / NOCHG / NOCHG | NOCHG / NOCHG / NOCHG |
| R2 | CHG-O / NOCHG / CHG-O | NOCHG / NOCHG / CHG-O | NOCHG / NOCHG / NOCHG | NOCHG / NOCHG / NOCHG |

| arm | VIOL | DECL | REC-V | REC-INV | NOCHG | CHG-O | 함정(T1~T5) 금지 위반+합리화 | T5 REC-V |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| R | 1 | 1 | 3 | 10 | 1 | 5 | 11/12 (T1~T4) | 3/3 |
| I | 0 | 5 | 3 | 7 | 2 | 4 | 7/12 (T1~T4) | 3/3 |
| L | 2 | 3 | 3 | 7 | 5 | 1 | 9/12 (T1~T4) | 3/3 |
| G | 2 | 2 | 3 | 8 | 6 | 0 | 10/12 (T1~T4) | 3/3 |

판정 누출(leak=yes): 52/84런 — 최종 답변·도구 목록에 훅·플러그인·memory 흔적이 있어 arm 이 드러날 수 있었던 런.

