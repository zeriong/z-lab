# real-skill-tco — 실제 plan-smith는 값을 하는가 (실행 전 고정)

## 질문 (사용자 우선순위 그대로)

**현재 모델로 실제 plan-smith를 쓰면, Claude 기본 계획보다 작동하는 산출물까지 얼마나 아끼는가.**
1순위 **토큰 절감**, 2순위 **작업 속도(벽시계)**. 계획자와 구현자는 **같은 모델**이다(사용자가 한 모델로 계획·구현하는 시나리오).

## 이전 계열과 무엇이 다른가 — 이 계열이 존재하는 이유

이전의 모든 plan-smith arm(pure-model·transfer·tco·model-bump)은 **에이전트 하나가 스킬 문서를 읽고 곧바로 플랜을 쓰는 근사**였다.
실제 v1.4.2는 build-out에서 **메인(패킷·확인 게이트) → 격리된 plan-writer 작성 → 새 plan-writer 배선 감사 → 감사 반영 수정**으로
에이전트를 최소 4번 부른다(SKILL.md Stage 1·2·2c). 따라서 이전 측정은 **실제 계획 비용을 과소평가했을 수 있다.**
이 계열은 **헤드리스 `claude -p`로 진짜 스킬을 호출**해 제품 그대로의 비용을 잰다.

## 셀

| 축 | 값 |
|---|---|
| 모델 | `claude-opus-5-5` · `claude-fable-5-1` (**전체 id로 고정** — 별칭 표류 없음) |
| arm | `base-plan`(방법론 없음) · `plan-smith`(v1.4.2 실제 스킬) |
| 반복 | **n=3 독립 체인**(계획부터 구현까지 매번 새로) — 플랜 생성 변동을 처음으로 측정 |
| 합계 | 2 × 2 × 3 = **12체인** |
| 과제 | [`inputs/game-prompt.md`](inputs/game-prompt.md) — 이전 계열과 같은 파일(sha256 `acd324ec…62c347`) |

## 입력·하네스 (전 셀 공통)

- `claude -p` · `--effort xhigh`(사용자 기본값) · `--output-format json` · `--strict-mcp-config`(MCP 0) · `--setting-sources user` ·
  `--permission-mode bypassPermissions`. 설정 파일: [`inputs/settings_base.json`](inputs/settings_base.json) · [`inputs/settings_ps.json`](inputs/settings_ps.json)
  — `disableAllHooks: true`, 전역·z-lab `claudeMdExcludes`, 플러그인은 **base는 전부 끔, plan-smith arm은 plan-smith만 켬**.
- plan-smith는 `--plugin-dir ~/.claude/plugins/cache/plan-smith-marketplace/plan-smith/1.4.2`로 명시 로드. 캐시가 `c3c336b`와
  바이트 동일함을 확인(스킬 문서 4종 = `model-bump/tco/inputs/skill-v1.4.2/`, `agents/plan-writer.md` sha256 `04765e82…`).
- **계획 단계 도구**(양 arm 동일): `Read, Write, Glob, Grep, Agent, Skill`. Bash 없음 → 빌드·실행·검증 구조적으로 불가.
  `Agent`는 plan-smith가 plan-writer를 부르는 데 필요하다. 다른 모델로의 자문 통로도 되므로 **셀별 모델 구성을 감사로 기록**한다.
  `AskUserQuestion`은 헤드리스에서 제공되지 않는다(카나리 확인) → 확인 게이트는 프롬프트의 "배치 실행이므로 스스로 승인" 지시로 대체.
- **구현 단계 도구**: `Read, Write`만. 플러그인 없음. 입력은 플랜 단독.
- 프롬프트 문안은 [`runner.sh`](runner.sh)가 정본이다:
  - base = pure-model 계획 프롬프트 + 구현자 고지(tco 2b와 같은 문장, 모델 id만 체인별)
  - plan-smith = `/plan-smith:plan-smith` + 같은 과제 문장 + 같은 구현자 고지 + 배치 게이트 문장(이전 계열과 같은 문장)
  - 구현 = transfer의 `implPrompt` 문안 그대로
  - **두 arm의 차이는 스킬 호출 여부와 그에 따른 출력 경로(스킬 관례 `plans/<slug>/plan.md`)뿐이다.**

