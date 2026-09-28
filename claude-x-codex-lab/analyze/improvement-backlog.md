# improvement-backlog — claude-x-codex

항목마다: 관측(근거 실험·ID) → 진단 → 제안 → 상태. 상태의 "반영"은 because-i-needed `feat/claude-x-codex` 브랜치의 커밋 `604611d` 기준(2026-09-28).
1–8은 마지막 측정 스냅샷 [`../recheck-0.1.0-rev3/subject`](../recheck-0.1.0-rev3/) 에 들어 있고, 8a·8b는 그 뒤의 문서 변경이다 —
반영 후 상태는 [`plugin-state-8b.sha256`](plugin-state-8b.sha256) — because-i-needed 커밋 `604611d`
(`feat/claude-x-codex`, 2026-09-28)의 해당 파일 25개와 해시가 모두 일치한다.

## 반영

| # | 관측 | 진단 | 반영한 변경 |
|---|---|---|---|
| 1 | 문서의 Claude 리뷰어가 권한 없는 도구 `Skill`(forked 리뷰)·`ReportFindings` 를 썼다(env F13). `--tools` 로 좁히자 사라졌지만 컨텍스트 6배·비용 1.5배(haiku)·9배(opus)(rev2 K05, context C01·C02). 거부 목록은 컨텍스트 증가 없이 제거(denylist D01–D04; 비용은 실험 간 비교로 더 높지 않음) | `--allowedTools` 는 권한만 정한다. 도구 목록을 화이트리스트로 바꾸면 알 수 없는 큰 주입이 생긴다 | `transport-standalone.md` Claude 리뷰어에 `--disallowedTools "Skill" "ReportFindings" "Write" "Edit" "NotebookEdit"`. 최종 확인 rev3 L01·L02 |
| 2 | 허용 목록 밖의 읽기 전용 명령(`ls`·`find`·`git status`)이 실행됐다(env F12, F16) | Claude Code의 읽기 전용 자동 허용 | 리뷰어·워커 설명에 "읽기 전용 명령은 목록 없이도 돈다" 명시 |
| 3 | 폴백이 중첩 폴더도 덮는다(F03), `@path` 를 따라가지 않는다(F04) | 추정으로 적은 문장 | `context-bridge.md` 를 관측 사실로 |
| 4 | 사용자 Codex 설정에 폴백이 있으면 Codex는 `CLAUDE.md` 를 읽는다(F01) — 감사는 그래도 GAP로 표시했다 | 감사가 설정을 보지 않았다 | `context-audit.sh` 가 최상위 `project_doc_fallback_filenames` 를 읽어 `ok (Codex fallback in user config)`. 표 안의 키는 무시(TOML 의미). 테스트 4개 추가(rev2 K07) |
| 5 | 상대 `-o` 는 호출 cwd 기준(F17) | 주석이 반대로 읽혔다 | 주석 수정, 설명 추가 |
| 6 | 열린 stdin에서 `codex exec` 가 EOF까지 대기(F18), `-s read-only` 가 쓰기를 막음(F14) | 근거 없는 서술 | 수치·관측으로 뒷받침 |
| 7 | mode on은 프롬프트당 입력 +98토큰(F21) | README가 비용을 말하지 않았다 | README 5개 Heads-up에 "약 100 입력 토큰" |
| 8 | stream-json에 UserPromptSubmit 훅 이벤트가 없다(platform G06), 토큰 차이로만 보인다(H01–H04) | 훅 테스트 방법이 문서에 없다 | 플러그인 `CLAUDE.md` Rule 4에 토큰 차이로 확인하는 방법 |

| 8a | 사용자 결정(2026-09-28): 상호 리뷰는 Claude Opus·Codex `gpt-6-sol`, 둘 다 "중상"(Claude `xhigh`) effort, 워커는 `high`. Claude `xhigh` 와 같은 자리는 Codex에서도 `xhigh`(E3·E4). 서브에이전트는 effort를 못 정한다(E6). 두 CLI 모두 오타를 막지 않는다(E2·E5) | 리뷰 depth가 벤더·세션마다 달랐다(Codex `high`/delta `medium`, Claude는 세션 effort) | `run` 리뷰 표와 `CXC_REVIEW_EFFORT=xhigh`·`CXC_WORKER_EFFORT=high`, 모든 CLI 형태에 effort 명시, Claude 워커·리뷰어는 호스트와 무관하게 `claude -p` 형태, 메인이 직접 리뷰하는 것은 리뷰 모델·effort 이상일 때만 |
| 8b | 사용자 결정(2026-09-28): 고위험 단계에서도 `gpt-6-astra`·`max` 를 자동으로 쓰지 않는다 — 먼저 묻는다 | 측정 근거가 아닌 비용·통제 결정. 이전 문서는 고위험이면 최상위 모델 리뷰를 자동으로 추가했고, Codex 호스트의 single-vendor 리뷰어도 astra였다 | 계획 승인에서 `Risk: high` 단계마다 묻고(Claude Code는 AskUserQuestion), 승인 시에만 추가 리뷰. single-vendor Codex 리뷰어는 `gpt-6-sol` `xhigh`. 안티패턴에 "묻지 않고 최상위 모델·`max` 로 올리기" |

## 반영하지 않음 (근거와 함께)

| # | 관측 | 판단 |
|---|---|---|
| 9 | `plugin.json` 의 `"hooks": "./hooks/hooks.json"` 은 자동 로드되는 경로라 불필요하지만 중복 로드도 없다(platform H01·H02) | ux-ui와 같은 형식을 유지. 동작 차이 없음 |
| 10 | luna 리뷰어는 `div` 의 0 나눗셈을 지적하지 않았다(env X08, 0 findings 3/3) | 리뷰 품질은 측정 대상이 아니었다. 문서의 리뷰 기본 모델은 sol이다 |

## 열림

| # | 관측 | 다음에 잴 것 |
|---|---|---|
| 11 | 중첩 `CLAUDE.md` 가 Claude의 답에 2/3만 나왔다(env F08) | 로드 실패인지 답 누락인지 — 토큰 차이로 구조적으로 재기 |
| 12 | 첫 호출의 cache_creation 이상치(env X09 r1, platform P05 r1) | 원인 미상. `--tools` 의 대형 주입(C01)과 같은 것인지 |
| 13 | Orca 워커는 한 번도 띄우지 않았다 | 사용자 승인 후 read-only 리뷰어 불가(O01)와 worktree setup을 실제로 |
| 14 | rev3는 Codex 단계를 다시 돌리지 않았다 | 사용자의 Codex 계정 확인 후 R12 전체를 최종 형태로 재실행 |
