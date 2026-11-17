# Findings — free-hands 0.7.0, an item longer than 200 characters and its estimate

Run 2026-11-17 as frozen (`frozen.sha256`, commit `1fcf7d4`): V00 and two Sonnet cells at the same time, both `success`,
exit 0, the fixture's tests passing afterwards, the estimator's lock free at the end (`runs/*/summary.json`). Cost 5.78
USD (2.22 and 3.57). Numbers: `METRICS.md` from `analyze.py`.

## Measured

- **Q01 — Replayed, the fix finds every estimate 0.7.0 finds and ten more.** Over the six recorded cells, items over
  200 characters with an estimate: 0.7.0 0 of 10, the fix 10 of 10; items up to 200 characters unchanged (23 of 31 in
  both). With every item reopened, the items over 200 characters left to ask fall from 10 to 0. The eight short items
  without an estimate are the same under both: r2's p1 cell (its items were reworded under 0.6.0, `../eta-isolated-run-r2-0.6.0/` J05) and one item each in two large cells.
- **Q02 — Live, every item was asked once and every finished item carried its estimate.** p3-orders L1: 5 items, 4 over
  200 characters, 5 estimate rows for 5 keys; p2-shelf L2: 5 items, 3 over 200, 5 rows for 5 keys. 10 of 10 finished
  rows hold `est_min` (0.7.0's cells: 81 and 16 rows for 5 keys, and 0 of 6 items matched in p3-orders L1;
  `../eta-large-calibrate-0.7.0/` K04).
- **Q03 — No dashboard entry showed `+`.** 8 entries with an ETA, 0 with `+` (0.7.0: 9 of 13, K04).
- **Q04 — Reported only: after the first finished item the dashboard showed 6 and 8 minutes left where 9.1 and 10.8
  followed** (0.7.0's Sonnet cells on the same goals: 4 for 9.5 and 1 for 7.9, K05). Still short by about 1.3–1.5×;
  n = 2, the factors unchanged (K03).

## Not measured

Opus or Fable as the working model with the fix; Codex; two items whose first 200 characters are the same (they share
one estimate); the dashboard's accuracy beyond these two cells.

## Decision (SPEC)

R: the fix finds every estimate 0.7.0 finds and more over 200 characters (Q01). L: one row per key and `est_min` on
every keyed finished item in both cells (Q02). **The fix is kept.**
