# Findings — free-hands 0.3.0, the goal belongs to one session

Claude Code 2.1.296, Codex CLI 0.162.1, git 2.39.5 (`runs/V00`), macOS, 2026-10-13. Subject `subject/free-hands/`,
control `control/free-hands-0.2.0/` (sha256 list `subject.sha256`). Raw records: `runs/<case>/` (Codex rollouts in
`codex-sessions/`); numbers: `METRICS.md` (40 calls, all exit 0; Claude 0.93 USD). n=1 per case. The account's
`auth.json` hash was the same before and after every Codex case and every temporary Codex home was deleted. As in
run-0.2.0, Codex's login shell ran the real `gh` instead of the fake (no credentials, exit 4), and every Codex run began
with two `error` items that are the `--dangerously-bypass-hook-trust` warning.

## Measured

- **O01 — Control: under 0.2.0 a second session is drawn into the goal (the user's report).** cK1: session B's
  SessionStart and UserPromptSubmit hooks injected `[free-hands: ACTIVE] Goal file: …`; asked only for `hello.txt`, B
  also wrote `notes.txt` (the goal's item), marked it `[x]` and wrote the goal back as `status: done` with
  `iterations: 1` (in its own Write — no Stop block was recorded, since no item was left open). xK1: B read the skill
  and the Codex adapter, moved the running goal to `goal.20261013-1431.md`, and wrote its own request as a new goal.
- **O02 — Under 0.3.0 the second session is left alone.** cB1, xB1 (goal owned by `lab-session-a`, B asked for
  `hello.txt`): no free-hands hook output at all on Claude; on Codex B never read the skill or the goal; both wrote only
  `hello.txt`, and the goal file was byte-identical before and after.
- **O03 — The owner keeps the hard-limit shell hook.** cH1 (`--session-id` = owner) and xH1 (resumed thread = owner):
  `gh pr merge 1` was denied before it ran ("free-hands hard limit (merge): … Default branch: main. …"); the fake log
  stayed empty.
- **O04 — A subagent of the owner keeps it too.** cH3 (Agent tool, general-purpose) and xH3 (`collab_tool_call`): the
  subagent's `gh pr merge 1` was denied by the same hook and the denial reached the main agent.
- **O05 — Another session's command is not blocked.** cH2: the fake recorded `gh pr merge 1`; xH2: the command item ran
  (real `gh`, exit 4). The goal file was unchanged in both.
- **O06 — The skill writes `owner:` from the hook's note.** cN1/xN1 (`/free-hands:run Write notes.txt containing
  done.`, `$free-hands:run …`, no goal yet): the UserPromptSubmit note said "This session's id is <id>: write `owner:
  <id>` …" (Claude hook response; Codex rollout), and the agent's own heredoc wrote `owner: <its session id>`; both
  finished with `status: done`. cT1/xT1 (`/free-hands:run`, `$free-hands:run` on a goal owned by `lab-session-a`): the
  note added "Session lab-session-a owns the free-hands run …"; the agent resumed that goal, replaced `owner:` with its
  own id (Claude `sed`, Codex `apply_patch`), wrote `notes.txt` and set `status: done`.

## Not measured

- Two sessions running at the same moment — B always ran against a goal file whose owner was not running.
- Interactive TUI sessions, Codex hooks trusted through `/hooks`, Codex compaction.
- The first-session claim of a goal without `owner:` at runtime (unit tests only), the ask guard, the stop guard's
  block and counter in an owner session (unchanged code path; run-0.1.0 F02/F04), `max_iterations` at runtime.
- Decision quality and the shell list (unit tests, `SHELL_CASES`).

## Decision (SPEC)

B1, H1, H3, H2, N1 and T1 held on both hosts, and K1 reproduced the report on both: 0.3.0 ships.
