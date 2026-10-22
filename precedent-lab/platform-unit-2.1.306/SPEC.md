# SPEC — platform-unit: Claude Code 2.1.306 additionalContext 상한의 단위 (2026-10-22 고정)

실행 시작 전에 고정한다. 바꾸면 새 실험이다(제3조).

## 왜

`../platform-2.1.306-0.163.0/` P3 에서 9,990자는 통째로 전달됐고, 10,050자는 파일로 저장된 뒤 미리보기만 갔다.
그 채움 문장은 전부 ASCII 였다. ASCII 는 1자 = 1바이트라서, 상한이 글자 기준인지 바이트 기준인지 가를 수 없다.
한글은 UTF-8 에서 1자 = 3바이트다. 그래서 상한이 바이트 기준이면 한국어 결정 기록 약 3,300자에서 잘리기 시작한다. 그러면 플러그인 계획의 「본문 ≤6,000자 · 총 <10,000자」 규칙은 한국어 기록을 지키지 못한다.

## 질문

- U1. 한글 4,000자(약 12,000바이트) PostToolUse additionalContext 는 통째로 전달되는가.
- U2. 한글 9,990자(약 30,000바이트)는 통째로 전달되는가.
- U3. 한글 4,000자 UserPromptSubmit 은 통째로 전달되는가.

## 고정 조건

- `../platform-2.1.306-0.163.0/` 와 같다.
  - fixture: 새 레포 · `src/alpha.ts`
  - 실행: `claude -p … --model sonnet --setting-sources project --permission-mode bypassPermissions --output-format stream-json --verbose --include-hook-events --max-turns 8 --max-budget-usd 1`
  - 판정 기록: transcript `hook_additional_context` 의 `rendered`
- 그 실험의 `run.py` 함수(fixture·설정·실행·transcript 수집)를 import 해 쓴다. 다른 점은 채움 문장 하나다.
  - 채움 문장은 공백 없는 한글 `도착주입확인용채움문장` 의 반복이다(1자 = 3바이트).
  - 시작·끝 토큰 `ZQ-<8 hex>` 는 ASCII 다.
  - probe 훅은 이 폴더의 `probe_hook.py` 이고, 채움 문장을 `case.json` 의 `filler` 에서 읽는다.
- 케이스당 1런이다.

## 케이스

| 케이스 | 출력 이벤트 | 글자 수 | 행동 |
|---|---|---:|---|
| uK1 | PostToolUse · Read | 4,000 | Use the Read tool to read src/alpha.ts. |
| uK2 | PostToolUse · Read | 9,990 | 같음 |
| uK3 | UserPromptSubmit | 4,000 | Reply with ok. |

프롬프트 꼬리는 앞 실험과 같다(`SEEN:` 줄).

## 읽는 법 (실행 전 고정)

- **통째 전달**: 렌더에 시작·끝 토큰이 모두 있고 `persisted-output` 이 없다.
- **상한 초과**: 렌더에 `persisted-output` 이 있다.
- 단위 판정
  - uK1 이 통째 전달이면 「상한은 10,000바이트 기준이 아니다」.
  - uK1 이 상한 초과이면 「바이트(또는 바이트에 가까운 단위) 기준일 수 있다」. 이때는 ASCII 결과와 함께 경계를 다시 잰다.
  - uK2 는 글자 기준 가설의 확인용이다.
- 렌더된 글자 수와 바이트 수를 함께 적는다.

## 측정하지 않는 것

- 토큰 기준 여부, 다른 이벤트, 다른 CLI 버전, 정확한 경계값.
