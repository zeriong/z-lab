# 구현 계획서 — 웹 브라우저 앵그리버드 (10 스테이지 슬링샷 물리 게임)

> 구현자에게: 이 문서 **하나만** 보고 게임 전체를 구현한다. 여기에 없는 요구사항은 없다.
> 설치·빌드·실행·테스트는 할 수 없다. 코드를 실행해 확인할 수 없으므로 **이 문서의 이름·숫자·순서를 글자 그대로** 따르는 것이 가장 중요하다.
> 문서가 애매하면 이 문서와 모순되지 않는 **가장 단순한 방법**을 고르고, 그 자리에 한 줄 주석으로 남긴다.

---

## 0. 한눈에 보기

- 산출물 위치(게임 루트): `/Users/jeonjelyong/WorkSpace/Z-Work/z-lab/plan-smith-lab/model-bump/tco/planner-swap/informed-baseline/game/`
  - 작업 지시에서 다른 출력 폴더를 명시했다면 그 폴더를 게임 루트로 쓰고, 그 아래 구조는 동일하게 유지한다.
- 실행 방법(나중에 사람이 확인): `game/index.html` 파일을 브라우저에서 더블클릭으로 연다(`file://`). 서버가 없어도 동작해야 한다.
- 기술: 순수 HTML + CSS + 바닐라 JavaScript(ES2017 수준), Canvas 2D, **물리 엔진 직접 구현**, 외부 라이브러리/이미지/폰트/사운드 없음.
- 구성 파일 13개(아래 3장). 파일당 Write 1회를 원칙으로 한다.

### 0.1 절대 규칙 (어기면 게임이 아예 안 뜬다)

1. `import` / `export` / `<script type="module">` **금지**. (`file://`에서 모듈 로딩이 CORS로 막힌다.) 모든 스크립트는 일반 `<script src>`.
2. `fetch` / `XMLHttpRequest` / JSON 파일 로딩 **금지**. 스테이지 데이터는 JS 파일 안의 객체로 둔다.
3. `http://`, `https://` 로 시작하는 외부 리소스(CDN, 웹폰트, 이미지) **금지**. 그림은 전부 Canvas 도형으로 그린다.
4. 각 JS 파일은 즉시실행함수(IIFE)로 감싸고, 첫 줄에서 `window.AB = window.AB || {};` 를 한 뒤 **`AB.모듈명`에만** 공개 API를 붙인다. 파일 최상위에 `const`/`let`/`function` 전역을 만들지 않는다(파일 간 이름 충돌 방지).
5. 공개 함수·필드 이름은 12장 "모듈 계약표"와 **정확히 일치**시킨다. 다른 모듈의 함수를 호출할 때는 반드시 계약표에 있는 이름만 쓴다.
6. 배열을 순회하면서 그 배열에서 원소를 제거하지 않는다. 제거 대상은 먼저 별도 배열에 모은 뒤 순회가 끝나고 제거한다.
7. `requestAnimationFrame` 루프는 `AB.Game.init`에서 **딱 한 번**만 시작한다. 스테이지 재시작 때 루프를 새로 만들지 않는다.

### 0.2 범위

포함:
- 메인 화면(게임 시작 / 스테이지 선택), 스테이지 선택(10개, 순차 해금, 별 표시)
- 새총 드래그 조준 → 발사, 궤적 예측 점선, 직전 비행 궤적 표시
- 중력·충돌·마찰·반발, 충격량 기반 피해 → 블록/돼지 파괴, 연쇄 붕괴
- 재질 3종(나무/돌/얼음), 돼지 3종(소/중/대), 새 3종(빨강 기본 / 노랑 가속 / 검정 폭탄)
- 점수, 남은 새 보너스, 별 1~3개, 최고 점수 저장(localStorage)
- 인게임 **우측 상단 일시정지 버튼** → 오버레이(계속하기 / **다시하기** / **메인으로**)
- 클리어/실패 오버레이, 다음 스테이지 이동

제외(만들지 않는다): 카메라 이동·줌, 블록 회전 물리, 사운드, 이미지 에셋, 레벨 에디터, 멀티플레이, 모바일 전용 레이아웃(화면 비율 맞춤 스케일링만 한다).

---

## 1. 핵심 설계 결정 (요구사항의 "핵심 질문"에 대한 답)

| 질문 | 결정 | 이유 |
|---|---|---|
| 물리 엔진 | **직접 구현**. 원(circle) + 회전 없는 축정렬 사각형(AABB). 반복 충격량 해결기 + 위치 보정 + 수면(sleep). | 설치가 불가능하므로 Matter.js 등을 가져올 수 없다(CDN 금지 규칙 포함). 회전 강체(OBB/SAT/각운동량)는 실행 없이 작성하면 부호 오류·폭주 위험이 크다. AABB+원은 공식이 단순해 검증 없이도 안정적으로 쓸 수 있다. 원은 **그릴 때만** 굴러가듯 회전시켜 느낌을 살린다. |
| 렌더링 | **Canvas 2D**, 논리 해상도 1280×720 고정, CSS로 16:9 비율 유지하며 창에 맞춤. UI 버튼은 **DOM 오버레이**. | Canvas 2D는 의존성이 없다. 버튼을 DOM으로 두면 클릭 판정을 직접 구현할 필요가 없다. |
| 월드/카메라 | 월드 = 화면(1280×720), 카메라 없음. 지면 윗면 y=640. | 스크롤이 없으면 좌표 변환 버그가 사라진다. 모든 구조물은 x 700~1200 안에 둔다. |
| 스테이지 데이터 | `AB.LEVELS` 배열(10개)에 블록·돼지·새 목록을 **중심좌표**로 저장. 5장에 모든 좌표를 표로 제공. | 좌표를 계획서에서 미리 검산해 두었으므로 그대로 옮기기만 하면 된다. |
| 전환 방식 | `AB.Game.startLevel(i)`가 월드를 통째로 새로 만든다(다시하기 = 같은 i로 다시 호출). | 상태 초기화를 한 곳으로 모아 "다시하기" 잔여 상태 버그를 막는다. |
| 슬링샷 입력 | Pointer Events. 새 근처(60px)를 누르면 드래그 시작, 최대 100px 당김, 놓으면 `당김벡터 × 10` 속도로 발사. 12px 미만이면 취소. | 마우스·터치 공용. |
| 궤적 예측 | 드래그 중 해석해 `p(t) = p0 + v0·t + ½·g·t²` 로 점 30개(0.05초 간격) 표시. 공기저항이 없으므로 실제 비행과 거의 일치. | 계산이 단순하고 정확하다. |
| 파괴 규칙 | 접촉 순간의 접근 속도(closing speed)로 피해 계산 → HP 0 이하면 제거. 제거 시 월드 전체를 깨워 연쇄 붕괴. | 속도 기반은 이해·조정이 쉽다. |
| 클리어/실패 | 돼지 0마리 → 1.2초 후 클리어. 새를 다 쓰고 월드가 멈췄는데 돼지가 남으면 실패. | 앵그리버드와 같은 규칙. |
| 상태 머신 | `MAIN`, `STAGE_SELECT`, `PLAYING`, `PAUSED`, `CLEARED`, `FAILED` 6개 + 인게임 턴 단계 4개(`ready`/`aiming`/`flying`/`settling`). | 7장 참조. |
| 완료 기준 | 15장(정적 자기검증 + 사람이 수행할 수용 시나리오). | 구현자는 실행이 불가하므로 두 층으로 나눈다. |

---

## 2. 좌표계와 단위

- 원점은 캔버스 좌상단, x는 오른쪽 +, **y는 아래쪽 +**.
- 길이 단위 = 논리 픽셀(px), 시간 = 초(s), 속도 = px/s, 중력 = +900 px/s² (아래 방향).
- 모든 물체의 `x`, `y`는 **중심** 좌표. 사각형은 `w`, `h`(전체 폭·높이), 원은 `r`(반지름).
- 지면: 윗면 y=640. 물리적으로는 중심 (640, 680), 크기 2400×80 인 정적 사각형.
- 화면 좌표 → 월드 좌표 변환(입력 처리 시 매 이벤트마다):
  `rect = canvas.getBoundingClientRect()`, `worldX = (clientX − rect.left) × 1280 / rect.width`, `worldY = (clientY − rect.top) × 720 / rect.height`.

---

## 3. 파일 구조와 로드 순서

```
game/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── config.js      AB.CONFIG, AB.MATERIALS, AB.PIG_TYPES, AB.BIRD_TYPES
    ├── levels.js      AB.LEVELS (10개)
    ├── physics.js     AB.Physics
    ├── effects.js     AB.Effects (파편·점수 텍스트·폭발 링)
    ├── storage.js     AB.Storage (진행도 저장)
    ├── slingshot.js   AB.Slingshot (조준·발사·궤적 예측)
    ├── render.js      AB.Render (캔버스 그리기)
    ├── ui.js          AB.UI (DOM 오버레이)
    ├── input.js       AB.Input (포인터·키보드 → Game으로 전달)
    ├── game.js        AB.Game (상태 머신·게임 루프·규칙)
    └── main.js        부트스트랩
```

`index.html`의 `</body>` 직전에 위 순서 그대로(config → levels → physics → effects → storage → slingshot → render → ui → input → game → main) `<script src="js/파일명.js"></script>` 11줄을 둔다.
모듈 간 호출은 전부 함수 **내부**에서만 일어나므로, 최상위 실행 시점에 다른 모듈을 참조하지 않으면 순서 문제는 없다. `main.js`만 마지막에 `AB.Game.init`을 호출한다.

---

## 4. config.js — 상수 전체 목록

`AB.CONFIG` 객체에 아래 키를 **이 이름 그대로** 정의한다. 다른 파일은 숫자를 직접 쓰지 말고 `AB.CONFIG.키`로 참조한다(5장 레벨 좌표만 예외).

