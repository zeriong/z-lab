# Findings — free-hands 0.5.0 candidate, estimate vs actual time per item (Claude Code)

Claude Code 2.1.325, Python 3.9.6, Node 25.9.0 (`runs/V00`), macOS, 2026-11-16. Models as resolved in each stream's
`system/init`: `claude-sonnet-5-5`, `claude-opus-5-5`, `claude-fable-5-2`, all at effort xhigh. Subject
`subject/free-hands/` (`subject.sha256`), corpus `../eta-corpus/` (`corpus.sha256`). Records: `runs/<cell>/` (stream
and transcript gzipped, `free-hands-dir/` with the recorder's files, `lab/` with the witness). Numbers: `METRICS.md`
(from `analyze.py`, as frozen) and `POSTHOC.md` (from `posthoc.py`, written after the run — not in the SPEC). 13 cells,
all exit 0, one run each, three at a time; 44.93 USD. `p1-tally-sonnet-r1` ran first, alone, as a canary; the other 12
ran after it with the subject unchanged.

## Measured

- **E01 — The recorder agrees with the witness.** In every cell the recorded minutes summed to the witness's wall clock
  from the goal file's first checklist to its last completion within 0.1 min (e.g. 11.4 vs 11.4, 8.8 vs 8.9). No tool
  call of any agent named `eta.json` or `timings.jsonl` (streams). 75 items were recorded `done` with an estimate; none
  `skipped`; one item went unrecorded (E09).
- **E02 — Every agent wrote the estimates as asked.** All 76 items in the 13 final goal files carried `(~<minutes>m <category>)`; the agents split
  the five tasks into 5–7 items (a test item, an ops item for commits, a decision item), so categories `test` and `ops`
  appear beside the five task categories.
- **E03 — Agents overestimate their own time: 5–12× on average per family, and in every category and fixture.**
  (Corrected 2026-11-16: the first wording read 5–12× for every category; per family × category the geometric-mean
  ratio ran from 0.42 — Fable refactor, n=1 — to 0.02 — Opus test, n=1 — so 2.4× to about 50×.) Ratio actual /
  estimate (geometric mean): Sonnet 0.08 (n=34), Opus 0.13 (n=34), Fable 0.20 (n=7, one fixture). The raw estimate's
  median error was 3.49 doublings (Sonnet), 3.02 (Opus), 2.29 (Fable); 0–17 % of items fell within ±50 % in any group.
  Per cell, Σ estimate vs Σ actual ran from 32 vs 3.7 min (p1 Sonnet) to 78 vs 12.2 min (p3 Opus).
- **E04 — A family factor fitted on other fixtures cuts the error from about 3.3 to about 0.5–0.7 doublings.**
  Leave-one-fixture-out (frozen analysis): p1 3.32 → 0.58, p3 3.17 → 0.80; p2 3.22 → 1.07, where Fable, which ran on p2
  only, had no factor in training and stayed raw. Post-hoc, Sonnet and Opus only (`POSTHOC.md`): 3.32 → 0.74 with
  family × category factors, 3.32 → **0.51 with one factor per family** — category factors fitted on six items per cell
  did worse on held-out fixtures than the family factor alone.
- **E05 — Per goal, the family factor brought the total within 1.4× on median.** Post-hoc, leave-one-fixture-out: Σ
  estimate × factor vs Σ actual had a median error of 0.55 doublings; 4 of 12 cells within ±25 %. The misses are
  per project and family: Opus on p1 took about twice the prediction (6.0 vs 11.4, 3.0 vs 6.6 min), Sonnet on p3 1.5×.
- **E06 — Projects differ.** Ratio by fixture: Sonnet 0.08 (p1), 0.05 (p2), 0.11 (p3); Opus 0.14, 0.11, 0.13. That is the
  part a per-project record has to learn.
- **E08 — Opus and Fable consulted the panel; Sonnet never did.** Agent dispatches of the five `free-hands:` roles:
  Opus 1–2 rounds in each of its six cells, Fable 1 round, Sonnet 0 in six cells (stream `tool_use` of the main agent).
  The panel's time is part of the item that was in progress — as in real use — and is one plausible reason the Opus
  ratio is higher than Sonnet's; this experiment does not separate the two.
- **E09 — An item added mid-run already checked is not a sample, and its time goes to the next completion.**
  `p2-shelf-opus-r2`: the agent added "Extra (outside the five tasks, panel 01): fix isOverdue …" as `- [x]` in the same
  edit that checked the README item; the recorder, by design, took an item first seen finished for one finished before
  the clock, recorded no row for it, and gave the README item all 7.6 minutes. 6 items stood in that goal file, 5 rows
  in the record. Candidate change for validation: an item that first appears finished while the clock already holds
  items joins that edit's batch.
- **E07 — The run cost and time differ by family.** Per cell: Sonnet 0.68–1.83 USD and 247–629 s; Opus 3.02–6.99 USD
  and 502–946 s; Fable 6.94 USD and 827 s. Advisor calls: 0 in every cell. Every fixture's tests passed afterwards.

## Limits of the measurement

- 20 of the 75 rows come from edits that checked several items at once; the recorder split that time by estimate, so
  within such a batch every item has the same ratio. Family-level means are unaffected; per-item spread is understated.
- The planning phase (from the prompt to the first checklist) belongs to no item and is not in any ratio.
- `-p` runs with `--setting-sources project,local`: no user CLAUDE.md, hooks or other plugins. A user's own
  environment adds work (instructions, other hooks); the project factor is what absorbs it.
- n per family × category is 6 at most; Fable n=7 on one fixture.

## Not measured

Codex; interactive sessions; effort levels other than xhigh; Haiku; tasks outside the corpus; the panel's share of the
Opus and Fable times (E08); estimates on held-out goals (`../eta-validate-0.5.0/`).

## Decision (SPEC)

E01 held: the recorder is kept. Leave-one-fixture-out error fell below raw (E04): factors go to validation. Taken to
the validation subject, by the post-hoc E04/E05 result: **one factor per family** (Sonnet 0.080, Opus 0.126, Fable
0.197), no category factors; families without a factor use the mean of the three (0.125) — a decision, not a
measurement for them (`analyze/improvement-backlog.md` D20). The validation compares family-only with
family × category on held-out goals before either ships.
