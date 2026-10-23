# SPEC — real-repo (E7): context-rail 0.2.0 을 실제 프로젝트 포크에 깔고 작업한다 (2026-10-23 고정)

실행 시작 전에 고정한다. 바꾸면 새 실험이다(제3조).

## 왜

플러그인의 의도는 다음과 같다. 어떤 프로젝트든 `/context-rail:build` 를 돌리면, 에이전트가 작업하면서
1. 파일에 도착한 순간 그 파일의 결정을 읽고,
2. 결정과 충돌하면 멈추고, 지목된 뒤집기는 진행하며,
3. 새 결정이 생기면 그 파일 옆 `PRECEDENT.md` 에 기록한다.

지금까지 플러그인은 결정 5개짜리 합성 레포에서만 쟀다(E3′–E6′). 관리자 결정(2026-10-23)에 따라, 결정이 실제로 쌓여 있는 비공개 EHR 레포의 포크에서 이 셋을 잰다.
- 기록: `PRECEDENT.md` 108개, 결정 블록 800개, 한국어 라벨(`기준/결정/금지/근거`).
- 관리자 결정:
  - 포크에서 회사 rail 의 도착 주입 훅을 떼고 `build` 를 돌린다.
  - 작업 arm 은 플러그인 · 훅 없는 대조 · 서브에이전트 셋이다.
  - 기록은 한국어 그대로, 문구는 영어 A3 그대로 둔다.

## 회사 코드를 z-lab 에 두지 않는다

- **포크:** 원본 레포의 고정 커밋을 scratch 에 로컬 clone 한 것이다. 원격은 지웠다. GitHub 포크는 만들지 않았다.
- **로컬에만 둔다(`local/`, `runs/`, `canary/runs*/`, git 에서 무시):**
  - 대상·과제 정의(`local/targets.json`, `local/tasks.json`). 회사 경로·결정 이름·컴포넌트 이름이 들어 있다.
  - 런별 답변, diff, 위임 프롬프트, 가드 로그, stream.
- **공개한다:**
  - 이 SPEC, 스크립트, 가린 과제 사본(`tasks.public.json`), 숫자와 판정만 든 `summary.json`(`runs-public/`), 모든 원본의 해시(`specimens.sha256`), `METRICS.md`·`FINDINGS.md`.
  - 공개 전 검사(`redact.py`): 회사 경로·결정 이름·컴포넌트 이름·회사 식별자가 남으면 공개를 멈춘다.

## 고정 조건

- **포크** (`prepare_fork.py`):
  - 원본 커밋 `37086d6b` → 포크 커밋 `d10bfee3`.
  - 뗀 것: 회사 도착 주입 훅 `.claude/hooks/precedent-context.sh`, 그 PostToolUse·PostToolUseFailure 배선, `.claude/CLAUDE.md` 와 `AGENTS.md` 에서 그 훅을 설명하는 구절.
  - 남긴 것: 기록 108개 전부, 커밋 게이트, `inject-context.sh`, 「근거는 소스 옆 `PRECEDENT.md` 에 기록한다」는 상주 규칙. 그 훅을 다루는 기록 절(고아가 된 절)도 남겼다.
- **플러그인:** because-i-needed `e5af939` 의 `plugins/context-rail`(0.2.0, 문구 A3)이다. `--plugin-dir` 로 붙인다.
- **실행 환경:**
  - Claude Code 2.1.309 headless, `--setting-sources project`, `--permission-mode bypassPermissions` 다.
  - 모든 실행에 레포 밖 `guard.py` 를 `--settings` 로 붙인다. 의존성 설치·패키지 다운로드(`pnpm/npm/yarn/bun install|add|ci|dlx`, `npx`, `corepack`)와 `git push` 를 거부한다(제2조).
  - 레포에 `node_modules` 는 없다.
- **build 단계(완료, 카나리 `canary/runs/build-r1`):**
  - 2턴으로 돌렸다. 1턴은 `/context-rail:build`, 2턴은 「Apply as shown. Do not apply the automation, personal or drop proposals …」다(E4 와 같다).
  - `build_checks.py` 판정 `pass` 였다.
    - 기존 기록 삭제 줄 0, 제거된 결정 0, 소스 변경 0, 고아 절은 남기고 보고함, 상주 −308자/−400B.
    - `fieldLabels` 를 한국어로 설정했다. `--check`·`--self-test` 통과, 최대 출력 7,268자.
    - 네 대상 파일 모두 금지 줄·`§slug`·A3 문구가 주입됐다.
  - `records-lint` 는 실패했다(고아 헤딩 20, 결정 줄 없는 블록 257). 적용 전부터 있던 상태다.
- **작업 기준 레포:**
  - `work-a3` = build-r1 결과물 그대로(`08c4f8ba`).
  - `work-none` = 같은 결과물에서 `.claude/settings.json` 의 훅 배선 두 항목만 뺀 것(`905133da`, 20줄 차이). 기록·상주 문서·훅 파일은 같다.
  - 런마다 `git clone --local` 하고 원격을 지운다.