| 키 | 값 | 의미 |
|---|---|---|
| WORLD_W | 1280 | 월드/캔버스 폭 |
| WORLD_H | 720 | 월드/캔버스 높이 |
| GROUND_Y | 640 | 지면 윗면 y |
| GROUND_RESTITUTION | 0.2 | 지면 반발계수 |
| GROUND_FRICTION | 0.8 | 지면 마찰계수 |
| GRAVITY | 900 | 중력 가속도(px/s², +y) |
| FIXED_DT | 1/60 | 고정 물리 스텝(초) |
| MAX_STEPS_PER_FRAME | 5 | 프레임당 최대 고정 스텝 수 |
| SUBSTEPS | 4 | 고정 스텝 1회를 몇 번으로 쪼갤지 (h = FIXED_DT/4) |
| SOLVER_ITERATIONS | 8 | 서브스텝마다 속도 해결 반복 횟수 |
| POSITION_SLOP | 0.5 | 허용 겹침(px) |
| POSITION_PERCENT | 0.5 | 위치 보정 비율 |
| RESTITUTION_MIN_SPEED | 40 | 이보다 느린 충돌은 반발 0 |
| MAX_SPEED | 2000 | 속도 상한(px/s) |
| SLEEP_SPEED | 10 | 이보다 느리면 수면 타이머 증가 |
| SLEEP_TIME | 0.6 | 이 시간 동안 느리면 수면 |
| WAKE_SPEED | 15 | 이보다 빠른 물체가 닿으면 깨움 |
| WAKE_MARGIN | 2 | 근접 깨우기 AABB 확장(px) |
| DAMAGE_MIN_SPEED | 100 | 이보다 느린 충돌은 피해 없음 |
| DAMAGE_FACTOR | 0.1 | 피해 = (속도 − 100) × 0.1 × 질량계수 |
| DAMAGE_MASS_MIN | 0.25 | 질량계수 하한 |
| DAMAGE_MASS_MAX | 2.0 | 질량계수 상한 |
| OUT_LEFT | -200 | x가 이보다 작으면 월드 밖 |
| OUT_RIGHT | 1480 | x가 이보다 크면 월드 밖 |
| OUT_BOTTOM | 920 | y가 이보다 크면 월드 밖 |
| SLING_X | 220 | 새총 앵커 x (새가 놓이는 위치) |
| SLING_Y | 500 | 새총 앵커 y |
| SLING_MAX_PULL | 100 | 최대 당김 거리 |
| SLING_MIN_PULL | 12 | 이보다 짧으면 발사 취소 |
| SLING_GRAB_RADIUS | 60 | 앵커에서 이 거리 안을 눌러야 드래그 시작 |
| LAUNCH_SCALE | 10 | 발사 속도 = 당김벡터 × 10 (최대 1000px/s) |
| TRAJ_DOT_COUNT | 30 | 궤적 예측 점 개수 |
| TRAJ_DOT_INTERVAL | 0.05 | 궤적 예측 점 시간 간격(초) |
| BIRD_REST_SPEED | 20 | 새가 이보다 느리면 "멈춤" 누적 |
| BIRD_REST_TIME | 1.0 | 멈춤이 이만큼 누적되면 턴 종료 |
| BIRD_MAX_FLIGHT_TIME | 10 | 발사 후 최대 비행 시간 |
| SETTLE_SPEED | 25 | 모든 깨어있는 물체가 이보다 느리면 안정 |
| SETTLE_MIN_TIME | 0.5 | 안정 판정 최소 대기 |
| SETTLE_MAX_TIME | 4 | 안정 판정 최대 대기 |
| CLEAR_DELAY | 1.2 | 돼지 전멸 후 클리어 화면까지 지연 |
| BIRD_BONUS | 10000 | 클리어 시 남은 새 1마리당 보너스 |
| DASH_MULTIPLIER | 1.8 | 노랑 새 가속 배율 |
| BOMB_RADIUS | 160 | 폭발 반경 |
| BOMB_IMPULSE | 1500 | 폭발 충격 (속도변화 = 1500 × 강도 / 질량) |
| BOMB_MAX_DV | 1200 | 폭발 속도변화 상한 |
| BOMB_DAMAGE | 200 | 폭발 피해 (× 강도) |
| BLACK_FUSE_TIME | 1.5 | 검정 새가 처음 닿은 뒤 자동 폭발까지 |
| TRAIL_INTERVAL_STEPS | 3 | 비행 궤적 점을 몇 스텝마다 기록할지 |
| TRAIL_MAX_POINTS | 150 | 비행 궤적 점 최대 개수 |
| STORAGE_KEY | 'angrybirds-progress-v1' | localStorage 키 |

`AB.MATERIALS` (블록 재질):

| 키 | density | hp | restitution | friction | score | fill | stroke |
|---|---|---|---|---|---|---|---|
| wood | 1.0 | 60 | 0.2 | 0.6 | 500 | '#C8873E' | '#7A4B1C' |
| stone | 2.5 | 150 | 0.1 | 0.7 | 800 | '#9AA0A6' | '#5F6368' |
| ice | 0.7 | 30 | 0.15 | 0.2 | 300 | 'rgba(173,226,255,0.75)' | '#6FB7E0' |

`AB.PIG_TYPES` (모두 원):

| 키 | radius | hp | density | restitution | friction | score |
|---|---|---|---|---|---|---|
| small | 16 | 20 | 0.6 | 0.3 | 0.5 | 5000 |
| normal | 20 | 30 | 0.6 | 0.3 | 0.5 | 5000 |
| big | 26 | 60 | 0.6 | 0.3 | 0.5 | 5000 |

`AB.BIRD_TYPES` (모두 원, HP 무한):

| 키 | radius | density | restitution | friction | color | ability | 표시 이름 |
|---|---|---|---|---|---|---|---|
| red | 18 | 3.0 | 0.35 | 0.5 | '#D62828' | 'none' | '빨간 새' |
| yellow | 16 | 3.0 | 0.35 | 0.5 | '#F7C325' | 'dash' | '노란 새' |
| black | 21 | 4.0 | 0.35 | 0.5 | '#2B2B2B' | 'bomb' | '검은 새' |

(표시 이름 필드명: `label`)

질량 공식(physics.js에서 계산): 사각형 `mass = density × w × h / 1000`, 원 `mass = density × π × r² / 1000`. 참고값: 나무 기둥(20×100) 2.0, 돌 기둥 5.0, 얼음 기둥 1.4, 보통 돼지 0.75, 빨간 새 3.05, 검은 새 5.54.

---

## 5. levels.js — 스테이지 데이터 10개

### 5.1 스키마

`AB.LEVELS`는 길이 10의 배열. 각 원소:

- `name`: 문자열(스테이지 이름)
- `birds`: 새 타입 문자열 배열, 발사 순서대로 (예: `['red','yellow','red']`)
- `blocks`: `{ material, x, y, w, h }` 배열 (`material`은 'wood' | 'stone' | 'ice', x·y는 중심)
- `pigs`: `{ type, x, y }` 배열 (`type`은 'small' | 'normal' | 'big', x·y는 중심)

### 5.2 배치 규칙(이미 검산됨 — 숫자를 바꾸지 말 것)

- 위아래로 쌓인 물체는 정확히 맞닿아 있다(겹침 0). 옆으로 나란한 물체 사이에는 최소 14px 간격이 있다.
- 기둥 20×100, 보 120×20, 상자 40×40, 긴 보 220×20 / 240×20.
- 층 k의 기둥 중심 y = 590 − 120(k−1), 보 중심 y = 530 − 120(k−1).

### 5.3 스테이지 표

아래 표의 값을 그대로 옮긴다. (표기: 재질 x y w h)

**스테이지 1 — name: '첫 발사'**, birds: red, red, red

| # | material | x | y | w | h |
|---|---|---|---|---|---|
| 1 | wood | 850 | 590 | 20 | 100 |
| 2 | wood | 950 | 590 | 20 | 100 |
| 3 | wood | 900 | 530 | 120 | 20 |

pigs: normal (900, 500)

**스테이지 2 — name: '두 채의 오두막'**, birds: red, red, red

| # | material | x | y | w | h |
|---|---|---|---|---|---|
| 1 | wood | 770 | 590 | 20 | 100 |
| 2 | wood | 870 | 590 | 20 | 100 |
| 3 | wood | 820 | 530 | 120 | 20 |
| 4 | wood | 990 | 590 | 20 | 100 |
| 5 | wood | 1090 | 590 | 20 | 100 |
| 6 | wood | 1040 | 530 | 120 | 20 |

pigs: normal (820, 500), normal (1040, 620)

**스테이지 3 — name: '얼음 성'**, birds: red, red, red

| # | material | x | y | w | h |
|---|---|---|---|---|---|
| 1 | ice | 850 | 590 | 20 | 100 |
| 2 | ice | 950 | 590 | 20 | 100 |
| 3 | ice | 900 | 530 | 120 | 20 |
| 4 | ice | 850 | 470 | 20 | 100 |
| 5 | ice | 950 | 470 | 20 | 100 |
| 6 | ice | 900 | 410 | 120 | 20 |
| 7 | wood | 1060 | 620 | 40 | 40 |
| 8 | wood | 1060 | 580 | 40 | 40 |

pigs: normal (900, 620), normal (900, 500), small (1060, 544)

**스테이지 4 — name: '나무 탑'**, birds: red, yellow, red

| # | material | x | y | w | h |
|---|---|---|---|---|---|
| 1 | wood | 780 | 620 | 40 | 40 |
| 2 | wood | 780 | 580 | 40 | 40 |
| 3 | wood | 910 | 590 | 20 | 100 |
| 4 | wood | 1010 | 590 | 20 | 100 |
| 5 | wood | 960 | 530 | 120 | 20 |
| 6 | wood | 910 | 470 | 20 | 100 |
| 7 | wood | 1010 | 470 | 20 | 100 |
| 8 | wood | 960 | 410 | 120 | 20 |

pigs: normal (960, 620), normal (960, 500), normal (960, 380)

**스테이지 5 — name: '돌벽'**, birds: red, yellow, red, yellow

