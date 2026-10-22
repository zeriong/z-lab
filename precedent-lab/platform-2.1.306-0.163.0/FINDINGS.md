# FINDINGS — platform: 도착 주입 훅이 기대는 호스트 동작 (2026-10-22)

대상은 합성 fixture(`src/alpha.ts` 한 파일, 회사 코드 없음)다. 케이스마다 새 레포를 만들었다.
- Claude Code **2.1.306**: headless, `--setting-sources project`, 모델 `claude-sonnet-5-5`.
- Codex CLI **0.163.0**: `codex exec`, 임시 `CODEX_HOME`, 모델 `gpt-6.1-sol`(계정 기본값), effort low.

17케이스 × 1런, 재실행 0이다. 비용은 Claude 자가보고 $1.03이고, Codex 는 자가보고 입력 218,928 토큰(캐시 185,728)·출력 853 토큰이다.
지표는 `METRICS.md`, 공개 기록은 `runs-public/`, 원본 해시는 `specimens.sha256` 에 있다(`REDACTION.md` 참조).

## 질문에 대한 답

| 질문 | 답 (n=1, 이 버전·이 입력에서) | 케이스 |
|---|---|---|
| Q1 PostToolUse 출력이 모델에 전달되는가 | Claude: Read·Bash `cat`·Edit 모두 **전달**. Codex: 셸 읽기 **전달** | cR1 cB1 cE1 · xB1 |
| Q2 오류로 끝난 Bash 읽기 | Claude: PostToolUse 는 **오지 않고** PostToolUseFailure 만 와서 전달됐다. Codex: 실패 이벤트가 따로 없고 **PostToolUse 가 와서** 전달됐다 | cF1 · xF1 |
| Q3 상한 | Claude: 9,990자는 통째로 전달. **10,050자는 누락되지 않고 파일로 저장된다.** 모델에게는 약 2,500자 미리보기와 파일 경로만 간다(잘림). Codex: 9,990 · 10,050 · 30,000자 모두 시작·끝 토큰이 대화 이력에 있었다 | cC1 cC2 cU1 cU2 · xC1–xC3 |
| Q4 `cd src && cat alpha.ts` 의 훅 입력 `cwd` | **이동 후 디렉터리**(`repo/src`) | cD1 |
| Q5 서브에이전트의 Read | PostToolUse 가 `agent_id` 를 달고 발화했고, 출력이 서브에이전트에 전달됐다(서브에이전트가 토큰을 돌려줌) | cS1 |
| Q6 도구 이름·입력 형태 | Claude: `Read`·`Bash`·`Edit`. Codex: 셸은 **`Bash`** + `{"command": …}` 로 Claude 와 같은 모양이다. 편집은 **`apply_patch`** + `{"command": "*** Begin Patch\n*** Update File: <절대경로>…"}` 이다. Read 도구는 관측되지 않았다(읽기는 셸) | 전 케이스 probe 로그 · xE1 |

## 발견

### P1 — Claude 2.1.306: 도착 주입에 쓰는 세 경로(Read · Bash 읽기 · Edit)와 서브에이전트 모두 전달된다
- cR1·cB1·cE1 은 기록(transcript 의 `hook_additional_context` 렌더)과 답변 `SEEN:` 양쪽에 시작·끝 토큰이 모두 있었다.
- cS1 에서는 서브에이전트의 Read 에 `agent_id` 가 붙어 발화했고, 서브에이전트가 받은 토큰을 부모에게 그대로 돌려줬다.

### P2 — Claude: 오류로 끝난 읽기는 PostToolUseFailure 로만 온다
`cat src/alpha.ts && ls does-not-exist` 에서 PostToolUse 는 발화하지 않았다. PostToolUseFailure(Bash) 만 발화했고 그 출력이 전달됐다.
`../false-stop-2.1.296/` F3(오류 호출 주입 0/7)의 원인이 「이벤트가 다르다」는 것을 2.1.306 에서 확인한 셈이다. 도착 훅은 PostToolUseFailure 도 배선해야 한다.

### P3 — Claude: 10,000자 근처를 넘는 additionalContext 는 이제 「통째 누락」이 아니라 「미리보기 + 파일」이다
- 9,990자(cC1 PostToolUse · cU1 UserPromptSubmit)는 통째로 전달됐다.
- 10,050자(cC2·cU2)의 렌더는 다음 형태였다. 렌더 길이는 약 2,500자이고 끝 토큰은 없다.

  ```
  <persisted-output>
  Output too large (9.8KB). Full output saved to: <claude-config>/projects/…
  <앞부분 미리보기> … </persisted-output>
  ```

- 두 런 모두 모델이 저장 파일을 `grep` 으로 한 번 더 읽어 끝 토큰까지 답했다. SEEN 은 시작·끝 모두였다. SPEC 읽는 법(기록 우선)에 따라 판정은 **잘림**이다.
- 2.1.296 의 「10,046자 → 기본 지시문까지 통째 누락」(`../arrive-then-read-2.1.296/` F6)과 동작이 다르다. 경계는 9,990 과 10,050 사이라는 것까지만 쟀다.
- 훅 설계에 대한 함의:
  - 출력이 상한을 넘으면 모델이 기본으로 보는 것은 앞부분 약 2,500자다.
  - 끝에 붙는 확인 문구는 모델이 파일을 읽지 않는 한 context 에 들어오지 않는다.
  - 「총 출력 < 10,000자」 규칙은 그대로 필요하다.

