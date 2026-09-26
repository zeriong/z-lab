# model-bump / tco — 새 세대에서의 완성까지 총비용 (실행 전 고정)

**이 명세는 1단계(pure-model 재측정) 결과를 보기 전에 고정했다.** 1단계 본 실행(`wf_37ec4917-303`)이
진행 중인 동안 작성·커밋했으며, 1단계 산출물은 열람하지 않았다.

## 질문

원 tco([`../../tco/`](../../tco/))는 **opus-5 계획 + haiku 구현** 조건에서 plan-smith 1.4가 작동하는 산출물까지의
총비용을 65.5% 줄였다고 측정했다. 그 보고서의 한계 절은 두 가지를 열어 뒀다.

| 하위 실험 | 여는 한계 | 고정하는 것 | 바꾸는 것 |
|---|---|---|---|
| **2a `impl-swap`** | "강한 구현자에서는 절감이 줄 수 있다" | 플랜 2종(원 tco의 것, 바이트 동일) | **구현자**: haiku → Opus 5.5 · Fable 5.1 |
| **2b `planner-swap`** | 계획자 1종(opus-5)뿐 | 구현자 haiku, 과제, 사다리 | **계획자**: opus-5 → Opus 5.5 |

2a는 "강한 구현자에게도 복사 가능한 접착부가 값을 하는가", 2b는 "새 세대 계획자가 방법론 없이도
그 격차를 스스로 메우는가"를 묻는다. 둘 다 다음 plan-smith 릴리스의 방향을 가른다.

## 입력 (전부 [`inputs/`](inputs/), sha256)

| 파일 | 출처 | sha256 |
|---|---|---|
| `fixed-plans/informed-baseline.md` | `transfer/v1.4-validation/informed-baseline/plan.md` (claude-opus-5, 방법론 없음 + 구현자 고지) | `3ba99fc2877fc392f140c7ccebce6449baebdfc8d25543b591f377c1ab1b1c04` |
| `fixed-plans/plan-smith-1.4.md` | `transfer/v1.4-validation/copyable-glue/plan.md` (claude-opus-5, plan-smith 1.4 + 같은 고지) | `4117a2a6c1fd1726d63b18234cabdc9c056fac4326e1353c411faccb0413a2eb` |
| `game-prompt.md` | `test/game-prompt.md` | `acd324ecf54841cc7c7d1c4136ecdaed6ccaa5a1a0c55b2f1d8be528be62c347` |
| `skill-v1.4.2/SKILL.md` | plan-smith `c3c336b` (1.4.2 — 스킬 문서는 1.4.0 `22e7530`과 diff 0줄) | `2fb633b3ab5bd581ee0415836708aba102ae0d1fa57d286f790d46a86f173c73` |
| `skill-v1.4.2/references/frames.md` | 〃 | `a3df58434a23a187fe9cf84d0737bbeb8201a27cff08ff8fd87c5482fc1cd760` |
| `skill-v1.4.2/references/styles.md` | 〃 | `386f4ccce6a2ceae59e975ec8578459f515a74aaff191df4fcd1fa4d1d9d55ec` |
| `skill-v1.4.2/references/packet-template.md` | 〃 | `5b2819ac33af2bcf462e412d81ab2adc29c0afd044166db418726ebca93fa877` |

고정 플랜 두 편의 본문에는 "haiku"라는 단어가 없다(grep 0건) — 구현자 등급을 드러내지 않으므로
강한 구현자에게 그대로 줄 수 있다. 두 플랜 모두 "구현자는 읽기/쓰기 도구만, 이 문서 하나만" 전제를 담는다.

## 셀

### 2a `impl-swap/` — 구현 12

| 셀 | 플랜 | 구현자 | n |
|---|---|---|---|
| `impl-swap/<impl>/informed-baseline/r1..r3` | `fixed-plans/informed-baseline.md` | `opus`(→claude-opus-5-5) · `fable`(→claude-fable-5-1) | 3 |
| `impl-swap/<impl>/plan-smith-1.4/r1..r3` | `fixed-plans/plan-smith-1.4.md` | 〃 | 3 |

n=3(transfer와 같음): 새 축의 방향 신호. 원 tco의 n=4보다 작다는 것을 결과 해석에 반영한다.

### 2b `planner-swap/` — 플랜 2 + 구현 8

| 셀 | 계획자 | 플랜 조건 | 구현자 | n |
|---|---|---|---|---|
| `planner-swap/informed-baseline/` | `opus`(→claude-opus-5-5) | 방법론 없음 + 구현자 고지 | haiku | 4 |
| `planner-swap/plan-smith-1.4.2/` | 〃 | `skill-v1.4.2/` 4종 + 같은 고지 | haiku | 4 |

n=4: 원 tco와 같은 조건의 **계획자만 바꾼 복제**다.

