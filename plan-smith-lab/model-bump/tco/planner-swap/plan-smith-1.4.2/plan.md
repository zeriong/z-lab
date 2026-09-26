# 웹 브라우저 앵그리버드 (10 스테이지) 구현 계획서
- 추론 프레임: spec-coverage / 스타일: opus
- 한 줄 요약: 빌드 도구 없이 브라우저가 바로 여는 HTML + CSS + 바닐라 JS(클래식 script) 10개 파일과 CDN Matter.js 0.19.0으로, 메인 → 인게임 → 일시정지(우측 버튼: 계속하기/다시하기/메인으로) → 클리어/실패 흐름을 가진 10 스테이지 슬링샷 물리 게임을 만든다. 파일 사이를 잇는 부분(HTML 골격, 상수, 초기 상태, 함수 시그니처, 스테이지 데이터)은 이 문서의 블록을 그대로 복사한다.

> 구현자에게: 이 문서 하나만 보고 작업한다. 설치·빌드·실행·테스트는 할 수 없으므로, **복사하라고 한 블록은 한 글자도 바꾸지 말고 복사**하고, 함수 동작은 §5의 번호 순서대로 작성한다. 이 문서에 없는 파일, 라이브러리, API는 만들거나 쓰지 않는다.

---

## 1. 요구사항 × 표면 매트릭스 (누락 금지 원장)

요구사항 출처: R1 "stage 10단계", R2 "게임시작 → 앵그리버드와 같은 게임 시스템(새총·포물선·중력·충돌·구조물 파괴·돼지 제거)", R3 "인게임 우측 일시정지 버튼 → 다시하기 / 메인으로". R4는 명시되지 않았지만 게임이 완성되어 보이려면 필요한 것(점수·별·저장·사운드·이펙트·화면 맞춤)이다.

| # | 요구 | 표면 | 판정 | 비고 |
|---|---|---|---|---|
| L1 | R2 | 메인 메뉴 | build | "게임 시작"을 누르면 해금된 가장 높은 스테이지가 곧바로 시작 |
| L2 | R1 | 스테이지 선택 화면 | build | 10칸 격자, 잠금/별 표시 |
| L3 | R1 | 스테이지 콘텐츠 | build | 10개 배치 전부 §7에 작성, 난이도 곡선 포함 |
| L4 | R1 | 진행/해금 | build | n 클리어 → n+1 해금, "다음 스테이지" |
| L5 | R2 | 인게임 입력 | build | 드래그 → 당김 제한 → 놓아서 발사, 짧게 당기면 취소 |
| L6 | R2 | 조준 UX | build | 궤적 예측 점선 + 직전 궤적 잔상 |
| L7 | R2 | 물리 | build | 중력 포물선, 강체 충돌, 쌓인 구조물 |
| L8 | R2 | 파괴 | build | 충돌 속도로 HP 감소, 금 간 표시, 0이면 제거 |
| L9 | R2 | 목표(돼지) | build | 돼지 HP, 낙하/화면 밖 처치, 남은 수 |
| L10 | R2 | 새 종류 | build | 빨강(기본)/노랑(가속)/검정(폭발) |
| L11 | R2 | 턴 진행 | build | 정지 판정 → 다음 새, 대기열 표시 |
| L12 | R2 | 클리어 화면 | build | 판정, 남은 새 보너스, 별, 최고 기록 |
| L13 | R2 | 실패 화면 | build | 새 소진 + 돼지 남음 → 실패, 다시하기/메인으로 |
| L14 | R2 | HUD | build | 스테이지, 점수, 남은 돼지, 남은 새 |
| L15 | R3 | HUD 버튼 | build | 게임 영역 우측 상단 일시정지 버튼(플레이 중에만) |
| L16 | R3 | 일시정지 오버레이 | build | 계속하기/다시하기/메인으로, 물리 정지 |
| L17 | R3 | 키보드/탭 전환 | build | Esc 토글, 탭 숨김 시 자동 일시정지 |
| L18 | R4 | 저장소 | build | localStorage: 해금/최고점/별/음소거 |
| L19 | R4 | 오디오 | build | WebAudio 합성 효과음 + 음소거 토글 |
| L20 | R4 | 이펙트 | build | 파편 입자, 점수 팝업, 폭발 흔들림 |
| L21 | R4 | 화면/입력 장치 | build | 16:9 맞춤 스케일, 좌표 변환, 터치 |
| L22 | R4 | 로드 실패 경로 | build | Matter.js 로드 실패 시 안내 문구 |
| L23 | R4 | 배경 음악 | defer | 재개 조건: 사용자가 BGM을 요청하거나, 플레이테스트에서 "조용하다"는 피드백 |
| L24 | R4 | 이미지 스프라이트 | defer | 구현자가 이미지 파일을 만들 수 없어 도형으로 그린다. 재개 조건: 그림 파일이 제공될 때 |
| L25 | R2 | 카메라 이동/줌 | n-a | 10개 스테이지 모두 1280px 폭 안에 배치함(§7). 재개 조건: 1280px보다 넓은 스테이지가 필요할 때 |
| L26 | R2 | 파랑 새(분열) | defer | 재개 조건: 10 스테이지를 해 본 뒤 새 종류가 단조롭다는 피드백 |
| L27 | R4 | 모바일 세로 전용 레이아웃 | defer | 가로 16:9 레터박스로 동작은 함. 재개 조건: 세로 화면 플레이 요청 |
| L28 | — | 온라인 리더보드 | n-a | 서버가 없고 요구에도 없음 |

### 1.1 표면별 품질 기준 ("완성"의 뜻)
- **메인 메뉴**: 캔버스 배경(하늘·언덕·지면·새총) 위에 제목과 버튼 3개가 뜨고, "게임 시작" 버튼에 이어서 할 스테이지 번호가 적혀 있다.
- **스테이지 선택**: 10개 버튼이 모두 보이고, 잠긴 버튼은 눌리지 않으며, 깬 스테이지에는 얻은 별이 보인다.
- **인게임 캔버스**: 파괴가 눈에 보인다. 블록이 깨지면 재질 색 파편이 튀고, 돼지가 사라지면 초록 연기와 +점수가 떠오르며, 손상된 블록에는 금이 간다.
- **HUD**: 스테이지/점수/남은 돼지/남은 새가 항상 읽히고, 값이 바뀌면 바로 갱신된다.
- **일시정지 오버레이**: 누르는 순간 모든 움직임이 멈추고, 계속하기를 누르면 타이머까지 멈춘 지점에서 이어진다.
- **클리어 화면**: 별 1~3개, 점수와 남은 새 보너스를 따로 표기, 최고 기록 갱신 여부.
- **실패 화면**: 남은 돼지 수와 재도전 경로.
- **저장**: 새로고침해도 해금/별/음소거가 유지된다.
- **오디오**: 발사·충돌·재질별 파괴·돼지·폭발·클리어·실패 소리가 서로 구분되고, 음소거하면 아무 소리도 나지 않는다.

---

## 2. 목표

- 사용자가 `index.html`을 브라우저로 열면(파일 더블클릭 또는 정적 서버) 메인 메뉴가 뜨고, "게임 시작"으로 스테이지에 들어가 새총으로 새를 날려 물리적으로 구조물을 무너뜨리고 돼지를 모두 없애면 클리어, 새를 다 쓰면 실패한다.
- 10개 스테이지는 서로 다른 배치이고, 뒤로 갈수록 돼지 수·재질 강도·새 구성이 어려워진다.
- 인게임 중 게임 영역 우측 상단의 일시정지 버튼을 누르면 물리가 멈추고 계속하기/다시하기/메인으로 버튼이 뜬다.

---

## 3. 명시적 가정

| # | 가정 | 틀리면 |
|---|---|---|
| A1 | **Matter.js 0.19.0이 `https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js`에서 받아진다** (계획 전체가 여기에 걸려 있음) | 아무것도 동작하지 않는다. 대응: config.js 첫 줄의 로드 확인 코드가 원인 문구를 띄운다(L22). 가장 싼 조기 확인: 구현 직후 사람이 index.html을 열어 오류 문구 대신 메뉴가 뜨는지 본다. 대체 경로: script 주소를 `https://unpkg.com/matter-js@0.19.0/build/matter.min.js`로 바꾼다(같은 버전, 코드 변경 없음). |
| A2 | **주어진 반복 횟수(위치 10, 속도 8)에서 §7의 탑들이 입력 없이 서 있다** | 로드 직후 탑이 저절로 무너진다. 대응: 첫 발사 전에는 피해 계산을 끄므로 돼지가 저절로 죽지는 않는다. 가장 싼 조기 확인: 완료 기준 B3(10개 스테이지를 열고 5초 기다리기). 대체 경로: `POSITION_ITERATIONS`를 20, `VELOCITY_ITERATIONS`를 12로 올리고, 그래도 무너지면 해당 스테이지의 가장 높은 층 하나를 지운다. |
| A3 | 최신 데스크톱 Chrome/Edge/Firefox/Safari (Pointer Events, Canvas 2D, WebAudio, CSS `inset` 지원) | 구형 브라우저에서는 동작하지 않는다. 범위 밖으로 둔다. |
| A4 | 파일을 `file://`로 열 수 있다 → ES 모듈을 쓰지 않고 클래식 `<script>`만 쓴다 | 모듈을 쓰면 `file://`에서 CORS로 막힌다. 그래서 모듈은 금지했다. |
| A5 | 구현자는 실행해 볼 수 없다 → §4.3의 [b] 수치는 초기값이며 사람의 첫 플레이테스트에서 교체한다 | 실행할 수 있어도 문제는 없다. |
| A6 | 모든 스테이지가 1280×720 한 화면에 들어간다 | L25(카메라)를 다시 연다. |
| A7 | UI 문구는 한국어 | 문구만 바꾸면 된다. |

---

## 4. 스택, 파일, 복사 블록

### 4.1 스택과 산 이유
- **HTML + CSS + 바닐라 JavaScript, 클래식 `<script>` 태그(모듈 아님)**: 빌드도 설치도 없이 더블클릭으로 열린다. 파일끼리는 전역 이름으로 연결되고, 그 이름은 §4.4 표로 고정한다.
- **Matter.js 0.19.0 (CDN 한 줄)**: 회전하는 사각형·원의 쌓기, 마찰, 안정적인 접촉을 직접 짜면 반복 충돌 해결기가 필요하고, 실행해 볼 수 없는 구현자가 조정할 수 없다. Matter는 이것을 제공한다. 쓰는 기능은 엔진·물체 생성·속도 설정·충돌 이벤트뿐이다(§4.5 허용 API).
- **Canvas 2D 직접 그리기** (Matter.Render 안 씀): 돼지 얼굴, 금 간 블록, 파편, 궤적 점선을 그리려면 직접 그려야 한다.
- **WebAudio 합성음**: 소리 파일이 필요 없다.
- **localStorage**: 서버 없이 진행 상황을 저장한다.

### 4.2 파일 목록 (이 10개 외에는 만들지 않는다)
```
index.html
style.css
js/config.js    상수, 재질/도형/돼지/새 표, 전역 상태 G  (§4.3 그대로 복사)
js/levels.js    LEVELS 10개                               (§7 그대로 복사)
js/audio.js     효과음
js/render.js    그리기 + 입자/팝업
js/physics.js   월드 구성, 발사, 충돌 피해, 제거, 능력
js/input.js     포인터/키보드 입력
js/game.js      화면 상태, 루프, 턴, 클리어/실패, 저장, HUD, 부팅
```
규칙:
- 각 파일의 최상위에는 **함수 선언과 §4.4 표에 있는 const만** 둔다. 최상위에서 다른 파일의 함수를 호출하지 않는다. 예외는 두 가지뿐이다: config.js의 로드 확인과 별칭 줄, game.js 맨 마지막 줄 `boot();`.
- 최상위 이름(const/let/function)은 전체 파일을 통틀어 **한 번만** 선언한다. 다른 파일에서 `const W` 같은 이름을 다시 선언하면 그 파일 전체가 SyntaxError로 죽는다. 지역 변수는 함수 안에서만 만든다.
- `import`, `export`, `type="module"`, `require`, `package.json`, npm은 금지.

