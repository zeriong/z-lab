# real-skill-tco-1.6.0 — 실제 plan-smith 1.6.0은 값을 하는가 (실행 전 고정)

형제 실험 [`../real-skill-tco/`](../real-skill-tco/)(1.4.2, 미완 종료)의 질문·셀·지표·결정 규칙을 그대로 잇고, **대상과 하네스만** 현행으로 바꾼다.
그 계열을 닫은 이유와 부분 관측은 [`../real-skill-tco/FINDINGS.md`](../real-skill-tco/FINDINGS.md).

## 질문 (사용자 우선순위 그대로)

**현재 모델로 실제 plan-smith(1.6.0)를 쓰면, Claude 기본 계획보다 작동하는 산출물까지 얼마나 아끼는가.**
1순위 **토큰 절감**, 2순위 **작업 속도(벽시계)**. 계획자와 구현자는 **같은 모델**.

## 테스트 대상 (고정)

[`subject/plugins/plan-smith/`](subject/plugins/plan-smith/) — `zeriong/because-i-needed` main `7b3c574`의 `plugins/plan-smith` 스냅샷
(`git archive`), 15개 파일, [`SUBJECT.sha256`](SUBJECT.sha256). 버전 1.6.0, 스킬 `/plan-smith:forge`, `split-check.py --self-test` 11/11.
1.4.2 대비 동작 차이: **Stage 2d 분할**(20,000자를 넘는 최종 플랜을 새 plan-writer가 인덱스 + 파트로 옮기고 `split-check.py` 로 무손실 검사).

## 셀 (1.4.2 계열과 동일)

`claude-opus-5-5` · `claude-fable-5-1`(전체 id) × `base-plan` · `plan-smith` × **n=3 독립 체인** = 12체인. 과제 [`inputs/game-prompt.md`](inputs/game-prompt.md)(sha256 `acd324ec…62c347`).

## 하네스 — 1.4.2 계열에서 바뀐 것

| 항목 | 1.4.2 계열 | **이 계열** | 이유 |
|---|---|---|---|
| 스킬 호출 | `/plan-smith:plan-smith` | **`/plan-smith:forge`** | 1.5.0 명명 규칙 |
| 플러그인 로드 | 설치 캐시 `--plugin-dir` | **`--plugin-dir subject/plugins/plan-smith`**(스냅샷) | 대상 고정(split-1.6.0 관례) |
| 설정 원천 | `--setting-sources user` + 플러그인 on/off 표 | **`--setting-sources project`** + [`inputs/settings.json`](inputs/settings.json)(`disableAllHooks`, `claudeMdExcludes: ["**/CLAUDE.md"]`) | 사용자 플러그인·스킬·훅을 원천에서 제외, 설정 파일에 호스트 경로 0 |
| **계획 단계 도구** | `Read, Write, Glob, Grep, Agent, Skill` | **+ `Bash`** (양 arm 동일) | 1.6.0 Stage 2d의 `split-check.py` 실행에 필요. **사용자 결정(2026-09-29)**. base arm도 Bash로 환경을 둘러볼 수 있어(예: npm 버전 확인) 이전 계열과 조건이 다르다 |
| 구현 단계 도구 | `Read, Write` | 동일 | 빌드·검증 구조적 불가 유지 |
| 실행 위치 | 랩 안의 셀 디렉토리 | **`$TMPDIR` 아래 픽스처** — 산출물은 셀로 복사 | 세션·산출물에 호스트 경로가 들어가지 않게 |
| 공개 저장 | 그대로 커밋 | **[`../scrub.py`](../scrub.py)로 가린 사본만 커밋**, 가린 뒤 민감 패턴이 남으면 그 단계 무효 + 러너 정지 | 랩은 공개(because-i-needed Rule 9). 1.4.2 계열에서 패킷에 계정 이메일이 실제로 새었다(B19) |
| stdin | 미지정 | `< /dev/null` | 미지정 시 3초 대기 경고(duration에 포함) |

