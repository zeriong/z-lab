# Findings — marketplace rename `bin` → `because-i-needed`, plugins unchanged

Claude Code 2.1.285, Codex CLI 0.159.2, macOS, 2026-09-30 — versions as stated at SPEC freeze; the runner did not
record them in `runs/` (review F5; `../marketplace-migrate-r2-2.1.285/` records them). Raw records:
`runs/<case>/NN-*.out` (argv, stdout, stderr), `runs/<case>/summary.json` (snapshots); numbers: `METRICS.md`
(125 calls, 7 non-zero exits). The rename commit changed only the catalog `name`; no plugin version changed.

**Deviations.** (1) Every Claude snapshot is CLI output and files; the SPEC left out whether a Claude session loads
the plugin, which the plan (T1) asked for — not measured here (measured in
`../marketplace-migrate-r2-2.1.285/` N01, N02). (2) K05 set `BIN_RAW_URL` to an unused port, not the
lab server as the SPEC says; `install.sh` ran as a local file and read its own catalog, so the remote-catalog path
(`curl … | bash`) was not run (review F1, F4).

## Measured

- **K01 / K02 — Claude keeps an existing registration under its old name.** Git source (K01) and directory source
  (K02) behave the same. After the rename, `marketplace update bin` succeeds and the marketplace is still listed
  as `bin`; `probe-a@bin` stays installed and enabled (cache path `cache/bin/probe-a/1.0.0`); `plugin update
  probe-a@bin` answers "already at the latest version (1.0.0)"; `plugin install probe-b@bin` succeeds (all per
  the CLI's list and messages; session loading not measured).
  `plugin install probe-b@because-i-needed` fails (exit 1): `Plugin "probe-b" not found in marketplace
  "because-i-needed"`. The registration name, not the catalog's `name`, decides which install id resolves.
- **K01 / K02 — Claude migration = remove, add, reinstall; remove uninstalls.** `marketplace remove bin` prints
  "Also uninstalled 2 plugins from this marketplace: probe-a@bin, probe-b@bin. The removal also deletes their
  saved options, secrets and data where it can." `marketplace add <same source>` then registers
  `because-i-needed`, and `plugin install probe-a@because-i-needed` succeeds at user scope. Only reinstalled
  plugins come back (probe-b, installed before, is not listed afterwards). The old `cache/bin/probe-a/1.0.0`
  and `cache/bin/probe-b/1.0.0` directories stay on disk.
- **K07 — `marketplace remove` edits the user and current-project settings, and a reinstall does not restore
  scopes.** Measured with the marketplace declared at user scope, one project, each plugin at one scope. With
  probe-a installed `--scope project` and probe-b `--scope local`, and the project `.claude/settings.json`
  declaring `extraKnownMarketplaces.bin` and `enabledPlugins."probe-a@bin"`: `marketplace update bin` changes
  nothing; `marketplace remove bin` empties `extraKnownMarketplaces` in the user settings and in the project
  `.claude/settings.json`, and `enabledPlugins` in the project `.claude/settings.json` and
  `.claude/settings.local.json` — the project file is a checked-in file. After re-add, `plugin install
  probe-a@because-i-needed` without `--scope` lands at **user** scope (was project) and writes the user
  settings; `--scope local` restores probe-b at local. The project `.claude/settings.json` stays empty.
- **K03 — Codex (git source) stops updating an existing registration.** After the rename, `codex plugin
  marketplace upgrade` fails (exit 1): "upgraded marketplace name `because-i-needed` does not match configured
  marketplace `bin`". The marketplace stays `bin`, `plugin add probe-b@bin` still succeeds, and `plugin add
  probe-b@because-i-needed` fails (exit 1). So a `bin` registration keeps working, and the upgrade path an
  update would travel fails. (Whether the local clone stayed at the pre-rename commit was not recorded.)
- **K03 — Codex migration leaves the old plugins loaded.** `marketplace remove bin` succeeds and removes
  `[marketplaces.bin]` from `config.toml`, but not `[plugins."probe-a@bin"]`, `[plugins."probe-b@bin"]` or the
  `bin/` cache. After `marketplace add <url>` (registered `because-i-needed`) and `plugin add
  probe-a@because-i-needed`, `codex debug prompt-input` lists **`probe-a:hello` twice** (roots
  `cache/because-i-needed` and `cache/bin`) and `probe-b:bye` from `cache/bin` — a plugin the user never
  reinstalled, from a marketplace that is no longer registered. `plugin list` shows only the
  `because-i-needed` entries.
- **K03 — Codex settings keyed by plugin id do not carry over.** `[plugins."probe-a@bin".mcp_servers.probe-mcp]
  enabled = false` stays under the old id; the new install writes `[plugins."probe-a@because-i-needed"]
  enabled = true` with no `mcp_servers` table.
- **K04 — Codex (local-path source) reads the name live.** `marketplace upgrade` prints "No configured Git
  marketplaces to upgrade." (exit 0), yet `marketplace list` already shows `because-i-needed` (config.toml
  still says `[marketplaces.bin]`). `plugin list` shows `probe-a@because-i-needed  not installed`, while
  `prompt-input` still loads `probe-a:hello` from `cache/bin`. `plugin add probe-b@bin` fails ("plugin `probe-b`
  was not found in marketplace `bin`"), `probe-b@because-i-needed` succeeds. After remove → add → add, the same
  duplicate as K03: `probe-a:hello` from both caches.
- **K05 — the current `install.sh`, run as a local file, works for fresh configs and fails for `bin` configs.**
  Fresh: `--dry-run`
  prints `marketplace add` + install of `probe-a@because-i-needed` on both CLIs, and the real run installs it
  (exit 0). With `bin` already registered from the same URL: Claude's `marketplace add` answers "Marketplace
  'bin' already on disk — declared in user settings", then `plugin install probe-a@because-i-needed` fails;
  Codex's answers "Marketplace `bin` is already added from <url>", then `plugin add` fails. Both runs exit 1
  with "1 plugin(s) failed to install". The dry-run shows the same commands for both configs, so it cannot
  warn a `bin` user.
- **K06a — the real repository today (pre-push half).** In isolated homes, Claude registers
  `https://github.com/zeriong/because-i-needed.git` as `bin` (source `git`) and `zeriong/because-i-needed` as
  `bin` (source `github`); both install `harness@bin` 1.3.0. Codex registers the URL as `bin` and installs
  `harness@bin` 1.3.0. Homes kept under `$TMPDIR/z-lab-marketplace-rename-k06/` for K06b.

## Observed in passing

- Codex's `prompt-input` in an isolated `CODEX_HOME` still lists the account's `~/.agents/skills` as skill root
  `r0`. That is a read of the real home; nothing was written there.

## Not measured

- **Whether a plugin version published after the rename reaches a `bin` registration** — no plugin version
  changed here, so K01/K02's "already at the latest version" says nothing about delivery. Measured in
  `../marketplace-migrate-2.1.285/` M01 (Claude: delivered) and M02 (Codex: not delivered).
- Codex `plugin remove <p>@bin` — whether it removes the duplicate, and whether it still works after
  `marketplace remove bin`. Measured in the sibling, M03–M05.
- Claude reinstall with `--scope project`, and whether that restores the project settings file. Measured in the
  sibling, M06.
- K08 auto-update (needs an authenticated session; SPEC "Not in scope").
- Whether hooks fire and Codex hook trust — the `probe-a-hook` marker never appears in `prompt-input`, which is
  expected: hooks are not part of the prompt.
- Whether saved plugin options, secrets or data are actually deleted by Claude's `marketplace remove` — only the
  CLI's message was recorded; the probes have none.
- `owner/repo` after the push, and every real-repository behavior after the push (K06b).

## Outcome (decision, not a measurement)

The rename shipped as because-i-needed `452443c` (marketplace 3.0.0) with an "uninstall and reinstall" note. The
maintainer then ended this series of measurements and ruled that packaging changes are never measured
(because-i-needed root CLAUDE.md Rule 9, 2026-09-30). K06b was not run; lab review r1 findings F1–F6 were applied,
the delta re-review was stopped before it reported.
