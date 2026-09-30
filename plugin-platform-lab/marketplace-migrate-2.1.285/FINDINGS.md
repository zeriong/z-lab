# Findings — updates after the rename, and the migration steps

Claude Code 2.1.285, Codex CLI 0.159.2, macOS, 2026-09-30 — versions as stated at SPEC freeze; `claude --version`
and `codex --version` were run by the author right before the run but not stored (review F5). Raw records: `runs/<case>/NN-*.out`,
`runs/<case>/summary.json`; numbers: `METRICS.md` (83 calls, 2 non-zero exits); one hand inspection after the run:
`evidence/M02-clone-after-run.txt`. Sibling of `../marketplace-rename-2.1.285/` (its K-findings are cited as K0n).

## Measured

- **M01 — Claude: a `bin` registration keeps receiving new plugin versions through the manual update path.**
  Rename, then a
  commit bumping probe-a to 1.0.1: `marketplace update bin` succeeds (still `bin`) and fetches
  `cache/bin/probe-a/1.0.1` while the installed version stays 1.0.0; `plugin update probe-a@bin` answers "Plugin
  "probe-a" updated from 1.0.0 to 1.0.1 for scope user. Restart to apply changes." and the list shows
  `probe-a@bin` 1.0.1. That is the CLI's list and cache; whether a new session loads 1.0.1 was not measured here.
  Installing under the new id fails for a `bin` user (K01 step 10, K05); other commands under the new id were not
  tried (review F1).
- **M02 — Codex: a `bin` registration receives nothing after the rename.** `codex plugin marketplace upgrade bin`
  and `codex plugin marketplace upgrade` both exit 1 with "upgraded marketplace name `because-i-needed` does not
  match configured marketplace `bin`". `probe-a@bin` stays 1.0.0. The registration's clone stays at the
  pre-rename commit (`fdea8f7`, catalog `name` `bin`, probe-a 1.0.0) while the source has the rename and the bump
  (evidence file, inspected by hand after the run).
- **M03 — Codex: `plugin remove <p>@bin` before `marketplace remove bin` removes each old copy completely.** Both
  removes exit 0 ("Removed plugin `probe-a` from marketplace `bin`."). Afterwards `config.toml` holds only
  `[marketplaces.bin]` — the `[plugins."probe-a@bin"]`, `[plugins."probe-b@bin"]` and
  `[plugins."probe-a@bin".mcp_servers.probe-mcp]` tables are gone — no plugin or version directory remains under
  `cache/bin/` (the tree records directories only), and
  `prompt-input` lists no probe skill. After `marketplace remove bin` → `marketplace add <url>` →
  `plugin add probe-a@because-i-needed`: `probe-a:hello` loads **once**, from `cache/because-i-needed`
  (compare K03: twice).
- **M04 — Codex: the order does not matter; `plugin remove <p>@bin` still works after `marketplace remove bin`.**
  Right after `marketplace remove bin`, `marketplace list` and `plugin list` are empty, yet `prompt-input` still
  lists `probe-a:hello` and `probe-b:bye` from `cache/bin`, and the three `[plugins."…@bin"…]` tables remain.
  `plugin remove probe-a@bin` and `probe-b@bin` then exit 0 and leave the same clean state as M03; re-add and
  install end the same way (one `probe-a:hello`, from `cache/because-i-needed`).
- **M05 — Codex local path: `plugin remove probe-a@bin` works while the listing already says
  `because-i-needed`.** Exit 0; the `[plugins."probe-a@bin"]` table and `cache/bin/probe-a` go; after remove →
  add → add, one `probe-a:hello` from `cache/because-i-needed`.
- **M06 — Claude: reinstalling with the original `--scope` restores the scopes, not the project's marketplace
  declaration.** Same limits as K07: marketplace declared at user scope, one project, each plugin at one scope. After `marketplace remove bin` → `marketplace add <url>`: `plugin install
  probe-a@because-i-needed --scope project` lands at project scope and writes `enabledPlugins."probe-a@because-i-needed":
  true` into the project `.claude/settings.json`; `--scope local` writes `.claude/settings.local.json`. The
  project file's `extraKnownMarketplaces` stays `{}` (the removed `bin` declaration is not replaced by a
  `because-i-needed` one), and the user settings now declare `because-i-needed`. The old `cache/bin/…`
  directories stay on disk (as in K01).

## Consequences for the migration route (inference from the measurements, not measured)

- Claude: new versions still arrive through `plugin update <p>@bin` (M01; session loading not measured here).
  Migrating is needed to use the new ids. Measured steps, for the measured case only (marketplace declared at user
  scope, one project, each plugin at one scope): first note `claude plugin list --json` (id, scope, projectPath),
  because `marketplace remove bin` uninstalls every `bin` plugin (K01/K07); then `marketplace add <source>`, and
  `plugin install <p>@because-i-needed --scope <noted scope>` per plugin, run from the project for project/local
  scope (M06). A project that declares `extraKnownMarketplaces.bin` must be edited by hand.
- Codex: migrating is required to receive updates (M02). First note the installed ids (`codex plugin list`) and
  copy every `[plugins."<p>@bin"…]` table from `config.toml`: `plugin remove` deletes those tables (M03), and after
  `marketplace remove bin` `plugin list` no longer shows the old plugins (M04). Then `plugin remove <p>@bin` for
  each (either order — M03/M04), `marketplace remove bin`, `marketplace add <url>`, `plugin add
  <p>@because-i-needed`, and re-enter the copied settings under the new id (they don't carry over — K03).
  Skipping `plugin remove` loads the old copies alongside the new ones (K03/K04). Restoring a disabled plugin's
  state was not measured (review F2).

## Not measured

- Whether `marketplace remove` actually deletes saved plugin options, secrets or data (probes have none).
- Whether Claude's leftover `cache/bin/…` or Codex's leftover `cache/bin/` directory affects anything later.
- Claude session loading after an update or a migration: which copy and version a session loads, and hooks.
  Measured in `../marketplace-migrate-r2-2.1.285/` N01, N02.
- Claude conditions beyond one project with a user-scope marketplace: a marketplace declared at project or local
  scope, the same plugin installed at several scopes or in several projects, installs in a project other than the
  cwd of `marketplace remove` (review F3). Measured in r2, N03–N05.
- The installer's remote-catalog path (`curl … | bash`) — K05 ran `install.sh` as a local file.
- A new interactive session: hook firing, Codex hook trust, Claude's handling of a project that still declares
  `extraKnownMarketplaces.bin` for a catalog now named `because-i-needed`.
- K08 auto-update; `owner/repo` and the real repository after the push (K06b).
