# Findings — a Claude mod in an interactive session

Claude Code 2.1.299, tmux 3.8 (`runs/V00`), macOS, 2026-10-14, Sonnet 5.5 on a Team plan. Records: `runs/<case>/`
(`module.jsonl` is the module's own log; `screen-*.txt` are `tmux capture-pane` snapshots). n=1 per case. Interactive
sessions expose no token counts; elapsed time per case is in `summary.json` (16–23 s). Deviation D1 (SPEC): the
folder-trust dialog's default is "No, exit"; the first K1 exited before any model call.

## Measured

- **I01 — A band above the prompt and a status entry are drawn, and update from `session.measure`.** K1: the screen
  showed `probe-band five_hour=4` directly above the prompt box and `⚠ ask-probe: probe-status 4` in the status rows
  under it. `session.measure` fired at session start and after the turn, with `five_hour` 4 and `seven_day` 12.
- **I02 — `$.ui.ask` opens the engine's own question dialog from a `tool.call` hook, and the call waits for it.**
  K2: the dialog showed the plugin chip, `probe: continue?`, `1. 예`, `2. 아니오`, "Type something.", "Chat about this";
  Enter answered `예` and `echo one` then ran ("one").
- **I03 — "No" refuses the call and `$.turn.abort` ends the turn.** K3: answer `아니오`, the abort resolved, the hook
  returned `{ deny }`, the command did not run, and the turn completed.
- **I04 — Subagents' tool calls pass through the module, with their `agentId`; one shared ask answers both.** K4: two
  general-purpose subagents' `echo sub-a` and `echo sub-b` each reached the hook with its own `agentId`; one dialog was
  shown and answered, and both calls used that answer.
- **I05 — free-hands 0.3.0's ask guard blocks the module's question.** K5 (goal active, owned by the session): no dialog
  was shown; `$.ui.ask` rejected with "HooksError: ask-probe: $.ui.ask: no answer (PreToolUse:AskUserQuestion hook
  error: free-hands: asking the user is off while the goal is open …)". `$.ui.ask` goes through the settings and plugin
  `PreToolUse` hooks for `AskUserQuestion`.

## Not measured

- A real `five_hour` crossing (the probe asked on the first call), a turn already running when the window moves.
- The desktop, IDE and mobile surfaces; Codex (no mods).
- Several sessions at once.

## Decision (SPEC)

`budget` asks through `$.ui.ask` in a `tool.call` hook, refuses and aborts on "no", and covers subagents with one
shared question (I02–I04); `dashboard` draws its band from `ui.render` on `AbovePrompt` (I01). free-hands must let the
budget question through (I05).
