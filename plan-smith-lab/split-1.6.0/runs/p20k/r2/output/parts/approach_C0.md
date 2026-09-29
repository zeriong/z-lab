> plan-smith · part 3/6 · C0 · index: [plan.md](../plan.md)

## Problem definition / goal

브라우저에서 실행되는 앵그리버드류 물리 슬링샷 게임을 만들되, 이 문서는 게임을 구현하지 않고 구현 플랜만 만든다. 성공은 세 가지가 동시에 참일 때다: (1) 10개 스테이지가 메인 메뉴→스테이지 선택 경로로 전부 도달 가능, (2) 각 스테이지에서 슬링샷 발사→포물선/중력/충돌/파괴→목표 제거→클리어까지의 게임 루프가 실제로 닫혀 있음(부품이 나열된 것이 아니라 배선된 것), (3) 인게임 우측 일시정지 버튼이 다시하기/메인으로를 가진 오버레이를 여는 상태 전이가 명세되어 있음.

## Explicit assumptions

- **[로드베어링]** Matter.js의 충돌 이벤트가 제공하는 접촉 정보(페어의 `collision.depth` × 충돌 시점 상대속도)가 구조물/돼지 파괴 임계값 판정에 쓸 수 있을 만큼 안정적인 신호다. **틀렸을 때 영향:** 이 게임을 정의하는 핵심 메커닉(파괴 피드백)의 판정 로직 전체를 재설계해야 함 — 가장 비용이 큰 가정. **가장 값싼 조기 검증:** Step 2에서 알려진 속도로 투사체를 블록에 충돌시키는 단위 테스트 1개로, 콘텐츠 저작(Step 8) 착수 전에 확인한다. **폴백:** 신호가 불안정하면 `collision.depth` 대신 바디의 충돌 전/후 속도 벡터를 직접 계산한 운동량 변화량(Δp = m·Δv)을 임계값 판정에 쓴다 — Matter.js API 교체 없이 계산식만 바뀐다.
- "메인으로" 버튼의 목적지는 메인 메뉴(타이틀) 화면으로 결정한다(스테이지 선택 화면이 아님) — 요청사항 원문이 "메인"만 명시하고 목적지를 특정하지 않았기 때문. **틀렸을 때 영향:** 사용자가 기대한 화면과 다를 수 있으나, 라우팅 타겟 한 줄만 바꾸면 되는 값싼 수정.
- "웹브라우저"는 데스크톱을 1차 타겟으로 하고, 모바일 브라우저 터치는 R25(Pointer Events 통합)로 저비용 커버하되 네이티브 앱 최적화나 방향 고정(R34)은 범위 밖으로 둔다. **틀렸을 때 영향:** 모바일 UX 품질이 기대 이하일 수 있으나 R34는 이미 defer+트리거로 명시돼 있어 재작업 경로가 문서에 있음.
- 일시정지 시 물리 시뮬레이션(Matter.Runner)은 완전히 정지하고 입력은 비활성화된다(배경 애니메이션이 계속 돌아야 한다는 요구는 없음). **틀렸을 때 영향:** 렌더 루프와 물리 루프가 이미 분리돼 있으므로(R8 vs 화면 렌더) 낮은 비용으로 되돌릴 수 있음.

## Approach & steps

