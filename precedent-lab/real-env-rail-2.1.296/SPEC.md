# SPEC — real-env-rail: 실사용 환경에서 graphify → 도착 → PRECEDENT 사슬 (2026-10-13 고정)

이 문서는 실행 시작 전에 고정한다. 실행 뒤 바꾸면 새 실험이다(제3조).

## 왜 새 계열인가

`../arrive-then-read-2.1.296/`(10-10, 104런)은 전부 `--setting-sources project` 로 돌았다. 그래서 다음이 **한 번도 들어가지 않았다**:
사용자 설정(effort `xhigh`·language `korean`·advisor), 사용자 플러그인 13개(SessionStart·UserPromptSubmit·Stop 훅 포함), auto-memory(`MEMORY.md` 28,044B·파일 124개).
사용자가 묻는 「memory 와 기타 설정에 끌려가고 PRECEDENT 는 도중에만 읽히는 현재 흐름」은 바로 이 빠진 조건이다.

## 고정 조건

- 대상: 비공개 EHR 레포 커밋 `REDACTED-commit`(10-10 실험과 같은 커밋). 표본은 `~/.cache/precedent-lab/real-env-rail/` 에만 두고 이 저장소에 두지 않는다.
- fork: arm 마다 독립 `git clone`(remote 제거 → push 불가). memory 경로는 clone 경로에서 파생된다(`-Users-jeonjelyong--cache-precedent-lab-real-env-rail-wt-<arm>`).
- 호스트: Claude Code 2.1.296 headless `claude -p`, `--dangerously-skip-permissions`, `--max-turns 40`, `--max-budget-usd 4`, 1500s 타임아웃, stdin `/dev/null`.
- 모델: 사용자 설정 `opus` → 트랜스크립트 `init.model` 로 확인(카나리: `claude-opus-5-5`).
- 실행 환경: `env -i` 로 HOME·USER·SHELL·TERM·LANG·TMPDIR·PATH 만 넘긴다. 이 세션의 `ORCA_*`·`CLAUDE_CODE_*` 를 넘기면 사용자 훅이 Orca 로 이벤트를 보내고, 자식 세션으로 묶이기 때문이다.
- 구조적 금지(`--disallowedTools`, 전 arm 동일): `Bash(git commit:*)` `Bash(git push:*)` `Bash(gh:*)` `Bash(pnpm:*)` `Bash(npm:*)` `Bash(npx:*)` `Bash(codex:*)` `Bash(orca:*)` 와 브라우저 MCP 서버 4개(`mcp__plugin_chrome-devtools-mcp_chrome-devtools` `mcp__plugin_ux-ui_chrome-devtools` `mcp__plugin_ux-ui_mobile-mcp` `mcp__plugin_ux-ui_ios-simulator`), `mcp__claude-in-chrome`. 실환경 재현보다 외부 부작용 차단을 우선한 이탈이다.
- 과제: `tasks.json` = 10-10 r3 와 바이트 동일(sha256 앞 16자 `dd269c992128c4c8`). 함정 T1~T5, 구조 R1·R2.

## arm (누적 — 각 arm 은 앞 arm 에서 한 가지만 바꾼다)

| arm | 이전 arm 대비 변경 | 상주 | 도착 훅 | 그래프 |
|---|---|---|---|---|
| **R** real | — (현재 레포·사용자 환경 그대로) | 사용자+프로젝트+로컬 설정, 플러그인 13, memory 사본 | 현행 `precedent-context.sh` (Read\|Edit\|Write, 포인터 ≤400B) | 메인 체크아웃의 `graphify-out` 사본(10-06 빌드, 9,623노드) |
| **I** inject | 도착 훅을 `hooks/precedent-inject.py` 로 교체 | R 과 같음 | Read\|Edit\|Write\|MultiEdit\|Bash, **절 본문** 주입(≤6,000자, 넘으면 결정·금지 줄 압축) | R 과 같음 |
| **L** lean | `.claude/settings.local.json` 에 `autoMemoryEnabled:false` + 사용자 플러그인 13개 `false` | 사용자+프로젝트 설정, 플러그인 0, memory 끔 | I 와 같음 | R 과 같음 |
| **G** graph-route | 그래프를 `REDACTED-commit` 에서 `graphify update .` 로 재빌드(10,069노드) + 루트 `CLAUDE.md` 14행 교체 | L 과 같음 | I 와 같음 | 최신 |

