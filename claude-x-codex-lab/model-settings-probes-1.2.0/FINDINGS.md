# Findings — platform probes for peer-coding 1.2.0 model settings

Claude Code 2.1.314 (the SPEC header names 2.1.312, the version when it was frozen; the CLI updated before the run —
`runs/VERSIONS`), Codex CLI 0.166.0, macOS 27.0.1, 2026-10-30. Product: because-i-needed `19a712c` (`runs/PRODUCT`).
Raw records: `runs/<case>/`; numbers: `METRICS.md`. P09's missing row is measured in `../model-settings-probes-r2-1.2.0/`.

## Measured

- **P01 — `userConfig` options are choices.** `claude plugin validate` passed the fixture (warnings only).
  `claude plugin configure pc@probe-mkt --json` listed `choices` exactly as declared (`codex_worker`: terra, luna, sol,
  astra; `review_effort`: low … max), `inputs` filled with the defaults, and both fields `unconfigured` until saved.
- **P02 — the CLI saves to the user settings file and refuses values outside the options.** `--values-stdin` with
  `luna` exited 0 ("Configuration saved. Restart Claude Code to apply it.") and wrote
  `pluginConfigs["pc@probe-mkt"].options.codex_worker = "luna"` to `$CLAUDE_CONFIG_DIR/settings.json`. `bogus` exited 1
  ("Codex worker model must be one of: terra, luna, sol, astra") and left the file unchanged.
- **P03 — `/config` draws the rows as pickers and saves the choice to the same file (gate passed).** In an interactive
  session, `/config` + search `codex` drew `Codex worker model · pcmod terra`; the row's picker listed
  `1. terra ✔ 2. luna 3. sol 4. astra`; Down + Enter wrote `pluginConfigs["pcmod@probe-mkt"].options.codex_worker =
  "luna"` (installed plugin) — and `pluginConfigs["pcmod@inline"]…` for the `--plugin-dir` variant — to
  `$CLAUDE_CONFIG_DIR/settings.json`. No project `.claude/` folder was created. The `row` mark reads `no-row` because the
  frame drew after the 10 s pattern window (the row text is in the log); drawing lagged input throughout. Headless
  (variant c): the hooks module's `$.config.list()` returned 38 built-in rows and no plugin row, while its `options`
  held the defaults.
- **P04 — skill text: per-id behavior, and what an unset field substitutes.** With `--plugin-dir`, a value stored
  under `pc@inline` (luna) or under the bare `pc` (sol) was substituted into `${user_config.codex_worker}`; with both,
  `pc@inline` won (luna). With nothing stored, the text kept `${user_config.codex_worker}` literally — not the
  declared default. A stored `bogus` (outside the options) was substituted as `bogus`. The Bash tool printed `NONE` for
  `env | grep -i plugin_option` in every run (haiku: `claude-haiku-5-5`).
- **P05 — project and local settings files do not carry `pluginConfigs`.** The same value in the project's
  `.claude/settings.json`, in `.claude/settings.local.json`, or in both (`--setting-sources project,local`) left the
  skill text literal in all three runs.
- **P06 — Codex 0.166.0 has no plugin options.** A plugin whose `.codex-plugin/plugin.json` carried `userConfig` and
  `config` objects installed without a warning; `config.toml` got only `[plugins."pc@probe-codex"] enabled = true`. The
  binary's `PluginConfig` struct names `remote_plugin_id`, `release_id`, `auto_provision` and `mcp_servers` (strings
  next to the type name). `default_mode_request_user_input` is `under development  false`.
- **P07 — the resolver covers the families.** `latest-model.py codex terra` → `gpt-6.1-terra` at low … max and
  `ultra`; `luna` → `gpt-6-luna` up to `max`, `ultra` exit 3 ("effort ultra is not supported by gpt-6-luna"); `sol`
  → `gpt-6.1-sol` and `astra` → `gpt-6-astra` at every level including `ultra`.
- **P08 — the documented forms run on terra and astra.** The `codex exec` worker form on `gpt-6.1-terra` at `high`
  (run header `model: gpt-6.1-terra`, `reasoning effort: high`) created `hello.txt` = `hi\n` (exit 0, 7,239 tokens,
  15.5 s). The reviewer form on `gpt-6-astra` at `xhigh` with `--output-schema` exited 0 with a review that parses and has
  `findings`, `resolved`, `verdict` (18,980 tokens, 44.5 s).
- **P09 — a set `CLAUDE_CONFIG_DIR` reaches hooks and hooks modules.** With `CLAUDE_CONFIG_DIR=~/.claude` set
  explicitly, the UserPromptSubmit hook command saw `CLAUDE_CONFIG_DIR=/Users/jeonjelyong/.claude`, and the hooks
  module's `$.process.run` counted one such variable. The Bash tool row was not reached: `claude -p` failed to
  authenticate ("OAuth session expired and could not be refreshed") once the variable was set, though the same login
  works with it unset.

## Method notes

- Loading `fixtures/mkt/plugins/pcmod` with `--plugin-dir` (P03 b, P09) made Claude Code write `tsconfig.json` and
  `.claude-plugin/types/` into that fixture; the engine's own `.gitignore` there keeps `types/` out of git. These are the
  only fixture changes after `run.py` wrote them, and no case reads them.

## Not measured

- The Bash tool's environment under a set `CLAUDE_CONFIG_DIR` (P09) — see `../model-settings-probes-r2-1.2.0/` R01.
- Whether a `/config` change reaches a running session's skill text without a restart (P02 prints "Restart Claude Code
  to apply it"); the design reads the file at each call instead.
- Managed (enterprise) settings carrying `pluginConfigs`.
- Any quality difference between `terra` and `luna` workers, or `astra` and `sol` reviewers. P08 shows the forms run,
  nothing about the work's quality.

## For the design (because-i-needed `.claude-x-codex/model-settings/plan.md`)

- P03 gate passed: `/config` is a Claude Code route; it writes the user settings file under `<plugin>@<marketplace>`
  (installed) or `<plugin>@inline` (`--plugin-dir`).
- Read only `$CLAUDE_CONFIG_DIR/settings.json` (P05: project and local files are not applied), installed id for a cached
  copy, `@inline` then bare for a developer checkout (P04 c).
- `${user_config.*}` in skill text is unusable for this: unset reads literally (P04 d), Codex has none (P06), the
  shell has no `CLAUDE_PLUGIN_OPTION_*` (P04).
- Treat a stored value outside the options as unset: the CLI and the menu never write one (P02, P03), so one in the
  file was written by hand; the skill text would pass it through (P04 e).
