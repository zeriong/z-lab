# dashboard 0.2.0 — a rule and `{icon}label: value` entries

Frozen before running, 2026-10-16. CLI versions recorded by V00. Sibling of `run-0.1.0` (D01–D05), not edited.
Subject: `subject/` — dashboard 0.2.0 with budget, free-hands and peer-coding declaring an `icon` in `dashboard.json`
(sha256 list `subject.sha256`); the runner (a copy of run-0.1.0's, with the cases below) never edits it.

## Why
The maintainer found the 0.1.0 line ("because-i-needed │ budget off │ …") hard to tell apart from the transcript and
asked for a rule at the top of the band and entries in the form `{emoji}budget: 20%` (2026-10-16). The band now draws a
dim rule as wide as `bodyColumns`, then one entry per declared switch: the icon, the bold `label:`, the value, the
deciding level and the detail dimmed. The Codex audit prints the same entries.

## Isolation
As run-0.1.0 (same repository state: budget threshold 80%, peer-coding project flag on, a free-hands goal active and
owned by `lab-session-a`; `--plugin-dir` copies named in `BECAUSE_I_NEEDED_PLUGIN_DIRS` on Claude; a temporary
`CODEX_HOME` with a copy of `auth.json`, deleted at the end, on Codex).

## Cases (n=1)
- **CW1** Claude, tmux 200×50, all four plugins: "Reply with the word ok."; snapshot.
- **CW2** Claude, tmux 80×50, the same.
- **XW1** Codex, all four installed: `$dashboard:audit`.

## Not in scope
Other terminals than tmux (Orca, iTerm, Terminal.app), desktop and IDE surfaces, plugins installed through a Claude
marketplace.

## Metrics
Codex: exit codes, elapsed ms, tokens. Claude: elapsed ms. Deltas N/A.

## Decision
0.2.0 ships if CW1 shows the rule and the three `{icon}label: value` entries on one row, CW2 shows the rule at 80
columns and every entry whole (wrapped between entries, not cut), and XW1 prints the entries in the same form.
