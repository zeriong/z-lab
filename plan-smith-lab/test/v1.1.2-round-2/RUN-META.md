# 라운드 2 — 실행 조건 기록

> 라운드1과 달리 이 기록은 **실행 전에** 작성됐다. plan-smith v1.1.2가 패킷에 같은 정보를
> 자동 스탬프하므로, 이 파일은 그 스탬프와 교차 검증된다.

## 플러그인 상태 (plan-smith)

| 항목 | 값 |
|---|---|
| 설치 버전 | **1.1.2** (기능 기준은 1.1.1 — 1.1.2는 런 스탬프 추가) |
| 커밋 | `a964a4e` — "feat(packet): stamp the version and model that ran" |
| `frames.md` | **364줄** (R1: 328줄) |
| 라운드1 대비 변경점 | ① off-anchor 조항: 아키텍처 권한 ≠ 납품 범위 + 요구 격하 금지 ② canon watch-out: 도출 종결 ≠ 명세 종결 ③ **Gate 0** 라우팅(결정 vs build-out) + tie-break(애매하면 build-out) ④ **신규 프레임 `spec-coverage`**(26번째) ⑤ 문서 예산(방법론 논증은 패킷으로) |
| 읽을 경로 | 소스 디렉토리 (R1과 동일 — 현재 설치 캐시와 내용 동일) |

## 모델 (resolved id, 별칭 금지)

| 셀 | 플랜 작성 모델 | 비고 |
|---|---|---|
| `opus-5/plan-smith` | `claude-opus-5` | 카나리 |
| `opus-5/plan` | `claude-opus-5` | 동시대 베이스라인 — R1의 opus 베이스라인은 4.8이 썼으므로 이 셀로 모델 고정 대조 확보 |
| `fable-5/plan-smith` | `claude-fable-5` | R1과 동일 모델 |
| `sonnet-5/plan-smith` | `claude-sonnet-5` | R1과 동일 모델 |
| `haiku-4.5/plan-smith` | `claude-haiku-4-5-20251001` | R1과 동일 모델 |

**opus만 R1과 모델이 다릅니다**(4.8 → 5). 4.8 별칭이 더 이상 없어 불가피하며, 그래서 판정은
[RUBRIC.md](../RUBRIC.md)의 절대 기준으로 하고 R1 대비 정량 개선폭은 주장하지 않습니다.

## 실행 방식 (R1과 동일 — 변수 통제)

- 입력: 라운드1과 **동일한** [game-prompt.md](../game-prompt.md)
- 플랜: 배치 워크플로 서브에이전트가 스킬 문서를 읽고 작성, 대화형 확인 게이트는 자가 승인
- 구현(조건부): 도구를 `Read/Glob/Grep/Write`로 제한 → 빌드·실행·QA·리뷰·자가수정·git 구조적 불가. **순수 추론 1-shot**
- 판정: 플랜을 쓰지 않은 별도 채점 에이전트가 RUBRIC 7항목 채점

## 결과

<!-- 실행 후 기록: 셀별 Gate 0 판정 / 선정 프레임 / 루브릭 7항목 점수 / 토큰·시간 -->
_(실행 대기)_
