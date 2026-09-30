# Findings — a Codex main that cannot see its own model id (claude-x-codex 0.3.0)

Codex CLI 0.159.0, macOS, 2026-09-30. Subject: `subject/claude-x-codex/` (sha256 list in `subject/MANIFEST.sha256`),
after the Codex host adapter's Main paragraph gained the unknown-own-id sentence. Raw records: `runs/W04/`.

## Measured

- **W04 — the main now says its session model is unconfirmed.** Same prompt and command as W03
  (`codex exec -m gpt-6-sol`): the main ran the resolver for every role (24 mentions in its events) and reported
  `gpt-6.1-sol` for main and the Codex reviewer, `gpt-6-luna` for `codex-bulk`, `opus` for the Claude reviewer.
  Unlike W03, it told the user it could not confirm which model its own session runs, so it could not say the
  session was `gpt-6.1-sol`. It dispatched nothing, as asked. 87.4 s, 221,191 input tokens.

## Not measured

- Whether it would recommend a new session on the newest model if it could see its own id (it cannot here).
- One run only; no repeat.
