# Findings — free-hands isolated estimator, platform probes round 3 (a clean environment)

Claude Code 2.1.325, tmux 3.8, Python 3.9.6 (`runs/V00`), macOS, 2026-11-16. Claude Code started under `env -i` with
`HOME`, `PATH`, `TERM`, `LANG`, `TMPDIR`, `USER`, `LOGNAME`, `SHELL` and `CLAUDE_CONFIG_DIR` only. Records:
`runs/<case>/summary.json`. n=1 per case. C1 0.043 USD; C2 interactive (no cost reported).

## Measured

- **I06 — Claude Code gives a hook `CLAUDECODE=1`, not `CLAUDE_CODE_EXECPATH`.** C1 (`-p`) and C2 (interactive): the
  hook received `CLAUDECODE=1`, `CLAUDE_PID`, `CLAUDE_CODE_ENTRYPOINT` (`sdk-cli` in C1, `cli` in C2),
  `CLAUDE_CODE_SESSION_ID`, `CLAUDE_CODE_SESSION_ATTENDED` (`0` / `1`), `CLAUDE_CODE_CHILD_SESSION=1`,
  `CLAUDE_CODE_MESSAGING_SOCKET`, `CLAUDE_CODE_MESSAGING_TOKEN`, `CLAUDE_EFFORT`, `CLAUDE_PROJECT_DIR`,
  `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA` and the inherited `CLAUDE_CONFIG_DIR` — and no `CLAUDE_CODE_EXECPATH`.
  Round 1's I02 read that variable from the environment the lab session passed on.
- **I07 — The hook finds the CLI on `PATH`.** `shutil.which("claude")` gave `/opt/homebrew/bin/claude` in both cases;
  the hook's parent process and `CLAUDE_PID` were the `claude` process (`ps -o comm=` gives the name only).

## Not measured

Codex's hook environment (whether it sets `CLAUDECODE`); a `claude` that is not on `PATH`.

## Decision (SPEC)

None ships. The candidate starts the estimator only when `CLAUDECODE` is `1`, with `CLAUDE_CODE_EXECPATH` when it is
set and otherwise the `claude` found on `PATH`; with neither, no estimator.
