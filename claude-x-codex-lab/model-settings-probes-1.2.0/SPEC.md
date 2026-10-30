# peer-coding 1.2.0 — platform probes for persistent model settings

Frozen before running, 2026-10-30. Claude Code 2.1.312, Codex CLI 0.166.0, macOS (Darwin 27.0.0).

## Objective
peer-coding 1.2.0 makes its worker and reviewer models and efforts persistent settings, selectable through each
agent CLI's own interface where one exists (design: because-i-needed `.claude-x-codex/model-settings/plan.md`, local).
Before building it, measure the platform behaviors that design relies on. The new mechanism itself is measured in
`../model-settings-1.2.0/`.

A canary in a scratch directory preceded this SPEC (not part of the record). It set the method: in a headless
`claude -p` a hooks module's `$.config.list()` returned 37 built-in rows and no plugin row; an interactive session in
a fresh `CLAUDE_CONFIG_DIR` stops at onboarding and opens a browser login unless `.claude.json` is pre-seeded; in
`/config` the first Enter moves focus from the search box to the list, the second opens a row's picker.

## Cases
- P01 Claude Code lists a plugin's `userConfig` string fields with `options` as choices. Fixture plugin `pc` in the
  local marketplace `fixtures/mkt` (`probe-mkt`), installed into a temporary `CLAUDE_CONFIG_DIR`. Record
  `claude plugin validate`, `claude plugin install` and `claude plugin configure pc@probe-mkt --json` (schema,
  choices, configured, unconfigured).
- P02 Where a value saved through the CLI lands. Fresh temporary home: `claude plugin configure pc@probe-mkt
  --values-stdin` with `{"codex_worker":"luna"}`, then `{"codex_worker":"bogus"}` (outside `options`); after each,
  exit, output, and `pluginConfigs` in `$CLAUDE_CONFIG_DIR/settings.json`; then `configure --json` again.
- P03 (gate for the design) What the `/config` menu draws and where its choice lands. Fresh temporary home whose
  `.claude.json` is pre-seeded (onboarding done, the temporary project trusted); `pcmod@probe-mkt` (same `userConfig`
  plus a hooks module) installed. `fixtures/config-pick.exp` drives an interactive `claude` (160×50 pty): `/config`,
  type `codex`, Enter, Enter, Down, Enter, Esc, Esc, `/exit`. Record the drawn row and picker text and `pluginConfigs`
  after. Variant b: the same with `--plugin-dir fixtures/mkt/plugins/pcmod` and no install. Variant c: headless
  `claude -p` with the installed `pcmod`, whose `session.start` hook writes `$.config.list()` (count, plugin rows) and
  its `options`.
- P04 How a stored value reaches a skill, per plugin id. User login, temporary project, `--plugin-dir
  fixtures/mkt/plugins/pc`, `--setting-sources project`, haiku. `--settings` stores `codex_worker` as: a `pc@inline`
  → `luna`; b `pc` → `sol`; c both (`pc@inline` → `luna`, `pc` → `sol`); d nothing; e `pc@inline` → `bogus`. The model
  runs the skill `pc:show` (text `VALUE=[${user_config.codex_worker}] EFFORT=[${user_config.review_effort}]`) and
  `env | grep -i plugin_option || echo NONE`. Record the `VALUE=` line found in the stream and the command output.
- P05 Project-level storage. As P04 without `--settings` and with `--setting-sources project,local`: a the project's
  `.claude/settings.json` holds `pc@inline` → `luna`; b only `.claude/settings.local.json` holds `pc@inline` → `sol`;
  c both files.
- P06 Codex has no plugin options. Temporary `CODEX_HOME`, local marketplace `fixtures/codex-mkt` with a plugin whose
  `.codex-plugin/plugin.json` carries `userConfig` and `config` objects: `codex plugin marketplace add`, `codex plugin
  add`, `config.toml`, `codex plugin list`; the strings of the installed binary that name `PluginConfig`; the
  `default_mode_request_user_input` row of `codex features list`.
- P07 The resolver on the families the design names. Product `plugins/peer-coding/scripts/latest-model.py`:
  `codex <family> --effort <e>` for terra, luna, sol, astra × low, medium, high, xhigh, max, ultra; exit and stdout.
- P08 Live dispatch on the new defaults, the forms of the product's `transport-standalone.md`. Temporary git
  repository: the Codex worker form on the newest `terra` at `high` (task: create `hello.txt` containing `hi`), and the
  Codex reviewer form on the newest `astra` at `xhigh` with `--output-schema` over a one-line diff. Record the run
  header `model:` and `reasoning effort:`, exit, tokens used, `hello.txt`, and whether the review parses with the
  schema's top-level keys.
- P09 Whether a set `CLAUDE_CONFIG_DIR` reaches what a plugin runs. User login with `CLAUDE_CONFIG_DIR` set explicitly
  to the default `~/.claude`, `--setting-sources project`, haiku, both fixtures by `--plugin-dir`: the Bash tool
  (`env | grep -c '^CLAUDE_CONFIG_DIR='`), the `pc` UserPromptSubmit hook command, and the `pcmod` hooks module's
  `$.process.run`. Record presence in each.

## Method
Product: because-i-needed at the commit in `runs/PRODUCT`. `run.py` writes `fixtures/` once and never edits it after.
`run.py` is state-aware: a case directory with `DONE` is skipped, one without `DONE` is refused. Temporary homes and
projects only; P04, P05 and P09 read the user's Claude login (nothing is written to the user's settings), P08 uses the
current `CODEX_HOME` login. Every child runs with `CXC_MODE=off`. Host paths are not redacted (because-i-needed root
CLAUDE.md Rule 9, 2026-09-30).

## Metrics
Elapsed ms per subprocess; tokens as each CLI reports them (Claude `usage`, Codex `tokens used`), else "not measured".
No arms; deltas N/A.
