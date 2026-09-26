# Context Packet — angry-birds-web-game
- Date: 2026-09-26
- Requested by: zeriong
- Language of artifacts: 한국어 (플랜 본문·표·문장 모두 한국어. 코드 식별자, URL, API 이름은 원문 그대로)

## Run stamp — record, never guess
- plan-smith version: 1.4.2 (`/Users/jeonjelyong/.claude/plugins/cache/plan-smith-marketplace/plan-smith/1.4.2/.claude-plugin/plugin.json`에서 읽음)
- frames.md fingerprint: 431 lines
- Main agent model: claude-fable-5-1
- plan-writer model: claude-fable-5-1 (서브에이전트는 부모 모델을 상속, 모델 오버라이드 없음)
- Skill invocation: batch/scripted — 사용자 지시 "사용자 확인 게이트가 나오면 배치 실행이므로 스스로 승인하고 진행한다"

## Task (one line)
웹브라우저용 앵그리버드류 물리 슬링샷 게임(10스테이지, 우측 일시정지 버튼 → 다시하기/메인으로)을 **claude-fable-5-1이 이 플랜 한 장만 읽고, 파일 읽기/쓰기 도구만으로(설치·빌드·실행·테스트 불가)** 구현할 수 있게 하는 계획서를 작성한다.

## Background (why now)
- 이 실행은 비교 실험 `real-skill-tco`의 한 셀이다: `{fable, opus, sonnet} × {/plan(베이스라인), /plan-smith(스킬)}`. 이 셀은 `fable-5.1 × plan-smith × r1`.
- 공통 입력은 `inputs/game-prompt.md` 하나. 이 단계는 **플랜 문서만** 만든다. 게임 코드는 쓰지 않는다.
- 이후 별도 단계에서 구현자(claude-fable-5-1)가 플랜만 보고 파일을 써서 게임을 만든다. 구현자는 셸이 없다 — npm, 번들러, 타입체커, 브라우저 실행 어느 것도 못 한다. 자기가 쓴 파일을 다시 읽어 보는 것이 유일한 검증 수단이다.
- 이전 시도(attempt1)는 지출 한도로 중단되었다. 이번 실행은 비용에 민감하다 → 단일 패스 스타일, 릴레이 없음.

## Goal — definition of success
이 플랜이 성공한 상태:
1. 구현자가 플랜만 읽고 쓴 파일들을 사람이 최신 데스크톱 Chrome에서 `index.html`을 **file:// 로 더블클릭 열기** 또는 정적 서버로 열었을 때, 빌드 없이 즉시 메인 화면이 뜬다.
2. 시작 → 스테이지 1 → 새총에서 새를 드래그해 놓으면 포물선으로 날아가 구조물/돼지와 충돌하고, 돼지가 전부 제거되면 클리어 화면, 새를 다 써도 돼지가 남으면 실패 화면이 뜬다. 스테이지 1~10이 순서대로 이어진다.
3. 인게임 화면 **우측**에 일시정지 버튼이 있고, 누르면 오버레이에 **다시하기 / 메인으로** 버튼이 존재하며 각각 동작한다.
4. 플랜은 구현자가 **자기 산출물을 읽어서** 확인할 수 있는 완료 기준을 담는다(명령 실행형 기준은 무용).
5. 플랜은 게임 프롬프트가 열거한 7개 핵심 질문(물리 엔진, 렌더링, 10스테이지 데이터/전환, 슬링샷 입력·궤적 예측 UX, 충돌·파괴·점수·클리어 판정, 일시정지 오버레이·상태 머신, 완료 판정 기준)에 전부 답한다.

