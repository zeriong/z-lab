# plan-smith 1.8.0 — the plan writer runs the newest model of the main session's family

Frozen before running, 2026-09-30. Codex CLI 0.159.0, Claude Code 2.1.284, macOS.

## Objective
Measure the wired forge skill on both hosts: a writer dispatched from an older main model runs the newest
model of that family.

## Cases
- N01 Codex host. `codex exec -m gpt-6-sol` (older than the newest `sol`) in a fixture, following
  `<subject>/skills/forge/SKILL.md` and its Codex adapter for the same short decision plan as
  `codex-parity-1.7.0` (JSON file vs SQLite for an offline single-user note app; confirmation given in the
  prompt; frame backward, style opus). `PLAN_SMITH_CODEX_MODEL` unset, `PLAN_SMITH_CODEX_EFFORT=medium`.
  Record the resolver command and output, the writer dispatch and the id it ran (nested run header or the
  subagent spawn in the event stream), and the packet's run stamp.
- N02 Claude host. `claude -p` with `--plugin-dir <subject>` and `--model opus` in a fixture, running
  `/plan-smith:forge` for the same plan with the same pre-given confirmation. Record whether the resolver ran,
  the Task/Agent call's `model` argument for plan-writer, and `modelUsage`.

## Method
Subject: `plugins/plan-smith` as released, copied to `subject/plan-smith/` with a sha256 manifest before the
first case. State-aware `run.py`; one-shot agent runs; temporary fixtures only. Host paths not redacted.

## Metrics
Elapsed ms; CLI-reported tokens; deltas N/A (no comparable baseline in this experiment).

## Decision
Same user decisions as the other `latest-model` experiments. `PLAN_SMITH_CODEX_EFFORT=medium` keeps N01's
cost down; effort is not what is measured.
