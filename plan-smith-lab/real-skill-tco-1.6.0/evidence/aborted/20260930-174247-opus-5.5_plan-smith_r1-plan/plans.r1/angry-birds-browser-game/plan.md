# 웹 브라우저 앵그리버드 게임 — 구현 계획서
- Reasoning frame: spec-coverage (물리 엔진 선택 셀 1개만 dialectic 차용, §4.2) / Style: opus (standalone)
- 한 줄 요약: 빌드 없이 `index.html`을 더블클릭하면 도는 Canvas 2D + Matter.js 0.19.0 슬링샷 게임을 만든다. 10개 스테이지는 저작 데이터로 넣고, 일시정지 버튼은 화면 우측에 두며, 모든 화면 전환은 상태 머신 하나로 처리한다.
- 입장 점검: 내 반사적 습관은 파일 구조와 엔진 선택부터 쓰는 것이다. 이 문서는 요구사항 × 표면 원장(§1)을 먼저 확정하고, 아키텍처(§4)는 그 원장을 충족시키는 수단으로만 쓴다.
- 독자: 이 문서만 읽고 파일 읽기/쓰기 도구로 구현하는 사람(실행·설치·테스트 불가). 필요한 정보는 모두 이 문서 안에 있다.
- 약어: A1~A7 = 가정(§3), C1~C12 = 구현자 자가 점검(§10), T1~T10 = 사람 수용 테스트(§10), L1~L35 = 원장 행(§1.2).

---

## 1. 요구사항 × 표면 매트릭스 (빠짐없는 판정 원장)

### 1.1 요구사항 원문 (사용자 지정, 전부 `build`만 허용)
- **R1** 스테이지는 **10단계**.
- **R2** 게임 시작 → 앵그리버드와 같은 게임 시스템: 새총으로 발사체를 당겨 쏘고, 포물선 궤적·중력·충돌·구조물 파괴로 목표(돼지)를 제거하는 물리 기반 슬링샷 게임.
- **R3** 인게임 **우측**에 **일시정지 버튼**이 있고, 누르면 **다시하기 / 메인으로** 버튼이 나온다.
- (암시) 완성된 게임이라면 당연히 있어야 하는 것: 점수·별, 진행 저장, 효과음, 파괴 연출, 실패 경로 처리. 원장에서 "(암시)"로 표시한다.

### 1.2 원장 — 빈칸 없음. `build` / `defer(+트리거)` / `n-a(+이유)`
| ID | 요구 | 표면 | 판정 |
|---|---|---|---|
| L1 | R1 | 스테이지 데이터 10개(저작 콘텐츠, §5) | build |
| L2 | R1 | 클리어 화면 → "다음 스테이지" 전환 | build |
| L3 | R1(암시) | 스테이지 선택 화면 | build |
| L4 | R1(암시) | 진행 저장·잠금 해제(localStorage) | build |
| L5 | R1 | 10단계 완주 화면 | build |
| L6 | R2 | 메인 "게임 시작" | build |
| L7 | R2 | 슬링샷 드래그·조준·발사(마우스+터치) | build |
| L8 | R2 | 궤적 예측 점선 + 직전 샷 흔적 | build |
| L9 | R2 | 중력·포물선·충돌(물리) | build |
| L10 | R2 | 구조물 파괴(재질 3종 + 손상 표시) | build |
| L11 | R2 | 돼지 제거 | build |
| L12 | R2(암시) | 새 3종과 능력 | build |
| L13 | R2 | 클리어 판정·화면 | build |
| L14 | R2 | 실패 판정·화면 | build |
| L15 | R2(암시) | 점수·별 3개 | build |
| L16 | R2 | HUD(스테이지·점수·남은 새) | build |
| L17 | R2(암시) | 파편·점수 팝업 이펙트 | build |
| L18 | R2(암시) | 합성 효과음 + 음소거 | build |
| L19 | R2(암시) | 화면 흔들림 | defer — 트리거: 수용 테스트 T3/T5를 한 사람이 "타격감이 약하다"고 보고할 때 |
| L20 | R2(암시) | 카메라 팬/줌 | defer — 트리거: 폭 1280px 밖에 구조물을 둬야 하는 스테이지가 추가될 때 |
| L21 | R2(암시) | 파랑새(분열) | defer — 트리거: 11번째 스테이지를 추가하거나, T10에서 "새 종류가 단조롭다"는 보고가 나올 때 |
| L22 | R3 | 인게임 우측 일시정지 버튼 | build |
| L23 | R3 | 오버레이 "다시하기" | build |
| L24 | R3 | 오버레이 "메인으로" | build |
| L25 | R3(암시) | 오버레이 "계속하기" + Esc 키 | build |
| L26 | R3 | 일시정지 중 물리·카운트다운·입력 정지 | build |
| L27 | R3(암시) | 탭 전환 시 자동 일시정지 | build |
| L28 | 실패 경로 | Matter 로드 실패 → 한국어 오류 화면 | build |
| L29 | 실패 경로 | 저장·오디오를 쓸 수 없을 때 게임과 격리 | build |
| L30 | 실패 경로 | 창 크기 변경·고해상도·터치 스크롤 | build |
| L31 | 실패 경로 | 휴대폰 세로 방향 안내 | defer — 트리거: 휴대폰 세로 플레이 요구가 나올 때 |
| L32 | — | 다국어 | n-a — UI는 한국어로 고정(가정 A4) |
| L33 | — | 온라인 랭킹/계정 | n-a — 서버가 없고 file://로 실행 |
| L34 | — | 외부 이미지/사운드 파일 | n-a — 도형 그래픽과 합성음 사용(가정 A5) |
| L35 | — | 레벨 에디터 | n-a — 요구 범위 밖이며, 스테이지는 코드 데이터 |

### 1.3 표면별 품질 하한 ("완성"의 뜻)
- **메인 화면**: 제목, 버튼 3개(게임 시작 / 스테이지 선택 / 소리 켜짐·꺼짐), 누적 별 "별 N / 30"이 보이고, 버튼에 호버·눌림 반응이 있다.
- **플레이필드**: 하늘 그라데이션, 구름, 풀 덮인 지면, Y자 새총이 있다. 조준 중에는 고무줄 두 가닥이 새에 연결되고, 대기 중인 새는 새총 왼쪽 지면에 줄지어 보인다.
- **파괴 피드백**: 체력이 50% 아래로 떨어진 블록은 금이 간 모습이 되고, 파괴되는 순간 재질 색 파편 6~10개, "+점수" 팝업, 효과음이 함께 나온다. 파괴가 조용히 사라지는 것으로 끝나면 미완성이다.
- **HUD**: 스테이지 번호와 이름, 점수(천 단위 쉼표), 남은 새 수가 게임 중 늘 보이고 점수 변화가 즉시 반영된다. 일시정지 버튼은 게임 영역 오른쪽 위에 있다.
- **일시정지 오버레이**: 반투명 어두운 막 위에 "일시정지" 제목과 버튼 3개(계속하기 / 다시하기 / 메인으로)가 있다. 막 뒤에서는 장면이 멈춘 채 보인다.
- **클리어/실패/완주 화면**: 결과 제목, 이번 점수, 별 0~3개가 보이고, 다음 행동 버튼이 항상 1개 이상 있다. 막다른 화면은 없다.
- **스테이지 선택**: 1~10 버튼에 획득한 별이 표시되고, 잠긴 스테이지는 비활성 상태로 "잠김"이라고 적힌다.
- **진행 저장**: 새로고침하거나 브라우저를 다시 열어도 해금 상태, 스테이지별 최고 별·점수, 음소거 설정이 유지된다.
- **오류 화면**: 빈 화면 대신 원인과 조치를 적은 한국어 문장이 보인다.

