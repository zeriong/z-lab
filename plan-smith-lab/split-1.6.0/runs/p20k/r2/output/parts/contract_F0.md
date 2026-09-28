> plan-smith · part 6/6 · F0 · index: [plan.md](../plan.md)

## Definition of "done"

- `tsc --noEmit` 종료코드 0 (TypeScript가 사준 스키마/상태머신 컴파일 타임 검사가 실제로 걸림을 증명).
- `npm test` 종료코드 0 — 최소 한 테스트가 "충격량이 killThreshold 이상이면 pig 제거"와 "killThreshold 미만이면 pig 유지"를 **양방향으로** 단언한다(한쪽만 확인하면 항상 통과하는 순환 판정이 됨).
- 신선한 브라우저 프로필(localStorage 빈 상태)에서 MainMenu→StageSelect→Stage1 진입→드래그 발사→모든 pig 제거→StageClear 오버레이→Stage2 잠금해제→새로고침 후 StageSelect에 Stage2 unlocked 표시까지, 총 10회의 수동 실행 중 **≥9/10 성공**(수치 태그: declared arbitrary, 첫 측정 시점: Step 8 완료 후, 이후 자동화 E2E 테스트로 교체).
- 각 스테이지에서 최소 1회, 일시정지 버튼 클릭→오버레이의 "다시하기"가 동일 스테이지를 `pigsAliveCount`가 저작값과 정확히 일치하는 상태로 재시작하고, "메인으로"가 MainMenu로 전환됨을 수동 확인.

## Implementer contract

- **기각 대안은 부활 조건을 갖는다.** 위 `## Alternatives & rejection rationale`의 4건 모두 트리거 명시됨 — 특히 커스텀 물리 엔진 기각은 "Matter.js를 쓰기로 했다"는 선언만으로 끝나지 않는다: 구현 시 실제로 `matter-js`를 import하고 사용해야 하며, 그렇지 않고 손수 구현으로 새는 것은 이 계약 위반이다.
- **스택은 해석 가능한 버전으로 고정된다.** 이 문서는 오프라인 상태에서 검증할 수 없는 `matter-js`/`vite`/`typescript`의 구체적 버전 번호를 주장하지 않는다. Step 0에서 `npm view <package> version`으로 실제 배포된 버전을 확인한 뒤 package.json과 lockfile에 정확히 고정하고 커밋하는 것이 이 계약의 일부다. Canvas 2D는 브라우저 네이티브 API라 버전 고정 대상이 아니다.
- **각 스택이 사준 보증에는 "done"의 커맨드가 붙는다.** TypeScript는 스키마/상태머신 검사를 사준다 → `tsc --noEmit` exits 0. Matter.js는 충돌·파괴 판정을 사준다 → `npm test` exits 0, 양방향 단언 테스트 포함(위 `## Definition of "done"` 참조). 두 커맨드 모두 이 문서의 "done" 섹션에 이미 있다 — 프로퍼티가 아니라 커맨드로 존재한다.

**수치 태그 (숫자 근거 — 균일 태깅 금지, 실제 근거별로 다르게 태깅):**
- `grabRadius=60px`, `minLaunchThreshold=10px` — **declared arbitrary**, lifetime cap: Step 8 플레이테스트에서 실측 교체.
- 재질별 `breakThreshold` 비율(얼음:나무:돌 = 1:2:4) — **derived**: 앵그리버드류 장르 관습의 재질 강도 서열(얼음이 가장 약함, 돌이 가장 강함)에서 도출된 비율.
- `parScore`(스테이지별 3성 임계값) — **derived**: "로드아웃 새 수 − 1마리"로 클리어했을 때 도달 가능한 점수로 계산 규칙 자체가 정의됨(임의값이 아니라 게임 룰에서 산출).
- 파티클 동시 최대 개수 20개 — **declared arbitrary**, lifetime cap: Step 9 QA에서 성능 이슈 관찰 시 하향, 아니면 유지.
- `killThreshold`(pig별 절대값) — **declared arbitrary per-pig**, lifetime cap: Step 8 저작 시 플레이테스트로 확정.
- 수동 실행 성공률 `≥9/10` — **declared arbitrary**, lifetime cap: Step 8 완료 후 자동화 E2E로 대체(위 `## Definition of "done"`에 명시).

## Frame deviations & habit regressions

- **가장 약한 절, 리뷰어라면 여기를 공격한다:** `R12`/`R22`/`R23`(파티클/배경/오디오)의 "thin" 정의를 수치(파티클 최대 20개, SFX 4종)로 좁혀 두었지만, 그 수치들 자체는 어떤 플레이테스트도 거치지 않은 첫 추정이다 — `## Implementer contract`의 수치 태그 절에서 이를 declared arbitrary로 정직하게 표시했고 대체 시점을 Step 9로 못박았지만, "얇게"라는 형용사가 여전히 최종 결정권을 쥐고 있다는 점은 남는 약점이다.
- **관습을 프레임보다 앞세운 지점, 명시적으로 인정:** 새의 파워/각도 물리량 수식화(포물선+순수 중력, 별도 감쇄항 없음)는 앵그리버드류 장르 관습을 그대로 채용했다 — `spec-coverage`가 이 하위 결정을 도출해내라고 요구하지 않았고, 도출 시도도 하지 않았다. `## The frame's mandated starting point`의 스택 절에서 이를 "명명된 배포 스택, 구매 이유 명시"로 처리한 것과 같은 성격의 정직한 관습 채택이다.
- **드리프트 자가점검 결과, 실제로 발견되어 고쳐진 것:** 초안 단계에서 `## Approach & steps`를 Step 0→11 순번으로만 나열하려는 습관(오름차순 서사)이 있었으나, Step 6에 "Step 1·2에만 의존, Step 3~5와 병렬 가능"을 명시적으로 적어 사다리형 나열이 아니라는 것을 본문에 남겼다 — 이 항목은 확인 시점에 이미 본문에서 해결됐으므로 잔여 결함이 아니라 고쳐진 기록으로 남긴다.
- **명확화하지 않은 채 남긴 결정:** "메인으로"의 목적지(메인 메뉴 vs 스테이지 선택)는 요청사항 원문이 특정하지 않았고, `## Explicit assumptions`에서 메인 메뉴로 결정했다 — 이는 추측이 아니라 낮은 되돌리기 비용을 근거로 한 명시적 결정이며, 되돌릴 경우의 비용도 함께 적었다.
- **배선 감사 반영(사후 수정 기록):** Q2 — 콜드스타트 표에 "월드 바디·리스너 잔존" 행을 추가해 hop2의 선행조건(이전 world의 바디·리스너 제거)에 대응하는 행이 없던 빈 칸을 닫았다. Q3 — Step 3 서술에 포인터 업 핸들러의 impulse 적용·`state="InFlight"` 전이·`birdsRemaining` 감소를 명시해 hop4와 R3/hop3/R14가 의존하던 두 고아 액션(InFlight 전이 자체, 발사당 birdsRemaining 감소)의 커밋 지점을 만들었다. Q1/Q4/Q5는 감사 자체가 "결함 없음"으로 판정했으므로 본문을 고치지 않았다.

> plan-smith · next: end of plan
