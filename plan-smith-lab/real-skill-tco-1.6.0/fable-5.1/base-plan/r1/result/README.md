# Angry Birds Web

브라우저용 앵그리버드 스타일 게임. 빌드 없이 `index.html`을 더블클릭(`file://`)해서 연다.
물리 엔진 Matter.js 0.20.0은 CDN(jsDelivr → cdnjs → unpkg 순 fallback)에서 로드하므로 인터넷 연결이 필요하다.

## 조작

- 새총 위 새를 잡아(반경 70px) 당겼다 놓으면 발사. 당기는 동안 예측 점선이 표시된다.
- 비행 중 화면을 탭하면 새 능력 발동: 척(노랑) 가속, 봄(검정) 폭발. 레드는 능력 없음.
- 우상단 `Ⅱ` 버튼 또는 `Esc`: 일시정지(계속하기 / 다시하기 / 메인으로).
- `index.html?unlockall` 로 열면 10개 스테이지가 모두 해금된다(리뷰용).

## 파일

```
index.html
css/style.css
js/config.js     AB.CONFIG   모든 튠 상수
js/levels.js     AB.LEVELS   스테이지 10개
js/storage.js    AB.Storage  localStorage 진행 저장
js/physics.js    AB.World    Matter.js 래퍼, 엔티티, 피해/폭발/제거
js/slingshot.js  AB.Slingshot 조준·발사·궤적 예측
js/effects.js    AB.Effects  파티클·점수 텍스트·폭발 링
js/render.js     AB.Renderer 캔버스 드로잉
js/game.js       AB.Game     상태 머신·턴·점수·클리어 판정
js/ui.js         AB.UI       DOM 화면/오버레이/HUD
js/main.js       부트스트랩·루프·입력 바인딩
```

ES 모듈을 쓰지 않고 클래식 `<script>`를 순서대로 로드하며, 모든 모듈은 전역 `window.AB`에 붙는다.
