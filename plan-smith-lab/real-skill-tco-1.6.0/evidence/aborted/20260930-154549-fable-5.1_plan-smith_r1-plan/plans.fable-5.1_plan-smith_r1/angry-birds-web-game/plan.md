# 웹 브라우저 물리 슬링샷 게임(앵그리버드류, 10 스테이지) — 구현 계획서
- 추론 프레임: spec-coverage (+ `constraint-first`를 "물리 엔진: 직접 구현 vs Matter.js(CDN)" 하위 결정 한 셀에만 빌림) / 스타일: fable (standalone)
- 한 줄 요약: 플레인 HTML/CSS/JS 5개 파일 + Matter.js 0.20.0(CDN 한 줄)로, 요구 3개와 "완성감" 표면 전부를 build/defer/n-a로 판정한 원장 위에, 발사→충돌→제거→클리어 사슬을 먼저 배선하고 10개 저작 스테이지와 피드백 층을 이름 붙인 단계로 올린다. 구현자는 실행할 수 없으므로 접합부(파일들이 만나는 지점: 심볼 이름·시그니처·DOM id·이벤트 페이로드)는 전부 복사용 블록으로 고정한다.

## 0. 이 계획서가 장식이 되지 않기 위한 조건
이 프레임의 실패 모드는 (A) 원장이 넓고 비어 있는 스텁 목록이 되는 것, (B) 순서 없는 기능 나열로 퇴화하는 것이다. 이 계획서는 (A)를 §1.1 표면별 품질 바닥 12문장과 §1.3의 build 행마다 붙는 동작 문장 35개로 막고, (B)를 §9의 의존성 순서(얇은 종단 슬라이스 → 폭 → 이름 붙인 폴리시 단계)와 §10의 배선 사슬·콜드스타트 표로 막는다.

표현 형식 전환 시도: "계획서 = 링크 맵(파일별 공개 심볼 표가 본문이고 산문은 보조)"으로 재정의해 보았다. 구현자가 한 번만 쓰고 실행하지 못하므로 결정적 위험이 파일 간 심볼 불일치라는 진단은 맞지만, 이 형식은 인터페이스 우선 설계(헤더 파일 규율)라는 도메인 정석과 수렴한다 — **정석 재도달**로 기록하고, 결과만 취한다: §6 심볼 표가 §9 단계보다 앞에 오고, 각 단계의 완료 조건은 "표와 시그니처가 일치한다"는 판독 가능한 문장이 된다. 두 번째 시도 "10 스테이지 = 매개변수 생성기 하나"는 프레임의 콘텐츠 축 요건(저작된 10개)과 충돌하므로 표준 형식(저작 데이터)을 유지한다.

용어(첫 등장에서 정의): **접합부** = 두 파일이 만나는 지점(전역 심볼, 함수 시그니처, DOM id, 이벤트 페이로드). **스텝** = `Engine.update` 1회 = 물리 시간 16.667ms. **정착** = 발사 뒤 월드가 충분히 느려져 다음 발사체를 장전해도 되는 상태. **프리미티브** = 블록·돼지 좌표로 결정론적으로 펼쳐지는 이름 붙은 구조 템플릿(탑·스택·벽·선반·돼지).

## 1. 요구 × 표면 원장 (프레임의 시작점)

### 1.1 표면과 품질 바닥 (표면당 한 문장)
| 표면 | "완성"의 뜻 |
|---|---|
| S1 메인 화면 | 첫 클릭 한 번으로 스테이지 1이 열리고, 잠금 해제된 스테이지가 격자에서 구분되어 보인다 |
| S2 인게임 월드(캔버스) | 새총·발사체·구조물·돼지·지면이 도형으로 그려지고, 발사체가 포물선으로 날아 구조물이 회전하며 무너진다 |
| S3 인게임 HUD | 스테이지 번호·점수·남은 발사체가 항상 읽히고, 점수는 사건 직후 즉시 바뀐다 |
| S4 일시정지 오버레이 | 우측 버튼 한 번에 월드가 얼어붙고, 계속하기·다시하기·메인으로 세 버튼이 각각 약속한 곳으로 보낸다 |
| S5 클리어 오버레이 | 점수·별점·최고 기록이 보이고 다음 스테이지로 넘어갈 수 있으며, 10번째는 "모두 클리어" 문구로 끝난다 |
| S6 실패 오버레이 | 발사체 소진 뒤 10초 안에 뜨고 다시하기·메인으로가 있다 |
| S7 스테이지 콘텐츠 | 10개 각각이 다른 배치·돼지 수·발사체 수·의도된 공략을 가지며 뒤로 갈수록 어렵다 |
| S8 입력 | 마우스와 터치가 같은 코드 경로로 잡히고, 캔버스가 창에 맞게 축소돼도 잡히는 위치가 어긋나지 않는다 |
| S9 실패 경로 | 라이브러리 미로드·화면 이탈·정착 지연 어느 경우에도 게임이 무한 대기에 빠지지 않는다 |
| S10 진행 저장·스테이지 선택 | 새로고침 뒤에도 열린 스테이지와 최고 점수가 남는다 |
| S11 피드백(시각·청각) | 블록이 부서질 때 파편과 점수 숫자가 그 자리에서 튀고, 발사·충돌·돼지 제거에 짧은 합성음이 난다 |
| S12 스테이지 전환 | 클리어 → 다음 스테이지가 한 클릭이며 이전 월드의 잔재(바디·핸들러)가 새 월드에 섞이지 않는다 |

### 1.2 원장 (빈칸 없음; 명시 요구는 build만 허용)
요구: R1 = 스테이지 10단계, R2 = 앵그리버드식 물리 슬링샷 플레이, R3 = 우측 일시정지 → 다시하기/메인으로, C = 명세 밖이지만 완성에 필요한 표면.

| ID | 요구 × 표면 | 내용 | 판정 |
|---|---|---|---|
| L01 | R1 × S7 | 10개 스테이지 저작 배치 데이터(프리미티브 문법) | build |
| L02 | R1 × S12 | 클리어 → 다음 스테이지, 10 클리어 → 엔딩 문구 | build |
| L03 | R1 × S3 | 현재 스테이지 번호 표시 | build |
| L04 | R1 × S10 | 스테이지 선택 격자(잠금/해제) | build |
| L05 | R1 × S7 | 난이도 곡선(돼지·발사체·재질·신규 요소가 단조 증가) | build |
| L06 | R2 × S1 | "게임 시작" → 스테이지 1 인게임 | build |
| L07 | R2 × S2 | 새총 발사체 드래그(당김 거리 제한)·발사 | build |
| L08 | R2 × S2 | 중력·포물선·충돌(고정 스텝 물리) | build |
| L09 | R2 × S2 | 재질별 구조물(나무/유리/돌) 피해·파괴·제거 | build |
| L10 | R2 × S2 | 돼지 피해·제거 | build |
| L11 | R2 × S2 | 발사 종료(정착) 판정과 다음 발사체 장전 | build |
| L12 | R2 × S5 | 클리어 판정 + 오버레이 | build |
| L13 | R2 × S6 | 실패 판정 + 오버레이 | build |
| L14 | R2 × S3 | 남은 발사체 수 | build |
| L15 | R2 × S3 | 점수 표시(즉시 갱신) | build |
| L16 | R2 × S2 | 조준 보조: 고무줄 선 + 직전 발사 궤적 흔적 | build |
| L17 | R2 × S2 | 발사 전 궤적 예측선 | defer — 트리거: 사람 검증자가 스테이지 4 이후 조준이 과도하게 어렵다고 보고하면, `TUNE.LAUNCH_K`와 Matter 기본 중력으로 12스텝 점선을 그리는 함수 `drawPreview()`를 §6.3 표에 추가 |
| L18 | R2 × S2 | 능력이 다른 여러 종류 새 | n-a — 요구사항이 "발사체"만 정의하고 종류를 요구하지 않음; 단일 종 |
| L19 | R2 × S8 | 마우스 입력 | build |
| L20 | R2 × S8 | 터치 입력(Pointer Events로 마우스와 동일 경로) | build |
| L21 | R2 × S8 | 키보드 단축키(ESC 일시정지, R 다시하기) | defer — 트리거: 사람 검증자가 마우스만으로 일시정지 접근이 불편하다고 보고하면 `keydown` 핸들러 1개 추가 |
| L22 | R2 × S2 | 배경·지면·새총 그래픽(도형/그라디언트) | build |
| L23 | R2 × S2 | 고정 논리 해상도 1280×720의 창 맞춤 스케일링 | build |
| L24 | R3 × S3 | 인게임 우측 일시정지 버튼 | build |
| L25 | R3 × S4 | 오버레이의 다시하기 / 메인으로 버튼 | build |
| L26 | R3 × S4 | 계속하기 버튼(복귀 수단) | build |
| L27 | R3 × S4 | 정지 중 물리·타이머·포인터 입력 정지 | build |
| L28 | R3 × S2 | 다시하기 = 현재 스테이지를 처음부터 재구성 | build |
| L29 | R3 × S1 | 메인으로 = 메인 화면, 월드 폐기 | build |
| L30 | C × S11 | 파괴 파편·피해 색조·점수 플로터(떠오르는 숫자) | build |
| L31 | C × S11 | 합성 효과음(WebAudio, 6종) | build |
| L32 | C × S5 | 별점(스테이지 par 기반 1~3) | build |
| L33 | C × S10 | localStorage 진행(해제 스테이지·최고점) | build |
| L34 | C × S9 | CDN 로드 실패 안내 | build |
| L35 | C × S9 | 발사체·돼지·블록의 화면 이탈 처리 | build |
| L36 | C × S9 | 정착 타임아웃(무한 대기 방지) | build |
| L37 | C × S1 | 조작법 한 줄 안내 | build |
| L38 | C × S12 | 스테이지 전환 애니메이션 | defer — 트리거: §9 6단계까지 끝난 뒤 사람 검증자가 전환이 급작스럽다고 보고하면 오버레이 페이드 0.3s |
| L39 | C × S2 | 고DPI(레티나) 선명도 | defer — 트리거: 검증자가 흐림을 보고하면 `devicePixelRatio` 배율 캔버스 |
| L40 | C × S11 | 화면 흔들림 | defer — 트리거: 파편·플로터가 있는데도 타격감 부족 보고 시 |
| L41 | C × S9 | localStorage 접근 불가(프라이빗 모드 등) | build (try/catch, 저장 없이 진행) |

