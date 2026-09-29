# effort-flags-0.1.0 발견

지표: [`METRICS.md`](METRICS.md)(생성물) · 원본: `runs/`. 실행 2026-09-28, 7 단위 전부 DONE. Codex 계정 사용 0회(E02는 인증 없음), Claude 3회.

## 측정한 것

| ID | 관측 | 근거 |
|---|---|---|
| E1 | Claude CLI의 `--effort` 는 `low, medium, high, xhigh, max` 다섯 단계이고 `xhigh` 는 `max` 바로 아래다. `-p` 에서 `--model opus --effort xhigh`, `--model sonnet --effort high` 모두 exit 0 | E03, `claude --help` |
| E2 | Claude는 모르는 effort 값을 **경고하고 무시한다**("Unknown --effort value 'bogus' — ignoring it and using the default effort") — 실패하지 않으므로 오타는 기본값으로 조용히 돈다(stderr에만 남는다) | E03 `haiku-bogus` |
| E3 | Codex `gpt-6-sol` 은 `low, medium, high, xhigh, max, ultra` 를 받는다. 모델 목록의 설명상 `xhigh` 는 "Extra high reasoning depth", `max` 는 "Maximum", `ultra` 는 "Maximum reasoning with automatic task delegation" — 즉 `ultra` 는 `max` 위에 위임이 붙은 단계다. `gpt-6-luna` 는 `max` 까지 | E01 |
| E4 | 따라서 Claude `xhigh` 와 같은 자리(최상위 바로 아래, 위임 없음)는 Codex에서도 `xhigh` 다 | E1 + E3 |
| E5 | `-c model_reasoning_effort="xhigh"` 는 실행 헤더에 `reasoning effort: xhigh` 로 반영된다. 그러나 `bogus` 도 로컬 설정 검사(`--strict-config`)를 통과해 헤더에 그대로 찍힌다 — Codex는 이 값을 로컬에서 검증하지 않는다 | E02 |
| E6 | Claude Code 공식 문서의 서브에이전트 frontmatter 키(`name`, `description`, `tools`, `model`, `permissionMode`, `maxTurns`, `memory`, `skills`, `isolation`)에 effort가 없고, Agent 도구에도 effort 인자가 없다 — 네이티브 서브에이전트로는 워커의 effort를 `high` 로 고정할 수 없다 | E04: code.claude.com/docs/en/sub-agents.md, tools.md |

## 해석

- 리뷰어 두 명을 "같은 깊이"로 맞추려면 두 CLI 모두 `xhigh` 를 명시한다. 워커는 `high`.
- Claude Code 호스트에서도 워커·리뷰어를 `claude -p … --effort` CLI 형태로 띄워야 effort가 고정된다(E6).
- 두 CLI 모두 잘못된 값을 막지 않으므로(E2, E5) 값은 문서에 정확한 철자로 적고, Claude는 stderr의 경고를 확인한다.

## 측정하지 않은 것

effort가 실제 추론 깊이·리뷰 품질·비용에 주는 영향, 서버가 잘못된 Codex effort 값을 어떻게 처리하는지, `per_turn_effort_active`
필드의 의미(opus `True`, sonnet·haiku `False` 로 관측만 했다). CLI 문서(cli-reference)는 `--effort` 값에 `ultracode` 도 적고 있으나
2.1.283의 `--help` 에는 없다 — 여기서는 `--help` 를 따랐다.
