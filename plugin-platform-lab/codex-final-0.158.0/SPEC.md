# Final dual-host package checks

Frozen before execution, 2026-09-29.

P02: Validate the final four Claude manifests and marketplace. Read each final Codex plugin from a disposable marketplace containing only copied plugin folders and its catalog. Verify discovered skills, hooks, MCP servers, final versions and explicit mode metadata. No install or persistent setting change.
P03: Run the six deterministic compatibility tests from the product tree and the existing plan split self-test. Capture exact stdout, stderr, status and elapsed milliseconds.
P04: Parse all skill frontmatter as YAML, inspect Bash syntax, check all 25 READMEs' local links/anchors and 13 version locations per plugin. Record packaging-only exceptions from generic submission validators separately.

Record raw output with only host-path redaction, source hashes, monotonic elapsed milliseconds and null tokens for deterministic checks. Completed runs are skipped. This verifies wiring, not end-to-end mobile rendering or comparative quality. Do not commit.
