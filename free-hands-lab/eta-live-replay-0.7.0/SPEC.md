# free-hands 0.7.0 — the item in progress as evidence (replay)

Frozen before running, 2026-11-17. No new session. Sibling of `../eta-local-replay-0.7.0/` (not edited), which found
that faster learning from finished items did not beat 0.6.0 at a goal's start (L01) and observed, in the maintainer's
running goal, an item at 21 min against a 6 min prediction (L04). When an item has already run past its prediction,
that elapsed time is evidence the remaining items are under-predicted too; 0.6.0 ignores it (it only floors the
current item's remaining time at 10 % of its prediction).

## Data
`../eta-local-replay-0.7.0/data/real-1.csv` and `lab.csv` (same sha256 as there), read in place.

## Replay
For every item i of every goal, at the moments its elapsed time t equals m × its prediction (m = 0.5, 1, 2, 4) while
it is still running (measured > t): the prediction of the remaining time of the goal — the rest of item i plus every
later item of the goal — from the project's earlier rows (P0's ratio, `../eta-local-replay-0.7.0/` P0), against the
measured remainder (item i's measured minus t, plus the later items' measured).
- **R0 — 0.6.0**: item i: max(pred_i − t, 0.1 × pred_i); later items: their predictions.
- **R1(w)**: when t > pred_i, s = t / pred_i; item i: 0.5 × t (half as long again); later items: prediction × s^w.
  When t ≤ pred_i, as R0. w = 0.5, 1.
Datasets: real-1, lab-haiku, lab-self.

## Metrics (`METRICS.md`)
Median |log2(measured remainder / predicted remainder)| per dataset, per m, over every moment counted; the count.

## Decision
R1(w) becomes the 0.7.0 candidate if, at m ≥ 1 (the moments it acts on), its median error is lower than R0's on
real-1 and not higher on lab-haiku; the w with the lower real-1 error at m = 2 is taken. Otherwise nothing changes.

## Not in scope
New sessions; how often the dashboard redraws (it refreshes on file changes, so a live correction would show at the
next tool call that changes a watched file — or at a refresh the implementation adds); Codex.
