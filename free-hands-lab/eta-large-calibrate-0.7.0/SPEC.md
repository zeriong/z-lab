# free-hands 0.7.0 — the Haiku factor on larger tasks (Claude Code)

Frozen before running, 2026-11-17. CLI versions recorded by V00. Claude Code only.

## Why
The maintainer's 12-step goal showed a finish a few times too early: the shipped Haiku factors were fitted on lab
items of 1–3 minutes (`../eta-haiku-calibrate-0.6.0/`), and their items take 15–48 minutes (`../eta-local-replay-0.7.0/`
L03, L04). The maintainer asked (2026-11-17) for the experiment to be run now and its result added to the open PRs. Budget:
the roughly 60 USD option they had been offered: each Opus cell is capped at 20 USD and each Sonnet cell at 10 USD
(earlier cells cost about 0.36 and 0.17 USD a minute), so the four cannot pass 60 USD. A cell its cap stops contributes
the items it finished; the item it was on is lost, which drops long items more often than short ones.

## Subject and corpus
Subject `subject/free-hands/`: the 0.7.0 candidate (because-i-needed `feat/free-hands-live-eta`; the isolated Haiku
estimator, the overrun correction, the tick). sha256: `subject.sha256`. Goals: `../eta-corpus-large/goals/` (two goals of
four large tasks on the existing fixtures p3-orders and p2-shelf; `corpus.sha256`).

## Cells (n = 1)
`p3-orders-opus-L1`, `p2-shelf-sonnet-L2`, `p2-shelf-opus-L2`, `p3-orders-sonnet-L1`, two at a time, in that order (the
first pair already covers both goals and both families). Each as `../eta-isolated-run-r2-0.6.0/` headless cells (its
runner, copied): a fresh fixture copy, fake `gh`/`npm`/`vercel`/`docker`, a user-like environment (no inherited
`CLAUDE_*`, `ORCA_*`, `CODEX_*`; `CLAUDE_CONFIG_DIR` kept), `claude -p "/free-hands:run <prompt>" --setting-sources
project,local --model <family> --effort xhigh --max-budget-usd 20|10 …`, a 150-minute limit, the witness that records
the dashboard's free-hands entry at every checklist change.

## Analysis (`analyze.py` → `METRICS.md`, `items.csv`, `baseline-candidate.json`)
Items: Haiku's estimate (the timing row's, else `estimates.jsonl` joined through reworded text) and the measured
minutes (`timings.jsonl`), the working family. Sources: **large** (these cells); **small**
(`../eta-haiku-calibrate-0.6.0/items.csv`, the median of three runs of the same `estimator.ask` on a fresh fixture —
the shipped factors were fitted on its goal A rows); **live small** (`../eta-isolated-run-r2-0.6.0/` cells, estimated
live during the run; reported only); **real** (the maintainer's project exported at analysis time with
`../tools/export_records.py` into `data/real-3.csv`, numbers only; reported only).
- **M0** — 0.7.0 as shipped: measured = estimate × factor(family).
- **M1** — a refitted factor per family (geometric mean of measured / estimate).
- **M2** — size-aware: ln(measured) = a_family + b · ln(estimate), b shared, fitted by least squares.
Validation, median |log2(measured / predicted)|: (a) each large goal held out — M1 and M2 fitted on small + the other
large goal — on the held-out items and on each held-out cell's total (finished items); (b) small, one fixture held out:
M1 and M2 fitted on large + the other fixtures against **B0**, the 0.7.0 method (M1 on small only) refitted without that
fixture, because M0 has seen the small items; (c) real and live small, fitted on small + large.
Also reported, never fitted: the item each cell ended on (actual ≥ its elapsed active time in `eta.json`) against each
model's prediction; the dashboard's remaining time at each checklist change in the large cells against the wall time
left to the last finished item.

## Decision (computed by `analyze.py`)
- **Inconclusive** — no product change, the question stays in the backlog — when a large goal has fewer than 3 finished
  items or a family fewer than 2.
- Else **M2** ships (fitted on small + large) when in (a) its item and total medians are the lowest of M0, M1, M2, its
  item median is at least 0.25 doublings below M0's, and in (b) it is at most 0.1 doublings above B0.
- Else **M1** ships when in (a) its item median is at least 0.25 doublings below M0's, its total median is not above
  M0's, and in (b) it is at most 0.1 doublings above B0.
- Else nothing changes. (c) does not decide (one real Haiku row when frozen).
If a model ships, the project factor and the overrun correction use its expected minutes in place of estimate × factor.

## Not in scope
Codex; the overrun correction's quality (`../eta-live-replay-0.7.0/`); effort other than xhigh; Fable as the working
model.
