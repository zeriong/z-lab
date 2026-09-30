# Marketplace rename — updates after the rename, and the migration steps

Frozen before running, 2026-09-30. Claude Code 2.1.285, Codex CLI 0.159.2, macOS. Sibling of
`marketplace-rename-2.1.285/` (its FINDINGS "Not measured" list).

## Objective
The rename experiment left three questions open, and the migration route for `bin` installs (Gate 1b) depends on them:
1. Does a plugin version published **after** the rename still reach a registration named `bin`?
2. On Codex, does `codex plugin remove <p>@bin` remove the leftover copies that loaded twice — before and after
   `marketplace remove bin`?
3. On Claude, does reinstalling with the original `--scope` restore the original installation, including the
   checked-in project settings?

## Fixture
The sibling's probe marketplace and smart-HTTP server, reused by importing its `run.py` (read-only): `probe-a`
(skill `hello`, hook, MCP server `probe-mcp`), `probe-b` (skill `bye`), catalog `name` `bin`, version 1.0.0.
"Rename" = the sibling's commit that changes only the catalog `name` to `because-i-needed`. "Bump" = a later
commit that sets probe-a's version to 1.0.1 in both plugin manifests and its catalog entry. Every case has its own
repository, its own temporary `CLAUDE_CONFIG_DIR` or `CODEX_HOME`, and its own temporary cwd.

## Cases
- M01 Claude, git: add; install `probe-a@bin`; snapshot. Rename; bump; `marketplace update bin`; snapshot;
  `plugin update probe-a@bin`; snapshot.
- M02 Codex, git: add; add `probe-a@bin`; snapshot. Rename; bump; `marketplace upgrade bin`; `marketplace upgrade`;
  snapshot.
- M03 Codex, git, plugin-first migration: add; add `probe-a@bin` and `probe-b@bin`; append
  `[plugins."probe-a@bin".mcp_servers.probe-mcp] enabled = false`; snapshot. Rename; `plugin remove probe-a@bin`;
  `plugin remove probe-b@bin`; snapshot; `marketplace remove bin`; `marketplace add <url>`;
  `plugin add probe-a@because-i-needed`; snapshot.
- M04 Codex, git, marketplace-first: the same setup; rename; `marketplace remove bin`; snapshot;
  `plugin remove probe-a@bin`; `plugin remove probe-b@bin`; snapshot; `marketplace add <url>`;
  `plugin add probe-a@because-i-needed`; snapshot.
- M05 Codex, local path, plugin-first: add; add `probe-a@bin`; snapshot. Rename; `plugin remove probe-a@bin`;
  snapshot; `marketplace remove bin`; `marketplace add <path>`; `plugin add probe-a@because-i-needed`; snapshot.
- M06 Claude, scopes, scope-preserving migration, in a temporary git project as cwd: the sibling's K07 setup
  (marketplace at user scope; probe-a `--scope project`, probe-b `--scope local`; project `.claude/settings.json`
  also declaring `extraKnownMarketplaces.bin` and `enabledPlugins."probe-a@bin"`); snapshot. Rename;
  `marketplace remove bin`; `marketplace add <url>`; `plugin install probe-a@because-i-needed --scope project`;
  `plugin install probe-b@because-i-needed --scope local`; snapshot.

A snapshot = the sibling's: `marketplace list` (+ `--json`), `plugin list --json` (Claude) / `plugin list` (Codex),
every settings/config file in the isolated home and project, the cache tree (names only), and for Codex
`codex debug prompt-input` (no model call). Added here: for Codex, the probe skills listed in `prompt-input` with the
root each one loads from, and the probe-a version in each listing.

## Not in scope
- K08 auto-update and hook execution (the sibling's reasons hold).
- Removing a plugin that another marketplace also provides; more than two plugins.

## Method
State-aware `run.py` (DONE skipped, incomplete refused). Each CLI call is recorded with argv, cwd, exit, elapsed ms,
stdout and stderr. No model calls. Host paths are not redacted (root CLAUDE.md Rule 9, 2026-09-30).

## Metrics
Exit codes and elapsed ms per call. No tokens. Deltas N/A.

## Decision
The migration route for `bin` installs and the SemVer level are the user's (Gate 1b), made from both experiments.
