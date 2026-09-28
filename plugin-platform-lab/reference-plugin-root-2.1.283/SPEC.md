# reference-plugin-root-2.1.283 — 스킬이 나중에 읽는 reference 파일의 `${CLAUDE_PLUGIN_ROOT}` 는 풀리나 (실행 전 고정)

## 왜

형제 실험 [`../skill-plugin-root-2.1.283/`](../skill-plugin-root-2.1.283/) 는 **SKILL.md 본문**의 중괄호 `${CLAUDE_PLUGIN_ROOT}` 가 스킬 로드 때
절대 경로로 바뀌고, Bash 환경에는 그 변수가 없다는 것을 쟀다(V01–V02). 그런데 plan-smith 1.6.0 `references/split.md` 와
ux-ui `skills/build-mobile/references/backend-detection.md` 는 **스킬이 Read로 나중에 여는 파일** 안에 같은 변수를 쓴다.
그 파일에도 치환이 일어나는지는 재지 않았다 — 이 실험이 잰다.

## 설계 (고정)

- 최소 플러그인 `probe`: `scripts/hello.sh` 는 `echo HELLO-MARK <자기 경로>`. 스킬 `hello` 의 SKILL.md 본문에는 변수가 **없다**. 본문은
  "이 스킬 폴더의 `references/steps.md` 를 Read로 읽고 거기 적힌 명령을 그대로 실행하라"만 말하고, 스킬 폴더 경로는
  Claude Code가 스킬 로드 때 붙이는 base directory 줄로 안다.
- `references/steps.md`: `bash "${CLAUDE_PLUGIN_ROOT}/scripts/hello.sh"` 한 줄을 그대로 실행하라고 지시.
- 호출: `claude -p "/probe:hello" --plugin-dir <probe> --setting-sources project --allowedTools Bash Read --model haiku --max-turns 6`, 3회.
- 관측(구조적): Read `tool_result` 에 리터럴 `${CLAUDE_PLUGIN_ROOT}` 가 남아 있는가(파일이 치환 없이 읽힘); 모델이 낸 Bash `command`
  에 리터럴 변수가 있는가 절대 경로가 있는가; 결과에 `HELLO-MARK` 가 있는가, 아니면 `/scripts/hello.sh` 없음 오류인가.

## 측정하지 않는 것

대화형 세션, 다른 모델, 모델이 오류를 보고 스스로 경로를 찾아 복구하는 빈도(관측되면 기록만 한다).
