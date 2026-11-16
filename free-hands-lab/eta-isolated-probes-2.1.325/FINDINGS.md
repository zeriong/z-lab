# Findings — free-hands isolated estimator, platform probes (Claude Code)

Claude Code 2.1.325, Python 3.9.6 (`runs/V00`), macOS, 2026-11-16. Records: `runs/<case>/summary.json` and the raw
streams beside it. n=1 per case. Cost: S1 and S3 parents (Sonnet) plus two Haiku estimator runs, 0.0024 and 0.0021 USD.

## Measured

- **I01 — A detached child does not hold the hook, outlives the parent, and leaves the parent's stream empty.** S1: the
  hook returned in 1.9 ms; the child (`start_new_session`, stdin from /dev/null, stdout and stderr to a file) ran on
  after the parent `claude -p` exited (child finished 13.1 s after the parent, its parent pid 1); the parent stream's
  `hook_response` output was `''`.
- **I02 — The hook can tell it runs under Claude Code, and finds its executable.** The hook environment held
  `CLAUDE_CODE_EXECPATH` (the running `claude` binary), `CLAUDE_PID`, `CLAUDE_PROJECT_DIR`, `CLAUDE_CODE_ENTRYPOINT`
  (`sdk-cli` under `-p`), `CLAUDE_EFFORT`, `CLAUDE_CODE_SESSION_ATTENDED` (`0` under `-p`). It also held `CODEX_HOME`
  (set by the Orca app for this account), so a `CODEX_*` variable does not mean Codex.
- **I03 — The safe-mode estimator ran Haiku, read the code, changed nothing and loaded no hook.** S2: model
  `claude-haiku-5-5`; tool uses Glob, Grep, no error; no hook event; `git status` clean afterwards; its JSON answer
  parsed (`{"items": [{"n": 1, "minutes": 8, "category": "fix"}, …]}`); 3.3 s, 3 turns, 0.0024 USD. Its init listed the
  full built-in tool set (Bash, Edit, Write among them; `--allowedTools` only pre-approves) and `orca-agent-view`, a
  plugin the Orca app adds through `CLAUDE_CODE_PLUGIN_DIRS`. `--help` lists `--tools <tools...>` to limit the
  built-in set.
- **I04 — `--no-session-persistence` left no transcript.** S2: no new `projects/*/*.jsonl`. S3: the one new
  transcript was the parent's (session id `4b81ef7e…`), not the estimator's (`d66753e1…`).
- **I05 — Started from a hook, the estimate was on disk 4.5 s after the hook ran, while the parent went on.** S3:
  hook 2.1 ms; estimator finished 3.2 s after the parent `-p` had already exited; answer parsed; parent hook output `''`.

## Not measured

Codex (no Codex session was run); `--tools` itself (the calibration experiment runs the candidate's command with it);
estimate quality; an interactive parent session; two estimators at once.

## Decision (SPEC)

None ships. For the candidate: start the estimator from the owner's PostToolUse hook as a detached child with no
inherited stdio (I01, I05); run it with `CLAUDE_CODE_EXECPATH` and only when that variable is present — otherwise no
estimator, fail open (I02); isolate it with `--safe-mode --no-session-persistence --tools Read Glob Grep` (I03, I04).
