# Findings — free-hands 0.7.0, learning the expected finish from the project's own record (replay)

No new session. Data: `data/real-1.csv` (the maintainer's project, numbers only, 20 rows, 2026-11-17) and
`data/lab.csv` (153 lab items, each with the agent's own and Haiku's estimate). Numbers: `METRICS.md` from
`replay.py`.

## Measured

- **L01 — Faster or per-estimator local learning did not beat 0.6.0 when a goal starts.** Σ predicted vs Σ measured
  at the start of every goal that had an earlier goal (8 goals: real-1 2, lab-haiku 6): P0 (0.6.0) 0.48 doublings;
  P1 k=0.5 0.58, k=1 0.55, k=2 0.48; P2 0.55.
- **L02 — Per item it helped a little.** Median error, items with an earlier row in their project: lab-haiku P0 0.74
  → P1 k=1 0.66; lab-self 0.60 → 0.57; real-1 0.78 → 0.75.
- **L03 — In the maintainer's project the 0.6.0 prediction ran short by about 1.6× at a goal's start and 2× after its
  first item.** real-1: goal start 0.67 doublings (P0), after the first item 1.03; every predictor within 0.05 of it.
- **L04 — The case the report is about has almost no data yet.** real-1 holds one item estimated by Haiku (est 30,
  measured 3.84 min); the other 19 carry the agent's own estimates from 0.5.0. Observed outside the record (not a
  case): in the same project's running goal, the item after it had run 21 min while the dashboard's prediction for it
  was about 6 min (Haiku 60 × 0.070 × 1.44).

## Not measured

Haiku's estimates against measured times on items the size of real-1's (15–50 min) — the goal in progress will give
some; a lab corpus of larger tasks (next experiment, with its own budget question); a prediction that uses the time
the item in progress has already run beyond its estimate.

## Decision (SPEC)

No predictor beat P0 at the goal level (L01): nothing changes from this replay. The shortfall the maintainer saw is a
factor fitted on small tasks (L03, L04), which local learning on today's records cannot correct; it needs Haiku's
estimates measured on larger tasks.
