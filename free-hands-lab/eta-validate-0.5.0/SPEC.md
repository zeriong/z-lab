# free-hands 0.5.0 candidate — does the calibrated expected finish beat the raw estimates on held-out goals?

Frozen before running, 2026-11-16. CLI versions recorded by V00. Claude Code only (maintainer request, 2026-11-16).
Sibling of `../eta-calibrate-0.5.0/` (E1), which is not edited.

Subject: `subject/free-hands/` — the 0.5.0 release candidate: E1's subject plus (1) `scripts/eta-baseline.json` holding
the factors E1 fitted as one factor per family — Sonnet 0.080, Opus 0.126, Fable 0.197 — and `default` 0.125 for families without one;
no category factors (E1 FINDINGS E04 post-hoc, backlog D20), (2) `status` naming the
goal file in `watch` for the dashboard, (3) `predict` treating an item the goal file shows finished, but the clock has
not recorded yet, as finished just now, (4) the recorder counting an item that first appears finished mid-run in that
edit's batch (E1 E09), and no longer waking for an item that left the goal file. SKILL.md is E1's. Maintainer `CLAUDE.md` left out.
sha256 lists: `subject.sha256`, `corpus.sha256` (unchanged corpus). The runner never edits either.

## Objective
On goals the factors were not fitted on (corpus goals B and C), measure per item whether the agent's estimate ×
the shipped factor is closer to the measured time than the raw estimate, and whether the project factor learned from
the repository's own record (`.free-hands/timings.jsonl`) brings it closer again; and measure, per goal, how far the
remaining time the dashboard showed when the checklist was written was from the time the goal actually took.

## Cells
`<fixture>-<family>` for fixtures p1-tally, p2-shelf, p3-orders × families sonnet, opus (6 cells), and `p1-tally-fable` with goal B only (Fable "minimal", backlog D21).
A cell is one fresh copy of the fixture (setup as E1: git, fake `gh`/`npm`/`vercel`/`docker`, `CXC_MODE=off`) on which
goal B runs and then goal C, each as its own `claude -p "/free-hands:run <prompt>"` session with E1's flags (`--setting-
sources project,local --model <family> --effort xhigh --max-budget-usd 15 …`, 75-minute limit). C therefore starts
with B's records in `.free-hands/timings.jsonl` — what a user's project holds after one goal. The witness is E1's, plus:
whenever the goal file's checklist marks change, it runs the subject's `guard.py status` in the repository and records
the JSON (the dashboard's free-hands entry at that moment). Cells run three at a time; the runner stops starting cells
at 50 USD recorded cost (the ETA series' remaining budget after E1).

## Analysis (`analyze.py` → `METRICS.md`, `items.csv`)
- Per item (`done`, with an estimate): error = |log2(actual / predicted)| for raw = estimate, base = estimate × shipped
  factor, cat = estimate × E1's family × category factor (`../eta-calibrate-0.5.0/baseline-candidate.json`), proj = base × project factor from the records before the goal, online = base × project factor from every
  record before that item (what the dashboard computes). Medians by family, by goal (B has no prior record), overall.
- Per goal: the dashboard's `~<n>m left` at the first checklist write against the wall-clock minutes until the goal's
  last completion (the witness's clock, so idle time would count — none is expected in a `-p` run).

## Not in scope
Codex; effort levels other than xhigh; interactive sessions (the band itself: `dashboard-lab/run-0.3.0`); tasks outside
the corpus; projects with a long record.

## Metrics
Per goal: exit, elapsed, cost, tokens, turns; per item as above. Deltas: median error raw vs base vs proj vs online.

## Decision
The shipped factors stay in 0.5.0 if, over all held-out items, base's median error is lower than raw's; if cat's is
lower than base's, the category factors replace them. The project
factor stays if, on goal C items, proj's (or online's) median error is not higher than base's. A factor that does not
hold is removed (estimates used as written for that part) and the result recorded; "more accurate" is claimed in the
README and CHANGELOG only for what held here.
