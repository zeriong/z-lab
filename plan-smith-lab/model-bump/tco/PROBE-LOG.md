# tco 사후 관측 로그 — 측정한 순서대로 기록

측정자: 오케스트레이터(Opus 5.5). 표본 소스는 수정하지 않는다. 서빙: `python3 -m http.server`(빌드 불요 구조).
계측: [`../probe.js`](../probe.js) 를 `initScript` 로 전 셀 동일 주입 — `setPointerCapture` 무력화, uncaught 에러 수집,
캔버스 1/4 다운샘플 프레임 차분(채널 합 >24를 변화 픽셀로 셈), 합성 포인터 드래그.
좌표는 셀 소스의 상수(예: `SLING_X/Y`, `SLING_MAX_PULL`)와 `getBoundingClientRect` 로 환산 — 추정하지 않는다.
발사 판정 = 놓은 뒤 연속 프레임에서 변화 픽셀 > 20 (무입력 대조 구간 최댓값을 함께 적는다).

| # | 셀 | 서빙 입력 | L1 부팅 | L2 렌더 | L3 발사 | L4 턴 | L5 종결 | uncaught | 점수 | DONE | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | impl-swap/opus-5.5/informed-baseline/r1 | pointer · sling(200,500)→(105,545) | ✓ 에러 0 | ✓ 스크린샷 | ✓ 25/25프레임, 새 3→2 (대조 0) | ✓ 2·3발 장전·발사 | ✓ 실패 오버레이 | 0 | L5 | **DONE** | 명중 0(같은 각도 반복) — 사다리 기준 밖 |
| 2 | impl-swap/opus-5.5/informed-baseline/r2 | 〃 | ✓ 에러 0 | ✓ | ✓ 20/20, 새 3→2 (대조 0) | ✓ | ✓ 실패 오버레이(3발 소진) | 0 | L5 | **DONE** | |
| 3 | impl-swap/opus-5.5/informed-baseline/r3 | 〃 | ✓ 에러 0 | ✓ | ✓ 20/20 (대조 0) | ✓ | ✓ 실패 오버레이 | 0 | L5 | **DONE** | |
| 4 | impl-swap/fable-5.1/informed-baseline/r1 | 〃 | ✓ 에러 0 | ✓ | ✓ 20/20 (대조 0) | ✓ | ✓ 실패 오버레이 | 0 | L5 | **DONE** | 캔버스 rect top=0 — rect 기반 환산이라 무영향 |
| 5 | impl-swap/fable-5.1/informed-baseline/r2 | 〃 | ✓ 에러 0 | ✓ | ✓ 20/20 (대조 0) | ✓ | ✓ 실패 오버레이 | 0 | L5 | **DONE** | |
| 6 | impl-swap/fable-5.1/informed-baseline/r3 | 〃 | ✓ 에러 0 | ✓ | ✓ 20/20 (대조 0) | ✓ | ✓ 실패 오버레이 | 0 | L5 | **DONE** | |

> **셀 7부터** 로더가 `localStorage.clear()` 를 먼저 실행한다(같은 오리진을 공유하는 셀 간 진행도 오염 차단). 셀 1~6은 전부 HUD "스테이지 1"로 시작을 확인했으므로 무영향.
> plan-smith 1.4 계열은 배경(구름) 애니메이션으로 무입력 변화가 14~20 → 발사 판정 임계를 50으로 올렸다.