| # | material | x | y | w | h |
|---|---|---|---|---|---|
| 1 | stone | 760 | 620 | 40 | 40 |
| 2 | stone | 760 | 580 | 40 | 40 |
| 3 | stone | 760 | 540 | 40 | 40 |
| 4 | wood | 870 | 590 | 20 | 100 |
| 5 | wood | 970 | 590 | 20 | 100 |
| 6 | wood | 920 | 530 | 120 | 20 |
| 7 | stone | 1060 | 590 | 20 | 100 |
| 8 | stone | 1160 | 590 | 20 | 100 |
| 9 | wood | 1110 | 530 | 120 | 20 |

pigs: normal (920, 620), normal (1110, 500), small (1110, 624)

**스테이지 6 — name: '폭탄 새'**, birds: black, red, black

| # | material | x | y | w | h |
|---|---|---|---|---|---|
| 1 | wood | 770 | 590 | 20 | 100 |
| 2 | wood | 870 | 590 | 20 | 100 |
| 3 | wood | 820 | 530 | 120 | 20 |
| 4 | stone | 950 | 590 | 20 | 100 |
| 5 | stone | 1050 | 590 | 20 | 100 |
| 6 | stone | 1000 | 530 | 120 | 20 |
| 7 | wood | 1000 | 500 | 40 | 40 |

pigs: normal (820, 500), big (1000, 614), small (1000, 464)

**스테이지 7 — name: '3층 탑'**, birds: red, yellow, black, red

| # | material | x | y | w | h |
|---|---|---|---|---|---|
| 1 | stone | 820 | 620 | 40 | 40 |
| 2 | wood | 950 | 590 | 20 | 100 |
| 3 | wood | 1050 | 590 | 20 | 100 |
| 4 | wood | 1000 | 530 | 120 | 20 |
| 5 | ice | 950 | 470 | 20 | 100 |
| 6 | ice | 1050 | 470 | 20 | 100 |
| 7 | ice | 1000 | 410 | 120 | 20 |
| 8 | wood | 950 | 350 | 20 | 100 |
| 9 | wood | 1050 | 350 | 20 | 100 |
| 10 | wood | 1000 | 290 | 120 | 20 |

pigs: normal (1000, 620), normal (1000, 500), normal (1000, 380), small (1000, 264)

**스테이지 8 — name: '쌍둥이 탑과 다리'**, birds: red, yellow, black, yellow

| # | material | x | y | w | h |
|---|---|---|---|---|---|
| 1 | wood | 790 | 590 | 20 | 100 |
| 2 | wood | 890 | 590 | 20 | 100 |
| 3 | wood | 840 | 530 | 120 | 20 |
| 4 | wood | 790 | 470 | 20 | 100 |
| 5 | wood | 890 | 470 | 20 | 100 |
| 6 | wood | 840 | 410 | 120 | 20 |
| 7 | stone | 1050 | 590 | 20 | 100 |
| 8 | stone | 1150 | 590 | 20 | 100 |
| 9 | stone | 1100 | 530 | 120 | 20 |
| 10 | wood | 1050 | 470 | 20 | 100 |
| 11 | wood | 1150 | 470 | 20 | 100 |
| 12 | wood | 1100 | 410 | 120 | 20 |
| 13 | wood | 970 | 390 | 220 | 20 |

pigs: normal (840, 620), normal (1100, 620), normal (1100, 500), normal (970, 360)

**스테이지 9 — name: '벙커'**, birds: black, black, yellow, red

| # | material | x | y | w | h |
|---|---|---|---|---|---|
| 1 | stone | 830 | 590 | 20 | 100 |
| 2 | stone | 930 | 590 | 20 | 100 |
| 3 | ice | 880 | 530 | 120 | 20 |
| 4 | stone | 1030 | 590 | 20 | 100 |
| 5 | stone | 1130 | 590 | 20 | 100 |
| 6 | ice | 1080 | 530 | 120 | 20 |
| 7 | wood | 880 | 500 | 40 | 40 |
| 8 | wood | 1080 | 500 | 40 | 40 |
| 9 | stone | 980 | 470 | 240 | 20 |

pigs: normal (880, 620), normal (1080, 620), small (980, 624), big (980, 434)

**스테이지 10 — name: '돼지 요새'**, birds: red, yellow, black, yellow, black

| # | material | x | y | w | h |
|---|---|---|---|---|---|
| 1 | stone | 720 | 620 | 40 | 40 |
| 2 | stone | 720 | 580 | 40 | 40 |
| 3 | wood | 810 | 590 | 20 | 100 |
| 4 | wood | 910 | 590 | 20 | 100 |
| 5 | wood | 860 | 530 | 120 | 20 |
| 6 | ice | 810 | 470 | 20 | 100 |
| 7 | ice | 910 | 470 | 20 | 100 |
| 8 | ice | 860 | 410 | 120 | 20 |
| 9 | wood | 980 | 620 | 40 | 40 |
| 10 | ice | 980 | 580 | 40 | 40 |
| 11 | stone | 1050 | 590 | 20 | 100 |
| 12 | stone | 1150 | 590 | 20 | 100 |
| 13 | stone | 1100 | 530 | 120 | 20 |
| 14 | wood | 1050 | 470 | 20 | 100 |
| 15 | wood | 1150 | 470 | 20 | 100 |
| 16 | wood | 1100 | 410 | 120 | 20 |
| 17 | wood | 1050 | 350 | 20 | 100 |
| 18 | wood | 1150 | 350 | 20 | 100 |
| 19 | wood | 1100 | 290 | 120 | 20 |

pigs: normal (860, 620), small (860, 504), big (1100, 614), normal (1100, 380), small (1100, 264)

요약 검산표(옮긴 뒤 개수를 대조할 것):

| 스테이지 | 블록 수 | 돼지 수 | 새 수 |
|---|---|---|---|
| 1 | 3 | 1 | 3 |
| 2 | 6 | 2 | 3 |
| 3 | 8 | 3 | 3 |
| 4 | 8 | 3 | 3 |
| 5 | 9 | 3 | 4 |
| 6 | 7 | 3 | 3 |
| 7 | 10 | 4 | 4 |
| 8 | 13 | 4 | 4 |
| 9 | 9 | 4 | 4 |
| 10 | 19 | 5 | 5 |

---

## 6. physics.js — 물리 엔진 명세

### 6.1 바디(body) 객체 필드

`AB.Physics.createBody(def)`가 아래 필드를 모두 가진 객체를 만든다.

| 필드 | 타입 | 설명 |
|---|---|---|
| id | number | 월드 내 고유 번호(모듈 내부 카운터로 1부터 증가) |
| shape | 'box' \| 'circle' | 형태 |
| x, y | number | 중심 |
| w, h | number | box는 def값, circle은 둘 다 2r (AABB 계산용) |
| r | number | circle 반지름 (box는 0) |
| vx, vy | number | 속도, 초기 0 |
| mass | number | 4장 질량 공식. 정적이면 0 |
| invMass | number | 1/mass. 정적이면 0 |
| restitution, friction | number | def값 |
| isStatic | boolean | 지면만 true |
| sleeping | boolean | 초기 false (Game이 레벨 로딩 후 true로 바꿈) |
| sleepTimer | number | 초기 0 |
| kind | 'ground' \| 'block' \| 'pig' \| 'bird' | 종류 |
| material | string \| null | 블록 재질 키 |
| subtype | string \| null | 돼지 타입 키 또는 새 타입 키 |
| hp, maxHp | number | def.hp가 없으면 Infinity |
| pendingDamage | number | 이번 스텝에 쌓인 피해, 초기 0 |
| alive | boolean | 초기 true |
| touched | boolean | 무언가와 한 번이라도 접촉했는지(새의 능력 판정용), 초기 false |
| angle | number | **그리기 전용** 회전각(원만 사용), 초기 0 |

`def` 필드: `shape, x, y, w, h, r, density, restitution, friction, isStatic, kind, material, subtype, hp`. (없는 값은 적절히 기본값: w/h/r 0, isStatic false, material/subtype null, hp Infinity)

### 6.2 월드와 보조 함수

- `createWorld()` → `{ bodies: [] }`
- `addBody(world, body)` → bodies에 push
- `removeBody(world, body)` → bodies에서 찾아 splice (없으면 무시)
- `speedOf(body)` → √(vx²+vy²)
- `wakeBody(body)` → sleeping=false, sleepTimer=0 (정적이면 무시)
- `wakeAll(world)` → 모든 비정적 바디에 wakeBody
- 내부 함수 `effInv(body)` → isStatic 또는 sleeping이면 0, 아니면 invMass
- 내부 함수 `getAABB(body)` → { minX: x−w/2, maxX: x+w/2, minY: y−h/2, maxY: y+h/2 } (원도 w=h=2r이므로 같은 식)

### 6.3 충돌 검출 — 모든 접촉의 법선 n은 **A에서 B를 향하는 단위벡터**, pen은 겹친 깊이(>0)

접촉 객체: `{ a, b, nx, ny, pen }`. 겹치지 않으면 null.

**사각형 A – 사각형 B**
1. dx = B.x − A.x, px = (A.w/2 + B.w/2) − |dx|. px ≤ 0 이면 null.
2. dy = B.y − A.y, py = (A.h/2 + B.h/2) − |dy|. py ≤ 0 이면 null.
3. px < py 이면 n = (sign(dx), 0), pen = px. 아니면 n = (0, sign(dy)), pen = py. (sign(0)은 +1로 취급)

**원 A – 원 B**
1. dx = B.x − A.x, dy = B.y − A.y, d = √(dx²+dy²). d ≥ A.r + B.r 이면 null.
2. d > 0.0001 이면 n = (dx/d, dy/d), 아니면 n = (0, 1). pen = A.r + B.r − d.

**원 C – 사각형 R** (법선은 원 → 사각형 방향으로 계산)
1. 사각형 범위: left = R.x − R.w/2, right = R.x + R.w/2, top = R.y − R.h/2, bottom = R.y + R.h/2.
2. 가장 가까운 점 q = (clamp(C.x, left, right), clamp(C.y, top, bottom)).
3. 원 중심이 사각형 밖(q ≠ 원 중심)일 때: dx = q.x − C.x, dy = q.y − C.y, d = √(dx²+dy²). d ≥ C.r 이면 null. n = (dx/d, dy/d), pen = C.r − d.
4. 원 중심이 사각형 안일 때: 네 면까지 거리 dL = C.x − left, dR = right − C.x, dT = C.y − top, dB = bottom − C.y 중 최소를 고른다.
   - dL 최소 → n = (+1, 0), pen = C.r + dL
   - dR 최소 → n = (−1, 0), pen = C.r + dR
   - dT 최소 → n = (0, +1), pen = C.r + dT
   - dB 최소 → n = (0, −1), pen = C.r + dB
