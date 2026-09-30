# 웹 앵그리버드 게임 — 구현 계획서
- Reasoning frame: spec-coverage / Style: opus (standalone)
- 한 줄 요약: 빌드 없이 브라우저가 직접 여는 HTML+CSS+JS 5개 파일 + Matter.js CDN 한 줄로, 10개 저작 스테이지·새총 물리 플레이·우상단 일시정지(다시하기/메인으로)를 갖춘 게임을 만든다. 이 문서는 자기완결적이다 — 파일명·전역 심볼·함수 시그니처·상태 이름·DOM id·스테이지 데이터·CDN URL 을 전부 여기서 고정하며, 구현자는 이 문서 외의 자료를 볼 수 없고 설치·빌드·실행·테스트도 할 수 없다는 전제로 쓰였다.

작성 전 자기 점검: 이 과제에서 내 반사적 습관은 "파일 구조와 엔진 루프부터 설계하고 화면·콘텐츠는 나중에 채우는 것"이다. 그 습관이 정확히 이 과제 유형의 기록된 실패(부품은 다 있는데 스테이지가 1개, 점수·영속이 침묵, 발사 배선이 끊김)를 낳으므로, 아래는 **요구사항 × 표면 행렬**을 먼저 세우고 그 행렬을 섬기도록 구조를 고른다.

---

<!-- plan-smith:index -->
> This file is an index — it holds no implementation. Read every part below in order; each one ends
> with a pointer to the next. Do not start the work from this file alone.

| order | part | covers | read after |
|---|---|---|---|
| A0 | [overview_A0.md](parts/overview_A0.md) | §1 요구사항 × 표면 행렬 (1.1 build 행의 동사 문장, 1.2 표면별 품질 하한) · §2 문제 정의/목표 · §3 명시 가정 | — |
| B0 | [stack_B0.md](parts/stack_B0.md) | §4 전달 스택과 산 이유 · §4.1 파일과 스크립트 순서 · §5.1 Matter 별칭 줄 · §5.2 상수 · §5.3 초기 상태 `G` 선언 | A0 |
| B1 | [api_B1.md](parts/api_B1.md) | §5.4 파일별 공개 함수 시그니처 · §5.5 스테이지 객체 스키마 · §5.6 DOM 골격·CSS 필수 규칙·버튼 배선 | B0 |
| C0 | [stages_C0.md](parts/stages_C0.md) | §6 콘텐츠 — 스테이지 10개 저작 표와 난이도 곡선 | B1 |
| D0 | [steps_D0.md](parts/steps_D0.md) | §7 접근과 단계 — 7.1 상태 전이, 7.2 입력 규칙, 7.3 프레임 루프, 7.4 판정 규칙, 7.5 단계 S0~S6, 7.6 합성음 사양 | C0 |
| D1 | [path_D1.md](parts/path_D1.md) | §8 하중 경로 (load-bearing path) — 홉 1~5 표 + 콜드스타트 표 | D0 |
| E0 | [numbers_E0.md](parts/numbers_E0.md) | §9 숫자와 그 태그 (첫 검수 교체 조건) | D1 |
| E1 | [risks_E1.md](parts/risks_E1.md) | §10 대안과 기각 사유(부활 트리거) · §11 리스크와 완화 | E0 |
| F0 | [contract_F0.md](parts/contract_F0.md) | §12 "완료"의 정의 (definition of done) + 인수 검수 · §13 구현자 계약 (implementer contract) · Frame deviations & habit regressions | E1 |
<!-- /plan-smith:index -->
