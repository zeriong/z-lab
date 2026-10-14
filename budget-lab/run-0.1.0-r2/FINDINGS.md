# Findings — budget 0.1.0, round 2: one 예 holds for the window

Claude Code 2.1.299, Codex CLI 0.162.1, tmux 3.8 (`runs/V00`), macOS, 2026-10-14. Subject `subject/` (sha256 list
`subject.sha256`; against run-0.1.0 only the R08 fix differs). Records: `runs/<case>/`. Numbers: `METRICS.md` (all
subprocess calls exit 0). n=1 per case. The account's `auth.json` hash was the same before and after every Codex case;
every temporary Codex home was deleted.

## Measured

- **R10 — Claude: one question, then both calls.** CB6: one dialog, 예; `echo first` and `echo second` both ran
  ("Ran 2 shell commands"), and no question was on screen at the end.
- **R11 — Codex: one question, then both calls.** XB4: the fresh exec ended with the question; after 예, `echo x-first`
  and `echo x-second` ran with no second question.
- **R12 — Codex with free-hands 0.4.0: one question, then every call.** XB5: the gated turn ended with the question;
  after 예 the agent read the skill and the Codex adapter, ran `echo fh-first` and `echo fh-second`, and marked the goal
  `done`. `iterations` read 0 after the gated turn and 1 after the answered one (what raised it in the second turn is not
  recorded).

## Not measured

As run-0.1.0.

## Decision (SPEC)

R10–R12 held: the reset-time tolerance fixes run-0.1.0 R08, and budget 0.1.0 ships with it.
