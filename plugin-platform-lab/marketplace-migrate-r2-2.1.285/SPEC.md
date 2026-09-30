# Marketplace rename — what a Claude session loads, and scopes beyond one project

Frozen before running, 2026-09-30. Claude Code 2.1.285, Codex CLI 0.159.2, macOS. Sibling of
`marketplace-rename-2.1.285/` (K) and `marketplace-migrate-2.1.285/` (M), answering their review (r1 F1, F3, F5).

## Objective
1. After the rename, which plugin copy and version does a **new Claude session** load — for a user who stays on
   `bin` and updates, and for one who migrates? Does the plugin's hook run? Which commands under the new id work
   for a `bin` user?
2. How does the Claude migration behave beyond K07/M06's single case: the same plugin installed in two projects
   and at two scopes, `marketplace remove` run from one of them, and a marketplace declared at project or local
   scope?

## Method for a session snapshot (design probe, not a measurement)
`claude -p hi --output-format stream-json --verbose --include-hook-events` in an isolated `CLAUDE_CONFIG_DIR` with
no credentials emits the `system/init` event — `claude_code_version`, `plugins` (name, path, source, version),
`skills`, `slash_commands`, `mcp_servers` — and `hook_started`/`hook_response` events, then fails with
"Not logged in" and reports 0 input and 0 output tokens. Probed once in a scratch home and once on the kept
M01 home (M01's recorded runs are unaffected; the probe only added a session there).

A session snapshot records, from those events: the version, every plugin whose name starts with `probe` (with its
path, source and version), the probe skills and slash commands, the probe MCP servers with status, each hook
response whose output contains `probe`, and the result's token counts and error text. The CLI's exit code (1,
not logged in) is expected.

## Fixture
The K/M probe marketplace and smart-HTTP server, reused by importing `../marketplace-rename-2.1.285/run.py` and
`../marketplace-migrate-2.1.285/run.py` read-only: `probe-a` (skill `hello`, UserPromptSubmit hook
`echo probe-a-hook`, MCP server `probe-mcp`), `probe-b` (skill `bye`), catalog `name` `bin`. "Rename" and "bump"
(probe-a → 1.0.1) as in M. Each case has its own repository and temporary `CLAUDE_CONFIG_DIR`; projects are
temporary git repositories; the "neutral" cwd is a temporary directory outside every project.

## Cases
- V00 Versions: `claude --version`, `codex --version`.
- N01 Stay on `bin`: add; install `probe-a@bin`; session. Rename; bump; `marketplace update bin`;
  `plugin update probe-a@bin`; session. Then, against the `bin` registration: `plugin update
  probe-a@because-i-needed`, `plugin disable probe-a@because-i-needed`, `plugin enable probe-a@because-i-needed`,
  `plugin uninstall probe-a@because-i-needed`; CLI snapshot; session.
- N02 Migrate: add; install `probe-a@bin` and `probe-b@bin`; session. Rename; `marketplace remove bin`;
  `marketplace add <url>`; `plugin install probe-a@because-i-needed`; CLI snapshot; session.
- N03 Two projects, two scopes: marketplace at user scope; from P1 `probe-a@bin --scope project` and
  `probe-b@bin --scope local`; from P2 `probe-a@bin --scope project`; from neutral `probe-b@bin` (user).
  Snapshot from P1, P2 and neutral (CLI list, every settings file of user, P1, P2; sessions in P1, P2, neutral).
  Rename; from P1 `marketplace remove bin`; the same snapshot. Then from neutral `marketplace add <url>` and
  `plugin install probe-b@because-i-needed`; from P1 `probe-a@because-i-needed --scope project` and
  `probe-b@because-i-needed --scope local`; from P2 `probe-a@because-i-needed --scope project`; the same snapshot.
- N04 Marketplace declared at project scope, in project P: `marketplace add <url> --scope project`;
  `plugin install probe-a@bin --scope project`; snapshot (CLI, settings, session). Rename;
  `marketplace update bin`; session. `marketplace remove bin`; snapshot. `marketplace add <url> --scope project`;
  `plugin install probe-a@because-i-needed --scope project`; snapshot.
- N05 The same as N04 with `--scope local`.

A CLI snapshot = `plugin marketplace list --json`, `plugin list --json`, every settings file in the isolated home
and the case's projects, and the cache tree (directory names).

## Not in scope
- Codex (M covers its migration; Codex sessions were observed through `prompt-input`).
- A disabled plugin's state across migration; plugin options, secrets and data; K08 auto-update; the installer.
- What a model does with the loaded skills (no model call is made).

## Method
State-aware `run.py` (DONE skipped, incomplete refused). Each CLI call is recorded with argv, cwd, exit, elapsed ms,
stdout and stderr. No model is called (unauthenticated; the result's token counts are recorded to show 0).
Host paths are not redacted (root CLAUDE.md Rule 9, 2026-09-30).

## Metrics
Exit codes and elapsed ms per call; the session results' token counts (expected 0). Deltas N/A.

## Decision
Feeds Gate 1b with the K and M findings.
