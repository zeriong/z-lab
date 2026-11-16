# Findings — free-hands 0.5.0 candidate, calibrated expected finish on held-out goals (3 of 7 cells)

Claude Code 2.1.325, Python 3.9.6, Node 25.9.0 (`runs/V00`), macOS, 2026-11-16, effort xhigh. Subject
`subject/free-hands/` (`subject.sha256`), corpus unchanged (`corpus.sha256`, identical to E1's). Records: `runs/<cell>/`.
Numbers: `METRICS.md` (from `analyze.py`, as frozen). Three cells completed (6 goals, 12.79 USD).

## Deviation — the run was stopped by the maintainer

The maintainer asked to stop ("잠시 멈춰줘", 2026-11-16) while three cells were running. The runner and every child
session were stopped at once (no `claude -p` process left). State at the stop:

- completed (`DONE`): `p1-tally-sonnet`, `p2-shelf-sonnet`, `p1-tally-opus`;
- interrupted, not analysed: `p2-shelf-opus` (goal B, 5 of 6 items checked), `p3-orders-sonnet` (goal B finished,
  1.37 USD; goal C just started), `p3-orders-opus` (goal B just started). Their partial streams, recorder files and
  witness logs are kept in `runs/<cell>/interrupted/` as evidence; their cost after the stop's last result is unknown;
- not started: `p1-tally-fable`.

The four cells not completed are re-run, unchanged, in the sibling `../eta-validate-r2-0.5.0/`, whose SPEC pools them
with the three completed here for the decision. This SPEC's decision is not taken on three cells alone.

`analyze.py` defect (found after freezing, not fixed here): the item row carries the key `cat` twice — the category,
then the category-factor prediction — so `items.csv`'s `cat` column holds the prediction and the category is lost.
The medians in `METRICS.md` use the prediction and are unaffected. The sibling's analysis renames the key.

## Measured (3 cells)

- **V01 — The shipped family factor cut the held-out error from 3.52 to 0.58 doublings.** 34 items (Sonnet 22, Opus
  12): raw 3.52, base 0.58, category factors 0.58, base × project factor before the goal 0.55, the dashboard's online
  project factor 0.53.
- **V02 — The project factor did not help Opus in these cells.** Goal C with goal B's record: Opus base 0.62 → proj
  0.90 (online 0.79), Sonnet 0.57 → 0.54 (online 0.53). n=6 and 11.
- **V03 — The dashboard's remaining time at goal start was within 0.41 doublings on median.** 6 goals: shown 4–9 min
  against 5.6–11.3 min until the last item; errors 0.15–0.85 (goal B, no record) and 0.20–0.51 (goal C, with B's
  record).
- **V04 — Every completed goal ran to the end.** Exit 0 for all six sessions; each fixture's tests passed after each
  goal.

## Not measured

The four cells listed above (see the sibling); Codex; Haiku; effort levels other than xhigh; interactive sessions.

## Decision (SPEC)

Deferred to `../eta-validate-r2-0.5.0/`, which applies this SPEC's decision rule to the seven cells pooled.
