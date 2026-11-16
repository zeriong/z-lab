# free-hands isolated estimator — platform probes, round 3 (a clean environment, logged in)

Frozen before running, 2026-11-16. Sibling of `../eta-isolated-probes-2.1.325/` and `-r2-2.1.325/`, not edited.
Round 2 measured nothing: its `env -i` also dropped `USER`, `LOGNAME` and `SHELL`, and Claude Code was not logged in.
This round keeps those three; everything else is round 2's. Its I02 read the hook's
environment while the runner passed on the environment of the Claude Code session it ran in, so `CLAUDE_CODE_EXECPATH`
and the other `CLAUDE_*` values may have been inherited rather than set for the hook. `../eta-isolated-run-0.6.0/`
then ran the candidate with `CLAUDE_CODE_EXECPATH` removed, and its hook never started the estimator (that
experiment's deviation). Measure what a hook receives when Claude Code starts from a clean environment, as from a user's
terminal.

## Environment
Every case starts `claude` under `env -i` with only `HOME`, `PATH`, `TERM`, `LANG`, `TMPDIR`, `USER`, `LOGNAME`, `SHELL` and
`CLAUDE_CONFIG_DIR`
(the account's login) — no other `CLAUDE_*`, `CODEX_*` or `ORCA_*` variable. The probe hook (PostToolUse, first call
only) logs: every environment variable name; the values of those starting with `CLAUDE` or `CODEX` (secrets masked);
`shutil.which("claude")`; its parent process id and that process's executable (`ps -o comm=`); and the executable of
`CLAUDE_PID` if set. It prints nothing.

## Cases (n=1)
- **V00** — `claude --version`, `tmux -V`, `python3 --version`.
- **C1** — `claude -p "Run exactly this shell command with Bash, then reply done: echo hi" --setting-sources
  project,local --plugin-dir <probe> --model sonnet --permission-mode acceptEdits --allowedTools Bash` in a scratch
  repository.
- **C2** — the same plugin in an interactive session in tmux (200×50) started with the same `env -i`, the trust step
  of `../eta-probes-r3-2.1.325/`, the same prompt; the session is closed after the hook log appears or 120 s.

## Decision
None ships. The findings decide how the candidate's hook finds the Claude Code CLI and tells Claude Code from Codex.