### 1.3 build 행의 동작 문장 (원장 밖; 각 행에 하나)
- L01: 구현자가 `stages.js`를 쓰면 `STAGES` 배열에 §8의 10개 객체가 그대로 들어가고, 없으면 `STAGES.length`가 10 미만이거나 두 스테이지의 `structures`가 문자 그대로 같다.
- L02: 플레이어가 클리어 오버레이의 "다음 스테이지"를 누르면 `startStage(idx+1)`로 새 월드가 서고, 10번째에서는 그 버튼 대신 "모든 스테이지 클리어!" 제목과 메인으로 버튼만 보인다; 없으면 10번째 클리어 후 버튼이 11번째를 가리켜 `STAGES[10]`이 undefined가 된다.
- L03: 스테이지가 시작되면 `#hud-stage`가 "스테이지 n/10"으로 바뀐다; 없으면 다시하기와 다음 스테이지를 구분할 표시가 화면에 없다.
- L04: 메인 화면에 들어올 때마다 10개 버튼이 `progress.unlocked` 기준으로 잠김/열림 스타일을 갱신한다; 없으면 새로고침 뒤 스테이지 5를 클리어했는데도 6이 잠겨 보인다.
- L05: 구현자가 §8 곡선 표대로 쓰면 돼지 수 1→5, 발사체 3→5, 재질 나무→유리→돌 순으로 등장한다; 없으면 스테이지 10이 1과 같은 수의 돼지·같은 재질을 갖는다.
- L06: 플레이어가 `#btn-start`를 누르면 `startStage(0)`이 호출되어 캔버스에 새총과 장전된 발사체가 보인다; 없으면 메인 화면이 그대로 남는다.
- L07: 플레이어가 장전된 발사체 위(반경 45px)에서 포인터를 누르고 끌면 발사체가 포인터를 따라오되 새총 기준점에서 100px 이상 멀어지지 않고, 놓으면 당긴 반대 방향으로 날아간다; 없으면 발사체가 포인터를 따라오지 않거나 놓아도 제자리에 남는다.
- L08: 매 프레임 `PLAYING` 상태에서 `Engine.update(engine, 1000/60)`가 누적 시간만큼(최대 3회) 돌아 발사체가 아래로 휘는 궤적을 그린다; 없으면 발사체가 직선으로 날거나 정지 화면만 보인다.
- L09: 블록이 4 px/스텝 이상의 상대 속도로 부딪히면 `meta.hp`가 그만큼 줄고, 0 이하가 되면 다음 스텝의 `sweep()`에서 월드에서 사라진다; 없으면 아무리 세게 맞아도 블록이 그대로 있다.
- L10: 돼지가 같은 규칙으로 hp 0 이하가 되면 사라지고 `S.pigsAlive`가 1 줄고 점수가 5000 오른다; 없으면 돼지가 사라져도 클리어가 오지 않거나 점수가 안 오른다.
- L11: 비행 중인 발사체와 모든 동적 바디가 45스텝 연속 느려지거나(0.2·0.5 px/스텝) 600스텝이 지나면 발사체가 제거되고 남은 발사체가 있으면 새 발사체가 새총에 장전된다; 없으면 첫 발 뒤 아무 것도 할 수 없다.
- L12: 살아있는 돼지가 0이 되면 90스텝 뒤 상태가 `CLEARED`가 되고 점수·별·최고 기록이 오버레이에 채워진다; 없으면 돼지가 다 죽어도 인게임에 머문다.
- L13: 발사 종료 시 돼지가 남았고 `S.birdsLeft === 0`이면 `FAILED`가 된다; 없으면 발사체가 0인데 새총이 비어 있는 채 화면이 멈춘다.
- L14: 발사체를 발사하는 순간 `S.birdsLeft`가 1 줄고 `#hud-birds`가 즉시 바뀐다; 없으면 HUD 숫자가 스테이지 내내 같다.
- L15: 돼지·블록이 제거되는 스텝에 `S.score`가 오르고 `#hud-score`가 그 프레임에 갱신된다; 없으면 클리어 오버레이에서만 점수가 처음 보인다.
- L16: 드래그 중 새총 두 기둥에서 발사체까지 고무줄 선 2개가 그려지고, 발사 뒤에는 직전 비행의 점(4스텝 간격) 흔적이 다음 발사 때까지 남는다; 없으면 두 번째 발을 첫 발과 어떻게 다르게 쏠지 알 단서가 화면에 없다.
- L19: 마우스로 `pointerdown/move/up`이 캔버스에서 잡힌다; 없으면 클릭해도 `S.phase`가 `'ready'`에서 바뀌지 않는다.
- L20: 터치로 같은 핸들러가 불리며 CSS `touch-action: none` 때문에 페이지가 스크롤되지 않는다; 없으면 드래그 중 화면이 스크롤되고 `pointercancel`이 발생한다.
- L22: 렌더러가 매 프레임 하늘 그라디언트·지면 띠·새총 Y자를 그린다; 없으면 검은 배경에 도형만 떠 있다.
- L23: 창 크기가 어떻든 캔버스가 16:9로 창에 맞게 축소·확대되고 `toWorld()`가 논리 좌표로 환산한다; 없으면 작은 창에서 발사체 옆을 눌러야 잡힌다.
- L24: 인게임에서 `#btn-pause`가 캔버스 우상단(`right:16px; top:16px`)에 항상 보인다; 없으면 일시정지에 도달할 방법이 없다.
- L25: `#btn-restart-pause`는 `startStage(S.stageIdx)`, `#btn-main-pause`는 `toMain()`을 부른다; 없으면 버튼을 눌러도 오버레이가 그대로다.
- L26: `#btn-resume`을 누르면 오버레이가 사라지고 시간 도약 없이 물리가 이어진다; 없으면 일시정지에서 돌아올 수 없다.
- L27: `PAUSED` 동안 `tick()`이 `stepOnce()`를 부르지 않고 스텝 카운터 타이머도 멈추며 포인터 핸들러는 즉시 반환한다; 없으면 오버레이 뒤에서 발사체가 계속 날아가 클리어가 뜬다.
- L28: 다시하기는 새 `Engine.create()`로 월드를 다시 세워 점수 0·발사체 원복이 된다; 없으면 부서진 블록이 남은 채 발사체만 채워진다.
- L29: 메인으로는 `S.engine = null`로 월드를 버리고 `#screen-main`을 보인다; 없으면 메인 화면 뒤에서 이전 월드가 계속 렌더된다.
- L30: 블록·돼지가 제거되는 스텝에 그 위치에서 파편 8개와 "+점수" 플로터가 45스텝 동안 떠오르며, 피해를 입은 블록은 hp 비율만큼 어두워진다; 없으면 블록이 소리 없이 증발한다.
- L31: 발사·타격·파괴·돼지 제거·클리어·실패에 `Sfx.play(name)`가 불려 0.05~0.4초 합성음이 난다; 없으면 완전한 무음이다. (실패 시 무시: `Sfx` 내부 try/catch)
- L32: 클리어 시 사용 발수 ≤ par면 3별, 남은 발사체 ≥ 1이면 2별, 아니면 1별이 `#clear-stars`에 "★" 문자로 표시된다; 없으면 별 표시 영역이 비어 있다.
- L33: 클리어 시 `saveProgress()`가 `localStorage['slingshot-pigs-progress']`에 해제 스테이지와 최고점을 쓰고, 부팅 시 `loadProgress()`가 읽는다; 없으면 새로고침 뒤 스테이지 격자가 모두 잠긴다.
- L34: 부팅 시 `window.Matter`가 없으면 `#overlay-error`가 보이고 안내에 대체 URL이 적혀 있다; 없으면 빈 화면과 콘솔 오류만 남는다.
- L35: 어떤 바디든 x < −100, x > 1380, y > 820이면 `sweep()`이 제거하고, 돼지면 제거로 집계·득점하며 발사체면 발사 종료로 이어진다; 없으면 화면 밖 발사체가 영원히 "비행 중"이다.
- L36: 비행 600스텝을 넘기면 정착과 무관하게 발사가 종료된다; 없으면 미세하게 흔들리는 블록 하나 때문에 다음 발사체가 영영 장전되지 않는다.
- L37: 메인 화면 하단에 "발사체를 끌어당겼다 놓으세요 — 우측 상단 버튼으로 일시정지" 한 줄이 보인다; 없으면 첫 방문자가 무엇을 눌러야 할지 모른다.
- L41: `localStorage` 접근이 throw하면 진행 저장만 건너뛰고 게임은 정상 진행한다; 없으면 프라이빗 창에서 클리어 순간에 예외로 멈춘다.

## 2. 물리 엔진 판정 (빌린 프레임 적용 셀)

**벽** — W1 설치 불가 / W2 실행·테스트 불가(구현자는 한 프레임도 볼 수 없다) / W3 단일 작성 패스(수정 루프 없음) / W4 플레인 파일(빌드·모듈 번들 없음) / W5 바이너리 없음 / W6 온라인 CDN(뚫은 구멍 — 아래 선언) / **W7(숨은 벽, 요구 2에서 세움)**: "구조물 파괴"는 회전하는 강체 적층이 무너지는 것이다 — 회전·마찰·적층 안정성·충격량 해결기가 필요하다.

**후보(일부러 예산 초과로 나열)** — C1 Matter.js 0.20.0 CDN / C2 planck.js(Box2D) CDN / C3 직접 구현(완전 회전 강체) / C4 직접 구현(축정렬 상자·무회전) / C5 라이브러리 소스 인라인 복사 / C6 스크립트 애니메이션(가짜 물리).

**모순 테스트(벽의 교집합에 후보가 들어가는가)**
| 후보 | 판정 | 어느 벽이 어느 차원을 무는가 |
|---|---|---|
| C3 | 진짜 모순 | W2 ∩ W3 ∩ W7 = 공집합: 적층 안정성과 마찰은 실행하며 맞추는 것인데 한 번도 실행 못 하고 한 번만 쓴다 |
| C4 | 요구 완화라 기각 | 벽은 통과하나 W7을 깎는다 — 무회전 상자는 "무너지는 구조물"이 아니다. 이는 정제(누구를 보호하는지 분할)가 아니라 완화(요구 하향)이며, 그렇게 공개한다 |
| C5 | 진짜 모순 | W2 ∩ W3: 83,476바이트를 회상으로 쓰면 환각이 확실(패킷이 이미 기각) |
| C2 | 벽 밖 요구라 단순 기각 | 검증된 URL·버전이 없다 — 버전을 지어내는 것은 금지. 모순은 아니므로 기각으로 충분 |
| C6 | 요구 위반 | R2의 "물리 기반" 자체를 버린다 |
| C1 | 모든 벽 안 | W6 구멍 하나에 매달린다; 남는 위험은 API 회상 오류 → §6 복사용 블록으로 상쇄 |

**판정: C1 — Matter.js 0.20.0(CDN).** 벽이 포기시킨 것: (1) 물리 상수 튜닝 — 모든 상수는 초기값이며 사람 검증자의 첫 플레이가 교체한다(§6.4 태그), (2) 오프라인 플레이, (3) 스테이지 설계에 맞춘 자체 엔진 제어(결정론적 리플레이 등).

