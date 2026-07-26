# 웹 브라우저 앵그리버드 게임 — 실행 안내

## ① 스택
TypeScript + Vite + Matter.js(물리 엔진) + Canvas 2D(커스텀 렌더러). 클라이언트 전용 정적 웹앱(백엔드 없음).

## ② 빌드 명령
```
npm install
npm run build
```
(타입 검사는 빌드와 분리: `npm run typecheck` — 빌드 성공에 영향 없음)

## ③ 서빙할 정적 디렉토리
`dist`  (index.html이 루트에 있는 정적 산출물. 예: `dist/` 를 정적 서버로 서빙)

빌드 없이 확인만 하려면 이미 생성된 `dist/`를 그대로 서빙하면 된다.
```
python3 -m http.server 8080 --directory dist
# http://localhost:8080
```

## ④ 조작법
새(빨간 원)를 마우스로 누른 채 당겼다가 놓아 발사한다. 당기는 동안 하얀 점선이 예상 궤적을 보여준다. 모든 돼지를 제거하면 클리어, 새를 다 쓰고도 돼지가 남으면 실패. 우측 상단의 일시정지 버튼(❚❚)을 누르면 이어하기 / 다시하기 / 메인으로 오버레이가 뜬다.

## 구조
- `src/types.ts` — 상수·물리 튜닝값·재질 테이블·스테이지 타입
- `src/stages.ts` — 10개 스테이지 데이터(데이터 기반 레이아웃)
- `src/game.ts` — Matter.js 물리, 상태 머신(MENU→PLAYING→PAUSED→CLEAR/FAIL), 슬링샷 입력, 충돌·파괴, 클리어/실패 판정, StageManager, localStorage 진행 저장
- `src/render.ts` — Canvas 2D 커스텀 렌더러(하늘·지형·새총·새·돼지·블록·궤적)
- `src/ui.ts` — HTML/CSS 오버레이(메인 메뉴, HUD의 우측 일시정지 버튼, 일시정지·클리어·실패 패널)
- `src/style.css` — 스타일

## 참고: 자동 검증용 디버그 플래그(일반 플레이에는 영향 없음)
- `?selftest` — 10개 스테이지 로딩 + 슬링샷 클리어 체인 + 실패 판정을 헤드리스로 자가 검증하고 결과를 document.title에 기록
- `?demo=N` — N번 스테이지로 바로 진입 (`&pause`를 붙이면 일시정지 오버레이 표시)
- `window.__debug` — loadStage/fire/aimAt/tick 등 콘솔 디버그 훅
