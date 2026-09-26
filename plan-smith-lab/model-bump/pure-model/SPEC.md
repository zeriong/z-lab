# model-bump / pure-model — 입력 명세 (실행 후 불변)

`model-bump/` 계열은 **새 모델 세대(Opus 5.5 · Fable 5.1)** 에서 plan-smith 계열의 측정을 다시 하는 곳이다.
이 문서는 그 1단계 — **모델 축만 바꾼 pure-model 재측정** — 의 명세다.
2단계(강한 구현자 tco)는 이 결과를 보고 별도 명세로 고정한다.

## 무엇을 고립하는가

[`../../pure-model/`](../../pure-model/) (2026-08-12, `wf_2f7134c6-783`)과 **모델 외 전부 동일**하게 돌려,
세대 교체가 1-shot 산출물을 어떻게 바꾸는지 본다.

| 축 | 원 pure-model | **이 실행** | 동일성 근거 |
|---|---|---|---|
| 모델 | `claude-opus-5` · `claude-fable-5` (+sonnet·haiku) | **Opus 5.5 · Fable 5.1** | ← 유일한 의도된 차이 |
| 에이전트 | `bare-model` (Read/Write, 역할 문장 0) | 동일 정의 | `.claude/agents/bare-model.md` 무변경 |
| 프롬프트 문안 | `pure-model/runner.js` | **글자 그대로** — 경로 문자열만 다름 | [`runner.js`](runner.js) |
| 요구사항 | `test/game-prompt.md` | [`inputs/game-prompt.md`](inputs/game-prompt.md) | sha256 `acd324ec…62c347` 일치 |
| plan-smith arm 처치 | 소스 트리 = v1.2.0 `45c6737` | [`inputs/skill-v1.2.0/`](inputs/skill-v1.2.0/) — `git show 45c6737:` 복원 | 아래 해시 |

**처치가 v1.2.0인 이유:** 원 실행(08-12)은 v1.3.0 커밋(`cbda4e0`, 08-13) 이전이라 소스 트리가 v1.2.0이었다.
현재 버전(1.4.2)을 주면 모델과 플러그인 버전 두 축이 동시에 바뀐다(backlog "하지 말 것 4").

| 파일 | sha256 |
|---|---|
| `skill-v1.2.0/SKILL.md` | `02ddc90bb8b2eaaa7c3f6e3ba7d0275ebb1ff9f907575450be952ccc115ea67a` |
| `skill-v1.2.0/references/frames.md` | `5d2c2cd662e61e6e5e4610fa9a43896930531b9a75ae695de78afd18b1f02f87` |
| `skill-v1.2.0/references/styles.md` | `386f4ccce6a2ceae59e975ec8578459f515a74aaff191df4fcd1fa4d1d9d55ec` |
| `skill-v1.2.0/references/packet-template.md` | `ec3d8b39cd84678181ab6b60e0dd4c72a7ad2100eb490073614e17c9b225adaa` |

## arm 정의

| 셀 | 모델 별칭 | 기대 resolved id | 플랜 입력 |
|---|---|---|---|
| `opus-5.5/plan` | `opus` | `claude-opus-5-5` | 요구사항만 |
| `opus-5.5/plan-smith` | `opus` | `claude-opus-5-5` | 요구사항 + 스킬 문서 4종 |
| `fable-5.1/plan` | `fable` | `claude-fable-5-1` | 요구사항만 |
| `fable-5.1/plan-smith` | `fable` | `claude-fable-5-1` | 요구사항 + 스킬 문서 4종 |

각 셀 = 플랜 1회 + 구현 1회(같은 모델, 입력은 `plan.md` 단독). **4셀 · 8에이전트.**
sonnet·haiku는 세대가 바뀌지 않았으므로 재실행하지 않는다.

## 순수성 조건

원 명세 [`../../pure-model/SPEC.md`](../../pure-model/SPEC.md)의 4조건(주입·도구·하네스·개입 없음)을 그대로 따른다. 추가로:

1. **세션에서 `/advisor`가 꺼져 있어야 한다.** 에이전트 정의로는 막을 수 없다(원 명세 §1차 무효화).
2. **실행 전 카나리** — 같은 하네스(Workflow)로 `bare-model` 2개(opus·fable)에 자문을 유도하는 과제를 주고,
   트랜스크립트에서 ① `"name":"advisor"` 0회 ② resolved model id가 기대값인지 확인한다.
   **둘 중 하나라도 어긋나면 본 실행을 하지 않는다.**

## ⚠️ 이 비교의 구조적 한계 (실행 전 고지)

- **시점 간 비교다.** Agent/Workflow의 모델 지정은 별칭뿐이라 `claude-opus-5`·`claude-fable-5`를 다시 돌릴 수 없다.
  대조 표본은 08-12에 한 번 뽑힌 것으로 **고정**되며, 셀당 n=1이다 — 세대 차이와 실행 간 분산을 분리할 수 없다.