**구멍 선언(W6)** — 가정: 게임을 여는 브라우저가 온라인이다. 수치 한계: 외부 스크립트는 **정확히 1개**(Matter.js). 하나라도 더 추가되면 이 계획은 재검증 전까지 무효다. 위반 시 결과: `window.Matter` 부재 → 게임이 시작되지 않고 `#overlay-error`에 안내와 대체 URL 2개를 보인다. 폴백 한 줄: 사람이 `matter.min.js`를 폴더에 넣고 `<script src="./matter.min.js">`로 바꾼다.

**생존자 재심(같은 벽을 C1의 사용법에 다시 적용)** — W2가 무는 곳은 "실행 없이 맞아야 하는 동역학"이다. 그래서: 탄성 `Constraint` 새총(스프링 계수·해제 타이밍이 시험 없이는 못 맞음) **기각** → 정적 홀드 + `Body.setVelocity` 폐형식 발사(§7.3); `MouseConstraint`(아무 바디나 잡음) 기각 → 직접 포인터 처리; `Runner` 기각 → 자체 고정 스텝 루프(일시정지가 루프 한 줄로 끝남); `Render` 기각 → 자체 Canvas 렌더러(재질 색·피해 색조 필요); `enableSleeping` 기각 → 잠든 돼지 밑의 블록이 제거되면 돼지가 공중에 떠서 안 깨는 버그를 시험 없이 배제할 수 없음; 사용 API를 §6.8 화이트리스트 11개로 고정.

## 3. 문제 정의 / 목표
읽기·쓰기 도구만 가진 구현자가 이 문서 하나로 파일 5개를 한 번에 써서, 사람이 `index.html`을 브라우저로 열면 메인 → 스테이지 1 → 발사·충돌·파괴·제거 → 클리어/실패 → 다음 스테이지가 10단계 전부 돌고, 우측 일시정지 버튼이 다시하기/메인으로(+계속하기) 오버레이를 띄우는 게임이 되게 한다. 코드 없음: 이 문서는 접합부만 고정한다.

## 4. 명시적 가정 (틀렸을 때의 영향)
- **A1 (전체가 매달린 가정) 온라인 CDN에서 Matter.js 0.20.0이 로드된다.** 틀리면: 게임 자체가 뜨지 않는다. 가장 싼 조기 확인: `boot()` 첫 줄의 `typeof window.Matter` 검사 → `#overlay-error`. 폴백: §2 구멍 선언의 한 줄.
- **A2 (전체가 매달린 가정) §6.8 화이트리스트의 API 형태(인자 순서·`event.pairs[i].bodyA/bodyB`·`body.speed/velocity/vertices`)가 0.20.0 공개 문서와 같다.** 패킷은 심볼 존재까지 검증했고 형태는 공개 문서의 안정 형태다. 틀리면: 충돌이 피해로 연결되지 않아 §10 사슬 3홉이 끊긴다. 조기 확인: 없음(실행 불가) — 그래서 사용 API를 11개로 줄이고 모두 수년간 형태가 불변인 것만 골랐다. 폴백: 사람 검증자가 콘솔 오류 한 줄을 보고 해당 호출 한 곳을 고친다(호출 지점은 §6.3 표로 단일화).
- A3 데스크톱 브라우저(Chrome/Safari/Firefox 최근 2년 판)이며 Pointer Events·`aspect-ratio` CSS·`requestAnimationFrame`을 지원한다. 틀리면: 입력이 안 잡히거나 레이아웃이 깨진다. 영향 범위: S8·S2.
- A4 표시 주사율이 60~120Hz다. 틀리면(예: 30Hz): 프레임당 최대 3스텝 캡 때문에 물리가 최대 1.5배 느리게 흐르되 결과는 같다.
- A5 `localStorage`가 있다. 틀리면: L41대로 저장만 건너뛴다.
- A6 Matter.js 기본 중력(`gravity.y = 1`, `scale = 0.001`)과 기본 스텝 16.667ms에서 낙하 가속이 약 0.278 px/스텝²다(공개 구현: 힘 = 질량×중력×스케일, Δv = 힘/질량 × Δt²). 틀리면: §6.4의 `LAUNCH_K` 파생 근거가 어긋나 사거리가 달라진다 — 값 하나만 바꾸면 된다.
- A7 제목·문구에 상표 "앵그리버드"를 쓰지 않는다(표시명 "슬링샷 피그"). 틀리면(썼다면): 법적 위험이지 기능 위험은 아니다.

## 5. 납품 스택과 파일 구성
- **스택**: 플레인 HTML5 + CSS + ES2018 JavaScript(전역 스크립트, `import/export/require` 없음) + Matter.js 0.20.0(CDN, MIT) + Canvas 2D + WebAudio API + Pointer Events + localStorage. **산 이유**: 빌드 체인 없이 브라우저가 직접 로드하므로 W1·W4를 만족하고, 검증된 URL 한 줄이 유일한 외부 접합부라 회상할 것이 없다. 강제하는 것: 모듈 시스템 금지, 파일 간 통신은 전역 3개(`STAGES`·`expandStage`, `Sfx`, `Game`)뿐.
- **파일 5개(모두 루트, 하위 폴더 없음)**:
  1. `index.html` — DOM 골격(캔버스·HUD·오버레이 4개·오류 안내), 스크립트 4줄
  2. `style.css` — 16:9 스케일링, 오버레이 표시/숨김, 우측 일시정지 버튼 위치
  3. `stages.js` — `STAGES`(10개), 프리미티브 상수, `expandStage()`
  4. `sfx.js` — `Sfx` 객체(합성음 6종, 실패 무시)
  5. `game.js` — 나머지 전부(상태·월드·입력·루프·충돌·판정·렌더·FX·저장·UI 바인딩). 파일 끝에서 `Game.boot()`를 부른다.
- 설정 파일이 다른 설정 파일을 참조하는 구조: 없음. 바이너리 에셋: 없음.

## 6. 접합부 — 복사용 블록 (구현자는 회상하지 말고 복사한다)

### 6.1 `index.html` 스크립트 4줄 (`</body>` 직전, 이 순서 그대로)
```html
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>
<script src="./stages.js"></script>
<script src="./sfx.js"></script>
<script src="./game.js"></script>
```
대체 URL(오류 안내 문구에 그대로 적는다; 스크립트 태그에는 첫 번째만 쓴다): `https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js`, `https://unpkg.com/matter-js@0.20.0/build/matter.min.js`. `index.html` `<head>`에 HTML 주석으로 `matter-js 0.20.0 by @liabru, MIT License`를 남긴다.

### 6.2 `game.js` 첫 두 줄 (alias)
```js
const HAS_MATTER = typeof window.Matter !== 'undefined';
const { Engine, Bodies, Body, Composite, Events } = HAS_MATTER ? Matter : {};
```
`World`, `Runner`, `Render`, `Mouse`, `MouseConstraint`, `Constraint`, `Composites`, `Vector`, `Query`는 alias하지 않고 어디서도 쓰지 않는다.

### 6.3 심볼 표 (파일별 공개 함수; 시그니처 그대로)
**stages.js** (전역)
| 심볼 | 시그니처 | 반환/의미 |
|---|---|---|
| `STAGES` | `const STAGES = [ /* 10개 */ ]` | §8 데이터 |
| `PRIM` | `const PRIM = { GROUND_TOP: 680, POST_W: 20, POST_H: 100, BEAM_W: 140, BEAM_H: 20, FLOOR_PITCH: 120, STACK_W: 60, STACK_H: 30, WALL_W: 20, LEDGE_H: 20, PIG_R: 22 }` | 프리미티브 치수(모두 (c) 임의 선언; 겹침 없음은 §6.5 검산으로 (a)) |
| `expandStage(stage)` | `function expandStage(stage) → { blocks: [{x,y,w,h,m}], pigs: [{x,y}], ledges: [{x,y,w}] }` | 프리미티브를 좌표로 펼침(중심 좌표, Matter 규약) |

**sfx.js** (전역 `Sfx`)
| 심볼 | 시그니처 | 의미 |
|---|---|---|
| `Sfx.init()` | `init() → void` | 첫 사용자 제스처에서 `AudioContext` 생성(이미 있으면 `resume()`); 실패 무시 |
| `Sfx.play(name)` | `play(name: 'launch' 또는 'hit' 또는 'break' 또는 'pig' 또는 'clear' 또는 'fail') → void` | 오실레이터 + 게인 엔벨로프; ctx 없으면 즉시 반환; 본문 전체 try/catch |

