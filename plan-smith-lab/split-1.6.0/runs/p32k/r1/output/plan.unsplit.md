# 웹 브라우저 앵그리버드 — 구현 플랜

- Reasoning frame: spec-coverage / Style: opus
- 한 줄 요약: 빌드 도구 없이 브라우저가 직접 여는 파일 5개(`index.html` + 스크립트 4개)로, Matter.js 0.19.0을 CDN에서 받아 10개 스테이지의 슬링샷 물리 게임과 우측 일시정지(다시하기/메인으로)를 만든다.

---

## 1. 요구사항 × 표면 커버리지 매트릭스

빈 칸은 결함이다. 명시된 요구사항(R1~R3 계열)은 `build` 외의 값을 가질 수 없다. `defer`는 트리거를, `n-a`는 이유를 함께 적는다.

| # | 요구사항 | 표면 | 판정 | 근거/트리거 |
|---|---|---|---|---|
| 1 | 스테이지 10종 데이터 | `stages.js` | build | 사용자 명시 (§6 표대로 저작) |
| 2 | 스테이지 선택 | 메인 메뉴 | build | 10단계가 도달 가능해야 요구가 충족됨 |
| 3 | 다음 스테이지 전환 | 클리어 오버레이 | build | 10단계 진행의 유일한 경로 |
| 4 | 해금 진행 저장 | 저장소 | build | 재방문 시 10단계가 남아 있어야 함 |
| 5 | 드래그 조준 (마우스·터치) | 플레이필드 | build | 사용자 명시("새총으로 당겨") |
| 6 | 궤적 예측 표시 | 플레이필드 | build | 요구사항 참고 질문에 명시 |
| 7 | 발사 | 플레이필드 | build | 사용자 명시 |
| 8 | 새 소진·다음 새 장전 | 플레이필드 + HUD | build | 다중 시도 없이는 실패 판정이 성립 안 함 |
| 9 | 중력·포물선 비행 | 플레이필드 | build | 사용자 명시("포물선 궤적·중력") |
| 10 | 충돌 데미지·구조물 파괴 | 플레이필드 | build | 사용자 명시("충돌·구조물 파괴") |
| 11 | 화면 밖 바디 정리 | 플레이필드 | build | 없으면 장시간 플레이가 느려짐 |
| 12 | 돼지 제거 | 플레이필드 | build | 사용자 명시("목표(돼지 등) 제거") |
| 13 | 클리어 판정 | 클리어 오버레이 | build | 사용자 명시(참고 질문) |
| 14 | 실패 판정 | 실패 오버레이 | build | 클리어의 짝 |
| 15 | 우측 일시정지 버튼 | 인게임 화면 | build | 사용자 명시("인게임 우측") |
| 16 | 일시정지 시 시뮬레이션 정지 | 루프 | build | 일시정지가 이름값을 하는 조건 |
| 17 | 다시하기 | 일시정지 오버레이 | build | 사용자 명시 |
| 18 | 메인으로 | 일시정지 오버레이 | build | 사용자 명시 |
| 19 | 점수 적립 | HUD | build | 파괴 피드백의 판독 가능한 형태 |
| 20 | 별 등급 | 클리어 오버레이 | build | 스테이지별 성취 구분 |
| 21 | 최고점 저장 | 저장소 | build | 별이 남지 않으면 그리드가 비어 보임 |
| 22 | 배경·지면 묘사 | 플레이필드 | build | "완성돼 보임"의 최소선 |
| 23 | 파괴 파편 | 플레이필드 | build | 파괴가 일어났다는 유일한 시각 신호 |
| 24 | 효과음 | 오디오 | build | 자산 파일 0개(오실레이터)로 가능 |
| 25 | 라이브러리 로드 실패 안내 | 플레이필드 | build | 유일한 외부 의존의 실패를 화면에 드러냄 |
| 26 | 새 타입 다종·특수능력 | 플레이필드 | defer | 트리거: `stage.birds`를 개수(number)에서 타입 배열로 바꿔도 되는 시점이 오면 |
| 27 | 스크롤 카메라 | 플레이필드 | defer | 트리거: 스테이지 폭이 1280px를 넘어야 하는 배치가 필요해지면 |
| 28 | 배경음악 | 오디오 | defer | 트리거: 오디오 파일을 프로젝트에 동봉할 수 있게 되면 |
| 29 | 온라인 랭킹 | 네트워크 | n-a | 파일을 더블클릭해 여는 오프라인 단일 페이지 전제(§3 A1) |

### 1.1 표면별 완성 기준 (quality floor)

- **메인 메뉴**: 제목 + '게임 시작' + 10칸 그리드가 한 화면에 보이고, 잠긴 칸은 눌리지 않는 것이 눈으로 구분된다.
- **스테이지 선택**: 각 칸에 스테이지 번호와 획득한 별(0~3개)이 함께 보인다.
- **플레이필드**: 하늘·언덕·지면·새총이 항상 그려져 있고, 빈 캔버스가 노출되는 순간이 없다.
- **HUD**: 스테이지 번호·현재 점수·남은 새가 항상 보이고, 점수는 파괴 즉시 갱신된다.
- **일시정지 오버레이**: 뒤 화면이 정지된 채 비치고, 이어하기/다시하기/메인으로 3개 버튼이 보인다.
- **클리어 오버레이**: 별 등급·이번 점수·최고 점수가 함께 보이고 다음 스테이지로 갈 수 있다.
- **실패 오버레이**: 남은 돼지 수를 밝히고 다시하기/메인으로 두 경로를 준다.
- **저장소**: 브라우저를 껐다 켜도 해금 단계와 스테이지별 최고점·별이 남는다. 저장이 막힌 환경에서도 예외로 게임이 죽지 않는다.
- **오디오/피드백**: 발사·명중·돼지 제거·클리어·실패가 서로 다른 소리로 구분되고, 파괴에는 반드시 파편이 동반된다.

### 1.2 `build` 행의 동사 문장 (표 바깥 — 이 25줄이 실제 지시다)

