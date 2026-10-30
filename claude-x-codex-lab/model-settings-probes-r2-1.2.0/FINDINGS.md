# Findings — probes r2: a set CLAUDE_CONFIG_DIR reaches the session's shell

Claude Code 2.1.314, macOS 27.0.1, 2026-10-30. Raw record: `runs/R01/` (`pty.log`, `summary.json`).

## Measured

- **R01 — bash mode sees the variable.** In an interactive session started with `CLAUDE_CONFIG_DIR` set to a fresh
  temporary home, bash mode's `echo "DIR=$CLAUDE_CONFIG_DIR"` printed `DIR=<that temporary home>` (expect exit 0,
  14.5 s, not logged in). The `env | grep -c` line drew only `Running…` before the next input, so its count is not in
  the log; the `DIR=` line is the evidence.

## Not measured

- The Bash tool itself: bash mode is the user-facing route to the same session shell, and that the Bash tool shares its
  environment is inferred, not measured (the tool needs a model call, which needs a login, which P09 lost when the
  variable was set).
