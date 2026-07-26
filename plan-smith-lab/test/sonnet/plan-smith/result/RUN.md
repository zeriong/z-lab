# RUN

1. **스택**: 바닐라 JavaScript + Canvas 2D 렌더링 + Matter.js(물리 엔진, `js/vendor/matter.min.js`로 로컬 벤더링, CDN 미사용) + `localStorage`(스테이지 진행/별점 저장). 빌드 도구/번들러 없음 — `<script>` 태그로 전역 네임스페이스(`window.Physics`, `window.State` 등)를 직접 연결.
2. **빌드 명령**: none (정적 파일이라 빌드 불필요. `js/vendor/matter.min.js`는 `npm install matter-js` 후 `node_modules/matter-js/build/matter.min.js`를 1회 복사해 벤더링한 것 — 서빙 시점엔 npm/node_modules가 전혀 필요 없음)
3. **서빙할 정적 디렉토리**: `.` (이 폴더 자체가 루트: `index.html`이 최상위에 있음). 임의의 정적 서버로 열면 됨. 예: `python3 -m http.server 8080` 을 이 디렉토리에서 실행 후 `http://localhost:8080/index.html` 접속.
4. **조작법**: 새총 위 새를 마우스로 눌러 드래그(당기기) 후 놓으면 발사됩니다. 점선은 예상 궤적이며, 화면 우측 상단의 `❚❚` 버튼이 일시정지 버튼입니다(클릭 시 계속하기/다시하기/메인으로 오버레이 표시).
