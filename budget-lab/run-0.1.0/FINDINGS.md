# Findings — budget 0.1.0, stop and ask at the usage threshold

Claude Code 2.1.299, Codex CLI 0.162.1, tmux 3.8 (`runs/V00`), macOS, 2026-10-14. Subject `subject/` (sha256 list
`subject.sha256`). Records: `runs/<case>/` (screens, the session transcript, budget's runtime files, Codex outputs).
Numbers: `METRICS.md` (21 subprocess calls, all exit 0). n=1 per case. The account's `auth.json` hash was the same before
and after every Codex case; every temporary Codex home was deleted. The five-hour window read 16–18% and the 7-day
window 72% during the run, both above the threshold of 1.

## Measured

- **R01 — Claude asks in its own dialog, and 예 goes on.** CB1: the dialog showed the chip `budget`, "지정한 1%에
  도달했습니다, 작업을 이어서 진행하시겠어요?", `1. 예`, `2. 아니오`; Enter answered 예, `echo one` ran, `acks/<session>.json`
  held the window's `resetsAt` and `pending/<session>.json` was `{"open":false}`.
- **R02 — 아니오 stops the turn.** CB2: Down, Enter answered 아니오; the screen showed "Interrupted · What should Claude
  do instead?"; no acknowledgement was written; the pending file was closed.
- **R03 — Under the threshold nothing happens.** CB3 (threshold 100): no dialog; `echo three` ran; `usage.json` recorded
  the five-hour window (17%).
- **R04 — With free-hands 0.4.0 running a goal in the session, the question is shown.** CB4: the dialog appeared
  (free-hands 0.3.0 blocked it in mod-interactive I05); 예; `echo four` ran; the goal ended `status: done`. The pending
  file was named by the mod's `$.session.id()` and free-hands read it from the hook input's `session_id`: the two are the
  same id.
- **R05 — One question serves parallel subagents.** CB5: two background general-purpose subagents; one dialog, 예; both
  reported (`sub-a`, `sub-b`).
- **R06 — Codex ends the turn with the question; 예 unlocks.** XB1: the fresh exec's last message was exactly the
  question with "(예/아니오)" and no command ran; the resume with 예 wrote the acknowledgement and `echo x-one` ran.
- **R07 — With free-hands 0.4.0 the gated Codex turn ends at once.** XB2: the first exec ended with the question and
  `iterations` stayed 0 (0.3.0: 0→3, codex-gate-0.1.0 B03).
- **R08 — Defect: Codex asked again in the same window.** XB2, after 예: `echo x-two` ran, then the next call was denied
  and the question asked again. The rollout's `resets_at` had moved from 1792472293 to 1792472294 between records, so the
  acknowledgement no longer matched exactly.
- **R09 — Under the threshold on Codex nothing happens.** XB3 (threshold 100): `echo x-three` ran.

## Not measured

- A crossing during a running turn; several interactive sessions at once; a `-p` run reaching the threshold.
- The 5-hour window on Codex (not reported); Codex hooks trusted through `/hooks`.

## Decision (SPEC)

R08 contradicts the objective ("예 goes on for that window"). The fix compares reset times within 600 seconds on both
hosts (a new window resets five hours or seven days later); it is measured in the sibling `run-0.1.0-r2` with more than
one call after 예. Everything else held.