**game.js** (전역 `Game` 객체 하나에 아래 함수 39개를 담는다; 내부 호출은 `Game.` 없이 같은 스코프에서 해도 된다 — 단 이름과 인자 수는 표와 같아야 한다)
| 구역 | 심볼 | 시그니처 | 의미 |
|---|---|---|---|
| 상태 | `boot()` | `() → void` | Matter 검사 → DOM 바인딩(`canvas`, `ctx` 포함) → `loadProgress()` → 격자 생성 → 리스너 등록 → `requestAnimationFrame(tick)` → `setState('MAIN')` |
| 상태 | `setState(next)` | `(next: 'MAIN' 또는 'PLAYING' 또는 'PAUSED' 또는 'CLEARED' 또는 'FAILED') → void` | `S.state` 갱신 + 오버레이 표시/숨김의 유일한 지점 |
| 상태 | `startStage(idx)` | `(idx: 0..9) → void` | 새 엔진·월드 구성, 카운터 초기화(`acc`, `lastNow` 포함), `loadBird()`, `setState('PLAYING')` |
| 상태 | `toMain()` | `() → void` | `S.engine = null; S.bird = null; setState('MAIN')` |
| 상태 | `pause()` / `resume()` | `() → void` | §7.1 전이 |
| 월드 | `buildWorld(stage)` | `(stage) → void` | 지면·선반·블록·돼지 생성, `S.pigsAlive = pigs.length` |
| 월드 | `makeBlock(b)` / `makePig(p)` / `makeLedge(l)` / `makeGround()` | `(...) → Matter.Body` | `Bodies.rectangle/circle` + `meta` 부착 + `Composite.add` |
| 월드 | `loadBird()` | `() → void` | 전제 `S.birdsLeft > 0`; 동적 생성 후 `Body.setStatic(bird, true)`; `S.phase = 'ready'` |
| 입력 | `toWorld(e)` | `(e: PointerEvent) → {x, y}` | §6.7 |
| 입력 | `onDown(e)` / `onMove(e)` / `onUp(e)` / `onCancel(e)` | `(e) → void` | §7.3 |
| 입력 | `cancelDrag()` | `() → void` | 발사체를 `S.anchor`로, `S.phase = 'ready'` |
| 루프 | `tick(now)` | `(now: DOMHighResTimeStamp) → void` | §7.2; 자기 자신을 `requestAnimationFrame`으로 재등록 |
| 루프 | `stepOnce()` | `() → void` | `S.hitThisStep = false` → `Engine.update(S.engine, TUNE.STEP_MS)` → `postStep()` |
| 루프 | `postStep()` | `() → void` | 순서 고정: `sweep()` → `judge()` → 비행 부기(§7.4) → `updateFx()` |
| 루프 | `allSlow()` | `() → boolean` | `Composite.allBodies(S.engine.world)` 중 `!isStatic`인 모든 바디의 `speed < TUNE.ALL_SLOW_SPEED` |
| 충돌 | `onCollision(event)` | `(event) → void` | §6.6; 피해만 기록, 제거하지 않음 |
| 충돌 | `applyDamage(body, dmg)` | `(body, dmg: number) → void` | `meta.hp -= dmg; if (meta.hp <= 0) meta.dead = true` |
| 충돌 | `isOut(body)` | `(body) → boolean` | §7.5 |
| 충돌 | `sweep()` | `() → void` | dead·이탈 바디 제거, 집계·득점·FX |
| 충돌 | `endShot()` | `() → void` | 발사체 제거 → 실패 판정 또는 `loadBird()` |
| 충돌 | `judge()` | `() → void` | 돼지 0 → `'ending'` → 90스텝 → `CLEARED` |
| 렌더 | `render()` | `() → void` | 배경 → 지면·선반 → 흔적 → 블록 → 돼지 → 발사체 → 새총/고무줄 → FX → `syncHud()` |
| 렌더 | `drawBody(body)` | `(body) → void` | `meta.kind`별 분기 |
| 렌더 | `syncHud()` | `() → void` | HUD 3개 텍스트 |
| FX | `spawnBurst(x, y, color, n)` | `(x, y, color: string, n: number) → void` | 파편 n개 |
| FX | `spawnFloater(x, y, text)` | `(x, y, text: string) → void` | 떠오르는 텍스트 |
| FX | `updateFx()` | `() → void` | 수명 감소·제거(스텝 단위) |
| 저장 | `loadProgress()` / `saveProgress()` | `() → void` | §7.7 |
| 결과 | `starsFor(stage, birdsUsed)` | `(stage, birdsUsed: number) → 1 또는 2 또는 3` | §7.6 |
| 결과 | `showClear()` / `showFail()` | `() → void` | 오버레이 채우기(`setState`가 호출) |

### 6.4 초기 상태 선언 (`game.js` 상단; 값 태그: (a)파생 (b)수명제한 — 사람 검증자의 첫 플레이 보고가 교체, 이 객체 한 곳만 수정 (c)임의 선언)
```js
const TUNE = {
  W: 1280, H: 720,                 // (c) 16:9 관례
  GROUND_TOP: 680,                 // (a) H - 40
  ANCHOR: { x: 200, y: 520 },      // (c) 새총 기준점(발사체 휴지 위치)
  STEP_MS: 1000 / 60,              // (a) Matter 기본 스텝
  MAX_STEPS_PER_FRAME: 3,          // (c) 탭 복귀 시 폭주 방지
  BIRD_R: 20, PIG_R: 22,           // (c)
  GRAB_R: 45,                      // (a) BIRD_R*2 + 5
  MAX_PULL: 100,                   // (b) 당김 100 → y 최대 640 < GROUND_TOP-BIRD_R=660 이므로 지면 관통 없음 (a)
  MIN_PULL: 12,                    // (c) 오발 방지
  LAUNCH_K: 0.18,                  // (b) 100px*0.18=18 px/스텝; 가속 0.278이면 45° 사거리 ≈ 1,160px → 표적 x 700~1,200 도달 (a)
  DMG_MIN: 4,                      // (b) 이 이하 상대속도(휴지 접촉·가벼운 낙하)는 무피해
  HIT_SFX_MIN: 6,                  // (c) 타격음 문턱
  SETTLE_SPEED: 0.2, SETTLE_STEPS: 45, ALL_SLOW_SPEED: 0.5,   // (b)
  MIN_FLIGHT_STEPS: 30, MAX_FLIGHT_STEPS: 600,                // (c) 0.5초 / 10초
  ENDING_STEPS: 90,                // (a) 1.5초 × 60
  OOB: { left: -100, right: 1380, bottom: 820 },              // (c)
  PIG_HP: 8,                       // (b)
  MAT: {                           // hp·density (b), score·color (c)
    wood:  { hp: 10, density: 0.002,  restitution: 0.05, friction: 0.6, score: 500, color: '#b5793b' },
    glass: { hp: 6,  density: 0.0015, restitution: 0.05, friction: 0.4, score: 300, color: '#a9d8f0' },
    stone: { hp: 20, density: 0.004,  restitution: 0.05, friction: 0.7, score: 800, color: '#8d8d8d' }
  },
  BIRD: { density: 0.004, restitution: 0.3, friction: 0.5 },  // (b)
  PIG:  { density: 0.002, restitution: 0.2, friction: 0.5 },  // (b)
  PIG_SCORE: 5000, BIRD_BONUS: 10000,                          // (c) 원작 관례
  TRAIL_EVERY: 4, TRAIL_MAX: 60, FX_LIFE: 45, BURST_N: 8       // (c)
};
const S = {
  state: 'MAIN', stageIdx: 0, engine: null, bird: null,
  phase: 'ready',                  // 'ready' | 'drag' | 'flight' | 'ending'
  anchor: { x: 200, y: 520 }, pull: { x: 0, y: 0 }, pointerId: null,
  pigsAlive: 0, birdsLeft: 0, score: 0,
  flightSteps: 0, stillSteps: 0, endingSteps: 0, birdOut: false, hitThisStep: false,
  trail: [], lastTrail: [], particles: [], floaters: [],
  acc: 0, lastNow: 0,
  progress: { unlocked: 1, best: {} }
};
```
`engine.gravity`는 건드리지 않는다(기본값 사용). `Engine.create()`는 옵션 없이 부른다.

### 6.5 스테이지 데이터 스키마와 프리미티브 전개 규칙
```js
// 스키마 (stages.js)
{ id: 2, name: '나무 탑', birds: 3, par: 1,
  structures: [ { t: 'tower', x: 850, floors: 1, m: 'wood', pigs: [0] } ],
  note: '기둥을 맞혀 탑을 무너뜨리면 안의 돼지가 깔린다' }
```
프리미티브(`G = PRIM.GROUND_TOP = 680`, 모든 좌표는 바디 중심):
- `{ t:'tower', x, floors, m, pigs:[층 인덱스…] }` → 층 f(0부터)마다 기둥 2개 `w 20 × h 100`을 `(x−50, G−50−120f)`, `(x+50, G−50−120f)`에, 보 1개 `w 140 × h 20`을 `(x, G−110−120f)`에; 층 f의 돼지는 `(x, G−120f−22)`. 반폭 70. (검산: 층 f 바닥 = `G−120f`, 기둥 안쪽 폭 80 > 돼지 지름 44, 기둥 높이 100 > 돼지 지름 — 겹침 없음)
- `{ t:'stack', x, n, m, pigTop }` → 블록 n개 `w 60 × h 30`을 `(x, G−15−30i)`, i = 0..n−1; `pigTop`이면 돼지 `(x, G−30n−22)`. 반폭 30.
- `{ t:'wall', x, m, h }` → 블록 1개 `w 20 × h`를 `(x, G−h/2)`. 반폭 10.
- `{ t:'ledge', x, y, w }` → 정적 선반 `w × 20`을 `(x, y)`; 위 표면 = `y−10`. 반폭 w/2.
- `{ t:'pig', x, y }` → 돼지 `(x, y)`; `y` 생략 시 `G−22`. 반폭 22.
- 재질 `m`은 `'wood'`, `'glass'`, `'stone'` 중 하나. 블록 `meta = { kind:'block', m, hp: TUNE.MAT[m].hp, hpMax: 같은 값, dead: false }`; 돼지 `meta = { kind:'pig', hp: TUNE.PIG_HP, hpMax, r: 22, dead: false }`; 발사체 `meta = { kind:'bird', r: 20 }`; 지면·선반 `meta = { kind:'ground' }` / `{ kind:'ledge' }`.
- **간격 규칙(읽어서 검사 가능)**: `structures`를 x 오름차순으로 봤을 때 인접한 두 프리미티브의 중심 x 거리 ≥ 두 반폭의 합 + 10. 선반 위 돼지는 같은 x라도 `y`가 다르므로 예외(선반과 그 위 돼지 쌍만).

### 6.6 충돌 이벤트 페이로드 (핸들러 뼈대; `startStage` 안에서 `Events.on(S.engine, 'collisionStart', onCollision)` 한 번만 등록)
```js
function onCollision(event) {
  for (let i = 0; i < event.pairs.length; i++) {
    const pair = event.pairs[i];
    const a = pair.bodyA, b = pair.bodyB;          // Matter.Body 둘
    const dvx = a.velocity.x - b.velocity.x, dvy = a.velocity.y - b.velocity.y;
    const impact = Math.sqrt(dvx * dvx + dvy * dvy);  // 상대 속도, px/스텝
    // dmg = impact - TUNE.DMG_MIN; dmg > 0 이면 a, b 각각 meta.kind가 'block' 또는 'pig'이고 !meta.dead일 때 applyDamage(body, dmg)
    // impact >= TUNE.HIT_SFX_MIN && !S.hitThisStep 이면 S.hitThisStep = true; Sfx.play('hit')
    // 여기서 Composite.remove를 부르지 않는다 — 제거는 sweep()만 한다
  }
}
```

### 6.7 포인터 → 논리 좌표 (스케일링 접합부)
```js
function toWorld(e) {
  const r = canvas.getBoundingClientRect();
  return { x: (e.clientX - r.left) * (TUNE.W / r.width), y: (e.clientY - r.top) * (TUNE.H / r.height) };
}
```
`canvas`와 `ctx`는 `game.js` 모듈 스코프 변수(`let canvas = null, ctx = null;`)이며 `boot()`가 `document.getElementById('game')`과 `canvas.getContext('2d')`로 채운다.
CSS 접합부(`style.css`): `#app { position: relative; width: min(100vw, calc(100vh * 16 / 9)); aspect-ratio: 16 / 9; margin: 0 auto; }`, `#game { width: 100%; height: 100%; display: block; touch-action: none; user-select: none; }`, 오버레이·HUD·버튼은 `#app` 기준 `position: absolute`, `.hidden { display: none; }`, `#btn-pause { position: absolute; right: 16px; top: 16px; }`. 캔버스 속성은 `width="1280" height="720"` 고정.

