# Context Packet — web-angry-birds-game
- Date: 2026-09-30
- Requested by: zeriong (실험 하네스 배치 실행)
- Language of artifacts: 한국어 (플랜·패킷 모두 한국어. 게임 UI 문구도 한국어 — 요구사항이 한국어 버튼 라벨을 명시)

## Run stamp — record, never guess
- plan-smith version: 1.6.0 (`plugins/plan-smith/.claude-plugin/plugin.json`에서 읽음)
- frames.md fingerprint: 430 lines / sha256 prefix `a3df58434a23a187`
- Main agent model: claude-fable-5-1
- plan-writer model: claude-fable-5-1 (agent 정의 `model: inherit` → 메인 에이전트와 동일)
- Skill invocation: batch/scripted (`/plan-smith:forge` 를 하네스가 호출. 사용자 확인 게이트는 지시에 따라 메인 에이전트가 자체 승인)

## Task (one line)
웹 브라우저에서 동작하는 앵그리버드류 물리 슬링샷 게임(10 스테이지, 인게임 우측 일시정지 버튼 → 다시하기/메인으로)을 **설치·빌드·실행·테스트가 불가능한 구현자(claude-fable-5-1, 파일 읽기/쓰기 도구만 보유)** 가 이 플랜 한 장만 읽고 구현할 수 있는 계획서를 작성한다.

## Background (why now)
- 이 요청은 6셀 비교 실험(`{fable, opus, sonnet} × {/plan, /plan-smith}`)의 한 셀이다. 동일 요구사항 파일이 모든 셀에 주어지고, 각 셀은 **플랜 문서만** 산출한다. 게임 코드는 이 단계에서 작성하지 않는다.
- 실험 메타(테스트 매트릭스, `test/<model>/<method>/plan.md` 경로)는 하네스의 관심사이며 플랜 내용과 무관하다. 플랜은 게임 구현 계획서 자체여야 한다.
- 결정적 환경 사실: 구현자는 **파일을 읽고 쓰는 도구만** 가진다. npm 설치, 빌드, 브라우저 실행, 테스트, curl 다운로드 전부 불가. 구현자는 이 플랜 외에 아무것도(패킷, 요구사항 파일, 이 대화) 보지 못한다. 따라서 플랜은 자기완결적이어야 하고, 구현자가 "기억에서 떠올려야 하는 이음새"를 최소화해야 한다.

## Goal — definition of success
이 플랜이 성공했다는 것은, 위 구현자가 플랜만 읽고 쓴 파일들을 사람이 최신 데스크톱 브라우저에서 `index.html` 을 열었을 때(더블클릭 `file://` 또는 정적 HTTP 서빙 모두) 다음이 성립한다는 뜻이다:
1. 메인 화면 → "게임 시작" → 스테이지 1 인게임 진입.
2. 새총에서 새를 드래그해 놓으면 새가 중력 하에 포물선으로 날아가고, 구조물·돼지와 충돌하며, 구조물이 무너지거나 깨지고, 돼지가 제거된다.
3. 돼지를 모두 제거하면 클리어 화면(다음 스테이지 진행), 새를 다 쓰고도 돼지가 남으면 실패 화면(다시하기).
4. 서로 다른 레이아웃으로 저작된 스테이지가 정확히 10개이며 1→10 으로 진행 가능하다.
5. 인게임 화면 **우측**에 일시정지 버튼이 있고, 누르면 **"다시하기"** 와 **"메인으로"** 버튼이 있는 오버레이가 뜨며 각각 현재 스테이지 재시작 / 메인 화면 복귀로 동작한다.
6. 구현자가 이음새(파일명, 전역 심볼, 함수 시그니처, 상태 이름, 스테이지 데이터 필드, CDN URL)를 **하나도 발명하지 않아도 된다** — 전부 플랜에 적혀 있다.

