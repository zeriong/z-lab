# Context Packet — angry-birds-web-game
- Date: 2026-09-26
- Requested by: zeriong
- Language of artifacts: 한국어

## Run stamp — record, never guess
- plan-smith version: 1.4.2 (`/Users/jeonjelyong/.claude/plugins/cache/plan-smith-marketplace/plan-smith/1.4.2/.claude-plugin/plugin.json` 에서 읽음)
- frames.md fingerprint: 431 lines
- Main agent model: claude-opus-5-5
- plan-writer model: claude-opus-5-5 (에이전트 정의 `model: inherit` → main agent 모델 상속)
- Skill invocation: batch/scripted (real-skill-tco runner). 확인 게이트는 사용자 지시 "사용자 확인 게이트가 나오면 배치 실행이므로 스스로 승인하고 진행한다"에 따라 자가승인.

## Task (one line)
웹 브라우저에서 동작하는 앵그리버드류 물리 슬링샷 게임(10 스테이지, 인게임 우측 일시정지 → 다시하기/메인으로)을 구현하기 위한 구현 계획서를 작성한다. 이 단계에서 게임 코드는 작성하지 않는다.

## Background (why now)
사용자가 요구사항 파일 하나를 주고 계획서만 요청했다. 이 계획서는 claude-opus-5-5 구현자에게 **단독으로** 전달되며, 구현자는 파일 읽기/쓰기 도구만 가진다 — 설치·빌드·실행·테스트가 불가능하다. 즉 구현자는 자기 결과물을 한 번도 실행해 보지 못한 채 완성해야 하고, 이 계획서가 구현자의 유일한 컨텍스트다.
요구사항 파일의 "실험 메타" 섹션은 이 계획서가 비교 실험의 한 셀이라는 하네스 정보다 — 게임 요구사항이 아니며 계획서 본문에서 다룰 대상이 아니다.

## Goal — definition of success
- 구현자가 이 계획서 하나만 읽고, 실행 피드백 없이, 브라우저에서 열면 바로 플레이 가능한 게임 파일 세트를 작성할 수 있다.
- 결과 게임에서: 메인 화면 → 게임 시작 → 새총 드래그·발사 → 포물선 비행·충돌·구조물 파괴로 돼지 제거 → 클리어/실패 판정 → 다음 스테이지. **10개 스테이지 모두 직접 저작된 콘텐츠**(난이도 곡선 포함)로 플레이 가능.
- 인게임 화면 **우측**에 일시정지 버튼이 있고, 클릭 시 오버레이에 **"다시하기" / "메인으로"** 버튼이 있으며 둘 다 동작한다(다시하기 = 현재 스테이지를 초기 상태로 재시작, 메인으로 = 메인 화면 복귀).
- 계획서가 요구사항 파일의 7개 핵심 질문에 모두 명시적으로 답한다.
- 첫 오픈에서 흰 화면/콘솔 에러 없이 로드된다 — 구현자가 실행할 수 없으므로 계획서가 연결부(글루)를 복사 가능한 형태로 고정해 이를 담보해야 한다.

## Hard constraints
- 웹 브라우저 게임 — source: 요구사항 "웹브라우저로 앵그리버드 게임을 만드세요"
- 스테이지 10단계 — source: 요구사항 1
- 게임 시작 → 앵그리버드와 같은 시스템: 새총으로 발사체를 당겨 쏘고, 포물선 궤적·중력·충돌·구조물 파괴로 목표(돼지 등)를 제거하는 물리 기반 슬링샷 게임 — source: 요구사항 2
- 일시정지 버튼이 인게임 **우측**에 존재, 클릭 시 **다시하기 / 메인으로** 버튼 존재 — source: 요구사항 3 (버튼 레이블은 사용자가 쓴 한국어 그대로)
- 구현자 = claude-opus-5-5, 이 계획서 하나만 읽는다 — source: 사용자 인자
- 구현자 도구 = 파일 읽기/쓰기만. 설치·빌드·실행·테스트 불가 — source: 사용자 인자
- 이 단계에서는 코드를 작성하지 않는다(게임 파일을 만들지 않음; 산출물은 계획서 1개) — source: 사용자 인자

