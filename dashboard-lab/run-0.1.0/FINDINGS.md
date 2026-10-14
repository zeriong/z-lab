# Findings — dashboard 0.1.0, every because-i-needed mode in one place

Claude Code 2.1.299, Codex CLI 0.162.1 (`runs/V00`), macOS, 2026-10-14. Subject `subject/` (sha256 list
`subject.sha256`). Records: `runs/<case>/` (screens; Codex command items and messages). Numbers: `METRICS.md` (all
subprocess calls exit 0). n=1 per case. The account's `auth.json` hash was the same before and after every Codex case;
every temporary Codex home was deleted.

## Measured

- **D01 — Claude Code draws the band with every declared state.** CD1 (all four plugins): above the prompt, `because-i-needed
  │ budget 80% · 5h now 20% │ free-hands active 0/40 · 1 open (project) · owner lab-sess │ peer-coding on (project)`.
- **D02 — `/dashboard:audit` prints the same with each level.** CD1: the line, then `budget: 80% (source: global)
  project: unset global: 80%`, `free-hands: active 0/40 · 1 open (source: project) …`, `peer-coding: on (source: project)
  project: on global: unset`.
- **D03 — No declaration, no band.** CD2 (dashboard alone; the account's own installed because-i-needed plugins declare
  nothing): no band was drawn.
- **D04 — Codex: `$dashboard:audit` reads the installed plugins.** XD1: from `config.toml` and the plugin cache the
  command printed the three entries, the budget entry with the 7-day window (`7d now 72%`); no hook parse error was
  reported for the dashboard's empty Codex hooks file. The agent's first attempt resolved `<plugin>` without the version
  folder (file not found) and its second attempt used `…/dashboard/0.1.0/` as the skill says.
- **D05 — Codex with no declaring plugin.** XD2: "No enabled because-i-needed plugin declares a state to show."

## Not measured

- A plugin installed through a Claude Code marketplace (the band read `--plugin-dir` copies named in
  `BECAUSE_I_NEEDED_PLUGIN_DIRS`; `installed_plugins.json` and the settings files are covered by unit tests only).
- The band updating after a mode change within a session; desktop and IDE surfaces; the Codex TUI.

## Decision (SPEC)

CD1, CD2, XD1 and XD2 held: dashboard 0.1.0 ships.
