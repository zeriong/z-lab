# 새총 대작전 — 브라우저 물리 슬링샷 게임 구현 계획서
- 추론 프레임: spec-coverage / 스타일: opus (standalone)
- 한 줄 요약: Matter.js 0.19.0(CDN, 클래식 스크립트) + Canvas 2D + DOM 오버레이로, 빌드 없이 `index.html` 더블클릭으로 도는 10스테이지 슬링샷 게임을 만든다. 루프는 하나, 타이머는 0개, 월드는 스테이지마다 새로 만든다.
- 진입 점검: 이 과제에서 나는 "물리 엔진 비교 → 아키텍처 → 기능 목록 → 스테이지는 데이터 몇 개" 순서로 쓰는 버릇이 있다. 이 프레임은 그 순서를 금지한다. 그래서 매트릭스를 먼저 쓰고, 스테이지 10개는 실제 배치까지 저작했다(§6).

> 구현자에게: 이 문서 하나만 보고 파일을 쓰게 된다. 실행해 볼 수 없으므로, 코드 블록으로 준 부분(§5.2~§5.5, §6.1)은 **글자 그대로 복사한다**. 표에 적힌 이름·시그니처·id를 바꾸지 않는다.

---

## 1. 요구사항 × 표면 커버리지 매트릭스 (프레임 시작점)

### 1.1 누락 금지 원장
판정: `build` / `defer(+트리거)` / `n-a(+이유)`. 명시 요구사항(명시1~3)에서 나온 행은 모두 `build`다.

| ID | 요구 (출처) | 표면 | 판정 | 비고 |
|---|---|---|---|---|
| L01 | 10 스테이지 (명시1) | 스테이지 콘텐츠 `js/stages.js` | build | §6에 10개 저작 |
| L02 | 10 스테이지 (명시1) | 클리어 → 다음 스테이지 전환 | build | |
| L03 | 10 스테이지 (명시1) | 스테이지 선택 화면 + 잠금 | build | |
| L04 | 게임시작→플레이 (명시2) | 메인 화면 "게임 시작" | build | LB 홉1 |
| L05 | 슬링샷 (명시2) | 조준: 잡기·당김 한계·취소 | build | |
| L06 | 슬링샷 (명시2) | 궤적 예측 점선 | build | |
| L07 | 포물선·중력 (명시2) | 발사·비행 | build | |
| L08 | 충돌·구조물 파괴 (명시2) | 월드: 재질 3종 블록 | build | 나무/얼음/돌 |
| L09 | 목표 제거 (명시2) | 돼지 제거 + 클리어 판정 | build | |
| L10 | 명시2 파생 | 실패 판정(새 소진) | build | |
| L11 | 명시2 파생 | 턴 종료 → 다음 새 장전 | build | |
| L12 | 일시정지 우측 (명시3) | HUD 우측 상단 버튼 | build | |
| L13 | 다시하기 (명시3) | 일시정지 오버레이 | build | |
| L14 | 메인으로 (명시3) | 일시정지 오버레이 | build | |
| L15 | 명시3 파생 | 게임 루프: 일시정지 중 실제로 정지 | build | |
| L16 | 명시3 파생 | 오버레이 "계속하기" + Esc | build | 추가 버튼(명세 위반 아님) |
| L17 | 명시3 파생 | 탭이 숨겨지면 자동 일시정지 | build | |
| L18 | 점수 | HUD 점수 + 점수 팝업 | build | |
| L19 | 별 1~3 | 결과 화면 | build | |
| L20 | 결과 화면 | 다시하기 / 다음 스테이지 / 메인으로 | build | |
| L21 | 저장 | `localStorage`: 잠금 해제·최고 점수·별 | build | |
| L22 | 파괴 피드백 | 파편 파티클 + 손상 표현 | build | |
| L23 | 효과음 | Web Audio 합성 7종 | build | |
| L24 | 배경 | 하늘·언덕·지면·새총 | build | |
| L25 | 카메라 | 월드 전체가 보이는 고정 뷰 | build | |
| L26 | 입력 | Pointer Events(마우스+터치) | build | |
| L27 | 스케일링 | 1280×720 논리 해상도, 비율 유지 | build | |
| L28 | 새 종류 | yellow(대시), big(무거움) | build | |
| L29 | file:// 실행 | 클래식 `<script>`, 데이터는 JS 전역 | build | |
| L30 | 완성감 | 부트 실패 안내(Matter 미로드) | build | |
| L31 | 완성감 | 전 스테이지 클리어 표시 | build | |
| L32 | 제목 | 메인 화면 제목 "새총 대작전" | build | |
| L33 | 카메라 | 새 추적 카메라 + 넓은 월드 | defer | 트리거: 1280폭을 넘는 스테이지를 저작해야 할 때 |
| L34 | 새 종류 | 분열 새(blue) | defer | 트리거: B9 플레이에서 8~10스테이지가 "풀이가 같다"는 판정 |
| L35 | 완성감 | 음소거 토글 | defer | 트리거: 소리가 거슬린다는 사용자 피드백 1건 |
| L36 | 완성감 | 고DPI(`devicePixelRatio`) 선명도 | defer | 트리거: 수용 시나리오에서 레티나 흐림이 지적될 때 |
| L37 | 원작 에셋 | 그래픽·캐릭터 | n-a | 바이너리를 만들 수 없고 저작권 문제가 있다. 도형 기반 오리지널 아트로 간다 |
| L38 | 완성감 | 다국어 | n-a | 요청 언어가 한국어 하나다 |

### 1.2 표면별 품질 하한 ("완성"의 뜻)
- **메인 화면**: 제목과 버튼 2개가 하늘 배경 위에 보인다. 흰 화면이나 기본 스타일 버튼이면 미완성이다.
- **스테이지 선택**: 10칸이 모두 보이고, 각 칸에서 잠금 여부와 획득한 별을 **읽을 수 있다**.
- **인게임 월드**: 블록은 재질별 색으로 구분되고 맞으면 손상이 **보이며**, 파괴되는 순간 파편이 튄다. 조용히 사라지는 블록은 미완성이다.
- **조준**: 당기는 동안 고무줄, 당김 한계, 점선 궤적이 손을 따라 매 프레임 갱신된다.
- **HUD**: 스테이지 번호·이름, 점수, 남은 새가 항상 읽히고, 일시정지 버튼은 우측 상단에 있다.
- **일시정지 오버레이**: 월드가 반투명 막 뒤에서 **정지한 채** 보이고, 세 버튼이 모두 동작한다.
- **결과 화면**: 승패, 점수, 별, 최고 기록이 한눈에 읽히고, 다음 행동 버튼이 있다.
- **저장**: 브라우저를 닫았다 다시 열어도 잠금 해제와 별이 **남아 있다**.
- **오디오**: 발사·충돌·파괴·돼지·승리·패배에 서로 다른 소리가 나고, 같은 소리가 겹쳐 폭주하지 않는다.
- **부트 실패**: 검은 화면이 아니라 한국어 안내 문장이 뜬다.