### 6.8 Matter.js 사용 API 화이트리스트 (이 밖의 것은 쓰지 않는다)
함수 11개: `Engine.create()`, `Engine.update(engine, delta)`, `Bodies.rectangle(x, y, w, h, options)`, `Bodies.circle(x, y, r, options)`, `Body.setStatic(body, isStatic)`, `Body.setPosition(body, {x, y})`, `Body.setVelocity(body, {x, y})`, `Composite.add(engine.world, body)`, `Composite.remove(engine.world, body)`, `Composite.allBodies(engine.world)`, `Events.on(engine, 'collisionStart', fn)`.
필드: `engine.world`, `body.position.x/y`, `body.velocity.x/y`, `body.speed`, `body.angle`, `body.vertices[i].x/y`, `body.isStatic`, `body.label`, `body.meta`(우리가 옵션으로 붙인 객체 — `Bodies.*(…, { label, isStatic, density, restitution, friction, meta: {...} })`로 넘기면 바디에 그대로 복사된다).
금지: `World.add`, `Runner`, `Render`, `MouseConstraint`, `Constraint`, `Composites`, `Sleeping`, `engine.gravity` 변경.

### 6.9 DOM id 표 (`index.html`에 각 id 정확히 1회)
| id | 요소 | 역할 |
|---|---|---|
| `app` | div | 16:9 컨테이너 |
| `game` | canvas 1280×720 | 월드 |
| `hud`, `hud-stage`, `hud-score`, `hud-birds` | div, span×3 | HUD(좌상단) |
| `btn-pause` | button | 우상단 일시정지 |
| `screen-main`, `btn-start`, `stage-grid`, `how-to` | div, button, div, p | 메인 화면(격자 버튼 10개는 JS가 생성, class `stage-btn`, `data-stage`=1..10) |
| `overlay-pause`, `btn-resume`, `btn-restart-pause`, `btn-main-pause` | div, button×3 | 일시정지 |
| `overlay-clear`, `clear-title`, `clear-score`, `clear-stars`, `clear-best`, `btn-next`, `btn-restart-clear`, `btn-main-clear` | div, span×4, button×3 | 클리어 |
| `overlay-fail`, `btn-restart-fail`, `btn-main-fail` | div, button×2 | 실패 |
| `overlay-error` | div | Matter 부재 안내(대체 URL 2개 텍스트 포함) |

## 7. 운영 규칙 (판단을 게이트로)

### 7.1 상태 머신 (기본값: 표에 없는 (상태, 사건) 쌍은 무시)
| 현재 | 사건 | 보호 조건 | 다음 | 부수 효과 |
|---|---|---|---|---|
| MAIN | `#btn-start` 클릭 | `HAS_MATTER` | PLAYING | `Sfx.init()`; `startStage(0)` |
| MAIN | `.stage-btn` n 클릭 | `n ≤ progress.unlocked` | PLAYING | `startStage(n−1)` |
| PLAYING | `#btn-pause` 클릭 | — | PAUSED | `phase==='drag'`면 `cancelDrag()`; `S.pointerId = null` |
| PAUSED | `#btn-resume` | — | PLAYING | `S.lastNow = 0; S.acc = 0` (시간 도약 방지) |
| PAUSED | `#btn-restart-pause` | — | PLAYING | `startStage(S.stageIdx)` |
| PAUSED | `#btn-main-pause` | — | MAIN | `toMain()` |
| PLAYING | `judge()`: `endingSteps ≥ 90` | `pigsAlive === 0` | CLEARED | `score += birdsLeft×10000`; `saveProgress()`; `showClear()`; `Sfx.play('clear')` |
| PLAYING | `endShot()`: 발사체 없음 | `pigsAlive > 0 && birdsLeft === 0` | FAILED | `showFail()`; `Sfx.play('fail')` |
| CLEARED | `#btn-next` | `stageIdx < 9` | PLAYING | `startStage(stageIdx+1)` |
| CLEARED | `#btn-restart-clear` / FAILED `#btn-restart-fail` | — | PLAYING | `startStage(stageIdx)` |
| CLEARED / FAILED | `#btn-main-clear` / `#btn-main-fail` | — | MAIN | `toMain()` |
버튼 사건은 11개(`btn-start`, `.stage-btn`, `btn-pause`, `btn-resume`, `btn-restart-pause`, `btn-main-pause`, `btn-next`, `btn-restart-clear`, `btn-restart-fail`, `btn-main-clear`, `btn-main-fail`)이고 나머지 2개(`judge`, `endShot`)는 내부 호출이다. 우선순위 규칙: 마지막 발사체 비행 중 마지막 돼지가 죽으면 **클리어가 실패를 이긴다** — `postStep()`이 `sweep() → judge()`를 비행 부기보다 먼저 실행하므로 `'ending'`으로 넘어간 뒤에는 `endShot()`이 불리지 않는다. `setState`는 오버레이 4개를 전부 숨긴 뒤 목표 상태 것만 보인다; `MAIN` 진입 시 격자를 다시 칠한다.

### 7.2 루프 (`tick(now)`, 항상 돈다; 물리는 PLAYING에서만)
1. `if (S.lastNow === 0) S.lastNow = now;` `let dt = Math.min(now − S.lastNow, 100); S.lastNow = now;`
2. `if (S.state === 'PLAYING') { S.acc += dt; let n = 0; while (S.acc ≥ TUNE.STEP_MS && n < TUNE.MAX_STEPS_PER_FRAME) { stepOnce(); S.acc −= TUNE.STEP_MS; n++; } if (n === TUNE.MAX_STEPS_PER_FRAME) S.acc = 0; } else { S.acc = 0; }`
3. `if (S.engine) render();` — PAUSED·CLEARED·FAILED에서도 마지막 프레임을 계속 그린다(오버레이 뒤 정지 화면).
4. `requestAnimationFrame(tick)`.
`Engine.update`는 `stepOnce` 본문에만 있다. **모든 게임 타이머는 스텝 카운터다**(`flightSteps`, `stillSteps`, `endingSteps`, FX 수명). 벽시계를 쓰지 않으므로 일시정지가 자동으로 모든 타이머를 멈춘다.

### 7.3 발사 규칙 (정적 홀드 + 폐형식 속도)
- `loadBird()`: `Bodies.circle(anchor.x, anchor.y, 20, { label:'bird', ...TUNE.BIRD, meta:{kind:'bird', r:20} })`를 **동적으로 만든 직후** `Body.setStatic(bird, true)`(질량 복원값을 보존하기 위한 순서), `Composite.add`; `S.bird = bird; S.phase='ready'; S.pull={0,0}; S.flightSteps=0; S.stillSteps=0; S.birdOut=false`.
- `onDown(e)`: `state !== 'PLAYING' || phase !== 'ready' || !S.bird`이면 반환; `p = toWorld(e)`; `p`와 `bird.position` 거리 > 45면 반환; `phase='drag'; pointerId=e.pointerId; canvas.setPointerCapture(e.pointerId); Sfx.init()`.
- `onMove(e)`: `phase !== 'drag' || e.pointerId !== S.pointerId`면 반환; `d = p − anchor`; `d`의 길이 > 100이면 100으로 정규화; `S.pull = d; Body.setPosition(bird, anchor + d)`.
- `onUp(e)`: 같은 보호; `pull`의 길이 < 12면 `cancelDrag()` 후 반환; 아니면 `Body.setStatic(bird, false); Body.setVelocity(bird, { x: −pull.x×0.18, y: −pull.y×0.18 }); phase='flight'; flightSteps=0; stillSteps=0; trail=[]; birdsLeft −= 1; pointerId=null; Sfx.play('launch')`.
- `onCancel(e)`(`pointercancel`): `phase==='drag'`면 `cancelDrag()`.
- 핸들러는 `canvas`에 `pointerdown/pointermove/pointerup/pointercancel`로 등록한다.

### 7.4 비행 부기·정착·발사 종료 (`postStep()`의 세 번째 단계, `phase === 'flight'`일 때만)
1. `flightSteps++`; `flightSteps % 4 === 0`이면 `trail.push({x,y})`(최대 60).
2. `bird.speed < 0.2`면 `stillSteps++`, 아니면 `stillSteps = 0`.
3. 종료 조건(하나라도): `S.birdOut` / `flightSteps > 600` / (`flightSteps > 30 && stillSteps ≥ 45 && allSlow()`).
4. `endShot()`: `Composite.remove(world, bird); S.bird = null; lastTrail = trail; trail = []; if (pigsAlive > 0) { if (birdsLeft === 0) setState('FAILED'); else loadBird(); }`.

### 7.5 피해·제거·판정
- **피해**(§6.6): `dmg = impact − 4`; `dmg > 0`이면 쌍의 두 바디 각각에 대해 `meta.kind ∈ {block, pig} && !meta.dead`일 때 `applyDamage`. 같은 스텝에 `impact ≥ 6`인 쌍이 하나라도 있으면 `Sfx.play('hit')` 1회(`S.hitThisStep` 플래그를 `stepOnce` 시작에서 내린다).
- **`isOut(body)`**: `position.x < −100 || position.x > 1380 || position.y > 820`.
- **`sweep()`**(매 스텝 첫 단계): `Composite.allBodies(world)`를 복사한 배열로 순회. 바디가 `meta.dead`이거나(`kind`가 block/pig) `!isStatic && isOut(body)`이면: pig → `Composite.remove; pigsAlive −= 1; score += 5000; spawnBurst(x,y,'#6cc24a',8); spawnFloater(x,y,'+5000'); Sfx.play('pig')`; block(dead) → `remove; score += MAT[m].score; spawnBurst(x,y,MAT[m].color,8); spawnFloater(x,y,'+'+MAT[m].score); Sfx.play('break')`; block(이탈만) → `remove`(무득점); bird(이탈) → `S.birdOut = true`(제거는 `endShot`이).
- **`judge()`**(두 번째 단계): `pigsAlive === 0 && phase !== 'ending'`이면 `phase==='drag'`일 때 `cancelDrag()`; `phase = 'ending'; endingSteps = 0`. `phase === 'ending'`이면 `endingSteps++`; `≥ 90`이면 §7.1 CLEARED 행 실행. `'ending'` 동안 포인터 입력은 `phase` 보호로 자동 무시된다.

### 7.6 점수·별
점수 = 돼지 5000 + 블록 파괴(나무 500 / 유리 300 / 돌 800) + 클리어 시 남은 발사체 × 10000. `starsFor(stage, birdsUsed)`: `birdsUsed ≤ stage.par` → 3; `birdsUsed ≤ stage.birds − 1` → 2; 아니면 1 (§8 데이터가 모든 스테이지에서 `par ≤ birds − 1`을 만족하므로 단조). `birdsUsed = stage.birds − S.birdsLeft`.

