# free-hands 0.6.0 candidate — the isolated estimator end to end (Claude Code)

Frozen before running, 2026-11-16. CLI versions recorded by V00. Claude Code only (maintainer request, 2026-11-16).
Scope and budget chosen by the maintainer (2026-11-16): two headless Sonnet cells and one interactive case, within
what is left of the about 100 USD set for the ETA series (about 8.8 USD); the runner stops starting cells at 6 USD.

Subject: `subject/free-hands/` — the 0.6.0 candidate (no estimate in SKILL.md or the restore note; the owner session's
hooks start `scripts/estimator.py`; `eta-baseline.json` with `estimators.haiku` from `../eta-haiku-calibrate-0.6.0/`)
and `subject/dashboard/` — dashboard 0.3.0 as released (because-i-needed `68139fd`). sha256: `subject.sha256`. The
runner never edits them.

## Objective
With the candidate in a real `/free-hands:run`, measure that (1) nothing about estimates reaches the main agent — no
estimate instruction or result in its stream or transcript, and every free-hands hook output it receives free of
them; (2) the hook-started estimator answers within seconds of the checklist being written, keeps no transcript and
logs no error; (3) the recorder joins the estimator's answers to the measured times; (4) the dashboard entry shows an
expected finish once the answers land, and in an interactive session the band shows it and moves per finished item.

## Headless cells
`p1-tally-sonnet-B` and `p2-shelf-sonnet-B`: as `../eta-calibrate-0.5.0/` cells (fresh fixture copy, git, fake `gh`/
`npm`/`vercel`/`docker`, `CXC_MODE=off`, `claude -p "/free-hands:run <goal B prompt>" --session-id <uuid> --plugin-dir
<subject free-hands> --plugin-dir <witness> --setting-sources project,local --model sonnet --effort xhigh
--max-budget-usd 6 --output-format stream-json --verbose --include-hook-events --permission-mode acceptEdits
--allowedTools Bash Read Write Edit Glob Grep Agent ToolSearch TodoWrite Skill`, 75-minute limit), one after the
other. The witness is `../eta-validate-0.5.0/`'s (it runs the subject's `guard.py status` at every checklist change).
After the main session exits the runner waits up to 60 s for `.free-hands/estimator.lock` to be free, then records
`.free-hands/` (goal, `eta.json`, `timings.jsonl`, `estimates.jsonl`, `estimator.log` if any), the witness log, the
stream, the transcript, and the account's `projects/*/*.jsonl` before and after.

## Interactive case `band`
tmux 200×50, `claude --plugin-dir <subject dashboard> --plugin-dir <subject free-hands> --plugin-dir <turn-log>
--session-id <uuid> --setting-sources project,local --model sonnet --effort xhigh --permission-mode acceptEdits
--allowedTools Bash Read Write Edit`, `BECAUSE_I_NEEDED_PLUGIN_DIRS=<free-hands copy>` — as
`../../dashboard-lab/run-0.3.0/` B1, with its trust step — on a goal file the session owns whose three items carry no
estimate: `item a|b|c: run \`sleep 20\`, then mark this item \`- [x]\``. Prompt: "Read .free-hands/goal.md and work
through its checklist." Screens every 2 s until the goal has no open item and `turn.complete` is logged, or 300 s.

## Analysis (`analyze.py` → `METRICS.md`)
- Leak check over each headless cell's main stream: assistant text, tool inputs, tool results and hook outputs, for
  `(~<n>m`, `estimate`, `estimates.jsonl`, `ETA`, `eta.json`, `timings.jsonl`; every hit listed with its context.
- Latency: from the witness's first checklist record to the first `estimates.jsonl` row; the estimator's own seconds.
- Join: `timings.jsonl` rows with an estimate (directly or through `estimates.jsonl`) and their estimator.
- The dashboard values the witness recorded; the band's free-hands entry over time and its changes before
  `turn.complete`.

## Not in scope
Codex; Opus and Fable workers; estimate accuracy (`../eta-haiku-calibrate-0.6.0/`); several sessions at once.

## Decision
0.6.0 ships if, in both headless cells, no estimate text reaches the main agent (hits limited to the agent's own words
about time unrelated to the estimator, each listed) and no free-hands hook output carries one; the estimator wrote
answers for the checklist; and the band case shows `ETA` while items are open. A contradicted point is fixed and
measured in a sibling.
