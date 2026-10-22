# SPEC — build canary: `/context-rail:build` 를 headless 로 끝까지 돌릴 수 있는가 (2026-10-22 고정)

실행 시작 전에 고정한다. 바꾸면 새 라운드다.
E4(정규화 충실도)를 고정하기 전에 하네스부터 확인한다. E4 의 숫자가 스킬이 아니라 하네스를 잰 것이 되지 않게 하려는 것이다. 1런.

## 확인할 것

- H1. `--plugin-dir <사본> --setting-sources project` 에서 `/context-rail:build` 가 로드되고 실행되는가. init 의 slash command 목록과 첫 응답으로 본다.
- H2. SKILL.md 의 `${CLAUDE_PLUGIN_ROOT}` 가 치환되어 플러그인 스크립트가 실제로 도는가(`install-hooks.py` 등).
- H3. `-p` 에서 Phase 3 확인은 어떻게 처리되는가. 1턴이 끝난 시점의 `git status` 변경 수가 0이면 질문하고 멈춘 것이다.
- H4. `--resume <sid> -p` 2턴이 같은 세션·같은 cwd 로 이어져 적용까지 끝나는가.
- H5. 빌드 도중 설치된 A′ 훅이 빌드 자신의 기록 수정을 막는가. 2턴 답변·도구 순서·`hook.jsonl` 로 본다.

## 고정 조건

- **fixture**(`fixture/`, 회사 코드 없음)
  - stop-en 과 같은 모듈 5개와 테스트, `src/ui/button.mjs`, `migrations/001_init.sql`, `.editorconfig`.
  - `PRECEDENT.md`·`.claude/` 는 없다. 결정 5개는 `CLAUDE.md` 산문으로 들어 있다.
  - `CLAUDE.md` 의 14항목과 정답 처분은 `ground_truth.json` 에 있다: 상주 4 · 자동화 1 · 개인 1 · 폐기 1 · 경로 규칙 2 · 기록 5.
- **플러그인**: because-i-needed 작업본을 `plugin/context-rail/` 에 복사해 고정했다(`plugin.sha256`). 훅 자산은 A′(sha256 `3c31c65f…`)다.
- **실행**: `claude -p "/context-rail:build" --plugin-dir plugin/context-rail --model opus --effort xhigh --setting-sources project --permission-mode bypassPermissions --output-format stream-json --verbose --max-turns 150 --max-budget-usd 10`, 타임아웃 3600초.
  - 2턴은 같은 플래그에 `--resume <1턴 session_id>` 를 붙이고, 프롬프트는 「Apply as shown. Do not apply the automation, personal or drop proposals; leave those items where they are.」다.
- **채점**(`score.py`, 실행 전에 검증)
  - 손대지 않은 fixture 는 7 맞음 · 7 이동 안 됨, 손으로 정규화한 정답 사본은 14/14 맞음과 검사 4종 통과가 나왔다.
  - 항목 판정:
    - 남을 항목은 문구가 `CLAUDE.md` 에 남고 다른 곳에 없으면 맞음이다.
    - 경로 규칙은 `.claude/rules/*.md` 에 키워드가 있고 `paths:` 가 맞으면 맞음이다.
    - 기록은 **설치된 훅에 대상 파일 Read 를 넣었을 때** 출력에 키워드가 있으면 맞음이다.
    - 옮겨야 할 문구가 `CLAUDE.md` 에도 남아 있으면 중복이다.
  - 제안만 하는 항목(자동화·개인·폐기)은 1턴 표의 같은 줄에 처분 단어가 있는지도 본다.
- CLI 버전은 배치 시작·끝(`runs/cli-*.txt`)과 턴마다 init 에서 적는다.

## 읽는 법

- H1–H5 마다 「됨 / 안 됨 / 다르게 됨」을 적는다. 하나라도 「안 됨」이면 E4 SPEC 을 고정하기 전에 하네스나 스킬을 고친다. 고치면 이 카나리를 새 라운드로 다시 돌린다.
- 이 1런의 채점 결과는 E4 결과가 아니다.
