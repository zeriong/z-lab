# free-hands-lab — analyze

- `improvement-backlog.md` — every decision and change of the free-hands plugin, linked to its evidence (finding IDs in
  the experiment directories) or marked as a maintainer decision.

Experiments: `../run-0.1.0/` (guard and panel on both hosts, the 0.1.0 subject), `../run-0.1.0-r2/` (the fixes that run
called for), `../run-0.2.0/` (the hard-limit shell hook), `../session-id-0.3.0/` (how each host identifies a session to
its hooks — the facts the 0.3.0 design rests on), `../run-0.3.0/` (the goal belongs to one session; 0.2.0 control); the 0.5.0 expected finish: `../eta-probes-2.1.325/` and `-r2`…`-r4` (platform facts — hook inputs, edit routes, isolation, a blocked Stop and the mod band), `../eta-corpus/` (three fixtures × goals A, B, C), `../eta-calibrate-0.5.0/` (estimate vs actual on goal A; the factors), `../eta-validate-0.5.0/` and `../eta-validate-r2-0.5.0/` (held-out goals B and C, pooled). The 0.6.0 isolated estimator: `../eta-isolated-probes-2.1.325/` and `-r2`, `-r3` (a detached hook child, safe mode, and what a hook gets from a clean environment), `../eta-haiku-calibrate-0.6.0/` (Haiku's estimates against the measured goal runs), `../eta-isolated-run-0.6.0/` and `-r2-0.6.0/` (end to end). The 0.7.0 overrun: `../eta-local-replay-0.7.0/` (the maintainer's report replayed; their numbers only) and `../eta-live-replay-0.7.0/` (the running item's overrun as evidence).

Tools: `../tools/export_records.py` — a project's `.free-hands` records as numbers only (no text), for
replays and recalibration from real use (backlog D24).
