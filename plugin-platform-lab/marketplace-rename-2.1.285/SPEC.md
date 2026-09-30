# Marketplace rename — what happens to an existing install, and how to move over

Frozen before running, 2026-09-30. Claude Code 2.1.285, Codex CLI 0.159.2, macOS.

## Objective
because-i-needed will rename its marketplace from `bin` to `because-i-needed`, plugins unchanged. Measure, on both CLIs,
what an install registered as `bin` sees after the rename, and which steps move it over. Earlier evidence
(`claude-code-2.1.283/` P02) renamed marketplace and plugin together, from a directory source, on 2.1.283.

## Fixture
A probe marketplace: `probe-a` (skill `hello`, a UserPromptSubmit hook, one MCP server declaration) and `probe-b`
(skill `bye`). Catalog `name` starts as `bin`; the rename commit changes only that `name`. Git sources are served by a
local smart-HTTP server (`git http-backend` behind `python3 -m http.server --cgi`, 127.0.0.1); directory/local-path
sources point at a working copy. Every case gets its own repository, its own temporary `CLAUDE_CONFIG_DIR` or
`CODEX_HOME`, and (Claude) its own temporary project directory as cwd. Nothing reads or writes the account's real
Claude or Codex settings, except K06a's read-only GitHub clone.

## Cases
- K01 Claude, git source: `marketplace add <url>`; `plugin install probe-a@bin`; snapshot. Rename; `marketplace update bin`;
  snapshot; `plugin update probe-a@bin`; `plugin install probe-b@bin`; `plugin install probe-b@because-i-needed`; snapshot.
  Migration: `marketplace remove bin`; `marketplace add <url>`; `plugin install probe-a@because-i-needed`; snapshot.
- K02 The same as K01 with a directory source.
- K03 Codex, git source: `marketplace add <url>`; `plugin add probe-a@bin`; snapshot. Rename; `marketplace upgrade`; snapshot;
  `plugin add probe-b@bin`; `plugin add probe-b@because-i-needed`; snapshot. Migration: `marketplace remove bin`;
  `marketplace add <url>`; `plugin add probe-a@because-i-needed`; snapshot. Before the rename, `config.toml` also gets
  `[plugins."probe-a@bin".mcp_servers.<server>] enabled = false` written by the runner (the form plugins/ux-ui/README.md
  documents), to see whether it applies to the new id.
- K04 The same as K03 with a local-path source.
- K05 The product's `install.sh` (main, unchanged) copied into a renamed probe repository, `BIN_REPO_URL`/`BIN_RAW_URL`
  pinned to the lab server: Claude and Codex, `--only probe-a`, each `--dry-run` and real, for (a) a fresh config and
  (b) a config that already holds the marketplace as `bin` with `probe-a@bin` installed.
- K07 Claude scopes, in a temporary git project as cwd: the marketplace added at user scope; `probe-a` installed
  `--scope project`, `probe-b` `--scope local`; the project `.claude/settings.json` also declares
  `extraKnownMarketplaces.bin` and `enabledPlugins."probe-a@bin": true`. Snapshots of every settings file and the installed
  list before the rename, after `marketplace update bin`, and after `marketplace remove bin` → `marketplace add <url>` →
  `plugin install probe-a@because-i-needed` (no `--scope`) → `plugin install probe-b@because-i-needed --scope local`.
- K06a Real repository, pre-release half: a temporary `CLAUDE_CONFIG_DIR` adds `https://github.com/zeriong/because-i-needed.git`
  and a second one adds `zeriong/because-i-needed`; each installs `harness@bin`; snapshot. (K06b, after the rename is pushed,
  updates both and is a separate sibling.) Codex: a temporary `CODEX_HOME` adds the URL and installs `harness@bin`.

A snapshot = `marketplace list` (+ `--json` where the CLI offers it), `plugin list --json` (Claude) / `plugin list` (Codex),
every settings/config file in the isolated home and project, the cache directory tree (names only), and for Codex
`codex debug prompt-input` (no model call) grepped for the probe skills and hook.

## Not in scope
- **K08 auto-update**: per the Claude Code docs it runs up to 10 minutes after a session's first message, which needs an
  authenticated session; the isolated `CLAUDE_CONFIG_DIR` has no credentials (a design probe returned 0 tokens), and the
  real config must not be touched. Recorded as not measured.
- Whether a hook actually fires, and Codex hook trust — a snapshot can show declarations, not execution.

## Method
State-aware `run.py` (DONE skipped, incomplete refused). Each CLI call is recorded with argv, cwd, exit, elapsed ms, stdout
and stderr. No model calls. Host paths are not redacted (root CLAUDE.md Rule 9, 2026-09-30).

## Metrics
Exit codes and elapsed ms per call. No tokens. Deltas N/A.

## Decision
The migration route for `bin` installs and the SemVer level are the user's (Gate 1b), made from these findings.
