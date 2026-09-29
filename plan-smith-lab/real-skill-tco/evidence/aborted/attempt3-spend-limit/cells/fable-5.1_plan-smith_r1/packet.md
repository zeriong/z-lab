# Context Packet — web-angry-birds-game
- Date: 2026-09-26
- Requested by: zeriong (<EMAIL>)
- Language of artifacts: 한국어

## Run stamp — record, never guess
- plan-smith version: 1.4.2 (`<HOME>/.claude/plugins/cache/plan-smith-marketplace/plan-smith/1.4.2/.claude-plugin/plugin.json`에서 읽음)
- frames.md fingerprint: 431 lines
- Main agent model: claude-fable-5-1
- plan-writer model: claude-fable-5-1 (`agents/plan-writer.md`의 `model: inherit` → 메인과 동일)
- Skill invocation: batch/scripted — 헤드리스 `claude -p`, 도구 `Read, Write, Glob, Grep, Agent, Skill`. `AskUserQuestion` 미제공. 사용자 확인 게이트는 프롬프트의 "배치 실행이므로 스스로 승인" 지시에 따라 **자가 승인**(사람 확인 없음).

## Task (one line)
웹 브라우저에서 동작하는 앵그리버드류 물리 슬링샷 게임(10스테이지, 우측 일시정지 버튼 → 다시하기/메인으로)을 `claude-fable-5-1` 구현자가 **계획서 하나만 읽고, 파일 읽기·쓰기만으로** 만들 수 있도록 하는 구현 계획서를 쓴다.

## Background (why now)
- 이 실행은 `real-skill-tco` 실험의 한 셀(`fable-5.1 / plan-smith / r1`)이다. 같은 요구사항 파일이 기본 계획(base-plan) arm과 plan-smith arm에 동일하게 주어지고, 각 arm의 계획서를 같은 모델이 구현한다. 실험의 1순위 지표는 **토큰**, 2순위는 **벽시계 시간**이다(`SPEC.md`).
- 세션 맥락은 요구사항 파일 한 장 + 실행 프롬프트뿐이다. 이 패킷의 내용은 그 두 원천과 하네스 파일(`runner.sh`, `SPEC.md`)에서만 나왔다. 그 밖의 항목은 전부 `⚠guess`다.
- 구현 단계: 구현자는 `Read, Write` 두 도구만 가진다. 프롬프트 문안(runner.sh `impl_prompt`): "아래 계획서를 읽고, 그 계획대로 소스코드를 작성하라. … `<셀>/result/` 아래에 Write … 파일 구성·개수·분량은 전부 네가 정한다. … 설치·빌드·실행·테스트는 할 수 없다."

## Goal — definition of success
구현자가 `plan.md`만 읽고 `result/` 아래에 텍스트 파일들을 써서, 브라우저가 `index.html`을 직접 열었을 때 다음이 전부 성립하는 산출물이 나온다.
1. 메인 화면이 뜨고 "게임 시작"(또는 스테이지 선택) 클릭으로 스테이지 1이 시작된다.
2. 새총의 발사체를 포인터로 당겨 놓으면 포물선으로 날아가고(중력), 구조물과 충돌해 구조물이 부서지거나 밀리며, 목표(돼지)가 제거된다.
3. 스테이지가 10개 있고, 각 스테이지에 클리어/실패 판정과 다음 스테이지 전환이 있다.
4. 인게임 화면 **우측**에 일시정지 버튼이 있고, 클릭하면 물리가 멈추고 **다시하기 / 메인으로** 버튼이 있는 오버레이가 뜨며, 두 버튼이 실제로 동작한다.
5. 페이지 로드부터 위 흐름 전체에서 **uncaught JS 에러가 0건**이다.
6. 계획서가 요구사항 파일의 "플랜이 답해야 할 핵심 질문" 7개에 각각 명시적으로 답한다.

