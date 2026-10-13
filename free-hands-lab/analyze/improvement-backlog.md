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
| 6b | run-0.1.0-r2 G03 and run-0.1.0 F04: agents rewrote `iterations` themselves (R03, X01, X02, X05) | README/CLAUDE.md note the counter is agent-writable; no change in 0.1.0 | docs |

| 7 | Product review FH-44: a `- [ ]` quoted in Decisions, Resume or a code fence counted as open | The guard counts `- [ ]` only under `## Checklist`, outside fenced code | made; unit tests on the real `guard.py` with hook JSON; not re-run on a host |
| 8 | Product review FH-45: a prompt quoting a `<task-notification>` was dropped whole | The guard removes notification blocks and keeps the rest of the prompt | made; unit tests as above |

| 10 | Hard limits as a hook (user, 2026-10-02: core scope — merge, remote deletion, deploy/publish/send; GitHub issues and comments allowed) | `guard.py shell` + `shellguard.py`, PreToolUse Bash; a backstop for a cooperative agent's ordinary commands | measured: run-0.2.0 P01–P04 (denied before running on both hosts, allowed command runs, control attempts reach the binary); P05 the skill's rules kept the limits without needing the hook |

| 11 | User report, 2026-10-13: a second terminal (session B) in the repository of a running goal picked it up and its counter rose; `guard.py` keyed everything on the repository path. Pre-build probe `session-id-0.3.0` S01–S05: both hosts send `session_id` on every hook event, keep it across resume and compaction, give subagents the parent's id; an inherited `CLAUDE_CODE_SESSION_ID` names the wrong session | Goal header `owner: <session id>` from the hook input; only the owner's hooks act (restore note, ask, stop, counter, shell); other sessions get the owner's id only when their prompt mentions free-hands; unowned goals are claimed by the first session under the lock; the skill writes `owner:` from a `[free-hands: session]` note and replaces it on resume or take-over | measured: run-0.3.0 O01 (0.2.0 control reproduces the report on both hosts), O02–O06 |

| D12 | A hook input without a valid `session_id` keeps the 0.2.0 repository-wide guard; a guarded goal without `owner:` (written by 0.2.0, or an agent that left the line out) goes to the first session a hook sees, on any event | Both hosts always send the id (S01); first-come is the only rule that lets a resumed 0.2.0 run (same id, S02) claim its goal without a manual step | decision, 2026-10-13 |
| D13 | Other sessions are not held to the hard-limit shell hook | They are attended by the user; the user's report was the second session acting as free-hands. The owner's subagents stay covered (O04) | decision, 2026-10-13 |

## Not acted on

| # | Observation | Judgment |
|---|---|---|
| 6 | Hard limits were rules only (product review FH-26) | Done in 0.2.0 (user, 2026-10-02): see item 10 |
| 9 | Agents rewrite `iterations` (6b) | A guard-owned counter outside the goal file would be new behavior; 0.1.0 documents the limit instead |
