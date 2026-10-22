# SPEC — real-use: 머지 뒤 실사용 세션의 도착 주입·확인 문구·커밋 토큰 관측 (2026-10-22 고정)

실행 시작 전에 고정한다. 바꾸면 새 실험이다(제3조). arm 이 없는 **관측**이다. 인과는 주장하지 않는다.

## 왜

- 2026-10-16 비공개 레포에 도착 주입 훅(절 본문 + v3 확인 문구)이 머지됐다. 앞선 실험은 모두 headless 실험 런이었고, 머지 뒤 **실사용**에서 무슨 일이 일어났는지는 잰 적이 없다.
- 이 계열의 공개 글은 「다음에 잴 것은 `PRECEDENT_OK=1` 이 얼마나 자주 붙는지와, 같은 화면이 같은 이유로 다시 열리는 횟수」라고 약속했다.
- `../arrive-then-read-2.1.296/` F8 은 「세션 기록이 없어 측정 불가」였다. 지금은 세션 transcript(jsonl)가 남아 있다. 2026-10-22 확인으로, 주입은 `hook_additional_context` 레코드로 남는다.

## 모집단 (실행 전 고정)

- transcript: 비공개 레포 메인 체크아웃의 Claude 프로젝트 디렉터리와 그 Claude 워크트리 디렉터리 아래의 모든 `*.jsonl`(서브에이전트 포함).
- 기간: 첫 레코드 시각이 머지 시각(2026-10-16T02:45:14Z, 주입 훅 PR 머지) 이후이고 분석 시각 이전인 transcript.
- 제외
  - 실험용 clone·scratchpad·캐시 디렉터리의 transcript. 디렉터리가 다르므로 위 모집단에 들어오지 않는다.
  - **이 분석을 수행한 세션**(context rail 자체를 다루며 실험을 돌린 세션)과 그 서브에이전트.
- 디렉터리 경로·세션 id·레포 이름은 스크립트 인자로 받는다. 이 저장소의 파일에는 적지 않는다.

## 지표 (실행 전 고정)

**A. 모집단**
- transcript 수(최상위 / 서브에이전트), `entrypoint`, CLI `version` 분포.

**B. 도착 주입**
- 대상: `attachment.type == hook_additional_context` 이고 `hookEvent` 가 PostToolUse 또는 PostToolUseFailure 인 레코드.
- 머리말로 분류한다(훅 출력 형식 그대로):
  - 본문: `PRECEDENT 주입 — `
  - 압축: `PRECEDENT 주입(압축`
  - 절 없음: `PRECEDENT:` + `절 없음`
  - Edit 리마인더: `PRECEDENT 관할 — `
  - rules 안내: `적용 대상 — Read 로 로드`
- 확인 문구: 내용에 `⚠ 이 절의 결정·금지는` 이 있으면 그 레코드에 확인 문구가 있다고 본다.
- 이벤트별 건수, 주입이 1건 이상인 transcript 수, 본문·압축 주입의 글자 수(중앙·최대)를 적는다. 렌더에 `persisted-output` 이 있는 레코드 수(실사용에서 상한을 넘은 횟수)도 적는다.

**C. 확인 문구 뒤 (기계 지표, 판정 아님)**
- 확인 문구가 붙은 주입마다, `toolUseID` 로 그 주입을 일으킨 도구 호출과 대상 파일을 찾는다.
- 그 뒤 같은 transcript 안에서 다음이 있었는지 센다.
  - C1. 같은 대상 파일에 대한 Edit / Write / MultiEdit
  - C2. `PRECEDENT.md` 에 대한 Edit / Write / MultiEdit
  - C3. `AskUserQuestion` 호출, 또는 assistant 텍스트에 「무효화 사유」 출현
- C1 은 정상 편집과 금지 깸을 가르지 못한다. C3 은 「확인 요청 후보」일 뿐이다.

**D. 커밋 토큰**
- 대상: Bash `tool_use` 중 명령(인용부를 지운 사본)에 `git … commit` 이 있는 것. `git commit --help` 와 `git log`·`git show` 등 조회 명령은 뺀다.
- 센다.
  - 커밋 명령 수
  - `PRECEDENT_OK=1` 이 단어 경계로 붙은 커밋 명령 수. 판정은 커밋 게이트와 같게, 인용부를 지운 사본의 `(^|공백)PRECEDENT_OK=1(공백|$)` 로 한다.
  - 거부된 커밋 수: 그 `tool_result` 가 오류이고 「필요 토큰:」 줄이 있는 것
  - 거부 메시지의 필요 토큰에 `PRECEDENT_OK` 가 있는 수
  - 그 거부 다음의 같은 transcript 첫 커밋 명령에 `PRECEDENT_OK=1` 이 붙었는가

**E. 이력 (git, 결정론)**
- 비공개 레포 `dev` 의 `--no-merges` 커밋을 author date 로 두 창에 나눈다.
  - 사후 창: 머지 시각 ~ 분석 시각
  - 사전 창: 같은 길이의 직전 창
- 소스 파일은 `../arrive-then-read-2.1.296/evidence/churn.md` 와 같은 필터다: `apps/ packages/ .claude/ scripts/ tooling/` 아래 `*.ts *.tsx *.css *.mjs *.sh`.
- 창마다 센다.
  - 소스 커밋 수
  - `PRECEDENT.md` 를 함께 바꾼 소스 커밋 수
  - 건드린 소스 파일 수
  - 3회 이상 서로 다른 커밋이 건드린 파일 수(재수정률)
- 「같은 이유로」는 측정할 수 없다. 재수정률은 그 대리 지표일 뿐이다.

## 읽는 법 (실행 전 고정)

- 모든 수치는 서술이다. 사전·사후 비교에서 인과를 말하지 않는다. 작업 단계·사람·자율 모드 사용이 창마다 다르다(F7 과 같은 한계).
- C 는 「확인 문구가 실사용에서 얼마나 자주 도착하고, 그 뒤 무슨 행동이 기계적으로 보였는가」까지만 읽는다. 「멈췄다/오정지했다」 판정은 하지 않는다.
- 공개 기록은 숫자만이다. transcript 원문·경로·파일명·세션 id·커밋 SHA 는 커밋하지 않는다.

## 측정하지 않는 것

- C 의 옳고 그름(정탐·오정지 판정). 사람이나 판정 세션이 읽지 않는다.
- Orca 바깥에서 사람이 직접 친 커밋(transcript 에 없음).
- 다른 사람의 세션. 이 기계의 transcript 만 본다.
