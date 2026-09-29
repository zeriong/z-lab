# env-probes-0.1.0 — claude-x-codex가 기대는 CLI 동작 실측 (실행 전 고정)

## 질문

claude-x-codex 0.1.0의 스킬 문서(`run`·`mode`·`audit`와 references)는 Claude Code·Codex CLI의 동작에 대한
여러 주장 위에 서 있다. 초안 작성 세션(2026-09-28)에서 대부분 1회씩 확인했지만, **반복 안정성·비용·아직
실행해 보지 않은 주장**은 측정되지 않았다. 이 실험은 그 주장들을 격리된 픽스처에서 반복 실행해 k/n과 CLI
보고 비용으로 기록한다.

## 테스트 대상 (고정)

- `subject/` — because-i-needed `feat/claude-x-codex` 브랜치(`042237d` + 미커밋 작업 트리)의 스냅샷.
  `install.sh`, `.claude-plugin/marketplace.json`, `plugins/claude-x-codex/`. 무결성: `SUBJECT.sha256`(25개 파일).
- 실행 후 플러그인이 바뀌어도 이 스냅샷은 바꾸지 않는다. 바뀐 플러그인의 재측정은 형제 폴더에 새로 만든다.

## 환경 (고정)

| 항목 | 값 |
|---|---|
| Claude Code | 2.1.283 |
| Codex CLI | 0.157.1 |
| Orca | 1.4.215 (워커 실행 안 함 — 아래 "측정하지 않는 것") |
| OS | macOS (Darwin 25.6.0), bash 3.2 |
| Claude 모델 | `haiku` (프로브 기본), 문서 기본형 스모크만 `opus` |
| Codex 모델 | `gpt-6-luna` (프로브 기본), 스모크의 리뷰어만 `gpt-6-sol` |

## 격리 (제2조 — 구조로 집행)

- **Claude**: 모든 호출에 `--setting-sources project`. 사용자 설정의 플러그인·훅·MCP가 로드되지 않는다
  (카나리: 로드 플러그인이 내장 `agents-md`·`telemetry` + 테스트 대상뿐, MCP 0, 인증 정상). 단, 사용자 설정
  하에서의 동작 자체가 질문인 X10·X11은 `user` arm을 따로 둔다.
- **도구 제거**: "컨텍스트에 무엇이 있나"를 묻는 Claude 프로브는 `--tools ""`(init의 `tools` 가 `[]` 인지 기록),
  중첩 로드 프로브만 `--tools Read`.
- **Codex**: `--ignore-user-config --ephemeral --json`. `--json` 이벤트의 `command_execution` 수를 세어,
  "파일을 읽지 말라"는 프로브에서 명령을 실행한 run은 오염으로 따로 보고한다.
- **픽스처**: 매 run마다 `mktemp` 아래 새 git 저장소를 만든다. z-lab 안에는 픽스처를 만들지 않는다
  (중첩 `.git`·worktree·symlink가 z-lab 커밋에 섞이지 않게). 출력만 `runs/` 로 복사한다.
- **공개 레포 보호**: Claude stream-json은 `filter_stream.py` 를 거쳐 저장한다 — init 이벤트는 모델·권한 모드·도구·
  테스트 대상 플러그인과 스킬만 남기고, 테스트 대상이 아닌 훅의 출력 본문은 지운다. 모든 run의 출력은 저장
  직후 민감 문자열 검사(`SENSITIVE_RE`, 저장소에 적지 않는 환경변수)를 통과해야 DONE이 된다.

## 반복과 판정

- 모델이 개입하는 프로브: arm당 **3회**(`REPS=3`). 결과는 k/n으로 적고 백분율로 바꾸지 않는다.
- 결정적 프로브(모델 호출 없음 또는 CLI 오류만 보는 것): 1회.
- 토큰·비용·시간(`duration_ms`)은 **CLI 자가보고**다. 벽시계 시간(`wall_ms`)은 러너가 잰다.
- 상태 인지(제6조): `runs/<probe>/<arm>/r<k>/DONE` 이 있으면 건너뛴다.

## 프로브 (고정)

공통 질문 문구:
- `Q_CODEX` = "According to the project instruction files you were given, what codewords are defined? Reply with
  the codewords only, comma-separated, or NONE if you were given no project instructions. Do not read any files
  or run commands."
- `Q_CLAUDE` = "According to the project instructions already in your context, what codewords are defined? Reply
  with the codewords only, comma-separated, or NONE."
- 폴백 옵션 `FB` = `-c 'project_doc_fallback_filenames=["CLAUDE.md"]'`

