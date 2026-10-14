# budget — improvement backlog

Observations → diagnosis → change, across versions. Each row names its evidence or is marked as a decision.

## Decisions

| # | Decision | Reason | Source |
|---|---|---|---|
| D1 | Claude Code measures the five-hour window; Codex the 7-day window | Codex reports only the 7-day window on this account (codex-gate B02) | maintainer, 2026-10-14 |
| D2 | The threshold is one user-level setting for both hosts (`~/.config/because-i-needed/budget.json`) | "user-level에서 설정" in the request | maintainer, 2026-10-14 |
| D3 | The question is "지정한 n%에 도달했습니다, 작업을 이어서 진행하시겠어요?" with 예/아니오 | The maintainer's wording; root Rule 4 exception | maintainer, 2026-10-14 |
| D4 | The usage question outranks free-hands' never-ask | Spending past the threshold is the user's decision | maintainer, 2026-10-14 |
| D-B1 | Nobody to ask (`$.ui.ask` rejects, as in `claude -p`) or a dismissed dialog counts as 아니오 | The threshold protects spending; nothing goes past it without a 예. Reported to the maintainer with the release | decision, 2026-10-14 |
| D-B2 | Each session asks once per window; 예 is per session | The request: every running session asks | decision, 2026-10-14 |

## Changes from measurements

| # | Observation | Change | State |
|---|---|---|---|
| 1 | mod-dual-host M04: Codex rejects a hooks file that names `modules`; M02: Claude runs a manifest `hooks` path and `hooks/hooks.json` both | Layout C (module in `hooks/hooks.json`, Codex manifest `hooks: ./hooks/codex.json`) | measured: run-0.1.0 (both hosts loaded) |
| 2 | mod-interactive I05: free-hands 0.3.0's ask guard blocked `$.ui.ask` | budget writes `pending/<session>.json` `{"open": true}`; free-hands 0.4.0 stands aside while it is open | measured: run-0.1.0 R04 |
| 3 | codex-gate B03: free-hands 0.3.0's stop guard kept the gated Codex turn going to `max_iterations` | free-hands 0.4.0's stop guard stands aside too | measured: run-0.1.0 R07, r2 R12 |
| 4 | codex-gate B01: a fresh Codex session's own rollout has no rate-limit record before its first call | Read the newest record among the session's rollout and the 20 most recent beside it | measured: codex-gate r2 B04, run-0.1.0 R06 |
| 5 | run-0.1.0 R08: Codex's `resets_at` moved by one second between records; the session was asked again after 예 | An acknowledgement matches a window within 600 s on both hosts | measured: run-0.1.0-r2 R10–R12 |

## Not acted on

| # | Observation | Judgment |
|---|---|---|
| 6 | A turn can pass the threshold before Claude Code's next report (session.measure fires after a turn or a whole-point move) | Not measured; documented in the README |