1. 플레이어가 스테이지 선택에서 7번을 누르면 7번 고유의 블록·돼지 배치가 그려진다; 데이터가 없으면 지면과 새총만 있고 구조물이 하나도 없는 화면이 뜬다.
2. 플레이어가 메인 메뉴에서 해금된 칸을 누르면 그 스테이지가 시작된다; 그리드 생성이 빠지면 메인 화면에 '게임 시작' 버튼만 있고 아래가 빈 채로 남는다.
3. 플레이어가 클리어 오버레이에서 '다음 스테이지'를 누르면 다음 번호의 배치가 로드된다; 월드 비우기가 빠지면 이전 스테이지의 잔해가 새 배치 위에 겹쳐 보인다.
4. 플레이어가 3번을 깨고 브라우저를 닫았다 다시 열면 4번 칸이 눌리는 상태로 보인다; 저장이 빠지면 재방문 때 1번만 활성인 그리드로 되돌아간다.
5. 플레이어가 캔버스를 누르거나 손가락으로 짚고 끌면 새가 포인터를 따라 최대 120px까지 당겨지고 고무줄 두 줄이 새까지 이어진다; 좌표 변환이 빠지면 창을 줄였을 때 새가 포인터보다 오른쪽 아래로 어긋나 따라온다.
6. 플레이어가 당기는 동안 예상 경로가 점 28개로 표시된다; 중력 상수가 §5.4와 다르면 점선은 낮게 깔리는데 실제 새는 그 위로 날아가 눈에 띄게 갈라진다.
7. 플레이어가 포인터를 놓으면 새가 당긴 반대 방향으로 튀어나간다; 정적 해제가 빠지면 새는 슬링에 붙박인 채 꿈쩍하지 않는다.
8. 새가 멈추거나 화면 밖으로 나가면 다음 새가 슬링 위에 나타나고 HUD의 새 표시가 하나 줄어든다; 장전이 빠지면 슬링이 빈 채로 남아 드래그해도 아무것도 잡히지 않는다.
9. 발사된 새는 매 프레임 아래로 가속되어 지면에 닿으면 튀며 구른다; `Engine.update`가 루프 밖에 있으면 새가 발사 자세 그대로 공중에 멈춘다.
10. 새나 잔해가 `IMPACT_MIN` 이상 속도로 블록에 부딪히면 블록 hp가 깎이고 0 이하가 된 블록은 다음 프레임에 사라진다; 충돌 이벤트 안에서 곧바로 제거하면 같은 프레임의 남은 충돌쌍이 사라진 바디를 참조해 화면이 그 자리에서 얼어붙는다.
11. 화면 밖 200px을 넘어간 바디는 월드에서 빠진다; 정리가 빠지면 한 스테이지를 오래 붙잡을수록 프레임이 눈에 띄게 늘어진다.
12. 돼지 hp가 0 이하가 되면 돼지가 사라지고 점수가 5000 오르며 초록 파편이 흩어진다; 남은 돼지 수를 배열 길이로 다시 계산하지 않으면 HUD 숫자가 화면의 돼지 수와 어긋난다.
13. 마지막 돼지가 사라지면 잠시 뒤 클리어 오버레이가 별과 점수와 함께 뜬다; 상태 전환이 빠지면 돼지가 전부 없는 빈 스테이지에서 새를 계속 쏘게 된다.
14. 마지막 새가 멈추고 월드 전체가 멎었는데 돼지가 남아 있으면 실패 오버레이가 뜬다; 월드 정지 조건 없이 새 속도만 보면 구조물이 무너지는 도중에 실패 화면이 먼저 떠서, 그 뒤로 돼지가 깔려 죽는 장면이 오버레이 뒤에서 진행된다.
15. 플레이어가 캔버스 오른쪽 위 '일시정지'를 누르면 일시정지 오버레이가 뜬다; 버튼이 `#wrap`의 자식이 아니거나 `#wrap`에 `position:relative`가 없으면 버튼이 캔버스 오른쪽이 아니라 문서 오른쪽 끝으로 날아간다.
16. 일시정지 중에는 물리 갱신이 호출되지 않아 날아가던 새가 공중에 그대로 멈춘다; 렌더까지 멈추면 오버레이 뒤가 검게 지워진 채 남는다.
17. 플레이어가 '다시하기'를 누르면 같은 스테이지가 점수 0·새 만수로 다시 시작된다; 점수를 초기화하지 않으면 재시작 직후 첫 발사도 하기 전에 HUD에 이전 시도의 점수가 남아 있다.
18. 플레이어가 '메인으로'를 누르면 월드가 비워지고 메인 메뉴가 뜬다; 상태를 `MENU`로 되돌리지 않으면 메뉴 뒤에서 물리가 계속 돌아 점수가 혼자 올라간다.
19. 블록이 파괴될 때마다 HUD 점수가 500씩 즉시 오른다; HUD 갱신 호출이 파괴 처리 뒤에 없으면 점수가 클리어 화면에서 한꺼번에 뛰는 것처럼 보인다.
20. 클리어 시 점수가 `star3` 이상이면 별 3개, `star2` 이상이면 2개, 그 아래는 1개가 표시된다; 임계값을 스테이지에서 읽지 않고 고정값으로 쓰면 10번 스테이지에서 거의 항상 별 3개가 나온다.
21. 같은 스테이지를 더 높은 점수로 다시 깨면 최고점과 별이 갱신되고, 낮으면 그대로 유지된다; 비교 없이 덮어쓰면 그리드의 별이 시도할 때마다 줄어든다.
22. 매 프레임 하늘·언덕·지면이 먼저 그려지고 그 위에 바디가 그려진다; 화면 지우기 없이 그리면 새가 지나간 자리가 붓자국처럼 화면에 남는다.
23. 블록이나 돼지가 사라질 때 그 자리에서 파편 10~16개가 튄다; 파편 수명을 줄이지 않으면 후반 스테이지 화면이 멈춰 있는 파편 조각으로 덮인다.
24. 발사·명중·돼지 제거·클리어·실패에서 각각 다른 높이의 짧은 소리가 난다; 오디오 컨텍스트를 로드 시점에 만들면 첫 클릭 전이라 브라우저가 정지 상태로 붙잡아 게임 내내 소리가 나지 않는다.
25. `Matter` 전역이 없으면 캔버스에 `physics library not loaded` 문구가 그려진다; 이 가드가 없으면 첫 클릭에서 예외가 터지고 화면에는 하늘색 빈 캔버스만 남아 원인을 알 수 없다.

---

## 2. 문제 정의와 목표

브라우저에서 파일을 더블클릭해 여는 것만으로 플레이 가능한 슬링샷 물리 게임을 만든다. 성공은 세 가지가 동시에 참일 때 성립한다.

1. 서로 다른 배치의 스테이지 10개가 선택·진행 가능하다.
2. 새총을 당겨 놓으면 새가 중력을 받아 날아가고, 구조물에 부딪히면 부서지며, 돼지가 모두 제거되면 클리어된다.
3. 인게임 화면 **오른쪽**에 일시정지 버튼이 있고, 누르면 다시하기/메인으로가 있는 오버레이가 뜬다.

## 3. 명시적 가정