| ID | 주장 (출처) | 픽스처 | arm | n | 관측 |
|---|---|---|---|---|---|
| X01 | Codex는 `CLAUDE.md`를 읽지 않고, `FB`를 주면 읽는다 (context-bridge L1) | `CLAUDE.md`=PINEAPPLE-42 | `fallback` / `none` | 3+3 | 답, 명령 수 |
| X02 | 두 파일이 다 있으면 `FB`가 있어도 Codex는 `AGENTS.md`만 (context-bridge L1) | `CLAUDE.md`=LEMON-1, `AGENTS.md`=GRAPE-2 | `fallback` | 3 | 답, 명령 수 |
| X03 | `FB`는 중첩 폴더의 `CLAUDE.md`에도 적용된다 (미검증) | `CLAUDE.md`=ROOT-5, `sub/CLAUDE.md`=SUB-6, `-C sub` | `fallback` | 3 | 답, 명령 수 |
| X04 | Codex는 `@path` import를 따라가지 않는다 (context-bridge L1, 추정) | `CLAUDE.md`="rules are in @rules.md", `rules.md`=IMPORT-8 | `fallback` | 3 | 답, 명령 수 |
| X05 | Claude Code는 `CLAUDE.md`가 없으면 `AGENTS.md`를 읽는다 | `AGENTS.md`=MANGO-7, `--tools ""` | `-` | 3 | 답, init tools |
| X06 | 두 파일이 다 있으면 Claude는 `CLAUDE.md`만 | `CLAUDE.md`=LEMON-1, `AGENTS.md`=GRAPE-2, `--tools ""` | `-` | 3 | 답 |
| X07 | 중첩 `AGENTS.md`도 그 폴더 파일을 읽을 때 로드된다 | 루트 `AGENTS.md`=MANGO-7 + `pkg/AGENTS.md`=KIWI-3 / 대조 `lib/CLAUDE.md`=PLUM-9, `--tools Read` | `nested-agents` / `nested-claude` | 3+3 | 답, **Read 대상 목록**(지시 파일을 직접 읽었으면 오염) |
| X08 | `codex exec --output-schema`가 리뷰 스키마를 강제한다 (transport-standalone) | `m.py`(`div`), 스키마=subject | `-` | 3 | 스키마 적합 k/n, 토큰 |
| X09 | `claude -p --json-schema`가 리뷰 스키마를 강제한다 | 동일, `--tools Read` | `-` | 3 | `structured_output` 적합 k/n, 비용 |
| X10 | 문서의 Claude 리뷰어 형태(`--allowedTools` 목록)는 쓰기를 막는다 | "먼저 x.txt를 만들라" 지시 + 리뷰 | `isolated` / `user` | 3+3 | x.txt 생성 여부, 거부된 도구 |
| X11 | 문서의 Codex 리뷰어 형태(`-s read-only`)는 쓰기를 막는다 (**미검증**) | 동일 지시 | `isolated` / `user` | 3+3 | x.txt 생성 여부, 명령·종료코드 |
| X12 | 문서 형태 그대로 worker→두 리뷰어가 끝까지 돈다 (스모크, **미검증**) | `calc.py`에 `mul` 추가 과제, linked worktree | `-` | 1 | worktree diff, 메인 트리 무변경, return 파일, 두 리뷰 JSON 적합 |
| X13 | 문서의 Claude worker 형태(`--permission-mode acceptEdits`)는 편집은 되고 허용 안 된 Bash는 막힌다 | `calc.py` 편집 + `ls` 실행 지시 | `-` | 3 | 편집 반영, Bash 거부 |
| X14 | `-C`와 상대 경로 `-o`를 같이 쓰면 `-o`가 어디 기준인가 (미검증) | worktree에 `-C` | `relative` / `absolute` | 1+1 | 파일 위치 |
| X15 | 열린 stdin이면 `codex exec`가 EOF까지 기다린다 (transport-standalone) | `sleep 15 \|` vs `< /dev/null` | `pipe-open` / `devnull` | 1+1 | wall_ms |
| X16 | `--allowedTools` 뒤에 둔 프롬프트는 도구 이름으로 먹힌다 | 없음 | `prompt-last` / `prompt-first` | 1+1 | 종료코드·오류 |
| X17 | `config.toml`의 `[profiles.x]` 표는 `--profile`을 깨뜨리고, `<name>.config.toml` 파일은 동작한다 | 임시 `CODEX_HOME`(인증 없음) | `legacy` / `file` | 1+1 | 오류 문구, 선택된 모델 |
| X18 | mode on이면 훅이 `claude -p`에서도 1회 메모를 넣고, off면 0회. 그 비용 | subject 플러그인 `--plugin-dir`, `--tools ""` | `on` / `off` | 3+3 | UserPromptSubmit 훅 이벤트 수, 메모 포함 여부, 입력 토큰 차 |
| S01 | 스크립트 결정적 테스트 53개 (계획서 §4 + 보강) | `suite/cxc-tests.sh` → subject | `-` | 1 | pass/fail |
| O01 | Orca `worker-start`에 모델·effort 플래그는 있고 권한 플래그는 없다 | `orca orchestration worker-start --help`, 가이드 | `-` | 1 | 해당 줄 발췌 |

## 측정하지 않는 것

- Orca 워커 실행(사용자의 실행 중인 Orca 앱에 실제 에이전트를 띄우므로). O01은 문서·help 문구만 본다.
- `run` 스킬의 전체 파이프라인(계획 인터뷰·관문·반론 라운드) — X12는 transport 형태의 스모크일 뿐이다.
- 리뷰의 **품질**(지적이 맞는지). X08·X09·X12는 형식 적합과 비용만 본다.
- 모델 간 비교. 모델은 비용 때문에 고정했고, 권한·로드 동작은 모델과 무관하다는 가정 아래 haiku로 잰다(X13 문서 기본은 sonnet).
- 설치 스크립트의 실제 TTY 화면(S01은 키 입력을 파일로 넣는다).