### 4.2.1 index.html — 그대로 복사
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>앵그리 버드</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div id="game">
    <canvas id="canvas" width="1280" height="720"></canvas>

    <div id="hud" class="hidden">
      <div id="hud-info">
        <span id="hud-stage"></span>
        <span id="hud-score"></span>
        <span id="hud-pigs"></span>
        <span id="hud-birds"></span>
      </div>
      <div id="hud-tip"></div>
      <button id="btn-pause" aria-label="일시정지"><span class="bar"></span><span class="bar"></span></button>
    </div>

    <div id="menu" class="overlay">
      <div class="panel">
        <h1>앵그리 버드</h1>
        <p class="sub">새총으로 새를 날려 돼지를 모두 물리치세요</p>
        <button id="btn-start" class="btn">게임 시작</button>
        <button id="btn-select" class="btn">스테이지 선택</button>
        <button id="btn-sound" class="btn btn-sub">사운드: 켜짐</button>
        <p class="help">새를 뒤로 끌었다 놓으면 발사 · 날아가는 중 클릭: 특수 능력 · Esc: 일시정지</p>
      </div>
    </div>

    <div id="select" class="overlay hidden">
      <div class="panel">
        <h2>스테이지 선택</h2>
        <div id="stage-grid"></div>
        <button id="btn-select-back" class="btn btn-sub">메인으로</button>
      </div>
    </div>

    <div id="pause-overlay" class="overlay hidden">
      <div class="panel">
        <h2>일시정지</h2>
        <button id="btn-resume" class="btn">계속하기</button>
        <button id="btn-restart" class="btn">다시하기</button>
        <button id="btn-pause-menu" class="btn">메인으로</button>
      </div>
    </div>

    <div id="clear" class="overlay hidden">
      <div class="panel">
        <h2 id="clear-title"></h2>
        <div id="clear-stars" class="stars"></div>
        <p id="clear-score"></p>
        <p id="clear-bonus"></p>
        <p id="clear-best"></p>
        <button id="btn-next" class="btn">다음 스테이지</button>
        <button id="btn-clear-retry" class="btn">다시하기</button>
        <button id="btn-clear-menu" class="btn">메인으로</button>
      </div>
    </div>

    <div id="fail" class="overlay hidden">
      <div class="panel">
        <h2>실패!</h2>
        <p id="fail-text"></p>
        <button id="btn-fail-retry" class="btn">다시하기</button>
        <button id="btn-fail-menu" class="btn">메인으로</button>
      </div>
    </div>

    <div id="error" class="overlay hidden"></div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js"></script>
  <script src="js/config.js"></script>
  <script src="js/levels.js"></script>
  <script src="js/audio.js"></script>
  <script src="js/render.js"></script>
  <script src="js/physics.js"></script>
  <script src="js/input.js"></script>
  <script src="js/game.js"></script>
</body>
</html>
```

### 4.2.2 style.css — 아래 필수 규칙 8개는 그대로 복사하고, 나머지는 설명대로 작성
```css
.hidden { display: none !important; }
html, body { margin: 0; height: 100%; overflow: hidden; background: #1b1b1b; }
#game { position: absolute; left: 50%; top: 50%; width: 1280px; height: 720px;
        transform: translate(-50%, -50%); transform-origin: 50% 50%; }
#canvas { display: block; width: 100%; height: 100%; touch-action: none; }
#hud { position: absolute; inset: 0; pointer-events: none; z-index: 10; }
#btn-pause { position: absolute; top: 16px; right: 16px; width: 56px; height: 56px;
             pointer-events: auto; cursor: pointer; }
.overlay { position: absolute; inset: 0; z-index: 20; display: flex;
           align-items: center; justify-content: center; }
#error { z-index: 30; }
```
나머지 스타일(값은 [c] 임의값):
- `.overlay` 배경 `rgba(0,0,0,0.45)`, `#menu`만 `rgba(0,0,0,0.25)`. 글꼴 `system-ui, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif`.
- `.panel`: 배경 `#fff8e7`, 글자 `#3b2a1a`, 모서리 16px, 안쪽 여백 32px 48px, 가운데 정렬, 세로 배치(`display:flex; flex-direction:column; align-items:center; gap:12px`).
- `.btn`: 글자 24px, 여백 12px 32px, 최소 폭 240px, 모서리 12px, 테두리 없음, 배경 `#e8553e`, 글자 흰색, `cursor:pointer`. `.btn-sub`는 배경 `#8a6d4b`. hover 시 밝게.
- `#hud-info`: 절대 위치 top 16px left 20px, 흰 글자 22px, 굵게, `text-shadow: 0 2px 3px rgba(0,0,0,0.6)`, 항목 사이 간격 24px.
- `#hud-tip`: 절대 위치 bottom 16px, 가운데(`left:50%; transform:translateX(-50%)`), 흰 글자 18px, 반투명 검정 배경, 모서리 8px.
- `#btn-pause`: 배경 `rgba(0,0,0,0.45)`, 테두리 없음, 모서리 12px. `.bar`: `display:inline-block; width:6px; height:22px; background:#fff; margin:0 3px; border-radius:2px`.
- `#stage-grid`: `display:grid; grid-template-columns: repeat(5, 120px); gap:16px`. `.stage-btn`: 높이 100px, 글자 28px, 세로로 번호와 별 줄. `.stage-btn.locked`: 배경 `#9a9a9a`, `cursor:not-allowed`.
- `.stars`: 글자 48px, 색 `#f2b705`.
- `#error`: 배경 `#1b1b1b`, 흰 글자 24px, 여백 40px, 가운데 정렬.

### 4.3 js/config.js — 그대로 복사 (이 파일은 이 블록이 전부다)
수치 태그: **[a]** 유도값(근거 한 줄) / **[b]** 초기값, 사람의 첫 플레이테스트(1~10 스테이지 각 1회 플레이)에서 사용자가 교체 / **[c]** 임의 선언값. 이 블록 밖의 수치(마찰·반발·색·효과음·도형 크기 비율)는 모두 [c]다.
```js
if (typeof Matter === 'undefined') {
  const errEl = document.getElementById('error');
  errEl.textContent = '물리 엔진(Matter.js)을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침하세요.';
  errEl.classList.remove('hidden');
  throw new Error('Matter.js failed to load');
}
const { Engine, Composite, Bodies, Body, Events } = Matter;

// ---- 화면 / 좌표 ----
const W = 1280;                 // [a] 16:9 논리 해상도
const H = 720;                  // [a] 16:9
const GROUND_Y = 660;           // [c] 지면 윗면 y
const SLING_X = 190;            // [c] 새총 고정점
const SLING_Y = 520;            // [c]
// ---- 새총 ----
const MAX_PULL = 100;           // [c] 최대 당김(px)
const MIN_PULL = 15;            // [c] 이보다 짧게 당기면 발사 취소
const GRAB_RADIUS = 60;         // [c] 새총 고정점에서 이 거리 안을 눌러야 잡힘
const MAX_LAUNCH_SPEED = 20;    // [a] 45도 사거리 v*v/g = 400/0.278 ≈ 1440px ≥ 가장 먼 돼지까지 ≈ 1045px
// ---- 시간 / 물리 ----
const STEP_MS = 1000 / 60;      // [a] Matter 기본 스텝, 고정 간격으로만 호출
const GRAVITY_PER_STEP = 0.001 * STEP_MS * STEP_MS; // [a] Matter 중력 1 × scale 0.001 × dt² ≈ 0.278 px/step²
const POSITION_ITERATIONS = 10; // [b] 탑이 저절로 무너지면 20
const VELOCITY_ITERATIONS = 8;  // [b] 같은 조건에서 12
// ---- 피해 ----
const DAMAGE_MIN_SPEED = 2;     // [b] 이 상대속도(px/step) 이하 충돌은 피해 없음
const DAMAGE_K = 4;             // [b] 피해 = (상대속도 - 최소) × 환산질량 × K  (§5.6 계산표)
const HIT_FRICTION_AIR = 0.02;  // [c] 새가 처음 부딪힌 뒤 공기저항(굴러다니는 시간 단축)
// ---- 턴 ----
const SETTLE_SPEED = 0.2;       // [c] 이보다 느리면 정지로 봄
const SETTLE_ANGULAR = 0.02;    // [c]
const SETTLE_STEPS = 45;        // [c] 0.75초 연속 정지하면 턴 종료
const MIN_TURN_MS = 1500;       // [c] 발사 후 최소 이만큼은 턴 유지
const MAX_TURN_MS = 10000;      // [c] 이만큼 지나면 강제 턴 종료
const CLEAR_DELAY_MS = 1500;    // [c] 마지막 돼지 제거 후 클리어 화면까지
// ---- 새 능력 ----
const YELLOW_BOOST_SPEED = 22;  // [a] 관통 한계 = 가장 얇은 블록 20px + 새 지름 34px = 54 px/step, 22 < 54
const BOMB_FUSE_MS = 1500;      // [c] 검정 새 첫 충돌 후 자동 폭발까지
const EXPLOSION_RADIUS = 150;   // [c]
const EXPLOSION_DAMAGE = 220;   // [a] 중심 근처의 돌(hp 200)을 깰 수 있는 값
const EXPLOSION_PUSH = 12;      // [c] 폭발이 더하는 속도(px/step, 거리 비례 감쇠)
// ---- 점수 ----
const BIRD_BONUS = 10000;       // [c] 클리어 시 남은 새 1마리당
const STAR2_RATIO = 0.5;        // [b] 점수 / 최대 가능 점수
const STAR3_RATIO = 0.75;       // [b]
// ---- 기타 ----
const TRAIL_MAX = 80;           // [c]
const PARTICLE_MAX = 400;       // [c]
const STORAGE_KEY = 'angry-birds-progress-v1';

const MATERIALS = {
  glass: { density: 0.0006, hp: 20,  score: 300, color: '#bfe9f5', stroke: '#6fb6c9' }, // hp [b]
  wood:  { density: 0.001,  hp: 75,  score: 500, color: '#c68a4a', stroke: '#8a5a2b' }, // hp [b]
  stone: { density: 0.0025, hp: 200, score: 800, color: '#9aa0a8', stroke: '#5f646b' }  // hp [b]
};
const SHAPES = {
  post:  { w: 20,  h: 100 },
  beam:  { w: 160, h: 20 },
  plank: { w: 100, h: 20 },
  box:   { w: 40,  h: 40 }
};
const PIGS = {
  pig:     { r: 18, hp: 25,  score: 5000 },   // hp [b]
  bigPig:  { r: 26, hp: 60,  score: 5000 },   // hp [b]
  kingPig: { r: 34, hp: 120, score: 10000 }   // hp [b]
};
const BIRDS = {
  red:    { r: 18, density: 0.004, color: '#d93a2b', stroke: '#8f1d12' },
  yellow: { r: 17, density: 0.004, color: '#f2c230', stroke: '#a67f0d' },
  black:  { r: 22, density: 0.004, color: '#2b2b2b', stroke: '#000000' }
};
const BIRD_TIPS = {
  red: '',
  yellow: '노랑 새: 날아가는 중 클릭하면 가속합니다',
  black: '검정 새: 날아가는 중 클릭하면 폭발합니다 (부딪히고 1.5초 뒤 자동 폭발)'
};

const G = {
  screen: 'menu',        // 'menu' | 'select' | 'playing' | 'paused' | 'clear' | 'fail'
  phase: 'aiming',       // 플레이 중 단계: 'aiming' | 'flying' | 'clearing' | 'ended'
  levelIndex: 0,         // 0..9
  canvas: null,          // boot()가 설정
  ctx: null,             // boot()가 설정
  engine: null,          // initPhysics()가 한 번만 생성, 이후 절대 다시 만들지 않음
  time: 0,               // 게임 시간(ms). stepGame()에서만 증가 → 일시정지 중 멈춤
  accumulator: 0,
  lastFrame: 0,
  birdQueue: [],         // 새총에 올라가기를 기다리는 새 종류들
  birdType: null,        // 지금 새총 위 또는 비행 중인 새 종류
  bird: null,            // 발사된 새의 Matter 몸체, 없으면 null
  aim: { x: SLING_X, y: SLING_Y },
  dragging: false,
  launchTime: 0,
  settleCount: 0,
  abilityUsed: false,
  birdHitAt: -1,         // 비행 중인 새의 첫 충돌 시각(G.time), -1 = 아직 없음
  damageEnabled: false,  // 첫 발사 전에는 false → 로드 직후 흔들림으로 죽지 않음
  pigsLeft: 0,
  score: 0,
  clearAt: 0,
  toRemove: [],
  particles: [],
  popups: [],
  trail: [],
  shake: 0,
  progress: null         // boot()에서 loadProgress() 결과
};
```

### 4.4 심볼 표 — 파일별 공개 이름과 정확한 시그니처
이 표에 없는 최상위 이름은 만들지 않는다. 표의 함수는 모두 정확히 한 번, 적힌 파일에 정의한다.