### 1.4 동사 문장 — build 행마다 1문장 (이 절이 실제 구현 지시)
- **L1** 플레이어가 스테이지 1부터 10까지 차례로 열면 각 스테이지에서 서로 다른 구조물·재질·돼지 수·새 구성(§5 표)이 나타난다. 이것이 없으면 여러 스테이지가 같은 배치를 반복하거나, 스테이지 선택에서 버튼을 눌러도 빈 필드가 뜬다.
- **L2** 플레이어가 클리어 화면에서 "다음 스테이지"를 누르면 stageIndex+1 스테이지가 새 배치로 로드되고 HUD 번호가 1 오른다. 이것이 없으면 버튼을 눌렀을 때 같은 스테이지가 다시 뜨거나 화면이 클리어 오버레이에 멈춘다.
- **L3** 플레이어가 메인에서 "스테이지 선택"을 누르면 1~10 버튼 격자가 뜨고, 해금된 번호를 누르면 그 스테이지가 바로 시작된다. 이것이 없으면 이미 깬 스테이지를 다시 하려면 1부터 새로 해야 한다.
- **L4** 플레이어가 스테이지 i를 클리어하면 i+1이 해금되어 저장되고 최고 별·점수가 갱신된다. 이것이 없으면 새로고침 후 선택 화면이 전부 "잠김"으로 돌아간다.
- **L5** 플레이어가 스테이지 10을 클리어하면 "모든 스테이지 클리어!" 제목과 누적 별이 뜨고 "다음 스테이지" 버튼은 숨겨진다. 이것이 없으면 존재하지 않는 11번째 스테이지를 로드하려다 빈 필드나 콘솔 오류가 난다.
- **L6** 플레이어가 "게임 시작"을 누르면 아직 별이 0인 첫 스테이지(처음 실행이면 스테이지 1)가 1초 안에 그려진다. 이것이 없으면 메인 메뉴가 그대로 남거나 하늘만 보인다.
- **L7** 플레이어가 새총 위 새를 누른 채 끌었다 놓으면 새가 당긴 방향의 반대쪽으로 당긴 거리에 비례한 속도로 날아간다. 이것이 없으면 새가 커서를 따라오지 않거나, 놓은 자리에 떨어지거나, 터치로는 화면만 스크롤된다.
- **L8** 플레이어가 조준하는 동안 예상 포물선이 흰 점선으로 그려지고, 발사 뒤에는 실제 비행 경로의 흔적 점이 다음 발사까지 남는다. 이것이 없으면 조준 중 새총 앞 하늘이 비어 있거나 점선이 실제 비행 곡선과 겹치지 않고, 첫 샷의 흔적 점이 다음 새가 새총에 올라오는 순간 지워진다.
- **L9** 발사된 새가 공중에 있는 동안 중력으로 궤적이 휘어 포물선을 그리고, 블록에 닿으면 블록을 밀거나 넘어뜨린다. 이것이 없으면 새가 직선으로 날아가거나 블록을 통과한다.
- **L10** 새나 낙하물이 블록을 충분히 세게 때리면 블록이 금 간 상태를 거쳐 파편과 함께 사라지고, 얼음은 쉽게·돌은 어렵게 깨진다. 이것이 없으면 모든 재질이 한 번에 똑같이 사라지거나, 아무리 맞아도 깨지지 않는다.
- **L11** 돼지가 충격을 받아 체력이 0이 되거나 화면 밖으로 떨어지면 녹색 연기와 "+5,000"을 남기고 사라지며 남은 돼지 수가 준다. 이것이 없으면 깔린 돼지가 계속 서 있어 클리어가 뜨지 않는다.
- **L12** 플레이어가 비행 중 화면을 누르면 노란 새는 진행 방향으로 1.8배 가속하고 검은 새는 그 자리에서 폭발한다(검은 새는 첫 충돌 1.5초 뒤 자동 폭발도 한다). 이것이 없으면 비행 중 탭해도 노란 새가 같은 속도로 날고 검은 새는 돌 블록에 붙어 멈춘 채 샷이 끝나거나, 탭할 때마다 새총에서 새가 한 마리 더 튀어나간다.
- **L13** 마지막 돼지가 사라지면 1.5초 뒤 "스테이지 클리어!" 화면이 점수·별과 함께 뜬다. 이것이 없으면 돼지를 다 없앤 뒤에도 빈 구조물 앞에서 게임이 끝나지 않는다.
- **L14** 마지막 새의 샷이 끝나고 장면이 멈췄는데 돼지가 남아 있으면 "실패" 화면이 다시하기·메인으로 버튼과 함께 뜬다. 이것이 없으면 새가 다 떨어진 새총 앞에서 플레이어가 할 일이 없다.
- **L15** 블록·돼지를 없앨 때마다 점수가 오르고 클리어 때 남은 새 한 마리당 10,000점이 더해지며, 결과 화면에 별 1~3개가 계산돼 보인다. 이것이 없으면 클리어 화면 점수가 늘 0이거나, 샷을 몇 번 쏘든 별이 똑같다.
- **L16** 게임이 진행되는 동안 HUD 왼쪽 위의 스테이지명·점수·남은 새 수가 상태가 바뀐 그 프레임에 갱신된다. 이것이 없으면 돼지를 잡아도 점수가 0으로 남거나 새를 쏴도 수가 줄지 않는다.
- **L17** 블록이나 돼지가 파괴되면 그 위치에서 파편이 튀어 흩어지고 점수 팝업이 떠오르며 0.8초 안에 사라진다. 이것이 없으면 파괴가 "갑자기 사라짐"으로 보여 버그처럼 느껴진다.
- **L18** 발사·충돌·파괴·돼지 제거·클리어·실패·버튼 클릭마다 짧은 합성음이 나고, 메인의 소리 버튼으로 끄면 새로고침 뒤에도 조용하다. 이것이 없으면 파괴에 청각 피드백이 없거나 음소거 설정이 새로고침마다 풀린다.
- **L22** 게임 중 플레이어가 게임 영역 오른쪽 위 "II" 버튼을 누르면 즉시 일시정지 오버레이가 뜬다. 이것이 없으면 버튼이 왼쪽에 있거나, 눌러도 새가 계속 날아간다.
- **L23** 일시정지 오버레이에서 "다시하기"를 누르면 같은 스테이지가 초기 배치·점수 0·새 전량으로 재시작된다. 이것이 없으면 무너진 구조물이 남은 채로 재개되거나 이전 판의 클리어 카운트다운이 새 판에서 터진다.
- **L24** 일시정지 오버레이에서 "메인으로"를 누르면 메인 화면으로 돌아가고 HUD와 일시정지 버튼이 숨겨진다. 이것이 없으면 메인 위에 HUD가 겹치거나 보이지 않는 물리 세계가 계속 돈다.
- **L25** 플레이어가 "계속하기"를 누르거나 Esc를 한 번 더 누르면 멈춘 그 자리에서 비행과 낙하가 이어진다. 이것이 없으면 일시정지를 풀 방법이 다시하기뿐이라 진행 중인 샷을 잃는다.
- **L26** 일시정지 상태에서는 새·블록이 3초가 지나도 움직이지 않고, 클리어 카운트다운이 멈추며, 캔버스 클릭이 무시된다. 이것이 없으면 오버레이 뒤에서 판정이 나 클리어 화면이 오버레이 위로 튀어나온다.
- **L27** 게임 중 플레이어가 다른 탭으로 가면 자동으로 일시정지되고, 돌아오면 오버레이가 떠 있다. 이것이 없으면 돌아온 순간 누적된 시간이 한꺼번에 계산돼 구조물이 폭발하듯 흩어진다.
- **L28** 사용자가 인터넷 없이 게임을 열면 "물리 엔진(Matter.js)을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침하세요."가 화면 가운데에 뜬다. 이것이 없으면 흰 화면만 보이고 콘솔에 `Matter is not defined`가 찍힌다.
- **L29** 브라우저가 localStorage나 AudioContext를 막아도 게임은 끝까지 플레이된다(저장은 메모리에만, 소리는 무음). 이것이 없으면 Safari file:// 등에서 "게임 시작" 클릭이 예외로 멈춘다.
- **L30** 사용자가 창 크기를 바꾸거나 고해상도 화면·휴대폰으로 열면 16:9 게임 영역이 비율을 유지한 채 창에 맞춰지고 선명하게 그려진다. 새를 끌 때 페이지는 스크롤되지 않는다. 이것이 없으면 클릭 위치와 새 위치가 어긋나거나, 화면이 흐리거나, 드래그가 페이지를 움직인다.

---

## 2. 문제 정의 / 목표
실행해 볼 수 없는 구현자가 첫 시도에 쓴 코드가 브라우저에서 곧바로 동작해야 한다. 그래서 이 문서는 각 부품의 기능에 더해 **파일 사이의 이음새**(전역 이름, 시그니처, 로드 순서, 초기 상태)를 고정한다. 목표 상태는 §10이다.

**요구사항 파일의 핵심 질문 7개에 대한 답**
1. 물리 엔진: **Matter.js 0.19.0**(CDN 2중화 + 로드 가드). 판정 과정은 §4.2.
2. 렌더링: **Canvas 2D 자체 렌더러**(Matter.Render는 쓰지 않음). UI는 캔버스 위 DOM 오버레이. §4.1, §4.8.
3. 10개 스테이지: `js/stages.js` 안의 JS 리터럴 배열 `AB.STAGES`(fetch/JSON 쓰지 않음). 스테이지를 열 때마다 엔진을 새로 만들고, 전환은 `AB.Game.loadStage(i)` 하나로만 한다. §4.4, §5.
4. 슬링샷 입력: Pointer Events로 새 반경 45px 안을 눌러 잡고 최대 110px까지 당긴 뒤 놓으면 발사한다. 조준 중에는 예측 점선, 발사 후에는 흔적 점을 그린다. §4.7.
5. 충돌·파괴·점수·클리어: 상대속도 기반 피해 → 체력 0이면 제거 → 점수 → 돼지 0이면 클리어, 새 0에 장면이 정지하고 돼지가 남으면 실패. §4.7.
6. 일시정지와 상태 머신: `MENU / SELECT / PLAYING / PAUSED / CLEAR / FAIL / ERROR`. 화면 상태를 바꾸는 곳은 `AB.Game.setScreen` 하나뿐이다. §4.6.
7. 완료 기준: 구현자가 파일을 읽어서 확인하는 C1~C12와 사람이 브라우저에서 확인하는 T1~T10. §10.

---

