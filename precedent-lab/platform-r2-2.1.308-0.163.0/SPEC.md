# SPEC — platform r2: 경로 규칙 로딩(Claude) · apply_patch·중첩 AGENTS.md·상한(Codex) (2026-10-22 고정)

실행 시작 전에 고정한다. 바꾸면 새 실험이다(제3조).
because-i-needed `CONTEXT-RAIL-PLUGIN-PLAN.md` 의 G2b(Claude 경로 규칙)·G3 잔여(Codex)를 잰다. `context-rail:build` 는 「경로 규칙」을 Claude 에서는 `.claude/rules/*.md`(`paths:`)로, Codex 에서는 중첩 `AGENTS.md` 로 보낸다. 그 둘이 언제 어떤 형태로 모델에 들어오는지 잰 적이 없다.
CLI 가 2.1.308 로 올라갔으므로 `../platform-2.1.306-0.163.0/` P3(상한 → 미리보기 + 파일)도 다시 본다.

## 고정 조건

- fixture: 케이스마다 새 git 레포. `src/tabs/a.ts`, `src/tabs/big.ts`, `src/other/b.ts`, `src/alpha.ts`(각 한 줄)를 둔다.
- **Claude 규칙 파일**(케이스 폴더의 무작위 토큰을 내용에 넣는다)
  - `.claude/rules/tabs.md`: `paths: ["src/tabs/**"]`, 토큰 TA
  - `.claude/rules/other.md`: `paths: ["src/other/**"]`, 토큰 TB
  - `.claude/rules/always.md`: `paths:` 없음, 토큰 TC
  - `.claude/rules/big.md`: `paths: ["src/tabs/big.ts"]`. 앞에 토큰 TD1, 끝에 토큰 TD2 를 두고 전체 12,000자로 채운다.
- **Codex**: `src/AGENTS.md` 에 토큰 TN 을 둔다. 루트 `AGENTS.md` 는 없다.
- 훅은 `../platform-2.1.306-0.163.0/probe_hook.py` 와 같은 방식이다. 이 폴더의 사본이며, 케이스가 지정한 이벤트·도구에서만 정확히 N자를 낸다.
- 실행 조건은 `../platform-2.1.306-0.163.0/` 과 같다.
  - Claude: `claude -p … --model sonnet --setting-sources project --permission-mode bypassPermissions --output-format stream-json --verbose --include-hook-events --max-turns 8 --max-budget-usd 1`
  - Codex: 임시 `CODEX_HOME`(auth 사본, fixture trusted), `codex exec --json --dangerously-bypass-hook-trust -s workspace-write -c model_reasoning_effort="low"`
- 케이스마다 CLI 버전과 모델을 `summary.json` 에 적는다.
- **판정**
  - Claude: 토큰이 세션 transcript 에서 「모델에게 보이는 레코드」에 있는가를 본다. 도구 결과로 규칙 파일을 직접 읽은 경우는 따로 표시하고 「로딩」으로 세지 않는다. 레코드 유형(`type`·`attachment.type`)도 적는다.
  - Codex: 토큰이 rollout 의 `response_item` 에 있는가를 본다.
  - 답변의 `SEEN:` 줄은 보조다.

## 케이스

| 케이스 | 호스트 | 행동 | 무엇을 보나 |
|---|---|---|---|
| rN | Claude | Reply with ok. | 시작 시 로딩: TC 만 있어야 하는가 |
| rR | Claude | Use the Read tool to read src/tabs/a.ts. | TA 가 들어오는가, TB 는 안 들어오는가 |
| rB | Claude | Use the Bash tool to run exactly: `cat src/tabs/a.ts` | Bash 읽기에도 TA 가 들어오는가 |
| rW | Claude | Use the Write tool to create src/tabs/new.ts containing `export const n = 1;` (do not read anything first). | 먼저 읽지 않은 쓰기에도 TA 가 들어오는가 |
| rS | Claude | Use the Read tool to read src/tabs/big.ts. | 12,000자 규칙: TD1·TD2 둘 다 들어오는가, 미리보기로 바뀌는가 |
| rC | Claude | Use the Read tool to read src/alpha.ts.(PostToolUse 훅이 10,050자를 낸다) | 2.1.308 의 훅 상한 동작 |
| xP | Codex | Change `1` to `2` in src/alpha.ts. Use apply_patch for the edit.(PostToolUse 훅은 `apply_patch` 에서만 400자를 낸다) | apply_patch 이벤트의 출력 전달 |
| xN0 | Codex | Reply with ok. | 중첩 `src/AGENTS.md` 가 시작 시 로딩되는가 |
| xN1 | Codex | Run exactly this shell command: `cat src/alpha.ts` | 하위 파일을 읽을 때 `src/AGENTS.md` 가 로딩되는가 |
| xL | Codex | Run exactly this shell command: `cat src/alpha.ts`(훅이 100,000자를 낸다) | 상한: 대화 이력의 그 항목 길이와 끝 토큰 |

프롬프트 꼬리는 앞 실험과 같다(`SEEN:` 줄).

## 읽는 법 (실행 전 고정)

- 「로딩됨」 / 「안 됨」 / 「직접 읽음」(도구 결과로만 나옴)으로 적는다.
- n=1 이다. 「이 버전·이 입력에서 이렇게 동작했다」만 쓴다.

## 측정하지 않는 것

- 대화형 세션, `/hooks` 신뢰 절차, 다른 모델.
- `paths:` glob 문법의 세부(중괄호·부정).
- 규칙이 행동을 바꾸는지. 전달만 잰다.
