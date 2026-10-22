# FINDINGS — platform r2: Claude 경로 규칙 로딩, 2.1.308 훅 상한 (2026-10-22, Codex 부분 대기)

대상: 합성 fixture. Claude Code **2.1.308**, `claude-sonnet-5-5`, `--setting-sources project`.
Claude 6케이스 × 1런을 돌렸고, 자가보고 비용은 `runs-public/*/summary.json` 의 `cost_usd` 합이다.
Codex 4케이스는 계정 사용량 한도로 실행 오류였다. 결과가 아니며 재실행 대기다(`RUNLOG.md`).

## 질문에 대한 답 (Claude)

| 케이스 | 행동 | `paths:` 규칙(TA `src/tabs/**`) | 다른 규칙(TB `src/other/**`) | `paths:` 없는 규칙(TC) |
|---|---|---|---|---|
| rN | 아무 파일도 건드리지 않음 | 안 들어옴 | 안 들어옴 | 시작 시 `attachment/instructions` |
| rR | Read `src/tabs/a.ts` | **들어옴** — `attachment/nested_memory`, 그 도구 결과에 붙음 | 안 들어옴 | 시작 시 |
| rB | Bash `cat src/tabs/a.ts` | **들어옴** — 같은 형태 | 안 들어옴 | 시작 시 |
| rW | 읽지 않고 Write `src/tabs/new.ts` | **들어옴** — 같은 형태 | 안 들어옴 | 시작 시 |
| rS | Read `src/tabs/big.ts`(규칙 12,000자) | 앞뒤 토큰 모두 들어옴(통째) | — | 시작 시 |

- 모든 케이스에서 에이전트가 `.claude/rules/` 를 직접 연 도구 호출은 0이다. 들어온 것은 하네스의 로딩이다.

## 발견

### Q1 — `paths:` 규칙은 맞는 파일에 처음 닿는 순간 도구 결과에 붙어 들어온다
- Read 뿐 아니라 Bash `cat`, 먼저 읽지 않은 Write 에서도 들어왔다.
- 형태는 `nested_memory` 첨부다. 시작 시점에는 들어오지 않는다.
- `paths:` 가 없는 규칙은 시작 시 `instructions` 로 들어온다. 상주 문서와 같은 비용이다.
- 결론: context-rail 의 「경로 규칙」 목적지(`.claude/rules/*.md` + `paths:`)는 도착형으로 동작한다. 단, `paths:` 를 빠뜨리면 상주가 된다. `records-lint`·`audit` 이 확인할 항목이다.

### Q2 — 규칙 첨부에는 훅의 10,000자 상한이 적용되지 않았다
12,000자 규칙의 앞뒤 토큰이 모두 같은 `nested_memory` 첨부에 있었다.

### Q3 — 2.1.308 의 훅 상한 동작은 2.1.306 과 같다
- PostToolUse 10,050자는 렌더 2,511자의 `persisted-output`(미리보기 + 파일 경로)였다.
- 끝 토큰은 모델이 저장 파일을 읽은 도구 결과에서만 나왔다(`../platform-2.1.306-0.163.0/` P3 와 같음).

## 측정하지 않은 것

- Codex 4케이스(apply_patch 전달, 중첩 `AGENTS.md`, 100,000자 상한). 재실행 대기.
- 대화형 세션, 다른 모델, glob 문법 세부, 규칙이 행동을 바꾸는지.
- 같은 규칙이 한 세션에서 두 번째로 닿을 때 다시 붙는지.
- n=1 이다.
