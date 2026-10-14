# dashboard — improvement backlog

## Decisions

| # | Decision | Reason | Source |
|---|---|---|---|
| D1 | Every mode of every because-i-needed plugin is declared in `dashboard.json` and shows on the dashboard (root Rule 11) | A mode added later must appear without a dashboard release | maintainer, 2026-10-14 |
| D2 | Show the line only when an enabled because-i-needed plugin declares a switch | "because-i-needed 마켓플레이스를 통해 등록된 plugin과 스킬이 있다면" | maintainer, 2026-10-14 |
| D3 | On Codex: a command, plus README guidance for Codex's own `weekly-limit` status line item | Codex offers plugins no drawing surface (codex-status-line C01–C03) | maintainer, 2026-10-14 |
| D4 | Plugins loaded with `--plugin-dir` are added through `BECAUSE_I_NEEDED_PLUGIN_DIRS` | A module cannot read other plugins' folders (mod-dual-host M06); needed for development and for the lab | decision, 2026-10-14 |

## Changes from measurements

| # | Observation | Change | State |
|---|---|---|---|
| 1 | mod-dual-host M04/M05: Codex reads a manifest `hooks` path instead of `hooks/hooks.json`, and rejects `modules` | Codex manifest points at `hooks/codex.json` with no hooks | measured: run-0.1.0 D04 (no parse error) |
| 2 | run-0.1.0 D04: the Codex agent first resolved `<plugin>` without the version folder, then corrected itself | None: SKILL.md already says two directories above the skill; the agent recovered | observed, n=1 |
