# Codex compatibility verification

Frozen before running specimens, 2026-09-29.

## Objective
Add Codex support while preserving existing Claude workflows; do not commit or publish.

## Cases
U01: Exercise the real commit gate with Claude and Codex payloads: unapproved diff blocked, approved diff allowed, changed staged diff blocked, non-UI and non-commit allowed. U02: Load real Codex review instructions against measured fixture evidence; require independent review and no source changes. U03: Exercise the real mobile doctor and resource resolution. Browser/device coverage outside available local backends remains explicitly unmeasured.

## Method
Use isolated fixtures. Snapshot the tested product files before a run. Never edit completed specimens. Store sanitized command output, exit status, elapsed milliseconds and token usage when available. A completed case is skipped on restart; changed conditions get a new sibling experiment. Deterministic checks are not model quality comparisons. Agent tasks may only change their fixture and cannot commit. No browser/device or quality claims without actual evidence.

## Metrics
Elapsed milliseconds = monotonic end minus start. Tokens = CLI-reported usage, or not measured. Delta = 100 * (candidate - baseline) / baseline only for comparable nonzero baselines; otherwise N/A.

## Decision
Keep plugin names, skill names, existing Claude paths, packet/approval formats and loop caps. Add host-specific wiring and installation. User authorized source modification and verification, with no commits.

## Changed execution condition
The parent Codex test process uses the same full-access permission profile as the source-editing session, in a disposable fixture. Nested reviewer processes remain read-only. The earlier workspace-write specimen is preserved: protected config writes and nested app-server initialization can be denied there. This is a permission-compatibility test, not a quality comparison. No real commits, user configuration changes, or plugin installation are authorized.
