# 슬링샷 버드 — 웹 브라우저 앵그리버드형 게임 구현 계획

- 추론 프레임: spec-coverage / 스타일: opus (단독 실행)
- 한 줄 요약: TypeScript 5.6 + Vite 5.4 + Matter.js 0.20 + Canvas 2D로 만든다. 저작 스테이지 10개, 새 4종, 재질 3종, 돼지 3종, 점수·별·저장, 효과음·이펙트를 갖추고, 게임 영역 우측 상단에 일시정지 버튼(계속하기/다시하기/메인으로)을 둔 물리 슬링샷 게임이다. 먼저 스테이지 1에서 "드래그 발사 → 충돌 → 돼지 제거 → 클리어"를 끝까지 이어 붙이고, 그 다음에 기능을 넓힌다.
- 작성 전 자기 점검: 이런 과제에서 내 습관은 물리·슬링샷 설계에 분량을 몰고, 스테이지 내용·사운드·저장은 마지막에 "나머지 구현" 한 줄로 뭉개는 것이다. 그래서 §1 표에서 요구 × 화면의 모든 칸을 build/defer/n-a 중 하나로 먼저 정하고, 폴리시(사운드·이펙트 마무리)는 S11이라는 이름 붙은 단계로 따로 둔다.

수치 태그 규칙: 〔도출: 근거〕 = 한 줄 근거에서 계산한 값 / 〔초기값: 교체 조건〕 = 첫 측정 결과로 바꿀 값 / 〔임의〕 = 근거 없이 정한 값(바꿔도 설계는 그대로).

---

## 1. 요구사항 × 화면 표

화면 약어: MM 메인 메뉴 · SS 스테이지 선택 · W 인게임 월드(캔버스) · HUD · PO 일시정지 오버레이 · RO 결과 오버레이 · IN 입력 · AU 오디오 · ST 저장소 · FX 이펙트 · VP 화면 맞춤 · SYS 상태/수명주기

출처: ①②③ = 요청사항 1(10스테이지)·2(게임 시스템)·3(일시정지). "완성" = 명세에는 없지만 완성된 게임으로 느껴지는 데 필요한 것. **명세에 적힌 항목은 build만 가능하다.**

| ID | 요구 | 화면 | 출처 | 판정 | 단계 |
|---|---|---|---|---|---|
| R1 | 저작한 스테이지 10개(난이도 곡선 포함) | W | ① | build | S10 |
| R2 | 스테이지 선택 10칸·잠금·별 | SS | ① | build | S6, S9 |
| R3 | 다음 스테이지 전환·10스테이지 완주 처리 | RO, SYS | ① | build | S6 |
| R4 | 게임 시작 버튼 | MM | ② | build | S6 |
| R5 | 드래그 조준·발사(마우스+터치) | IN, W | ② | build | S4 |
| R6 | 궤적 예측 점선 + 직전 궤적 | W | ② | build | S4, S11 |
| R7 | 포물선·중력·충돌·구조물 붕괴 | W | ② | build | S2 |
| R8 | 블록 HP·균열·파괴 | W, FX | ② | build | S5, S8 |
| R9 | 돼지(3종) 제거 판정 | W, HUD | ② | build | S5, S8 |
| R10 | 새 4종과 능력 | W, IN | 완성 | build | S7 |
| R11 | 클리어/실패 판정 | SYS | ② | build | S5 |
| R12 | 스테이지 번호·남은 새·점수 | HUD | 완성 | build | S6 |
| R13 | 클리어(별·점수·최고점)/실패 결과 | RO | 완성 | build | S6 |
| R14 | 우측 일시정지 버튼 | HUD | ③ | build | S6 |
| R15 | 다시하기/메인으로 (+계속하기) | PO | ③ | build | S6 |
| R16 | 일시정지 중 물리·타이머·입력 동결 | SYS, W | ③ | build | S6 |
| R17 | 다시하기를 반복해도 월드·리스너 누수 없음 | SYS | ③ | build | S2, S6 |
| R18 | 해금·최고점·별 저장 | ST, SS | 완성 | build | S9 |
| R19 | 저장소 차단·손상 시 기본값으로 동작 | ST | 완성 | build | S9 |
| R20 | 효과음 7종 + 음소거(저장) | AU, MM, PO | 완성 | build | S11 |
| R21 | 배경음악 | AU | 완성 | defer — 트리거: S12 게이트 통과 후 사용자가 요청하거나, "효과음만으로는 허전하다"는 플레이 피드백이 1건 이상 나올 때 | — |
| R22 | 파편·점수 팝업·화면 흔들림 | FX | 완성 | build | S11 |
| R23 | 비율 유지 맞춤·DPR·레터박스 | VP | 완성 | build | S3 |
| R24 | 탭이 숨겨지면 자동 일시정지 | SYS, PO | 완성 | build | S6 |
| R25 | 스테이지 1 조작 안내 | W | 완성 | build | S11 |
| R26 | 카메라 팬/줌 | W | 완성 | defer — 트리거: 어떤 스테이지든 구조물이 x > 1560 공간을 필요로 할 때 | — |
| R27 | 세로 화면일 때 회전 안내 | VP | 완성 | defer — 트리거: 모바일이 1순위 대상이 될 때(A2) | — |
| R28 | 다국어 | 전체 | — | n-a — 사용자 언어가 한국어 하나뿐. 문자열은 `ui/strings.ts` 한 곳에 모아 나중에 드는 비용만 낮춘다 | — |
| R29 | 온라인 랭킹·계정 | — | — | n-a — 서버 없는 오프라인 1인 게임(A3) | — |
| R30 | 에셋 로딩 화면 | — | — | n-a — 외부 에셋이 없고(A4) 번들은 JS 하나 | — |
| R31 | 화면 전환 페이드 | SYS | 완성 | build | S11 |

### 1.1 화면별 "완성" 기준

- **메인 메뉴**: 제목, "게임 시작", 음소거 토글이 한눈에 보이고, 한 번 클릭하면 스테이지 선택으로 간다.
- **스테이지 선택**: 10칸 모두 번호·잠금·별(0–3)이 구분되어, 어디까지 진행했는지 바로 보인다.
- **인게임 월드**: 새총·새·구조물·돼지가 한 화면에 다 보이고, 모든 파괴가 균열 → 파편 → 점수 팝업 순으로 나와서 무엇이 왜 부서졌는지 알 수 있다.
- **HUD**: 스테이지 번호·남은 새·점수가 가려지지 않고 사건이 생기면 바로 갱신된다. 우측 상단 일시정지 버튼은 새총 조작 영역과 겹치지 않는다.
- **일시정지 오버레이**: 누르는 순간 세계가 멈추고, 세 버튼 모두 클릭 한 번으로 약속한 상태로 정확히 간다.
- **결과 오버레이**: 클리어하면 별 → 점수 → 최고 기록이 차례로 나오고, 실패하면 곧바로 다시 도전할 수 있다.
- **오디오**: 주요 사건마다 서로 다른 소리가 나고, 음소거는 즉시 적용되며 새로고침 후에도 유지된다.
- **저장**: 새로고침이나 탭 재시작 후에도 진행 상황이 그대로이고, 저장소를 못 써도 게임은 뜬다.

### 1.2 build 항목별 동작 문장 (build 25행 = 문장 25개)