- **A1 — 실행 환경은 최신 Chrome/Edge/Firefox이고, 사용자는 `index.html`을 더블클릭해 `file://`로 연다.** 틀리면: ES 모듈·번들러를 배제한 §9의 결정이 과하게 보수적이 되지만 손해는 없다. 이 가정이 §4 스택 선택 전체를 지탱한다.
- **A2 (전 계획이 여기 걸려 있음) — CDN에서 Matter.js를 받을 수 있다.** 틀리면 `Matter`가 undefined가 되어 게임이 아예 시작되지 않는다.
  - 가장 싼 조기 확인(구현자가 실행 없이 할 수 있는 것): `index.html`의 `<script src=...matter...>`가 `game.js`보다 **앞줄**에 있는지 눈으로 확인하고, `init()` 첫 줄에 §5.9의 `typeof Matter === 'undefined'` 가드를 넣는다.
  - 대체 경로: 아래 한 줄을 그대로 교체한다.
    `<script src="https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js"></script>`
- **A3 — `file://`에서 `localStorage` 접근이 예외를 던질 수 있다.** 틀리면(예외가 없으면) 그대로 저장된다. 맞더라도 §5.10의 try/catch 래퍼가 게임 진행을 막지 않는다.
- **A4 — 캔버스는 1280×720 고정 논리 좌표계이고 CSS가 화면 폭에 맞춰 축소한다.** 틀리면 포인터 좌표가 어긋나는데, §5.5의 변환식이 그 어긋남을 흡수한다.
- **A5 — 새 1종·특수능력 없음으로도 "앵그리버드와 같은 게임 시스템" 요구를 만족한다.** 틀리면 §1의 26번 행을 되살린다(트리거는 그 행에 적혀 있다).
- **A6 — 스테이지는 화면 한 장에 들어간다(가로 스크롤 없음).** 틀리면 월드 좌표와 화면 좌표가 갈라지고 §5.5·§5.6이 전부 카메라 오프셋을 타야 한다. 그래서 이 가정을 깨는 배치는 §6 표에서 애초에 만들지 않는다.

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

### 5.3 심볼 표 — 이 시그니처 그대로 정의한다

| 파일 | 심볼 | 시그니처 | 계약 |
|---|---|---|---|
| stages.js | `W`, `H` | `const W = 1280, H = 720` | 캔버스 논리 크기 |
| stages.js | `GROUND_Y` | `const GROUND_Y = 620` | 지면 윗면 y |
| stages.js | `SLING` | `const SLING = { x: 210, y: 520, maxPull: 120 }` | 새총 고정점과 최대 당김 |
| stages.js | `STEP_MS`, `G_STEP`, `LAUNCH_K` | §5.4 참조 | 물리·궤적의 단일 출처 |
| stages.js | `IMPACT_MIN`, `SETTLE_SPEED`, `SETTLE_FRAMES`, `FLIGHT_MAX_FRAMES` | §5.4 참조 | 판정 임계값 |
| stages.js | `SCORE` | `const SCORE = { pig: 5000, block: 500, birdLeft: 10000 }` | 점수 단가 |
| stages.js | `STAGES` | `const STAGES = [ … ]` | 길이 10, §5.11 스키마 |
| physics.js | `MATERIAL` | `const MATERIAL = { wood:{…}, ice:{…}, stone:{…} }` | hp/density/color |
| physics.js | `PIG_HP` | `const PIG_HP = 15` | 돼지 내구도 |
| physics.js | `createEngine()` | `-> engine` | 엔진 1회 생성, 중력 설정. **게임당 한 번만 호출** |
| physics.js | `bindCollisions(engine)` | `-> void` | `collisionStart` 1회 바인딩. 두 번 부르면 데미지가 두 배가 된다 |
| physics.js | `buildStage(engine, stage)` | `-> { blocks: Body[], pigs: Body[] }` | 월드를 비우고 지면·블록·돼지를 세운다 |
| physics.js | `spawnBirdAtSling(engine)` | `-> Body` | `isStatic:true`인 새를 슬링 위치에 놓는다 |
| physics.js | `impactSpeed(a, b)` | `-> number` | 두 바디의 상대 속도 크기 |
| physics.js | `damageBody(body, impact)` | `-> boolean` | hp 차감. 0 이하면 `body.destroyed = true` 후 true |
| physics.js | `removeBody(engine, body)` | `-> void` | `Composite.remove` 래퍼 |
| render.js | `drawFrame(ctx, game)` | `-> void` | 한 프레임 전체 |
| render.js | `drawBackground(ctx)` | `-> void` | 하늘·언덕·지면 |
| render.js | `drawBody(ctx, body)` | `-> void` | 원이면 arc, 아니면 `body.vertices` 폴리곤 |
| render.js | `drawSling(ctx, game)` | `-> void` | 기둥 2개 + 당김 중 고무줄 |
| render.js | `drawTrajectory(ctx, points)` | `-> void` | 점 배열 렌더 |
| render.js | `drawParticles(ctx, game)` | `-> void` | 파편 |
| render.js | `drawLoadError(ctx)` | `-> void` | `physics library not loaded` 문구 |
| game.js | `canvas`, `ctx` | `const canvas = document.getElementById('game')` / `const ctx = canvas.getContext('2d')` | 스크립트가 body 끝에 있으므로 최상위 선언 가능 |
| game.js | `GAME` | `const GAME = { … }` | §5.4 초기 상태 |
| game.js | `init()` | `-> void` | `window.addEventListener('load', init)` 로 1회 |
| game.js | `loop()` | `-> void` | rAF 루프, `init`에서 1회 시작 |
| game.js | `goMenu()` | `-> void` | 월드 비우고 `state='MENU'` |
| game.js | `startStage(index)` | `-> void` | 스테이지 로드 + `state='PLAYING'` |
| game.js | `restartStage()` | `-> void` | `startStage(GAME.stageIndex)` |
| game.js | `pauseGame()` / `resumeGame()` | `-> void` | `state` 전환 + 오버레이 |
| game.js | `finishStage(cleared)` | `-> void` | 점수 정산·저장·오버레이 |
| game.js | `checkOutcome()` | `-> void` | 클리어/실패 판정 |
| game.js | `updateShotPhase()` | `-> void` | 비행 종료 감지 |
| game.js | `worldSettled()` | `-> boolean` | 새·블록·돼지 전부 저속인가 |
| game.js | `resolveShot()` | `-> void` | 새 회수 + 다음 장전 |
| game.js | `sweepDestroyed()` | `-> void` | 파괴 표시된 바디 일괄 제거 |
| game.js | `launchBird()` | `-> void` | §5.7 순서 그대로 |
| game.js | `pullPoint(p)` | `-> {x,y}` | 최대 당김 클램프 |
| game.js | `pullVelocity(p)` | `-> {x,y}` | 발사 속도(px/step) |
| game.js | `trajectoryPoints(p)` | `-> Array<{x,y}>` | 미리보기 점 |
| game.js | `canvasPoint(e)` | `-> {x,y}` | 포인터 → 캔버스 좌표 |
| game.js | `onPointerDown(e)` / `onPointerMove(e)` / `onPointerUp(e)` | `-> void` | 조준·발사 |
| game.js | `syncHud()` | `-> void` | HUD 3칸 갱신 |
| game.js | `showOverlay(id)` / `hideOverlays()` | `-> void` | `.hidden` 토글 |
| game.js | `buildStageGrid()` | `-> void` | 10칸 버튼 생성 |
| game.js | `starsFor(stage, score)` | `-> number` | 1~3 |
| game.js | `loadProgress()` | `-> {unlocked, best}` | §5.10 |
| game.js | `saveProgress(progress)` | `-> void` | §5.10 |
| game.js | `playSfx(kind)` | `-> void` | kind: `'launch'|'hit'|'pig'|'clear'|'fail'` |
| game.js | `spawnDebris(x, y, color, n)` | `-> void` | 파편 생성 |
| game.js | `updateParticles()` | `-> void` | 파편 갱신·수거 |