각 단계는 선행조건(어느 단계의 산출물을 소비하는지, 또는 "독립/병렬")·검증·서비스하는 매트릭스 행(R#)을 명시한다. 번호는 실행 순서가 아니라 의존관계다 — Step 6은 Step 1·2에만 의존하므로 Step 3~5와 **병렬**로 진행할 수 있다.

- **Step 0 — 프로젝트 스캐폴드 & 스택 고정.** 선행조건: 없음(독립). Vite+TypeScript 프로젝트 생성, Matter.js 설치. 킥오프 시점에 `npm view matter-js version`, `npm view vite version`, `npm view typescript version`으로 실제 배포된 버전을 확인 후 package.json에 정확한 버전으로 고정하고 lockfile을 커밋한다. 검증: `tsc --noEmit` 종료코드 0. 서비스: 기반 인프라(모든 R 행의 전제조건).
- **Step 1 — 화면 셋업 & stageRegistry.** 선행조건: Step 0. MainMenu/StageSelect/GameScene/PauseOverlay/StageClearOverlay/StageFailOverlay/SettingsOverlay 컴포넌트 골격, `GameScene.state` 초기값 `"Idle"`, 10개 스테이지 데이터를 로드하는 stageRegistry 모듈(1번만 실 콘텐츠, 2~10은 임시 placeholder). 검증: 화면 간 라우팅이 클릭으로 전환되는 자동화 테스트 1개 이상. 서비스: R1, R2, R17.
- **Step 2 — 물리 하네스 & load() 스켈레톤.** 선행조건: Step 1. `GameScene.load(stageId)`에서 Matter Engine/World 생성, 지형 1개+블록 1개+pig 1개 스폰, `Matter.Runner.run()` 시작, `state="ReadyToShoot"` 전환. 위 로드베어링 가정을 여기서 검증한다. 검증: 단위 테스트 — 임계값 이상 충격량은 제거, 임계값 미만은 유지(양방향 단언). 서비스: R8, R9.
- **Step 3 — 슬링샷 입력 & 궤적 프리뷰.** 선행조건: Step 2. input-config 모듈에 `grabRadius=60px`, `minLaunchThreshold=10px` 선언, 포인터 down/move/up 핸들러, `state="Dragging"` 전이, 점선 아크 프리뷰. 포인터 업 핸들러가 release velocity로 body에 impulse를 적용하고 state를 "InFlight"로 전환하며 이 시점에 birdsRemaining을 1 감소시킨다. 검증: 수동 QA(드래그 시 아크 실시간 갱신) + 자동화 테스트(release 시 velocity 벡터 계산 정확성). 서비스: R6, R7.
- **Step 4 — 충돌/파괴/점수.** 선행조건: Step 2, Step 3. collisionStart 리스너에서 재질별 breakThreshold/pig killThreshold 비교, `pigsAliveCount`·구조물 hp 갱신, HUD 점수 누적. 검증: 단위 테스트 — 재질별 파괴 서열(얼음<나무<돌)이 유지되는지. 서비스: R3, R4, R10, R11.
- **Step 5 — 클리어/실패 판정 & 오버레이.** 선행조건: Step 4. `afterUpdate` 체커에 `clearFired` 플래그, `pigsAliveCount===0` 판정, `birdsRemaining===0`+투사체 정지 판정(실패), 각 오버레이 연결. 검증: 통합 테스트 — 스테이지 1 시나리오로 클리어/실패 두 경로 모두 자동 재현. 서비스: R13, R14, R19(계산 로직).
- **Step 6 — 일시정지 & teardown.** 선행조건: Step 1, Step 2 (**Step 3~5와 병렬 가능**). 우측 고정 일시정지 버튼, PauseOverlay, `Matter.Runner` 정지/재개, teardown 루틴(모든 바디·리스너 제거 후 재로드) — 투사체가 `state="InFlight"`인 채로 눌려도 동일하게 안전하게 정리되도록 구현. 검증: 수동 QA — 비행 중 일시정지→다시하기 후 `pigsAliveCount`가 저작값으로 정확히 원복되는지(중복 바디 없음). 서비스: R5, R15, R16, R17.
- **Step 7 — 진행 저장.** 선행조건: Step 5. `progress.unlockedCount`와 스테이지별 최고점/별을 localStorage 키 `angrybirds:progress:v1`에 저장, try/catch로 비활성 환경 폴백(메모리 전용) 처리. 검증: 새로고침 전/후 StageSelect 잠금 상태 비교 테스트. 서비스: R18, R20.
- **Step 8 — 10개 스테이지 콘텐츠 저작.** 선행조건: Step 5, Step 7(스테이지 1 엔드투엔드 검증 완료 후 착수). 스테이지 2~10을 재질 종류·구조물 복잡도·pig 수가 단계적으로 증가하는 난이도 곡선으로 저작, 스테이지별 killThreshold/breakThreshold/parScore를 확정 전 플레이테스트 패스로 검증(§수치 태그의 "declared arbitrary, capped" 상수들이 이 단계에서 실측으로 교체됨). 검증: 스테이지별 최소 1회 완주 가능성(치명적 소프트락 없음) 수동 확인. 서비스: R21, R19(수치 확정).
- **Step 9 — 배경/오디오/파티클 폴리시.** 선행조건: Step 8(핵심 루프 확정 후, 콘텐츠 저작과 병렬 가능). 스테이지별 배경 틴트, 4종 SFX(발사/충돌/제거/UI), 디브리 파티클(동시 최대 20개). 검증: 수동 QA 체크리스트. 서비스: R12, R22, R23.
- **Step 10 — 반응형/터치 검증.** 선행조건: Step 3. Pointer Events로 마우스/터치 통합, CSS `touch-action:none`으로 캔버스 스크롤/줌 제스처 충돌 방지, 리사이즈 시 캔버스 재스케일. 검증: 데스크톱+모바일 뷰포트 각각 수동 QA. 서비스: R25, R26.
- **Step 11 — 설정(음소거).** 선행조건: Step 9. 메인메뉴 음소거 토글, localStorage 저장. 검증: 토글 후 새로고침에도 상태 유지 확인. 서비스: R32.

> plan-smith · next: [load-bearing-path_D0.md](load-bearing-path_D0.md)
