# budget 0.1.0 — stop and ask at the usage threshold, on both hosts

Frozen before running, 2026-10-14. CLI versions recorded by V00. Subject: `subject/budget/` and `subject/free-hands/`
(the 0.4.0 candidate that lets budget's question through), sha256 list `subject.sha256`; the runner never edits them.
Facts the design rests on: `plugin-platform-lab/mod-dual-host-2.1.299` (M02–M07), `mod-interactive-2.1.299`
(I01–I05), `budget-lab/codex-gate-0.1.0` (B01–B03) and `-r2` (B04–B08).

## Objective
Measure the shipped plugin: on Claude Code its mod holds the next tool call once the five-hour window is at or above
the threshold and asks "지정한 n%에 도달했습니다, 작업을 이어서 진행하시겠어요?" with 예/아니오; 예 goes on, 아니오
refuses and ends the turn; one question serves parallel subagents; under the threshold nothing happens; with
free-hands 0.4.0 running a goal in the session, the question is shown. On Codex its command hooks deny the call and the
agent ends the turn with the question; 예 unlocks; with free-hands 0.4.0 the stop guard lets the turn end.

## Isolation
- Every case: a scratch git repository; `XDG_CONFIG_HOME` a temporary directory holding `because-i-needed/budget.json`
  (the threshold) and budget's runtime files; `CXC_MODE=off`.
- Claude: a tmux session 200×50 running `claude --plugin-dir <subject>/budget [--plugin-dir <subject>/free-hands]
  --model sonnet --permission-mode acceptEdits --allowedTools Bash Agent [--session-id <uuid>]` from a copy of the
  subject (the engine lays type files beside a loaded mod), the account's login; the folder-trust dialog is answered
  "Yes, I trust this folder" (Down, Enter), which records the temporary folder in `~/.claude.json`. Screens are saved
  with `tmux capture-pane`; the dialog is answered with Enter (예) or Down, Enter (아니오).
- Codex: a temporary `CODEX_HOME` with a copy of the account's `auth.json` (sha256 of the original before/after,
  deleted at the end of the case), the subject installed from a temporary local marketplace; a bootstrap `codex exec`
  ("Reply with the word ok."), a fresh `codex exec --json --dangerously-bypass-hook-trust -s workspace-write -C <repo>`,
  and `codex exec resume <thread> 예 … -c sandbox_mode="workspace-write"`; the newest `luna` at `medium`.

## Cases (n=1). Threshold 1 unless noted (both windows were above 1% when frozen).
- **CB1** Claude, "Run exactly this shell command once and report its output: \`echo one\`" → answer 예.
- **CB2** Claude, the same with \`echo two\` → answer 아니오.
- **CB3** Claude, threshold 100, \`echo three\` (control: no question).
- **CB4** Claude with free-hands: `.free-hands/goal.md` active, `max_iterations: 3`, one open item, `owner:` = the
  `--session-id`; \`echo four\` → answer 예.
- **CB5** Claude, "In one message, start two general-purpose subagents with the Agent tool. The first runs exactly
  \`echo sub-a\` with Bash, the second exactly \`echo sub-b\`. Report both outputs." → answer 예 to each dialog shown.
- **XB1** Codex, fresh exec \`echo x-one\` → resume 예.
- **XB2** Codex with free-hands: the bootstrap thread owns a goal as in CB4; resume that thread with \`echo x-two\`, then
  resume again with 예.
- **XB3** Codex, threshold 100, \`echo x-three\` (control).

Recorded: screens, the budget runtime files (pending, acks, usage), the goal file before and after, Claude transcript
rows of the dialog (the AskUserQuestion tool result) from the session's JSONL, Codex command items and agent messages.

## Not in scope
A real crossing during a turn (the threshold is set below the current figure), the 5-hour window on Codex (not
reported), several interactive sessions at once, `/hooks` trust.

## Metrics
Codex: exit codes, elapsed ms, tokens. Claude: elapsed ms (an interactive session shows no token counts). Deltas N/A.

## Decision
budget 0.1.0 ships if CB1, CB2, CB3, CB5 and XB1, XB3 behave as the objective says, and CB4, XB2 show free-hands
0.4.0 letting the question through (dialog shown; turn ended with the question and `iterations` unchanged).
