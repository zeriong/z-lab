# 배선 감사 — plan.md (v1.2.0-round-3 / sonnet-5)

감사 범위: `## Load-bearing path`(147–172행), `## Approach & steps`(126–141행), `## The frame's mandated starting point`(37–111행), `## Implementer contract`(196–200행), `## Definition of "done"`(189–194행). 문서를 문서 자신과만 대조했다. 빌드·실행 없음.

---

## Q1. 홉 5개 이하 사슬 — 모든 홉에 "통과 조건"과 "첫 참이 되는 지점"이 둘 다 있는가

**판정: 결함 없음.** 사슬은 정확히 5홉(147–153행)이며, 각 홉의 두 열이 모두 채워져 있다.

| hop | passes only if | first becomes true at | 판정 |
|---|---|---|---|
| 1 | `unlockedCount≥stageId` AND `stageRegistry` 존재 | 앱 부팅 시 Step 7 / Step 1 | 채움 |
| 2 | 이전 world의 바디·리스너 전부 제거된 깨끗한 상태 | Step 2의 `load()` 시퀀스 자체 / 재입장 경로는 Step 6 teardown | 채움(다만 "load()가 이 상태를 만든다"는 자기지시적 서술 — 아래 참고) |
| 3 | `state==="ReadyToShoot"` AND `birdsRemaining>0` AND grabRadius 이내 드래그 시작 | `state`는 hop2가 설정, `birdsRemaining`은 hop2의 `load()`가 초기화 | 채움 |
| 4 | `state==="Dragging"` AND 드래그거리>`minLaunchThreshold` AND 러너가 hop2 이후 미정지 | `state`는 hop3의 포인터다운 핸들러, 러너 구동은 hop2가 시작하고 Step 6만 멈춤 | 채움 |
| 5 | `pigsAliveCount===0` AND `clearFired===false` AND `state!=="Paused"` | `pigsAliveCount`는 각 `collisionStart` 핸들러, `clearFired`는 hop2의 `load()`가 초기화 | 채움 |

빈 홉 없음. 다만 hop2의 "첫 참이 되는 지점" 서술("Step 2가 구현하는 `load()` 시퀀스 자체가 이 상태를 만듦")은 형식은 만족하지만 내용이 다소 자기지시적이다 — 이는 Q1의 결함으로 세지 않았다(질문은 필드의 존재 여부를 묻지, 설명의 강도를 묻지 않는다). 이 약점의 실질적 귀결은 Q2에서 별도 결함으로 기록한다.

## Q2. 콜드스타트 표가 홉 조건을 전부 덮는가 — 빈 칸 있는가

