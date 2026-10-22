# SPEC — platform: 도착 주입 훅이 기대는 호스트 동작 재확인 (2026-10-22 고정)

실행 시작 전에 고정한다. 바꾸면 새 실험이다(제3조).
요청처는 because-i-needed `CONTEXT-RAIL-PLUGIN-PLAN.md`(미커밋 초안)의 G2·G3이다. context rail 을 플러그인으로 내기 전에, 훅이 기대는 호스트 동작을 현재 CLI 로 직접 돌려 본다. because-i-needed Rule 9 의 「run it, don't recall it」에 해당한다.

## 왜

- 앞선 측정은 Claude Code 2.1.296·2.1.300 에서 했다. 지금 설치본은 **2.1.306** 이다. 다음 세 가지는 다시 돌려 봐야 쓸 수 있다.
  - additionalContext 10,000자 상한: `../arrive-then-read-2.1.296/` F6(UserPromptSubmit)
  - 오류 종료 Bash 의 주입 누락: `../false-stop-2.1.296/` F3
  - `cd` 뒤 훅 입력 `cwd`: 회사 레포 기록, 2.1.300
- Codex 는 0.162.1 에서 PostToolUse **발화**만 확인됐다(`free-hands-lab/session-id-0.3.0/` S01). 훅 출력이 모델에 **전달되는지**는 잰 적이 없다. harness-lab 도 「runtime activation pending」으로 남겼다.
- 0.163.0 바이너리 문자열에는 다음이 보인다. 문자열일 뿐이고 동작은 확인하지 않았다.
  - 이벤트 이름 `PreToolUse PermissionRequest PostToolUse PreCompact PostCompact SessionStart SessionEnd SubagentStart SubagentStop`
  - `additionalContextLimit`
  - `PostToolUseFailure` 는 없다

## 질문

- Q1. PostToolUse(Read·Bash 읽기·Edit)의 additionalContext 가 모델에 전달되는가. Claude, Codex 각각.
- Q2. 오류로 끝난 Bash 읽기에서 어떤 이벤트가 오고, 그 출력이 전달되는가. Claude 는 PostToolUseFailure 를 함께 등록한다.
- Q3. 상한: 9,990자 / 10,050자(Codex 는 30,000자 추가) additionalContext 가 전달되는가, 잘리는가, 통째로 누락되는가. PostToolUse 와 UserPromptSubmit 각각.
- Q4. `cd src && cat alpha.ts` 에서 훅 입력 `cwd` 는 이동 전 디렉터리인가, 이동 후 디렉터리인가(Claude).
- Q5. 서브에이전트의 Read 에도 PostToolUse 가 발화하고 출력이 서브에이전트에 전달되는가(Claude).
- Q6. 훅 입력에 담긴 도구 이름과 입력 형태. 특히 Codex 의 파일 읽기·편집 도구.

## 고정 조건

- **fixture**(합성, 회사 코드 없음)
  - 케이스마다 새 git 레포를 scratchpad 아래에 만든다.
  - 파일은 `src/alpha.ts`(`export const alpha = 1;`) 와 `README.md` 한 줄뿐이다.
  - 훅 설정: Claude 는 `.claude/settings.json`, Codex 는 `.codex/hooks.json`.
- **probe 훅**(`probe_hook.py`)
  - 모든 이벤트 입력을 케이스 폴더의 `probe.jsonl` 에 기록한다. 이벤트, 도구 이름, 도구 입력, `cwd`, `session_id`, `agent_id`, 오류 표시를 남긴다.
  - 출력은 케이스가 지정한 이벤트·도구에서, 도구 입력에 `alpha.ts` 가 있을 때만 낸다. 이벤트·도구 조합당 1회다.
  - additionalContext 는 정확히 N자로 만든다: 시작 토큰 `ZQ-<8 hex>` + 채움 문장 + 끝 토큰 `ZQ-<8 hex>`.
  - 토큰은 케이스·이벤트마다 무작위로 만든다. fixture 안에는 두지 않고 케이스 폴더의 `case.json` 에만 둔다.
- **전달 판정**(두 줄)
  - ① 모델 답변의 마지막 줄 `SEEN:` 에 그 토큰이 있는가. 무작위 토큰이라 추측할 수 없다. 누락(거짓 음성)은 가능하다.
  - ② 대화 기록 확인. 훅의 원래 stdout 이 아니라 **모델에게 보이는 기록**만 센다.
    - Claude: 세션 transcript jsonl(서브에이전트 포함)에서 `attachment.type == hook_additional_context` 인 레코드의 `rendered` 를 본다. stream-json 의 훅 이벤트에는 훅 stdout 이 그대로 들어 있어 전달 근거가 되지 못하므로 세지 않는다.
    - Codex: 임시 `CODEX_HOME` 의 세션 rollout 에서 `type == response_item` 인 줄(모델 대화 이력)만 본다.
  - ① 또는 ② 에서 토큰이 나오면 「전달」로 본다. 시작 토큰만 나오면 「잘림」, 둘 다 없으면 「누락」이다.
