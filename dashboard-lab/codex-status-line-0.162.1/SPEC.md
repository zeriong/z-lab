# dashboard 0.1.0 pre-build probe — Codex's built-in status line

Frozen before running, 2026-10-14. CLI versions recorded by V00.

## Why
Codex offers plugins no surface to draw on (its `tui.status_line` takes built-in item ids), so on Codex the dashboard
is a command (`$dashboard:audit`) and its README tells users how to show the usage window Codex reports — the 7-day
window, the only one on this account (budget-lab B02). The README must give a setting that works. The binary names the
items `weekly-limit`, `five-hour-limit`, `context-remaining`, `model-with-reasoning` and has a `/statusline` command and
the message "Ignored invalid status line". This probe measures what the TUI draws for a `tui.status_line` setting.

## Isolation
A scratch git repository per case; a temporary `CODEX_HOME` with a copy of the account's `auth.json` (sha256 of the
original before/after, deleted at the end of the case) and a `config.toml` that marks the repository trusted
(`[projects."<repo>"] trust_level = "trusted"`) plus the case's `[tui]` table; `codex` (the TUI) in a tmux session
200×50, the newest `luna` at `medium`, `CXC_MODE=off`. Each case sends "Reply with the word ok." and saves
`tmux capture-pane` snapshots before and after the reply.

## Cases (n=1)
- **S0** — no `[tui]` table (control).
- **S1** — `status_line = ["model-with-reasoning", "weekly-limit"]`.
- **S2** — `status_line = ["weekly-limit", "no-such-item"]`.

## Not in scope
The `/statusline` picker, the terminal title, other items.

## Metrics
Elapsed ms per case. Deltas N/A.

## Decision
The README gives the S1 setting if its snapshot shows the weekly window; S2 shows what an invalid id does.