| # | 셀 | 서빙 입력 | L1 부팅 | L2 렌더 | L3 발사 | L4 턴 | L5 종결 | uncaught | 점수 | DONE | 비고 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 7 | impl-swap/opus-5.5/plan-smith-1.4/r1 | pointer · SLING(210,520)→(110,565), 빗나감 (190,420) | ✓ 에러 0 | ✓ | ✓ 20/20 (대조 14) | ✓ 재시작 후 3→2→1→0 | ✓ **CLEAR(1발)** + 실패 오버레이 | 0 | L5 | **DONE** | 첫 발 명중 CLEAR로 L4가 가려져 재시작해 빗나감 연사로 확인 |
| 8 | impl-swap/opus-5.5/plan-smith-1.4/r2 | 〃 | ✓ | ✓ | ✓ 20/20 (대조 20) | ✓ 재시작 후 3→0 | ✓ **CLEAR(1발)** + 실패 | 0 | L5 | **DONE** | CLEAR 직전 HUD 새 수가 3 그대로(표시 지연) — 사다리 무관 |
| 9 | impl-swap/opus-5.5/plan-smith-1.4/r3 | 〃 | ✓ | ✓ | ✓ 20/20 (대조 14) | ✓ 재시작 후 3→0 | ✓ **CLEAR(1발)** + 실패 | 0 | L5 | **DONE** | 동상 |
| 10 | impl-swap/fable-5.1/plan-smith-1.4/r1 | pointer · SLING(210,520)→(110,565) | ✓ | ✓ | ✓ 20/20 (대조 16) | ✓ 3→2→1→0 | ✓ 실패 오버레이 (점수 500) | 0 | L5 | **DONE** | |
| 11 | impl-swap/fable-5.1/plan-smith-1.4/r2 | 〃 | ✓ | ✓ | ✓ 20/20 (대조 20) | ✓ | ✓ 실패 (500) | 0 | L5 | **DONE** | |
| 12 | impl-swap/fable-5.1/plan-smith-1.4/r3 | 〃 | ✓ | ✓ | ✓ 20/20 (대조 17) | ✓ | ✓ 실패 (500) | 0 | L5 | **DONE** | 대기 새가 화면에 안 그려짐(HUD는 3) — 사다리 무관 |
| 13 | planner-swap/informed-baseline/r1 | pointer · SLING(220,500)→(130,540), 빗나감 (200,400) · 진입 `result/game/index.html` | ✓ | ✓ | ✓ 20/20 (대조 0) | ✓ 재시작 후 3발 연속 발사 | ✓ **CLEAR(1발)** + 실패 | 0 | L5 | **DONE** | 새 수 HUD가 캔버스 내부 → L4는 "2·3번째 드래그가 실제로 발사되는가"로 판정 |
| 14 | planner-swap/informed-baseline/r2 | 〃 · `result/index.html` | ✓ | ✓ | ✓ 20/20 (대조 0) | ✓ | ✓ **CLEAR(1발)** + 실패 | 0 | L5 | **DONE** | |
| 15 | planner-swap/informed-baseline/r3 | 〃 · `result/game/index.html` | ✓ | ✓ | ✓ 19/20 (대조 0) | ✓ | ✓ **CLEAR(1발)** + 실패 | 0 | L5 | **DONE** | |
| 16 | planner-swap/informed-baseline/r4 | 〃 · `result/index.html` | ✓ | ✓ | ✓ 18/20 (대조 0) | ✓ | ✓ **CLEAR(1발)** + 실패 | 0 | L5 | **DONE** | |
| 17 | planner-swap/plan-smith-1.4.2/r1 | pointer · SLING(190,520)→(100,560) | ✓ | ✓ | ✓ 18/20 (대조 18) | ✓ 새 3→2→1→0 | ✓ 실패 (점수 300) | 0 | L5 | **DONE** | |
| 18 | planner-swap/plan-smith-1.4.2/r2 | 〃 | ✓ | ✓ | ✓ 20/20 (대조 3) | ✓ | ✓ 실패 (300) | 0 | L5 | **DONE** | |
| 19 | planner-swap/plan-smith-1.4.2/r3 | 〃 | ✓ | ✓ | ✓ 20/20 (대조 4) | ✓ | ✓ 실패 (300) | 0 | L5 | **DONE** | |
| 20 | planner-swap/plan-smith-1.4.2/r4 | 〃 | ✓ | ✓ | ✓ 20/20 (대조 3) | ✓ | ✓ 실패 (300) | 0 | L5 | **DONE** | |

## L6 — 10스테이지 실재 (소스)

스테이지 데이터 파일(`stages.js` / `levels.js`)에서 스테이지 항목 수를 셌다. **20/20 셀 모두 10개.**
(`impl-swap/opus-5.5/informed-baseline/r2` 는 `stage(id, name, …)` 팩토리 형식이라 `name:` 패턴으로 0이 나왔고, 원문 확인으로 `stage(1…10)` 10개를 확정 — 0이 나오면 계측부터 의심한다.)

## 요약

**20/20 셀이 1차 납품에서 DONE**(L5 + uncaught 0). 수리 루프 대상 없음 — 사전 등록된 수리 템플릿은 한 번도 쓰이지 않았다.
원 tco(opus-5 계획 + haiku 구현)의 1차 DONE은 A 2/4 · B 3/4였다.