### 7.7 진행 저장
키 `'slingshot-pigs-progress'`, 값 `JSON.stringify({ unlocked, best })`. `loadProgress()`는 try/catch로 읽어 실패 시 `{unlocked:1, best:{}}`. `saveProgress()`(CLEARED 진입 시): `unlocked = max(unlocked, min(10, stageIdx+2)); best[stageIdx+1] = max(best[stageIdx+1] || 0, score)`; try/catch. `#clear-best`에 `best[stageIdx+1]` 표시.

### 7.8 렌더 규칙 (이 절의 색·크기·수명 수치는 모두 (c) 임의 선언)
블록은 `body.vertices`로 다각형 경로를 채운 뒤 `rgba(0,0,0, 0.5×(1−hp/hpMax))`를 덧칠(피해 색조), 테두리 1px `#333`. 돼지는 `meta.r` 원 `#6cc24a` + 흰 눈 2개(회전 무시). 발사체는 `meta.r` 원 `#d9432f`. 지면은 `0..W × GROUND_TOP..H` 띠 `#5b8c3a`, 하늘은 위 `#8fd3ff` → 아래 `#e8f7ff` 선형 그라디언트. 새총: `(ANCHOR.x±10, GROUND_TOP)`에서 `(ANCHOR.x±10, ANCHOR.y)`까지 갈색 선 2개; `phase ∈ {ready, drag}`면 두 기둥 끝에서 `bird.position`까지 고무줄 선 2개 `#3b2a1a` 굵기 3. `lastTrail`은 반지름 3 흰 점 alpha 0.5. FX: 파편은 6×6 사각형이 속도(x −4..4, y −6..0 난수)와 중력 0.25/스텝으로 45스텝, 플로터는 y −1/스텝, 45스텝, 굵은 20px 흰 글자 검은 테두리. `syncHud()`는 `"스테이지 " + (stageIdx+1) + "/10"`, `"점수 " + score`, `"남은 발사체 " + birdsLeft`.

### 7.9 단위 사이의 틈 (명시적 한 번의 탐색; 각각 위 규칙에 이미 박혀 있다)
1. 일시정지 ↔ 드래그: 정지 시 `cancelDrag()`(§7.1) — 아니면 복귀 후 포인터 없는 `'drag'`에 갇힌다. 2. 일시정지 ↔ 타이머: 스텝 카운터(§7.2). 3. 충돌 이벤트 ↔ 월드 변경: 핸들러는 표시만, 제거는 `sweep()`(§6.6·§7.5). 4. 마지막 발사체 ↔ 마지막 돼지: 클리어 우선(§7.1). 5. 재개 ↔ 누적기: `lastNow = 0`(§7.1·§7.2). 6. 스테이지 전환 ↔ 이전 핸들러: 매번 새 `Engine.create()`, 이전 엔진은 참조를 끊어 핸들러째 버린다(§6.3 `startStage`). 7. 첫 클릭 ↔ AudioContext 자동재생 정책: `Sfx.init()`은 `#btn-start` 클릭과 `onDown`에서만(§7.1·§7.3). 8. 오버레이 ↔ 캔버스 포인터: 오버레이가 캔버스를 덮으므로 클릭이 새지 않고, 상태 보호가 이중으로 막는다.

## 8. 콘텐츠 — 10 스테이지 (저작 데이터; `stages.js`의 `STAGES`에 이 순서로)
난이도 곡선(모두 (c) 임의 선언; par는 저작 의도):
| # | 이름 | 돼지 | 발사체 | par | 재질 | 새 요소 |
|---|---|---|---|---|---|---|
| 1 | 첫 걸음 | 1 | 3 | 1 | 나무 | 맨 돼지 + 낮은 스택 |
| 2 | 나무 탑 | 1 | 3 | 1 | 나무 | 탑 안의 돼지 |
| 3 | 두 마리 | 2 | 3 | 2 | 나무 | 표적 2개 |
| 4 | 유리 층 | 2 | 3 | 1 | 유리 | 2층 탑, 연쇄 붕괴 |
| 5 | 돌 방패 | 2 | 3 | 2 | 돌·나무 | 넘겨 쏘기 |
| 6 | 높은 자리 | 2 | 3 | 2 | 나무 | 선반 위 돼지 |
| 7 | 혼합 탑 | 3 | 4 | 2 | 나무·돌 | 사이에 낀 돼지 |
| 8 | 유리 성 | 3 | 4 | 2 | 유리 | 3층 탑 |
| 9 | 돌 요새 | 3 | 4 | 3 | 돌·나무 | 벽 + 탑 + 선반 |
| 10 | 최후의 요새 | 5 | 5 | 3 | 돌·유리·나무 | 전부 |

```js
const STAGES = [
  { id: 1, name: '첫 걸음', birds: 3, par: 1,
    structures: [ { t:'stack', x: 720, n: 2, m:'wood' }, { t:'pig', x: 820 } ],
    note: '돼지를 직접 맞히거나 스택을 밀어 넘어뜨린다' },
  { id: 2, name: '나무 탑', birds: 3, par: 1,
    structures: [ { t:'tower', x: 850, floors: 1, m:'wood', pigs: [0] } ],
    note: '기둥을 맞혀 보가 떨어지게 한다' },
  { id: 3, name: '두 마리', birds: 3, par: 2,
    structures: [ { t:'tower', x: 760, floors: 1, m:'wood', pigs: [0] }, { t:'tower', x: 960, floors: 1, m:'wood', pigs: [0] } ],
    note: '탑 하나에 한 발씩' },
  { id: 4, name: '유리 층', birds: 3, par: 1,
    structures: [ { t:'tower', x: 880, floors: 2, m:'glass', pigs: [0, 1] } ],
    note: '위층을 맞히면 유리가 깨지며 아래층 돼지까지 깔린다' },
  { id: 5, name: '돌 방패', birds: 3, par: 2,
    structures: [ { t:'wall', x: 700, m:'stone', h: 160 }, { t:'pig', x: 790 }, { t:'stack', x: 900, n: 3, m:'wood', pigTop: true } ],
    note: '돌벽은 안 깨진다고 보고 높이 넘겨 쏜다' },
  { id: 6, name: '높은 자리', birds: 3, par: 2,
    structures: [ { t:'tower', x: 720, floors: 1, m:'wood', pigs: [0] }, { t:'ledge', x: 1000, y: 460, w: 200 }, { t:'pig', x: 1000, y: 428 } ],
    note: '선반 위 돼지는 직격이 필요하다(낙하만으로는 안 죽는다)' },
  { id: 7, name: '혼합 탑', birds: 4, par: 2,
    structures: [ { t:'tower', x: 790, floors: 2, m:'wood', pigs: [1] }, { t:'pig', x: 900 }, { t:'tower', x: 1010, floors: 2, m:'stone', pigs: [0] } ],
    note: '나무 탑을 오른쪽으로 무너뜨려 가운데 돼지를 깔고, 돌 탑은 기둥 직격' },
  { id: 8, name: '유리 성', birds: 4, par: 2,
    structures: [ { t:'wall', x: 680, m:'glass', h: 200 }, { t:'tower', x: 800, floors: 3, m:'glass', pigs: [0, 2] }, { t:'stack', x: 960, n: 4, m:'glass', pigTop: true } ],
    note: '유리는 한 발로 여러 개가 깨진다 — 관통 궤도를 찾는다' },
  { id: 9, name: '돌 요새', birds: 4, par: 3,
    structures: [ { t:'wall', x: 660, m:'stone', h: 240 }, { t:'tower', x: 800, floors: 2, m:'stone', pigs: [0] }, { t:'tower', x: 980, floors: 1, m:'wood', pigs: [0] }, { t:'ledge', x: 1150, y: 400, w: 120 }, { t:'pig', x: 1150, y: 368 } ],
    note: '높은 포물선으로 벽을 넘겨 돌 탑 보를 위에서 친다' },
  { id: 10, name: '최후의 요새', birds: 5, par: 3,
    structures: [ { t:'wall', x: 640, m:'stone', h: 260 }, { t:'tower', x: 780, floors: 3, m:'stone', pigs: [0, 1] }, { t:'stack', x: 900, n: 3, m:'glass', pigTop: true }, { t:'tower', x: 1020, floors: 2, m:'wood', pigs: [0, 1] }, { t:'ledge', x: 1180, y: 360, w: 120 }, { t:'pig', x: 1180, y: 328 } ],
    note: '돌 탑을 오른쪽으로 무너뜨려 유리 스택과 나무 탑을 연쇄로 친다' }
];
```
간격 검산(§6.5 규칙, 반폭: tower 70 / stack 30 / wall 10 / pig 22 / ledge w/2): 1: 720→820 = 100 ≥ 62. 3: 200 ≥ 150. 5: 90 ≥ 42, 110 ≥ 62. 6: 280 ≥ 180. 7: 110 ≥ 102, 110 ≥ 102. 8: 120 ≥ 90, 160 ≥ 110. 9: 140 ≥ 90, 180 ≥ 150, 170 ≥ 140. 10: 140 ≥ 90, 120 ≥ 110, 120 ≥ 110, 160 ≥ 140. 선반 위 돼지 y = 선반 y − 10 − 22 (6: 460→428, 9: 400→368, 10: 360→328). 바디 수 최대(10번): 1+9+3+6+1+5+지면 1 = 26.

## 9. 접근법과 단계 (의존성 순서; 각 단계는 그것을 강제한 벽을 단다)
구현자는 파일을 한 번씩 쓴다. 따라서 "얇은 슬라이스 → 폭 → 폴리시"는 **`game.js` 안의 구역 작성 순서**이고, 파일 순서는 소비자가 마지막이다.