### 1.3 동사 문장 (build 행마다 하나, 원장 ID 대응)
- L01: 플레이어가 선택 화면에서 1~10번을 차례로 열면, 매번 다른 구조물·돼지 수·새 조합이 나온다. 없으면 두 스테이지의 화면이 똑같이 보인다.
- L02: 플레이어가 결과 화면에서 "다음 스테이지"를 누르면 번호가 하나 오른 스테이지가 새 월드로 시작된다. 없으면 같은 스테이지가 다시 뜨거나 이전 구조물이 겹쳐 그려진다.
- L03: 플레이어가 "스테이지 선택"을 누르면 해제된 칸만 눌리고 잠긴 칸에는 자물쇠 표시가 있다. 없으면 10번이 처음부터 눌리거나 1번도 눌리지 않는다.
- L04: 플레이어가 메인에서 "게임 시작"을 누르면 1초 안에 새총 위의 새와 구조물이 보인다. 없으면 버튼을 눌러도 메인 화면이 그대로 남는다.
- L05: 플레이어가 새를 잡아 끌면 새가 손을 따르되 `MAX_PULL` 원 밖으로는 나가지 않고, 짧게 끌고 놓으면 새총으로 되돌아간다. 없으면 새가 화면 끝까지 따라오거나, 살짝 건드리기만 해도 발사된다.
- L06: 플레이어가 조준하는 동안 새 앞에 옅어지는 점선 포물선이 그려진다. 없으면 발사 전에 어디로 갈지 알 수 없다.
- L07: 플레이어가 놓으면 새가 당긴 반대 방향으로, 당긴 거리에 비례한 속도로 포물선을 그리며 날아간다. 없으면 새가 제자리에 떨어지거나 직선으로 날아간다.
- L08: 새가 구조물에 부딪히면 충격이 큰 블록부터 금이 가고 부서지며 윗부분이 무너진다. 돌은 빨간 새 한 방에 부서지지 않는다. 없으면 모든 블록이 같은 강도로 튕기기만 한다.
- L09: 마지막 돼지가 제거되면 1초 뒤 "클리어" 결과가 뜬다. 없으면 돼지가 다 사라진 빈 구조물 앞에서 게임이 멈춰 있다.
- L10: 마지막 새의 비행이 끝났는데 돼지가 남아 있으면 "실패" 결과가 뜬다. 없으면 새총이 빈 채로 게임이 영원히 끝나지 않는다.
- L11: 발사된 새와 구조물이 멈추면(또는 10초가 지나면) 다음 새가 새총에 올라간다. 없으면 두 번째 새가 영영 나오지 않는다.
- L12: 플레이어가 인게임 화면 우측 상단의 "II" 버튼을 누르면 일시정지 오버레이가 뜬다. 없으면 버튼이 없거나 눌러도 게임이 계속된다.
- L13: 플레이어가 오버레이에서 "다시하기"를 누르면 같은 스테이지가 새 수·점수·구조물 모두 처음 상태로 시작된다. 없으면 이전 판의 블록이 남거나 게임 속도가 두 배가 된다.
- L14: 플레이어가 오버레이에서 "메인으로"를 누르면 메인 화면으로 돌아가고, 다시 시작하면 깨끗한 스테이지가 뜬다. 없으면 메인 화면 뒤에서 이전 판의 소리와 점수가 계속 난다.
- L15: 일시정지 중에는 블록·파편·결과 대기 시간이 모두 멈춘다. 없으면 재개했을 때 구조물이 이미 무너져 있거나 결과 화면이 오버레이 위로 튀어나온다.
- L16: 플레이어가 "계속하기"나 Esc를 누르면 멈췄던 자세 그대로 움직임이 이어진다. 없으면 일시정지를 풀 방법이 다시하기뿐이다.
- L17: 플레이 중에 탭을 바꾸면 게임이 일시정지된다. 없으면 돌아왔을 때 턴이 이미 지나가 있다.
- L18: 블록이나 돼지가 부서지면 그 자리에 "+500" 같은 숫자가 떠오르고 HUD 점수가 오른다. 없으면 점수가 오르는 이유를 알 수 없다.
- L19: 클리어하면 남은 새 수에 따라 별 1~3개가 결과 화면에 채워진다. 없으면 모든 클리어가 똑같이 보인다.
- L20: 결과 화면의 세 버튼이 각각 재시작, 다음 스테이지, 메인 복귀를 한다(실패 시 "다음"은 숨김). 없으면 결과 화면에서 빠져나갈 수 없다.
- L21: 스테이지를 클리어하고 페이지를 새로 고치면 다음 스테이지가 해제되어 있고 최고 점수와 별이 선택 화면에 보인다. 없으면 새로 고칠 때마다 1스테이지만 열려 있다.
- L22: 블록이나 돼지가 부서지면 재질 색의 파편 8~12개가 튀어 떨어지고, 체력 50% 이하인 블록에는 금이 그려진다. 없으면 부서진 블록이 그냥 사라진다.
- L23: 발사·충돌·파괴·돼지 제거·승리·패배·버튼 클릭 때 각각 다른 합성음이 난다. 없으면 게임이 무음이다.
- L24: 인게임에서 그라데이션 하늘, 언덕, 풀 덮인 지면, 나무 새총이 그려진다. 없으면 도형이 검은 캔버스 위에 떠 있다.
- L25: 어느 스테이지에서든 새총과 모든 구조물이 한 화면에 들어온다. 없으면 구조물 일부가 화면 밖에 잘린다.
- L26: 터치 기기에서 손가락으로 끌어 발사하면 마우스와 똑같이 동작하고 페이지가 스크롤되지 않는다. 없으면 터치 드래그가 페이지를 움직인다.
- L27: 창 크기를 바꾸면 게임 영역이 16:9를 유지한 채 창에 맞춰 커지거나 줄고, 클릭 위치가 정확히 맞는다. 없으면 새를 잡으려면 엉뚱한 곳을 눌러야 한다.
- L28: 비행 중인 노란 새에서 화면을 한 번 누르면 새가 진행 방향으로 급가속하고, 큰 새는 돌 기둥을 부순다. 없으면 5스테이지 이후 새 종류가 이름만 다르다.
- L29: 사용자가 `index.html`을 더블클릭하면 서버 없이 모든 스크립트와 스테이지가 로드된다. 없으면 콘솔에 CORS 오류가 찍히고 빈 화면이 뜬다.
- L30: 네트워크가 없어 Matter.js가 로드되지 않으면 "물리 엔진을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로 고침하세요."가 표시된다. 없으면 빈 화면만 보인다.
- L31: 10스테이지를 클리어하면 결과 제목이 "모든 스테이지 클리어!"가 되고 "다음" 버튼이 숨겨진다. 없으면 "다음"을 눌렀을 때 존재하지 않는 11스테이지를 로드하다 멈춘다.
- L32: 메인 화면을 열면 "새총 대작전" 제목이 크게 보인다. 없으면 무슨 게임인지 알 수 없다.

---

## 2. 문제 정의 / 목표
실행·테스트를 할 수 없는 구현자가 이 문서만 보고 파일을 쓴다. 그 파일을 사람이 브라우저로 처음 열었을 때 한 번에 (1) 메인 → 게임 시작 → 플레이, (2) 당겨 쏘기 → 포물선 → 충돌·파괴 → 클리어/실패, (3) 내용이 서로 다른 10스테이지, (4) 우측 일시정지 → 다시하기/메인으로가 동작해야 한다. 이 계획이 성공했다는 기준은 기능 목록의 양이 아니라, 배선과 접합부가 미리 결정되어 **첫 로드에 동작할 확률**이 최대가 되는 것이다.

## 3. 명시적 가정
| # | 가정 | 틀리면 영향 |
|---|---|---|
| A1 | **플레이 시점에 네트워크가 있고, jsDelivr의 `matter-js@0.19.0`이 열린다** (전체가 여기에 걸림) | 물리 엔진이 없으므로 게임이 시작되지 않는다. 가장 싼 조기 검증: B1(파일을 열고 부트 실패 문구가 뜨는지 본다). 대체 경로: §9의 "직접 구현" 되살리기 조건이 발동한다. 원과 AABB 기반 단순 물리로 `Phys`만 교체하고, 공개 시그니처는 그대로 둔다 |
| A2 | 사용자는 file://로 연다 | 로컬 서버로 열어도 클래식 스크립트는 동작하므로 손해가 없다 |
| A3 | **Matter 0.19.0에서 `collisionStart`는 충돌 해석 전에 발생하므로, 이벤트 시점의 `body.velocity`가 충돌 직전 속도다** (피해 규칙이 여기에 걸림) | 속도가 해석 후 값이면 피해가 작게 계산되어 돼지가 잘 죽지 않는다. 가장 싼 검증: B3(빨간 새가 1스테이지 돼지를 정면으로 맞혀 제거하는지). 대체 경로: `CONFIG.DAMAGE_SCALE` 값 하나만 올린다. 다른 코드는 바꾸지 않는다 |
| A4 | 대상은 최신 데스크톱 Chrome/Edge/Firefox/Safari이고, 터치는 부가 기능이다 | 구형 브라우저에서는 구조 분해 할당이나 `Pointer Events`가 없을 수 있다. 대응하지 않는다 |
| A5 | "우측" = 게임 영역의 우측 상단 | 좌표 두 개(`top`, `right`)만 바꾸면 된다 |
| A6 | "다시하기" = 현재 스테이지를 처음 상태로, "메인으로" = 타이틀 화면 | 의미가 다르면 §5.6 전이표에서 해당 행만 바꾼다 |
| A7 | `localStorage`가 file://에서 동작한다(Chrome은 동작함) | 저장만 세션 메모리로 떨어진다. 저장 코드는 try/catch로 감싸므로 게임은 계속 돈다 |

