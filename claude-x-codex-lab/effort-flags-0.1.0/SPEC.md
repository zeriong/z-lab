# effort-flags-0.1.0 — 리뷰어·워커의 effort를 두 CLI에서 어떻게 고정하나 (실행 전 고정)

## 왜

사용자 결정(2026-09-28): 상호 리뷰는 Claude Code가 Opus, Codex가 `gpt-6-sol`, 두 리뷰어 모두 "중상" effort — Claude의 `xhigh` 와
같은 등급 — 로, 작업 에이전트(워커)는 `high` 로. 문서에 적기 전에 각 CLI가 그 값을 받는지, 어떻게 확인되는지 잰다.

## 설계 (고정)

| ID | 질문 | 방법 | 모델 호출 |
|---|---|---|---|
| E01 | Codex 모델별 지원 effort 단계 | `codex debug models` 의 `supported_reasoning_levels` (로컬 목록) | 없음 |
| E02 | `-c model_reasoning_effort=<v>` 가 실행 설정에 반영되나, 잘못된 값은 거부되나 | 인증 없는 임시 `CODEX_HOME` 에서 `codex exec --strict-config -m gpt-6-sol` 를 `xhigh`·`high`·`bogus` 로 실행하고 헤더의 `reasoning effort:` 줄을 본다(연결은 401로 실패) | 없음(계정 미사용) |
| E03 | `claude -p --effort` 가 문서에 적을 조합을 받나 | `--model opus --effort xhigh`, `--model sonnet --effort high`, 그리고 잘못된 값 `--model haiku --effort bogus`. 공통 `--setting-sources project --tools "" --max-turns 1`, 프롬프트 "Reply with the single word ok." | 3회 |
| E04 | Claude Code 서브에이전트 정의나 Agent 도구 호출로 effort를 정할 수 있나 | 공식 문서 확인(sub-agents, tools, cli-reference) — 실행 아님 | 없음 |

Codex 계정은 사용자 확인 전이라 모델을 부르는 Codex 호출은 하지 않는다.

## 측정하지 않는 것

effort가 실제 추론 깊이·품질·비용에 주는 영향, Codex가 서버에서 잘못된 effort 값을 어떻게 처리하는지.
