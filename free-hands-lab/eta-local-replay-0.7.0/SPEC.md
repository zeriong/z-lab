# free-hands 0.7.0 — learning the expected finish from the project's own record (replay)

Frozen before running, 2026-11-17. No new session: a replay over measured data. Claude Code only.

## Why
The maintainer reported (2026-11-17) that with a 12-step goal the dashboard's expected finish seemed to cover the first
step only. A read-only replay of their project's own files with the installed 0.6.0 code showed the prediction does sum
every open item — 7 open items, Haiku's 405 min × Opus factor 0.070 × project factor 1.44 ≈ 35 min — but the items there
take 15–48 min each (measured / estimate median 0.24), so the sum comes out a few times too small. The shipped factors
were fitted on small lab tasks (eta-calibrate-0.5.0, eta-haiku-calibrate-0.6.0: items of 0.5–3 min), and the project
factor (shrink weight 3, residuals pooled over estimators) learned too little. The maintainer chose (2026-11-17) to fix
it from the project's record first and then recalibrate on a corpus of larger tasks, and allowed their project's
numbers — no text — to be used.

## Data (`data/`, sha256 in `data.sha256`)
- `real-1.csv`: the maintainer's project, anonymised — goal G1…, item order, estimator (`self` = the working agent's own
  estimate, `haiku` = the 0.6.0 estimator), estimate, measured minutes, batch, outcome, family, effort, category; no item
  text, issue, branch or project name. 20 rows on 2026-11-17 (G1 13, G2 6, G3 1); Opus at effort xhigh.
- `lab.csv`: built by `replay.py` from `../eta-haiku-calibrate-0.6.0/items.csv` — per item the working family, the
  goal run, goal letter, the agent's own estimate, Haiku's estimate (median of three runs) and the measured minutes. A
  project is one fixture copy: E1 cells hold goal A; E2 / r2 cells hold goal B then goal C.

## Predictors (each item predicted from the records the project held before it, in order)
- **P0 — 0.6.0**: estimate × shipped factor (estimator, family) × project factor over every earlier row (residual against
  each row's own factor, shrink weight 3).
- **P1(k)**: estimate × a ratio learned per estimator: the geometric mean of measured / estimate over the project's
  earlier rows by the same estimator, shrunk with weight k toward P0's ratio (shipped factor × project factor from the
  other estimators' rows). k = 0.5, 1, 2.
- **P2(k)**: P1(k) using only the newest 30 rows.

## Metrics (`METRICS.md`)
- Item level: median |log2(measured / predicted)| over every item that has at least one earlier row in its project, per
  dataset, per estimator.
- Goal level (what the dashboard shows when a goal starts): Σ predicted vs Σ measured for every goal that has an earlier
  goal in its project, using only earlier goals' rows; and after the goal's first item is done (remaining items).

## Decision
The candidate predictor for 0.7.0 is the one with the lowest goal-level median error on `real-1` and the lab's goal-C
cells together, provided its item-level error on `real-1` is not higher than P0's. If none beats P0, nothing changes
and that is recorded.

## Not in scope
New sessions; larger lab tasks (a later experiment, with its own budget question); Codex.