### 하드 제약에서 직접 파생되는 벽 (main agent 도출 — 반박 가능하면 writer가 근거와 함께 반박)
- **빌드 체인 불가**: npm/번들러/TypeScript 컴파일 등 빌드 산출물이 필요한 스택은 구현자가 만들 수 없다 → 브라우저가 직접 로드하는 평문 파일(HTML/CSS/JS)만.
- **외부 의존성 다운로드/벤더링 불가**: 쓰려면 버전 고정된 완전한 CDN URL 문자열(복사 가능)로만 가능하고, 그 경우 플레이 시점 네트워크 의존이 생긴다.
- **바이너리 에셋 생성 불가**(PNG/MP3 등): 그래픽은 Canvas 도형/그라디언트 등 절차적 드로잉(또는 텍스트인 SVG), 사운드는 Web Audio API 합성으로만 가능.
- **런타임 에러 관찰 불가**: 파일 간 연결부(스크립트 로드 순서, 전역 이름, 함수 시그니처, 초기 상태) 오타 하나가 흰 화면이 된다 → 계획서가 이 연결부를 복사 가능한 블록으로 고정해야 한다(frames.md 기계 예산 규칙).
- **"코드를 작성하지 않는다"의 해석** ⚠guess → 자가승인: 계획서에 기계 예산이 요구하는 짧은 글루 블록(의존성 별칭 한 줄, 파일별 공개 함수 시그니처 표, 초기 상태 선언, 스크립트 태그 순서)은 포함 가능 — 이것은 구현이 아니라 연결부 고정이다. 게임 로직 본문(물리 처리, 렌더링, 입력 처리의 함수 본문)은 계획서에 쓰지 않는다.

## Soft preferences
- 요구사항 파일의 "플랜이 답해야 할 핵심 질문 (참고)" 7개 — 물리 엔진(직접 vs 라이브러리), 렌더링(Canvas 2D vs 기타), 10 스테이지 데이터 구조·로딩·전환, 슬링샷 입력(드래그·조준·발사)과 궤적 예측 UX, 충돌·파괴·점수·클리어 판정 규칙, 일시정지 오버레이와 상태 머신(메인 → 인게임 → 일시정지 → 클리어/실패), 완료 판정 기준. "(참고)"로 표시되었으나 계획서가 답해야 하는 목록으로 취급한다.
- "앵그리버드와 같은" 게임 시스템 — 장르 관습(스테이지당 새 여러 마리, 나무·돌·유리 등 재질별 블록 내구도, 점수·별 3개, 잔여 새 보너스)을 기대하는 것으로 읽힘 ⚠guess → 자가승인: 장르 관습 수준은 커버리지 대상에 포함. 특수 능력 새 등 그 이상은 writer가 build/defer 판정.
- UI 텍스트 한국어 ⚠guess → 자가승인(사용자가 버튼 레이블을 한국어로 명시했으므로).

## Rejected alternatives (and why)
- 빌드가 필요한 스택(TypeScript, Vite/webpack 등 번들러, npm 설치 패키지, 빌드 기반 프레임워크) — 구현자가 설치·빌드할 수 없음(하드 제약에서 파생).
- 이 단계에서 게임 코드 작성 — 사용자가 명시적으로 금지.
- 바이너리 이미지/사운드 에셋 의존 — 구현자가 만들 수 없음(파생).

## Decisions already made
- 산출물: 계획서 1개(`plans/angry-birds-web-game/plan.md`), 한국어 — 사용자 인자 + 스킬 규약
- 구현자: claude-opus-5-5, 파일 도구만 — 사용자 인자

## Relevant files & paths
- `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/inputs/game-prompt.md` — 유일한 요구사항 출처. 요점: 명시 요구 3개(10 스테이지 / 슬링샷 물리 게임플레이 / 우측 일시정지→다시하기·메인으로) + 참고 질문 7개. "실험 메타" 섹션은 하네스 정보이며 게임 요구가 아니다.
- 작업 디렉터리 `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/opus-5.5/plan-smith/r1/` — 비어 있음(그린필드). 기존 코드베이스·컨벤션 없음. 계획서는 게임 파일 레이아웃을 (구현자 작업 디렉터리 기준) 상대 경로로 정의해야 한다.

