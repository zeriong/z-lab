# 웹 브라우저 앵그리버드 — 구현 플랜

- Reasoning frame: spec-coverage / Style: opus
- 한 줄 요약: 빌드 도구 없이 브라우저가 직접 여는 파일 5개(`index.html` + 스크립트 4개)로, Matter.js 0.19.0을 CDN에서 받아 10개 스테이지의 슬링샷 물리 게임과 우측 일시정지(다시하기/메인으로)를 만든다.

---

<!-- plan-smith:index -->
> This file is an index — it holds no implementation. Read every part below in order; each one ends
> with a pointer to the next. Do not start the work from this file alone.

| order | part | covers | read after |
|---|---|---|---|
| A0 | [overview_A0.md](parts/overview_A0.md) | §1 요구사항 × 표면 커버리지 매트릭스 (frame starting point, §1.1 quality floor, §1.2 동사 문장 25개), §2 문제 정의와 목표, §3 명시적 가정 | — |
| B0 | [stack_B0.md](parts/stack_B0.md) | §4 전달 스택, §5 파일 구성 도입부, §5.1 `index.html` 뼈대, §5.2 Matter 별칭 | A0 |
| B1 | [glue-symbols_B1.md](parts/glue-symbols_B1.md) | §5.3 심볼 표, §5.4 공용 상수와 초기 상태, §5.5 포인터 좌표 변환 | B0 |
| B2 | [glue-code_B2.md](parts/glue-code_B2.md) | §5.6 당김과 궤적, §5.7 발사 순서, §5.8 충돌, §5.9 메인 루프, §5.10 저장소, §5.11 스테이지 스키마·재질 | B1 |
| C0 | [stages-steps_C0.md](parts/stages-steps_C0.md) | §6 스테이지 10종 저작 표, §7 접근과 단계 (S1–S10) | B2 |
| D0 | [load-bearing_D0.md](parts/load-bearing_D0.md) | §8 Load-bearing path (5 hops) + §8.1 콜드 스타트 표 — **load-bearing path** | C0 |
| E0 | [risks_E0.md](parts/risks_E0.md) | §9 대안과 기각 사유, §10 리스크와 완화 | D0 |
| F0 | [contract_F0.md](parts/contract_F0.md) | §11 "완료"의 정의 — **definition of done**, §12 Implementer contract — **implementer contract**, §13 Frame deviations & habit regressions | E0 |
<!-- /plan-smith:index -->
