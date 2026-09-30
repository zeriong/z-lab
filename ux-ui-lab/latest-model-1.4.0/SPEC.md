# ux-ui 1.4.0 — art directors run the newest model of their family

Frozen before running, 2026-09-30. Codex CLI 0.159.0, Claude Code 2.1.284, macOS.

## Objective
Measure the wired director dispatch on both hosts.

## Cases
- R01 Codex host. `codex exec -m gpt-6-sol` in a fixture holding one real Chrome headless capture of a
  small web page (as `codex-parity-1.3.0`), told to follow `<subject>/skills/build/SKILL.md` and its Codex
  adapter for the art-director dispatch step only on `.ux-ui/measure/probe`. `UX_UI_CODEX_REVIEW_MODEL`
  unset, `UX_UI_CODEX_REVIEW_EFFORT=medium`. Record the resolver command and output and the id the
  director ran.
- R02 Claude host, alias redirected. `claude -p --plugin-dir <subject> --model sonnet` in the same kind of
  fixture with `ANTHROPIC_DEFAULT_OPUS_MODEL=claude-haiku-4-5-20251001` in the environment, told to run the
  art-director dispatch step. Record whether the skill ran the resolver, stopped before dispatching, and
  told the user; and `modelUsage`.

## Method
Subject: `plugins/ux-ui` as released, copied to `subject/ux-ui/` with a sha256 manifest before the first case.
State-aware `run.py`; one-shot agent runs; temporary fixtures only. Host paths not redacted.

## Metrics
Elapsed ms; CLI-reported tokens; deltas N/A.

## Decision
Same user decisions as the other `latest-model` experiments.