5. 호출 쌍이 (A=사각형, B=원) 순서면, (원, 사각형)으로 계산한 뒤 **n의 부호를 뒤집어** A→B 방향으로 맞춘다. a/b 필드도 원래 A/B로 채운다.

디스패치 함수 `collide(A, B)`: 두 shape 조합에 따라 위 셋 중 하나를 호출해 접촉 또는 null 반환.

### 6.4 `step(world, dt)` — 고정 스텝 1회

h = dt / SUBSTEPS. 아래 [서브스텝]을 SUBSTEPS번 반복한 뒤 [스텝 후처리]를 1회 한다.

**[서브스텝] (순서 엄수)**

0. **근접 깨우기**: 깨어있는 비정적 바디 중 speedOf > WAKE_SPEED 인 각 바디 M에 대해, 모든 잠든 바디 S와 AABB를 비교한다. M의 AABB를 사방으로 WAKE_MARGIN만큼 넓힌 것과 S의 AABB가 겹치면 wakeBody(S). (받침이 옆으로 밀려 빠질 때 위의 물체가 공중에 떠 있지 않게 하기 위함)
1. **중력**: 깨어있는 비정적 바디마다 vy += GRAVITY × h.
2. **접촉 수집**: 모든 쌍 (i < j)에 대해
   - 둘 다 "움직일 수 없음"(isStatic 또는 sleeping)이면 건너뛴다.
   - c = collide(A, B). null이면 건너뛴다.
   - 상대속도 rv = (B.vx − A.vx, B.vy − A.vy), vn = rv·n, 접근속도 s = max(0, −vn).
   - **접촉 깨우기**: 한쪽이 잠들어 있고 다른 쪽이 깨어있는 비정적 바디이면, s > WAKE_SPEED 이거나 깨어있는 쪽의 speedOf > WAKE_SPEED 일 때 잠든 쪽을 wakeBody.
   - **새 접촉 표시**: A 또는 B의 kind가 'bird'면 그 바디의 touched = true.
   - **피해 기록**: A, B 각각에 대해(자신 = X, 상대 = O) X.hp가 유한할 때만:
     - s ≤ DAMAGE_MIN_SPEED 이면 피해 없음.
     - 아니면 base = (s − DAMAGE_MIN_SPEED) × DAMAGE_FACTOR.
     - 질량계수 = O가 정적이면 1.0, 아니면 clamp(O.mass / X.mass, DAMAGE_MASS_MIN, DAMAGE_MASS_MAX).
     - X.pendingDamage += base × 질량계수.
   - 접촉 c를 contacts 배열에 넣는다.
3. **속도 해결**: SOLVER_ITERATIONS번 반복, 매번 contacts 전체에 대해:
   - iA = effInv(A), iB = effInv(B). iA + iB = 0 이면 건너뛴다.
   - rv, vn = rv·n 을 **현재 속도로 다시** 계산. vn ≥ 0 이면(멀어지는 중) 건너뛴다.
   - e = (−vn < RESTITUTION_MIN_SPEED) ? 0 : min(A.restitution, B.restitution).
   - j = −(1 + e) × vn / (iA + iB).
   - A.v −= j·n·iA, B.v += j·n·iB. (A는 빼고 B는 더한다)
   - 마찰: rv를 다시 계산. 접선 t = rv − (rv·n)·n, tl = |t|. tl < 0.000001 이면 마찰 생략. 아니면 t /= tl, vt = rv·t, jt = −vt / (iA + iB), mu = √(A.friction × B.friction), jt를 [−mu·j, +mu·j]로 자른다. A.v −= jt·t·iA, B.v += jt·t·iB.
4. **위치 적분**: 깨어있는 비정적 바디마다, 속력이 MAX_SPEED를 넘으면 방향 유지한 채 MAX_SPEED로 줄이고, x += vx × h, y += vy × h.
5. **위치 보정**: contacts마다 iA, iB 다시 구하고 합이 0이면 건너뛴다. corr = max(pen − POSITION_SLOP, 0) / (iA + iB) × POSITION_PERCENT. A.pos −= n·corr·iA, B.pos += n·corr·iB.

**[스텝 후처리]**

- **수면**: 깨어있는 비정적 바디마다 speedOf < SLEEP_SPEED 이면 sleepTimer += dt, 아니면 sleepTimer = 0. sleepTimer ≥ SLEEP_TIME 이면 sleeping = true, vx = vy = 0, sleepTimer = 0.
- **원 회전(그리기용)**: 깨어있는 원 바디마다 angle += (vx / r) × dt.
- 이 함수는 바디를 제거하지 않는다. 피해 적용·파괴·월드 밖 제거는 Game이 한다.

### 6.5 `explode(world, x, y, radius, impulse, maxDv)` → `[{ body, strength }]`

비정적 바디마다: dx = body.x − x, dy = body.y − y, d = √(dx²+dy²). d ≥ radius면 건너뛴다.
strength = 1 − d/radius. 방향 = d > 0.001 ? (dx/d, dy/d) : (0, −1). dv = min(impulse × strength / body.mass, maxDv).
wakeBody(body), body.vx += 방향x × dv, body.vy += 방향y × dv. 결과 배열에 {body, strength} 추가 후 반환.
(피해는 Game이 이 결과로 준다.)

### 6.6 안정성을 위해 지켜야 할 것

- 레벨 로딩 직후 모든 블록·돼지는 **잠든 상태**로 시작한다(구조물이 혼자 흔들리거나 무너지지 않게). 새가 닿으면 깨어난다.
- 바디가 파괴되면 Game이 `wakeAll`을 호출해 위에 얹혀 있던 물체가 떨어지게 한다.
- 가만히 놓인 물체 사이의 접근속도는 약 4px/s로 DAMAGE_MIN_SPEED(100)보다 훨씬 작아 저절로 피해를 입지 않는다.
- 참고 계산: 최대 속도(약 1000px/s)의 빨간 새가 나무 기둥을 치면 피해 ≈ 114 → 파괴(나무 HP 60). 돌 기둥은 ≈ 46(HP 150, 세 번 필요). 보통 돼지가 100px 떨어져 땅에 닿으면 ≈ 32 → 사망(HP 30). 60px 낙하는 생존.

---

## 7. game.js — 상태 머신과 게임 규칙

### 7.1 전역 상태(화면 상태)

```
MAIN ──게임 시작──────────────▶ PLAYING
MAIN ──스테이지 선택──────────▶ STAGE_SELECT ──스테이지 버튼──▶ PLAYING
STAGE_SELECT ──뒤로──────────▶ MAIN
PLAYING ──일시정지 버튼/ESC/탭 숨김──▶ PAUSED
PAUSED ──계속하기/ESC───────▶ PLAYING
PAUSED ──다시하기───────────▶ PLAYING (같은 스테이지 처음부터)
PAUSED ──메인으로───────────▶ MAIN
PLAYING ──돼지 전멸 + 1.2초──▶ CLEARED
PLAYING ──새 소진 + 안정 + 돼지 남음──▶ FAILED
CLEARED ──다음 스테이지(마지막 제외)──▶ PLAYING (다음 스테이지)
CLEARED / FAILED ──다시하기──▶ PLAYING (같은 스테이지)
CLEARED / FAILED ──메인으로──▶ MAIN
```

`setState(s)`: `AB.Game.state = s` → `AB.UI.showScreen(s)` → s가 'STAGE_SELECT'이면 `AB.UI.renderStageGrid()`. 상태 변경은 **반드시 setState로만** 한다.

### 7.2 AB.Game 필드

| 필드 | 초기값 | 설명 |
|---|---|---|
| state | 'MAIN' | 화면 상태 |
| levelIndex | 0 | 현재 스테이지(0~9) |
| world | null | 물리 월드. MAIN/STAGE_SELECT에서는 null |
| score | 0 | 현재 스테이지 점수 |
| birdQueue | [] | 아직 발사하지 않은 새 타입 배열. [0]이 새총에 올라갈(올라가 있는) 새 |
| activeBird | null | 발사되어 날아가는 새 바디 |
| turnPhase | 'ready' | 'ready' \| 'aiming' \| 'flying' \| 'settling' |
| phaseTime | 0 | 현재 turnPhase가 된 뒤 경과 시간 |
| birdSlowTime | 0 | 새가 느린 상태로 누적된 시간 |
| abilityUsed | false | 현재 새 능력 사용 여부 |
| fuseTime | 0 | 검정 새 자동폭발 타이머 |
| clearTimer | -1 | 돼지 전멸 후 경과(음수면 미시작) |
| trail | [] | 현재/직전 비행 궤적 점 {x, y} |
| trailCounter | 0 | 궤적 기록용 스텝 카운터 |
| pigsAlive | 0 | 매 스텝 갱신되는 살아있는 돼지 수 |
| accumulator | 0 | 고정 스텝 누적 시간 |
| lastTime | null | 직전 rAF 타임스탬프 |
| lastResult | null | 클리어 결과 {stars, bonus, best} (UI 표시용) |

### 7.3 init(canvas)

1. `AB.Storage.load()`
2. `AB.Render.init(canvas)`
3. `AB.Input.init(canvas)`
4. `AB.UI.init(handlers)` — handlers 객체:
   - onStart → `startLevel(AB.Storage.firstPlayableLevel())`
   - onOpenStages → `setState('STAGE_SELECT')`
   - onBack → `setState('MAIN')`
   - onSelectStage(i) → `startLevel(i)`
   - onPause → `pause()`
   - onResume → `resume()`
   - onRetry → `startLevel(levelIndex)`
   - onMain → `goToMain()`
   - onNext → levelIndex < 9 이면 `startLevel(levelIndex + 1)`
