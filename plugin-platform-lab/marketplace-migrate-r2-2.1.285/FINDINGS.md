# Findings — what a Claude session loads, and scopes beyond one project

Claude Code 2.1.285 and Codex CLI 0.159.2 (`runs/V00`; every session's init event also reports 2.1.285), macOS,
2026-09-30. Raw records: `runs/<case>/NN-*.out`, `runs/<case>/summary.json` (`snapshots` = CLI and files,
`sessions` = init and hook events); numbers: `METRICS.md` (95 calls; 25 non-zero exits = 22 unauthenticated
sessions, expected, and 3 commands under the new id). Every session reported 0 input and 0 output tokens and
"Not logged in · Please run /login": no model was called. V00 ran in its own invocation before N01–N05
(`run-log.txt`).

## Measured

- **N01 — a Claude user who stays on `bin` gets the new version into new sessions.** Before the rename a session
  loads `probe-a@bin` 1.0.0 from `cache/bin/probe-a/1.0.0`, lists `probe-a:hello`, and its UserPromptSubmit hook
  answers `probe-a-hook`. After rename, bump, `marketplace update bin` and `plugin update probe-a@bin`, a new
  session loads `probe-a@bin` **1.0.1** from `cache/bin/probe-a/1.0.1`, with the skill and the hook. (Closes the
  gap in M01.)
- **N01 — commands under the new id, against a `bin` registration.** `plugin update probe-a@because-i-needed`
  exit 1 ("Plugin "probe-a" not found"); `plugin disable …` exit 1 ("is already disabled"); `plugin uninstall …`
  exit 1 ("is not installed in user scope"). `plugin enable probe-a@because-i-needed` **exit 0** ("Successfully
  enabled plugin: probe-a (scope: user)") and writes `"probe-a@because-i-needed": true` into the user
  `enabledPlugins` next to `"probe-a@bin": true`. The next session still loads only `probe-a@bin` 1.0.1, once.
- **N02 — after migrating, a session loads one copy, from the new cache.** After `marketplace remove bin` →
  `marketplace add <url>` → `plugin install probe-a@because-i-needed`: the session loads `probe-a@because-i-needed`
  1.0.0 from `cache/because-i-needed/probe-a/1.0.0`, `probe-a:hello` once, the hook once; `probe-b` (not
  reinstalled) is not loaded. The old `cache/bin/…` directories remain and are not loaded.
- **N03 — `plugin list --json` shows every project's installs from any cwd.** From P1, P2 and a neutral directory
  the list is the same four entries, each with `scope` and, for project/local, `projectPath` (probe-a project in
  P1 and in P2, probe-b local in P1, probe-b user).
- **N03 — `marketplace remove bin` run from P1 leaves P2's file alone.** It uninstalls "2 plugins" (probe-a@bin,
  probe-b@bin); `plugin list` is then empty from every cwd, and sessions in P1, P2 and neutral load no probe plugin.
  The user settings and P1's `.claude/settings.json` and `.claude/settings.local.json` are emptied; **P2's
  `.claude/settings.json` keeps `"probe-a@bin": true`**. Reinstalling each noted id at its noted scope, from its
  project (probe-b user from neutral, probe-a project and probe-b local from P1, probe-a project from P2)
  restores all four entries; sessions in P1 and P2 load probe-a and probe-b from `cache/because-i-needed`, neutral
  loads probe-b. P2's file now holds both `"probe-a@bin": true` and `"probe-a@because-i-needed": true`; its
  session loads only the new copy.
- **N04 / N05 — a marketplace declared at project or local scope comes back with `--scope`.** `marketplace add
  <url> --scope project` writes `extraKnownMarketplaces.bin` into the project `.claude/settings.json` (N04);
  `--scope local` into `.claude/settings.local.json` (N05); the user settings get none. `marketplace update bin`
  keeps the session loading `probe-a@bin`. `marketplace remove bin` empties that file's `extraKnownMarketplaces`
  and `enabledPlugins`; `marketplace add <url> --scope <same>` and `plugin install probe-a@because-i-needed
  --scope <same>` write `extraKnownMarketplaces.because-i-needed` and `enabledPlugins."probe-a@because-i-needed"`
  back into the same file, and the session loads the new copy. (M06's project file stayed without a declaration
  because its re-add used the default user scope.)

## Consequences for the migration route (inference from K, M and N, not measured)

- Claude: staying on `bin` keeps working, including updates (N01). Migrating is for the new ids. Before
  `marketplace remove bin`, note `claude plugin list --json` (every install, any cwd — N03) and `claude plugin
  marketplace list --json` (the source). Re-add with the scope the marketplace was declared at, reinstall each
  plugin with its noted scope from its `projectPath` (N03–N05). `enabledPlugins."<p>@bin"` entries in projects
  other than the cwd of the remove stay behind (N03) — inert once `bin` is gone in this measurement, but they are
  checked-in lines a team shares. Running a new-id command before migrating is not harmless: `enable` writes a
  stray entry (N01).
- Codex: as in M.

## Not measured

- A teammate's machine: another user who still has `bin` registered while a shared project file carries both
  ids (N03), or a project that declares `extraKnownMarketplaces.bin` for a catalog now named `because-i-needed`.
- Whether the stray `"probe-a@because-i-needed": true` entry from N01 changes anything after a later migration.
- An interactive session (trust prompts, `/plugin` UI); what a model does with the loaded skills.
- The probe MCP server reports `failed` in every session, before and after — the probe's server is
  `python3 -c pass`, which exits at once; MCP behavior across the rename is therefore not measured.
- Codex, the installer, plugin options/secrets/data, K08 auto-update (SPEC "Not in scope").
