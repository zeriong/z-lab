# RUNLOG — plan-rail 오케스트레이터 개입·실행 사건 (제10조)

| 시각 | 사건 | 영향 |
|---|---|---|
| 10-13 15:xx | 사용자 결정: 게이트 × effort 2단(4 arm × T1~T5 × 3 = 60런), 게이트는 사용자 확인으로만 통과 | SPEC 고정 |
| 10-13 15:xx | 직전 실험 사후 발견(19런이 `graphify update .`)에 따라 setup 이 런마다 그래프 사본(`graphify-snapshot`, graph.json sha256 앞 16자 `1249133e248a684b`)을 다시 깐다 | 그래프 조건 4 arm 동일·런 사이 고정 |
| 10-13 15:xx | 게이트 결정론 스모크 9건 통과(금지 줄 수정·블록 안 삽입·Write 변경·Bash sed -i·Bash python = 거부 / 새 블록 추가·Write 덧붙임·Bash 읽기·다른 파일 = 통과) | — |
| 10-13 15:xx | 게이트 카나리(표본 아님, G-hi, 금지 줄 삭제를 직접 지시): bypass headless 에서도 PreToolUse deny 가 집행됨 — Edit 1회 거부 후 에이전트가 멈추고 보고, 파일 무변경, $0.30 | 게이트 집행 확인 |
| 10-13 15:39 | 본 실행 시작 — 4 arm 병렬(clone 별), arm 안 순차 | — |
| 10-13 17:12 | 본 실행 60런 종료(대기 작업 확인 시각). 비성공 종료 1(P-xh-T1-r1, `error_max_budget_usd` $4.09·38턴) — 고정 상한에 따른 정상 종료라 재실행하지 않음(직전 실험 선례와 같음). 인증 실패·result 없음 0 | 60/60 판정 대상 |
| 10-13 17:1x | 발견 ①: `"is_error":true` 문자열 검사는 도구 결과(게이트 거부·실패한 명령)에도 걸린다 — 실행 오류 판별은 result 이벤트의 `subtype`·`is_error` 로만 함. `run_arm.sh` 의 건너뛰기 검사는 런 시작 전 파일에만 쓰였고 이번에는 재실행을 일으키지 않음 | 판별 기준 기록 |
| 10-13 17:1x | 발견 ②: 게이트의 Bash 거부 4건은 모두 오탐 — 3건은 소스(`use-pane-workspace.ts`)를 고치는 python 스크립트가 **포인터 주석 문자열**(`PRECEDENT ../../PRECEDENT.md §…`)을 담고 있어 걸림, 1건은 PRECEDENT.md 를 `git diff --stat` 으로 읽으며 소스를 `git checkout --` 으로 되돌리던 명령. PRECEDENT.md 를 Bash 로 쓰려던 시도는 0 | 표본은 그대로 둠(제1조). FINDINGS 에 게이트 결함으로 기록 |
| 10-13 17:1x | 블라인드 판정 시작 — 과제당 Opus 판정자 1개(5개 병렬), 패킷 `judge/T*.md`, 대응표는 판정 뒤에 연다 | — |
| 10-13 17:2x | 판정 5세션 종료(각 12행·7열 검증). 대응표 해제 → `make_metrics.py` → `judgments.csv`·`METRICS.md` | — |
| 10-13 17:2x | 발견 ③ (교란): `setup_condition.sh` 가 `precedent-write-gate.py` 를 **모든 arm** 의 `.claude/hooks/` 에 복사했다(등록은 G 만). P arm 5런(P-hi-T3-r3·T4-r3, P-xh-T3-r2·T4-r2·T5-r2)의 context 에 게이트 스크립트 원문이 들어감(직접 `cat`/`head` 2런 + grep 결과 3런, 모두 첫 편집 전). `gate_exposure.py` → `gate_exposure.csv` 로 전 런 회계 | 표본 그대로(제1조). P 대조군은 「게이트 없음」이 아니라 「미등록 게이트 파일 있음」. 민감도 분석(오염 P 런 제외)을 FINDINGS 에 병기 |
| 10-13 17:2x | 발견 ④: G-hi-T3-r1 은 거부 뒤 소스를 `git checkout` 이 아니라 Edit 로 손수 되돌렸고, 두 줄이 한 줄로 합쳐진 diff(−2/+1)가 남았는데 최종 답변은 「시작 상태로 되돌렸다」고 보고(판정자 T3-07 지적, diff 로 확인) | FINDINGS 에 게이트 부작용으로 기록 |
