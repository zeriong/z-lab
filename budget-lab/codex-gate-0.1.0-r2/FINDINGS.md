# Findings — the full usage-gate sequence on Codex (round 2)

Codex CLI 0.162.1 (`runs/V00`), macOS, 2026-10-14. Records: `runs/<case>/` (`gate.jsonl` is the hook's own log, with
the rollout each reading came from). Numbers: `METRICS.md` (all calls exit 0). n=1 per case. The account's `auth.json`
hash was the same before and after every case; every temporary Codex home was deleted.

## Measured

- **B04 — The account's newest rollout record gates a fresh session's first call.** R1, R2: the fresh session's first
  PreToolUse found no record in its own rollout and read the bootstrap session's (`used_percent: 72.0`,
  `window_minutes: 10080`); it denied the call and recorded a pending question. (codex-gate-0.1.0 B01 read only the
  session's own rollout and found nothing.)
- **B05 — The agent ends the turn with the question and runs nothing.** R1, R2: the fresh exec's last message was
  exactly "지정한 0%에 도달했습니다, 작업을 이어서 진행하시겠어요? (예/아니오)"; no command item.
- **B06 — "예" unlocks the session for that window and the work goes on.** R1: the resume's UserPromptSubmit wrote the
  acknowledgement (`acks/<thread>.json`, the window's `resets_at`) and removed the pending question; the next
  PreToolUse, now reading the session's own rollout, allowed the call; `echo after-yes` ran ("after-yes").
- **B07 — "아니오" keeps the session locked.** R2: the resume's UserPromptSubmit kept the question pending and added the
  hold note; the agent replied "알겠습니다. 작업을 중단하겠습니다." and ran nothing.
- **B08 — Under the threshold the gate stays out of the way.** R3 (threshold 99, window 72%): allowed; `echo open` ran.

## Not measured

- free-hands together with this round's gate (codex-gate-0.1.0 B03 shows its stop guard blocks the question).
- A session that is mid-turn when the window crosses the threshold; Codex compaction; `/hooks` trust; the TUI.
- How stale another session's record may be (all readings here were minutes old).

## Decision (SPEC)

R1–R3 held: the Codex route ships with the cross-rollout read (B04–B08).