## Hard constraints
- **스테이지는 정확히 10개** — source: 요구사항 1.
- **앵그리버드와 같은 게임 시스템**: 새총으로 발사체를 당겨 쏘고, 포물선 궤적·중력·충돌·구조물 파괴로 목표(돼지)를 제거하는 물리 기반 슬링샷 플레이 — source: 요구사항 2.
- **일시정지 버튼이 인게임 우측에 존재**, 클릭 시 **"다시하기" / "메인으로"** 버튼이 존재 — source: 요구사항 3. 버튼 라벨은 이 한국어 문구 그대로.
- **구현자 = claude-fable-5-1, 이 플랜 하나만 읽음, 파일 읽기/쓰기 도구만 사용(설치·빌드·실행·테스트 불가)** — source: 사용자 호출문. 여기서 도출되는 하드 제약(파생이지만 위반 시 산출물이 동작하지 않으므로 하드):
  - (a) **빌드 체인 없음**: npm/번들러/TypeScript/전처리기 금지. 브라우저가 직접 로드하는 평문 HTML+CSS+JS 파일만.
  - (b) **`file://` 로 열어도 동작해야 함**(구현자도 사용자도 서버를 띄운다는 보장이 없음). 따라서 ES 모듈(`type="module"`, `import/export`) 금지 — Chromium은 `file://` 에서 CORS 로 차단. 로컬 파일 `fetch()`/XHR 금지 — 같은 이유. 스테이지 데이터는 **인라인 JS 전역 배열**, 스크립트는 의존 순서대로 나열한 클래식 `<script src>` 태그.
  - (c) **바이너리 에셋 없음**: 이미지·오디오·폰트 파일을 구현자가 만들 수 없다. 모든 그래픽은 Canvas 2D 프리미티브로 그리고, 사운드는 Web Audio API 합성이거나 생략.
  - (d) **외부 의존성은 완전한 복사 가능 문자열(정확한 버전이 든 전체 URL)로만** 기재. 허용 의존성은 Matter.js 0.20.0 하나 ("Decisions already made" 참조).
  - (e) **명령형 완료 기준 금지** (`npm test 가 0 으로 종료` 류). 구현자는 명령을 못 돌린다. 완료 기준은 구현자가 **자기가 쓴 파일을 읽어서** 확인할 수 있는 것이어야 한다(예: "`index.html` 의 `<script>` 태그 순서가 X→Y→Z 이다", "`STAGES.length === 10` 이 되도록 배열 리터럴에 객체 10개가 있다").
  - (f) frames.md **"The machinery budget"** 전부 적용: 파일 수 최소, 설정 파일이 다른 설정 파일을 참조하는 구조 금지, 최고위험 이음새(Matter 별칭 줄, 파일별 공개 함수 시그니처 표, 초기 상태 선언)를 **그대로 복사 가능한 블록**으로 플랜에 수록.
- **플랜은 자기완결적**: 패킷·요구사항 파일·대화를 참조하지 않는다. 구현자가 플랜에 없는 것을 알 방법이 없다 — source: 사용자 호출문("이 계획서 하나만 읽고").
- **이 단계에서는 게임 코드를 작성하지 않는다** — source: 사용자 호출문. 해석: 플랜에 실려도 되는 것은 이음새 고정을 위한 **짧은 복사 블록**(별칭 줄, 시그니처 표, 초기 상태 선언, 스테이지 객체 스키마 예시 1개, `<script>` 태그 순서)까지. 함수 본문·알고리즘 구현은 싣지 않는다.
- **플랜 언어는 한국어** — source: 사용자가 한국어로 대화.

## Soft preferences
- **"완성된 느낌"의 표면**을 세 요구사항 외에도 명시적으로 다룰 것: 점수 표시, 클리어 시 별(1~3), 스테이지 선택 화면과 해금 진행도(localStorage 영속), 조준 중 궤적 예측 점선, 파괴 피드백(파편/플래시), 합성 효과음 + 음소거 토글. ⚠guess — 근거: "앵그리버드와 같은 게임 시스템으로 게임플레이가 가능"이라는 문구는 기술 데모가 아니라 게임을 뜻한다고 읽음. 각 항목은 build 또는 defer(+트리거)로 명시하고 침묵하지 않는다. (배치 자체 승인)
- 10 스테이지는 **서로 다른 레이아웃과 난이도 곡선**을 가진 저작된 콘텐츠여야 한다 — 로더 + 스테이지 1개 복제가 아니다.
- 입력은 **Pointer Events**(pointerdown/move/up) 로 마우스·터치를 한 번에 처리.
- 발사는 Matter `Constraint` 로 고무줄을 흉내내기보다 **놓는 순간 `Body.setVelocity` 로 수동 발사**(앵커−드래그점 벡터 × 계수)를 선호 — Constraint 제거 타이밍 버그(새가 앵커를 지나야 풀리는 문제)를 테스트 없이 피하기 위함. ⚠guess (배치 자체 승인)
- 새는 **단일 종류**로 시작. 여러 종류의 새(특수 능력)는 defer + 트리거.
- 파일 수는 대략 5~8개, 한 폴더 안. 구현자가 강한 모델이므로 파일 하나가 수백 줄이어도 무방 — 파일 수를 늘리는 것보다 이음새를 줄이는 쪽을 택한다.
- 1차 타깃은 최신 데스크톱 브라우저(Chrome/Edge/Firefox/Safari). 모바일은 Pointer Events 로 얻어지는 만큼만.
- 일시정지 오버레이에 "계속하기" 버튼을 추가하는 것은 허용(요구사항이 금지하지 않음). 일시정지 버튼 재클릭으로도 재개. ⚠guess (배치 자체 승인)

