# Codex compatibility verification

Frozen before running specimens, 2026-09-29.

## Objective
Add Codex support while preserving existing Claude workflows; do not commit or publish.

## Cases
P01: Read the shipped Codex plugin, skill and hook schemas and inspect local plugin discovery. P02: Validate both vendors' manifests. P03: Exercise installer default Claude routing and explicit Codex routing, failure handling and scope handling with captured CLI arguments. P04: Confirm all bundled resources remain inside each installed plugin.

## Method
Use isolated fixtures. Snapshot the tested product files before a run. Never edit completed specimens. Store sanitized command output, exit status, elapsed milliseconds and token usage when available. A completed case is skipped on restart; changed conditions get a new sibling experiment. Deterministic checks are not model quality comparisons. Agent tasks may only change their fixture and cannot commit. No browser/device or quality claims without actual evidence.

## Metrics
Elapsed milliseconds = monotonic end minus start. Tokens = CLI-reported usage, or not measured. Delta = 100 * (candidate - baseline) / baseline only for comparable nonzero baselines; otherwise N/A.

## Decision
Keep plugin names, skill names, existing Claude paths, packet/approval formats and loop caps. Add host-specific wiring and installation. User authorized source modification and verification, with no commits.
