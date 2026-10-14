# One plugin, a Claude mod and Codex command hooks — which layout both hosts load

Frozen before running, 2026-10-14. CLI versions recorded by V00.

## Why
The planned `dashboard` and `budget` plugins need, on Claude Code, a hooks module ("mod": `hooks/hooks.json` naming
`modules`, a `register` export; it draws above the prompt, reads `session.measure` rate limits, asks through
`$.ui.ask`) and, on Codex, command hooks (`hooks/hooks.json` with `hooks`, which Codex reads by default). Root Rule 10
wants one plugin folder for both hosts. Nothing documents whether one `hooks/hooks.json` may hold both keys, or whether
either host honours a manifest `hooks` path pointing elsewhere. This probe measures that, and in the same Claude runs
records what the module can reach that the two plugins rely on.

## Layouts (each a plugin `mod-probe` with one skill `noop`)
- **A** — `hooks/hooks.json` = `{ "hooks": { command hooks }, "modules": ["./register.ts"] }`; no manifest `hooks`.
- **B** — `hooks/hooks.json` = command hooks only; `.claude-plugin/plugin.json` `"hooks": "./mods/hooks.json"`, that
  file `{ "modules": ["./register.ts"] }`.
- **C** — `hooks/hooks.json` = `{ "modules": ["./register.ts"] }`; `.codex-plugin/plugin.json` `"hooks":
  "./hooks/codex.json"` (command hooks); no Claude manifest `hooks`.

Command hooks: SessionStart, UserPromptSubmit, PreToolUse (no matcher), Stop → `probe.py <event>`, appending one JSON
line (event, hook input) to `<repo>/.probe/command.jsonl`, printing nothing. The module (`register.ts`) writes
`<repo>/.probe/module.jsonl` (the whole file each time) on `session.start` (with: `$.plugin.root`; the keys of
`$.settings.read().enabledPlugins`; `$.env.get("HOME")`; `$.fs.read` of a file the runner put outside the repository;
`$.fs.exists` of `~/.config/claude-x-codex/mode`; `$.process.run(["python3", "-c", "print(42)"])`'s exit code and
output), on `prompt.submit` (text length), on `tool.call` for Bash (the command), on `session.measure` (`rateLimits`,
`changed`) and on `session.end` (`$.session.usage()`'s `rateLimits`).

## Cases (n=1)
- **V** — `claude plugin validate <layout>` for A, B, C.
- **cA, cB, cC** — `claude -p "Run exactly this shell command once and report its output: \`echo probe\`"
  --plugin-dir <layout> --model sonnet --output-format stream-json --verbose --include-hook-events --permission-mode
  acceptEdits --allowedTools Bash` in a scratch repository, the account's login (no settings are changed).
- **xA, xB, xC** — Codex: a temporary `CODEX_HOME` with a copy of the account's `auth.json` (sha256 of the original
  before/after, the home deleted at the end of the case), the layout installed from a temporary local marketplace,
  `codex exec --json --dangerously-bypass-hook-trust -s workspace-write -C <repo>` with the same prompt, the newest
  `luna` at `medium`. Recorded: `plugin add` exit and output, the command-hook lines, the run's items.

## Not in scope
Interactive TUI drawing (`AbovePrompt`, `$.ui.ask` — a `-p` run has no one to ask), install through a Claude
marketplace into the account's settings, hook trust through `/hooks`.

## Metrics
Exit codes, elapsed ms, tokens and Claude cost per call. Deltas N/A.

## Decision
The plugins use the first layout under which, on its host, Claude loads the module without running the command hooks
twice and Codex runs the command hooks; if none does, the hosts get separate entry points and the README says so.

## Deviations recorded after freezing
- 2026-10-14, before any measured call: the first start failed at V00 because a Homebrew upgrade of Claude Code
  (2.1.296 → 2.1.299) had removed `claude` from `PATH` for the moment. The empty case directory was removed, the
  directory renamed from `mod-dual-host-2.1.296` and the temporary path in `run.py` renamed with it; `frozen.sha256`
  was regenerated.
