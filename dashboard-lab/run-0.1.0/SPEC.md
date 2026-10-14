# dashboard 0.1.0 — every because-i-needed mode in one place, on both hosts

Frozen before running, 2026-10-14. CLI versions recorded by V00. Subject: `subject/dashboard/` with the plugins whose
declarations it reads — `subject/budget/` (0.1.0 candidate), `subject/free-hands/` (0.4.0 candidate),
`subject/peer-coding/` (1.1.0 candidate) — sha256 list `subject.sha256`; the runner never edits them. Facts the design
rests on: `plugin-platform-lab/mod-dual-host-2.1.299` (M02–M06), `mod-interactive-2.1.299` (I01),
`dashboard-lab/codex-status-line-0.162.1` (C01–C03).

## Objective
Measure the shipped plugin: on Claude Code a band above the prompt shows each enabled because-i-needed plugin's declared
state (root Rule 11) and `/dashboard:audit` prints it with the levels; with no plugin declaring anything there is no
band. On Codex `$dashboard:audit` prints the same from the installed plugins, and the plugin loads without a hook error.

## Isolation
- Every case: a scratch git repository; `XDG_CONFIG_HOME` a temporary directory with `because-i-needed/budget.json`
  `{"percent": 80}`; peer-coding's project flag `.claude-x-codex/mode` = `mode=on`; `.free-hands/goal.md` active with one
  open item and `owner: lab-session-a` (an id no case runs as); `CXC_MODE` unset.
- Claude: tmux 200×50, `claude --plugin-dir <copy>/dashboard [--plugin-dir <copy>/budget --plugin-dir <copy>/free-hands
  --plugin-dir <copy>/peer-coding] --model sonnet --permission-mode acceptEdits --allowedTools Bash`, the account's
  login. Plugins loaded with `--plugin-dir` are not in `installed_plugins.json`, so `BECAUSE_I_NEEDED_PLUGIN_DIRS` names
  the same copies (the account's own installs are read as they are; none of them declares a state). Folder trust:
  Down, Enter (recorded in `~/.claude.json`).
- Codex: a temporary `CODEX_HOME` with a copy of the account's `auth.json` (sha256 of the original before/after,
  deleted at the end of the case), the plugins installed from a temporary local marketplace named `because-i-needed`,
  `codex exec --json --dangerously-bypass-hook-trust -s workspace-write -C <repo>`, the newest `luna` at `medium`.

## Cases (n=1)
- **CD1** Claude, all four: "Reply with the word ok."; snapshot; then `/dashboard:audit`; snapshot.
- **CD2** Claude, dashboard only, `BECAUSE_I_NEEDED_PLUGIN_DIRS` empty: "Reply with the word ok."; snapshot.
- **XD1** Codex, all four installed: `$dashboard:audit`.
- **XD2** Codex, dashboard only: `$dashboard:audit`.

## Not in scope
Installs through a Claude marketplace (unit tests read `installed_plugins.json`), desktop and IDE surfaces, the Codex
TUI.

## Metrics
Codex: exit codes, elapsed ms, tokens. Claude: elapsed ms. Deltas N/A.

## Decision
dashboard 0.1.0 ships if CD1's band and audit name budget 80%, free-hands active and peer-coding on (project), CD2
shows no band, XD1 prints the three entries with no hook parse error and XD2 says no plugin declares a state.
