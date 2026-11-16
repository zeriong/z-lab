# Findings — free-hands 0.5.0 candidate, held-out validation pooled (E2's 3 cells + this sibling's 4)

Claude Code 2.1.325, Python 3.9.6, Node 25.9.0 (`runs/V00`), macOS, 2026-11-16, effort xhigh. Subject identical to
E2's (`subject.sha256`). Records: `runs/<cell>/` here and `../eta-validate-0.5.0/runs/<cell>/` (completed cells only).
Numbers: `METRICS.md` and `items.csv` from `analyze.py`, pooled over 7 cells, 13 goals, 78 held-out items; all 13
sessions exit 0 and every fixture's tests passed after each goal. This sibling's 4 cells cost 31.39 USD (pooled table:
44.18 USD). Cost of the whole ETA series: probes 0.23, E1 44.93, E2 12.79 + 1.37 recorded for its interrupted cells
(the rest not recorded), this sibling 31.39 — 90.71 USD recorded.

## Measured

- **W01 — The shipped family factor cut the error on held-out goals from 3.17 to 0.62 doublings.** 78 items: raw
  estimate 3.17, estimate × family factor 0.62. Per family: Sonnet 3.24 → 0.60 (n=34), Opus 3.18 → 0.65 (n=37), Fable
  2.45 → 0.76 (n=7, goal B of p1-tally only, its factor fitted on p2-shelf). Per fixture: p1 3.12 → 0.59, p2 3.51 →
  0.68, p3 3.11 → 0.66.
- **W02 — E1's category factors did worse than the family factor.** 0.70 vs 0.62 over all items (Opus 0.73 vs 0.65;
  Sonnet 0.62 vs 0.60), as E1's post-hoc check predicted (E1 E04).
- **W03 — The project factor helped Sonnet and hurt Opus.** Goal C items, which start with goal B's record (n=35):
  base 0.59; project factor from the record before the goal 0.65; the dashboard's online project factor 0.56. Sonnet
  (n=17): 0.58 → 0.56 / 0.53. Opus (n=18): 0.62 → 0.90 / 0.76. On goal B, where the record builds up inside the goal,
  online was 0.54 vs 0.67 (Sonnet) and 0.79 vs 0.79 (Opus).
- **W04 — The remaining time the dashboard showed when a checklist was written was within 1.42× of the time the goal
  took, on median.** 13 goals: median error 0.51 doublings; 3 of 13 within ±25 %, 7 within 0.585 doublings (×1.5), 12
  within 2× (the miss: p3 Sonnet goal C, shown 5 min, took 10.4 min). Shown values ran from 4 to 13 minutes; most misses
  were short (8 of 13 goals took longer than shown).

## Not measured

Codex; Haiku (its factor is the default, D20); effort levels other than xhigh; interactive sessions beyond the band
case (`dashboard-lab/run-0.3.0`); projects whose record holds more than one earlier goal; the recorder against the
witness in these cells (E1 E01 measured it); the review fixes made after this subject was frozen (backlog item 17,
unit tests only).

## Decision (SPEC, applied to the pooled cells)

- Family factors stay (W01: 0.62 < 3.17).
- Category factors do not replace them (W02: 0.70 > 0.62).
- The project factor stays: online 0.56 is not higher than base 0.59 on goal C items (W03). It is reported as mixed —
  better for Sonnet, worse for Opus — and the README and CHANGELOG claim no improvement from it.