| 단계 | 산출 | 전제 | 읽어서 하는 검증 | 서비스하는 기준 | 벽 |
|---|---|---|---|---|---|
| 1 껍데기 | `index.html`, `style.css` | 없음 | §6.9 id 전부 정확히 1회; §6.1 스크립트 4줄 순서·URL 문자 일치; `#btn-pause`에 `right:16px`; `touch-action: none` | L23, L24, L34, L37 | W1, W4, W6 |
| 2 데이터 | `stages.js` | 없음(독립) | `STAGES.length === 10`; 각 원소에 `id, name, birds, par, structures, note`; `par ≤ birds − 1`; §8 간격 검산 재확인; `expandStage`가 §6.5 공식 그대로 | L01, L05 | W3 |
| 3 소리 | `sfx.js` | 없음(독립) | `init`·`play` 2개만 공개; `play`의 본문 전체가 try/catch 안; 6개 이름 분기 | L31 | W5 |
| 4 종단 슬라이스 | `game.js` 구역 1~6: alias·TUNE·S → `boot`/`setState`/`startStage`/`toMain` → `buildWorld`/`make*`/`loadBird` → 입력 4+2 → `tick`/`stepOnce`/`postStep`/`allSlow` → `onCollision`/`applyDamage`/`isOut`/`sweep`/`endShot`/`judge` → 최소 `render`(도형만)·`syncHud` | 1, 2 | §10 사슬의 5홉이 모두 이 구역 안의 이름을 부른다; `Events.on(`이 정확히 1회이고 `startStage` 안; `Composite.remove`가 `sweep`·`endShot`에만; `postStep` 순서가 §6.3과 같음; `loadBird`에서 `Bodies.circle` 다음 줄이 `Body.setStatic(…, true)` | L06~L15, L19, L20, L35, L36 | W2, W3 |
| 5 폭 | `game.js` 구역 7~9: `pause`/`resume`·오버레이 바인딩(§7.1 표의 모든 행) → `loadProgress`/`saveProgress`·격자 생성/갱신 → `showClear`/`showFail`/`starsFor`·다음 스테이지·엔딩 | 4 | §7.1의 버튼 사건 11개마다 대응 리스너가 1개씩; 10번째 스테이지 분기(`stageIdx === 9`)가 `showClear`에 있음 | L02~L04, L25~L29, L32, L33, L41 | W3 |
| 6 폴리시(이름 붙은 단계) | `game.js` 구역 10~11: 배경·새총·고무줄·흔적·피해 색조·`spawnBurst`/`spawnFloater`/`updateFx`; `Sfx.play` 호출 6곳 삽입; 파일 끝 `Game.boot()` | 4, 5 | §7.8의 그리기 순서; `Sfx.play` 문자열 6종이 §6.3 이름과 일치; `updateFx`가 `postStep`에서 불림 | L16, L22, L30, L31 | W5 |
| 7 자체 판독 | 없음(§14 (a) 체크리스트 수행) | 1~6 | §14 (a) 전 항목 | 전체 | W2 |

## 10. Load-bearing path (배선)
선택한 경로: 후보와 동일 — 발사체 드래그·발사 → 비행·충돌 → 피해 → 제거 → 클리어. 5홉으로 압축한다.

| 홉 | 이름(진입 심볼) | 통과 조건 | 그 조건이 처음 참이 되는 지점 |
|---|---|---|---|
| 1 | `onDown` → `onMove` (`pointerdown/move` on `#game`) | `S.state === 'PLAYING' && S.phase === 'ready' && S.bird !== null && dist(toWorld(e), bird.position) ≤ 45` | `startStage(0)`(단계 5의 `#btn-start` 리스너가 호출) 안에서 `loadBird()`가 `S.bird`와 `phase='ready'`를 만들고 마지막 줄 `setState('PLAYING')`이 상태를 세운다 |
| 2 | `onUp` → `Body.setStatic(false)` + `Body.setVelocity` → `phase='flight'` | `S.phase === 'drag' && e.pointerId === S.pointerId && (S.pull의 길이) ≥ 12` | 홉 1의 `onDown`이 `phase='drag'`·`pointerId`를, `onMove`가 `S.pull`을 세운다 |
| 3 | `tick` → `stepOnce` → `Engine.update` → `collisionStart` → `onCollision` → `applyDamage` | `S.state === 'PLAYING'`(루프 보호) && 핸들러가 현재 `S.engine`에 등록됨 && `impact − 4 > 0` && 상대 바디 `meta.kind ∈ {block,pig}` | `boot()`가 `requestAnimationFrame(tick)`을 한 번 시작; `startStage`가 `Engine.create()` 직후 `Events.on(S.engine,'collisionStart',onCollision)`; `buildWorld`가 `meta`를 붙여 생성; 중력은 `Engine.create()` 기본값 |
| 4 | `postStep` → `sweep` → `Composite.remove` + `pigsAlive −= 1` | `body.meta.dead === true`(홉 3의 `applyDamage`가 `hp ≤ 0`에서 세움) 또는 `isOut(body)` | `stepOnce`가 `Engine.update` 직후 `postStep()`을 호출하고 그 첫 줄이 `sweep()`(단계 4) |
| 5 | `judge` → `phase='ending'` → 90스텝 → `setState('CLEARED')` → `showClear` | `S.pigsAlive === 0`, 이후 `endingSteps ≥ 90` | `buildWorld`가 `pigsAlive = pigs.length`로 초기화하고 `sweep`만 감소시킨다; `endingSteps`는 `judge`가 0으로 세우고 매 스텝 증가 |

콜드스타트 표(홉의 통과 조건에 나오는 모든 상태):
| 상태/플래그 | 첫 진입 값 | 바꾸는 자 | 언제 실행 |
|---|---|---|---|
| `window.Matter` | CDN 스크립트가 세움(없으면 undefined) | `boot()`가 검사만 | 스크립트 태그 1줄 → `game.js` 로드 시 |
| `S.state` | `'MAIN'`(선언) | `setState` 단독 | `boot()` 끝 → 버튼 클릭 → 판정 |
| 루프 실행 여부 | 미실행 | `boot()`의 `requestAnimationFrame(tick)` | `game.js` 마지막 줄 `Game.boot()` |
| `S.engine` | `null` | `startStage`(생성) / `toMain`(null) | `#btn-start`·격자·다시하기·다음 클릭 |
| `collisionStart` 핸들러 등록 | 없음 | `startStage`의 `Events.on` | `Engine.create()` 바로 다음 줄 |
| `S.bird` | `null` | `loadBird`(생성) / `endShot`(null) / `toMain`(null) | `startStage` 끝, 발사 종료 뒤 |
| `S.phase` | `'ready'`(선언) | `loadBird`→ready, `onDown`→drag, `onUp`→flight, `cancelDrag`→ready, `judge`→ending | 각 핸들러·스텝 |
| `S.pointerId` | `null` | `onDown` 세움, `onUp`/`cancelDrag`/`pause` 지움 | 포인터 사건 |
| `S.pull` | `{0,0}` | `onMove` 세움, `loadBird`/`cancelDrag` 초기화 | 드래그 중 |
| `S.pigsAlive` | 0(선언) → 스테이지 돼지 수 | `buildWorld` 세움, `sweep`만 감소 | `startStage` / 매 스텝 |
| `S.birdsLeft` | 0(선언) → `stage.birds` | `startStage` 세움, `onUp`만 감소 | 시작 / 발사 |
| `S.score` | 0 | `sweep`(+), CLEARED 행(+보너스), `startStage`(0) | 제거 스텝 / 클리어 / 시작 |
| `body.meta.hp / dead` | `MAT[m].hp`·`PIG_HP` / `false` | `applyDamage` | `collisionStart` 안 |
| `S.endingSteps` | 0 | `judge`(0으로, 이후 +1) | 돼지 0이 된 스텝부터 |
| `S.flightSteps / stillSteps / birdOut` | 0 / 0 / false | `onUp`·`loadBird` 초기화, 비행 부기·`sweep` 갱신 | 비행 중 스텝 |
| `S.hitThisStep` | false | `stepOnce` 첫 줄이 내림, `onCollision`이 올림 | 매 스텝 |
| `S.acc / lastNow` | 0 / 0 | `tick`; `resume`·`startStage`가 0으로 | 매 프레임 |
| `canvas`, `ctx` | null | `boot()`가 바인딩 | 부팅 |
| `canvas` 포인터 리스너 | 없음 | `boot()`가 4개 등록 | 부팅 |

## 11. 대안과 기각 근거 (각각 부활 트리거)
- 직접 물리 구현 — 기각(§2 C3 모순). **구현자에게 실행·테스트 루프가 주어지거나, 사용자가 요구 2를 "무회전 상자"로 완화하면 재개.**
- Matter.js 탄성 `Constraint` 새총 — 기각(시험 없이 스프링 계수·해제 타이밍을 못 맞춤). **실행 루프가 생기면 재개.**
- `MouseConstraint` — 기각(월드의 아무 바디나 잡음, 추가 API 표면). **드래그가 안 잡힌다는 검증자 보고가 §7.3 논리 결함이 아니라 좌표 문제로 판명되면 재개하지 말고 §6.7만 고친다.**
- `Runner` — 기각(일시정지·재개 시맨틱을 추가로 회상해야 함). **120Hz에서 물리가 빨라 보인다는 보고가 있으면 §7.2 누적기부터 점검하고, 그래도 안 되면 재개.**
- `Matter.Render` — 기각(재질·피해 표시 불가). **자체 렌더러가 아무것도 안 그린다는 보고 시 임시 디버그용으로만.**
- `enableSleeping: true` — 기각(제거된 받침 위의 잠든 돼지가 공중에 남는 위험을 시험 없이 배제 못 함). **바디 수 60 초과 스테이지가 생겨 프레임 저하 보고 시 재개.**
- 발사 전 궤적 예측선 — defer(L17). 직전 발사 흔적이 정확하고 상수 의존이 없어 대체.
- 캔버스에 그린 버튼 — 기각(히트테스트 산술을 시험 못 함); DOM 버튼 채택. **DOM 오버레이가 스케일링에서 어긋난다는 보고 시 재개.**
- 스테이지 선택을 별도 상태로 — 기각(상태 1개 추가 대비 이득 없음); 메인 화면 안 격자로 흡수.
- 매개변수 생성기로 10 스테이지 — 기각(콘텐츠 축 위반). **사용자가 "무한 스테이지"를 요구하면 재개.**
- planck.js/Box2D CDN — 기각(검증된 URL 없음). **검증된 URL·버전이 패킷에 실리면 재개.**
- 라이브러리 인라인 복사, npm/번들러, 바이너리 에셋 — 패킷에서 기각; 부활 조건은 패킷대로(사람이 파일을 넣어 줌 / 셸 권한 / 에셋 폴더 제공).

## 12. 위험과 완화
| 위험 | 완화 |
|---|---|
| 물리 상수가 튜닝되지 않아 너무 쉽거나 어려움 | 상수 전부 `TUNE` 한 곳, (b) 태그; 검증자 지시 예: "스테이지 1~3에서 3발로 돼지 1마리를 못 잡으면 `LAUNCH_K` 0.18→0.22 또는 `PIG_HP` 8→6" |
| 저작 좌표 겹침으로 바디가 튀어 오름 | 프리미티브 전개 + §6.5 간격 규칙 + §8 검산(이미 수행) |
| CDN 오프라인 | A1·§2 구멍 선언·`#overlay-error` |
| 포인터 좌표 어긋남 | §6.7 공식 복사, 캔버스 속성 크기 고정 |
| `setStatic(false)` 뒤 질량 복원 실패 | 동적 생성 → `setStatic(true)` 순서 고정(§7.3) |
| 충돌 핸들러 안 제거로 반복자 붕괴 | 핸들러는 표시만, `sweep`이 복사본 순회 |
| 마지막 발사체 ↔ 마지막 돼지 경합 | §7.1 우선순위(클리어 우선), `postStep` 순서 |
| 일시정지 중 드래그 유령 상태 | `pause()`의 `cancelDrag()` |
| AudioContext 자동재생 차단·예외 | 제스처에서만 `init`; `Sfx` 전체 try/catch; 게임 루프와 무관 |
| 120Hz에서 2배속 | 누적기 + 프레임당 3스텝 캡 |
| 정착이 영원히 안 옴 | 600스텝 타임아웃(L36) |
| 이전 스테이지 핸들러가 새 월드에 반응 | 스테이지마다 새 엔진, 이전 참조 폐기 |
| 상표 | 표시명 "슬링샷 피그"(A7) |

