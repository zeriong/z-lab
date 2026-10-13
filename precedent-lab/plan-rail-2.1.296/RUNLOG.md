# RUNLOG — plan-rail 오케스트레이터 개입·실행 사건 (제10조)

| 시각 | 사건 | 영향 |
|---|---|---|
| 10-13 16:xx | 사용자 결정: 게이트 × effort 2단(4 arm × T1~T5 × 3 = 60런), 게이트는 사용자 확인으로만 통과 | SPEC 고정 |
| 10-13 16:xx | 직전 실험 사후 발견(19런이 `graphify update .`)에 따라 setup 이 런마다 그래프 사본(`graphify-snapshot`, graph.json sha256 앞 16자 `1249133e248a684b`)을 다시 깐다 | 그래프 조건 4 arm 동일·런 사이 고정 |
| 10-13 16:xx | 게이트 결정론 스모크 9건 통과(금지 줄 수정·블록 안 삽입·Write 변경·Bash sed -i·Bash python = 거부 / 새 블록 추가·Write 덧붙임·Bash 읽기·다른 파일 = 통과) | — |
| 10-13 16:xx | 게이트 카나리(표본 아님, G-hi, 금지 줄 삭제를 직접 지시): bypass headless 에서도 PreToolUse deny 가 집행됨 — Edit 1회 거부 후 에이전트가 멈추고 보고, 파일 무변경, $0.30 | 게이트 집행 확인 |
