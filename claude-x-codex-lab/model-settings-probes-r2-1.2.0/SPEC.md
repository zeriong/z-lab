# peer-coding 1.2.0 — probes r2: does a set CLAUDE_CONFIG_DIR reach the session's shell

Frozen before running, 2026-10-30. Claude Code 2.1.314, macOS 27.0.1.

## Objective
`../model-settings-probes-1.2.0/` P09 could not measure the Bash tool's environment: with `CLAUDE_CONFIG_DIR` set
explicitly to `~/.claude`, `claude -p` failed to authenticate ("OAuth session expired and could not be refreshed"),
so no tool ran. Its hook and hooks-module rows did run. This sibling measures the remaining row without a login.

## Case
- R01 An interactive `claude` (160×50 pty, `expect`) in a fresh temporary `CLAUDE_CONFIG_DIR` whose `.claude.json`
  is pre-seeded (onboarding done, the temporary project trusted). In the prompt, bash mode runs
  `!env | grep -c '^CLAUDE_CONFIG_DIR='` and `!echo "DIR=$CLAUDE_CONFIG_DIR"` — the same shell the Bash tool uses,
  run without the model. Record the screen text after each.

## Method
`run.py` (state-aware, as in the parent experiment) writes `fixtures/bang.exp` once. Temporary home and project only;
nothing is written to the user's settings. Host paths are not redacted.

## Metrics
Elapsed ms. No tokens (no model call).
