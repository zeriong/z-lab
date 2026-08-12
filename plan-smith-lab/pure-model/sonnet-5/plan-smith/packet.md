# Context Packet — angry-birds-browser-game

- Date: 2026-08-12
- Requested by: zeriong (배치 비교실험 오케스트레이터 경유)
- Language of artifacts: 한국어

## Run stamp — record, never guess
- plan-smith version: 1.2.0 (plugins/plan-smith/.claude-plugin/plugin.json)
- frames.md fingerprint: 415 lines (읽은 시점 기준 라인 수)
- Main agent model: claude-sonnet-5
- plan-writer model: claude-sonnet-5 (이 실행 환경에는 Task 서브에이전트 도구가 제공되지 않아, 메인 에이전트가 Stage 1과 Stage 2를 동일 세션·동일 모델로 순차 수행함 — 정식 파이프라인의 "격리된 컨텍스트" 전제가 깨져 있음을 기록)
- Skill invocation: batch/scripted (워크플로 스크립트에 의한 무인 실행, 사용자 확인 게이트는 자가 승인)

## Task (one line)
웹 브라우저에서 동작하는 앵그리버드 스타일 물리 기반 슬링샷 게임(10스테이지, 우측 일시정지 오버레이 포함)의 구현 플랜 문서를 작성한다 — 게임 자체는 만들지 않는다.

## Background (why now)
`test/game-prompt.md`는 6셀 비교실험(fable/opus/sonnet × /plan / /plan-smith)의 공통 입력이다. 이 셀은 sonnet 모델 + plan-smith 방법론 조합이며, 산출물은 `pure-model/sonnet-5/plan-smith/plan.md` 하나뿐이다.

## Goal — definition of success
요구사항 3개 항목(10스테이지 / 앵그리버드류 물리 슬링샷 게임플레이 / 우측 일시정지→다시하기·메인으로)을 모두 충족하고, 요구사항×표면 매트릭스로 스펙에 없는 부가요소(사운드·점수·모바일 등)까지 build/defer/n-a로 명시 판정하며, 핵심 게임 루프(드래그→발사→충돌→클리어)가 실제로 연결되는 로드베어링 경로를 제공하는 구현 가능한 플랜.

## Hard constraints
- stage 10개 — source: game-prompt.md 1항
- 앵그리버드류 물리 기반 슬링샷 게임플레이(드래그 조준·포물선·중력·충돌·구조물 파괴·목표 제거) — source: game-prompt.md 2항
- 일시정지 버튼은 인게임 화면 **우측**에 위치 — source: game-prompt.md 3항
- 일시정지 클릭 시 "다시하기" / "메인으로" 버튼 노출 — source: game-prompt.md 3항
- 이 단계에서 게임을 실제로 구현하지 않는다(플랜 문서만 작성) — source: 태스크 지시

## Soft preferences
- game-prompt.md의 "핵심 질문" 목록(물리엔진/렌더링/스테이지 데이터구조/입력UX/충돌판정/상태머신/완료판정)은 문서 자체가 "참고"라고 명시한 비강제 가이드 — 답하면 좋으나 하드 제약은 아님.

## Rejected alternatives (and why)
- 없음 — 이 세션 안에서 아직 거부된 대안이 없다. 대안 거부는 플랜 본문(라이팅 단계)에서 프레임 요구에 따라 결정한다.

## Decisions already made
- 비교실험 셀 배정(sonnet 모델 + plan-smith 방법론, 산출물 경로 고정) — 오케스트레이터가 배치 실행으로 지정
- 사용자 확인 게이트는 배치 실행이므로 메인 에이전트가 스스로 승인하고 진행 — 태스크 지시

## Relevant files & paths
- `/Users/jeonjelyong/Desktop/WorkSpace/Z-Work/z-lab/plan-smith-lab/test/game-prompt.md` — 6셀 비교실험 공통 입력. "게임을 구현하지 말고 플랜만 작성"이라는 지시와 위 3개 하드 요구사항, 그리고 참고용 핵심 질문 목록을 담고 있음. 이 문서 자체가 frames.md 서문이 인용하는 "10스테이지·물리루프·명명된 UI 요구사항을 가진 브라우저 게임" 시나리오와 사실상 동일한 형태다.