5. `setState('MAIN')`
6. `requestAnimationFrame(frame)` — 루프 시작(여기서만).

### 7.4 startLevel(i)

1. levelIndex = i, def = AB.LEVELS[i].
2. world = `AB.Physics.createWorld()`.
3. 지면: createBody({shape:'box', x:640, y:680, w:2400, h:80, isStatic:true, kind:'ground', restitution: GROUND_RESTITUTION, friction: GROUND_FRICTION, density:0}) → addBody.
4. def.blocks 각각: 재질 m = AB.MATERIALS[material]. createBody({shape:'box', x, y, w, h, density:m.density, restitution:m.restitution, friction:m.friction, kind:'block', material, hp:m.hp}) → body.sleeping = true → addBody.
5. def.pigs 각각: p = AB.PIG_TYPES[type]. createBody({shape:'circle', x, y, r:p.radius, density:p.density, restitution:p.restitution, friction:p.friction, kind:'pig', subtype:type, hp:p.hp}) → sleeping = true → addBody.
6. birdQueue = def.birds의 **복사본**(slice). score = 0, activeBird = null, turnPhase = 'ready', phaseTime = 0, birdSlowTime = 0, abilityUsed = false, fuseTime = 0, clearTimer = -1, trail = [], trailCounter = 0, accumulator = 0, lastResult = null.
7. pigsAlive = countPigs(). `AB.Slingshot.reset()`, `AB.Effects.reset()`.
8. setState('PLAYING').

### 7.5 pause / resume / goToMain

- pause(): state가 'PLAYING'이 아니면 무시. turnPhase가 'aiming'이면 `AB.Slingshot.cancel()` 후 turnPhase = 'ready'. setState('PAUSED').
- resume(): state가 'PAUSED'가 아니면 무시. accumulator = 0. setState('PLAYING').
- goToMain(): world = null, activeBird = null, `AB.Slingshot.reset()`, `AB.Effects.reset()`, setState('MAIN').

### 7.6 frame(now) — rAF 루프

1. lastTime이 null이면 lastTime = now. frameDt = min((now − lastTime)/1000, 0.1). lastTime = now.
2. state === 'PLAYING'이면: accumulator += frameDt. steps = 0. accumulator ≥ FIXED_DT 이고 steps < MAX_STEPS_PER_FRAME인 동안: fixedUpdate(FIXED_DT), accumulator −= FIXED_DT, steps++, **state가 'PLAYING'이 아니게 되면 즉시 반복 중단**. 반복 후 steps ≥ MAX_STEPS_PER_FRAME 이면 accumulator = 0.
3. `AB.Render.draw()` (상태와 무관하게 매 프레임).
4. requestAnimationFrame(frame).

### 7.7 fixedUpdate(dt) — 순서 엄수

1. phaseTime += dt.
2. `AB.Physics.step(world, dt)`.
3. **피해 적용**: world.bodies의 복사본을 순회. pendingDamage > 0 인 바디는 hp가 유한하면 hp −= pendingDamage. pendingDamage = 0. hp ≤ 0 이면 파괴 목록에 추가. 순회 후 목록의 각 바디에 destroyBody(body, true).
4. **월드 밖/비정상 제거**: 복사본 순회. kind가 'ground'가 아니고 (x < OUT_LEFT 또는 x > OUT_RIGHT 또는 y > OUT_BOTTOM 또는 x·y가 유한수가 아님)이면 목록에 추가 → destroyBody(body, false).
5. `AB.Effects.update(dt)`.
6. **클리어 판정**: pigsAlive = countPigs(). pigsAlive === 0 이고 clearTimer < 0 이면 clearTimer = 0. clearTimer ≥ 0 이면 clearTimer += dt, clearTimer ≥ CLEAR_DELAY 이면 completeLevel() 하고 **return**.
7. clearTimer ≥ 0 이면 return (클리어 대기 중에는 턴 진행·실패 판정을 하지 않는다).
8. **턴 진행**: turnPhase별로
   - 'flying': 7.8 참조.
   - 'settling': 7.9 참조.
   - 'ready' / 'aiming': 아무것도 하지 않는다.

countPigs(): world.bodies 중 kind === 'pig' 이고 alive인 수.

### 7.8 flying 단계

1. activeBird가 null이거나 alive가 false면 → endTurn().  (월드 밖으로 나갔거나 폭발한 경우)
2. 궤적 기록: trailCounter++. trailCounter % TRAIL_INTERVAL_STEPS === 0 이면 trail에 {x, y} push. 길이가 TRAIL_MAX_POINTS를 넘으면 앞에서 제거.
3. 검정 새 자동 폭발: activeBird.subtype === 'black' && !abilityUsed && activeBird.touched 이면 fuseTime += dt, fuseTime ≥ BLACK_FUSE_TIME 이면 explodeBird() 후 endTurn(), return.
4. speedOf(activeBird) < BIRD_REST_SPEED 이면 birdSlowTime += dt, 아니면 birdSlowTime = 0.
5. birdSlowTime ≥ BIRD_REST_TIME 또는 activeBird.sleeping 또는 phaseTime ≥ BIRD_MAX_FLIGHT_TIME 이면:
   - 검정 새이고 !abilityUsed → explodeBird(). 그 외 → destroyBody(activeBird, true) (흰 연기).
   - endTurn().

endTurn(): activeBird = null, turnPhase = 'settling', phaseTime = 0.

### 7.9 settling 단계

1. 안정 여부 = world.bodies 중 비정적이고 깨어있는 모든 바디의 speedOf < SETTLE_SPEED.
2. (안정 && phaseTime ≥ SETTLE_MIN_TIME) 또는 phaseTime ≥ SETTLE_MAX_TIME 이면:
   - birdQueue.length === 0 이면 failLevel().
   - 아니면 turnPhase = 'ready', phaseTime = 0 (다음 새가 새총에 올라감).

### 7.10 발사 · 능력 · 파괴

- **launchBird(launch)** (launch = {x, y, vx, vy}):
  type = birdQueue.shift(), t = AB.BIRD_TYPES[type].
  createBody({shape:'circle', x, y, r:t.radius, density:t.density, restitution:t.restitution, friction:t.friction, kind:'bird', subtype:type}) → vx, vy 설정 → addBody.
  activeBird = body, turnPhase = 'flying', phaseTime = 0, birdSlowTime = 0, abilityUsed = false, fuseTime = 0, trail = [], trailCounter = 0.
- **tryActivateAbility()**: turnPhase !== 'flying' 또는 activeBird 없음/죽음 또는 abilityUsed면 무시.
  - ability 'dash'(노랑): activeBird.touched면 무시. vx, vy에 DASH_MULTIPLIER를 곱한다. abilityUsed = true. `AB.Effects.spawnDebris(x, y, '#FFE066', 8)`.
  - ability 'bomb'(검정): explodeBird().
  - ability 'none'(빨강): 아무것도 안 함.
- **explodeBird()**: b = activeBird. 위치 (bx, by) 저장. abilityUsed = true. b.alive = false, removeBody. result = `AB.Physics.explode(world, bx, by, BOMB_RADIUS, BOMB_IMPULSE, BOMB_MAX_DV)`. 각 {body, strength}: body.hp가 유한하면 body.pendingDamage += BOMB_DAMAGE × strength (다음 fixedUpdate 3단계에서 적용됨). `AB.Effects.spawnRing(bx, by, BOMB_RADIUS)`, `AB.Effects.spawnDebris(bx, by, '#FF8C1A', 20)`. activeBird = null. `AB.Physics.wakeAll(world)`.
- **destroyBody(body, showEffects)**: body.alive가 false면 무시. alive = false, removeBody.
  - kind 'block': score += MATERIALS[material].score. showEffects면 파편(재질 fill 색, 10개) + 점수 텍스트('+500' 등, 흰색).
  - kind 'pig': score += PIG_TYPES[subtype].score. showEffects면 파편('#7BC043', 12개) + 점수 텍스트('+5,000', '#FFF3A0').
  - kind 'bird': 점수 없음. showEffects면 파편('#FFFFFF', 6개).
  - 마지막에 `AB.Physics.wakeAll(world)`.
  - 점수 텍스트는 `'+' + n.toLocaleString('ko-KR')`.
- **completeLevel()**: remaining = birdQueue.length. bonus = remaining × BIRD_BONUS. score += bonus. stars = 1 + (remaining ≥ 1 ? 1 : 0) + (remaining ≥ 2 ? 1 : 0). best = `AB.Storage.recordClear(levelIndex, stars, score)`. lastResult = {stars, bonus, best}. `AB.UI.setClearInfo({stageNumber: levelIndex+1, score, bonus, stars, best, isLast: levelIndex === 9})`. setState('CLEARED').
- **failLevel()**: `AB.UI.setFailInfo({stageNumber: levelIndex+1, pigsLeft: pigsAlive})`. setState('FAILED').

### 7.11 입력 핸들러 (AB.Input이 월드 좌표로 호출)

- handlePointerDown(x, y): state !== 'PLAYING' 이면 무시. clearTimer ≥ 0 이면 무시.
  - turnPhase === 'ready' 이고 birdQueue.length > 0 이고 `AB.Slingshot.beginDrag(x, y, 현재새반지름)`이 true면 turnPhase = 'aiming'.
  - turnPhase === 'flying' 이면 tryActivateAbility().
- handlePointerMove(x, y): state === 'PLAYING' 이고 turnPhase === 'aiming' 이면 `AB.Slingshot.updateDrag(x, y, 현재새반지름)`.
- handlePointerUp(x, y): state === 'PLAYING' 이고 turnPhase === 'aiming' 이면 launch = `AB.Slingshot.release()`. null이면 turnPhase = 'ready', 아니면 launchBird(launch).
- handlePointerCancel(): turnPhase === 'aiming' 이면 `AB.Slingshot.cancel()`, turnPhase = 'ready'.
- handleKey(key): key === 'Escape' 일 때 PLAYING이면 pause(), PAUSED면 resume().
- handleVisibilityHidden(): pause().
- 현재새반지름 = AB.BIRD_TYPES[birdQueue[0]].radius.
- getCurrentBirdType(): (turnPhase가 'ready' 또는 'aiming') && birdQueue.length > 0 && clearTimer < 0 이면 birdQueue[0], 아니면 null. (Render가 새총 위 새를 그릴지 판단할 때 사용)