**판정: 결함 있음.** frames.md는 콜드스타트 표가 "passes only if" 칸에 등장하는 모든 상태/플래그/큐/**선행조건**을 담아야 한다고 명시한다(354–366행, "every state, flag, queue or precondition"). 155–170행 표를 다시 대조하면, 심볼로 이름 붙은 항목(`progress.unlockedCount`, `stageRegistry`, `GameScene.state`, `birdsRemaining`, `pigsAliveCount`, `clearFired`, `Matter.Runner` 구동 상태, `grabRadius`, `minLaunchThreshold`, `killThreshold`, `state==="Paused"` 가드)은 전부 행이 있어 빈 칸이 없다.

그러나 hop2의 "passes only if"는 심볼이 아니라 **선행조건(precondition)** 그 자체다: "이전 스테이지의 바디·리스너가 모두 제거된 깨끗한 world." 이 조건에 대응하는 행이 콜드스타트 표에 **없다**. `Matter.Runner 구동 상태` 행은 `running=true/false`라는 다른 조건을 다루며, world의 바디·리스너 잔존 여부와는 별개다. hop2 자체의 "첫 참이 되는 지점" 칸(Step 2/Step 6을 언급)은 이 결손을 대신하지 못한다 — frames.md는 콜드스타트 표를 홉 셀과 **별도로** 요구하는 아티팩트("Then, **in the same section**, a cold-start table")로 명시하기 때문이다.

## Q3. 사슬의 각 홉이 플랜이 다른 곳에서 만들기로 약속한 심볼/단계를 가리키는가 — 고아 열거

**판정: 결함 있음. 고아 2건.**

1. **`state="InFlight"` 전이 + impulse 적용 (hop4).** Load-bearing path의 hop4(152행)는 "포인터 릴리즈 → 투사체에 impulse 적용, `state="InFlight"`"를 명시한다. 이 전이는 Step 6(136행)에서 "투사체가 `state="InFlight"`인 채로 눌려도"라고 **참조**되지만, `## Approach & steps`의 어느 Step도 이 전이/액션을 **만드는** 단계로 명명되지 않았다. Step 3(133행)은 "포인터 down/move/up 핸들러 ... release 시 velocity 벡터 계산"까지만 명시하고, 계산된 벡터를 body에 적용하고 `state`를 `"InFlight"`로 전환하는 동작은 어느 Step의 산출물로도 커밋되어 있지 않다. 172행의 "고아 심볼 없음" 자기선언은 `state`를 통칭으로만 나열해, 이 특정 전이가 실제로 어디서 만들어지는지는 검증하지 않았다.
2. **`birdsRemaining` 발사당 감소 (R3의 verb 문장, hop3 재진입 및 R14 실패 판정이 의존).** R3의 verb 문장(84행)은 "새를 발사할 때마다 HUD의 새 카운터가 즉시 1 감소한다"고 명시하고, hop3의 통과 조건은 `birdsRemaining>0`을 재확인하며, Step 5(135행)의 실패 판정은 `birdsRemaining===0`을 소비한다. 그런데 `birdsRemaining`을 **감소시키는** 동작은 Step 2(초기화만), Step 3(입력·프리뷰만), Step 4(충돌·파괴·점수만), Step 5(판정 소비만) 어디에도 명명되어 있지 않다. 콜드스타트 표(163행)도 `birdsRemaining`의 "설정 시점"을 "스테이지 진입"으로만 적어, 발사 후 감소 시점은 다루지 않는다. 이 값이 실제로 줄지 않으면 hop3의 재진입 가드는 항상 참이 되어 사실상 무의미해지고, R14(새 소진 실패 판정)는 결코 발동하지 않는다.

## Q4. `build` 요구마다 표 밖 동사 문장이 있는가 — rows_vs_sentences

매트릭스(41–76행)에서 `build`/`build(thin)`로 결정된 행: R1–R23(23개, 연속), R25, R26, R32(3개) = **26행**.
표 밖 verb 문장(82–107행): R1,R2,R3,R4,R5,R6,R7,R8,R9,R10,R11,R12,R13,R14,R15,R16,R17,R18,R19,R20,R21,R22,R23,R25,R26,R32 = **26문장**.

**26행 : 26문장, 1:1 정합.** 결손·과잉 없음. 108행의 자기선언("build 행 26개 = verb 문장 26개")도 실측과 일치한다. 문장 형태도 규칙을 지킨다: 세 번째 절(부재 시 증상)이 두 번째 절의 단순 부정이 아니라 관찰 가능한 다운스트림 증상으로 쓰여 있음을 R1/R3/R11/R13/R17/R22/R23/R32 표본에서 확인했다(예: "빈 화면", "무음", "같은 무배경 화면", "새로고침을 강제").

## Q5. 구현자 계약 — 부활 트리거·해석 가능한 고정 버전·"done"의 명령+종료 코드

**판정: 결함 없음.**

- **부활 트리거**: `## Alternatives & rejection rationale`(174–179행)의 기각 대안 4건(커스텀 물리 엔진, WebGL/Pixi, 서버 권위형 저장, 절차적 생성) 전부 "부활 조건:" 문장을 갖는다. 빠짐 없음.
- **해석 가능한 고정 버전**: 문서는 `matter-js`/`vite`/`typescript`의 구체적 버전 번호를 오프라인 상태에서 주장하지 않고(199행), 대신 Step 0에서 `npm view <package> version`으로 실제 배포 버전을 확인 후 고정·커밋하는 절차를 명시한다(130행, 199행). 엄격히 보면 이는 "고정된 버전"이 아니라 "버전을 고정하는 절차"이지만, frames.md가 경계하는 실제 피해(오프라인에서 존재하지 않는 버전을 선언해 설치 시점에 실패)를 명시적으로 회피하고 Step 0의 `tsc --noEmit` 게이트로 즉시 검증하도록 짜여 있다. 결함으로 세지 않되 판단 근거를 여기에 남긴다.
- **"done"의 명령+종료 코드**: 스택 절(111행)이 명시적 구매 근거를 댄 두 항목 — TypeScript("스키마/상태머신을 컴파일 타임에 검사") → `tsc --noEmit` 종료코드 0(191행, 200행에서 재확인); Matter.js("리지드바디 충돌·복원력·질량 처리를 대신") → `npm test` 종료코드 0 + 양방향 단언(192행, 200행). 두 항목 모두 "done"에 실제 명령이 있다. Vite와 Canvas 2D는 스택 절에서 검증 가능한 특정 보증("X를 사준다")을 주장하지 않으므로(각각 "빌드/로컬 서버", "브라우저 네이티브 API"로만 서술) 이 규칙이 요구하는 대상이 아니다.

---

## 종합

- **결함 2건**:
  - **Q2**: hop2의 "passes only if"(이전 world의 바디·리스너가 모두 제거된 깨끗한 상태)에 대응하는 행이 콜드스타트 표(155–170행)에 없다 — 심볼로 이름 붙은 항목만 덮였고, 프로즈로 표현된 선행조건은 빠졌다.
  - **Q3**: 하중 경로 hop4가 참조하는 `state="InFlight"` 전이/impulse 적용 액션, 그리고 hop3 재진입·R14 실패판정이 의존하는 `birdsRemaining` 발사당 감소 액션 — 둘 다 `## Approach & steps`의 어느 Step에도 명명된 산출물로 존재하지 않는다.
- Q1·Q4·Q5는 결함 없음으로 판정했으며, 각 판정의 근거를 위에 남겼다.
