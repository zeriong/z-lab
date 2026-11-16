# free-hands 0.6.0 candidate — the isolated Haiku estimator against measured item times

Frozen before running, 2026-11-16. CLI versions recorded by V00. Claude Code only (maintainer request, 2026-11-16).

Subject: `subject/free-hands/` — the 0.6.0 candidate: the main agent writes no estimate; the owner session's hook
starts `scripts/estimator.py`, which asks a headless `claude -p --safe-mode --no-session-persistence --model haiku
--effort low --tools Read Glob Grep` session to estimate every open item that has none, and appends the answers to
`.free-hands/estimates.jsonl` (maintainer's choices, 2026-11-16: fully isolated estimator; only when the checklist
changes; Haiku). Platform facts: `../eta-isolated-probes-2.1.325/` I01–I05. sha256: `subject.sha256`. The runner never
edits the subject, the corpus or the earlier experiments' records.

## Objective
How long items actually take against the Haiku estimator's estimate, per working model family, so the candidate can
ship a factor `haiku × family`; how much Haiku's answer varies between runs; and how the result compares with the
working agent's own estimates (0.5.0's `self` factors), on goals the factor was not fitted on.

## Inputs (no new working session)
The 26 goal runs already measured: `../eta-calibrate-0.5.0/runs/*` (13, goal A), `../eta-validate-0.5.0/runs/*` with
`DONE` (3 cells, goals B and C) and `../eta-validate-r2-0.5.0/runs/*` (4 cells; goals B and C, Fable goal B only).
For each goal run: the goal sentence (`## Goal`), the item keys the recorder held (`eta.json` `items`: the checklist
text without the agent's estimate), each key's own estimate (`est`), and from `timings.jsonl` the measured minutes of
the items recorded `done` (rows matched by the goal's id). Item order is the order in `eta.json`.

## Runs
For each goal run, three times: a fresh copy of its fixture (`../eta-corpus/fixtures/<fixture>/`, `git init`, one
commit), then the subject's `estimator.ask(<claude>, <copy>, <goal sentence>, <keys>)` — the exact command and prompt
the candidate uses — with `<claude>` the `claude` on `PATH`. Goal C is estimated on a fresh fixture too, although the
measured run had goal B's changes in place (not recoverable); its results are reported apart. Four runs at a time; the
runner stops starting runs at 3 USD recorded cost. Recorded per run: the answer rows, the model, cost, elapsed, error.

## Analysis (`analyze.py` → `METRICS.md`, `items.csv`, `baseline-candidate.json`)
- Per item: Haiku's estimate (median of the three runs), the agent's own estimate, the measured minutes, the working
  family, fixture, goal letter, Haiku's category.
- Spread: per item, max/min over the three runs; median |log2(run / median)|.
- Fit on goal A (E1): per working family with at least 5 items, factor = geometric mean of measured / Haiku estimate;
  `default` = mean of the family factors.
- Validate on goals B and C: median |log2| error of raw Haiku, Haiku × fitted factor, and the agent's own estimate ×
  0.5.0's `self` factor, overall, per family, per goal letter; per goal run, Σ predicted vs Σ measured.

## Not in scope
Codex; new working sessions (an end-to-end check of the candidate is a separate experiment); effort levels other than
xhigh for the workers or low for Haiku; the project factor.

## Decision
The `haiku` factors from `baseline-candidate.json` ship in 0.6.0 if, on goals B and C, Haiku × factor has a lower
median error than raw Haiku. The comparison with the agent's own estimates is reported either way; it does not decide
(the maintainer chose isolation over the main agent estimating).