### 5.4 공용 상수와 초기 상태 — 그대로 복사

`stages.js` 맨 위:

```js
const W = 1280, H = 720;
const GROUND_Y = 620;                  // 지면 윗면
const SLING = { x: 210, y: 520, maxPull: 120 };
const STEP_MS = 16.666;                // Engine.update 고정 델타
const G_STEP = 0.2777;                 // = gravity.y(1) * gravity.scale(0.001) * STEP_MS^2
const LAUNCH_K = 0.18;                 // 당긴 픽셀 -> px/step
const IMPACT_MIN = 4;                  // 이보다 느린 접촉은 무피해
const SETTLE_SPEED = 0.4;              // 정지 판정 속도 (px/step)
const SETTLE_FRAMES = 45;              // 연속 정지 프레임 수
const FLIGHT_MAX_FRAMES = 420;         // 7초 강제 종료
const SCORE = { pig: 5000, block: 500, birdLeft: 10000 };
```

`game.js` 상단:

```js
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const GAME = {
  state: 'MENU',          // 'MENU' | 'PLAYING' | 'PAUSED' | 'CLEAR' | 'FAIL'
  phase: 'AIM',           // 'AIM' | 'FLYING'
  stageIndex: 0,
  score: 0,
  birdsLeft: 0,
  pigsLeft: 0,
  engine: null,
  bird: null,             // Matter.Body | null
  blocks: [],
  pigs: [],
  particles: [],
  dragging: false,
  dragPoint: { x: SLING.x, y: SLING.y },
  settleFrames: 0,
  flightFrames: 0,
  clearDelay: 0,
  progress: { unlocked: 1, best: {} }
};
```

### 5.5 포인터 → 캔버스 좌표 (그대로 복사)

```js
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (W / r.width),
           y: (e.clientY - r.top) * (H / r.height) };
}
```

`pointermove`/`pointerup`은 `window`에 건다(캔버스 밖에서 손을 떼도 발사돼야 한다). `pointerdown`만 캔버스에 건다.

### 5.6 당김과 궤적 — 발사와 미리보기의 단일 출처 (그대로 복사)

```js
function pullPoint(p) {
  let dx = p.x - SLING.x, dy = p.y - SLING.y;
  const d = Math.hypot(dx, dy);
  if (d > SLING.maxPull) { dx = dx * SLING.maxPull / d; dy = dy * SLING.maxPull / d; }
  return { x: SLING.x + dx, y: SLING.y + dy };
}

function pullVelocity(p) {
  const q = pullPoint(p);
  return { x: (SLING.x - q.x) * LAUNCH_K, y: (SLING.y - q.y) * LAUNCH_K };
}

function trajectoryPoints(p) {
  const v = pullVelocity(p);
  const pts = [];
  let x = SLING.x, y = SLING.y, vx = v.x, vy = v.y;
  for (let i = 0; i < 112; i++) {
    vy += G_STEP; x += vx; y += vy;
    if (i % 4 === 3) pts.push({ x: x, y: y });
    if (y > GROUND_Y) break;
  }
  return pts;
}
```

### 5.7 발사 순서 — 이 세 줄의 순서가 뒤집히면 새가 날지 않는다 (그대로 복사)

```js
function launchBird() {
  const q = pullPoint(GAME.dragPoint);
  const v = pullVelocity(GAME.dragPoint);
  Body.setStatic(GAME.bird, false);   // (1) 정적 바디는 질량이 무한이라 속도 설정이 무시된다
  Body.setPosition(GAME.bird, q);     // (2) 당긴 지점에서 출발
  Body.setVelocity(GAME.bird, v);     // (3)
  GAME.phase = 'FLYING';
  GAME.flightFrames = 0;
  GAME.settleFrames = 0;
  playSfx('launch');
}
```

### 5.8 충돌 — 이벤트 안에서 제거하지 않는다 (그대로 복사)

```js
function impactSpeed(a, b) {
  return Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
}

function damageBody(body, impact) {
  if (body.isStatic || body.hp === undefined || body.destroyed) return false;
  body.hp -= impact;
  if (body.hp > 0) return false;
  body.destroyed = true;              // 표시만 한다. 실제 제거는 sweepDestroyed()에서
  return true;
}

function bindCollisions(engine) {
  Events.on(engine, 'collisionStart', function (ev) {
    for (let i = 0; i < ev.pairs.length; i++) {
      const a = ev.pairs[i].bodyA, b = ev.pairs[i].bodyB;
      const s = impactSpeed(a, b);
      if (s < IMPACT_MIN) continue;
      const da = damageBody(a, s), db = damageBody(b, s);
      if (da || db) playSfx('hit');
    }
  });
}
```

`sweepDestroyed()`는 `GAME.blocks`, `GAME.pigs`를 **역순으로** 순회하며 `destroyed`인 것을 `removeBody` → `splice` → 점수 가산 → `spawnDebris` 순으로 처리하고, 마지막에 `GAME.pigsLeft = GAME.pigs.length`로 다시 계산한다(감산 누적이 아니라 재계산이다).

### 5.9 메인 루프 — 일시정지 게이트가 여기 하나뿐이다 (그대로 복사)

```js
function loop() {
  if (GAME.state === 'PLAYING') {
    Engine.update(GAME.engine, STEP_MS);
    sweepDestroyed();
    updateParticles();
    updateShotPhase();
    checkOutcome();
    syncHud();
  }
  if (typeof Matter === 'undefined') drawLoadError(ctx);
  else drawFrame(ctx, GAME);
  requestAnimationFrame(loop);
}
```

