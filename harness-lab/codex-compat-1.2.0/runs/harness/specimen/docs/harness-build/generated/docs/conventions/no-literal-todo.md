# src JavaScript 파일의 리터럴 TODO 금지

## Index keywords
TODO, src, JavaScript, greet, name, Hello, no-literal-todo, refs-only

## Worse case
현재 저장소에서 발견한 실제 위반은 없다. src/greet.js:1에 없는 위반을 기존 코드처럼 만들거나 인용하지 않는다.
리터럴 TODO가 src JavaScript 파일에 존재하면 사용자 요청(request.txt:1)에 위배된다.
의도적인 위반 샘플은 별도 폐기 가능한 검증 픽스처에만 생성하며 원본에는 넣지 않는다.

## Better case — 실제 저장소 인용
src/greet.js:1:
```js
export function greet(name) { return `Hello, ${name}`; }
```
원문에 금지 리터럴이 없으므로 준수한다. 코드 변경을 제안하지 않는다.

## Gate hook
- `.codex/scripts/review-gate.sh --mode=refs-only --rule=no-literal-todo`
- 실제 검사: src 아래 .js/.mjs/.cjs/.jsx 파일마다 `b"TODO" in path.read_bytes()`.
- 주석 및 문자열 포함, 대소문자 구분, 전체 소스 검사. 심볼릭 링크 포함.
- 발견 시 P2, exit 1. 환경/읽기 오류는 exit 2.
- full 모드: `npm run lint`, `npm run typecheck` 추가 실행. package.json:1에서 둘 다 구문 검사임을 확인했다.