## Rejected alternatives (and why)
- **TypeScript / 번들러(Vite, webpack 등) / npm 패키지** — 구현자가 설치·빌드를 할 수 없다. 부활 조건: 구현자에게 설치·빌드·실행 환경이 주어지면.
- **ES 모듈(`import`/`export`)** — `file://` 에서 Chromium 이 CORS 로 차단해 게임이 뜨지 않는다. 부활 조건: 산출물이 HTTP 로만 서빙된다는 보장이 있으면.
- **외부 JSON 스테이지 파일을 `fetch()` 로 로드** — 같은 `file://` 차단. 부활 조건: 위와 동일.
- **물리 엔진 직접 구현** — 회전하는 강체의 적층·붕괴·마찰·수면(sleeping)을 테스트 반복 없이 맞게 쓰기는 매우 어렵다. Matter.js 는 이 장르의 정석이며 CDN 한 줄로 얻는다. 부활 조건: 플레이 시점에 CDN 스크립트를 로드할 수 없어야 한다는(오프라인) 요구가 생기거나, 벤더링 수단이 생기면. ⚠guess (배치 자체 승인)
- **Phaser 등 게임 프레임워크(CDN)** — API 표면이 커서 기억에 의존해 무테스트로 쓰면 오류 확률이 높다. Matter.js 만이 더 작다. 부활 조건: 구현자에게 실행·테스트 능력이 생기면.
- **Matter.js 내장 `Render`/`Runner` 사용** — 내장 렌더러는 와이어프레임/단색 위주라 새총 고무줄·궤적 점선·HUD 를 못 그리고, `Runner` 는 버전에 따라 동작이 바뀐다. 대신 `requestAnimationFrame` 루프에서 `Engine.update(engine, 1000/60)` 을 직접 호출하고 Canvas 2D 로 직접 그린다. 부활 조건: 디버그 뷰가 필요할 때 보조 캔버스로만.
- **이미지·오디오 에셋 파일** — 구현자가 바이너리를 만들 수 없다. 부활 조건: 에셋 팩이 공급되면.
- **메뉴·버튼을 캔버스 안에 그려서 히트테스트** — 무테스트 구현에서 좌표 계산 버그가 가장 잘 나는 곳. 메뉴/오버레이/일시정지 버튼/HUD 텍스트는 **DOM 요소**로, 캔버스는 게임 월드만. 부활 조건: 풀스크린 캔버스 전용 렌더링이 요구되면.

## Decisions already made
- **스택**: `index.html` + `style.css` + 클래식 `<script>` 로 로드되는 JS 파일 몇 개 + Matter.js. 빌드 없음. — 하드 제약 (a)(b)에서 도출.
- **물리 엔진**: Matter.js **0.20.0**, CDN 태그 한 줄:
  `<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>`
  — 2026-09-30 메인 에이전트가 HEAD 요청으로 HTTP 200 확인(0.19.0, cdnjs, unpkg 미러도 200 이나 플랜에는 위 한 줄만 싣는다). 구입 목적: 회전 강체·적층·수면·충돌 이벤트(`collisionStart`)를 직접 짜지 않기 위함. ⚠guess → 배치 자체 승인.
  - 버전 간 API 드리프트 회피 지침: `World` 대신 `Composite`(`Composite.add/remove/allBodies`), `Engine.run/Runner` 대신 `Engine.update(engine, 1000/60)`, `engine.world.gravity` 대신 `engine.gravity`, 충돌 세기는 `pair.collision.depth` 대신 두 body 의 상대속도 크기(`Vector.magnitude(Vector.sub(a.velocity, b.velocity))`)로 계산. `window.Matter` 가 undefined 이면 화면에 눈에 보이는 에러 문구를 띄운다(조용한 실패 금지).
