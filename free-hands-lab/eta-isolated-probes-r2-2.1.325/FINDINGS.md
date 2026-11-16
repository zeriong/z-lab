# Findings — free-hands isolated estimator, platform probes round 2

Claude Code 2.1.325, tmux 3.8, Python 3.9.6 (`runs/V00`), macOS, 2026-11-16.

## Deviation — nothing measured

`env -i` kept `HOME`, `PATH`, `TERM`, `LANG`, `TMPDIR` and `CLAUDE_CONFIG_DIR` only, and Claude Code was not logged in:
C1 (`-p`) exited 1 with empty output and no hook ran; C2 (interactive) showed "Not logged in · Run /login" and the
prompt never ran. The environment also dropped `USER`, `LOGNAME` and `SHELL`, which every user terminal has. Measured
again with those three kept in `../eta-isolated-probes-r3-2.1.325/`.
