> plan-smith · part 9/9 · F0 · index: [plan.md](../plan.md)

## 12. "완료"의 정의

구현자 자체 점검(자기가 쓴 파일을 읽어 확인, 전부 참이어야 완료):
1. `index.html` 의 `<script>` 태그가 정확히 5개이고 §4.1 순서·문자열과 같다; 파일 어디에도 `type="module"`, `import `, `export `, `require(`, `fetch(` 문자열이 없다; 외부 URL 은 CDN 한 줄뿐이다.
2. `stages.js` 의 `STAGES` 리터럴에 객체가 정확히 10개, `id` 가 1..10, 각 `blocks`·`pigs` 좌표가 §6 표와 같다.
3. `physics.js` 첫 두 줄이 §5.1 과 동일하고, `Events.on(` 이 전체 파일에서 `createEngine` 안에 한 번만 있다; `World.`, `Runner`, `Render`, `setStatic` 문자열이 없다.
4. `game.js` 에 §5.3 `G` 선언이 있고, `#screen-*`/`#overlay-*` 요소의 `.hidden` 을 바꾸는 `classList` 호출이 `setState` 본문에만 있다(예외는 `finishStage` 의 `#btn-next` 하나); 마지막 줄이 `window.addEventListener("load", main);` 이다.
5. §5.6 의 id 30개가 `index.html` 에 각 1회, 버튼 id 13개가 `game.js` 에 각 1회 이상 등장한다; `#overlay-pause` 안 버튼의 텍스트가 정확히 "계속하기", "다시하기", "메인으로" 이고 `#btn-pause` 가 `#screen-game` 의 직계 자식이며 CSS 에 `#btn-pause { position: absolute; top: 12px; right: 12px; … }` 가 있다.
6. §8 홉 1~5 의 함수·상태 이름이 모두 선언돼 있고, 콜드스타트 표의 "누가 바꾸나" 열의 함수가 각각 그 상태를 실제로 대입한다.
7. §5.4 표의 함수 이름이 각 파일에 정확히 한 번씩 `function 이름(` 으로 선언돼 있다.
8. 스택을 실제로 썼다는 문자열 증거: `physics.js` 에 `Engine.update(`, `Bodies.rectangle(`, `Bodies.circle(`, `Composite.add(` 가 각 1회 이상 있다; `game.js` 에 `pointerdown`, `pointermove`, `pointerup`, `pointercancel` 이 각 1회 이상 있고 `mousedown`, `touchstart` 는 어디에도 없다; `style.css` 에 `touch-action: none` 이 있다.
9. §7.5 S3~S6 의 "검증" 조건이 전부 참이다 — `drawFrame` 안에 `G.birdPhase === "DRAG"` 분기; `localStorage` 문자열이 `try` 블록 안에서만; `renderStageSelect` 가 `STAGES.length` 로 반복; `STAGES` 객체 10개·`id` 1..10 오름차순·모든 `pigs.length ≥ 1`·`birds ≥ 3`; `flushRemovals` 에 `G.particles.push` 와 `playSound(`; `playSound` 첫 줄이 muted 검사.

### 인수 검수 (구현자 완료 조건이 **아님** — §9 의 첫 검수와 같은 사람 검수자가 수행; 위 1~9 만이 구현자의 "완료"다)

사람 검수 항목(측정자: 검수자, 수단: 최신 데스크톱 브라우저에서 `file://` 로 연 `index.html`, 방법: 플레이):
- "게임 시작" 클릭 후 스테이지 1 에서 새를 뒤로 최대 당겨 45° 위로 놓았을 때, 새 3마리 안에 돼지가 사라지고 1초 안에 "스테이지 1 클리어!" 오버레이가 뜬다.
- 인게임에서 우상단 "일시정지"를 누르면 새가 공중에 멈추고 "다시하기"를 누르면 같은 배치가 새 3마리로 다시 서며, "메인으로"를 누르면 메인 화면이 보인다.
- 스테이지 10 클리어 후 새로고침하면 스테이지 선택에 10개 전부 열려 있다.
- 네트워크를 끊고 열면 빨간 에러 문장이 보인다.

