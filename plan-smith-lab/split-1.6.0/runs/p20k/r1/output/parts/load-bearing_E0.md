> plan-smith · part 5/7 · E0 · index: [plan.md](../plan.md)

## Load-bearing path

이 게임에서 실패하면 아티팩트 전체가 무의미해지는 경로는 "스테이지 진입 → 슬링샷 발사 → 목표 제거 → 클리어"다(가장 복잡한 경로가 아니라, 나머지 전부가 이것 주위의 장식이 되는 경로). 5홉으로 명세한다.

| hop | 이름 | passes only if | 그 조건이 처음 참이 되는 시점 |
|---|---|---|---|
| 1 | StageSelect 타일 클릭 → `GameScene.load(stageId)` 호출 | `progress.unlockedCount ≥ stageId` **AND** `stageRegistry`에 stageId 설정 존재 | `unlockedCount`는 앱 부팅 시 Step 7의 초기화 로직이 1로 설정(이후 hop5가 증가); `stageRegistry`는 앱 부팅 시 Step 1이 10개 데이터를 로드해 채움 |
| 2 | `load()` 완료 → 물리 world 구성 + `Matter.Runner` 시작 + `state="ReadyToShoot"` | 이전 스테이지의 바디·리스너가 모두 제거된 깨끗한 world | Step 2가 구현하는 `load()` 시퀀스 자체가 이 상태를 만듦; teardown은 Step 6이 재입장 경로에 대해 구현 |
| 3 | 포인터 드래그(새 정지 위치의 `grabRadius` 이내에서 시작) → 조준/궤적 프리뷰, `state="Dragging"` | `state==="ReadyToShoot"` **AND** `birdsRemaining>0` **AND** 드래그 시작점이 `grabRadius` 이내 | `state`는 hop2에서 `"ReadyToShoot"`로 설정; `birdsRemaining`은 hop2의 `load()`에서 스테이지 config의 `birdLoadout.length`로 초기화 |
| 4 | 포인터 릴리즈 → 투사체에 impulse 적용, `state="InFlight"`, 러너가 계속 스텝하며 `collisionStart` 방출 | `state==="Dragging"` **AND** 드래그 거리 `> minLaunchThreshold` **AND** `Matter.Runner`가 hop2 이후 정지되지 않고 매 프레임 `Engine.update`를 호출 중(`state!=="Paused"`) | `state`는 hop3의 포인터다운 핸들러에서 `"Dragging"`으로 설정; 러너 구동 상태는 hop2의 `load()`가 시작하고 Step 6의 일시정지 핸들러만 이를 멈춤 |
| 5 | `collisionStart`(투사체×pig 페어, 충격량≥`killThreshold`) 반복 처리로 `pigsAliveCount===0` 도달 → `afterUpdate` 체커가 `clearFired===false` 확인 → StageClear 오버레이 표시 + progress 갱신 + `clearFired=true` | `pigsAliveCount===0` **AND** `clearFired===false` **AND** `state!=="Paused"` | `pigsAliveCount`는 각 `collisionStart` 핸들러(러너가 hop2에서 구동 중이어야 발생)가 pig 제거마다 감소; `clearFired`는 hop2의 `load()`에서 `false`로 초기화 |

**콜드스타트 표** — 위 "passes only if"에 등장한 모든 상태/플래그/상수, 최초 진입 시 값, 누가·언제 설정하는지:

| 상태/상수 | 최초 값 | 설정 주체 | 설정 시점 |
|---|---|---|---|
| `progress.unlockedCount` | 1 | Step 7 초기화 로직(localStorage 부재 감지) | 앱 부팅 |
| `stageRegistry` | 10개 스테이지 데이터 전부 로드된 배열 | Step 1 초기화 코드 | 앱 부팅 |
| `GameScene.state` | `"Idle"` | Step 1 화면 셋업 코드 | GameScene 인스턴스 생성 시점 |
| `GameScene.state` → `"ReadyToShoot"` | (전이) | Step 2 `load()` | 스테이지 진입(hop1→2) |
| `birdsRemaining` | 스테이지 config의 `birdLoadout.length` | Step 2 `load()` | 스테이지 진입 |
| `pigsAliveCount` | 스테이지 config의 `pigs.length` | Step 2 `load()` | 스테이지 진입 |
| `clearFired` | `false` | Step 2 `load()` | 스테이지 진입 |
| `Matter.Runner` 구동 상태 | `running=true` | Step 2 `load()`가 `Runner.run()` 호출 | 스테이지 진입; Step 6의 일시정지 핸들러가 `false`로, 재개/다시하기가 `true`로 전환 |
| `grabRadius` | 60px(고정 상수) | Step 3의 input-config 모듈 | 빌드 시점(런타임 불변) |
| `minLaunchThreshold` | 10px(고정 상수) | Step 3의 input-config 모듈 | 빌드 시점 |
| `killThreshold`(스테이지별 pig 값) | 스테이지 config에 저자가 기입 | Step 8 콘텐츠 저작 | 콘텐츠 저작 시점(플레이테스트로 확정) |
| `state==="Paused"` 가드 | `false` | Step 6 일시정지 핸들러가 `true`로, 재개/다시하기가 `false`로 전환 | 일시정지 버튼 클릭 시점 |
| 월드 바디·리스너 잔존 | 최초 진입 시 공집합(직전 world 없음) | Step 6 teardown 루틴 | 다시하기/메인으로 재입장 시점 |

빈 칸 없음. 체인이 이름을 붙인 모든 심볼(`GameScene.load`, `stageRegistry`, `progress.unlockedCount`, `state`, `birdsRemaining`, `pigsAliveCount`, `clearFired`, `Matter.Runner`, `killThreshold`, `grabRadius`, `minLaunchThreshold`, `collisionStart`/`afterUpdate` 핸들러)은 `## Approach & steps`의 Step 1~8 중 하나가 실제로 만들겠다고 커밋한 대상이며, 이 문서 밖에서 처음 등장하는 고아 심볼은 없다.

> plan-smith · next: [risks_F0.md](risks_F0.md)
