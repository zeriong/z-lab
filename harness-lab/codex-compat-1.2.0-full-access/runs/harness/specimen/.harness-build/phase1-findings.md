# 조사 및 확정 입력
- harness:build intake locked: npm, 단일 패키지, lint=`npm run lint`, typecheck=`npm run typecheck`. 사용자 요청 및 package.json:1로 확인.
- src/greet.js:1 전체 직접 읽기: greet 함수는 인사를 반환하는 한 가지 책임을 갖는다.
- src 전체 파일 열거 및 import/require/greet/TODO 검색 완료: src/greet.js:1만 존재하며 import/require 및 TODO는 없다. 추가 레이어나 구조 규칙을 도출할 근거는 없다.
- package.json:1은 실행 설정이며 두 검사 모두 node --check src/greet.js이다. 실제 타입 분석으로 해석하지 않는다.
- request.txt:1 및 사용자 요청에서 유일한 규칙을 도출: src JavaScript 파일에 대소문자를 구분하는 리터럴 TODO 금지. src/greet.js:1은 현재 준수 사례이며 금지 규칙 자체의 근거는 사용자 요청이다.
- 영향 범위: src/greet.js:1의 함수에 소스 내 호출/가져오기 없음; package.json:1의 두 검사가 이 파일을 참조한다. 소스 수정 불필요.