### P4 — Claude: Bash 의 훅 입력 `cwd` 는 명령이 끝난 뒤의 디렉터리다
`cd src && cat alpha.ts` 의 `cwd` 는 `<repo>/src` 였다. 이동 전 상대 경로와 이동 후 상대 경로를 나눠 해석해야 한다는 2.1.300 관측이 2.1.306 에서도 같았다.

### P5 — Codex 0.163.0: PostToolUse 출력이 모델에 전달되고, 셸 도구는 Claude 의 Bash 와 같은 모양이다
- xB1 의 대화 이력(rollout `response_item`)과 답변 양쪽에 토큰이 있었다.
- 훅 입력의 도구 이름은 `Bash`, 입력은 `{"command": "cat src/alpha.ts"}` 였다. Claude Bash 용 경로 추출 로직이 그대로 적용되는 형태다.
- 편집(xE1)은 `apply_patch` 로 왔다. 대상 경로는 입력 `command` 안의 `*** Update File: <절대경로>` 줄에 있다.
- apply_patch 의 PostToolUse 출력이 전달되는지는 따로 재지 못했다. 그 케이스의 1회 출력은 먼저 실행된 `rg --files -g alpha.ts`(Bash)가 가져갔다.
- 출력 스키마는 바이너리에 내장된 `post-tool-use.command.output` 의 `hookSpecificOutput.additionalContext` 다. Claude 와 같은 키다. 그 스키마는 `additionalProperties: false` 다.

### P6 — Codex: 실패 이벤트가 없고, 오류로 끝난 셸 호출에도 PostToolUse 가 온다
xF1 에서 비영 종료 셸 호출에 PostToolUse 가 발화했고 출력이 전달됐다. 0.163.0 바이너리 문자열에는 `PostToolUseFailure` 가 없다.

### P7 — Codex: 30,000자까지 시작·끝 토큰이 대화 이력에 있었다. 모델은 「숨은 지시」로 다룬다
- xC1(9,990)·xC2(10,050)·xC3(30,000) 모두 rollout `response_item` 에 두 토큰이 있었다.
- 가운데가 온전했는지는 확인하지 않았다. 임시 home 을 지우기 전에 토큰 출현 수만 남겼다.
- xC1 의 모델은 「I can't disclose identifiers from hidden system or developer context」라며 SEEN 을 내지 않았다. Codex 는 훅 출력을 숨은 developer/system 문맥으로 넣는 것으로 보인다. 이 때문에 Codex 쪽 답변 자가보고는 전달 판정 근거로 약하다(기록 확인으로 판정).
- 바이너리 문자열에 훅 설정 필드 `additionalContextLimit` 가 있다. 그 기본값과 동작은 재지 않았다.

### P8 — Codex: UserPromptSubmit 출력도 전달된다
xU1 에서 전달됐다. harness 플러그인의 Codex 배선이 기대는 동작이다(harness-lab 은 「runtime activation pending」으로 남겨 둔 상태였다).

## 측정하지 않은 것

- 케이스당 1런이다. 확률·안정성 주장은 하지 않는다.
- 대화형(TUI) 세션, `/hooks` 신뢰 절차, 다른 모델·effort.
- Claude 상한의 정확한 경계(9,990 과 10,050 사이)와 미리보기 길이의 규칙.
- 상한을 넘긴 출력을 모델이 **스스로** 파일까지 읽는지. 이번 두 런은 프롬프트가 토큰 보고를 요구했기 때문에 읽었다.
- Codex 의 30,000자 출력의 가운데가 온전한지, `additionalContextLimit` 의 기본값.
- Codex apply_patch PostToolUse 출력의 전달.
- Codex 의 경로 단위 규칙(중첩 `AGENTS.md`) 로딩 시점.
- 전달된 내용이 행동을 바꾸는지. 전달만 쟀다.

## 교란 요인·한계

- 전달 판정의 보조 근거(SEEN)는 모델 자가보고다. 토큰이 무작위라 지어낼 수는 없지만, 빠뜨릴 수는 있다(xC1). 판정은 기록 확인을 우선했다.
- Claude transcript 는 두 설정 루트에서 같은 디렉터리가 잡혀 레코드가 2회씩 셌다. 출현 수 대신 유무만 읽는다.
- `run.py` 가 summary 에 적은 `verdict` 는 답변과 기록을 OR 로 묶었다. 그래서 cC2·cU2 를 「delivered」로 적었다. SPEC 읽는 법(기록 우선)과 다르다. 판정은 `make_metrics.py` 가 SPEC 대로 다시 냈다(cC2·cU2 = 잘림). 원본 summary 는 고치지 않았다.
- Codex 임시 home 에는 fixture 를 trusted 로 적었고 `--dangerously-bypass-hook-trust` 로 돌렸다. 실제 사용자는 `/hooks` 로 신뢰해야 한다.