- **R1** — 플레이어가 스테이지 1부터 10까지 차례로 열면, 스테이지마다 구조물·돼지 배치·새 구성이 다르고 §4.10에 적은 새 요소가 등장한다. 빠지면 번호만 다르고 같은 구조가 반복되거나, 뒤쪽 스테이지 버튼이 땅만 있는 빈 월드를 연다.
- **R2** — 플레이어가 "게임 시작"을 누르면 10개 버튼이 5×2로 나온다. 해금된 버튼에는 얻은 별이, 잠긴 버튼에는 자물쇠가 표시되고 잠긴 버튼은 눌러도 반응하지 않는다. 빠지면 잠긴 스테이지에 그냥 들어가지거나, 별 표시 없이 똑같은 버튼만 늘어선다.
- **R3** — 플레이어가 클리어 화면에서 "다음 스테이지"를 누르면 이전 월드가 완전히 사라지고, N+1 스테이지가 새 새 대기열로 시작한다. 스테이지 10을 클리어하면 이 버튼 대신 "모든 스테이지 클리어" 문구가 나온다. 빠지면 이전 스테이지의 파편이 새 스테이지 위에 남거나, 스테이지 10 뒤에 빈 캔버스가 나온다.
- **R4** — 플레이어가 메인 메뉴에서 "게임 시작"을 누르면 스테이지 선택 화면으로 넘어간다. 빠지면 `#app[data-scene]`이 `MAIN_MENU`에 머물고, E2E flow 테스트가 첫 클릭에서 시간 초과로 실패한다.
- **R5** — 플레이어가 새 반경 60단위 안을 눌러 끌면 새가 포인터를 따라 최대 120단위까지 뒤로 당겨지고, 새총 양쪽 기둥에서 새까지 고무줄 두 줄이 그려진다. 손을 떼면 당긴 반대 방향으로 날아간다. 빠지면 끄는 동안 페이지가 스크롤되거나 텍스트가 선택되고(기본 동작을 막지 않은 경우), 새가 포인터와 어긋난 곳에 그려진다(좌표 변환을 빠뜨린 경우).
- **R6** — 플레이어가 끄는 동안 새 앞쪽에 점 15개가 실제 비행과 같은 곡선으로 찍힌다. 발사 후에는 방금 날아간 실제 궤적이 흐린 점으로 다음 발사 때까지 남는다. 빠지면 점선이 직선으로 그려지거나, 실제 새가 점선보다 일찍 떨어진다.
- **R7** — 발사된 새가 포물선을 그리며 날아가 블록에 부딪히면 블록이 밀리며 회전해 쓰러지고, 그 위에 얹힌 블록도 함께 무너진다. 빠지면 새가 블록을 뚫고 지나가거나, 맞은 블록이 쓰러지지 않고 미끄러지기만 한다.
- **R8** — 블록이 충분히 세게 맞으면 균열 두 단계를 거쳐 파편을 남기며 사라지고, 그 자리에 점수 팝업이 뜬다. 빠지면 블록이 끝없이 튕기기만 하거나, 균열 없이 한 프레임 만에 사라진다.
- **R9** — 돼지가 블록·새·땅에 세게 부딪히거나 화면 밖으로 떨어지면 연기와 함께 사라지고, 5000점이 오르며 HUD의 남은 돼지 수가 줄어든다. 빠지면 화면에 돼지가 하나도 없는데 결과 화면이 뜨지 않는 교착 상태가 된다.
- **R10** — 플레이어가 비행 중인 새가 있을 때 화면을 탭하면 파랑은 셋으로 갈라지고, 노랑은 날던 방향으로 가속하고, 검정은 폭발한다. 능력은 새 한 마리당 한 번만 쓸 수 있다. 빠지면 네 종류가 똑같이 움직이거나, 비행 중 탭이 다음 새 조준으로 처리된다.
- **R11** — 마지막 돼지가 사라지면 1.5초 뒤 남은 새 보너스가 더해지고 클리어 결과가 뜬다. 새를 다 썼고 월드가 멈췄는데 돼지가 남아 있으면 실패 결과가 뜬다. 빠지면 돼지가 아직 굴러떨어지는 중에 실패가 먼저 뜨거나, 결과 오버레이가 두 번 겹쳐 뜬다.
- **R12** — 플레이 중에는 좌상단에 스테이지 번호와 남은 새 아이콘, 상단 가운데에 점수가 항상 보이고, 점수는 사건이 생길 때마다 바로 오른다. 빠지면 발사해도 새 아이콘 수가 그대로이거나, 점수가 결과 화면에서야 한꺼번에 바뀐다.
- **R13** — 클리어하면 별 1–3개가 차례로 채워지고, 이번 점수·최고 점수(갱신 시 "최고 기록!" 표시)와 다시하기/다음 스테이지/메인으로 버튼이 나온다. 실패하면 "실패" 문구와 다시하기/메인으로가 나온다. 빠지면 클리어 뒤에도 월드 파편이 계속 움직이고, 버튼 없는 화면에 갇힌다.
- **R14** — 플레이 중에는 게임 영역(레터박스 안쪽) 우측 상단에 56×56 CSS px 일시정지 버튼이 항상 떠 있다. 빠지면 버튼이 창 모서리(레터박스 바깥)에 붙거나, 좌측 HUD와 겹친다.
- **R15** — 플레이어가 일시정지 버튼이나 ESC를 누르면 게임 영역이 어두워지고 "일시정지" 패널에 계속하기·다시하기·메인으로가 뜬다. 다시하기는 현재 스테이지를 처음 상태(새 전부, 구조물 원위치)로 되돌리고, 메인으로는 메인 메뉴로 보낸다. 빠지면 다시하기 후에도 부서진 구조물이 그대로 남거나, 메인으로 누른 뒤 메인 메뉴 위에 HUD가 남는다.
- **R16** — 일시정지 중에는 날던 새, 무너지던 블록, 파티클, 결과 대기 타이머가 모두 그 자리에 멈추고 캔버스 드래그는 무시된다. 계속하기를 누르면 멈춘 지점부터 이어진다. 빠지면 재개하는 순간 블록이 순간이동하듯 튀거나(밀린 시간을 한꺼번에 처리한 경우), 일시정지 중에 결과 화면이 뜬다.
- **R17** — 플레이어가 다시하기를 10번 연속 눌러도 충돌 한 번에 데미지는 한 번만 들어간다. 빠지면 다시하기를 할수록 블록이 살짝만 맞아도 부서지고, 효과음이 겹쳐서 점점 커진다.
- **R18** — 플레이어가 스테이지를 클리어하고 탭을 닫았다 다시 열어도 다음 스테이지 해금·최고 점수·별이 그대로 있다. 빠지면 새로고침할 때마다 스테이지 2 이후가 다시 잠긴다.
- **R19** — 저장소가 막혀 있거나 저장값이 깨져 있으면 게임은 스테이지 1만 열린 기본 상태로 뜬다. 빠지면 Safari 개인 정보 보호 모드 같은 환경에서 첫 화면이 하얗게 뜨고 콘솔에 `SecurityError`나 `SyntaxError`가 찍힌다.
- **R20** — 플레이어가 한 번 클릭한 뒤로는 발사·충돌·유리/나무/돌 파괴·돼지 제거·클리어·실패 때 서로 다른 소리가 난다. 음소거를 켜면 모든 소리가 즉시 꺼지고 새로고침 후에도 유지된다. 빠지면 게임 내내 소리가 없거나, 새로고침하면 음소거가 풀린다.
- **R22** — 블록이 부서지면 재질 색깔 파편 8–12개가 튀어 떨어지고, 돼지가 사라지면 초록 연기와 "+5000"이 떠오르며, 폭탄이 터지면 화면이 짧게 흔들린다. 빠지면 파괴가 한 프레임 만에 뚝 끊겨서 무엇이 부서졌는지 알아보기 어렵다.
- **R23** — 창 크기를 바꾸거나 고해상도 화면에서 열어도 1600×900 월드가 비율을 유지한 채 창을 채우고(남는 부분은 레터박스) 선이 선명하게 보인다. 빠지면 좁은 창에서 구조물 오른쪽이 잘리거나, 레티나 화면에서 흐릿하게 번진다.
- **R24** — 플레이 중에 탭을 바꾸거나 창을 최소화했다가 돌아오면 일시정지 오버레이가 떠 있다. 빠지면 돌아온 순간 몇 초 분량이 한꺼번에 진행되어 구조물이 폭발하듯 흩어진다.
- **R25** — 스테이지 1에 처음 들어가면 손가락 아이콘이 새를 뒤로 끄는 동작을 반복해서 보여 주고, 첫 드래그를 시작하면 사라진다. 빠지면 처음 해 보는 사람이 새를 클릭만 반복하다 멈춘다.
- **R31** — 화면이 바뀔 때 200ms 동안 검은 페이드로 전환된다. 빠지면 전환 순간 이전 화면의 HUD나 버튼이 한 프레임 번쩍인다.

---

## 2. 문제 정의와 목표

웹 브라우저에서 설치 없이 실행되는 앵그리버드형 물리 슬링샷 게임을 만든다. 성공 조건은 다음 세 가지이며, 모두 §9의 명령 종료 코드로 판정한다.

1. 스테이지가 정확히 10개이고, 각각 저작된 구조와 풀이가 있다. 각 스테이지는 풀 수 있고(풀이 재생 시 클리어), 가만히 두면 저절로 무너지지 않으며(정착 테스트), 대충 쏘면 실패한다(무의미 발사 테스트).
2. 메인 → 게임 시작 → 스테이지 → 실제 마우스 드래그로 발사 → 충돌·파괴 → 돼지 전멸 → 클리어 결과까지 실제 입력 경로로 이어진다.
3. 게임 영역 우측 상단의 일시정지 버튼을 누르면 다시하기/메인으로가 나오고, 각각 약속한 상태로 정확히 간다.

## 3. 명시적 가정

