# Findings — one plugin, a Claude mod and Codex command hooks

Claude Code 2.1.299, Codex CLI 0.162.1 (`runs/V00`), macOS, 2026-10-14. Specimens: `runs/<case>/plugin/` (the layout as
it ran). Numbers: `METRICS.md` (20 calls, all exit 0; Claude 0.36 USD). n=1 per case. The account's `auth.json` hash was
the same before and after every Codex case; every temporary Codex home was deleted. Deviation: see SPEC (a start that
failed before any call while Homebrew upgraded Claude Code).

## Measured

- **M01 — `claude plugin validate` passes all three layouts** and lists only the module's hooks (V); it says nothing
  about the command hooks in layout A.
- **M02 — Claude loads the module from `hooks/hooks.json` and from a manifest `hooks` path, and also runs the default
  file's command hooks.** cA (both keys in one file): the module wrote its rows and the command hooks logged
  SessionStart, UserPromptSubmit, PreToolUse and Stop. cB (`hooks/hooks.json` command hooks + Claude manifest `"hooks":
  "./mods/hooks.json"` naming the module): the same — both ran.
- **M03 — Claude ignores the Codex manifest.** cC (`hooks/hooks.json` = module only, `.codex-plugin/plugin.json`
  `"hooks": "./hooks/codex.json"`): the module ran, no command hook ran.
- **M04 — Codex rejects a hooks file that names `modules`.** xA: "failed to parse plugin hooks config …/hooks/hooks.json:
  unknown field `modules`" (an `error` item); no command hook ran, the agent still ran the command.
- **M05 — Codex runs the command hooks from its manifest path and leaves `hooks/hooks.json` unread.** xC: SessionStart,
  UserPromptSubmit, PreToolUse and Stop ran from `hooks/codex.json`, with no parse error for the module file. xB: the
  default `hooks/hooks.json` command hooks ran.
- **M06 — What a module can reach, in a `-p` run (cA–cC, identical):** `$.settings.read().enabledPlugins` listed the
  account's enabled plugins with their marketplaces (`harness@because-i-needed`, `ux-ui@because-i-needed`,
  `claude-x-codex@because-i-needed`, …); `$.env.get("HOME")`; `$.fs.read` of a file outside the repository;
  `$.fs.exists` of `~/.config/claude-x-codex/mode` (true); `$.process.run(["python3","-c","print(42)"])` → exit 0,
  `42`.
- **M07 — `session.measure` carries both subscription windows in a `-p` run.** cA–cC: `[{kind: five_hour, percentUsed:
  3, resetsAt: …}, {kind: seven_day, percentUsed: 12, resetsAt: …}]`, first with `changed` naming `rateLimits`;
  `$.session.usage().rateLimits` at `session.end` gave the same.

## Not measured

- Interactive drawing (`AbovePrompt`, `$.ui.status`), `$.ui.ask`, turn abort, a subagent's tool calls through the
  module — none can be seen in a `-p` run.
- A plugin installed through a Claude marketplace (only `--plugin-dir`); Codex hooks trusted through `/hooks`.

## Decision (SPEC)

Layout C: `hooks/hooks.json` names the module (Claude), `.codex-plugin/plugin.json` points `hooks` at a separate
command-hook file (Codex). It is the only layout where each host runs its own entry point once (M02–M05).
