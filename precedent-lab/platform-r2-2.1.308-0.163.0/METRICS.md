# METRICS — platform r2 (생성: make_metrics.py, 사후 작성)

토큰 출현 기록은 모델에게 보이는 레코드의 유형이다. Claude 는 transcript 의 `type/attachment.type`, Codex 는 rollout 의 `response_item` 이다. 원지표는 각 `summary.json` 에 있다.

| 케이스 | 호스트 | CLI | 모델 | rc | 초 | 비용 USD | 토큰 출현 기록 |
|---|---|---|---|---:|---:|---:|---|
| rB | claude | 2.1.308 | claude-sonnet-5-5 | 0 | 9.2 | 0.0649 | TA: api-request-blob/tool_result, assistant/-, attachment/nested_memory; TC: api-request-blob/-, attachment/instructions |
| rC | claude | 2.1.308 | claude-sonnet-5-5 | 0 | 16.1 | 0.0806 | TC: api-request-blob/-, assistant/-, attachment/instructions; E0start: api-request-blob/-, assistant/-, attachment/hook_additional_context, attachment/hook_success, user/tool_result; E0end: assistant/-, attachment/hook_success, user/tool_result |
| rN | claude | 2.1.308 | claude-sonnet-5-5 | 0 | 7.8 | 0.036 | TC: api-request-blob/-, attachment/instructions |
| rR | claude | 2.1.308 | claude-sonnet-5-5 | 0 | 11.1 | 0.0423 | TA: api-request-blob/tool_result, assistant/-, attachment/nested_memory; TC: api-request-blob/-, assistant/-, attachment/instructions |
| rS | claude | 2.1.308 | claude-sonnet-5-5 | 0 | 6.2 | 0.0604 | TA: api-request-blob/tool_result, assistant/-, attachment/nested_memory; TC: api-request-blob/-, assistant/-, attachment/instructions; TD1: api-request-blob/tool_result, assistant/-, attachment/nested_memory; TD2: api-request-blob/tool_result, assistant/-, attachment/nested_memory |
| rW | claude | 2.1.308 | claude-sonnet-5-5 | 0 | 6.1 | 0.042 | TA: api-request-blob/tool_result, assistant/-, attachment/nested_memory; TC: api-request-blob/-, attachment/instructions |
| xL | codex | 0.163.0 | gpt-6.1-sol | 1 | 2.7 | — | 없음 |
| xN0 | codex | 0.163.0 | gpt-6.1-sol | 1 | 2.7 | — | 없음 |
| xN1 | codex | 0.163.0 | gpt-6.1-sol | 1 | 2.9 | — | 없음 |
| xP | codex | 0.163.0 | gpt-6.1-sol | 1 | 2.9 | — | 없음 |

- Claude 자가보고 비용 합: $0.3262
- Codex 4케이스(x*)는 사용량 한도로 rc=1 실행 오류다. 결과가 아니다(`RUNLOG.md`, 결정 D5).
