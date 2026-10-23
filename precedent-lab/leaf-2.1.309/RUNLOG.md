# RUNLOG — leaf (E6)

- 2026-10-23: SPEC 고정 커밋 `96af665` 뒤 Claude 5 arm(병렬 6)과 Codex arm(병렬 3)을 동시에 시작했다.
- 2026-10-23 12:10 KST: 오케스트레이터 세션이 끝나면서 두 실행이 함께 멈췄다. `summary.json` 이 있는 35런은 그대로 두었다.
  - 표본이 없는 9런(`agent-opus--A2-X1-r1`, `agent-opus--A2-P4-r1`, `agent-opus-ungated--A2-X1-r1`, `agent-sonnet--A2-X1-r1`, `agent-sonnet--A2-P3-r1`, `worker-sonnet--A2-X1-r1`, `worker-codex--A2-X1-r2`, `worker-codex--A2-X2-r2`, `worker-codex--A2-X3-r2`)은 러너가 지우고 같은 조건으로 처음부터 다시 돌린다.
  - 재개는 같은 명령을 `nohup` 으로 세션과 분리해 실행했다. SPEC 은 바꾸지 않았다.