| # | 가정 | 틀리면 생기는 일 |
|---|---|---|
| **A1** | **Matter.js 0.20이 스테이지당 바디 80개 이하의 적층 구조를, 입력이 없을 때 정지 상태로 유지한다.** | 구조물이 저절로 무너져 모든 스테이지가 의미를 잃는다. **가장 싼 조기 검증**: S2에서 스테이지 1과 고정 픽스처 "나무 12블록 3층 탑"으로 정착 테스트를 돌린다(콘텐츠 저작 전). **대체 경로**: 반복 횟수 상향 → sleeping 켜기 + 바디 제거 시 전체 wake → `physics/`만 planck.js로 교체(§7 대안 2). |
| A2 | 데스크톱 최신 브라우저(Chrome·Edge·Firefox·Safari)가 1순위다. 터치는 Pointer Events로 동작하게 하되 세로 모드 최적화는 하지 않는다. | R27을 되살린다. HUD 크기는 CSS 변수라서 조정 범위는 `ui/`로 한정된다. |
| A3 | 오프라인 1인용이고 서버가 없다. | R29를 다시 검토한다. 저장 계층 인터페이스(`SaveStore`)에 원격 구현을 추가한다. |
| A4 | 외부 이미지·사운드 파일 없이, 도형은 절차적으로 그리고 소리는 WebAudio로 합성한다. | 아트 품질을 요구받으면 스프라이트 아틀라스를 도입한다. 렌더러가 `entity.kind → draw 함수` 매핑 구조라 교체 범위는 `render/`로 한정된다. |
| A5 | 개인·학습용이다. 공개 배포 시 "Angry Birds" 명칭과 캐릭터 외형은 쓰지 않는다(제목 "슬링샷 버드", 원형 도형 캐릭터). | 상용·공개 배포가 목적이면 상표·저작물 검토 전까지 배포하지 않는다. |
| A6 | "다시하기"는 현재 스테이지를 처음부터 다시 시작하는 것이다(직전 한 발 되돌리기가 아니다). | 되돌리기가 필요하면, 물리가 결정적이므로 "처음 상태 + 지금까지의 발사 기록 재생"으로 구현한다. |
| A7 | "메인으로"는 메인 메뉴(타이틀)로 가며, 저장된 진행은 유지하고 확인 대화상자는 없다. | 확인 모달 하나를 `ui/overlays.ts`에 추가한다. |
| A8 | 일시정지 패널에 요구된 두 버튼 외에 "계속하기"를 추가한다(없으면 일시정지를 닫을 방법이 없다). | 버튼을 빼고, ESC나 일시정지 버튼을 다시 눌러야만 재개되게 한다. |
| A9 | 월드는 한 화면에 고정된 1600×900이고 카메라는 없다. | R26을 되살린다. 렌더러의 월드→화면 변환은 이미 `Viewport` 한 곳에 있다. |
| A10 | 개발 환경은 Node 20 LTS다. | `engines` 필드에 맞춰 조정하되, Node 18 미만은 Vite 5가 지원하지 않는다. |

---

## 4. 접근: 스택과 설계 명세

### 4.1 스택 — 각 도구를 무엇 때문에 쓰는가

- **TypeScript 5.6.3**, `strict` + `noUncheckedIndexedAccess`: 스테이지 스키마(`StageData`)와 씬 상태 유니온을 컴파일할 때 검사하려고 쓴다. 보증하는 명령: `npx tsc --noEmit` 종료 코드 0(D2).
- **Vite 5.4.10**, `base: './'`: 개발 서버와 정적 `dist/` 산출물. 어느 경로에 올려도 동작한다. 보증하는 명령: `npm run build` 종료 코드 0(D3).
- **matter-js 0.20.0** (+ `@types/matter-js` 0.19.7): 회전·마찰·적층이 있는 강체 충돌 처리를 직접 짜지 않으려고 쓴다. `Engine`, `Bodies`, `Body`, `Composite`, `Events`만 사용한다. `Matter.Render`(디버그용)와 `Matter.Runner`(가변 시간 스텝)는 쓰지 않는다. 보증은 settle·solution 테스트(D4)가 맡는다.
- **Canvas 2D**로 월드를 직접 그리고, **DOM 오버레이**로 메뉴·HUD·버튼을 만든다.
- **vitest 2.1.8**(node 환경에서 브라우저 없이 물리 테스트), **@playwright/test 1.48.2**(chromium, 실제 입력 경로 E2E).
- 런타임 의존성은 matter-js 하나뿐이다.

### 4.2 좌표계와 게임 루프

- 월드는 1600×900 논리 단위다 〔임의: 16:9, 새총과 가장 먼 구조물이 한 화면에 들어오는 폭〕. 땅 윗면은 y=820, 새총 앵커는 (240, 680), 구조물 배치 구역은 x ∈ [800, 1560]이다.
- **고정 스텝**: `Engine.update(engine, 1000/60)`만 호출한다. requestAnimationFrame 루프에서 누적기를 쓰고, 프레임 dt는 250ms로 자르며, 한 프레임에 최대 5스텝까지만 돈다 〔임의〕. 물리 스텝은 `scene === 'PLAYING'`일 때만 돌고, 렌더링은 모든 씬에서 계속한다.
- **모든 게임 타이머는 물리 스텝 수로 센다**(정착 판정, 다음 새 장전, 클리어 대기, 파티클 수명). `Date.now`나 `setTimeout`은 게임 로직에 쓰지 않는다. 그래서 일시정지는 스텝만 멈추면 모든 타이머가 함께 멈추고, 브라우저 없는 테스트에서도 같은 입력이면 같은 결과가 나온다. 예외는 CSS 페이드(R31)뿐이다.
- Engine 설정: 중력 y=1, scale 0.001(Matter 기본값) → 스텝당 중력 가속도 g = 0.001 × (16.667)² ≈ 0.2778 단위/스텝². `positionIterations` 10, `velocityIterations` 8 〔초기값: S10 settle 테스트가 모든 스테이지에서 통과하면 이 값으로 동결〕. `enableSleeping: false`(§7 대안 9).
- Matter 0.20의 `Body.setVelocity` 단위는 기준 델타(16.667ms)당 이동량이다. 스텝 Δ를 같은 값으로 고정하므로 속도 단위는 곧 "단위/스텝"이다.

### 4.3 상태 머신

`SceneId = 'MAIN_MENU' | 'STAGE_SELECT' | 'PLAYING' | 'PAUSED' | 'RESULT_CLEAR' | 'RESULT_FAIL'`
PLAYING 안의 세부 단계: `Phase = 'AIMING' | 'FLYING' | 'WAITING_NEXT' | 'CLEAR_PENDING' | 'FAIL_PENDING'`.

`transition(state, event) → state | null`은 순수 함수로 만든다(`core/scene-manager.ts`). 부수 효과는 `onEnter`/`onExit`에서만 실행한다. 아래 표에 없는 (상태, 이벤트) 조합은 `null`을 돌려주고 무시한다.

| 현재 | 이벤트(발생원) | 다음 | 부수 효과 |
|---|---|---|---|
| MAIN_MENU | START_GAME (`btn-start`) | STAGE_SELECT | — |
| STAGE_SELECT | SELECT_STAGE(n), n ≤ unlocked (`btn-stage-n`) | PLAYING | `StageSession.create(n)` |
| STAGE_SELECT | BACK (`btn-back`) | MAIN_MENU | — |
| PLAYING | PAUSE (`btn-pause`, ESC, `visibilitychange`→hidden) | PAUSED | 진행 중인 드래그 취소 |
| PAUSED | RESUME (`btn-resume`, ESC, `btn-pause`) | PLAYING | 누적기 0으로 초기화 |
| PAUSED | RESTART (`btn-restart`) | PLAYING | dispose → create(n) |
| PAUSED | TO_MAIN (`btn-main`) | MAIN_MENU | dispose |
| PLAYING | STAGE_CLEARED (rules) | RESULT_CLEAR | 점수·별 저장, 해금 |
| PLAYING | STAGE_FAILED (rules) | RESULT_FAIL | — |
| RESULT_CLEAR | NEXT_STAGE, n < 10 (`btn-next`) | PLAYING | dispose → create(n+1) |
| RESULT_CLEAR, RESULT_FAIL | RESTART | PLAYING | dispose → create(n) |
| RESULT_CLEAR, RESULT_FAIL | TO_MAIN | MAIN_MENU | dispose |

씬이 바뀔 때마다 `#app`의 `data-scene`, `data-phase`, `data-birds-left`, `data-pigs-left` 속성을 갱신한다. CSS 표시 전환과 E2E 판정이 이 속성을 쓴다.

