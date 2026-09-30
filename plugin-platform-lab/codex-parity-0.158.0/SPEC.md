# Codex setting parity — plugin-platform

Frozen before implementation and execution, 2026-09-29.

## Cases
P05: Inventory every plugin file and record per-file inspection status. Check all shared skills/resources, both manifests, local documentation links and CLI settings. Re-run actual plugin discovery and deterministic regression suite; no remote publication or user configuration writes.

## Method
Keep prior specimens. Run deterministic scripts in disposable fixtures, and only narrow real-agent smoke tests needed for changed dispatch. Record exact input, source hashes, stdout/stderr, exit, monotonic elapsed milliseconds and CLI-reported usage. Completed units are skipped; changed run conditions use new directories. No commits or persistent user settings changes. Tests may initialize temporary Git metadata and stage fixture files, but must create no commits. Reviewers remain read-only; no fabricated measurements or approvals.

## Limits
This measures configuration/workflow parity, not model-quality equivalence or every OS/device. Version numbers retain the already-uncommitted compatibility release bump relative to HEAD. No additional release was published between these corrections.
