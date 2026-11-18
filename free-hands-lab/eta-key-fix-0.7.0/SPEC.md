# free-hands 0.7.0 — an item longer than 200 characters and its estimate (Claude Code)

Frozen before running, 2026-11-17. CLI versions recorded by V00. Claude Code only.

## Why
`../eta-large-calibrate-0.7.0/` showed that the 0.7.0 subject never joins the estimate of an item whose text is longer
than 200 characters: `estimator.py` stores the key cut to 200 characters and `eta.py` looks it up under the whole text.
Such an item stays out of the expected finish (the dashboard shows `+`), its finished row carries no estimate, and the
estimator asks about it again on every start (one item there: 117 rows). The candidate fix sends every key the record
files hold, written or looked up, through one function, `eta.ref` (the first 200 characters).

## Subject
`subject/free-hands/`: the 0.7.0 candidate with the fix (because-i-needed `feat/free-hands-live-eta`, working tree,
2026-11-17). It differs from `../eta-large-calibrate-0.7.0/subject/` only in `scripts/eta.py` and `scripts/estimator.py`
(`subject.sha256`). Unit tests: `EtaTest.test_an_item_longer_than_the_record_is_found_under_its_cut_text`,
`test_the_estimator_asks_about_a_long_item_once` (fail on 0.7.0, pass on the fix).

## Part R — replay (no session)
For every finished headless cell of `../eta-large-calibrate-0.7.0/runs/` and `../eta-isolated-run-r2-0.6.0/runs/`: its
final goal file, `eta.json` and `estimates.jsonl`. Per subject (0.7.0, fix), the items `estimate_of` finds an estimate
for, the open-item list `unestimated` returns with every item reset to open, both counted by length (≤ 200, > 200).

## Part L — live
`p3-orders-sonnet-L1`, `p2-shelf-sonnet-L2` (the goals whose 0.7.0 cells had the most items over 200 characters
unmatched), at the same time, as `../eta-large-calibrate-0.7.0/` cells (its runner, copied; `--max-budget-usd 10`, the
runner stops starting cells at 20 USD). Measured per cell: estimate rows per distinct key of the run; finished rows
with and without `est_min`; the dashboard entries the witness recorded while the goal was active, with and without
`+`; the remaining time shown against the wall time left to the last finished item (reported only).

## Decision (computed by `analyze.py`)
The fix is kept when (R) it finds an estimate for every item 0.7.0 finds one for, and for more of the items over 200
characters; and (L) in both cells no key of the run has more than one estimate row, and every finished item whose key
has an estimate row carries `est_min`. Otherwise it is dropped and the finding goes to the backlog.

## Not in scope
Codex; the factors (`../eta-large-calibrate-0.7.0/`); Opus or Fable as the working model; two items whose first 200
characters are the same (they would share one estimate — not measured).
