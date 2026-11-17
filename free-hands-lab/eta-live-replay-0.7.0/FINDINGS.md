# Findings — free-hands 0.7.0, the item in progress as evidence (replay)

No new session. Data: `../eta-local-replay-0.7.0/data/` (real-1, 20 rows; lab, 153 items). Numbers: `METRICS.md` from
`replay.py`. Error = |log2(measured remainder / predicted remainder)| of the goal, at moments an item had run m × its
prediction and was still running.

## Measured

- **V01 — Once an item has run twice its prediction, letting the overrun push the rest out cut the error by about
  half.** m = 2: real-1 R0 (0.6.0) 0.79 → R1 w=0.5 0.28 (5 moments), w=1 0.35; lab-haiku 1.03 → 0.59 (27) for both w;
  lab-self 0.90 → 0.59 (w=0.5) / 0.78 (w=1) (25).
- **V02 — At four times the prediction the moments are few and the result split.** m = 4: lab-haiku R0 0.76 → w=0.5
  0.48, w=1 1.30 (7 moments); lab-self 0.73 → 1.26 / 1.78 (4); real-1 none.
- **V03 — Before the prediction is reached nothing changes, by construction.** m = 0.5 and m = 1: R1 equals R0 (t ≤
  pred); 0.67–0.93 for all.

## Not measured

The moments in a live session (the replay places them at m × prediction); how often the band redraws while an item
runs (a refresh needs a watched file to change); larger lab tasks.

## Decision (SPEC)

At m = 1 the two coincide (t = pred, so R1 does not act — the SPEC's "m ≥ 1" meant the moments R1 acts on); at m = 2,
where it acts, R1 w=0.5 is lower than R0 on real-1 (0.28 vs 0.79) and on lab-haiku (0.59 vs 1.03), and w=0.5 has the
lower real-1 error: **R1 w=0.5 is the 0.7.0 candidate.** V02's split at m = 4 (n = 4–7) is recorded as a limit.