## Hard constraints
- **10단계 스테이지** — 출처: 요구사항 파일 §요청사항 1.
- **앵그리버드와 같은 게임 시스템**(새총 당겨 발사, 포물선·중력·충돌·구조물 파괴, 돼지 등 목표 제거) — 출처: 요구사항 파일 §요청사항 2.
- **일시정지 버튼이 인게임 우측에 존재**, 클릭 시 **다시하기 / 메인으로** 버튼 존재 — 출처: 요구사항 파일 §요청사항 3.
- **구현자 = `claude-fable-5-1`, 계획서 하나만 읽음, 파일 읽기·쓰기 도구만 사용, 설치·빌드·실행·테스트 불가** — 출처: 실행 프롬프트. 파생 제약(모두 이 한 줄에서 기계적으로 따라옴):
  - npm·번들러·TypeScript·빌드 체인 금지. 브라우저가 **그대로 여는 평문 파일**(HTML/CSS/JS)만.
  - 외부 의존성은 **완전한 복사 가능 문자열**(정확한 버전이 박힌 전체 URL)로만 적는다. 이름만 적으면 구현자가 버전을 기억으로 지어낸다.
  - 완료 기준에 **명령어 실행형 항목 금지**(`npm test exits 0` 등은 구현자가 수행할 수 없다). 대신 구현자가 **자기 출력 파일을 읽어서** 확인할 수 있는 판독형 검사만 쓴다.
  - 구현자는 **텍스트 파일만** 쓸 수 있다 → 이미지·오디오 에셋 파일을 만들 수 없다. 모든 그래픽은 Canvas 기본 도형으로 그린다. 소리는 WebAudio 합성이거나 `defer`.
- **이 단계에서는 코드를 작성하지 않는다** — 출처: 실행 프롬프트. 계획서 안의 "복사 가능 접합부 블록"(의존성 별칭 줄, 함수 시그니처 표, 초기 상태 선언, DOM id 표, 스테이지 스키마)은 구현이 아니라 **접합부 고정**이며 허용된다. 함수 본문을 계획서에 쓰지 않는다.
- **출력 경로** `plans/web-angry-birds-game/plan.md` (작업 디렉터리 기준) — 출처: 스킬 관례 + `runner.sh`가 `plans/*/plan.md`를 수집한다. `plans/` 아래에 plan.md를 가진 디렉터리는 **하나만** 있어야 한다.
- **언어: 한국어** — 사용자 대화 언어.
- 드래그 입력은 `setPointerCapture`에 **의존하지 않는다**(pointerdown은 캔버스에, pointermove/pointerup은 `window`에 걸어 캔버스 밖에서 놓아도 발사된다) — 출처: `SPEC.md` 판정 절("`setPointerCapture` 무력화"). 일반적인 견고성 규칙이기도 하다.

## Soft preferences
- **가장 작은 완성품**: 실험의 1순위 지표가 토큰이다(`SPEC.md`). 명시 요구 3개 + "완성처럼 느껴지는 데 필요한 최소"(점수/남은 새 표시, 클리어·실패 화면, 스테이지 진행)를 `build`로 하고, 그 밖(오디오, 파티클, 별점, 저장)은 싸면 `build`, 아니면 `defer(+트리거)`. 단, 요구사항에 명시된 것은 `build`만 가능.
- 요구사항 파일의 "핵심 질문" 7개(물리 엔진 / 렌더링 / 스테이지 데이터·로딩·전환 / 슬링샷 입력·궤적 예측 / 충돌·파괴·점수·클리어 / 일시정지 오버레이·상태 머신 / 완료 판정)는 계획서에서 각각 **한 곳에서 명시적으로** 답한다.
- `file://`로 더블클릭해 열어도, `http://`로 서빙해도 동작한다(⚠guess: 판정자가 어떤 방식으로 여는지 모른다 → 둘 다 되게 설계).
- 파일 수는 적게(대략 6~10개), 각 파일의 공개 함수와 시그니처를 계획서의 심볼 표로 고정.

## Rejected alternatives (and why)
- **npm / 번들러 / TypeScript 빌드 체인** — 구현자가 설치·빌드를 할 수 없다(하드 제약). 부활 트리거: 구현자에게 셸이 주어지면.
- **ES 모듈(`<script type="module">`, `import/export`)** — `file://`로 열면 CORS로 로드 실패. 고전 `<script>` 태그를 순서대로 나열하고 전역 이름으로 연결한다. 부활 트리거: 산출물이 반드시 http로 서빙된다고 보장될 때.
- **런타임 `fetch`로 스테이지 JSON 읽기** — 같은 이유(`file://`에서 fetch 실패). 스테이지 데이터는 JS 파일 안의 전역 상수. 부활 트리거: 위와 같음.
- **이미지/오디오 에셋 파일 사용** — 구현자는 텍스트 파일만 쓸 수 있다. 부활 트리거: 에셋 파일이 별도로 제공될 때.
- **`document.write` 폴백이나 존재하지 않는 로컬 vendored 파일로의 폴백** — 아무도 만들지 않는 파일에 기대는 것은 침묵 실패. 대신 `window.Matter`가 없으면 메인 화면에 **보이는 오류 문구**를 띄운다.

