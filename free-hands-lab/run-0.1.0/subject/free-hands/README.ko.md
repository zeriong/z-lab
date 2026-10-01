<p align="center"><strong>free-hands</strong></p>

<p align="center"><strong>에이전트에게 유한한 목표를 주면 체크리스트를 질문하거나 멈추지 않고 처리합니다.</strong></p>

<p align="center"><a href=".claude-plugin/plugin.json"><img src="https://img.shields.io/badge/version-0.1.0-blue" alt="버전"></a> <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="라이선스: MIT"></a> <a href="https://docs.claude.com/en/docs/claude-code/plugins"><img src="https://img.shields.io/badge/Claude%20Code-Plugin-orange" alt="Claude Code 플러그인"></a></p>

<p align="center"><a href="#시작하기">시작하기</a> &bull; <a href="#목표-파일">목표 파일</a> &bull; <a href="#묻지-않기">묻지 않기</a> &bull; <a href="#훅">훅</a> &bull; <a href="#패널">패널</a> &bull; <a href="#누적-pr">누적 PR</a> &bull; <a href="#한계와-상태">한계와 상태</a> &bull; <a href="#codex">Codex</a> &bull; <a href="#요구사항">요구사항</a> &bull; <a href="#설치">설치</a></p>

<p align="center"><a href="README.md">English</a> &bull; <a href="README.ko.md">한국어</a> &bull; <a href="README.ja.md">日本語</a> &bull; <a href="README.zh-CN.md">简体中文</a> &bull; <a href="README.zh-TW.md">繁體中文</a></p>

<p align="center"><sub><a href="../../README.ko.md">because-i-needed</a>의 일부</sub></p>

---

free-hands는 목표를 유한하고 확인 가능한 체크리스트로 고정한 뒤, 열린 항목을 사용자에게 묻거나 멈추지 않고 처리합니다. 사용자가 결정할 사안이 생기면 읽기 전용 패널의 다섯 역할이 의견을 내고, 메인 에이전트가 증거로 결정하고, 그 결정과 반대 의견, 되돌리는 방법을 기록합니다.

## 시작하기

- Claude Code: `/free-hands:run <목표>`
- Codex: `$free-hands:run <목표>`
- 프롬프트에 **free-hands**라는 단어를 넣어 시작할 수도 있습니다. 첫 응답으로 사용자 언어의 진입 질문 하나가 나옵니다. 예라고 답하면 해당 목표로 스킬을 시작하고, 아니요라고 답하면 가능한 방향을 제안하고 그 차례를 끝냅니다. 이름을 설명하거나 인용한 언급은 실행 요청으로 보지 않습니다. 목표가 활성화된 동안 다시 “free-hands”라고 하면 확인을 묻지 않고 진행 방식을 바로잡습니다.

## 목표 파일

저장소 루트에 `.free-hands/goal.md`를 두고, Git의 로컬 제외 파일에 `.free-hands/`를 추가합니다. 목표, 유한한 체크리스트, 결정 기록과 재개 메모가 들어갑니다.

```markdown
status: active
max_iterations: 40
iterations: 0
## Goal
<한 문장 목표>
## Checklist
- [ ] <완료 여부를 확인할 수 있는 유한한 항목>
## Decisions
## Resume
<다음 세션에 필요한 내용>
```

표시는 `- [ ]` 미완료, `- [x]` 완료, `- [-] … — needs the user` 하드 리밋이나 다른 장애물로 진행할 수 없는 항목입니다. 상태는 `active`, `done`, `waiting`, `paused`입니다. 미완료 `[ ]` 항목만 질문·중단 가드를 작동시킵니다. 모두 완료되면 `done`, 사용자 처리가 필요한 항목만 남으면 `waiting`을 기록합니다. `max_iterations` 40회에 도달하면 복원 메모가 `paused` 설정, 미완료 항목 보고, 중단을 지시하며 질문이 다시 허용됩니다.

## 묻지 않기

목표가 활성 상태인 동안 스킬은 사용자에게 묻지 않습니다. 프로젝트와 다른 스킬의 질문 규칙, claude-x-codex 같은 워크플로의 승인 게이트도 이 규칙으로 덮어씁니다. 에이전트는 묻지 않고 브랜치를 푸시하고 PR을 생성합니다. 실패한 테스트·게이트·훅·리뷰는 수정하거나 사용자 처리가 필요하다고 `- [-]`로 표시하며, 통과한 것으로 바꾸지 않습니다. 다른 플러그인의 훅은 계속 동작합니다.

## 훅

훅마다 동작 조건이 다릅니다.

- 질문·중단 가드는 목표가 `active`이고 미완료 `[ ]` 항목이 있으며 `max_iterations` 미만일 때만 동작합니다. 질문 가드는 질문 도구를 거부합니다. 한도에 도달하면 질문이 허용됩니다. Stop 훅은 중단을 막기 전에 반복 횟수를 디스크에 기록하며 최대 40회까지 이어갑니다.
- 복원 메모(`UserPromptSubmit`, `SessionStart`)는 목표가 `active`인 동안 전달되며 `[ ]` 항목이 없어도 동작합니다.
- 진입 메모는 활성 상태의 올바른 목표가 없고 프롬프트에 “free-hands”가 있을 때 전달됩니다.

잘못된 훅 입력은 아무 효과도 내지 않습니다. 목표 파일이 잘못됐거나 읽을 수 없으면 복원·질문·중단 동작은 활성화되지 않습니다. 프롬프트에 “free-hands”가 있으면 프롬프트 훅은 활성 목표가 없는 경우의 진입 경로를 따라 진입 질문을 낼 수 있습니다. 쓰기 실패와 잠금 시간 초과도 효과가 없어 도구 호출이나 중단이 진행됩니다.

