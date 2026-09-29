# hook-injection-2.1.283 — 플러그인 훅은 자동 로드되나, 선언하면 두 번 로드되나 (실행 전 고정)

## 왜 따로 하나

[`../claude-code-2.1.283/`](../claude-code-2.1.283/) 의 P04는 같은 질문을 n=1, 짧은 훅 출력(`echo HOOK-MARK-<arm>`)으로 쟀다.
Claude Code 2.1.283의 stream-json은 UserPromptSubmit 훅 이벤트를 내보내지 않아서 입력 토큰 차이로만 볼 수 있었는데,
그 차이(약 27토큰)가 같은 조건 반복의 흔들림(약 10토큰)과 비슷해 판정이 약했다. 고정된 P04를 고치지 않고
(z-lab 제3조), 출력을 키우고 반복을 늘린 새 실험으로 분리한다.

## 설계 (고정)

- 최소 플러그인 `probe` 세 변형. 훅은 UserPromptSubmit에서 고정 문자열(약 1,500자, `HOOK-BLOCK` 30회 반복 문장)을 출력한다.
  - `declared` — `hooks/hooks.json` + `plugin.json` 에 `"hooks": "./hooks/hooks.json"`
  - `undeclared` — `hooks/hooks.json` 만 (`plugin.json` 에 필드 없음)
  - `none` — 훅 없음 (대조군)
- 호출: `claude -p 'Reply with the single word ok.' --setting-sources project --plugin-dir <변형> --tools "" --model haiku --max-turns 1`
- arm당 3회. 관측: 결과 이벤트의 입력 토큰(input + cache_creation + cache_read), CLI 보고 비용.
- 판정: `none` 대비 증가량 Δ. 훅이 1회 주입되면 `declared` ≈ `undeclared` ≈ Δ, 2회면 `declared` ≈ 2Δ, 로드 안 되면 ≈ 0.

## 측정하지 않는 것

대화형 세션, 다른 훅 이벤트(PreToolUse 등), 여러 플러그인이 같은 훅을 가질 때.