### 4.4 슬링샷 입력·발사·궤적 예측

- 새총 상태: `EMPTY → LOADED → DRAGGING → (발사) EMPTY`. **새총 위의 새는 물리 월드에 넣지 않고 그림으로만 둔다.** 발사하는 순간 바디를 만들어 `Composite.add` 한다(§7 대안 10).
- 잡기: `pointerdown` 위치를 `Viewport.screenToWorld`로 바꿨을 때 새 중심에서 60단위 이내이면 DRAGGING으로 바꾸고 `setPointerCapture`를 건다 〔임의: 새 반지름 22의 약 2.7배, 손가락 폭을 고려〕. 캔버스에는 `touch-action: none`을 준다.
- 끌기: `pull = anchor − pointer`이고 길이는 최대 120으로 자른다. 새는 `anchor − pull` 위치에 그리고, 고무줄을 그리고, 궤적 예측을 갱신한다.
- 놓기: `|pull| < 15`이면 취소하고 LOADED로 돌아간다 〔임의〕. 그렇지 않으면 바디를 만들고 `Body.setVelocity(pull × K)`, `K = 0.19`로 발사한다 〔도출: 45° 최대 사거리 = v²/g를 가장 먼 표적 거리(1560−240=1320)의 1.4배인 약 1850으로 잡으면 v_max ≈ 22.7 → K = 22.7/120〕. 이어서 phase를 FLYING으로, `birdsLeft`를 1 줄이고, 발사음을 낸다.
- `pointercancel`이 오거나 일시정지하면 드래그를 취소한다.
- **궤적 예측**: 해석식을 쓰지 않는다. 바디 하나만 있는 별도 미니 Engine(같은 중력, 같은 Δ)에서 45스텝을 돌리고 3스텝마다 점을 찍는다(점 15개). 새 바디는 `frictionAir: 0`이다. 적분기가 실제와 같으므로, 충돌 전까지는 설계상 예측과 실제가 어긋날 수 없다. 45스텝 〔임의: 0.75초 분량. 궤적 전체를 보여 주면 조준하는 재미가 사라진다〕.
- 직전 궤적: 비행 중 4스텝마다 위치를 기록해 두고, 다음 발사 때까지 흐린 점으로 그린다(S11).

### 4.5 충돌·데미지·파괴

- `Events.on(engine, 'collisionStart', ...)`만 쓴다(계속 닿아 있는 접촉은 데미지를 주지 않는다). 쌍의 바디는 항상 `pair.bodyA.parent`로 원래 바디를 찾는다.
- 충격량 `impact = |(vA − vB) · normal|`. `impact < V_MIN = 2.0`이면 무시한다 〔도출: 높이 7단위에서 자유낙하했을 때 속도 √(2·0.2778·7) ≈ 1.97. 배치 오차(검증기가 ≤0.5단위로 제한)로 생기는 떨림보다 크다〕.
- 부술 수 있는 쪽 X가 받는 데미지 = `(impact − V_MIN) × DMG_K × 2·m_other/(m_X + m_other) × attackMul`. 상대가 정적 바디면 질량비 항은 2다. `DMG_K = 1` 〔도출: 보정 목표 "최대 속도의 빨강이 20×100 나무 블록 하나는 부수고, 같은 크기 돌 블록은 못 부순다" — 나무 30 > HP 20, 돌 22 < HP 50. 이 목표 자체를 S8 damage 테스트가 검사한다〕.
- 데미지 유예: 세션 시작 후 60스텝 동안은 데미지를 적용하지 않는다 〔임의: 1초〕. 이 유예가 자가 붕괴를 가리는 것이 아님은 settle 테스트(300스텝 동안의 변위와 돼지 생존)가 보인다.
- 제거는 충돌 핸들러 안에서 하지 않는다. 제거 큐에 넣었다가 `Engine.update`가 끝난 뒤 `session.flushRemovals()`에서 처리한다(`Composite.remove`, registry에서 삭제, 이펙트 생성, 점수 가산, 돼지면 `pigsAlive − 1`).
- 화면 밖 판정: x < −200, x > 1800, y > 1100이면 제거한다. 돼지와 블록 모두 파괴로 치고 점수를 준다.
- 균열 표시: HP 비율 < 0.66이면 균열 1단계, < 0.33이면 2단계를 선으로 그린다.
- 속도 상한 40단위/스텝 (모든 새, 능력 발동 후 포함) 〔도출: 블록 최소 두께 20 + 가장 작은 새 지름 24 = 44 > 40이므로, 한 스텝 만에 블록을 건너뛰는 터널링이 생길 수 없다〕.

### 4.6 클리어/실패 판정·점수·별

- 새 한 마리의 비행 종료: 속도 < 0.2가 45스텝 연속이거나, 화면 밖으로 나갔거나, 발사 후 360스텝이 지나면 끝난다 〔임의〕. 끝난 새는 연기 효과와 함께 제거한다. 파랑은 조각 셋이 모두 끝나야 비행이 끝난 것으로 본다.
- `Rules.afterStep()`은 매 스텝 `flushRemovals` 다음에 실행하며, phase와 상관없이 `pigsAlive === 0`을 먼저 확인한다.
  - `pigsAlive === 0` → CLEAR_PENDING → 90스텝 뒤 보너스(남은 새 × 10000)를 더하고 STAGE_CLEARED를 **한 번만** 보낸다(`resultSent` 플래그).
  - 새 비행이 끝났고 `birdsLeft > 0` → WAITING_NEXT → 30스텝 뒤 `loadNext()` → AIMING.
  - 새 비행이 끝났고 `birdsLeft === 0` → FAIL_PENDING → 동적 바디 전부의 속도 < 0.2가 30스텝 연속이거나, 300스텝이 지난 시점에 `pigsAlive > 0`이면 STAGE_FAILED. 기다리는 동안 돼지가 전멸하면 CLEAR_PENDING으로 간다.
- 점수: 유리 300, 나무 500, 돌 800, 돼지 5000, 남은 새 10000 〔임의: 장르 관례를 따름〕.
- 별: 클리어 = 1★. `maxScore = Σ블록 + Σ돼지 + (새 수 − 1) × 10000`. 2★ ≥ round(0.45 × maxScore), 3★ ≥ round(0.65 × maxScore) 〔초기값: 스테이지 데이터의 `stars` 필드로 덮어쓸 수 있다. 교체 조건은 S10에서 "풀이 재생 점수 ≥ 2★ 기준"이 실패하는 스테이지가 생길 때〕.
- 클리어 조건은 점수가 아니라 돼지 전멸이다. 점수는 별과 최고 기록에만 쓴다.

### 4.7 새 4종

| 종류 | 반지름·밀도 | 능력(비행 중 캔버스 탭 한 번) | 재질 배율 |
|---|---|---|---|
| 빨강 | 22 · 0.004 | 없음 | — |
| 파랑 | 16 · 0.004 | 반지름 12인 새 셋으로 교체. 속도 방향은 0°, ±12°, 속도 크기는 유지 | 유리 ×2 |
| 노랑 | 20 · 0.004 (삼각형 모양으로 그림) | 현재 방향으로 속도 ×2, 상한 40 | 나무 ×2 |
| 검정 | 26 · 0.006 | 탭하거나 첫 충돌 후 90스텝이 지나면 폭발. 반경 140 안의 바디를 중심에서 바깥으로 `12 × (1 − d/140)` 단위/스텝만큼 밀어내고, 데미지 `30 × (1 − d/140) × 배율`을 준다. 화면 흔들림 | 폭발 시 돌 ×1.5 |

모든 수치는 〔초기값: S10 solution·settle 테스트가 10개 스테이지 전부에서 통과하면 동결. 이후 바꾸면 다시 통과해야 한다〕. 능력 탭은 `phase === 'FLYING'`이고 능력을 아직 안 썼을 때만 받는다. 새총이 EMPTY 상태이므로 잡기와 헷갈릴 일이 없다.

### 4.8 재질과 돼지

| 항목 | 밀도 | 마찰 | 반발 | HP | 점수 | 초기값의 근거 |
|---|---|---|---|---|---|---|
| 유리 | 0.0008 | 0.3 | 0.1 | 8 | 300 | 빨강에 한 방에 깨짐 |
| 나무 | 0.001 | 0.6 | 0.05 | 20 | 500 | §4.5 보정 목표 |
| 돌 | 0.0025 | 0.8 | 0.02 | 50 | 800 | §4.5 보정 목표 |
| 소형 돼지 (r 20) | 0.001 | 0.5 | 0.2 | 6 | 5000 | 나무 블록이 쓰러지며 덮치면 죽음(6.6 > 6) |
| 대형 돼지 (r 30) | 0.001 | 0.5 | 0.2 | 15 | 5000 | 직격해야 죽음 |
| 철모 돼지 (r 30) | 0.0012 | 0.5 | 0.2 | 30 | 5000 | 검정이나 노랑 직격이 필요 |

