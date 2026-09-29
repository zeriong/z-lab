# 웹브라우저 앵그리버드류 게임 — 구현 플랜

- Reasoning frame: **spec-coverage** (Gate 0 판정: build-out — 스펙이 이미 완전하고, 문자 그대로 따랐을 때의 위험은 "잘못 골랐다"가 아니라 "빠뜨렸다"이다) / Style: **opus, standalone** (auto-routing 기본값: 사람이 읽는 1차 초안이며 relay/fable을 당길 신호 없음)
- 한줄 요약: 10개 스테이지·슬링샷 물리·우측 일시정지 오버레이를 요구하는 완전한 스펙에 대해, 생략 없이 표면을 전부 나열하고 클리어까지 실제로 닫히는 경로 하나를 배선까지 검증한 구현 순서를 제시한다.

<!-- plan-smith:index -->
> This file is an index — it holds no implementation. Read every part below in order; each one ends
> with a pointer to the next. Do not start the work from this file alone.

| order | part | covers | read after |
|---|---|---|---|
| A0 | [overview_A0.md](parts/overview_A0.md) | Run stamp & 의도 패킷 (과업·목표·하드 제약·기각 대안·열린 질문·Gate 0/Style 판정) | — |
| B0 | [coverage_B0.md](parts/coverage_B0.md) | The frame's mandated starting point — Requirement × Surface 커버리지 매트릭스 (R1–R34), verb 문장, 명명된 배포 스택 | A0 |
| C0 | [goal_C0.md](parts/goal_C0.md) | Problem definition / goal, Explicit assumptions (로드베어링 가정 포함) | B0 |
| D0 | [steps_D0.md](parts/steps_D0.md) | Approach & steps (Step 0–11) | C0 |
| E0 | [load-bearing_E0.md](parts/load-bearing_E0.md) | **Load-bearing path** (5홉 표 + 콜드스타트 표) | D0 |
| F0 | [risks_F0.md](parts/risks_F0.md) | Alternatives & rejection rationale, Risks & mitigations | E0 |
| G0 | [contract_G0.md](parts/contract_G0.md) | **Definition of "done"**, **Implementer contract** (수치 태그 포함), Frame deviations & habit regressions | F0 |
<!-- /plan-smith:index -->
