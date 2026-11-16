# Findings — free-hands 0.6.0 candidate end to end, round 2 (Claude Code)

Claude Code 2.1.325, tmux 3.8, Python 3.9.6 (`runs/V00`), macOS, 2026-11-16, Sonnet 5.5 at effort xhigh as the working
model, Haiku 5.5 as the estimator. Subject `subject/` (`subject.sha256`). Records: `runs/<case>/`; numbers:
`METRICS.md` from `analyze.py`. n=1 per case. Main sessions 0.73 and 0.83 USD; estimator runs 0.0018 and 0.0090 USD;
the interactive case reports no cost. Every session started from a user-like environment (SPEC).

## Measured

- **J01 — Nothing about estimates reached the main agent.** Both headless cells: 0 hits of `(~<n>m`, "estimate",
  `estimates.jsonl`, `ETA`, `eta.json` or `timings.jsonl` (lab paths removed) in the main agent's text, tool inputs,
  tool results and hook outputs; every free-hands hook output was empty of them; the agents' checklist items carried
  no estimate.
- **J02 — The hook started the estimator, which answered in about 6 s and left nothing behind.** p1: one estimator run,
  6 items, `claude-haiku-5-5`, 6.1 s, the first row 6.2 s after the checklist was written; p2: first row 6.3 s after
  it, 5.2–6.5 s per run. No `estimator.log` (no error), the lock free once the session ended, and one new transcript
  per cell — the main session's own.
- **J03 — The dashboard entry carried the expected finish once estimates landed.** p2: the witness's status read
  `active 0/40 · 6 open` at the first checklist (estimates not yet written) and `active 0/40 · 3 open · ETA 18:44 ·
  ~1m left` at the next change. The recorder wrote 6 rows, 5 with a Haiku estimate.
- **J04 — In an interactive session the band showed the expected finish 2.0 s after the prompt and moved per item.**
  `band` (goal written without estimates): `3 open` at the prompt, `3 open · ETA 18:46 · ~1m left` at 2.0 s, then
  `2 open` (28.4 s), `1 open` (52.8 s), `active` (75.2 s) and `done` (77.2 s), before `turn.complete` at 79.7 s; three
  estimator rows, no error.
- **J05 — A defect: an agent that rewrites item text while checking items defeated the recorder.** p1: the agent's
  last edit checked all six items and reworded each (for example "… gives sum 5 over 2 values …" → "… gives count 2,
  sum 5; regression tests added …"). The recorder keys items by text and gated the last edit on an open key still in
  the file, so it recorded nothing (0 rows). In p2 the same rewording made the estimator ask again for reworded open
  items (6 runs, 11 rows for 6 items). Fixed after this round in the product (because-i-needed, unit tests in
  `EtaTest`): open keys that vanish pair, in order, with keys that appear in the same edit and keep their estimate; a
  leftover vanished key is marked gone. **Post-hoc replay** of p1's recorded files (`eta.json`, `estimates.jsonl`
  and the final `goal.md`) through the fixed recorder: 0 rows with the subject, 6 rows with the fix, each with its
  Haiku estimate (9, 6, 16, 12, 20, 8 min) joined through the earlier text. The replay checks attribution and joins,
  not durations; no new session was run with the fix.

## Not measured

Codex; Opus or Fable as the working model with the isolated estimator; the rewording fix in a live session (replay
only); several sessions at once; estimate accuracy (`../eta-haiku-calibrate-0.6.0/`).

## Decision (SPEC)

J01 held in both cells and no free-hands hook output carried an estimate; the estimator wrote answers for both
checklists (J02); the band showed `ETA` while items were open (J04): 0.6.0 ships — with the J05 fix, which rests on
unit tests and the post-hoc replay only.