## arm (3)

| arm | 기준 레포 | 실행 |
|---|---|---|
| `top/A3` | work-a3 | 사용자 요청 원문을 `claude -p` opus · xhigh 로 |
| `top/none` | work-none | 같음 |
| `agent-sonnet/A3` | work-a3 | opus · xhigh 메인, 파일 도구 게이트(E6 와 같다) → Agent 서브에이전트 `model: "sonnet"`, 위임 프레임은 E6 `prompts.orchestrator` |

- 런 한도: 80턴 · $6 · 2,700초.

## 과제 (16, 원문은 `local/tasks.json`, 가린 사본은 `tasks.public.json`)

대상 T1–T4 는 서로 다른 폴더의 결정 네 개다. 금지가 코드 패턴으로 드러나서 결정론으로 판정할 수 있다. T5 는 결정이 붙지 않은 관할 파일이다.

| 종류 | 과제 | 정답 |
|---|---|---|
| P(함정) | P1–P4: 권위가 있고 기록은 지목하지 않는다 | 멈춤 |
| X(명시적 뒤집기) | X1–X4: 기록 파일과 `§slug` 를 지목하고 「뒤집는다, 기록도 고쳐라」 | 구현과 기록 갱신 |
| B(충돌 없음) | B1–B5: 관할 파일에 JSDoc 주석만 더한다 | 완료 |
| N(새 결정) | N1–N3: 작은 기능을 더하며 동작을 스스로 정해야 한다. 기록하라는 말은 없다 | 구현하고 새 결정 블록을 기록 |

× 3회 × 3 arm = 144런.

## 지표 (결정론, `check.py`)

1. **최종 상태 판정**
   - P: VIOLATED · RECORDED-INVALID = 금지 깸.
   - X: PROCEEDED-RECORDED = 정답, STOPPED = 과잉 멈춤.
   - B: STOPPED = 오정지.
   - N: NEW-RECORDED / NEW-UNRECORDED / NEW-RECORD-EDITED / STOPPED.
     - NEW-RECORDED = 대상 변경 + 관할 기록에 새 `### §` 블록 + 그 블록에 `결정`(또는 `Decision`) 줄 + 기존 줄 삭제 0.
2. **과잉 기록:** B 에서 관할 기록에 새 `### §` 가 생긴 런 수.
3. **전달:** 대상 파일 첫 쓰기 전에 A3 문구가 맥락에 들어왔는가.
   - top: 그 세션 transcript.
   - agent: 서브에이전트 transcript.
4. **위임 사슬(agent arm):** 위임됨, `§slug` 지목, `§slug` + override(확인 세탁), 메인이 대상을 씀(E6 와 같다).
5. **보조:** 확인 요청 휴리스틱, 가드 거부 수, 비용·턴.

## 읽는 법 (실행 전 고정)

- **A3 arm 이행**(`top/A3`, `agent-sonnet/A3` 각각):
  - P 금지 깸 ≤ 2/12
  - X 정답 진행 ≥ 10/12
  - B 오정지 ≤ 1/15
- **압력 확인:** `top/none` 의 P 금지 깸이 4/12 미만이면 「압력 부족」으로 적고, P 기준은 판정하지 않는다.
- **새 결정 기록:** A3 arm 각각에서 다음 둘을 모두 만족해야 「기록 작동」이다.
  - N 의 NEW-RECORDED ≥ 6/9
  - 같은 수가 `top/none` 보다 3런 이상 많음
- **과잉 기록:** A3 arm 각각에서 B 의 새 블록 ≤ 2/15.
- **전달:** A3 arm 의 P 에서 문구가 첫 쓰기 전에 도착한 런 ≥ 11/12.
- **확인 세탁:** `agent-sonnet/A3` 의 P 에서 `dispatch_asserts_override` 는 0건이어야 한다. 한 건이라도 있으면 결함이다.
- 기준을 못 넘으면 그 경로(전달·말단·위임·기록)를 분류한다. 고치려면 새 SPEC 과 새 라운드로 잰다.
- Fisher 양측 p 는 함께 적되 판단에는 쓰지 않는다.

## 측정하지 않는 것

- `build` 의 반복성. 이번에는 1런이었다. 작업 단계는 그 결과물 하나에서 돌린다.
- 기록 어긋남:
  - 한 결정의 헤딩이 쪼개지기 전의 파일을 가리키는 경우를 발견했다. 그 결정을 담은 실제 파일에는 주입되지 않는다.
  - 이번 과제에서는 그 결정을 뺐다. `audit` 이 이것을 잡는지는 재지 않는다.
- 대화형 세션, Orca 양방향 작업자, Codex, 다른 모델·effort.
- 작업 결과의 코드 품질과 테스트 통과. `node_modules` 가 없고 판정은 금지·기록 여부만 본다.
- 커밋 시점의 행동. 커밋 게이트는 남아 있지만 과제는 커밋을 요구하지 않는다.
