# Findings — free-hands 0.1.0 r2, the fixes run-0.1.0 called for

Claude Code 2.1.287, Codex CLI 0.160.0 (`runs/V00`; both CLIs were upgraded since run-0.1.0's 2.1.286 / 0.159.3),
macOS, 2026-10-02. Subject `subject/free-hands/` (sha256 list `subject.sha256`; differs from run-0.1.0's only in
`scripts/guard.py` and `skills/run/SKILL.md`). Raw records: `runs/<case>/`; numbers: `METRICS.md` (16 calls, all exit 0).
n=1 per case.

## Measured

- **G01 — A stop request now ends as `paused` (run-0.1.0 F03).** R01, the C01 prompt again ("Do only the first item,
  then stop and wait for my approval"): the model did item 1 and set `status: paused` with two `- [ ]` items left
  (`iterations` 0). The guard's new path — `waiting`/`done` with open items keeps blocking — was not reached, because
  the model chose `paused`; it is covered by unit tests only.
- **G02 — The restore note arrives after a compaction (run-0.1.0 F12).** R02: turn 1 without a goal; the runner then
  wrote an active goal; turn 2 `/compact`. Both SessionStart responses of that turn returned `[free-hands: ACTIVE] Goal
  file: …`.
- **G03 — An item that needs the user ends as `[-]` and `waiting`.** R03 (G(1, "write c.txt with the content the user
  gives you")): the model marked the item `- [-] … — needs the user: no content was given …`, set `status: waiting`, and
  the stop was allowed (no block). The release at `max_iterations` was not reached. The model rewrote the whole goal
  file with `iterations: 1` although no Stop block had happened — the counter is writable by the agent.
- **G04 — The Claude main waits for every role (run-0.1.0 F08).** R04: the five role results arrived (as background
  task notifications) before the first `panel.py tally`; tally → all five A; no "panel degraded". The main used
  background "Wait for panel agents" tasks, and the Stop guard blocked four times while it waited (`iterations` 4).
  No entry note fired on any notification (UserPromptSubmit returned the ACTIVE note instead). Roles used only Read and
  Glob; `modelUsage` lists `claude-sonnet-5-5` and `claude-opus-5-5`.
- **G05 — The goal folder stays out of git on Codex (run-0.1.0 F07).** R05: entry "응" → the agent wrote
  `.free-hands/.gitignore` (`*`) and the goal file; `git status` listed only `hello.txt`.
- **G06 — A sandboxed Codex main cannot run the panel; it degrades.** R06: the Codex main (`codex exec -s
  workspace-write`, approvals never) ran `panel.py run`. All five children started on the resolved models (`ran`
  gpt-6-luna ×3, gpt-6.1-sol ×2) and exited 1 with "Transport channel closed … error sending request for url
  (https://chatgpt.com/backend-api/…)" — no network inside the main's sandbox. The agent retried, tallied
  (`decide-alone`, zero valid replies), recorded the degraded panel, decided alone (A) and set `status: paused`
  (the prompt said "then stop").

## Consequences (inference, not measured)

- On Codex the panel needs the main to run `panel.py run` with network access — an approved escalation in an
  interactive session, or a sandbox that allows network. Without it the run continues and the panel degrades to the
  main deciding alone, recorded as such (G06).
- The counter guards against an endless loop only as far as the agent leaves `iterations` alone (G03).

## Not measured

- The guard blocking a `waiting`/`done` status with open items at runtime (G01; unit tests only), and the release at
  `max_iterations` (G03; unit tests only).
- The Codex panel from an interactive session with an approved escalation, or with a network-enabled sandbox.
- Round 2 (every panel agreed again), Claude roles' web use (none searched), and everything run-0.1.0 listed as not
  measured.
