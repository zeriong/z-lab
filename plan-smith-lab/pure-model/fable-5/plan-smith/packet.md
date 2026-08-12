# Context Packet — web-angrybird-plan
- Date: 2026-08-12
- Requested by: zeriong (배치 실험 하네스 경유)
- Language of artifacts: 한국어

## Run stamp — record, never guess
- plan-smith version: 1.2.0 (`plan-smith/plugins/plan-smith/.claude-plugin/plugin.json`에서 읽음)
- frames.md fingerprint: 415 lines
- Main agent model: claude-fable-5
- plan-writer model: claude-fable-5 — **파이프라인 이탈 기록**: 이 런의 도구 세트에 Task(에이전트 위임)가 없어 `plan-writer` 격리 호출이 불가능했다. 메인 에이전트가 패킷·프레임 전체 스펙·스타일 지시문을 그대로 적용해 직접 작성했다(격리 없음). Stage 2c(신선한 인스턴스의 배선 감사)도 같은 이유로 미실행 — frames.md 품질 게이트 자가 점검으로 대체했고, 저자 자가 감사는 누락 탐지력이 낮다는 한계를 그대로 안는다.
- Skill invocation: batch/scripted (사용자 확인 게이트는 태스크 지시에 따라 자체 승인; `⚠guess` 항목은 미해소 상태로 Unknowns에 강등)

## Task (one line)
웹 브라우저 앵그리버드류 슬링샷 물리 게임(스테이지 10개, 우측 일시정지 버튼 + 다시하기/메인으로)의 구현 플랜 문서를 작성한다 — 코드는 작성하지 않는다.

## Background (why now)
plan-smith-lab의 비교 실험: 동일 요구사항(`test/game-prompt.md`)을 6개 셀(모델 3 × 방법 2)에 투입해 베이스라인 플래닝 대 plan-smith 방법론 플래닝을 비교한다. 이 산출물은 fable-5 × plan-smith 셀의 표본이다.

## Goal — definition of success
이 플랜만 들고(대화·패킷 없이) 구현자가 게임을 만들 수 있을 것: 10개 스테이지 전부 플레이·클리어 가능, 슬링샷 물리 루프 동작, 일시정지 요구 충족. 요구사항 3건 중 어느 것도 침묵 누락되지 않을 것.

## Hard constraints
- 스테이지는 10단계 — source: 요구사항 문서 §요청사항 1
- 앵그리버드와 같은 물리 기반 슬링샷 게임플레이(드래그 발사, 포물선·중력·충돌·구조물 파괴, 돼지 제거) — source: §요청사항 2
- 일시정지 버튼이 인게임 우측에 존재, 클릭 시 다시하기/메인으로 버튼 — source: §요청사항 3
- 웹 브라우저에서 동작 — source: 요구사항 제목/본문
- 이 단계에서 코드를 작성하지 않는다(플랜 문서만) — source: 태스크 지시

## Soft preferences
- 요구사항 문서의 "플랜이 답해야 할 핵심 질문" 7개(물리 엔진, 렌더링, 스테이지 데이터, 슬링샷 UX, 판정 규칙, 상태 머신, 완료 기준)에 플랜이 답할 것 — source: §참고 (참고로 명시됨, 강제 아님)

## Rejected alternatives (and why)
- (대화에서 기각된 대안 없음 — 요구사항 문서가 대안들을 열린 질문으로만 제시. 기각은 플랜 본문에서 근거와 함께 수행)

## Decisions already made
- 산출물 경로: `plan-smith-lab/pure-model/fable-5/plan-smith/plan.md` — 태스크 지시
- 실험 표본이므로 산출 후 검증·수정 루프를 돌리지 않는다 — z-lab CLAUDE.md 제1조

## Relevant files & paths
- `plan-smith-lab/test/game-prompt.md` — 유일한 요구사항 원본. 핵심: 명시 요구 3건 + 참고 질문 7건, "게임을 구현하지 않는다 — 플랜 문서만".

## Unknowns & open questions
- ⚠guess였던 항목(게이트 미해소로 강등): 대상 브라우저 범위, 모바일 지원 여부, 아트 에셋 유무, 사운드 요구 여부 — 스펙 침묵. 플랜은 이를 가정/판정으로 처리하되 발명으로 확정하지 않는다.
- 스테이지 난이도·별점 임계의 "적정" 수치 — 튜닝 없이는 알 수 없음. 플랜에서 수명 캡 처리.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 스펙이 완결적(10스테이지, 물리 루프, 지명된 UI 요구)이고, 문자 그대로 따랐을 때의 위험은 잘못된 선택이 아니라 **누락**(피드백·점수·진행저장·스택 무명시)이다. frames.md의 관찰 사례(동일 과제에서 backward 프레임이 요구 1건을 "cosmetic"으로 강등하고 audio/effects/storage를 전부 누락)가 정확히 이 과제 유형이다.
- Frame은 `spec-coverage`; 차용: **물리 엔진 직접 구현 vs Matter.js** 1건만 진짜 either/or로 열려 있어 dialectic을 그 절에 한정 차용(판정 함수 + 패자 논거 승격).

## Load-bearing path candidate (build-out only)
- Path: 메인에서 게임 시작 → 스테이지 로드 → 드래그·발사 → 물리 충돌 → 돼지 제거 → 클리어 판정·결과 표시
- Why this one: 이 사슬이 닫히지 않으면 스테이지 10개도 일시정지 UI도 장식이다 — 사용자가 온 이유가 "쏘면 부서지고 깨면 넘어간다"이다.

## Frame selection
- Frame: spec-coverage (dialectic 1절 차용)
- Rationale: Gate 0 = build-out이 결정. 예측자 ①(원인 불명 없음, 실행만 남음)도 같은 방향. 차순위였던 backward는 완결 스펙에 대한 절단 도구라 기각 — frames.md가 이 과제 유형에서의 실패를 직접 관찰로 기록.

## Style selection
- Style: opus
- Execution mode: standalone (다른 패스 없음 — 고백 절에서 작업 이연 금지)
- Rationale: 오토 라우팅 "first draft of anything" 신호 발화. relay 신호(수개월 실행이 걸린 고위험)는 비발화, 배치 단일 산출 계약과도 충돌. fable 신호(기존 플랜 레드팀, 모순 제약)도 비발화.

## Output contract
- Plan file: `plan-smith-lab/pure-model/fable-5/plan-smith/plan.md` (태스크 지정 경로 — 스킬 기본 경로 `plans/<slug>/`를 태스크가 오버라이드)
- Packet: `plan-smith-lab/pure-model/fable-5/plan-smith/packet.md` (본 파일, 플랜 옆에 병치)

## Retrospective
<!-- appended after user verdict -->
