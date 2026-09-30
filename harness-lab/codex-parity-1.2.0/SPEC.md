# Codex setting parity — harness

Frozen before implementation and execution, 2026-09-29.

## Cases
H04: Merge generated hook settings for Claude, Codex and both targets without losing unrelated settings, duplicating hooks, or accepting malformed config. H05: Injection runs in a read-only Codex process without temporary heredoc files; bypass and incomplete setup remain explicit. H06: Generated workflow embeds its own review protocol and host paths, with two independent reviewer settings.

## Method
Keep prior specimens. Run deterministic scripts in disposable fixtures, and only narrow real-agent smoke tests needed for changed dispatch. Record exact input, source hashes, stdout/stderr, exit, monotonic elapsed milliseconds and CLI-reported usage. Completed units are skipped; changed run conditions use new directories. No commits or persistent user settings changes. Tests may initialize temporary Git metadata and stage fixture files, but must create no commits. Reviewers remain read-only; no fabricated measurements or approvals.

## Limits
This measures configuration/workflow parity, not model-quality equivalence or every OS/device. Version numbers retain the already-uncommitted compatibility release bump relative to HEAD. No additional release was published between these corrections.