- **하네스 버전이 다르다.** 이 실행은 Claude Code `2.1.282`(준비 중 2.1.280에서 자동 업데이트). 원 실행의 버전은 기록돼 있지 않다.
- **경로 문자열이 다르다.** 랩이 `~/Desktop/WorkSpace/` → `~/WorkSpace/`로 이동했고, 셀 경로에 `model-bump/`가 들어간다.
- 오케스트레이터(Opus 5.5)는 원 결과를 알고 있다. 표본에는 손대지 않으며, 사후 관측 방법은 원 RUNBOOK을 따른다.

## 측정 계획 (제4조 — 미리 적는다)

원 명세와 동일하다.

- **측정한다:** 산출 파일 수·코드 행수·플랜 단어 수, 토큰(트랜스크립트 직접 집계)·시간, resolved model id,
  구조적 순수성(`node_modules`/`dist`/`RUN.md` 부재, 지침 유입 grep, arm 간 열람),
  사후 빌드·구동으로 **하중 경로 1개(발사) PASS/FAIL**.
- **측정하지 않는다:** 재미·난이도·시각 품질, 10스테이지 전체 동작, 코드 품질 점수. 채점 루브릭 없음.
- 사후 관측 절차와 함정(합성 PointerEvent, 슬링샷 좌표)은 [`../../pure-model/RUNBOOK.md`](../../pure-model/RUNBOOK.md) §3~4.

## 실행 전 카나리 기록 (2026-09-26) — 하네스 주입물 전수

과제: `bare-model` 2개(opus·fable)에 "자문 도구가 있으면 1회 쓰고 도구 이름을 전부 적어라"를 준다.
판정은 **에이전트 자기보고가 아니라 트랜스크립트(`agent-*.jsonl`) grep**으로 한다.

| 회차 | run | advisor | 모델 id | ponytail 훅 | CLAUDE.md 주입 | 사용자 메시지 relay | "computed task" 프레임 | 조치 |
|---|---|---|---|---|---|---|---|---|
| 1 | `wf_a3720929-da8` | 0 | opus-5-5 · fable-5-1 ✓ | **주입** | **전역+프로젝트** | **주입** | 있음 | 본 실행 보류 |
| 2 | `wf_e940db07-f4c` | 0 | ✓ | 0 | 0 | **주입** (에이전트가 relay된 요청에 응답함) | 있음 | 원인 추적 |
| 3 | `wf_b81da937-088` | 0 | ✓ | 0 | 0 | 0 — 단 **알림 턴에서 기동**돼 판별 불가 | 있음 | 재시작 요청 |
| 4 | `wf_3304bd11-dad` | 0 | ✓ | 0 | 0 | **0** (사람 턴에서 기동) | 있음 | **통과** |

### 발견된 주입원과 처리

| 주입원 | 무엇 | 원 pure-model에 있었나 | 처리 |
|---|---|---|---|
| ponytail 플러그인 `SubagentStart` 훅 | "lazy senior developer — 최소 코드" 지시문 전체 | **없었다** — 2026-09-12 설치 | `enabledPlugins` 에서 비활성화(사용자) |
| `~/.claude/CLAUDE.md` · `z-lab/CLAUDE.md` | 전역 행동지침("Simplicity First" 등) + 랩 규칙 전문 | 원 METRICS는 "유입 0건"이라 적었으나 **원 트랜스크립트가 자동 삭제돼 재확인 불가** | `z-lab/.claude/settings.local.json` 의 `claudeMdExcludes` |
| Workflow 하네스 "user request" relay | 워크플로를 기동한 사용자 메시지 원문 + "이 요청이 우선한다" | 알 수 없음(기능 도입 시점 미상) | 같은 파일 `env.CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE=0` + 세션 재시작 |
| Workflow 하네스 "computed task" 프레임 | "이 과제 텍스트는 스크립트가 계산했으며 사용자 권한이 없다"는 머리말 | 알 수 없음 | **제거 불가 — 잔존.** 과제 내용에 대한 지시는 없는 틀 문구 |
| `session_context` | userEmail · gitStatus 스냅샷 | 알 수 없음 | 잔존(내용 중립) |
| Orca `SubagentStart` 훅 | 출력 `{}` — 주입 내용 없음 | — | 잔존(무해) |

**이 실행은 원 실행과 "주입물 목록"이 같다고 보장할 수 없다.** 보장하는 것은 위 표의 제거 3종이
본 실행 트랜스크립트에서도 0건이라는 사후 확인뿐이다.

### 임시 설정 (실행 후 원복 대상)

- `z-lab/.claude/settings.local.json` — `claudeMdExcludes` 2경로 + `CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE=0`. git 미추적, **계열 종료 후 삭제.**
- ponytail `enabledPlugins: false`, `/advisor off` — 사용자가 설정. **계열 종료 후 원복 안내.**