## Decisions already made
- Gate 0: **build-out** (아래). 프레임 `spec-coverage`, 스타일 `fable`, 단일 패스(standalone). 배선 감사(Stage 2c) 실행.
- 확인 게이트: 배치 지시에 따라 자가 승인. 아래 `⚠guess` 항목은 **사람이 확인하지 않았다** — writer는 이를 "권고"로 취급하고, 벗어날 때는 이유를 명시한다.
- 계획서는 구현 산출물의 경로를 **`result/` 루트 기준 상대 경로**로 쓴다(`index.html`이 루트). 절대 경로를 박지 않는다.

## Relevant files & paths
- `<LAB>/plan-smith-lab/real-skill-tco/inputs/game-prompt.md` — 요구사항 원문. 핵심: 요청사항 3개(10스테이지 / 앵그리버드식 물리 슬링샷 / 우측 일시정지 → 다시하기·메인으로)와 계획서가 답할 핵심 질문 7개. 기술 스택은 **지정되지 않았다**(물리 엔진·렌더링은 "질문"으로 열려 있음).
- `<LAB>/plan-smith-lab/real-skill-tco/runner.sh` — 하네스 정본. 핵심: 계획 파일은 `plans/*/plan.md`에서 수집; 구현자는 `Read,Write`만 갖고 "그 계획대로" `result/`에 쓴다; 파일 구성은 구현자 재량이므로 계획서가 파일 목록을 **명시하면 그대로 따를 가능성이 높다**.
- `<LAB>/plan-smith-lab/real-skill-tco/SPEC.md` — 실험 스펙. 핵심: 1순위 지표 토큰; 산출물은 브라우저에서 포인터 프로브로 판정되며 DONE 조건에 "uncaught JS 에러 0"이 포함; 프로브가 `setPointerCapture`를 무력화한다.
- (writer 참고) 작업 디렉터리 `<LAB>/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r1/`에는 이 패킷 외에 **코드베이스가 없다**. 그린필드다. 읽을 프로젝트 파일은 위 세 개뿐이다.

## Unknowns & open questions
- 판정자가 산출물을 `file://`로 여는지 `http://`로 여는지 — 모름. 둘 다 동작하게 설계(고전 스크립트, fetch 없음).
- CDN 접근 가능 여부 — 모름. `window.Matter` 부재 시 보이는 오류 문구로 실패를 드러낸다. 하단 물리 엔진 권고의 부활 트리거이기도 하다.
- 판정자의 화면 크기 — 모름. 논리 캔버스 크기를 고정(예: 1280×720)하고 CSS로 창에 맞춰 비율 유지 스케일, 포인터 좌표는 `getBoundingClientRect` 비율로 역변환. (숫자는 writer가 정하고 태그를 단다.)
- 10개 스테이지의 실제 좌표 — 계획서가 직접 10개 배치를 적을지, 스키마 + 배치 규칙(지면·블록 위에 정확히 얹히는 규칙, 돼지가 새총 사거리 안에 있는 규칙) + 스테이지별 파라미터 표(새 수·돼지 수·블록 수·재질·구조 유형)로 구현자가 좌표를 작성하게 할지 — writer의 결정. 어느 쪽이든 프레임의 **content axis**(10개 스테이지의 실제 콘텐츠와 난이도 곡선)를 만족해야 한다.

### 권고 (⚠guess — 배치 자가 승인, 사람 미확인; writer가 최종 결정하되 벗어나면 이유를 적는다)
- **물리 엔진: Matter.js를 CDN 한 줄로** — 테스트할 수 없는 환경에서 직접 구현한 물리(충돌 해소·적층 안정성)는 "죽은 산출물"의 최대 위험이고, 라이브러리는 그 위험을 URL 한 줄로 줄인다. 복사용 문자열(정확히 이 한 줄만 사용):
  `<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>`
  전역 `window.Matter`가 생긴다. 별칭 줄 권고: `const { Engine, Bodies, Body, Composite, Events, Vector } = Matter;`
  (대안 호스트 `https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js` — 문서에 둘 다 적되 코드에는 하나만.)
  직접 구현의 부활 트리거: 대상 환경에서 CDN이 로드되지 않음이 관측될 때.
