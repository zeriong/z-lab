# Findings

## P02 — Final runtime and manifest checks
All four copied plugin folders were read by Codex 0.158.0 from a disposable marketplace containing no root README or maintainer instructions. It discovered seven skills, two hook declarations and four UX MCP server names. Claude 2.1.284 validated the marketplace and all four plugins, with only the expected CLAUDE.md warning. Copied mode skill metadata loads enabled with its explicit Codex UI policy present.

The generic plugin-creator submission validator passed plan-smith, harness and ux-ui; it rejects CXC's existing `disable-model-invocation: true`. This is retained for Claude behavior, with Codex's policy in agents/openai.yaml. The actual Codex loader accepts it. Generic skill-creator field allowlists also omit shared Claude fields; strict YAML parsing and actual runtime loading are the relevant dual-host checks. This does not claim acceptance by every publication validator.

## P03 — Deterministic regressions
Six stdlib unittest methods passed. Coverage includes default Claude versus explicit Codex installer calls; scopes and failures; both payload layouts; UI approved/unapproved/stale-diff/non-UI behavior; both injection layouts and bypass/missing files; CXC mode, structured context and audit read-only behavior; manifest parity. Plan split checker: 11 built-in cases passed. Bash syntax: all eight scripts passed. No real commits or persistent settings changes.

## P04 — Self-contained resources and documentation
Seven skill frontmatters parsed as YAML. All 415 local links/anchors across 25 READMEs resolve. All 13 version locations per plugin agree. Four native manifests declare the shared skills; UX MCP objects agree across hosts and avoid adding another default MCP file to Claude discovery.

## Launch accounting
See LAUNCH-NOTE.md: an unsupported wrapper flag failed before initialization; the first project-skill discovery fixture was not initialized as a Git project. Its successful plugin metadata and empty skill result are retained. The completed final run uses a Git fixture and canonical paths. These are harness setup corrections, not hidden product retries.

## Not measured

No comparison of model quality, broad platform portability, published remote installation, or complete browser/device coverage is claimed. Agent fixtures are smoke tests. Source snapshots retain the pre-bump metadata used at run time; final native package versions are measured in plugin-platform-lab/codex-final-0.158.0.
