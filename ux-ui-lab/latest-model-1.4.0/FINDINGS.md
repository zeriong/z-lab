# Findings — ux-ui 1.4.0 art directors and the newest model

Codex CLI 0.159.0, Claude Code 2.1.284, macOS, 2026-09-30. Subject: `subject/ux-ui/` (sha256 list in
`subject/MANIFEST.sha256`). Raw records: `runs/<case>/`; numbers: `METRICS.md`.

## Measured

- **R01 — Codex host: the right model, but the director never started.** A main started with `-m gpt-6-sol`
  followed the build skill and adapter, resolved the director's model with `latest-model.py codex sol --effort
  medium` → `gpt-6.1-sol`, and started the separate read-only `codex exec` route with it. That child failed to
  start inside the main's sandbox (`failed to initialize in-process app-server client: Operation not
  permitted (os error 1)`), so no director ran and no verdict exists; the main reported this and stopped
  without reviewing the render itself. The only model id in its events is `gpt-6.1-sol`. It passed `sol`
  because it could not see its own model id. 82.2 s, 200,878 input tokens.
- **R02 — Claude host: a redirected alias stops the dispatch.** With `ANTHROPIC_DEFAULT_OPUS_MODEL` set, a
  `sonnet` main running `/ux-ui:build` ran `latest-model.py claude opus`, got exit 2 naming the variable,
  dispatched no art director (no Task/Agent call), and told the user how to unblock it. `modelUsage` lists
  only the main's `claude-sonnet-5-5`. 12.4 s.
- **R01 attempt 1** stopped before any measured step (headless Chrome did not exit in 60 s while preparing the
  fixture); it is kept as `runs/R01-attempt1-capture-timeout/` with a note, and R01 ran again.

## Not measured

- A director actually running on the resolved id from a Codex main: R01's route could not start a nested
  `codex exec` from a sandboxed main. The same nested start failed in plan-smith N01 (where the native
  subagent route worked instead). This limits the existing dispatch route, not the model choice.
- The mobile director (`build-mobile`), and a Claude-host director run without an override.