## 패널

다섯 역할은 1라운드에서 같은 브리프를 독립적으로 검토합니다. 2라운드는 1라운드 의견이 갈릴 때만 진행합니다. 누락되거나 유효하지 않은 답변은 한 번 재시도하며, 유효 답변이 세 개 미만이면 **panel degraded**로 표시하고 메인 에이전트가 단독 결정합니다. 최신 모델을 확인할 수 없는 역할은 대체 모델 없이 건너뛰고 누락으로 셉니다. Claude Code에서 `ANTHROPIC_DEFAULT_<FAMILY>_MODEL` 리디렉션이 있으면 해당 family의 역할을 사용할 수 없습니다. 메인 에이전트는 핵심 주장을 확인하고 표결이 아닌 증거로 결정합니다. 저장소나 실행에서 확인한 사실, 출처가 있는 근거, 추론 순으로 판단하며 각 의견, 반대 의견, 결정과 되돌리는 방법을 기록합니다.

| 역할 | 중점 | Claude 모델 계열 |
|---|---|---|
| `quick-thinker` | 빠른 제일 원칙 판단 | `sonnet` |
| `deep-thinker` | 결과, 예외 상황, 2차 영향 | `opus` |
| `evidence-hunter` | 문서와 소스 근거 | `sonnet` |
| `trend-tracker` | 날짜가 있는 최신 변화 | `sonnet` |
| `devils-advocate` | 선두 선택지에 대한 가장 강한 반론 | `opus` |

각 역할은 해당 계열에서 사용 가능한 최신 모델을 사용합니다. Claude Code의 Agent 도구는 실제 실행 모델 ID를 보여 주지 않으므로 resolver가 반환한 family alias와 “id not visible”을 기록합니다. Codex에서는 자식 실행에서 보고한 모델을 기록합니다.

## 누적 PR

첫 PR은 저장소의 integration 브랜치를 대상으로 합니다. 모든 PR 제목 끝에 실행 내에서 증가하는 번호 ` (n)`을 붙이고, 이후 PR은 이전 브랜치를 기반으로 합니다. 사용자는 누적 순서대로 PR을 병합합니다. 앞선 PR이 병합되면 에이전트는 필요한 경우 다음 PR의 대상을 integration 브랜치로 바꾸고, 뒤의 각 브랜치에 `origin/<integration>`을 병합해 푸시합니다. 막힌 batch를 건너뛰지 않으므로 누적 순서가 병합 순서입니다.

## 한계와 상태

패널이 단일 에이전트보다 더 나은 결정을 내린다는 주장은 **측정되지 않은 가설**입니다. 양쪽 호스트에서 훅과 패널을 측정할 z-lab 시리즈는 **계획 중**입니다: [z-lab `free-hands-lab/run-0.1.0`](https://github.com/zeriong/z-lab/tree/main/free-hands-lab). 결과는 추후 공개됩니다.

다음은 스킬과 복원 메모가 에이전트에게 주는 규칙입니다. 어떤 훅도 해당 명령을 막지 않습니다.

- PR을 병합하거나 기본 브랜치에 무엇이든 병합하지 않습니다.
- 저장소 밖 파일, 데이터, 원격 브랜치, 데이터베이스를 되돌릴 수 없게 삭제하지 않습니다.
- 배포, 공개, 외부 전송(릴리스·패키지 공개·이메일·메시지 포함)을 하지 않습니다.

해당 항목은 사유와 함께 `- [-]`로 표시하고 다른 작업을 계속합니다. 이미 푸시한 브랜치의 강제 푸시는 한 줄로 알린 뒤 허용됩니다.

“pause”, “stop” 또는 **“일시정지”**라고 말하면 일시정지합니다. 목표에 `paused`를 기록하고 명령을 다시 실행하면 재개합니다.

기원: 프로젝트 내부 스킬을 이식했습니다.

## Codex

자동 적용에 앞서 `/hooks`에서 플러그인 훅을 신뢰하세요. 질문 훅 matcher에는 `request_user_input`이 포함되어 있지만 Codex에서 거부가 전달되는지는 아직 측정하지 않았습니다. Codex 기본 모드에는 질문 도구가 없으므로 계속 작업 규칙은 Stop 훅이 담당합니다. 훅을 신뢰하거나 활성화하지 않아도 스킬의 규칙은 따르지만 훅 동작은 꺼져 있을 수 있습니다. 패널은 읽기 전용으로 제한할 수 있을 때만 native subagent를 사용하고, 그렇지 않으면 역할마다 `codex exec -s read-only` 자식 하나를 사용합니다. `evidence-hunter`와 `trend-tracker`에는 웹 검색을 켭니다. Codex 패널 경로는 공개 전 z-lab에서 측정할 예정입니다. 샌드박스의 Codex 메인 에이전트는 호스트의 권한 상승 경로로 패널 명령을 실행해야 합니다.

## 요구사항

- 훅 실행을 위한 `python3` 및 `PATH` 등록.
- 저장소 루트와 로컬 제외 파일 처리를 위한 `git`.
- 누적 PR 단계용 `gh`.
- Codex 패널 경로용 Codex CLI(`codex`).

## 설치

먼저 마켓플레이스를 추가한 뒤 플러그인을 설치합니다.

```bash
claude plugin marketplace add https://github.com/zeriong/because-i-needed.git
claude plugin install free-hands@because-i-needed
```

Codex는 [마켓플레이스 안내](../../README.ko.md#codex)를 참고하세요.

## 라이선스

MIT. [LICENSE](../../LICENSE)를 참고하세요.