---

## 8. 슬링샷과 입력

### 8.1 slingshot.js — AB.Slingshot

필드: `dragging`(false), `dragX`, `dragY`(= SLING_X, SLING_Y).

| 함수 | 동작 |
|---|---|
| reset() | dragging = false, dragX = SLING_X, dragY = SLING_Y |
| cancel() | reset()과 동일 |
| beginDrag(x, y, radius) | (x, y)와 (SLING_X, SLING_Y) 거리 ≤ SLING_GRAB_RADIUS면 dragging = true, updateDrag(x, y, radius), true 반환. 아니면 false |
| updateDrag(x, y, radius) | dragging이 아니면 무시. dx = x − SLING_X, dy = y − SLING_Y, len = √(dx²+dy²). len > SLING_MAX_PULL이면 dx, dy에 (SLING_MAX_PULL / len)을 곱한다. dragX = SLING_X + dx, dragY = min(SLING_Y + dy, GROUND_Y − radius − 2) |
| getPull() | px = SLING_X − dragX, py = SLING_Y − dragY, len = √(px²+py²) 를 객체로 반환 |
| getLaunchVelocity() | getPull()의 px, py에 LAUNCH_SCALE을 곱한 {vx, vy} |
| release() | dragging이 아니면 null. p = getPull(). 결과 = p.len < SLING_MIN_PULL ? null : {x: dragX, y: dragY, vx, vy}(getLaunchVelocity 사용). reset() 후 결과 반환 |
| getBirdPos() | {x: dragX, y: dragY} (드래그 중이 아니면 reset 상태이므로 앵커 위치) |
| predict() | dragging이 아니거나 당김 < SLING_MIN_PULL이면 []. 아니면 v = getLaunchVelocity(), k = 1..TRAJ_DOT_COUNT에 대해 t = k × TRAJ_DOT_INTERVAL, px = dragX + vx·t, py = dragY + vy·t + ½·GRAVITY·t². py > GROUND_Y 또는 px > WORLD_W 이면 중단. {x: px, y: py} 배열 반환 |

참고: 45° 최대 당김 시 약 x=1450까지 날아가므로 모든 구조물(x ≤ 1200)에 닿을 수 있다. 수평 최대 발사는 x≈780에서 땅에 닿으므로, 먼 목표는 포물선으로 쏴야 한다(앵그리버드와 같은 감각).

### 8.2 input.js — AB.Input.init(canvas)

- canvas에 `pointerdown`, `pointermove`, `pointerup`, `pointercancel` 리스너. 모든 핸들러에서 `e.preventDefault()`.
- pointerdown에서 `canvas.setPointerCapture(e.pointerId)` (try/catch로 감쌈) → 캔버스 밖으로 끌어도 드래그 유지.
- 좌표는 2장 공식으로 변환 후 `AB.Game.handlePointerDown/Move/Up(x, y)` 호출. pointercancel → `AB.Game.handlePointerCancel()`.
- canvas `contextmenu` 이벤트는 preventDefault.
- window `keydown` → `AB.Game.handleKey(e.key)`.
- document `visibilitychange` → `document.hidden`이 true면 `AB.Game.handleVisibilityHidden()`.

---

## 9. render.js · effects.js — 그리기

### 9.1 AB.Render

- init(canvas): canvas와 `getContext('2d')`를 모듈 내부 변수에 저장.
- draw(): 매 프레임 아래 순서로 그린다. g = AB.Game.
  1. 배경: 하늘 세로 그라디언트(0 → 640, '#6EC6FF' → '#D6F1FF')로 전체 채움. 해: (1120, 110) 반지름 45 '#FFE680'. 언덕: 중심 (300, 660) 반경 (420, 140) 과 (950, 670) 반경 (520, 160) 타원 '#9BD37A'.
  2. 지면: (0, 640) ~ (1280, 720) '#7A5230', 그 위 풀 띠 (0, 640) 높이 12 '#5DBB3F'.
  3. 새총 뒤쪽: 몸통 사각형 x 212~228, y 560~640 '#6B3E1F'. 팔 두 개: (220, 565)→(236, 500), (220, 565)→(204, 500), lineWidth 10, lineCap 'round', 같은 색.
  4. g.world가 null이면 여기서 끝(메인/스테이지 선택 배경).
  5. 직전/현재 비행 궤적: g.trail 각 점에 반지름 3 흰색 원(globalAlpha 0.5).
  6. 블록: 각 kind 'block' 바디를 fillRect(x−w/2, y−h/2, w, h) 재질 fill, strokeRect 재질 stroke(lineWidth 2). 금: ratio = hp/maxHp. ratio < 0.66이면 (x−0.3w, y−0.4h)→(x+0.1w, y)→(x−0.1w, y+0.4h) 꺾은선, ratio < 0.33이면 추가로 (x+0.3w, y−0.4h)→(x, y+0.1h)→(x+0.25w, y+0.45h). 색 'rgba(0,0,0,0.45)', lineWidth 1.5. 얼음은 윗변 안쪽에 흰 하이라이트 선 1개.
  7. 돼지: 각 kind 'pig' 바디, r = 반지름. save → translate(x, y) → rotate(angle):
     - 몸: 원 '#7BC043', 테두리 '#4E8A2A' lineWidth 2.
     - 눈: (±0.35r, −0.2r)에 흰 원 반지름 0.22r, 검은 눈동자 반지름 0.1r.
     - 코: (0, 0.2r) 타원 반경 (0.38r, 0.26r) '#9AD66B', 콧구멍 두 개 (±0.12r, 0.2r) 반지름 0.06r '#3E6B22'.
     - hp < maxHp × 0.5 이면 멍: (0.3r, −0.5r) 반지름 0.18r '#5A8F33'.
     - restore.
  8. 날아가는 새: kind 'bird' 바디마다 drawBird(x, y, subtype, angle).
  9. 새총 위의 새: type = g.getCurrentBirdType(). null이 아니면 pos = AB.Slingshot.getBirdPos().
     - 뒤 고무줄: (236, 502) → pos, '#3B1F0E' lineWidth 5.
     - drawBird(pos.x, pos.y, type, 0).
     - 앞 고무줄: (204, 502) → pos, 같은 스타일.
  10. 대기 중인 새: 목록 = (type이 null이 아니면 g.birdQueue.slice(1), 아니면 g.birdQueue.slice(0)). k번째(0부터)를 x = 175 − 40k, y = GROUND_Y − 반지름 에 drawBird.
  11. 궤적 예측: g.turnPhase === 'aiming'이면 AB.Slingshot.predict()의 k번째 점에 흰 원(globalAlpha 0.9), 반지름 = max(2, 4 − k × 0.07).
  12. `AB.Effects.draw(ctx)`.
  13. HUD(좌상단, font 'bold 26px sans-serif', 흰 채움 + 'rgba(0,0,0,0.6)' 외곽선 lineWidth 4, strokeText 후 fillText):
      - (24, 44): '스테이지 ' + (levelIndex+1) + ' / 10  ' + 레벨 name
      - (24, 80): '점수 ' + score.toLocaleString('ko-KR')
      - (24, 116): '남은 돼지 ' + pigsAlive
  14. 안내 문구(font 'bold 22px sans-serif', 가운데 정렬 또는 좌하단):
      - levelIndex === 0 && turnPhase === 'ready' && birdQueue.length === 3 이면 화면 가운데 위 (640, 170): '새를 뒤로 끌었다가 놓아서 발사하세요!'
      - type === 'yellow' 이면 좌하단 (24, 700): '노란 새: 날아가는 중 화면을 클릭하면 가속!'
      - type === 'black' 이면 좌하단 (24, 700): '검은 새: 날아가는 중 클릭하면 폭발! (부딪힌 뒤 1.5초 후 자동 폭발)'
  - 우상단은 DOM 일시정지 버튼 자리이므로 캔버스에 아무것도 그리지 않는다.
  - 텍스트 정렬(textAlign)을 바꿨으면 그린 뒤 'left'로 되돌린다. globalAlpha도 그린 뒤 1로 되돌린다(save/restore 사용 권장).
- drawBird(x, y, type, angle) (내부 함수): t = AB.BIRD_TYPES[type], r = t.radius. save → translate → rotate(angle):
  - 몸: 원 t.color, 테두리 'rgba(0,0,0,0.5)' lineWidth 2.
  - 배: (0, 0.35r) 타원 반경 (0.55r, 0.35r) — red는 '#F4D6C0', yellow는 '#FFF1B8', black은 '#555555'.
  - 눈: (0.2r, −0.2r)와 (0.55r, −0.2r)에 흰 원 반지름 0.2r, 눈동자 (x+0.05r) 반지름 0.09r 검정.
  - 눈썹: (0.05r, −0.45r)→(0.7r, −0.3r) 검은 선 lineWidth 3.
  - 부리: 삼각형 (0.6r, 0) / (1.05r, 0.15r) / (0.6r, 0.3r) '#F29E1F'.
  - black이면 도화선: (0, −r)→(0.2r, −1.4r) '#8B5A2B' lineWidth 3, 끝에 반지름 3 '#FF8C1A' 원.
  - restore.

### 9.2 AB.Effects

내부 배열 `particles`, `texts`, `rings`.

| 함수 | 동작 |
|---|---|
| reset() | 세 배열 비우기 |
| spawnDebris(x, y, color, count) | count개 파티클: vx = (Math.random()−0.5)×400, vy = −Math.random()×350 − 50, size = 4 + Math.random()×5, life = maxLife = 0.6 + Math.random()×0.4, color |
| spawnText(x, y, text, color) | {x, y, text, color, life: 1.0} |
| spawnRing(x, y, radius) | {x, y, radius, life: 0.35} |
| update(dt) | 파티클: vy += 900·dt, x += vx·dt, y += vy·dt, life −= dt. 텍스트: y −= 40·dt, life −= dt. 링: life −= dt. life ≤ 0 인 것은 새 배열을 만들어 걸러낸다(filter) |
| draw(ctx) | 파티클: globalAlpha = life/maxLife, 정사각형 size. 텍스트: globalAlpha = life, 'bold 22px sans-serif', 가운데 정렬, 검은 외곽선 + color 채움. 링: 반지름 = radius × (1 − life/0.35), '#FF8C1A' lineWidth 6, globalAlpha = life/0.35. 모두 save/restore로 감싼다 |

