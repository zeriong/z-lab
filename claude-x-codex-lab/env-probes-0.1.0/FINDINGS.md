# env-probes-0.1.0 발견

지표 원본: [`METRICS.md`](METRICS.md)(생성물) · run별 원본 출력: `runs/<probe>/<arm>/r<k>/`. 실행 2026-09-28, 65 단위 전부 DONE,
Claude 31회(CLI 보고 $1.86) · Codex 30회(CLI 보고 in+out 754,951 토큰).

## 측정한 것

### 지침 파일 — 누가 무엇을 읽나

| ID | 관측 | k/n | 근거 |
|---|---|---|---|
| F01 | Codex는 `CLAUDE.md`만 있는 저장소에서 지침을 보지 못하고(NONE), `project_doc_fallback_filenames=["CLAUDE.md"]` 를 주면 읽는다 | 폴백 3/3 · 없음 0/3 | X01, 명령 실행 0회 |
| F02 | 두 파일이 한 폴더에 다 있으면 폴백을 줘도 Codex는 `AGENTS.md` 만 읽는다 | 3/3 (GRAPE-2만) | X02 |
| F03 | 폴백은 **중첩 폴더에도 적용된다** — `-C sub` 에서 루트와 `sub/CLAUDE.md` 를 모두 읽었다 (새로 확인) | 3/3 | X03 |
| F04 | Codex는 `CLAUDE.md` 의 `@rules.md` import를 **따라가지 않는다** (추정이었던 것을 확인) | 3/3 (NONE) | X04, 명령 실행 0회 |
| F05 | Claude Code는 `CLAUDE.md` 가 없으면 `AGENTS.md` 를 읽는다 | 3/3 | X05, init `tools: []` |
| F06 | 두 파일이 다 있으면 Claude는 `CLAUDE.md` 만 읽는다 | 3/3 (LEMON-1만) | X06 |
| F07 | 중첩 `pkg/AGENTS.md` 는 그 폴더 파일을 읽을 때 로드된다. Read 대상은 `pkg/data.txt` 하나뿐이었다 — 지시 파일을 직접 읽지 않았으므로 자동 로드다 | 3/3 | X07 `nested-agents` |
| F08 | 대조군 중첩 `lib/CLAUDE.md` 는 답에 2/3만 나왔다. 세 run 모두 지시 파일을 직접 읽지 않았고, r3는 루트 코드워드만 답했다 | 2/3 | X07 `nested-claude` |

### 리뷰 출력과 read-only

| ID | 관측 | k/n | 근거 |
|---|---|---|---|
| F09 | `codex exec --output-schema` 는 리뷰 스키마에 맞는 JSON을 냈다 | 3/3 | X08 |
| F10 | `claude -p --json-schema` 는 스키마에 맞는 `structured_output` 을 냈다. 비용은 r1만 $0.41(cache_creation 200,063), r2·r3는 $0.03 | 3/3 | X09 |
| F11 | 문서의 Claude 리뷰어 형태는 **파일을 쓰지 못했다** — Write와 출력 리다이렉션 Bash가 거부됐다. 사용자 설정(`defaultMode: auto`)을 실은 arm도 같다 | x.txt 0/6 | X10 |
| F12 | 그러나 **허용 목록 밖의 읽기 전용 명령**(`ls`, `find`, `git status`, `git show`)은 거부 없이 실행됐다. 그런 명령을 시도하지 않은 run은 user r2 하나다 | 5/6 run | X10 스트림 |
| F13 | 그리고 리뷰어가 권한이 필요 없는 도구 — `Skill`(`code-review` 스킬을 forked 실행), `ReportFindings` — 를 썼다. `--allowedTools` 는 권한만 정하고 도구 목록은 줄이지 않는다 | Skill 5/6 run, ReportFindings 6/6 | X10 |
| F14 | 문서의 Codex 리뷰어 형태(`-s read-only`)는 파일을 쓰지 못했다 — `printf hi > x.txt` 가 exit 1, `file_change` 0. 사용자 설정 arm도 같다 | x.txt 0/6 | X11 |

### transport

| ID | 관측 | n | 근거 |
|---|---|---|---|
| F15 | 문서 형태 그대로 worker(`codex-bulk`, linked worktree, `-C`·`-o`·폴백) → gate pass → Codex 리뷰어(sol) → Claude 리뷰어(opus)가 끝까지 돌았다. 메인 트리 변경 0, 두 리뷰 모두 스키마 적합 | 1 | X12 |
| F16 | Claude worker 형태(`--permission-mode acceptEdits`)는 편집이 반영됐고, 지시한 `ls` 는 **거부되지 않고 실행됐다** — F12와 같은 읽기 전용 자동 허용 | 편집 3/3, 거부 0/3 | X13 |
| F17 | `-C wt` 와 상대 경로 `-o rel/out.txt` 를 같이 주면 `-o` 는 **호출한 쪽 cwd** 기준으로 풀렸다 | 1 | X14 |
| F18 | stdin이 열린 파이프면 `codex exec` 는 EOF까지 기다렸다 — `sleep 15 \|` 18,650 ms vs `< /dev/null` 3,688 ms | 1+1 | X15 |
| F19 | `--allowedTools` 뒤에 둔 프롬프트는 먹혀서 "Input must be provided" (exit 1), `-p` 바로 뒤면 정상 | 1+1 | X16 |
| F20 | `config.toml` 의 `[profiles.cxc-review]` 표는 `--profile` 을 오류로 막고, `cxc-review.config.toml` 파일은 `model: gpt-6-sol` 로 로드됐다 | 1+1 | X17 |

