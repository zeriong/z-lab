# Phase 1 — 사실 확인 및 확정 입력

- 확정 입력: npm, single package, lint=`npm run lint`, typecheck=`npm run typecheck` (사용자 요청; package.json:1).
- 직접 전체 읽기: src/greet.js:1은 greet(name)을 내보내며 인사 문자열을 반환한다. 이 파일의 책임은 문자열 생성이다.
- 범위 조사: src의 유일한 파일은 src/greet.js:1이다. 전체 src에서 import/require/fetch/greet/TODO를 검색했고 greet 선언만 발견했다.
- 영향 조사: src 전체와 package.json에서 사용처를 검색했다. package.json:1의 두 검사 명령이 src/greet.js를 참조한다. 현재 조사 범위에서 함수 호출자는 없다.
- 근거 범위: 프레젠테이션/데이터/도메인 계층을 추정하지 않는다. package.json:1은 단일 패키지 검사 설정이다.
- 요청한 단 하나의 규칙: src JavaScript 파일에서 대소문자를 구분하는 리터럴 TODO 부분문자열을 금지한다. 도출 근거는 사용자 요청(request.txt:1)이며, 실제 준수 사례는 src/greet.js:1이다. 발견된 위반은 없다.
- JavaScript 범위는 .js, .mjs, .cjs, .jsx로 명시한다. 주석과 문자열을 포함한 원문 바이트를 검사한다. 소스 심볼릭 링크도 검사한다.
- lint/typecheck 이름과 달리 실제로 둘 다 node --check 구문 검사이다(package.json:1). 타입 의미 분석을 수행한다고 주장하지 않는다.
- 원본 소스 및 AGENTS.md를 수정하지 않는다. 위반 테스트는 별도 폐기 가능한 픽스처에만 작성한다.
- 환경상 루트 .codex와 .agents 생성이 Operation not permitted로 거부되어, 배포 전 산출물을 docs/harness-build/generated에 보관한다. 실제 루트 설치 완료로 간주하지 않는다.
