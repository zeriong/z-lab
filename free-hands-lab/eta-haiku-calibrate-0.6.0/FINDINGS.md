# Findings — free-hands 0.6.0 candidate, the isolated Haiku estimator against measured item times

Claude Code 2.1.325, Python 3.9.6 (`runs/V00`), macOS, 2026-11-16. Estimator model as resolved in every run:
`claude-haiku-5-5`, effort low, safe mode, read-only tools. Subject `subject/free-hands/` (`subject.sha256`); inputs
`inputs.json` (26 goal runs, 157 items, 153 with a measured time: goal A 75, B 43, C 35), frozen with the SPEC.
Numbers: `METRICS.md`, `items.csv` from `analyze.py`. 78 estimator runs (26 × 3), 0.138 USD.

## Measured

- **H01 — The estimator ran cleanly and fast.** 78 of 78 runs answered with parseable JSON; 468 of 471 asked items were
  answered (three runs left out one item each); no run changed its fixture (`git status` empty); 6.05 s median, 10.1 s
  at most per run; 0.0013–0.0032 USD per run.
- **H02 — Haiku gives nearly the same estimate on each run.** Over the three runs per item: max/min median 1.25, 90th
  percentile 1.67; the median run equals the item's median (|log2| 0.00).
- **H03 — Haiku overestimates the working agents even more than they overestimate themselves.** Measured / Haiku
  estimate on goal A (geometric mean): Sonnet 0.040 (n=34), Opus 0.070 (n=34), Fable 0.074 (n=7); raw Haiku error
  4.21 doublings in-sample, 4.03 on goals B and C (the agents' own raw estimates: about 3.2, eta-validate-r2 W01).
- **H04 — On goals the factor was not fitted on, Haiku × factor came within 0.68 doublings — a little behind the
  agents' own estimates.** Goals B and C, 78 items: raw Haiku 4.03 → Haiku × factor 0.68; the working agent's own
  estimate × 0.5.0's factor 0.62. Sonnet 0.62 vs 0.60, Opus 0.72 vs 0.65, Fable 0.75 vs 0.74; goal B 0.97 vs 0.70, goal
  C 0.59 vs 0.59; p1 0.75 vs 0.59, p2 0.81 vs 0.68, p3 0.45 vs 0.66.
- **H05 — Per goal run, Haiku × factor was within 1.58× of the measured total on median (0.66 doublings), self × factor
  within 1.42× (0.51).** 13 goal runs. Haiku fell short on the small fixture p1 in every goal run there (4.8 vs 11.3,
  3.2 vs 6.5 min …) and came close on p3 (7.6 vs 8.0, 9.9 vs 10.4 min).

## Limits of the measurement

- Goal C was estimated on a fresh fixture; the measured runs had goal B's changes in place (not recoverable).
- The measured times come from sessions whose agents also wrote estimates (0.5.0); in 0.6.0 they do not, which may
  change how long items take. Not measured here.
- The estimator saw the recorder's item keys (the checklist text without the agents' estimates), all at once per goal
  run; in use it sees the open items without an estimate each time the checklist changes.

## Not measured

Codex; the estimator started by the real hook during a run (`eta-isolated-probes` I05 measured the mechanism; an
end-to-end run of the candidate is a separate experiment); other estimator models or efforts.

## Decision (SPEC)

Haiku × factor (0.68) is below raw Haiku (4.03) on goals B and C: the `haiku` factors of `baseline-candidate.json` —
Sonnet 0.040, Opus 0.070, Fable 0.074, default 0.061 — ship in 0.6.0. The comparison is reported: the isolated
estimator is 0.06 doublings less accurate per item and 0.15 per goal run than the agents' own estimates; the maintainer
chose isolation (2026-11-16).
