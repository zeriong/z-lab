# RUNLOG

- 첫 시도(rN): 러너가 규칙 폴더를 설정보다 먼저 만들어 `mkdir` 충돌로 런 전에 멈췄다. 측정된 런 없음. 설정 → 규칙 순서로 고쳤다(조건 변화 없음).
- 2026-10-22 18:1x: Claude 6케이스 완료. Codex 4케이스(xP·xN0·xN1·xL)는 **실행 오류**로 끝났다(rc=1). 기본 계정의 사용량 한도가 원인이고, 응답은 「usage limit … try again at Oct 27th, 2026 3:32 PM」이었다.
  - 이 4케이스는 결과로 세지 않는다. SPEC 대로 같은 조건으로 한 번 재실행한다. 한도가 풀린 뒤이거나, 관리자가 다른 계정을 허락하면 그때 돌린다.
  - `runs/x*/` 의 오류 기록은 재실행 전에 지운다(러너가 summary 가 있으면 건너뛰기 때문).
- 2026-10-22 관리자 결정(D5, `../analyze/improvement-backlog.md`): context-rail 은 Claude Code 에서만 잰다. Codex 4케이스는 **재실행하지 않는다**. `runs-public/x*/` 는 실행 오류 기록으로만 남는다.