---

## 10. UI — index.html · style.css · ui.js · storage.js

### 10.1 index.html 요소 목록

- `<!DOCTYPE html>`, `<html lang="ko">`, `<meta charset="utf-8">`, viewport 메타(`width=device-width, initial-scale=1`), `<title>앵그리버드 - 새총 퍼즐</title>`, `<link rel="stylesheet" href="css/style.css">`.
- `body` 안에 `div#game-root`, 그 안에 순서대로:
  1. `canvas#game-canvas` (속성 width="1280" height="720")
  2. `button#pause-btn.hidden` — type="button", aria-label="일시정지", 텍스트 `❚❚`
  3. `div#screen-main.overlay` — `h1.title` '앵그리버드', `p.subtitle` '새총으로 돼지를 물리쳐라! (10 스테이지)', `button#btn-start.btn` '게임 시작', `button#btn-stages.btn.secondary` '스테이지 선택'
  4. `div#screen-stages.overlay.hidden` — `h2` '스테이지 선택', `div#stage-grid`, `button#btn-stages-back.btn.secondary` '뒤로'
  5. `div#screen-pause.overlay.hidden` — `h2` '일시정지', `button#btn-resume.btn` '계속하기', `button#btn-pause-retry.btn` '다시하기', `button#btn-pause-main.btn.secondary` '메인으로'
  6. `div#screen-clear.overlay.hidden` — `h2#clear-title`, `div#clear-stars.stars`, `p#clear-score`, `p#clear-bonus`, `p#clear-best`, `button#btn-next.btn` '다음 스테이지', `button#btn-clear-retry.btn` '다시하기', `button#btn-clear-main.btn.secondary` '메인으로'
  7. `div#screen-fail.overlay.hidden` — `h2` '실패...', `p#fail-text`, `button#btn-fail-retry.btn` '다시하기', `button#btn-fail-main.btn.secondary` '메인으로'
- 모든 `button`에 `type="button"`.
- `</body>` 직전 스크립트 11줄(3장 순서).

### 10.2 style.css 핵심 규칙

- `html, body`: margin 0, height 100%, background '#1B1B2F', overflow hidden, font-family sans-serif, user-select none.
- `body`: display flex, align-items center, justify-content center.
- `#game-root`: position relative, width `min(100vw, 177.78vh)`, height `min(56.25vw, 100vh)` (16:9 유지하며 화면에 맞춤), overflow hidden.
- `#game-canvas`: display block, width 100%, height 100%, `touch-action: none` (터치 스크롤 방지), cursor pointer.
- `#pause-btn`: position absolute, **top 2.5%, right 1.5%** (인게임 우측 상단), width 56px, height 56px, border-radius 50%, border 3px solid white, background 'rgba(0,0,0,0.45)', color white, font-size 22px, font-weight bold, cursor pointer, z-index 5.
- `.overlay`: position absolute, inset 0 (top/right/bottom/left 0), display flex, flex-direction column, align-items center, justify-content center, gap 14px, background 'rgba(10,20,40,0.6)', color white, z-index 10.
- `.hidden`: `display: none !important;`
- `.title`: font-size 64px, margin 0, text-shadow 0 4px 0 '#8B0000'. `.subtitle`: font-size 20px, margin 0 0 12px.
- `.btn`: min-width 220px, padding 12px 28px, font-size 22px, font-weight bold, border none, border-radius 12px, background '#E63946', color white, cursor pointer, box-shadow 0 4px 0 '#8B1E28'. `.btn:hover` 약간 밝게. `.btn.secondary`: background '#457B9D', box-shadow 색 '#23405A'.
- `#stage-grid`: display grid, grid-template-columns repeat(5, 110px), gap 14px.
- `.stage-btn`: width 110px, height 100px, border-radius 14px, border none, background '#F4A261', color '#3B1F0E', font-weight bold, cursor pointer, display flex, flex-direction column, align-items center, justify-content center. 숫자는 font-size 32px, 별 줄은 font-size 18px. `.stage-btn.locked` (disabled): background '#777', color '#ddd', cursor not-allowed.
- `.stars`: font-size 48px, color '#FFD166', letter-spacing 6px.

### 10.3 ui.js — AB.UI

| 함수 | 동작 |
|---|---|
| init(handlers) | 모든 버튼에 click 리스너. #btn-start → onStart, #btn-stages → onOpenStages, #btn-stages-back → onBack, #pause-btn → onPause, #btn-resume → onResume, #btn-pause-retry / #btn-clear-retry / #btn-fail-retry → onRetry, #btn-pause-main / #btn-clear-main / #btn-fail-main → onMain, #btn-next → onNext. handlers는 내부 변수에 저장(스테이지 버튼에서 사용) |
| showScreen(state) | 오버레이 5개를 모두 hidden 처리 후 매핑된 것만 hidden 제거: MAIN→#screen-main, STAGE_SELECT→#screen-stages, PAUSED→#screen-pause, CLEARED→#screen-clear, FAILED→#screen-fail, PLAYING→없음. #pause-btn은 state === 'PLAYING'일 때만 보임 |
| renderStageGrid() | #stage-grid 비우기. i = 0..9마다 button.stage-btn 생성: 첫 줄 span(숫자 i+1). `AB.Storage.isUnlocked(i)`면 둘째 줄 span = 기록 있으면 '★'×stars + '☆'×(3−stars), 없으면 '☆☆☆', click → handlers.onSelectStage(i). 잠겼으면 disabled, class 'locked', 둘째 줄 '잠김'. textContent/createElement 사용 |
| setClearInfo(info) | #clear-title = info.isLast ? '모든 스테이지 클리어!' : '스테이지 ' + stageNumber + ' 클리어!'. #clear-stars = '★'×stars + '☆'×(3−stars). #clear-score = '점수 ' + 포맷(score). #clear-bonus = '남은 새 보너스 +' + 포맷(bonus). #clear-best = '최고 점수 ' + 포맷(best). #btn-next는 isLast면 hidden 추가, 아니면 제거 |
| setFailInfo(info) | #fail-text = '스테이지 ' + stageNumber + ' — 남은 돼지 ' + pigsLeft + '마리' |

포맷(n) = n.toLocaleString('ko-KR'). 별 문자는 '★'(U+2605), '☆'(U+2606)만 사용(이모지 아님).

### 10.4 storage.js — AB.Storage

