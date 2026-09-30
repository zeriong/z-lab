# 앵그리 버드 (웹, 10 스테이지)

외부 의존성 없는 순수 HTML/CSS/JS 게임입니다. `index.html`을 브라우저에서 더블클릭(file://)으로 열면 바로 실행됩니다.

- 조작: 새총의 새를 뒤로 끌었다가 놓아서 발사 / 비행 중 화면을 누르거나 Space → 특수 능력
- 일시정지: 오른쪽 위 ❚❚ 버튼 또는 Esc / P
- 디버그: `index.html?unlock` 으로 열면 모든 스테이지가 해금된 것으로 표시됩니다(저장하지 않음).
- 튜닝 수치는 모두 `js/config.js`에 있습니다.

## 파일 구성

| 파일 | 역할 |
|---|---|
| `index.html` | DOM 뼈대, 스크립트 로드(순서 고정) |
| `style.css` | 레이아웃·버튼·오버레이 |
| `js/config.js` | `AB.CONFIG`, 색상, 재질·블록·돼지·새 정의, 피해 배율 |
| `js/math.js` | 벡터 헬퍼, 월드↔화면 좌표 변환, 결정적 난수, 숫자 포맷 |
| `js/physics.js` | 원·박스 강체 물리 (Box2D-Lite 방식) |
| `js/stages.js` | 10개 스테이지 데이터 |
| `js/storage.js` | 진행도 저장(localStorage) |
| `js/level.js` | 스테이지 게임 로직(피해·파괴·폭발·새·턴·점수·판정) |
| `js/renderer.js` | Canvas 2D 그리기 |
| `js/input.js` | 포인터·키보드 입력 |
| `js/ui.js` | 화면 전환, HUD, 스테이지 선택, 결과 패널 |
| `js/game.js` | 상태 머신, 화면 스케일링, 메인 루프, 부트스트랩 |
