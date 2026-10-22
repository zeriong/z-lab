# SPEC — build fidelity (E4): `/context-rail:build` 가 항목을 빠짐없이 바른 곳으로 옮기는가 (2026-10-22 고정)

실행 시작 전에 고정한다. 바꾸면 새 실험이다(제3조).
because-i-needed `CONTEXT-RAIL-PLUGIN-PLAN.md` 의 G4(정규화 충실도, 출시 차단)를 잰다. arm 은 없고, 같은 조건을 반복한다.

## 고정 조건

- `../build-canary-0.1.0/` 의 다음을 바이트 그대로 쓴다: `fixture/`, `plugin/context-rail/`(`plugin.sha256`), `ground_truth.json`, `score.py`, `run.py`. 카나리가 H1–H4 를 확인했다.
- 실행 명령: `python3 ../build-canary-0.1.0/run.py --scratch <scratch> --out runs --reps 5 --parallel 5`
  - 1턴은 `/context-rail:build`, 2턴은 `--resume` 으로 「Apply as shown. Do not apply the automation, personal or drop proposals; leave those items where they are.」다.
  - 공통 조건: opus · effort `xhigh` · `--setting-sources project` · 150턴 · $10 · 3600초.
- 실행 오류(인증·네트워크·지출 한도)는 같은 조건으로 한 번 재실행하고 기록한다.
- 턴·예산·시간 상한으로 끝난 런은 「미완」으로 따로 적는다. 충실도 실패와 섞지 않는다.
- CLI 버전은 배치 시작·끝과 턴마다 적는다.

## 지표 (실행 전 고정)

- 항목 14개 판정: 맞음 / 중복(옮겼는데 원래 자리에도 남음) / 누락(어디에도 없음) / 잘못 둠(남을 것을 옮김 · 옮길 것을 남김).
- 제안만 하는 3항목(자동화·개인·폐기)이 1턴 표에서 맞게 분류됐는가.
- Phase 5 검사 4종: self-test · max-output · records-lint · install --check.
- 1턴이 끝날 때 작업 트리 변경 수(0이어야 확인 전 쓰기가 없는 것이다).
- 상주 `CLAUDE.md` 의 글자·바이트 변화.
- 비용·턴·시간.

## 읽는 법 (실행 전 고정)

`build` 의 정규화 절차를 **채택**하려면 5런 **모두**가 다음을 만족해야 한다. 미완 런이 있으면 그 런은 불충족으로 센다.

- 누락 0, 중복 0, 잘못 둠 ≤ 1
- 제안만 하는 3항목의 표 분류 3/3
- Phase 5 검사 4/4 통과
- 1턴 종료 시 변경 0
- 상주가 글자·바이트 모두 줄었다

## 측정하지 않는 것

- 다른 fixture, 큰 레포, 항목 경계가 모호한 상주 문서. 항목은 설계자가 썼으므로 분류하기 쉬운 쪽으로 치우쳤을 수 있다.
- 사용자가 표 일부만 승인하는 흐름, 대화형 세션, 다른 모델·effort.
- 정규화가 이후 행동을 바꾸는지(E5).
- Codex(관리자 결정 D5).