## 4. 전달 스택 (무엇을 왜 샀나)
- **평문 HTML/CSS/JS, 빌드 없음, 클래식 `<script src>` 순차 로드**: 구현자가 빌드할 수 없고, file://에서는 ES 모듈과 `fetch`가 차단된다. 그래서 `import`/`export`/`type="module"`/`fetch`/JSON 파일을 쓰지 않는다. 스테이지 데이터는 `window.STAGES` JS 전역에 둔다.
- **파일마다 IIFE 하나가 전역 네임스페이스 하나만 내보냄**(`window.Phys = (function(){ ... return {...}; })();`): 클래식 스크립트끼리는 최상위 `const`/`function` 이름이 충돌한다. 같은 이름을 두 번 선언하면 SyntaxError가 나서 그 파일 전체가 죽는다. IIFE로 감싸면 이 충돌 위험이 없어진다.
- **Matter.js 0.19.0 (jsDelivr)**: 회전하는 강체를 쌓았을 때의 안정성과 충돌 해석을 검증된 코드로 얻는다. 튜닝 루프가 0회인 구현자에게는 직접 구현보다 위험이 작다(§9). `Matter`는 `physics.js` 안에서만 쓴다.
- **Canvas 2D (자체 렌더러)**: 도형 아트와 파티클을 자유롭게 그리기 위해서다. `Matter.Render`와 `Matter.Runner`는 쓰지 않는다. 루프를 우리 것 하나로 유지해야 일시정지가 루프 안의 조건 하나로 끝나기 때문이다.
- **DOM 버튼 오버레이**: 클릭 판정을 브라우저에 맡긴다. 캔버스 좌표로 버튼 영역을 판정하는 코드를 없애기 위해서다.
- **Web Audio 합성, `localStorage`**: 바이너리 에셋이 필요 없는 표준 API다.

## 5. 아키텍처와 접합부

### 5.1 파일과 로드 순서
```
index.html  style.css
js/config.js  js/stages.js  js/audio.js  js/physics.js  js/render.js  js/ui.js  js/game.js  js/main.js
```
`index.html`의 `<body>` 끝에 아래 순서 **그대로** 넣는다(첫 줄은 복사한다).
```html
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js"></script>
<script src="js/config.js"></script>
<script src="js/stages.js"></script>
<script src="js/audio.js"></script>
<script src="js/physics.js"></script>
<script src="js/render.js"></script>
<script src="js/ui.js"></script>
<script src="js/game.js"></script>
<script src="js/main.js"></script>
```
`main.js`가 하는 일은 이것뿐이다: `typeof Matter === 'undefined'`이면 `UI.showBootError('물리 엔진을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로 고침하세요.')`, 아니면 `Game.init()`. 다른 파일은 정의만 하고, 최상위에서 아무것도 실행하지 않는다.

### 5.2 의존성 별칭 줄 (`physics.js`의 IIFE 첫 줄, 프로젝트 전체에서 이 한 곳에만)
```js
const { Engine, Composite, Bodies, Body, Events } = Matter;
```
이 다섯 개 말고 다른 Matter 모듈은 쓰지 않는다. `World`, `Runner`, `Render`, `Mouse`, `MouseConstraint` 금지.

### 5.3 심볼 표 (파일별 공개 API, 정확한 시그니처)
| 파일 | 전역 | 공개 멤버 |
|---|---|---|
| config.js | `window.CONFIG` | 상수 객체(§5.5). 함수 없음 |
| stages.js | `window.STAGES` | 길이 10 배열(§6). 헬퍼 `H(cx, m, k)`, `W(x, m, n)`, `P(cx, k)`, `pigAt(x, yb)`는 IIFE 안에서만 쓴다 |
| audio.js | `window.Sfx` | `unlock()`, `play(name)` — `name` ∈ `'launch'|'hit'|'break'|'pig'|'win'|'lose'|'click'` |
| physics.js | `window.Phys` | `createWorld(stage, onImpact)` → `{ engine, blocks, pigs }` · `destroyWorld(world)` · `step(world)` · `launchBird(world, type, x, y, vx, vy)` → `Body` · `dash(body, speed)` · `removeBody(world, body)` · `maxDynamicSpeed(world)` → `number` · `bodies(world)` → `Body[]` |
| render.js | `window.Render` | `init(canvas)` · `draw(G)` |
| ui.js | `window.UI` | `init(h)` · `show(view)` · `renderSelect(save)` · `showResult(info)` · `showBootError(msg)` |
| game.js | `window.Game` | `init()` (나머지는 전부 IIFE 내부 함수) |

세부 규약:
- `onImpact(bodyA, bodyB, relSpeed)`: `createWorld`가 `Events.on(engine, 'collisionStart', ...)`를 **정확히 한 번** 등록한다. 핸들러는 `ev.pairs`의 각 쌍에서 `pair.bodyA.parent`, `pair.bodyB.parent`를 꺼내고, 상대속도 `Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y)`를 계산해 `onImpact`를 부른다. 핸들러 안에서 바디를 제거하지 않는다(§5.8).
- 바디의 사용자 데이터는 `plugin`에 둔다: `{ kind: 'block'|'pig'|'bird', material, hp, maxHp, score, dead: false }`. 지면은 `label: 'ground'`이고 `plugin.kind`가 없다.
- `createWorld`: `Engine.create({ positionIterations: 10, velocityIterations: 8 })`. 중력은 설정하지 않는다(기본 y=1, scale=0.001). 지면은 `Bodies.rectangle(640, 690, 2000, 60, { isStatic: true, friction: 1, label: 'ground' })`로 만들고, 윗면이 y=660이다. 블록은 `Bodies.rectangle(b.x, b.yb - b.h / 2, b.w, b.h, {...재질})`, 돼지는 `Bodies.circle(p.x, p.yb - p.r, p.r, {...})`로 만든다. 전부 `Composite.add(engine.world, [...])`로 넣는다.
- `destroyWorld`: `Events.off(world.engine)` → `Composite.clear(world.engine.world, false)` → `Engine.clear(world.engine)`.
- `step`: `Engine.update(world.engine, CONFIG.STEP_MS)`. 인자는 이것뿐이고, 가변 delta는 넘기지 않는다.
- `launchBird`: `Bodies.circle(x, y, r, { density, friction: 0.6, restitution: 0.3, frictionAir: 0, label: 'bird', plugin: { kind: 'bird' } })` → `Composite.add` → `Body.setVelocity(body, { x: vx, y: vy })`. **새총 위의 새는 물리 바디가 아니다.** 발사 순간에 처음 생성된다(§8 홉3).
- `dash`: 현재 `body.velocity` 방향을 유지한 채 크기를 `speed`로 하는 `Body.setVelocity`.
- `maxDynamicSpeed`: `Composite.allBodies`에서 `!isStatic`인 바디의 `speed` 최댓값. 바디가 없으면 0.
- `UI.init(h)`의 `h` = `{ start, openSelect, pickStage, back, pause, resume, restart, toMain, next }`. 모든 버튼 리스너는 여기서 **한 번만** 등록한다. 스테이지 칸은 `#select-grid` 하나에 위임 리스너를 걸고, `data-index`를 읽어 `h.pickStage(i)`를 부른다. 결과 화면과 일시정지 화면의 다시하기는 둘 다 `h.restart`, 메인으로는 둘 다 `h.toMain`에 연결한다.
- `UI.showResult(info)`: `info = { win, score, stars, best, isLast }`.

### 5.4 초기 상태 선언 (`game.js` IIFE 안, 그대로 복사)
```js
const G = {
  state: 'MAIN',            // 'MAIN' | 'SELECT' | 'PLAYING' | 'PAUSED' | 'RESULT'
  stageIndex: 0,
  world: null,              // Phys.createWorld() 결과
  phase: 'NONE',            // 'NONE' | 'READY' | 'AIMING' | 'FLYING'
  birdQueue: [],            // 아직 새총에 오르지 않은 새 type
  birdType: null,           // 새총 위 또는 비행 중인 새 type
  bird: null,               // 발사된 새 Body. READY/AIMING 동안 null
  birdPos: { x: 200, y: 520 },
  pull: { x: 0, y: 0 },     // ANCHOR 기준 당김 벡터
  abilityUsed: false,
  pigsAlive: 0,
  score: 0,
  stepCount: 0,
  flightSteps: 0,
  settleSteps: 0,
  resultTimer: -1,
  resultWin: false,
  pendingRemove: [],
  particles: [],
  popups: [],
  save: { unlocked: 1, best: {} }   // best: { '1': { score, stars }, ... }
};
let loopStarted = false;
let lastTs = null;
let acc = 0;
let activePointerId = null;
```
`G`에 새 필드를 추가하지 않는다. 필요하면 이 블록에 먼저 추가한 다음 쓴다.

