# skill-plugin-root-2.1.283 — 스킬 본문의 `${CLAUDE_PLUGIN_ROOT}` 는 풀리나 (실행 전 고정)

## 왜

plan-smith 1.6.0(Stage 2d의 `split-check.py`)과 claude-x-codex 0.1.0(`mode.sh`, `context-audit.sh`, `worktree-setup.sh`)은
스킬 본문에서 `"${CLAUDE_PLUGIN_ROOT}/scripts/…"` 로 스크립트를 부른다. 이 변수는 지금까지 **훅**에서만 확인됐다
([`../claude-code-2.1.283/`](../claude-code-2.1.283/) P04, [`../hook-injection-2.1.283/`](../hook-injection-2.1.283/)). 스킬에서 안 풀리면
두 플러그인의 스크립트 호출이 모두 헛돈다.

## 설계 (고정)

- 최소 플러그인 `probe`: `scripts/hello.sh` 는 `echo HELLO-MARK <자기 경로>` 를 출력. 스킬 `hello` 의 본문은 두 줄을 실행하라고 지시한다:
  `bash "${CLAUDE_PLUGIN_ROOT}/scripts/hello.sh"` 와 `echo "CPR=[$CLAUDE_PLUGIN_ROOT]"`.
- 호출: `claude -p "/probe:hello" --plugin-dir <probe> --setting-sources project --allowedTools Bash --model haiku --max-turns 4`, 3회.
- 관측(구조적): 모델이 낸 Bash `tool_use` 의 `command` 문자열에 절대 경로가 들어 있는가(스킬 텍스트가 치환됨), 리터럴
  `${CLAUDE_PLUGIN_ROOT}` 가 남아 있는가; 도구 결과에 `HELLO-MARK` 가 있는가, `CPR=[…]` 가 비었는가(Bash 환경변수 여부).

## 측정하지 않는 것

대화형 세션, 다른 모델, 플러그인 에이전트 본문 안의 변수 치환.