렌더는 상태와 무관하게 매 프레임 돈다. 그래서 일시정지·클리어·실패 오버레이 뒤에 정지 화면이 그대로 비친다.

### 5.10 저장소 — 예외가 게임을 죽이지 않게 (그대로 복사)

```js
const MEM = { data: null };

function loadProgress() {
  try {
    const raw = localStorage.getItem('ab.progress.v1');
    if (raw) return JSON.parse(raw);
  } catch (e) { /* file:// 등에서 접근 차단 — 메모리로 대체 */ }
  return MEM.data || { unlocked: 1, best: {} };
}

function saveProgress(progress) {
  MEM.data = progress;
  try { localStorage.setItem('ab.progress.v1', JSON.stringify(progress)); } catch (e) {}
}
```

`playSfx`도 같은 형태로 전체를 `try { … } catch (e) {}` 로 감싸고, `AudioContext`는 **첫 호출 때** 만든다(로드 시점에 만들면 브라우저 자동재생 정책이 정지 상태로 붙잡는다).

### 5.11 스테이지 스키마 + 1번 스테이지 완본 (그대로 복사, 2~10번은 §6 표대로)

```js
const STAGES = [
  {
    id: 1, name: '첫 발사', birds: 3, star2: 5500, star3: 16000,
    blocks: [
      { x: 900,  y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 1000, y: 590, w: 24,  h: 60, mat: 'wood', angle: 0 },
      { x: 950,  y: 548, w: 140, h: 24, mat: 'wood', angle: 0 }
    ],
    pigs: [ { x: 950, y: 512, r: 22 } ]
  }
  // … id 2 ~ 10
];
```

좌표 규칙 4가지:
- `x, y`는 **중심** 좌표다(Matter의 `Bodies.rectangle`/`circle`이 중심 기준).
- 지면 위에 놓는 블록은 `y = GROUND_Y - h/2`.
- 위에 얹는 블록은 `y = (아래 블록 윗면) - h/2`, 겹치지 않게 1~2px 띄운다. 초기에 겹쳐 있으면 시작하자마자 구조물이 튕겨 날아간다.
- 배치는 x가 400~1240 사이에만 둔다(그 왼쪽은 새총 사거리 안쪽이라 난이도가 없다).

`buildStage`가 하는 일 순서: `Composite.clear(engine.world, false)` → 지면 `Bodies.rectangle(W/2, GROUND_Y + 60, W + 400, 120, { isStatic: true, friction: 0.9 })` → `stage.blocks`를 `MATERIAL[mat]`의 hp/density/color를 붙여 생성 → `stage.pigs`를 `hp = PIG_HP`로 생성 → 배열 반환.

재질 값(§5.3 `MATERIAL`):

```js
const MATERIAL = {
  wood:  { hp: 26, density: 0.0018, color: '#c8873c' },
  ice:   { hp: 13, density: 0.0011, color: '#9ad8e8' },
  stone: { hp: 52, density: 0.0032, color: '#9aa0a6' }
};
const PIG_HP = 15;
```

새: `Bodies.circle(SLING.x, SLING.y, 18, { isStatic: true, density: 0.004, restitution: 0.35, friction: 0.6, label: 'bird' })` — 새에는 `hp`를 주지 않는다(그래서 `damageBody`가 새를 부수지 않는다).

`drawBody`는 `body.vertices`가 이미 회전이 반영된 **월드 좌표**라는 점에 의존한다. `ctx.rotate`를 추가로 걸면 회전이 두 번 적용된다.

---

## 6. 스테이지 10종 저작 표 (콘텐츠 축)

임계값 산식(모든 행이 이 식에서 나왔다): `star2 = 돼지수×5000 + 블록수×200`, `star3 = 돼지수×5000 + 블록수×350 + 10000`, 500 단위 반올림.

| # | 이름 | 새 | 돼지 | 블록 | 신규로 요구하는 것 | 배치 요지 | star2 | star3 |
|---|---|---|---|---|---|---|---|---|
| 1 | 첫 발사 | 3 | 1 | 3 | 조준 감각 | 기둥 2 + 상판 1, 그 위 돼지 | 5,500 | 16,000 |
| 2 | 나무 오두막 | 3 | 2 | 6 | 두 번 맞히기 | 2층 나무 상자, 돼지 2마리 분리 배치 | 11,000 | 22,000 |
| 3 | 얼음 창고 | 3 | 2 | 8 | 재질 구분(얼음은 1방) | 얼음 벽 뒤 돼지, 나무 지지대 | 11,500 | 23,000 |
| 4 | 돌 기둥 | 4 | 2 | 9 | 돌은 못 뚫는다는 학습 | 돌기둥 사이로 난 좁은 통로 | 12,000 | 23,000 |
| 5 | 2층 구조 | 4 | 3 | 12 | 붕괴 유도 | 아래층 지지대를 치면 위층이 무너짐 | 17,500 | 29,000 |
| 6 | 공중 발판 | 4 | 3 | 12 | 고각 사격 | 정적 발판 위 돼지 1 + 지상 2 | 17,500 | 29,000 |
| 7 | 좁은 틈 | 4 | 3 | 14 | 정밀 조준 | 벽 사이 틈으로만 돼지에 닿음 | 18,000 | 30,000 |
| 8 | 돌 요새 | 5 | 4 | 16 | 약점 탐색 | 돌 외벽 + 나무 내부, 측면만 취약 | 23,000 | 35,500 |
| 9 | 도미노 | 5 | 4 | 18 | 연쇄 | 얇은 기둥 줄세우기, 첫 칸을 치면 연쇄 | 23,500 | 36,500 |
| 10 | 최종 성채 | 5 | 5 | 20 | 전부 | 3층 혼합 재질 + 분산 배치 | 29,000 | 42,000 |

블록 수는 ±2까지 허용한다. 돼지 수와 새 수는 이 표의 값을 그대로 쓴다(별 임계값이 그 수에서 계산됐다).

---

## 7. 접근과 단계

각 단계는 선행 단계의 산출물을 소비한다. 검증은 구현자가 **자기 코드를 읽어 확인할 수 있는 것**으로만 적었다(구현자는 실행할 수 없다).

**S1 — 뼈대.** 선행: 없음. §5.1을 `index.html`로 그대로 쓴다. 검증: `<script>` 5개가 §5.1 순서와 같고 id 14개(`game`, `hud-stage`, `hud-score`, `hud-birds`, `btn-pause`, `overlay-menu`, `btn-play`, `stage-grid`, `overlay-pause`, `overlay-clear`, `overlay-fail`, `clear-stars`, `clear-score`, `fail-msg`)가 모두 존재한다. 매트릭스 행: 15, 22.