- **렌더링: Canvas 2D 직접 그리기** — `Matter.Render`는 디버그용 와이어프레임이라 게임 외관이 아니다. 바디의 `vertices`/`position`을 읽어 재질별 색으로 그린다.
- **루프: 수동 `requestAnimationFrame` + 고정 스텝 `Engine.update(engine, 1000/60)`** — 일시정지 = 업데이트를 건너뛰고 그리기만 유지. `Matter.Runner`를 쓰지 않는 이유는 일시정지·재개·스테이지 재구성의 제어권을 한 곳에 두기 위해서.
- **입력: Pointer Events** — `pointerdown`은 캔버스, `pointermove`/`pointerup`은 `window`. `setPointerCapture` 미사용. 터치도 같은 경로로 동작.
- **발사: 속도 = (앵커 − 새 위치) × 계수, 당김 반경 상한** — `Body.setVelocity`는 **스텝당 픽셀** 단위임을 계획서에 명기(초당이 아님). 궤적 예측은 같은 이산 스텝(`pos += vel; vel.y += g`)을 N번 돌려 점으로 찍는 방식 권고. 계수·상한·g는 writer가 초기값으로 정하고 태그를 단다.
- **상태 머신: `MAIN → PLAYING ⇄ PAUSED`, `PLAYING → CLEAR | FAIL`, `PAUSED → (재개 | 다시하기→PLAYING | 메인으로→MAIN)`, `CLEAR → 다음 스테이지 | 메인`, `FAIL → 다시하기 | 메인`** — 전이마다 "누가 호출하고 무엇을 정리하는지(월드 clear, 새 카운트 리셋, 오버레이 표시/숨김)"를 한 줄씩.
- **판정 규칙 권고**: 돼지는 `label:'pig'`, 충돌 시 상대속도 크기가 임계 이상이면 hp 감소, hp ≤ 0 또는 월드 밖 낙하 시 제거. 블록은 재질별 hp. 새는 정지(속도 < 임계가 N프레임) 또는 월드 밖 또는 최대 비행시간 초과 시 "소모"되어 다음 새 장전. 돼지 0 → CLEAR(짧은 정착 지연 후). 새 0이고 마지막 새 소모 + 정착 후 돼지 남음 → FAIL.
- **파일 구성 권고(고전 스크립트, 이 순서로 `<script>`)**: `index.html`, `style.css`, `js/config.js`(상수), `js/stages.js`(`const STAGES = [...]` 10개), `js/physics.js`(월드 구성·재질·피해), `js/slingshot.js`(입력·발사·궤적), `js/render.js`(그리기), `js/ui.js`(화면·HUD·오버레이·DOM id), `js/main.js`(상태 머신·루프·부트스트랩). 전역 이름 충돌을 피하려고 파일마다 하나의 전역 객체(예: `Physics`, `Slingshot`)로 노출.
- **부트스트랩**: `DOMContentLoaded`에서 `Matter` 존재 확인 → 없으면 메인 화면에 오류 문구 → 있으면 초기화. 모든 `getElementById` 대상은 계획서의 DOM id 표에 있고 `index.html`에 실재해야 한다(이것이 uncaught 에러의 주된 원천).