## Unknowns & open questions
- **게임을 여는 방식** ⚠guess → 자가승인: "index.html 더블클릭(file://)으로 열어도 동작"을 요구로 채택(가장 보수적). 영향: Chrome은 file:// 에서 `<script type="module">` 로드와 `fetch()`로 로컬 JSON 읽기를 차단한다 → ES 모듈·별도 JSON 스테이지 파일 불가, 클래식 `<script src>` + JS에 내장된 스테이지 데이터가 필요. 틀렸다면(로컬 서버로 연다면) 제약이 과했을 뿐 게임은 동작한다.
- **플레이 시점 네트워크 가용성** — 알 수 없음. CDN 라이브러리를 고르면 오프라인에서 게임 전체가 죽는다. writer가 물리 엔진 결정에서 이 위험을 명시적으로 다뤄야 한다.
- **대상 브라우저/입력** ⚠guess → 자가승인: 최신 데스크톱 Chrome/Edge/Firefox/Safari, 마우스 주 입력. Pointer Events를 쓰면 터치도 추가 비용 없이 따라온다 — 모바일 레이아웃 최적화는 writer가 build/defer 판정.
- **결과물 판정자** ⚠guess → 자가승인: 구현자는 실행할 수 없으므로 "완료"의 행동 기준은 나중에 브라우저로 여는 사람(실험 운영자)이 확인한다. 계획서의 done은 두 층이 필요: (a) 구현자가 자기 산출물을 **읽어서** 확인 가능한 기준, (b) 브라우저를 여는 사람이 **관찰** 가능한 기준.
- **물리 엔진: 직접 구현 vs Matter.js(CDN)** — 진짜로 열린 하위 결정(아래 Gate 0의 borrow 대상). main agent 메모(검증 안 됨, 네트워크 조회 불가): npm matter-js의 실재 버전으로 0.19.0, 0.20.0이 알려져 있다고 믿음; frames.md에는 존재하지 않는 `matter-js 2.0.20` 핀이 독립 실행 3회에서 환각된 관측이 있다 — 라이브러리를 고른다면 실재를 확신하는 버전만 완전한 URL로. 직접 구현은 의존성 0이지만 회전 강체 적층(블록 탑) 안정성을 실행 없이 맞추기 어렵다.
- **진행 상황 저장**(해금 스테이지·최고 별점) — 요구사항에 없지만 10 스테이지 게임이 "완성된 느낌"을 주는 데 필요한 면. writer가 매트릭스에서 build/defer 판정.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 요구 3개가 이미 완결된 스펙이다. 계획서를 문자 그대로 따랐을 때의 위험은 "잘못 고름"이 아니라 "빠뜨림"과 "연결 누락"이다 — 스테이지 1개+로더만 저작, 파괴 피드백·점수·저장·사운드 누락, 일시정지가 물리를 실제로 멈추지 않음, 다시하기 시 루프/리스너 중복 등. 그리고 구현자가 실행할 수 없으므로 연결 누락은 곧장 흰 화면이 된다.
- (build-out) Frame is `spec-coverage`; borrow: **물리 엔진(직접 구현 vs 라이브러리) 한 셀에 한해 `constraint-first`** — 이 결정을 무는 벽(설치·빌드·실행·테스트 불가, file:// 동작, 네트워크 불확실, 바이너리 불가)이 명확하므로 벽 안에서의 판결이 맞다. borrow 사실과 출처를 계획서에 기록할 것.
- **Implementer**: claude-opus-5-5 (사용자 명시). 강한 모델이지만 실행·테스트·빌드 피드백이 전무한 환경.
- **Machinery budget applies — weak/unknown branch 적용** ⚠guess → 자가승인. 모델만 보면 frames.md 기준 "strong"이지만, 기계 예산의 근거("요구하는 부품 하나하나가 구현자가 재현에 실패할 수 있는 면")는 구현자가 실패를 관찰할 수 없을 때 가장 강하게 작동한다. 따라서: 빌드 체인 없음, 적은 파일 수, config가 config를 참조하지 않음, 모든 외부 의존성은 완전한 복사 가능 문자열, 고위험 글루(의존성 별칭 줄, 파일별 공개 함수 시그니처 심볼 표, 초기 상태 선언, index.html 스크립트 태그 순서)를 verbatim 블록으로. 명령형 완료 기준(`npm test exits 0` 류)은 구현자가 실행할 수 없으므로 쓰지 않고, 구현자가 자기 산출물을 읽어서 확인할 수 있는 기준으로 대체한다. 배선 규율(load-bearing path, 동사 문장, 구현자 계약)은 전부 그대로 적용한다.

## Load-bearing path candidate (build-out only)
- Path: 메인 화면 "게임 시작" 클릭 → 스테이지 1 월드 구축(지면·블록·돼지·새총·새) + 게임 루프(requestAnimationFrame에서 물리 스텝·렌더) 가동 → 새를 드래그해 놓으면 당긴 거리·방향에 비례한 속도로 발사, 중력 하 포물선 비행 → 충돌 충격이 임계를 넘으면 돼지/블록 내구도 감소·제거 → 돼지 0마리(정착 후) → 클리어 오버레이
- Why this one: 이 체인의 어느 한 홉이라도 끊기면(루프 미가동, 입력 미연결, 발사 속도 0, 돼지가 죽지 않음, 클리어 미판정) 10 스테이지·일시정지·점수가 전부 장식이 된다. main agent가 본 배선 위험(참고): 일시정지가 루프/물리 스텝을 실제로 멈추는가; 다시하기·메인으로 후 이전 월드의 바디·이벤트 리스너·rAF 루프가 남아 중복 가동되지 않는가; 발사 직후 새가 새총과 즉시 충돌하지 않는가; 클리어/실패 판정 타이밍(모든 것이 정착한 뒤인가, 새 소진 후 대기인가). writer가 최종 결정하며, 다른 경로를 고르면 그 경로와 이유를 밝힐 것.

## Frame selection
- Frame: `spec-coverage` (+ 물리 엔진 셀 한정 `constraint-first` borrow)
- Rationale: Gate 0 = build-out → spec-coverage. 술어 ①: 불확실성은 실행에 있음(원인/시장 미지 아님). ②: 도구 제약이 벽이지만 물리 엔진 한 셀에만 날카롭게 문다 → 그 셀에 constraint-first borrow. ③④ 해당 없음. Runner-up `backward`는 완결 스펙에 적용하면 off-anchor 누락을 허가하므로 기각(frames.md의 A/B 관측: 같은 게임 과제에서 backward 플랜이 오디오·이펙트·저장·스택을 누락).

## Style selection
- Style: opus
- Execution mode: **standalone** (다른 패스 없음 — confession에서 "다음 패스"로 미루기 금지)
- Rationale: auto-routing — "first draft of anything" + "breadth of coverage is the point"(build-out 커버리지) 두 신호가 opus에 발화. relay 신호(되돌리기 어려움·수개월 실행) 없음. fable 신호(기존 플랜 레드팀·모순 제약·운영 규칙 문서) 없음. 소비자가 AI 구현자(시스템 소비)라 default 규칙상 fable 여지도 있으나, 명시 신호 2개가 opus를 가리키므로 opus.

## Output contract
- Plan file: `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/opus-5.5/plan-smith/r1/plans/angry-birds-web-game/plan.md`
- Wiring audit (Stage 2c): `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/opus-5.5/plan-smith/r1/plans/angry-birds-web-game/wiring-audit.md`

## Confirmation gate record
- 2026-09-26, batch 모드 자가승인(사용자 사전 지시). 확인 항목: 목표 / 하드 제약 / 기각 대안 / Gate 0(build-out, 구현자 claude-opus-5-5, 기계 예산 weak 분기) / frame(spec-coverage + constraint-first borrow) / style(opus, standalone).
- ⚠guess 처리: 전부 위에 적힌 보수적 선택으로 자가승인 — file:// 동작 요구, 장르 관습 포함, UI 한국어, 데스크톱 브라우저·마우스 주 입력, 판정자=브라우저를 여는 사람(done 2층), 기계 예산 weak 분기, "코드 미작성"의 해석(글루 블록 허용·로직 본문 금지). 네트워크 가용성·진행 저장·물리 엔진은 사실로 확정하지 않고 Unknowns에 남김.

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, model <plan-writer model>, one-line note -->