**S2 — 상수와 상태.** 선행: S1. §5.4를 `stages.js`/`game.js`에 넣고, `init()`이 `loop()`를 한 번 시작하며 `window.addEventListener('load', init)`로 걸린다. 검증: §5.4 상수 이름이 프로젝트 전체에서 각각 `const` 1회만 나타난다. 행: 16.

**S3 — 물리 월드 + 스테이지 1.** 선행: S2. `physics.js` 전체와 `stages.js`의 1번 스테이지. `createEngine()`/`bindCollisions()`는 `init()`에서 각각 1회만 호출한다. 검증: `Events.on(` 호출이 파일 전체에 1개다. 행: 1, 9, 10.

**S4 — 렌더.** 선행: S3(그릴 바디가 있어야 한다). `render.js` 전체. 검증: `drawFrame` 안에서 `clearRect` → `drawBackground` → 바디 → 파편 순서다. 행: 22.

**S5 — 조준·발사·궤적.** 선행: S4(당김이 보여야 의미가 있다). §5.5~5.7 + `drawSling`/`drawTrajectory`. 검증: `Body.setVelocity(GAME.bird` 바로 앞줄이 `Body.setStatic(GAME.bird, false)`다. 행: 5, 6, 7.

**S6 — 데미지·파괴·판정.** 선행: S5. §5.8 + `sweepDestroyed`/`updateShotPhase`/`worldSettled`/`resolveShot`/`checkOutcome`/`finishStage`. **여기서 얇은 종단 경로가 닫힌다**: 메뉴에서 시작 → 발사 → 돼지 제거 → 클리어. 검증: `Composite.remove` 호출이 `collisionStart` 콜백 바깥에만 있다. 행: 8, 11, 12, 13, 14.

**S7 — 오버레이와 상태 전이.** 선행: S6(클리어/실패 상태가 있어야 띄울 게 있다). `showOverlay`/`hideOverlays`/`pauseGame`/`resumeGame`/`restartStage`/`goMenu` + 버튼 8개 배선. 검증: `GAME.state = ` 에 대입되는 문자열이 `'MENU'|'PLAYING'|'PAUSED'|'CLEAR'|'FAIL'` 5종뿐이다. 행: 15, 16, 17, 18.

**S8 — 점수·별·저장·스테이지 선택.** 선행: S7(클리어 오버레이가 있어야 별을 붙인다). `syncHud`/`starsFor`/`loadProgress`/`saveProgress`/`buildStageGrid`. 검증: `saveProgress` 호출부에서 최고점을 `Math.max`로 비교한다. 행: 2, 3, 4, 19, 20, 21.

**S9 — 스테이지 2~10 저작.** 선행: S3(스키마). S6 이후 언제든 가능하며 S7·S8과 **병렬**이다. §6 표의 10행을 데이터로 옮긴다. 검증: `STAGES.length === 10`, id가 1~10 오름차순, 각 원소가 7개 키를 갖는다. 행: 1.

**S10 — 마감 레이어(이름 붙은 단계, 생략 금지).** 선행: S6. 배경 언덕·구름, 파괴 파편, 효과음 5종, 로드 실패 문구. 검증: `playSfx` 호출이 `'launch'`, `'hit'`, `'pig'`, `'clear'`, `'fail'` 5종 모두에 대해 존재하고, `spawnDebris` 호출이 `sweepDestroyed` 안에 있다. 행: 23, 24, 25.

---

## 8. Load-bearing path — 이 사슬이 닫히지 않으면 나머지는 장식이다

경로: **메인 메뉴에서 '게임 시작'을 눌러 → 스테이지가 서고 → 루프가 물리를 돌리고 → 당겨 놓은 새가 날아가 → 돼지가 사라지고 클리어가 뜬다.**

| hop | 이름 | 통과 조건 | 그 조건이 처음 참이 되는 곳 |
|---|---|---|---|
| 1 | `#btn-play` click → `startStage(GAME.progress.unlocked - 1)` | `init()`이 로드 시 실행돼 리스너를 걸었고 `STAGES[0]`이 존재 | S2의 `window.addEventListener('load', init)` + S3의 `stages.js` 1번 스테이지 정의 |
| 2 | `startStage(i)` → `buildStage(GAME.engine, STAGES[i])` + `spawnBirdAtSling(GAME.engine)` | `typeof Matter !== 'undefined'` 이고 `GAME.engine !== null` | §5.1의 matter CDN `<script>`가 `game.js`보다 앞 + S3의 `init()` 안 `GAME.engine = createEngine()` |
| 3 | `loop()`가 `Engine.update(GAME.engine, STEP_MS)`를 호출 | `GAME.state === 'PLAYING'` | S7 이전에는 `startStage()` 마지막 줄 `GAME.state = 'PLAYING'` (루프 자체는 `init()`에서 1회 시작) |
| 4 | `onPointerUp` → `launchBird()`가 `Body.setVelocity(GAME.bird, v)` | `GAME.state==='PLAYING'` && `GAME.phase==='AIM'` && `GAME.dragging===true` && `GAME.bird.isStatic===false` | `phase`/`bird`: `spawnBirdAtSling()` 직후 `GAME.phase='AIM'; GAME.bird=<새 바디>`; `dragging`: `onPointerDown`; `isStatic=false`: §5.7 `launchBird()` 첫 줄 |
| 5 | `collisionStart` → `damageBody(pig)` → `sweepDestroyed()` → `checkOutcome()` → `GAME.state='CLEAR'` → `showOverlay('overlay-clear')` | `GAME.pigsLeft === 0` && `GAME.state === 'PLAYING'` | `pigsLeft` 초기값: `startStage()`의 `GAME.pigsLeft = GAME.pigs.length`; 0 도달: `sweepDestroyed()`의 재계산 줄 |

### 8.1 콜드 스타트 표 — 빈 칸 없음

