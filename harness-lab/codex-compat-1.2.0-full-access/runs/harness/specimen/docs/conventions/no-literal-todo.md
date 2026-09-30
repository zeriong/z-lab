# src JavaScript 파일의 리터럴 TODO 금지

## 검색 키워드
TODO, src, JavaScript, greet, no-literal-todo, review-gate, P2

## 도출 근거 및 범위
사용자 요청(request.txt:1)이 규칙의 근거다. src/greet.js:1은 현재 적용 대상이자 준수 사례다.
src/ 아래 .js, .jsx, .mjs, .cjs 파일 전체에 대소문자를 구분하는 연속된 ASCII 문자열 `TODO`가 없어야 한다. 주석, 문자열, 식별자도 포함한다. 추적 여부 및 Git diff에 관계없이 검사한다.

## Worse case
현재 저장소에는 실제 위반 사례가 없다(src/greet.js:1 전체 확인). 가상의 위반 코드를 저장소 사례로 제시하지 않는다. 의도적 위반 검증은 별도 임시 fixture에서 수행한다.

## Better case — 실제 코드
src/greet.js:1:
```js
export function greet(name) { return `Hello, ${name}`; }
```
리터럴 금지 표식이 없으므로 규칙을 준수한다. 소스 변경은 필요하지 않다.

## Gate hook
- `.codex/scripts/review-gate.sh --mode=refs-only --rule=no-literal-todo`
- 실제 검사: Python으로 src를 재귀 순회하고 확장자가 .js/.jsx/.mjs/.cjs인 파일 바이트에 `b'TODO' in data`를 적용한다.
- 탐지: P2, exit 1. 정상 exit 0, 잘못된 인자나 검사 불능 exit 2.
- full 모드는 추가로 `npm run lint`, `npm run typecheck`를 실행한다.