### 5.5 상수 (`config.js`, 그대로 복사) + 태그
```js
window.CONFIG = {
  W: 1280, H: 720, GROUND_Y: 660,
  STEP_MS: 1000 / 60, MAX_STEPS_PER_FRAME: 5, MAX_FRAME_MS: 100,
  G_PER_STEP: 0.2778,
  ANCHOR: { x: 200, y: 520 }, GRAB_RADIUS: 60, MAX_PULL: 120, MIN_PULL: 15,
  LAUNCH_K: 0.17, DASH_SPEED: 22, TRAJ_STEPS: 36,
  GRACE_STEPS: 30, DAMAGE_MIN_SPEED: 1.5, STATIC_MASS: 4, DAMAGE_SCALE: 1,
  SETTLE_SPEED: 0.2, SETTLE_STEPS: 45, MIN_FLIGHT_STEPS: 60, MAX_FLIGHT_STEPS: 600,
  WIN_DELAY: 60, LOSE_DELAY: 60,
  OOB: { left: -200, right: 1480, bottom: 900 },
  SCORE_PIG: 5000, BIRD_BONUS: 10000, SAVE_KEY: 'slingshot-save-v1',
  MATERIALS: {
    wood:  { density: 0.002,  friction: 0.8, restitution: 0.1,  hp: 40,  score: 500, color: '#b5793a' },
    ice:   { density: 0.0015, friction: 0.3, restitution: 0.1,  hp: 15,  score: 300, color: '#a8dcf0' },
    stone: { density: 0.004,  friction: 0.9, restitution: 0.05, hp: 120, score: 800, color: '#8a8f98' }
  },
  PIG: { density: 0.001, friction: 0.8, restitution: 0.2, hp: 15, r: 20, color: '#6cc24a' },
  BIRDS: {
    red:    { r: 18, density: 0.004, color: '#d9342b' },
    yellow: { r: 16, density: 0.004, color: '#f2c81e' },
    big:    { r: 26, density: 0.005, color: '#5a3b8c' }
  }
};
```
| 값 | 태그 | 근거 / 교체 시점 |
|---|---|---|
| `STEP_MS` | (a) 유도 | Matter 기준 delta가 16.667ms다. 이 값이면 경고가 없고, 속도 단위가 "px/스텝"으로 고정된다 |
| `G_PER_STEP` | (a) 유도 | gravity.y 1 × scale 0.001 × 16.667² = 0.2778 px/스텝². 궤적 예측이 실제 비행과 겹치는 근거다. 그래서 새의 `frictionAir: 0` |
| `MAX_PULL`·`LAUNCH_K` | (a) 유도 | 최대 속도 120×0.17=20.4, 45° 사거리 20.4²/0.2778≈1498px. 가장 먼 목표까지 거리(1260−200=1060px)보다 크다 |
| `DASH_SPEED` | (a) 유도 | 스텝당 이동량이 가장 얇은 블록 두께(20px)×1.1 이하여야 터널링을 억제할 수 있다 |
| `GROUND_Y` | (a) 유도 | H − 지면 두께 60 |
| 재질·돼지·새의 `hp`/`density`, `STATIC_MASS`, `DAMAGE_*`, `GRACE_STEPS` | (b) 수명 제한 | 설계 부등식에서 나온 값이다(§5.8). 사람이 B3·B9를 처음 플레이할 때 교체한다. 교체할 때는 §5.8의 부등식을 유지해야 한다 |
| `SETTLE_*`, `*_FLIGHT_STEPS`, `*_DELAY` | (b) 수명 제한 | 사람이 B7을 처음 플레이할 때 교체한다(턴 전환이 늘어지면 줄인다) |
| `W`·`H`, `ANCHOR`, `GRAB_RADIUS`, `MIN_PULL`, `TRAJ_STEPS`, `MAX_STEPS_PER_FRAME`, `MAX_FRAME_MS`, `OOB`, 점수 값, 색상 | (c) 임의 선언 | 16:9 관례, 장르 관례, 폭주 방지용 상한 |

### 5.6 상태 머신 (모든 핸들러는 첫 줄에서 `from` 상태를 확인하고, 다르면 return한다)
| from | 이벤트 | to | 부수 효과 |
|---|---|---|---|
| MAIN | `#btn-start` | PLAYING | `Sfx.unlock()`, `loadStage(Math.min(G.save.unlocked, 10) - 1)` (저장이 없으면 0) |
| MAIN | `#btn-select` | SELECT | `UI.renderSelect(G.save)` |
| SELECT | 해제된 칸 i | PLAYING | `Sfx.unlock()`, `loadStage(i)` |
| SELECT | `#btn-select-back` | MAIN | — |
| PLAYING | `#btn-pause` / Esc / `visibilitychange`(hidden) | PAUSED | AIMING 중이면 조준을 취소한다(`birdPos=ANCHOR`, `phase='READY'`, `activePointerId=null`) |
| PAUSED | `#btn-resume` / Esc | PLAYING | — |
| PAUSED, RESULT | `#btn-restart`, `#btn-result-restart` | PLAYING | `loadStage(G.stageIndex)` |
| PAUSED, RESULT | `#btn-main`, `#btn-result-main` | MAIN | `teardownWorld()` |
| PLAYING | `resultTimer`가 0이 됨 | RESULT | `finish(G.resultWin)` |
| RESULT | `#btn-result-next` (승리이고 isLast가 아닐 때) | PLAYING | `loadStage(G.stageIndex + 1)` |

`UI.show(view)`에서 보이는 요소(나머지는 `.hidden { display: none }`):
| view | 보임 |
|---|---|
| `'main'` | `#screen-main` |
| `'select'` | `#screen-select` |
| `'playing'` | `#btn-pause` |
| `'paused'` | `#overlay-pause` (`#btn-resume`, `#btn-restart`, `#btn-main`) |
| `'result'` | `#overlay-result` (`#result-title`, `#result-score`, `#result-stars`, `#result-best`, `#btn-result-restart`, `#btn-result-next`, `#btn-result-main`) |

`#boot-error`는 `showBootError`만 보이게 한다. 캔버스 `#game`은 항상 보이고, 월드가 없을 때는 배경만 그린다.

DOM 구조: `<div id="wrap">` 안에 `<canvas id="game" width="1280" height="720">`과 위 요소들을 둔다. `#wrap`은 1280×720 고정, `position: absolute`, `transform-origin: 0 0`이다. `resize` 때 `s = Math.min(innerWidth/1280, innerHeight/720)`로 `transform: scale(s)`를 주고, `left`/`top`으로 가운데 정렬한다. 오버레이는 `#wrap` 안에서 `position: absolute; inset: 0`. `#btn-pause`는 `position: absolute; top: 16px; right: 16px; width: 56px; height: 56px`, 텍스트 "II", `aria-label="일시정지"`. 캔버스에는 `touch-action: none`을 준다.

### 5.7 루프 (game.js) — 단 하나, 타이머 0개
- `startLoop()`: `if (loopStarted) return; loopStarted = true; requestAnimationFrame(loop);`. `Game.init()`에서만 부른다.
- `loop(ts)`: ① `requestAnimationFrame(loop)` ② `lastTs === null`이면 `lastTs = ts` ③ `dt = Math.min(ts - lastTs, CONFIG.MAX_FRAME_MS); lastTs = ts` ④ `G.state === 'PLAYING'`이면 `acc += dt`, 그리고 `acc >= STEP_MS`이고 스텝 수가 `MAX_STEPS_PER_FRAME`보다 작은 동안 `stepOnce(); acc -= STEP_MS`. 상한에 걸리면 `acc = 0`. PLAYING이 아니면 `acc = 0` ⑤ 상태와 무관하게 `Render.draw(G)`.
- **일시정지는 ④의 조건 하나로 실현된다.** 물리, 파티클, 턴 판정, 결과 대기(`resultTimer`)가 전부 `stepOnce` 안에서 스텝 단위로 세어지므로 한꺼번에 멈춘다. 그래서 `setTimeout`/`setInterval`은 프로젝트 어디에도 쓰지 않는다.
- `stepOnce()` 순서: `Phys.step(G.world)` → `pendingRemove` 처리 → 월드 밖 검사(`OOB` 밖의 블록·돼지는 파괴로, 새는 `removeBody` 후 `G.bird=null`) → `G.stepCount++` → 턴 판정(§5.8) → 승패 타이머 → 파티클·팝업 갱신(위치 += 속도, 수명 −1).
- `Game.init()` 순서: `Render.init(canvas)` → `G.save = loadSave()` → `UI.init(handlers)` → 캔버스에 `pointerdown`/`pointermove`/`pointerup`/`pointercancel`, `window`에 `keydown`·`resize`, `document`에 `visibilitychange` 등록 → `fit()` → `UI.show('main')` → `startLoop()`. **`addEventListener`는 `Game.init`과 `UI.init` 안에만 있다.**
- `teardownWorld()`: `if (G.world) Phys.destroyWorld(G.world)` 후 `world`, `bird`를 null로, `pendingRemove`, `particles`, `popups`를 빈 배열로.
- `loadStage(i)`: `teardownWorld()` → `G.stageIndex=i`, `score=0`, `stepCount=0`, `flightSteps=0`, `settleSteps=0`, `resultTimer=-1`, `resultWin=false`, `abilityUsed=false` → `G.world = Phys.createWorld(STAGES[i], onImpact)` → `G.birdQueue = STAGES[i].birds.slice(); G.birdType = G.birdQueue.shift()` → `G.birdPos = { x: ANCHOR.x, y: ANCHOR.y }` → `G.pigsAlive = G.world.pigs.length` → `G.phase = 'READY'` → **마지막 줄에서** `G.state = 'PLAYING'`, `UI.show('playing')`.