G 의 루트 `CLAUDE.md` 14행:
- 현행: `` - `explain`/`path` 를 `query` 보다 먼저. 심볼·문자열을 이미 알면 grep/Read 가 빠르다. ``
- G: `` - 편집·점검 대상 파일을 아직 모르면 grep 전에 `graphify explain`/`query` 로 후보 경로를 먼저 찾는다. 경로를 안 뒤의 값·시그니처 확인은 grep/Read. ``

G 는 그래프 갱신과 라우팅 문장 두 가지를 함께 바꾼다. 다만 결정론 probe(`evidence/graphify-probe.md`)에서 두 그래프의 도달 결과가 7과제 모두 같았으므로, G 와 L 의 차이는 라우팅 문장으로 귀속한다. 이 귀속은 probe 에 기댄 것이라 한계로 적는다.

## 반복·순서

- 4 arm × 7 과제 × 3회 = 84런(사용자 결정 2026-10-13). arm 4개는 clone 별로 병렬로 돌리고, arm 안에서는 과제 순서대로 순차 실행한다. 런마다 clone 을 `git checkout -- .` + `git clean` 으로 되돌린 뒤 arm 설정을 다시 적용한다.
- P0(사전 계측, 과제 없음): `Reply with exactly: ok` 를 5개 설정 × 2회 → 첫 턴 상주 토큰을 분해한다.
  `p-full`(R) · `p-nomem` · `p-noplug` · `p-lean`(L) · `p-proj`(`--setting-sources project`, 10-10 조건).

## 지표 (실행 전 고정)

런마다 트랜스크립트(stream-json)와 훅 로그에서 기계적으로 뽑는다.

1. **상주**: 첫 assistant 메시지의 `input + cache_creation + cache_read` 와 SessionStart·UserPromptSubmit 훅 출력 글자 수.
2. **사슬 순서**: 도구 호출 순번으로 다음을 잰다.
   - ① 첫 graphify 호출
   - ② 대상 파일 첫 접촉(`tasks` 의 대상 경로 문자열이 처음 들어간 호출)
   - ③ PRECEDENT 가 context 에 들어온 시점
     - 주입 훅 출력 — 훅 로그의 `tool_use_id` → 호출 순번
     - 현행 훅 발화 — 세션 마커
     - 에이전트가 관할 PRECEDENT.md 를 직접 읽은 호출
   - ④ 첫 편집(Edit/Write/MultiEdit, 또는 `sed -i`·`>`·`tee`·`python` 으로 대상 파일을 쓴 Bash)
   - 「의도한 사슬」 = ③이 ④보다 앞서고, ③과 ②의 간격이 1호출 이하
3. **결과**: diff 와 위반 시그니처로 1차 판정 → 별도 판정 세션(arm 정보 없이 diff·최종 답변·과제·관할 결정만 받는다)이 확정한다. 판정 범주는 10-10 r3 와 같다: VIOLATED / DECLINED / RECORDED-VALID / RECORDED-INVALID / NOCHANGE, R1·R2 는 coverage.
4. **비용**: `total_cost_usd`, usage 합계, `num_turns`, `duration_ms`, 도구 호출 수.
5. **실환경 부작용**: Skill 호출 이름, Agent/advisor 호출 수, Stop 훅 차단으로 이어진 턴 수, 금지 도구 시도 수.

## 하지 않는 것

- 커밋·푸시·PR, 빌드·테스트(구조적으로 막는다). 메인 체크아웃 수정.
- 표본 수정·재실행 선택(제1조). 실패한 런은 실패로 남기고, 실행 오류(rc≠0, result 이벤트 없음)만 같은 조건으로 1회 재실행하며 그 사실을 기록한다.
