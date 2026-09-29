# claude-code-2.1.283 지표

`python3 metrics.py > METRICS.md` 로 생성한다. 비용·시간은 CLI 자가보고(`usd`, `dur`), `wall` 은 러너 측정 ms.

## P01 스킬 호출명의 출처

| 폴더 | frontmatter name | init skills | init slash_commands | usd |
|---|---|---|---|---|
| skills/dirname/ | fmname | probe:dirname | probe:dirname | 0.013229 |

## P02 마켓플레이스·플러그인 이름 변경

| 명령 | exit | 출력(요약: 줄 이어붙임) |
|---|---|---|
| `phase 1 — install from old-mkt` |  | (phase) |
| `claude plugin marketplace add <mkt>` | 0 | Adding marketplace…✔ Successfully added marketplace: old-mkt (declared in user settings) |
| `claude plugin install probe@old-mkt` | 0 | Installing plugin "probe@old-mkt"...✔ Successfully installed plugin: probe@old-mkt (scope: user) |
| `phase 2 — rename marketplace old-mkt→new-mkt and plugin probe→probe2 (folder too), bump 2.0.0, then update` |  | (phase) |
| `claude plugin marketplace update old-mkt` | 0 | Updating marketplace: old-mkt...Validating local marketplace / ✔ Successfully updated marketplace: old-mkt |
| `claude plugin marketplace list` | 0 | Configured marketplaces: / ❯ old-mkt / Source: Directory (/var/folders/fd/j548rpgd0bz5n99xbntzf0100000gn/T/tm… |
| `claude plugin list` | 0 | Installed plugins: / ❯ probe@old-mkt / Version: 1.0.0 / Scope: user / Status: ✘ failed to load / Error: Plugi… |
| `claude plugin update probe@old-mkt` | 1 | Checking for updates for plugin "probe@old-mkt"… / ✘ Failed to update plugin "probe@old-mkt": Plugin "probe" … |
| `claude plugin install probe2@new-mkt` | 1 | Installing plugin "probe2@new-mkt"...✘ Failed to install plugin "probe2@new-mkt": Plugin "probe2" not found i… |
| `claude plugin install probe2@old-mkt` | 0 | Installing plugin "probe2@old-mkt"...✔ Successfully installed plugin: probe2@old-mkt (scope: user) |
| `claude plugin list` | 0 | Installed plugins: / ❯ probe2@old-mkt / Version: 2.0.0 / Scope: user / Status: ✔ enabled / ❯ probe@old-mkt / … |
| `phase 3 — remove the old registration, add again, install under the new name` |  | (phase) |
| `claude plugin marketplace remove old-mkt` | 0 | ✔ Successfully removed marketplace: old-mkt / Also uninstalled 2 plugins from this marketplace: / probe@old-m… |
| `claude plugin list` | 0 | No plugins installed. Use `claude plugin install` to install a plugin. |
| `claude plugin marketplace add <mkt>` | 0 | Adding marketplace…✔ Successfully added marketplace: new-mkt (declared in user settings) |
| `claude plugin install probe2@new-mkt` | 0 | Installing plugin "probe2@new-mkt"...✔ Successfully installed plugin: probe2@new-mkt (scope: user) |
| `claude plugin list` | 0 | Installed plugins: / ❯ probe2@new-mkt / Version: 2.0.0 / Scope: user / Status: ✔ enabled |

실행 후 등록된 마켓플레이스 이름: `['new-mkt']`

## P03 재추가·재설치·없는 플러그인

| 명령 | exit | 출력(요약: 줄 이어붙임) |
|---|---|---|
| `claude plugin marketplace add <mkt>` | 0 | Adding marketplace…✔ Successfully added marketplace: bin-probe (declared in user settings) |
| `claude plugin marketplace add <mkt>` | 0 | Adding marketplace…✔ Marketplace 'bin-probe' already on disk — declared in user settings |
| `claude plugin install probe@bin-probe --scope user` | 0 | Installing plugin "probe@bin-probe"...✔ Successfully installed plugin: probe@bin-probe (scope: user) |
| `claude plugin install probe@bin-probe` | 0 | Installing plugin "probe@bin-probe"...✔ Plugin "probe@bin-probe" is already installed (scope: user) — it load… |
| `claude plugin install nope@bin-probe` | 1 | Installing plugin "nope@bin-probe"...✘ Failed to install plugin "nope@bin-probe": Plugin "nope" not found in … |

## P04 훅 자동 로드·중복·print 모드

| arm | UserPromptSubmit 훅 응답 수 | 훅 출력 | validate | usd | wall |
|---|---|---|---|---|---|
| declared | 0 | — | ❯ author: No author information provided. Consider adding author details for plugin attri… | 0.013277 | 2564 |
| none | 0 | — | ❯ author: No author information provided. Consider adding author details for plugin attri… | 0.013245 | 2541 |
| undeclared | 0 | — | ❯ author: No author information provided. Consider adding author details for plugin attri… | 0.013306 | 2552 |

## P05 `disable-model-invocation`

| arm | run | init skills | init tools | Skill 호출 | 도구 결과 | 최종 답 | usd |
|---|---|---|---|---|---|---|---|
| locked | r1 | probe:locked, probe:open | Skill | probe:locked | error: <tool_use_error>Skill probe:locked cannot be used… | UNAVAILABLE | 0.38463099999999995 |
| locked | r2 | probe:locked, probe:open | Skill | probe:locked | error: <tool_use_error>Skill probe:locked cannot be used… | UNAVAILABLE | 0.0530283 |
| locked | r3 | probe:locked, probe:open | Skill | probe:locked | error: <tool_use_error>Skill probe:locked cannot be used… | UNAVAILABLE | 0.0350223 |
| open | r1 | probe:locked, probe:open | Skill | probe:open | ok: Launching skill: probe:open | OPENED | 0.043147000000000005 |
| open | r2 | probe:locked, probe:open | Skill | probe:open | ok: Launching skill: probe:open | OPENED | 0.0337373 |
| open | r3 | probe:locked, probe:open | Skill | probe:open | ok: Launching skill: probe:open | OPENED | 0.033826300000000004 |