## Hard constraints
- **10단계 스테이지** — 출처: game-prompt.md 요청사항 1. 로더 하나 + 스테이지 하나가 아니라 **저작된 10개 스테이지 데이터**(난이도 곡선 포함)를 플랜이 명세해야 한다.
- **앵그리버드와 같은 게임 시스템**: 새총으로 발사체를 당겨 쏘고, 포물선 궤적·중력·충돌·구조물 파괴로 목표(돼지 등)를 제거 — 출처: game-prompt.md 요청사항 2.
- **일시정지 버튼이 인게임 우측에 존재, 클릭 시 다시하기 / 메인으로 버튼 존재** — 출처: game-prompt.md 요청사항 3. "우측"은 화면 우측(우상단 권장)이고, 두 버튼의 한국어 라벨은 "다시하기", "메인으로"를 그대로 쓴다.
- **구현자 = claude-fable-5-1, 플랜 한 장만 읽음, 파일 읽기/쓰기 도구만 사용, 설치·빌드·실행·테스트 불가** — 출처: 사용자 명령 인자.
- 위 제약에서 **도출되는** 제약(플랜이 반드시 지켜야 함):
  - **빌드 체인 금지**: npm/번들러/TypeScript/트랜스파일 없음. 브라우저가 직접 여는 순수 HTML/CSS/JS 파일만.
  - **바이너리 에셋 금지**: 구현자는 텍스트 파일만 쓸 수 있다 → 이미지·오디오 파일 없음. 그래픽은 Canvas 절차적 드로잉, 소리는 WebAudio 합성(넣는다면).
  - **file:// 에서 동작**: ES 모듈(`type="module"`, `import`/`export`)과 `fetch()`로 로컬 JSON 읽기는 Chrome의 file:// 에서 막힌다 → 클래식 `<script>` 태그를 index.html에 의존 순서대로 나열, 스테이지 데이터는 JS 파일의 전역 배열로. CDN `<script src>`는 file:// 에서도 동작한다.
  - **외부 의존성은 최대 1개, 완전한 복사 가능 문자열(정확한 버전이 든 전체 URL)로**, 구현자가 검증 못 하므로 **실패가 화면에 보이게**(로드 실패 시 페이지에 오류 문구) 설계. 출처: frames.md "The machinery budget" + 구현자 제약.
  - **명령 실행형 완료 기준 금지**(`tsc exits 0` 류). 완료 기준은 구현자가 산출 파일을 읽어서 확인 가능한 문장이어야 한다. 출처: frames.md machinery budget "an implementer that cannot run commands…".
- **이 단계에서는 코드를 작성하지 않는다** — 출처: 사용자 명령 인자. 해석: 플랜은 게임을 구현하지 않는다. 단, frames.md machinery budget이 요구하는 **접합부 고정용 verbatim 블록**은 허용된다 — (a) CDN `<script>` 태그 한 줄, (b) 의존성 alias 한 줄, (c) 파일별 공개 함수의 **시그니처만** 담은 심볼 표(본문 없음), (d) 초기 상태 선언(객체 리터럴), (e) 스테이지 데이터 스키마 예시(스테이지 1개분 데이터). **함수 본문은 쓰지 않는다.**
- **플랜 언어: 한국어** — 출처: 사용자가 한국어로 대화.
- 산출 경로: `plans/angry-birds-web-game/plan.md` (아래 Output contract).

## Soft preferences
- 게임 프롬프트의 "핵심 질문" 7개는 플랜의 답이 **각각 한 곳에서 명시적으로** 보이길 바란다(질문 항목별로 찾을 수 있게).
- 파일 수는 적게(대략 4~6개), 설정 파일이 다른 설정 파일을 참조하는 구조 없음. 구현자가 실패할 표면을 줄이는 것이 우선.
- "완성돼 보이는" 최소 묶음(스펙 밖이지만 spec-coverage 프레임의 "artifact plainly needs to feel finished" 축): 점수와 별(1~3), 남은 새 수 HUD, 파괴 피드백(간단한 파티클/흔들림), WebAudio 합성 효과음, localStorage로 해금 스테이지·최고 별 저장, 메인 화면의 스테이지 선택. 매트릭스에서 build/defer를 판정하되 **명세된 요구사항은 무조건 build**.
- 일시정지 오버레이에 스펙의 두 버튼 외에 **"계속하기"**도 두는 것을 선호(⚠guess → 배치 자체 승인: 재개 수단 없는 일시정지는 완성품이 아니다. 일시정지 버튼 재클릭으로 재개해도 무방하나 버튼이 더 명확).
- 렌더링은 Canvas 2D 선호(⚠guess → 배치 자체 승인: 에셋 없음·빌드 없음·의존성 1개 상한에서 WebGL/Pixi/Phaser는 검증 불가한 API 회상 표면만 늘린다).
- 슬링샷 입력은 Matter.js Constraint 방식보다 **"드래그 중 새를 static으로 두고, 놓는 순간 (앵커 − 현재위치)×계수를 `Body.setVelocity`로 주입"** 하는 수동 방식을 선호(⚠guess → 배치 자체 승인: 블라인드 구현에서 상태가 단순하고 궤적 예측 점을 같은 공식으로 계산할 수 있다). 라이터가 다른 방식을 택하면 이유를 적는다.