표의 모든 수치는 §4.7과 같은 동결 규칙을 따른다. 정적 지형(땅, 언덕, 받침)은 파괴되지 않는 돌색 바디다.

### 4.9 스테이지 데이터 구조·로딩·전환·검증

```ts
type MaterialId = 'glass' | 'wood' | 'stone';
type BirdType = 'red' | 'blue' | 'yellow' | 'black';
type PigType = 'small' | 'large' | 'helmet';
type BlockDef =
  | { kind: 'box'; material: MaterialId; x: number; y: number; w: number; h: number; angle?: number }
  | { kind: 'circle'; material: MaterialId; x: number; y: number; r: number };
interface StaticDef { x: number; y: number; w: number; h: number; angle?: number }
interface PigDef { type: PigType; x: number; y: number }
interface ShotDef { pull: { x: number; y: number }; abilityAtStep?: number } // 발사 후 몇 번째 스텝에 능력 발동
interface StageData {
  id: number; name: string; birds: BirdType[]; blocks: BlockDef[]; pigs: PigDef[];
  statics?: StaticDef[]; stars?: { two: number; three: number }; slack: number;
  solution: ShotDef[]; hint?: boolean;
}
```

- 파일: `src/stages/stage01.ts` … `stage10.ts`, `src/stages/index.ts`는 `export const STAGES: readonly StageData[]`로 정적 import한다. 비동기 로딩은 없다.
- 로딩: `StageSession.create(stage)`가 **세션마다 새 Engine을 만들고**, `world-factory`가 땅·정적 지형·블록·돼지 바디를 만들면서 각각을 `EntityRegistry`(body.id → {kind, material|pigType, hp, maxHp})에 등록한다. 그다음 충돌 리스너를 등록하고 `slingshot.loadNext()`를 부른다.
- 전환: `dispose()`는 `Events.off(engine)` → `Composite.clear(world, false)` → `Engine.clear(engine)` → registry·이펙트·제거 큐 비우기 → 세션 참조 해제 순서로 실행한다. RESTART·NEXT_STAGE·TO_MAIN은 모두 dispose를 먼저 부른다.
- 검증기 `validateStage(stage): string[]`는 개발 빌드의 로딩 시점과 테스트에서 실행한다. 검사 항목:
  - `STAGES.length === 10`, id는 1..10으로 중복 없음
  - 돼지 ≥ 1, 새 ≥ 1
  - 모든 바디가 x ∈ [0, 1600], y ≤ 820 안에 있음
  - 동적 바디끼리 AABB 겹침 ≤ 0.5
  - 블록의 짧은 변 ≥ 20
  - 바디 수 ≤ 스테이지 상한(§4.10), 최대 80 〔임의: 저사양에서의 충돌 비용 여유분. 교체 조건은 상한 초과가 필요한 설계가 나오고 스텝 시간 측정에 여유가 있을 때〕
  - `birds.length − solution.length === slack`
  - 2★ < 3★ ≤ maxScore

### 4.10 스테이지 10개 저작 명세 (콘텐츠 축)

난이도는 "여유 = 새 수 − 풀이 발 수"로 측정하고 검증기가 강제한다. 여유는 2 → 1 → … → 0으로 줄어들되, **스테이지 6은 일부러 쉽게 만든 골짜기**다(새 요소 없음, 여유 2). 연속으로 새 요소가 나온 뒤 숨을 돌리고, 7부터 폭탄으로 다시 올라간다.

| # | 이름 | 새(발사 순서) | 돼지 | 구조·재질 | 새로 등장하는 요소 | 풀이 발 수 / 여유 | 바디 상한 |
|---|---|---|---|---|---|---|---|
| 1 | 첫 발사 | 빨강×3 | 소형1 | 나무 기둥 2 + 보 1로 만든 오두막, 돼지는 안에 | 드래그 발사(R25 안내) | 1 / 2 | 10 |
| 2 | 나무 탑 | 빨강×3 | 소형2 | 3층 나무 탑 2동, 꼭대기마다 돼지 | 적층 붕괴 | 2 / 1 | 25 |
| 3 | 유리 온실 | 파랑, 파랑, 빨강 | 소형2 | 유리 벽 + 나무 지붕 온실 2동 | 파랑(분열), 유리 | 2 / 1 | 30 |
| 4 | 두꺼운 벽 | 노랑, 노랑, 빨강 | 소형2 | 돼지 앞에 두께 30 나무 벽 2겹 | 노랑(가속) | 2 / 1 | 30 |
| 5 | 돌 받침 | 빨강, 노랑, 파랑, 빨강 | 대형1, 소형2 | 돌 하부 + 나무·유리 상부 3층 | 돌, 대형 돼지 | 3 / 1 | 45 |
| 6 | 쉬어가기 피라미드 | 빨강, 파랑, 노랑 | 소형3 | 나무·유리 피라미드. 핵심 블록 하나를 맞히면 전체가 무너짐 | 없음(골짜기) | 1 / 2 | 35 |
| 7 | 벙커 | 검정, 검정, 빨강 | 대형2, 소형1 | 지붕까지 돌로 덮인 벙커 | 검정(폭탄) | 2 / 1 | 45 |
| 8 | 철모 부대 | 검정, 노랑, 파랑, 빨강 | 철모2, 소형2 | 층마다 재질이 다른 3층 혼합 구조 | 철모 돼지 | 3 / 1 | 60 |
| 9 | 두 언덕 | 노랑, 파랑, 검정, 빨강 | 소형3, 대형1, 철모1 | 가까운 나무 요새 + 먼 정적 언덕(x≈1450, 높이 220) 위 돌 망루 | 정적 지형, 원거리 사격 | 4 / 0 | 70 |
| 10 | 왕의 성 | 빨강, 파랑, 노랑, 검정, 검정 | 철모2, 대형2, 소형1 | 돌 성벽, 유리 창, 나무 지붕. 철모 하나는 가운데 탑 꼭대기 | 모든 요소 종합 | 5 / 0 | 80 |

저작 규칙:

- 블록은 땅이나 아래 블록 윗면에 정확히 닿게 놓는다(y를 계산해서 배치하고, 겹침 ≤ 0.5).
- 풀이(`solution`)는 저작할 때 헤드리스 재생으로 확인한 발사 벡터 목록이다.
- 스테이지마다 새로 등장하는 요소는 **그 요소가 없으면 풀기 어려운 배치**로 만든다(예: 스테이지 4의 두께 30 나무 벽은 빨강만으로는 여유 1 안에 뚫을 수 없어야 한다).

### 4.11 UI (DOM 오버레이)

- 구조: `#app` > `<canvas id="game">` + `<div id="ui">`. `Viewport`가 레터박스 사각형을 계산해 `#ui`의 left/top/width/height를 CSS 변수로 맞추므로, HUD의 "우측"은 창이 아니라 게임 영역의 우측이다.
- **`#ui { pointer-events: none }`, 버튼과 패널만 `pointer-events: auto`로 둔다.** 이게 없으면 오버레이가 캔버스 입력을 가로챈다(§6 hop 1의 조건).
- 버튼에는 모두 `<button>` 요소와 `data-testid`를 쓴다: `btn-start`, `btn-back`, `btn-stage-1`…`btn-stage-10`, `btn-pause`(aria-label "일시정지"), `btn-resume`, `btn-restart`, `btn-main`, `btn-next`, `btn-mute`.
- HUD: 좌상단에 "스테이지 N"과 남은 새 아이콘(다음 발사 순서대로 종류별 색), 상단 가운데에 점수, 우상단에 `btn-pause`(56×56 CSS px, 가장자리에서 16px 안쪽). 일시정지 버튼 말고는 우상단에 아무것도 두지 않는다.
- 일시정지 패널: 게임 영역 전체에 반투명 검정 배경, 제목 "일시정지", 버튼을 세로로 계속하기 / 다시하기 / 메인으로 순서로 배치하고, 음소거 토글을 둔다.
- 스테이지 선택: 5×2 격자. 각 칸에 번호와 별 0–3, 잠긴 칸은 자물쇠와 `disabled`. "뒤로" 버튼.
- 결과: §1.2 R13 문장대로. 별은 300ms 간격으로 하나씩 채운다(CSS 애니메이션).
- 키보드: ESC는 PLAYING ↔ PAUSED를 토글한다. 버튼은 기본 포커스와 Enter로 동작한다.
- `document.visibilitychange`가 hidden이고 `scene === 'PLAYING'`이면 PAUSE를 보낸다.