공통으로 유지: `claude -p` · `--effort xhigh`(stderr의 `Unknown --effort` 경고 검사) · `--output-format json` · `--strict-mcp-config` ·
`--permission-mode bypassPermissions` · 동시 4체인 배치(r1→r2→r3) · 지출 한도 감지 즉시 정지 · `caffeinate` · 잠자기/강제 이어쓰기 흔적 검출 ·
끊긴 단계는 삭제 없이 `evidence/aborted/` 로 이동 후 재실행(`*.resumed`).

**랩의 표본 사본은 가림 처리된 것이다.** 원본은 실행 중 픽스처에 손대지 않은 채 남고 구현자는 원본을 읽는다. 가림은 호스트 경로·이메일을 자리표시자로 바꿀 뿐
측정값을 바꾸지 않는다(`evidence/*.scrub.txt` 에 가린 파일 수 기록).

프롬프트 문안의 정본은 [`runner.sh`](runner.sh). 1.4.2 계열 대비 차이: 스킬 이름, 요구사항·출력 경로가 픽스처 경로라는 것뿐.

## 판정·지표·결정 규칙 — 1.4.2 계열 SPEC과 동일 (그대로 옮긴다)

- **DONE** = 사다리 L5 + 프로브 중 uncaught JS 에러 0. 아니면 사본에서 같은 모델 수리, 원 tco 고정 템플릿, 상한 3라운드, 초과 시 DNF.
- **1차 지표 토큰**: 체인별 계획 + 구현 + 수리의 CLI `modelUsage` 합(서브에이전트 포함). **2차 지표 시간**: CLI `duration_ms` 합.
  보조: output 토큰, CLI `total_cost_usd`(추정치), 1차 DONE 수, 수리 라운드. 계산: [`metrics.py`](metrics.py).
- **R_tok = Σ plan-smith / Σ base (모델별, 3체인)**, R_time 동일.

| R_tok | 판정 | 처방 (v1.6.0 조항과 대조 완료) |
|---|---|---|
| ≤ 0.9 | 값을 한다 | 문서 PATCH — 같은 모델 자기 구현에서도 절감 수치 기재 |
| 0.9 < R < 1.1 | 중립 | 문서 PATCH — 중립 수치와 R_time 기재 |
| ≥ 1.1 | 비용이다 | **v1.7 후보(신규)**: 확인 게이트에서 구현자가 계획자와 같은 모델(또는 더 강함)일 때 가벼운 경로(배선 감사·수정·분할 생략 등)를 선택지로 제시. v1.6.0에는 build-out용 가벼운 경로가 **없다**(배선 감사 필수, 분할은 크기 기준으로 자동) — 확인함. 후보일 뿐이며 게이트 실험 통과 전 출하 금지 |

- R_tok과 R_time이 갈리면 둘 다 적는다(1순위 R_tok). 비용 USD와 토큰의 방향이 갈려도 적는다. 1차 DONE이 전 셀이면 R은 계획 + 구현만의 비율임을 명시.

## 측정하지 않는 것

- 품질 — 1스테이지 사다리 포화(B15). 분할이 구현자에게 주는 효과(B14의 가설)는 이 설계로 분리되지 않는다(분할은 plan-smith arm에만 있다).
- 실제 사용자의 확인 게이트 응답, 대화 맥락(요구사항 파일 하나뿐).
- 서브에이전트(plan-writer)의 effort — 고정할 방법이 없다(claude-x-codex-lab effort-flags E6). 제품 그대로 둔다.
- 과제 1종, n=3 — 방향 신호. 달러의 정답(CLI 추정치).

## 실행 전 카나리 (2026-09-29, 스톱워치 한 페이지, `claude-opus-5-5`, 러너와 같은 플래그)

| 검사 | base | plan-smith 1.6.0 |
|---|---|---|
| 완료 | ✓ 3턴 | ✓ 28턴 |
| 주입(첨부 구조 기준) CLAUDE.md · 훅 · advisor | 0 · 0 · 0 | 0 · 0 · 0 |
| 보이는 스킬 | 내장 스킬만(dataviz, code-review 등) — 사용자 플러그인·스킬 0 | 동일 + `plan-smith:forge` |
| 파이프라인 | — | packet → plan-writer 작성 → **새 인스턴스 배선 감사(결함 6)** → 반영 → **Stage 2d 분할**(33,578자 → 인덱스 + 파트 6, `split-check.py` exit 0) — plan-writer 4회 전부 `claude-opus-5-5` |
| Bash 사용 | 1회 | 21회(`wc -m`, `split-check.py` 등) |
| `Unknown --effort` 경고 | 0 | 0 |
| 패킷의 계정 이메일 | — | **있음**(`Requested by: zeriong (<계정 이메일>)`) — opus에서도 발생. 러너의 가림·검사가 처리한다(B19) |