**⚠️ 계획 프롬프트는 재구성이다.** v1.3/1.4-validation의 계획 프롬프트는 워크플로 스크립트에만 있었고
세션 정리로 사라졌다(제9조 위반의 실제 비용). 남은 기록은 v1.3 SPEC의 서술 — "방법론 없음 +
'이 플랜의 구현자는 claude-haiku-4-5다' 한 줄" — 과, 그 결과 플랜들이 "읽기/쓰기 도구만, 이 문서 하나만"
전제를 담고 있다는 사실이다. 이에 따라 pure-model의 계획 프롬프트 문안에 아래 고지를 붙인다(양 arm 동일, T2):

> 이 계획서의 구현자는 claude-haiku-4-5다. 구현자는 이 계획서 하나만 읽고, 파일을 읽고 쓰는 도구만으로
> 작업한다(설치·빌드·실행·테스트 불가).

따라서 2b는 원 tco와 **계획 프롬프트 문안이 글자 단위로 같다고 보장하지 못한다.**

### 공통

- 에이전트 `bare-model`(Read/Write). 구현 프롬프트는 transfer `runner.js`의 `implPrompt`와 문안 동일, 입력은 플랜 단독.
- 순수성: 1단계 SPEC의 카나리 조건 그대로(advisor·ponytail·CLAUDE.md·user relay 0 — 사후 `../audit.py` 로 전 셀 확인).
- 2a·2b는 서로의 경로를 읽지 않는다(`audit.py` 접근 위반 0 확인).

## 판정 — 원 tco와 동일 (고정)

- **사다리** L0 빌드 → L1 부팅 → L2 월드 렌더 → L3 발사 → L4 턴 → L5 종결 · L6 콘텐츠(소스).
  계측 규율: 리스너·좌표는 소스/스크린샷에서 읽고, `setPointerCapture` 전 셀 무력화, 0이면 계측부터 의심.
- **DONE** = L5 도달 **그리고** 프로브 중 uncaught JS 에러 0.
- **수리 루프**: DONE이 아닌 셀만 사본(`<셀>-repair/`)에서. 수리자 = **그 셀의 구현자와 같은 모델** + bare-model.
  프롬프트는 원 tco의 고정 템플릿 그대로. **상한 3라운드**, 초과 시 DNF(쓴 토큰 전액 계상).

## 지표 (고정)

- **체인 비용** = 플랜 토큰(arm당 1회분을 체인 수로 안분) + 구현 토큰 + 수리 토큰. 전부 트랜스크립트 집계
  (in+cache_creation+cache_read+out), output 단독 병기.
- 2a의 플랜 토큰은 **원 tco METRICS의 기록값을 인용**한다(A 228,573 · B 689,430) — 원 트랜스크립트는 삭제돼 재집계 불가.
- 1차 납품 DONE 수, 수리 라운드 수, 결함 원문(콘솔)과 결함 종류(국소 심볼 vs 컴포넌트 계약 불일치).

## 결정 규칙 (고정) — 릴리스 방향

비율 R = (B arm 총비용) / (A arm 총비용). B = plan-smith, A = informed-baseline.

| 하위 실험 | R ≤ 0.9 | 0.9 < R < 1.1 | R ≥ 1.1 |
|---|---|---|---|
| **2a** (구현자별로 판정) | 접착부가 강한 구현자에게도 값을 한다 → 등급 무관 유지 | 강한 구현자에겐 중립 → 변경 없음, FAQ에 등급별 수치 기재 | 강한 구현자에겐 **비용** → v1.5 후보: 구현자 등급 인지 예산(구현자가 계획자보다 약할 때만 복사 블록) |
| **2b** | 새 계획자에서도 v1.4 효과 재현 → 유지 | 새 계획자가 격차를 스스로 메움 → 약한 구현자용 가치 축소를 백로그에 기록 | 회귀 → 원인 조사 후 백로그 |

- 2a에서 두 구현자의 판정이 갈리면 각각 적는다(평균 내지 않는다).
- **A·B 모두 1차 납품 DONE이 전 셀이고 수리가 0이면** R은 플랜+구현 비용만의 비율이 된다 — 그 사실을 판정 옆에 명시한다.
- 어떤 결과든 plan-smith FAQ의 "토큰 경제" 항목에 등급·세대별 실측으로 추가한다(원 tco의 사전 등록과 같은 처리).

## 측정하지 않는 것

- 과제 1종(앵그리버드) · n=3(2a)/4(2b) · 플랜 생성 변동(플랜 n=1) — 방향 신호이지 유의성이 아니다.
- 2b의 계획 프롬프트는 재구성본이라 원 tco와의 비교에 문안 차이가 섞일 수 있다.
- 2a의 플랜 토큰은 인용값(원 실행의 계측) — 이번 실행의 계측이 아니다.
- 수리 프롬프트는 고정 템플릿 — 실제 사용자의 표현은 모사하지 않는다.
- Stage 1 의도 교정 게이트(배치라 여전히 부재). 게임 품질·재미.
