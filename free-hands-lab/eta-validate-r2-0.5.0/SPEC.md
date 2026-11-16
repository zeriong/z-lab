# free-hands 0.5.0 candidate — held-out validation, round 2 (the cells round 1 did not complete)

Frozen before running, 2026-11-16. CLI versions recorded by V00. Claude Code only (maintainer request, 2026-11-16).
Sibling of `../eta-validate-0.5.0/` (E2), which is not edited: the maintainer stopped E2 with three of seven cells
complete (its FINDINGS, "Deviation"). Everything in E2's SPEC holds here — objective, subject, corpus, cell setup,
flags, witness, analysis definitions, decision rule — with these differences only:

- **Cells**: the four E2 did not complete, unchanged — `p3-orders-sonnet`, `p2-shelf-opus`, `p3-orders-opus` (goals B
  then C on one copy) and `p1-tally-fable` (goal B only), run in that order, three at a time.
- **Subject and corpus**: copies of E2's, byte-identical (`subject.sha256`, `corpus.sha256` equal E2's lists).
- **Ceiling**: the runner stops starting cells at 33 USD recorded cost — what is left of the about 100 USD the
  maintainer set for the ETA series (backlog D15) after the probes (0.23), E1 (44.93), E2's completed cells (12.79)
  and its interrupted ones (1.37 recorded, the rest unknown, estimated under 6).
- **Analysis**: `analyze.py` reads E2's completed cells (`../eta-validate-0.5.0/runs/*` with `DONE`) and this
  sibling's, pooled; the category-factor prediction is stored as `catpred` (E2's `analyze.py` stored it under `cat`,
  overwriting the category — E2 FINDINGS).
- **Decision**: E2's rule, applied to the pooled cells. The shipped family factors stay if base's median error over all
  held-out items is lower than raw's; category factors replace them if cat's is lower than base's; the project factor
  stays if, on goal C items, proj's or online's median error is not higher than base's. A factor that does not hold is
  removed and the result recorded; "more accurate" is claimed only for what held.

Cells E2 interrupted are not reused: each runs from a fresh copy of its fixture. The analysis reports, per cell, which
experiment it came from.