## 13. 핵심 질문 7개에 대한 답
1. **물리 엔진**: Matter.js 0.20.0(CDN, §6.1 URL) — §2 판정. 직접 구현은 실행 불가 벽과 모순.
2. **렌더링**: Canvas 2D 자체 렌더러(§7.8), `Matter.Render` 불사용; 버튼·HUD·오버레이는 DOM(§6.9).
3. **10 스테이지 데이터·로딩·전환**: `stages.js`의 `STAGES` 10개(프리미티브 문법 §6.5, 데이터 §8) → `expandStage` → `startStage(idx)`가 매번 새 `Engine.create()`로 월드를 세움; 전환은 `#btn-next` → `startStage(idx+1)`, 10번째는 엔딩 문구(§7.1).
4. **슬링샷 입력·조준·발사·궤적 예측 UX**: Pointer Events 4종, 정적 홀드 + 당김 100px 제한 + 폐형식 `setVelocity`(§7.3); 조준 보조는 고무줄 선 + 직전 발사 궤적 흔적(L16); 사전 예측선은 defer(L17).
5. **충돌·파괴·점수·클리어**: `collisionStart` 상대 속도 − 4 = 피해, 재질별 hp(§6.4·§7.5); 제거는 `sweep`; 점수·별 §7.6; 클리어 = 돼지 0 → 90스텝, 실패 = 발사 종료 시 발사체 0 & 돼지 > 0, 클리어 우선(§7.1).
6. **일시정지 오버레이와 상태 머신**: 5상태(MAIN/PLAYING/PAUSED/CLEARED/FAILED) + 4 phase(ready/drag/flight/ending), 전이 표 §7.1; 우측 버튼 §6.7 CSS; 다시하기/메인으로/계속하기 §6.9.
7. **완료 판정**: §14 — 구현자는 파일 판독 기준 (a), 사람 검증자는 브라우저 절차 (b).

## 14. 완료의 정의
**(a) 구현자용 — 자기 파일을 읽어서 확인(전부 참이어야 완료)**
1. `index.html`에 §6.1 네 줄이 문자 그대로, 그 순서로 있고 `<script>` 태그는 정확히 4개다.
2. §6.9의 모든 id가 `index.html`에 정확히 1회씩 있고, `game.js`가 `getElementById`로 부르는 id 집합이 그 표의 부분집합이다.
3. `game.js`의 첫 두 줄이 §6.2와 같고, 파일 전체에서 `Matter.`로 시작하는 토큰과 alias 5개의 메서드 호출이 §6.8 화이트리스트 11개 밖에 없다; `World.`, `Runner`, `Render`, `MouseConstraint`, `Constraint.`, `Composites`, `Sleeping`, `gravity` 문자열이 없다.
4. `Events.on(`이 `game.js`에 정확히 1회 있고 `startStage` 본문 안이며 첫 인자 `S.engine`, 둘째 `'collisionStart'`, 셋째 `onCollision`이다; `onCollision` 본문에 `Composite.remove`가 없다.
5. `Composite.remove(`는 `sweep`과 `endShot` 본문에만 있다.
6. `postStep` 본문의 호출 순서가 `sweep()`, `judge()`, 비행 부기, `updateFx()`다.
7. `loadBird` 본문에서 `Bodies.circle(` 다음에 나오는 `Body.` 호출이 `Body.setStatic(` 이고 둘째 인자가 `true`다.
8. `Engine.update(`는 `stepOnce` 본문에만 있고, `stepOnce()` 호출은 `tick`의 `S.state === 'PLAYING'` 조건 블록 안에만 있으며 `requestAnimationFrame(tick)`이 `tick`의 마지막 문장이다.
9. §6.3 표의 모든 함수 이름이 해당 파일에 같은 인자 수로 정의돼 있다(`game.js` 39개, `stages.js` 1개, `sfx.js` 2개).
10. `stages.js`의 `STAGES`가 §8 블록과 같고(10개, `par ≤ birds−1`), `expandStage`의 수식이 §6.5와 같다.
11. §7.1의 버튼 사건 11개 각각에 `addEventListener('click', …)`가 1개씩 있고(격자는 버튼 10개에 같은 리스너), `showClear`에 `S.stageIdx === 9` 분기가 있다.
12. `sfx.js`의 `play` 본문 첫 토큰이 `try`이며, `game.js`에 `Sfx.play('launch')`, `'hit'`, `'break'`, `'pig'`, `'clear'`, `'fail'`이 각 1회 이상 있다.
13. 다섯 파일 어디에도 `import `, `export `, `require(`, `.png`, `.jpg`, `.mp3`, `.ogg` 문자열이 없다.
14. `style.css`에 `#btn-pause`가 `right:` 속성을 갖고 `#game`에 `touch-action: none`이 있다.

**(b) 외부(사람) 검증자용 — 브라우저 절차(구현자는 수행하지 않는다)**
- 온라인에서 `index.html`을 열고 콘솔 오류 0건, 메인 화면에 "게임 시작"과 격자가 보인다.
- 측정 가능 문장 1: 스테이지 1에서 발사체 3개를 모두 위로(돼지를 피해) 쏘면 마지막 발사체가 멈춘 뒤 **10초 이내에 실패 오버레이가 뜬다**.
- 측정 가능 문장 2: 스테이지 1에서 돼지를 맞혀 제거하면 **1.5초 뒤 클리어 오버레이**가 뜨고 별이 1개 이상이며, **새로고침 뒤 격자의 2번 버튼이 열려 있다**.
- 인게임 우상단 버튼 클릭 → 오버레이에 계속하기·다시하기·메인으로 3개; 계속하기 후 발사체 위치가 정지 순간과 같다; 다시하기 후 점수 0·발사체 3.
- 클리어 → 다음 스테이지를 10번 반복하면 10번째 오버레이 제목이 "모든 스테이지 클리어!"이고 다음 버튼이 없다.
- 창을 절반 크기로 줄여도 발사체 위에서 드래그가 잡힌다.

## 15. Coverage self-audit (커버리지 자체 감사)
원장을 다시 훑어 잡은 항목과 착지점: 라이선스(Matter.js MIT 고지 → §6.1 HTML 주석, 단계 1) / 상표(→ A7) / 접근성·키보드(→ L21 defer) / 브라우저 호환(→ A3) / 주사율(→ A4·§7.2) / 프라이빗 모드(→ L41) / 자동재생 정책(→ §7.9-7) / 성능 상한(바디 26개, 스테이지당 60 이하 규칙 → §11 sleeping 부활 트리거) / 창 리사이즈(→ L23, CSS만으로 처리, JS 없음) / 첫 방문 안내(→ L37) / 고DPI(→ L39 defer) / 새로고침 중 진행(→ L33) / 오프라인(→ A1) / 발사체가 새총 뒤(왼쪽)로 발사되는 경우(→ L35 이탈 처리로 발사 종료; 별도 규칙 불필요) / 돼지가 선반에서 떨어져도 안 죽는 경우(→ §8 6번 note로 공개; 설계 의도) / 국제화(n-a: 한국어 고정, 요구 없음). 잡지 못한 범주는 없다고 판단하나, 이 문장은 검증 불가이므로 검증자 절차 (b)가 최종이다.

## 16. Operational-burden audit (실행자 부담 감사)
실행자는 한 번 쓰고 끝나는 구현자다. 제거한 규칙: (1) 초안에 있던 런타임 `selfCheck()`(스테이지 데이터 검증 함수) — 구현자가 실행 못 하므로 코드만 늘린다 → §6.5 간격 규칙(읽기 검사)으로 대체. (2) `render.js`/`input.js` 분리 — 접합부 2개 증가 → `game.js` 하나로 합침. (3) 음소거 토글 — 표면 1개 증가 대비 이득 없음 → 미도입. (4) 스테이지별 별 임계 점수 3개 × 10 — 저작 수치 30개 추가 → `par` 하나에서 파생(§7.6). 남긴 규칙 중 가장 무거운 것은 §14 (a) 14항목이며, 각 항목이 문자열 검색 한 번으로 끝나므로 유지한다.

## 17. 장치 출처
원장·품질 바닥·동작 문장·콘텐츠 축·이름 붙은 폴리시 단계·스택 명시 → 프레임의 요구. 벽·모순 테스트·구멍 선언·생존자 재심·단계별 벽 태그 → 빌린 프레임. 스텝 카운터 타이머·클리어 우선 게이트·정착 게이트·상태 표의 무시 기본값·틈 탐색 8건·자체 감사 2건 → 이 스타일의 규율(각각 §7.2·§7.1·§7.4·§7.9·§15·§16의 결정을 바꿨다: 벽시계 제거, 실패 판정 위치 이동, `cancelDrag` 삽입). 프리미티브 문법·정적 홀드 발사·제거 지연(sweep)·DOM 오버레이 UI·5000점 관례 → 도메인 정석. 심볼 표·복사용 블록·화이트리스트 → 기계 예산.

## 18. 구현자 계약
- **고정 스택**: 플레인 HTML/CSS/JS 5파일 + `https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js` (유일한 외부 의존성; 버전 0.20.0은 2026-09-29 확인된 실존 버전). 빌드·설치·모듈 없음.
- **부활 트리거**: 직접 물리·탄성 Constraint·MouseConstraint·Runner → 실행 루프가 생기면; sleeping → 바디 60 초과·프레임 저하 보고; 예측선 → 조준 난이도 보고; 인라인 라이브러리 → 사람이 파일을 넣어 줌; planck.js → 검증된 URL 제공. 그 전에는 §6.8 화이트리스트 밖 API를 쓰지 않는다.
- **주장을 증명하는 검사**: 구현자는 §14 (a) 14항목을 파일 판독으로 전부 참으로 만든다. 사람 검증자용(구현자는 실행하지 않음): 브라우저에서 `index.html` 열기 → 콘솔 오류 0건 → §14 (b) 측정 문장 1·2 성립.