**카나리 자체의 관측 — 계획 단계만, 작은 과제(n=1):** base 59,335 토큰 · 126초 · $0.44 → plan-smith 4,104,268 토큰 · 2,670초 · $9.80
(**69배 · 21배 · 22배**). 1.4.2 카나리(16.8배)보다 격차가 크다 — 격리 설정으로 base의 기본 컨텍스트가 줄었고(110,783→59,335), 1.6.0은 분할 단계가 더해졌다.

**부수 관측(제품):** 분할 검사 통과 **뒤에** 메인 에이전트가 분할 담당이 보고한 문구 결함 3건을 파트에 직접 고쳤고, 그 수정은 검사기로 다시 확인되지 않았다
(`plan.unsplit.md` 는 절차대로 이미 지운 뒤). 설계 불변식 1("메인 에이전트는 플랜을 쓰지 않는다")과 Stage 2d의 "옮기기만"과 부딪칠 수 있다 — 발견 문서에서 다룬다.
카나리 산출물은 표본이 아니므로 커밋하지 않는다(세션 id: base `4daf8ebd` · ps `44d21d66`).

## 실행 방식

사용자 결정(2026-09-29): 지출 한도 상향 후 **바로 실행**. 추정(카나리·1.4.2 외삽, 2배 오차 가능): plan-smith 체인 약 $30~50, base 체인 약 $15~25, 12체인 약 $270~450, 벽시계 배치당 1~2시간.

## 실행 중 기록 — CLI 자동 업데이트와 r1 기동 실패 (2026-09-29)

- 카나리는 Claude Code **2.1.283**, 본 실행은 **2.1.284**(12:35 KST 자동 업데이트)에서 돌았다(트랜스크립트 `version` 필드).
  본 실행 트랜스크립트에 카나리와 같은 주입 검사를 사후 적용해 하네스 동등성을 확인한다.
- **r1 배치 4체인이 기동 직후 전부 빈 출력으로 끝났다**(CLI JSON 0바이트, stderr 0바이트, 세션 트랜스크립트 없음 — 세션이 시작조차 되지 않음).
  몇 초 뒤 기동한 r2는 정상 진행. 원인은 확정하지 못했다(업데이트 직후 첫 기동과 관련된 것으로 추정). **측정이 아니라 기동 실패**이므로 r1은
  러너 재호출 때 `evidence/aborted/` 로 옮긴 뒤 재실행한다 — 실행 순서가 r2 → r3 → r1이 된다.
- 재실행부터 `DISABLE_AUTOUPDATER=1` 로 CLI 자체 업데이트를 막는다(실행 중인 러너 파일은 고치지 않는다 — 실행 중 bash 스크립트 수정은 위험).

## 실행 중 기록 — 세션 종료로 r2 배치 강제 종료 (2026-09-29 13시경 KST)

오케스트레이터의 Claude Code 세션이 끝나면서 그 세션이 띄운 백그라운드 러너와 `claude -p` 4개가 함께 종료됐다. r2 배치는 계획 단계 도중이었다
(완주 단계 0). 소모 하한(트랜스크립트, 끊긴 스트림 제외): **997,292 토큰**. r1(기동 실패)과 r2의 기록·부분 산출물은 러너 재호출 때 `evidence/aborted/`로 옮겨진다.

**재발 방지:** 러너를 오케스트레이터 세션과 분리된 프로세스로 띄운다(`nohup` + 이중 fork, 출력은 `evidence/runner.log`). `DISABLE_AUTOUPDATER=1` 을 러너에 추가.
프롬프트 함수는 여전히 diff 0줄. 재실행 순서는 r1 → r2 → r3(러너 기본값).
