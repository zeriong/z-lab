# improvement-backlog — free-hands

Each item: observation (experiment · finding ID) or decision → change → state. "because-i-needed" is the product
repository; the plan and triage log of the 0.1.0 work are in its `.claude-x-codex/free-hands/` (local, not published).

## Decisions (not measurements)

| # | Decision | Reason | Where |
|---|---|---|---|
| D1 | Port synolink-ehr's project-local `free-hands` skill as plugin `free-hands`, skill `run` | The maintainer types "free-hands"; `run` is the shared verb for executing a task | user, 2026-10-01 |
| D2 | The explicit command enters at once; the word "free-hands" first gets one entry question; mentioning it again during a run is a correction signal | Carried over from the original's CLAUDE.md §6 | user, 2026-10-01 |
| D5 | Never done in the mode: merging a PR or into the default branch, irreversible deletion, deploying/publishing/sending outside. Force-push after a notice stays as in the original | User's selection at the interview | user, 2026-10-01 |
| D6 | Every PR of a run is stacked | User: "stacked-pr에 대한 것도 반영해야 합니다" | user, 2026-10-01 |
| D7 | Five named roles: quick-thinker, deep-thinker, evidence-hunter, trend-tracker, devils-advocate | User: descriptive names, not agent-a | user, 2026-10-01 |
| D8 | Round 2 only when round 1 disagrees; main decides by evidence, not votes | User's choice at the interview | user, 2026-10-01 |
| D11 | Measure the essential behaviors only; no decision-quality comparison | User's choice; "the panel decides better" stays a hypothesis | user, 2026-10-01 |

## Changes from measurements

| # | Observation | Change | State |
|---|---|---|---|
| 1 | run-0.1.0 F03: `status: waiting` with open items released the guard | Guard treats done/waiting with `- [ ]` items as active and says how to resolve; skill: a stop request is `paused` | confirmed: run-0.1.0-r2 G01 (stop request → `paused`); the guard path itself unit-tested only |
| 2 | run-0.1.0 F07: Codex's sandbox blocks `.git/info/exclude` | `.free-hands/.gitignore` with `*` | confirmed: run-0.1.0-r2 G05 |
| 3 | run-0.1.0 F08: Claude main tallied before two roles returned; entry note on background-task notifications | Skill: wait for every dispatched role; prompt hook ignores `<task-notification>` prompts | confirmed: run-0.1.0-r2 G04 |
| 4 | run-0.1.0 F09: Codex children search the web regardless of `--search` | README says so; no code change | docs |
| 5 | run-0.1.0 F10: native Codex subagents take a model and effort but no read-only control | Keep the `codex exec -s read-only` route | docs |

| 6a | run-0.1.0-r2 G06: a sandboxed Codex main's panel children have no network and fail; the run degrades | README: on Codex the panel needs network for `panel.py run` (approved escalation or a network-enabled sandbox) | docs |
| 6b | run-0.1.0-r2 G03: the agent rewrote `iterations` itself | README/CLAUDE.md note the counter is agent-writable; no change in 0.1.0 | docs |

## Not acted on

| # | Observation | Judgment |
|---|---|---|
| 6 | Hard limits are rules only; no hook blocks `gh pr merge` and the like (product review FH-26) | A Bash PreToolUse guard would be new behavior; offered to the maintainer as a follow-up |
