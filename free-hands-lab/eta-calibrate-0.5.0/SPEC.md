# free-hands 0.5.0 candidate — estimate vs actual time per item (calibration, Claude Code)

Frozen before running, 2026-11-16. CLI versions recorded by V00. Claude Code only (the maintainer leads Codex
separately, request 2026-11-16). Subject: `subject/free-hands/` — the candidate: `scripts/eta.py`, `guard.py` with
the `post` hook and the ETA in `status`, `hooks/hooks.json` with PostToolUse, `skills/run/SKILL.md` asking for
`(~<minutes>m <category>)` on every item, `scripts/eta-baseline.json` with no factor yet (estimates used as written);
maintainer `CLAUDE.md` left out. sha256 lists: `subject.sha256`, `corpus.sha256` (`../eta-corpus/`). The runner
never edits either. Platform facts this rests on: `../eta-probes-2.1.325/` T01–T06, `../eta-probes-r2-2.1.325/`.

## Objective
For each model family the user runs free-hands with, measure how long a checklist item actually takes against the
estimate the agent wrote when it planned the goal — by category and by project — so that a shipped factor can turn
estimates into an expected finish. Also measure that the candidate's recorder (hooks only, no agent self-report)
agrees with an independent witness. Maintainer decisions (2026-11-16, recorded in `analyze/improvement-backlog.md`):
Sonnet and Opus twice per fixture, Fable once on one fixture ("minimal"); three fixtures × five items; about 100 USD
for the whole ETA series, this experiment stopping at 55 USD.

## Corpus
`../eta-corpus/`: fixtures `p1-tally` (small Python CLI), `p2-shelf` (medium Node HTTP API), `p3-orders` (large
multi-module Python package), each with goals A, B, C of five tasks (one each of docs, fix, feature, refactor,
research). This experiment uses goal A only; B and C are held out for validation.

## Cells (n per cell = 1 run)
`<fixture>-<family>-r<n>` for fixtures p1-tally, p2-shelf, p3-orders × families sonnet, opus × r1, r2 (12 cells), and
`p2-shelf-fable-r1`. Each cell:
- a fresh copy of `fixtures/<fixture>/`, `git init -b main`, one commit `fixture`; `.lab/` in `.git/info/exclude`;
- fake `gh`, `npm`, `vercel`, `docker` first on `PATH` (log to `.lab/fake.log`, exit 1); `GH_CONFIG_DIR` empty,
  `GH_TOKEN`/`GITHUB_TOKEN` empty; `CXC_MODE=off`;
- `claude -p "/free-hands:run <goal A prompt>" --session-id <uuid> --plugin-dir <subject copy> --plugin-dir <witness>
  --setting-sources project,local --model <family> --effort xhigh --max-budget-usd 15 --output-format stream-json
  --verbose --include-hook-events --permission-mode acceptEdits --allowedTools Bash Read Write Edit Glob Grep Agent
  ToolSearch TodoWrite Skill`, cwd the repository, a 75-minute limit;
- witness (`eta-witness`, built by the runner): on SessionStart, UserPromptSubmit, PostToolUse, PostToolUseFailure,
  Stop and SubagentStop it appends the time, tool, `agent_id`, `duration_ms` and the goal file's checklist marks to
  `.lab/witness.jsonl`. It prints nothing.
Effort `xhigh` is the user's configured default (user settings `effortLevel`). Cells run three at a time; each
summary records its start and end, so overlap is visible. The runner stops starting cells when the recorded cost
reaches 55 USD.

Recorded per cell: the stream (gzip), the session transcript (gzip), `.free-hands/` (goal file, `eta.json`,
`timings.jsonl`), `.lab/` (witness, fake log), `git status`, `git diff --stat` against the fixture commit, the
fixture's test command after the run (recorded, nothing fixed), cost, tokens, turns, tool uses, advisor calls.

## Analysis (`analyze.py` → `METRICS.md`, `baseline-candidate.json`)
- Item rows from `timings.jsonl` (outcome `done` with an estimate): ratio = actual / estimate.
- Per family, per family × category, per fixture × family: n, geometric-mean ratio, median ratio, the raw estimate's
  median |log2 ratio| and the share within ±50 %.
- Recorder vs witness: per cell, the sum of recorded minutes against the witness's wall clock from the goal file's
  first appearance to its last completion.
- Goal level: per cell Σ estimate vs Σ actual.
- Leave-one-fixture-out: factors fitted on two fixtures predict the third; median |log2| error raw vs calibrated.
- `baseline-candidate.json`: per family with at least 5 items, `all` = geometric-mean ratio; per category with at
  least 3 items, its geometric mean shrunk toward `all` with weight 2; Fable gets `all` only.

## Not in scope
Codex; interactive sessions (the dashboard band is measured separately); the panel (tasks are specified, so it is
rarely used — counted if used); estimates of tasks outside the corpus; effort levels other than xhigh; several
sessions in one repository.

## Metrics
Per cell: exit, elapsed, tokens, cost, turns, tool uses; per item as above. Deltas: estimate vs actual (%).

## Decision
The candidate's recorder is kept if the witness agrees within 10 % per cell (or the gap is explained). Factors from
`baseline-candidate.json` go into `scripts/eta-baseline.json` for the validation experiment (held-out goals B and C)
only if leave-one-fixture-out shows a lower median error than the raw estimates; otherwise the result is recorded and
the factor is not shipped.