- **렌더링**: Canvas 2D 직접 그리기(월드만). — 위 기각 사유. ⚠guess → 배치 자체 승인.
- **UI**: 메인/스테이지 선택/일시정지/클리어/실패 오버레이, 일시정지 버튼, HUD 는 DOM. — 위 기각 사유. ⚠guess → 배치 자체 승인.
- **스테이지 데이터**: `stages.js` 안의 전역 `STAGES` 배열(객체 10개), 로딩은 배열 인덱스 접근, 전환은 월드 비우고 다시 짓기. — 하드 제약 (b).
- **상태 머신**: 최소 `MENU → PLAYING → PAUSED → (PLAYING | MENU)`, `PLAYING → CLEARED | FAILED`, `CLEARED → PLAYING(next) | MENU`, `FAILED → PLAYING(retry) | MENU`. 이름은 작성자가 확정하되 플랜에 상수로 박는다. — 요구사항 3 + 핵심 질문 목록.
- **영속**: `localStorage` 키 하나에 해금/별 정보 JSON. 실패해도(private 모드 등) 게임은 진행. — 소프트 선호에서 승격, ⚠guess 배치 자체 승인.
- **스타일/프레임**: 아래 섹션 참조.

## Relevant files & paths
- `<FIXTURE>` — 요구사항 원문. 요점: 하드 요구 3개(10 스테이지 / 앵그리버드식 물리 슬링샷 플레이 / 우측 일시정지→다시하기·메인으로) + 플랜이 답해야 할 7개 질문(물리 엔진, 렌더링, 스테이지 데이터·로딩·전환, 슬링샷 입력·궤적 예측 UX, 충돌·파괴·점수·클리어 판정, 일시정지 오버레이와 상태 머신, 완료 판정 기준). "실험 메타" 절은 무시.
- 작업 디렉터리 `<FIXTURE>` — `plan.start`, `plan.end`, `plan.json`, `plan.err` 는 하네스 파일. 건드리지 않는다. 기존 코드 없음(그린필드).

## Unknowns & open questions
- 최종 사용자가 `file://` 로 열지 HTTP 로 서빙할지 모른다 → 둘 다 동작하도록 설계(가정으로 기재).
- 플레이 시점 네트워크(CDN) 가용성 → 가정. 리스크로 기재하고 `window.Matter` 미정의 시 가시적 에러.
- "우측"이 우상단 모서리인지 우측 어디든인지 → **우상단 모서리**로 가정 ⚠guess(배치 자체 승인). 플랜에 가정으로 기재.
- 구현자가 Matter.js 0.20.0 API 를 기억에서 정확히 재현할 수 있는가 → 플랜이 사용하는 API 이름을 표로 고정하고, 사용 API 수를 최소화한다(위 드리프트 회피 지침).
- 하네스가 기대하는 산출 경로(`test/<model>/<method>/plan.md`)는 파이프라인 범위 밖. 파이프라인은 `plans/<slug>/plan.md` 에 쓴다.
- 브라우저 타깃은 최신 데스크톱으로 가정. 특정 구버전 지원 요구 없음.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 요구사항은 완결돼 있고(10 스테이지, 슬링샷 물리 루프, 우측 일시정지→두 버튼) 열린 양자택일이 사실상 없다. 이 플랜을 문자 그대로 따랐을 때의 위험은 "잘못 골랐다"가 아니라 **"빠뜨렸다 / 표면이 얇다 / 이음새가 안 닿는다"** 이다. frames.md 가 기록한 A/B 실패 사례(브라우저 게임, 10 스테이지, 물리 루프, 지정 UI — `backward` 프레임으로 요구사항이 잘려나감)가 정확히 이 과제 유형이다. 게다가 구현자가 테스트를 못 하므로 배선(wiring) 누락은 구현 후에도 발견되지 않는다 → 커버리지 + 하중 경로 명세가 문서의 중심이어야 한다.
- (build-out) Frame is `spec-coverage`; borrowed frame: **없음**. 유일하게 열려 있던 하위 결정(물리 엔진 직접 구현 vs Matter.js)은 이 패킷에서 확정했고(부활 조건 포함), 작성자는 "대안과 기각 사유"에 부활 트리거와 함께 기록한다.
- **Implementer**: `claude-fable-5-1` — 강한 모델이지만 **환경이 약하다**(읽기/쓰기 도구만, 설치·빌드·실행·테스트 불가, 이 플랜만 봄).
- **Machinery budget applies** — 약한 구현자 규칙을 전부 적용: 빌드 체인 없음, 설정-참조-설정 없음, 의존성은 완전한 복사 문자열, 최고위험 이음새(Matter 별칭 줄 / 파일별 공개 함수 시그니처 표 / 초기 상태 선언)는 그대로 복사 가능한 블록, 명령형 완료 기준 없음. 단, 모델 자체는 강하므로 긴 파일 저작·긴 플랜 독해는 기대해도 된다 — 파일 수를 줄이는 쪽으로 예산을 쓴다.