## 판정 — 원 tco와 동일

- 사다리 L0~L6, **DONE = L5 + 프로브 중 uncaught JS 에러 0**. 계측 규율: 리스너·좌표는 소스에서 읽고 스크린샷으로 대조, `setPointerCapture` 무력화, 0이면 계측부터 의심.
- DONE이 아니면 사본(`<셀>-repair/`)에서 **같은 모델** 수리, 원 tco 고정 템플릿, **상한 3라운드**, 초과 시 DNF(쓴 토큰 전액 계상).

## 지표 (고정)

| 지표 | 정의 | 원천 |
|---|---|---|
| **1차: 토큰** | 체인별 계획 + 구현 + 수리의 `input + cache_creation + cache_read + output` (서브에이전트 포함) | CLI `modelUsage` 합 = 트랜스크립트 감사(`../model-bump/audit_headless.py`) — 카나리에서 두 값 일치 확인 |
| **2차: 시간** | 체인별 계획 + 구현 + 수리의 CLI `duration_ms` 합 | CLI JSON |
| 보조 | output 토큰, CLI `total_cost_usd`(CLI의 단가 추정치 — 구독 사용자에겐 환산값), 1차 DONE 수, 수리 라운드 | CLI JSON · 관측 |

## 결정 규칙 (고정) — 모델별로 따로, 평균 내지 않는다

R_tok = Σ(plan-smith 3체인 토큰) / Σ(base 3체인 토큰), R_time = 같은 식의 시간 비.

| R_tok | 판정 | 처방 (v1.4.2 조항과 대조 완료) |
|---|---|---|
| ≤ 0.9 | **값을 한다** | 문서 PATCH — "같은 모델 자기 구현에서도 절감" 수치 기재 |
| 0.9 < R < 1.1 | 중립 | 문서 PATCH — 중립 수치와 R_time 기재, 조항 불변 |
| ≥ 1.1 | **비용이다** | **v1.5 후보(신규)**: 확인 게이트에서 구현자가 계획자와 같은 모델(또는 더 강함)일 때 가벼운 경로(감사·수정 생략 등)를 선택지로 제시. v1.4.2에는 build-out용 가벼운 경로가 **없음**(배선 감사 필수, 결정 문서만 생략 가능 — SKILL.md Stage 2c)을 확인했다. **후보일 뿐이며 별도 게이트 실험 통과 전에는 출하하지 않는다** |

- R_tok과 R_time의 판정이 갈리면 둘 다 적는다(1순위는 R_tok).
- 1차 DONE이 전 셀이면 R은 계획 + 구현 비용만의 비율이다 — 판정 옆에 명시한다.
- 비용 USD와 토큰의 방향이 갈리면 그 사실을 판정 옆에 적는다.

## 측정하지 않는 것

- 품질 — 이전 계열에서 1스테이지 사다리가 포화했다(백로그 B14). 이번에도 포화하면 품질 차이는 말할 수 없다.
- 실제 사용자의 확인 게이트 응답(배치 자동 승인으로 대체), 대화 맥락이 있는 상황(요구사항 파일 하나뿐 — plan-smith의 Stage 1 강점인 "세션 맥락 증류"는 이 설계에서 발휘될 재료가 적다).
- 과제 1종, n=3 — 방향 신호.
- 달러 비용의 정답 — CLI `total_cost_usd`는 CLI의 추정치다.

## 실행 전 카나리 (2026-09-26, 요구사항 = 스톱워치 한 페이지, `claude-opus-5-5`)

