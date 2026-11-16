# free-hands isolated estimator — platform probes (Claude Code)

Frozen before running, 2026-11-16. CLI versions recorded by V00. Claude Code only (maintainer request, 2026-11-16).

## Why
The maintainer wants the expected finish kept entirely out of the main agent's context: the main agent no longer
writes estimates; when the checklist changes, a hook starts a separate headless estimator (Haiku) that writes estimates
for the dashboard and exits (confirmed with the maintainer, 2026-11-16: fully isolated estimator; only when the
checklist changes; Haiku). Before designing it, measure what it rests on (root Rule 9).

## Objective
1. A process a `PostToolUse` hook starts — detached (`start_new_session`, stdin/stdout/stderr not inherited) — lets
   the hook return at once, outlives the hook and the parent `claude -p`, and puts nothing in the parent's stream
   (empty hook output). Which environment variables tell the hook it runs under Claude Code.
2. `claude -p --safe-mode --no-session-persistence --model haiku --effort low --allowedTools Read Glob Grep` in a
   fixture repository: the model it resolves, the tools it has, whether Read works, whether any hook, plugin or
   CLAUDE.md is loaded, whether a session transcript is written, its cost and time, and whether its JSON answer parses.
3. The two together: a hook starts that estimator detached; the time from the hook to the estimate on disk, while the
   parent session goes on.

## Isolation
- Scratch git repositories under the system temp directory; `CXC_MODE=off`.
- Parent sessions: `claude -p <prompt> --setting-sources project,local --plugin-dir <spawn-probe> --model sonnet
  --output-format stream-json --verbose --include-hook-events --permission-mode acceptEdits --allowedTools Bash Read`.
- `spawn-probe` (built by `run.py`): one PostToolUse hook, `python3 spawn.py`. On its first call only (a flag file),
  it logs its start, the names of the environment variables it received and the values of those that start with
  `CLAUDE` or `CODEX` (tokens and keys masked), starts the case's child detached, logs its end, and prints nothing.

## Cases (n=1)
- **V00** — `claude --version`, `python3 --version`.
- **S1 — detached child.** Child: `python3 child.py` — sleeps 15 s, writes its start, end and parent pid. Parent
  prompt: "Run exactly this shell command with Bash, then reply done: `echo hi`". After the parent exits, the runner
  waits up to 30 s for the child's marker.
- **S2 — the estimator alone.** In a copy of `../eta-corpus/fixtures/p1-tally/`: `claude -p <estimator prompt>
  --safe-mode --no-session-persistence --model haiku --effort low --allowedTools Read Glob Grep --output-format
  stream-json --verbose --include-hook-events --max-budget-usd 0.5`. The estimator prompt (in `run.py`) gives three
  numbered items and asks for one JSON object `{"items": [{"n", "minutes", "category"}]}` after reading the code it
  needs. Recorded: the init event, tool uses and results, hook events, the result, cost, elapsed, and every
  `projects/*/<session_id>.jsonl` under the account's config directory before and after.
- **S3 — hook-started estimator.** As S1, but the child is S2's command (output to a file in `.probe/`), run in a copy
  of p1-tally; the runner waits up to 120 s after the parent exits for that file.

## Not in scope
Codex (the maintainer leads it; its environment is not probed here); estimate quality (a later calibration
experiment); the free-hands plugin itself.

## Metrics
Exit codes, elapsed ms, tokens and cost per call; hook start/end and child start/end times.

## Decision
None ships. The findings fix how the free-hands candidate starts its estimator (S1, S3), which flags isolate it (S2),
and how it tells Claude Code from Codex (S1).
