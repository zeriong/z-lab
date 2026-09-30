# plan-smith 1.8.0 — writer model when the Codex main cannot see its own id

Frozen before running, 2026-09-30. Codex CLI 0.159.0, macOS. Sibling of `latest-model-1.8.0/`: in N01 the main
(started on `gpt-6-sol`) could not see its own id and passed `gpt-6.1-sol` to the resolver on its own. After review
P2-4 the Codex adapter says: resolve your own family if you know it; if you know neither and
`PLAN_SMITH_CODEX_MODEL` is unset, do not dispatch and ask the user to set it.

## Cases
- N03 Same prompt, fixture and command as N01 (`codex exec -m gpt-6-sol`, `PLAN_SMITH_CODEX_MODEL` unset,
  `PLAN_SMITH_CODEX_EFFORT=medium`) on the subject after that change. Record whether the main resolved a family (and
  which), whether it dispatched a writer and with which id, or whether it stopped and asked for the setting.

## Method
Subject: `plugins/plan-smith` at the time of this run, copied with a sha256 manifest before the case. The runner
is the sibling's `run.py` with N03 = N01's function. One-shot; temporary fixture only. Host paths not redacted.

## Metrics
Elapsed ms; CLI-reported tokens. No comparison with N01 (one run each).

## Decision
Same user decisions as the sibling.