### 5.8 입력·충돌·파괴·점수·판정 규칙
- **좌표 변환**: `r = canvas.getBoundingClientRect(); x = (e.clientX - r.left) * 1280 / r.width; y = (e.clientY - r.top) * 720 / r.height`. transform이 걸려 있어도 맞다.
- **잡기**(`pointerdown`): `state==='PLAYING' && phase==='READY'`이고 `ANCHOR`까지 거리가 `GRAB_RADIUS` 이하이면 `phase='AIMING'`, `activePointerId=e.pointerId`, `canvas.setPointerCapture(e.pointerId)`. 대신 `phase==='FLYING' && birdType==='yellow' && !abilityUsed && G.bird`이면 `Phys.dash(G.bird, DASH_SPEED)`, `abilityUsed=true`, `Sfx.play('launch')`.
- **당김**(`pointermove`, 같은 pointerId): `d = pointer − ANCHOR`. 길이가 `MAX_PULL`을 넘으면 그 길이로 자른다. `G.pull=d`, `G.birdPos = ANCHOR + d`.
- **놓기**(`pointerup`): `|d| < MIN_PULL`이면 취소한다(`birdPos=ANCHOR`, `phase='READY'`). 아니면 `G.bird = Phys.launchBird(G.world, G.birdType, birdPos.x, birdPos.y, -d.x * LAUNCH_K, -d.y * LAUNCH_K)`, `phase='FLYING'`, `flightSteps=0`, `settleSteps=0`, `Sfx.play('launch')`. `pointercancel`은 취소와 같다. 둘 다 끝에 `activePointerId=null`.
- **궤적 예측**(AIMING 동안 render가 그림): `p=birdPos`, `v=−d·LAUNCH_K`에서 시작해 `TRAJ_STEPS`회 `v.y += G_PER_STEP; p += v`를 반복한다. 3스텝마다 점을 찍고, 점이 멀어질수록 alpha를 낮춘다.
- **피해**(`onImpact(a, b, rel)`): `G.stepCount < GRACE_STEPS` 또는 `rel < DAMAGE_MIN_SPEED`이면 무시한다. 아니면 `a`, `b` 각각에 대해, `plugin.hp`가 있고 `!plugin.dead`이면 `hp -= rel × (상대가 isStatic ? STATIC_MASS : 상대.mass) × DAMAGE_SCALE`를 적용한다. `hp <= 0`이 되면 **그 자리에서** `dead=true`로 만들고 `pendingRemove.push(body)`한다(한 스텝에 여러 쌍이 겹쳐도 한 번만 들어간다). `rel > 4`이면 `Sfx.play('hit')`.
- **설계 부등식**(튜닝할 때 지킬 것, 질량=면적×밀도): 빨간 새(질량≈4.07)가 최대 속도로 치면 나무(40)는 부서지고 돌(120)은 안 부서진다(≈83). 큰 새(≈10.6)는 속도 12 이상에서 돌을 부순다. 얼음(15)은 빨간 새가 속도 4만 되어도 부서진다. 돼지(15)는 약 40px 높이에서 지면에 떨어지면 죽는다(속도≈4.7×4≈19).
- **파괴 처리**(`pendingRemove`): `Phys.removeBody` → 블록이면 `score += 재질.score`, 돼지면 `score += SCORE_PIG`, `pigsAlive--` → 파편 8~12개와 `+점수` 팝업 생성 → `Sfx.play(돼지 ? 'pig' : 'break')`. 처리한 뒤 배열을 비운다.
- **턴 판정**(`phase==='FLYING'`): 매 스텝 `flightSteps++`. `Phys.maxDynamicSpeed(world) < SETTLE_SPEED`이면 `settleSteps++`, 아니면 0으로 되돌린다. 턴은 `flightSteps >= MIN_FLIGHT_STEPS`이면서 (`settleSteps >= SETTLE_STEPS` 또는 `flightSteps >= MAX_FLIGHT_STEPS`)일 때 끝난다. 턴이 끝나면: 돼지가 남아 있고 새가 남아 있으면 이전 새를 제거하고, `birdType = birdQueue.shift()`, `birdPos = ANCHOR`, `abilityUsed=false`, `phase='READY'`. 새가 남아 있지 않으면 `phase='NONE'`, `resultWin=false`, `resultTimer=LOSE_DELAY`.
- **승리 판정**: 매 스텝 `pigsAlive === 0 && !resultWin`이면 `resultWin=true`, `resultTimer=WIN_DELAY`, `phase='NONE'`(실패 대기 중이어도 승리로 덮어쓴다). `resultTimer > 0`이면 1씩 줄이고, 0이 되는 스텝에 `finish(resultWin)`.
- **finish(win)**: `left = birdQueue.length + (phase가 READY/AIMING이었으면 1)`. 이 값은 phase를 NONE으로 바꾸기 **전에** 기록해 둔다. 승리하면 `score += left × BIRD_BONUS`, `stars = 1 + Math.min(2, left)`, 저장을 갱신한다(`best[id]`는 score와 stars를 각각 최댓값으로, `unlocked = Math.max(unlocked, Math.min(10, stageIndex + 2))`). 그다음 `writeSave()` → `Sfx.play(win ? 'win' : 'lose')` → `UI.showResult({ win, score, stars, best, isLast: stageIndex === 9 })` → `state='RESULT'`, `UI.show('result')`. 별 규칙의 근거: 스테이지마다 새가 돼지 수보다 1마리 많다(§6.3). 그래서 3별을 받으려면 한 발로 돼지를 둘 이상 잡아야 한다.
- **저장**: `loadSave()`는 `JSON.parse(localStorage.getItem(SAVE_KEY))`를 try/catch로 읽는다. `unlocked`가 1~10 사이 정수가 아니면 기본값을 쓴다. `writeSave()`도 try/catch로 감싸고, 실패하면 무시한다.
- **오디오**: `Sfx.unlock()`은 처음 불릴 때 `new (window.AudioContext || window.webkitAudioContext)()`와 마스터 게인(0.25)을 만들고, `suspended` 상태면 `resume()`한다. `ctx`가 없으면 `play`는 아무것도 하지 않는다. 같은 이름의 소리가 60ms 안에 다시 요청되면 무시한다(`ctx.currentTime`으로 비교). 소리 구성: launch=톱니파 하강 스윕 0.25s, hit=사인 120→60Hz 0.12s, break=노이즈 버퍼+밴드패스 0.2s, pig=사각파 600→900Hz 0.15s, win=C-E-G-C 아르페지오, lose=G-E-C 하강, click=사인 800Hz 0.05s. 모든 버튼 핸들러는 `Sfx.play('click')`을 부른다.

### 5.9 렌더 (`Render.draw(G)`, 그리는 순서)
하늘 세로 그라데이션 → 언덕 2겹 → 지면(y≥660, 흙과 풀 띠) → 새총 뒤쪽 가지 → 월드 바디(블록은 `body.vertices` 경로로 채우고 재질 색과 어두운 테두리. `hp/maxHp < 0.5`이면 금 선 2개. 돼지는 `body.position`, `body.circleRadius`, `body.angle`로 원·눈·코를 그리고 손상 시 멍 자국. 발사된 새는 타입 색 원과 눈) → READY/AIMING이면 `birdPos`의 새와 양쪽 고무줄 → 새총 앞쪽 가지 → AIMING이면 궤적 점 → 파티클 → 팝업 → HUD(좌상단에 "스테이지 N · 이름", 점수, `birdQueue` 아이콘). `G.world`가 null이면 하늘·언덕·지면만 그린다.

