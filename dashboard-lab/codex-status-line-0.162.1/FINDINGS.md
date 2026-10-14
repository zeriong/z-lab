# Findings — Codex's built-in status line

Codex CLI 0.162.1, tmux 3.8 (`runs/V00`), macOS, 2026-10-14. Records: `runs/<case>/` (`config.toml` as used, screens
from `tmux capture-pane`). Numbers: `METRICS.md`. n=1 per case. The account's `auth.json` hash was the same before and
after every case; every temporary Codex home was deleted.

## Measured

- **C01 — Default status line.** S0 (no `[tui]`): `GPT-6-Luna medium · <cwd> · <thread title>`; no usage figure.
- **C02 — `weekly-limit` shows the 7-day window as what is left.** S1 (`status_line = ["model-with-reasoning",
  "weekly-limit"]`): `GPT-6-Luna medium · weekly 28% left` after the first reply (the same account's gate probe read
  `used_percent: 72.0` that hour, budget-lab B04).
- **C03 — An unknown item id is dropped with a warning.** S2 (`["weekly-limit", "no-such-item"]`): `weekly 28% left`
  and `⚠ 1 warning · f2 to view`; the session ran normally.

## Not measured

- The `/statusline` picker; `five-hour-limit` (this account reports no 5-hour window); before the first reply.

## Decision (SPEC)

The dashboard README gives `[tui] status_line = ["model-with-reasoning", "weekly-limit"]` for Codex (C02), noting the
figure is what is left, not what is used.
