# harness 1.3.0 — generated projects resolve the newest model at each invocation

Frozen before running, 2026-09-30. Codex CLI 0.159.0, macOS.

## Objective
Measure what harness installs into a project and the model-resolution recipe it tells the generated
harness-engineering skill to run.

## Cases
- M01 `install-hooks.py` (the subject's, unmodified) on fresh fixtures for `--host claude`, `codex`, `both`:
  `--dry-run`, install, `--check`, a second install. Record exits, the files written, and whether each
  `.<host>/scripts/latest-model.py` is byte-identical to the subject's `scripts/latest-model.py`.
- M02 The generated-skill recipe as the subject's `skills/build/references/host-codex.md` writes it, run in
  the M01 codex fixture with `HARNESS_CODEX_ARCH_MODEL=gpt-6-sol`: the project-local resolver command, then a
  read-only `codex exec` with the id it printed and a trivial prompt. Record the resolver output and the run
  header's `model:`.

## Not in scope
A full `$harness:build` run that generates the skill (earlier builds cost 0.75–1.7 M input tokens); whether a
real build copies the recipe into the generated skill is therefore not measured here.

## Method
Subject: `plugins/harness` as released, copied to `subject/harness/` with a sha256 manifest before the first
case. State-aware `run.py`; temporary fixtures only. Host paths not redacted.

## Metrics
Elapsed ms; Codex-reported tokens for M02's run; deltas N/A.

## Decision
Same user decisions as the other `latest-model` experiments. Main's decision: the full build is left out for
cost and reported to the user as not measured.