### 4.12 저장

- 키 `slingshot-bird.save.v1`, 값 `{ version: 1, unlocked: 1..10, stages: { [id]: { bestScore, stars } }, muted }`.
- `SaveStore`는 Storage 비슷한 객체를 주입받는다(테스트용). 읽을 때 `JSON.parse`와 형태 검사를 하고, 실패하면 기본값(`unlocked: 1`)을 쓴다. `localStorage` 접근이 예외를 던지면 메모리 저장소로 바꾸고 `console.warn`을 한 번만 찍는다.
- 쓰는 시점은 STAGE_CLEARED와 음소거 토글 두 곳뿐이다. 스테이지 n을 클리어하면 `unlocked = min(10, max(unlocked, n+1))`로 바꾸고, 최고 점수와 별은 늘어날 때만 갱신한다.

### 4.13 오디오·이펙트

- `audio/audio.ts`: AudioContext는 첫 `pointerdown`이나 `keydown` 때 만든다(브라우저 자동재생 정책). 효과음 7종은 전부 합성한다: 발사(노이즈 휙), 충돌(둔탁한 소리, 음량 ∝ impact), 유리/나무/돌 파괴(필터 대역이 다른 노이즈 세 가지), 돼지 제거(뿅), 클리어(상승 아르페지오), 실패(하강음). 충돌음은 3스텝에 최대 1번 〔임의〕. `AudioContext`가 없는 환경에서는 아무것도 하지 않는다. 음소거 상태는 `SaveStore`와 연동한다.
- `fx/effects.ts`: 파티클 풀 상한 300 〔임의〕. 블록 파괴 시 재질 색 파편 8–12개가 중력을 받으며 40스텝 동안 남는다. 돼지 제거 시 초록 연기와 "+5000" 팝업이 60스텝 동안 떠오른다. 폭탄은 12스텝 동안 진폭 8단위로 감쇠하는 화면 흔들림을 만든다. 이펙트도 물리 스텝 기준으로 진행하므로 일시정지하면 같이 멈춘다.
- 스테이지 1 안내 손가락(R25), 직전 궤적(R6 후반), 페이드(R31)도 S11에서 만든다.

### 4.14 파일 구조

```
index.html, styles.css
src/main.ts                     부트: Viewport.resize → SaveStore.load → UI 연결 → GameLoop.start
src/types.ts, src/config.ts     타입 / 모든 상수(§4 수치, 태그 주석 포함)
src/core/loop.ts                고정 스텝 누적기, step 훅(physics → flushRemovals → rules → fx)
src/core/scene-manager.ts       transition 순수 함수 + onEnter/onExit
src/physics/world-factory.ts    StageData → Matter 바디 + registry
src/physics/entities.ts         EntityRegistry
src/physics/session.ts          StageSession.create/dispose, flushRemovals
src/physics/damage.ts           collisionStart → HP → 제거 큐
src/game/slingshot.ts, input.ts, trajectory.ts, birds.ts, rules.ts, score.ts
src/render/viewport.ts, renderer.ts, draw/*.ts
src/fx/effects.ts, src/audio/audio.ts, src/storage/storage.ts
src/ui/overlays.ts, src/ui/strings.ts
src/stages/stage01..10.ts, index.ts, validate.ts
tests/*.test.ts (vitest), e2e/*.spec.ts (playwright)
```

---

## 5. 단계 (의존 순서)

S0–S6은 **스테이지 1 하나로 처음부터 끝까지 이어 붙이는 구간**이다. S3과 S5는 서로 독립이라 병렬로 진행할 수 있다. S6 뒤의 게이트를 통과해야 넓히는 단계(S7–S11)를 시작한다.

| 단계 | 선행 | 산출물 | 검증 | 담당 요구 |
|---|---|---|---|---|
| S0 골격 | 없음 | package.json(§10 버전 고정), lockfile, tsconfig(strict), vite/vitest/playwright 설정, 빈 캔버스 | `npm ci`, `npx tsc --noEmit`, `npm run build` 모두 종료 코드 0 | D1–D3 |
| S1 타입·스키마 | S0 | types.ts, config.ts, validate.ts, stage01.ts | validator 테스트: 정상 픽스처 통과, 불량 픽스처 6종(겹침, 범위 밖, 얇은 블록, 돼지 0, 여유 불일치, 별 역전) 각각 거부 | R1, R7 |
| S2 물리 세션 | S1 | world-factory, entities, session(create/dispose), loop | settle 테스트(스테이지 1 + 12블록 탑 픽스처) = **A1 조기 검증**. dispose 후 리스너 0개 | R7, R17 |
| S3 뷰포트·렌더러 | S2 | viewport(맞춤, DPR, screenToWorld/worldToScreen), 절차적 도형 그리기 | screenToWorld∘worldToScreen 왕복 오차 < 0.01 (창 비율 3종: 16:9, 4:3, 21:9) | R23 |
| S4 슬링샷·입력·궤적 | S2, S3 | slingshot, input, trajectory(미니 Engine) | trajectory 테스트, 최소 당김 미만이면 취소, 발사 시 바디 1개 추가 + 속도 = pull×K | R5, R6 |
| S5 데미지·판정·점수 | S2 (S3/S4와 병렬) | damage, rules, score. session.create 안에 리스너 등록 한 줄 | 스테이지 1 풀이 재생 → CLEAR, 무의미 발사 → FAIL, score 테스트 | R8, R9, R11 |
| S6 씬 머신·UI | S4, S5 | scene-manager, overlays(메뉴·선택·HUD·일시정지·결과), main.ts 연결, `#ui` pointer-events, ESC, visibilitychange, data 속성 | scene 테스트, E2E flow + launch(스테이지 1을 실제 드래그로 클리어) | R2–R4, R12–R17, R24 |
| **게이트 G1** | S6 | — | S6의 E2E 두 개가 통과해야 S7 이후를 시작한다. **기본 동작: 실패하면 넓히는 작업을 시작하지 않고 §6 hop 표에서 끊긴 hop부터 고친다** | — |
| S7 새 능력 | G1 | birds.ts(파랑·노랑·검정) | abilities 테스트: 분열하면 바디 3개, 가속하면 속도 ×2이되 ≤40, 폭발은 반경 안에만 데미지, 새 한 마리당 1회 | R10 |
| S8 재질·돼지·균열 | S5 (S7과 병렬) | 재질·돼지 표 반영, 균열 그리기 | damage 테스트: §4.5 보정 목표(나무 파괴, 돌 생존), 소형 돼지는 쓰러지는 나무에 사망 | R8, R9 |
| S9 저장·해금·별 | S5, S6 (S7/S8과 병렬) | storage.ts, 스테이지 선택의 잠금/별 | storage 테스트, E2E persist | R2, R18, R19 |
| S10 스테이지 2–10 저작 | S7, S8 | stage02–10 + 풀이 | 10개 스테이지 전부 validator·settle·solution·null·별 기준 통과. **§4.2/4.5/4.7/4.8 수치는 여기서 동결** | R1 |
| S11 폴리시 (이름 붙은 단계) | S6, S7 (S10과 병렬) | audio.ts, effects.ts, 직전 궤적, 안내 손가락, 페이드 | fx 테스트: 파괴 50건이 동시에 나도 파티클 ≤300. audio는 node에서 예외 없음. E2E: 음소거가 새로고침 후에도 유지 | R6, R20, R22, R25, R31 |
| S12 최종 게이트 | 전부 | — | §9의 D1–D7 실행 | 전체 |

---

## 6. 끝까지 이어져야 하는 경로 (Load-bearing path)

이 경로가 끊기면 나머지는 전부 장식이 된다. 그 경로는 **드래그 발사 → 충돌 데미지 → 돼지 전멸 → 클리어 결과**다.

