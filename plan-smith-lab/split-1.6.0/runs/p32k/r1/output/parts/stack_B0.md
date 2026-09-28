> plan-smith · part 2/8 · B0 · index: [plan.md](../plan.md)

## 4. 전달 스택 — 무엇을 사서 무엇을 얻는가

| 항목 | 고정값 | 이걸로 산 것 |
|---|---|---|
| 마크업/스타일 | `index.html` 한 장 안의 `<style>` | 파일 수 감소, 참조하는 설정 파일 0개 |
| 스크립트 | 클래식 `<script>` 4개 (모듈 아님) | `file://`에서 ES 모듈이 CORS로 막히는 문제를 원천 배제 |
| 렌더 | Canvas 2D (`getContext('2d')`) | 도형·텍스트·파티클을 한 컨텍스트에 합성 |
| 물리 | Matter.js **0.19.0** (CDN 1줄) | 회전 강체 충돌·마찰·안정적 적재 — 실행 검증 없이 직접 구현할 수 없는 부분 |
| 저장 | `localStorage` + try/catch 폴백 | 의존성 0개로 진행 보존 |
| 오디오 | WebAudio 오실레이터 | 오디오 자산 파일 0개 |
| 빌드 | **없음** | 설치·컴파일 단계가 없으므로 실패할 단계도 없다 |

CDN 한 줄(그대로 복사):

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
```

---

## 5. 파일 구성과 복사용 글루

파일은 5개다. 그 이상 만들지 않는다.

| 파일 | 책임 |
|---|---|
| `index.html` | DOM·CSS·스크립트 로드 순서 |
| `stages.js` | **모든 공용 상수** + `STAGES` 10개 (가장 먼저 로드되는 프로젝트 파일) |
| `physics.js` | Matter 별칭, 재질, 월드 생성/파괴, 충돌 |
| `render.js` | 캔버스 그리기 |
| `game.js` | 상태 머신, 입력, 루프, 점수, 저장, UI 배선 |

> 클래식 스크립트는 최상위 `const` 이름을 **공유**한다. 같은 이름을 두 파일에서 `const`로 선언하면 SyntaxError가 나면서 페이지 전체가 죽는다. 각 이름은 아래 표에 적힌 파일에서만 선언한다.

### 5.1 `index.html` — 그대로 복사할 뼈대

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Angry Birds Web</title>
<style>
  html, body { margin: 0; background: #1b1f24; font-family: sans-serif; }
  #wrap { position: relative; width: 1280px; max-width: 100vw; margin: 0 auto; }
  #game { display: block; width: 100%; background: #87ceeb; touch-action: none; }
  #hud { position: absolute; top: 16px; left: 16px; color: #fff; font-size: 20px;
         text-shadow: 0 2px 4px rgba(0,0,0,.6); display: flex; gap: 20px; }
  #btn-pause { position: absolute; top: 16px; right: 16px; padding: 10px 18px;
               font-size: 16px; cursor: pointer; }
  .overlay { position: absolute; inset: 0; display: flex; flex-direction: column;
             align-items: center; justify-content: center; gap: 14px;
             background: rgba(0,0,0,.55); color: #fff; }
  .overlay.hidden { display: none; }
  .overlay button { padding: 12px 26px; font-size: 18px; cursor: pointer; }
  #stage-grid { display: grid; grid-template-columns: repeat(5, 84px); gap: 10px; }
  #stage-grid button { padding: 10px 0; }
  #stage-grid button:disabled { opacity: .35; cursor: not-allowed; }
</style>
</head>
<body>
  <div id="wrap">
    <canvas id="game" width="1280" height="720"></canvas>

    <div id="hud">
      <span id="hud-stage">STAGE 1</span>
      <span id="hud-score">0</span>
      <span id="hud-birds">BIRDS 0</span>
    </div>
    <button id="btn-pause" type="button">일시정지</button>

    <div id="overlay-menu" class="overlay">
      <h1>ANGRY BIRDS</h1>
      <button id="btn-play" type="button">게임 시작</button>
      <div id="stage-grid"></div>
    </div>

    <div id="overlay-pause" class="overlay hidden">
      <h2>일시정지</h2>
      <button id="btn-resume" type="button">이어하기</button>
      <button id="btn-restart" type="button">다시하기</button>
      <button id="btn-menu" type="button">메인으로</button>
    </div>

    <div id="overlay-clear" class="overlay hidden">
      <h2>STAGE CLEAR</h2>
      <div id="clear-stars"></div>
      <div id="clear-score"></div>
      <button id="btn-next" type="button">다음 스테이지</button>
      <button id="btn-clear-retry" type="button">다시하기</button>
      <button id="btn-clear-menu" type="button">메인으로</button>
    </div>

    <div id="overlay-fail" class="overlay hidden">
      <h2>실패</h2>
      <div id="fail-msg"></div>
      <button id="btn-fail-retry" type="button">다시하기</button>
      <button id="btn-fail-menu" type="button">메인으로</button>
    </div>
  </div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
  <script src="stages.js"></script>
  <script src="physics.js"></script>
  <script src="render.js"></script>
  <script src="game.js"></script>
</body>
</html>
```

일시정지 버튼의 "우측" 요구는 `#btn-pause { position:absolute; right:16px }` + `#wrap { position:relative }` 두 줄이 함께 있을 때만 성립한다. 둘 중 하나가 빠지면 버튼은 캔버스가 아니라 문서 기준으로 붙는다.

### 5.2 Matter 별칭 — `physics.js` 최상단에 딱 한 번

```js
const { Engine, Composite, Bodies, Body, Events } = Matter;
```

`render.js`와 `game.js`는 이 전역을 그대로 쓴다. **다시 선언하지 않는다.**

> plan-smith · next: [glue-symbols_B1.md](glue-symbols_B1.md)