| 파일 | 이름 / 시그니처 | 하는 일 (자세한 순서는 §5) | 부르는 곳 |
|---|---|---|---|
| config.js | 위 블록의 const 전부, `G` | 상수와 전역 상태 | 전체 |
| levels.js | `const LEVELS` | 10개 스테이지 데이터 | physics.js, game.js |
| audio.js | `const AUDIO = { ctx: null, master: null, muted: false, last: {} };` | 오디오 내부 상태 | audio.js 안에서만 |
| audio.js | `function soundInit()` | AudioContext를 처음 한 번 만들고, suspended면 resume | boot가 document pointerdown/keydown에 연결 |
| audio.js | `function setMuted(muted)` | `AUDIO.muted = muted` | boot, 사운드 버튼 |
| audio.js | `function playSound(name)` | §5.11 표의 소리 재생 | §5.11 훅 표 |
| audio.js | `function _tone(type, f0, f1, dur, gain, delay)` | 오실레이터 한 음 | playSound |
| audio.js | `function _noise(dur, gain, highpassHz, delay)` | 잡음 한 번 | playSound |
| render.js | `function render()` | 한 프레임 전체 그리기 | frame |
| render.js | `function drawBackground(ctx)` | 하늘·구름·언덕·지면 | render |
| render.js | `function drawSlingshot(ctx, layer)` | layer `'back'`: 뒤 가지+뒤 고무줄, `'front'`: 앞 고무줄+앞 가지 | render |
| render.js | `function drawBody(ctx, body)` | `body.ab.kind`로 분기해서 그림 | render |
| render.js | `function drawBlock(ctx, body)` | 재질 사각형 + 금 | drawBody |
| render.js | `function drawPig(ctx, body)` | 돼지 | drawBody |
| render.js | `function drawBird(ctx, type, x, y, r, angle)` | 새 (몸체·새총 위·대기열 공용) | drawBody, render, drawQueue |
| render.js | `function drawQueue(ctx)` | 새총 뒤 지면 위 대기 새들 | render |
| render.js | `function drawTrajectory(ctx)` | 조준 중 예측 점선 | render |
| render.js | `function drawEffects(ctx)` | 잔상 점, 입자, 팝업, 1스테이지 안내문 | render |
| render.js | `function spawnParticles(x, y, color, count)` | 입자 추가 | processRemovals, explodeBird, endTurn, activateAbility |
| render.js | `function spawnPopup(x, y, text)` | 점수 팝업 추가 | processRemovals |
| render.js | `function updateEffects()` | 입자·팝업·흔들림 한 스텝 진행 | stepGame |
| physics.js | `function initPhysics()` | 엔진 생성(한 번), 충돌 이벤트 등록 | boot |
| physics.js | `function clearWorld()` | 월드 비우기 | loadLevel, goMenu |
| physics.js | `function loadLevel(index)` | 스테이지 구성 + 플레이 상태 초기화 | startStage |
| physics.js | `function makeItem(item)` | 데이터 한 줄 → Matter 몸체 (반환) | loadLevel |
| physics.js | `function launchBird()` | 새 몸체 생성·발사 | onPointerUp |
| physics.js | `function onCollisionStart(event)` | 첫 충돌 기록, 피해 계산 | Matter 이벤트 |
| physics.js | `function applyDamage(body, amount)` | HP 감소, 0 이하면 제거 대기열 | onCollisionStart, killOutOfBounds, explodeBird |
| physics.js | `function processRemovals()` | 제거 대기열 처리, 점수, 클리어 진입 | stepGame |
| physics.js | `function killOutOfBounds()` | 화면 밖 물체 처리 | stepGame |
| physics.js | `function isWorldSettled()` | 모든 움직이는 몸체가 멈췄는지 (boolean 반환) | updateFlight |
| physics.js | `function activateAbility()` | 노랑 가속 / 검정 폭발 | onPointerDown |
| physics.js | `function explodeBird()` | 폭발 | activateAbility, updateFlight |
| input.js | `function initInput(canvas)` | 리스너 등록 | boot |
| input.js | `function toCanvasXY(e)` | 화면 좌표 → 캔버스 좌표 `{x, y}` 반환 | 포인터 핸들러 |
| input.js | `function updateAim(p)` | 당김 위치 제한 후 `G.aim` 설정 | onPointerDown, onPointerMove |
| input.js | `function onPointerDown(e)` / `onPointerMove(e)` / `onPointerUp(e)` / `onPointerCancel(e)` | 드래그·발사·능력 | 캔버스 이벤트 |
| input.js | `function onKeyDown(e)` | Esc 일시정지 토글 | window keydown |
| game.js | `function boot()` | 초기화 전체 | game.js 마지막 줄 |
| game.js | `function frame(now)` | rAF 루프, 고정 스텝 | requestAnimationFrame |
| game.js | `function stepGame()` | 한 물리 스텝 + 규칙 | frame |
| game.js | `function updateFlight()` | 비행 중 턴 판정 | stepGame |
| game.js | `function endTurn()` | 턴 종료 → 다음 새 또는 실패 | updateFlight |
| game.js | `function enterClearing()` | 클리어 대기 진입 | processRemovals |
| game.js | `function showClear()` / `function showFail()` | 결과 화면 | stepGame / endTurn |
| game.js | `function computeStars(index, score)` | 별 1~3 반환 | showClear |
| game.js | `function setScreen(name)` | 화면 전환(§6 표) | 전체 |
| game.js | `function startStage(index)` / `restartStage()` / `goMenu()` | 스테이지 시작/재시작/메인 | 버튼 |
| game.js | `function pauseGame()` / `resumeGame()` | 일시정지/재개 | 버튼, Esc, 탭 숨김 |
| game.js | `function updateHud()` / `updateMenu()` / `renderStageSelect()` | DOM 갱신 | 여러 곳 |
| game.js | `function loadProgress()` / `saveProgress()` / `resize()` | 저장 읽기(객체 반환)/쓰기, 화면 맞춤 | boot, showClear, 사운드 버튼 |

### 4.5 허용 Matter API (이것 외에는 쓰지 않는다)
- `Engine.create()`, `Engine.update(G.engine, STEP_MS)`, `Engine.clear(G.engine)`
- `G.engine.gravity.y = 1`, `G.engine.positionIterations`, `G.engine.velocityIterations`
- `Composite.add(G.engine.world, body)`, `Composite.remove(G.engine.world, body)`, `Composite.clear(G.engine.world, false)`, `Composite.allBodies(G.engine.world)`
- `Bodies.rectangle(x, y, w, h, options)`, `Bodies.circle(x, y, r, options)` — x, y는 **중심** 좌표
- `Body.setVelocity(body, { x, y })` — 단위는 px/스텝
- `Events.on(G.engine, 'collisionStart', onCollisionStart)` — `event.pairs[i].bodyA`, `.bodyB`
- 읽는 속성: `position`, `velocity`, `angle`, `speed`, `angularSpeed`, `mass`, `isStatic`. 쓰는 속성: `frictionAir`, 그리고 직접 붙이는 `body.ab`.
- 금지: `Matter.Render`, `Matter.Runner`, `World.add`, `engine.world.gravity`, `Engine.run`, `enableSleeping`, `Body.setStatic`.

---

## 5. 규칙과 함수별 동작

### 5.1 좌표와 몸체 데이터
- 캔버스 논리 크기 1280×720 고정. 화면 크기에는 `resize()`가 `#game`의 CSS transform만 바꾼다: `s = Math.min(innerWidth / W, innerHeight / H)`, `#game.style.transform = 'translate(-50%, -50%) scale(' + s + ')'`.
- `toCanvasXY(e)`: `const rect = G.canvas.getBoundingClientRect(); return { x: (e.clientX - rect.left) * W / rect.width, y: (e.clientY - rect.top) * H / rect.height };`
- 모든 몸체에 `body.ab`를 붙인다:
  - 블록: `{ kind: 'block', t, m, w, h, hp, maxHp, score, dead: false }`
  - 돼지: `{ kind: 'pig', t, r, hp, maxHp, score, dead: false }`
  - 새: `{ kind: 'bird', type }`
  - 지면: `{ kind: 'ground' }`, 고정 언덕: `{ kind: 'static', w, h }`

### 5.2 initPhysics()
1. `G.engine = Engine.create();`
2. `G.engine.gravity.y = 1; G.engine.positionIterations = POSITION_ITERATIONS; G.engine.velocityIterations = VELOCITY_ITERATIONS;`
3. `Events.on(G.engine, 'collisionStart', onCollisionStart);` — **여기서 한 번만** 등록한다. 엔진은 다시 만들지 않는다(스테이지 전환은 clearWorld로).

### 5.3 clearWorld() / makeItem(item) / loadLevel(index)
`clearWorld()`: `Composite.clear(G.engine.world, false); Engine.clear(G.engine);`

`makeItem(item)` — 데이터의 `y`는 **물체의 바닥 y**다:
- `SHAPES[item.t]`가 있으면(블록): `s = SHAPES[item.t]; mat = MATERIALS[item.m];` 몸체 `Bodies.rectangle(item.x, item.y - s.h / 2, s.w, s.h, { density: mat.density, friction: 0.8, frictionStatic: 1, restitution: 0.05, label: 'block' })`, `ab = { kind: 'block', t: item.t, m: item.m, w: s.w, h: s.h, hp: mat.hp, maxHp: mat.hp, score: mat.score, dead: false }`.
- `PIGS[item.t]`가 있으면(돼지): `p = PIGS[item.t];` 몸체 `Bodies.circle(item.x, item.y - p.r, p.r, { density: 0.001, friction: 0.6, frictionStatic: 0.8, restitution: 0.2, label: 'pig' })`, `ab = { kind: 'pig', t: item.t, r: p.r, hp: p.hp, maxHp: p.hp, score: p.score, dead: false }`.
- `item.t === 'ledge'`면: `Bodies.rectangle(item.x, item.y - item.h / 2, item.w, item.h, { isStatic: true, friction: 0.9, label: 'ledge' })`, `ab = { kind: 'static', w: item.w, h: item.h }`.
- 몸체를 반환한다.

`loadLevel(index)`:
1. `const lv = LEVELS[index]; clearWorld();`
2. 지면: `Bodies.rectangle(W / 2, GROUND_Y + 40, 3000, 80, { isStatic: true, friction: 0.9, label: 'ground' })`, `ab = { kind: 'ground' }`, 월드에 추가.
3. `G.pigsLeft = 0;` `lv.items` 각각 `makeItem` → 월드에 추가, `ab.kind === 'pig'`면 `G.pigsLeft += 1`.
4. 상태 초기화(빠짐없이): `G.levelIndex = index; G.birdQueue = lv.birds.slice(); G.birdType = G.birdQueue.shift(); G.phase = 'aiming'; G.bird = null; G.aim = { x: SLING_X, y: SLING_Y }; G.dragging = false; G.time = 0; G.accumulator = 0; G.launchTime = 0; G.settleCount = 0; G.abilityUsed = false; G.birdHitAt = -1; G.damageEnabled = false; G.score = 0; G.clearAt = 0; G.toRemove = []; G.particles = []; G.popups = []; G.trail = []; G.shake = 0;`

### 5.4 입력 (input.js)
`initInput(canvas)`: canvas에 `pointerdown`→onPointerDown, `pointermove`→onPointerMove, `pointerup`→onPointerUp, `pointercancel`→onPointerCancel. `window`에 `keydown`→onKeyDown.

`updateAim(p)`: `dx = p.x - SLING_X; dy = p.y - SLING_Y; len = Math.hypot(dx, dy);` `len > MAX_PULL`이면 `dx, dy`에 `MAX_PULL / len`을 곱한다. `G.aim = { x: SLING_X + dx, y: Math.min(SLING_Y + dy, GROUND_Y - BIRDS[G.birdType].r - 2) }`.

`onPointerDown(e)`:
1. `G.screen !== 'playing'`이면 끝.
2. `p = toCanvasXY(e)`.
3. `G.phase === 'aiming'`이고 `Math.hypot(p.x - SLING_X, p.y - SLING_Y) <= GRAB_RADIUS`이면: `G.dragging = true; G.canvas.setPointerCapture(e.pointerId); updateAim(p); playSound('stretch');`
4. 그렇지 않고 `G.phase === 'flying'`이면 `activateAbility()` (S8에서 추가).
5. `e.preventDefault()`.

`onPointerMove(e)`: `G.dragging`이면 `updateAim(toCanvasXY(e))`.

`onPointerUp(e)`: `G.dragging`이 아니면 끝. `G.dragging = false;` 당김 길이 `Math.hypot(G.aim.x - SLING_X, G.aim.y - SLING_Y)`가 `MIN_PULL` 이상이고 `G.screen === 'playing' && G.phase === 'aiming'`이면 `launchBird()`, 아니면 `G.aim = { x: SLING_X, y: SLING_Y }`.