| hop | 이름 | 통과 조건 | 조건이 처음 참이 되는 곳 |
|---|---|---|---|
| 1 | 캔버스 `pointerdown` → `Input.onPointerDown` → `Slingshot.grab()` | 캔버스가 이벤트를 받음(`#ui` pointer-events:none, 캔버스 touch-action:none) ∧ `scene === 'PLAYING'` ∧ `phase === 'AIMING'` ∧ `slingshot.state === 'LOADED'` ∧ `viewport.scale > 0` ∧ `dist(screenToWorld(p), bird) ≤ 60` | CSS: S6 `styles.css` / touch-action: S4 / scene: S6 `SELECT_STAGE`의 onEnter / LOADED·AIMING: S2 `StageSession.create` 끝의 `loadNext()`(S4에서 구현) / scale: S3 `Viewport.resize()`를 main.ts 부트에서 첫 프레임 전에 호출 |
| 2 | `pointerup` → `Slingshot.release()` → 바디 생성 → `Composite.add` → `Body.setVelocity(pull×K)` | `slingshot.state === 'DRAGGING'` ∧ 포인터 캡처가 걸려 있음 ∧ `|pull| ≥ 15` | DRAGGING과 캡처: hop 1의 `grab()`(S4) / pull: 사용자 입력 |
| 3 | `GameLoop` 틱 → `Engine.update(engine, 1000/60)` → Matter `collisionStart` | 루프가 돌고 있음 ∧ `scene === 'PLAYING'`(PAUSED가 아님) ∧ 리스너가 **현재 세션의** engine에 등록됨 | 루프: S2 `GameLoop.start()`를 main.ts 부트에서 호출 / 스텝 조건: S6 / 리스너: S5가 `StageSession.create` 안에 추가 |
| 4 | `Damage.onCollision` → HP 감소 → 제거 큐 → `session.flushRemovals()` → `pigsAlive − 1`, 점수 가산 | `session.stepCount ≥ 60` ∧ `impact > 2.0` ∧ `registry.get(body.parent.id)` 존재 ∧ HP ≤ 0 | stepCount: S2 루프가 스텝마다 +1 / registry: S2 world-factory가 바디를 만들 때 등록 / HP: S5·S8 재질 표 |
| 5 | `Rules.afterStep()` → CLEAR_PENDING → 90스텝 → 보너스 → `transition(STAGE_CLEARED)` → 결과 오버레이(별·점수) + 저장 | `pigsAlive === 0` ∧ `resultSent === false` ∧ `scene === 'PLAYING'` | pigsAlive: hop 4의 감소 / resultSent: create에서 false로 초기화(S5) / 오버레이: S6가 data-scene 변화에 반응 |

**콜드 스타트 표**

| 상태·조건 | 처음 진입 시 값 | 바꾸는 주체 | 실행 시점 |
|---|---|---|---|
| `scene` | `'MAIN_MENU'` | `SceneManager.transition` | 부트 초기값. 스테이지 선택·재시작·다음 스테이지 때 `'PLAYING'` (S6) |
| `session` | `null` | `StageSession.create` / `dispose` | PLAYING으로 들어가는 새 스테이지 이벤트의 onEnter (S2, S6) |
| `viewport.scale` | `0` | `Viewport.resize()` | main.ts 부트(첫 rAF 전) + `window.resize` (S3) |
| `#ui` pointer-events | `none`(버튼만 auto) | 정적 CSS | 페이지 로드 (S6) |
| 캔버스 touch-action | `none` | 정적 CSS | 페이지 로드 (S4) |
| `slingshot.state` | `'EMPTY'` | `loadNext` → LOADED, `grab` → DRAGGING, `release`/취소 → EMPTY/LOADED | create 끝, 그 뒤로는 WAITING_NEXT 30스텝 후 (S4, S5) |
| `phase` | `'AIMING'` | `loadNext`, `release`, `Rules.afterStep` | create 끝 (S4), 이후 매 스텝 (S5) |
| `birdQueue` / `birdsLeft` | `stage.birds` 복사 / 길이 | `loadNext`가 shift, `release`가 −1 | create (S2), 발사 (S4) |
| 루프 실행 여부 | `false` | `GameLoop.start()` | main.ts 부트, 씬과 상관없이 계속 (S2) |
| collisionStart 리스너 | 등록 안 됨 | `create`에서 `Events.on`, `dispose`에서 `Events.off(engine)` | 세션마다 1회 (S5, S2) |
| `registry` | 빈 Map | world-factory가 등록, flushRemovals가 삭제 | create (S2), 매 스텝 후 (S5) |
| `stepCount` | `0` | 루프 | PLAYING에서 스텝마다 +1 (S2) |
| 제거 큐 | 빈 배열 | Damage가 넣고 flushRemovals가 비움 | 충돌 이벤트 / `Engine.update` 직후 (S5) |
| `pigsAlive` | `stage.pigs.length` | flushRemovals가 −1 | create (S2), 제거 처리 (S5) |
| `resultSent` | `false` | Rules가 STAGE_CLEARED/FAILED를 보낼 때 `true` | create (S5), CLEAR/FAIL_PENDING 종료 시 (S5) |

---

## 7. 대안과 기각 근거

1. **물리 직접 구현**: 기각. 회전하는 사각형의 적층 안정성(여러 접촉점, 마찰, 반복 해법)이 게임 품질의 핵심인데 가장 어려운 부분이다. **재개 트리거**: 번들 크기 상한(예: 전체 50KB 미만) 같은 새 제약이 생겨 라이브러리를 들일 수 없게 될 때.
2. **planck.js(Box2D JS 포팅)**: 기각. 미터 단위 변환과 API 규모에 비해, 바디 80개 이하에서는 Matter로 충분하다고 가정한다(A1). **재개 트리거**: 반복 횟수 상향과 sleeping+wake 조치 뒤에도 settle 테스트가 2개 이상 스테이지에서 실패하면 `physics/` 계층만 교체한다.
3. **Phaser 3**: 기각. 씬·UI·로더가 DOM 오버레이 설계와 겹치고, 런타임이 matter 단독보다 몇 배 무겁다. **재개 트리거**: 스프라이트 아틀라스, 타일맵, 카메라 추적이 요구에 들어올 때.
4. **PixiJS/WebGL**: 기각. 도형 80개 이하와 파티클 300개 이하는 Canvas 2D로 충분하다. **재개 트리거**: 대상 기기에서 `render()` 구간이 `performance.now` 측정으로 프레임당 8ms를 넘을 때.
5. **캔버스에 직접 그린 UI 버튼**: 기각. 히트 테스트, 포커스, 키보드, E2E 선택자를 전부 직접 만들어야 한다. **재개 트리거**: DOM 오버레이가 캔버스 레터박스와 어긋나는 브라우저가 확인될 때.
6. **Matter.Runner(가변 스텝)**: 기각. 헤드리스 풀이 재생 결과와 브라우저 결과가 달라진다. **재개 트리거**: 고정 스텝 루프가 끊김의 원인이라는 측정이 나올 때.
7. **실행 중 fetch로 불러오는 JSON 스테이지**: 기각. 타입 검사를 잃고 비동기 로딩이 생긴다. **재개 트리거**: 레벨 에디터나 사용자 제작 스테이지가 요구될 때.
8. **점수 기준 클리어**: 기각. 장르 관례상 "돼지 전멸 = 클리어"이고, 점수는 별·최고 기록(R12, R13, R18)으로 build에 남아 있다. **재개 트리거**: 사용자가 점수 도전 모드를 요구할 때.
9. **Matter sleeping 기본 켜기**: 기각. 받침이 제거돼도 잠든 바디가 공중에 떠 있는 현상이 있다. **재개 트리거**: 떨림 때문에 settle 테스트가 실패하고 반복 횟수를 올려도 해결되지 않을 때, "바디 제거 시 전체 wake"와 함께 켠다.
10. **새총 위 새를 정적 바디로 미리 넣고 `setStatic(false)`로 전환**: 기각. 정적↔동적 전환 시 질량·관성 복원 문제를 피하려고 발사하는 순간 바디를 만든다. **재개 트리거**: 새총 위의 새가 다른 물체와 충돌해야 하는 요구가 생길 때.

## 8. 위험과 완화