---

## 6. 스테이지 콘텐츠 (콘텐츠 축)

### 6.1 스키마와 예시 1개 (그대로 복사)
```js
// 좌표: x=중심, yb=바닥 모서리 y (지면=660), 블록은 축 정렬만, 회전 없음
{ id: 1, name: '첫 발사', birds: ['red', 'red', 'red'],
  blocks: [ { m: 'wood', x: 900,  yb: 660, w: 20,  h: 80 },
            { m: 'wood', x: 1000, yb: 660, w: 20,  h: 80 },
            { m: 'wood', x: 950,  yb: 580, w: 140, h: 20 } ],
  pigs:   [ { x: 950, yb: 660, r: 20 } ] }
```

### 6.2 저작 모듈 (`stages.js` IIFE 내부 헬퍼. 블록 배열을 반환하고 `blocks: [].concat(...)`로 합친다)
- `H(cx, m, k)` — k층(0부터) 오두막: 기둥 `{m, x: cx-50, yb: 660-100k, w:20, h:80}`, `{m, x: cx+50, ...}`, 보 `{m, x: cx, yb: 580-100k, w:140, h:20}`. 한 층의 높이는 100이다. 스테이지 1은 `H(950,'wood',0)`과 같다.
- `W(x, m, n)` — 40×40 상자 n개를 세운 벽. j번째 상자는 `yb: 660-40j`.
- `P(cx, k)` — k층 바닥(= k−1층 보의 윗면, k=0이면 지면)의 돼지 `{x: cx, yb: 660-100k, r: 20}`. `k`가 탑의 층수와 같으면 지붕 위다.
- `pigAt(x, yb)` — 임의 위치의 돼지 `{x, yb, r: 20}`.

### 6.3 10개 스테이지 (난이도 곡선: 돼지 수↑, 재질 강도↑, 높이↑. 여유 새 1마리는 1스테이지만 2마리)
| # | 이름 | birds | blocks | pigs | 새로 배우는 것 |
|---|---|---|---|---|---|
| 1 | 첫 발사 | R R R | `H(950,wood,0)` | `P(950,0)` | 당겨 쏘기 |
| 2 | 나무 탑 | R R R | `H(850,wood,0)`, `H(1080,wood,0)`, `H(1080,wood,1)` | `P(850,0)`, `P(1080,1)` | 위층 무너뜨리기 |
| 3 | 얼음 벽 | R R R | `W(760,ice,3)`, `H(900,wood,0)`, `W(1000,ice,2)`, `H(1100,wood,0)` | `P(900,0)`, `P(1100,0)` | 얼음은 약하다 |
| 4 | 높은 성루 | R R R | `W(850,wood,2)`, `H(1050,wood,0)`, `H(1050,wood,1)`, `H(1050,wood,2)` | `P(1050,1)`, `P(1050,3)` | 높게 던지기 |
| 5 | 노란 새 | R Y Y R | `W(800,wood,4)`, `W(840,wood,4)`, `H(1000,wood,0)`, `H(1000,wood,1)`, `H(1170,wood,0)` | `P(1000,0)`, `P(1000,1)`, `P(1170,0)` | 대시로 두꺼운 벽 뚫기 |
| 6 | 돌 방벽 | R Y R Y | `W(820,stone,3)`, `H(950,wood,0)`, `H(950,wood,1)`, `H(1130,stone,0)` | `P(950,0)`, `P(950,2)`, `P(1130,1)` | 돌은 넘겨 쏜다 |
| 7 | 무거운 새 | B B R R | `W(820,stone,2)`, `H(1000,stone,0)`, `H(1000,wood,1)`, `H(1170,wood,0)` | `P(1000,0)`, `P(1000,2)`, `P(1170,0)` | 큰 새로 돌 부수기 |
| 8 | 쌍둥이 요새 | R Y B R Y | `W(760,ice,2)`, `H(860,ice,0)`, `H(860,wood,1)`, `H(1110,stone,0)`, `H(1110,wood,1)`, `H(1110,wood,2)` | `P(860,0)`, `P(860,2)`, `P(1110,1)`, `P(1110,3)` | 목표 둘로 나누기 |
| 9 | 피라미드 | R Y B Y B | `H(850,wood,0)`, `H(1000,stone,0)`, `H(1150,wood,0)`, `H(925,ice,1)`, `H(1075,ice,1)`, `H(1000,wood,2)` | `P(850,0)`, `P(1000,0)`, `P(1150,0)`, `P(1000,3)` | 층별 연쇄 붕괴 |
| 10 | 성채 | R Y B Y B R | `W(760,stone,3)`, `H(880,wood,0)`, `H(1030,stone,0)`, `H(1180,wood,0)`, `H(955,ice,1)`, `H(1105,ice,1)`, `H(1030,wood,2)` | `P(880,0)`, `P(1030,0)`, `P(1180,0)`, `P(1030,3)`, `pigAt(760,540)` | 세 재질 종합 |

(R=`'red'`, Y=`'yellow'`, B=`'big'`, 재질은 문자열 `'wood'|'ice'|'stone'`.) 블록 수는 3, 9, 11, 11, 17, 12, 11, 17, 18, 21이다. 5스테이지에서 새 수가 한 번 늘어나는 것은 의도한 것이다. 새 능력(대시)을 처음 배우는 스테이지라서, 곡선을 한 칸 낮춰 쉬어 가게 했다.

### 6.4 저작 규칙 (구현자가 자기 `stages.js`를 읽어서 확인한다)
- R-a: 모든 블록과 돼지의 x 범위가 [650, 1260] 안에 있다.
- R-b: 위층 오두막의 두 기둥 중심은 모두 아래층 보(cx±70) 안에 있다. 9·10스테이지의 조합은 이미 확인했다. 예를 들어 `H(925,ice,1)`의 기둥 875와 975는 각각 보 780–920과 930–1070 위에 있다.
- R-c: 같은 높이의 블록끼리 x 구간이 겹치지 않는다. 오두막 중심 간격은 150 이상이다.
- R-d: 돼지 원이 어떤 블록과도 겹치지 않는다. 오두막 안쪽 폭은 80, 높이는 80이고 돼지 지름은 40이다.
- R-e: `birds.length === pigs.length + 1`이다. 1스테이지만 +2.
- R-f: 돌 오두막 안에 갇힌 돼지가 있는 스테이지(7, 9, 10)의 birds에는 `'big'`이 있다.
- R-g: `STAGES.length === 10`이고, `id`는 1~10이다.

---

## 7. 접근과 단계 (의존 순서. 번호는 사다리가 아니다. S3·S4·S6은 S2가 끝나면 서로 독립이다)
| 단계 | 선행 | 산출 | 검증(읽어서 확인) | 대응 |
|---|---|---|---|---|
| S1 골격 | 없음 | `index.html`(§5.1 순서, §5.6 id), `style.css`, `config.js`(§5.5), `main.js` | id 목록과 script 순서가 문서와 한 글자씩 일치 | L27, L29, L30 |
| S2 얇은 종단 슬라이스 | S1 | `physics.js` 전체, `game.js`의 루프·loadStage·입력·피해·승리·finish, `render.js`(단색 도형), `ui.js`의 main/playing/result, `stages.js`는 1번만 | §8 체인의 홉 5개가 각각 코드의 어느 줄에서 참이 되는지 짚을 수 있다 | L04, L05, L07~L09 |
| S3 일시정지 경로 | S2 | pause/resume/restart/toMain, Esc, visibilitychange, `#overlay-pause` | §5.7 "타이머 0개·리스너는 init에만"을 grep처럼 읽어 확인 | L12~L17 |
| S4 턴 루프 완성 | S2 | 턴 판정, 다음 새, 실패, OOB, yellow/big | §5.8 턴 판정 문장과 코드가 1:1로 대응 | L10, L11, L28 |
| S5 콘텐츠·진행 | S4(새 종류), S3 | `stages.js` 10개(§6.3), 선택 화면, 저장, 다음 스테이지, 전 스테이지 클리어 | §6.4 R-a~R-g를 스테이지마다 확인 | L01~L03, L19~L21, L31 |
| S6 폴리시(이름 붙은 단계, 빼지 않는다) | S2의 훅(`onImpact`, 파괴 처리, `finish`) | 배경·새총·돼지 얼굴 아트, 손상 금, 궤적 점, 파티클, 팝업, `audio.js` 7종, 결과 화면 별 연출, 메인 제목 | 1.2의 품질 하한 문장마다 대응하는 코드가 있다 | L06, L18, L22~L25, L32 |
| S7 정적 자기 점검 | S1~S6 | §11(A) 체크리스트 전부 | 항목마다 통과 표시 | 전체 |

