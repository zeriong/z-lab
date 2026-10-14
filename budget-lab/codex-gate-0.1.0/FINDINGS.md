# Findings — the usage gate on Codex (pre-build probe)

Codex CLI 0.162.1 (`runs/V00`), macOS, 2026-10-14. Records: `runs/<case>/` (`gate.jsonl` is the hook's own log).
Numbers: `METRICS.md` (16 calls, all exit 0). n=1 per case. The account's `auth.json` hash was the same before and after
every case; every temporary Codex home was deleted (X1's by X2, which resumed it).

## Measured

- **B01 — In a fresh session the first tool call comes before any `rate_limits` in its own rollout.** X1 (threshold 0)
  and X3 (threshold 99): the PreToolUse hook found no rate-limit record in `transcript_path` and allowed the call; X1's
  `echo gated` ran. The gate never engaged in X1, so X2 (resume with "예") had no pending question to answer: the agent
  replied to "예" as a plain message.
- **B02 — In a resumed session the rollout holds the 7-day window, and the deny reaches the agent as an instruction.**
  X4 (a bootstrap exec, then resume): the hook read `used_percent: 72.0`, `window_minutes: 10080`, recorded a pending
  question and denied the first call (a read of the skill file). The agent ended its turn with exactly "지정한 0%에
  도달했습니다, 작업을 이어서 진행하시겠어요? (예/아니오)" and ran nothing.
- **B03 — free-hands 0.3.0's stop guard does not let the gated session end its turn.** X4 (goal active, one open item,
  owned by the session): the agent repeated the question three times as the stop guard blocked each stop and raised
  `iterations` 0→3; at the limit it wrote "Paused. Open item: run `echo fh`. …" and stopped, `status` still `active`.

## Not measured

- The deny → question → "예" → run sequence end to end (B01 left X2 nothing to unlock) — a sibling must measure it.
- Whether another session's rollout gives a fresh session the account's window before its own first response.
- Codex hooks trusted through `/hooks`; the TUI.

## Decision input

- A fresh session's own rollout cannot gate its first call (B01): the hook must also read the newest `rate_limits`
  among the account's recent rollouts, or accept that the gate engages from the second call on.
- free-hands must not block stopping while a budget question is pending for the session (B03).
- Measure the full sequence and the cross-rollout read in a sibling (`codex-gate-0.1.0-r2`).
