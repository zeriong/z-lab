# no-literal-todo

사용자 요청(request.txt:1)에서 도출했다. src/greet.js:1은 준수 사례이며 발견된 기존 위반은 없다.
검사 대상: src 아래 .js, .mjs, .cjs, .jsx 파일. 바이트 부분문자열 b"TODO"를 대소문자 구분하여 검사한다.
주석/문자열/식별자/긴 단어 안에서도 정확한 리터럴이 존재하면 P2 위반이다. 인코딩 해제 없이 파일 전체를 검사한다.
심볼릭 링크를 따라가며 같은 디렉터리는 한 번만 검사한다. 읽기 오류는 통과가 아닌 환경 오류다.

`.codex/scripts/review-gate.sh --mode=refs-only --rule=no-literal-todo`

종료 코드: 0=통과, 1=규칙 또는 정적 검사 실패, 2=인자/환경/읽기 오류.
`--mode=full`은 추가로 npm run lint 및 npm run typecheck를 실행한다.
전체 소스 검사이므로 --base 또는 Git diff에 의존하지 않는다.
실제 예시는 docs/conventions/no-literal-todo.md를 참조한다.
