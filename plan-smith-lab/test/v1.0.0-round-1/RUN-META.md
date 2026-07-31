# 라운드 1 — 실행 조건 기록

> 이 파일은 사후에 로그에서 복원한 것이다. 라운드1 실행 당시에는 버전·모델을 기록하는 규약이 없었고,
> 그 부재가 하마터면 두 라운드를 잘못 라벨하게 만들었다. plan-smith v1.1.2가 이 기록을 패킷에 자동화한 것은
> 이 사고의 직접적 산물이다.

## 플러그인 상태 (plan-smith)

| 항목 | 값 |
|---|---|
| 커밋 | `ce9a96a` — "feat: add plan-smith planning pipeline plugin" (2026-07-19 17:32) |
| 태그된 버전 | 1.0.0 |
| `frames.md` | **328줄** — Gate 0 이전, `spec-coverage` 없음, off-anchor 조항이 아직 "범위 필터"로 오독 가능한 원문 |
| 읽은 경로 | 소스 디렉토리 `Z-Work/plan-smith/plugins/plan-smith/...` (설치 캐시가 아님) |

복원 근거: 플랜 파일 mtime(7/25 15:48~18:00)이 `ce9a96a`(7/19) 이후·`990cf82`(7/30) 이전이며,
`git show ce9a96a:...frames.md | wc -l` = 328이 당시 관측값과 일치.

## ⚠️ 모델 버전 불일치 (opus 셀)

로그에서 확인된 **실제 resolved model id**:

| 모델 폴더 | 플랜 생성 (7/25) | 구현 (7/29~30) | 일치? |
|---|---|---|---|
| `fable-5` | `claude-fable-5` | `claude-fable-5` | ✅ |
| `sonnet-5` | `claude-sonnet-5` | `claude-sonnet-5` | ✅ |
| `haiku-4.5` | `claude-haiku-4-5-20251001` | `claude-haiku-4-5-20251001` | ✅ |
| `opus-4.8plan+5impl` | **`claude-opus-4-8`** | **`claude-opus-5`** | ❌ **불일치** |

근거: `subagents/workflows/wf_526f2533-ff0/agent-*.jsonl` → `"model":"claude-opus-4-8"`,
`wf_a5b9b78e-ebf/agent-*.jsonl` → `"model":"claude-opus-5"`.
원인: 워크플로가 별칭 `opus`를 넘겼고, 7/25에는 그 별칭이 4.8로, 7/29에는 5로 해석됨.

### 이 불일치가 훼손하는 것 / 훼손하지 않는 것

- **훼손하지 않음:** "base plan vs plan-smith" 비교 — 두 플랜 모두 `claude-opus-4-8`이 썼고,
  두 구현 모두 `claude-opus-5`가 했다. 즉 **같은 층위 안에서는 모델이 동일**하므로 방법론 대조는 유효하다.
  이 대조에서 나온 진단(off-anchor 조항이 사운드·이펙트·저장 계층을 제거)은 그대로 유효하다.
- **훼손함:** 라운드1 opus 셀을 라운드2(opus-5)와 직접 비교하는 것 — 플러그인 버전과 모델 버전이 **동시에** 바뀐다.
  그래서 라운드2는 R1 대비 정량 개선폭을 주장하지 않고, [RUBRIC.md](../RUBRIC.md)의 **절대 기준**으로 채점한다.
  단 opus에는 동시대(opus-5) 베이스라인 1셀을 추가해 모델 고정 대조를 확보한다.

## 실행 방식

- 플랜: 배치 워크플로의 서브에이전트가 스킬 문서(SKILL/frames/styles)를 읽고 작성. **대화형 확인 게이트는 자가 승인**(배치 테스트).
- 구현: 도구를 `Read/Glob/Grep/Write`로 제한한 에이전트가 `plan.md`만 보고 **순수 추론 1-shot**.
  빌드·설치·실행·QA·리뷰·자가수정·git이 구조적으로 불가 → `node_modules`/`dist`/`RUN.md` 전무로 확인됨.
  (예외: 사후에 opus/plan 셀만 사용자 요청으로 `npm install && vite build` 수행 — 소스는 미수정.)
- 지표: [METRICS.md](METRICS.md) — 셀별 토큰·소요시간, plan-smith vs baseline 오버헤드.

## 사용자 판정 (품질 신호)

사장님이 브라우저로 직접 확인한 결과 **opus 셀에서 base plan의 품질이 plan-smith보다 명확히 우수**.
이 육안 판정이 v1.1.0~1.1.2 패치를 촉발했다 — 자동 지표는 비용만 측정했고, 품질 신호는 사람만 남겼다.
