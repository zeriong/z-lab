# free-hands 0.1.0 r2 — the fixes run-0.1.0 called for

Frozen before running, 2026-10-02. Claude Code and Codex CLI versions are recorded by V00. Subject:
`subject/free-hands/` (sha256 list `subject.sha256`); against `../run-0.1.0/subject` only `scripts/guard.py` and
`skills/run/SKILL.md` differ (the fixes for run-0.1.0 F03, F07, F08). The runner never edits the subject.

## Objective
Measure the three fixed behaviors on the host where each was observed, and close two gaps run-0.1.0 left open: the
restore note after a compaction with an active goal (F12), and the panel started by a Codex main itself (F09 was started
by the runner).

## Method
As `../run-0.1.0/SPEC.md` (§Method), reusing its runner by import (read-only) with this directory's subject and runs:
Claude `claude -p … --plugin-dir subject/free-hands --model sonnet` with the account's login; Codex in a temporary
`CODEX_HOME` holding a copy of the account's `auth.json`, the subject installed from a temporary local marketplace,
`codex exec --json --dangerously-bypass-hook-trust -s workspace-write`, main model the newest `luna`, effort `medium`.
One temporary git repository per case. n=1 per case.

## Cases
- V00 `claude --version`, `codex --version`.
- R01 Claude stop request (run-0.1.0 C01 again). G(2, `- [ ] write a.txt containing 1`, `- [ ] write b.txt containing 2`,
  `- [ ] write c.txt with the content the user gives you`). Prompt: "Read .free-hands/goal.md. Do only the first item,
  then stop and wait for my approval." Expected under the fix: final `status: paused`, or a Stop block whose reason says
  `waiting`/`done` does not end the run. Record status, `iterations`, Stop responses.
- R02 Claude restore note after compaction. Turn 1, no goal file: "Reply with the word ok only." Then the runner writes
  G(5, `- [ ] write a.txt containing 1`). Turn 2 `--resume` `/compact`. Record the SessionStart responses after the
  compaction.
- R03 Claude limit release. G(1, `- [ ] write c.txt with the content the user gives you`). Prompt: "Read
  .free-hands/goal.md and finish it." Record Stop responses (a block saying "last continuation", then an allowed stop),
  the final status and `iterations`, and whether the item became `[-]`.
- R04 Claude panel (run-0.1.0 C04 again, same brief). Record: the order of the five role results and the first `panel.py
  tally` call (the fix: no tally before every dispatched role returned or was 10 minutes overdue), the tally output,
  whether "panel degraded" is recorded, UserPromptSubmit responses to background-task notifications (the fix: no entry
  note), Stop blocks, the final goal.
- R05 Codex entry yes (run-0.1.0 X03 "yes" again). Record `.free-hands/.gitignore`, `git status` (the fix: no
  `.free-hands/` entry), `hello.txt`, the final status.
- R06 Codex main runs the panel. G(5, the C04 panel item) and the C04 brief; prompt as C04 ("Follow step 4 of the
  free-hands skill …"). Record whether `panel.py run` was started, each child's start/exit/`ran`, the tally, whether
  the agent recorded "panel degraded", and the final goal. Escalation outside the sandbox is not available in
  `codex exec` (approvals never); what the agent does then is the result.

## Not in scope
Everything run-0.1.0 listed as not in scope; decision quality; round 2 (a split cannot be forced).

## Metrics
Exit codes, elapsed ms, tokens and Claude cost per call. Deltas N/A.

## Decision
free-hands 0.1.0 ships the fixes this run confirms; a contradicted fix is changed and measured again in a new sibling.
