# RUNLOG — leaf r2 (E6′)

- 2026-10-23: SPEC 고정 커밋 `84d5012` 뒤 Claude 6 arm(병렬 6)과 Codex arm(병렬 3)을 `nohup` 으로 동시에 시작했다.
- 2026-10-23: 관리자 요청으로 실행을 일시정지했다. 진행 중인 API 호출이 오류 표본으로 남지 않도록 `SIGSTOP` 대신 러너와 자식 프로세스(`claude -p`)를 종료했다.
  - 그 시점에 `summary.json` 이 있는 173런은 그대로 둔다. 표본이 없는 런은 재개할 때 러너가 지우고 같은 조건으로 처음부터 다시 돌린다.
  - 재개는 SPEC 의 실행 명령을 그대로 다시 실행한다.
- 2026-10-23 15:00 KST: 같은 명령(Claude 6 arm)으로 재개했다. Codex arm 은 일시정지 전에 39/39 를 마쳐 다시 돌리지 않는다.
- 2026-10-23: 집계 중에 rc=143(SIGTERM) 6런을 발견했다(`agent-opus--A3-B1-r2`·`B2-r2`·`X4-r2`, `agent-sonnet--A3-B1-r2`, `top-opus--A3-B2-r2`, `worker-sonnet-preauth--A3-B1-r2`).
  - 일시정지 때 자식 `claude -p` 를 먼저 종료하는 사이, 아직 살아 있던 러너가 끊긴 런의 `summary.json` 을 썼다. 행동이 아니라 오케스트레이터 개입의 흔적이다.
  - 6런은 `runs-interrupted/` 로 옮겨 판정에서 뺐다. 해시는 `specimens.sha256` 에 함께 남긴다. 같은 조건으로 다시 돌린다.
