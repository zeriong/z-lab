# A Claude mod in an interactive session — band, ask, deny and abort, subagents, free-hands

Frozen before running, 2026-10-14. CLI versions recorded by V00. Builds on `mod-dual-host-2.1.299` (layout C, M06–M07).

## Why
The planned `budget` plugin holds the next tool call once the `five_hour` window reaches the user's n% and asks
"continue?" through `$.ui.ask`; on "no" it refuses the call and ends the turn. The planned `dashboard` draws a band above
the prompt. Neither can be seen in a `-p` run (`$.ui.ask` rejects there). This probe drives real interactive sessions in
tmux and measures what those plugins rely on.

## Probe
A mod `ask-probe` (`hooks/hooks.json` → `register.tsx`, a `types/index.d.ts` contract for one atom). It writes every row
to `<repo>/.probe/module.jsonl` and:
- `ui.render` on `AbovePrompt`: draws `probe-band five_hour=<value>` from an atom; `session.measure` sets the atom and
  `$.ui.status("probe-status <value>")`.
- `turn.start`: keeps the turn id. `turn.complete`: logs.
- `tool.call` (Bash): one `$.ui.ask("probe: continue?", ["예", "아니오"])` per session, shared by every call that arrives
  while it is open (single flight); logs the command, the call's `agentId`, the answer or the rejection. "아니오" →
  `$.turn.abort({ turnId })`, then `{ deny }`.

## Isolation
- Each case: a scratch git repository under the temp directory, a tmux session 200×50 running `claude --plugin-dir
  <probe> [--plugin-dir <free-hands>] --model sonnet --permission-mode acceptEdits --allowedTools Bash Agent`, the
  account's login. The folder-trust dialog, when shown, is accepted with Enter: that records the temporary folder in
  the account's `~/.claude.json` project list (the only write outside the temporary directory, besides the transcript).
- Screens are saved with `tmux capture-pane -p` at each step; the module's log is the primary record.

## Cases (n=1)
- **K1 band** — prompt "Reply with the word ok."; after the turn, the screen and the module rows.
- **K2 ask → yes** — prompt "Run exactly this shell command once and report its output: \`echo one\`"; when the
  dialog shows, Enter (the first option, 예).
- **K3 ask → no** — the same prompt with \`echo two\`; when the dialog shows, Down then Enter (아니오).
- **K4 parallel subagents** — "In one message, start two general-purpose subagents with the Agent tool. The first runs
  exactly \`echo sub-a\` with Bash, the second exactly \`echo sub-b\`. Report both outputs."; Enter on each dialog shown.
- **K5 with free-hands 0.3.0** — the repository's `plugins/free-hands` also loaded; `.free-hands/goal.md` active, one open
  item, `owner:` = the session id given by `--session-id`; the K2 prompt with \`echo fh\`; Enter on the dialog if shown.

## Not in scope
Codex (no mods), the desktop and IDE surfaces, a real five_hour crossing (the probe asks on the first call).

## Metrics
Elapsed ms per case; tokens and cost are not exposed by an interactive session and are not recorded.

## Decision
`budget` asks through `$.ui.ask` in `tool.call` if K2/K3 show the dialog, the answer, the refusal and the abort; it covers
subagents if K4 shows their calls passing through the hook with one question; K5 says whether free-hands blocks that
question (then free-hands must exempt it). `dashboard` draws above the prompt if K1 shows the band.

## Deviations recorded after freezing
- D1, 2026-10-14, before any model call: the first K1 accepted the folder-trust dialog with Enter, but the dialog's
  default is "No, exit", so the session exited and nothing was measured. Its record is kept in
  `deviations/K1-trust-default-exit/` (screens). The runner now presses Down, then Enter ("Yes, I trust this folder");
  `frozen.sha256` was regenerated and K1 rerun.