## 3. 명시적 가정 (각 가정에 "틀리면" 영향 포함)
- **A1** 사용자는 `index.html`을 더블클릭(file://)으로 연다. → 그래서 ES 모듈과 fetch는 쓰지 않고, 클래식 `<script src>`와 전역 네임스페이스 `AB`를 쓴다. 틀리면(http로 서빙): 현재 설계도 그대로 동작하므로 손실은 없고, 모듈화할 수 있는 여지만 남는다.
- **A2 (계획 전체가 걸린 가정)** 플레이하는 브라우저에서 인터넷(CDN)에 접속할 수 있다. 틀리면 물리 엔진이 없어 게임을 할 수 없다. 가장 싼 조기 확인은 사람이 T9와 T1을 한 번씩 해 보는 것이다. 대체 경로: L28 오류 화면이 원인을 알려 주고, 오프라인이 확정되면 §4.2 재판정 트리거 ①에 따라 `physics.js`만 자체 구현으로 교체한다(다른 파일의 시그니처는 그대로).
- **A3 (계획 전체가 걸린 가정)** 아래 두 URL에 matter-js 0.19.0 빌드가 있다. 틀리면 L28 오류 화면이 뜬다. 가장 싼 확인: 사람이 브라우저 주소창에 두 URL을 붙여 넣어 JS 본문이 나오는지 본다. 대체 경로: 버전 문자열을 `0.18.0`으로 바꾼 같은 경로를 쓴다(API 차이는 이 문서가 쓰는 범위 밖).
- **A4** UI 문구는 한국어이고 버튼 라벨은 요구사항 표기 그대로 "게임 시작", "다시하기", "메인으로"이다. 틀리면 문구만 바꾸면 된다(`index.html`과 `ui.js`의 문자열).
- **A5** 외부 이미지·사운드 파일 없이 도형으로 그리고 WebAudio로 합성한다. 틀리면(에셋 제공 시) `render.js`/`audio.js` 내부만 바뀐다.
- **A6** "다시하기"는 **현재 스테이지 재시작**을 뜻하고, 이어 하기는 별도 버튼 "계속하기"(L25)로 둔다. 틀리면(다시하기 = 이어 하기 의도) `#btn-restart` 핸들러를 `resume()`으로 바꾸고 "계속하기"를 제거한다.
- **A7** 대상은 최신 데스크톱 Chrome/Edge/Firefox/Safari이며 터치 기기는 Pointer Events로 함께 지원한다. 틀리면(구형 브라우저) Pointer Events와 `??` 연산자가 없을 수 있다. 그래서 `??`와 `?.`는 쓰지 않는다(C12). 구형 브라우저 지원이 필요 없다고 확정되면 이 금지를 다시 연다.

---

## 4. 전달 스택과 아키텍처

### 4.1 스택과 그것이 강제하는 것
| 선택 | 산 이유(강제하는 것) |
|---|---|
| 빌드 없는 평범한 파일(HTML+CSS+클래식 JS) | 구현자가 설치·빌드를 할 수 없다. 브라우저가 파일을 그대로 읽으므로 "빌드는 됐는데 안 뜬다"는 단계가 없다 |
| Matter.js **0.19.0**, CDN 2중화 | 적층 안정성과 강체 회전을 검증된 코드에 맡긴다. 쓰는 API는 §4.4 목록으로 제한한다 |
| Canvas 2D 자체 렌더러 | 한 가지 그리기 경로(`body.vertices`)로 모든 블록을 그린다. 외형을 자유롭게 정하고, rAF 루프는 하나만 둔다 |
| DOM 오버레이 UI | 버튼이 실제 `<button>`이라 클릭 판정을 직접 구현하지 않아도 되고, id로 배선을 읽어서 점검할 수 있다(C6) |
| 모든 파일을 IIFE로 감싸고 `AB.*` 네임스페이스로 공개 | 파일 사이의 전역 이름 충돌을 막고, 공개 심볼이 §4.4 기호표와 1:1로 대응한다 |

### 4.2 물리 엔진 판정 (dialectic 차용 셀 — 이 셀에만 적용)
**판정 함수(채점 전에 고정):** 각 선택지에 대해 "구현자가 자기 파일을 읽어서는 발견할 수 없는 실패 시나리오"를 모두 나열한다. 각 시나리오를 **범위 × 복구**로 채점하는데, 이 문서가 지면으로 강제할 수 있는 완화(복사 블록, 가드)를 적용한 뒤의 값으로 매긴다.
- 범위: 3 = 게임 전체 불능(빈 화면·시작 불가), 2 = 게임은 뜨지만 핵심 상호작용(파괴·판정)이 망가짐, 1 = 외형·손맛만 나빠짐.
- 복구: 1 = 코드 수정 없이 환경 조치(인터넷 연결 후 새로고침)로 복구, 2 = 콘솔 오류가 원인 줄을 가리켜 한 줄 수정으로 복구, 3 = 원인이 수치나 알고리즘에 숨어 있어 디버깅이 필요.
- 선택지 점수 = 시나리오 곱의 **최댓값**(한 번의 시도가 최악 경우에 걸리므로). 낮은 쪽이 이긴다. **동점이면** 곱이 6 이상인 시나리오의 수가 적은 쪽이 이긴다.

| 선택지 | 시나리오 | 범위×복구 |
|---|---|---|
| Matter.js | M1 오프라인/CDN 차단(가드가 오류 화면 표시) | 3×1=3 |
| | M2 API 이름 착오(허용 목록 복사로 완화, TypeError가 이름을 알려 줌) | 3×2=6 |
| | M3 마찰·반발 튜닝 부적절 | 1×2=2 |
| 자체 구현 | H1 적층 떨림·침하·폭발(솔버 오차) | 2×3=6 |
| | H2 충돌 법선·침투 해소 부호 오류(새가 통과하거나 튕김) | 2×3=6 |
| | H3 회전 관성·마찰 누락(넘어지지 않고 미끄러짐) | 1×3=3 |

최댓값은 둘 다 6으로 동점이다. 동점 규칙을 적용하면 6 이상 시나리오가 Matter 1개, 자체 구현 2개이므로 **Matter.js를 채택**한다.

**분할 판정:** 자체 구현 쪽은 Matter가 "오프라인에서 진다"는 조건을 정당하게 주장할 수 있다. 그래서 이 쟁점을 (가) 엔진 선택과 (나) 엔진 전달 방식으로 나누고, (나)를 같은 척도로 따로 채점했다. 파일 동봉(구현자가 `matter.min.js`를 기억으로 작성)은 3×3=9, CDN 2중화 + 가드는 3×1=3이다. 따라서 CDN 2중화를 택한다. 척도는 바꾸지 않았다.

**패자 논거의 제약 승격:** 자체 구현 쪽의 가장 강한 논거는 "외부 의존이 없으니 영원히 동작하고, API를 잘못 기억할 위험도 없다"이다. 이를 다음 제약으로 바꾼다.
(1) `Matter`와 그 별칭 이름은 `js/physics.js` 밖에 한 번도 등장하지 않는다(예외: index.html의 §4.3 폴백 줄, 그리고 문자열 리터럴·주석 — C3). 다른 파일은 `AB.Physics.*`와 몸체의 일반 속성(`position`, `angle`, `vertices`, `velocity`, `speed`, `circleRadius`, `isSleeping`)만 쓴다. 그래서 엔진을 교체해도 한 파일만 바뀐다.
(2) §4.4에 적힌 Matter API만 쓴다.
(3) `boot()`는 다른 무엇보다 먼저 `AB.Physics.available()`을 확인한다.

**재판정 트리거:**
① 플레이 환경이 오프라인으로 확정되면(사용자가 의도한 환경에서 L28 오류 화면을 1회 이상 보고) 자체 구현으로 뒤집고, `physics.js`를 같은 시그니처로 다시 쓴다.
② 두 CDN URL이 모두 로드되지 않으면(T9 없이 2/2 실패) 가정 A3의 대체 경로로 버전을 다시 고정한다.
③ 10개 스테이지 가운데 3개 이상에서 발사 전 5초 안에 구조물이 스스로 무너지면(T4) 반복 횟수를 10/8에서 20/12로 올리고 블록 `frictionStatic`을 1.2로 조정한다. 자체 구현은 H1에서 더 불리하므로 이 트리거로는 뒤집지 않는다.

### 4.3 파일과 로드 순서 (그대로 복사)
```
index.html  css/style.css
js/config.js  js/stages.js  js/storage.js  js/audio.js  js/physics.js
js/render.js  js/game.js  js/ui.js  js/input.js  js/main.js
```
`index.html`의 `</body>` 바로 앞에 다음을 문자 그대로 둔다.
```html
<script src="https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js"></script>
<script>window.Matter || document.write('<script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"><\/script>');</script>
<script src="js/config.js"></script>
<script src="js/stages.js"></script>
<script src="js/storage.js"></script>
<script src="js/audio.js"></script>
<script src="js/physics.js"></script>
<script src="js/render.js"></script>
<script src="js/game.js"></script>
<script src="js/ui.js"></script>
<script src="js/input.js"></script>
<script src="js/main.js"></script>
<script>AB.Main.boot();</script>
```
규칙:
- 모든 js 파일은 첫 줄이 `window.AB = window.AB || {};`이고, 본문은 `(function () { 'use strict'; ... })();` 안에 둔다. 예외는 `config.js` 하나다. §4.5 블록을 IIFE 없이 그대로 쓴다(객체 리터럴 대입 하나뿐이라 새어 나가는 지역 이름이 없다).
- 최상위 코드에서 다른 파일의 함수를 호출하는 곳은 마지막 인라인 `AB.Main.boot()` 하나뿐이다(`stages.js`가 자기 파일의 `AB.StageKit`을 쓰는 것은 예외).

**DOM id (index.html ↔ ui.js 계약).** `#game`(16:9 컨테이너, `position:relative`) 안에 다음을 둔다.
- 캔버스: `canvas#view`
- HUD: `#hud`(`position:absolute; inset:0; pointer-events:none;`). 자식은 `#hud-stage`, `#hud-score`, `#hud-birds`와 `button#btn-pause`(텍스트 "II", `title="일시정지"`, CSS `position:absolute; top:16px; right:16px; pointer-events:auto;`). **`#hud`가 포인터를 가로채면 캔버스 드래그가 죽으므로** `pointer-events:none`은 빠뜨릴 수 없다.
- `#screen-menu`: `#btn-start` "게임 시작", `#btn-select` "스테이지 선택", `#btn-sound`, `#menu-stars`
- `#screen-select`: `#select-grid`, `#btn-select-back` "메인으로"
- `#overlay-pause`: `#btn-resume` "계속하기", `#btn-restart` "다시하기", `#btn-pause-main` "메인으로"
- `#screen-clear`: `#clear-title`, `#clear-score`, `#clear-stars`, `#btn-next` "다음 스테이지", `#btn-clear-retry` "다시하기", `#btn-clear-main` "메인으로"
- `#screen-fail`: `#fail-title`, `#fail-score`, `#fail-stars`, `#btn-fail-retry` "다시하기", `#btn-fail-main` "메인으로"
- `#screen-error`: `#error-text`

모든 화면과 `#hud`는 처음에 CSS 클래스 `hidden`을 가진다. style.css에는 `.hidden{display:none !important;}`를 문자 그대로 둔다. 화면 요소에 id 선택자로 `display:flex` 등을 주면 명시도에서 `.hidden`이 지고, 숨겨졌어야 할 메뉴가 캔버스를 덮은 채 남아 새를 잡을 수 없다. 그래서 `!important`는 빠뜨릴 수 없다. 화면 요소는 `position:absolute; inset:0;`로 캔버스를 덮는다(보일 때만 입력을 가로채는 것이 의도된 동작이다). `#game` 크기는 `width: min(100vw, calc(100vh * 16 / 9)); aspect-ratio: 16 / 9;`로 가운데 배치한다. 캔버스에는 `touch-action: none; width:100%; height:100%;`를 준다.

### 4.4 기호표 (공개 심볼 = 이것뿐, 시그니처 고정)
`physics.js` 최상단(IIFE 안) 별칭 줄은 그대로 복사한다.
```js
const { Engine, Bodies, Body, Composite, Events, Sleeping } = window.Matter || {};
```
**허용 Matter API(이것 말고는 쓰지 않는다):**
- `Engine.create({ enableSleeping: true, positionIterations: 10, velocityIterations: 8 })`
- `Engine.update(engine, AB.CONFIG.STEP_MS)`
- `Bodies.rectangle(x, y, w, h, opts)`, `Bodies.circle(x, y, r, opts)` — opts 키는 `isStatic, density, friction, frictionStatic, restitution, frictionAir, label`
- `Composite.add(engine.world, body)`, `Composite.remove(engine.world, body)`
- `Body.setVelocity(body, { x, y })`, `Sleeping.set(body, false)`
- `Events.on(engine, 'collisionStart', fn)` — `event.pairs[i].bodyA.parent`, `.bodyB.parent`
- 읽기 전용: `body.position/angle/velocity/speed/vertices/circleRadius/isSleeping/isStatic`

| 파일 | 심볼 | 시그니처 → 반환 | 책임 |
|---|---|---|---|
| config.js | `AB.CONFIG` | 객체(§4.5) | 상수 전부 |
| stages.js | `AB.StageKit.block` | `(m, cx, bottom, w, h) → BlockSpec` | 중심 y = `GROUND_Y - bottom - h/2` |
| | `AB.StageKit.frame` | `(m, cx, bottom, span=140, postH=100) → BlockSpec[3]` | 기둥 20×postH 두 개(중심 cx±(span/2−10)) + 판 span×20(bottom+postH). 윗면 = bottom+postH+20 |
| | `AB.StageKit.pig` | `(cx, bottom, r=18, hp=AB.CONFIG.PIG.hp) → PigSpec` | 중심 y = `GROUND_Y - bottom - r` |
| | `AB.StageKit.hill` | `(cx, bottom, w, h) → TerrainSpec` | 정적 흙 블록 |
| | `AB.STAGES` | `StageDef[10]` | `{name, birds:string[], terrain:TerrainSpec[], blocks:BlockSpec[], pigs:PigSpec[]}`; BlockSpec `{m,x,y,w,h}`, PigSpec `{x,y,r,hp}`, TerrainSpec `{x,y,w,h}`. `blocks`는 중첩 없는 평탄 배열(§5 표기 규칙) |
| storage.js | `AB.Storage.load` | `() → SaveData` | 실패·손상 시 기본값 `{unlocked:1, stars:[0×10], best:[0×10], muted:false}` |
| | `AB.Storage.save` | `(data) → void` | try/catch, 실패하면 조용히 무시 |
| | `AB.Storage.recordClear` | `(index, stars, score) → void` | `AB.state.save`를 제자리에서 고친다: 최댓값만 갱신, `unlocked = max(unlocked, min(10, index+2))`. 그 뒤 `save(AB.state.save)`. Storage는 사본을 따로 두지 않는다 |
| audio.js | `AB.Audio.unlock` | `() → void` | 첫 사용자 클릭에서 AudioContext 생성/resume. try/catch |
| | `AB.Audio.play` | `(name) → void` | name ∈ launch, hit, break, pig, clear, fail, click. ctx가 없거나 음소거면 아무것도 안 함 |
| | `AB.Audio.setMuted` / `isMuted` | `(bool) → void` / `() → bool` | setMuted는 `AB.state.save.muted`를 바꾼 뒤 `AB.Storage.save(AB.state.save)`. isMuted는 `AB.state.save`가 있으면 그 `.muted`, 없으면 false. 별도 사본 없음 |
| physics.js | `AB.Physics.available` | `() → bool` | `typeof window.Matter !== 'undefined'` |
| | `.createEngine` | `() → engine` | 위 create 옵션 |
| | `.addStatic` | `(engine, x, y, w, h, label) → body` | 지면·언덕 |
| | `.addBlock` | `(engine, spec) → body` | 재질 값은 `CONFIG.MATERIALS[spec.m]` |
| | `.addPig` | `(engine, spec) → body` | 원 |
| | `.addBird` | `(engine, type, x, y) → body` | 원, `frictionAir: 0` |
| | `.launch` | `(body, vx, vy) → void` | `Body.setVelocity` |
| | `.nudge` | `(body, dvx, dvy) → void` | `Sleeping.set(false)` 후 속도에 더함 |
| | `.remove` | `(engine, body) → void` | |
| | `.step` | `(engine) → void` | `Engine.update` 1회 |
| | `.onCollision` | `(engine, handler(bodyA, bodyB)) → void` | pairs마다 `.parent`로 호출 |
| | `.relSpeed` | `(a, b) → number` | 두 속도 차의 크기 |
| | `.predict` | `(x, y, vx, vy, steps) → {x,y}[]` | 한 스텝마다 `vy += G_STEP; x += vx; y += vy;`, 3스텝마다 점 1개, `y > GROUND_Y`이면 중단 |
| render.js | `AB.Render.init` | `(canvas) → void` | ctx, DPR 설정 |
| | `AB.Render.draw` | `(state) → void` | `state.engine === null`이어도 배경은 그림 |
| | `AB.Render.toWorld` | `(clientX, clientY) → {x,y}` | `Render.init`이 보관한 canvas의 `getBoundingClientRect()`를 호출마다 읽는다(보관하는 것은 canvas 참조뿐, rect는 보관하지 않음) |
| game.js | `AB.Game.setScreen` | `(name) → void` | `AB.state.screen`을 대입하는 **유일한** 곳. 대입 후 `AB.UI.show(name)` |
| | `.startGame` | `() → void` | `Audio.unlock()` 후 `loadStage(별 0인 첫 index, 없으면 0)` |
| | `.loadStage` | `(index) → void` | §4.7 "로드" |
| | `.restart` / `.goMenu` / `.nextStage` | `() → void` | `loadStage(stageIndex)` / 엔진 null + MENU / `loadStage(stageIndex+1)` |
| | `.pause` / `.resume` | `() → void` | PLAYING↔PAUSED. pause는 조준 중이면 취소 |
| | `.update` | `(dtMs) → void` | PLAYING일 때만 누적기로 `stepOnce` 실행 |
| | `.beginAim` / `.moveAim` / `.release` / `.useAbility` | `(wx,wy)→bool` / `(wx,wy)` / `()` / `()` | §4.7 입력(moveAim·release의 'aiming' 가드 포함) |
| ui.js | `AB.UI.init` | `() → void` | 모든 버튼 리스너 1회 바인딩, Esc/visibilitychange |
| | `AB.UI.show` | `(screen) → void` | 화면별 `hidden` 토글(§4.6 표). 요소는 호출할 때마다 id로 찾는다. 그래서 `init` 전(ERROR 경로)에도 동작한다 |
| | `AB.UI.updateHud` | `(state) → void` | 바뀐 값만 textContent 갱신 |
| | `AB.UI.showResult` | `(kind, info) → void` | info `{score, stars, isLast}`. kind 'CLEAR'면 `#clear-title`에 isLast ? "모든 스테이지 클리어!" : "스테이지 클리어!", `#clear-score`에 점수(천 단위 쉼표), `#clear-stars`에 별(isLast면 누적 "별 N / 30"도)을 쓰고, isLast면 `#btn-next`를 숨긴다(아니면 보인다). kind 'FAIL'이면 `#fail-title`에 "실패", `#fail-score`에 이번 점수(천 단위 쉼표), `#fail-stars`에 별 3칸을 모두 빈 별로(0 / 3) 쓴다. isLast는 읽지 않는다 |
| | `AB.UI.renderSelect` | `(save) → void` | 버튼 10개 생성 |
| input.js | `AB.Input.init` | `(canvas) → void` | canvas에 pointerdown/move/up/cancel 바인딩. beginAim이 true면 `canvas.setPointerCapture(e.pointerId)` |
| main.js | `AB.Main.boot` | `() → void` | §7 hop 1 |
| | `AB.Main.frame` | `(now) → void` | dt = min(now − lastTime, 100), `Game.update`, `Render.draw`, `UI.updateHud`, 다음 rAF 예약 |

`game.js` 내부 함수(비공개, 이름 고정): `nextBird`, `stepOnce`, `sweepDead`, `updateShot`, `checkResult`, `finishStage(kind)`, `onCollisionPair(a, b)`, `explode()`.

### 4.5 초기 상태와 상수 (그대로 복사, 숫자마다 태그: (a) 도출 / (b) 수명 제한 / (c) 임의)
```js
// js/config.js
window.AB = window.AB || {};
AB.CONFIG = {
  WORLD_W: 1280, WORLD_H: 720,           // (c) 16:9 논리 해상도
  GROUND_Y: 640,                         // (c) 지면 윗면 y
  STEP_MS: 1000 / 60,                    // (a) Matter 권장 delta 상한 16.667ms. 속도 단위를 px/step으로 고정
  MAX_STEPS_PER_FRAME: 5,                // (a) dt 상한 100ms ÷ 16.7 ≈ 6 → 복귀 직후 폭주 방지
  SETTLE_STEPS: 30,                      // (b) 로드 후 0.5초 무피해. T4에서 초기 피해가 보이면 60으로
  SLING: { x: 220, y: 520 },             // (c)
  GRAB_RADIUS: 45,                       // (a) 새 반지름 16~20 + 손가락 오차 25
  MAX_PULL: 110, MIN_PULL: 12,           // (c) MIN_PULL 미만에서 놓으면 발사 취소
  G_STEP: 0.001 * (1000 / 60) * (1000 / 60), // (a) Matter 기본 gravity.y=1, scale=0.001 → 0.2778 px/step²
  LAUNCH_K: 0.152,                       // (a) 최대 당김 45° 사거리 ≈1000px: √(1000×0.2778)=16.7 ÷ 110
  IMPACT_MIN: 1.5, DAMAGE_K: 10,         // (b) 피해=(상대속도−1.5)×10. T5·T10에서 교체
  MATERIALS: {                           // hp·density (b) T10. 최대 직격 피해 ≈(16.7−1.5)×10=152 → 나무·얼음 1타, 돌 1타 불가
    wood:  { hp: 60,  density: 0.0012, friction: 0.6, frictionStatic: 1.0, restitution: 0.05, points: 500, color: '#b5793f' },
    ice:   { hp: 30,  density: 0.0009, friction: 0.1, frictionStatic: 0.5, restitution: 0.1,  points: 300, color: '#9fd8f0' },
    stone: { hp: 200, density: 0.0028, friction: 0.8, frictionStatic: 1.0, restitution: 0.02, points: 800, color: '#8d8f94' }
  },
  PIG: { hp: 40, density: 0.001, points: 5000, color: '#6cc24a' }, // (a) 100px 낙하 블록 ≈ √(2×0.2778×100)=7.45 → 피해 59 > 40: 깔리면 죽음
  KING_PIG: { r: 28, hp: 120 },          // (c)
  BIRDS: {                               // (b) T10. 통과 없음 (a): 최고속 16.7×1.8=30 < 판 20 + 새 지름 32
    red:    { r: 18, density: 0.004, color: '#d93a2b' },
    yellow: { r: 16, density: 0.004, color: '#f2c230', dashMult: 1.8 },
    black:  { r: 20, density: 0.005, color: '#2b2b2b', blastR: 130, blastDmg: 160, blastPush: 14, fuseSteps: 90 }
  },
  BIRD_BONUS: 10000,                     // (c)
  STAR2_BLOCK_FRAC: 0.3,                 // (c) 수명: 첫 10스테이지 통주(T10) 뒤, 첫 시도 클리어의 80% 넘게 별 3이면 상향
  SHOT_END_SPEED: 0.2, SHOT_END_STEPS: 45, SHOT_MAX_STEPS: 480, // (c) 느림 0.75초 또는 8초에 샷 종료
  SETTLE_SPEED: 0.2, SETTLE_NEED_STEPS: 30, SETTLE_MAX_STEPS: 240, // (c) 마지막 샷 뒤 정지 판정, 최대 4초
  CLEAR_DELAY_STEPS: 90, FAIL_DELAY_STEPS: 30, // (c) 1.5초 / 0.5초
  OUT: { minX: -300, maxX: 1580, maxY: 1000 }, // (c) 이 밖의 몸체는 제거(돼지는 사망 처리)
  SAVE_KEY: 'angrybirds.save.v1'
};
```
```js
// js/game.js 최상단(IIFE 안). 필드를 추가해도 되지만 이름을 바꾸지 않는다
AB.state = {
  screen: 'MENU',        // 'MENU'|'SELECT'|'PLAYING'|'PAUSED'|'CLEAR'|'FAIL'|'ERROR'
  stageIndex: 0,         // 0..9
  engine: null,          // loadStage가 매번 새로 생성, goMenu가 null
  terrain: [], blocks: [], pigs: [],   // 엔티티: {kind, body, hp, maxHp, points, material?, dead:false}
  birdQueue: [],         // 새총에 올라가지 않은 남은 새 타입
  shot: { phase: 'none', type: null, body: null, pull: { x: 0, y: 0 },
          steps: 0, slowSteps: 0, abilityUsed: false, firstHitStep: -1, trail: [] },
  awaitingSettle: false, settleSteps: 0, waitSteps: 0,
  score: 0, stepCount: 0, potential: { pigPts: 0, blockPts: 0 },
  pendingResult: null,   // null|'CLEAR'|'FAIL'
  resultDelay: -1,
  particles: [], popups: [],
  accumulator: 0, lastTime: 0,
  save: null             // boot에서 AB.Storage.load()
};
```
엔티티와 몸체 연결: 엔티티를 만들면 `body.ab = entity`를 대입한다. 충돌 핸들러는 `bodyA.ab`/`bodyB.ab`만 읽는다. 지면 엔티티는 `{kind:'terrain'}`, 새는 `{kind:'bird'}`이다.

### 4.6 상태 머신
| 상태 | 보이는 DOM | 들어오는 경로 | 나가는 경로 |
|---|---|---|---|
| MENU | `#screen-menu` | boot, goMenu | btn-start → PLAYING, btn-select → SELECT |
| SELECT | `#screen-select` | btn-select | 해금 버튼 → PLAYING, btn-select-back → MENU |
| PLAYING | `#hud`(`#btn-pause` 포함) | loadStage, resume | pause → PAUSED, 결과 카운트다운 0 → CLEAR/FAIL |
| PAUSED | `#hud`, `#overlay-pause` | btn-pause, Esc, 탭 숨김(L27) | btn-resume/Esc → PLAYING, btn-restart → PLAYING(재로드), btn-pause-main → MENU |
| CLEAR | `#screen-clear` | finishStage('CLEAR') | btn-next(마지막 스테이지면 숨김), btn-clear-retry, btn-clear-main |
| FAIL | `#screen-fail` | finishStage('FAIL') | btn-fail-retry, btn-fail-main |
| ERROR | `#screen-error` | boot에서 Physics 불가 | 없음(새로고침) |

불변 규칙:
- rAF 루프는 boot에서 한 번 시작되어 끝까지 돈다. 물리 스텝은 `screen === 'PLAYING'`일 때만 진행한다.
- 게임 로직의 지연은 모두 스텝 카운터로만 센다. `setTimeout`/`setInterval`은 쓰지 않는다. 그래서 일시정지는 지연까지 함께 멈추고, 재로드는 남은 지연을 모두 지운다.

### 4.7 게임 규칙 (함수 본문은 구현자 몫, 순서와 조건은 고정)
**로드 `loadStage(i)`:**
1. `engine = AB.Physics.createEngine()`
2. 지면 `addStatic(engine, 640, GROUND_Y+40, 1600, 80, 'ground')`, `terrain`/`blocks`/`pigs`를 `AB.STAGES[i]`에서 생성. 몸체를 만들 때마다 엔티티를 만들어 `body.ab = entity`를 대입한다(§4.5).
3. `AB.Physics.onCollision(engine, onCollisionPair)`
4. stageIndex = i. score·stepCount·accumulator 0, pendingResult null, resultDelay −1, awaitingSettle false, particles·popups·trail 비움, `birdQueue = STAGES[i].birds.slice()`, potential 계산
5. `nextBird()`: 큐에서 하나를 꺼내 `shot = {phase:'ready', type, body:null, ...}`
6. `setScreen('PLAYING')`

**입력:**
- pointerdown(PLAYING일 때만): `shot.phase==='flying'`이면 `useAbility()`, 아니면 `beginAim(w)`를 호출한다. `beginAim`은 phase가 'ready'이고 SLING까지의 거리가 GRAB_RADIUS 이하일 때 'aiming'으로 바꾸고 `pull`을 {0,0}으로 초기화한 뒤 true를 돌려준다(아니면 false). beginAim이 true를 돌려주면 input.js가 `canvas.setPointerCapture(e.pointerId)`를 부른다.
- **가드:** `moveAim`과 `release()`는 첫 줄에서 `AB.state.screen==='PLAYING'` 그리고 `shot.phase==='aiming'`인지 보고, 아니면 아무것도 하지 않고 반환한다. 비행 중 탭(useAbility) 뒤의 pointerup, 조준 중 일시정지로 phase가 'ready'가 된 뒤의 pointerup, 버튼을 누르지 않은 마우스 이동이 여기서 걸러진다. 이 가드가 없으면 직전 샷의 pull로 새가 한 번 더 발사된다.
- move: `pull = w − SLING`을 MAX_PULL 길이로 자르고, 새 위치 y는 `GROUND_Y − r − 2` 이하로 제한한다.
- up/cancel: `release()`를 호출한다. |pull| < MIN_PULL이면 'ready'로 돌아간다. 그렇지 않으면 `body = addBird(engine, type, SLING.x+pull.x, SLING.y+pull.y)` 직후 `body.ab = {kind:'bird'}`와 `shot.body = body`를 대입하고, `launch(body, −pull.x×LAUNCH_K, −pull.y×LAUNCH_K)`, phase를 'flying'으로 바꾸고, trail을 비우고, `Audio.play('launch')`를 호출한다.
- 발사할 때 새총 위의 새를 몸체로 처음 만든다. 대기 중인 새는 그리기만 하는 대상이라 물리 세계에 없다.

**스텝 `stepOnce()` 순서:**
1. `Physics.step`
2. `sweepDead()`: hp ≤ 0 또는 OUT 밖인 엔티티 가운데 `dead`가 아닌 것을 `dead = true`로 표시하고 remove·점수·파편·팝업·효과음 처리한 뒤, 그 엔티티를 `blocks`/`pigs` 배열에서 뺀다(배열 뒤에서부터 순회하며 `splice`). 그래서 `pigs.length`가 곧 남은 돼지 수다. 충돌 핸들러 안에서는 몸체를 제거하지 않는다.
3. `updateShot()`(4스텝마다 trail에 새 위치 기록)
4. `checkResult()`
5. 이펙트 갱신
6. `stepCount++`

**피해:** `onCollisionPair(a, b)`는 `stepCount < SETTLE_STEPS`이면 무시한다. `a.ab`나 `b.ab`가 없는 쌍도 예외를 내지 않고 무시한다. 그 외에는 `d = max(0, relSpeed(a,b) − IMPACT_MIN) × DAMAGE_K`를 양쪽 중 kind가 block/pig인 엔티티의 hp에서 뺀다. 새 속도가 0.5 이상인 새의 첫 충돌이면 `firstHitStep`을 기록한다. `hit` 효과음은 4스텝에 최대 1회만 낸다.

**샷 종료** (phase 'flying'에서 다음 중 하나가 참이면):
- body가 null(폭발로 제거됨)
- 새가 OUT 밖
- speed < SHOT_END_SPEED인 상태가 SHOT_END_STEPS 동안 연속
- steps ≥ SHOT_MAX_STEPS

종료되면 새 몸체를 제거하고 큐가 남았으면 `nextBird()`, 없으면 `phase='none'; awaitingSettle=true`로 둔다.

**능력 `useAbility()`:**
- 노란 새: 속도에 dashMult를 곱한다.
- 검은 새: 탭하거나 firstHitStep 뒤 fuseSteps가 지나면 `explode()`를 호출한다. blastR 안의 block/pig마다 `f = 1 − 거리/blastR`로 hp를 blastDmg×f만큼 깎고, `nudge(body, ux×blastPush×f, uy×blastPush×f)`((ux,uy) = 폭심에서 그 몸체로 향하는 단위벡터)로 바깥 방향으로 민 뒤 새를 제거하고 `shot.body = null`로 둔다.
- 능력은 샷당 1회만 쓴다.

**판정 `checkResult()`:**
- (1) `pigs.length === 0`이고 pendingResult가 'CLEAR'가 아니면 → pendingResult='CLEAR', resultDelay=CLEAR_DELAY_STEPS. 'FAIL' 대기 중이어도 CLEAR로 덮어쓴다.
- (2) awaitingSettle 동안 매 스텝 waitSteps++를 한다. 모든 block/pig가 `isSleeping`이거나 speed < SETTLE_SPEED면 settleSteps++, 아니면 0으로 되돌린다. settleSteps ≥ SETTLE_NEED_STEPS 또는 waitSteps ≥ SETTLE_MAX_STEPS이고 돼지가 남아 있으며(`pigs.length > 0`) pendingResult가 null이면 → 'FAIL', FAIL_DELAY_STEPS.
- (3) resultDelay > 0이면 1 감소시키고, 1에서 0이 되는 스텝에 `finishStage(pendingResult)`를 호출한다.

**점수·별:**
- 파괴 시 재질 points, 돼지 5,000(KING_PIG도 동일)
- CLEAR 시 `(birdQueue.length + (phase==='ready' ? 1 : 0)) × BIRD_BONUS`를 더한다
- 별 3개 기준: 1개 = 클리어, 2개 = score ≥ pigPts + STAR2_BLOCK_FRAC×blockPts, 3개 = 그 값 + BIRD_BONUS 이상
- `finishStage('CLEAR')`는 보너스를 더하고 별을 계산한 뒤 `Storage.recordClear(stageIndex, stars, score)`를 호출하고, 이어서 `setScreen('CLEAR')`와 `UI.showResult('CLEAR', {score, stars, isLast})`를 호출한다. `isLast`는 `stageIndex === 9`이다.
- `finishStage('FAIL')`는 보너스를 더하지 않고 stars를 0으로 둔다(score는 그때까지 파괴로 쌓인 값 그대로). `Storage`는 호출하지 않는다(해금과 최고 별·점수는 클리어로만 바뀐다, L4). 이어서 `setScreen('FAIL')`와 `UI.showResult('FAIL', {score, stars: 0, isLast: false})`를 호출한다.

### 4.8 렌더·연출·오디오·저장 규칙
- **캔버스 크기:** 백킹 크기 = 1280×720 × `min(devicePixelRatio, 2)`. 매 프레임 시작 시 `setTransform(k,0,0,k,0,0)`을 한 뒤 논리 좌표로 그린다. `toWorld`는 `(clientX − rect.left) × 1280 / rect.width`로 계산한다.
- **그리는 순서:** 하늘 → 구름 → 언덕 → 지면 → 새총 뒤 가지·뒤 고무줄 → 조준 중인 새 → 앞 고무줄 → 블록(`vertices` 다각형, 재질 색 채움 + 어두운 테두리, hp < 50%면 금 선 2개와 어둡게 겹침) → 돼지(원, 눈·코, hp < 50%면 멍, 왕 돼지는 왕관) → 비행 중인 새(원, 눈·눈썹, angle 반영) → 대기 새 줄 → 예측 점선 / 흔적 점 → 파편 → 팝업.
- **파편·팝업:** 파편은 `{x,y,vx,vy,life,color,size}`이고 stepOnce에서 갱신하므로 일시정지 중에는 함께 멈춘다. 수명은 48스텝(0.8초, (c))이다.
- **오디오:** 모든 함수를 try/catch로 감싼다. 합성은 OscillatorNode나 노이즈 버퍼에 GainNode 엔벌로프를 걸어 만든다. `AB.Audio.play`는 절대 예외를 던지지 않는다. 음소거는 `save.muted`로 저장한다.
- **저장:** `localStorage.getItem/setItem`을 try/catch로 감싸고, 실패하면 메모리 객체만 쓴다.
- **UI 이벤트:** `visibilitychange`에서 `document.hidden`이고 PLAYING이면 `pause()`를 호출한다. `keydown`에서 Escape는 PLAYING일 때 pause, PAUSED일 때 resume이다. 모든 버튼 클릭은 `Audio.play('click')`을 호출한다.

---

## 5. 콘텐츠: 10개 스테이지 (저작 데이터, `stages.js`에 이 표 그대로)
표기: `F(m,cx,bottom[,span,postH])` = `AB.StageKit.frame`, `K(m,cx,bottom,w,h)` = `block`, `P(cx,bottom[,r,hp])` = `pig`, `H(cx,bottom,w,h)` = `hill`. 표준 프레임의 윗면은 bottom+120이다. 표의 "구조물" 칸을 코드로 옮길 때 `blocks`는 `[].concat(F(...), K(...), …)`로 펴서 BlockSpec만 담은 평탄 배열로 만들고, `H(...)`는 `terrain` 배열에만 넣는다. F는 BlockSpec 3개짜리 배열, K는 객체 1개를 돌려주므로, 펴지 않으면 `addBlock`이 배열을 받아 `CONFIG.MATERIALS[undefined]`를 읽고 스테이지 로드가 멈춘다.

난이도 규칙:
- 여유 새(새 수 − 돼지 수)는 스테이지 1만 2이고, 2~10은 모두 1이다.
- 난이도를 올리는 요소는 재질 경도(나무 → 얼음 → 돌), 높이, 돼지 수(1 → 4), 필요한 능력이다.

| # | 이름 | 새 | 구조물 | 돼지 | 새로 배우는 것 |
|---|---|---|---|---|---|
| 1 | 첫 발사 | red, red, red | F(wood,950,0) | P(950,0) | 당겨 쏘기 |
| 2 | 두 채의 오두막 | red×3 | F(wood,850,0), F(wood,1080,0) | P(850,0), P(1080,0) | 목표 두 개 |
| 3 | 2층 탑 | red×3 | F(wood,980,0), F(wood,980,120) | P(980,0), P(980,240) | 낙하 피해 |
| 4 | 얼음 방패 | red, yellow, red | K(ice,800,0,40,40), K(ice,800,40,40,40), K(ice,800,80,40,40), F(wood,1000,0), F(ice,1000,120) | P(1000,0), P(1000,240) | 얼음, 노란 새 |
| 5 | 언덕 위 오두막 | yellow, yellow, red | H(1020,0,320,140), F(wood,960,140), F(ice,1110,140) | P(960,140), P(1110,140) | 높이 쏘기 |
| 6 | 돌 요새 | black, red, black, red | F(stone,1000,0,160,100), F(wood,1000,120,160,80), F(wood,1180,0) | P(1000,0), P(1000,220), P(1180,0) | 돌, 검은 새 |
| 7 | 계단 피라미드 | red, yellow, black, red | 1단 stone K×6 (cx 900,940,…,1100; bottom 0; 40×40), 2단 wood K×4 (cx 940~1060; bottom 40), 3단 ice K×2 (cx 980,1020; bottom 80) | P(900,40), P(1100,40), P(1000,120) | 단 위의 목표 |
| 8 | 3층 탑 | yellow, black, red, red | F(stone,1000,0), F(wood,1000,120), F(ice,1000,240), K(ice,1000,360,40,40) | P(1000,0), P(1000,120), P(1000,240) | 층별 재질 |
| 9 | 쌍둥이 요새 | black, yellow, red, black, red | F(stone,860,0), F(wood,860,120), F(stone,1120,0), F(wood,1120,120) | P(860,0), P(860,240), P(1120,0), P(1120,240) | 새 배분 |
| 10 | 왕 돼지의 성 | red, yellow, black, black, yellow | H(1050,0,360,80), F(stone,960,80,160,100), F(stone,1140,80,160,100), K(wood,1050,200,340,20), F(wood,1050,220,160,100), F(ice,1050,340,120,60) | P(960,80), P(1140,80), P(1050,220), P(1050,420,28,120) | 종합 |

저작 규칙:
- 모든 블록의 bottom은 0, 또는 그 아래 받침(블록 윗면·언덕 높이)과 정확히 같다(틈 0, 겹침 0).
- 이웃한 두 구조물의 가장자리는 서로 10px 이상 떨어뜨린다. 표의 값은 이 규칙으로 계산해 둔 것이다.
- 돼지 cx는 받침 면의 x 범위 안에 있다.
- 표의 좌표·재질·새 구성은 수명 제한 값 (b)이다. T10(사람이 처음 10스테이지를 통주)에서 3회 안에 깰 수 없는 스테이지가 나오면 그 스테이지의 새 목록 끝에 red 하나를 추가한다.

---

## 6. 단계 (의존 순서. 번호는 참조용이고 병렬 표시를 따른다)
| 단계 | 선행 | 내용 | 확인(읽어서) | 목적 |
|---|---|---|---|---|
| S0 골격 | 없음 | index.html(§4.3 블록·id), style.css(`#hud` 포인터 투과·`.hidden{display:none !important;}` 포함), config.js, main.js(boot·frame), ERROR 경로 | C1, C6 | L28, hop 1 |
| S1 **얇은 관통 슬라이스** | S0 | physics.js 전체, stages.js(StageKit + 스테이지 1만), game.js의 로드·입력·스텝·피해·sweepDead·CLEAR, render.js 기본 도형, input.js, ui.js의 MENU/PLAYING/CLEAR | §7 cold-start 표의 모든 행을 코드 줄로 짚을 수 있음 | hop 1~5, L6, L7, L9, L11, L13 |
| S2 상태 머신 완성 | S1 (S3과 병렬) | pause/resume/restart/goMenu, 오버레이, Esc, visibilitychange, FAIL과 정지 판정 | C7, §4.6 표의 모든 전이가 ui.js 리스너 또는 game.js 호출로 존재 | L14, L22~L27 |
| S3 메커닉 확장 | S1 (S2와 병렬) | 재질 3종, 손상 표시, 새 3종·능력, 점수·별, 예측 점선·흔적 | 모든 CONFIG 키가 참조처 1곳 이상 | L8, L10, L12, L15, L16 |
| S4 콘텐츠 | S3 | 스테이지 2~10 저작 | C5 | L1, R1 |
| S5 진행 | S2 + S3 | storage.js, 선택 화면, 해금, 완주 화면, 메뉴 별 합계 | C9 | L2~L5 |
| S6 **연출 마감(생략 불가)** | S1 (S4·S5와 병렬 가능) | audio.js 합성음 7종 + 음소거, 파편, 팝업, 구름·언덕·고무줄, 버튼 호버, HUD 스타일, DPR·리사이즈 | §1.3 문장마다 대응 코드 위치 | L17, L18, L29, L30 |
| S7 자가 점검 | 전부 | §10 C1~C12 차례로 읽기 | 전부 참 | §10 |

S1은 스테이지 1 하나로 메뉴부터 클리어 화면까지 끊김 없이 이어지는 경로다. 이 경로 전체가 파일에 쓰이기 전에는 S3~S6의 다듬기를 시작하지 않는다.

---

## 7. Load-bearing path — "게임 시작"에서 스테이지 1 클리어 화면까지
후보 경로를 그대로 채택하고 5홉으로 압축했다. 이 경로가 끊기면 10개 스테이지·일시정지·점수가 모두 장식이 된다.

| hop | 이름 | 통과 조건 | 그 조건이 처음 참이 되는 곳 |
|---|---|---|---|
| 1 | `#btn-start` click → `AB.Game.startGame()` → `loadStage(0)` | `AB.Physics.available()` 참 **그리고** `AB.UI.init()`이 리스너를 바인딩함 **그리고** `#screen-menu`가 보임 **그리고** `state.save !== null` **그리고** `Audio.unlock()`이 예외 없이 반환 | Matter `<script>` 실행 시(첫 줄 또는 폴백 줄) / 인라인 `AB.Main.boot()`: available 확인(거짓이면 `setScreen('ERROR')`, `#error-text`에 L28 문장, return) → `state.save = Storage.load()` → `Render.init` → `UI.init` → `Input.init` → `setScreen('MENU')` → `requestAnimationFrame(AB.Main.frame)`. unlock의 무예외는 audio.js 공개 함수 본문 전체를 감싼 try(§4.8, C9) |
| 2 | `loadStage(0)`: 엔진 생성·몸체 생성·충돌 핸들러 등록·`nextBird()`·`setScreen('PLAYING')` | `AB.STAGES[0]`에 pigs ≥ 1, birds ≥ 1 | stages.js 로드 시(리터럴) |
| 3 | pointerdown → `beginAim` → pointermove → `moveAim` → pointerup → `release()` → `addBird` + `launch`, phase 'flying' | `Input.init`이 canvas에 pointerdown/move/up/cancel을 바인딩함 그리고 `#hud` 밖의 모든 화면 요소가 hidden 그리고 `screen==='PLAYING'` 그리고 pointerdown 시점에 `shot.phase==='ready'` 그리고 `toWorld` 좌표가 SLING에서 45px 이내 그리고 캔버스 위에 보이는 `#hud`가 포인터를 통과시킴 그리고 release 시점에 `shot.phase==='aiming'` 그리고 `|pull| ≥ MIN_PULL` | 리스너는 boot의 `Input.init`(hop 1 체인). 화면 숨김은 hop 2의 `setScreen('PLAYING')` → `UI.show`(`.hidden{display:none !important;}`). phase 'ready'는 hop 2의 `nextBird()`, 'aiming'은 `beginAim`, pull은 `moveAim`(beginAim이 {0,0}으로 초기화). screen은 `setScreen`에서. toWorld는 boot의 `Render.init`이 보관한 canvas 참조로 호출마다 rect를 읽음. 포인터 통과는 style.css의 `#hud{pointer-events:none}`(S0) |
| 4 | `AB.Main.frame` → `Game.update` → `stepOnce` → `Physics.step` → collisionStart → `onCollisionPair`가 돼지 hp 차감 → `sweepDead`가 `pigs`에서 제거 | `screen==='PLAYING'` 그리고 `engine !== null` 그리고 핸들러가 **현재** 엔진에 등록됨 그리고 `stepCount ≥ 30` 그리고 relSpeed > 1.5 그리고 두 몸체에 `.ab`가 있음 그리고 돼지 hp ≤ 0(누적 피해 ≥ 40, 한 번에 맞으면 relSpeed ≥ 5.5) 또는 돼지가 OUT 밖 | rAF는 hop 1 boot, engine·핸들러는 hop 2, stepCount는 PLAYING 0.5초 뒤(새가 구조물에 닿기까지 1초 넘게 걸림), relSpeed는 hop 3의 launch, `.ab`는 loadStage 2단계(지면·언덕·블록·돼지)와 release의 addBird 직후(새), hp 차감은 onCollisionPair·explode(stepCount ≥ 30 이후) |
| 5 | `checkResult`: pigs 0 → pendingResult 'CLEAR', resultDelay 90 → 0 → `finishStage` → `setScreen('CLEAR')` + `UI.showResult('CLEAR', …)` → `#screen-clear`에 "스테이지 클리어!" | `pigs.length === 0` 그리고 `pendingResult !== 'CLEAR'` 그리고 그 스텝부터 `screen==='PLAYING'`인 스텝 90회(CLEAR_DELAY_STEPS, 일시정지 중에는 세지 않음) | pigs 0: hop 4의 sweepDead가 마지막 돼지를 `pigs`에서 splice한 같은 스텝. pendingResult null: loadStage 4단계. screen: hop 2의 `setScreen('PLAYING')`, 일시정지 뒤에는 `resume` |

**Cold-start 표**
| 상태/조건 | 첫 진입 값 | 누가 바꾸나 | 언제 |
|---|---|---|---|
| `window.Matter` | undefined | CDN 스크립트 | 첫 번째(실패 시 두 번째) script 실행 |
| `AB.STAGES` | 정의됨(10개) | 아무도(읽기 전용, loadStage는 복사해서 사용) | stages.js 로드 |
| 버튼 리스너 | 없음 | `AB.UI.init` | boot, 1회 |
| 캔버스 pointer 리스너 | 없음 | `AB.Input.init` | boot, 1회 |
| Render의 canvas 참조 | 없음 | `AB.Render.init` | boot, 1회(이후 toWorld가 호출마다 이 canvas의 rect를 읽음) |
| 화면 DOM 가시성 | 모두 `hidden`(`display:none !important`) | `AB.UI.show`(setScreen이 호출) | boot의 `setScreen('MENU'/'ERROR')`, 이후 전이마다 |
| `#hud` 포인터 투과 | style.css에 정적으로 정의 | 아무도 | style.css 로드 |
| `state.screen` | 'MENU' | `AB.Game.setScreen`만 | boot, loadStage, pause/resume, finishStage, goMenu |
| `state.engine` | null | loadStage(생성), goMenu(null) | 버튼 클릭 |
| 충돌 핸들러 | 없음 | loadStage → `Physics.onCollision` | 엔진을 생성할 때마다 |
| 몸체의 `.ab` | 없음 | loadStage 2단계(지면·언덕·블록·돼지), release(새, addBird 직후) | 로드 / 발사 |
| `shot.phase` | 'none' | nextBird('ready'), beginAim('aiming'), release('flying'/'ready'), 샷 종료('none' 또는 nextBird), pause(aiming → 'ready') | 로드·입력·스텝 |
| `shot.pull` | {x:0, y:0} | beginAim({0,0}으로 초기화), moveAim(갱신, 'aiming'일 때만) | pointerdown / pointermove |
| `state.stepCount` | 0 | loadStage(0으로), stepOnce(+1) | 로드 / 매 스텝 |
| 충돌 상대속도 `relSpeed(a,b)` | 0(새 몸체 없음, 구조물 정지·수면) | release의 `launch`, 중력 낙하 | hop 3 발사 이후 매 스텝 |
| 돼지 엔티티 `hp` | PigSpec.hp(기본 `PIG.hp` 40, 왕 돼지 120) | onCollisionPair·explode(차감) | `stepCount ≥ 30` 이후 충돌이 난 스텝, 폭발 시 |
| `state.pigs` | [] | loadStage(채움), sweepDead(splice로 제거) | 로드 / 매 스텝 |
| `pendingResult` / `resultDelay` | null / −1 | loadStage(초기화), checkResult(설정·감소) | 로드 / 매 스텝 |
| rAF 루프 | 정지 | boot 1회 + frame 끝 1회 | 페이지 로드 / 매 프레임 |
| `lastTime` / `accumulator` | 0 / 0 | frame(dt를 100으로 자름), loadStage(acc 0) | frame이 호출될 때마다(lastTime = now) / loadStage(accumulator = 0) |
| AudioContext | null | `Audio.unlock`(startGame 안) | 첫 클릭. 실패해도 null로 남고 예외는 없음 |
| `state.save` | null | boot → `Storage.load()` | 페이지 로드. startGame이 시작 index 계산에 사용 |

---

## 8. 대안과 기각 (모두 부활 트리거 포함)
- **물리 자체 구현**: §4.2 동점 규칙에서 짐(6점 이상 시나리오 2 대 1). 트리거: 오프라인 플레이가 확정되면 다시 연다(§4.2 ①).
- **Matter.Render / Matter.Runner**: 자체 rAF와 겹쳐 루프가 둘이 될 위험이 있고 외형 통제가 어렵다. 트리거: T3에서 자체 렌더러가 그린 블록과 실제 충돌 위치가 눈에 띄게 어긋나면(10px 초과) 디버그용으로 Render를 쓴다.
- **Phaser 3 등 게임 프레임워크**: 씬 생명주기 API가 넓어 기억에 의존하게 된다. 트리거: 실행 가능한 개발 환경이 생기고 스프라이트 에셋 파이프라인이 필요해질 때.
- **ES 모듈 / JSON fetch**: file://에서 CORS로 막힌다(가정 A1). 트리거: http(s) 서빙이 확정될 때.
- **matter.min.js 파일 동봉**: 구현자가 파일을 내려받을 수 없고, 기억으로 쓰면 환각이 생긴다(§4.2 분할, 9점). 트리거: 사람이 `lib/matter.min.js`를 넣어 줄 수 있으면 첫 번째 script src를 그 경로로 바꾼다.
- **DOM/SVG로 몸체 렌더**: 회전하는 요소 60개 이상을 매 프레임 transform해야 한다. 트리거: 접근성 요구로 몸체를 DOM으로 노출해야 할 때.
- **빌드 체인(npm·번들러·TS)**: 요구사항 단계에서 이미 기각됨(설치·빌드 불가). 트리거: 구현 환경에서 명령 실행이 가능해질 때.

## 9. 위험과 완화
| 위험 | 증상 | 완화(이 문서의 결정) |
|---|---|---|
| rAF 루프 중복 | 다시하기를 누를 때마다 게임이 빨라짐 | 루프는 boot 1회만 시작(C4), loadStage는 루프를 건드리지 않음 |
| 이전 판의 지연이 새 판에서 실행됨 | 재시작 직후 클리어 화면 | setTimeout 금지, 스텝 카운터를 loadStage에서 초기화 |
| 이전 엔진의 핸들러 | 유령 충돌 피해 | 엔진을 매번 새로 만듦. 이전 엔진은 update되지 않으므로 이벤트가 나지 않음 |
| 충돌 이벤트 안에서 제거 | Matter 내부 순회 오류, 점수 중복 | 핸들러는 hp만 깎고, 제거는 sweepDead가 하며 `dead` 플래그로 중복을 막음 |
| HUD가 캔버스 입력을 가로챔 | 새를 잡을 수 없음(hop 3 단절) | `#hud{pointer-events:none}`, 버튼만 auto(C6) |
| 초기 적층 접촉 피해 | 로드하자마자 돼지가 죽음 | SETTLE_STEPS, 정확한 bottom 저작 규칙(§5) |
| 적층 떨림 | 발사 전에 탑이 무너짐 | iterations 10/8, enableSleeping, frictionStatic 1.0, T4와 §4.2 트리거 ③ |
| 터널링 | 새가 판을 통과 | 최고속 30px/step < 52px(§4.5 도출) |
| 새가 지면 속에서 생성 | 발사 순간 튕김 | 조준 y 상한 `GROUND_Y − r − 2` |
| 새가 구조물 위에 멈춤 | 다음 새가 영영 안 나옴 | SHOT_END_STEPS / SHOT_MAX_STEPS |
| file:// localStorage·오디오 예외 | 시작 버튼이 멈춤 | try/catch 격리(L29, C9) |
| Matter API 착오 | TypeError로 빈 화면 | 별칭 줄 복사, 허용 API 목록, physics.js 밖 사용 금지(C3) |
| 탭 복귀 시 폭주 | 구조물이 흩어짐 | dt 상한 100ms, 스텝 상한 5, 자동 일시정지(L27) |
| 좌표 어긋남 | 새를 잡을 수 없음 | toWorld가 매 이벤트 rect로 계산, DPR은 렌더에만 적용 |

---

## 10. 완료 정의
**(C) 구현자 자가 점검 — 자기 파일을 읽어 수행한다. 전부 참이어야 완료다.**
- C1 `index.html`의 `<script>` 13줄이 §4.3 블록과 글자 단위로 같고, 모든 로컬 src 파일이 존재한다.
- C2 §4.4 기호표의 공개 심볼이 각각 소유 파일에서 정확히 1회 정의된다. 다른 파일이 호출하는 `AB.*` 이름은 모두 기호표에 있다. 각 정의의 매개변수 목록이 기호표와 같고, 모든 호출처의 인자 수도 같다. config.js의 `AB.CONFIG`와 game.js의 `AB.state`는 §4.5 블록의 키·초기값을 모두 그대로 갖는다(`AB.state`는 필드 추가만 허용).
- C3 `Matter`, `Engine`, `Bodies`, `Body`, `Composite`, `Events`, `Sleeping` 식별자가 `js/` 안의 physics.js 이외 파일에서 0회 등장한다(문자열 리터럴·주석은 제외. 예: main.js의 L28 오류 문장). index.html의 §4.3 폴백 줄은 예외다. physics.js 안의 Matter 호출은 모두 허용 API 목록에 있다.
- C4 `requestAnimationFrame`은 코드 전체에 정확히 2회(boot 1, frame 1) 나오고, `setTimeout`/`setInterval`은 0회다.
- C5 `AB.STAGES.length === 10`이다. 각 항목의 pigs는 1개 이상, birds 수는 pigs 수 + 1(스테이지 1만 + 2)이다. 모든 블록 bottom이 §5 표·규칙과 일치한다(표를 한 행씩 대조). 각 항목의 `blocks` 원소는 모두 `m` 키를 가진 객체이고(배열 중첩 0), H는 `terrain`에만 있다.
- C6 `ui.js`와 `main.js`의 모든 `getElementById` 인자가 `index.html` id와 1:1로 대응한다. `#btn-pause`의 CSS에 `right:`가 있고 `left:`는 없다. `#hud`의 CSS에 `pointer-events:none`이, `#btn-pause`에 `pointer-events:auto`가 있다. `.hidden` 규칙이 `display:none !important`다.
- C7 `AB.state.screen =` 대입이 `game.js`의 `setScreen` 안에 1회만 있다.
- C8 §7 cold-start 표의 "누가 바꾸나" 함수가 모두 존재하고 해당 대입문(sweepDead는 `pigs`/`blocks`의 `splice`)을 포함한다.
- C9 모든 `localStorage.*`와 `new (window.AudioContext || window.webkitAudioContext)` 호출이 try 블록 안에 있다. audio.js와 storage.js의 모든 공개 함수는 본문 전체가 try 블록 안에 있다.
- C10 §1.4의 27개 문장마다 그 결과를 만드는 함수 이름을 하나씩 댈 수 있다. 댈 수 없는 문장이 0개여야 한다.
- C11 js 10개 파일 각각의 첫 줄이 `window.AB = window.AB || {};`이고, config.js를 뺀 9개는 나머지 본문이 `'use strict'` IIFE 안에 있다(config.js는 §4.5 블록 그대로). 파일 최상위 실행 코드에서 다른 파일의 `AB.*` 함수 호출은 0개다(index.html의 인라인 `AB.Main.boot()` 제외). render.js의 블록 그리기는 `body.vertices`만 읽는다.
- C12 js 파일 전체에서 `??`와 `?.` 연산자가 0회다(문자열·주석 제외).

**(T) 사람 수용 테스트 — 최신 Chrome에서 `index.html`을 더블클릭해 연다. 측정자는 사람, 도구는 눈·DevTools·스톱워치다.**
- T1 메인에서 스테이지 1 클리어까지 플레이한 뒤 DevTools Console의 빨간 오류가 0개다.
- T2 "게임 시작"을 클릭하고 1초 안에 스테이지 1 구조물과 새총 위 새가 보인다. 1초는 (a) 도출값이다: 로드는 동기 코드 수십 개 몸체라 체감 즉시이고, 1초를 넘으면 로드가 아닌 곳에서 막혔다는 뜻이다.
- T3 새를 끝까지 당겨 약 45°로 놓으면, 조준 중 점선이 보이고 새가 포물선을 그리며 x 1000px 부근(화면 오른쪽 1/4)에 닿는다. (a) LAUNCH_K 도출과 같은 값이다.
- T4 10개 스테이지 각각을 로드하고 5초 동안 쏘지 않았을 때 돼지 수 변화가 0이고 파괴된 블록이 0이다. 무피해 구간은 0.5초뿐이라 이 테스트는 가드가 대신 통과시켜 주지 않는다. 5초는 (c) 임의값이며, Matter가 잠들기까지 약 1초 걸리는 것의 5배로 잡았다.
- T5 스테이지 1을 새 3마리 안에 깰 수 있고, 마지막 돼지가 사라지고 2초 안에 "스테이지 클리어!"가 뜬다(1.5초 지연 + 여유).
- T6 비행 중 우측 "II"를 누르면 3초 동안 새·블록의 위치 변화가 없다. "계속하기"를 누르면 그대로 이어진다. "다시하기"를 누르면 초기 배치·점수 0·새 전량으로 돌아간다. "메인으로"를 누르면 메인이 뜨고, 다시 "게임 시작"을 누르면 T2가 성립한다.
- T7 "다시하기"를 10회 반복한 뒤 T3 샷의 착지 x가 첫 회와 ±50px 안이다(루프가 중복되지 않았다는 증거). ±50px는 (c) 임의값이다.
- T8 스테이지 1·2를 깬 뒤 새로고침하면 선택 화면에서 3까지 해금되고 별이 유지된다.
- T9 네트워크를 끊고(DevTools Network → Offline) 새로고침하면 한국어 오류 문장이 보인다. 빈 흰 화면이 아니다.
- T10 처음 보는 사람이 10개 스테이지를 각각 3회 안에 클리어한다. 3회는 (b) 수명 제한값이며, 실패한 스테이지는 §5 규칙대로 새를 추가한다.

## 11. 구현자 계약
- 스택: 빌드 없음 + Canvas 2D + Matter.js **0.19.0**. URL은 §4.3 블록의 두 줄을 복사한다(기억으로 쓰지 않는다). 사용 API는 §4.4 목록만.
- Matter를 버리고 물리를 직접 짜지 않는다(§4.2에서 짐). **오프라인 플레이가 확정되면 다시 연다.** 그때는 `physics.js`만 같은 시그니처로 교체한다.
- ES 모듈·fetch 금지(file://). **http 서빙이 확정되면 다시 연다.**
- 화면 상태는 `setScreen`으로만 바꾸고, 지연은 스텝 카운터로만 센다. rAF는 2곳에서만 호출한다.
- 이 스택이 사는 보장(적층 안정, 오류 시 원인 표시)을 확인하는 수단: 구현자는 §10 C1~C12를 파일 읽기로 확인하고, 사람은 T1(Console 오류 0)·T4(5초 자립)·T9(오프라인 문장)로 확인한다.

---

## Frame deviations & habit regressions
- **컨벤션이 프레임을 이긴 곳:** §4.6 상태 머신 표와 §9 위험 표는 원장(§1.2) ID가 아니라 기술 관점으로 정리되어 있다. §9 가운데 L·C 번호를 단 행은 일부뿐이고, "이전 엔진의 핸들러", "충돌 이벤트 안에서 제거" 행은 대응하는 원장 행이 없다.
- **가장 약한 절: §5 스테이지 표.** 좌표가 적층 규칙과 맞는지는 손계산으로만 확인했다. 특히 스테이지 7은 1단 cx 900~1100 간격 40 정육면체 6개이고, 스테이지 10의 판 K(wood,1050,200,340,20)는 두 프레임 판 위에 걸친다. 이 둘이 실제로 서 있는지, 스테이지 난이도가 적당한지는 T4·T10 전에는 알 수 없다. 리뷰어라면 이 절을 먼저 공격하겠다.
- **수치 튜닝:** §4.5의 DAMAGE_K·재질 hp·STAR2_BLOCK_FRAC는 (b)/(c) 태그만 달렸다. 도출할 근거는 최대 직격 피해 152 한 개뿐이라 한 번 더 고치려 했지만, 실측 없이 더 줄일 수 있는 여지가 없어 그대로 둔다.
- **안전한 기본값 의심:** §4.2에서 동점을 두 번째 기준으로 깼다. 이것이 판정 함수가 준 답인지, "라이브러리가 안전하다"는 관성인지는 H2의 범위 점수를 2로 줄지 3으로 줄지에 달려 있다(3이면 자체 구현은 9점으로 확정 패배, 2이면 동점). 나는 2를 줬다.
- **A2·A3 굵은 가정:** 둘 다 가장 싼 확인(T9, URL 붙여 넣기)과 대체 경로를 달았다. 다만 CDN URL 두 개의 실재는 이 문서 안에서 증명할 수 없다.
- **T2·T5·T6의 초 단위 수치:** 사람이 스톱워치로 재는 값이라 ±0.3초 수준의 측정 오차가 있다. 판정 경계에 걸리면 다시 재도록 적혀 있지 않다.
- **실패 화면의 점수·별:** 해결됨(수정 이력). §4.3 `#screen-fail`에 `#fail-title`·`#fail-score`·`#fail-stars`를, §4.4 `showResult`에 kind 'FAIL' 동작을, §4.7 "점수·별"에 `finishStage('FAIL')` 규칙을 넣어 §1.3 "클리어/실패/완주 화면" 하한과 맞췄다.