## Rejected alternatives (and why)
- **빌드 툴체인(TypeScript + Vite/npm, 타입체크로 스키마 보장)** — 구현자가 설치·빌드를 못 한다. frames.md 기록: 강한 모델이 자기용으로 쓴 플랜을 빌드 불가 구현자에게 주면 빌드 단계에서 죽는다. 부활 조건: 구현자에게 셸이 생기면 재검토.
- **ES 모듈 / `fetch()`로 읽는 JSON 스테이지 파일** — file:// 에서 Chrome이 차단한다. 부활 조건: HTTP 서빙이 보장되면 재검토.
- **이미지 스프라이트·오디오 파일** — 구현자는 바이너리를 만들 수 없다. 부활 조건: 에셋 팩이 제공되면 재검토.
- **릴레이(2패스) 스타일** — 비용 민감 실행(이전 시도가 지출 한도로 중단), 되돌리기 어려운 장기 결정도 아님. 부활 조건: 사용자가 "철저히" 신호를 주면.
- 위 4개는 대화/제약에서 확정된 것. **물리 엔진(라이브러리 vs 직접 구현)은 기각된 게 아니라 아래 "Unknowns"의 미결 판정 대상**이다.

## Decisions already made
- 산출물 종류: **build-out** (Gate 0, 아래). 프레임 `spec-coverage`, 물리 엔진 셀 한 곳만 `dialectic` 차용.
- 스타일 `opus`, 단일 패스(standalone). 릴레이 없음.
- 구현자 프로파일: claude-fable-5-1, **강한 모델이지만 실행 도구 없음** → frames.md machinery budget을 **전부** 적용(빌드 체인 없음, 파일 적게, 설정→설정 참조 없음, 의존성은 완전 복사 문자열, 최고위험 접합부는 verbatim 블록, 읽기로 확인 가능한 완료 기준).
- 대상 브라우저: 최신 데스크톱 Chrome, 마우스 입력 기준. 터치(pointer events로 자연히 커버되면 좋지만 요구 아님).

## Relevant files & paths
- `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/inputs/game-prompt.md` — 유일한 요구사항 원문. 요지: 요청사항 3개(10스테이지 / 앵그리버드식 시스템 / 우측 일시정지→다시하기·메인으로) + 플랜이 답할 핵심 질문 7개 + 실험 메타. 라이터는 이 파일을 직접 읽을 것.
- 작업 디렉터리 `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r1/` — 비어 있음. 기존 코드베이스 없음(그린필드). 라이터는 다른 셀의 산출물(`../../evidence/**`, 형제 디렉터리)을 **읽지 않는다** — 셀 간 독립성이 실험의 전제.

## Technical evidence for the writer (main agent의 회상 — 라이터는 이 표면 밖의 API 이름을 새로 지어내지 말 것)
라이터에게는 웹 도구가 없다. 아래는 main agent가 의식적으로 검토한 사실이며, 플랜의 복사 가능 문자열은 여기서 가져간다.
- **Matter.js 최신 안정 버전은 0.20.0** (그 전 0.19.0). `2.0.x` 같은 버전은 **존재하지 않는다**(frames.md가 기록한 유령 버전). CDN 문자열(둘 중 하나를 1차, 다른 하나를 폴백으로):
  - `https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js`
  - `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js`
  - 로드되면 전역 `window.Matter`가 생긴다. 로드 실패 시 `window.Matter`가 undefined → 페이지에 오류 문구를 그리는 가드가 필요.
