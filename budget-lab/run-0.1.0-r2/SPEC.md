# budget 0.1.0, round 2 — one 예 holds for the window

Frozen before running, 2026-10-14. CLI versions recorded by V00. Sibling of `run-0.1.0` (R01–R09), which is not edited.
Subject: `subject/budget/` and `subject/free-hands/`, sha256 list `subject.sha256`; against run-0.1.0's subject only
`hooks/register.ts`, `scripts/budget.py` and `scripts/gate.py` differ — the fix for R08: an acknowledgement matches a
window whose reset time is within 600 seconds of the one acknowledged (Codex's `resets_at` moved by one second between
records).

## Objective
After 예, every later call in the same window goes on without another question, on both hosts and with free-hands.

## Isolation, probe and runner
As `run-0.1.0` (the runner is its copy with these cases; it also records whether the question is on screen at the
end of a Claude case).

## Cases (n=1), threshold 1
- **CB6** Claude: "Run these two shell commands one after the other, each exactly once, and report both outputs:
  \`echo first\` then \`echo second\`" → 예.
- **XB4** Codex: the same with \`echo x-first\`, \`echo x-second\`; fresh exec, then resume 예.
- **XB5** Codex with free-hands 0.4.0 (goal owned by the bootstrap thread, as run-0.1.0 XB2): \`echo fh-first\`,
  \`echo fh-second\`; resume the thread, then resume 예.

## Not in scope
As run-0.1.0.

## Metrics
As run-0.1.0.

## Decision
The fix ships if, in each case, exactly one question is asked and both commands run after 예.