---

## 8. Load-bearing path — "게임 시작"에서 첫 클리어까지
후보 경로를 그대로 채택했고, 5홉으로 압축했다. 이 경로가 끊기면 나머지는 모두 장식이다.

| 홉 | 이름 | 통과 조건 | 그 조건이 처음 참이 되는 곳 |
|---|---|---|---|
| 1 | `#btn-start` 클릭 → `h.start` → `loadStage(0)` | `typeof Matter !== 'undefined'`, `UI.init(h)`가 리스너를 등록함, `G.state==='MAIN'` | Matter `<script>`가 첫 줄(S1) → `main.js`가 `Game.init()` 호출 → `UI.init`, `UI.show('main')`. `G.state`는 선언 초기값 |
| 2 | `loadStage(0)` → 월드 생성, `phase='READY'`, `state='PLAYING'` | `STAGES[0]`이 존재함, `Phys.createWorld`가 `Events.on`을 등록함, `pigsAlive > 0` | `stages.js`가 `game.js`보다 먼저 로드됨(S1 순서), `createWorld` 본문(S2), `pigsAlive` 대입은 `state` 대입보다 앞 줄(§5.7) |
| 3 | pointerdown/move/up → `Phys.launchBird(...)` → `phase='FLYING'` | `state==='PLAYING' && phase==='READY'`, ANCHOR까지 거리 ≤ `GRAB_RADIUS`(변환된 좌표 기준), 같은 `activePointerId`, `|d| ≥ MIN_PULL` | 홉2의 마지막 줄. 캔버스 리스너는 `Game.init`에서 한 번 등록. `birdPos`는 loadStage가 ANCHOR로 둔다 |
| 4 | `loop` → `stepOnce` → `Phys.step` → `onImpact` → 돼지 `dead` → `pendingRemove` 처리 → `pigsAlive--` | `loopStarted` 루프가 돌고 `state==='PLAYING'`, `stepCount ≥ GRACE_STEPS`, `rel ≥ DAMAGE_MIN_SPEED`, 누적 피해 ≥ 돼지 hp | `startLoop()`는 `Game.init` 끝에서 호출. `stepCount`는 loadStage에서 0이 되고, 스텝마다 +1(30스텝=0.5초. 새가 날아가는 동안 이미 넘는다) |
| 5 | `pigsAlive===0` → `resultTimer=WIN_DELAY` → 0 → `finish(true)` → 결과 화면에 "클리어" 표시 | `!resultWin`, 스텝이 계속 돎(PLAYING) | 홉4의 감소가 일어난 그 스텝의 승리 판정 |

콜드 스타트 표 (위 통과 조건에 나오는 모든 상태):
| 상태 | 첫 진입 값 | 누가 바꾸나 | 언제 |
|---|---|---|---|
| `Matter` 전역 | CDN 로드 후 객체, 실패 시 undefined | 브라우저 | 첫 `<script>` 실행 |
| `STAGES` | 길이 10 배열 | `stages.js` | 두 번째 로컬 script |
| `G.state` | `'MAIN'` | 전이표 핸들러, `loadStage`, `finish` | 클릭 / loadStage 마지막 줄 / 결과 타이머 0 |
| `G.phase` | `'NONE'` | `loadStage`(READY), 입력(AIMING/FLYING), 턴 판정, 승패 | 해당 이벤트 |
| `G.world` | `null` | `loadStage`(생성), `teardownWorld`(null) | 스테이지 진입/이탈 |
| `G.pigsAlive` | `0` | `loadStage`(대입), 파괴 처리(−1) | `state='PLAYING'`보다 앞. 그래서 0인 채로 승리 판정이 도는 일은 없다 |
| `G.stepCount` | `0` | `loadStage`(0), `stepOnce`(+1) | 매 스텝 |
| `G.resultTimer` / `G.resultWin` | `-1` / `false` | 승패 판정, `loadStage` | 판정 스텝 |
| `loopStarted` / `lastTs` / `acc` | `false` / `null` / `0` | `startLoop` / `loop` | `Game.init` 끝 / 매 프레임 |
| `activePointerId` | `null` | pointerdown(설정), up/cancel/pause(null) | 입력 이벤트 |
| 이벤트 리스너(DOM) | 없음 | `Game.init`, `UI.init` | 부트 시 1회뿐 |
| `collisionStart` 리스너 | 없음 | `createWorld`(on), `destroyWorld`(off) | 스테이지마다 1개 |

**일시정지 경로의 배선**(명시 요구사항이라 여기서 확정한다): 정지는 §5.7 ④의 `state==='PLAYING'` 조건 하나로 이루어진다. 모든 시간 흐름이 스텝 카운터이므로 멈추지 않는 것이 남지 않는다. 다시하기로 남는 이중 실행은 세 가지 결정으로 막는다: (1) rAF 체인은 `loopStarted`가 지키는 한 개뿐이다 (2) DOM 리스너는 init에서만 등록한다 (3) 엔진은 스테이지마다 새로 만들고 `destroyWorld`가 `Events.off`를 부른다. 타이머가 없으니 끌 타이머도 없다.

---

## 9. 대안과 기각 이유
| 대안 | 기각 이유 | 되살리기 조건 |
|---|---|---|
| 물리 직접 구현 | 회전 강체 쌓기의 안정성(떨림, 관통, 저절로 무너짐)을 튜닝 없이 한 번에 맞춰야 한다. 실행할 수 없는 구현자에게는 CDN 한 줄보다 위험하다 | B1/B11에서 플레이 환경이 오프라인이거나 CDN이 차단된 것으로 확인되면 되살린다. 그때는 `Phys`의 공개 시그니처를 유지한 채 교체한다 |
| Matter 0.20.0 | 0.19.0 기준으로 API(`engine.gravity`, 이벤트 순서)를 확정했다. 두 버전을 섞으면 회상 오류가 생길 수 있다 | 0.19.0에서 재현되는 엔진 버그가 B 시나리오에서 관측되면 |
| `Matter.Render` / `Matter.Runner` | 와이어프레임 기본값이라 아트 표현이 제한된다. Runner는 두 번째 루프라서, 일시정지가 두 곳을 멈춰야 한다 | 자체 렌더러에서 회전 바디의 그림과 물리가 어긋나는 것이 B3에서 관측되면 Render만 재검토 |
| ES 모듈 + JSON 스테이지 fetch | file://에서 CORS로 조용히 실패한다 | 배포가 항상 http 서버로 확정되면 |
| 캔버스 안에 그린 버튼 | 좌표로 클릭을 판정하는 코드가 늘어난다 | DOM 오버레이와 캔버스의 정렬이 B2에서 어긋나면 |
| Phaser 등 게임 프레임워크 | 회상해야 할 API 표면이 크고, 씬과 루프를 프레임워크가 소유한다 | 구현자가 실행과 테스트를 할 수 있는 환경이 되면 |
| 새를 조준 중 static 바디로 두기 | 생성 옵션 `isStatic`과 `setStatic(false)`의 질량 복원 동작을 회상에 의존하게 된다 | 새총 위의 새가 다른 바디와 물리적으로 상호작용해야 하는 요구가 생기면 |

## 10. 위험과 완화
| 위험 | 완화 |
|---|---|
| Matter API 회상 오류(`World.add`, 별칭 없이 쓴 `Composite` 등) | 별칭 줄 하나와 사용 가능한 모듈 5개로 제한(§5.2). `Matter`는 physics.js에서만 쓴다 |
| 있지도 않은 버전(`2.0.20` 등)을 적음 | URL을 복사 가능한 완전 문자열로 줬다(§5.1). 다른 버전 문자열은 금지 |
| 초기 배치가 겹쳐 로드 직후 폭발하거나 돼지가 죽음 | `yb` 좌표와 모듈 헬퍼로 딱 맞닿게 배치하고, `GRACE_STEPS` 동안 피해 무시 |
| 고속 새의 관통 | 속도 상한 20.4/22, 블록 두께 20 이상 |
| 다시하기 후 이중 실행 | §8의 세 가지 결정, §11 A4~A6 |
| 풀 수 없는 스테이지 | R-e, R-f, 설계 부등식. 최종 확인은 B9 |
| 오디오 자동재생 정책 | `Sfx.unlock()`을 클릭 핸들러 안에서 호출. `ctx`가 없으면 무음으로 넘어감 |
| 터치 스크롤과 포인터 손실 | `touch-action: none`, `setPointerCapture`, `pointercancel` = 취소 |
| 스크립트 간 이름 충돌 | 파일마다 IIFE 하나, 전역은 심볼 표에 있는 것만 |
| 탭 복귀 시 시간 폭주 | `MAX_FRAME_MS` 클램프와 자동 일시정지 |