- 0.20.0에서 확실한 API 표면: `Matter.Engine.create()`, `Matter.Engine.update(engine, deltaMs)`, `engine.gravity.y`(0.18+; `engine.world.gravity`는 구식), `Matter.Composite.add(engine.world, bodyOrArray)`, `Matter.Composite.remove(engine.world, body)`, `Matter.Composite.clear(engine.world, false)`, `Matter.Bodies.rectangle(x, y, w, h, options)`, `Matter.Bodies.circle(x, y, r, options)`, `Matter.Body.setVelocity(body, {x, y})`, `Matter.Body.setPosition(body, {x, y})`, `Matter.Body.setStatic(body, bool)`, `Matter.Body.setAngularVelocity(body, n)`, `Matter.Events.on(engine, 'collisionStart', (e) => e.pairs /* [{bodyA, bodyB, collision}] */)`, `Matter.Events.on(engine, 'afterUpdate', fn)`, body 필드 `position`, `velocity`, `speed`, `angle`, `vertices`, `circleRadius`, `isStatic`, `isSleeping`, `label`, `id`, 옵션 `restitution`, `friction`, `frictionAir`(기본 0.01), `density`, `isStatic`, `label`. `Matter.World`는 `Composite`의 deprecated 별칭 — 쓰지 말 것.
- 충돌 세기는 `pair.collision.depth`보다 **두 바디의 상대 속도 크기** `Math.hypot(a.velocity.x-b.velocity.x, a.velocity.y-b.velocity.y)`가 버전 독립적으로 안전하다.
- 속도 단위는 "픽셀/스텝(16.67 ms)". 중력은 `engine.gravity.y × engine.gravity.scale(기본 0.001)`이 매 스텝 힘으로 더해진다. 궤적 예측 점은 정확 재현이 아니라 **같은 중력 상수와 frictionAir로 단순 적분기를 N스텝 돌린 근사**로 충분하다(초기값으로 표시, 자의적 태그).
- 렌더: 직사각형은 `body.vertices`를 잇고, 원은 `body.circleRadius`로 `arc`. `body.label`로 종류(bird/pig/wood/stone/glass/ground)를 구분.
- 입력: canvas에 `pointerdown/pointermove/pointerup`, 좌표는 `canvas.getBoundingClientRect()`로 보정(CSS 스케일 시 `canvas.width / rect.width` 곱).
- 루프: `requestAnimationFrame` + 고정 `Engine.update(engine, 1000/60)`. 일시정지 중엔 update를 부르지 않고 렌더만.

