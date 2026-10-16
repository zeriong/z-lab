# Findings — dashboard 0.2.0, a rule and `{icon}label: value` entries

Claude Code 2.1.300, Codex CLI 0.162.1 (`runs/V00`), macOS, 2026-10-16. Subject `subject/` (sha256 list
`subject.sha256`). Records: `runs/<case>/`. Numbers: `METRICS.md` (all subprocess calls exit 0). n=1 per case. The
account's `auth.json` hash was the same before and after the Codex case; the temporary Codex home was deleted.

## Measured

- **D06 — 200 columns: the rule, then every entry on one row.** CW1: a rule of `─` across the band (the engine's `[-]`
  at its end), and below it `💰budget: 80% · 5h now 24%   🙌free-hands: active 0/40 · 1 open (project) · owner lab-sess
  🤝peer-coding: on (project)`.
- **D07 — 80 columns: the rule fits, entries wrap whole.** CW2: the rule spanned the narrower band, and the three
  entries stood on three rows, none cut.
- **D08 — Codex prints the same entries.** XW1: `because-i-needed`, then `💰budget: 80%   🙌free-hands: active 0/40 · 1
  open (project) · owner lab-sess   🤝peer-coding: on (project)`, then each switch's levels; no hook error. The budget
  entry had no usage detail: the fresh Codex home held no rate-limit record yet (budget-lab B01).

## Not measured

- Bold and dim styling (`tmux capture-pane -p` drops attributes).
- Terminals other than tmux (Orca, iTerm, Terminal.app); desktop and IDE surfaces; plugins installed through a Claude
  marketplace in this format (0.1.0's installed copy drew in a fresh tmux session, 2026-10-16, debug log
  `~/.claude/debug/c972fe9c-….txt`, recorded here as an observation, not a case).

## Decision (SPEC)

CW1, CW2 and XW1 held: dashboard 0.2.0 ships.