| 상태/조건 | 최초 진입 시 값 | 바꾸는 주체 | 언제 실행되나 |
|---|---|---|---|
| `Matter` 전역 | 로드 전엔 undefined | 브라우저의 CDN 스크립트 실행 | `game.js` 평가 이전(§5.1 태그 순서) |
| `GAME.engine` | `null` (§5.4) | `init()`의 `GAME.engine = createEngine()` | `load` 이벤트 1회 |
| `collisionStart` 핸들러 | 미바인딩 | `init()`의 `bindCollisions(GAME.engine)` | `load` 이벤트 1회 |
| rAF 루프 | 미기동 | `init()`의 `requestAnimationFrame(loop)` | `load` 이벤트 1회 |
| `#btn-play` 리스너 | 미바인딩 | `init()`의 버튼 8개 배선 블록 | `load` 이벤트 1회 |
| `STAGES` | 배열 10개 (정적 데이터) | 없음(상수) | `stages.js` 평가 시점 |
| `GAME.state` | `'MENU'` | `startStage`→`'PLAYING'`, `pauseGame`→`'PAUSED'`, `resumeGame`→`'PLAYING'`, `finishStage`→`'CLEAR'`/`'FAIL'`, `goMenu`→`'MENU'` | 각 버튼 클릭 / 판정 시점 |
| `GAME.phase` | `'AIM'` | `launchBird`→`'FLYING'`, `resolveShot`→`'AIM'` | 발사 시 / 비행 종료 시 |
| `GAME.bird` | `null` | `spawnBirdAtSling()` 반환값 대입 | `startStage` 끝, `resolveShot` 안(남은 새 있을 때) |
| `GAME.bird.isStatic` | `true` (슬링에 고정) | `Body.setStatic(bird, false)` | `launchBird()` 첫 줄 |
| `GAME.dragging` | `false` | `onPointerDown`→true, `onPointerUp`→false | 포인터 입력 |
| `GAME.pigsLeft` | `0` | `startStage`에서 `GAME.pigs.length` 대입, 이후 `sweepDestroyed`가 재계산 | 스테이지 로드 / 매 프레임 파괴 처리 후 |
| `GAME.birdsLeft` | `0` | `startStage`에서 `stage.birds` 대입, `resolveShot`에서 1 감소 | 스테이지 로드 / 비행 종료 |
| `GAME.score` | `0` | `sweepDestroyed`(파괴), `finishStage`(잔여 새 보너스) | 파괴 시 / 클리어 시 |
| `GAME.progress` | `{unlocked:1, best:{}}` | `init()`의 `GAME.progress = loadProgress()` | `load` 이벤트 1회, 이후 `finishStage`에서 갱신·저장 |
| `AudioContext` | 미생성 | `playSfx`의 첫 호출 | 첫 클릭(게임 시작) 이후 |

---

## 9. 대안과 기각 사유 (각 항목에 부활 조건)

1. **물리 엔진 직접 구현** — 기각. 회전 강체의 충돌 해소와 적재 안정성은 실행해 보지 않고 맞출 수 없고, 구현자는 실행할 수 없다. **부활 조건:** CDN 접근이 불가능하다고 확정되면, 먼저 `matter.min.js`를 프로젝트에 동봉하는 쪽을 택하고, 그것도 불가능할 때만 원형 바디만 쓰는 축소 규칙으로 자체 구현한다.
2. **ES 모듈 / Vite+TypeScript 번들** — 기각. 빌드 단계를 실행할 수 없고, `file://`에서 `type="module"`은 CORS로 차단된다. **부활 조건:** 구현자가 명령을 실행할 수 있게 되거나, 산출물을 정적 서버로 서빙하기로 정해지면.
3. **`Matter.Render` 사용** — 기각. 궤적 점·HUD·파편이 같은 캔버스 컨텍스트에 합성돼야 하는데 `Matter.Render`는 자기 캔버스를 따로 만든다. **부활 조건:** 디버그용 뷰가 별도로 필요해지면 그때만 임시로.
4. **캔버스 안에 버튼을 그리고 히트테스트** — 기각. DOM 버튼이 코드가 적고, "우측에 위치"를 CSS 한 줄로 만족한다. **부활 조건:** 전체화면 모드에서 DOM 오버레이가 캔버스와 어긋나는 문제가 생기면.
5. **가로 스크롤 카메라** — 기각. 월드 좌표와 화면 좌표가 갈라지면 §5.5·§5.6·`drawBody`가 전부 오프셋을 타야 하고, 그것이 이 구성에서 가장 흔한 오류원이다. **부활 조건:** §6 표의 배치가 1280px 안에 들어가지 않게 되면.
6. **스테이지를 외부 JSON 파일로 분리** — 기각. `file://`에서 `fetch`는 차단된다. **부활 조건:** 정적 서버 서빙으로 바뀌면.
7. **`Composite.clear` 대신 스테이지마다 새 엔진 생성** — 기각. 엔진을 새로 만들면 `collisionStart`를 다시 걸어야 하고, 한 번 잊으면 데미지가 두 배가 되거나 아예 안 들어간다. **부활 조건:** 엔진 상태 오염이 실제로 관측되면(그때는 `bindCollisions`도 함께 옮긴다).

## 10. 리스크와 완화

| 리스크 | 증상 | 완화 |
|---|---|---|
| CDN 차단/오프라인 | 하늘색 빈 캔버스, 클릭 무반응 | §5.9의 `typeof Matter` 가드 + §3 A2의 대체 URL 한 줄 |
| 최상위 `const` 중복 선언 | 페이지 전체가 아무것도 안 함 | 상수는 `stages.js`, Matter 별칭은 `physics.js`에만 (§5 도입부) |
| 충돌 콜백 안에서 바디 제거 | 발사 직후 화면 정지 | 표시 후 일괄 제거 (§5.8) |
| 정적 바디에 속도 설정 | 새가 슬링에 붙어 안 나감 | `setStatic(false)`를 먼저 (§5.7) |
| 스테이지 데이터 초기 겹침 | 시작하자마자 구조물이 튕겨 날아감 | 좌표 규칙 4가지 (§5.11) |
| `localStorage` 예외 | 첫 로드에서 즉시 중단 | try/catch + 메모리 폴백 (§5.10) |
| 오디오 자동재생 차단 | 소리가 전혀 안 남 | `AudioContext`를 첫 클릭 이후 지연 생성 (§5.10) |
| 배열 순회 중 `splice` | 파편·바디가 하나씩 건너뛰며 남음 | 역순 순회 (§5.8) |
| 데미지 수치 미검증 | 돌이 안 부서지거나 나무가 스치기만 해도 부서짐 | 최대 발사 속도 21.6에서 역산(§12)했으나 실행 검증 불가 — 조정 지점은 `MATERIAL`의 `hp` 한 곳으로 모아 두었다 |

## 11. "완료"의 정의

구현자는 실행할 수 없다. 따라서 완료 기준은 **자기가 쓴 파일을 읽어 셀 수 있는 것**으로만 구성한다. 아래 10개가 전부 참이면 완료다.

