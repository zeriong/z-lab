# METRICS — platform-2.1.306-0.163.0 (생성: make_metrics.py)

판정 = SPEC 「읽는 법」: 기록(모델에게 보이는 렌더/대화 이력)에서 시작·끝 토큰이 모두 나오면 전달, 시작만 나오면 잘림, 없으면 누락. 답변 `SEEN:` 은 보조이며 엇갈리면 둘 다 적는다.
기록 칸은 「시작 토큰 / 끝 토큰」 출현 수다. Claude 는 두 설정 루트가 같은 디렉터리를 가리켜 같은 레코드가 2회 셀 수 있다.

| 케이스 | 호스트 | 출력 이벤트 | N자 | 판정 | 답변 SEEN | 기록 시작/끝 | 발화한 이벤트:도구 · cwd 꼬리 | 모델 | 초 |
|---|---|---|---:|---|---|---|---|---|---:|
| cR1 | claude 2.1.306 | PostToolUse | 400 | **전달** | 시작·끝 | 2/2 | PostToolUse:Read · cwd / | claude-sonnet-5-5 | 7.9 |
| cB1 | claude 2.1.306 | PostToolUse | 400 | **전달** | 시작·끝 | 2/2 | PostToolUse:Bash · cwd / | claude-sonnet-5-5 | 15.8 |
| cF1 | claude 2.1.306 | PostToolUse | 400 | **미발화** | 없음 | 0/0 | PostToolUseFailure:Bash · cwd / | claude-sonnet-5-5 | 12.0 |
| cF1 | claude 2.1.306 | PostToolUseFailure | 400 | **전달** | 시작·끝 | 2/2 | PostToolUseFailure:Bash · cwd / | claude-sonnet-5-5 | 12.0 |
| cD1 | claude 2.1.306 | PostToolUse | 400 | **전달** | 시작·끝 | 2/2 | PostToolUse:Bash · cwd /src | claude-sonnet-5-5 | 13.0 |
| cE1 | claude 2.1.306 | PostToolUse | 400 | **전달** | 시작·끝 | 2/2 | PostToolUse:Edit, PostToolUse:Read · cwd / | claude-sonnet-5-5 | 13.0 |
| cS1 | claude 2.1.306 | PostToolUse | 400 | **전달** | 시작·끝 | 2/2 | PostToolUse:Read · cwd / · agent ab521f0d187d85b12 | claude-sonnet-5-5 | 14.1 |
| cC1 | claude 2.1.306 | PostToolUse | 9,990 | **전달** | 시작·끝 | 2/2 | PostToolUse:Read · cwd / | claude-sonnet-5-5 | 6.4 |
| cC2 | claude 2.1.306 | PostToolUse | 10,050 | **잘림** | 시작·끝 | 2/0 | PostToolUse:Bash, PostToolUse:Read · cwd / | claude-sonnet-5-5 | 18.4 |
| cU1 | claude 2.1.306 | UserPromptSubmit | 9,990 | **전달** | 시작·끝 | 2/2 | UserPromptSubmit:None · cwd / | claude-sonnet-5-5 | 4.1 |
| cU2 | claude 2.1.306 | UserPromptSubmit | 10,050 | **잘림** | 시작·끝 | 2/0 | UserPromptSubmit:None · cwd / | claude-sonnet-5-5 | 9.8 |
| xB1 | codex 0.163.0 | PostToolUse | 400 | **전달** | 시작·끝 | 2/2 | PostToolUse:Bash · cwd / | gpt-6.1-sol | 12.7 |
| xF1 | codex 0.163.0 | PostToolUse | 400 | **전달** | 시작·끝 | 2/2 | PostToolUse:Bash · cwd / | gpt-6.1-sol | 11.6 |
| xE1 | codex 0.163.0 | PostToolUse | 400 | **전달** | 시작·끝 | 2/2 | PostToolUse:Bash, PostToolUse:apply_patch · cwd / | gpt-6.1-sol | 35.0 |
| xC1 | codex 0.163.0 | PostToolUse | 9,990 | **전달** | 없음 | 1/1 | PostToolUse:Bash · cwd / | gpt-6.1-sol | 24.1 |
| xC2 | codex 0.163.0 | PostToolUse | 10,050 | **전달** | 시작·끝 | 2/2 | PostToolUse:Bash · cwd / | gpt-6.1-sol | 16.7 |
| xC3 | codex 0.163.0 | PostToolUse | 30,000 | **전달** | 시작·끝 | 2/2 | PostToolUse:Bash · cwd / | gpt-6.1-sol | 16.4 |
| xU1 | codex 0.163.0 | UserPromptSubmit | 400 | **전달** | 시작·끝 | 2/2 | UserPromptSubmit:None · cwd / | gpt-6.1-sol | 6.1 |

- Claude 자가보고 비용 합: $1.0335
- Codex 사용량 합(`turn.completed` usage, 자가보고): {"input_tokens": 218928, "cached_input_tokens": 185728, "cache_write_input_tokens": 0, "output_tokens": 853, "reasoning_output_tokens": 176}