`onPointerCancel(e)`: `G.dragging = false; G.aim = { x: SLING_X, y: SLING_Y };`

`onKeyDown(e)`: `e.key === 'Escape'`일 때 `G.screen === 'playing'`이면 `pauseGame()`, `G.screen === 'paused'`이면 `resumeGame()`.

### 5.5 launchBird()
1. `const def = BIRDS[G.birdType]; const dx = SLING_X - G.aim.x; const dy = SLING_Y - G.aim.y;`
2. `const body = Bodies.circle(G.aim.x, G.aim.y, def.r, { density: def.density, friction: 0.5, restitution: 0.3, frictionAir: 0, label: 'bird' }); body.ab = { kind: 'bird', type: G.birdType };`
3. `Composite.add(G.engine.world, body);`
4. `Body.setVelocity(body, { x: dx / MAX_PULL * MAX_LAUNCH_SPEED, y: dy / MAX_PULL * MAX_LAUNCH_SPEED });`
5. `G.bird = body; G.phase = 'flying'; G.launchTime = G.time; G.settleCount = 0; G.birdHitAt = -1; G.abilityUsed = false; G.damageEnabled = true; G.trail = [];`
6. `playSound('launch'); updateHud();`

### 5.6 충돌 피해: onCollisionStart(event), applyDamage(body, amount)
`onCollisionStart(event)` — `event.pairs` 각각에 대해:
1. `a = pair.bodyA; b = pair.bodyB;`
2. `G.bird`가 있고 `a === G.bird || b === G.bird`이며 `G.birdHitAt < 0`이면: `G.birdHitAt = G.time; G.bird.frictionAir = HIT_FRICTION_AIR;`
3. `G.damageEnabled`가 false면 다음 쌍으로.
4. `rel = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);` `rel <= DAMAGE_MIN_SPEED`면 다음 쌍으로.
5. 환산질량: `m = a.isStatic ? b.mass : (b.isStatic ? a.mass : a.mass * b.mass / (a.mass + b.mass));`
6. `dmg = (rel - DAMAGE_MIN_SPEED) * m * DAMAGE_K; applyDamage(a, dmg); applyDamage(b, dmg);`
7. `dmg >= 5`이면 `playSound('hit')`.
- **이 함수 안에서는 절대 `Composite.remove`를 호출하지 않는다.** 제거는 processRemovals가 Engine.update 뒤에 한다.

`applyDamage(body, amount)`: `ab = body.ab;` `!ab || ab.hp === undefined || ab.dead`면 끝(새·지면·언덕은 hp가 없어 자동 무시). `ab.hp -= amount;` `ab.hp <= 0`이면 `ab.dead = true; G.toRemove.push(body);`

HP 초기값의 근거(빨강 새, 질량 ≈ 4.07, 충돌 속도 15 px/step 가정 — 이 속도 자체가 미측정이라 [b]):

| 대상 (질량) | 직격 피해 | hp | 결과 |
|---|---|---|---|
| 돼지 (1.02) | 42 | 25 | 한 번에 처치 |
| 큰 돼지 (2.12) | 72 | 60 | 한 번에 처치 |
| 왕 돼지 (3.63) | 100 | 120 | 두 번 또는 폭탄 |
| 유리 기둥 (1.2) | 48 | 20 | 깨지고 새는 계속 진행 |
| 나무 기둥 (2.0) | 70 | 75 | 간신히 버팀, 더 세게 당기면 깨짐 |
| 돌 기둥 (5.0) | 117 | 200 | 폭탄 필요 |
| 돼지가 200px 낙하 | 35 | 25 | 처치 (탑 붕괴로 돼지가 죽는 앵그리버드식 경험) |
| 돼지가 100px 낙하 | 22 | 25 | 생존 |

### 5.7 processRemovals() / killOutOfBounds() / isWorldSettled()
`processRemovals()`:
1. `G.toRemove.length === 0`이면 끝.
2. 각 몸체: `Composite.remove(G.engine.world, body); G.score += body.ab.score; spawnPopup(body.position.x, body.position.y - 20, '+' + body.ab.score);`
   - 돼지면: `G.pigsLeft -= 1; spawnParticles(x, y, '#7ed957', 16); playSound('pig');`
   - 블록이면: `spawnParticles(x, y, MATERIALS[body.ab.m].color, 12); playSound(body.ab.m);` (이름이 곧 'glass' | 'wood' | 'stone')
3. `G.toRemove = []; updateHud();`
4. `G.pigsLeft <= 0 && (G.phase === 'aiming' || G.phase === 'flying')`이면 `enterClearing()`.

`killOutOfBounds()`: `Composite.allBodies(G.engine.world)` 각각, 위치가 `x < -100 || x > W + 100 || y > H + 100`일 때: `ab.kind`가 'block'이나 'pig'면 `applyDamage(body, 99999)`; 그 몸체가 `G.bird`면 `Composite.remove(G.engine.world, body); G.bird = null;`

`isWorldSettled()`: 모든 몸체 중 `isStatic`이 아닌 것에 대해 `body.speed > SETTLE_SPEED || body.angularSpeed > SETTLE_ANGULAR`인 것이 하나라도 있으면 false, 없으면 true.

### 5.8 게임 루프와 턴 (game.js)
`frame(now)`:
1. **첫 줄에서** `requestAnimationFrame(frame);` (아래에서 오류가 나도 루프가 멈추지 않게)
2. `const dt = Math.min(now - G.lastFrame, 100); G.lastFrame = now;`
3. `G.screen === 'playing'`이면: `G.accumulator += dt; let n = 0; while (G.screen === 'playing' && G.accumulator >= STEP_MS && n < 4) { stepGame(); G.accumulator -= STEP_MS; n++; } if (n === 4) G.accumulator = 0;`
4. `render();`

`stepGame()`:
1. `G.time += STEP_MS;`
2. `Engine.update(G.engine, STEP_MS);`
3. `killOutOfBounds(); processRemovals(); updateEffects();`
4. `G.phase === 'flying'`이면 `updateFlight();`
5. `G.phase === 'clearing' && G.time >= G.clearAt`이면 `showClear();`

`updateFlight()`:
1. `G.bird`가 있으면: `Math.round(G.time / STEP_MS) % 3 === 0`일 때 `G.trail.push({ x: G.bird.position.x, y: G.bird.position.y })`, 길이가 `TRAIL_MAX`를 넘으면 앞에서 제거. (S8) 검정 새 자동 폭발: `G.birdType === 'black' && !G.abilityUsed && G.birdHitAt >= 0 && G.time - G.birdHitAt >= BOMB_FUSE_MS`이면 `explodeBird()`.
2. `const elapsed = G.time - G.launchTime;`
3. `elapsed >= MIN_TURN_MS && isWorldSettled()`이면 `G.settleCount += 1`, 아니면 `G.settleCount = 0`.
4. `G.settleCount >= SETTLE_STEPS || elapsed >= MAX_TURN_MS`이면 `endTurn()`.

`endTurn()`:
1. `G.bird`가 있으면 `spawnParticles(G.bird.position.x, G.bird.position.y, '#ffffff', 10); Composite.remove(G.engine.world, G.bird); G.bird = null;`
2. `G.phase !== 'flying'`이면 끝.
3. `G.birdQueue.length === 0`이면 `showFail();` 하고 끝.
4. `G.birdType = G.birdQueue.shift(); G.phase = 'aiming'; G.aim = { x: SLING_X, y: SLING_Y }; G.abilityUsed = false; G.birdHitAt = -1; G.settleCount = 0; updateHud();`

`enterClearing()`: `G.phase === 'aiming'`이면(새총 위의 새를 안 썼으므로) `G.birdQueue.unshift(G.birdType); G.dragging = false;` 그다음 `G.phase = 'clearing'; G.clearAt = G.time + CLEAR_DELAY_MS;`

### 5.9 점수, 별, 결과 화면, 저장
- 점수: 블록 파괴 시 재질 점수(유리 300/나무 500/돌 800), 돼지 5000(왕 돼지 10000), 클리어 시 남은 새 × `BIRD_BONUS`.
- `computeStars(index, score)`: `max` = 해당 스테이지 items 중 블록 점수 합 + 돼지 점수 합(ledge 제외) + `(LEVELS[index].birds.length - 1) * BIRD_BONUS`. `r = score / max`. `r >= STAR3_RATIO`면 3, `r >= STAR2_RATIO`면 2, 아니면 1. (클리어했으면 최소 1개)

`showClear()`:
1. `G.phase === 'ended'`이면 끝(중복 방지). `G.phase = 'ended';`
2. `const bonus = G.birdQueue.length * BIRD_BONUS; G.score += bonus; const stars = computeStars(G.levelIndex, G.score);`
3. `const best = G.progress.best[G.levelIndex]; const isNewBest = G.score > best.score; best.score = Math.max(best.score, G.score); best.stars = Math.max(best.stars, stars); G.progress.unlocked = Math.max(G.progress.unlocked, Math.min(G.levelIndex + 2, LEVELS.length)); saveProgress();`
4. DOM: `#clear-title` = 마지막 스테이지면 `'모든 스테이지 클리어!'`, 아니면 `'스테이지 ' + (G.levelIndex + 1) + ' 클리어!'`. `#clear-stars` = `'★'.repeat(stars) + '☆'.repeat(3 - stars)`. `#clear-score` = `'점수 ' + G.score.toLocaleString()`. `#clear-bonus` = `'남은 새 보너스 +' + bonus.toLocaleString()`. `#clear-best` = isNewBest면 `'최고 기록 갱신!'`, 아니면 `'최고 기록 ' + best.score.toLocaleString()`. 마지막 스테이지면 `#btn-next`에 `hidden` 추가, 아니면 제거.
5. `updateHud(); playSound('clear'); setScreen('clear');`

`showFail()`: `G.phase = 'ended'; #fail-text = '돼지 ' + G.pigsLeft + '마리가 남았습니다'; playSound('fail'); setScreen('fail');`