## Unknowns & open questions
- ⚠guess 물리엔진: 라이브러리(Matter.js 등) vs 직접 구현 — 스펙 미지정, 라이터가 트레이드오프로 결정
- ⚠guess 렌더링 방식: Canvas 2D vs 기타 — 스펙 미지정
- ⚠guess 기술 스택(프레임워크/빌드툴) — 스펙에 언급 없음
- ⚠guess 스테이지 데이터 포맷·저장/로딩 방식 — 스펙 미지정
- ⚠guess 일시정지 오버레이에 "다시하기/메인으로" 외 "이어하기(재개)" 버튼이 존재하는지 — 스펙은 정확히 두 버튼만 언급, 세 번째 버튼 유무는 문자 그대로 해석할지 결정 필요
- 사운드/파티클/모바일 대응/점수/영속성 등 스펙에 없는 통상적 게임 요소를 build/defer/n-a 중 어느 쪽으로 판정할지 — build-out이므로 침묵 금지, 라이터가 명시적으로 판정해야 함

## Deliverable type (Gate 0)
- Type: build-out
- Rationale: game-prompt.md는 이미 완결된 스펙이다(스테이지 수, 게임 시스템의 종류, UI 요소의 위치와 클릭 후 상태까지 지정되어 있다). 이 플랜을 문자 그대로 따랐을 때의 위험은 "잘못된 선택"이 아니라 "빠뜨림"이다. 실제로 frames.md 자체가 이와 사실상 동일한 시나리오(브라우저 게임: 10스테이지, 물리 루프, 명명된 UI 요구사항)를 backward 프레임 오적용의 관찰 사례로 인용하며 — 사운드/파티클/모바일을 "off-anchor"로 컷하고, 점수·별점·배경·영속성·기술스택에 대해 침묵했으며, 사용자가 명시한 요구사항 중 하나를 "cosmetic"으로 재분류한 실패를 기록하고 있다. Tie-break 없이 명확히 build-out.
- (build-out) Frame은 `spec-coverage`. 다른 프레임의 차용 없음 — 이 태스크에는 진짜 either/or로 열려 있는 하위 결정이 식별되지 않는다(물리엔진 선택은 트레이드오프 서술만으로 충분한 수준).

## Load-bearing path candidate (build-out only)
- Path: 게임 시작(메인메뉴→스테이지 로드) → 새총 드래그·조준 → 릴리즈 시 물리 엔진에 발사체 투입 → 발사체가 포물선 이동 중 구조물/돼지와 충돌 → 충돌로 구조물 파괴·돼지 제거 판정 → 모든 돼지 제거 시 스테이지 클리어 판정 및 전환
- Why this one: 이 체인이 어느 한 지점이라도 끊기면(드래그가 실제 발사 속도에 연결되지 않거나, 충돌이 돼지 제거로 이어지지 않거나, 클리어 판정이 다음 스테이지로 연결되지 않으면) 요구사항 2항 "앵그리버드와 같은 게임 시스템" 자체가 성립하지 않는다. 나머지(일시정지 UI, 스테이지 10개 콘텐츠)는 이 루프가 실제로 도는 것을 전제로만 의미를 가진다.

## Frame selection
- Frame: spec-coverage
- Rationale: predicate ① 위치 불확실성 — cause/market/executor의 미지가 아니라 실행만 남은 상태이고, Gate 0가 build-out을 지시했으므로 spec-coverage로 확정. 후보였던 backward는 frames.md가 명시적으로 경고하는 실패 시나리오(이 태스크와 거의 동일한 형태)와 정확히 일치하여 배제.

## Style selection
- Style: opus
- Execution mode: standalone (relay 아님 — 단일 패스. Task 도구 부재로 두 개의 격리된 에이전트 인스턴스를 운용할 수 없어 relay의 전제인 "격리된 두 패스"를 만족시킬 수 없다는 점도 고려)
- Rationale: auto-routing 표의 "첫 초안이며 사람이 소비하는 문서, 위험/요구사항 커버리지의 폭이 핵심"이라는 신호가 일치. 기존 플랜을 감사하는 adversarial 리뷰 상황이 아니고, "몇 달간 실행이 걸린 고위험 결정"이라는 relay 트리거 신호도 없다. 기본값 규칙("사람이 소비하는 플랜엔 opus")도 동일 결론을 지지한다.

## Output contract
- Plan file: `plan-smith-lab/pure-model/sonnet-5/plan-smith/plan.md`
- Packet file: `plan-smith-lab/pure-model/sonnet-5/plan-smith/packet.md` (본 파일 — 정식 파이프라인의 `plans/<slug>/packet.md` 경로 대신 태스크가 지정한 산출물 디렉토리에 저장)

## Retrospective
(배치 실행이며 사용자 검증 게이트가 없어 아직 채워지지 않음)