- 내부 데이터 `data = { cleared: {} }`. cleared의 키는 스테이지 인덱스 문자열('0'~'9'), 값은 `{ stars, best }`.
- load(): localStorage.getItem(STORAGE_KEY)를 JSON.parse. 실패하거나 없거나 형태가 이상하면 `{ cleared: {} }`. **try/catch 필수**(file:// 또는 사생활 보호 모드에서 예외 가능).
- save(): JSON.stringify 후 setItem, try/catch로 실패 무시(메모리 값은 유지).
- getRecord(i): data.cleared[String(i)] 또는 null.
- isUnlocked(i): i === 0 또는 getRecord(i−1)이 있음 또는 `location.hash === '#unlockall'`(검수용 전체 해금).
- recordClear(i, stars, score): 기존 기록과 비교해 stars·best 각각 최댓값으로 저장 → save() → best 반환.
- firstPlayableLevel(): i = 0..9 중 isUnlocked(i)이고 getRecord(i)가 없는 첫 i. 없으면 0.

### 10.5 main.js

`document.readyState`가 'loading'이면 DOMContentLoaded에서, 아니면 즉시 `AB.Game.init(document.getElementById('game-canvas'))` 호출. 그 외 코드는 없다.

---

## 11. 특수 능력 요약 (7.10의 재확인)

| 새 | 발동 | 효과 | 제약 |
|---|---|---|---|
| 빨강 | 없음 | 기본 | — |
| 노랑 | 비행 중 캔버스 클릭 | 속도 × 1.8 | 1회, 아무것도 닿기 전만 |
| 검정 | 비행 중 캔버스 클릭, 또는 첫 접촉 1.5초 후 자동, 또는 턴 종료 시점에 미사용이면 그때 | 반경 160 폭발: 밀어내기 + 피해 200×강도 | 1회 |

일시정지 버튼은 DOM 요소라 클릭해도 캔버스 pointerdown이 발생하지 않는다 → 능력 오발동 없음.

---

## 12. 모듈 계약표 (이름은 글자 그대로)

| 모듈 | 공개 멤버 | 호출하는 쪽 |
|---|---|---|
| AB.CONFIG, AB.MATERIALS, AB.PIG_TYPES, AB.BIRD_TYPES | 4장 표의 키 | 전부 |
| AB.LEVELS | 배열[10] {name, birds, blocks, pigs} | Game, Render(name), UI(개수) |
| AB.Physics | createWorld(), createBody(def), addBody(world, body), removeBody(world, body), step(world, dt), wakeBody(body), wakeAll(world), explode(world, x, y, radius, impulse, maxDv), speedOf(body) | Game |
| AB.Effects | reset(), spawnDebris(x, y, color, count), spawnText(x, y, text, color), spawnRing(x, y, radius), update(dt), draw(ctx) | Game, Render(draw) |
| AB.Storage | load(), save(), getRecord(i), isUnlocked(i), recordClear(i, stars, score), firstPlayableLevel() | Game, UI |
| AB.Slingshot | dragging, dragX, dragY, reset(), cancel(), beginDrag(x, y, radius), updateDrag(x, y, radius), getPull(), getLaunchVelocity(), release(), getBirdPos(), predict() | Game, Render |
| AB.Render | init(canvas), draw() | Game |
| AB.UI | init(handlers), showScreen(state), renderStageGrid(), setClearInfo(info), setFailInfo(info) | Game |
| AB.Input | init(canvas) | Game |
| AB.Game | 7.2 필드 전부, init(canvas), setState(s), startLevel(i), pause(), resume(), goToMain(), handlePointerDown(x, y), handlePointerMove(x, y), handlePointerUp(x, y), handlePointerCancel(), handleKey(key), handleVisibilityHidden(), getCurrentBirdType(), countPigs() | main, Input, Render |

Game 내부 전용(공개해도 무방): frame, fixedUpdate, launchBird, tryActivateAbility, explodeBird, destroyBody, endTurn, completeLevel, failLevel.

주의: Render가 `AB.Game.state`, `world`, `levelIndex`, `score`, `pigsAlive`, `birdQueue`, `turnPhase`, `trail`을 읽으므로 이것들은 반드시 `AB.Game` 객체의 **속성**이어야 한다(IIFE 내부 지역변수로만 두면 안 된다). Game 함수 안에서도 `AB.Game.필드`(또는 같은 객체를 가리키는 변수 `G.필드`)로 읽고 쓴다.

---

## 13. 구현 순서

각 단계는 해당 파일을 **완성본으로 한 번에** Write 한다. 단계가 끝날 때마다 방금 쓴 파일을 한 번 Read 해서 괄호 짝, 객체 리터럴의 쉼표, 오타를 확인한다.

1. `index.html`, `css/style.css` — 10.1, 10.2
2. `js/config.js` — 4장 (값 대조)
3. `js/levels.js` — 5장 (옮긴 뒤 5.3 요약 검산표와 개수 대조)
4. `js/physics.js` — 6장 (가장 중요. 부호: A는 빼고 B는 더한다, 원-사각형 뒤집기)
5. `js/effects.js`, `js/storage.js`, `js/slingshot.js` — 9.2, 10.4, 8.1
6. `js/render.js` — 9.1
7. `js/ui.js`, `js/input.js` — 10.3, 8.2
8. `js/game.js`, `js/main.js` — 7장, 10.5
9. 14장 정적 검증 전체 수행, 발견한 문제는 Edit/Write로 수정

---

## 14. 정적 자기검증 체크리스트 (실행 불가 대체)

모든 파일을 다 쓴 뒤 아래 항목을 파일을 다시 읽으며 하나씩 확인한다.

**로딩**
- [ ] index.html의 스크립트 11줄이 3장 순서이고 경로(`js/…`)와 실제 파일명이 일치한다.
- [ ] 어느 파일에도 `import`, `export`, `type="module"`, `fetch(`, `http://`, `https://`가 없다.
- [ ] 모든 JS 파일이 `window.AB = window.AB || {};` + IIFE 구조다. 최상위 전역 선언이 없다.

**이름 일치**
- [ ] 12장 표의 모든 공개 멤버가 정의되어 있다.
- [ ] 각 파일에서 `AB.`로 시작하는 모든 참조가 12장 표에 있는 이름이다(예: `AB.Physics.speedOf`를 `AB.Physics.speed`로 쓰지 않았는지).
- [ ] ui.js가 참조하는 모든 id(#game-canvas, #pause-btn, #screen-main, #screen-stages, #screen-pause, #screen-clear, #screen-fail, #btn-start, #btn-stages, #btn-stages-back, #stage-grid, #btn-resume, #btn-pause-retry, #btn-pause-main, #clear-title, #clear-stars, #clear-score, #clear-bonus, #clear-best, #btn-next, #btn-clear-retry, #btn-clear-main, #fail-text, #btn-fail-retry, #btn-fail-main)가 index.html에 정확히 존재한다.
- [ ] CONFIG 키 이름을 쓸 때 오타가 없다(예: SOLVER_ITERATIONS, TRAJ_DOT_INTERVAL).

**데이터**
- [ ] AB.LEVELS 길이 10, 각 스테이지의 블록/돼지/새 개수가 5.3 요약표와 같다.
- [ ] 레벨의 material/type/birds 문자열이 AB.MATERIALS/PIG_TYPES/BIRD_TYPES의 키와 일치한다.

**물리**
- [ ] 충돌 법선은 A→B, 충격량은 A에서 빼고 B에 더한다(속도·위치 보정 모두).
- [ ] 원-사각형 쌍의 순서가 (사각형, 원)일 때 법선 부호를 뒤집는다.
- [ ] 속도 해결에서 effInv를 사용해 잠든 바디·정적 바디는 움직이지 않는다.
- [ ] 레벨 로딩 시 블록·돼지의 sleeping = true, 새는 false.
- [ ] step 안에서 바디를 제거하지 않는다.

**게임 흐름**
- [ ] 7.1의 모든 전이가 구현되어 있고 상태 변경은 setState로만 한다.
- [ ] rAF는 init에서 한 번만 시작한다. fixedUpdate 반복 중 state가 바뀌면 반복을 멈춘다.
- [ ] startLevel이 7.4의 모든 필드를 초기화한다(다시하기 후 점수·새·궤적·타이머가 남지 않음).
- [ ] birdQueue는 LEVELS의 배열을 **복사**해서 쓴다(shift가 원본 레벨 데이터를 망가뜨리지 않음).
- [ ] 제거는 복사본 순회 또는 수집 후 제거로 처리한다.
- [ ] 클리어 대기(clearTimer ≥ 0) 중에는 실패 판정·새 발사가 없다.
- [ ] 일시정지 중에는 물리·이펙트가 멈추고, 캔버스 입력이 무시된다.
- [ ] 일시정지 버튼은 PLAYING에서만 보이고 화면 우측 상단에 있다.

**문법**
- [ ] 각 파일을 처음부터 끝까지 읽으며 `{}`, `()`, `[]` 짝과 객체 리터럴 쉼표를 확인했다.
- [ ] `'use strict';` 아래에서 선언 안 된 변수 대입이 없다.

---

## 15. 완료 판정 기준 (Definition of Done)

### 15.1 구현자 완료 조건 (이번 작업의 종료 조건)

1. 3장의 파일 13개가 게임 루트에 모두 존재한다.
2. 14장 체크리스트를 전부 확인했고, 발견한 문제를 수정했다.
3. 이 문서의 범위(0.2) 밖 기능을 추가하지 않았다.

작업이 끝나면 생성한 파일 경로 목록과, 계획서와 다르게 결정한 점(있다면)을 짧게 보고한다.

### 15.2 수용 시나리오 (나중에 사람이 브라우저에서 확인 — "된 것"의 정의)

`game/index.html`을 Chrome에서 더블클릭으로 연다. 개발자 도구 콘솔에 에러가 **하나도** 없어야 한다.

| # | 조작 | 기대 결과 |
|---|---|---|
| A1 | 페이지 열기 | 하늘·땅·새총 배경 위에 '앵그리버드' 제목, '게임 시작', '스테이지 선택' 버튼 |
| A2 | 게임 시작 | 스테이지 1: 나무 오두막 위 돼지 1마리, 새총에 빨간 새, 대기 새 2마리, 좌상단 HUD, **우측 상단 일시정지 버튼**, 안내 문구 |
| A3 | 가만히 10초 대기 | 구조물이 저절로 흔들리거나 무너지지 않는다 |
| A4 | 새를 뒤로 드래그 | 고무줄이 늘어나고 최대 100px에서 멈추며, 흰 점 궤적 예측이 보인다 |
| A5 | 놓기 | 새가 포물선으로 날아가고, 비행 경로에 흰 점 자국이 남는다 |
| A6 | 구조물 명중 | 블록이 밀리거나 금이 가거나 파편과 함께 사라지고, 받침이 사라지면 위의 물체가 떨어진다. 돼지가 죽으면 '+5,000' |
| A7 | 돼지 전멸 | 약 1.2초 후 클리어 오버레이: 별(남은 새 수에 따라 1~3개), 점수, 보너스, 최고 점수, 다음 스테이지/다시하기/메인으로 |
| A8 | 다음 스테이지 | 스테이지 2가 새로 로딩된다 |
| A9 | 일부러 빗맞혀 새 소진 | 월드가 멈춘 뒤 '실패...' 오버레이(다시하기/메인으로) |
| A10 | 인게임에서 일시정지 버튼 클릭 | 게임이 정지(날던 새·파편 멈춤)하고 '계속하기 / 다시하기 / 메인으로' 오버레이가 뜬다. 일시정지 버튼은 숨겨진다 |
| A11 | 일시정지 → 계속하기 | 멈춘 지점부터 이어서 진행 |
| A12 | 일시정지 → 다시하기 | 같은 스테이지가 처음 상태(점수 0, 새 전부, 구조물 원상태)로 재시작 |
| A13 | 일시정지 → 메인으로 | 메인 화면으로 돌아간다 |
| A14 | ESC 키 | 인게임에서 일시정지, 일시정지 중이면 재개 |
| A15 | 스테이지 4 / 6 | 노란 새 비행 중 클릭 → 눈에 띄게 가속. 검은 새 비행 중 클릭 → 주황 링과 함께 주변 블록이 튕겨 나가고 가까운 블록·돼지 파괴 |
| A16 | 스테이지 선택 | 10개 버튼, 클리어한 다음 스테이지까지만 활성, 별 기록 표시. 새로고침 후에도 유지 |
| A17 | 주소 끝에 `#unlockall` 붙이고 새로고침 → 스테이지 선택 | 10개 모두 활성. 각 스테이지를 열어 5.3 표대로 배치되어 있고 A3처럼 저절로 무너지지 않는다 |
| A18 | 브라우저 창 크기 변경 | 16:9 비율을 유지하며 맞춰지고, 드래그 조준 위치가 어긋나지 않는다 |
| A19 | 스테이지 10 클리어 | '모든 스테이지 클리어!', 다음 스테이지 버튼 없음 |

A1~A19를 모두 만족하면 "완료"다. 요구사항 매핑: 10 스테이지 = A8·A16·A17·A19, 앵그리버드식 게임플레이 = A2~A9·A15, 우측 일시정지 + 다시하기/메인으로 = A10~A13.
