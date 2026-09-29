# effort-flags-0.1.0 지표

`python3 metrics.py > METRICS.md` 로 생성. 비용은 CLI 자가보고.

## E01 Codex 모델별 effort 단계 (codex-cli 0.157.1)

| 모델 | 기본 | 지원 단계 |
|---|---|---|
| `gpt-6-astra` | medium | low, medium, high, xhigh, max, ultra |
| `gpt-6-sol` | medium | low, medium, high, xhigh, max, ultra |
| `gpt-6-luna` | medium | low, medium, high, xhigh, max |

단계 설명(모델 목록 원문): `low` Fast responses with lighter reasoning · `medium` Balances speed and reasoning depth for everyday tasks · `high` Greater reasoning depth for complex problems · `xhigh` Extra high reasoning depth for complex problems · `max` Maximum reasoning depth for the hardest problems · `ultra` Maximum reasoning with automatic task delegation

## E02 `-c model_reasoning_effort` (인증 없음, 헤더만)

| 값 | 헤더의 `reasoning effort:` | 설정 오류 | 연결 |
|---|---|---|---|
| `xhigh` | xhigh | 없음 | 401 Unauthorized |
| `high` | high | 없음 | 401 Unauthorized |
| `bogus` | bogus | 없음 | 401 Unauthorized |

## E03 `claude -p --effort`

| 조합 | exit | stderr | init model | per_turn_effort_active | 답 | usd |
|---|---|---|---|---|---|---|
| `opus-xhigh` | 0 | — | claude-opus-5-5 | True | ok | 0.015666199999999998 |
| `sonnet-high` | 0 | — | claude-sonnet-5 | False | ok | 0.022671399999999998 |
| `haiku-bogus` | 0 | Warning: Unknown --effort value 'bogus' — ignoring it and using the default effort. Valid values: low, medium, | claude-haiku-4-5-20251001 | False | ok | 0.013223 |