## Deliverable type (Gate 0)
- Type: **build-out**
- Rationale: 스펙이 완결되어 있다(요구 3개 + 답할 질문 7개). 이 계획서를 문자 그대로 따랐을 때의 위험은 "잘못 골랐다"가 아니라 **"빠뜨렸다"**(스테이지 콘텐츠, 일시정지 오버레이의 두 버튼 동작, 클리어/실패 판정, 접합부 미연결)다. 유일하게 열린 양자택일(물리 엔진 직접 구현 vs 라이브러리)은 하드 제약(설치·테스트 불가)이 사실상 답을 정하므로 별도 프레임을 빌리지 않고 Alternatives 절의 기각 + 부활 트리거로 처리한다.
- (build-out) Frame is `spec-coverage`; 빌린 프레임: **없음**.
- **Implementer**: `claude-fable-5-1` — 강한 모델이지만 **실행 환경이 없다**(Read/Write만). 따라서 "약한/미상 구현자용" 기계 예산 규칙을 **환경 제약으로서** 적용한다: 빌드 체인 없음, 설정이 설정을 참조하지 않음, 의존성은 완전한 복사 가능 문자열, 최고 위험 접합부는 복사 가능 블록으로(별칭 줄·심볼 표와 시그니처·초기 상태·DOM id 표), 완료 기준은 **명령 실행형이 아니라 판독형**(구현자가 자기 출력을 읽어 확인). 배선 규율(load-bearing path, 동사 문장)은 강한 구현자 기준으로 전부 적용.
- **Machinery budget applies** (위 이유).
- **Implementer contract의 "명령 + 종료 코드" 조항 대체 규칙**: 명령을 실행할 수 없으므로, 스택을 사서 얻는 보장마다 "구현자가 파일을 읽어 확인하는 문장"으로 적는다(예: "`index.html`에 위 CDN 문자열이 **글자 그대로** 한 번 있다", "심볼 표의 모든 함수가 지정 파일에 정의되어 있고 모든 호출부가 같은 시그니처를 쓴다", "`stages.js`의 `STAGES.length`가 10이고 id가 1..10이다", "js가 참조하는 모든 DOM id가 `index.html`에 있다").

## Load-bearing path candidate (build-out only)
- Path: `index.html` 로드(CDN 스크립트 → `window.Matter`, 고전 스크립트 순서 로드) → `DOMContentLoaded`에서 부트스트랩, 메인 화면 표시 → "게임 시작" 클릭 → 스테이지 1 월드 구성 + 상태 `PLAYING` + 루프 시작, 새 1마리 새총에 장전 → 새 위에서 `pointerdown` → `pointermove`로 당김(반경 클램프) → `pointerup`에서 속도 설정, 새가 동적 바디가 되어 날아감 → 매 프레임 `Engine.update`로 중력·충돌 → `collisionStart`에서 돼지 hp 감소 → 돼지 제거 → 돼지 0 → `CLEAR` 오버레이(다음 스테이지 버튼).
- Why this one: 이 사슬의 어느 홉이라도 끊기면 "한 발도 못 쏘는 것"이고, 10스테이지·일시정지는 그 주위의 장식이 된다. 일시정지 경로(우측 버튼 → PAUSED → 다시하기/메인으로)는 명시 요구이므로 **반드시 build + 동사 문장**이지만 load-bearing은 아니다.

## Frame selection
- Frame: `spec-coverage`
- Rationale: Gate 0 = build-out(위). 예측 ①에서 "미지수 없음, 실행만" → Gate 0이 결정. `backward`/`delete-first` 같은 절단 프레임은 완결 스펙에서 요구사항을 조용히 빠뜨린다(frames.md의 A/B 관측). 하위 결정(물리 엔진)은 하드 제약이 답을 정하므로 빌림 없음.

## Style selection
- Style: `fable`
- Execution mode: **standalone** (단일 패스; 다른 패스는 없다 — confession의 이연 금지)
- Rationale: 계획서의 소비자는 사람이 아니라 **혼자 읽는 AI 구현자**(system-consumed) → auto-routing 기본값 `fable`. 게임 상태 머신·판정 규칙·전이 규칙은 "운영 규칙" 성격이라 fable의 "판단을 규칙으로 인코딩"이 맞는다. writer 모델이 `claude-fable-5-1`이므로 스타일×모델의 검증된 짝이기도 하다. `relay`는 배제: 실험의 1순위 지표가 토큰이고 "철저히"라는 사용자 신호가 없다.
- 문서 예산 주의: 스타일의 attribution accounting은 **plan.md가 아니라 writer의 반환 메시지**에 적는다. Coverage self-audit는 계획서 끝에 짧게.

## Output contract
- Plan file: `<LAB>/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r1/plans/web-angry-birds-game/plan.md`
- Wiring audit (Stage 2c): `<LAB>/plan-smith-lab/real-skill-tco/fable-5.1/plan-smith/r1/plans/web-angry-birds-game/wiring-audit.md`

## Retrospective
<!-- appended after user verdict: outcome: <adopted|edited|rejected> — frame <name>, style <name>, model <the model that ran plan-writer>, one-line note -->