`loadProgress()`: `try { const d = JSON.parse(localStorage.getItem(STORAGE_KEY)); d.unlocked이 1~10 숫자이고 d.best가 길이 10 배열이면 d.muted를 !!d.muted로 맞춰 반환 } catch (e) {}` 실패하면 기본값 `{ unlocked: 1, best: Array.from({ length: 10 }, () => ({ score: 0, stars: 0 })), muted: false }` 반환.
`saveProgress()`: `try { localStorage.setItem(STORAGE_KEY, JSON.stringify(G.progress)); } catch (e) {}` (시크릿 모드나 file:// 제한에서도 게임이 죽지 않게)

### 5.10 새 능력 (S8)
`activateAbility()`: `G.bird`가 없거나 `G.abilityUsed`면 끝.
- 노랑: `G.birdType === 'yellow' && G.birdHitAt < 0`일 때 `s = G.bird.speed || 1; Body.setVelocity(G.bird, { x: G.bird.velocity.x / s * YELLOW_BOOST_SPEED, y: G.bird.velocity.y / s * YELLOW_BOOST_SPEED }); G.abilityUsed = true; spawnParticles(x, y, '#f2c230', 10); playSound('launch');`
- 검정: `G.birdType === 'black'`이면 `explodeBird()`.
- 빨강: 아무것도 안 함.

`explodeBird()`:
1. `G.abilityUsed = true; const cx = G.bird.position.x, cy = G.bird.position.y;`
2. 모든 몸체 중 `ab.kind`가 'block'이나 'pig'이고 `!ab.dead`인 것: `dx = body.position.x - cx; dy = body.position.y - cy; d = Math.hypot(dx, dy);` `d < EXPLOSION_RADIUS`면 `f = 1 - d / EXPLOSION_RADIUS; applyDamage(body, EXPLOSION_DAMAGE * f);` 그리고 `d > 0.001`이면 `Body.setVelocity(body, { x: body.velocity.x + dx / d * EXPLOSION_PUSH * f, y: body.velocity.y + dy / d * EXPLOSION_PUSH * f });`
3. `Composite.remove(G.engine.world, G.bird); G.bird = null; spawnParticles(cx, cy, '#ff8a00', 30); spawnParticles(cx, cy, '#444444', 20); G.shake = 12; playSound('explode');`

### 5.11 효과음 표와 호출 위치
`_tone(type, f0, f1, dur, gain, delay)`: `t = AUDIO.ctx.currentTime + (delay || 0)`; 오실레이터 `type`, 주파수 `setValueAtTime(f0, t)` → `exponentialRampToValueAtTime(f1, t + dur)`; 게인 `setValueAtTime(gain, t)` → `exponentialRampToValueAtTime(0.001, t + dur)`; 오실레이터 → 게인 → `AUDIO.master`; `start(t)`, `stop(t + dur)`.
`_noise(dur, gain, highpassHz, delay)`: 길이 `dur`초 버퍼에 `Math.random() * 2 - 1`을 채운 BufferSource → BiquadFilter(`highpass`, `highpassHz`) → 게인(위와 같은 감쇠) → `AUDIO.master`.
`soundInit()`: `AUDIO.ctx`가 없으면 `new (window.AudioContext || window.webkitAudioContext)()`로 만들고 `AUDIO.master` 게인(0.3)을 `destination`에 연결. `AUDIO.ctx.state === 'suspended'`면 `resume()`. 전체를 try/catch로 감싼다.
`playSound(name)`: `AUDIO.muted || !AUDIO.ctx`면 끝. 같은 이름을 60ms 안에 다시 부르면 무시(`AUDIO.last[name]`에 `performance.now()` 기록). 그다음 아래 표대로 재생.

| 이름 | 재생 ([c]) | 부르는 곳 |
|---|---|---|
| click | `_tone('square', 660, 660, 0.05, 0.15)` | 모든 버튼 핸들러 |
| stretch | `_tone('sawtooth', 180, 320, 0.18, 0.08)` | onPointerDown 잡기 성공 |
| launch | `_tone('triangle', 300, 900, 0.25, 0.25)` | launchBird, 노랑 가속 |
| hit | `_tone('sine', 140, 70, 0.1, 0.3)` | onCollisionStart (피해 ≥ 5) |
| glass | `_noise(0.18, 0.3, 3000)` + `_tone('triangle', 1800, 1200, 0.1, 0.1)` | processRemovals |
| wood | `_tone('square', 220, 90, 0.14, 0.18)` | processRemovals |
| stone | `_tone('sine', 110, 45, 0.25, 0.4)` | processRemovals |
| pig | `_tone('triangle', 600, 200, 0.22, 0.3)` | processRemovals |
| explode | `_noise(0.6, 0.5, 100)` + `_tone('sine', 80, 30, 0.5, 0.5)` | explodeBird |
| clear | `_tone('triangle', f, f, 0.18, 0.25, d)`: (523,0) (659,0.12) (784,0.24) (1047,0.36) | showClear |
| fail | `_tone('sawtooth', f, f, 0.25, 0.15, d)`: (392,0) (330,0.2) (262,0.4) | showFail |

### 5.12 그리기 (render.js)
`render()` 순서:
1. `ctx = G.ctx; ctx.save();` `G.shake > 0`이면 `ctx.translate((Math.random() - 0.5) * 2 * G.shake, (Math.random() - 0.5) * 2 * G.shake)`.
2. `drawBackground(ctx); drawSlingshot(ctx, 'back');`
3. `G.engine`이 있으면 `Composite.allBodies(G.engine.world)` 각각 `drawBody(ctx, body)`.
4. `drawQueue(ctx);`
5. `(G.screen === 'playing' || G.screen === 'paused') && G.phase === 'aiming' && G.birdType`이면 `drawBird(ctx, G.birdType, G.aim.x, G.aim.y, BIRDS[G.birdType].r, 0)`.
6. `drawSlingshot(ctx, 'front');` `G.dragging`이면 `drawTrajectory(ctx);`
7. `drawEffects(ctx); ctx.restore();`

세부:
- `drawBackground`: 하늘 세로 그라디언트 `#7ec8f0` → `#d6f0ff`; 흰 구름 3개(타원 3개씩, `performance.now() * 0.01`로 x가 천천히 흘러 `W + 200`에서 되돌아감); 언덕 타원 2개(`#8fd16a`, `#7cc255`); 지면 `GROUND_Y`~`H`를 `#7a5230`, 윗면 풀 띠 10px `#5fbf4a`.
- `drawSlingshot`: 색 `#6b3e1f`, 굵기 12. 줄기 `(SLING_X, GROUND_Y)`→`(SLING_X, SLING_Y + 40)`, 뒤 가지 끝 `(SLING_X - 14, SLING_Y - 10)`, 앞 가지 끝 `(SLING_X + 14, SLING_Y - 10)`. 고무줄 색 `#3b1f0e`, 굵기 5: 조준 중이면 가지 끝 → `G.aim`, 아니면 두 가지 끝을 잇는 직선. `'back'`은 줄기+뒤 가지+뒤 고무줄, `'front'`는 앞 고무줄+앞 가지.
- `drawBody`: `ground`는 그리지 않음(배경이 그림). `static`은 `#6d7178` 채움/`#4a4d52` 테두리 사각형(회전 적용). `block`은 drawBlock, `pig`는 drawPig, `bird`는 `drawBird(ctx, body.ab.type, x, y, BIRDS[type].r, body.angle)`.
- `drawBlock`: 위치로 translate, `body.angle`로 rotate, 재질 색 채움(유리는 `globalAlpha 0.75`), 테두리 색 굵기 2. `hp / maxHp < 0.6`이면 금 1줄, `< 0.3`이면 2줄 더(어두운 선, 사각형 안쪽 대각선).
- `drawPig`: translate/rotate. 귀 두 개(작은 원, 위쪽), 몸 원 `#7ed957` 테두리 `#3f8f2a` 굵기 3, 흰 눈 두 개 + 검은 눈동자, 주둥이 타원 `#a8ec8a`와 콧구멍 두 개. `hp / maxHp < 0.5`면 반투명 어두운 초록 원을 덧칠. `bigPig`는 눈썹 선 추가, `kingPig`는 머리 위 노란 왕관(다각형).
- `drawBird`: translate/rotate(angle). 몸 원(색/테두리는 BIRDS), 앞쪽(+x)에 흰 눈 두 개와 검은 눈동자, 눈 위에 사선 눈썹, 오른쪽에 주황 삼각형 부리. 검정 새는 머리 위 짧은 도화선과 주황 불꽃 점.
- `drawQueue`: `G.birdQueue[i]`를 `x = SLING_X - 45 - i * 38`, `y = GROUND_Y - r`에 `drawBird`.
- `drawTrajectory`: `vx = (SLING_X - G.aim.x) / MAX_PULL * MAX_LAUNCH_SPEED`, `vy`도 같은 방식, `x = G.aim.x, y = G.aim.y`. 36번 반복: `vy += GRAVITY_PER_STEP; x += vx; y += vy;` 3번째마다 흰 점(반지름 4에서 점점 작게, 투명도 점점 낮게). (Matter의 적분 순서와 같다: 속도에 중력을 더한 뒤 위치 이동.)
- `drawEffects`: `G.trail` 점(흰색 반지름 2.5, 투명도 0.7) → 입자(`fillRect`, 투명도 `life / maxLife`) → 팝업(굵은 24px 흰 글자, 검은 테두리, 투명도 `life / 60`) → `G.levelIndex === 0 && G.screen === 'playing' && !G.damageEnabled`이면 `(SLING_X + 20, SLING_Y - 90)`에 `'새를 뒤로 끌었다 놓으세요'`(굵은 22px).
- `spawnParticles(x, y, color, count)`: count개, 각각 임의 각도, 속력 1~5, `life`와 `maxLife` 30~50, 크기 3~7. `G.particles`가 `PARTICLE_MAX`를 넘으면 앞에서 제거.
- `spawnPopup(x, y, text)`: `G.popups.push({ x, y, text, life: 60 })`.
- `updateEffects()`: 입자 `x += vx; y += vy; vy += 0.15; life -= 1`, `life <= 0`이면 제거. 팝업 `y -= 0.8; life -= 1`, `life <= 0`이면 제거. `G.shake *= 0.85`, `0.3`보다 작으면 0.
- 입자·팝업·흔들림은 stepGame 안에서만 진행되므로 일시정지 중에는 같이 멈춘다.

---

## 6. 화면 상태 머신

| 현재 | 이벤트 | 다음 | 호출 |
|---|---|---|---|
| menu | `#btn-start` | playing | `startStage(Math.min(G.progress.unlocked, LEVELS.length) - 1)` |
| menu | `#btn-select` | select | `setScreen('select')` |
| menu | `#btn-sound` | menu | `G.progress.muted = !G.progress.muted; setMuted(G.progress.muted); saveProgress(); updateMenu();` |
| select | 해금된 스테이지 버튼 i | playing | `startStage(i)` |
| select | `#btn-select-back` | menu | `setScreen('menu'); updateMenu();` |
| playing | `#btn-pause` / Esc / 탭 숨김 | paused | `pauseGame()` |
| paused | `#btn-resume` / Esc | playing | `resumeGame()` |
| paused | `#btn-restart` | playing | `restartStage()` |
| paused | `#btn-pause-menu` | menu | `goMenu()` |
| playing | 돼지 0 + `CLEAR_DELAY_MS` | clear | `showClear()` |
| playing | 마지막 새 턴 종료 + 돼지 남음 | fail | `showFail()` |
| clear | `#btn-next` (10 스테이지면 숨김) | playing | `startStage(G.levelIndex + 1)` |
| clear | `#btn-clear-retry` / `#btn-clear-menu` | playing / menu | `restartStage()` / `goMenu()` |
| fail | `#btn-fail-retry` / `#btn-fail-menu` | playing / menu | `restartStage()` / `goMenu()` |

모든 버튼 핸들러는 `playSound('click')`을 먼저 부른다.

`setScreen(name)`: `G.screen = name;` 아래 표대로 각 요소의 `hidden` 클래스를 넣고 뺀다. `name === 'select'`면 `renderStageSelect()`를 부른다.

| screen | #menu | #select | #hud | #btn-pause | #pause-overlay | #clear | #fail |
|---|---|---|---|---|---|---|---|
| menu | 보임 | 숨김 | 숨김 | 숨김 | 숨김 | 숨김 | 숨김 |
| select | 숨김 | 보임 | 숨김 | 숨김 | 숨김 | 숨김 | 숨김 |
| playing | 숨김 | 숨김 | 보임 | 보임 | 숨김 | 숨김 | 숨김 |
| paused | 숨김 | 숨김 | 보임 | 보임 | 보임 | 숨김 | 숨김 |
| clear | 숨김 | 숨김 | 보임 | 숨김 | 숨김 | 보임 | 숨김 |
| fail | 숨김 | 숨김 | 보임 | 숨김 | 숨김 | 숨김 | 보임 |

- `startStage(index)`: `loadLevel(index); updateHud(); G.lastFrame = performance.now(); setScreen('playing');`
- `restartStage()`: `startStage(G.levelIndex);`
- `goMenu()`: `clearWorld(); G.bird = null; G.birdType = null; G.birdQueue = []; G.particles = []; G.popups = []; G.trail = []; G.dragging = false; setScreen('menu'); updateMenu();`
- `pauseGame()`: `G.screen !== 'playing'`면 끝. `G.dragging = false;` `G.phase === 'aiming'`이면 `G.aim = { x: SLING_X, y: SLING_Y };` `setScreen('paused');`
- `resumeGame()`: `G.screen !== 'paused'`면 끝. `G.accumulator = 0; G.lastFrame = performance.now(); setScreen('playing');`
- `updateHud()`: `#hud-stage` = `'스테이지 ' + (G.levelIndex + 1)`, `#hud-score` = `'점수 ' + G.score.toLocaleString()`, `#hud-pigs` = `'돼지 ' + G.pigsLeft`, `#hud-birds` = `'새 ' + (G.birdQueue.length + (G.phase === 'aiming' ? 1 : 0))`, `#hud-tip` = 조준 중이면 `BIRD_TIPS[G.birdType]`, 아니면 빈 문자열. 빈 문자열이면 `#hud-tip`에 `hidden`.
- `updateMenu()`: `#btn-start` = `'게임 시작 · 스테이지 ' + Math.min(G.progress.unlocked, LEVELS.length)`, `#btn-sound` = `G.progress.muted ? '사운드: 꺼짐' : '사운드: 켜짐'`.
- `renderStageSelect()`: `#stage-grid`를 비우고 i = 0..9마다 `<button class="stage-btn">`를 만든다. 텍스트는 번호 `i + 1`과 그 아래 줄에 별(`'★'.repeat(stars) + '☆'.repeat(3 - stars)`, 한 번도 안 깼으면 빈 줄). `i + 1 > G.progress.unlocked`면 `locked` 클래스, `disabled = true`, 별 대신 `'잠김'`. 해금된 버튼은 click → `playSound('click'); startStage(i);`

`boot()`:
1. `if (typeof Matter === 'undefined') return;`
2. `G.canvas = document.getElementById('canvas'); G.ctx = G.canvas.getContext('2d');`
3. `G.progress = loadProgress(); setMuted(G.progress.muted);`
4. `initPhysics(); initInput(G.canvas);`
5. §6 표의 모든 버튼 id에 click 핸들러를 연결한다.
6. `window.addEventListener('resize', resize); resize();`
7. `document.addEventListener('visibilitychange', () => { if (document.hidden && G.screen === 'playing') pauseGame(); });`
8. `document.addEventListener('pointerdown', soundInit); document.addEventListener('keydown', soundInit);`
9. `setScreen('menu'); updateMenu();`
10. `G.lastFrame = performance.now(); requestAnimationFrame(frame);`

game.js의 마지막 줄은 `boot();` 하나다.

---

## 7. 스테이지 콘텐츠 (10개)

배치 규칙: `y`는 바닥 y. 지면 윗면 660. 기둥(post) 높이 100, 들보(beam)/널(plank) 두께 20이므로 "기둥 y=b → 그 위 들보 y=b−100 → 들보 윗면 b−120 → 다음 층 기둥 y=b−120". 들보 160은 x±70 기둥 두 개, 널 100은 x±40 기둥 두 개에 정확히 걸친다. 아래 좌표는 이 규칙으로 계산했고 물체끼리 겹치지 않음을 확인했다(겹치면 로드 순간 튕겨 나간다). 좌표는 [c].

| # | 이름 | 돼지 | 새 | 새로 나오는 요소 |
|---|---|---|---|---|
| 1 | 첫 비행 | 1 | 빨강×3 | 기본 오두막, 조작 안내문 |
| 2 | 두 채의 오두막 | 2 | 빨강×3 | 유리 기둥, 안에 숨은 돼지 |
| 3 | 나무 벽 | 2 | 빨강, 노랑×2 | 노랑 새, 앞을 막는 벽 |
| 4 | 2층 탑 | 3 | 빨강, 노랑, 빨강 | 2층 구조 |
| 5 | 돌 기초 | 3 | 빨강×2, 노랑 | 돌 재질 |
| 6 | 폭탄 새 | 3 (큰 1) | 검정, 빨강, 노랑 | 검정 새, 돌 벙커, 큰 돼지 |
| 7 | 언덕 위 요새 | 4 | 빨강, 노랑, 검정 | 고정 언덕 |
| 8 | 쌍둥이 탑 | 5 (큰 1) | 빨강, 노랑, 검정, 빨강 | 탑 두 개 + 가운데 |
| 9 | 3층 탑 | 6 (큰 1) | 노랑, 검정, 빨강, 검정 | 3층 구조 |
| 10 | 왕의 성 | 6 (왕 1, 큰 1) | 빨강, 노랑, 검정×2, 노랑 | 왕 돼지, 성 뒤에 숨은 돼지 |

### js/levels.js — 그대로 복사 (이 파일은 이 블록이 전부다)
```js
const LEVELS = [
  { name: '첫 비행', birds: ['red', 'red', 'red'], items: [
    { t: 'post', m: 'wood', x: 830, y: 660 },
    { t: 'post', m: 'wood', x: 970, y: 660 },
    { t: 'beam', m: 'wood', x: 900, y: 560 },
    { t: 'box', m: 'glass', x: 845, y: 540 },
    { t: 'box', m: 'glass', x: 955, y: 540 },
    { t: 'pig', x: 900, y: 540 }
  ]},
  { name: '두 채의 오두막', birds: ['red', 'red', 'red'], items: [
    { t: 'post', m: 'glass', x: 750, y: 660 },
    { t: 'post', m: 'glass', x: 890, y: 660 },
    { t: 'beam', m: 'wood', x: 820, y: 560 },
    { t: 'pig', x: 820, y: 660 },
    { t: 'post', m: 'wood', x: 990, y: 660 },
    { t: 'post', m: 'wood', x: 1130, y: 660 },
    { t: 'beam', m: 'wood', x: 1060, y: 560 },
    { t: 'pig', x: 1060, y: 540 }
  ]},
  { name: '나무 벽', birds: ['red', 'yellow', 'yellow'], items: [
    { t: 'box', m: 'wood', x: 820, y: 660 },
    { t: 'box', m: 'wood', x: 820, y: 620 },
    { t: 'box', m: 'wood', x: 820, y: 580 },
    { t: 'box', m: 'glass', x: 820, y: 540 },
    { t: 'post', m: 'wood', x: 920, y: 660 },
    { t: 'post', m: 'wood', x: 1000, y: 660 },
    { t: 'plank', m: 'wood', x: 960, y: 560 },
    { t: 'pig', x: 960, y: 660 },
    { t: 'pig', x: 960, y: 540 },
    { t: 'post', m: 'glass', x: 1100, y: 660 },
    { t: 'post', m: 'glass', x: 1180, y: 660 },
    { t: 'plank', m: 'wood', x: 1140, y: 560 },
    { t: 'box', m: 'wood', x: 1140, y: 540 }
  ]},
  { name: '2층 탑', birds: ['red', 'yellow', 'red'], items: [
    { t: 'box', m: 'glass', x: 760, y: 660 },
    { t: 'box', m: 'glass', x: 760, y: 620 },
    { t: 'post', m: 'wood', x: 880, y: 660 },
    { t: 'post', m: 'wood', x: 1020, y: 660 },
    { t: 'beam', m: 'wood', x: 950, y: 560 },
    { t: 'pig', x: 950, y: 660 },
    { t: 'post', m: 'glass', x: 880, y: 540 },
    { t: 'post', m: 'glass', x: 1020, y: 540 },
    { t: 'beam', m: 'wood', x: 950, y: 440 },
    { t: 'pig', x: 950, y: 540 },
    { t: 'pig', x: 950, y: 420 }
  ]},
  { name: '돌 기초', birds: ['red', 'red', 'yellow'], items: [
    { t: 'post', m: 'stone', x: 830, y: 660 },
    { t: 'post', m: 'stone', x: 970, y: 660 },
    { t: 'beam', m: 'stone', x: 900, y: 560 },
    { t: 'pig', x: 900, y: 660 },
    { t: 'post', m: 'wood', x: 830, y: 540 },
    { t: 'post', m: 'wood', x: 970, y: 540 },
    { t: 'beam', m: 'wood', x: 900, y: 440 },
    { t: 'pig', x: 900, y: 540 },
    { t: 'box', m: 'glass', x: 850, y: 420 },
    { t: 'box', m: 'glass', x: 950, y: 420 },
    { t: 'post', m: 'wood', x: 1080, y: 660 },
    { t: 'post', m: 'wood', x: 1160, y: 660 },
    { t: 'plank', m: 'wood', x: 1120, y: 560 },
    { t: 'pig', x: 1120, y: 540 }
  ]},
  { name: '폭탄 새', birds: ['black', 'red', 'yellow'], items: [
    { t: 'post', m: 'stone', x: 880, y: 660 },
    { t: 'post', m: 'stone', x: 1020, y: 660 },
    { t: 'beam', m: 'stone', x: 950, y: 560 },
    { t: 'bigPig', x: 950, y: 660 },
    { t: 'box', m: 'wood', x: 900, y: 540 },
    { t: 'box', m: 'wood', x: 1000, y: 540 },
    { t: 'pig', x: 950, y: 540 },
    { t: 'post', m: 'wood', x: 1110, y: 660 },
    { t: 'post', m: 'wood', x: 1190, y: 660 },
    { t: 'plank', m: 'wood', x: 1150, y: 560 },
    { t: 'pig', x: 1150, y: 540 }
  ]},
  { name: '언덕 위 요새', birds: ['red', 'yellow', 'black'], items: [
    { t: 'ledge', x: 1000, y: 660, w: 380, h: 120 },
    { t: 'box', m: 'stone', x: 720, y: 660 },
    { t: 'pig', x: 770, y: 660 },
    { t: 'post', m: 'wood', x: 850, y: 540 },
    { t: 'post', m: 'wood', x: 990, y: 540 },
    { t: 'beam', m: 'wood', x: 920, y: 440 },
    { t: 'pig', x: 920, y: 540 },
    { t: 'post', m: 'glass', x: 1030, y: 540 },
    { t: 'post', m: 'glass', x: 1170, y: 540 },
    { t: 'beam', m: 'wood', x: 1100, y: 440 },
    { t: 'pig', x: 1100, y: 540 },
    { t: 'pig', x: 1100, y: 420 }
  ]},
  { name: '쌍둥이 탑', birds: ['red', 'yellow', 'black', 'red'], items: [
    { t: 'post', m: 'wood', x: 730, y: 660 },
    { t: 'post', m: 'wood', x: 870, y: 660 },
    { t: 'beam', m: 'wood', x: 800, y: 560 },
    { t: 'pig', x: 800, y: 660 },
    { t: 'post', m: 'glass', x: 730, y: 540 },
    { t: 'post', m: 'glass', x: 870, y: 540 },
    { t: 'beam', m: 'wood', x: 800, y: 440 },
    { t: 'pig', x: 800, y: 420 },
    { t: 'box', m: 'glass', x: 905, y: 660 },
    { t: 'box', m: 'glass', x: 995, y: 660 },
    { t: 'pig', x: 950, y: 660 },
    { t: 'post', m: 'stone', x: 1030, y: 660 },
    { t: 'post', m: 'stone', x: 1170, y: 660 },
    { t: 'beam', m: 'stone', x: 1100, y: 560 },
    { t: 'post', m: 'wood', x: 1030, y: 540 },
    { t: 'post', m: 'wood', x: 1170, y: 540 },
    { t: 'beam', m: 'wood', x: 1100, y: 440 },
    { t: 'pig', x: 1100, y: 540 },
    { t: 'bigPig', x: 1100, y: 420 }
  ]},
  { name: '3층 탑', birds: ['yellow', 'black', 'red', 'black'], items: [
    { t: 'post', m: 'stone', x: 760, y: 660 },
    { t: 'post', m: 'stone', x: 840, y: 660 },
    { t: 'plank', m: 'stone', x: 800, y: 560 },
    { t: 'pig', x: 800, y: 540 },
    { t: 'post', m: 'stone', x: 930, y: 660 },
    { t: 'post', m: 'stone', x: 1070, y: 660 },
    { t: 'beam', m: 'stone', x: 1000, y: 560 },
    { t: 'bigPig', x: 1000, y: 660 },
    { t: 'post', m: 'wood', x: 930, y: 540 },
    { t: 'post', m: 'wood', x: 1070, y: 540 },
    { t: 'beam', m: 'wood', x: 1000, y: 440 },
    { t: 'pig', x: 1000, y: 540 },
    { t: 'post', m: 'glass', x: 930, y: 420 },
    { t: 'post', m: 'glass', x: 1070, y: 420 },
    { t: 'beam', m: 'wood', x: 1000, y: 320 },
    { t: 'pig', x: 1000, y: 420 },
    { t: 'pig', x: 1000, y: 300 },
    { t: 'box', m: 'wood', x: 1160, y: 660 },
    { t: 'box', m: 'wood', x: 1160, y: 620 },
    { t: 'pig', x: 1160, y: 580 }
  ]},
  { name: '왕의 성', birds: ['red', 'yellow', 'black', 'black', 'yellow'], items: [
    { t: 'post', m: 'wood', x: 640, y: 660 },
    { t: 'post', m: 'wood', x: 720, y: 660 },
    { t: 'plank', m: 'glass', x: 680, y: 560 },
    { t: 'pig', x: 680, y: 540 },
    { t: 'box', m: 'stone', x: 820, y: 660 },
    { t: 'box', m: 'stone', x: 820, y: 620 },
    { t: 'box', m: 'stone', x: 820, y: 580 },
    { t: 'pig', x: 870, y: 660 },
    { t: 'ledge', x: 1050, y: 660, w: 300, h: 80 },
    { t: 'post', m: 'stone', x: 980, y: 580 },
    { t: 'post', m: 'stone', x: 1120, y: 580 },
    { t: 'beam', m: 'stone', x: 1050, y: 480 },
    { t: 'pig', x: 1050, y: 580 },
    { t: 'post', m: 'wood', x: 980, y: 460 },
    { t: 'post', m: 'wood', x: 1120, y: 460 },
    { t: 'beam', m: 'wood', x: 1050, y: 360 },
    { t: 'kingPig', x: 1050, y: 460 },
    { t: 'box', m: 'glass', x: 1000, y: 340 },
    { t: 'box', m: 'glass', x: 1100, y: 340 },
    { t: 'pig', x: 1050, y: 340 },
    { t: 'bigPig', x: 1235, y: 660 }
  ]}
];
```

---

## 8. 요구사항별 동작 문장 (L1~L22, build 22행 ↔ 22문장)

- **V1 (L1)** 플레이어가 메인 메뉴에서 "게임 시작"을 누르면 해금된 가장 높은 스테이지가 곧바로 로드되어 새총에 새가 올라간다. 이것이 없으면 버튼을 눌러도 메뉴가 그대로 있거나 빈 하늘만 보인다.
- **V2 (L2)** 플레이어가 "스테이지 선택"을 누르면 1~10 버튼 격자가 뜨고, 해금된 번호를 누르면 그 스테이지가 시작된다. 이것이 없으면 잠긴 스테이지가 눌리거나 깬 스테이지의 별 칸이 비어 있다.
- **V3 (L3)** 플레이어가 스테이지 n을 시작하면 §7의 n번 배치(돼지 수·재질·새 구성)가 그대로 나타난다. 이것이 없으면 여러 스테이지가 똑같이 생겼거나 돼지가 없는 스테이지가 나온다.
- **V4 (L4)** 플레이어가 스테이지 n을 클리어하면 n+1이 해금되고 클리어 화면의 "다음 스테이지"가 n+1을 시작한다. 이것이 없으면 선택 화면에서 n+1이 계속 잠겨 있다.
- **V5 (L5)** 플레이어가 새총의 새를 누른 채 뒤로 끌면 새가 최대 100px까지 따라오며 고무줄이 늘어나고, 놓으면 당긴 반대 방향으로 날아간다. 이것이 없으면 새가 커서를 따라오지 않거나 놓아도 제자리에 멈춰 있다.
- **V6 (L6)** 플레이어가 끄는 동안 새 앞쪽으로 흰 점선이 발사 후 약 0.6초 구간의 궤적을 보여 주고, 발사 뒤에는 날아간 경로가 점으로 남는다. 이것이 없으면 조준 중 화면에 아무 안내도 없다.
- **V7 (L7)** 새가 발사되면 포물선을 그리며 떨어지고, 구조물에 부딪히면 블록이 밀리고 넘어지고 쌓인다. 이것이 없으면 새가 직선으로 날거나 블록을 뚫고 지나간다.
- **V8 (L8)** 새·블록·돼지가 빠르게 부딪히면 상대속도에 비례해 HP가 깎이고, 0이 되면 파편을 남기며 사라진다. 이것이 없으면 세게 맞아도 블록이 끝까지 남아 있다.
- **V9 (L9)** 돼지가 직격·낙하·잔해·화면 밖 이탈로 HP를 잃으면 초록 연기와 +5000이 뜨고 HUD의 남은 돼지 수가 준다. 이것이 없으면 돼지가 화면 밖으로 떨어져도 클리어되지 않는다.
- **V10 (L10)** 플레이어가 노랑 새 비행 중 클릭하면 새가 진행 방향으로 급가속하고, 검정 새는 클릭하거나 첫 충돌 1.5초 뒤 폭발해 반경 150px 안을 부수고 밀어낸다. 이것이 없으면 새 종류가 색깔만 다르다.
- **V11 (L11)** 발사된 새와 구조물이 모두 멈추거나 10초가 지나면 새가 사라지고 대기열의 다음 새가 새총에 올라간다. 이것이 없으면 두 번째 새가 나오지 않거나 첫 새가 구르는 동안 게임이 멈춰 버린다.
- **V12 (L12)** 마지막 돼지가 사라지면 1.5초 뒤 별·점수·남은 새 보너스·최고 기록이 적힌 클리어 화면이 뜬다. 이것이 없으면 돼지를 다 잡은 뒤에도 새를 계속 쏠 수 있다.
- **V13 (L13)** 마지막 새의 턴이 끝났는데 돼지가 남아 있으면 남은 돼지 수와 다시하기/메인으로가 있는 실패 화면이 뜬다. 이것이 없으면 새를 다 쓴 뒤 빈 새총 앞에서 화면이 멈춘다.
- **V14 (L14)** 점수·돼지 수·새 수가 바뀌는 순간 좌상단 HUD 숫자가 갱신된다. 이것이 없으면 블록을 부숴도 점수가 0으로 남는다.
- **V15 (L15)** 인게임 동안 게임 영역 우측 상단에 일시정지 버튼이 보이고, 누르면 일시정지 오버레이가 뜬다. 이것이 없으면 버튼이 왼쪽에 있거나, 메뉴 화면에서도 보이거나, 눌러도 캔버스 드래그가 시작된다.
- **V16 (L16)** 플레이어가 일시정지 중 "다시하기"를 누르면 같은 스테이지가 처음 상태(새 전부, 점수 0)로 다시 시작되고, "메인으로"는 메인 메뉴로, "계속하기"는 멈춘 그대로 이어진다. 이것이 없으면 일시정지 중에도 새가 계속 날아가거나 다시하기 뒤에 이전 점수가 남아 있다.
- **V17 (L17)** 플레이어가 Esc를 누르거나 다른 탭으로 가면 게임이 일시정지된다. 이것이 없으면 다른 탭에 다녀온 사이 턴이 끝나 있거나 물체가 순간이동한다.
- **V18 (L18)** 플레이어가 스테이지를 깨고 새로고침하면 해금·최고점·별·음소거 설정이 그대로 남아 있다. 이것이 없으면 새로고침할 때마다 스테이지 1만 열려 있다.
- **V19 (L19)** 발사·충돌·재질별 파괴·돼지 처치·폭발·클리어·실패 때 서로 다른 효과음이 나고, 메뉴의 사운드 버튼으로 끌 수 있다. 이것이 없으면 게임이 무음이거나 꺼도 소리가 난다.
- **V20 (L20)** 블록이 깨지거나 돼지가 사라지면 파편 입자와 점수 팝업이 떠오르고, 폭발 때 화면이 잠깐 흔들린다. 이것이 없으면 물체가 한 프레임 만에 흔적 없이 증발한다.
- **V21 (L21)** 플레이어가 창 크기를 바꾸거나 휴대폰에서 터치하면 게임 영역이 16:9로 맞춰지고 누른 위치가 정확히 새를 잡는다. 이것이 없으면 창을 줄였을 때 새가 안 잡히거나 화면 가장자리가 잘린다.
- **V22 (L22)** Matter.js를 불러오지 못하면 화면에 원인과 조치 문구가 뜬다. 이것이 없으면 까만 빈 화면만 보인다.

---

## 9. 구현 단계 (의존 순서, 얇은 끝-끝 경로 먼저)

S1~S7까지 쓰면 "게임 시작 → 스테이지 → 발사 → 돼지 처치 → 클리어/실패 → 일시정지"가 모두 이어진다. 그 뒤에 새 능력(S8)과 다듬기(S9)를 넣는다. S4~S7은 서로의 함수를 부르지만, 모든 이름이 §4.4에 고정되어 있으므로 쓰는 순서는 집중 순서일 뿐이다. 마지막 확인은 S10에서 한다.

| 단계 | 선행 | 작업 | 확인 (구현자가 자기 파일을 읽어서 할 수 있는 것) | 담당 행 |
|---|---|---|---|---|
| S0 | 없음 | `index.html`을 §4.2.1 그대로, `style.css`를 §4.2.2대로 | 필수 CSS 규칙 8개가 글자 그대로 있다. script 8줄 순서가 블록과 같다 | L15, L21, L22 |
| S1 | S0 | `js/config.js`를 §4.3 그대로 | 블록과 한 글자도 다르지 않다 | 전체 |
| S2 | S1 | `js/levels.js`를 §7 그대로 | `LEVELS`가 10개, 각 스테이지에 돼지 1마리 이상, 새 1마리 이상 | L3 |
| S3 | S1 | `js/audio.js` (§5.11) | 6개 이름(AUDIO, soundInit, setMuted, playSound, _tone, _noise)이 전부 있다. 모든 오디오 호출이 try/catch 안이거나 `AUDIO.ctx` 확인 뒤에 있다 | L19 |
| S4 | S1 | `js/render.js` 핵심 (§5.12: 배경, 새총, 블록 사각형, 돼지 원+눈, 새 원+눈, 대기열, 예측 점선, 입자, 팝업, updateEffects) | §4.4의 render.js 이름이 전부 있다. `render()` 순서가 §5.12의 1~7과 같다 | L6, L7, L20 |
| S5 | S1, S2, S3, S4 | `js/physics.js` (§5.2~5.7, activateAbility/explodeBird는 S8) | onCollisionStart 안에 `Composite.remove`가 없다. loadLevel이 §5.3 4번의 필드를 전부 설정한다. §4.5 밖의 Matter API가 없다 | L7, L8, L9 |
| S6 | S5 | `js/input.js` (§5.4, 비행 중 분기는 S8) | 모든 포인터 좌표가 `toCanvasXY`를 거친다 | L5, L17 |
| S7 | S1~S6 | `js/game.js` 전부 (§5.8, §5.9, §6) | §6 표의 모든 버튼 id에 핸들러가 연결되어 있다. 마지막 줄이 `boot();`. `frame` 첫 줄이 `requestAnimationFrame(frame);` | L1, L2, L4, L11~L18 |
| S8 | S7 | 새 능력: physics.js에 `activateAbility`, `explodeBird` 추가, input.js onPointerDown에 비행 중 분기 추가, game.js updateFlight에 자동 폭발 추가 | 세 곳이 모두 들어갔다. 노랑 가속은 `G.birdHitAt < 0`일 때만 | L10 |
| S9 | S7 | **다듬기 단계(이름 붙은 단계, 생략 금지)**: 블록 금(hp 60%/30%), 돼지 멍(50%), 큰 돼지 눈썹·왕관, 검정 새 도화선, 구름 흐름, 궤적 잔상, 폭발 흔들림, 1스테이지 안내문, `#hud-tip`, 최고 기록 갱신 문구, §5.11 훅 표의 모든 `playSound` 호출 위치 | §5.11 표의 "부르는 곳"마다 해당 `playSound`가 실제로 있다 | L19, L20, L12 |
| S10 | 전부 | §13 A의 읽기 확인 전체 | §13 A 항목 전부 통과 | 전체 |

---

## 10. 반드시 이어져야 하는 경로 (load-bearing path)

이 경로가 끊기면 나머지는 전부 장식이다: **게임 시작 → 스테이지 로드 → 드래그해서 발사 → 충돌로 돼지 HP 0 → 클리어 화면.**

| hop | 이름 | 통과 조건 | 그 조건이 처음 참이 되는 곳 |
|---|---|---|---|
| 1 | `#btn-start` 클릭 → `startStage(Math.min(G.progress.unlocked, LEVELS.length) - 1)` | `boot()`가 실행되어 핸들러가 연결됨, `G.engine`이 있음, `G.progress`가 객체, `LEVELS[index]`가 있음, `#menu`가 보이고 그 위를 덮는 요소가 없음 | index.html script 순서(S0) → config.js/levels.js 최상위 선언(S1, S2) → game.js 마지막 줄 `boot()`(S7) 2~5단계 |
| 2 | `loadLevel(index)` → 월드에 몸체, `G.phase = 'aiming'`, `G.birdType` 설정 → `setScreen('playing')` | `frame()`은 `G.screen === 'playing'`일 때만 `stepGame()`을 부름. rAF 루프가 돌고 있음 | `startStage`(S7)가 loadLevel(S5) 다음에 `setScreen('playing')`. 루프는 `boot()` 10단계(S7) |
| 3 | 캔버스 `pointerdown` → `pointermove` → `pointerup` → `launchBird()` | `G.screen === 'playing'`, `G.phase === 'aiming'`, `toCanvasXY(e)`가 고정점에서 `GRAB_RADIUS` 안, 놓을 때 당김 ≥ `MIN_PULL`, `#hud`가 `pointer-events: none`, 숨긴 오버레이가 `display: none` | `initInput(G.canvas)`가 `boot()` 4단계(S6, S7). phase는 loadLevel(S5). CSS 규칙은 S0 |
| 4 | 새 몸체 충돌 → `onCollisionStart` → `applyDamage(pig, dmg)` → `G.toRemove`에 추가 | `G.damageEnabled === true`, 상대속도 > `DAMAGE_MIN_SPEED`, 핸들러가 지금 스텝되는 **그** 엔진에 등록됨 | `damageEnabled`는 launchBird 5번(S5). 등록은 `initPhysics()` 3번(S5)에서 한 번, 엔진은 다시 만들지 않음 |
| 5 | `stepGame()`에서 Engine.update 직후 `processRemovals()` → `G.pigsLeft` 0 → `enterClearing()` → `CLEAR_DELAY_MS` 뒤 `showClear()` → `#clear` 보임 | `G.pigsLeft`가 로드 때 돼지 수로 설정됨, phase가 'aiming' 또는 'flying', `G.time`이 스텝마다 증가 | `G.pigsLeft`는 loadLevel 3번(S5). 호출 순서는 stepGame 2~5번(S7) |

콜드 스타트 표 (위 통과 조건에 나오는 모든 상태):

| 상태 | 첫 진입 시 값 | 바꾸는 곳 | 언제 |
|---|---|---|---|
| `Matter` 전역 | CDN이 정의 | index.html 첫 script | 페이지 로드, config.js보다 먼저 |
| `LEVELS` | 10개 배열 | levels.js 최상위 | 페이지 로드 |
| `G.engine` | `null` | `initPhysics()` | `boot()` 4단계, 한 번 |
| collisionStart 핸들러 | 등록 안 됨 | `initPhysics()` 3번 | `boot()` 4단계, 한 번 |
| 캔버스 포인터 리스너 | 없음 | `initInput(canvas)` | `boot()` 4단계 |
| 버튼 click 핸들러 | 없음 | `boot()` 5단계 | 페이지 로드 직후 |
| `G.progress` | `null` | `loadProgress()` | `boot()` 3단계 |
| `G.screen` | `'menu'` | `setScreen()` | boot 9단계 'menu', startStage 'playing', pause/resume, showClear/showFail |
| `G.phase` | `'aiming'` | loadLevel 'aiming', launchBird 'flying', endTurn 'aiming', enterClearing 'clearing', showClear/showFail 'ended' | 각 함수 호출 때 |
| `G.birdType` / `G.birdQueue` | `null` / `[]` | loadLevel(`shift`), endTurn(`shift`), enterClearing(`unshift`), goMenu(초기화) | 스테이지 시작, 턴 종료 |
| `G.aim` / `G.dragging` | 고정점 / `false` | updateAim / onPointerDown true, onPointerUp·onPointerCancel·pauseGame false | 입력 때 |
| `G.damageEnabled` | `false` | loadLevel false, launchBird true | 스테이지 시작, 첫 발사 |
| `G.pigsLeft` | `0` | loadLevel(개수 세기), processRemovals(−1) | 스테이지 시작, 돼지 제거 |
| `G.toRemove` | `[]` | applyDamage(push), processRemovals(비움) | 충돌 때, Engine.update 직후 |
| `G.time` / `G.accumulator` | `0` / `0` | loadLevel 0, stepGame +STEP_MS / frame, resumeGame 0 | 스텝마다 |
| `G.lastFrame` | `0` → `performance.now()` | boot 10단계, startStage, resumeGame, frame | 루프 시작, 재개 |
| `#hud`의 `pointer-events` | `none` | style.css (S0) | 변하지 않음 |
| 오버레이 `hidden` | `#menu` 외 전부 hidden | `setScreen()` | 화면 전환 때 |

---

## 11. 검토한 대안과 기각 이유

| 대안 | 기각 이유 | 다시 열 조건 |
|---|---|---|
| 물리 직접 구현 | 회전 사각형 쌓기·마찰·안정 접촉은 반복 해결기가 필요하고, 실행할 수 없는 구현자는 조정할 수 없다 | 외부 스크립트를 쓸 수 없는 환경(오프라인 필수, CSP 차단)이 확인되면. 그때는 회전 없는 원-사각형 충돌로 범위를 줄인다 |
| Matter.Render 내장 렌더러 | 돼지 얼굴·금·파편·점선을 그릴 수 없다 | 직접 그린 화면에서 물체가 안 보이는 버그를 찾을 때 임시 진단용으로만 |
| ES 모듈 / TypeScript / Vite | 빌드 도구가 필요하고 모듈은 `file://`에서 막힌다. 구현자가 빌드를 돌릴 수 없다 | 구현자가 명령을 실행할 수 있고 개발 서버가 준비되면 |
| Phaser 등 게임 프레임워크 | 기억해서 써야 할 API가 훨씬 많아 틀린 API를 지어낼 위험이 크다 | 스프라이트 애니메이션이나 타일맵이 요구되면 |
| Planck.js / Box2D 포팅 | Matter보다 API가 덜 알려져 있어 버전·이름 착오 위험이 크다 | 반복 횟수를 20/12로 올려도 §7의 탑이 로드 5초 안에 저절로 무너지면 |
| 게임 시작 → 스테이지 선택 화면 먼저 | 요구가 "게임시작 → 게임플레이"라서 시작 버튼은 바로 플레이로 보내고 선택은 별도 버튼으로 둔다 | 사용자가 선택 화면을 먼저 원하면 |
| 스크롤 카메라 | 모든 스테이지를 한 화면에 배치했다 | 1280px보다 넓은 스테이지가 필요하면 |
| WebGL | 물체 100개 미만에서는 Canvas 2D로 충분하다 | 물체 수백 개에서 프레임이 떨어지면 |
| 소리 파일(mp3 등) | 구현자가 바이너리 파일을 만들 수 없다 | 소리 파일이 제공되면 |

---

## 12. 위험과 대응

| 위험 | 대응 |
|---|---|
| CDN 주소 오타나 차단 | 주소를 복사 블록으로 고정했다(§4.2.1). 실패하면 L22 문구가 뜬다. 대체 주소는 §14 |
| 로드 직후 탑이 저절로 무너짐 | 첫 발사 전에는 피해를 끈다. 좌표는 겹침 없이 계산했다. B3로 확인하고, 무너지면 A2의 대체 경로 |
| 충돌 이벤트 안에서 제거해서 생기는 오류 | 제거는 `G.toRemove`에 모았다가 Engine.update 뒤에 처리(§5.6, §5.7) |
| 일시정지 중 타이머 진행 | 모든 타이머는 `G.time`(스텝에서만 증가)을 쓰고 `performance.now()`를 쓰지 않는다. 예외는 구름 흐름과 효과음 중복 방지뿐 |
| 빠른 새의 관통 | 최고 속도 22 < 관통 한계 54 px/step (§4.3 [a]) |
| 파일 간 이름 충돌·누락 | §4.4 표로 고정. S10에서 확인 |
| 틀린 Matter API 사용(`World.add`, `engine.world.gravity`) | §4.5 허용 목록과 금지 목록 |
| 캔버스 크기 조정 후 좌표 어긋남 | 모든 좌표가 `toCanvasXY`를 거친다 |
| 브라우저 자동재생 정책으로 소리 안 남 | 첫 포인터/키 입력 때 `soundInit()` |
| localStorage 예외(시크릿 모드, file://) | 읽기/쓰기를 try/catch로 감싸고 기본값을 쓴다 |
| 클리어가 두 번 처리됨 | `showClear` 첫 줄에 `'ended'` 확인 |
| 렌더 오류로 루프 정지 | `frame` 첫 줄에서 다음 프레임 예약 |
| 새가 멈추지 않고 계속 구름 | 첫 충돌 뒤 공기저항 0.02, 최대 턴 10초 |

---

## 13. 완료의 정의

**A. 구현자의 읽기 확인** (자기 파일을 읽어서 모두 참이어야 한다)
1. 파일이 §4.2의 10개뿐이고, 어디에도 `import`, `export`, `type="module"`, `require`가 없다.
2. `index.html`과 `js/config.js`, `js/levels.js`가 이 문서의 블록과 글자 그대로 같다.
3. §4.4의 함수가 전부, 적힌 파일에, 적힌 인자 목록으로, **정확히 한 번** 정의되어 있다. 코드에서 호출하는 함수는 전부 §4.4에 있거나 브라우저 API이거나 §4.5의 Matter API다.
4. 코드의 모든 `getElementById('...')` id가 §4.2.1 HTML에 있다.
5. 최상위 실행문이 config.js의 로드 확인·별칭 줄과 game.js 마지막 줄 `boot();`뿐이다.
6. `onCollisionStart` 안에 `Composite.remove`가 없다. `Engine.create`는 `initPhysics` 안에 한 번만 있다.
7. §5.11 표의 "부르는 곳"마다 해당 `playSound(...)`가 있다.
8. L1~L22 각 행마다 그것을 구현하는 함수나 DOM 요소를 §4.4 또는 §4.2.1에서 짚을 수 있다.

**B. 사람이 확인하는 합격 기준** (구현이 끝난 뒤 사용자가 최신 Chrome에서 `index.html`을 더블클릭으로 열고 확인. 측정: 눈으로 보고 초는 시계로 잰다)
1. 2초 안에 메인 메뉴가 뜬다. "게임 시작"을 누르면 스테이지 1이 나오고, 새를 끝까지 약 45도 위쪽 반대 방향으로 당겼다 놓으면 새가 포물선을 그리며 오른쪽으로 날아간다. 돼지를 맞혀 없애면 마지막 돼지가 사라지고 3초 안에 별 1개 이상의 클리어 화면이 뜬다.
2. 플레이 중 게임 영역 우측 상단에 일시정지 버튼이 있다. 새가 날아가는 도중에 누르면 계속하기/다시하기/메인으로 오버레이가 뜨고, 5초 동안 새가 공중에 그대로 멈춰 있다. "다시하기"를 누르면 같은 스테이지가 새 전부·점수 0으로 다시 시작되고, "메인으로"를 누르면 메인 메뉴가 뜬다.
3. 1~10 스테이지를 각각 시작해 아무것도 하지 않고 5초 기다렸을 때 **떨어지거나 넘어지는 블록·돼지가 없다.** (첫 발사 전 피해를 꺼 둔 것으로는 이 기준이 저절로 만족되지 않는다. 피해를 꺼도 물체는 떨어지기 때문이다.)
4. 스테이지 1을 깨고 페이지를 새로고침하면 스테이지 선택 화면에서 2가 열려 있고 1에 별이 표시된다.
5. 스테이지 2에서 새 3마리를 모두 돼지가 없는 쪽으로 쏘면 마지막 발사 후 11초 안에 실패 화면이 뜬다.
6. 사운드를 끈 뒤 한 판을 하면 아무 소리도 나지 않고, 켜면 발사·파괴·클리어 소리가 난다.

---

## 14. 구현자 계약

- **스택 고정**: HTML + CSS + 바닐라 JS(클래식 script). 의존성은 Matter.js 0.19.0 하나: `https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js`. 오류 문구가 뜰 때만 `https://unpkg.com/matter-js@0.19.0/build/matter.min.js`로 바꾼다(같은 버전, 다른 코드는 그대로). 다른 버전 번호를 떠올려 쓰지 않는다.
- **기각과 재개 조건**: 물리 직접 구현은 외부 스크립트 차단이 확인되면 다시 연다. 모듈/빌드 도구는 명령 실행과 개발 서버가 가능해지면 다시 연다. Planck.js는 반복 20/12에서도 탑이 무너지면 다시 연다. 스크롤 카메라는 1280px보다 넓은 스테이지가 필요하면 다시 연다. 그 전까지 이 선택들을 뒤집지 않는다. Matter를 선언만 하고 물리를 직접 짜는 것은 금지한다.
- **명령으로 증명할 보장**: 이 스택은 빌드나 타입 검사를 사지 않았으므로 실행할 명령이 없다. Matter를 산 이유(쌓기 안정성과 충돌)는 §13 B1·B3로, 클래식 script를 산 이유(`file://`에서 열림)는 §13 B1로 증명한다.

---

## Frame deviations & habit regressions
- **§7이 가장 약하다.** 난이도 곡선은 돼지/새 수와 재질로 세운 가설이고 시뮬레이션하지 않았다. 스스로 무너질 가능성이 가장 큰 곳은 스테이지 9의 3층 탑(유리 기둥 위 들보 윗면 y=300)이다. 이것을 잡는 것은 B3 하나뿐이다.
- **§5.6의 HP 표는 충돌 속도 15 px/step이라는 가정에 전부 걸려 있다.** 이 속도도 측정하지 않았다. `DAMAGE_K`와 HP 값은 서로 묶여 있어서 하나를 바꾸면 10개 스테이지 난이도가 한꺼번에 움직인다.
- **L10(새 능력)은 명시된 요구가 아니라 "앵그리버드와 같은 시스템"에서 추론해 build로 두었다.** 약한 구현자에게 함수 2개와 타이머 하나를 더 얹는다. 내가 검토자라면 여기를 공격하겠다. 그래서 S8로 분리해 핵심 경로(S1~S7)와 섞이지 않게 했다.
- **§9 S4~S7은 서로 뒤에 정의될 함수를 부른다**(예: physics.js가 render.js의 `spawnParticles`를 부름). 단계 하나하나가 독립적으로 완결되지는 않는다. 안전장치는 §4.4 고정 이름과 S10 확인뿐이다.
- **관례를 따른 부분**: 계속하기 버튼, Esc 토글, 탭 숨김 자동 일시정지(L16, L17)는 요구가 아니라 관례에서 왔다.
- **반사적 습관**: 엔진 선택 논증에 지면을 쓰고 스테이지·오디오·저장은 한 줄로 넘기려는 습관이 있었다. §7 전체 데이터와 §5.11 표로 막았지만, 그 결과 문서가 복사 블록 때문에 길어졌다.