- **Claude**
  - 실행: `claude -p <prompt> --model sonnet --setting-sources project --permission-mode bypassPermissions --output-format stream-json --verbose --include-hook-events --max-turns 8 --max-budget-usd 1`
  - fixture 를 cwd 로 둔다. 사용자 설정·플러그인은 끈다(`--setting-sources project`).
  - 플랫폼 동작이 측정 대상이므로 모델은 sonnet 별칭을 쓴다. 실제 id 는 init 레코드에서 적는다.
- **Codex**
  - 실행: `codex exec --json --dangerously-bypass-hook-trust -s workspace-write -C <fixture> -c model_reasoning_effort="low" <prompt>`
  - 임시 `CODEX_HOME` 에는 계정 `auth.json` 사본만 두고(원본 sha256 을 전후로 대조), `config.toml` 은 fixture 경로를 trusted 로 적은 한 줄만 둔다.
  - 모델은 계정 기본값이다(실제 id 는 run 기록에서 적는다).
  - 끝나면 임시 home 을 지운다.
- **공통**
  - 케이스당 1런이다.
  - 실행 오류(인증·네트워크)일 때만 같은 조건으로 1회 재실행하고 기록한다.
  - 상태 인지형으로 돈다. `runs/<case>/summary.json` 이 있으면 건너뛴다.

## 케이스 (실행 전 고정)

프롬프트 꼬리(공통):

> Then end your reply with exactly one line: `SEEN:` followed by every string of the form `ZQ-` plus 8 hex characters that you received in this session from anything other than this prompt (for example hook or system context), separated by spaces — or `SEEN: none`.

| 케이스 | 호스트 | 출력 이벤트·도구 | N자 | 행동 |
|---|---|---|---:|---|
| cR1 | Claude | PostToolUse · Read | 400 | Use the Read tool to read src/alpha.ts. |
| cB1 | Claude | PostToolUse · Bash | 400 | Use the Bash tool to run exactly: `cat src/alpha.ts` |
| cF1 | Claude | PostToolUse·PostToolUseFailure · Bash(이벤트별 다른 토큰) | 400 | Use the Bash tool to run exactly: `cat src/alpha.ts && ls does-not-exist` |
| cD1 | Claude | PostToolUse · Bash | 400 | Use the Bash tool to run exactly: `cd src && cat alpha.ts` |
| cE1 | Claude | PostToolUse · Edit | 400 | Read src/alpha.ts, then use the Edit tool to change `1` to `2` in it. |
| cS1 | Claude | PostToolUse · Read | 400 | Use the Agent tool with subagent_type general-purpose. Tell the subagent to use the Read tool on src/alpha.ts and to return, verbatim, every string of the form `ZQ-` plus 8 hex characters it received from anything other than its prompt. Report what it returned. |
| cC1 | Claude | PostToolUse · Read | 9,990 | cR1 과 같음 |
| cC2 | Claude | PostToolUse · Read | 10,050 | cR1 과 같음 |
| cU1 | Claude | UserPromptSubmit | 9,990 | Reply with ok. |
| cU2 | Claude | UserPromptSubmit | 10,050 | Reply with ok. |
| xB1 | Codex | PostToolUse · (셸 도구 전부) | 400 | Run exactly this shell command: `cat src/alpha.ts` |
| xF1 | Codex | PostToolUse · (셸 도구 전부) | 400 | Run exactly this shell command: `cat src/alpha.ts && ls does-not-exist` |
| xE1 | Codex | PostToolUse · (모든 도구) | 400 | Change `1` to `2` in src/alpha.ts. |
| xC1 | Codex | PostToolUse · (셸) | 9,990 | xB1 과 같음 |
| xC2 | Codex | PostToolUse · (셸) | 10,050 | xB1 과 같음 |
| xC3 | Codex | PostToolUse · (셸) | 30,000 | xB1 과 같음 |
| xU1 | Codex | UserPromptSubmit | 400 | Reply with ok. |

- Codex 는 도구 이름을 미리 모르므로, `alpha.ts` 가 들어간 PostToolUse 이면 도구와 상관없이 출력한다(Q6 은 로그로 답한다).
- Codex 훅 설정에 matcher 는 쓰지 않는다.

## 읽는 법 (실행 전 고정)

- 「전달」 / 「잘림」 / 「누락」 / 「미발화」(probe 로그에 이벤트 없음)로 케이스마다 하나를 적는다.
- n=1 이므로 확률 주장은 하지 않는다. 「이 버전에서 이 입력으로 이렇게 동작했다」만 적는다.
- `SEEN:` 과 기록 확인이 엇갈리면 둘 다 적고, 기록 확인을 우선한다.

## 측정하지 않는 것

- 대화형(TUI) 세션, `/hooks` 로 신뢰한 훅, 다른 모델·effort.
- 오류 종료 외의 실패(권한 거부·타임아웃).
- Codex 의 경로 단위 규칙(중첩 `AGENTS.md`) 로딩 시점.
- 주입 내용이 행동을 바꾸는지. 전달만 잰다.