| 위험 | 징후 | 완화 | 단계 |
|---|---|---|---|
| 구조물이 저절로 무너짐(A1) | settle 테스트 변위 > 3 | 배치 겹침 ≤0.5 검증, 반복 횟수 상향, §7-9 → §7-2 | S2, S10 |
| 터널링 | 새가 블록을 통과 | 속도 상한 40 < 44(§4.5 도출), 블록 최소 두께 20은 검증기가 강제 | S1, S4, S7 |
| 다시하기 누수(리스너·바디가 두 벌) | 반복할수록 데미지 증가 | 세션마다 새 Engine, `Events.off(engine)`, scene 테스트에서 10회 재시작 후 리스너 1개 | S2, S6 |
| 수치 튜닝으로 스테이지가 풀 수 없거나 너무 쉬워짐 | solution 또는 null 테스트 실패 | 두 테스트를 쌍으로 두고 S10에서 동결, 이후 수치를 바꾸면 전체 재통과 필요 | S10 |
| 궤적 예측이 실제와 어긋남 | trajectory 테스트 오차 | 같은 적분기를 쓰는 미니 Engine, `frictionAir: 0` | S4 |
| 오디오 자동재생 차단 | 첫 소리가 안 남 | 첫 사용자 제스처에서 AudioContext 생성·resume | S11 |
| 탭 숨김 뒤 누적 시간 폭주 | 복귀 시 폭발적 움직임 | dt 250ms로 자르기 + 프레임당 5스텝 + 자동 일시정지 | S2, S6 |
| localStorage 예외 | 흰 화면 | try/catch → 메모리 저장소로 대체 | S9 |
| `#ui`가 캔버스 입력을 가로챔 | 드래그가 안 됨 | pointer-events:none(hop 1 조건), E2E launch 테스트 | S6 |
| 터치 스크롤과 pointercancel | 모바일에서 드래그가 끊김 | touch-action:none, pointercancel이 오면 취소 | S4 |
| 상표·저작권(A5) | 공개 배포 시 분쟁 | 원작 명칭·외형 미사용 | 전체 |
| 범위 초과 | 일정 지연 | **절단 순서(미리 정함)**: R31 → R25 → R22의 화면 흔들림 → R6의 직전 궤적. R10은 스테이지 3–10이 의존하므로 자르려면 §4.10을 다시 설계해야 한다. 명세 항목(R1–R9, R11, R14–R17)은 자르지 않는다 | — |

## 9. 완료의 정의

측정 방법: 구현자가 S12에서 아래 명령을 순서대로 실행하고, 각 명령의 종료 코드로 판정한다. 사람이 눈으로 확인하는 항목은 없다.

- **D1** 깨끗한 체크아웃에서 `npm ci` 종료 코드 0 (lockfile 커밋 포함).
- **D2** `npx tsc --noEmit` 종료 코드 0 (strict, noUncheckedIndexedAccess). TypeScript를 쓰는 이유(스키마·상태 유니온 검사)를 이 명령이 보증한다.
- **D3** `npm run build` 종료 코드 0, 그리고 `dist/index.html`이 존재.
- **D4** `npx vitest run` 종료 코드 0. 다음 스위트를 포함한다.
  - validator: `STAGES.length === 10`, 10개 모두 검증 규칙 통과.
  - settle: 스테이지마다 입력 없이 300스텝 → 죽은 돼지 0, 파괴된 블록 0, 동적 바디 최대 변위 ≤ 3단위 〔임의: 블록 최소 두께의 15%〕.
  - solution: 스테이지마다 `solution`을 재생 → 새 예산 안에 RESULT_CLEAR, 점수 ≥ 2★ 기준. 스테이지 1은 pull 성분을 ±3씩 흔든 4가지 변형으로도 클리어(E2E 드래그의 반올림 오차를 견딤).
  - null: 모든 새를 pull (20, 0)으로 발사 → 10개 스테이지 모두 RESULT_FAIL. 실패 경로가 있다는 것과, 약한 사격이나 저절로 무너짐으로는 클리어되지 않는다는 것을 보인다.
  - trajectory: pull 벡터 5개에 대해 예측 위치와 실제 자유비행 위치의 45스텝 최대 오차 ≤ 0.5단위 〔도출: 같은 적분기라 부동소수점 오차 수준이어야 하며, 0.5는 여유분〕.
  - scene: §4.3 표의 모든 행이 기대대로 전이, 표에 없는 조합은 `null`, visibility hidden이면 PLAYING → PAUSED. RESTART 10회 후 collisionStart 리스너 수 = 1, 월드 바디 수 = 새로 로딩한 스테이지의 바디 수.
  - damage, abilities, score, storage(왕복 저장, 깨진 JSON → 기본값, 예외를 던지는 저장소 → 메모리 대체), fx(파티클 ≤ 300).
- **D5** `npx playwright test` 종료 코드 0 (chromium, `vite preview` 서버).
  - flow: `btn-start` → `btn-stage-1` → `data-scene=PLAYING`. `btn-pause`의 중심 x ≥ 게임 영역 x + 0.75×폭, 중심 y ≤ 게임 영역 y + 0.2×높이. 클릭하면 `btn-restart`와 `btn-main`이 보인다. 한 발 쏜 뒤 일시정지 → 다시하기 하면 `data-birds-left=3`, `data-scene=PLAYING`. 일시정지 → 메인으로 하면 `data-scene=MAIN_MENU`이고 HUD가 보이지 않는다.
  - launch: 실제 마우스로 새 중심에서 스테이지 1 풀이의 pull만큼 드래그(월드→화면 변환은 `config.ts` 상수와 캔버스 bounding box로 계산) → 90프레임 안에 `data-phase=FLYING`이 되고 `data-birds-left`가 1 줄어듦 → 20초 안에 `data-scene=RESULT_CLEAR`.
  - persist: 클리어 후 새로고침하면 `btn-stage-2`가 활성화되어 있고 스테이지 1 별 ≥ 1. 음소거 상태가 새로고침 후에도 유지.
- **D6** D5 전체 실행 동안 `console.error`와 `pageerror`가 0건 (Playwright 리스너로 판정).
- **D7** D4의 solution·null·settle이 **같은 커밋에서 동시에** 통과한다. 수치를 바꿔 하나만 통과시키는 것은 완료가 아니다.

---

## 10. 구현자 계약

- **고정 스택**: Node 20 LTS(`engines: ">=20 <23"`), vite 5.4.10, typescript 5.6.3, matter-js 0.20.0, @types/matter-js 0.19.7, vitest 2.1.8, @playwright/test 1.48.2(+ `npx playwright install chromium`). S0에서 `npm view <패키지>@<버전> version`이 각 버전을 출력해야 한다. 출력하지 않는 패키지가 있으면, 같은 minor에서 게시된 가장 높은 버전으로 package.json과 lockfile을 고치고 README에 적는다.
- **재개 트리거(한 줄씩)**: 물리 직접 구현 → 번들 상한 제약이 생기면 / planck.js → Matter 조치 후에도 settle이 2개 이상 스테이지에서 실패하면 / Phaser → 아틀라스·타일맵·카메라 요구가 생기면 / WebGL → render가 8ms를 넘으면 / 캔버스 UI → DOM 정렬 오류가 확인되면 / Runner → 고정 스텝이 끊김 원인으로 측정되면 / JSON 스테이지 → 에디터 요구가 생기면 / 점수 클리어 → 점수 모드 요구가 생기면 / sleeping → 반복 횟수 상향으로도 떨림이 안 잡히면 / 정적 새 → 새총 위 충돌 요구가 생기면. **Matter를 선언만 하고 물리를 직접 짜는 것은 금지다.** `physics/`는 Matter를 import해야 한다.
- **보증 명령**: 스키마·상태 검사는 `npx tsc --noEmit` 종료 코드 0, 정적 배포는 `npm run build` 종료 코드 0, 물리 플레이 가능성은 `npx vitest run` 종료 코드 0, 입력 경로·일시정지 UI는 `npx playwright test` 종료 코드 0.

---

## 11. Frame deviations & habit regressions

- §4.10 스테이지 표는 구성·새 예산·새 요소·바디 상한까지만 정하고 좌표는 S10으로 넘긴다. 콘텐츠 면에서 가장 약한 곳이다. 플레이 가능성은 D4의 settle/solution/null로 강제되지만, "재미있는가"는 이 계획의 어떤 명령도 판정하지 않는다.
- §4.5, §4.7, §4.8의 물리·데미지 수치는 대부분 〔초기값〕이다. 동결 조건(S10 테스트 통과)은 "통과하는 값"을 보증할 뿐 손맛을 보증하지 않는다. 손맛을 판정하는 측정은 만들지 못했다.
- R10(새 4종), R25, R31은 명세에 없는 항목을 "완성" 기준으로 build에 올렸다. 표가 범위를 부풀리는 쪽으로 기울었을 수 있다. §8에 절단 순서는 적었지만, R10은 §4.10이 의존하고 있어서 실제로는 자를 수 없는 항목이 되었다.
- §5의 S0–S6은 번호가 사다리처럼 붙어 있지만 S3과 S5는 서로 독립이다. 선행 열에는 적었지만 번호는 선형이다.
- §4.1에서 Playwright를 들인 것은 작은 게임치고 무겁다는 공격을 받을 수 있다. 그래도 명세③(우측 위치, 두 버튼의 도착 상태)과 §6 hop 1(오버레이의 입력 가로채기)을 명령으로 판정할 수단이 달리 없어서 유지했다.
- §6 경로 표는 작성자가 직접 점검했고, 다른 사람이 배선을 독립적으로 감사하지는 않았다.