## 13. 구현자 계약

- 스택: HTML/CSS/클래식 JS 5+1 파일, 빌드 없음, 의존성은 `https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js` 하나(2026-09-30 존재 확인). 이 URL 을 산 이유(강체 물리)는 §5.4 API 표로만 소비한다 — 그 표 밖의 Matter 이름을 쓰면 계약 위반이다.
- 기각과 부활: §10 의 9줄. 트리거가 관측되지 않았으면 기각을 뒤집지 않는다(특히 물리 직접 구현·ES 모듈·캔버스 안 버튼).
- 보장의 증명: 명령을 돌릴 수 없으므로 §12 의 자체 점검 9개가 증명이다 — 각 항목은 파일 텍스트를 읽어 참/거짓이 정해진다.
- 완료 라벨 고정: "게임 시작", "스테이지 선택", "소리 끄기"/"소리 켜기", "일시정지", "계속하기", "다시하기", "메인으로", "다음 스테이지".

## Frame deviations & habit regressions

- §7.5 의 S0→S6 번호는 사다리처럼 읽힌다. S3~S6 이 독립이라는 문장을 넣었지만 번호 자체는 남아 있어, 구현자가 S5(콘텐츠)를 S6(폴리시) 앞에 반드시 해야 한다고 읽을 여지가 있다. 의도는 어느 순서든 무방.
- 가장 약한 절은 §9 의 "수명 제한" 숫자들이다(PIG_KILL_SPEED 6, MAX_PULL 90, REST_TICKS 45). 구현자는 측정할 수 없으므로 교체 주체를 사람 검수자로 옮겼는데, 검수가 실제로 일어나지 않으면 이 값들은 영원히 첫 추정으로 남는다. 파생 계산(LAUNCH_SCALE)은 Matter 0.20 의 중력 적용식(`force = mass·g·scale`, 속도 += force/mass·dt²)에 대한 내 기억에 기대며, 그 기억이 틀리면 사거리 940px 도 틀린다 — 그래서 §9 MAX_PULL 행의 교체 조건을 "10번 스테이지 우측 끝에 닿는가"로 두었다.
- 리뷰어라면 §8 홉 4 를 공격하겠다: 새가 블록에 먼저 맞아 감속한 뒤 돼지에 닿으면 상대속도가 6 미만일 수 있고, 스테이지 1 은 "기둥(660) 뒤 돼지(720)"라서 첫 새로 클리어되지 않을 수 있다. 완화는 그 기둥이 얇은 나무(hp 3)라 직격 시 함께 깨진다는 점과 새 3마리뿐이다; 임계값이 틀렸을 때의 증상이 §1.1 G 문장과 §9 에 있으므로 검수에서 잡힌다.
- 관습 선택: `predictTrajectory` 의 등가속도 근사(§5.4)는 Matter 의 Verlet 적분과 첫 몇 틱에서 어긋난다. 정확한 예측(엔진 복제 시뮬레이션)은 이음새를 두 배로 늘려 기각했고, §1.2 의 조준 품질 하한을 "방향·세기 감각"으로 낮춰 맞췄다 — 하한을 낮춰 통과시킨 것이 맞다.
- §6 스테이지 좌표는 겹침 규칙을 산술로만 확인했고 플레이로 확인하지 않았다. 들보 위 돼지(r18)와 2층 기둥 사이 여유가 스테이지 4·8·9·10 에서 2px 뿐이라(예: 스테이지 10 의 (830,380,18) 과 기둥 800/860 의 안쪽 면 810/850), 렌더 두께나 반올림에 따라 시작 시 살짝 밀릴 수 있다.
- 이 문서는 §5.4·§5.6 의 복사 블록 때문에 "짧고 읽기 쉽게"보다 길어졌다. 삭제하면 구현자가 이름을 발명하게 되므로 남겼다.

> plan-smith · next: end of plan