## Load-bearing path candidate (build-out only)
- Path: 메인 화면의 "게임 시작" 버튼 클릭 → 상태가 PLAYING 이 되고 `STAGES[0]` 으로 월드 구성(지면·구조물 블록·돼지 body 생성, 새 1마리를 새총 앵커에 정적 배치) → 사용자가 캔버스에서 새를 pointerdown→드래그→pointerup 으로 놓음 → 새가 `isStatic=false` 가 되고 `Body.setVelocity` 로 속도를 받아 매 프레임 `Engine.update` 하에 중력 포물선으로 날아감 → `collisionStart` 에서 새(또는 블록 파편)와 돼지의 상대속도가 임계 이상이면 돼지 body 를 `Composite.remove` 하고 남은 돼지 수 감소 → 남은 돼지 0 이면 CLEARED 로 전이하고 클리어 오버레이 표시.
- Why this one: "당겨서 쏘면 돼지가 죽고 클리어가 뜬다"가 닫히지 않으면 10 스테이지도 일시정지도 장식이다. 이 경로의 각 홉은 서로 다른 파일/이벤트(DOM 클릭 → 월드 빌드 → 포인터 입력 → 물리 스텝 → 충돌 이벤트 → 상태 전이)를 건너므로, 정확히 "부품은 있는데 배선이 없는" 실패가 일어나는 자리다. 일시정지 경로(우측 버튼 → 오버레이 → 다시하기/메인으로)는 두 번째로 중요하지만 하중 경로는 하나만 고른다 — 작성자는 일시정지 배선을 단계의 검증 조건으로 별도 명세한다.

## Frame selection
- Frame: `spec-coverage`
- Rationale: Gate 0 = build-out. 술어 ① "알려지지 않은 것이 없고 실행만 남음" → Gate 0 가 결정 → `spec-coverage`. 차점 후보 `backward`(수용 기준 역추적)는 frames.md 에 기록된 동일 과제 유형의 A/B 실패(요구사항을 "cosmetic"으로 재분류, 스택·점수·영속 침묵) 때문에 기각. `emotion-curve`(게임 도메인 힌트)는 장르가 정해진 클론 과제에서 감정 곡선이 결정을 바꾸지 않으므로 기각. 하중 경로·동사 문장·구현자 계약·기계 예산 규칙은 이 프레임의 필수 구성요소로 함께 적용.

## Style selection
- Style: `opus`
- Execution mode: **standalone** (다른 패스 없음. 고백 로그에서 "다음 패스"로 미루는 것 금지)
- Rationale: auto-routing 신호 "첫 초안 + 커버리지 폭이 핵심(build-out)" 발화 → opus. 상충 신호: 소비자가 사람이 아니라 모델(시스템 소비 → fable 기본값)이나, 그 기본값은 다른 신호가 없을 때만 적용된다. relay 는 "철저하게/고위험" 신호가 없고 배치 비용을 두 배로 만들며 검증되지 않은 모드라 미선택. 배치 실행이라 사용자에게 물을 수 없어 메인 에이전트가 판단(⚠guess 자체 승인).

## Output contract
- Plan file: `plans/web-angry-birds-game/plan.md` (작업 디렉터리 기준 절대경로: `<FIXTURE>`)
- Wiring audit: `plans/web-angry-birds-game/wiring-audit.md`

## 확인 게이트 기록 (배치 자체 승인)
- 사용자 지시("사용자 확인 게이트가 나오면 배치 실행이므로 스스로 승인하고 진행한다")에 따라 메인 에이전트가 2026-09-30 게이트를 자체 승인.
- 승인된 ⚠guess: (1) 완성감 표면(점수/별/스테이지 선택/영속/궤적 예측/파괴 피드백/합성 사운드)을 build 또는 defer 로 명시, (2) Matter.js 0.20.0 CDN 채택, (3) Canvas 2D 직접 렌더 + DOM UI, (4) 수동 발사(`Body.setVelocity`), (5) "우측" = 우상단, (6) 일시정지 오버레이에 "계속하기" 추가 허용, (7) opus 스타일 standalone.

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, model <id>, <split N parts | unsplit> (<characters> chars), one-line note -->
outcome: adopted (배치 실행 — 사용자 지시에 따라 메인 에이전트 자체 승인, 사람 판정 미수령) — frame spec-coverage, style opus, model claude-fable-5-1, split 9 parts (37831 chars), 배선 감사 7건(비차단) 반영 후 분할; 분할 검사기 exit 0