1. 파일이 정확히 5개(`index.html`, `stages.js`, `physics.js`, `render.js`, `game.js`)이고 그 외 파일이 없다.
2. `index.html`의 `<script>` 태그가 5개이고 순서가 §5.1과 같다.
3. `STAGES.length === 10`, id가 1~10, 각 원소가 `id/name/birds/star2/star3/blocks/pigs` 7키를 갖고, `blocks`의 각 원소가 `x/y/w/h/mat/angle` 6키를 가지며 `mat`은 `wood|ice|stone` 중 하나다.
4. §5.3 심볼 표의 모든 이름이 정확히 한 번 정의돼 있고, 표에 없는 최상위 함수 선언이 없다.
5. §5.4의 상수 이름이 각각 프로젝트 전체에서 `const` 1회만 선언된다(중복 0건).
6. `Composite.remove(` 호출이 `collisionStart` 콜백 안에 **0건**이다.
7. `Body.setVelocity(GAME.bird` 의 바로 앞줄이 `Body.setStatic(GAME.bird, false)` 이다.
8. `GAME.state = ` 에 대입되는 문자열 리터럴이 `'MENU'`, `'PLAYING'`, `'PAUSED'`, `'CLEAR'`, `'FAIL'` 5종뿐이다.
9. `#btn-pause` 규칙에 `right:` 선언이 있고 `left:` 선언이 없으며, `#wrap`에 `position: relative`가 있다. (요구사항 "인게임 우측"의 판독 가능한 판정)
10. `game.js` 맨 아래에 `// DONE-CHECK` 주석 블록이 있고, 그 안에 (a) §8의 5홉 각각을 `hop N: 파일:함수명` 으로 적은 5줄, (b) §1.2의 동사 문장 1~25 각각을 `V N: 함수명` 으로 적은 25줄이 있다. 대응 함수를 적을 수 없는 항목이 있으면 그 기능은 아직 없는 것이다.

이 플랜은 실행·플레이 검증을 요구하지 않으며, 위 기준 중 어느 것도 "게임이 재미있다/정상 동작한다"를 주장하지 않는다.

## 12. Implementer contract

- **스택 고정:** Matter.js **0.19.0**, `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js`. 대체 1개: `https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js`. **기억해서 다른 버전을 쓰지 말 것** — 이 두 문자열 외의 URL은 쓰지 않는다.
- **빌드·설치·테스트 단계 없음.** `package.json`, `tsconfig.json`, 번들러 설정을 만들지 않는다. 만들면 그것은 이 플랜 위반이다.
- **명령형 완료 기준을 쓰지 않는 이유:** 구현자가 명령을 실행할 수 없으므로 §11은 전부 파일을 읽어 세는 형태다. "빌드 통과"류 문장을 산출물에 쓰지 않는다.
- **수치의 출처:** `LAUNCH_K = 0.18`은 최대 당김 120px × 0.18 = 21.6 px/step에서 왔고, `G_STEP = 0.2777`(= 1 × 0.001 × 16.666²)에서 45° 최대 사거리 ≈ 21.6² / 0.2777 ≈ 1,680px — 새총(x=210)에서 화면 오른쪽 끝(1,280)까지 필요한 약 1,070px에 여유가 있다. `MATERIAL`의 hp(13/26/52)와 `PIG_HP = 15`는 그 21.6에서 "얼음 1회, 나무 2회, 돌 3회, 돼지 1회"가 되도록 역산한 **초기값**이다. `IMPACT_MIN = 4`, `SETTLE_SPEED = 0.4`, `SETTLE_FRAMES = 45`, `FLIGHT_MAX_FRAMES = 420`은 **임의값**으로 선언한다(근거 없음). 이 수치들은 §5.4와 `MATERIAL` 두 곳에만 존재하므로, 조정이 필요해지면 그 두 곳만 고친다.
- **기각 항목을 되살릴 때는 §9의 부활 조건을 먼저 확인한다.** 조건 없이 자체 물리 구현이나 번들러를 도입하지 않는다.
- **모르면 지어내지 말고 §5의 블록을 그대로 복사한다.** §5.1~5.11의 코드 블록은 예시가 아니라 확정된 접합부다.

---

## 13. Frame deviations & habit regressions

- **매트릭스 입도가 표면에서 기능으로 흘러내렸다.** §1의 6행(궤적 예측), 11행(화면 밖 정리), 16행(시뮬레이션 정지)은 "표면"이 아니라 함수 단위다. 프레임은 요구사항×표면 입도를 유지하라고 경고하는데, 이 셋은 표면으로 묶으면 §1.2의 동사 문장이 사라져 버려서(예: "플레이필드 = build" 한 줄로 뭉개짐) 입도를 깨는 쪽을 택했다. 대가는 표가 길어진 것이다.
- **단계 목록이 사다리처럼 읽힌다.** §7은 의존 관계로 정렬했다고 적었지만 S7→S8→S9→S10 번호가 시간순으로 보인다. 실제로 S9(스테이지 2~10 저작)는 S6 이후 S7·S8과 병렬이며 그 사실을 S9 본문에 적어 두긴 했으나, 번호가 뒤에 있어 마지막 작업처럼 읽히는 것은 그대로 남았다.
- **§5가 플랜과 구현의 경계를 잠식했다.** 특히 §5.6~5.9는 함수 본문 전체다. 근거는 구현자가 실행 없이 접합부를 복원해야 한다는 것이지만, 비용은 구현자가 §5를 복사하고 사고를 멈출 위험이다. 그 위험이 가장 큰 곳은 §5.11로, 스테이지 1만 완본이고 2~10은 §6 표에서 스스로 좌표를 지어내야 하는데 좌표 규칙 4줄 외에는 안내가 없다.
- **가장 약한 섹션은 §8 hop 2다.** 통과 조건이 "CDN 로드 완료"인데, 이건 스크립트 태그 순서라는 단 하나의 사실에 걸려 있고 방어는 §5.9의 가드 한 줄뿐이다. 리뷰어라면 여기를 먼저 친다.
- **검증 불가를 수치 조정 지점의 국소화로 바꿨다.** `MATERIAL`의 hp는 실행해야만 맞는지 알 수 있는데 실행할 수 없다. 임계값을 못 맞추는 대신 조정 지점을 두 파일 두 블록으로 모았다 — 이것은 정확성 문제의 해결이 아니라 수리 비용의 축소다.
- **스타일이 요구하는 자기심문은 이 절 첫머리가 아니라 여기 끝에 넣었다.** 프레임/스타일 논증은 헤더 한 줄로 제한한다는 규칙과 충돌해서다. 그 심문의 내용: 이 과제에서 내 반사적 습관은 "물리 엔진 vs 직접 구현" 같은 선택지 토론으로 문서를 채우는 것이었고(§9로 7줄만 남겼다), 실제로 이 과제의 위험은 선택이 아니라 누락이었다.
