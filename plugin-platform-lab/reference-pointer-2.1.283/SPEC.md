# reference-pointer-2.1.283 — reference 파일이 SKILL.md의 경로를 가리키면 스크립트가 실행되나 (실행 전 고정)

## 왜

[`../reference-plugin-root-2.1.283/`](../reference-plugin-root-2.1.283/) V03: reference 파일에 적은 `${CLAUDE_PLUGIN_ROOT}` 는 치환되지 않아 명령이
깨진다. because-i-needed는 이를 두 방식으로 피한다. 두 방식이 실제로 스크립트를 실행하는지는 재지 않았다 — 이 실험이 잰다.

- **arm `pointer`** (plan-smith 1.6.0 `references/split.md` 3단계): SKILL.md의 한 절에 중괄호 명령이 있고, reference는 "SKILL.md의 그 절의
  명령을 실행하라"고만 말한다.
- **arm `alias`** (claude-x-codex `run`): SKILL.md가 "`<plugin>` 은 플러그인 루트 — Claude Code에서는 `${CLAUDE_PLUGIN_ROOT}`, 그 밖에서는 이 스킬
  폴더에서 `../..`"라고 정의하고(`run` SKILL.md 11–12행과 같은 문장), reference는 `bash "<plugin>/scripts/hello.sh"` 를 쓴다.

## 설계 (고정)

- 최소 플러그인 `probe`: `scripts/hello.sh` 는 `echo HELLO-MARK <자기 경로>`. 스킬 `hello` 의 SKILL.md는 "`references/steps.md` 를 Read로 읽고
  따르라"를 포함한다. 두 arm은 위의 문장만 다르다.
- 호출: `claude -p "/probe:hello" --plugin-dir <probe> --setting-sources project --allowedTools Bash Read --model haiku --max-turns 6`,
  arm마다 3회. 두 arm을 번갈아 실행한다(pointer r1, alias r1, pointer r2 …).
- 관측(구조적): 첫 Bash `command` 에 절대 경로가 있는가, 리터럴 `${CLAUDE_PLUGIN_ROOT}` 나 `<plugin>` 이 남아 있는가; 첫 Bash 결과에
  `HELLO-MARK` 가 있는가; Bash 호출 수; 입력 토큰(input + cache_creation + cache_read), `duration_ms`, 비용(CLI 자가보고).
- 판정: arm마다 **첫 Bash 호출이 `HELLO-MARK` 를 낸 run 수**를 센다. 3/3이면 그 방식은 이 조건에서 동작한다고 적는다.

## 측정하지 않는 것

대화형 세션, haiku 외 모델, 실제 plan-smith·claude-x-codex 스킬 본문(여기서는 그 문장만 옮겨 온 최소 스킬), 긴 세션에서 SKILL.md가
컨텍스트에서 멀어진 뒤의 동작.
