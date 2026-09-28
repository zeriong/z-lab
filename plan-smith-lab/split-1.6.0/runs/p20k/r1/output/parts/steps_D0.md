> plan-smith · part 4/7 · D0 · index: [plan.md](../plan.md)

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

> plan-smith · next: [load-bearing_E0.md](load-bearing_E0.md)