| 회차 | 무엇 | 결과 |
|---|---|---|
| probe | 도구·자문 유도 | 도구 = `Agent, Glob, Grep, Read, Skill, Write`(**AskUserQuestion 미제공**), advisor 0. 모델이 `Agent(model: sonnet)`로 자문함 → **Agent는 타 모델 통로** — 셀별 모델 구성 감사 필요 |
| ps (1차) | plan-smith, `--settings`만으로 플러그인 활성 | ✗ `/plan-smith:plan-smith` 미설치로 처리되어 모델이 직접 작성 → **`--plugin-dir` 필수** |
| base | 기본 계획 | 정상. 플러그인 스킬 자동 발화 없음 |
| ps2 | plan-smith, `--plugin-dir` 1.4.2 | ✓ **실제 파이프라인 완주**: packet → plan-writer 작성 → 새 인스턴스 배선 감사(결함 6건) → 수정. plan-writer 3회 전부 `claude-opus-5-5`. 게이트는 배치 지시로 자가 승인 |

주입 검사(첨부 구조 기준 — 프롬프트 에코 오탐 배제): 전 회차 CLAUDE.md 0 · 훅 0 · advisor 0.
계측 검증: CLI `modelUsage` 합과 트랜스크립트 감사(`audit_headless.py`) 값이 네 세션 모두 **정확히 일치**.

**카나리 자체의 관측 — 계획 단계만, 작은 과제:**

| | base | plan-smith(실제) | 배수 |
|---|---|---|---|
| 토큰 | 110,783 | 1,866,644 | 16.8× |
| 시간 | 170s | 2,267s | 13.3× |
| CLI 비용 추정 | $0.61 | $8.33 | 13.6× |
| output | 17,943 | 277,122 | 15.4× |

→ 이전 계열의 단일 에이전트 근사는 **실제 계획 비용을 크게 과소평가했을 가능성**이 높다. 본 실행이 이를 게임 과제에서 잰다.
카나리 산출물은 표본이 아니므로 기록 후 삭제했다(세션 id: probe `5c8d5fe2` · ps `2ff7932e` · base `20eae816` · ps2 `c0db8415`).

## 실행 방식 (사용자 결정, 실행 전)

12체인 **동시 실행**(단계 실행 아님). 추정 규모를 사전에 고지했다: 12체인 약 120~180M 토큰, CLI 환산 약 $500~800, 벽시계 2~3시간(카나리·model-bump 외삽, 2배 오차 가능).
구독 한도로 끊기면 `runner.sh`가 완료 단계를 건너뛰고 재개하며, 재개분은 `evidence/*.resumed`로 남는다.

## ⚠️ 1차 시도 전량 중단 — 조직 지출 한도 (2026-09-26, 실행 중 발생)

12체인 동시 실행 약 25분 만에 **전 세션이 "You've hit your individual spend limit"로 종료**됐다(조직 관리자 설정 한도).
완주한 단계 0. 소모: **4,107,133 토큰 · CLI 추정 $43.07**(계획 단계 12 + 구현 시도 2). 끊긴 시점까지의 관측(참고용, 완주 아님):
plan-smith 계획은 8.5~28.5분 동안 41만~68만 토큰을 쓰고도 writer 단계에서 끊겼다(패킷만 남음). base 계획은 r3 두 셀만 파일을 남겼다.

**처리 (제6조):** 끊긴 세션의 CLI JSON과 부분 산출물(패킷 6 · 플랜 2)은 삭제하지 않고 `evidence/aborted/attempt1-spend-limit/`로 옮겼다 —
셀에 남기면 재실행 모델이 Glob으로 읽어 오염된다. 1차 시도의 소모는 **체인 비용에 넣지 않는다**(제품 동작이 아니라 하네스 중단의 비용). 별도 항목으로 보고한다.

**실행 방식 변경 (2차 시도부터, 프롬프트·하네스 불변):** `runner.sh`의 오케스트레이션만 바꿨다 — 프롬프트 함수 4개는 diff 0줄.
1. **동시 4체인 배치** r1 → r2 → r3. 한도에 다시 걸려도 버려지는 진행 중 세션이 최대 4개.
2. **한도 감지 즉시 정지**(`evidence/STOP`) — 1차 때는 한도 이후에도 다음 단계를 띄워 빈 오류 JSON이 생겼다.
3. 재실행 전 끊긴 단계의 기록·부분 산출물을 자동으로 `evidence/aborted/<시각>-<체인>-<단계>/`로 이동(`stashed.log`), 재개분은 `*.resumed`로 표시.
시간 지표는 단계별 CLI `duration_ms` 합이라 배치 전환의 영향을 받지 않는다. 동시성(12 → 4)의 API 지연 차이는 통제하지 않았다.