### mode 메모

| ID | 관측 | n | 근거 |
|---|---|---|---|
| F21 | mode on은 같은 프롬프트의 입력 토큰을 **중앙값 98 늘렸다**(on 6,693·6,693·6,696 / off 6,592·6,595·6,595, arm 안 범위 3). 두 번 주입이면 약 2배가 됐을 것이므로 1회 주입과 맞다 | 3+3 | X18 |
| F22 | 스크립트 결정적 테스트 53/53 통과 | 1 | S01 |
| F23 | Orca 1.4.215 `worker-start` 는 `--model`·`--effort` 를 받고, 권한은 "user's own setting for new agent tabs; there is no flag for it" | 1 | O01 |

## 스킬 문서와 달랐던 것 → 플러그인 수정 근거

- **F12·F13** — `transport-standalone.md` 의 "The allowed-tools list is what keeps the reviewer read-only" 는 파일 쓰기에 대해서만
  맞다. 읽기 전용 명령과 권한 없는 도구(Skill의 forked 실행 포함)는 막지 못한다. 도구 목록 자체를 `--tools` 로 줄여야 구조적이다.
- **F16** — "`--allowedTools` for the commands its done-when runs" 는 맞지만, 읽기 전용 명령은 목록 없이도 돈다는 점이 빠져 있다.
- **F17** — 절대 경로 `F` 의 주석 "-C moves the agent's working root" 는 상대 `-o` 가 깨진다는 뜻으로 읽히지만, 실제로는 호출 cwd 기준이다.
- **F03·F04** — 폴백이 중첩 폴더도 덮는다는 점, `@path` 를 따라가지 않는다는 점을 "assume" 에서 관측 사실로 바꿀 수 있다.
- **F21** — mode on의 비용(프롬프트당 입력 약 100토큰)을 README Heads-up에 숫자로 적을 수 있다.

## 방법상의 편차와 한계

- **SPEC의 "UserPromptSubmit 훅 이벤트 수"(X18)는 측정 방법으로 쓸 수 없었다** — Claude Code 2.1.283의 stream-json은 이 훅의
  이벤트를 내보내지 않는다(모든 run 0). 그래서 입력 토큰 차이로 판정했다(F21). 메모 본문을 직접 본 것은 아니다.
- X07의 판정은 모델의 답이다. Read 대상을 구조적으로 확인해 "직접 읽음"은 배제했지만, F08의 2/3이 로드 실패인지 답 누락인지는 가리지 못한다.
- X10·X11의 프롬프트는 쓰기를 **명시적으로 지시**하는 적대적 형태다. 평소 리뷰에서 같은 빈도로 쓰기를 시도한다는 뜻이 아니다.
- X13은 `ls` 를 골랐는데 이것이 자동 허용 대상이었다. "허용 안 된 Bash가 막히는가"는 쓰기 명령으로 다시 재야 한다 — X10에서 출력 리다이렉션이 거부된 것이 그 방향의 근거다.
- 픽스처 커밋의 author는 세션 환경변수(`GIT_AUTHOR_*`)가 `-c user.name` 보다 우선해 사용자의 GitHub noreply 주소로 찍혔다. 공개 주소이며 측정에는 영향이 없다.
- 모델은 haiku·gpt-6-luna로 고정했다(스모크의 리뷰어만 sol·opus). 리뷰 품질은 측정하지 않았다 — X08에서 luna가 `div` 의 0 나눗셈을 지적하지 않은 것(0 findings)은 관측일 뿐 비교 근거가 아니다.
- 실행은 순차였지만 매 run이 새 `mktemp` 픽스처를 써서 선행 run의 산출물을 볼 수 없었다.
- **실행 단위의 출처(제6조)**: S01·X16·X17·O01 전 arm과 X05 r1·X09 r1은 본 실행 직전의 카나리 호출(`REPS=1`, 같은 러너·같은 SPEC)에서
  나왔고, 본 실행(`REPS=3`)은 이들을 DONE으로 건너뛰고 나머지를 이어 실행했다. X09 r1의 비용 이상치($0.41)가 카나리 단위라는 점을 함께 읽는다.

## 측정하지 않은 것

SPEC의 목록 그대로: Orca 워커 실행, `run` 의 전체 파이프라인(인터뷰·관문·반론), 리뷰 품질, 모델 간 비교, 설치 스크립트의 실제 TTY 화면.
