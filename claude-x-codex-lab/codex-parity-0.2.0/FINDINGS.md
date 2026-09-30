# Codex setting parity findings

## C05 — Linked-worktree mode state

The actual mode script resolves exclusion through Git metadata rather than assuming `.git` is a directory. The shared fixture suite successfully enables mode in a linked worktree and confirms its state path is excluded. Hints document both host invocation prefixes. Existing mode precedence and CXC model/effort routing remain shared.

## C06 — Context audit remains read-only

The source suite confirms AGENTS.override.md takes precedence in the report, malformed hook entries are reported without a traceback, and inspected bytes/Git state are unchanged. Codex hooks and uncommitted `.codex`/`.agents` context are included. See EVIDENCE.md for exact assertions and raw test result.

## Not measured

These tests do not prove semantic equality of arbitrary project instruction files or every effective Codex profile/config layer. Cross-vendor orchestration and structured hook delivery were exercised in prior compatibility records; those transports were preserved, not re-benchmarked here.