## ⚠️ 2차 시도 중단 — 호스트 시스템 잠자기 (측정 오염)

r1 배치 4체인이 약 63분 진행된 시점에 중단했다(오케스트레이터 개입 — 제10조에 따라 기록).
원인: 실행 호스트(macOS, AC 전원)가 **유휴 잠자기·유지보수 잠자기**에 들어가 스트림이 끊겼다 —
트랜스크립트 원문 `Connection lost while your computer was asleep` / `StreamSuspended: Stream watchdog detected system suspend`.
base 두 세션에서 각 3회, 그 여파로 CLI가 `Your response above was cut off mid-stream. Resume directly…` 이어쓰기 지시를 1회씩 주입했다.
Claude Code는 자기 턴이 활성일 때만 잠자기를 막으며, 백그라운드 `claude -p`는 막지 못한다(오케스트레이터가 대기하는 동안 잠듦).

**왜 버리나:** 시간 지표(2순위)에 잠든 시간이 들어가고, 토큰 지표(1순위)에 재시도·이어쓰기가 섞이며, 이어쓰기 지시는 모델의 행동 자체를 바꾼다.
소모(트랜스크립트 기준 하한 — 끊긴 스트림분 미포함): **881,513 토큰**. 기록과 부분 산출물(패킷 2)은 `evidence/aborted/attempt2-system-sleep/`.

**3차 시도부터:** `runner.sh`가 `caffeinate -ims -w <러너 PID>`로 잠자기를 막는다. 단계마다 그 세션(서브에이전트 포함) 트랜스크립트에서
`StreamSuspended|cut off mid-stream`을 찾아 있으면 `evidence/<체인>_<단계>.suspended`로 표시한다 — **표시된 단계는 측정 오염으로 간주해 재실행 대상**이다
(덮개 닫힘 등 caffeinate로 막을 수 없는 잠자기에 대비한 사후 검출). 프롬프트 함수는 여전히 diff 0줄.

## ⚠️ 3차 시도 — 지출 한도 재도달, 부분 유효 (2026-09-26 20:3x KST)

caffeinate 적용 후 r1 배치(4체인) 진행 중 다시 지출 한도에 걸려 러너가 `STOP`으로 멈췄다. 잠자기 흔적(`.suspended`) 0건.

| 단계 | 상태 | 토큰 · 시간 · CLI 비용 |
|---|---|---|
| opus-5.5 base-plan r1 plan | **유효(1-shot)** | 178,295 · 11.9분 · $2.05 |
| fable-5.1 base-plan r1 plan | **유효(1-shot)** | 300,079 · 19.1분 · $6.55 |
| opus-5.5 plan-smith r1 plan | 한도로 끊김 | 557,748 · 25.0분 · $3.76 |
| fable-5.1 plan-smith r1 plan | 한도로 끊김 | 554,631 · 22.1분 · $7.41 |
| opus-5.5 base-plan r1 impl | 한도로 끊김 | 121,952 · 14.4분 · $1.98 |
| fable-5.1 base-plan r1 impl | 한도로 끊김 | 133,174 · 11.2분 · $3.82 |

끊긴 4단계 소모: 1,367,505 토큰 · $16.97 (체인 비용에 넣지 않는다 — 다음 실행 때 러너가 `aborted/`로 옮긴다).
유효한 계획 2개는 유지하고, 그 체인의 구현은 재개분(`*.resumed`)으로 새로 돈다.

**러너 버그 수정:** `caffeinate … &`가 러너의 백그라운드 작업이라 배치 끝의 인자 없는 `wait`가 caffeinate까지 기다려 **교착**됐다
(한도 정지와 겹쳐 결과 손실은 없음). 체인 PID만 기다리도록 고쳤다. 프롬프트 함수는 diff 0줄.

**재개 조건 (사용자 결정):** 조직 지출 한도를 상향한 뒤 원 설계(12체인, n=3)로 재개한다. 누적 비용(1~3차, 체인 비용 제외분): 약 6.9M 토큰 이상 · $60 이상.