## Unknowns & open questions
- **물리 엔진: Matter.js 0.20.0(CDN) vs 직접 구현** — 게임 프롬프트의 핵심 질문 1이자 유일한 진짜 양자택일. 근거 양쪽: (라이브러리) 적층·회전·안정 접촉을 블라인드로 직접 구현하면 버그를 눈으로 못 잡는다 / (직접 구현) 외부 이동 부품 0개, CDN URL 회상 오류 리스크 0. main agent 추천은 **Matter.js 0.20.0 + 폴백 CDN + 로드 실패 가시화**(⚠guess → 배치 자체 승인). 라이터는 `dialectic` 차용 셀에서 **사전 고정 판정 함수**(예: 실행 불가 구현자 아래에서 실패 비용 비대칭 = 폭발 반경 × 복구 가능성)로 판정하고, 패자 논거를 승자의 제약으로 승격시키며(예: "CDN 실패가 화면에 보여야 한다", "API 표면은 위 목록 안에서만"), 재판정 트리거를 적는다.
- Matter.js 0.20.0의 CDN URL이 **구현 시점에 해석되는지**는 아무도(main agent, 라이터, 구현자) 검증 못 한다. 플랜은 이것을 명시적 가정으로 두고 "틀리면" 경로(두 번째 CDN, 화면 오류 문구)를 적는다.
- 사람이 실제로 플레이해 볼 시점과 방식은 미정(file:// 가정). 플랜의 "done"은 구현자 읽기 검사 + 사람 수용 테스트 문장을 분리해서 적는다.
- 게임의 그림 스타일/색상은 미정 — 절차적 도형이면 충분. 자의적 값으로 선언.

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 스펙이 이미 완결돼 있다(스테이지 수, 게임 시스템, UI 요구가 명시). 문자 그대로 따랐을 때의 위험은 "잘못 골랐다"가 아니라 **"빠뜨렸다"**(점수·별·소리·저장·10개 콘텐츠·상태 전이 중 하나가 침묵 속에 사라지는 것). frames.md는 정확히 이 과제(브라우저 게임, 10스테이지, 물리 루프, 명명된 UI 요구)를 build-out을 narrowing 프레임에 보냈다가 요구사항을 잃은 사례로 기록했다. 동률이면 build-out을 택하라는 tie-break도 같은 방향.
- (build-out) Frame is `spec-coverage`; borrowed: **`dialectic`** — 물리 엔진(라이브러리 vs 직접 구현) 셀 **한 곳**에만. 차용 사실을 플랜의 해당 섹션 헤더에 한 줄로 기록.
- **Implementer**: **claude-fable-5-1** (사용자 명시). 능력은 강하지만 **실행 도구가 없다**(파일 읽기/쓰기만) → 무게 판정은 "약한/미지 구현자"와 동일하게 **machinery budget 전부 적용**. 이유: 빌드 체인은 능력 문제가 아니라 도구 부재로 원천 불가하고, 명령형 완료 기준은 실행 불가로 무용하며, 회상된 의존성 문자열을 검증할 방법이 없다.
- **Machinery budget applies** — 빌드 체인 없음, 설정→설정 참조 없음, 의존성은 완전 복사 문자열, 최고위험 접합부(의존성 alias 줄, 파일별 공개 함수 시그니처 표, 초기 상태 선언)는 verbatim 블록, 읽기 검사형 완료 기준. frames.md "The machinery budget" 참조.

## Load-bearing path candidate (build-out only)
- Path: `index.html` 로드(스크립트 순서대로 실행, `window.Matter` 존재) → 메인 화면 "시작" 클릭 → 스테이지 1 데이터로 월드 구성(지면·새총 앵커·블록·돼지·새 대기열), 현재 새가 앵커에 static으로 놓임, 상태 AIMING → 새 위에서 pointerdown → 드래그(최대 당김 반경 내) → pointerup에서 `setStatic(false)` + `setVelocity((앵커 − 현재위치) × 계수)`, 상태 FLYING → 매 프레임 `Engine.update` → `collisionStart`에서 돼지가 임계 이상 충격을 받아 hp ≤ 0 → 월드에서 제거, 남은 돼지 수 감소 → 남은 돼지 0 → 상태 CLEAR, 클리어 오버레이(점수·별·다음 스테이지) 표시.
- Why this one: 드래그해서 놓았는데 새가 안 날아가거나, 날아가도 돼지가 안 죽거나, 죽어도 클리어가 안 뜨면 나머지 전부(10스테이지, 일시정지, 점수)가 장식이 된다. frames.md가 기록한 "표면 커버리지 만점, 1차 상호작용 사망"이 정확히 이 경로의 실패다. 라이터가 다른 경로를 고르면 무엇을 골랐는지 밝힌다.

## Frame selection
- Frame: **spec-coverage** (+ `dialectic` 차용, 물리 엔진 셀 한정)
- Rationale: Gate 0 = build-out → 예측 ①("아무것도 미지 아님, 실행만 남음")에서 spec-coverage로 직행. 차순위였던 `backward`는 frames.md의 동일 과제 A/B에서 요구사항 재분류·침묵 누락을 낳은 바로 그 프레임이라 배제. 도메인 힌트의 `emotion-curve`/`failure-first`는 장식이 될 위험(스펙이 이미 경험을 규정) → 미채택. 물리 엔진 양자택일만 `dialectic`의 사전 고정 판정 함수·패자 논거 승격·재판정 트리거를 빌린다.

## Style selection
- Style: **opus**
- Execution mode: **standalone** (다른 패스 없음 — 고백 로그에서 "다음 패스"로 미루는 것 금지)
- Rationale: 자동 라우팅 신호 중 "first draft of anything"과 "breadth of coverage is the point"가 발화(build-out에서 커버리지가 곧 품질). fable 기본 규칙("system-consumed → fable")은 상위 신호가 없을 때의 폴백이라 우선순위가 낮다. 또 opus-style은 본문 내 방법론 서술 부담이 적어(frames.md document-budget 규칙) 플랜 한 장만 읽는 구현자에게 지시 밀도가 높다. 릴레이는 비용 사유로 기각(위). 스타일-모델 교차(opus-style on claude-fable-5-1)는 이식성 가설 검증 데이터로 Retrospective에 남긴다. 신호 충돌 시 사용자에게 묻는 규칙은 배치 실행이라 자체 결정(⚠guess → 배치 자체 승인).

## Output contract
- Plan file: `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r1/plans/angry-birds-web-game/plan.md`
- Wiring audit (Stage 2c, build-out 필수): `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r1/plans/angry-birds-web-game/wiring-audit.md`

## Confirmation gate record (batch)
- 게이트는 배치 실행 지시에 따라 main agent가 자체 승인했다. ⚠guess 항목과 승인 근거:
  1. 렌더링 Canvas 2D 선호 — 승인(에셋·빌드·의존성 제약의 귀결).
  2. 슬링샷 수동 속도 주입 방식 선호 — 승인(블라인드 구현의 상태 단순성). 라이터가 뒤집을 수 있음.
  3. 일시정지 오버레이에 "계속하기" 추가 — 승인(스펙의 두 버튼은 그대로 유지).
  4. 물리 엔진 추천 = Matter.js 0.20.0 — 승인은 "추천"까지만. 최종 판정은 라이터의 dialectic 셀.
  5. 스타일 opus(신호 충돌 자체 결정) — 승인.
- 사람의 사후 검토에서 뒤집히면 이 섹션을 갱신하고 Stage 2를 재실행한다.

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, model <model>, one-line note -->
