# claude-code-2.1.283 발견

지표: [`METRICS.md`](METRICS.md)(생성물) · 원본: `runs/<probe>/<arm>/r<k>/`. 실행 2026-09-28, 12 단위 전부 DONE.
P04의 약한 판정은 후속 실험 [`../hook-injection-2.1.283/`](../hook-injection-2.1.283/) 가 보강한다.

## 측정한 것

| ID | 관측 | n | 근거 |
|---|---|---|---|
| G01 | 플러그인 스킬의 호출명은 **폴더명**에서 온다 — 폴더 `dirname`, frontmatter `name: fmname` 이면 `probe:dirname` 으로만 노출된다 | 1 | P01 init `skills`·`slash_commands` |
| G02 | 마켓플레이스 이름을 바꾸고 `marketplace update` 하면 **등록명은 옛 이름 그대로**다. 이름이 바뀐 플러그인은 `✘ failed to load`, `plugin update probe@old-mkt` 는 exit 1("Plugin "probe" not found") | 1 | P02 phase 2 |
| G03 | 그 상태에서 새 이름으로 설치(`probe2@new-mkt`)는 **exit 1과 오류 메시지**로 실패한다 — "Plugin "probe2" not found in marketplace "new-mkt". Your local copy may be out of date". 옛 등록명으로는 설치된다(`probe2@old-mkt`, exit 0) | 1 | P02 phase 2 |
| G04 | `marketplace remove` 는 그 마켓플레이스의 플러그인을 **함께 제거**한다("Also uninstalled 2 plugins"). 다시 add하면 새 이름(`new-mkt`)으로 등록되고 새 이름 설치가 된다 | 1 | P02 phase 3, `registered-names.txt` = `['new-mkt']` |
| G05 | 이미 등록된 마켓플레이스 재추가는 exit 0("already on disk"), 설치된 플러그인 재설치도 exit 0("already installed"), 없는 플러그인은 exit 1 | 1 | P03 |
| G06 | Claude Code 2.1.283의 stream-json은 **UserPromptSubmit 훅 이벤트를 내보내지 않는다** — 세 변형 모두 0. 그래서 P04의 판정은 입력 토큰 차이(`declared` 6,546 · `undeclared` 6,548 · `none` 6,520)뿐이었고, 차이가 반복 간 흔들림에 가까워 약했다 | 1+1+1 | P04 |
| G07 | `disable-model-invocation: true` 스킬은 init의 `skills` 에는 그대로 보이지만, 모델이 Skill 도구로 부르면 `tool_use_error` 로 거부된다: "cannot be used with Skill tool due to disable-model-invocation. Ask the user to run /probe:locked themselves". 일반 스킬은 호출된다 | locked 거부 3/3 · open 호출 3/3 | P05 |

## 이전 세션 기록의 정정

- 2026-09-28 네이밍 개편 세션에서 "`…@new-mkt` 설치는 **아무 출력 없이** 실패한다"고 보고했다. G03이 보이듯 실제로는 exit 1과
  오류 메시지가 나온다. 당시 출력을 `tail -1` 로 잘라 보아 마지막 빈 줄만 본 것이 원인이다(관측 도구의 결함이지 CLI 동작이 아니다).

## 방법상의 한계

- P02·P03은 **로컬 디렉터리 소스**다. git URL 소스(실제 사용자 경로)는 CLI가 `file://` URL을 받지 않아 재지 못했다.
- P05 locked r1의 비용($0.38)은 같은 arm의 r2·r3($0.05·$0.04)보다 크다. env-probes의 X09 r1에서도 같은 모양이 나왔다
  (첫 호출의 cache_creation이 큼). 원인은 재지 않았다.
- `claude plugin validate` 는 세 변형 모두 author 정보 경고만 냈다 — 훅 선언 중복에 대한 경고는 없었다.

## 측정하지 않은 것

SPEC의 목록 그대로: `argument-hint` 의 효과, git URL 소스의 이름 변경, 대화형 세션의 훅.
