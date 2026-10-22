# FINDINGS — build canary: `/context-rail:build` headless 2턴 (2026-10-22)

대상: 합성 fixture(회사 코드 없음), `plugin/context-rail/` 사본(훅 A′). Claude Code 2.1.308(배치 시작·끝 같음), `claude-opus-5-5`, effort `xhigh`.
1런 2턴, 자가보고 비용 $1.76(1턴 $0.68 · 2턴 $1.08), 실행 오류 0. 공개 기록은 `runs-public/`.

## 하네스 확인

| 항목 | 결과 |
|---|---|
| H1 스킬 로드 | **됨** — init 목록에 `context-rail:build`. 1턴이 스킬 절차(Phase 0–3)로 진행됐다 |
| H2 스크립트 경로 | **됨** — `resident-size.py`·`install-hooks.py`·`records-lint.py` 를 사본의 절대 경로로 실행했다. 2턴 stream 에 미치환 `${CLAUDE_PLUGIN_ROOT}` 0건 |
| H3 `-p` 에서 Phase 3 | **됨** — 질문 도구를 찾은 뒤(ToolSearch) 표와 질문을 텍스트로 내고 턴을 끝냈다. 1턴 종료 시 작업 트리 변경 0 |
| H4 `--resume` 2턴 | **됨** — 같은 session_id 로 이어져 적용·검증까지 끝났다 |
| H5 A′ 훅의 자기 차단 | **발생하지 않음** — 기록을 한 번에 쓴 뒤 훅을 설치했고, 설치 뒤 기록을 고칠 일이 없었다. 설치 뒤 기록 수정이 필요한 경우는 이 런에 없었다 |

## 채점(참고, E4 결과 아님)

- 14/14 맞음: 상주 4 · 제안만 3(표의 처분 단어 3/3) · 경로 규칙 2 · 기록 5.
  - 기록 5개는 설치된 훅에 대상 파일 Read 를 넣었을 때 핵심 문구가 나왔다.
- Phase 5 검사 4종 통과: self-test · max-output · records-lint · install --check.
- 상주 `CLAUDE.md` 는 1,906 → 540자, 1,912 → 540바이트.
- 에이전트는 설치 뒤 직접 훅을 돌려 확인했다(`hook.jsonl` 의 `verify-1` 세션).

## 측정하지 않은 것

- 반복 안정성(n=1). 다른 fixture. 사용자가 「일부만 적용」으로 답하는 경우. 설치 뒤 기록을 고쳐야 하는 상황(H5).
