# Findings — free-hands 0.6.0 candidate end to end (stopped: the estimator never started)

Claude Code 2.1.325, tmux 3.8, Python 3.9.6 (`runs/V00`), macOS, 2026-11-16. One cell completed.

## Deviation — a subject defect, found in the first cell; the run was stopped

- **`p1-tally-sonnet-B` completed** (exit 0, 319 s, 0.80 USD, tests passed afterwards), **but the hook never started
  the estimator**: `.free-hands/` held no `estimates.jsonl`, `estimator.json` or `estimator.log`. The candidate starts
  it only when `CLAUDE_CODE_EXECPATH` is set (resting on `../eta-isolated-probes-2.1.325/` I02), and this runner, unlike
  the probes', removed that variable from the environment it passed on. The clean-environment probes that followed
  (`../eta-isolated-probes-r3-2.1.325/` I06) show Claude Code does not set it for hooks: round 1's I02 read a value
  inherited from the lab session.
- **`p2-shelf-sonnet-B` was stopped by the experimenter** while its session ran (no `DONE`; its cost not recorded), and
  **`band` was not started**: with the same subject they could only repeat the defect. Re-measured with the fixed
  candidate in `../eta-isolated-run-r2-0.6.0/`.
- **`analyze.py` defect**: its leak pattern matches `ETA` case-insensitively as a word, and the lab's own temporary
  path `fh-eta-isolated-run` matches. All 20 hits in the p1 stream were that path (post-hoc: 0 hits outside it). The
  sibling's analysis drops the lab path before matching.

## Measured (p1 only, post-hoc on the stream)

- The main agent received and wrote nothing about estimates: no `(~<n>m`, "estimate", `estimates.jsonl`, `ETA`,
  `eta.json` or `timings.jsonl` outside the lab path, in its text, tool inputs, tool results or hook outputs; its
  checklist items carried no estimate.
- The recorder wrote 6 rows (one batch of 6: the agent checked every item in one edit at the end, so each row has the
  same 0.56 min) with no estimate and no estimator.

## Decision (SPEC)

Not taken: the subject could not start its estimator. See the sibling.
