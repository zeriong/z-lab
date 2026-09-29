# claude-code-2.1.283 — Claude Code 플러그인 시스템 동작 실측 (실행 전 고정)

## 질문

because-i-needed 마켓플레이스의 네이밍 개편(2026-09-28)과 claude-x-codex 0.1.0 작성은 플러그인 시스템에 대한 몇 가지
사실 위에서 결정됐다. 그 세션에서는 1회씩 확인했거나 추론으로 둔 것이 있다. 이 실험은 그것들을 격리된 설정과
최소 플러그인으로 다시 실행해 원본 출력과 함께 남긴다.

## 환경 (고정)

| 항목 | 값 |
|---|---|
| Claude Code | 2.1.283 |
| OS | macOS (Darwin 25.6.0), bash 3.2 |
| 모델 | `haiku` (모델을 부르는 프로브만) |

## 격리

- `claude plugin …` 하위 명령(P02·P03)은 임시 `CLAUDE_CONFIG_DIR` 에서 실행한다 — 사용자의 실제 플러그인 설정을
  읽지도 쓰지도 않는다. 이 명령들은 인증이 필요 없다.
- 모델을 부르는 프로브(P01·P04·P05)는 `--setting-sources project` 와 `--plugin-dir <최소 플러그인>` 으로 실행한다.
- 최소 플러그인·마켓플레이스는 `mktemp` 아래에 만들고, 출력만 `runs/` 로 복사한다.
- stream-json은 `filter_stream.py`(claude-x-codex-lab의 것과 같은 파일)를 거쳐 저장하고, 민감 문자열 검사를 통과해야 DONE이 된다.
- 상태 인지: `runs/<probe>/<arm>/r<k>/DONE` 이 있으면 건너뛴다. 결정적 프로브는 1회, 모델 판단이 끼는 P05는 3회.

## 프로브 (고정)

| ID | 질문 | 방법 | arm | n | 관측 |
|---|---|---|---|---|---|
| P01 | 플러그인 스킬의 호출명은 폴더명에서 오나, frontmatter `name` 에서 오나 | 폴더 `skills/dirname/`, frontmatter `name: fmname` | `-` | 1 | init의 `skills`·`slash_commands` |
| P02 | 마켓플레이스와 플러그인 이름을 바꾸면 기존 설치는 어떻게 되나 | 로컬 git 마켓플레이스 `old-mkt/probe` 설치 → `new-mkt/probe2` 로 바꾸고 update, 그 뒤 remove→add→install | `-` | 1 | 명령별 출력·종료코드, 등록명 |
| P03 | 이미 등록된 마켓플레이스 재추가·재설치·없는 플러그인 설치의 종료코드 | 로컬 마켓플레이스 | `-` | 1 | 종료코드·출력 |
| P04 | `hooks/hooks.json` 은 자동으로 로드되나, `plugin.json` 에 같은 경로를 선언하면 두 번 로드되나, 훅은 `claude -p` 에서도 도나 | 같은 훅의 세 변형 | `declared` / `undeclared` / `none` | 1+1+1 | UserPromptSubmit 훅 이벤트 수·출력, `claude plugin validate` |
| P05 | `disable-model-invocation: true` 스킬을 모델이 Skill 도구로 부를 수 있나 | 스킬 `open`(일반)과 `locked`(비활성) | `open` / `locked` | 3+3 | Skill 도구 호출과 결과(`is_error`), init의 `skills` |

## 측정하지 않는 것

- `argument-hint` 의 효과(대화형 자동완성 UI에서만 보인다).
- git URL 소스 마켓플레이스의 이름 변경 동작 — P02는 로컬 디렉터리 소스다(`file://` URL은 CLI가 받지 않았다, 2026-09-28).
- 대화형 세션의 훅 동작 — P04는 `claude -p` 만 본다.
