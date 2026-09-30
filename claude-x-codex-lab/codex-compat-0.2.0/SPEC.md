# Codex compatibility verification

Frozen before running specimens, 2026-09-29.

## Objective
Add Codex support while preserving existing Claude workflows; do not commit or publish.

## Cases
C01: Exercise mode and prompt hook from an isolated workspace for on/off and Codex payloads. C02: Verify read-only context audit reports both hosts' hooks and uncommitted context. C03: Load real audit/mode/run instructions in Codex and check script resolution plus host routing without starting implementation or changing global preferences.

## Method
Use isolated fixtures. Snapshot the tested product files before a run. Never edit completed specimens. Store sanitized command output, exit status, elapsed milliseconds and token usage when available. A completed case is skipped on restart; changed conditions get a new sibling experiment. Deterministic checks are not model quality comparisons. Agent tasks may only change their fixture and cannot commit. No browser/device or quality claims without actual evidence.

## Metrics
Elapsed milliseconds = monotonic end minus start. Tokens = CLI-reported usage, or not measured. Delta = 100 * (candidate - baseline) / baseline only for comparable nonzero baselines; otherwise N/A.

## Decision
Keep plugin names, skill names, existing Claude paths, packet/approval formats and loop caps. Add host-specific wiring and installation. User authorized source modification and verification, with no commits.
