# model-bump — 새 모델 세대(Opus 5.5 · Fable 5.1)에서의 재측정

2026-09-26 실행. plan-smith 계열의 핵심 측정 두 가지를 새 세대에서 다시 했다. 해석은 [`../analyze/v1.4.2/model-bump-review.md`](../analyze/v1.4.2/model-bump-review.md).

| 단계 | 디렉토리 | 고립한 축 | 셀 | 1차 결과 | 명세 커밋 |
|---|---|---|---|---|---|
| 1 | [`pure-model/`](pure-model/) | 모델만 (명세·프롬프트·v1.2.0 처치 고정) | 4 | 발사 **4/4 PASS** — 원 세대와 판정 동일. 바뀐 건 규모(baseline 플랜 ×2) | `3680fdd` |
| 2a | [`tco/impl-swap/`](tco/) | 구현자 (haiku → opus-5.5 · fable-5.1, 플랜 고정) | 12 | **12/12 DONE**. R opus 0.818 · fable 1.162 | `819974a` |
| 2b | [`tco/planner-swap/`](tco/) | 계획자 (opus-5 → opus-5.5, 구현 haiku) | 8 | **8/8 DONE**. R 0.435 (절감 56.5%) | `819974a` |

각 단계 디렉토리에 제3조 4종이 있다: `SPEC.md`(입력 명세, 실행 전 커밋) · arm별 표본 · `METRICS.md` · `FINDINGS.md`.
증거(감사 JSON, 워크플로 journal·결과)는 각 `evidence/`에 보관 — 세션 트랜스크립트는 약 30일 뒤 자동 삭제된다.

## 공용 도구

| 파일 | 무엇 |
|---|---|
| [`audit.py`](audit.py) | 트랜스크립트에서 토큰(캐시 포함)·resolved model·도구·주입 5종·과제 밖 파일 접근을 직접 센다. 카나리 1(오염)·4(무오염)로 검증 |
| [`probe.js`](probe.js) | 사후 관측 헬퍼 — 전 셀 동일 주입(`setPointerCapture` 무력화, uncaught 수집, 프레임 차분, 합성 드래그) |

## 이 계열에서 새로 확인한 환경 사실

1단계 SPEC의 카나리 기록 참조. 요약: 하네스 2.1.282에서 `bare-model` 서브에이전트에 **ponytail `SubagentStart` 훅**,
**전역·프로젝트 CLAUDE.md**, **워크플로 기동 사용자 메시지 relay**가 주입되고 있었다. 셋 다 제거하고(설정·환경변수) 전 셀 사후 0건을 확인했다.
"computed task" 하네스 프레임은 제거할 수 없어 잔존을 고지했다.

## 가장 중요한 한계

**사다리가 포화했다(백로그 B14).** 24셀 전부 L5 — 이 과제·이 깊이로는 새 세대의 품질 차이를 잴 수 없다. 남은 변별은 비용뿐이며,
토큰 합은 달러가 아니다(cache_read 비중 큼). 다음 계열은 더 깊은 사다리나 다른 과제로 변별력부터 확보해야 한다.
