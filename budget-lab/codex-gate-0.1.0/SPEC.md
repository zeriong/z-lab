# budget 0.1.0 pre-build probe — the usage gate on Codex

Frozen before running, 2026-10-14. CLI versions recorded by V00.

## Why
`budget` stops every running session once the account's usage window reaches the user's n% and asks "지정한 n%에
도달했습니다, 작업을 이어서 진행하시겠어요?". On Claude Code a mod asks through its own dialog
(`plugin-platform-lab/mod-interactive-2.1.299`). Codex has no mods and no ask dialog in its default mode, and on this
account it reports only the 7-day window (`window_minutes: 10080`, run-0.3.0 rollouts). The planned Codex route is command
hooks: PreToolUse reads the window from the session's rollout (`transcript_path`), and past n% denies the call with the
instruction to end the turn with that question; the next prompt's answer unlocks the session. This probe measures that
route, and what free-hands 0.3.0's stop guard does to it.

## Probe
A lab plugin `gate-probe` with command hooks (PreToolUse, UserPromptSubmit, Stop → `gate.py <event>`). `gate.py` logs
each call to `<repo>/.probe/gate.jsonl` (event, session id, the window it found, its decision) and:
- PreToolUse: reads the newest `rate_limits` in the rollout and picks the window whose `window_minutes` is 10080; the
  threshold is `percent` in `$XDG_CONFIG_HOME/because-i-needed/budget.json`. If the window is at or above it and the
  session has no acknowledgement for that window's `resets_at`, it records a pending question for the session and
  denies: "budget: the usage window is at <p>% (threshold <n>%). Do not run anything else. End your turn now and ask the
  user exactly: \"지정한 <n>%에 도달했습니다, 작업을 이어서 진행하시겠어요?\" (예/아니오)".
- UserPromptSubmit: with a pending question, a prompt that is `예`, `yes`, `y` or `계속` (trimmed, case-insensitive)
  writes the acknowledgement and adds "budget: the user chose to continue"; any other prompt keeps the question pending
  and adds "budget: the user did not confirm; do not run tools until they answer 예".
- Stop: logs only.

## Isolation
A scratch git repository per case; `XDG_CONFIG_HOME` a temporary directory (the probe's config, pending and
acknowledgement files); a temporary `CODEX_HOME` with a copy of the account's `auth.json` (sha256 of the original
before/after, deleted at the end of the case); plugins installed from a temporary local marketplace; `codex exec --json
--dangerously-bypass-hook-trust -s workspace-write -C <repo>`, and `codex exec resume <id> … -c
sandbox_mode="workspace-write"` from the repo; the newest `luna` at `medium`; `CXC_MODE=off`.

## Cases (n=1)
- **X1 gate** — threshold 0; "Run exactly this shell command once and report its output: \`echo gated\`".
- **X2 answer** — resume X1's thread with "예".
- **X3 under the threshold (control)** — threshold 99; the X1 prompt with \`echo open\`.
- **X4 with free-hands 0.3.0** — the repository's `plugins/free-hands` installed too; a bootstrap exec ("Reply with
  the word ok."), then `.free-hands/goal.md` active, `max_iterations: 3`, one open item, `owner:` = that thread; resume
  with the X1 prompt and \`echo fh\`; threshold 0.

Recorded: `gate.jsonl`, the command items and agent messages, the goal file after X4.

## Not in scope
Codex compaction; hooks trusted through `/hooks`; the TUI; the 5-hour window (not reported on this account).

## Metrics
Exit codes, elapsed ms, tokens per call. Deltas N/A.

## Decision
The Codex route ships if X1 ends the turn with the question and runs nothing, X2 unlocks and runs the command, X3 runs
it untouched. X4 shows whether free-hands' stop guard keeps a gated session from ending its turn (then free-hands yields
while a budget question is pending).
