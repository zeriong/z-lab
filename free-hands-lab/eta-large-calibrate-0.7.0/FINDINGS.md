# Findings — free-hands 0.7.0, the Haiku factor on larger tasks (Claude Code)

Run 2026-11-17 as frozen (`frozen.sha256`, commit `eff1db7`): V00 and four cells, two at a time, all `success`, exit 0,
the fixture's tests passing afterwards (`runs/*/summary.json`). Cost 29.44 USD (Opus 10.84 and 12.84, Sonnet 2.31 and
3.45) plus the estimator's Haiku calls (under 0.31 USD, K04). Numbers: `METRICS.md` from `analyze.py`; `items.csv`;
`data/real-3.csv` (the maintainer's project, numbers only, 21 rows, exported at analysis time).

## Measured

- **K01 — The large goals made Haiku's estimates larger, not the work.** The agents split each four-task goal into 5–11
  checklist items; finished items took 0.8–13.2 minutes (median 2.2; small corpus 1.0), cells 15–38 minutes, while
  Haiku estimated 10–45 minutes an item (median 25; small corpus 15). The maintainer's items (15–48 minutes) were not
  reproduced.
- **K02 — Haiku's estimate does not under-predict larger items more than small ones.** The size-aware fit on small +
  large gives a slope of 0.95 (1 = a constant factor). The refitted constant factors are close to the shipped ones:
  Opus 0.081 (shipped 0.070), Sonnet 0.047 (0.040). Large items alone: Opus 0.109 (n 17), Sonnet 0.073 (n 10).
- **K03 — Decision: no change.** Held-out large goals (a), median error in doublings, items / cell totals: M0 (shipped)
  0.95 / 0.91, M1 0.79 / 0.71, M2 0.76 / 0.77. Neither beats M0 on items by the 0.25 the SPEC requires. Small items held
  out by fixture (b): B0 0.67, M1 0.70, M2 0.73. Finished large items: L1 16, L2 11; Opus 17, Sonnet 10 — above the
  minimum-n rule.
- **K04 — The 0.7.0 subject never joined the estimate of an item longer than 200 characters.** `estimator.py` writes the
  key cut to 200 characters, `eta.py` looks it up under the whole text. Items matched at the end of the run: 2 of 7
  (opus-L2), 4 of 5 (sonnet-L2), 10 of 11 (opus-L1), 0 of 6 (sonnet-L1, item lengths 43–308). Every hook start asked
  again about the unmatched items (up to three rounds per start): 117 estimate rows for 6 keys (opus-L2), 81 for 5
  (sonnet-L1), 58 for 11, 16 for 5; one key was asked 57 times. Those items were left out of the expected finish:
  9 of the 13 dashboard entries that showed an ETA carried `+` (`METRICS.md`, dashboard table). The analysis joins on
  the cut text on both sides (`timings.jsonl` cuts the same way), so K01–K03 use these items.
- **K05 — With K04 in place, the dashboard ran short early in three of four cells.** After the first finished item it
  showed 8, 4 and 1 minutes left where 26.6, 9.5 and 7.9 wall minutes followed; Opus L1 showed 16 for 10.5. These
  entries are dominated by K04 and say nothing about the factors.
- **K06 — The maintainer's project holds two finished items with a Haiku estimate.** Estimates 30 and 45 minutes,
  measured 3.8 and 48.0; M0's median error 2.40 doublings, M1 2.18, M2 2.24 (reported only; the SPEC's (c)).
- **K07 — Post hoc, not in the SPEC, decides nothing: K03 holds whichever of an item's repeated estimates is used.**
  9 of the 27 large items were estimated more than once (K04); `analyze.py` takes the last. With the first estimate:
  M0 0.64 / 0.56, M1 0.74 / 0.38, M2 0.60 / 0.47; with the median: M0 0.78 / 0.73, M1 0.83 / 0.54, M2 0.80 / 0.60
  (`posthoc-sensitivity.py`). No variant beats M0 on items by 0.25.

## Not measured

Items of the maintainer's size in the lab (K01): a corpus that makes the agent work 15–50 minutes an item is not
built; the cause of the maintainer's longer items (a larger codebase, waiting on tools, review rounds) is not
separated. Opus/Sonnet at n = 1 per goal; Fable; Codex; effort other than xhigh. The fix for K04 is measured in
`../eta-key-fix-0.7.0/`. The dashboard's accuracy without K04.

## Decision (SPEC)

**No change to the factors** (K03, robust to K07). Task size as Haiku estimates it does not explain the shortfall the
maintainer saw (K02); the per-project factor that `timings.jsonl` feeds stays the correction for a project whose items
run longer than the lab's, and backlog D24 (refit from about 30 real Haiku rows) stays open. K04 is a defect in the
0.7.0 candidate: fixed and checked in `../eta-key-fix-0.7.0/`.
