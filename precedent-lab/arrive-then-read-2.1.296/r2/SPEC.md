# SPEC — 2라운드: graphify 구성 + 경로 없는 프롬프트 (2026-10-10)

1라운드(`../SPEC.md`)는 워크트리에 `graphify-out/` 이 없었고(gitignore) 프롬프트가 대상 파일 경로를 지목해 **탐색 단계를 재지 못했다.**
사용자 지적으로 조건을 바꿔 새 라운드로 둔다. 1라운드 표본은 그대로.

## 바뀐 것

- 워크트리마다 메인 체크아웃의 `graphify-out/`(13MB, graph.json 6,740 노드)을 복사하고, `~/.local/bin` 의 graphify 를 PATH 에 올렸다.
  리셋은 `git clean -fdq -e graphify-out`. UserPromptSubmit 훅의 「그래프 미빌드」 넛지가 사라진 것을 확인했다.
- 프롬프트에서 파일 경로를 빼고 "어느 파일인지는 직접 찾아 주세요" 를 넣었다(`tasks.json`). 단, `pane1`·`set -e`·`PRECEDENT_OK`·`@6xl`·`metadata.icons` 같은 식별자는 남아 있었다 — 이것이 3라운드의 교정 대상이 됐다.

## 조건 (arm)

| arm | 그래프 | 도착 훅 | 뜻 |
|---|---|---|---|
| A graph+hook | 있음 | 현행 | 레포 실제 구성 |
| B graph+rule | 있음 | 제거 | 도착 뒤 훅의 몫 |
| C grep+hook | 없음 | 현행 | 도착까지 graphify 의 몫 (C 에서는 PATH 에도 graphify 가 없다) |

상주(resident) 조건은 1라운드 수치로 갈음한다.

## 추가 측정

- `graphify_calls`: Bash tool_use 에 `graphify query|explain|path|get_node` 가 있는가
- `arrival_call`: 대상 파일에 처음 닿은 도구 호출의 순번, `tokens_before_arrival`: 그 직전까지의 누적 입력 토큰(assistant usage 합)
- `read_after_arrival`: 관할 PRECEDENT 를 처음 읽은 호출이 도착 호출보다 뒤인가(훅 경로) / 같거나 앞인가(상주 규칙 경로)
- 훅 발화는 세션 id 로 명명된 마커 디렉터리(`$TMPDIR/claude-precedent-<session_id>/`)로 판정 — 병렬 런의 마커가 섞이는 `.meta` 의 `hook_marks` 는 쓰지 않는다

## 실행

5작업 × 3arm × 2회 = 30런. 명령은 1라운드와 같다(`run_one.sh`). 첫 시도는 러너 버그(PATH 지정을 `perl exec` 인자 앞에 두어 0초 종료)로 30런이 빈 파일이었고, 고친 뒤 다시 돌린 것이 이 표본이다.