## 11. 완료 정의
**(A) 구현자가 자기 산출물을 읽어서 확인한다. 전부 통과해야 완료다.**
- A1: `index.html`의 script 순서와 CDN 문자열이 §5.1과 글자 단위로 같다.
- A2: `Matter`라는 식별자는 `physics.js`의 별칭 줄과 `main.js`의 `typeof Matter` 검사에만 나온다.
- A3: `import`, `export`, `type="module"`, `fetch(`, `XMLHttpRequest`가 어느 파일에도 없다.
- A4: `setTimeout`, `setInterval`이 어느 파일에도 없다.
- A5: `requestAnimationFrame(`은 `startLoop`와 `loop` 안에만 있고, `startLoop`의 첫 줄은 `loopStarted` 검사다.
- A6: `addEventListener`는 `Game.init`과 `UI.init` 본문에만 있다. `Events.on`은 `createWorld`에 한 번, `Events.off`는 `destroyWorld`에 한 번 있다.
- A7: §5.6에 나오는 모든 id가 `index.html`에 있고, `getElementById`의 문자열과 일치한다.
- A8: 파일 사이의 모든 호출이 §5.3 시그니처의 인자 순서와 일치한다. 쓰인 `G.` 필드는 모두 §5.4에 선언되어 있다.
- A9: `STAGES`가 §6.3의 10행을 그대로 옮겼고, R-a~R-g를 통과한다.
- A10: 1.3의 동사 문장마다, 그 결과를 만드는 함수 이름을 하나씩 짚을 수 있다.

**(B) 사후에 사람이 수행하는 수용 시나리오.** 측정 주체는 모두 평가자다. 도구는 최신 데스크톱 Chrome, 눈, 스톱워치다. 구현자에게 할당하지 않는다.
- B0: Node가 있는 검토자가 `for f in js/*.js; do node --check "$f" || exit 1; done`를 실행하면 exit 0이다(구문 오류 0개).
- B1: 네트워크를 켠 상태에서 `index.html`을 더블클릭하면 3초 안에 제목과 버튼 2개가 보인다(스톱워치).
- B2: "게임 시작"을 누르면 1스테이지가 뜨고, "II" 버튼의 오른쪽 끝이 게임 영역 오른쪽 끝에서 논리 좌표 80px 안에 있다(요소 검사로 `right: 16px`, 폭 56 확인).
- B3: 새를 최대로 당겨 45° 좌하단으로 놓으면 조준 중에 점선이 보이고, 새가 x ≥ 700 구역에 도달한다(유도값: 사거리 ≈1498px). 오두막을 맞혀 돼지를 없애면 점수가 5000 이상이 되고, 2초 안에 "클리어"와 별이 표시된다.
- B4: 새가 날고 있을 때 "II"를 누르고 5초 기다린다. 블록·파편·새의 위치가 전혀 변하지 않는다(시작과 끝의 스크린샷 두 장이 같다). "계속하기"를 누르면 같은 자세에서 움직임이 이어진다.
- B5 (이중 실행 부재, 가장 중요): 일시정지 → "다시하기"를 **10회 연속** 한 뒤 B3과 같은 발사를 하면, 새의 도달 지점이 첫 판과 같고, 발사음은 1회, 돼지 제거 때 점수 증가폭은 정확히 +5000(누적 +10000이 아님)이다.
- B6: 일시정지 → "메인으로" → "게임 시작"을 누르면 점수 0, HUD의 새 3마리로 새 판이 시작된다.
- B7: 1스테이지에서 새 3마리를 모두 빗맞히면, 마지막 발사 후 12초 안에(`MAX_FLIGHT_STEPS` 10초 + `LOSE_DELAY` 1초) "실패"와 다시하기/메인으로가 뜬다.
- B8: 1스테이지를 클리어하고 "다음 스테이지"를 누르면 2스테이지가 뜬다. 새로 고침 후 선택 화면에서 2번이 해제되어 있고 1번의 별이 보인다.
- B9: 평가자가 1~10스테이지를 각각 5회 이내 시도로 클리어할 수 있다. 실패한 스테이지가 있으면 §5.5의 (b) 값을 부등식 안에서 조정한다.
- B10: 터치 기기에서 드래그 발사가 되고, 페이지가 스크롤되지 않는다.
- B11: 네트워크를 끄고 열면 §5.1의 부트 실패 문구가 보인다(빈 화면이 아님).

## 12. 구현자 계약
- 스택: `https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js` 하나뿐이다. 다른 외부 의존은 0개. Canvas 2D, Web Audio, `localStorage`, Pointer Events는 브라우저 내장이다.
- 되살리기 조건: 직접 구현 물리는 CDN이 막힌 것이 관측되면(B11/B1) 되살린다. 모듈/fetch는 http 배포가 확정되면 되살린다. 나머지는 §9 표를 따른다. **기각된 것을 되살리기 조건 없이 도입하지 않는다.** 특히 "Matter를 선언해 두고 물리를 직접 짜는 것"은 금지다.
- 증명: 구현자는 §11(A) A1~A10을 모두 통과시킨다. 이 스택으로 사는 보장은 "빌드 없이 브라우저가 직접 로드함" 하나다. 그 보장을 증명하는 명령은 사람이 실행하는 B0(`node --check` 전 파일, exit 0)과 B1이다.

---

## Frame deviations & habit regressions
- **관습을 택한 곳**: §7 단계표는 S1~S7 번호가 사다리처럼 읽힌다. 실제로는 S3·S4·S6이 S2 이후 병렬이다. 이 사실은 제목 줄에만 적었고, 표 모양은 관습대로 두었다.
- **가장 약한 섹션**: §5.8의 피해·hp 수치다. 설계 부등식으로 의도는 고정했지만, 이 값들은 A3 가정(충돌 직전 속도)이 참이어야 맞는다. 튜닝 루프가 0회라서, 첫 교체는 B3·B9를 기다린다. 이 공백은 태그(b)로만 막았다.
- **리뷰어라면 공격할 곳**: §6.3의 9·10스테이지다. R-b는 기둥이 보 위에 있는지만 확인한다. 보가 좌우 기둥 두 개에 걸친 뒤 무게중심이 안정한지는 실행 없이 확인할 수 없다. 10스테이지 `pigAt(760,540)`(돌 벽 위 돼지)은 로드 직후 굴러떨어질 수 있다. 벽 윗면이 평평하고 폭 40이 돼지 지름과 같다는 것만 확인했다.
- **안전한 기본값으로 수렴했나**: 카메라를 고정 뷰로 한 것(L25, 추적은 L33 defer)은 "간단한 쪽"을 고른 결정이다. 모든 스테이지를 x ≤ 1260 안에 저작해서 구조적으로 성립시켰고, 트리거도 명시했다.
- **굵게 쓴 가정**: A1·A3은 각각 가장 싼 검증(B1/B11, B3)과 한 줄짜리 대체 경로를 붙였다. 다만 A3의 대체 경로(`DAMAGE_SCALE` 하나)가 모든 경우를 덮지는 못한다. 속도가 해석 후 값이라면 피해가 부딪히는 각도에 따라 일정하지 않게 줄어들 수 있다.
- **구성요소가 바꾼 결정**: 원장에서 빈 칸을 채우다가 L16(계속하기), L17(자동 일시정지), L30(부트 실패)이 build로 들어왔다. 로드베어링 표의 "처음 참이 되는 곳" 열을 채우다가, 새총 위의 새를 static 바디로 두던 설계를 "발사 순간 생성"으로 바꿨다(§9 마지막 행). 콘텐츠 축은 "스테이지 1개 + 로더"를 없애고 §6.3을 만들었다. 이름 붙은 폴리시 단계 S6은 오디오와 이펙트가 빠지는 것을 막았다.
